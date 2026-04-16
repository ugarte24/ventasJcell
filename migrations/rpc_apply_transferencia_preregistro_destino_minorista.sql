-- Aplica al preregistro del minorista destino los saldos de una transferencia ya completada.
-- Idempotente: marca preregistro_destino_aplicado para no duplicar si se reintenta.
-- Por producto: el saldo transferido del origen pasa a ser cantidad y cantidad_restante del destino (reemplazo, no suma).

ALTER TABLE public.transferencias_saldos
  ADD COLUMN IF NOT EXISTS preregistro_destino_aplicado boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.transferencias_saldos.preregistro_destino_aplicado IS
  'True si la RPC apply_transferencia_preregistro_destino_minorista ya incorporó saldos al preregistro del destino.';

CREATE OR REPLACE FUNCTION public.apply_transferencia_preregistro_destino_minorista(
  p_transferencia_id uuid,
  p_fecha date
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  t_estado text;
  t_dest uuid;
  t_aplicado boolean;
  saldos jsonb;
  jo jsonb;
  pid uuid;
  qty int;
  pr_id uuid;
  v_next_orden int;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.usuarios
    WHERE id = uid AND rol = 'minorista' AND estado = 'activo'
  ) THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;

  SELECT estado, id_minorista_destino, saldos_transferidos, preregistro_destino_aplicado
  INTO t_estado, t_dest, saldos, t_aplicado
  FROM public.transferencias_saldos
  WHERE id = p_transferencia_id;

  IF t_estado IS NULL THEN
    RAISE EXCEPTION 'Transferencia no encontrada';
  END IF;

  IF t_estado IS DISTINCT FROM 'completada' OR t_dest IS DISTINCT FROM uid THEN
    RAISE EXCEPTION 'Transferencia no válida para aplicar al preregistro';
  END IF;

  IF COALESCE(t_aplicado, false) THEN
    RETURN;
  END IF;

  IF saldos IS NULL OR jsonb_typeof(saldos) IS DISTINCT FROM 'array' THEN
    RAISE EXCEPTION 'Saldos transferidos inválidos';
  END IF;

  FOR jo IN SELECT jsonb_array_elements(COALESCE(saldos, '[]'::jsonb))
  LOOP
    BEGIN
      pid := NULLIF(trim(both from (jo->>'id_producto')), '')::uuid;
    EXCEPTION
      WHEN invalid_text_representation THEN
        CONTINUE;
    END;

    qty := COALESCE((jo->>'cantidad_restante')::int, 0);
    IF pid IS NULL OR qty <= 0 THEN
      CONTINUE;
    END IF;

    SELECT id INTO pr_id FROM public.preregistros_minorista
    WHERE id_minorista = uid AND id_producto = pid
    LIMIT 1;

    IF pr_id IS NULL THEN
      SELECT COALESCE(MAX(orden), 0) + 1 INTO v_next_orden
      FROM public.preregistros_minorista
      WHERE id_minorista = uid;

      INSERT INTO public.preregistros_minorista (
        id_minorista,
        id_producto,
        cantidad,
        cantidad_restante,
        orden,
        created_at,
        updated_at
      )
      VALUES (
        uid,
        pid,
        qty,
        qty,
        v_next_orden,
        timezone('utc'::text, now()),
        timezone('utc'::text, now())
      );
    ELSE
      -- Saldo del origen → cantidad y saldo (cantidad_restante) del destino para ese producto
      UPDATE public.preregistros_minorista
      SET
        cantidad = qty,
        cantidad_restante = qty,
        updated_at = timezone('utc'::text, now())
      WHERE id = pr_id;
    END IF;
  END LOOP;

  UPDATE public.transferencias_saldos
  SET
    preregistro_destino_aplicado = true,
    updated_at = timezone('utc'::text, now())
  WHERE id = p_transferencia_id;
END;
$$;

REVOKE ALL ON FUNCTION public.apply_transferencia_preregistro_destino_minorista(uuid, date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.apply_transferencia_preregistro_destino_minorista(uuid, date) TO authenticated;

COMMENT ON FUNCTION public.apply_transferencia_preregistro_destino_minorista(uuid, date) IS
  'Asigna al preregistro del destino, por producto, cantidad y cantidad_restante iguales al saldo transferido desde el origen (reemplazo). Idempotente.';

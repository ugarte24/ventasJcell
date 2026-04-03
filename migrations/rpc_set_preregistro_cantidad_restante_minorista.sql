  -- ============================================================================
  -- PERSISTIR cantidad_restante EN PREREGISTROS (minorista vía RPC)
  -- ============================================================================
  -- Los minoristas no tienen política UPDATE en preregistros_minorista; esta
  -- función SECURITY DEFINER solo actualiza cantidad_restante y updated_at.
  -- Ejecutar también add_cantidad_restante_to_preregistros.sql si la columna no existe.
  -- ============================================================================

  ALTER TABLE preregistros_minorista
    ADD COLUMN IF NOT EXISTS cantidad_restante INTEGER;

  ALTER TABLE preregistros_mayorista
    ADD COLUMN IF NOT EXISTS cantidad_restante INTEGER;

  COMMENT ON COLUMN preregistros_minorista.cantidad_restante IS 'Saldo restante editado en Nueva Venta. NULL = usar cantidad + aumentos del día.';
  COMMENT ON COLUMN preregistros_mayorista.cantidad_restante IS 'Saldo restante editado en Nueva Venta. NULL = usar cantidad + aumentos del período.';

  CREATE OR REPLACE FUNCTION public.set_preregistro_cantidad_restante_minorista(
    p_preregistro_id uuid,
    p_cantidad_restante integer
  )
  RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
  AS $$
  DECLARE
    v_minorista uuid;
  BEGIN
    IF p_cantidad_restante IS NULL OR p_cantidad_restante < 0 THEN
      RAISE EXCEPTION 'cantidad_restante inválida';
    END IF;

    SELECT id_minorista INTO v_minorista
    FROM preregistros_minorista
    WHERE id = p_preregistro_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Preregistro no encontrado';
    END IF;

    IF v_minorista IS DISTINCT FROM auth.uid() THEN
      RAISE EXCEPTION 'No autorizado';
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM usuarios
      WHERE id = auth.uid() AND rol = 'minorista' AND estado = 'activo'
    ) THEN
      RAISE EXCEPTION 'No autorizado';
    END IF;

    UPDATE preregistros_minorista
    SET
      cantidad_restante = p_cantidad_restante,
      updated_at = timezone('utc'::text, now())
    WHERE id = p_preregistro_id;
  END;
  $$;

  REVOKE ALL ON FUNCTION public.set_preregistro_cantidad_restante_minorista(uuid, integer) FROM PUBLIC;
  GRANT EXECUTE ON FUNCTION public.set_preregistro_cantidad_restante_minorista(uuid, integer) TO authenticated;

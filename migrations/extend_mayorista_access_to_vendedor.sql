-- ============================================================================
-- Vendedor tienda: mismo acceso mayorista en BD (ventas, preregistros, pagos)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.check_user_is_mayorista()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  user_id UUID;
  user_rol VARCHAR;
  user_estado VARCHAR;
BEGIN
  user_id := auth.uid();
  IF user_id IS NULL THEN
    RETURN FALSE;
  END IF;

  SELECT rol, estado INTO user_rol, user_estado
  FROM public.usuarios
  WHERE id = user_id
  LIMIT 1;

  IF user_rol IS NULL OR user_estado IS NULL THEN
    RETURN FALSE;
  END IF;

  RETURN (
    LOWER(TRIM(user_estado)) = 'activo'
    AND LOWER(TRIM(user_rol)) IN ('mayorista', 'vendedor')
  );
END;
$$;

COMMENT ON FUNCTION public.check_user_is_mayorista() IS
  'Mayorista o vendedor tienda activo. Usa SECURITY DEFINER para leer usuarios sin RLS.';

-- ventas_mayoristas: INSERT propio
DROP POLICY IF EXISTS "Mayoristas pueden crear sus propias ventas" ON public.ventas_mayoristas;
CREATE POLICY "Mayoristas pueden crear sus propias ventas"
  ON public.ventas_mayoristas FOR INSERT
  WITH CHECK (
    id_mayorista = auth.uid()
    AND public.check_user_is_mayorista()
  );

-- preregistros_mayorista
DROP POLICY IF EXISTS "Mayoristas y administradores pueden crear preregistros mayorista" ON public.preregistros_mayorista;
CREATE POLICY "Mayoristas y administradores pueden crear preregistros mayorista"
  ON public.preregistros_mayorista FOR INSERT
  WITH CHECK (
    (
      id_mayorista = auth.uid()
      AND public.check_user_is_mayorista()
    )
    OR EXISTS (
      SELECT 1 FROM public.usuarios
      WHERE usuarios.id = auth.uid()
        AND usuarios.rol = 'admin'
        AND usuarios.estado = 'activo'
    )
  );

DROP POLICY IF EXISTS "Mayoristas y administradores pueden actualizar preregistros mayorista" ON public.preregistros_mayorista;
CREATE POLICY "Mayoristas y administradores pueden actualizar preregistros mayorista"
  ON public.preregistros_mayorista FOR UPDATE
  USING (
    (
      id_mayorista = auth.uid()
      AND public.check_user_is_mayorista()
    )
    OR EXISTS (
      SELECT 1 FROM public.usuarios
      WHERE usuarios.id = auth.uid()
        AND usuarios.rol = 'admin'
        AND usuarios.estado = 'activo'
    )
  );

DROP POLICY IF EXISTS "Mayoristas y administradores pueden eliminar preregistros mayorista" ON public.preregistros_mayorista;
CREATE POLICY "Mayoristas y administradores pueden eliminar preregistros mayorista"
  ON public.preregistros_mayorista FOR DELETE
  USING (
    (
      id_mayorista = auth.uid()
      AND public.check_user_is_mayorista()
    )
    OR EXISTS (
      SELECT 1 FROM public.usuarios
      WHERE usuarios.id = auth.uid()
        AND usuarios.rol = 'admin'
        AND usuarios.estado = 'activo'
    )
  );

-- pagos_mayoristas: INSERT pendiente al finalizar
DROP POLICY IF EXISTS "Mayoristas pueden crear su pago pendiente" ON public.pagos_mayoristas;
CREATE POLICY "Mayoristas pueden crear su pago pendiente"
  ON public.pagos_mayoristas
  FOR INSERT
  WITH CHECK (
    auth.uid() = id_mayorista
    AND public.check_user_is_mayorista()
    AND EXISTS (
      SELECT 1
      FROM public.ventas v
      WHERE v.id = pagos_mayoristas.id_venta
        AND v.id_vendedor = auth.uid()
    )
    AND estado = 'pendiente'
    AND COALESCE(monto_recibido, 0) = 0
  );

COMMENT ON POLICY "Mayoristas pueden crear su pago pendiente" ON public.pagos_mayoristas IS
  'Mayorista o vendedor tienda inserta el registro pendiente tras finalizar venta.';

-- RPC arrastre: mayorista o vendedor tienda
CREATE OR REPLACE FUNCTION public.apply_arrastre_mayorista_preregistro(
  p_preregistro_id uuid,
  p_nueva_cantidad integer
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $func$
DECLARE
  l_owner uuid;
BEGIN
  IF p_nueva_cantidad IS NULL OR p_nueva_cantidad < 0 THEN
    RAISE EXCEPTION 'cantidad inválida';
  END IF;

  l_owner := (
    SELECT pm.id_mayorista
    FROM public.preregistros_mayorista pm
    WHERE pm.id = p_preregistro_id
  );

  IF l_owner IS NULL THEN
    RAISE EXCEPTION 'Preregistro no encontrado';
  END IF;

  IF l_owner IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;

  IF NOT public.check_user_is_mayorista() THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;

  UPDATE public.preregistros_mayorista pm
  SET
    cantidad = p_nueva_cantidad,
    cantidad_restante = p_nueva_cantidad,
    updated_at = timezone('utc'::text, now())
  WHERE pm.id = p_preregistro_id;
END;
$func$;


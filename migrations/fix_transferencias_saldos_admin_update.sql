-- Permite a administradores actualizar transferencias (p. ej. cancelar al reaperturar edición Nueva venta).

DROP POLICY IF EXISTS "Administradores actualizan transferencias_saldos" ON public.transferencias_saldos;

CREATE POLICY "Administradores actualizan transferencias_saldos"
  ON public.transferencias_saldos
  FOR UPDATE
  USING (public.check_user_is_admin())
  WITH CHECK (public.check_user_is_admin());

COMMENT ON POLICY "Administradores actualizan transferencias_saldos" ON public.transferencias_saldos IS
  'Cancelación u otros ajustes cuando un admin anula la venta origen o reapertura edición minorista.';

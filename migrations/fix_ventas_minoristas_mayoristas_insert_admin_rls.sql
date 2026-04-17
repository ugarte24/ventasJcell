-- ============================================================================
-- FIX: Admin no puede insertar en ventas_* al marcar pedido entregado (403 RLS)
-- ============================================================================
-- Al entregar un pedido se inserta venta con id_minorista / id_mayorista del
-- pedido (no auth.uid()). La política de minorista/mayorista exige auth.uid();
-- debe cumplirse la política de administrador usando check_user_is_admin(),
-- que lee public.usuarios con SECURITY DEFINER (no depende del SELECT RLS).
--
-- Requisito: existir public.check_user_is_admin() (migrations/create_check_admin_function_for_policies.sql).
-- ============================================================================

DROP POLICY IF EXISTS "Administradores pueden crear ventas minoristas" ON public.ventas_minoristas;
CREATE POLICY "Administradores pueden crear ventas minoristas"
  ON public.ventas_minoristas FOR INSERT
  WITH CHECK (public.check_user_is_admin());

DROP POLICY IF EXISTS "Administradores pueden crear ventas mayoristas" ON public.ventas_mayoristas;
CREATE POLICY "Administradores pueden crear ventas mayoristas"
  ON public.ventas_mayoristas FOR INSERT
  WITH CHECK (public.check_user_is_admin());

COMMENT ON POLICY "Administradores pueden crear ventas minoristas" ON public.ventas_minoristas IS
  'Permite a admin activo insertar filas para cualquier id_minorista (p. ej. aumento al entregar pedido).';

COMMENT ON POLICY "Administradores pueden crear ventas mayoristas" ON public.ventas_mayoristas IS
  'Permite a admin activo insertar filas para cualquier id_mayorista (p. ej. aumento al entregar pedido).';

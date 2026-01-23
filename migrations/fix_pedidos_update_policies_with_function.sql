-- ============================================================================
-- MIGRACIÓN: Corregir políticas UPDATE de pedidos usando función helper
-- ============================================================================
-- Fecha: 2025-01-XX
-- Descripción: Usar función SECURITY DEFINER para verificar admin sin
--              problemas de RLS. Resuelve error 403 al actualizar pedidos.
-- ============================================================================

-- Eliminar políticas existentes
DROP POLICY IF EXISTS "Usuarios pueden ver sus propios pedidos" ON pedidos;
DROP POLICY IF EXISTS "Admins pueden actualizar cualquier pedido" ON pedidos;
DROP POLICY IF EXISTS "Usuarios pueden actualizar sus pedidos pendientes" ON pedidos;

-- Política para SELECT: Usuarios ven sus propios pedidos, admins ven todos
CREATE POLICY "Usuarios pueden ver sus propios pedidos"
  ON pedidos FOR SELECT
  USING (
    id_usuario::text = auth.uid()::text
    OR public.check_user_is_admin()
  );

-- Política para UPDATE: Usuarios pueden actualizar sus pedidos pendientes
-- Permite cambiar de 'pendiente' a 'enviado' o 'cancelado'
CREATE POLICY "Usuarios pueden actualizar sus pedidos pendientes"
  ON pedidos FOR UPDATE
  USING (
    id_usuario::text = auth.uid()::text
    AND estado::text = 'pendiente'::text
  )
  WITH CHECK (
    id_usuario::text = auth.uid()::text
    AND (
      estado::text = 'pendiente'::text
      OR estado::text = 'enviado'::text
      OR estado::text = 'cancelado'::text
    )
  );

-- Política para UPDATE: Administradores pueden actualizar cualquier pedido
CREATE POLICY "Admins pueden actualizar cualquier pedido"
  ON pedidos FOR UPDATE
  USING (public.check_user_is_admin())
  WITH CHECK (public.check_user_is_admin());

-- ============================================================================
-- FIN DE LA MIGRACIÓN
-- ============================================================================

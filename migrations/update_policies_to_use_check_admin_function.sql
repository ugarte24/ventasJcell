-- ============================================================================
-- MIGRACIÓN: Actualizar políticas para usar función check_user_is_admin
-- ============================================================================
-- Fecha: 2025-01-XX
-- Descripción: Usar función SECURITY DEFINER en lugar de consulta directa
--              para evitar problemas con políticas RLS de usuarios
-- ============================================================================

-- Eliminar políticas existentes
DROP POLICY IF EXISTS "Administradores pueden crear ventas mayoristas" ON ventas_mayoristas;
DROP POLICY IF EXISTS "Administradores pueden crear ventas minoristas" ON ventas_minoristas;

-- Crear políticas usando la función check_user_is_admin
CREATE POLICY "Administradores pueden crear ventas mayoristas"
  ON ventas_mayoristas FOR INSERT
  WITH CHECK (public.check_user_is_admin());

CREATE POLICY "Administradores pueden crear ventas minoristas"
  ON ventas_minoristas FOR INSERT
  WITH CHECK (public.check_user_is_admin());

-- ============================================================================
-- FIN DE LA MIGRACIÓN
-- ============================================================================

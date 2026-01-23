-- ============================================================================
-- MIGRACIÓN: Usar función helper en políticas de INSERT
-- ============================================================================
-- Fecha: 2025-01-XX
-- Descripción: Actualiza las políticas de INSERT para usar la función helper
--              is_admin_active() en lugar de subconsultas complejas
-- ============================================================================

-- Actualizar políticas de ventas_mayoristas
DROP POLICY IF EXISTS "Administradores pueden crear ventas mayoristas" ON ventas_mayoristas;
CREATE POLICY "Administradores pueden crear ventas mayoristas"
  ON ventas_mayoristas FOR INSERT
  WITH CHECK (is_admin_active());

-- Actualizar políticas de ventas_minoristas
DROP POLICY IF EXISTS "Administradores pueden crear ventas minoristas" ON ventas_minoristas;
CREATE POLICY "Administradores pueden crear ventas minoristas"
  ON ventas_minoristas FOR INSERT
  WITH CHECK (is_admin_active());

-- ============================================================================
-- FIN DE LA MIGRACIÓN
-- ============================================================================

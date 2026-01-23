-- ============================================================================
-- MIGRACIÓN: Recrear políticas de INSERT para administradores
-- ============================================================================
-- Fecha: 2025-01-XX
-- Descripción: Recrear las políticas que usan la función is_admin_active()
--              después de que la función fue recreada
-- ============================================================================

-- Eliminar políticas existentes si existen
DROP POLICY IF EXISTS "Administradores pueden crear ventas mayoristas" ON ventas_mayoristas;
DROP POLICY IF EXISTS "Administradores pueden crear ventas minoristas" ON ventas_minoristas;

-- Crear políticas usando la función is_admin_active()
CREATE POLICY "Administradores pueden crear ventas mayoristas"
  ON ventas_mayoristas FOR INSERT
  WITH CHECK (public.is_admin_active());

CREATE POLICY "Administradores pueden crear ventas minoristas"
  ON ventas_minoristas FOR INSERT
  WITH CHECK (public.is_admin_active());

-- ============================================================================
-- FIN DE LA MIGRACIÓN
-- ============================================================================

-- ============================================================================
-- MIGRACIÓN: Simplificar políticas de INSERT para administradores
-- ============================================================================
-- Fecha: 2025-01-XX
-- Descripción: Simplifica las políticas de INSERT para administradores
--              usando subconsultas más directas en lugar de EXISTS
--              Esto puede resolver problemas de evaluación de políticas RLS
-- ============================================================================

-- Eliminar políticas actuales
DROP POLICY IF EXISTS "Administradores pueden crear ventas mayoristas" ON ventas_mayoristas;
DROP POLICY IF EXISTS "Administradores pueden crear ventas minoristas" ON ventas_minoristas;

-- Crear políticas simplificadas usando subconsultas directas
CREATE POLICY "Administradores pueden crear ventas mayoristas"
  ON ventas_mayoristas FOR INSERT
  WITH CHECK (
    (SELECT rol FROM usuarios WHERE id = auth.uid()) = 'admin'
    AND (SELECT estado FROM usuarios WHERE id = auth.uid()) = 'activo'
  );

CREATE POLICY "Administradores pueden crear ventas minoristas"
  ON ventas_minoristas FOR INSERT
  WITH CHECK (
    (SELECT rol FROM usuarios WHERE id = auth.uid()) = 'admin'
    AND (SELECT estado FROM usuarios WHERE id = auth.uid()) = 'activo'
  );

-- ============================================================================
-- FIN DE LA MIGRACIÓN
-- ============================================================================

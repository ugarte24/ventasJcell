-- ============================================================================
-- MIGRACIÓN: Corregir comparación en políticas para usar cast a texto
-- ============================================================================
-- Fecha: 2025-01-XX
-- Descripción: Asegurar que la comparación de UUID funcione correctamente
--              usando cast a texto para evitar problemas de tipo
-- ============================================================================

-- Eliminar políticas existentes
DROP POLICY IF EXISTS "Administradores pueden crear ventas mayoristas" ON ventas_mayoristas;
DROP POLICY IF EXISTS "Administradores pueden crear ventas minoristas" ON ventas_minoristas;

-- Crear políticas con comparación más robusta usando cast a texto
CREATE POLICY "Administradores pueden crear ventas mayoristas"
  ON ventas_mayoristas FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.usuarios
      WHERE usuarios.id::text = auth.uid()::text
      AND usuarios.rol::text = 'admin'
      AND usuarios.estado::text = 'activo'
    )
  );

CREATE POLICY "Administradores pueden crear ventas minoristas"
  ON ventas_minoristas FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.usuarios
      WHERE usuarios.id::text = auth.uid()::text
      AND usuarios.rol::text = 'admin'
      AND usuarios.estado::text = 'activo'
    )
  );

-- ============================================================================
-- FIN DE LA MIGRACIÓN
-- ============================================================================

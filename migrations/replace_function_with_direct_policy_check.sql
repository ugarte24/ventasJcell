-- ============================================================================
-- MIGRACIÓN: Reemplazar función con verificación directa en políticas
-- ============================================================================
-- Fecha: 2025-01-XX
-- Descripción: En lugar de usar función helper, usar verificación directa
--              en políticas. Esto puede resolver problemas de evaluación
--              en contexto RLS cuando auth.uid() no se evalúa correctamente
--              en funciones SECURITY DEFINER.
-- ============================================================================

-- Eliminar políticas existentes
DROP POLICY IF EXISTS "Administradores pueden crear ventas mayoristas" ON ventas_mayoristas;
DROP POLICY IF EXISTS "Administradores pueden crear ventas minoristas" ON ventas_minoristas;

-- Crear políticas con verificación directa (sin función helper)
CREATE POLICY "Administradores pueden crear ventas mayoristas"
  ON ventas_mayoristas FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.usuarios
      WHERE usuarios.id = auth.uid()
      AND usuarios.rol = 'admin'
      AND usuarios.estado = 'activo'
    )
  );

CREATE POLICY "Administradores pueden crear ventas minoristas"
  ON ventas_minoristas FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.usuarios
      WHERE usuarios.id = auth.uid()
      AND usuarios.rol = 'admin'
      AND usuarios.estado = 'activo'
    )
  );

-- ============================================================================
-- FIN DE LA MIGRACIÓN
-- ============================================================================

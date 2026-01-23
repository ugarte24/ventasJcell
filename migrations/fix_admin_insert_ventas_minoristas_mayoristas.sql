-- ============================================================================
-- MIGRACIÓN: Permitir a administradores insertar en ventas_minoristas y ventas_mayoristas
-- ============================================================================
-- Fecha: 2025-01-XX
-- Descripción: Agrega políticas RLS para permitir que los administradores
--              puedan insertar registros en ventas_minoristas y ventas_mayoristas
--              cuando marcan pedidos como entregados.
-- ============================================================================

-- Política para que administradores puedan insertar en ventas_minoristas
CREATE POLICY "Administradores pueden crear ventas minoristas"
  ON ventas_minoristas FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE usuarios.id = auth.uid()
      AND usuarios.rol = 'admin'
      AND usuarios.estado = 'activo'
    )
  );

-- Política para que administradores puedan insertar en ventas_mayoristas
CREATE POLICY "Administradores pueden crear ventas mayoristas"
  ON ventas_mayoristas FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE usuarios.id = auth.uid()
      AND usuarios.rol = 'admin'
      AND usuarios.estado = 'activo'
    )
  );

-- ============================================================================
-- FIN DE LA MIGRACIÓN
-- ============================================================================

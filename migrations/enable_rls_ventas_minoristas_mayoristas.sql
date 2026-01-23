-- ============================================================================
-- MIGRACIÓN: Habilitar RLS y corregir políticas para ventas_minoristas y ventas_mayoristas
-- ============================================================================
-- Fecha: 2025-01-XX
-- Descripción: Habilita RLS y asegura que todas las políticas necesarias estén en su lugar
-- ============================================================================

-- Habilitar RLS en las tablas
ALTER TABLE ventas_minoristas ENABLE ROW LEVEL SECURITY;
ALTER TABLE ventas_mayoristas ENABLE ROW LEVEL SECURITY;

-- Eliminar políticas existentes para recrearlas correctamente
DROP POLICY IF EXISTS "Minoristas pueden ver sus propias ventas" ON ventas_minoristas;
DROP POLICY IF EXISTS "Minoristas pueden crear sus propias ventas" ON ventas_minoristas;
DROP POLICY IF EXISTS "Solo administradores pueden actualizar ventas minoristas" ON ventas_minoristas;
DROP POLICY IF EXISTS "Solo administradores pueden eliminar ventas minoristas" ON ventas_minoristas;
DROP POLICY IF EXISTS "Administradores pueden crear ventas minoristas" ON ventas_minoristas;

DROP POLICY IF EXISTS "Mayoristas pueden ver sus propias ventas" ON ventas_mayoristas;
DROP POLICY IF EXISTS "Mayoristas pueden crear sus propias ventas" ON ventas_mayoristas;
DROP POLICY IF EXISTS "Solo administradores pueden actualizar ventas mayoristas" ON ventas_mayoristas;
DROP POLICY IF EXISTS "Solo administradores pueden eliminar ventas mayoristas" ON ventas_mayoristas;
DROP POLICY IF EXISTS "Administradores pueden crear ventas mayoristas" ON ventas_mayoristas;

-- ============================================================================
-- POLÍTICAS PARA VENTAS_MINORISTAS
-- ============================================================================

-- SELECT: Minoristas ven sus propias ventas, admins ven todas
CREATE POLICY "Minoristas pueden ver sus propias ventas"
  ON ventas_minoristas FOR SELECT
  USING (
    id_minorista = auth.uid()
    OR EXISTS (
      SELECT 1 FROM usuarios
      WHERE usuarios.id = auth.uid()
      AND usuarios.rol = 'admin'
      AND usuarios.estado = 'activo'
    )
  );

-- INSERT: Minoristas pueden crear sus propias ventas
CREATE POLICY "Minoristas pueden crear sus propias ventas"
  ON ventas_minoristas FOR INSERT
  WITH CHECK (
    id_minorista = auth.uid()
    AND EXISTS (
      SELECT 1 FROM usuarios
      WHERE usuarios.id = auth.uid()
      AND usuarios.rol = 'minorista'
      AND usuarios.estado = 'activo'
    )
  );

-- INSERT: Administradores pueden crear ventas para cualquier minorista
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

-- UPDATE: Solo administradores pueden actualizar
CREATE POLICY "Solo administradores pueden actualizar ventas minoristas"
  ON ventas_minoristas FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE usuarios.id = auth.uid()
      AND usuarios.rol = 'admin'
      AND usuarios.estado = 'activo'
    )
  );

-- DELETE: Solo administradores pueden eliminar
CREATE POLICY "Solo administradores pueden eliminar ventas minoristas"
  ON ventas_minoristas FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE usuarios.id = auth.uid()
      AND usuarios.rol = 'admin'
      AND usuarios.estado = 'activo'
    )
  );

-- ============================================================================
-- POLÍTICAS PARA VENTAS_MAYORISTAS
-- ============================================================================

-- SELECT: Mayoristas ven sus propias ventas, admins ven todas
CREATE POLICY "Mayoristas pueden ver sus propias ventas"
  ON ventas_mayoristas FOR SELECT
  USING (
    id_mayorista = auth.uid()
    OR EXISTS (
      SELECT 1 FROM usuarios
      WHERE usuarios.id = auth.uid()
      AND usuarios.rol = 'admin'
      AND usuarios.estado = 'activo'
    )
  );

-- INSERT: Mayoristas pueden crear sus propias ventas
CREATE POLICY "Mayoristas pueden crear sus propias ventas"
  ON ventas_mayoristas FOR INSERT
  WITH CHECK (
    id_mayorista = auth.uid()
    AND EXISTS (
      SELECT 1 FROM usuarios
      WHERE usuarios.id = auth.uid()
      AND usuarios.rol = 'mayorista'
      AND usuarios.estado = 'activo'
    )
  );

-- INSERT: Administradores pueden crear ventas para cualquier mayorista
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

-- UPDATE: Solo administradores pueden actualizar
CREATE POLICY "Solo administradores pueden actualizar ventas mayoristas"
  ON ventas_mayoristas FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE usuarios.id = auth.uid()
      AND usuarios.rol = 'admin'
      AND usuarios.estado = 'activo'
    )
  );

-- DELETE: Solo administradores pueden eliminar
CREATE POLICY "Solo administradores pueden eliminar ventas mayoristas"
  ON ventas_mayoristas FOR DELETE
  USING (
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

-- ============================================================================
-- ACTUALIZAR ESTRUCTURA DE PREREGISTROS_MINORISTA
-- ============================================================================
-- Cambios:
-- 1. Agregar columna id_minorista (asociar preregistro a minorista específico)
-- 2. Eliminar columna fecha (los preregistros son reutilizables todos los días)
-- 3. Actualizar constraints y políticas RLS
-- ============================================================================

-- Paso 1: Eliminar políticas RLS existentes
DROP POLICY IF EXISTS "Usuarios autenticados pueden leer preregistros minorista" ON preregistros_minorista;
DROP POLICY IF EXISTS "Solo administradores pueden crear preregistros minorista" ON preregistros_minorista;
DROP POLICY IF EXISTS "Solo administradores pueden actualizar preregistros minorista" ON preregistros_minorista;
DROP POLICY IF EXISTS "Solo administradores pueden eliminar preregistros minorista" ON preregistros_minorista;

-- Paso 2: Eliminar constraint UNIQUE existente
ALTER TABLE preregistros_minorista DROP CONSTRAINT IF EXISTS preregistros_minorista_id_producto_fecha_key;

-- Paso 3: Eliminar índices relacionados con fecha
DROP INDEX IF EXISTS idx_preregistros_minorista_fecha;
DROP INDEX IF EXISTS idx_preregistros_minorista_producto_fecha;

-- Paso 4: Agregar columna id_minorista
ALTER TABLE preregistros_minorista 
  ADD COLUMN IF NOT EXISTS id_minorista UUID REFERENCES usuarios(id) ON DELETE CASCADE;

-- Paso 5: Eliminar columna fecha (si existe)
ALTER TABLE preregistros_minorista 
  DROP COLUMN IF EXISTS fecha;

-- Paso 6: Crear nuevo constraint UNIQUE (id_minorista, id_producto)
ALTER TABLE preregistros_minorista 
  ADD CONSTRAINT preregistros_minorista_id_minorista_id_producto_key 
  UNIQUE(id_minorista, id_producto);

-- Paso 7: Crear nuevos índices
CREATE INDEX IF NOT EXISTS idx_preregistros_minorista_minorista ON preregistros_minorista(id_minorista);
CREATE INDEX IF NOT EXISTS idx_preregistros_minorista_minorista_producto ON preregistros_minorista(id_minorista, id_producto);

-- Paso 8: Actualizar comentarios
COMMENT ON COLUMN preregistros_minorista.id_minorista IS 'ID del usuario minorista';
COMMENT ON TABLE preregistros_minorista IS 'Preregistros de productos para minoristas (reutilizables todos los días)';

-- Paso 9: Crear nuevas políticas RLS (similar a mayorista)
-- Lectura: Minoristas pueden leer sus propios preregistros o administradores pueden leer todos
CREATE POLICY "Usuarios pueden leer sus propios preregistros minorista"
  ON preregistros_minorista FOR SELECT
  USING (
    id_minorista = auth.uid()
    OR EXISTS (
      SELECT 1 FROM usuarios
      WHERE usuarios.id = auth.uid()
      AND usuarios.rol = 'admin'
      AND usuarios.estado = 'activo'
    )
  );

-- Escritura: Solo administradores pueden crear preregistros minorista
CREATE POLICY "Solo administradores pueden crear preregistros minorista"
  ON preregistros_minorista FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE usuarios.id = auth.uid()
      AND usuarios.rol = 'admin'
      AND usuarios.estado = 'activo'
    )
  );

-- Actualización: Solo administradores pueden actualizar preregistros minorista
CREATE POLICY "Solo administradores pueden actualizar preregistros minorista"
  ON preregistros_minorista FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE usuarios.id = auth.uid()
      AND usuarios.rol = 'admin'
      AND usuarios.estado = 'activo'
    )
  );

-- Eliminación: Solo administradores pueden eliminar preregistros minorista
CREATE POLICY "Solo administradores pueden eliminar preregistros minorista"
  ON preregistros_minorista FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE usuarios.id = auth.uid()
      AND usuarios.rol = 'admin'
      AND usuarios.estado = 'activo'
    )
  );


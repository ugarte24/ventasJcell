-- ============================================================================
-- CREAR TABLAS DE PREREGISTROS (MINORISTA Y MAYORISTA)
-- ============================================================================
-- Estas tablas almacenan los preregistros de productos para minoristas y mayoristas
-- ============================================================================

-- Tabla: PREREGISTROS_MINORISTA
-- Almacena los preregistros de productos para minoristas (sin asociación a usuario específico)
CREATE TABLE IF NOT EXISTS preregistros_minorista (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_producto UUID NOT NULL REFERENCES productos(id) ON DELETE CASCADE,
  cantidad INTEGER NOT NULL CHECK (cantidad > 0),
  fecha DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(id_producto, fecha) -- Un preregistro por producto por día
);

COMMENT ON TABLE preregistros_minorista IS 'Preregistros de productos para minoristas';
COMMENT ON COLUMN preregistros_minorista.cantidad IS 'Cantidad preregistrada del producto';
COMMENT ON COLUMN preregistros_minorista.fecha IS 'Fecha del preregistro';

-- Tabla: PREREGISTROS_MAYORISTA
-- Almacena los preregistros de productos para mayoristas (asociados a un mayorista específico)
CREATE TABLE IF NOT EXISTS preregistros_mayorista (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_mayorista UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  id_producto UUID NOT NULL REFERENCES productos(id) ON DELETE CASCADE,
  cantidad INTEGER NOT NULL CHECK (cantidad > 0),
  fecha DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(id_mayorista, id_producto, fecha) -- Un preregistro por mayorista, producto y día
);

COMMENT ON TABLE preregistros_mayorista IS 'Preregistros de productos para mayoristas';
COMMENT ON COLUMN preregistros_mayorista.id_mayorista IS 'ID del usuario mayorista';
COMMENT ON COLUMN preregistros_mayorista.cantidad IS 'Cantidad preregistrada del producto';
COMMENT ON COLUMN preregistros_mayorista.fecha IS 'Fecha del preregistro';

-- ============================================================================
-- CREAR ÍNDICES PARA OPTIMIZACIÓN
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_preregistros_minorista_producto ON preregistros_minorista(id_producto);
CREATE INDEX IF NOT EXISTS idx_preregistros_minorista_fecha ON preregistros_minorista(fecha);
CREATE INDEX IF NOT EXISTS idx_preregistros_minorista_producto_fecha ON preregistros_minorista(id_producto, fecha);

CREATE INDEX IF NOT EXISTS idx_preregistros_mayorista_mayorista ON preregistros_mayorista(id_mayorista);
CREATE INDEX IF NOT EXISTS idx_preregistros_mayorista_producto ON preregistros_mayorista(id_producto);
CREATE INDEX IF NOT EXISTS idx_preregistros_mayorista_fecha ON preregistros_mayorista(fecha);
CREATE INDEX IF NOT EXISTS idx_preregistros_mayorista_mayorista_fecha ON preregistros_mayorista(id_mayorista, fecha);

-- ============================================================================
-- HABILITAR RLS (Row Level Security)
-- ============================================================================

ALTER TABLE preregistros_minorista ENABLE ROW LEVEL SECURITY;
ALTER TABLE preregistros_mayorista ENABLE ROW LEVEL SECURITY;

-- Políticas para PREREGISTROS_MINORISTA
-- Lectura: Solo usuarios autenticados
CREATE POLICY "Usuarios autenticados pueden leer preregistros minorista"
  ON preregistros_minorista FOR SELECT
  USING (auth.role() = 'authenticated');

-- Escritura: Solo administradores
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

-- Actualización: Solo administradores
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

-- Eliminación: Solo administradores
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

-- Políticas para PREREGISTROS_MAYORISTA
-- Lectura: Usuarios autenticados pueden leer sus propios preregistros o administradores pueden leer todos
CREATE POLICY "Usuarios pueden leer sus propios preregistros mayorista"
  ON preregistros_mayorista FOR SELECT
  USING (
    id_mayorista = auth.uid()
    OR EXISTS (
      SELECT 1 FROM usuarios
      WHERE usuarios.id = auth.uid()
      AND usuarios.rol = 'admin'
      AND usuarios.estado = 'activo'
    )
  );

-- Escritura: Mayoristas pueden crear sus propios preregistros, administradores pueden crear cualquier preregistro
CREATE POLICY "Mayoristas y administradores pueden crear preregistros mayorista"
  ON preregistros_mayorista FOR INSERT
  WITH CHECK (
    (
      id_mayorista = auth.uid()
      AND EXISTS (
        SELECT 1 FROM usuarios
        WHERE usuarios.id = auth.uid()
        AND usuarios.rol = 'mayorista'
        AND usuarios.estado = 'activo'
      )
    )
    OR EXISTS (
      SELECT 1 FROM usuarios
      WHERE usuarios.id = auth.uid()
      AND usuarios.rol = 'admin'
      AND usuarios.estado = 'activo'
    )
  );

-- Actualización: Mayoristas pueden actualizar sus propios preregistros, administradores pueden actualizar cualquier preregistro
CREATE POLICY "Mayoristas y administradores pueden actualizar preregistros mayorista"
  ON preregistros_mayorista FOR UPDATE
  USING (
    (
      id_mayorista = auth.uid()
      AND EXISTS (
        SELECT 1 FROM usuarios
        WHERE usuarios.id = auth.uid()
        AND usuarios.rol = 'mayorista'
        AND usuarios.estado = 'activo'
      )
    )
    OR EXISTS (
      SELECT 1 FROM usuarios
      WHERE usuarios.id = auth.uid()
      AND usuarios.rol = 'admin'
      AND usuarios.estado = 'activo'
    )
  );

-- Eliminación: Mayoristas pueden eliminar sus propios preregistros, administradores pueden eliminar cualquier preregistro
CREATE POLICY "Mayoristas y administradores pueden eliminar preregistros mayorista"
  ON preregistros_mayorista FOR DELETE
  USING (
    (
      id_mayorista = auth.uid()
      AND EXISTS (
        SELECT 1 FROM usuarios
        WHERE usuarios.id = auth.uid()
        AND usuarios.rol = 'mayorista'
        AND usuarios.estado = 'activo'
      )
    )
    OR EXISTS (
      SELECT 1 FROM usuarios
      WHERE usuarios.id = auth.uid()
      AND usuarios.rol = 'admin'
      AND usuarios.estado = 'activo'
    )
  );


-- ============================================================================
-- MIGRACIÓN: Agregar roles Minorista y Mayorista
-- ============================================================================
-- Fecha: Diciembre 2025
-- Descripción: Agrega los roles 'minorista' y 'mayorista' al sistema
-- ============================================================================

-- Actualizar el CHECK constraint de la columna rol en usuarios
ALTER TABLE usuarios 
DROP CONSTRAINT IF EXISTS usuarios_rol_check;

ALTER TABLE usuarios 
ADD CONSTRAINT usuarios_rol_check 
CHECK (rol IN ('admin', 'vendedor', 'minorista', 'mayorista'));

-- Actualizar el comentario
COMMENT ON COLUMN usuarios.rol IS 'Rol del usuario: admin, vendedor, minorista o mayorista';

-- ============================================================================
-- TABLAS PARA PREREGISTROS
-- ============================================================================

-- Tabla: PREREGISTROS_MINORISTA
-- Almacena los preregistros de productos para minoristas
CREATE TABLE IF NOT EXISTS preregistros_minorista (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_producto UUID NOT NULL REFERENCES productos(id) ON DELETE CASCADE,
  cantidad INTEGER NOT NULL CHECK (cantidad > 0),
  fecha DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(id_producto, fecha)
);

COMMENT ON TABLE preregistros_minorista IS 'Preregistros de productos para minoristas (no afecta stock hasta la venta)';
COMMENT ON COLUMN preregistros_minorista.cantidad IS 'Cantidad preregistrada para el minorista';
COMMENT ON COLUMN preregistros_minorista.fecha IS 'Fecha del preregistro (solo se muestran los del día actual)';

-- Tabla: PREREGISTROS_MAYORISTA
-- Almacena los preregistros de productos para mayoristas específicos
CREATE TABLE IF NOT EXISTS preregistros_mayorista (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_mayorista UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  id_producto UUID NOT NULL REFERENCES productos(id) ON DELETE CASCADE,
  cantidad INTEGER NOT NULL CHECK (cantidad > 0),
  fecha DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(id_mayorista, id_producto, fecha)
);

COMMENT ON TABLE preregistros_mayorista IS 'Preregistros de productos para mayoristas específicos (no afecta stock hasta la venta)';
COMMENT ON COLUMN preregistros_mayorista.id_mayorista IS 'ID del usuario mayorista';
COMMENT ON COLUMN preregistros_mayorista.cantidad IS 'Cantidad preregistrada para el mayorista';
COMMENT ON COLUMN preregistros_mayorista.fecha IS 'Fecha del preregistro (solo se muestran los del día actual)';

-- Índices para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_preregistros_minorista_fecha ON preregistros_minorista(fecha);
CREATE INDEX IF NOT EXISTS idx_preregistros_minorista_producto ON preregistros_minorista(id_producto);
CREATE INDEX IF NOT EXISTS idx_preregistros_mayorista_fecha ON preregistros_mayorista(fecha);
CREATE INDEX IF NOT EXISTS idx_preregistros_mayorista_mayorista ON preregistros_mayorista(id_mayorista);
CREATE INDEX IF NOT EXISTS idx_preregistros_mayorista_producto ON preregistros_mayorista(id_producto);

-- Políticas RLS para preregistros_minorista
ALTER TABLE preregistros_minorista ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage minorista preregistros"
ON preregistros_minorista FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM usuarios 
    WHERE usuarios.id = auth.uid() 
    AND usuarios.rol = 'admin'
  )
);

CREATE POLICY "Minoristas can view their preregistros"
ON preregistros_minorista FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM usuarios 
    WHERE usuarios.id = auth.uid() 
    AND usuarios.rol = 'minorista'
  )
);

-- Políticas RLS para preregistros_mayorista
ALTER TABLE preregistros_mayorista ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage mayorista preregistros"
ON preregistros_mayorista FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM usuarios 
    WHERE usuarios.id = auth.uid() 
    AND usuarios.rol = 'admin'
  )
);

CREATE POLICY "Mayoristas can view their own preregistros"
ON preregistros_mayorista FOR SELECT
USING (
  id_mayorista = auth.uid() AND
  EXISTS (
    SELECT 1 FROM usuarios 
    WHERE usuarios.id = auth.uid() 
    AND usuarios.rol = 'mayorista'
  )
);

-- ============================================================================
-- NOTAS:
-- - Los preregistros no afectan el stock hasta que se realice la venta
-- - Solo se muestran los preregistros del día actual (fecha = CURRENT_DATE)
-- - Los minoristas ven todos los preregistros del día
-- - Los mayoristas solo ven sus propios preregistros
-- ============================================================================


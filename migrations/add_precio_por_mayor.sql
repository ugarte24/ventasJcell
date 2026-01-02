-- ============================================================================
-- MIGRACIÓN: Agregar campo precio_por_mayor a la tabla productos
-- ============================================================================
-- Fecha: Diciembre 2025
-- Descripción: Agrega el campo precio_por_mayor para diferenciar precios
--              de venta por unidad y por mayor
-- ============================================================================

-- Agregar columna precio_por_mayor a la tabla productos
ALTER TABLE productos 
ADD COLUMN IF NOT EXISTS precio_por_mayor NUMERIC(10, 2) CHECK (precio_por_mayor >= 0);

-- Comentario en la columna
COMMENT ON COLUMN productos.precio_por_mayor IS 'Precio de venta por mayor (opcional)';

-- ============================================================================
-- NOTAS:
-- - El campo es opcional (NULL permitido)
-- - Debe ser mayor o igual a 0 si se proporciona
-- - Los productos existentes tendrán NULL en este campo
-- ============================================================================


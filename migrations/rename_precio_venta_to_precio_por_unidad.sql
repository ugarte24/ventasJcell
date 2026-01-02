-- ============================================================================
-- MIGRACIÓN: Renombrar columna precio_venta a precio_por_unidad
-- ============================================================================
-- Fecha: Diciembre 2025
-- Descripción: Renombra la columna precio_venta a precio_por_unidad en la tabla productos
--              para reflejar mejor el propósito del campo
-- ============================================================================

-- Renombrar la columna precio_venta a precio_por_unidad
ALTER TABLE productos 
RENAME COLUMN precio_venta TO precio_por_unidad;

-- Actualizar el comentario de la columna
COMMENT ON COLUMN productos.precio_por_unidad IS 'Precio de venta por unidad';

-- ============================================================================
-- NOTAS:
-- - Esta migración renombra la columna sin perder datos
-- - Todas las referencias en el código deben actualizarse también
-- ============================================================================


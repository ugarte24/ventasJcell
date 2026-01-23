-- ============================================================================
-- AGREGAR CAMPO CANTIDAD_RESTANTE A PREREGISTROS
-- ============================================================================
-- Este script agrega el campo cantidad_restante a las tablas preregistros_minorista
-- y preregistros_mayorista para persistir los cambios manuales del saldo restante
-- ============================================================================

-- Agregar campo cantidad_restante a preregistros_minorista
ALTER TABLE preregistros_minorista 
ADD COLUMN IF NOT EXISTS cantidad_restante INTEGER;

-- Agregar campo cantidad_restante a preregistros_mayorista
ALTER TABLE preregistros_mayorista 
ADD COLUMN IF NOT EXISTS cantidad_restante INTEGER;

-- Agregar comentarios
COMMENT ON COLUMN preregistros_minorista.cantidad_restante IS 'Cantidad restante después de ventas. Se actualiza manualmente en Nueva Venta. Si es NULL, se calcula como cantidad + aumentos.';
COMMENT ON COLUMN preregistros_mayorista.cantidad_restante IS 'Cantidad restante después de ventas. Se actualiza manualmente en Nueva Venta. Si es NULL, se calcula como cantidad + aumentos.';

-- Inicializar cantidad_restante con NULL para registros existentes
-- (NULL significa que se calculará automáticamente como cantidad + aumentos)

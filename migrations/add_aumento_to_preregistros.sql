-- ============================================================================
-- AGREGAR CAMPO AUMENTO A PREREGISTROS
-- ============================================================================
-- Este script agrega el campo "aumento" a las tablas de preregistros
-- para rastrear las cantidades adicionales recibidas de pedidos
-- ============================================================================

-- Agregar campo aumento a preregistros_minorista
ALTER TABLE preregistros_minorista 
ADD COLUMN IF NOT EXISTS aumento INTEGER DEFAULT 0 NOT NULL CHECK (aumento >= 0);

COMMENT ON COLUMN preregistros_minorista.aumento IS 'Cantidad adicional recibida de pedidos entregados';

-- Agregar campo aumento a preregistros_mayorista
ALTER TABLE preregistros_mayorista 
ADD COLUMN IF NOT EXISTS aumento INTEGER DEFAULT 0 NOT NULL CHECK (aumento >= 0);

COMMENT ON COLUMN preregistros_mayorista.aumento IS 'Cantidad adicional recibida de pedidos entregados';


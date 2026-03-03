-- Agregar columna fecha a movimientos_inventario
-- Esta columna permite filtrar y ordenar por fecha sin depender solo de created_at

-- Agregar la columna fecha
ALTER TABLE movimientos_inventario 
ADD COLUMN IF NOT EXISTS fecha DATE;

-- Actualizar los registros existentes: usar la fecha de created_at
UPDATE movimientos_inventario
SET fecha = DATE(created_at AT TIME ZONE 'UTC')
WHERE fecha IS NULL;

-- Establecer un valor por defecto para futuros registros
ALTER TABLE movimientos_inventario
ALTER COLUMN fecha SET DEFAULT CURRENT_DATE;

-- Agregar comentario
COMMENT ON COLUMN movimientos_inventario.fecha IS 'Fecha del movimiento (extraída de created_at o proporcionada manualmente)';

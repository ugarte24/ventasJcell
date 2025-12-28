-- Migración: Agregar campo numero_cuota a pagos_credito
-- Fecha: 2025-01-XX

-- 1. Agregar campo numero_cuota a la tabla pagos_credito
ALTER TABLE pagos_credito
ADD COLUMN IF NOT EXISTS numero_cuota INTEGER;

-- 2. Actualizar registros existentes: asignar número de cuota basado en el orden de creación
-- Para cada venta, numerar los pagos en orden cronológico
DO $$
DECLARE
    v_venta RECORD;
    v_cuota INTEGER;
BEGIN
    FOR v_venta IN 
        SELECT DISTINCT id_venta 
        FROM pagos_credito 
        WHERE numero_cuota IS NULL
    LOOP
        v_cuota := 1;
        
        -- Actualizar pagos en orden de fecha de pago
        UPDATE pagos_credito
        SET numero_cuota = v_cuota
        FROM (
            SELECT id
            FROM pagos_credito
            WHERE id_venta = v_venta.id_venta
              AND numero_cuota IS NULL
            ORDER BY fecha_pago ASC, created_at ASC
        ) AS ordenados
        WHERE pagos_credito.id = ordenados.id
          AND pagos_credito.id_venta = v_venta.id_venta;
        
        -- Renumerar correctamente
        v_cuota := 1;
        FOR v_cuota IN 1..(
            SELECT COUNT(*) 
            FROM pagos_credito 
            WHERE id_venta = v_venta.id_venta
        )
        LOOP
            UPDATE pagos_credito
            SET numero_cuota = v_cuota
            WHERE id = (
                SELECT id
                FROM pagos_credito
                WHERE id_venta = v_venta.id_venta
                ORDER BY fecha_pago ASC, created_at ASC
                LIMIT 1 OFFSET (v_cuota - 1)
            );
        END LOOP;
    END LOOP;
END $$;

-- 3. Agregar comentario al campo
COMMENT ON COLUMN pagos_credito.numero_cuota IS 'Número de cuota que se está pagando (1, 2, 3, etc.)';


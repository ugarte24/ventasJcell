-- Migración: Agregar campo cuota_inicial a ventas
-- Esta migración agrega el campo cuota_inicial para manejar pagos iniciales en ventas a crédito

-- 1. Agregar campo cuota_inicial a la tabla ventas
ALTER TABLE ventas
ADD COLUMN IF NOT EXISTS cuota_inicial NUMERIC(10, 2) DEFAULT 0;

-- 2. Actualizar la función calcular_interes_mensual para considerar la cuota inicial
-- El interés se calcula sobre (total - cuota_inicial) en lugar de solo total
DROP FUNCTION IF EXISTS calcular_interes_mensual(UUID);

CREATE FUNCTION calcular_interes_mensual(id_venta UUID)
RETURNS NUMERIC AS $$
DECLARE
  v_total NUMERIC;
  v_cuota_inicial NUMERIC;
  v_total_base NUMERIC; -- Total sobre el cual se calcula el interés (total - cuota_inicial)
  v_tasa_interes NUMERIC;
  v_fecha_venta DATE;
  v_fecha_actual DATE;
  v_meses_transcurridos INTEGER;
  v_interes NUMERIC;
  v_interes_eximido BOOLEAN;
BEGIN
  -- Obtener datos de la venta
  SELECT 
    total,
    COALESCE(cuota_inicial, 0),
    COALESCE(tasa_interes, 0),
    fecha,
    COALESCE(interes_eximido, false)
  INTO 
    v_total,
    v_cuota_inicial,
    v_tasa_interes,
    v_fecha_venta,
    v_interes_eximido
  FROM ventas
  WHERE id = id_venta;

  -- Si no se encuentra la venta o no tiene interés, retornar 0
  IF v_total IS NULL OR v_interes_eximido OR v_tasa_interes = 0 THEN
    RETURN 0;
  END IF;

  -- Calcular el total base sobre el cual se calcula el interés (total - cuota inicial)
  v_total_base := v_total - COALESCE(v_cuota_inicial, 0);
  
  -- Si el total base es 0 o negativo, no hay interés
  IF v_total_base <= 0 THEN
    RETURN 0;
  END IF;

  -- Obtener fecha actual
  v_fecha_actual := CURRENT_DATE;

  -- Calcular meses transcurridos desde la fecha de venta
  -- Usar CEIL para redondear hacia arriba (mínimo 1 mes desde la fecha de venta)
  v_meses_transcurridos := CEIL((v_fecha_actual - v_fecha_venta) / 30.0);
  
  -- Asegurar que al menos se calcule 1 mes de interés desde la fecha de venta
  IF v_meses_transcurridos <= 0 THEN
    v_meses_transcurridos := 1;
  END IF;

  -- Calcular interés: (total - cuota_inicial) * (tasa / 100) * meses_transcurridos
  v_interes := v_total_base * (v_tasa_interes / 100.0) * v_meses_transcurridos;

  RETURN v_interes;
END;
$$ LANGUAGE plpgsql;

-- 3. Actualizar la función del trigger para considerar cuota_inicial
CREATE OR REPLACE FUNCTION recalcular_interes_venta()
RETURNS TRIGGER AS $$
DECLARE
  v_monto_interes NUMERIC;
  v_total_con_interes NUMERIC;
  v_total_base NUMERIC; -- Total sobre el cual se calcula el interés
BEGIN
  -- Solo procesar si es una venta a crédito
  IF NEW.metodo_pago = 'credito' THEN
    -- Calcular interés usando la función
    v_monto_interes := calcular_interes_mensual(NEW.id);
    
    -- Si no se puede calcular (porque NEW.id no existe aún en INSERT), calcular directamente
    IF v_monto_interes IS NULL AND TG_OP = 'INSERT' THEN
      -- Calcular directamente usando NEW
      IF NEW.interes_eximido OR COALESCE(NEW.tasa_interes, 0) = 0 THEN
        v_monto_interes := 0;
      ELSE
        DECLARE
          v_meses_transcurridos INTEGER;
          v_cuota_inicial NUMERIC;
        BEGIN
          -- Calcular total base (total - cuota_inicial)
          v_cuota_inicial := COALESCE(NEW.cuota_inicial, 0);
          v_total_base := NEW.total - v_cuota_inicial;
          
          -- Si el total base es 0 o negativo, no hay interés
          IF v_total_base <= 0 THEN
            v_monto_interes := 0;
          ELSE
            -- Para INSERT, siempre aplicar 1 mes mínimo de interés desde la fecha de venta
            v_meses_transcurridos := 1;
            
            -- Calcular interés: (total - cuota_inicial) * (tasa / 100) * meses_transcurridos
            v_monto_interes := v_total_base * (NEW.tasa_interes / 100.0) * v_meses_transcurridos;
          END IF;
        END;
      END IF;
    END IF;

    -- Asignar valores calculados
    NEW.monto_interes := COALESCE(v_monto_interes, 0);
    
    -- Calcular total con interés: total original + (interés × número de cuotas)
    -- Como el interés se suma a cada cuota, el total a pagar es: total + (interés × cuotas)
    DECLARE
      v_cuotas INTEGER;
    BEGIN
      v_cuotas := COALESCE(NEW.meses_credito, 1);
      NEW.total_con_interes := NEW.total + (NEW.monto_interes * v_cuotas);
    END;
  ELSE
    -- Si no es crédito, limpiar campos relacionados
    NEW.monto_interes := NULL;
    NEW.total_con_interes := NULL;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Recalcular intereses para todas las ventas a crédito existentes
UPDATE ventas
SET 
  monto_interes = calcular_interes_mensual(id),
  total_con_interes = CASE 
    WHEN interes_eximido THEN total
    ELSE total + COALESCE(calcular_interes_mensual(id), 0)
  END
WHERE metodo_pago = 'credito';

-- 5. Agregar comentario al campo
COMMENT ON COLUMN ventas.cuota_inicial IS 'Cuota inicial pagada al momento de la venta a crédito. El interés se calcula sobre (total - cuota_inicial)';


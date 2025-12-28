-- Migración: Permitir edición manual de monto_aumentado en registros_servicios
-- Archivo: migrations/fix_monto_aumentado_manual.sql

-- Modificar la función del trigger para que solo calcule monto_aumentado si no se proporciona un valor manual
-- Si monto_aumentado es NULL, se calcula automáticamente
-- Si monto_aumentado tiene un valor (incluso 0), se respeta ese valor manual
CREATE OR REPLACE FUNCTION calcular_montos_registro_servicio()
RETURNS TRIGGER AS $$
DECLARE
  v_monto_aumentado NUMERIC;
BEGIN
  -- Solo calcular monto_aumentado automáticamente si es NULL
  -- Si tiene un valor (incluso 0), respetar el valor manual del usuario
  IF NEW.monto_aumentado IS NULL THEN
    -- Calcular monto_aumentado del día solo si no se proporciona un valor
    v_monto_aumentado := calcular_monto_aumentado(NEW.id_servicio, NEW.fecha);
    NEW.monto_aumentado := v_monto_aumentado;
  ELSE
    -- Si se proporciona un valor manual (incluso 0), usarlo
    v_monto_aumentado := NEW.monto_aumentado;
  END IF;
  
  -- Calcular monto_transaccionado usando el monto_aumentado (calculado o manual)
  NEW.monto_transaccionado := calcular_monto_transaccionado(
    NEW.saldo_final,
    NEW.saldo_inicial,
    v_monto_aumentado
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- Migración: Corregir fórmula de monto_transaccionado en registros_servicios
-- Nueva fórmula: monto_transaccionado = saldo_inicial + monto_aumentado - saldo_final

-- Actualizar función para calcular monto_transaccionado
CREATE OR REPLACE FUNCTION calcular_monto_transaccionado(
  p_saldo_final NUMERIC,
  p_saldo_inicial NUMERIC,
  p_monto_aumentado NUMERIC
)
RETURNS NUMERIC AS $$
BEGIN
  -- monto_transaccionado = saldo_inicial + monto_aumentado - saldo_final
  RETURN p_saldo_inicial + p_monto_aumentado - p_saldo_final;
END;
$$ LANGUAGE plpgsql;


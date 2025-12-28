-- Migración: Crear tablas para gestión de servicios (Recarga, Agente BCP, etc.)
-- Esta migración crea las tablas necesarias para gestionar servicios con saldos iniciales, finales y movimientos

-- 1. Crear tabla SERVICIOS
CREATE TABLE IF NOT EXISTS servicios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre VARCHAR(100) NOT NULL UNIQUE,
  descripcion TEXT,
  saldo_actual NUMERIC(10, 2) DEFAULT 0 NOT NULL,
  estado VARCHAR(20) DEFAULT 'activo' CHECK (estado IN ('activo', 'inactivo')),
  created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT (NOW() AT TIME ZONE 'UTC'),
  updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT (NOW() AT TIME ZONE 'UTC')
);

-- 2. Crear tabla MOVIMIENTOS_SERVICIOS (para aumentar saldos)
CREATE TABLE IF NOT EXISTS movimientos_servicios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_servicio UUID NOT NULL REFERENCES servicios(id) ON DELETE CASCADE,
  tipo VARCHAR(20) DEFAULT 'aumento' CHECK (tipo IN ('aumento', 'ajuste')),
  monto NUMERIC(10, 2) NOT NULL CHECK (monto > 0),
  saldo_anterior NUMERIC(10, 2) NOT NULL,
  saldo_nuevo NUMERIC(10, 2) NOT NULL,
  fecha DATE NOT NULL,
  hora VARCHAR(8) NOT NULL,
  id_usuario UUID NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,
  observacion TEXT,
  created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT (NOW() AT TIME ZONE 'UTC')
);

-- 3. Crear tabla REGISTROS_SERVICIOS (cierre diario)
CREATE TABLE IF NOT EXISTS registros_servicios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_servicio UUID NOT NULL REFERENCES servicios(id) ON DELETE CASCADE,
  fecha DATE NOT NULL,
  saldo_inicial NUMERIC(10, 2) NOT NULL,
  saldo_final NUMERIC(10, 2) NOT NULL,
  monto_transaccionado NUMERIC(10, 2) DEFAULT 0 NOT NULL,
  monto_aumentado NUMERIC(10, 2) DEFAULT 0 NOT NULL,
  id_usuario UUID NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,
  observacion TEXT,
  created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT (NOW() AT TIME ZONE 'UTC'),
  updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT (NOW() AT TIME ZONE 'UTC'),
  UNIQUE(id_servicio, fecha) -- Un registro por servicio por día
);

-- 4. Crear índices para mejorar performance
CREATE INDEX IF NOT EXISTS idx_movimientos_servicios_servicio ON movimientos_servicios(id_servicio);
CREATE INDEX IF NOT EXISTS idx_movimientos_servicios_fecha ON movimientos_servicios(fecha);
CREATE INDEX IF NOT EXISTS idx_registros_servicios_servicio ON registros_servicios(id_servicio);
CREATE INDEX IF NOT EXISTS idx_registros_servicios_fecha ON registros_servicios(fecha);
CREATE INDEX IF NOT EXISTS idx_servicios_estado ON servicios(estado);

-- 5. Crear función trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW() AT TIME ZONE 'UTC';
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6. Crear triggers para updated_at
CREATE TRIGGER update_servicios_updated_at
  BEFORE UPDATE ON servicios
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_registros_servicios_updated_at
  BEFORE UPDATE ON registros_servicios
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 7. Crear función trigger para actualizar saldo_actual cuando hay un movimiento
CREATE OR REPLACE FUNCTION actualizar_saldo_servicio()
RETURNS TRIGGER AS $$
BEGIN
  -- Actualizar el saldo_actual del servicio
  UPDATE servicios
  SET saldo_actual = NEW.saldo_nuevo,
      updated_at = NOW() AT TIME ZONE 'UTC'
  WHERE id = NEW.id_servicio;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 8. Crear trigger para actualizar saldo automáticamente
CREATE TRIGGER trigger_actualizar_saldo_servicio
  AFTER INSERT ON movimientos_servicios
  FOR EACH ROW
  EXECUTE FUNCTION actualizar_saldo_servicio();

-- 9. Crear función para calcular monto_aumentado en registros_servicios
CREATE OR REPLACE FUNCTION calcular_monto_aumentado(p_id_servicio UUID, p_fecha DATE)
RETURNS NUMERIC AS $$
DECLARE
  v_monto_aumentado NUMERIC;
BEGIN
  SELECT COALESCE(SUM(monto), 0)
  INTO v_monto_aumentado
  FROM movimientos_servicios
  WHERE id_servicio = p_id_servicio
    AND fecha = p_fecha
    AND tipo = 'aumento';
  
  RETURN COALESCE(v_monto_aumentado, 0);
END;
$$ LANGUAGE plpgsql;

-- 10. Crear función para calcular monto_transaccionado en registros_servicios
CREATE OR REPLACE FUNCTION calcular_monto_transaccionado(
  p_saldo_final NUMERIC,
  p_saldo_inicial NUMERIC,
  p_monto_aumentado NUMERIC
)
RETURNS NUMERIC AS $$
BEGIN
  -- monto_transaccionado = saldo_final - saldo_inicial - monto_aumentado
  RETURN p_saldo_final - p_saldo_inicial - p_monto_aumentado;
END;
$$ LANGUAGE plpgsql;

-- 11. Crear trigger para calcular automáticamente monto_transaccionado y monto_aumentado
CREATE OR REPLACE FUNCTION calcular_montos_registro_servicio()
RETURNS TRIGGER AS $$
DECLARE
  v_monto_aumentado NUMERIC;
BEGIN
  -- Calcular monto_aumentado del día
  v_monto_aumentado := calcular_monto_aumentado(NEW.id_servicio, NEW.fecha);
  NEW.monto_aumentado := v_monto_aumentado;
  
  -- Calcular monto_transaccionado
  NEW.monto_transaccionado := calcular_monto_transaccionado(
    NEW.saldo_final,
    NEW.saldo_inicial,
    v_monto_aumentado
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 12. Crear trigger para calcular montos automáticamente
CREATE TRIGGER trigger_calcular_montos_registro_servicio
  BEFORE INSERT OR UPDATE ON registros_servicios
  FOR EACH ROW
  EXECUTE FUNCTION calcular_montos_registro_servicio();

-- 13. Insertar servicios iniciales (Recarga y Agente BCP)
INSERT INTO servicios (nombre, descripcion, saldo_actual, estado)
VALUES 
  ('Recarga', 'Servicio de recarga de saldo telefónico', 0, 'activo'),
  ('Agente BCP', 'Servicio de agente de Banco BCP', 0, 'activo')
ON CONFLICT (nombre) DO NOTHING;

-- 14. Habilitar Row Level Security (RLS)
ALTER TABLE servicios ENABLE ROW LEVEL SECURITY;
ALTER TABLE movimientos_servicios ENABLE ROW LEVEL SECURITY;
ALTER TABLE registros_servicios ENABLE ROW LEVEL SECURITY;

-- 15. Crear políticas RLS para servicios (todos los autenticados pueden leer, solo admin puede escribir)
CREATE POLICY "Los usuarios autenticados pueden ver servicios activos"
  ON servicios FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Solo admins pueden crear servicios"
  ON servicios FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE usuarios.id::text = auth.uid()::text
      AND usuarios.rol = 'admin'
    )
  );

CREATE POLICY "Solo admins pueden actualizar servicios"
  ON servicios FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE usuarios.id::text = auth.uid()::text
      AND usuarios.rol = 'admin'
    )
  );

CREATE POLICY "Solo admins pueden eliminar servicios"
  ON servicios FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE usuarios.id::text = auth.uid()::text
      AND usuarios.rol = 'admin'
    )
  );

-- 16. Crear políticas RLS para movimientos_servicios (todos pueden ver, todos pueden crear)
CREATE POLICY "Los usuarios autenticados pueden ver movimientos"
  ON movimientos_servicios FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Los usuarios autenticados pueden crear movimientos"
  ON movimientos_servicios FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- 17. Crear políticas RLS para registros_servicios (todos pueden ver, todos pueden crear/actualizar)
CREATE POLICY "Los usuarios autenticados pueden ver registros"
  ON registros_servicios FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Los usuarios autenticados pueden crear registros"
  ON registros_servicios FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Los usuarios autenticados pueden actualizar registros"
  ON registros_servicios FOR UPDATE
  USING (auth.role() = 'authenticated');

-- 18. Agregar comentarios a las tablas
COMMENT ON TABLE servicios IS 'Tipos de servicios ofrecidos (Recarga, Agente BCP, etc.)';
COMMENT ON TABLE movimientos_servicios IS 'Movimientos de aumento/ajuste de saldo en servicios';
COMMENT ON TABLE registros_servicios IS 'Registros diarios de cierre con saldo inicial y final por servicio';

COMMENT ON COLUMN servicios.saldo_actual IS 'Saldo actual disponible del servicio';
COMMENT ON COLUMN movimientos_servicios.monto IS 'Monto del movimiento (siempre positivo)';
COMMENT ON COLUMN movimientos_servicios.saldo_anterior IS 'Saldo antes del movimiento';
COMMENT ON COLUMN movimientos_servicios.saldo_nuevo IS 'Saldo después del movimiento';
COMMENT ON COLUMN registros_servicios.monto_aumentado IS 'Suma de todos los aumentos realizados en el día';
COMMENT ON COLUMN registros_servicios.monto_transaccionado IS 'Monto transaccionado = saldo_final - saldo_inicial - monto_aumentado';


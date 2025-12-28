-- Migración: Reestructuración de tablas de servicios y registros de servicios
-- Esta migración reorganiza y optimiza la estructura de las tablas de servicios

-- ============================================
-- 1. ELIMINAR TRIGGERS Y FUNCIONES EXISTENTES
-- ============================================
DROP TRIGGER IF EXISTS trigger_calcular_montos_registro_servicio ON registros_servicios;
DROP TRIGGER IF EXISTS update_servicios_updated_at ON servicios;
DROP TRIGGER IF EXISTS update_registros_servicios_updated_at ON registros_servicios;

DROP FUNCTION IF EXISTS calcular_montos_registro_servicio();
DROP FUNCTION IF EXISTS calcular_monto_aumentado(UUID, DATE);
DROP FUNCTION IF EXISTS calcular_monto_transaccionado(NUMERIC, NUMERIC, NUMERIC);

-- ============================================
-- 2. ELIMINAR TABLAS EXISTENTES (CASCADE eliminará dependencias)
-- ============================================
DROP TABLE IF EXISTS registros_servicios CASCADE;
DROP TABLE IF EXISTS movimientos_servicios CASCADE;
DROP TABLE IF EXISTS servicios CASCADE;

-- ============================================
-- 3. CREAR TABLA SERVICIOS (Reestructurada)
-- ============================================
CREATE TABLE servicios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre VARCHAR(100) NOT NULL UNIQUE,
  descripcion TEXT,
  estado VARCHAR(20) DEFAULT 'activo' NOT NULL CHECK (estado IN ('activo', 'inactivo')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

COMMENT ON TABLE servicios IS 'Tipos de servicios ofrecidos (ej. Recarga, Agente BCP).';

-- ============================================
-- 4. CREAR TABLA MOVIMIENTOS_SERVICIOS (Reestructurada)
-- ============================================
CREATE TABLE movimientos_servicios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_servicio UUID NOT NULL REFERENCES servicios(id) ON DELETE CASCADE,
  tipo VARCHAR(20) DEFAULT 'aumento' NOT NULL CHECK (tipo IN ('aumento', 'ajuste')),
  monto NUMERIC(10, 2) NOT NULL CHECK (monto > 0),
  saldo_anterior NUMERIC(10, 2) NOT NULL CHECK (saldo_anterior >= 0),
  saldo_nuevo NUMERIC(10, 2) NOT NULL CHECK (saldo_nuevo >= 0),
  fecha DATE NOT NULL,
  hora TIME NOT NULL,
  id_usuario UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  observacion TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

COMMENT ON TABLE movimientos_servicios IS 'Registra los aumentos o ajustes de saldo de los servicios.';
COMMENT ON COLUMN movimientos_servicios.monto IS 'Monto del movimiento (siempre positivo)';
COMMENT ON COLUMN movimientos_servicios.saldo_anterior IS 'Saldo del servicio antes del movimiento';
COMMENT ON COLUMN movimientos_servicios.saldo_nuevo IS 'Saldo del servicio después del movimiento';

-- ============================================
-- 5. CREAR TABLA REGISTROS_SERVICIOS (Reestructurada)
-- ============================================
CREATE TABLE registros_servicios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_servicio UUID NOT NULL REFERENCES servicios(id) ON DELETE CASCADE,
  fecha DATE NOT NULL,
  saldo_inicial NUMERIC(10, 2) NOT NULL CHECK (saldo_inicial >= 0),
  saldo_final NUMERIC(10, 2) NOT NULL CHECK (saldo_final >= 0),
  monto_aumentado NUMERIC(10, 2) DEFAULT 0 NOT NULL CHECK (monto_aumentado >= 0),
  monto_transaccionado NUMERIC(10, 2) DEFAULT 0 NOT NULL,
  id_usuario UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  observacion TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(id_servicio, fecha) -- Un registro por servicio por día
);

COMMENT ON TABLE registros_servicios IS 'Registro diario de saldos iniciales y finales de los servicios.';
COMMENT ON COLUMN registros_servicios.monto_aumentado IS 'Suma de todos los aumentos realizados en el día. Puede ser calculado automáticamente o editado manualmente.';
COMMENT ON COLUMN registros_servicios.monto_transaccionado IS 'Monto transaccionado = saldo_inicial + monto_aumentado - saldo_final';

-- ============================================
-- 6. CREAR ÍNDICES PARA OPTIMIZACIÓN
-- ============================================
CREATE INDEX idx_servicios_estado ON servicios(estado);
CREATE INDEX idx_servicios_nombre ON servicios(nombre);

CREATE INDEX idx_movimientos_servicios_servicio ON movimientos_servicios(id_servicio);
CREATE INDEX idx_movimientos_servicios_fecha ON movimientos_servicios(fecha);
CREATE INDEX idx_movimientos_servicios_tipo ON movimientos_servicios(tipo);
CREATE INDEX idx_movimientos_servicios_servicio_fecha ON movimientos_servicios(id_servicio, fecha);

CREATE INDEX idx_registros_servicios_servicio ON registros_servicios(id_servicio);
CREATE INDEX idx_registros_servicios_fecha ON registros_servicios(fecha);
CREATE INDEX idx_registros_servicios_servicio_fecha ON registros_servicios(id_servicio, fecha);

-- ============================================
-- 8. FUNCIONES Y TRIGGERS
-- ============================================

-- Función para actualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para actualizar updated_at en servicios
CREATE TRIGGER update_servicios_updated_at
  BEFORE UPDATE ON servicios
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger para actualizar updated_at en registros_servicios
CREATE TRIGGER update_registros_servicios_updated_at
  BEFORE UPDATE ON registros_servicios
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();


-- Función para calcular monto_aumentado en registros_servicios
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

-- Función para calcular monto_transaccionado en registros_servicios
CREATE OR REPLACE FUNCTION calcular_monto_transaccionado(
  p_saldo_final NUMERIC,
  p_saldo_inicial NUMERIC,
  p_monto_aumentado NUMERIC
)
RETURNS NUMERIC AS $$
BEGIN
  -- Fórmula: monto_transaccionado = saldo_inicial + monto_aumentado - saldo_final
  RETURN p_saldo_inicial + p_monto_aumentado - p_saldo_final;
END;
$$ LANGUAGE plpgsql;

-- Función del trigger para calcular automáticamente monto_transaccionado y monto_aumentado
CREATE OR REPLACE FUNCTION calcular_montos_registro_servicio()
RETURNS TRIGGER AS $$
DECLARE
  v_monto_aumentado_calculado NUMERIC;
BEGIN
  -- Si NEW.monto_aumentado es NULL, calcularlo. De lo contrario, respetar el valor proporcionado.
  IF NEW.monto_aumentado IS NULL THEN
    v_monto_aumentado_calculado := calcular_monto_aumentado(NEW.id_servicio, NEW.fecha);
    NEW.monto_aumentado := v_monto_aumentado_calculado;
  END IF;

  -- Calcular monto_transaccionado usando el monto_aumentado (ya sea manual o calculado)
  NEW.monto_transaccionado := calcular_monto_transaccionado(
    NEW.saldo_final,
    NEW.saldo_inicial,
    NEW.monto_aumentado -- Usar el valor de NEW.monto_aumentado (manual o calculado)
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para calcular montos automáticamente
CREATE TRIGGER trigger_calcular_montos_registro_servicio
  BEFORE INSERT OR UPDATE ON registros_servicios
  FOR EACH ROW
  EXECUTE FUNCTION calcular_montos_registro_servicio();

-- ============================================
-- 7. HABILITAR ROW LEVEL SECURITY (RLS)
-- ============================================
ALTER TABLE servicios ENABLE ROW LEVEL SECURITY;
ALTER TABLE movimientos_servicios ENABLE ROW LEVEL SECURITY;
ALTER TABLE registros_servicios ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 8. CREAR POLÍTICAS RLS
-- ============================================

-- Políticas para SERVICIOS
DROP POLICY IF EXISTS "Los usuarios autenticados pueden ver servicios activos" ON servicios;
CREATE POLICY "Los usuarios autenticados pueden ver servicios activos"
  ON servicios FOR SELECT
  USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Solo admins pueden crear servicios" ON servicios;
CREATE POLICY "Solo admins pueden crear servicios"
  ON servicios FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE usuarios.id::text = auth.uid()::text
      AND usuarios.rol = 'admin'
    )
  );

DROP POLICY IF EXISTS "Solo admins pueden actualizar servicios" ON servicios;
CREATE POLICY "Solo admins pueden actualizar servicios"
  ON servicios FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE usuarios.id::text = auth.uid()::text
      AND usuarios.rol = 'admin'
    )
  );

DROP POLICY IF EXISTS "Solo admins pueden eliminar servicios" ON servicios;
CREATE POLICY "Solo admins pueden eliminar servicios"
  ON servicios FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE usuarios.id::text = auth.uid()::text
      AND usuarios.rol = 'admin'
    )
  );

-- Políticas para MOVIMIENTOS_SERVICIOS
DROP POLICY IF EXISTS "Los usuarios autenticados pueden ver movimientos" ON movimientos_servicios;
CREATE POLICY "Los usuarios autenticados pueden ver movimientos"
  ON movimientos_servicios FOR SELECT
  USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Los usuarios autenticados pueden crear movimientos" ON movimientos_servicios;
CREATE POLICY "Los usuarios autenticados pueden crear movimientos"
  ON movimientos_servicios FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Solo admins pueden actualizar movimientos" ON movimientos_servicios;
CREATE POLICY "Solo admins pueden actualizar movimientos"
  ON movimientos_servicios FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE usuarios.id::text = auth.uid()::text
      AND usuarios.rol = 'admin'
    )
  );

DROP POLICY IF EXISTS "Solo admins pueden eliminar movimientos" ON movimientos_servicios;
CREATE POLICY "Solo admins pueden eliminar movimientos"
  ON movimientos_servicios FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE usuarios.id::text = auth.uid()::text
      AND usuarios.rol = 'admin'
    )
  );

-- Políticas para REGISTROS_SERVICIOS
DROP POLICY IF EXISTS "Los usuarios autenticados pueden ver registros" ON registros_servicios;
CREATE POLICY "Los usuarios autenticados pueden ver registros"
  ON registros_servicios FOR SELECT
  USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Los usuarios autenticados pueden crear registros" ON registros_servicios;
CREATE POLICY "Los usuarios autenticados pueden crear registros"
  ON registros_servicios FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Los usuarios autenticados pueden actualizar registros" ON registros_servicios;
CREATE POLICY "Los usuarios autenticados pueden actualizar registros"
  ON registros_servicios FOR UPDATE
  USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Solo admins pueden eliminar registros" ON registros_servicios;
CREATE POLICY "Solo admins pueden eliminar registros"
  ON registros_servicios FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE usuarios.id::text = auth.uid()::text
      AND usuarios.rol = 'admin'
    )
  );

-- ============================================
-- 9. INSERTAR SERVICIOS INICIALES (si no existen)
-- ============================================
INSERT INTO servicios (nombre, descripcion, estado)
VALUES 
  ('Recarga', 'Servicio de recarga de saldo telefónico', 'activo'),
  ('Agente BCP', 'Servicio de agente de Banco BCP', 'activo')
ON CONFLICT (nombre) DO NOTHING;


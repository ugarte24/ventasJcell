-- ============================================================================
-- VENTAPLUS - SCRIPT SQL MAESTRO PARA DUPLICACIÓN DEL SISTEMA
-- ============================================================================
-- Este script crea toda la estructura de base de datos necesaria para VentaPlus
-- Ejecutar este script en un proyecto nuevo de Supabase para duplicar el sistema
-- 
-- ORDEN DE EJECUCIÓN:
-- 1. Tablas base (sin dependencias)
-- 2. Tablas con dependencias
-- 3. Funciones
-- 4. Triggers
-- 5. Índices
-- 6. Políticas RLS
-- 7. Datos iniciales
-- ============================================================================

-- ============================================================================
-- SECCIÓN 1: TABLAS BASE (SIN DEPENDENCIAS)
-- ============================================================================

-- Tabla: USUARIOS
-- Extiende auth.users de Supabase
CREATE TABLE IF NOT EXISTS usuarios (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nombre VARCHAR(255) NOT NULL,
  usuario VARCHAR(100) NOT NULL UNIQUE,
  email VARCHAR(255),
  rol VARCHAR(20) NOT NULL CHECK (rol IN ('admin', 'vendedor', 'minorista', 'mayorista')),
  estado VARCHAR(20) DEFAULT 'activo' NOT NULL CHECK (estado IN ('activo', 'inactivo')),
  fecha_creacion TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

COMMENT ON TABLE usuarios IS 'Usuarios del sistema que extienden auth.users de Supabase';
COMMENT ON COLUMN usuarios.id IS 'ID del usuario en auth.users (UUID)';
COMMENT ON COLUMN usuarios.rol IS 'Rol del usuario: admin, vendedor, minorista o mayorista';

-- Tabla: CATEGORIAS
CREATE TABLE IF NOT EXISTS categorias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre VARCHAR(255) NOT NULL UNIQUE,
  descripcion TEXT,
  estado VARCHAR(20) DEFAULT 'activo' NOT NULL CHECK (estado IN ('activo', 'inactivo')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

COMMENT ON TABLE categorias IS 'Categorías de productos';

-- ============================================================================
-- SECCIÓN 2: TABLAS CON DEPENDENCIAS
-- ============================================================================

-- Tabla: PRODUCTOS (depende de categorias)
CREATE TABLE IF NOT EXISTS productos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre VARCHAR(255) NOT NULL,
  descripcion TEXT,
  precio_por_unidad NUMERIC(10, 2) NOT NULL CHECK (precio_por_unidad >= 0),
  codigo VARCHAR(100) NOT NULL UNIQUE,
  id_categoria UUID REFERENCES categorias(id) ON DELETE SET NULL,
  stock_actual INTEGER DEFAULT 0 NOT NULL CHECK (stock_actual >= 0),
  stock_minimo INTEGER DEFAULT 0 NOT NULL CHECK (stock_minimo >= 0),
  imagen_url TEXT,
  estado VARCHAR(20) DEFAULT 'activo' NOT NULL CHECK (estado IN ('activo', 'inactivo')),
  fecha_creacion TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

COMMENT ON TABLE productos IS 'Productos del inventario';
COMMENT ON COLUMN productos.stock_actual IS 'Stock actual disponible';
COMMENT ON COLUMN productos.stock_minimo IS 'Stock mínimo para alertas';

-- Tabla: CLIENTES
CREATE TABLE IF NOT EXISTS clientes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre VARCHAR(255) NOT NULL,
  ci_nit VARCHAR(50),
  telefono VARCHAR(20),
  direccion TEXT,
  fecha_registro DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

COMMENT ON TABLE clientes IS 'Clientes del sistema';

-- Tabla: VENTAS (depende de usuarios y clientes)
CREATE TABLE IF NOT EXISTS ventas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fecha DATE NOT NULL DEFAULT CURRENT_DATE,
  hora TIME NOT NULL DEFAULT CURRENT_TIME,
  total NUMERIC(10, 2) NOT NULL CHECK (total >= 0),
  metodo_pago VARCHAR(20) NOT NULL CHECK (metodo_pago IN ('efectivo', 'qr', 'transferencia', 'credito')),
  id_cliente UUID REFERENCES clientes(id) ON DELETE SET NULL,
  id_vendedor UUID NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,
  estado VARCHAR(20) DEFAULT 'completada' NOT NULL CHECK (estado IN ('completada', 'anulada')),
  -- Campos para ventas a crédito
  meses_credito INTEGER CHECK (meses_credito > 0),
  cuota_inicial NUMERIC(10, 2) DEFAULT 0 CHECK (cuota_inicial >= 0),
  tasa_interes NUMERIC(5, 2) CHECK (tasa_interes >= 0),
  monto_interes NUMERIC(10, 2) CHECK (monto_interes >= 0),
  total_con_interes NUMERIC(10, 2) CHECK (total_con_interes >= 0),
  monto_pagado NUMERIC(10, 2) DEFAULT 0 CHECK (monto_pagado >= 0),
  estado_credito VARCHAR(20) CHECK (estado_credito IN ('pendiente', 'parcial', 'pagado', 'vencido')),
  fecha_vencimiento DATE,
  interes_eximido BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

COMMENT ON TABLE ventas IS 'Ventas realizadas en el sistema';
COMMENT ON COLUMN ventas.cuota_inicial IS 'Cuota inicial pagada al momento de la venta a crédito';
COMMENT ON COLUMN ventas.monto_interes IS 'Interés calculado sobre (total - cuota_inicial)';
COMMENT ON COLUMN ventas.total_con_interes IS 'Total + (interés × número de cuotas)';

-- Tabla: DETALLE_VENTA (depende de ventas y productos)
CREATE TABLE IF NOT EXISTS detalle_venta (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_venta UUID NOT NULL REFERENCES ventas(id) ON DELETE CASCADE,
  id_producto UUID NOT NULL REFERENCES productos(id) ON DELETE RESTRICT,
  cantidad INTEGER NOT NULL CHECK (cantidad > 0),
  precio_unitario NUMERIC(10, 2) NOT NULL CHECK (precio_unitario >= 0),
  subtotal NUMERIC(10, 2) NOT NULL CHECK (subtotal >= 0),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

COMMENT ON TABLE detalle_venta IS 'Detalle de productos en cada venta';
COMMENT ON COLUMN detalle_venta.precio_unitario IS 'Precio al momento de la venta (snapshot)';

-- Tabla: PAGOS_CREDITO (depende de ventas y usuarios)
CREATE TABLE IF NOT EXISTS pagos_credito (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_venta UUID NOT NULL REFERENCES ventas(id) ON DELETE CASCADE,
  monto_pagado NUMERIC(10, 2) NOT NULL CHECK (monto_pagado > 0),
  fecha_pago DATE NOT NULL DEFAULT CURRENT_DATE,
  metodo_pago VARCHAR(20) NOT NULL CHECK (metodo_pago IN ('efectivo', 'qr', 'transferencia')),
  numero_cuota INTEGER CHECK (numero_cuota > 0),
  observacion TEXT,
  id_usuario UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

COMMENT ON TABLE pagos_credito IS 'Pagos realizados para ventas a crédito';
COMMENT ON COLUMN pagos_credito.numero_cuota IS 'Número de cuota que se está pagando (1, 2, 3, etc.)';

-- Tabla: SERVICIOS
CREATE TABLE IF NOT EXISTS servicios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre VARCHAR(100) NOT NULL UNIQUE,
  descripcion TEXT,
  estado VARCHAR(20) DEFAULT 'activo' NOT NULL CHECK (estado IN ('activo', 'inactivo')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

COMMENT ON TABLE servicios IS 'Tipos de servicios ofrecidos (ej. Recarga, Agente BCP)';

-- Tabla: MOVIMIENTOS_SERVICIOS (depende de servicios y usuarios)
CREATE TABLE IF NOT EXISTS movimientos_servicios (
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

COMMENT ON TABLE movimientos_servicios IS 'Registra los aumentos o ajustes de saldo de los servicios';
COMMENT ON COLUMN movimientos_servicios.monto IS 'Monto del movimiento (siempre positivo)';
COMMENT ON COLUMN movimientos_servicios.saldo_anterior IS 'Saldo del servicio antes del movimiento';
COMMENT ON COLUMN movimientos_servicios.saldo_nuevo IS 'Saldo del servicio después del movimiento';

-- Tabla: REGISTROS_SERVICIOS (depende de servicios y usuarios)
CREATE TABLE IF NOT EXISTS registros_servicios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_servicio UUID NOT NULL REFERENCES servicios(id) ON DELETE CASCADE,
  fecha DATE NOT NULL,
  saldo_inicial NUMERIC(10, 2) NOT NULL CHECK (saldo_inicial >= 0),
  saldo_final NUMERIC(10, 2) NOT NULL CHECK (saldo_final >= 0),
  monto_aumentado NUMERIC(10, 2) DEFAULT 0 NOT NULL CHECK (monto_aumentado >= 0),
  total NUMERIC(10, 2) DEFAULT 0 NOT NULL,
  id_usuario UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  observacion TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(id_servicio, fecha) -- Un registro por servicio por día
);

COMMENT ON TABLE registros_servicios IS 'Registro diario de saldos iniciales y finales de los servicios';
COMMENT ON COLUMN registros_servicios.monto_aumentado IS 'Suma de todos los aumentos realizados en el día. Puede ser calculado automáticamente o editado manualmente.';
COMMENT ON COLUMN registros_servicios.total IS 'Total = saldo_inicial + monto_aumentado - saldo_final';

-- Tabla: ARQUEOS_CAJA (depende de usuarios)
CREATE TABLE IF NOT EXISTS arqueos_caja (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fecha DATE NOT NULL DEFAULT CURRENT_DATE,
  monto_inicial NUMERIC(10, 2) NOT NULL CHECK (monto_inicial >= 0),
  total_ventas NUMERIC(10, 2) DEFAULT 0 NOT NULL CHECK (total_ventas >= 0),
  total_servicios NUMERIC(10, 2) DEFAULT 0 NOT NULL CHECK (total_servicios >= 0),
  efectivo_esperado NUMERIC(10, 2) DEFAULT 0 NOT NULL,
  efectivo_real NUMERIC(10, 2) NOT NULL CHECK (efectivo_real >= 0),
  diferencia NUMERIC(10, 2) DEFAULT 0 NOT NULL,
  observacion TEXT,
  id_usuario UUID NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(fecha, id_usuario) -- Un arqueo por usuario por día
);

COMMENT ON TABLE arqueos_caja IS 'Arqueos de caja diarios';
COMMENT ON COLUMN arqueos_caja.efectivo_esperado IS 'Monto inicial + Total ventas en efectivo';
COMMENT ON COLUMN arqueos_caja.diferencia IS 'Efectivo real - Efectivo esperado';

-- Tabla: MOVIMIENTOS_INVENTARIO (depende de productos y usuarios)
CREATE TABLE IF NOT EXISTS movimientos_inventario (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_producto UUID NOT NULL REFERENCES productos(id) ON DELETE CASCADE,
  tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('entrada', 'salida', 'ajuste')),
  cantidad INTEGER NOT NULL,
  cantidad_anterior INTEGER NOT NULL,
  cantidad_nueva INTEGER NOT NULL,
  motivo TEXT,
  id_usuario UUID NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

COMMENT ON TABLE movimientos_inventario IS 'Historial de movimientos de inventario';
COMMENT ON COLUMN movimientos_inventario.tipo IS 'Tipo de movimiento: entrada, salida o ajuste';

-- ============================================================================
-- SECCIÓN 3: FUNCIONES
-- ============================================================================

-- Función: Actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Función: Calcular subtotal en detalle_venta
CREATE OR REPLACE FUNCTION calcular_subtotal()
RETURNS TRIGGER AS $$
BEGIN
  NEW.subtotal = NEW.cantidad * NEW.precio_unitario;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Función: Actualizar stock al crear venta
CREATE OR REPLACE FUNCTION actualizar_stock_venta()
RETURNS TRIGGER AS $$
BEGIN
  -- Reducir stock del producto
  UPDATE productos
  SET stock_actual = stock_actual - NEW.cantidad,
      updated_at = timezone('utc'::text, now())
  WHERE id = NEW.id_producto;
  
  -- Registrar movimiento de inventario
  INSERT INTO movimientos_inventario (
    id_producto,
    tipo,
    cantidad,
    cantidad_anterior,
    cantidad_nueva,
    motivo,
    id_usuario
  )
  SELECT 
    NEW.id_producto,
    'salida',
    NEW.cantidad,
    p.stock_actual + NEW.cantidad, -- Stock antes de la venta
    p.stock_actual, -- Stock después de la venta
    'Venta #' || NEW.id_venta::text,
    v.id_vendedor
  FROM productos p
  CROSS JOIN ventas v
  WHERE p.id = NEW.id_producto
    AND v.id = NEW.id_venta;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Función: Revertir stock al anular venta
CREATE OR REPLACE FUNCTION revertir_stock_venta()
RETURNS TRIGGER AS $$
BEGIN
  -- Solo procesar si la venta cambió a anulada
  IF NEW.estado = 'anulada' AND OLD.estado = 'completada' THEN
    -- Restaurar stock de cada producto
    UPDATE productos p
    SET stock_actual = p.stock_actual + dv.cantidad,
        updated_at = timezone('utc'::text, now())
    FROM detalle_venta dv
    WHERE dv.id_venta = NEW.id
      AND dv.id_producto = p.id;
    
    -- Registrar movimientos de inventario
    INSERT INTO movimientos_inventario (
      id_producto,
      tipo,
      cantidad,
      cantidad_anterior,
      cantidad_nueva,
      motivo,
      id_usuario
    )
    SELECT 
      dv.id_producto,
      'entrada',
      dv.cantidad,
      p.stock_actual, -- Stock antes de revertir
      p.stock_actual + dv.cantidad, -- Stock después de revertir
      'Anulación de venta #' || NEW.id::text,
      NEW.id_vendedor
    FROM detalle_venta dv
    JOIN productos p ON p.id = dv.id_producto
    WHERE dv.id_venta = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Función: Calcular interés mensual para ventas a crédito
CREATE OR REPLACE FUNCTION calcular_interes_mensual(id_venta UUID)
RETURNS NUMERIC AS $$
DECLARE
  v_total NUMERIC;
  v_cuota_inicial NUMERIC;
  v_total_base NUMERIC;
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
  v_meses_transcurridos := CEIL((v_fecha_actual - v_fecha_venta) / 30.0);
  
  -- Asegurar que al menos se calcule 1 mes de interés desde la fecha de venta
  IF v_meses_transcurridos <= 0 THEN
    v_meses_transcurridos := 1;
  END IF;

  -- Calcular interés: (total - cuota_inicial) * (tasa / 100) * meses_transcurridos
  v_interes := v_total_base * (v_tasa_interes / 100.0) * v_meses_transcurridos;

  RETURN ROUND(v_interes, 2);
END;
$$ LANGUAGE plpgsql;

-- Función: Recalcular interés en ventas a crédito
CREATE OR REPLACE FUNCTION recalcular_interes_venta()
RETURNS TRIGGER AS $$
DECLARE
  v_monto_interes NUMERIC;
  v_total_con_interes NUMERIC;
  v_total_base NUMERIC;
  v_cuotas INTEGER;
BEGIN
  -- Solo procesar si es una venta a crédito
  IF NEW.metodo_pago = 'credito' THEN
    -- Calcular interés usando la función
    v_monto_interes := calcular_interes_mensual(NEW.id);
    
    -- Si no se puede calcular (porque NEW.id no existe aún en INSERT), calcular directamente
    IF v_monto_interes IS NULL AND TG_OP = 'INSERT' THEN
      IF NEW.interes_eximido OR COALESCE(NEW.tasa_interes, 0) = 0 THEN
        v_monto_interes := 0;
      ELSE
        DECLARE
          v_meses_transcurridos INTEGER;
          v_cuota_inicial NUMERIC;
        BEGIN
          v_cuota_inicial := COALESCE(NEW.cuota_inicial, 0);
          v_total_base := NEW.total - v_cuota_inicial;
          
          IF v_total_base <= 0 THEN
            v_monto_interes := 0;
          ELSE
            v_meses_transcurridos := 1;
            v_monto_interes := v_total_base * (NEW.tasa_interes / 100.0) * v_meses_transcurridos;
          END IF;
        END;
      END IF;
    END IF;

    -- Asignar valores calculados
    NEW.monto_interes := COALESCE(v_monto_interes, 0);
    
    -- Calcular total con interés: total + (interés × número de cuotas)
    v_cuotas := COALESCE(NEW.meses_credito, 1);
    NEW.total_con_interes := NEW.total + (NEW.monto_interes * v_cuotas);
  ELSE
    -- Si no es crédito, limpiar campos relacionados
    NEW.monto_interes := NULL;
    NEW.total_con_interes := NULL;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Función: Calcular monto aumentado en servicios
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

-- Función: Calcular total en registros de servicios
CREATE OR REPLACE FUNCTION calcular_total(
  p_saldo_final NUMERIC,
  p_saldo_inicial NUMERIC,
  p_monto_aumentado NUMERIC
)
RETURNS NUMERIC AS $$
BEGIN
  -- Fórmula: total = saldo_inicial + monto_aumentado - saldo_final
  RETURN p_saldo_inicial + p_monto_aumentado - p_saldo_final;
END;
$$ LANGUAGE plpgsql;

-- Función: Calcular montos en registros de servicios
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

  -- Calcular total usando el monto_aumentado (ya sea manual o calculado)
  NEW.total := calcular_total(
    NEW.saldo_final,
    NEW.saldo_inicial,
    NEW.monto_aumentado
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- SECCIÓN 4: TRIGGERS
-- ============================================================================

-- Triggers para updated_at
CREATE TRIGGER update_usuarios_updated_at
  BEFORE UPDATE ON usuarios
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_categorias_updated_at
  BEFORE UPDATE ON categorias
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_productos_updated_at
  BEFORE UPDATE ON productos
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_clientes_updated_at
  BEFORE UPDATE ON clientes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ventas_updated_at
  BEFORE UPDATE ON ventas
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_servicios_updated_at
  BEFORE UPDATE ON servicios
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_registros_servicios_updated_at
  BEFORE UPDATE ON registros_servicios
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_arqueos_caja_updated_at
  BEFORE UPDATE ON arqueos_caja
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger para calcular subtotal en detalle_venta
CREATE TRIGGER trigger_calcular_subtotal
  BEFORE INSERT OR UPDATE ON detalle_venta
  FOR EACH ROW
  EXECUTE FUNCTION calcular_subtotal();

-- Trigger para actualizar stock al crear venta
CREATE TRIGGER trigger_actualizar_stock_venta
  AFTER INSERT ON detalle_venta
  FOR EACH ROW
  EXECUTE FUNCTION actualizar_stock_venta();

-- Trigger para revertir stock al anular venta
CREATE TRIGGER trigger_revertir_stock_venta
  AFTER UPDATE ON ventas
  FOR EACH ROW
  EXECUTE FUNCTION revertir_stock_venta();

-- Trigger para recalcular interés en ventas a crédito
CREATE TRIGGER trigger_recalcular_interes_venta
  BEFORE INSERT OR UPDATE ON ventas
  FOR EACH ROW
  EXECUTE FUNCTION recalcular_interes_venta();

-- Trigger para calcular montos en registros de servicios
CREATE TRIGGER trigger_calcular_montos_registro_servicio
  BEFORE INSERT OR UPDATE ON registros_servicios
  FOR EACH ROW
  EXECUTE FUNCTION calcular_montos_registro_servicio();

-- ============================================================================
-- SECCIÓN 5: ÍNDICES
-- ============================================================================

-- Índices para usuarios
CREATE INDEX IF NOT EXISTS idx_usuarios_rol ON usuarios(rol);
CREATE INDEX IF NOT EXISTS idx_usuarios_estado ON usuarios(estado);
CREATE INDEX IF NOT EXISTS idx_usuarios_usuario ON usuarios(usuario);

-- Índices para productos
CREATE INDEX IF NOT EXISTS idx_productos_categoria ON productos(id_categoria);
CREATE INDEX IF NOT EXISTS idx_productos_estado ON productos(estado);
CREATE INDEX IF NOT EXISTS idx_productos_codigo ON productos(codigo);
CREATE INDEX IF NOT EXISTS idx_productos_stock ON productos(stock_actual);

-- Índices para ventas
CREATE INDEX IF NOT EXISTS idx_ventas_fecha ON ventas(fecha);
CREATE INDEX IF NOT EXISTS idx_ventas_vendedor ON ventas(id_vendedor);
CREATE INDEX IF NOT EXISTS idx_ventas_cliente ON ventas(id_cliente);
CREATE INDEX IF NOT EXISTS idx_ventas_metodo_pago ON ventas(metodo_pago);
CREATE INDEX IF NOT EXISTS idx_ventas_estado ON ventas(estado);
CREATE INDEX IF NOT EXISTS idx_ventas_estado_credito ON ventas(estado_credito);

-- Índices para detalle_venta
CREATE INDEX IF NOT EXISTS idx_detalle_venta_venta ON detalle_venta(id_venta);
CREATE INDEX IF NOT EXISTS idx_detalle_venta_producto ON detalle_venta(id_producto);

-- Índices para pagos_credito
CREATE INDEX IF NOT EXISTS idx_pagos_credito_venta ON pagos_credito(id_venta);
CREATE INDEX IF NOT EXISTS idx_pagos_credito_fecha ON pagos_credito(fecha_pago);

-- Índices para servicios
CREATE INDEX IF NOT EXISTS idx_servicios_estado ON servicios(estado);
CREATE INDEX IF NOT EXISTS idx_servicios_nombre ON servicios(nombre);

-- Índices para movimientos_servicios
CREATE INDEX IF NOT EXISTS idx_movimientos_servicios_servicio ON movimientos_servicios(id_servicio);
CREATE INDEX IF NOT EXISTS idx_movimientos_servicios_fecha ON movimientos_servicios(fecha);
CREATE INDEX IF NOT EXISTS idx_movimientos_servicios_tipo ON movimientos_servicios(tipo);
CREATE INDEX IF NOT EXISTS idx_movimientos_servicios_servicio_fecha ON movimientos_servicios(id_servicio, fecha);

-- Índices para registros_servicios
CREATE INDEX IF NOT EXISTS idx_registros_servicios_servicio ON registros_servicios(id_servicio);
CREATE INDEX IF NOT EXISTS idx_registros_servicios_fecha ON registros_servicios(fecha);
CREATE INDEX IF NOT EXISTS idx_registros_servicios_servicio_fecha ON registros_servicios(id_servicio, fecha);

-- Índices para arqueos_caja
CREATE INDEX IF NOT EXISTS idx_arqueos_caja_fecha ON arqueos_caja(fecha);
CREATE INDEX IF NOT EXISTS idx_arqueos_caja_usuario ON arqueos_caja(id_usuario);

-- Índices para movimientos_inventario
CREATE INDEX IF NOT EXISTS idx_movimientos_inventario_producto ON movimientos_inventario(id_producto);
CREATE INDEX IF NOT EXISTS idx_movimientos_inventario_fecha ON movimientos_inventario(created_at);
CREATE INDEX IF NOT EXISTS idx_movimientos_inventario_tipo ON movimientos_inventario(tipo);

-- ============================================================================
-- SECCIÓN 6: ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Habilitar RLS en todas las tablas
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE categorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE productos ENABLE ROW LEVEL SECURITY;
ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE ventas ENABLE ROW LEVEL SECURITY;
ALTER TABLE detalle_venta ENABLE ROW LEVEL SECURITY;
ALTER TABLE pagos_credito ENABLE ROW LEVEL SECURITY;
ALTER TABLE servicios ENABLE ROW LEVEL SECURITY;
ALTER TABLE movimientos_servicios ENABLE ROW LEVEL SECURITY;
ALTER TABLE registros_servicios ENABLE ROW LEVEL SECURITY;
ALTER TABLE arqueos_caja ENABLE ROW LEVEL SECURITY;
ALTER TABLE movimientos_inventario ENABLE ROW LEVEL SECURITY;

-- Políticas para USUARIOS
CREATE POLICY "Los usuarios autenticados pueden ver usuarios"
  ON usuarios FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Solo admins pueden crear usuarios"
  ON usuarios FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE usuarios.id::text = auth.uid()::text
      AND usuarios.rol = 'admin'
    )
  );

CREATE POLICY "Solo admins pueden actualizar usuarios"
  ON usuarios FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE usuarios.id::text = auth.uid()::text
      AND usuarios.rol = 'admin'
    )
  );

-- Políticas para CATEGORIAS
CREATE POLICY "Los usuarios autenticados pueden ver categorías"
  ON categorias FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Solo admins pueden gestionar categorías"
  ON categorias FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE usuarios.id::text = auth.uid()::text
      AND usuarios.rol = 'admin'
    )
  );

-- Políticas para PRODUCTOS
CREATE POLICY "Los usuarios autenticados pueden ver productos"
  ON productos FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Solo admins pueden gestionar productos"
  ON productos FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE usuarios.id::text = auth.uid()::text
      AND usuarios.rol = 'admin'
    )
  );

-- Políticas para CLIENTES
CREATE POLICY "Los usuarios autenticados pueden gestionar clientes"
  ON clientes FOR ALL
  USING (auth.role() = 'authenticated');

-- Políticas para VENTAS
CREATE POLICY "Los usuarios autenticados pueden ver sus propias ventas"
  ON ventas FOR SELECT
  USING (
    auth.role() = 'authenticated' AND
    (id_vendedor::text = auth.uid()::text OR
     EXISTS (
       SELECT 1 FROM usuarios
       WHERE usuarios.id::text = auth.uid()::text
       AND usuarios.rol = 'admin'
     ))
  );

CREATE POLICY "Los usuarios autenticados pueden crear ventas"
  ON ventas FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Solo admins pueden actualizar ventas"
  ON ventas FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE usuarios.id::text = auth.uid()::text
      AND usuarios.rol = 'admin'
    )
  );

-- Políticas para DETALLE_VENTA
CREATE POLICY "Los usuarios autenticados pueden ver detalles de ventas"
  ON detalle_venta FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM ventas
      WHERE ventas.id = detalle_venta.id_venta
      AND (ventas.id_vendedor::text = auth.uid()::text OR
           EXISTS (
             SELECT 1 FROM usuarios
             WHERE usuarios.id::text = auth.uid()::text
             AND usuarios.rol = 'admin'
           ))
    )
  );

CREATE POLICY "Los usuarios autenticados pueden crear detalles de venta"
  ON detalle_venta FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Políticas para PAGOS_CREDITO
CREATE POLICY "Los usuarios autenticados pueden gestionar pagos de crédito"
  ON pagos_credito FOR ALL
  USING (auth.role() = 'authenticated');

-- Políticas para SERVICIOS
CREATE POLICY "Los usuarios autenticados pueden ver servicios"
  ON servicios FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Solo admins pueden gestionar servicios"
  ON servicios FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE usuarios.id::text = auth.uid()::text
      AND usuarios.rol = 'admin'
    )
  );

-- Políticas para MOVIMIENTOS_SERVICIOS
CREATE POLICY "Los usuarios autenticados pueden ver movimientos"
  ON movimientos_servicios FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Los usuarios autenticados pueden crear movimientos"
  ON movimientos_servicios FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Solo admins pueden actualizar movimientos"
  ON movimientos_servicios FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE usuarios.id::text = auth.uid()::text
      AND usuarios.rol = 'admin'
    )
  );

-- Políticas para REGISTROS_SERVICIOS
CREATE POLICY "Los usuarios autenticados pueden ver registros"
  ON registros_servicios FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Los usuarios autenticados pueden crear registros"
  ON registros_servicios FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Los usuarios autenticados pueden actualizar registros"
  ON registros_servicios FOR UPDATE
  USING (auth.role() = 'authenticated');

-- Políticas para ARQUEOS_CAJA
CREATE POLICY "Los usuarios autenticados pueden ver arqueos"
  ON arqueos_caja FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Solo admins pueden gestionar arqueos"
  ON arqueos_caja FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE usuarios.id::text = auth.uid()::text
      AND usuarios.rol = 'admin'
    )
  );

-- Políticas para MOVIMIENTOS_INVENTARIO
CREATE POLICY "Los usuarios autenticados pueden ver movimientos de inventario"
  ON movimientos_inventario FOR SELECT
  USING (auth.role() = 'authenticated');

-- ============================================================================
-- SECCIÓN 7: DATOS INICIALES
-- ============================================================================

-- Insertar servicios iniciales (si no existen)
INSERT INTO servicios (nombre, descripcion, estado)
VALUES 
  ('Recarga', 'Servicio de recarga de saldo telefónico', 'activo'),
  ('Agente BCP', 'Servicio de agente de Banco BCP', 'activo')
ON CONFLICT (nombre) DO NOTHING;

-- ============================================================================
-- FIN DEL SCRIPT
-- ============================================================================
-- 
-- PRÓXIMOS PASOS DESPUÉS DE EJECUTAR ESTE SCRIPT:
-- 
-- 1. Crear un usuario administrador en Supabase Auth:
--    - Ve a Authentication → Users → Add User
--    - Crea un usuario con email y password
--    - Anota el ID del usuario creado
--
-- 2. Insertar el usuario en la tabla usuarios:
--    INSERT INTO usuarios (id, nombre, usuario, email, rol, estado)
--    VALUES (
--      'ID-DEL-USUARIO-AUTH', -- Reemplazar con el ID del paso anterior
--      'Administrador',
--      'admin',
--      'admin@tudominio.com',
--      'admin',
--      'activo'
--    );
--
-- 3. Configurar Storage:
--    - Ve a Storage en Supabase
--    - Crea un bucket llamado "productos"
--    - Configura políticas de acceso (público para lectura, autenticado para escritura)
--
-- 4. Desplegar Edge Functions:
--    - get-user-email
--    - update-user-email
--    - create-user
--
-- 5. Configurar variables de entorno en tu aplicación:
--    VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
--    VITE_SUPABASE_ANON_KEY=tu_anon_key
--
-- ============================================================================


-- ============================================================================
-- REESTRUCTURACIÓN: MINORISTAS Y MAYORISTAS
-- ============================================================================
-- Este script implementa la nueva estructura para minoristas y mayoristas:
-- 1. Crea tablas de ventas separadas (ventas_minoristas, ventas_mayoristas)
-- 2. Crea tablas de arqueos (arqueos_minoristas, arqueos_mayoristas)
-- 3. Crea tabla de notificaciones de arqueo
-- 4. Elimina campo "aumento" de preregistros
-- 5. Crea funciones y triggers necesarios
-- ============================================================================

-- ============================================================================
-- PASO 1: CREAR NUEVAS TABLAS
-- ============================================================================

-- Tabla: VENTAS_MINORISTAS
CREATE TABLE IF NOT EXISTS ventas_minoristas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_minorista UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  id_producto UUID NOT NULL REFERENCES productos(id) ON DELETE CASCADE,
  cantidad_vendida INTEGER DEFAULT 0 NOT NULL CHECK (cantidad_vendida >= 0),
  cantidad_aumento INTEGER DEFAULT 0 NOT NULL CHECK (cantidad_aumento >= 0),
  precio_unitario NUMERIC(10, 2) NOT NULL CHECK (precio_unitario >= 0),
  total NUMERIC(10, 2) NOT NULL CHECK (total >= 0),
  fecha DATE NOT NULL,
  hora TIME NOT NULL,
  id_pedido UUID, -- Referencia a pedidos (FK se agregará si la tabla existe)
  observaciones TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

COMMENT ON TABLE ventas_minoristas IS 'Ventas y aumentos de productos de minoristas';
COMMENT ON COLUMN ventas_minoristas.cantidad_vendida IS 'Cantidad de productos vendidos a clientes';
COMMENT ON COLUMN ventas_minoristas.cantidad_aumento IS 'Cantidad de productos recibidos (aumento)';
COMMENT ON COLUMN ventas_minoristas.id_pedido IS 'ID del pedido si el aumento proviene de un pedido entregado';

-- Tabla: VENTAS_MAYORISTAS
CREATE TABLE IF NOT EXISTS ventas_mayoristas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_mayorista UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  id_producto UUID NOT NULL REFERENCES productos(id) ON DELETE CASCADE,
  cantidad_vendida INTEGER DEFAULT 0 NOT NULL CHECK (cantidad_vendida >= 0),
  cantidad_aumento INTEGER DEFAULT 0 NOT NULL CHECK (cantidad_aumento >= 0),
  precio_por_mayor NUMERIC(10, 2) NOT NULL CHECK (precio_por_mayor >= 0),
  total NUMERIC(10, 2) NOT NULL CHECK (total >= 0),
  fecha DATE NOT NULL,
  hora TIME NOT NULL,
  id_pedido UUID, -- Referencia a pedidos (FK se agregará si la tabla existe)
  observaciones TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

COMMENT ON TABLE ventas_mayoristas IS 'Ventas y aumentos de productos de mayoristas';
COMMENT ON COLUMN ventas_mayoristas.cantidad_vendida IS 'Cantidad de productos vendidos a clientes';
COMMENT ON COLUMN ventas_mayoristas.cantidad_aumento IS 'Cantidad de productos recibidos (aumento)';
COMMENT ON COLUMN ventas_mayoristas.id_pedido IS 'ID del pedido si el aumento proviene de un pedido entregado';

-- Tabla: ARQUEOS_MINORISTAS
CREATE TABLE IF NOT EXISTS arqueos_minoristas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_minorista UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  fecha DATE NOT NULL,
  hora_apertura TIME,
  hora_cierre TIME,
  ventas_del_periodo NUMERIC(10, 2) DEFAULT 0 NOT NULL CHECK (ventas_del_periodo >= 0),
  saldos_restantes JSONB NOT NULL DEFAULT '[]'::jsonb,
  efectivo_recibido NUMERIC(10, 2) DEFAULT 0 NOT NULL CHECK (efectivo_recibido >= 0),
  diferencia NUMERIC(10, 2) GENERATED ALWAYS AS (efectivo_recibido - ventas_del_periodo) STORED,
  observaciones TEXT,
  estado VARCHAR(20) DEFAULT 'abierto' NOT NULL CHECK (estado IN ('abierto', 'cerrado')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

COMMENT ON TABLE arqueos_minoristas IS 'Arqueos diarios de minoristas';
COMMENT ON COLUMN arqueos_minoristas.saldos_restantes IS 'JSON con saldos restantes: [{"id_producto": "uuid", "cantidad_restante": 10}]';

-- Tabla: ARQUEOS_MAYORISTAS
CREATE TABLE IF NOT EXISTS arqueos_mayoristas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_mayorista UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  fecha_inicio DATE NOT NULL,
  fecha_fin DATE NOT NULL,
  hora_apertura TIME,
  hora_cierre TIME,
  ventas_del_periodo NUMERIC(10, 2) DEFAULT 0 NOT NULL CHECK (ventas_del_periodo >= 0),
  saldos_restantes JSONB NOT NULL DEFAULT '[]'::jsonb,
  efectivo_recibido NUMERIC(10, 2) DEFAULT 0 NOT NULL CHECK (efectivo_recibido >= 0),
  diferencia NUMERIC(10, 2) GENERATED ALWAYS AS (efectivo_recibido - ventas_del_periodo) STORED,
  observaciones TEXT,
  estado VARCHAR(20) DEFAULT 'abierto' NOT NULL CHECK (estado IN ('abierto', 'cerrado')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

COMMENT ON TABLE arqueos_mayoristas IS 'Arqueos flexibles de mayoristas (cada 2 días aproximadamente)';
COMMENT ON COLUMN arqueos_mayoristas.saldos_restantes IS 'JSON con saldos restantes arrastrados: [{"id_producto": "uuid", "cantidad_restante": 10}]';

-- Tabla: NOTIFICACIONES_ARQUEO
CREATE TABLE IF NOT EXISTS notificaciones_arqueo (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_mayorista UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  fecha_ultimo_arqueo DATE,
  dias_sin_arqueo INTEGER NOT NULL CHECK (dias_sin_arqueo > 0),
  estado VARCHAR(20) DEFAULT 'pendiente' NOT NULL CHECK (estado IN ('pendiente', 'vista', 'resuelta')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(id_mayorista, fecha_ultimo_arqueo) -- Una notificación por mayorista por fecha de último arqueo
);

COMMENT ON TABLE notificaciones_arqueo IS 'Notificaciones para mayoristas sin arqueo por más de 2 días';

-- ============================================================================
-- PASO 2: CREAR ÍNDICES
-- ============================================================================

-- Índices para ventas_minoristas
CREATE INDEX IF NOT EXISTS idx_ventas_minoristas_minorista ON ventas_minoristas(id_minorista);
CREATE INDEX IF NOT EXISTS idx_ventas_minoristas_producto ON ventas_minoristas(id_producto);
CREATE INDEX IF NOT EXISTS idx_ventas_minoristas_fecha ON ventas_minoristas(fecha);
CREATE INDEX IF NOT EXISTS idx_ventas_minoristas_minorista_fecha ON ventas_minoristas(id_minorista, fecha);
CREATE INDEX IF NOT EXISTS idx_ventas_minoristas_pedido ON ventas_minoristas(id_pedido);

-- Índices para ventas_mayoristas
CREATE INDEX IF NOT EXISTS idx_ventas_mayoristas_mayorista ON ventas_mayoristas(id_mayorista);
CREATE INDEX IF NOT EXISTS idx_ventas_mayoristas_producto ON ventas_mayoristas(id_producto);
CREATE INDEX IF NOT EXISTS idx_ventas_mayoristas_fecha ON ventas_mayoristas(fecha);
CREATE INDEX IF NOT EXISTS idx_ventas_mayoristas_mayorista_fecha ON ventas_mayoristas(id_mayorista, fecha);
CREATE INDEX IF NOT EXISTS idx_ventas_mayoristas_pedido ON ventas_mayoristas(id_pedido);

-- Índices para arqueos_minoristas
CREATE INDEX IF NOT EXISTS idx_arqueos_minoristas_minorista ON arqueos_minoristas(id_minorista);
CREATE INDEX IF NOT EXISTS idx_arqueos_minoristas_fecha ON arqueos_minoristas(fecha);
CREATE INDEX IF NOT EXISTS idx_arqueos_minoristas_estado ON arqueos_minoristas(estado);
CREATE INDEX IF NOT EXISTS idx_arqueos_minoristas_minorista_fecha ON arqueos_minoristas(id_minorista, fecha);

-- Índices para arqueos_mayoristas
CREATE INDEX IF NOT EXISTS idx_arqueos_mayoristas_mayorista ON arqueos_mayoristas(id_mayorista);
CREATE INDEX IF NOT EXISTS idx_arqueos_mayoristas_fecha_inicio ON arqueos_mayoristas(fecha_inicio);
CREATE INDEX IF NOT EXISTS idx_arqueos_mayoristas_fecha_fin ON arqueos_mayoristas(fecha_fin);
CREATE INDEX IF NOT EXISTS idx_arqueos_mayoristas_estado ON arqueos_mayoristas(estado);

-- Índices para notificaciones_arqueo
CREATE INDEX IF NOT EXISTS idx_notificaciones_arqueo_mayorista ON notificaciones_arqueo(id_mayorista);
CREATE INDEX IF NOT EXISTS idx_notificaciones_arqueo_estado ON notificaciones_arqueo(estado);

-- ============================================================================
-- PASO 3: ELIMINAR CAMPO AUMENTO DE PREREGISTROS
-- ============================================================================

-- NOTA: Antes de ejecutar esto, migrar datos existentes si es necesario
-- ALTER TABLE preregistros_minorista DROP COLUMN IF EXISTS aumento;
-- ALTER TABLE preregistros_mayorista DROP COLUMN IF EXISTS aumento;

-- ============================================================================
-- PASO 4: CREAR FUNCIONES
-- ============================================================================

-- Función: Calcular saldo disponible de minorista
CREATE OR REPLACE FUNCTION calcular_saldo_disponible_minorista(
  p_id_minorista UUID,
  p_id_producto UUID,
  p_fecha DATE
)
RETURNS INTEGER AS $$
DECLARE
  v_cantidad_preregistro INTEGER;
  v_cantidad_vendida INTEGER;
  v_cantidad_aumento INTEGER;
  v_saldo_disponible INTEGER;
BEGIN
  -- Obtener cantidad del preregistro (preregistros_minorista no tiene fecha, son reutilizables)
  SELECT COALESCE(cantidad, 0) INTO v_cantidad_preregistro
  FROM preregistros_minorista
  WHERE id_minorista = p_id_minorista
    AND id_producto = p_id_producto;
  
  -- Sumar cantidad vendida del día
  SELECT COALESCE(SUM(cantidad_vendida), 0) INTO v_cantidad_vendida
  FROM ventas_minoristas
  WHERE id_minorista = p_id_minorista
    AND id_producto = p_id_producto
    AND fecha = p_fecha;
  
  -- Sumar aumentos del día
  SELECT COALESCE(SUM(cantidad_aumento), 0) INTO v_cantidad_aumento
  FROM ventas_minoristas
  WHERE id_minorista = p_id_minorista
    AND id_producto = p_id_producto
    AND fecha = p_fecha;
  
  -- Calcular saldo disponible
  v_saldo_disponible := v_cantidad_preregistro + v_cantidad_aumento - v_cantidad_vendida;
  
  RETURN GREATEST(0, v_saldo_disponible);
END;
$$ LANGUAGE plpgsql;

-- Función: Calcular saldo disponible de mayorista (con arrastre)
CREATE OR REPLACE FUNCTION calcular_saldo_disponible_mayorista(
  p_id_mayorista UUID,
  p_id_producto UUID,
  p_fecha DATE
)
RETURNS INTEGER AS $$
DECLARE
  v_saldo_anterior INTEGER;
  v_cantidad_vendida INTEGER;
  v_cantidad_aumento INTEGER;
  v_saldo_disponible INTEGER;
  v_fecha_desde DATE;
BEGIN
  -- Obtener fecha del último arqueo cerrado
  SELECT fecha_fin INTO v_fecha_desde
  FROM arqueos_mayoristas
  WHERE id_mayorista = p_id_mayorista
    AND estado = 'cerrado'
    AND fecha_fin < p_fecha
  ORDER BY fecha_fin DESC
  LIMIT 1;
  
  -- Si no hay arqueo anterior, usar preregistro inicial
  IF v_fecha_desde IS NULL THEN
    SELECT fecha INTO v_fecha_desde
    FROM preregistros_mayorista
    WHERE id_mayorista = p_id_mayorista
      AND id_producto = p_id_producto
      AND fecha <= p_fecha
    ORDER BY fecha DESC
    LIMIT 1;
    
    -- Si hay preregistro, obtener cantidad inicial
    IF v_fecha_desde IS NOT NULL THEN
      SELECT COALESCE(cantidad, 0) INTO v_saldo_anterior
      FROM preregistros_mayorista
      WHERE id_mayorista = p_id_mayorista
        AND id_producto = p_id_producto
        AND fecha = v_fecha_desde;
    ELSE
      v_saldo_anterior := 0;
    END IF;
  ELSE
    -- Obtener saldo del último arqueo cerrado (arrastre)
    SELECT COALESCE(
      (saldos_restantes->>p_id_producto::text)::INTEGER, 
      0
    ) INTO v_saldo_anterior
    FROM arqueos_mayoristas
    WHERE id_mayorista = p_id_mayorista
      AND estado = 'cerrado'
      AND fecha_fin = v_fecha_desde
    ORDER BY fecha_fin DESC
    LIMIT 1;
  END IF;
  
  -- Si no hay fecha desde, usar fecha actual
  IF v_fecha_desde IS NULL THEN
    v_fecha_desde := p_fecha;
  END IF;
  
  -- Sumar cantidad vendida desde último arqueo o preregistro
  SELECT COALESCE(SUM(cantidad_vendida), 0) INTO v_cantidad_vendida
  FROM ventas_mayoristas
  WHERE id_mayorista = p_id_mayorista
    AND id_producto = p_id_producto
    AND fecha >= v_fecha_desde
    AND fecha <= p_fecha;
  
  -- Sumar aumentos desde último arqueo o preregistro
  SELECT COALESCE(SUM(cantidad_aumento), 0) INTO v_cantidad_aumento
  FROM ventas_mayoristas
  WHERE id_mayorista = p_id_mayorista
    AND id_producto = p_id_producto
    AND fecha >= v_fecha_desde
    AND fecha <= p_fecha;
  
  -- Calcular saldo disponible
  v_saldo_disponible := v_saldo_anterior + v_cantidad_aumento - v_cantidad_vendida;
  
  RETURN GREATEST(0, v_saldo_disponible);
END;
$$ LANGUAGE plpgsql;

-- Función: Verificar y crear notificaciones de arqueo
CREATE OR REPLACE FUNCTION verificar_arqueos_mayoristas()
RETURNS void AS $$
DECLARE
  v_mayorista RECORD;
  v_ultimo_arqueo DATE;
  v_dias_sin_arqueo INTEGER;
BEGIN
  -- Para cada mayorista activo
  FOR v_mayorista IN 
    SELECT id FROM usuarios WHERE rol = 'mayorista' AND estado = 'activo'
  LOOP
    -- Obtener fecha del último arqueo cerrado
    SELECT MAX(fecha_fin) INTO v_ultimo_arqueo
    FROM arqueos_mayoristas
    WHERE id_mayorista = v_mayorista.id
      AND estado = 'cerrado';
    
    -- Si no hay arqueo, usar fecha del preregistro más reciente
    IF v_ultimo_arqueo IS NULL THEN
      SELECT MAX(fecha) INTO v_ultimo_arqueo
      FROM preregistros_mayorista
      WHERE id_mayorista = v_mayorista.id;
    END IF;
    
    -- Calcular días sin arqueo
    IF v_ultimo_arqueo IS NOT NULL THEN
      v_dias_sin_arqueo := CURRENT_DATE - v_ultimo_arqueo;
      
      -- Si pasaron más de 2 días, crear notificación
      IF v_dias_sin_arqueo > 2 THEN
        INSERT INTO notificaciones_arqueo (
          id_mayorista,
          fecha_ultimo_arqueo,
          dias_sin_arqueo,
          estado
        ) VALUES (
          v_mayorista.id,
          v_ultimo_arqueo,
          v_dias_sin_arqueo,
          'pendiente'
        )
        ON CONFLICT (id_mayorista, fecha_ultimo_arqueo) 
        DO UPDATE SET 
          dias_sin_arqueo = EXCLUDED.dias_sin_arqueo,
          updated_at = timezone('utc'::text, now());
      END IF;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- PASO 5: CREAR TRIGGERS
-- ============================================================================

-- Trigger: Calcular total en ventas_minoristas
CREATE OR REPLACE FUNCTION calcular_total_venta_minorista()
RETURNS TRIGGER AS $$
BEGIN
  NEW.total := (NEW.cantidad_vendida + NEW.cantidad_aumento) * NEW.precio_unitario;
  NEW.updated_at := timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_calcular_total_venta_minorista
  BEFORE INSERT OR UPDATE ON ventas_minoristas
  FOR EACH ROW
  EXECUTE FUNCTION calcular_total_venta_minorista();

-- Trigger: Calcular total en ventas_mayoristas
CREATE OR REPLACE FUNCTION calcular_total_venta_mayorista()
RETURNS TRIGGER AS $$
BEGIN
  NEW.total := (NEW.cantidad_vendida + NEW.cantidad_aumento) * NEW.precio_por_mayor;
  NEW.updated_at := timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_calcular_total_venta_mayorista
  BEFORE INSERT OR UPDATE ON ventas_mayoristas
  FOR EACH ROW
  EXECUTE FUNCTION calcular_total_venta_mayorista();

-- Trigger: Actualizar updated_at en arqueos
CREATE OR REPLACE FUNCTION actualizar_updated_at_arqueos()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_actualizar_updated_at_arqueos_minoristas
  BEFORE UPDATE ON arqueos_minoristas
  FOR EACH ROW
  EXECUTE FUNCTION actualizar_updated_at_arqueos();

CREATE TRIGGER trigger_actualizar_updated_at_arqueos_mayoristas
  BEFORE UPDATE ON arqueos_mayoristas
  FOR EACH ROW
  EXECUTE FUNCTION actualizar_updated_at_arqueos();

-- ============================================================================
-- PASO 6: HABILITAR RLS
-- ============================================================================

ALTER TABLE ventas_minoristas ENABLE ROW LEVEL SECURITY;
ALTER TABLE ventas_mayoristas ENABLE ROW LEVEL SECURITY;
ALTER TABLE arqueos_minoristas ENABLE ROW LEVEL SECURITY;
ALTER TABLE arqueos_mayoristas ENABLE ROW LEVEL SECURITY;
ALTER TABLE notificaciones_arqueo ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- PASO 7: CREAR POLÍTICAS RLS
-- ============================================================================

-- Políticas para ventas_minoristas
CREATE POLICY "Minoristas pueden ver sus propias ventas"
  ON ventas_minoristas FOR SELECT
  USING (
    id_minorista = auth.uid()
    OR EXISTS (
      SELECT 1 FROM usuarios
      WHERE usuarios.id = auth.uid()
      AND usuarios.rol = 'admin'
      AND usuarios.estado = 'activo'
    )
  );

CREATE POLICY "Minoristas pueden crear sus propias ventas"
  ON ventas_minoristas FOR INSERT
  WITH CHECK (
    id_minorista = auth.uid()
    AND EXISTS (
      SELECT 1 FROM usuarios
      WHERE usuarios.id = auth.uid()
      AND usuarios.rol = 'minorista'
      AND usuarios.estado = 'activo'
    )
  );

CREATE POLICY "Solo administradores pueden actualizar ventas minoristas"
  ON ventas_minoristas FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE usuarios.id = auth.uid()
      AND usuarios.rol = 'admin'
      AND usuarios.estado = 'activo'
    )
  );

CREATE POLICY "Solo administradores pueden eliminar ventas minoristas"
  ON ventas_minoristas FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE usuarios.id = auth.uid()
      AND usuarios.rol = 'admin'
      AND usuarios.estado = 'activo'
    )
  );

-- Políticas para ventas_mayoristas
CREATE POLICY "Mayoristas pueden ver sus propias ventas"
  ON ventas_mayoristas FOR SELECT
  USING (
    id_mayorista = auth.uid()
    OR EXISTS (
      SELECT 1 FROM usuarios
      WHERE usuarios.id = auth.uid()
      AND usuarios.rol = 'admin'
      AND usuarios.estado = 'activo'
    )
  );

CREATE POLICY "Mayoristas pueden crear sus propias ventas"
  ON ventas_mayoristas FOR INSERT
  WITH CHECK (
    id_mayorista = auth.uid()
    AND EXISTS (
      SELECT 1 FROM usuarios
      WHERE usuarios.id = auth.uid()
      AND usuarios.rol = 'mayorista'
      AND usuarios.estado = 'activo'
    )
  );

CREATE POLICY "Solo administradores pueden actualizar ventas mayoristas"
  ON ventas_mayoristas FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE usuarios.id = auth.uid()
      AND usuarios.rol = 'admin'
      AND usuarios.estado = 'activo'
    )
  );

CREATE POLICY "Solo administradores pueden eliminar ventas mayoristas"
  ON ventas_mayoristas FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE usuarios.id = auth.uid()
      AND usuarios.rol = 'admin'
      AND usuarios.estado = 'activo'
    )
  );

-- Políticas para arqueos_minoristas
CREATE POLICY "Minoristas pueden ver sus propios arqueos"
  ON arqueos_minoristas FOR SELECT
  USING (
    id_minorista = auth.uid()
    OR EXISTS (
      SELECT 1 FROM usuarios
      WHERE usuarios.id = auth.uid()
      AND usuarios.rol = 'admin'
      AND usuarios.estado = 'activo'
    )
  );

CREATE POLICY "Minoristas pueden crear sus propios arqueos"
  ON arqueos_minoristas FOR INSERT
  WITH CHECK (
    id_minorista = auth.uid()
    AND EXISTS (
      SELECT 1 FROM usuarios
      WHERE usuarios.id = auth.uid()
      AND usuarios.rol = 'minorista'
      AND usuarios.estado = 'activo'
    )
  );

CREATE POLICY "Minoristas pueden actualizar sus arqueos abiertos"
  ON arqueos_minoristas FOR UPDATE
  USING (
    (id_minorista = auth.uid() AND estado = 'abierto')
    OR EXISTS (
      SELECT 1 FROM usuarios
      WHERE usuarios.id = auth.uid()
      AND usuarios.rol = 'admin'
      AND usuarios.estado = 'activo'
    )
  );

-- Políticas para arqueos_mayoristas
CREATE POLICY "Mayoristas pueden ver sus propios arqueos"
  ON arqueos_mayoristas FOR SELECT
  USING (
    id_mayorista = auth.uid()
    OR EXISTS (
      SELECT 1 FROM usuarios
      WHERE usuarios.id = auth.uid()
      AND usuarios.rol = 'admin'
      AND usuarios.estado = 'activo'
    )
  );

CREATE POLICY "Mayoristas pueden crear sus propios arqueos"
  ON arqueos_mayoristas FOR INSERT
  WITH CHECK (
    id_mayorista = auth.uid()
    AND EXISTS (
      SELECT 1 FROM usuarios
      WHERE usuarios.id = auth.uid()
      AND usuarios.rol = 'mayorista'
      AND usuarios.estado = 'activo'
    )
  );

CREATE POLICY "Mayoristas pueden actualizar sus arqueos abiertos"
  ON arqueos_mayoristas FOR UPDATE
  USING (
    (id_mayorista = auth.uid() AND estado = 'abierto')
    OR EXISTS (
      SELECT 1 FROM usuarios
      WHERE usuarios.id = auth.uid()
      AND usuarios.rol = 'admin'
      AND usuarios.estado = 'activo'
    )
  );

-- Políticas para notificaciones_arqueo
CREATE POLICY "Solo administradores pueden ver notificaciones"
  ON notificaciones_arqueo FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE usuarios.id = auth.uid()
      AND usuarios.rol = 'admin'
      AND usuarios.estado = 'activo'
    )
  );

CREATE POLICY "Solo administradores pueden actualizar notificaciones"
  ON notificaciones_arqueo FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE usuarios.id = auth.uid()
      AND usuarios.rol = 'admin'
      AND usuarios.estado = 'activo'
    )
  );

-- ============================================================================
-- FIN DEL SCRIPT
-- ============================================================================
-- NOTA: Este script debe ejecutarse después de migrar datos existentes
-- si es necesario. El campo "aumento" de preregistros se elimina en un
-- script separado después de migrar los datos.
-- ============================================================================

-- ============================================================================
-- TABLAS PARA SISTEMA DE PEDIDOS Y TRANSFERENCIAS
-- ============================================================================
-- Este script crea las tablas necesarias para:
-- 1. Pedidos de minoristas y mayoristas
-- 2. Transferencias de saldos entre minoristas (QR)
-- 3. Pagos de mayoristas (verificación por administrador)
-- ============================================================================

-- ============================================================================
-- TABLA: PEDIDOS
-- ============================================================================
-- Almacena los pedidos realizados por minoristas y mayoristas
CREATE TABLE IF NOT EXISTS pedidos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_usuario UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  tipo_usuario VARCHAR(20) NOT NULL CHECK (tipo_usuario IN ('minorista', 'mayorista')),
  estado VARCHAR(20) DEFAULT 'pendiente' NOT NULL CHECK (estado IN ('pendiente', 'enviado', 'entregado', 'cancelado')),
  fecha_pedido DATE NOT NULL DEFAULT CURRENT_DATE,
  fecha_entrega DATE,
  observaciones TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

COMMENT ON TABLE pedidos IS 'Pedidos realizados por minoristas y mayoristas';
COMMENT ON COLUMN pedidos.tipo_usuario IS 'Tipo de usuario que realiza el pedido: minorista o mayorista';
COMMENT ON COLUMN pedidos.estado IS 'Estado del pedido: pendiente, enviado, entregado, cancelado';

-- ============================================================================
-- TABLA: DETALLE_PEDIDOS
-- ============================================================================
-- Almacena los productos solicitados en cada pedido
CREATE TABLE IF NOT EXISTS detalle_pedidos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_pedido UUID NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
  id_producto UUID NOT NULL REFERENCES productos(id) ON DELETE CASCADE,
  cantidad INTEGER NOT NULL CHECK (cantidad > 0),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(id_pedido, id_producto) -- Un producto por pedido
);

COMMENT ON TABLE detalle_pedidos IS 'Detalle de productos en cada pedido';

-- ============================================================================
-- TABLA: TRANSFERENCIAS_SALDOS
-- ============================================================================
-- Almacena las transferencias de saldos restantes entre minoristas mediante QR
CREATE TABLE IF NOT EXISTS transferencias_saldos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_venta_origen UUID NOT NULL REFERENCES ventas(id) ON DELETE CASCADE,
  id_minorista_origen UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  id_minorista_destino UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  codigo_qr VARCHAR(255) NOT NULL UNIQUE,
  saldos_transferidos JSONB NOT NULL, -- Array de {id_producto, cantidad_restante}
  fecha_transferencia TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  fecha_escaneo TIMESTAMP WITH TIME ZONE,
  estado VARCHAR(20) DEFAULT 'pendiente' NOT NULL CHECK (estado IN ('pendiente', 'completada', 'expirada', 'cancelada')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

COMMENT ON TABLE transferencias_saldos IS 'Transferencias de saldos restantes entre minoristas mediante QR';
COMMENT ON COLUMN transferencias_saldos.codigo_qr IS 'Código único del QR generado para la transferencia';
COMMENT ON COLUMN transferencias_saldos.saldos_transferidos IS 'JSON con los saldos restantes transferidos: [{"id_producto": "uuid", "cantidad_restante": 10}]';

-- ============================================================================
-- TABLA: PAGOS_MAYORISTAS
-- ============================================================================
-- Almacena los pagos recibidos de mayoristas (verificados por administrador)
CREATE TABLE IF NOT EXISTS pagos_mayoristas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_venta UUID NOT NULL REFERENCES ventas(id) ON DELETE CASCADE,
  id_mayorista UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  monto_esperado NUMERIC(10, 2) NOT NULL CHECK (monto_esperado >= 0),
  monto_recibido NUMERIC(10, 2) NOT NULL CHECK (monto_recibido >= 0),
  diferencia NUMERIC(10, 2) GENERATED ALWAYS AS (monto_recibido - monto_esperado) STORED,
  metodo_pago VARCHAR(20) NOT NULL CHECK (metodo_pago IN ('efectivo', 'qr', 'transferencia')),
  observaciones TEXT,
  id_administrador UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  fecha_pago DATE NOT NULL DEFAULT CURRENT_DATE,
  fecha_verificacion TIMESTAMP WITH TIME ZONE,
  estado VARCHAR(20) DEFAULT 'pendiente' NOT NULL CHECK (estado IN ('pendiente', 'verificado', 'rechazado')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

COMMENT ON TABLE pagos_mayoristas IS 'Pagos recibidos de mayoristas verificados por administrador';
COMMENT ON COLUMN pagos_mayoristas.monto_esperado IS 'Monto que se espera recibir según la venta';
COMMENT ON COLUMN pagos_mayoristas.monto_recibido IS 'Monto realmente recibido';
COMMENT ON COLUMN pagos_mayoristas.diferencia IS 'Diferencia entre monto recibido y esperado (calculado automáticamente)';
COMMENT ON COLUMN pagos_mayoristas.estado IS 'Estado del pago: pendiente, verificado, rechazado';

-- ============================================================================
-- TABLA: SALDOS_RESTANTES_MAYORISTAS
-- ============================================================================
-- Almacena los saldos restantes arrastrados por mayoristas después de completar venta
CREATE TABLE IF NOT EXISTS saldos_restantes_mayoristas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_venta UUID NOT NULL REFERENCES ventas(id) ON DELETE CASCADE,
  id_mayorista UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  id_producto UUID NOT NULL REFERENCES productos(id) ON DELETE CASCADE,
  cantidad_restante INTEGER NOT NULL CHECK (cantidad_restante >= 0),
  fecha DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

COMMENT ON TABLE saldos_restantes_mayoristas IS 'Saldos restantes arrastrados por mayoristas después de completar venta';

-- ============================================================================
-- ÍNDICES
-- ============================================================================

-- Índices para pedidos
CREATE INDEX IF NOT EXISTS idx_pedidos_usuario ON pedidos(id_usuario);
CREATE INDEX IF NOT EXISTS idx_pedidos_estado ON pedidos(estado);
CREATE INDEX IF NOT EXISTS idx_pedidos_fecha ON pedidos(fecha_pedido);

-- Índices para detalle_pedidos
CREATE INDEX IF NOT EXISTS idx_detalle_pedidos_pedido ON detalle_pedidos(id_pedido);
CREATE INDEX IF NOT EXISTS idx_detalle_pedidos_producto ON detalle_pedidos(id_producto);

-- Índices para transferencias_saldos
CREATE INDEX IF NOT EXISTS idx_transferencias_qr ON transferencias_saldos(codigo_qr);
CREATE INDEX IF NOT EXISTS idx_transferencias_origen ON transferencias_saldos(id_minorista_origen);
CREATE INDEX IF NOT EXISTS idx_transferencias_destino ON transferencias_saldos(id_minorista_destino);
CREATE INDEX IF NOT EXISTS idx_transferencias_venta ON transferencias_saldos(id_venta_origen);
CREATE INDEX IF NOT EXISTS idx_transferencias_estado ON transferencias_saldos(estado);

-- Índices para pagos_mayoristas
CREATE INDEX IF NOT EXISTS idx_pagos_mayoristas_venta ON pagos_mayoristas(id_venta);
CREATE INDEX IF NOT EXISTS idx_pagos_mayoristas_mayorista ON pagos_mayoristas(id_mayorista);
CREATE INDEX IF NOT EXISTS idx_pagos_mayoristas_estado ON pagos_mayoristas(estado);
CREATE INDEX IF NOT EXISTS idx_pagos_mayoristas_fecha ON pagos_mayoristas(fecha_pago);

-- Índices para saldos_restantes_mayoristas
CREATE INDEX IF NOT EXISTS idx_saldos_restantes_venta ON saldos_restantes_mayoristas(id_venta);
CREATE INDEX IF NOT EXISTS idx_saldos_restantes_mayorista ON saldos_restantes_mayoristas(id_mayorista);
CREATE INDEX IF NOT EXISTS idx_saldos_restantes_producto ON saldos_restantes_mayoristas(id_producto);
CREATE INDEX IF NOT EXISTS idx_saldos_restantes_fecha ON saldos_restantes_mayoristas(fecha);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Trigger para actualizar updated_at en pedidos
CREATE TRIGGER update_pedidos_updated_at
  BEFORE UPDATE ON pedidos
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger para actualizar updated_at en detalle_pedidos
CREATE TRIGGER update_detalle_pedidos_updated_at
  BEFORE UPDATE ON detalle_pedidos
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger para actualizar updated_at en transferencias_saldos
CREATE TRIGGER update_transferencias_saldos_updated_at
  BEFORE UPDATE ON transferencias_saldos
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger para actualizar updated_at en pagos_mayoristas
CREATE TRIGGER update_pagos_mayoristas_updated_at
  BEFORE UPDATE ON pagos_mayoristas
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger para actualizar updated_at en saldos_restantes_mayoristas
CREATE TRIGGER update_saldos_restantes_mayoristas_updated_at
  BEFORE UPDATE ON saldos_restantes_mayoristas
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- POLÍTICAS RLS (Row Level Security)
-- ============================================================================

-- Habilitar RLS en todas las tablas
ALTER TABLE pedidos ENABLE ROW LEVEL SECURITY;
ALTER TABLE detalle_pedidos ENABLE ROW LEVEL SECURITY;
ALTER TABLE transferencias_saldos ENABLE ROW LEVEL SECURITY;
ALTER TABLE pagos_mayoristas ENABLE ROW LEVEL SECURITY;
ALTER TABLE saldos_restantes_mayoristas ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- POLÍTICAS PARA PEDIDOS
-- ============================================================================

-- Los usuarios pueden ver sus propios pedidos
CREATE POLICY "Usuarios pueden ver sus propios pedidos"
  ON pedidos FOR SELECT
  USING (auth.uid() = id_usuario OR auth.uid() IN (SELECT id FROM usuarios WHERE rol = 'admin'));

-- Los usuarios pueden crear sus propios pedidos
CREATE POLICY "Usuarios pueden crear sus propios pedidos"
  ON pedidos FOR INSERT
  WITH CHECK (auth.uid() = id_usuario AND (tipo_usuario = 'minorista' OR tipo_usuario = 'mayorista'));

-- Los usuarios pueden actualizar sus propios pedidos si están pendientes
CREATE POLICY "Usuarios pueden actualizar sus pedidos pendientes"
  ON pedidos FOR UPDATE
  USING (auth.uid() = id_usuario AND estado = 'pendiente')
  WITH CHECK (auth.uid() = id_usuario AND estado = 'pendiente');

-- Los administradores pueden actualizar cualquier pedido
CREATE POLICY "Admins pueden actualizar cualquier pedido"
  ON pedidos FOR UPDATE
  USING (auth.uid() IN (SELECT id FROM usuarios WHERE rol = 'admin'));

-- ============================================================================
-- POLÍTICAS PARA DETALLE_PEDIDOS
-- ============================================================================

-- Los usuarios pueden ver detalles de sus propios pedidos
CREATE POLICY "Usuarios pueden ver detalles de sus pedidos"
  ON detalle_pedidos FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM pedidos 
      WHERE pedidos.id = detalle_pedidos.id_pedido 
      AND (pedidos.id_usuario = auth.uid() OR auth.uid() IN (SELECT id FROM usuarios WHERE rol = 'admin'))
    )
  );

-- Los usuarios pueden crear detalles de sus propios pedidos pendientes
CREATE POLICY "Usuarios pueden crear detalles de sus pedidos"
  ON detalle_pedidos FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM pedidos 
      WHERE pedidos.id = detalle_pedidos.id_pedido 
      AND pedidos.id_usuario = auth.uid() 
      AND pedidos.estado = 'pendiente'
    )
  );

-- Los usuarios pueden actualizar detalles de sus pedidos pendientes
CREATE POLICY "Usuarios pueden actualizar detalles de sus pedidos"
  ON detalle_pedidos FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM pedidos 
      WHERE pedidos.id = detalle_pedidos.id_pedido 
      AND pedidos.id_usuario = auth.uid() 
      AND pedidos.estado = 'pendiente'
    )
  );

-- Los usuarios pueden eliminar detalles de sus pedidos pendientes
CREATE POLICY "Usuarios pueden eliminar detalles de sus pedidos"
  ON detalle_pedidos FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM pedidos 
      WHERE pedidos.id = detalle_pedidos.id_pedido 
      AND pedidos.id_usuario = auth.uid() 
      AND pedidos.estado = 'pendiente'
    )
  );

-- ============================================================================
-- POLÍTICAS PARA TRANSFERENCIAS_SALDOS
-- ============================================================================

-- Los minoristas pueden ver sus transferencias (origen o destino)
CREATE POLICY "Minoristas pueden ver sus transferencias"
  ON transferencias_saldos FOR SELECT
  USING (
    auth.uid() = id_minorista_origen 
    OR auth.uid() = id_minorista_destino
    OR auth.uid() IN (SELECT id FROM usuarios WHERE rol = 'admin')
  );

-- Los minoristas pueden crear transferencias desde sus ventas
CREATE POLICY "Minoristas pueden crear transferencias"
  ON transferencias_saldos FOR INSERT
  WITH CHECK (
    auth.uid() = id_minorista_origen
    AND EXISTS (
      SELECT 1 FROM usuarios 
      WHERE id = auth.uid() 
      AND rol = 'minorista'
    )
  );

-- Los minoristas destino pueden actualizar el estado al escanear
CREATE POLICY "Minoristas pueden escanear transferencias"
  ON transferencias_saldos FOR UPDATE
  USING (
    auth.uid() = id_minorista_destino 
    AND estado = 'pendiente'
    AND EXISTS (
      SELECT 1 FROM usuarios 
      WHERE id = auth.uid() 
      AND rol = 'minorista'
    )
  )
  WITH CHECK (
    auth.uid() = id_minorista_destino 
    AND estado = 'completada'
  );

-- ============================================================================
-- POLÍTICAS PARA PAGOS_MAYORISTAS
-- ============================================================================

-- Los mayoristas pueden ver sus propios pagos
CREATE POLICY "Mayoristas pueden ver sus pagos"
  ON pagos_mayoristas FOR SELECT
  USING (
    auth.uid() = id_mayorista 
    OR auth.uid() IN (SELECT id FROM usuarios WHERE rol = 'admin')
  );

-- Los administradores pueden crear y actualizar pagos
CREATE POLICY "Admins pueden gestionar pagos"
  ON pagos_mayoristas FOR ALL
  USING (auth.uid() IN (SELECT id FROM usuarios WHERE rol = 'admin'))
  WITH CHECK (auth.uid() IN (SELECT id FROM usuarios WHERE rol = 'admin'));

-- ============================================================================
-- POLÍTICAS PARA SALDOS_RESTANTES_MAYORISTAS
-- ============================================================================

-- Los mayoristas pueden ver sus propios saldos restantes
CREATE POLICY "Mayoristas pueden ver sus saldos restantes"
  ON saldos_restantes_mayoristas FOR SELECT
  USING (
    auth.uid() = id_mayorista 
    OR auth.uid() IN (SELECT id FROM usuarios WHERE rol = 'admin')
  );

-- Los mayoristas pueden crear saldos restantes desde sus ventas
CREATE POLICY "Mayoristas pueden crear saldos restantes"
  ON saldos_restantes_mayoristas FOR INSERT
  WITH CHECK (
    auth.uid() = id_mayorista
    AND EXISTS (
      SELECT 1 FROM usuarios 
      WHERE id = auth.uid() 
      AND rol = 'mayorista'
    )
  );

-- Los administradores pueden ver y gestionar todos los saldos
CREATE POLICY "Admins pueden gestionar saldos restantes"
  ON saldos_restantes_mayoristas FOR ALL
  USING (auth.uid() IN (SELECT id FROM usuarios WHERE rol = 'admin'))
  WITH CHECK (auth.uid() IN (SELECT id FROM usuarios WHERE rol = 'admin'));


# Plan de Mejora: Estructura de Minoristas y Mayoristas

## 📋 Resumen Ejecutivo

Este documento describe el plan completo para mejorar la estructura de datos y funcionalidades para minoristas y mayoristas en el sistema J-Cell, basado en los requisitos del negocio.

## 🎯 Objetivos

1. **Separar ventas de minoristas/mayoristas** de las ventas a clientes finales
2. **Eliminar campo "aumento"** de preregistros (mover a tablas de ventas)
3. **Implementar sistema de arqueo** diferenciado para minoristas y mayoristas
4. **Mejorar transferencias** entre minoristas (saldos restantes)
5. **Sistema de notificaciones** para mayoristas sin arqueo > 2 días
6. **Reportes** para administrador

---

## 📊 Estructura de Datos Propuesta

### 1. Tablas Nuevas

#### 1.1. `ventas_minoristas`
Registra las ventas y aumentos de productos de minoristas.

```sql
CREATE TABLE ventas_minoristas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_minorista UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  id_producto UUID NOT NULL REFERENCES productos(id) ON DELETE CASCADE,
  cantidad_vendida INTEGER DEFAULT 0 NOT NULL CHECK (cantidad_vendida >= 0),
  cantidad_aumento INTEGER DEFAULT 0 NOT NULL CHECK (cantidad_aumento >= 0),
  precio_unitario NUMERIC(10, 2) NOT NULL CHECK (precio_unitario >= 0),
  total NUMERIC(10, 2) NOT NULL CHECK (total >= 0),
  fecha DATE NOT NULL,
  hora TIME NOT NULL,
  id_pedido UUID REFERENCES pedidos(id) ON DELETE SET NULL, -- Si el aumento viene de un pedido
  observaciones TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

COMMENT ON TABLE ventas_minoristas IS 'Ventas y aumentos de productos de minoristas';
COMMENT ON COLUMN ventas_minoristas.cantidad_vendida IS 'Cantidad de productos vendidos a clientes';
COMMENT ON COLUMN ventas_minoristas.cantidad_aumento IS 'Cantidad de productos recibidos (aumento)';
COMMENT ON COLUMN ventas_minoristas.id_pedido IS 'ID del pedido si el aumento proviene de un pedido entregado';
```

#### 1.2. `ventas_mayoristas`
Registra las ventas y aumentos de productos de mayoristas.

```sql
CREATE TABLE ventas_mayoristas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_mayorista UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  id_producto UUID NOT NULL REFERENCES productos(id) ON DELETE CASCADE,
  cantidad_vendida INTEGER DEFAULT 0 NOT NULL CHECK (cantidad_vendida >= 0),
  cantidad_aumento INTEGER DEFAULT 0 NOT NULL CHECK (cantidad_aumento >= 0),
  precio_por_mayor NUMERIC(10, 2) NOT NULL CHECK (precio_por_mayor >= 0),
  total NUMERIC(10, 2) NOT NULL CHECK (total >= 0),
  fecha DATE NOT NULL,
  hora TIME NOT NULL,
  id_pedido UUID REFERENCES pedidos(id) ON DELETE SET NULL, -- Si el aumento viene de un pedido
  observaciones TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

COMMENT ON TABLE ventas_mayoristas IS 'Ventas y aumentos de productos de mayoristas';
COMMENT ON COLUMN ventas_mayoristas.cantidad_vendida IS 'Cantidad de productos vendidos a clientes';
COMMENT ON COLUMN ventas_mayoristas.cantidad_aumento IS 'Cantidad de productos recibidos (aumento)';
COMMENT ON COLUMN ventas_mayoristas.id_pedido IS 'ID del pedido si el aumento proviene de un pedido entregado';
```

#### 1.3. `arqueos_minoristas`
Registra los arqueos diarios de minoristas.

```sql
CREATE TABLE arqueos_minoristas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_minorista UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  fecha DATE NOT NULL,
  hora_apertura TIME,
  hora_cierre TIME,
  ventas_del_periodo NUMERIC(10, 2) DEFAULT 0 NOT NULL CHECK (ventas_del_periodo >= 0),
  saldos_restantes JSONB NOT NULL, -- Array de {id_producto, cantidad_restante}
  efectivo_recibido NUMERIC(10, 2) DEFAULT 0 NOT NULL CHECK (efectivo_recibido >= 0),
  diferencia NUMERIC(10, 2) GENERATED ALWAYS AS (efectivo_recibido - ventas_del_periodo) STORED,
  observaciones TEXT,
  estado VARCHAR(20) DEFAULT 'abierto' NOT NULL CHECK (estado IN ('abierto', 'cerrado')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(id_minorista, fecha, estado) -- Un arqueo abierto por minorista por día
);

COMMENT ON TABLE arqueos_minoristas IS 'Arqueos diarios de minoristas';
COMMENT ON COLUMN arqueos_minoristas.saldos_restantes IS 'JSON con saldos restantes: [{"id_producto": "uuid", "cantidad_restante": 10}]';
```

#### 1.4. `arqueos_mayoristas`
Registra los arqueos flexibles de mayoristas (cada 2 días aproximadamente).

```sql
CREATE TABLE arqueos_mayoristas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_mayorista UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  fecha_inicio DATE NOT NULL,
  fecha_fin DATE NOT NULL,
  hora_apertura TIME,
  hora_cierre TIME,
  ventas_del_periodo NUMERIC(10, 2) DEFAULT 0 NOT NULL CHECK (ventas_del_periodo >= 0),
  saldos_restantes JSONB NOT NULL, -- Array de {id_producto, cantidad_restante}
  efectivo_recibido NUMERIC(10, 2) DEFAULT 0 NOT NULL CHECK (efectivo_recibido >= 0),
  diferencia NUMERIC(10, 2) GENERATED ALWAYS AS (efectivo_recibido - ventas_del_periodo) STORED,
  observaciones TEXT,
  estado VARCHAR(20) DEFAULT 'abierto' NOT NULL CHECK (estado IN ('abierto', 'cerrado')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

COMMENT ON TABLE arqueos_mayoristas IS 'Arqueos flexibles de mayoristas (cada 2 días aproximadamente)';
COMMENT ON COLUMN arqueos_mayoristas.saldos_restantes IS 'JSON con saldos restantes arrastrados: [{"id_producto": "uuid", "cantidad_restante": 10}]';
```

#### 1.5. `notificaciones_arqueo`
Notificaciones para mayoristas sin arqueo > 2 días.

```sql
CREATE TABLE notificaciones_arqueo (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_mayorista UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  fecha_ultimo_arqueo DATE,
  dias_sin_arqueo INTEGER NOT NULL CHECK (dias_sin_arqueo > 0),
  estado VARCHAR(20) DEFAULT 'pendiente' NOT NULL CHECK (estado IN ('pendiente', 'vista', 'resuelta')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

COMMENT ON TABLE notificaciones_arqueo IS 'Notificaciones para mayoristas sin arqueo por más de 2 días';
```

### 2. Modificaciones a Tablas Existentes

#### 2.1. `preregistros_minorista`
**Eliminar campo `aumento`** (ya no se usa aquí, va en `ventas_minoristas`).

```sql
-- Eliminar campo aumento
ALTER TABLE preregistros_minorista 
DROP COLUMN IF EXISTS aumento;
```

**Estructura final:**
```sql
preregistros_minorista (
  id UUID PRIMARY KEY,
  id_minorista UUID REFERENCES usuarios(id),
  id_producto UUID REFERENCES productos(id),
  cantidad INTEGER NOT NULL, -- Cantidad inicial diaria
  fecha DATE NOT NULL,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
)
```

#### 2.2. `preregistros_mayorista`
**Eliminar campo `aumento`** (ya no se usa aquí, va en `ventas_mayoristas`).

```sql
-- Eliminar campo aumento
ALTER TABLE preregistros_mayorista 
DROP COLUMN IF EXISTS aumento;
```

**Estructura final:**
```sql
preregistros_mayorista (
  id UUID PRIMARY KEY,
  id_mayorista UUID REFERENCES usuarios(id),
  id_producto UUID REFERENCES productos(id),
  cantidad INTEGER NOT NULL, -- Cantidad inicial (punto de inicio)
  fecha DATE NOT NULL,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
)
```

#### 2.3. `transferencias_saldos`
**Modificar** para reflejar que solo transfiere saldos restantes (no afecta preregistros).

```sql
-- Actualizar comentarios
COMMENT ON TABLE transferencias_saldos IS 'Transferencias de saldos restantes entre minoristas (solo productos físicos, no afecta preregistros)';
COMMENT ON COLUMN transferencias_saldos.saldos_transferidos IS 'JSON con saldos restantes transferidos: [{"id_producto": "uuid", "cantidad_restante": 10}]';
```

---

## 🔄 Flujos de Trabajo

### Flujo Minorista

1. **Inicio del día:**
   - Administrador crea preregistro diario con cantidad base
   - Minorista recibe productos físicos según preregistro

2. **Durante el día:**
   - Minorista realiza ventas → se registra en `ventas_minoristas` (cantidad_vendida)
   - Minorista puede transferir saldos restantes a otro minorista → `transferencias_saldos`
   - Minorista puede recibir saldos de otro minorista → actualiza saldos disponibles
   - Minorista puede solicitar aumento → crea pedido → cuando se entrega, se registra en `ventas_minoristas` (cantidad_aumento)

3. **Fin del día:**
   - Minorista realiza arqueo → `arqueos_minoristas`
   - Se registran ventas del período, saldos restantes, efectivo recibido
   - Preregistro se mantiene como histórico

### Flujo Mayorista

1. **Inicio (punto de inicio):**
   - Administrador crea preregistro (solo informativo, punto de inicio)
   - Mayorista recibe productos físicos según preregistro

2. **Durante el período (2 días aproximadamente):**
   - Mayorista realiza ventas → se registra en `ventas_mayoristas` (cantidad_vendida)
   - Mayorista puede solicitar aumento → crea pedido → cuando se entrega, se registra en `ventas_mayoristas` (cantidad_aumento)
   - Saldos restantes se arrastran automáticamente al siguiente día

3. **Arqueo (cada 2 días, flexible):**
   - Mayorista realiza arqueo → `arqueos_mayoristas`
   - Se registran ventas del período, saldos restantes arrastrados, efectivo recibido
   - Si pasa > 2 días sin arqueo → notificación al administrador

---

## 📝 Índices Necesarios

```sql
-- Índices para ventas_minoristas
CREATE INDEX idx_ventas_minoristas_minorista ON ventas_minoristas(id_minorista);
CREATE INDEX idx_ventas_minoristas_producto ON ventas_minoristas(id_producto);
CREATE INDEX idx_ventas_minoristas_fecha ON ventas_minoristas(fecha);
CREATE INDEX idx_ventas_minoristas_minorista_fecha ON ventas_minoristas(id_minorista, fecha);

-- Índices para ventas_mayoristas
CREATE INDEX idx_ventas_mayoristas_mayorista ON ventas_mayoristas(id_mayorista);
CREATE INDEX idx_ventas_mayoristas_producto ON ventas_mayoristas(id_producto);
CREATE INDEX idx_ventas_mayoristas_fecha ON ventas_mayoristas(fecha);
CREATE INDEX idx_ventas_mayoristas_mayorista_fecha ON ventas_mayoristas(id_mayorista, fecha);

-- Índices para arqueos_minoristas
CREATE INDEX idx_arqueos_minoristas_minorista ON arqueos_minoristas(id_minorista);
CREATE INDEX idx_arqueos_minoristas_fecha ON arqueos_minoristas(fecha);
CREATE INDEX idx_arqueos_minoristas_estado ON arqueos_minoristas(estado);

-- Índices para arqueos_mayoristas
CREATE INDEX idx_arqueos_mayoristas_mayorista ON arqueos_mayoristas(id_mayorista);
CREATE INDEX idx_arqueos_mayoristas_fecha_inicio ON arqueos_mayoristas(fecha_inicio);
CREATE INDEX idx_arqueos_mayoristas_fecha_fin ON arqueos_mayoristas(fecha_fin);
CREATE INDEX idx_arqueos_mayoristas_estado ON arqueos_mayoristas(estado);

-- Índices para notificaciones_arqueo
CREATE INDEX idx_notificaciones_arqueo_mayorista ON notificaciones_arqueo(id_mayorista);
CREATE INDEX idx_notificaciones_arqueo_estado ON notificaciones_arqueo(estado);
```

---

## 🔐 Políticas RLS (Row Level Security)

### `ventas_minoristas`
- **SELECT**: Minoristas ven sus propias ventas, administradores ven todas
- **INSERT**: Minoristas pueden crear sus propias ventas
- **UPDATE**: Solo administradores
- **DELETE**: Solo administradores

### `ventas_mayoristas`
- **SELECT**: Mayoristas ven sus propias ventas, administradores ven todas
- **INSERT**: Mayoristas pueden crear sus propias ventas
- **UPDATE**: Solo administradores
- **DELETE**: Solo administradores

### `arqueos_minoristas`
- **SELECT**: Minoristas ven sus propios arqueos, administradores ven todos
- **INSERT**: Minoristas pueden crear sus propios arqueos
- **UPDATE**: Minoristas pueden actualizar sus arqueos abiertos, administradores pueden actualizar todos
- **DELETE**: Solo administradores

### `arqueos_mayoristas`
- **SELECT**: Mayoristas ven sus propios arqueos, administradores ven todos
- **INSERT**: Mayoristas pueden crear sus propios arqueos
- **UPDATE**: Mayoristas pueden actualizar sus arqueos abiertos, administradores pueden actualizar todos
- **DELETE**: Solo administradores

### `notificaciones_arqueo`
- **SELECT**: Solo administradores
- **INSERT**: Sistema (trigger/función)
- **UPDATE**: Solo administradores
- **DELETE**: Solo administradores

---

## ⚙️ Funciones y Triggers

### 1. Función: Calcular saldo disponible de minorista
```sql
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
  -- Obtener cantidad del preregistro del día
  SELECT COALESCE(cantidad, 0) INTO v_cantidad_preregistro
  FROM preregistros_minorista
  WHERE id_minorista = p_id_minorista
    AND id_producto = p_id_producto
    AND fecha = p_fecha;
  
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
```

### 2. Función: Calcular saldo disponible de mayorista (con arrastre)
```sql
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
BEGIN
  -- Obtener saldo del último arqueo cerrado (arrastre)
  SELECT COALESCE(
    (saldos_restantes->>p_id_producto::text)::INTEGER, 
    0
  ) INTO v_saldo_anterior
  FROM arqueos_mayoristas
  WHERE id_mayorista = p_id_mayorista
    AND estado = 'cerrado'
    AND fecha_fin < p_fecha
  ORDER BY fecha_fin DESC
  LIMIT 1;
  
  -- Si no hay arqueo anterior, usar preregistro inicial
  IF v_saldo_anterior IS NULL OR v_saldo_anterior = 0 THEN
    SELECT COALESCE(cantidad, 0) INTO v_saldo_anterior
    FROM preregistros_mayorista
    WHERE id_mayorista = p_id_mayorista
      AND id_producto = p_id_producto
      AND fecha <= p_fecha
    ORDER BY fecha DESC
    LIMIT 1;
  END IF;
  
  -- Sumar cantidad vendida desde último arqueo
  SELECT COALESCE(SUM(cantidad_vendida), 0) INTO v_cantidad_vendida
  FROM ventas_mayoristas
  WHERE id_mayorista = p_id_mayorista
    AND id_producto = p_id_producto
    AND fecha >= COALESCE(
      (SELECT fecha_fin FROM arqueos_mayoristas 
       WHERE id_mayorista = p_id_mayorista 
       AND estado = 'cerrado' 
       ORDER BY fecha_fin DESC LIMIT 1),
      (SELECT fecha FROM preregistros_mayorista 
       WHERE id_mayorista = p_id_mayorista 
       AND id_producto = p_id_producto 
       ORDER BY fecha DESC LIMIT 1)
    )
    AND fecha <= p_fecha;
  
  -- Sumar aumentos desde último arqueo
  SELECT COALESCE(SUM(cantidad_aumento), 0) INTO v_cantidad_aumento
  FROM ventas_mayoristas
  WHERE id_mayorista = p_id_mayorista
    AND id_producto = p_id_producto
    AND fecha >= COALESCE(
      (SELECT fecha_fin FROM arqueos_mayoristas 
       WHERE id_mayorista = p_id_mayorista 
       AND estado = 'cerrado' 
       ORDER BY fecha_fin DESC LIMIT 1),
      (SELECT fecha FROM preregistros_mayorista 
       WHERE id_mayorista = p_id_mayorista 
       AND id_producto = p_id_producto 
       ORDER BY fecha DESC LIMIT 1)
    )
    AND fecha <= p_fecha;
  
  -- Calcular saldo disponible
  v_saldo_disponible := v_saldo_anterior + v_cantidad_aumento - v_cantidad_vendida;
  
  RETURN GREATEST(0, v_saldo_disponible);
END;
$$ LANGUAGE plpgsql;
```

### 3. Trigger: Notificar mayoristas sin arqueo > 2 días
```sql
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
        ON CONFLICT DO NOTHING; -- Evitar duplicados
      END IF;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Ejecutar diariamente (mediante cron job o función programada)
```

### 4. Trigger: Actualizar total en ventas_minoristas
```sql
CREATE OR REPLACE FUNCTION calcular_total_venta_minorista()
RETURNS TRIGGER AS $$
BEGIN
  NEW.total := (NEW.cantidad_vendida + NEW.cantidad_aumento) * NEW.precio_unitario;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_calcular_total_venta_minorista
  BEFORE INSERT OR UPDATE ON ventas_minoristas
  FOR EACH ROW
  EXECUTE FUNCTION calcular_total_venta_minorista();
```

### 5. Trigger: Actualizar total en ventas_mayoristas
```sql
CREATE OR REPLACE FUNCTION calcular_total_venta_mayorista()
RETURNS TRIGGER AS $$
BEGIN
  NEW.total := (NEW.cantidad_vendida + NEW.cantidad_aumento) * NEW.precio_por_mayor;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_calcular_total_venta_mayorista
  BEFORE INSERT OR UPDATE ON ventas_mayoristas
  FOR EACH ROW
  EXECUTE FUNCTION calcular_total_venta_mayorista();
```

---

## 📊 Reportes para Administrador

### 1. Ventas por Minorista (diario/semanal/mensual)
```sql
SELECT 
  u.nombre AS minorista,
  p.nombre AS producto,
  SUM(vm.cantidad_vendida) AS total_vendido,
  SUM(vm.cantidad_aumento) AS total_aumento,
  SUM(vm.total) AS total_ventas
FROM ventas_minoristas vm
JOIN usuarios u ON vm.id_minorista = u.id
JOIN productos p ON vm.id_producto = p.id
WHERE vm.fecha BETWEEN :fecha_inicio AND :fecha_fin
GROUP BY u.nombre, p.nombre
ORDER BY u.nombre, p.nombre;
```

### 2. Ventas por Mayorista (diario/semanal/mensual)
```sql
SELECT 
  u.nombre AS mayorista,
  p.nombre AS producto,
  SUM(vm.cantidad_vendida) AS total_vendido,
  SUM(vm.cantidad_aumento) AS total_aumento,
  SUM(vm.total) AS total_ventas
FROM ventas_mayoristas vm
JOIN usuarios u ON vm.id_mayorista = u.id
JOIN productos p ON vm.id_producto = p.id
WHERE vm.fecha BETWEEN :fecha_inicio AND :fecha_fin
GROUP BY u.nombre, p.nombre
ORDER BY u.nombre, p.nombre;
```

### 3. Productos más vendidos
```sql
-- Minoristas
SELECT 
  p.nombre AS producto,
  SUM(vm.cantidad_vendida) AS total_vendido
FROM ventas_minoristas vm
JOIN productos p ON vm.id_producto = p.id
WHERE vm.fecha BETWEEN :fecha_inicio AND :fecha_fin
GROUP BY p.nombre
ORDER BY total_vendido DESC;

-- Mayoristas
SELECT 
  p.nombre AS producto,
  SUM(vm.cantidad_vendida) AS total_vendido
FROM ventas_mayoristas vm
JOIN productos p ON vm.id_producto = p.id
WHERE vm.fecha BETWEEN :fecha_inicio AND :fecha_fin
GROUP BY p.nombre
ORDER BY total_vendido DESC;
```

### 4. Saldos restantes actuales
```sql
-- Minoristas
SELECT 
  u.nombre AS minorista,
  p.nombre AS producto,
  calcular_saldo_disponible_minorista(u.id, p.id, CURRENT_DATE) AS saldo_restante
FROM usuarios u
CROSS JOIN productos p
WHERE u.rol = 'minorista' AND u.estado = 'activo'
  AND p.estado = 'activo'
HAVING calcular_saldo_disponible_minorista(u.id, p.id, CURRENT_DATE) > 0
ORDER BY u.nombre, p.nombre;

-- Mayoristas
SELECT 
  u.nombre AS mayorista,
  p.nombre AS producto,
  calcular_saldo_disponible_mayorista(u.id, p.id, CURRENT_DATE) AS saldo_restante
FROM usuarios u
CROSS JOIN productos p
WHERE u.rol = 'mayorista' AND u.estado = 'activo'
  AND p.estado = 'activo'
HAVING calcular_saldo_disponible_mayorista(u.id, p.id, CURRENT_DATE) > 0
ORDER BY u.nombre, p.nombre;
```

### 5. Aumentos solicitados
```sql
-- Minoristas
SELECT 
  u.nombre AS minorista,
  p.nombre AS producto,
  vm.cantidad_aumento,
  vm.fecha,
  pe.estado AS estado_pedido
FROM ventas_minoristas vm
JOIN usuarios u ON vm.id_minorista = u.id
JOIN productos p ON vm.id_producto = p.id
LEFT JOIN pedidos pe ON vm.id_pedido = pe.id
WHERE vm.cantidad_aumento > 0
  AND vm.fecha BETWEEN :fecha_inicio AND :fecha_fin
ORDER BY vm.fecha DESC;

-- Mayoristas
SELECT 
  u.nombre AS mayorista,
  p.nombre AS producto,
  vm.cantidad_aumento,
  vm.fecha,
  pe.estado AS estado_pedido
FROM ventas_mayoristas vm
JOIN usuarios u ON vm.id_mayorista = u.id
JOIN productos p ON vm.id_producto = p.id
LEFT JOIN pedidos pe ON vm.id_pedido = pe.id
WHERE vm.cantidad_aumento > 0
  AND vm.fecha BETWEEN :fecha_inicio AND :fecha_fin
ORDER BY vm.fecha DESC;
```

### 6. Transferencias realizadas
```sql
SELECT 
  uo.nombre AS minorista_origen,
  ud.nombre AS minorista_destino,
  ts.fecha_transferencia,
  ts.fecha_escaneo,
  ts.estado,
  ts.saldos_transferidos
FROM transferencias_saldos ts
JOIN usuarios uo ON ts.id_minorista_origen = uo.id
JOIN usuarios ud ON ts.id_minorista_destino = ud.id
WHERE ts.fecha_transferencia BETWEEN :fecha_inicio AND :fecha_fin
ORDER BY ts.fecha_transferencia DESC;
```

### 7. Mayoristas sin arqueo > 2 días
```sql
SELECT 
  u.nombre AS mayorista,
  na.fecha_ultimo_arqueo,
  na.dias_sin_arqueo,
  na.estado,
  na.created_at AS fecha_notificacion
FROM notificaciones_arqueo na
JOIN usuarios u ON na.id_mayorista = u.id
WHERE na.estado = 'pendiente'
ORDER BY na.dias_sin_arqueo DESC;
```

---

## 🚀 Plan de Implementación

### Fase 1: Preparación (1-2 días)
1. ✅ Crear documento de plan (este documento)
2. ✅ Revisar estructura actual
3. ✅ Crear scripts de migración

### Fase 2: Migración de Base de Datos (2-3 días)
1. Crear nuevas tablas (`ventas_minoristas`, `ventas_mayoristas`, `arqueos_minoristas`, `arqueos_mayoristas`, `notificaciones_arqueo`)
2. Eliminar campo `aumento` de `preregistros_minorista` y `preregistros_mayorista`
3. Crear índices
4. Crear funciones y triggers
5. Configurar políticas RLS
6. Migrar datos existentes (si aplica)

### Fase 3: Backend/Servicios (3-4 días)
1. Crear servicios para `ventas_minoristas`
2. Crear servicios para `ventas_mayoristas`
3. Crear servicios para `arqueos_minoristas`
4. Crear servicios para `arqueos_mayoristas`
5. Crear servicios para `notificaciones_arqueo`
6. Actualizar servicios de preregistros (eliminar lógica de aumento)
7. Actualizar servicios de pedidos (registrar aumento en ventas cuando se entrega)

### Fase 4: Frontend/Interfaz (5-7 días)
1. Actualizar página "Nueva Venta" para minoristas:
   - Eliminar lógica de aumento de preregistros
   - Registrar ventas en `ventas_minoristas`
   - Mostrar saldo disponible calculado
2. Actualizar página "Nueva Venta" para mayoristas:
   - Eliminar lógica de aumento de preregistros
   - Registrar ventas en `ventas_mayoristas`
   - Mostrar saldo disponible con arrastre
3. Crear página "Arqueo Minorista"
4. Crear página "Arqueo Mayorista"
5. Actualizar transferencias entre minoristas
6. Crear página de notificaciones para administrador
7. Crear reportes para administrador

### Fase 5: Testing y Ajustes (2-3 días)
1. Probar flujo completo de minoristas
2. Probar flujo completo de mayoristas
3. Probar transferencias
4. Probar arqueos
5. Probar notificaciones
6. Ajustar según feedback

### Fase 6: Documentación y Despliegue (1-2 días)
1. Actualizar documentación
2. Crear guía de usuario
3. Desplegar a producción
4. Capacitación

---

## 📋 Checklist de Implementación

### Base de Datos
- [ ] Crear tabla `ventas_minoristas`
- [ ] Crear tabla `ventas_mayoristas`
- [ ] Crear tabla `arqueos_minoristas`
- [ ] Crear tabla `arqueos_mayoristas`
- [ ] Crear tabla `notificaciones_arqueo`
- [ ] Eliminar campo `aumento` de `preregistros_minorista`
- [ ] Eliminar campo `aumento` de `preregistros_mayorista`
- [ ] Crear índices
- [ ] Crear funciones de cálculo de saldo
- [ ] Crear triggers
- [ ] Configurar políticas RLS

### Backend
- [ ] Servicio `ventas-minoristas.service.ts`
- [ ] Servicio `ventas-mayoristas.service.ts`
- [ ] Servicio `arqueos-minoristas.service.ts`
- [ ] Servicio `arqueos-mayoristas.service.ts`
- [ ] Servicio `notificaciones-arqueo.service.ts`
- [ ] Actualizar `preregistros.service.ts` (eliminar lógica de aumento)
- [ ] Actualizar `pedidos.service.ts` (registrar aumento en ventas)

### Frontend
- [ ] Actualizar `NewSale.tsx` para minoristas
- [ ] Actualizar `NewSale.tsx` para mayoristas
- [ ] Crear página `ArqueoMinorista.tsx`
- [ ] Crear página `ArqueoMayorista.tsx`
- [ ] Actualizar transferencias
- [ ] Crear página de notificaciones
- [ ] Crear reportes

### Testing
- [ ] Probar flujo minorista completo
- [ ] Probar flujo mayorista completo
- [ ] Probar transferencias
- [ ] Probar arqueos
- [ ] Probar notificaciones

---

## ⚠️ Consideraciones Importantes

1. **Migración de datos**: Si hay datos existentes con el campo `aumento` en preregistros, se debe migrar a las nuevas tablas de ventas antes de eliminar el campo.

2. **Compatibilidad**: Durante la transición, mantener compatibilidad con el sistema actual hasta que todo esté migrado.

3. **Backup**: Hacer backup completo de la base de datos antes de aplicar cambios.

4. **Notificaciones**: Implementar sistema de notificaciones en tiempo real o verificación periódica (cron job).

5. **Validaciones**: Asegurar que no se puedan registrar ventas con cantidad mayor al saldo disponible.

6. **Arrastre de saldo mayoristas**: El sistema debe calcular automáticamente el saldo arrastrado desde el último arqueo cerrado.

---

## 📝 Notas Finales

Este plan proporciona una estructura sólida y escalable para el manejo de minoristas y mayoristas. La separación de ventas permite un mejor control y reportes, mientras que el sistema de arqueos facilita la gestión diaria y flexible según el tipo de usuario.

**Próximos pasos**: Revisar este plan, hacer ajustes si es necesario, y comenzar con la Fase 1 de implementación.

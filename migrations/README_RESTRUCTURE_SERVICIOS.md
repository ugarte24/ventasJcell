# Reestructuración de Tablas de Servicios

## 📋 Resumen

Esta migración reestructura completamente las tablas `servicios`, `movimientos_servicios` y `registros_servicios` para mejorar la integridad de datos, rendimiento y mantenibilidad.

## 🔄 Cambios Principales

### 1. **Tabla SERVICIOS**
- ✅ Uso de `TIMESTAMP WITH TIME ZONE` para mejor manejo de zonas horarias
- ✅ Agregado de `CHECK` constraints para validar `saldo_actual >= 0` y `estado IN ('activo', 'inactivo')`
- ✅ Mejora en índices (agregado índice por nombre)

### 2. **Tabla MOVIMIENTOS_SERVICIOS**
- ✅ Cambio de `hora VARCHAR(8)` a `hora TIME` para mejor integridad de datos
- ✅ Agregado de `CHECK` constraints para validar valores positivos
- ✅ Índices compuestos para mejor rendimiento en consultas por servicio y fecha
- ✅ Índice por tipo para filtrar aumentos vs ajustes

### 3. **Tabla REGISTROS_SERVICIOS**
- ✅ Uso de `TIMESTAMP WITH TIME ZONE` para consistencia
- ✅ Agregado de `CHECK` constraints para validar valores no negativos
- ✅ Mantenimiento de la fórmula: `monto_transaccionado = saldo_inicial + monto_aumentado - saldo_final`
- ✅ Soporte para edición manual de `monto_aumentado`

## 📊 Estructura Final

### SERVICIOS
```sql
- id (UUID, PK)
- nombre (VARCHAR(100), UNIQUE, NOT NULL)
- descripcion (TEXT)
- estado (VARCHAR(20), DEFAULT 'activo', CHECK IN ('activo', 'inactivo'))
- created_at (TIMESTAMP WITH TIME ZONE)
- updated_at (TIMESTAMP WITH TIME ZONE)
```

**Nota:** El campo `saldo_actual` ha sido eliminado. El saldo actual se calcula dinámicamente desde los movimientos y registros.

### MOVIMIENTOS_SERVICIOS
```sql
- id (UUID, PK)
- id_servicio (UUID, FK -> servicios)
- tipo (VARCHAR(20), DEFAULT 'aumento', CHECK IN ('aumento', 'ajuste'))
- monto (NUMERIC(10,2), CHECK > 0)
- saldo_anterior (NUMERIC(10,2), CHECK >= 0)
- saldo_nuevo (NUMERIC(10,2), CHECK >= 0)
- fecha (DATE, NOT NULL)
- hora (TIME, NOT NULL) -- Cambiado de VARCHAR a TIME
- id_usuario (UUID, FK -> auth.users)
- observacion (TEXT)
- created_at (TIMESTAMP WITH TIME ZONE)
```

### REGISTROS_SERVICIOS
```sql
- id (UUID, PK)
- id_servicio (UUID, FK -> servicios)
- fecha (DATE, NOT NULL)
- saldo_inicial (NUMERIC(10,2), CHECK >= 0)
- saldo_final (NUMERIC(10,2), CHECK >= 0)
- monto_aumentado (NUMERIC(10,2), DEFAULT 0, CHECK >= 0)
- monto_transaccionado (NUMERIC(10,2), DEFAULT 0)
- id_usuario (UUID, FK -> auth.users)
- observacion (TEXT)
- created_at (TIMESTAMP WITH TIME ZONE)
- updated_at (TIMESTAMP WITH TIME ZONE)
- UNIQUE(id_servicio, fecha)
```

## 🔧 Funciones y Triggers

### Funciones
1. **`update_updated_at_column()`** - Actualiza `updated_at` automáticamente
2. **`calcular_monto_aumentado()`** - Calcula la suma de aumentos del día
3. **`calcular_monto_transaccionado()`** - Calcula: `saldo_inicial + monto_aumentado - saldo_final`
4. **`calcular_montos_registro_servicio()`** - Trigger que calcula montos automáticamente

### Triggers
1. **`update_servicios_updated_at`** - Actualiza `updated_at` en servicios
2. **`update_registros_servicios_updated_at`** - Actualiza `updated_at` en registros
3. **`trigger_calcular_montos_registro_servicio`** - Calcula montos al insertar/actualizar registro

**Nota:** El trigger `trigger_actualizar_saldo_servicio` ha sido eliminado ya que no existe el campo `saldo_actual` en la tabla `servicios`.

## 🔐 Políticas RLS

### SERVICIOS
- **SELECT**: Todos los usuarios autenticados pueden ver
- **INSERT/UPDATE/DELETE**: Solo administradores

### MOVIMIENTOS_SERVICIOS
- **SELECT**: Todos los usuarios autenticados pueden ver
- **INSERT**: Todos los usuarios autenticados pueden crear
- **UPDATE/DELETE**: Solo administradores

### REGISTROS_SERVICIOS
- **SELECT**: Todos los usuarios autenticados pueden ver
- **INSERT/UPDATE**: Todos los usuarios autenticados pueden crear/actualizar
- **DELETE**: Solo administradores

## 📈 Índices Creados

### SERVICIOS
- `idx_servicios_estado` - Búsqueda por estado
- `idx_servicios_nombre` - Búsqueda por nombre

### MOVIMIENTOS_SERVICIOS
- `idx_movimientos_servicios_servicio` - Búsqueda por servicio
- `idx_movimientos_servicios_fecha` - Búsqueda por fecha
- `idx_movimientos_servicios_tipo` - Filtrado por tipo
- `idx_movimientos_servicios_servicio_fecha` - Búsqueda compuesta (servicio + fecha)

### REGISTROS_SERVICIOS
- `idx_registros_servicios_servicio` - Búsqueda por servicio
- `idx_registros_servicios_fecha` - Búsqueda por fecha
- `idx_registros_servicios_servicio_fecha` - Búsqueda compuesta (servicio + fecha)

## ⚠️ Importante

1. **Sin Backup**: Esta migración NO crea tablas de backup. Los datos existentes se perderán al ejecutar la migración.
2. **Eliminación de `saldo_actual`**: El campo `saldo_actual` ha sido eliminado de la tabla `servicios`. El saldo actual debe calcularse dinámicamente desde los movimientos.
3. **Conversión de Hora**: Los valores de `hora VARCHAR` se convierten a `TIME` automáticamente si se restauran datos
4. **Datos Existentes**: Si tienes datos importantes, haz un backup manual antes de ejecutar esta migración

## 🚀 Cómo Ejecutar

1. Abre el SQL Editor en Supabase
2. Copia y pega el contenido de `migrations/restructure_servicios_tables.sql`
3. Ejecuta la migración
4. Verifica que los datos se hayan restaurado correctamente
5. (Opcional) Elimina las tablas de backup si todo está correcto

## ✅ Verificación Post-Migración

```sql
-- Verificar que las tablas existen
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('servicios', 'movimientos_servicios', 'registros_servicios');

-- Verificar que los datos se restauraron
SELECT COUNT(*) FROM servicios;
SELECT COUNT(*) FROM movimientos_servicios;
SELECT COUNT(*) FROM registros_servicios;

-- Verificar triggers
SELECT trigger_name, event_manipulation, event_object_table 
FROM information_schema.triggers 
WHERE event_object_table IN ('servicios', 'movimientos_servicios', 'registros_servicios');

-- Verificar políticas RLS
SELECT tablename, policyname, permissive, roles, cmd 
FROM pg_policies 
WHERE tablename IN ('servicios', 'movimientos_servicios', 'registros_servicios');
```


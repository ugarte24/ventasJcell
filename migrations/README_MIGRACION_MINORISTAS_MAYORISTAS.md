# Guía de Migración: Reestructuración de Minoristas y Mayoristas

Esta guía explica el proceso completo para migrar de la estructura actual (con campo `aumento` en preregistros) a la nueva estructura (con tablas separadas de ventas).

## 📋 Resumen

La migración consiste en:
1. **Crear nuevas tablas** para ventas y arqueos de minoristas/mayoristas
2. **Migrar datos existentes** del campo `aumento` a las nuevas tablas
3. **Eliminar el campo `aumento`** de preregistros

## ⚠️ IMPORTANTE: Antes de Empezar

1. **Hacer backup completo de la base de datos**
   ```sql
   -- Ejemplo con pg_dump
   pg_dump -h tu_host -U tu_usuario -d tu_base_de_datos > backup_antes_migracion.sql
   ```

2. **Verificar que no hay procesos activos** usando las tablas de preregistros

3. **Ejecutar en horario de bajo tráfico** si es posible

## 📝 Orden de Ejecución

### Paso 1: Crear Nuevas Tablas
Ejecutar el script que crea todas las nuevas tablas, funciones y triggers:

```sql
-- Ejecutar en Supabase SQL Editor o psql
\i migrations/restructure_minoristas_mayoristas.sql
```

**O copiar y pegar el contenido del archivo en el SQL Editor de Supabase.**

Este script:
- ✅ Crea `ventas_minoristas`
- ✅ Crea `ventas_mayoristas`
- ✅ Crea `arqueos_minoristas`
- ✅ Crea `arqueos_mayoristas`
- ✅ Crea `notificaciones_arqueo`
- ✅ Crea índices
- ✅ Crea funciones de cálculo
- ✅ Crea triggers
- ✅ Configura políticas RLS

**Tiempo estimado:** 2-5 minutos

### Paso 2: Migrar Datos Existentes
Ejecutar el script que migra los aumentos existentes:

```sql
\i migrations/migrate_aumento_to_ventas.sql
```

Este script:
- ✅ Verifica que las nuevas tablas existan
- ✅ Crea backup temporal de datos
- ✅ Migra aumentos de `preregistros_minorista` → `ventas_minoristas`
- ✅ Migra aumentos de `preregistros_mayorista` → `ventas_mayoristas`
- ✅ Intenta asociar pedidos entregados cuando sea posible
- ✅ Genera reporte de migración

**Tiempo estimado:** Depende de la cantidad de datos (1-10 minutos)

**Verificar el reporte:**
- Revisar que el número de registros migrados coincida con preregistros con aumento
- Verificar que no hay errores en los logs

### Paso 3: Eliminar Campo Aumento
**SOLO después de verificar que la migración fue exitosa:**

```sql
\i migrations/remove_aumento_from_preregistros.sql
```

Este script:
- ✅ Verifica que los datos fueron migrados
- ✅ Elimina campo `aumento` de `preregistros_minorista`
- ✅ Elimina campo `aumento` de `preregistros_mayorista`
- ✅ Verifica que la eliminación fue exitosa

**Tiempo estimado:** 1-2 minutos

## 🔍 Verificaciones Post-Migración

### 1. Verificar Datos Migrados

```sql
-- Contar registros migrados de minoristas
SELECT COUNT(*) as total_migrados
FROM ventas_minoristas
WHERE observaciones LIKE 'Migrado desde preregistros_minorista.aumento%';

-- Contar registros migrados de mayoristas
SELECT COUNT(*) as total_migrados
FROM ventas_mayoristas
WHERE observaciones LIKE 'Migrado desde preregistros_mayorista.aumento%';

-- Ver algunos ejemplos
SELECT 
  vm.id_minorista,
  u.nombre as minorista,
  p.nombre as producto,
  vm.cantidad_aumento,
  vm.fecha,
  vm.id_pedido
FROM ventas_minoristas vm
JOIN usuarios u ON vm.id_minorista = u.id
JOIN productos p ON vm.id_producto = p.id
WHERE vm.observaciones LIKE 'Migrado desde preregistros_minorista.aumento%'
LIMIT 10;
```

### 2. Verificar que el Campo Aumento Fue Eliminado

```sql
-- Verificar preregistros_minorista
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'preregistros_minorista' 
  AND column_name = 'aumento';
-- Debe retornar 0 filas

-- Verificar preregistros_mayorista
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'preregistros_mayorista' 
  AND column_name = 'aumento';
-- Debe retornar 0 filas
```

### 3. Verificar Funciones

```sql
-- Probar función de cálculo de saldo minorista
SELECT calcular_saldo_disponible_minorista(
  'id_minorista_aqui'::UUID,
  'id_producto_aqui'::UUID,
  CURRENT_DATE
);

-- Probar función de cálculo de saldo mayorista
SELECT calcular_saldo_disponible_mayorista(
  'id_mayorista_aqui'::UUID,
  'id_producto_aqui'::UUID,
  CURRENT_DATE
);
```

## 🔄 Rollback (Si es Necesario)

Si necesitas revertir la migración:

### 1. Restaurar Campo Aumento

```sql
-- Restaurar campo aumento en preregistros_minorista
ALTER TABLE preregistros_minorista 
ADD COLUMN aumento INTEGER DEFAULT 0 NOT NULL CHECK (aumento >= 0);

-- Restaurar campo aumento en preregistros_mayorista
ALTER TABLE preregistros_mayorista 
ADD COLUMN aumento INTEGER DEFAULT 0 NOT NULL CHECK (aumento >= 0);
```

### 2. Restaurar Datos desde Backup

Si tienes el backup temporal, puedes restaurar los valores:

```sql
-- Ejemplo (ajustar según tu backup)
UPDATE preregistros_minorista pm
SET aumento = b.aumento
FROM backup_aumentos_minoristas b
WHERE pm.id = b.id;
```

### 3. Eliminar Registros Migrados

```sql
-- Eliminar registros migrados de ventas_minoristas
DELETE FROM ventas_minoristas 
WHERE observaciones LIKE 'Migrado desde preregistros_minorista.aumento%';

-- Eliminar registros migrados de ventas_mayoristas
DELETE FROM ventas_mayoristas 
WHERE observaciones LIKE 'Migrado desde preregistros_mayorista.aumento%';
```

### 4. Eliminar Nuevas Tablas (Opcional)

```sql
-- Solo si quieres eliminar completamente las nuevas tablas
DROP TABLE IF EXISTS notificaciones_arqueo CASCADE;
DROP TABLE IF EXISTS arqueos_mayoristas CASCADE;
DROP TABLE IF EXISTS arqueos_minoristas CASCADE;
DROP TABLE IF EXISTS ventas_mayoristas CASCADE;
DROP TABLE IF EXISTS ventas_minoristas CASCADE;
```

## ⚠️ Problemas Comunes y Soluciones

### Error: "La tabla ventas_minoristas no existe"
**Solución:** Ejecutar primero `restructure_minoristas_mayoristas.sql`

### Error: "Violación de constraint"
**Solución:** Verificar que los datos sean válidos (IDs existentes, fechas válidas, etc.)

### Advertencia: "No todos los aumentos se migraron"
**Solución:** 
1. Revisar los logs para identificar qué registros fallaron
2. Verificar que los productos y usuarios existan
3. Ejecutar manualmente la migración de los registros fallidos

### Error al eliminar campo aumento
**Solución:** Verificar que no haya triggers o funciones que dependan del campo

## 📊 Estadísticas Post-Migración

Después de la migración, puedes consultar estadísticas:

```sql
-- Total de aumentos migrados por minorista
SELECT 
  u.nombre as minorista,
  COUNT(*) as total_aumentos,
  SUM(vm.cantidad_aumento) as cantidad_total
FROM ventas_minoristas vm
JOIN usuarios u ON vm.id_minorista = u.id
WHERE vm.observaciones LIKE 'Migrado desde preregistros_minorista.aumento%'
GROUP BY u.nombre
ORDER BY cantidad_total DESC;

-- Total de aumentos migrados por mayorista
SELECT 
  u.nombre as mayorista,
  COUNT(*) as total_aumentos,
  SUM(vm.cantidad_aumento) as cantidad_total
FROM ventas_mayoristas vm
JOIN usuarios u ON vm.id_mayorista = u.id
WHERE vm.observaciones LIKE 'Migrado desde preregistros_mayorista.aumento%'
GROUP BY u.nombre
ORDER BY cantidad_total DESC;
```

## ✅ Checklist Final

- [ ] Backup de base de datos realizado
- [ ] Script `restructure_minoristas_mayoristas.sql` ejecutado exitosamente
- [ ] Script `migrate_aumento_to_ventas.sql` ejecutado exitosamente
- [ ] Reporte de migración verificado (todos los registros migrados)
- [ ] Datos verificados manualmente (algunos ejemplos)
- [ ] Script `remove_aumento_from_preregistros.sql` ejecutado exitosamente
- [ ] Campo `aumento` eliminado verificadamente
- [ ] Funciones de cálculo probadas
- [ ] Sistema funcionando correctamente en desarrollo
- [ ] Desplegado a producción (si aplica)

## 📞 Soporte

Si encuentras problemas durante la migración:
1. Revisar los logs de PostgreSQL/Supabase
2. Verificar que todos los scripts se ejecutaron en orden
3. Consultar el documento `PLAN_MEJORA_MINORISTAS_MAYORISTAS.md` para más detalles

## 📌 Migración: Saldo restante en BD (Nueva Venta)

**Archivo:** `rpc_set_preregistro_cantidad_restante_minorista.sql`

Crea la columna `cantidad_restante` en `preregistros_minorista` y `preregistros_mayorista` (si no existe) y la función RPC `set_preregistro_cantidad_restante_minorista` para que los minoristas actualicen solo ese campo sin violar RLS.

Ejecutar en Supabase SQL Editor cuando quieras persistir el saldo en servidor.

---

## 📌 Migración Adicional: Preregistros Mayorista Reutilizables

**Archivo:** `update_preregistros_mayorista_structure.sql`

Esta migración hace que los preregistros de mayoristas funcionen igual que los de minoristas (reutilizables todos los días).

**Cambios:**
- Elimina la columna `fecha` de `preregistros_mayorista`
- Actualiza el constraint UNIQUE a `(id_mayorista, id_producto)`
- Consolida registros duplicados (mantiene el más reciente por fecha)

**Cuándo ejecutar:** Después de las migraciones principales de minoristas/mayoristas.

```sql
-- Ejecutar en Supabase SQL Editor
\i migrations/update_preregistros_mayorista_structure.sql
```

---

**Última actualización:** Marzo 2026

# Script SQL Maestro - ventasjcell

## 📋 Descripción

El archivo `00_MASTER_SCHEMA.sql` contiene toda la estructura de base de datos necesaria para duplicar el sistema ventasjcell en un nuevo proyecto de Supabase.

Este script incluye:
- ✅ Todas las tablas del sistema
- ✅ Todas las funciones de base de datos
- ✅ Todos los triggers automáticos
- ✅ Todos los índices para optimización
- ✅ Todas las políticas RLS (Row Level Security)
- ✅ Datos iniciales (servicios)

## 🚀 Cómo Usar

### Paso 1: Crear Proyecto en Supabase

1. Ve a [supabase.com](https://supabase.com)
2. Crea un nuevo proyecto
3. Espera a que el proyecto esté completamente inicializado

### Paso 2: Ejecutar el Script SQL

1. Ve al **SQL Editor** en tu proyecto de Supabase
2. Abre el archivo `migrations/00_MASTER_SCHEMA.sql`
3. Copia todo el contenido
4. Pégalo en el SQL Editor
5. Haz clic en **Run** o presiona `Ctrl+Enter` (o `Cmd+Enter` en Mac)

**⚠️ Importante:** El script puede tardar varios minutos en ejecutarse completamente.

### Paso 3: Verificar la Ejecución

Después de ejecutar el script, verifica que:

1. **Todas las tablas se crearon correctamente:**
   - Ve a **Table Editor** en Supabase
   - Deberías ver las siguientes tablas:
     - `usuarios`
     - `categorias`
     - `productos`
     - `clientes`
     - `ventas`
     - `detalle_venta`
     - `pagos_credito`
     - `servicios`
     - `movimientos_servicios`
     - `registros_servicios`
     - `arqueos_caja`
     - `movimientos_inventario`

2. **Las funciones se crearon:**
   - Ve a **Database** → **Functions**
   - Deberías ver funciones como:
     - `update_updated_at_column()`
     - `calcular_subtotal()`
     - `calcular_interes_mensual()`
     - `calcular_monto_aumentado()`
     - etc.

3. **Los triggers están activos:**
   - Ve a **Database** → **Triggers**
   - Deberías ver varios triggers configurados

### Paso 4: Crear Usuario Administrador

1. **Crear usuario en Supabase Auth:**
   - Ve a **Authentication** → **Users** → **Add User**
   - Completa:
     - Email: `admin@tudominio.com` (o el que prefieras)
     - Password: (elige una contraseña segura)
     - Auto Confirm User: ✅ (marca esta opción)
   - Haz clic en **Create User**
   - **Anota el ID del usuario** (lo necesitarás en el siguiente paso)

2. **Insertar usuario en la tabla usuarios:**
   - Ve al **SQL Editor**
   - Ejecuta el siguiente SQL (reemplaza `ID-DEL-USUARIO-AUTH` con el ID del paso anterior):

```sql
INSERT INTO usuarios (id, nombre, usuario, email, rol, estado)
VALUES (
  'ID-DEL-USUARIO-AUTH', -- Reemplazar con el ID del usuario de Auth
  'Administrador',
  'admin',
  'admin@tudominio.com', -- Reemplazar con el email que usaste
  'admin',
  'activo'
);
```

### Paso 5: Configurar Storage

1. Ve a **Storage** en Supabase
2. Haz clic en **New Bucket**
3. Configura:
   - **Name:** `productos`
   - **Public bucket:** ✅ (marca esta opción)
   - **File size limit:** (opcional, ej: 5MB)
   - **Allowed MIME types:** (opcional, ej: `image/*`)
4. Haz clic en **Create Bucket**

5. **Configurar políticas de acceso:**
   - Ve a **Storage** → **Policies** → **productos**
   - Crea las siguientes políticas:

**Política 1: Lectura pública**
```sql
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING (bucket_id = 'productos');
```

**Política 2: Escritura para autenticados**
```sql
CREATE POLICY "Authenticated users can upload"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'productos' 
  AND auth.role() = 'authenticated'
);
```

**Política 3: Actualización para autenticados**
```sql
CREATE POLICY "Authenticated users can update"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'productos' 
  AND auth.role() = 'authenticated'
);
```

**Política 4: Eliminación para autenticados**
```sql
CREATE POLICY "Authenticated users can delete"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'productos' 
  AND auth.role() = 'authenticated'
);
```

### Paso 6: Desplegar Edge Functions

Las Edge Functions necesarias son:
- `get-user-email`
- `update-user-email`
- `create-user`

Sigue las instrucciones en `INSTALACION_EDGE_FUNCTIONS.md` o `DEPLOY_FUNCTIONS.md`.

### Paso 7: Configurar Variables de Entorno

En tu aplicación, crea un archivo `.env.local` con:

```env
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu_anon_key_aqui
```

Para obtener estas credenciales:
1. Ve a **Settings** → **API** en Supabase
2. Copia:
   - **Project URL** → `VITE_SUPABASE_URL`
   - **anon public** key → `VITE_SUPABASE_ANON_KEY`

### Paso 8: Probar el Sistema

1. Inicia tu aplicación localmente:
   ```bash
   npm run dev
   ```

2. Accede a `http://localhost:8080`

3. Inicia sesión con:
   - Usuario: `admin` (o el que configuraste)
   - Password: (la que configuraste en Supabase Auth)

4. Verifica que puedas:
   - Ver el Dashboard
   - Crear productos
   - Crear categorías
   - Realizar ventas

## 🔍 Solución de Problemas

### Error: "relation already exists"
Si obtienes este error, significa que algunas tablas ya existen. Tienes dos opciones:

1. **Eliminar y recrear (solo en desarrollo):**
   - Ejecuta `DROP TABLE IF EXISTS nombre_tabla CASCADE;` para cada tabla
   - Luego ejecuta el script maestro nuevamente

2. **Usar las migraciones individuales:**
   - En lugar del script maestro, ejecuta las migraciones individuales en orden
   - Esto te permitirá tener más control

### Error: "function already exists"
Similar al anterior, puedes eliminar la función antes de recrearla:

```sql
DROP FUNCTION IF EXISTS nombre_funcion(parámetros) CASCADE;
```

### Error: "policy already exists"
Elimina la política antes de recrearla:

```sql
DROP POLICY IF EXISTS "nombre_politica" ON nombre_tabla;
```

### No puedo iniciar sesión
Verifica que:
1. El usuario existe en `auth.users` de Supabase
2. El usuario existe en la tabla `usuarios` con el mismo ID
3. El campo `usuario` en la tabla `usuarios` coincide con el username que intentas usar
4. El estado del usuario es `'activo'`

## 📝 Notas Importantes

1. **Orden de ejecución:** El script está diseñado para ejecutarse en el orden correcto. No ejecutes secciones individuales a menos que sepas lo que estás haciendo.

2. **Datos de prueba:** El script solo inserta los servicios iniciales. Deberás crear productos, categorías, etc. manualmente o a través de la aplicación.

3. **Backup:** Antes de ejecutar el script en producción, asegúrate de hacer un backup de tu base de datos.

4. **Zona horaria:** El sistema usa `timezone('utc'::text, now())` para todas las fechas. Asegúrate de que tu aplicación maneje correctamente las conversiones de zona horaria.

5. **RLS:** Todas las tablas tienen RLS habilitado. Asegúrate de que las políticas se ajusten a tus necesidades específicas.

## 🎯 Próximos Pasos

Después de ejecutar el script maestro:

1. ✅ Crear usuario administrador
2. ✅ Configurar Storage
3. ✅ Desplegar Edge Functions
4. ✅ Configurar variables de entorno
5. ✅ Probar el sistema
6. ✅ Personalizar branding (opcional)
7. ✅ Desplegar en producción (Vercel, etc.)

## 📚 Referencias

- [Documentación de Supabase](https://supabase.com/docs)
- [Guía de RLS en Supabase](https://supabase.com/docs/guides/auth/row-level-security)
- [README principal del proyecto](../README.md)
- [PRD del proyecto](../documentos/prd.md)


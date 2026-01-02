# Integración Supabase - VentaPlus

## Estado de la Integración

La integración de Supabase con VentaPlus ha sido completada en su mayoría. Aquí está el resumen:

### ✅ Completado

1. **Configuración Inicial**
   - Dependencias instaladas (`@supabase/supabase-js`, `@supabase/ssr`)
   - Cliente de Supabase configurado en `src/lib/supabase.ts`
   - Variables de entorno configuradas (necesitas crear `.env.local`)

2. **Base de Datos**
   - Todas las tablas creadas en Supabase
   - Políticas RLS (Row Level Security) configuradas
   - Funciones y triggers implementados
   - Índices creados para optimización

3. **Servicios**
   - `products.service.ts` - CRUD de productos
   - `sales.service.ts` - CRUD de ventas
   - `clients.service.ts` - CRUD de clientes
   - `categories.service.ts` - CRUD de categorías
   - `storage.service.ts` - Gestión de imágenes

4. **Hooks Personalizados**
   - `useProducts.ts` - Hooks para productos con React Query
   - `useSales.ts` - Hooks para ventas
   - `useClients.ts` - Hooks para clientes
   - `useCategories.ts` - Hooks para categorías

5. **Componentes Actualizados**
   - `Dashboard.tsx` - Usa datos reales de Supabase
   - `NewSale.tsx` - Crea ventas reales en Supabase
   - `AuthContext.tsx` - Integrado con Supabase Auth

6. **Storage**
   - Bucket `productos` configurado
   - Políticas de acceso configuradas

### ⚠️ Pendiente / Mejoras Necesarias

1. **Autenticación**
   - El sistema actual requiere que los usuarios estén creados en `auth.users` de Supabase
   - Necesitas crear usuarios en Supabase Auth con emails basados en el username
   - O modificar el sistema para usar email directamente como identificador

2. **Variables de Entorno**
   - Crea un archivo `.env.local` en la raíz del proyecto con:
     ```
     VITE_SUPABASE_URL=tu_url_de_supabase
     VITE_SUPABASE_ANON_KEY=tu_anon_key_de_supabase
     ```
   - **Importante**: Obtén estas credenciales desde tu proyecto de Supabase:
     - Ve a Settings → API en el dashboard de Supabase
     - Copia la "Project URL" para `VITE_SUPABASE_URL`
     - Copia la "anon public" key para `VITE_SUPABASE_ANON_KEY`

3. **Migración de Datos Mock**
   - Los productos mock aún están en `src/types/index.ts`
   - Necesitas migrar estos datos a Supabase manualmente o crear un script

4. **Realtime** (Opcional)
   - Suscripciones en tiempo real para el dashboard
   - Actualizaciones automáticas de stock

5. **Funciones de Base de Datos**
   - La función `increment_stock` mencionada en `sales.service.ts` necesita ser creada
   - Función para revertir stock al anular venta

## Próximos Pasos

1. **Crear usuarios en Supabase Auth:**
   ```sql
   -- Ejemplo: Crear usuario admin
   -- Esto se hace desde el dashboard de Supabase o usando la API
   ```

2. **Migrar datos iniciales:**
   - Usa el SQL Editor de Supabase para insertar productos, categorías, etc.
   - O crea un script de migración

3. **Probar la aplicación:**
   - Inicia sesión con un usuario creado en Supabase
   - Verifica que las ventas se creen correctamente
   - Verifica que el stock se actualice

## Estructura de Tablas

- `usuarios` - Usuarios del sistema (extiende auth.users)
- `categorias` - Categorías de productos
- `productos` - Productos
- `clientes` - Clientes
- `ventas` - Ventas
- `detalle_venta` - Detalles de cada venta
- `arqueos_caja` - Arqueos de caja
- `movimientos_inventario` - Historial de movimientos de inventario

## Políticas RLS

- **Vendedores Tienda**: Solo pueden ver sus propias ventas
- **Admins**: Acceso completo a todas las tablas
- **Productos**: Lectura pública, escritura solo para admins
- **Clientes**: Lectura/escritura para todos los autenticados

## Notas Importantes

- El sistema usa UUIDs para todos los IDs
- Las fechas se manejan como DATE y TIME separados
- El stock se actualiza automáticamente al crear una venta (trigger)
- Los movimientos de inventario se registran automáticamente



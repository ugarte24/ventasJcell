# J-Cell - Sistema de Punto de Venta

Sistema de gestión de ventas e inventario diseñado para reemplazar el registro manual en cuadernos, proporcionando control digital de inventarios, clientes y ventas con reportes en tiempo real.

## 🚀 Características

- **Punto de Venta (POS)**: Registro rápido de ventas con múltiples métodos de pago
- **Ventas a Crédito**: Sistema completo de ventas a crédito con gestión de pagos por cuotas
- **Gestión de Servicios**: Control de servicios (Recarga, Agente BCP, etc.) con registro de saldos y transacciones
- **Gestión de Productos**: Control de inventario con alertas de stock bajo
- **Dashboard Administrativo**: Estadísticas y métricas en tiempo real
- **Gestión de Usuarios**: Sistema de roles (Administrador/Vendedor Tienda) con permisos diferenciados
- **Historial de Ventas**: Registro completo de todas las transacciones
- **Reportes Profesionales**: Análisis de ventas y productos más vendidos con exportación a PDF/Excel con diseño profesional
- **Impresión de Tickets**: Sistema completo de impresión de tickets y comprobantes de pago
- **Paginación**: Navegación eficiente en todas las tablas del sistema
- **Minorista en Nueva venta**: Panel titulado **Ventas del día (Minorista)** cuando el calendario está en la fecha de hoy, y **Consulta (Minorista)** en días anteriores. En consulta histórica solo se muestra detalle si hubo ventas finalizadas ese día (datos desde `ventas_minoristas`). Crear nueva venta, escanear QR y editar saldos solo están habilitados en la fecha actual. El resumen (escritorio y móvil) lista importes según ventas registradas en BD para la fecha elegida.

## 🛠️ Stack Tecnológico

- **Frontend Framework**: React 18.3.1 con TypeScript
- **Build Tool**: Vite 5.4.19
- **Routing**: React Router DOM 6.30.1
- **State Management**: React Context API + TanStack React Query
- **Backend**: Supabase (PostgreSQL + Auth + Storage)
- **UI Components**: shadcn/ui (Radix UI)
- **Styling**: Tailwind CSS 3.4.17
- **Forms**: React Hook Form + Zod
- **Icons**: Lucide React
- **Charts**: Recharts
- **Date Handling**: date-fns

## 📋 Requisitos Previos

- Node.js 18+ (recomendado usar [nvm](https://github.com/nvm-sh/nvm))
- npm, yarn, pnpm o bun

## 🏃 Inicio Rápido

### Instalación

```bash
# Clonar el repositorio
git clone <repository-url>
cd ventacontrol-pro

# Instalar dependencias
npm install
# o
yarn install
# o
bun install
```

### Desarrollo

```bash
# Iniciar servidor de desarrollo
npm run dev

# La aplicación estará disponible en http://localhost:8080
```

### Build para Producción

```bash
# Build de producción
npm run build

# Build de desarrollo
npm run build:dev

# Preview del build
npm run preview
```

### Linting

```bash
npm run lint
```

## 🔧 Configuración

### Base de Datos

Para configurar la base de datos en un nuevo proyecto de Supabase:

1. **Ejecutar el Script SQL Maestro:**
   - Ve al SQL Editor de Supabase
   - Ejecuta el archivo `migrations/00_MASTER_SCHEMA.sql`
   - Este script crea todas las tablas, funciones, triggers y políticas RLS
   - Ver instrucciones detalladas en `migrations/README_MASTER_SCHEMA.md`

2. **Crear Usuario Administrador:**
   - Crea un usuario en Supabase Auth
   - Insértalo en la tabla `usuarios` con rol `'admin'`

3. **Configurar Storage:**
   - Crea un bucket llamado `productos` en Supabase Storage
   - Configura las políticas de acceso necesarias

### Variables de Entorno

Crea un archivo `.env.local` en la raíz del proyecto con las siguientes variables:

```env
VITE_SUPABASE_URL=tu_url_de_supabase
VITE_SUPABASE_ANON_KEY=tu_anon_key_de_supabase
```

Estas variables son necesarias para la conexión con Supabase.

**⚠️ Importante de Seguridad:**
- **NUNCA** subas el archivo `.env.local` al repositorio
- El archivo `.gitignore` ya está configurado para ignorar archivos `.env*`
- Obtén tus credenciales desde el dashboard de Supabase (Settings → API)
- Si el repositorio es público, asegúrate de que no haya credenciales hardcodeadas en el código

### Path Aliases

El proyecto utiliza path aliases configurados en `tsconfig.json`:
- `@/` → `./src/`

## 👤 Usuarios de Prueba

El sistema utiliza autenticación real con Supabase. Los usuarios deben estar creados en Supabase Auth. El sistema busca usuarios por username y requiere que existan en la tabla `usuarios` de la base de datos.

## 📁 Estructura del Proyecto

```
ventacontrol-pro/
├── src/
│   ├── components/        # Componentes reutilizables
│   │   ├── layout/        # Layouts (DashboardLayout, AppSidebar)
│   │   └── ui/            # Componentes shadcn/ui
│   ├── contexts/          # Context API (AuthContext, CartContext)
│   ├── hooks/             # Custom React hooks (useProducts, useSales, etc.)
│   ├── lib/               # Utilidades y helpers (supabase client)
│   ├── pages/             # Páginas principales
│   │   ├── Dashboard.tsx
│   │   ├── Login.tsx
│   │   ├── NewSale.tsx
│   │   ├── SalesHistory.tsx
│   │   ├── Products.tsx
│   │   ├── Categories.tsx
│   │   ├── Reports.tsx
│   │   └── Users.tsx
│   ├── services/         # Servicios de Supabase
│   │   ├── products.service.ts
│   │   ├── sales.service.ts
│   │   ├── categories.service.ts
│   │   ├── users.service.ts
│   │   └── clients.service.ts
│   └── types/             # Definiciones TypeScript
├── supabase/
│   ├── functions/         # Edge Functions
│   │   ├── get-user-email/
│   │   └── update-user-email/
│   └── config.toml        # Configuración de Supabase CLI
├── scripts/               # Scripts de despliegue
│   ├── deploy-functions.ps1
│   ├── deploy-functions.sh
│   └── deploy-with-npx.ps1
├── migrations/            # Migraciones de base de datos
├── public/                # Archivos estáticos
├── documentos/            # Documentación del proyecto
├── package.json
├── vite.config.ts
├── tailwind.config.ts
└── tsconfig.json
```

## 🗺️ Rutas de la Aplicación

- `/login` - Página de autenticación
- `/dashboard` - Panel principal con estadísticas en tiempo real
- `/ventas/nueva` - Registro de nueva venta (POS); minoristas y mayoristas operan sobre su preregistro asignado
- `/ventas` - Historial de ventas con filtros
- `/creditos` - Gestión de ventas a crédito y pagos
- `/servicios` - Gestión de servicios (CRUD completo, solo admin)
- `/servicios/registro` - Registro diario de servicios (saldo inicial/final)
- `/servicios/historial` - Historial de movimientos y registros de servicios
- `/productos` - Gestión de productos (CRUD completo)
- `/categorias` - Gestión de categorías (CRUD completo, solo admin)
- `/reportes` - Reportes y análisis con gráficos
- `/usuarios` - Gestión de usuarios (solo admin)
- `/arqueos/minorista` - **Ventas del día** (minorista): consulta por fecha con calendario de movimientos registrados
- `/arqueos/mayorista` - Arqueos flexibles de mayoristas
- `/preregistros/minorista` - Preregistros de minoristas
- `/preregistros/mayorista` - Preregistros de mayoristas
- `/pedidos` - Mis pedidos (minoristas/mayoristas)
- `/escanear-qr` - Escanear QR para transferencias (minoristas)
- `/perfil` - Mi perfil (cambiar contraseña)

## 🔐 Roles y Permisos

### Administrador
- Acceso completo al sistema
- Gestión de usuarios, productos y categorías
- Ver todas las ventas
- Generar reportes y exportar a PDF/Excel
- Control de inventario
- Gestionar ventas a crédito
- Eximir intereses de ventas a crédito

### Vendedor Tienda
- Registrar ventas (efectivo, QR, transferencia, crédito)
- Registrar ventas a crédito con cliente
- Ver historial de sus ventas
- Ver stock disponible
- Registrar clientes
- Registrar pagos de crédito
- Registrar servicios diarios (saldo inicial/final)
- Editar manualmente el monto aumentado en el registro diario
- Aumentar saldo de servicios
- Ver historial de servicios
- Cambiar su propia contraseña
- **No puede**: gestionar productos, usuarios, crear/editar/eliminar servicios, ver reportes generales o eximir intereses

## 📊 Estado Actual del Proyecto

### ✅ Implementado (v2.0)

**Backend y Persistencia:**
- ✅ Integración completa con Supabase (PostgreSQL)
- ✅ Autenticación real con Supabase Auth
- ✅ Persistencia de datos en tiempo real
- ✅ Row Level Security (RLS) configurado
- ✅ Funciones y triggers en base de datos
- ✅ **Corrección de zona horaria**: Todos los campos de fecha se guardan correctamente usando la hora local del cliente, sin desfase por zona horaria

**Funcionalidades Core:**
- ✅ Sistema de autenticación con roles (Supabase Auth)
- ✅ CRUD completo de productos
- ✅ CRUD completo de categorías
- ✅ CRUD completo de usuarios
- ✅ CRUD completo de clientes
- ✅ Registro de ventas con validación de stock
- ✅ Historial de ventas con filtros avanzados
- ✅ Dashboard con estadísticas en tiempo real
- ✅ Reportes con gráficos interactivos (Recharts)
- ✅ Exportación de reportes a PDF y Excel
- ✅ Control de inventario con alertas de stock bajo
- ✅ Anulación de ventas (solo admin)
- ✅ Gestión de carrito de compras
- ✅ Múltiples métodos de pago (efectivo, QR, transferencia, crédito)
- ✅ **Sistema de ventas a crédito:**
  - ✅ Registro de ventas a crédito con cliente
  - ✅ Configuración de cuotas e interés mensual
  - ✅ Cuota inicial opcional
  - ✅ Cálculo automático de interés
  - ✅ Registro de pagos por cuota
  - ✅ Historial de pagos completo
  - ✅ Gestión de estado de crédito
  - ✅ Eximir intereses (solo admin)
- ✅ Gestión de movimientos de inventario
- ✅ Arqueo de caja (apertura y cierre)
- ✅ **Sistema de gestión de servicios:**
  - ✅ CRUD completo de servicios (solo admin)
  - ✅ Aumento de saldo de servicios con historial
  - ✅ Registro diario de saldo inicial y final
  - ✅ Cálculo automático de monto transaccionado y aumentado
  - ✅ Edición manual del monto aumentado en el registro diario
  - ✅ Historial completo de movimientos y registros
  - ✅ Visualización de servicios en Dashboard
  - ✅ Búsqueda de servicios en la lista principal
  - ✅ Interfaz simplificada: saldo actual no visible en lista (solo en registro diario)
- ✅ **Optimizaciones móviles:**
  - ✅ Corrección de layout para pantallas pequeñas (eliminación de pantalla en blanco)
  - ✅ Mejoras de compatibilidad con Android (área táctil aumentada, eventos touch)
  - ✅ Corrección de apertura del menú lateral en móvil
  - ✅ Viewport optimizado para diferentes tamaños de pantalla
  - ✅ Favicon personalizado con logo V+ del sistema
  - ✅ Apple Touch Icon y Web Manifest para PWA
  - ✅ Theme color para personalización en móviles
- ✅ **Mejoras de interfaz:**
  - ✅ Versión del sistema visible en el sidebar
  - ✅ Constantes centralizadas para fácil mantenimiento
  - ✅ Renombrado `monto_transaccionado` a `total` en registros de servicios
  - ✅ Mejoras en el guardado automático de `monto_aumentado`
  - ✅ Eliminación de la opción de eliminar servicios
  - ✅ Corrección del guardado del estado en editar servicio
  - ✅ Mejoras en la UI del diálogo "Aumentar Saldo"
  - ✅ Orden descendente en el historial de servicios
  - ✅ Inclusión de servicios en el arqueo de caja
  - ✅ Reorganización del menú: Servicios debajo de Inventario
  - ✅ Corrección del cálculo de saldo anterior en movimientos (encadenamiento correcto)
  - ✅ Orden descendente en movimientos de saldo (más recientes primero)
  - ✅ Actualización automática de saldos posteriores al editar un movimiento
  - ✅ Cierre automático del diálogo "Aumentar Saldo" al editar un movimiento
  - ✅ Preservación de posición de scroll y estado de secciones en el sidebar
  - ✅ Corrección de mensajes duplicados en la edición de movimientos
- ✅ **Paginación en listados grandes:**
  - ✅ Paginación implementada en todas las tablas del sistema (20 elementos por página)
  - ✅ Controles de navegación con números de página y elipsis
  - ✅ Reseteo automático cuando cambian los datos o filtros
  - ✅ Implementado en: Historial de Ventas, Ventas a Crédito, Productos, Clientes, Usuarios, Categorías, Servicios, Registro de Servicios, Historial de Servicios, Movimientos de Inventario, Historial de Arqueos
- ✅ **Impresión de tickets:**
  - ✅ Impresión de tickets para ventas normales y a crédito
  - ✅ Impresión de comprobantes de pago para cuotas de crédito
  - ✅ Botón de impresión directo en cada fila del historial de ventas
  - ✅ Formato optimizado para impresoras térmicas (80mm)
  - ✅ Diseño diferenciado para ventas a crédito y pagos
- ✅ **Diseño de reportes profesional:**
  - ✅ Encabezado con logo y nombre del sistema
  - ✅ Información de usuario y fecha del reporte
  - ✅ Título centrado con formato profesional
  - ✅ Tabla centrada con encabezados en color teal oscuro
  - ✅ Formato consistente en todos los reportes exportados (PDF)
- ✅ **Reportes específicos de ventas a crédito:**
  - ✅ Pestañas para separar reportes generales de reportes de crédito
  - ✅ Estadísticas específicas: Total ventas, Pendiente por cobrar, Total cobrado, Créditos activos, Pagados, Parciales, Pendientes
  - ✅ Gráficos de distribución por estado (pendiente, parcial, pagado, vencido)
  - ✅ Gráfico de tendencia de cobros por día
  - ✅ Top 5 clientes con más créditos
  - ✅ Exportación a PDF/Excel con información detallada de cada crédito (cliente, productos, intereses, pagos, saldo pendiente)
  - ✅ Diseño optimizado de columnas para que todas quepan en el ancho de página
- ✅ **Mejoras en v2.10.0:**
  - ✅ Corrección del cálculo de saldo anterior en movimientos de servicios (encadenamiento correcto)
  - ✅ Orden descendente en movimientos de saldo (más recientes primero)
  - ✅ Actualización automática de saldos posteriores al editar un movimiento
  - ✅ Cierre automático del diálogo "Aumentar Saldo" al editar un movimiento
  - ✅ Preservación de posición de scroll y estado de secciones en el sidebar
  - ✅ Corrección de mensajes duplicados en la edición de movimientos

- ✅ **Mejoras en v2.19.1:**
  - ✅ **Corrección de bug en escaneo de QR**:
    - Corregido problema de pantalla negra al abrir la cámara
    - Mejorado el manejo de inicialización del stream de video
    - Agregado delay adecuado para asegurar que el diálogo esté montado
    - Mejorado el evento onLoadedMetadata para reproducir video automáticamente
    - Mejor feedback visual durante la carga de la cámara

- ✅ **Mejoras en v2.19.0:**
  - ✅ **Escaneo de QR mejorado para minoristas**:
    - Opción para tomar foto con la cámara del dispositivo
    - Opción para seleccionar imagen desde la galería
    - Detección automática del código QR desde imágenes
    - Vista previa de imagen antes de procesar
    - Diálogo de cámara con vista previa en tiempo real
    - Procesamiento automático: el código QR se extrae y valida automáticamente
    - Instalación de librería jsQR para detección de códigos QR en imágenes

- ✅ **Mejoras en v2.18.0:**
  - ✅ **Historial de Ventas para minoristas y mayoristas**:
    - Agregado "Historial de Ventas" al menú lateral para roles minorista y mayorista
    - Acceso completo al historial de ventas con filtrado automático (solo ven sus propias ventas)
    - Filtros por rango de fechas (día, semana, mes, personalizado)
    - Exportación de reportes a PDF y Excel
    - Ver detalles completos de cada venta
  - ✅ **Dashboard mejorado para minoristas y mayoristas**:
    - Métricas de ventas agregadas: Ventas del Día, Número de Ventas
    - Sección "Últimas Ventas" muestra las 5 ventas más recientes
    - Acciones rápidas actualizadas: "Nueva Venta", "Historial de Ventas" y "Mis Pedidos"
    - Métricas combinadas: pedidos y ventas en un solo dashboard

- ✅ **Mejoras en v2.17.0:**
  - ✅ **Panel de Control para minoristas y mayoristas**: 
    - Agregado "Panel de Control" al menú lateral para roles minorista y mayorista
    - Icono de resumen (ClipboardList) en lugar del icono de casa para estos roles
    - Dashboard adaptado con métricas específicas: Total Pedidos, Pedidos Pendientes, Pedidos Enviados, Preregistros Activos
    - Sección de "Últimos Pedidos" en lugar de "Últimas Ventas" para minoristas y mayoristas
    - Acciones rápidas actualizadas: "Nueva Venta" y "Mis Pedidos" para estos roles
    - Secciones no relevantes ocultas (Servicios, Alertas de Stock) para minoristas y mayoristas
  - ✅ **Mejoras en interfaz de ventas para minoristas y mayoristas**:
    - Icono de resumen (ClipboardList) en botón flotante y títulos de carrito/resumen
    - Título "Resumen" en lugar de "Carrito" en el Sheet móvil
    - Mensajes adaptados: "No hay productos en tu resumen" y "Selecciona productos de tu preregistro para agregarlos"
    - Icono de lista (ClipboardList) más grande cuando el resumen está vacío

- ✅ **Mejoras en v2.16.0:**
  - ✅ Corrección del scroll táctil en formularios de preregistros (minorista y mayorista)
  - ✅ Mejoras en la interacción con dropdowns dentro de diálogos
  - **Cambio de roles**: Actualización de roles de usuario - "Vendedor" ahora se muestra como "Vendedor Tienda" en la interfaz, mientras que el valor interno en la base de datos se mantiene como 'vendedor'
  - **Nuevos roles**: Agregados roles 'minorista' y 'mayorista' para gestionar diferentes tipos de clientes
  - **Campos de precio en productos**: 
    - Renombrado "Precio de Venta" a "Precio por Unidad" en toda la aplicación
    - Agregado campo opcional "Precio por Mayor" para productos con precios diferenciados
    - Migración de base de datos: columna `precio_venta` renombrada a `precio_por_unidad`
  - **Compresión de imágenes mejorada**: Límite de compresión reducido de 5MB a 1MB para optimizar mejor el almacenamiento
  - **Eliminación de funcionalidades**: 
    - Eliminado botón "Eliminar" de las acciones en la lista de categorías
    - Eliminado botón "Eliminar" de las acciones en la lista de productos
  - **Validación de categorías**: Implementada validación para prevenir creación o actualización de categorías con nombres duplicados (case-insensitive)
  - **Sistema de preregistros**: 
    - Implementado sistema de preregistros para roles 'minorista' y 'mayorista'
    - Los preregistros muestran una tabla con productos, cantidades, aumentos y cantidad restante
    - Cálculo de subtotales usando fórmula: `(cantidad + aumento - cantidadRestante) * precio`
    - Para mayoristas: usa `precio_por_mayor` si existe, si no usa 0 (no usa `precio_por_unidad` como fallback)
    - Para minoristas: usa `precio_por_unidad`
  - **Edge Function create-user**: 
    - Corrección de la función para seguir el mismo patrón que `update-user-email` y `get-user-email`
    - Simplificación del código y uso de `.single()` en lugar de `.maybeSingle()` para verificación de roles
    - Soporte completo para creación de usuarios con roles 'minorista' y 'mayorista'

- ✅ **Mejoras en v2.15.0:**
  - **Rebranding completo**: Cambio de nombre de "VentaPlus" a "J-Cell" en toda la aplicación
  - **Nuevo logo**: Icono simplificado mostrando solo la letra "J" con contorno azul (#2563EB) sobre fondo negro
  - **Prevención de traducción automática**: Implementación completa de medidas para evitar que el navegador traduzca automáticamente la página:
    - Meta tags `notranslate` y `google-translate-customization` en HTML
    - Atributos `translate="no"` y `class="notranslate"` en elementos críticos (html, body, root)
    - Scripts inline para prevenir traducción al cargar la página
    - Estilos CSS con `!important` para proteger el DOM
    - Configuración en `main.tsx` para asegurar atributos en el root de React
  - **Corrección de error DOM**: Solucionado error "insertBefore" que ocurría durante la navegación después del login cuando el navegador traducía automáticamente la página
  - **Mejoras en navegación**: Implementado `useTransition` y delay para navegación más estable después del login
  - **Optimización de Toasters**: Agregados keys únicos para evitar conflictos de renderizado
  - **Configuración de idioma**: HTML configurado con `lang="es"` y múltiples medidas para prevenir traducción automática
  - **Captura de imágenes desde cámara**: Los formularios de crear y editar productos ahora permiten capturar imágenes directamente desde la cámara del dispositivo
  - **Compresión automática de imágenes**: Sistema inteligente de compresión que reduce automáticamente el tamaño de imágenes mayores a 5MB:
    - Redimensiona imágenes a máximo 1600x1600px manteniendo proporción
    - Calidad JPEG inicial: 80% (balance óptimo)
    - Calidad mínima: 60% (mínimo recomendado para mantener calidad visual)
    - Reducción gradual de calidad y dimensiones si es necesario
    - Proceso automático y transparente para el usuario
  - **Corrección de políticas RLS para Storage**: Políticas de Row-Level Security corregidas para permitir subida de imágenes a usuarios autenticados
  - **Corrección de función RPC**: Función `get_user_email_by_username` corregida para permitir login por nombre de usuario

- ✅ **Mejoras en v2.14.0:**
  - Corrección del selector de clientes en móvil/tablet: Se aumentó el z-index del Popover para que aparezca correctamente sobre el Sheet del carrito cuando se selecciona el método de pago "Crédito"
  - Limpieza automática del carrito en ventas a crédito: Al completar una venta a crédito, el sistema ahora limpia automáticamente el carrito y resetea todos los campos relacionados con crédito (cliente, cuotas, interés, cuota inicial) para preparar el formulario para la próxima venta
  - Mejoras de seguridad: Se eliminaron todas las credenciales hardcodeadas de la documentación y se mejoró el `.gitignore` para proteger archivos sensibles (variables de entorno, secrets, credenciales)

- ✅ **Mejoras en v2.13.0:**
  - Mejora en Dashboard - Últimas Ventas: Se simplificó la visualización de las últimas ventas para mostrar solo el nombre del producto, fecha y hora, con indicador "+X más" cuando hay múltiples productos, eliminando la cantidad total de productos para una vista más limpia y consistente con el historial de ventas

- ✅ **Mejoras en v2.12.0:**
  - Carrito móvil mejorado: El carrito ahora usa Sheet (modal deslizable desde abajo) en tablet además de móvil
  - Ajuste de z-index: El Sheet del carrito ahora aparece correctamente por encima del header
  - Optimización de notificaciones: Los mensajes toast ahora aparecen en la parte inferior izquierda con tamaño reducido para no tapar el botón flotante del carrito

- ✅ **Mejoras en v2.11.0:**
  - ✅ Diálogo de confirmación para cerrar sesión: Se agregó un AlertDialog que solicita confirmación antes de cerrar sesión, mejorando la experiencia de usuario y evitando cierres accidentales

**UI/UX:**
- ✅ Diseño responsive (móvil, tablet, desktop)
- ✅ Interfaz moderna con shadcn/ui
- ✅ Validación de formularios (React Hook Form + Zod)
- ✅ Manejo de errores robusto
- ✅ Feedback visual inmediato
- ✅ Animaciones sutiles
- ✅ Preservación de estado del sidebar (scroll y secciones abiertas/cerradas)
- ✅ Mejoras en la experiencia de edición de movimientos de servicios

### 🔜 Pendiente (v3.0)
- 🔜 Testing (unitario, integración, E2E)
- 🔜 Notificaciones push
- 🔜 Historial completo de movimientos de inventario con interfaz mejorada
- 🔜 Sincronización offline
- 🔜 Notificaciones de vencimiento de créditos

## 🎨 Diseño

El sistema utiliza un diseño moderno tipo dashboard administrativo con:
- Sidebar lateral colapsable
- Tarjetas informativas (stat cards)
- Gráficas y visualizaciones interactivas
- Interfaz limpia y corporativa
- Tema profesional
- **Diseño responsive completo** - Optimizado para móviles, tablets y desktop
- Tablas con diseño consistente y espaciado uniforme
- Componentes adaptativos según tamaño de pantalla
- **Optimizaciones móviles avanzadas:**
  - Layout corregido para pantallas pequeñas (sin pantalla en blanco)
  - Área táctil aumentada para Android (44px mínimo)
  - Eventos touch mejorados para mejor respuesta
  - Viewport optimizado con soporte para `-webkit-fill-available`
  - Favicon personalizado con logo V+ del sistema
  - Soporte PWA con Web Manifest y Apple Touch Icon
  - Versión del sistema visible en el sidebar para referencia rápida

## 📝 Scripts Disponibles

- `npm run dev` - Inicia servidor de desarrollo
- `npm run build` - Build de producción
- `npm run build:dev` - Build de desarrollo
- `npm run preview` - Preview del build
- `npm run lint` - Ejecuta ESLint

## 🤝 Contribución

Este es un proyecto privado. Para contribuir:

1. Crear una rama desde `main`
2. Realizar los cambios
3. Crear un Pull Request
4. Esperar revisión y aprobación

## 📄 Licencia

Proyecto privado - Todos los derechos reservados

## 📞 Soporte

Para soporte o consultas sobre el proyecto, contactar al equipo de desarrollo.

---

## 🔧 Notas Técnicas

### Gestión de Fechas y Zona Horaria

El sistema implementa un manejo robusto de fechas para evitar problemas de zona horaria:

- **Campos de fecha (DATE)**: Se calculan manualmente desde la hora local del cliente usando `getFullYear()`, `getMonth()`, `getDate()`
- **Campos de timestamp (TIMESTAMP)**: Se envían explícitamente usando `getLocalDateTimeISO()` que preserva la fecha local
- **Sin valores por defecto**: Se eliminaron todos los `now()` y `CURRENT_DATE` de la base de datos
- **Triggers corregidos**: Los triggers usan la fecha de la venta para construir timestamps correctos
- **Resultado**: No hay desfase de un día por zona horaria en ninguna tabla

**Tablas afectadas:**
- `ventas`: `fecha`, `created_at`, `updated_at`
- `detalle_venta`: `created_at`
- `movimientos_inventario`: `fecha`, `created_at`
- `productos`: `fecha_creacion`, `created_at`, `updated_at`
- `usuarios`: `fecha_creacion`, `updated_at`
- `clientes`: `fecha_registro`, `created_at`, `updated_at`
- `categorias`: `created_at`, `updated_at`
- `arqueos_caja`: `fecha`, `created_at`, `updated_at`

---

- ✅ **Mejoras en v2.20.0:**
  - ✅ **Optimización de tabla de preregistros para móvil y tablet:**
    - Tabla responsive que se adapta completamente a pantallas móviles sin necesidad de scroll horizontal
    - Padding responsive: más compacto en móvil (p-1.5), tablet (p-2) y desktop (p-4)
    - Tamaños de fuente adaptativos: text-[10px] en móvil, text-xs en tablet, text-sm en desktop
    - Headers abreviados en móvil para ahorrar espacio: "Nombre" → "Nom.", "Cantidad Inicial" → "Cant.", etc.
    - Controles más compactos: botones e inputs más pequeños en móvil (h-7 w-7 vs h-8 w-8)
    - Texto truncado para nombres largos de productos en móvil
    - Scroll horizontal mejorado con soporte táctil (touch-pan-x, WebkitOverflowScrolling)
    - Aplicado tanto para minoristas como mayoristas
  - ✅ **Mejoras de interfaz:**
    - Eliminado código del producto que aparecía debajo del nombre en la tabla de preregistros
    - Eliminado badge numérico del resumen de venta (tanto en desktop como móvil/tablet)
    - Interfaz más limpia y enfocada en la información esencial

- ✅ **Mejoras en v2.21.0 - Sistema de Minoristas y Mayoristas:**
  - ✅ **Nueva estructura de datos**: Tablas separadas para ventas de minoristas (`ventas_minoristas`) y mayoristas (`ventas_mayoristas`)
  - ✅ **Sistema de arqueos diferenciado**: 
    - Arqueos diarios para minoristas (`arqueos_minoristas`)
    - Arqueos flexibles para mayoristas (`arqueos_mayoristas`) con arrastre de saldos
  - ✅ **Control de aumentos**: Los aumentos ahora se registran automáticamente desde pedidos entregados en las tablas de ventas
  - ✅ **Cálculo automático de saldos**: Funciones SQL para calcular saldos disponibles (preregistro + aumentos - vendido)
  - ✅ **Notificaciones de arqueo**: Sistema de notificaciones para mayoristas sin arqueo por más de 2 días
  - ✅ **Páginas de arqueos**: Interfaces dedicadas para gestionar arqueos de minoristas y mayoristas
  - ✅ **Integración con Dashboard**: Notificaciones de arqueo visibles para administradores en el Dashboard
  - ✅ **Servicios actualizados**: Nuevos servicios TypeScript para gestionar ventas y arqueos de minoristas/mayoristas
  - ✅ **Actualización de NewSale**: La página de nueva venta ahora usa la nueva estructura de datos
  - ✅ **Row Level Security**: Políticas RLS configuradas para control de acceso por rol
  - ✅ **Migraciones SQL**: Scripts completos de migración y documentación para reestructuración

- ✅ **Mejoras en v2.22.0 - Optimización de Rendimiento:**
  - ✅ **Optimización de carga de preregistros**: 
    - Implementación de JOINs de Supabase para obtener datos relacionados en una sola query
    - Eliminación de múltiples llamadas individuales a `productsService.getById` y `usersService.getById`
    - Reducción significativa de tiempo de carga: de N*2 llamadas a 1 sola query (donde N = número de preregistros)
    - Mejora notable en tablas con muchos preregistros (100+ elementos)
  - ✅ **Funciones optimizadas**:
    - `getPreregistrosMinorista()`: Usa JOINs para productos y minoristas
    - `getPreregistrosMayorista()`: Usa JOINs para productos y mayoristas
    - `createPreregistroMinorista()`: JOINs en select después de insertar
    - `createPreregistroMayorista()`: JOINs en select después de insertar
    - `updatePreregistroMinorista()`: JOINs para obtener datos actualizados
    - `updatePreregistroMayorista()`: JOINs para obtener datos actualizados
  - ✅ **Mejoras en interfaz de preregistros**:
    - Diálogo "Nuevo Preregistro" simplificado: solo selección de minorista/mayorista
    - Gestión de productos centralizada en diálogo dedicado "Gestionar Productos"
    - Formulario de agregar producto arriba, tabla de productos abajo
    - Mejor organización y flujo de trabajo

- ✅ **Mejoras en v2.23.0 - Persistencia y Ordenamiento:**
  - ✅ **Ordenamiento de productos en preregistros**: Los productos ahora se muestran en el orden cronológico de registro (primero registrado, primero en la lista) tanto para mayoristas como para minoristas
  - ✅ **Persistencia del saldo restante**: El saldo restante modificado manualmente en "Nueva Venta" se guarda automáticamente en localStorage y persiste al salir y volver a entrar a la página. Los cambios se mantienen hasta completar una venta o modificarlos nuevamente
  - ✅ **Mejoras técnicas**:
    - Ordenamiento ascendente por `created_at` en consultas de preregistros
    - Sistema de persistencia con localStorage para saldos restantes
    - Limpieza automática de datos guardados después de completar ventas

- ✅ **Mejoras en v2.24.0 - Gestión de Perfil:**
  - ✅ **Página de perfil**: Nueva página `/perfil` donde todos los usuarios pueden ver su información y cambiar su contraseña
  - ✅ **Cambio de contraseña**: Todos los usuarios (no solo administradores) pueden cambiar su propia contraseña desde la página de perfil
  - ✅ **Seguridad**: Validación de que solo se puede cambiar la contraseña propia, no la de otros usuarios
  - ✅ **Interfaz mejorada**: Formulario con validación, confirmación de contraseña y opción para mostrar/ocultar contraseña
  - ✅ **Acceso fácil**: Enlace "Mi Perfil" agregado en el sidebar para acceso rápido

**Versión**: 2.24.0  
**Última actualización**: Enero 2026  
**Estado**: Sistema completo con Preregistros, Roles Minorista/Mayorista, Gestión de Precios Mejorada, Sistema de Arqueos Diferenciado, Optimizaciones de Rendimiento, Persistencia de Saldos y Gestión de Perfil - En producción

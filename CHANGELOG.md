# Changelog

Todos los cambios notables en este proyecto serán documentados en este archivo.

## [Unreleased]

## [2.25.0] - 2026-04-12

### Mejoras
- **Panel de control**: mensaje de estado del día para minorista (jornada / venta registrada) y mayorista; botón **Actualizar** para refrescar datos; subtítulos en tarjetas (POS hoy, desglose de pedidos); **Nueva venta** más destacada para minorista; accesos a **Ventas del día** y **Mis arqueos**; vendedor: Historial, Servicios y Registro de servicios; admin: enlace **Ver inventario** desde alertas de stock; título y descripción aclaratoria en “Últimas ventas registradas”
- **Menú lateral**: eliminado el ítem **Escanear QR** para minorista (el flujo sigue en Nueva venta → Escaneo por QR)

### Cambios técnicos
- `Dashboard.tsx`: queries alineadas con Nueva venta para estado minorista; eliminado código muerto de notificaciones del navegador
- `NewSale.tsx`: invalidación de `minorista-hay-venta-nueva-venta-hoy` y `mayorista-hay-venta-nueva-venta-hoy` al iniciar jornada o registrar venta

## [2.24.0]

### Mejoras
- **Nueva venta (minorista)**: El panel principal pasa a llamarse **Ventas del día (Minorista)** con la fecha de hoy y **Consulta (Minorista)** en fechas pasadas; calendario para elegir día; en consulta solo se muestra tabla si hubo ventas guardadas ese día; tabla de consulta en solo lectura alineada a `ventas_minoristas`; resumen lateral/hoja móvil con líneas y totales desde BD (sin mezclar saldos de otros días); botón Pedidos solo en vista “hoy”; orden de filas invertido en listados de ventas del resumen; mensajes en Pedidos actualizados al nuevo nombre
- **Saldo restante en base de datos**: El saldo editado en Nueva Venta se guarda en `cantidad_restante` de `preregistros_minorista` / `preregistros_mayorista` (minorista vía RPC `set_preregistro_cantidad_restante_minorista`). Tras ejecutar la migración SQL, el saldo persiste entre dispositivos y sesiones; `localStorage` queda solo como respaldo si el valor en BD es NULL
- **Preregistros mayorista reutilizables**: Los preregistros de mayoristas ahora funcionan igual que los de minoristas: son reutilizables todos los días, sin filtrar por fecha. Se eliminó la columna `fecha` de la tabla `preregistros_mayorista` y se unificó el constraint a `(id_mayorista, id_producto)`
- **Ordenamiento de productos en preregistros**: Los productos ahora se muestran en el orden en que fueron registrados (primero registrado, primero en la lista) tanto para mayoristas como para minoristas
- **Persistencia del saldo restante**: El saldo restante modificado manualmente en "Nueva Venta" ahora se guarda en localStorage y persiste al salir y volver a entrar a la página. Los cambios se mantienen hasta completar una venta o modificarlos nuevamente
- **Página de perfil y cambio de contraseña**: Nueva página `/perfil` donde todos los usuarios pueden ver su información y cambiar su propia contraseña. Accesible desde el menú lateral con enlace "Mi Perfil"

### Cambios Técnicos
- Migración `rpc_set_preregistro_cantidad_restante_minorista.sql`: columna `cantidad_restante` y RPC para que minoristas persistan saldo sin política UPDATE amplia
- `preregistros.service.ts`: `updateCantidadRestanteMinorista` / `updateCantidadRestanteMayorista`; tipos y updates admin con `cantidad_restante`
- `NewSale.tsx`: carga prioriza BD, guarda saldo al editar y tras venta completada
- Migración `update_preregistros_mayorista_structure.sql`: elimina columna `fecha` de `preregistros_mayorista`, preregistros reutilizables como minorista
- Actualizado `preregistros.service.ts`: `getPreregistrosMayorista` y `createPreregistroMayorista` sin parámetro fecha
- Actualizada página `PreregistrosMayorista.tsx`: eliminado DatePicker, carga todos los preregistros
- Actualizado el ordenamiento en `preregistros.service.ts` para usar orden ascendente por `created_at`
- Implementado sistema de persistencia con localStorage para saldos restantes en `NewSale.tsx`
- Creada migración `add_cantidad_restante_to_preregistros.sql` (preparada para futura implementación en BD)
- Creada página `Profile.tsx` con formulario para cambio de contraseña
- Agregada ruta `/perfil` en el router
- Agregado enlace "Mi Perfil" en el sidebar para todos los usuarios

## [2.0.0] - Versión Actual

### Características Principales
- Sistema completo de punto de venta
- Gestión de ventas a crédito con cuotas e intereses
- Sistema de gestión de servicios
- Preregistros para mayoristas y minoristas
- Arqueos de caja
- Reportes y exportación a PDF/Excel
- Impresión de tickets
- Paginación en todas las tablas

# Changelog

Todos los cambios notables en este proyecto serán documentados en este archivo.

## [Unreleased]

### Mejoras
- **Ordenamiento de productos en preregistros**: Los productos ahora se muestran en el orden en que fueron registrados (primero registrado, primero en la lista) tanto para mayoristas como para minoristas
- **Persistencia del saldo restante**: El saldo restante modificado manualmente en "Nueva Venta" ahora se guarda en localStorage y persiste al salir y volver a entrar a la página. Los cambios se mantienen hasta completar una venta o modificarlos nuevamente
- **Página de perfil y cambio de contraseña**: Nueva página `/perfil` donde todos los usuarios pueden ver su información y cambiar su propia contraseña. Accesible desde el menú lateral con enlace "Mi Perfil"

### Cambios Técnicos
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

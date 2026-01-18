# Plan de Pruebas: Sistema de Minoristas y Mayoristas

## 🎯 Objetivo
Verificar que todas las funcionalidades implementadas para minoristas y mayoristas funcionen correctamente.

---

## ✅ Checklist de Pruebas

### 1. Pruebas de Base de Datos

#### 1.1 Verificar Tablas Creadas
- [ ] `ventas_minoristas` existe
- [ ] `ventas_mayoristas` existe
- [ ] `arqueos_minoristas` existe
- [ ] `arqueos_mayoristas` existe
- [ ] `notificaciones_arqueo` existe

#### 1.2 Verificar Funciones
- [ ] `calcular_saldo_disponible_minorista` funciona
- [ ] `calcular_saldo_disponible_mayorista` funciona
- [ ] `verificar_arqueos_mayoristas` funciona
- [ ] `encontrar_pedido_entregado_aumento` funciona

#### 1.3 Verificar RLS
- [ ] Minoristas solo ven sus propias ventas
- [ ] Mayoristas solo ven sus propias ventas
- [ ] Administradores ven todas las ventas
- [ ] Políticas de arqueos funcionan correctamente

---

### 2. Pruebas de Nueva Venta (Minoristas)

#### 2.1 Visualización de Preregistros
- [ ] Se muestran preregistros del minorista
- [ ] Se muestra saldo disponible correctamente (preregistro + aumentos - vendido)
- [ ] La tabla es responsive en móvil/tablet
- [ ] Los headers están abreviados en móvil

#### 2.2 Registro de Ventas
- [ ] Al registrar una venta, se crea registro en `ventas_minoristas`
- [ ] `cantidad_vendida` se guarda correctamente
- [ ] `cantidad_aumento` queda en 0 (los aumentos vienen de pedidos)
- [ ] El precio unitario se guarda correctamente
- [ ] El total se calcula automáticamente
- [ ] La fecha y hora se registran correctamente

#### 2.3 Validaciones
- [ ] No se puede vender más de lo disponible
- [ ] Los campos numéricos aceptan solo valores válidos
- [ ] Los mensajes de error son claros

---

### 3. Pruebas de Nueva Venta (Mayoristas)

#### 3.1 Visualización de Preregistros
- [ ] Se muestran preregistros del mayorista
- [ ] Se muestra saldo disponible con arrastre (desde último arqueo)
- [ ] La tabla es responsive en móvil/tablet

#### 3.2 Registro de Ventas
- [ ] Al registrar una venta, se crea registro en `ventas_mayoristas`
- [ ] `cantidad_vendida` se guarda correctamente
- [ ] `cantidad_aumento` queda en 0 (los aumentos vienen de pedidos)
- [ ] El precio por mayor se guarda correctamente
- [ ] El total se calcula automáticamente

---

### 4. Pruebas de Arqueos Minoristas

#### 4.1 Crear Arqueo
- [ ] Se puede crear un nuevo arqueo del día
- [ ] La fecha se establece automáticamente
- [ ] El estado inicial es "abierto"

#### 4.2 Calcular Ventas del Día
- [ ] El botón "Calcular Ventas" suma correctamente las ventas del día
- [ ] Se muestra el total de ventas del período
- [ ] Se muestran los productos vendidos con cantidades

#### 4.3 Cerrar Arqueo
- [ ] Se pueden ingresar saldos restantes por producto
- [ ] Se puede ingresar efectivo recibido
- [ ] La diferencia se calcula automáticamente
- [ ] Al cerrar, el estado cambia a "cerrado"
- [ ] Se puede agregar observaciones

#### 4.4 Visualización Histórica
- [ ] Se muestran arqueos cerrados históricos
- [ ] Se puede ver el detalle de cada arqueo
- [ ] Los filtros de fecha funcionan correctamente

---

### 5. Pruebas de Arqueos Mayoristas

#### 5.1 Crear Arqueo
- [ ] Se puede crear un arqueo con fecha inicio y fin
- [ ] El período puede ser flexible (más de un día)
- [ ] El estado inicial es "abierto"

#### 5.2 Calcular Ventas del Período
- [ ] El botón "Calcular Ventas" suma correctamente las ventas del período
- [ ] Se muestran todas las ventas entre fecha inicio y fin
- [ ] Se calcula correctamente el total

#### 5.3 Arrastre de Saldos
- [ ] Al crear nuevo arqueo, se pueden arrastrar saldos del arqueo anterior
- [ ] Los saldos arrastrados se muestran correctamente
- [ ] Se pueden ingresar nuevos saldos restantes

#### 5.4 Cerrar Arqueo
- [ ] Se pueden ingresar saldos restantes por producto
- [ ] Se puede ingresar efectivo recibido
- [ ] La diferencia se calcula automáticamente
- [ ] Al cerrar, el estado cambia a "cerrado"

---

### 6. Pruebas de Notificaciones de Arqueo

#### 6.1 Visualización en Dashboard
- [ ] Las notificaciones aparecen solo para administradores
- [ ] Se muestran mayoristas sin arqueo > 2 días
- [ ] Se muestra el número de días sin arqueo
- [ ] Se muestra la fecha del último arqueo

#### 6.2 Acciones sobre Notificaciones
- [ ] Se puede marcar como "vista"
- [ ] Se puede marcar como "resuelta"
- [ ] Las notificaciones se actualizan correctamente

#### 6.3 Actualización Automática
- [ ] La función `verificar_arqueos_mayoristas` crea notificaciones automáticamente
- [ ] Las notificaciones se actualizan cuando se cierra un arqueo

---

### 7. Pruebas de Integración con Pedidos

#### 7.1 Entrega de Pedidos (Minoristas)
- [ ] Cuando se entrega un pedido, se crea registro en `ventas_minoristas`
- [ ] `cantidad_aumento` se establece correctamente
- [ ] `id_pedido` se asocia correctamente
- [ ] El saldo disponible se actualiza automáticamente

#### 7.2 Entrega de Pedidos (Mayoristas)
- [ ] Cuando se entrega un pedido, se crea registro en `ventas_mayoristas`
- [ ] `cantidad_aumento` se establece correctamente
- [ ] `id_pedido` se asocia correctamente
- [ ] El saldo disponible se actualiza automáticamente

---

### 8. Pruebas de Navegación y UI

#### 8.1 Menú de Navegación
- [ ] "Mis Arqueos" aparece para minoristas
- [ ] "Mis Arqueos" aparece para mayoristas
- [ ] Los enlaces funcionan correctamente

#### 8.2 Rutas
- [ ] `/arqueos/minorista` funciona
- [ ] `/arqueos/mayorista` funciona
- [ ] Las rutas están protegidas por rol

#### 8.3 Responsividad
- [ ] Las tablas son responsive en móvil
- [ ] El scroll horizontal funciona en móvil
- [ ] Los controles se adaptan a pantallas pequeñas

---

## 🔍 Pruebas Específicas a Realizar

### Prueba 1: Flujo Completo Minorista
1. Login como minorista
2. Ir a "Nueva Venta"
3. Ver preregistros y saldos disponibles
4. Registrar una venta
5. Ir a "Mis Arqueos"
6. Crear arqueo del día
7. Calcular ventas
8. Cerrar arqueo con saldos restantes
9. Verificar que los datos se guardaron correctamente

### Prueba 2: Flujo Completo Mayorista
1. Login como mayorista
2. Ir a "Nueva Venta"
3. Registrar una venta
4. Ir a "Mis Arqueos"
5. Crear arqueo con período de 2 días
6. Calcular ventas del período
7. Arrastrar saldos del arqueo anterior
8. Cerrar arqueo
9. Verificar arrastre de saldos en próximo arqueo

### Prueba 3: Notificaciones Administrador
1. Login como administrador
2. Crear arqueo de mayorista y cerrarlo (fecha hace 3 días)
3. Ir al Dashboard
4. Verificar que aparece notificación de arqueo pendiente
5. Marcar como vista
6. Marcar como resuelta
7. Verificar que desaparece

### Prueba 4: Integración Pedidos
1. Crear pedido para minorista/mayorista
2. Marcar pedido como "entregado"
3. Verificar que se creó registro en ventas con `cantidad_aumento`
4. Verificar que `id_pedido` está asociado
5. Verificar que saldo disponible se actualizó

---

## 📝 Notas de Pruebas

### Datos de Prueba Recomendados
- Crear preregistros de prueba
- Crear pedidos de prueba
- Usar fechas diferentes para probar períodos
- Probar con diferentes cantidades

### Errores Comunes a Verificar
- [ ] Saldo negativo (no debería ser posible)
- [ ] Fechas inválidas
- [ ] Valores nulos donde no deberían serlo
- [ ] Cálculos incorrectos de totales
- [ ] Problemas de permisos/RLS

---

## ✅ Criterios de Aceptación

1. ✅ Todas las tablas existen y tienen la estructura correcta
2. ✅ Las funciones de cálculo funcionan correctamente
3. ✅ Los arqueos se crean y cierran correctamente
4. ✅ Las notificaciones aparecen cuando corresponde
5. ✅ Los saldos se calculan correctamente
6. ✅ La integración con pedidos funciona
7. ✅ La UI es responsive y funcional
8. ✅ No hay errores en la consola del navegador
9. ✅ Los permisos funcionan correctamente (RLS)

---

## 🚀 Siguiente Paso
Ejecutar las pruebas según el orden del checklist y documentar cualquier problema encontrado.

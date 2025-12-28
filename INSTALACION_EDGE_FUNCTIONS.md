# Guía de Instalación de Edge Functions

Esta guía te ayudará a desplegar las Edge Functions necesarias para que los administradores puedan gestionar emails de usuarios.

## Paso 1: Instalar Supabase CLI

Si aún no tienes Supabase CLI instalado:

```bash
npm install -g supabase
```

## Paso 2: Iniciar Sesión

Inicia sesión en tu cuenta de Supabase:

```bash
supabase login
```

Esto abrirá tu navegador para autenticarte.

## Paso 3: Obtener el Project Ref

Necesitas el **Project Ref** de tu proyecto Supabase. Puedes encontrarlo en:

1. Dashboard de Supabase → Settings → API
2. O en la URL de tu proyecto: `https://[project-ref].supabase.co`

## Paso 4: Enlazar el Proyecto

Enlaza tu proyecto local con el proyecto en Supabase:

```bash
supabase link --project-ref tu-project-ref-aqui
```

Esto te pedirá tu contraseña de la base de datos. Si no la recuerdas, puedes crear una nueva en:
Dashboard de Supabase → Settings → Database → Database Password

## Paso 5: Desplegar las Funciones

Desde la raíz del proyecto, despliega las funciones:

```bash
# Desplegar todas las funciones
supabase functions deploy
```

O desplegar una por una:

```bash
# Desplegar get-user-email
supabase functions deploy get-user-email

# Desplegar update-user-email
supabase functions deploy update-user-email
```

## Paso 6: Verificar

1. Ve al Dashboard de Supabase → Edge Functions
2. Deberías ver ambas funciones (`get-user-email` y `update-user-email`) listadas

## Verificación Rápida

Puedes verificar que las funciones funcionan correctamente desde el frontend:

1. Inicia sesión como administrador
2. Ve a "Gestión de Usuarios"
3. Intenta editar un usuario
4. El campo de email debería aparecer y permitirte actualizarlo

## Solución de Problemas Comunes

### Error: "Project not found"
- Verifica que el `project-ref` sea correcto
- Asegúrate de haber iniciado sesión con `supabase login`

### Error: "Database password required"
- Ve a Dashboard → Settings → Database → Database Password
- Crea o resetea la contraseña
- Vuelve a ejecutar `supabase link`

### Error: "Function deployment failed"
- Verifica que los archivos existan en `supabase/functions/[nombre-funcion]/index.ts`
- Revisa los logs en el dashboard de Supabase
- Asegúrate de tener permisos de administrador en el proyecto

### Error de CORS en el navegador
- Las funciones ya incluyen headers CORS
- Si persiste, verifica que estés usando la URL correcta de Supabase

### Las funciones no se llaman desde el frontend
- Verifica que estés logueado como administrador
- Abre la consola del navegador para ver errores
- Verifica que las funciones estén desplegadas correctamente en el dashboard

## Comandos Útiles

```bash
# Ver todas las funciones desplegadas
supabase functions list

# Ver logs de una función
supabase functions logs get-user-email

# Eliminar una función (si es necesario)
supabase functions delete get-user-email
```

## Estructura de Archivos

```
supabase/
├── functions/
│   ├── get-user-email/
│   │   └── index.ts
│   ├── update-user-email/
│   │   └── index.ts
│   └── README.md
└── config.toml
```

## Notas Finales

- Las funciones usan automáticamente las variables de entorno de Supabase
- No necesitas configurar manualmente las variables de entorno
- Las funciones validan automáticamente que el usuario sea administrador
- Una vez desplegadas, las funciones estarán disponibles inmediatamente

## Próximos Pasos

Después de desplegar las funciones:

1. ✅ Verifica que aparezcan en el dashboard de Supabase
2. ✅ Prueba editar un usuario como administrador
3. ✅ Verifica que puedas actualizar el email de otros usuarios
4. ✅ Confirma que los usuarios normales no pueden actualizar emails de otros usuarios

¡Listo! Ya puedes gestionar emails de usuarios como administrador.


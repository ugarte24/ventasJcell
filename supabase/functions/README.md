# Edge Functions - Gestión de Usuarios

Este directorio contiene las Edge Functions necesarias para gestionar emails de usuarios.

## Funciones Disponibles

### 1. `create-user`
Crea un nuevo usuario en el sistema. Solo los administradores activos pueden usarla.
- Crea el usuario en Auth.users usando Admin API
- Crea el registro en la tabla `usuarios`
- Confirma el email automáticamente
- Valida que el nombre de usuario no exista

### 2. `get-user-email`
Obtiene el email de un usuario específico. Solo los administradores pueden usarla.

### 3. `update-user-email`
Actualiza el email de un usuario específico. Solo los administradores pueden usarla.

## Requisitos Previos

1. **Instalar Supabase CLI**:
   ```bash
   npm install -g supabase
   ```

2. **Iniciar sesión en Supabase**:
   ```bash
   supabase login
   ```

3. **Enlazar tu proyecto** (si no está enlazado):
   ```bash
   supabase link --project-ref tu-project-ref
   ```
   
   Puedes encontrar tu `project-ref` en la URL de tu proyecto Supabase: `https://[project-ref].supabase.co`

## Desplegar las Funciones

### Opción 1: Desplegar todas las funciones
```bash
supabase functions deploy
```

### Opción 2: Desplegar funciones individuales
```bash
# Desplegar create-user
supabase functions deploy create-user

# Desplegar get-user-email
supabase functions deploy get-user-email

# Desplegar update-user-email
supabase functions deploy update-user-email
```

## Verificar el Despliegue

Después de desplegar, puedes verificar que las funciones estén disponibles en:
- Dashboard de Supabase → Edge Functions

O probarlas directamente:
```bash
# Probar create-user
curl -X POST https://[project-ref].supabase.co/functions/v1/create-user \
  -H "Authorization: Bearer [tu-token]" \
  -H "Content-Type: application/json" \
  -d '{"nombre": "Juan Pérez", "usuario": "juan", "email": "juan@example.com", "password": "password123", "rol": "vendedor", "estado": "activo"}'

# Probar get-user-email
curl -X POST https://[project-ref].supabase.co/functions/v1/get-user-email \
  -H "Authorization: Bearer [tu-token]" \
  -H "Content-Type: application/json" \
  -d '{"userId": "user-id-aqui"}'

# Probar update-user-email
curl -X POST https://[project-ref].supabase.co/functions/v1/update-user-email \
  -H "Authorization: Bearer [tu-token]" \
  -H "Content-Type: application/json" \
  -d '{"userId": "user-id-aqui", "email": "nuevo@email.com"}'
```

## Variables de Entorno

Las funciones utilizan automáticamente las siguientes variables de entorno (configuradas en Supabase):

- `SUPABASE_URL`: URL de tu proyecto
- `SUPABASE_ANON_KEY`: Clave anónima
- `SUPABASE_SERVICE_ROLE_KEY`: Clave de servicio (solo para uso interno)

Estas variables se configuran automáticamente cuando despliegas las funciones.

## Notas Importantes

1. **Seguridad**: Las funciones validan que el usuario sea administrador antes de permitir cualquier operación.

2. **CORS**: Las funciones incluyen headers CORS para permitir peticiones desde el frontend.

3. **Error Handling**: Todas las funciones manejan errores y retornan respuestas JSON apropiadas.

4. **Validación**: La función `update-user-email` valida el formato del email antes de actualizarlo.

## Solución de Problemas

Si encuentras errores al desplegar:

1. Verifica que tengas las últimas versiones de Supabase CLI:
   ```bash
   npm update -g supabase
   ```

2. Verifica que estés enlazado al proyecto correcto:
   ```bash
   supabase projects list
   ```

3. Verifica los logs de las funciones en el dashboard de Supabase para ver errores específicos.

## Uso desde el Frontend

El frontend ya está configurado para usar estas funciones automáticamente. No necesitas hacer cambios adicionales en el código del frontend.


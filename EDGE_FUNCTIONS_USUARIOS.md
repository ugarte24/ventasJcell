# Edge Functions para Gestión de Usuarios

Este documento describe las Edge Functions necesarias para que los administradores puedan gestionar usuarios: crear usuarios, obtener y actualizar el email de cualquier usuario.

## Funciones Requeridas

### 1. `get-user-email`

Obtiene el email de un usuario específico. Solo los administradores pueden usarla.

**Ubicación**: `supabase/functions/get-user-email/index.ts`

**Código**:
```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Obtener el token de autorización
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Crear cliente Supabase con el token del usuario
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    )

    // Verificar que el usuario esté autenticado
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verificar que el usuario sea administrador
    const { data: userData, error: roleError } = await supabaseClient
      .from('usuarios')
      .select('rol')
      .eq('id', user.id)
      .single()

    if (roleError || userData?.rol !== 'admin') {
      return new Response(
        JSON.stringify({ error: 'Only administrators can get user emails' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Obtener el userId del cuerpo de la petición
    const { userId } = await req.json()
    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'userId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Crear cliente admin para acceder a auth.users
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Obtener el usuario de auth.users
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.getUserById(userId)

    if (authError || !authUser) {
      return new Response(
        JSON.stringify({ error: 'User not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ email: authUser.user.email }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
```

### 2. `create-user`

Crea un nuevo usuario en el sistema. Solo los administradores pueden usarla.

**Ubicación**: `supabase/functions/create-user/index.ts`

**Código**:
```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Obtener el token de autorización
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Crear cliente Supabase con el token del usuario
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    )

    // Verificar que el usuario esté autenticado
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verificar que el usuario sea administrador
    const { data: userData, error: roleError } = await supabaseClient
      .from('usuarios')
      .select('rol, estado')
      .eq('id', user.id)
      .single()

    if (roleError || userData?.rol !== 'admin' || userData?.estado !== 'activo') {
      return new Response(
        JSON.stringify({ error: 'Solo los administradores activos pueden crear usuarios' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Obtener datos del cuerpo de la solicitud
    const { nombre, usuario, email, password, rol, estado, fecha_creacion } = await req.json()

    // Validar datos requeridos
    if (!nombre || !usuario || !email || !password || !rol) {
      return new Response(
        JSON.stringify({ error: 'Faltan datos requeridos' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validar rol
    // Nota: El valor 'vendedor' se almacena en la base de datos, pero se muestra como "Vendedor Tienda" en la interfaz
    if (rol !== 'admin' && rol !== 'vendedor' && rol !== 'minorista' && rol !== 'mayorista') {
      return new Response(
        JSON.stringify({ error: 'Rol inválido' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Crear cliente Supabase con service_role para usar Admin API
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Verificar que el usuario no exista
    const { data: existingUser } = await supabaseAdmin
      .from('usuarios')
      .select('id')
      .eq('usuario', usuario)
      .maybeSingle()

    if (existingUser) {
      return new Response(
        JSON.stringify({ error: 'El nombre de usuario ya existe' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Crear usuario en Auth usando Admin API
    const { data: authUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: email.trim(),
      password: password,
      email_confirm: true, // Confirmar email automáticamente
      user_metadata: {
        nombre,
        usuario,
        rol
      }
    })

    if (createError || !authUser.user) {
      return new Response(
        JSON.stringify({ error: createError?.message || 'Error al crear usuario en Auth' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Crear registro en tabla usuarios
    const { data: dbUser, error: dbError } = await supabaseAdmin
      .from('usuarios')
      .insert({
        id: authUser.user.id,
        nombre,
        usuario,
        rol,
        estado: estado || 'activo',
        fecha_creacion: fecha_creacion || new Date().toISOString(),
      })
      .select()
      .single()

    if (dbError || !dbUser) {
      // Si falla la inserción en la tabla, eliminar el usuario de Auth
      await supabaseAdmin.auth.admin.deleteUser(authUser.user.id)
      return new Response(
        JSON.stringify({ error: dbError?.message || 'Error al crear usuario en la base de datos' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Retornar usuario creado
    return new Response(
      JSON.stringify({
        success: true,
        user: {
          ...dbUser,
          email: authUser.user.email
        }
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error en create-user:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'Error interno del servidor' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
```

**Roles válidos:**
- `'admin'`: Administrador con acceso completo
- `'vendedor'`: Vendedor Tienda (se almacena como 'vendedor' en la BD, pero se muestra como "Vendedor Tienda" en la interfaz)
- `'minorista'`: Cliente minorista
- `'mayorista'`: Cliente mayorista

### 3. `update-user-email`

Actualiza el email de un usuario específico. Solo los administradores pueden usarla.

**Ubicación**: `supabase/functions/update-user-email/index.ts`

**Código**:
```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Obtener el token de autorización
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Crear cliente Supabase con el token del usuario
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    )

    // Verificar que el usuario esté autenticado
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verificar que el usuario sea administrador
    const { data: userData, error: roleError } = await supabaseClient
      .from('usuarios')
      .select('rol')
      .eq('id', user.id)
      .single()

    if (roleError || userData?.rol !== 'admin') {
      return new Response(
        JSON.stringify({ error: 'Only administrators can update user emails' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Obtener userId y email del cuerpo de la petición
    const { userId, email } = await req.json()
    if (!userId || !email) {
      return new Response(
        JSON.stringify({ error: 'userId and email are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return new Response(
        JSON.stringify({ error: 'Invalid email format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Crear cliente admin para actualizar auth.users
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Actualizar el email del usuario
    const { data: updatedUser, error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      userId,
      { email: email.trim() }
    )

    if (updateError || !updatedUser) {
      return new Response(
        JSON.stringify({ error: updateError?.message || 'Failed to update user email' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ success: true, email: updatedUser.user.email }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
```

## Instalación

1. **Instalar Supabase CLI** (si no lo tienes):
   ```bash
   npm install -g supabase
   ```

2. **Inicializar el proyecto** (si no está inicializado):
   ```bash
   supabase init
   ```

3. **Crear las funciones**:
   ```bash
   # Crear función get-user-email
   supabase functions new get-user-email
   
   # Crear función create-user
   supabase functions new create-user
   
   # Crear función update-user-email
   supabase functions new update-user-email
   ```

4. **Copiar el código** de cada función en sus respectivos archivos `index.ts`

5. **Desplegar las funciones**:
   ```bash
   supabase functions deploy get-user-email
   supabase functions deploy create-user
   supabase functions deploy update-user-email
   ```

   O desplegar todas a la vez:
   ```bash
   supabase functions deploy
   ```

## Variables de Entorno

Las funciones necesitan acceso a las siguientes variables de entorno (se configuran automáticamente en Supabase):

- `SUPABASE_URL`: URL de tu proyecto Supabase
- `SUPABASE_ANON_KEY`: Clave anónima de tu proyecto
- `SUPABASE_SERVICE_ROLE_KEY`: Clave de servicio (solo para uso interno en las funciones)

## Seguridad

- ✅ Solo los administradores activos pueden crear usuarios
- ✅ Solo los administradores pueden obtener emails de otros usuarios
- ✅ Solo los administradores pueden actualizar emails de otros usuarios
- ✅ Las funciones validan el token de autorización
- ✅ Se usa la Admin API solo dentro de las Edge Functions (nunca se expone al cliente)
- ✅ Las funciones validan el formato del email antes de actualizar
- ✅ Se valida que el nombre de usuario no exista antes de crear
- ✅ Si falla la inserción en la tabla `usuarios`, se elimina automáticamente el usuario de Auth para mantener consistencia

## Uso desde el Frontend

El frontend ya está configurado para usar estas funciones. El servicio `users.service.ts` llama automáticamente a estas funciones cuando:
- Un administrador intenta crear un nuevo usuario (en `create`)
- Un administrador intenta obtener el email de un usuario (en `getById`)
- Un administrador intenta actualizar el email de un usuario (en `update`)

Si las funciones no existen o fallan, el sistema mostrará un mensaje de error apropiado.

## Notas sobre Roles

**Importante:** El rol `'vendedor'` se almacena en la base de datos con ese valor exacto, pero en la interfaz de usuario se muestra como **"Vendedor Tienda"**. Esto es intencional para mantener la consistencia en la base de datos mientras se proporciona una etiqueta más descriptiva en la interfaz.

**Roles disponibles:**
- `'admin'`: Administrador con acceso completo al sistema
- `'vendedor'`: Vendedor Tienda (mostrado como "Vendedor Tienda" en la UI)
- `'minorista'`: Cliente minorista
- `'mayorista'`: Cliente mayorista


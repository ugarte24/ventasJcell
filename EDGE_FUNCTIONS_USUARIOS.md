# Edge Functions para Gestión de Usuarios

Este documento describe las Edge Functions necesarias para que los administradores puedan obtener y actualizar el email de cualquier usuario.

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

### 2. `update-user-email`

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
   
   # Crear función update-user-email
   supabase functions new update-user-email
   ```

4. **Copiar el código** de cada función en sus respectivos archivos `index.ts`

5. **Desplegar las funciones**:
   ```bash
   supabase functions deploy get-user-email
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

- ✅ Solo los administradores pueden obtener emails de otros usuarios
- ✅ Solo los administradores pueden actualizar emails de otros usuarios
- ✅ Las funciones validan el token de autorización
- ✅ Se usa la Admin API solo dentro de las Edge Functions (nunca se expone al cliente)
- ✅ Las funciones validan el formato del email antes de actualizar

## Uso desde el Frontend

El frontend ya está configurado para usar estas funciones. El servicio `users.service.ts` llama automáticamente a estas funciones cuando:
- Un administrador intenta obtener el email de un usuario (en `getById`)
- Un administrador intenta actualizar el email de un usuario (en `update`)

Si las funciones no existen o fallan, el sistema mostrará un mensaje de error apropiado.


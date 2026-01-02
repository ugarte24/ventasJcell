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

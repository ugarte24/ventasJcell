# Notas sobre Gestión de Usuarios

## Limitaciones Actuales

### Crear Usuarios

El método `create` en `users.service.ts` usa `supabase.auth.signUp()`, que tiene las siguientes limitaciones:

1. **Error "Anonymous sign-ins are disabled"**: 
   - Este error ocurre cuando un usuario autenticado intenta crear otro usuario usando `signUp()`
   - Supabase interpreta esto como un signup anónimo y lo bloquea

2. **Confirmación de Email**: Por defecto, Supabase requiere que el usuario confirme su email antes de poder iniciar sesión.

3. **Solución Temporal para Desarrollo**: 
   - Ve al dashboard de Supabase → Authentication → Settings
   - Deshabilita "Enable email confirmations" temporalmente
   - Habilita "Enable anonymous sign-ins" temporalmente (solo para desarrollo)
   - O crea usuarios manualmente desde el dashboard de Supabase

4. **Solución Recomendada para Producción**:
   - **CREAR UNA EDGE FUNCTION** que use Admin API con service_role key
   - Esto permite crear usuarios sin confirmación de email y sin problemas de sesión
   - Ejemplo de Edge Function:
     ```typescript
     import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
     import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

     serve(async (req) => {
       const { email, password, nombre, usuario, rol } = await req.json()
       
       const supabaseAdmin = createClient(
         Deno.env.get('SUPABASE_URL') ?? '',
         Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
       )

       const { data: user, error } = await supabaseAdmin.auth.admin.createUser({
         email,
         password,
         email_confirm: true,
         user_metadata: { nombre, usuario, rol }
       })

       if (error) {
         return new Response(JSON.stringify({ error: error.message }), { status: 400 })
       }

       // Crear registro en tabla usuarios
       const { error: dbError } = await supabaseAdmin
         .from('usuarios')
         .insert({
           id: user.user.id,
           nombre,
           usuario,
           rol,
           estado: 'activo'
         })

       if (dbError) {
         return new Response(JSON.stringify({ error: dbError.message }), { status: 400 })
       }

       return new Response(JSON.stringify({ success: true, user }), { status: 200 })
     })
     ```

### Actualizar Contraseña

- Solo el usuario puede actualizar su propia contraseña
- Para actualizar contraseñas de otros usuarios, usa el dashboard de Supabase o crea una Edge Function

### Eliminar Usuarios

- Actualmente hace "soft delete" (cambia estado a inactivo)
- Para eliminar completamente de Auth, usa el dashboard de Supabase

## Funcionalidades Implementadas

✅ Listar usuarios
✅ Buscar usuarios
✅ Crear usuarios (requiere deshabilitar confirmación de email)
✅ Editar usuarios (nombre, usuario, rol, estado)
✅ Activar/Desactivar usuarios
✅ Cambiar contraseña (solo propia)
✅ Eliminar usuarios (soft delete)

## Configuración Necesaria en Supabase

1. **Deshabilitar confirmación de email** (para desarrollo):
   - Dashboard → Authentication → Settings
   - Desmarca "Enable email confirmations"

2. **O crear Edge Function** (recomendado para producción):
   - Crea una función que use Admin API
   - Permite crear usuarios sin confirmación


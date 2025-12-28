# Guía Rápida de Despliegue de Edge Functions

Hay varias formas de desplegar las Edge Functions. Elige la que más te convenga:

## Opción 1: Usando npx (Recomendado - No requiere instalación)

Ejecuta estos comandos desde la raíz del proyecto:

```powershell
# 1. Iniciar sesión (solo la primera vez)
npx supabase@latest login

# 2. Enlazar proyecto (solo la primera vez)
# Reemplaza 'tu-project-ref' con tu Project Ref
npx supabase@latest link --project-ref tu-project-ref

# 3. Desplegar funciones
npx supabase@latest functions deploy get-user-email
npx supabase@latest functions deploy update-user-email
```

**O usa el script automatizado:**
```powershell
.\scripts\deploy-with-npx.ps1
```

## Opción 2: Instalando Supabase CLI

### Windows (con Scoop):
```powershell
# Instalar Scoop si no lo tienes
Set-ExecutionPolicy RemoteSigned -Scope CurrentUser
irm get.scoop.sh | iex

# Instalar Supabase CLI
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase
```

### macOS/Linux:
```bash
# macOS con Homebrew
brew install supabase/tap/supabase

# O descarga desde: https://github.com/supabase/cli/releases
```

Luego ejecuta:
```bash
# Iniciar sesión
supabase login

# Enlazar proyecto
supabase link --project-ref tu-project-ref

# Desplegar funciones
supabase functions deploy
```

**O usa el script automatizado:**
```powershell
# Windows
.\scripts\deploy-functions.ps1

# macOS/Linux
chmod +x scripts/deploy-functions.sh
./scripts/deploy-functions.sh
```

## Opción 3: Desde el Dashboard de Supabase (Manual)

Si prefieres hacerlo manualmente desde la interfaz web:

1. Ve al Dashboard de Supabase → Edge Functions
2. Haz clic en "Create a new function"
3. Para cada función:
   - Nombre: `get-user-email` (o `update-user-email`)
   - Copia el contenido de `supabase/functions/[nombre-funcion]/index.ts`
   - Pega en el editor
   - Haz clic en "Deploy"

## Encontrar tu Project Ref

Tu Project Ref es la parte única de tu URL de Supabase:
- Si tu URL es: `https://[tu-project-ref].supabase.co`
- Tu Project Ref es: `[tu-project-ref]`

También puedes encontrarlo en:
- Dashboard → Settings → API → Reference ID

## Verificación

Después de desplegar, verifica que las funciones estén disponibles:

1. Ve a Dashboard → Edge Functions
2. Deberías ver ambas funciones listadas
3. Puedes probar desde el frontend editando un usuario como administrador

## Solución de Problemas

### Error: "Project not found"
- Verifica que el Project Ref sea correcto
- Asegúrate de haber iniciado sesión

### Error: "Database password required"
Al enlazar el proyecto, puede pedirte la contraseña de la base de datos:
1. Ve a Dashboard → Settings → Database
2. Haz clic en "Reset database password" si no la recuerdas
3. Usa esa contraseña al enlazar

### Error: "Function deployment failed"
- Verifica que los archivos existan en `supabase/functions/[nombre]/index.ts`
- Revisa los logs en el dashboard
- Asegúrate de tener permisos de administrador en el proyecto

## Comandos Útiles

```bash
# Ver funciones desplegadas
npx supabase@latest functions list

# Ver logs de una función
npx supabase@latest functions logs get-user-email

# Eliminar una función
npx supabase@latest functions delete get-user-email
```


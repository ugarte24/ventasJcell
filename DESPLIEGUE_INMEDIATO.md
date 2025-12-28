# 🚀 Instrucciones para Desplegar Edge Functions

Las funciones están listas para desplegar. Solo necesitas autenticarte una vez.

## Pasos Rápidos (Usando npx - Recomendado)

### 1. Iniciar Sesión (Solo una vez)

Ejecuta este comando en tu terminal:

```powershell
npx supabase@latest login
```

Esto abrirá tu navegador para autenticarte. Acepta los permisos y vuelve a la terminal.

### 2. Enlazar tu Proyecto (Solo una vez)

```powershell
npx supabase@latest link --project-ref tu-project-ref
```

**Nota:** Si tu Project Ref es diferente, reemplázalo. Lo encuentras en:
- Tu URL de Supabase: `https://[project-ref].supabase.co`
- Dashboard → Settings → API → Reference ID

Si te pide contraseña de base de datos:
1. Ve a Dashboard → Settings → Database
2. Haz clic en "Reset database password" si no la recuerdas
3. Usa esa contraseña

### 3. Desplegar las Funciones

```powershell
# Desplegar get-user-email
npx supabase@latest functions deploy get-user-email

# Desplegar update-user-email
npx supabase@latest functions deploy update-user-email
```

O despliega todas a la vez:

```powershell
npx supabase@latest functions deploy
```

## ✅ Verificación

1. Ve al Dashboard de Supabase → Edge Functions
2. Deberías ver ambas funciones listadas:
   - `get-user-email`
   - `update-user-email`

## 🎯 Prueba Rápida

Después de desplegar:

1. Inicia sesión en tu aplicación como administrador
2. Ve a "Gestión de Usuarios"
3. Haz clic en "Editar" en cualquier usuario
4. El campo "Email" debería aparecer y permitirte actualizarlo

## 📝 Archivos Creados

Las funciones están en:
- `supabase/functions/get-user-email/index.ts`
- `supabase/functions/update-user-email/index.ts`

## 🔧 Scripts Disponibles

Si prefieres usar scripts automatizados:

```powershell
# Windows PowerShell
.\scripts\deploy-with-npx.ps1

# Linux/Mac
chmod +x scripts/deploy-functions.sh
./scripts/deploy-functions.sh
```

## ❓ Problemas Comunes

### Error: "Access token not provided"
Ejecuta primero: `npx supabase@latest login`

### Error: "Project not found"
Verifica que el Project Ref sea correcto. Debe ser la parte antes de `.supabase.co` en tu URL.

### Error: "Database password required"
Resetea la contraseña en Dashboard → Settings → Database

### Error de CORS
Las funciones ya incluyen headers CORS. Si persiste, verifica que estén desplegadas correctamente.

## 📚 Documentación Completa

Para más detalles, consulta:
- `DEPLOY_FUNCTIONS.md` - Guía completa de despliegue
- `EDGE_FUNCTIONS_USUARIOS.md` - Detalles técnicos de las funciones
- `INSTALACION_EDGE_FUNCTIONS.md` - Guía paso a paso

---

**¡Listo!** Una vez desplegadas, los administradores podrán gestionar emails de cualquier usuario. 🎉


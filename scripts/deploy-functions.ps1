# Script para desplegar Edge Functions de Supabase
# Requiere Supabase CLI instalado

Write-Host "Desplegando Edge Functions..." -ForegroundColor Cyan

# Verificar si Supabase CLI esta instalado
$supabaseInstalled = Get-Command supabase -ErrorAction SilentlyContinue

if (-not $supabaseInstalled) {
    Write-Host "[ERROR] Supabase CLI no esta instalado." -ForegroundColor Red
    Write-Host ""
    Write-Host "Opciones para instalar:" -ForegroundColor Yellow
    Write-Host "1. Usando Scoop (recomendado para Windows):" -ForegroundColor White
    Write-Host "   scoop bucket add supabase https://github.com/supabase/scoop-bucket.git" -ForegroundColor Gray
    Write-Host "   scoop install supabase" -ForegroundColor Gray
    Write-Host ""
    Write-Host "2. Descargar desde: https://github.com/supabase/cli/releases" -ForegroundColor White
    Write-Host ""
    Write-Host "3. O usar npx (no requiere instalacion global):" -ForegroundColor White
    Write-Host "   npx supabase@latest functions deploy" -ForegroundColor Gray
    Write-Host ""
    exit 1
}

# Verificar si esta logueado
Write-Host "Verificando autenticacion..." -ForegroundColor Cyan
$projects = supabase projects list 2>&1

if ($LASTEXITCODE -ne 0) {
    Write-Host "[AVISO] No estas autenticado. Ejecuta: supabase login" -ForegroundColor Yellow
    Write-Host "Intentando iniciar sesion..." -ForegroundColor Cyan
    supabase login
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[ERROR] Error al iniciar sesion" -ForegroundColor Red
        exit 1
    }
}

# Verificar si el proyecto esta enlazado
if (-not (Test-Path ".supabase\config.toml")) {
    Write-Host "[AVISO] El proyecto no esta enlazado." -ForegroundColor Yellow
    Write-Host "Necesitas el Project Ref de tu proyecto Supabase." -ForegroundColor White
    Write-Host "Encuentralo en: Dashboard -> Settings -> API -> Reference ID" -ForegroundColor Gray
    Write-Host ""
    $projectRef = Read-Host "Ingresa tu Project Ref"
    
    if ([string]::IsNullOrWhiteSpace($projectRef)) {
        Write-Host "[ERROR] Project Ref es requerido" -ForegroundColor Red
        exit 1
    }
    
    Write-Host "Enlazando proyecto..." -ForegroundColor Cyan
    supabase link --project-ref $projectRef
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[ERROR] Error al enlazar proyecto" -ForegroundColor Red
        exit 1
    }
}

# Desplegar funciones
Write-Host ""
Write-Host "Desplegando funciones..." -ForegroundColor Cyan
Write-Host ""

# Desplegar get-user-email
Write-Host "Desplegando get-user-email..." -ForegroundColor Yellow
supabase functions deploy get-user-email
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Error al desplegar get-user-email" -ForegroundColor Red
    exit 1
}

Write-Host "[OK] get-user-email desplegada correctamente" -ForegroundColor Green
Write-Host ""

# Desplegar update-user-email
Write-Host "Desplegando update-user-email..." -ForegroundColor Yellow
supabase functions deploy update-user-email
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Error al desplegar update-user-email" -ForegroundColor Red
    exit 1
}

Write-Host "[OK] update-user-email desplegada correctamente" -ForegroundColor Green
Write-Host ""

Write-Host "[EXITO] Todas las funciones han sido desplegadas exitosamente!" -ForegroundColor Green
Write-Host ""
Write-Host "Puedes verificar las funciones en:" -ForegroundColor Cyan
Write-Host "Dashboard de Supabase -> Edge Functions" -ForegroundColor White

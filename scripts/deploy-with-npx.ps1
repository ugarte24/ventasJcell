# Script para desplegar Edge Functions usando npx (no requiere instalacion global)
# Este script usa npx para ejecutar Supabase CLI sin instalarlo globalmente

Write-Host "Desplegando Edge Functions usando npx..." -ForegroundColor Cyan
Write-Host ""

# Verificar autenticacion
Write-Host "Verificando autenticacion..." -ForegroundColor Cyan
$projects = npx supabase@latest projects list 2>&1

if ($LASTEXITCODE -ne 0) {
    Write-Host "[AVISO] No estas autenticado." -ForegroundColor Yellow
    Write-Host "Iniciando sesion..." -ForegroundColor Cyan
    npx supabase@latest login
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[ERROR] Error al iniciar sesion" -ForegroundColor Red
        exit 1
    }
}

# Verificar si el proyecto esta enlazado
if (-not (Test-Path ".supabase\config.toml")) {
    Write-Host "[AVISO] El proyecto no esta enlazado." -ForegroundColor Yellow
    Write-Host "Necesitas el Project Ref de tu proyecto Supabase." -ForegroundColor White
    Write-Host "Encuentralo en la URL: https://[project-ref].supabase.co" -ForegroundColor Gray
    Write-Host "Ejemplo: Si tu URL es https://tu-project-ref.supabase.co" -ForegroundColor Gray
    Write-Host "         entonces tu Project Ref es: tu-project-ref" -ForegroundColor Gray
    Write-Host ""
    $projectRef = Read-Host "Ingresa tu Project Ref"
    
    if ([string]::IsNullOrWhiteSpace($projectRef)) {
        Write-Host "[ERROR] Project Ref es requerido" -ForegroundColor Red
        exit 1
    }
    
    Write-Host "Enlazando proyecto..." -ForegroundColor Cyan
    npx supabase@latest link --project-ref $projectRef
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
npx supabase@latest functions deploy get-user-email
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Error al desplegar get-user-email" -ForegroundColor Red
    exit 1
}

Write-Host "[OK] get-user-email desplegada correctamente" -ForegroundColor Green
Write-Host ""

# Desplegar update-user-email
Write-Host "Desplegando update-user-email..." -ForegroundColor Yellow
npx supabase@latest functions deploy update-user-email
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

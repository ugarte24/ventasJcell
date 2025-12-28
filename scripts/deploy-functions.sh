#!/bin/bash
# Script para desplegar Edge Functions de Supabase

echo "🚀 Desplegando Edge Functions..."

# Verificar si Supabase CLI está instalado
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI no está instalado."
    echo ""
    echo "Instala con uno de estos métodos:"
    echo "1. npm: npm install -g supabase"
    echo "2. Homebrew (macOS): brew install supabase/tap/supabase"
    echo "3. O usa npx: npx supabase@latest functions deploy"
    exit 1
fi

# Verificar si está logueado
echo "Verificando autenticación..."
if ! supabase projects list &> /dev/null; then
    echo "⚠️  No estás autenticado. Ejecuta: supabase login"
    supabase login
    if [ $? -ne 0 ]; then
        echo "❌ Error al iniciar sesión"
        exit 1
    fi
fi

# Verificar si el proyecto está enlazado
if [ ! -f ".supabase/config.toml" ]; then
    echo "⚠️  El proyecto no está enlazado."
    echo "Necesitas el Project Ref de tu proyecto Supabase."
    echo "Encuentralo en: Dashboard -> Settings -> API -> Reference ID"
    echo ""
    read -p "Ingresa tu Project Ref: " project_ref
    
    if [ -z "$project_ref" ]; then
        echo "❌ Project Ref es requerido"
        exit 1
    fi
    
    echo "Enlazando proyecto..."
    supabase link --project-ref "$project_ref"
    if [ $? -ne 0 ]; then
        echo "❌ Error al enlazar proyecto"
        exit 1
    fi
fi

# Desplegar funciones
echo ""
echo "📦 Desplegando funciones..."
echo ""

# Desplegar get-user-email
echo "Desplegando get-user-email..."
supabase functions deploy get-user-email
if [ $? -ne 0 ]; then
    echo "❌ Error al desplegar get-user-email"
    exit 1
fi

echo "✅ get-user-email desplegada correctamente"
echo ""

# Desplegar update-user-email
echo "Desplegando update-user-email..."
supabase functions deploy update-user-email
if [ $? -ne 0 ]; then
    echo "❌ Error al desplegar update-user-email"
    exit 1
fi

echo "✅ update-user-email desplegada correctamente"
echo ""

echo "🎉 ¡Todas las funciones han sido desplegadas exitosamente!"
echo ""
echo "Puedes verificar las funciones en:"
echo "Dashboard de Supabase -> Edge Functions"


-- ============================================================================
-- MIGRACIÓN: Otorgar permisos de ejecución a la función is_admin_active
-- ============================================================================
-- Fecha: 2025-01-XX
-- Descripción: Asegura que todos los usuarios autenticados puedan ejecutar
--              la función is_admin_active() en el contexto de políticas RLS
-- ============================================================================

-- Otorgar permisos de ejecución a usuarios autenticados
GRANT EXECUTE ON FUNCTION is_admin_active() TO authenticated;
GRANT EXECUTE ON FUNCTION is_admin_active() TO anon;

-- ============================================================================
-- FIN DE LA MIGRACIÓN
-- ============================================================================

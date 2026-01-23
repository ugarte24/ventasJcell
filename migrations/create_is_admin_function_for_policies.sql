-- ============================================================================
-- MIGRACIÓN: Crear función helper para verificar si el usuario es admin
-- ============================================================================
-- Fecha: 2025-01-XX
-- Descripción: Crea una función helper que simplifica la verificación de admin
--              en las políticas RLS. Usa SECURITY DEFINER para mejor evaluación.
-- ============================================================================

-- Crear función para verificar si el usuario actual es admin activo
CREATE OR REPLACE FUNCTION is_admin_active()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM usuarios
    WHERE id = auth.uid()
    AND rol = 'admin'
    AND estado = 'activo'
  );
$$;

-- Comentario para la función
COMMENT ON FUNCTION is_admin_active() IS 'Verifica si el usuario actual es un administrador activo';

-- ============================================================================
-- FIN DE LA MIGRACIÓN
-- ============================================================================

-- ============================================================================
-- MIGRACIÓN: Crear función para verificar si el usuario es mayorista activo
-- ============================================================================
-- Fecha: 2025-01-XX
-- Descripción: Similar a check_user_is_admin pero para mayoristas
--              Usa SECURITY DEFINER para leer usuarios sin pasar por RLS
-- ============================================================================

-- Crear función que verifica si el usuario actual es mayorista activo
CREATE OR REPLACE FUNCTION public.check_user_is_mayorista()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  user_id UUID;
  user_rol VARCHAR;
  user_estado VARCHAR;
BEGIN
  -- Obtener el ID del usuario autenticado
  user_id := auth.uid();
  
  -- Si no hay usuario autenticado, retornar false
  IF user_id IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Obtener rol y estado del usuario (SECURITY DEFINER permite leer sin RLS)
  SELECT rol, estado INTO user_rol, user_estado
  FROM public.usuarios
  WHERE id = user_id
  LIMIT 1;
  
  -- Si no se encontró el usuario, retornar false
  IF user_rol IS NULL OR user_estado IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Verificar si es mayorista activo
  RETURN (LOWER(TRIM(user_rol)) = 'mayorista' AND LOWER(TRIM(user_estado)) = 'activo');
END;
$$;

-- Otorgar permisos
GRANT EXECUTE ON FUNCTION public.check_user_is_mayorista() TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_user_is_mayorista() TO anon;
GRANT EXECUTE ON FUNCTION public.check_user_is_mayorista() TO service_role;

-- Comentario
COMMENT ON FUNCTION public.check_user_is_mayorista() IS 'Verifica si el usuario actual es un mayorista activo. Usa SECURITY DEFINER para leer usuarios sin pasar por RLS.';

-- ============================================================================
-- FIN DE LA MIGRACIÓN
-- ============================================================================

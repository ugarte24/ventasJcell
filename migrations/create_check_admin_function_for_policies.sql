-- ============================================================================
-- MIGRACIÓN: Crear función SECURITY DEFINER para verificar admin
-- ============================================================================
-- Fecha: 2025-01-XX
-- Descripción: Esta función puede leer la tabla usuarios sin pasar por RLS
--              usando SECURITY DEFINER, lo que permite verificar el rol del
--              usuario incluso cuando las políticas RLS de usuarios son restrictivas
-- ============================================================================

-- Crear función que verifica si el usuario actual es admin
CREATE OR REPLACE FUNCTION public.check_user_is_admin()
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
  
  -- Verificar si es admin activo
  RETURN (LOWER(TRIM(user_rol)) = 'admin' AND LOWER(TRIM(user_estado)) = 'activo');
END;
$$;

-- Otorgar permisos
GRANT EXECUTE ON FUNCTION public.check_user_is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_user_is_admin() TO anon;
GRANT EXECUTE ON FUNCTION public.check_user_is_admin() TO service_role;

-- Comentario
COMMENT ON FUNCTION public.check_user_is_admin() IS 'Verifica si el usuario actual es admin activo. Usa SECURITY DEFINER para leer usuarios sin pasar por RLS.';

-- ============================================================================
-- FIN DE LA MIGRACIÓN
-- ============================================================================

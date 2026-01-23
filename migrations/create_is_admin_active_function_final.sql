-- ============================================================================
-- MIGRACIÓN: Crear función is_admin_active (versión final)
-- ============================================================================
-- Fecha: 2025-01-XX
-- Descripción: Asegurar que la función existe y está correctamente configurada
--              con todos los permisos necesarios
-- ============================================================================

-- Eliminar función si existe (por si acaso)
DROP FUNCTION IF EXISTS public.is_admin_active() CASCADE;

-- Crear función con mejor implementación
CREATE OR REPLACE FUNCTION public.is_admin_active()
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
  
  -- Obtener rol y estado del usuario
  SELECT rol, estado INTO user_rol, user_estado
  FROM public.usuarios
  WHERE id = user_id
  LIMIT 1;
  
  -- Si no se encontró el usuario, retornar false
  IF user_rol IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Verificar si es admin activo
  RETURN (user_rol = 'admin' AND user_estado = 'activo');
END;
$$;

-- Otorgar permisos de ejecución
GRANT EXECUTE ON FUNCTION public.is_admin_active() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin_active() TO anon;
GRANT EXECUTE ON FUNCTION public.is_admin_active() TO service_role;

-- Comentario para la función
COMMENT ON FUNCTION public.is_admin_active() IS 'Verifica si el usuario actual es un administrador activo. Usa SECURITY DEFINER para ejecutarse con privilegios del creador.';

-- ============================================================================
-- FIN DE LA MIGRACIÓN
-- ============================================================================

-- ============================================================================
-- MIGRACIÓN: Corregir política de INSERT para ventas_mayoristas
-- ============================================================================
-- Fecha: 2025-01-24
-- Descripción: Asegurar que mayoristas y administradores puedan crear ventas
--              en ventas_mayoristas sin problemas de RLS
-- ============================================================================

-- Asegurar que la función check_user_is_mayorista existe y tiene permisos
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
  user_id := auth.uid();
  
  IF user_id IS NULL THEN
    RETURN FALSE;
  END IF;
  
  SELECT rol, estado INTO user_rol, user_estado
  FROM public.usuarios
  WHERE id = user_id
  LIMIT 1;
  
  IF user_rol IS NULL OR user_estado IS NULL THEN
    RETURN FALSE;
  END IF;
  
  RETURN (LOWER(TRIM(user_rol)) = 'mayorista' AND LOWER(TRIM(user_estado)) = 'activo');
END;
$$;

-- Otorgar permisos de ejecución
GRANT EXECUTE ON FUNCTION public.check_user_is_mayorista() TO authenticated, anon, service_role;

-- Asegurar que la función check_user_is_admin existe (por si acaso)
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
  user_id := auth.uid();
  
  IF user_id IS NULL THEN
    RETURN FALSE;
  END IF;
  
  SELECT rol, estado INTO user_rol, user_estado
  FROM public.usuarios
  WHERE id = user_id
  LIMIT 1;
  
  IF user_rol IS NULL OR user_estado IS NULL THEN
    RETURN FALSE;
  END IF;
  
  RETURN (LOWER(TRIM(user_rol)) = 'admin' AND LOWER(TRIM(user_estado)) = 'activo');
END;
$$;

-- Otorgar permisos de ejecución
GRANT EXECUTE ON FUNCTION public.check_user_is_admin() TO authenticated, anon, service_role;

-- Eliminar políticas existentes de INSERT para ventas_mayoristas
DROP POLICY IF EXISTS "Mayoristas pueden crear sus propias ventas" ON ventas_mayoristas;
DROP POLICY IF EXISTS "Administradores pueden crear ventas mayoristas" ON ventas_mayoristas;

-- Crear política para mayoristas: pueden crear sus propias ventas
CREATE POLICY "Mayoristas pueden crear sus propias ventas"
  ON ventas_mayoristas FOR INSERT
  WITH CHECK (
    (id_mayorista::text = auth.uid()::text)
    AND public.check_user_is_mayorista()
  );

-- Crear política para administradores: pueden crear ventas para cualquier mayorista
CREATE POLICY "Administradores pueden crear ventas mayoristas"
  ON ventas_mayoristas FOR INSERT
  WITH CHECK (public.check_user_is_admin());

-- ============================================================================
-- FIN DE LA MIGRACIÓN
-- ============================================================================

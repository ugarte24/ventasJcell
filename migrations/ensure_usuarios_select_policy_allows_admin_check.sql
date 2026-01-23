-- ============================================================================
-- MIGRACIÓN: Asegurar que las políticas de usuarios permitan verificación
-- ============================================================================
-- Fecha: 2025-01-XX
-- Descripción: Las políticas RLS de usuarios deben permitir que las políticas
--              de otras tablas puedan verificar el rol y estado del usuario
-- ============================================================================

-- Verificar si existe una política que permita a usuarios autenticados ver usuarios
-- Si no existe, crearla
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'usuarios' 
    AND policyname = 'Usuarios autenticados pueden ver usuarios para verificación'
  ) THEN
    CREATE POLICY "Usuarios autenticados pueden ver usuarios para verificación"
      ON usuarios FOR SELECT
      USING (auth.role() = 'authenticated');
  END IF;
END $$;

-- ============================================================================
-- FIN DE LA MIGRACIÓN
-- ============================================================================

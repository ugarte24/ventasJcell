-- ============================================================================
-- MIGRACIÓN: Corregir política de SELECT en usuarios para RLS
-- ============================================================================
-- Fecha: 2025-01-XX
-- Descripción: Asegurar que las políticas de otras tablas puedan verificar
--              el rol del usuario. La política debe permitir que usuarios
--              autenticados puedan ver otros usuarios para verificación RLS.
-- ============================================================================

-- Verificar y recrear la política si es necesario
DROP POLICY IF EXISTS "Usuarios autenticados pueden ver usuarios para verificación" ON usuarios;

-- Crear política que permita a usuarios autenticados ver otros usuarios
-- Esto es necesario para que las políticas RLS de otras tablas puedan
-- verificar el rol del usuario
CREATE POLICY "Usuarios autenticados pueden ver usuarios para verificación"
  ON usuarios FOR SELECT
  USING (
    auth.role() = 'authenticated'
    OR EXISTS (
      SELECT 1 FROM usuarios u
      WHERE u.id = auth.uid()
      AND u.rol = 'admin'
      AND u.estado = 'activo'
    )
  );

-- ============================================================================
-- FIN DE LA MIGRACIÓN
-- ============================================================================

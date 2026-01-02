-- ============================================================================
-- FIX: Agregar WITH CHECK a la política de UPDATE de usuarios
-- ============================================================================
-- La política actual solo tiene USING, pero necesita WITH CHECK para permitir
-- que los administradores puedan actualizar usuarios (incluyendo cambiar roles)

-- Eliminar la política existente
DROP POLICY IF EXISTS "Solo admins pueden actualizar usuarios" ON usuarios;

-- Crear la política con USING y WITH CHECK
CREATE POLICY "Solo admins pueden actualizar usuarios"
  ON usuarios FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE usuarios.id::text = auth.uid()::text
      AND usuarios.rol = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE usuarios.id::text = auth.uid()::text
      AND usuarios.rol = 'admin'
    )
  );


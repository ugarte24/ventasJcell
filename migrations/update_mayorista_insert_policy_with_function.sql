-- ============================================================================
-- MIGRACIÓN: Actualizar política de INSERT para mayoristas usando función
-- ============================================================================
-- Fecha: 2025-01-XX
-- Descripción: Usar función SECURITY DEFINER en lugar de consulta directa
--              para evitar problemas con políticas RLS de usuarios
-- ============================================================================

-- Eliminar política existente
DROP POLICY IF EXISTS "Mayoristas pueden crear sus propias ventas" ON ventas_mayoristas;

-- Crear política usando la función check_user_is_mayorista
CREATE POLICY "Mayoristas pueden crear sus propias ventas"
  ON ventas_mayoristas FOR INSERT
  WITH CHECK (
    id_mayorista::text = auth.uid()::text
    AND public.check_user_is_mayorista()
  );

-- ============================================================================
-- FIN DE LA MIGRACIÓN
-- ============================================================================

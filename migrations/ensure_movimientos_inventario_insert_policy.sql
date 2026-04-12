-- Si RLS está activo en movimientos_inventario pero no hay política de INSERT,
-- PostgREST rechaza los inserts (p. ej. al ajustar stock desde Productos).
-- Ejecutar en Supabase SQL Editor si los ajustes de stock fallan al registrar el movimiento.

DROP POLICY IF EXISTS "Los usuarios autenticados pueden crear movimientos de inventario"
  ON movimientos_inventario;

CREATE POLICY "Los usuarios autenticados pueden crear movimientos de inventario"
  ON movimientos_inventario
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated'::text);

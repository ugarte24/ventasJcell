-- Corregir política de INSERT para detalle_venta
-- Asegurar que los usuarios autenticados puedan crear detalles de venta

-- Eliminar la política existente si existe
DROP POLICY IF EXISTS "Los usuarios autenticados pueden crear detalles de venta" ON detalle_venta;

-- Crear una política más robusta que verifique:
-- 1. Que el usuario esté autenticado
-- 2. Que la venta asociada exista y pertenezca al usuario o sea admin
CREATE POLICY "Los usuarios autenticados pueden crear detalles de venta"
  ON detalle_venta FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated'::text
    AND EXISTS (
      SELECT 1 FROM ventas
      WHERE ventas.id = detalle_venta.id_venta
      AND (
        ventas.id_vendedor::text = auth.uid()::text
        OR EXISTS (
          SELECT 1 FROM usuarios
          WHERE usuarios.id::text = auth.uid()::text
          AND usuarios.rol::text = 'admin'::text
          AND usuarios.estado::text = 'activo'::text
        )
      )
    )
  );

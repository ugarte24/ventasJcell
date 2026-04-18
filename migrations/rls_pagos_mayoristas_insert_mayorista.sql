-- Permitir que el mayorista registre su pago pendiente al finalizar venta.
-- Antes solo existía SELECT para mayorista + FOR ALL para admin, sin INSERT para mayorista.

DROP POLICY IF EXISTS "Mayoristas pueden crear su pago pendiente" ON public.pagos_mayoristas;

CREATE POLICY "Mayoristas pueden crear su pago pendiente"
  ON public.pagos_mayoristas
  FOR INSERT
  WITH CHECK (
    auth.uid() = id_mayorista
    AND EXISTS (
      SELECT 1
      FROM public.usuarios u
      WHERE u.id = auth.uid()
        AND u.rol = 'mayorista'
        AND u.estado = 'activo'
    )
    AND EXISTS (
      SELECT 1
      FROM public.ventas v
      WHERE v.id = pagos_mayoristas.id_venta
        AND v.id_vendedor = auth.uid()
    )
    AND estado = 'pendiente'
    AND COALESCE(monto_recibido, 0) = 0
  );

COMMENT ON POLICY "Mayoristas pueden crear su pago pendiente" ON public.pagos_mayoristas IS
  'El mayorista inserta el registro pendiente tras finalizar venta; el admin lo verifica después.';

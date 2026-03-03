-- Agregar política de INSERT para movimientos_inventario
-- Esto permite que los triggers y usuarios autenticados puedan crear movimientos de inventario

-- Crear política de INSERT para movimientos_inventario
CREATE POLICY "Los usuarios autenticados pueden crear movimientos de inventario"
  ON movimientos_inventario FOR INSERT
  WITH CHECK (auth.role() = 'authenticated'::text);

-- También necesitamos asegurarnos de que la función actualizar_stock_venta pueda insertar
-- La función ya debería funcionar con la política anterior, pero podemos hacerla SECURITY DEFINER
-- para mayor seguridad y para que funcione incluso si el usuario no tiene permisos directos

-- Recrear la función con SECURITY DEFINER para que pueda insertar sin problemas de RLS
CREATE OR REPLACE FUNCTION actualizar_stock_venta()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
BEGIN
  -- Reducir stock del producto
  UPDATE productos
  SET stock_actual = stock_actual - NEW.cantidad,
      updated_at = timezone('utc'::text, now())
  WHERE id = NEW.id_producto;
  
  -- Registrar movimiento de inventario
  INSERT INTO movimientos_inventario (
    id_producto,
    tipo,
    cantidad,
    cantidad_anterior,
    cantidad_nueva,
    motivo,
    id_usuario
  )
  SELECT 
    NEW.id_producto,
    'salida',
    NEW.cantidad,
    p.stock_actual + NEW.cantidad, -- Stock antes de la venta
    p.stock_actual, -- Stock después de la venta
    'Venta #' || NEW.id_venta::text,
    v.id_vendedor
  FROM productos p
  CROSS JOIN ventas v
  WHERE p.id = NEW.id_producto
    AND v.id = NEW.id_venta;
  
  RETURN NEW;
END;
$$;

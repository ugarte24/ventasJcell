-- ============================================================================
-- Transferencias QR destino: marcar cuando el destino ya creó el pedido
-- "Completar saldos" (productos vendidos por el origen). El botón en Nueva venta
-- solo debe ocultarse tras ese paso, no antes.
-- ============================================================================

ALTER TABLE public.transferencias_saldos
  ADD COLUMN IF NOT EXISTS pedido_completar_saldos_origen_aplicado boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.transferencias_saldos.pedido_completar_saldos_origen_aplicado IS
  'True cuando el minorista destino ya creó el pedido desde Completar saldos para esa transferencia.';

-- Actualizar RPC de cantidades: no devolver líneas si ya se aplicó el pedido para esa transfer.
CREATE OR REPLACE FUNCTION public.cantidades_vendidas_origen_transfer_destino(p_fecha date)
RETURNS TABLE (id_producto uuid, cantidad bigint)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_origen uuid;
  v_fecha_venta_origen date;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'No autenticado';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM usuarios
    WHERE id = auth.uid() AND rol = 'minorista' AND estado = 'activo'
  ) THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;

  SELECT t.id_minorista_origen, v.fecha
  INTO v_origen, v_fecha_venta_origen
  FROM transferencias_saldos t
  INNER JOIN ventas v ON v.id = t.id_venta_origen
  WHERE t.id_minorista_destino = auth.uid()
    AND t.estado = 'completada'
    AND t.fecha_escaneo IS NOT NULL
    AND (t.fecha_escaneo AT TIME ZONE 'UTC')::date = p_fecha
    AND COALESCE(t.pedido_completar_saldos_origen_aplicado, false) = false
  ORDER BY t.fecha_escaneo DESC
  LIMIT 1;

  IF v_origen IS NULL OR v_fecha_venta_origen IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT vm.id_producto, SUM(vm.cantidad_vendida)::bigint AS cantidad
  FROM ventas_minoristas vm
  WHERE vm.id_minorista = v_origen
    AND vm.fecha = v_fecha_venta_origen
    AND vm.cantidad_vendida > 0
  GROUP BY vm.id_producto;
END;
$$;

COMMENT ON FUNCTION public.cantidades_vendidas_origen_transfer_destino(date) IS
  'Minorista destino: última transferencia QR completada en p_fecha sin pedido_completar_saldos_origen_aplicado; suma cantidad_vendida del origen por fecha de venta origen.';

-- Marcar la misma fila que usa la RPC de cantidades (última transfer del día sin flag).
CREATE OR REPLACE FUNCTION public.marcar_transferencia_pedido_completar_saldos_origen(p_fecha date)
RETURNS void
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'No autenticado';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM usuarios
    WHERE id = auth.uid() AND rol = 'minorista' AND estado = 'activo'
  ) THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;

  SELECT t.id INTO v_id
  FROM transferencias_saldos t
  WHERE t.id_minorista_destino = auth.uid()
    AND t.estado = 'completada'
    AND t.fecha_escaneo IS NOT NULL
    AND (t.fecha_escaneo AT TIME ZONE 'UTC')::date = p_fecha
    AND COALESCE(t.pedido_completar_saldos_origen_aplicado, false) = false
  ORDER BY t.fecha_escaneo DESC
  LIMIT 1;

  IF v_id IS NULL THEN
    RETURN;
  END IF;

  UPDATE public.transferencias_saldos
  SET
    pedido_completar_saldos_origen_aplicado = true,
    updated_at = timezone('utc'::text, now())
  WHERE id = v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.marcar_transferencia_pedido_completar_saldos_origen(date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.marcar_transferencia_pedido_completar_saldos_origen(date) TO authenticated;

COMMENT ON FUNCTION public.marcar_transferencia_pedido_completar_saldos_origen(date) IS
  'Minorista destino: marca pedido_completar_saldos_origen_aplicado en la última transferencia completada del día p_fecha que aún no tenía el flag.';

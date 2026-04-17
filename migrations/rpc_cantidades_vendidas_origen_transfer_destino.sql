-- ============================================================================
-- RPC: cantidades vendidas del minorista ORIGEN (transferencia QR) para pedido
-- El destino no puede leer ventas_minoristas del origen por RLS; esta función
-- valida transferencia completada el día de escaneo p_fecha y devuelve agregados.
-- Las ventas del origen se filtran por la FECHA DE LA VENTA ORIGEN (ventas.fecha
-- de id_venta_origen), no por p_fecha: el origen puede haber cerrado en otro día
-- y el destino escanear hoy.
-- Convención fecha_escaneo: getLocalDateTimeISO() (+00:00 con componentes locales).
-- ============================================================================

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

REVOKE ALL ON FUNCTION public.cantidades_vendidas_origen_transfer_destino(date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cantidades_vendidas_origen_transfer_destino(date) TO authenticated;

COMMENT ON FUNCTION public.cantidades_vendidas_origen_transfer_destino(date) IS
  'Minorista destino: última transferencia QR completada en p_fecha sin pedido_completar_saldos_origen_aplicado; suma cantidad_vendida por producto del origen (fecha venta = ventas.fecha de id_venta_origen).';

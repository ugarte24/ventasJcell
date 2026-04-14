-- Corrige RLS de escaneo QR en transferencias_saldos.
-- Problema: la policy original de UPDATE exigía auth.uid() = id_minorista_destino,
-- pero al crear el QR ese campo se guarda temporalmente con el origen.
-- Resultado: el destino real no podía escanear/completar.

-- SELECT: permitir leer pendientes para escaneo a minoristas distintos del origen.
DROP POLICY IF EXISTS "Minoristas pueden ver sus transferencias" ON public.transferencias_saldos;

CREATE POLICY "Minoristas pueden ver sus transferencias"
  ON public.transferencias_saldos
  FOR SELECT
  USING (
    auth.uid() = id_minorista_origen
    OR auth.uid() = id_minorista_destino
    OR public.check_user_is_admin()
    OR (
      estado = 'pendiente'
      AND auth.uid() IS NOT NULL
      AND auth.uid() <> id_minorista_origen
      AND EXISTS (
        SELECT 1
        FROM public.usuarios u
        WHERE u.id = auth.uid()
          AND u.rol = 'minorista'
      )
    )
  );

-- UPDATE: permitir que el destino real complete una pendiente (autoscaneo bloqueado).
DROP POLICY IF EXISTS "Minoristas pueden escanear transferencias" ON public.transferencias_saldos;

CREATE POLICY "Minoristas pueden escanear transferencias"
  ON public.transferencias_saldos
  FOR UPDATE
  USING (
    estado = 'pendiente'
    AND auth.uid() IS NOT NULL
    AND auth.uid() <> id_minorista_origen
    AND EXISTS (
      SELECT 1
      FROM public.usuarios u
      WHERE u.id = auth.uid()
        AND u.rol = 'minorista'
    )
  )
  WITH CHECK (
    estado = 'completada'
    AND id_minorista_destino = auth.uid()
    AND auth.uid() <> id_minorista_origen
  );

COMMENT ON POLICY "Minoristas pueden escanear transferencias" ON public.transferencias_saldos IS
  'Permite que un minorista destino (distinto del origen) complete una transferencia pendiente al escanear QR.';

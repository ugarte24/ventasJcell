-- Jornada del día iniciada por el minorista (sincronizada entre dispositivos; reemplaza localStorage).

CREATE TABLE IF NOT EXISTS public.minorista_jornada_diaria (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  id_minorista uuid NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
  fecha date NOT NULL,
  iniciada_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (id_minorista, fecha)
);

CREATE INDEX IF NOT EXISTS idx_minorista_jornada_diaria_fecha ON public.minorista_jornada_diaria(fecha);
CREATE INDEX IF NOT EXISTS idx_minorista_jornada_diaria_minorista ON public.minorista_jornada_diaria(id_minorista);

COMMENT ON TABLE public.minorista_jornada_diaria IS 'Por minorista y fecha: marca que inició la jornada (Nueva venta o escaneo QR de saldos).';
COMMENT ON COLUMN public.minorista_jornada_diaria.iniciada_at IS 'Momento en que se registró el inicio de jornada para esa fecha.';

DROP TRIGGER IF EXISTS update_minorista_jornada_diaria_updated_at ON public.minorista_jornada_diaria;
CREATE TRIGGER update_minorista_jornada_diaria_updated_at
  BEFORE UPDATE ON public.minorista_jornada_diaria
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.minorista_jornada_diaria ENABLE ROW LEVEL SECURITY;

CREATE POLICY "minorista_jornada_diaria_select_own_or_admin"
  ON public.minorista_jornada_diaria
  FOR SELECT
  USING (
    auth.uid() = id_minorista
    OR public.check_user_is_admin()
  );

CREATE POLICY "minorista_jornada_diaria_insert_own"
  ON public.minorista_jornada_diaria
  FOR INSERT
  WITH CHECK (auth.uid() = id_minorista);

CREATE POLICY "minorista_jornada_diaria_update_own"
  ON public.minorista_jornada_diaria
  FOR UPDATE
  USING (auth.uid() = id_minorista)
  WITH CHECK (auth.uid() = id_minorista);

CREATE POLICY "minorista_jornada_diaria_delete_admin"
  ON public.minorista_jornada_diaria
  FOR DELETE
  USING (public.check_user_is_admin());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.minorista_jornada_diaria TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.minorista_jornada_diaria TO service_role;

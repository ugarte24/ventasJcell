-- Control diario por usuario (mayorista/minorista): habilitación de pedidos solo para la fecha indicada
-- y registro de efectivo entregado vs esperado (ventas en efectivo del día).

CREATE TABLE IF NOT EXISTS public.usuario_control_diario (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  id_usuario uuid NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
  fecha date NOT NULL,
  pedidos_habilitado boolean NOT NULL DEFAULT false,
  efectivo_entregado numeric(12, 2) NOT NULL DEFAULT 0 CHECK (efectivo_entregado >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (id_usuario, fecha)
);

CREATE INDEX IF NOT EXISTS idx_usuario_control_diario_fecha ON public.usuario_control_diario(fecha);
CREATE INDEX IF NOT EXISTS idx_usuario_control_diario_usuario ON public.usuario_control_diario(id_usuario);

COMMENT ON TABLE public.usuario_control_diario IS 'Por usuario y fecha: permitir pedidos solo ese día y efectivo entregado al cierre.';
COMMENT ON COLUMN public.usuario_control_diario.pedidos_habilitado IS 'Si es true solo aplica el día fecha (comparar con CURRENT_DATE en la app).';
COMMENT ON COLUMN public.usuario_control_diario.efectivo_entregado IS 'Efectivo físico entregado por el usuario ese día (registrado por admin).';

DROP TRIGGER IF EXISTS update_usuario_control_diario_updated_at ON public.usuario_control_diario;
CREATE TRIGGER update_usuario_control_diario_updated_at
  BEFORE UPDATE ON public.usuario_control_diario
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.usuario_control_diario ENABLE ROW LEVEL SECURITY;

-- Lectura: el propio usuario o admin
CREATE POLICY "usuario_control_diario_select_own_or_admin"
  ON public.usuario_control_diario
  FOR SELECT
  USING (
    auth.uid() = id_usuario
    OR public.check_user_is_admin()
  );

-- Escritura: solo admin
CREATE POLICY "usuario_control_diario_admin_insert"
  ON public.usuario_control_diario
  FOR INSERT
  WITH CHECK (public.check_user_is_admin());

CREATE POLICY "usuario_control_diario_admin_update"
  ON public.usuario_control_diario
  FOR UPDATE
  USING (public.check_user_is_admin())
  WITH CHECK (public.check_user_is_admin());

CREATE POLICY "usuario_control_diario_admin_delete"
  ON public.usuario_control_diario
  FOR DELETE
  USING (public.check_user_is_admin());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.usuario_control_diario TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.usuario_control_diario TO service_role;

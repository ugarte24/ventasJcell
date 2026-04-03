-- Permite bloquear al minorista la edición de saldos en Nueva venta tras finalizar;
-- el administrador puede volver a habilitar la edición desde Gestión de usuarios.

ALTER TABLE public.usuarios
  ADD COLUMN IF NOT EXISTS edicion_preregistro_nueva_venta_permitida boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN public.usuarios.edicion_preregistro_nueva_venta_permitida IS
  'Si es false, el minorista no puede editar saldos en Nueva venta hasta que un admin lo habilite.';

-- El minorista no puede hacer UPDATE directo en usuarios (solo admin). Esta RPC corre con privilegios del definidor.
CREATE OR REPLACE FUNCTION public.minorista_set_edicion_preregistro_permitida(p_permitida boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.usuarios u
  SET
    edicion_preregistro_nueva_venta_permitida = p_permitida,
    updated_at = timezone('utc'::text, now())
  WHERE u.id = auth.uid()
    AND u.rol = 'minorista'
    AND u.estado = 'activo';
END;
$$;

REVOKE ALL ON FUNCTION public.minorista_set_edicion_preregistro_permitida(boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.minorista_set_edicion_preregistro_permitida(boolean) TO authenticated;

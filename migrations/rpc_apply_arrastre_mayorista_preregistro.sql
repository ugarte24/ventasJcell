-- Arrastre post-venta mayorista: cantidad inicial y saldo quedan iguales al saldo restante.
-- SECURITY DEFINER por si las políticas RLS del entorno limitan columnas.
--
-- Importante: usar "variable := (SELECT ...)" en lugar de "SELECT ... INTO variable".
-- Fuera de PL/pgSQL, "SELECT ... INTO nombre" crea una TABLA llamada nombre, no asigna
-- variables (y en editores que parten el script mal puede interpretarse así).

CREATE OR REPLACE FUNCTION public.apply_arrastre_mayorista_preregistro(
  p_preregistro_id uuid,
  p_nueva_cantidad integer
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $func$
DECLARE
  l_owner uuid;
BEGIN
  IF p_nueva_cantidad IS NULL OR p_nueva_cantidad < 0 THEN
    RAISE EXCEPTION 'cantidad inválida';
  END IF;

  l_owner := (
    SELECT pm.id_mayorista
    FROM public.preregistros_mayorista pm
    WHERE pm.id = p_preregistro_id
  );

  IF l_owner IS NULL THEN
    RAISE EXCEPTION 'Preregistro no encontrado';
  END IF;

  IF l_owner IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.usuarios u
    WHERE u.id = auth.uid()
      AND u.rol = 'mayorista'
      AND u.estado = 'activo'
  ) THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;

  UPDATE public.preregistros_mayorista pm
  SET
    cantidad = p_nueva_cantidad,
    cantidad_restante = p_nueva_cantidad,
    updated_at = timezone('utc'::text, now())
  WHERE pm.id = p_preregistro_id;
END;
$func$;

REVOKE ALL ON FUNCTION public.apply_arrastre_mayorista_preregistro(uuid, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.apply_arrastre_mayorista_preregistro(uuid, integer) TO authenticated;

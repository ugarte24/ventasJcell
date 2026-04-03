-- Inferencia de "venta finalizada del día" en el cliente:
-- - NULL = sin bloqueo explícito en BD; si hay ventas_minoristas desde Nueva venta ese día → UI bloqueada.
-- - false = bloqueado por RPC tras Finalizar venta.
-- - true = desbloqueado explícitamente por administrador en Gestión de usuarios.

ALTER TABLE public.usuarios
  ALTER COLUMN edicion_preregistro_nueva_venta_permitida DROP DEFAULT;

ALTER TABLE public.usuarios
  ALTER COLUMN edicion_preregistro_nueva_venta_permitida DROP NOT NULL;

UPDATE public.usuarios u
SET edicion_preregistro_nueva_venta_permitida = NULL
WHERE u.rol = 'minorista';

COMMENT ON COLUMN public.usuarios.edicion_preregistro_nueva_venta_permitida IS
  'Minorista: NULL sin cierre explícito en BD; false tras finalizar (RPC); true si admin habilita edición. Otros roles: sin uso en UI.';

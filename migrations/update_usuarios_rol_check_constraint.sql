-- ============================================================================
-- ACTUALIZAR CONSTRAINT CHECK DE ROL EN TABLA usuarios
-- ============================================================================
-- El constraint actual no incluye 'minorista' y 'mayorista'
-- Necesitamos eliminar el constraint antiguo y crear uno nuevo con todos los roles

-- Eliminar el constraint antiguo
ALTER TABLE usuarios DROP CONSTRAINT IF EXISTS usuarios_rol_check;

-- Crear el constraint nuevo con todos los roles permitidos
ALTER TABLE usuarios 
  ADD CONSTRAINT usuarios_rol_check 
  CHECK (rol IN ('admin', 'vendedor', 'minorista', 'mayorista'));

-- Verificar que el constraint se creó correctamente
COMMENT ON CONSTRAINT usuarios_rol_check ON usuarios IS 
  'Valida que el rol sea uno de: admin, vendedor, minorista, mayorista';


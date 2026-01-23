-- ============================================================================
-- MIGRACIÓN: Corregir políticas RLS para pedidos
-- ============================================================================
-- Fecha: 2025-01-XX
-- Descripción: Crea/actualiza las políticas RLS para permitir:
--              1. Usuarios pueden actualizar sus pedidos de 'pendiente' a 'enviado'
--              2. Administradores pueden actualizar cualquier pedido
--              3. Usuarios pueden ver sus propios pedidos
--              4. Administradores pueden ver todos los pedidos
-- ============================================================================

-- Habilitar RLS en pedidos si no está habilitado
ALTER TABLE pedidos ENABLE ROW LEVEL SECURITY;

-- Eliminar políticas existentes si existen (para recrearlas)
DROP POLICY IF EXISTS "Usuarios pueden ver sus propios pedidos" ON pedidos;
DROP POLICY IF EXISTS "Usuarios pueden crear sus propios pedidos" ON pedidos;
DROP POLICY IF EXISTS "Usuarios pueden actualizar sus pedidos pendientes" ON pedidos;
DROP POLICY IF EXISTS "Admins pueden actualizar cualquier pedido" ON pedidos;

-- Política para SELECT: Usuarios ven sus propios pedidos, admins ven todos
CREATE POLICY "Usuarios pueden ver sus propios pedidos"
  ON pedidos FOR SELECT
  USING (
    id_usuario = auth.uid() 
    OR EXISTS (
      SELECT 1 FROM usuarios
      WHERE usuarios.id = auth.uid()
      AND usuarios.rol = 'admin'
      AND usuarios.estado = 'activo'
    )
  );

-- Política para INSERT: Usuarios pueden crear sus propios pedidos
CREATE POLICY "Usuarios pueden crear sus propios pedidos"
  ON pedidos FOR INSERT
  WITH CHECK (
    id_usuario = auth.uid() 
    AND (tipo_usuario = 'minorista' OR tipo_usuario = 'mayorista')
  );

-- Política para UPDATE: Usuarios pueden actualizar sus pedidos pendientes
-- Permite cambiar de 'pendiente' a 'enviado' o 'cancelado'
CREATE POLICY "Usuarios pueden actualizar sus pedidos pendientes"
  ON pedidos FOR UPDATE
  USING (
    id_usuario = auth.uid() 
    AND estado = 'pendiente'
  )
  WITH CHECK (
    id_usuario = auth.uid() 
    AND (
      estado = 'pendiente'  -- Pueden mantenerlo pendiente
      OR estado = 'enviado'  -- Pueden enviarlo
      OR estado = 'cancelado'  -- Pueden cancelarlo
    )
  );

-- Política para UPDATE: Administradores pueden actualizar cualquier pedido
CREATE POLICY "Admins pueden actualizar cualquier pedido"
  ON pedidos FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE usuarios.id = auth.uid()
      AND usuarios.rol = 'admin'
      AND usuarios.estado = 'activo'
    )
  );

-- ============================================================================
-- FIN DE LA MIGRACIÓN
-- ============================================================================

-- =====================================================
-- POLÍTICAS RLS PARA TABLA TICKETS
-- =====================================================
-- Este archivo configura las políticas de seguridad a nivel de fila (RLS)
-- para la tabla tickets según los roles del sistema

-- Primero, habilitar RLS si no está habilitado
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- ELIMINAR POLÍTICAS EXISTENTES (si las hay)
-- =====================================================
DROP POLICY IF EXISTS "Users can create tickets" ON tickets;
DROP POLICY IF EXISTS "Authenticated users can create tickets" ON tickets;
DROP POLICY IF EXISTS "Admins can view all tickets" ON tickets;
DROP POLICY IF EXISTS "Leaders can view all tickets" ON tickets;
DROP POLICY IF EXISTS "Agents can view all tickets" ON tickets;
DROP POLICY IF EXISTS "Support can view all tickets" ON tickets;
DROP POLICY IF EXISTS "Clients can view their tickets" ON tickets;
DROP POLICY IF EXISTS "Admins can update all tickets" ON tickets;
DROP POLICY IF EXISTS "Leaders can update all tickets" ON tickets;
DROP POLICY IF EXISTS "Agents can update assigned tickets" ON tickets;
DROP POLICY IF EXISTS "Support can update assigned tickets" ON tickets;
DROP POLICY IF EXISTS "Admins can delete tickets" ON tickets;

-- =====================================================
-- POLÍTICAS DE SELECT (Ver tickets)
-- =====================================================

-- Administradores pueden ver TODOS los tickets
CREATE POLICY "Admins can view all tickets"
ON tickets
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'administrador'
  )
);

-- Líderes de soporte pueden ver TODOS los tickets
CREATE POLICY "Leaders can view all tickets"
ON tickets
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'lider_soporte'
  )
);

-- Agentes de soporte pueden ver TODOS los tickets
CREATE POLICY "Agents can view all tickets"
ON tickets
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'agente_soporte'
  )
);

-- Clientes pueden ver SOLO los tickets de su empresa
CREATE POLICY "Clients can view their tickets"
ON tickets
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'cliente'
    AND profiles.client_id = tickets.client_id
  )
);

-- =====================================================
-- POLÍTICAS DE INSERT (Crear tickets)
-- =====================================================

-- Cualquier usuario autenticado puede crear tickets
-- (el created_by debe ser el usuario actual)
CREATE POLICY "Authenticated users can create tickets"
ON tickets
FOR INSERT
TO authenticated
WITH CHECK (created_by = auth.uid());

-- =====================================================
-- POLÍTICAS DE UPDATE (Actualizar tickets)
-- =====================================================

-- Administradores pueden actualizar TODOS los tickets
CREATE POLICY "Admins can update all tickets"
ON tickets
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'administrador'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'administrador'
  )
);

-- Líderes de soporte pueden actualizar TODOS los tickets
CREATE POLICY "Leaders can update all tickets"
ON tickets
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'lider_soporte'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'lider_soporte'
  )
);

-- Agentes de soporte pueden actualizar tickets asignados a ellos
CREATE POLICY "Agents can update assigned tickets"
ON tickets
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'agente_soporte'
  )
  AND (
    tickets.assigned_to = auth.uid()
    OR tickets.created_by = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'agente_soporte'
  )
  AND (
    tickets.assigned_to = auth.uid()
    OR tickets.created_by = auth.uid()
  )
);

-- =====================================================
-- POLÍTICAS DE DELETE (Eliminar tickets)
-- =====================================================

-- Solo administradores pueden eliminar tickets
CREATE POLICY "Admins can delete tickets"
ON tickets
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'administrador'
  )
);

-- =====================================================
-- POLÍTICAS RLS PARA TABLA TICKET_COMMENTS
-- =====================================================

-- Habilitar RLS para ticket_comments
ALTER TABLE ticket_comments ENABLE ROW LEVEL SECURITY;

-- Eliminar políticas existentes (si las hay)
DROP POLICY IF EXISTS "Admins can view all comments" ON ticket_comments;
DROP POLICY IF EXISTS "Leaders can view all comments" ON ticket_comments;
DROP POLICY IF EXISTS "Agents can view all comments" ON ticket_comments;
DROP POLICY IF EXISTS "Support can view all comments" ON ticket_comments;
DROP POLICY IF EXISTS "Clients can view public comments" ON ticket_comments;
DROP POLICY IF EXISTS "Users can create comments" ON ticket_comments;
DROP POLICY IF EXISTS "Admins can update comments" ON ticket_comments;
DROP POLICY IF EXISTS "Users can update own comments" ON ticket_comments;
DROP POLICY IF EXISTS "Admins can delete comments" ON ticket_comments;

-- =====================================================
-- POLÍTICAS DE SELECT para ticket_comments
-- =====================================================

-- Administradores pueden ver TODOS los comentarios (internos y públicos)
CREATE POLICY "Admins can view all comments"
ON ticket_comments
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'administrador'
  )
);

-- Líderes de soporte pueden ver TODOS los comentarios
CREATE POLICY "Leaders can view all comments"
ON ticket_comments
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'lider_soporte'
  )
);

-- Agentes de soporte pueden ver TODOS los comentarios
CREATE POLICY "Agents can view all comments"
ON ticket_comments
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'agente_soporte'
  )
);

-- Clientes pueden ver SOLO comentarios NO internos de tickets de su empresa
CREATE POLICY "Clients can view public comments"
ON ticket_comments
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    JOIN tickets t ON t.client_id = p.client_id
    WHERE p.id = auth.uid()
    AND p.role = 'cliente'
    AND t.id = ticket_comments.ticket_id
    AND ticket_comments.is_internal = false
  )
);

-- =====================================================
-- POLÍTICAS DE INSERT para ticket_comments
-- =====================================================

-- Usuarios autenticados pueden crear comentarios
CREATE POLICY "Users can create comments"
ON ticket_comments
FOR INSERT
TO authenticated
WITH CHECK (
  created_by = auth.uid()
  AND EXISTS (
    SELECT 1 FROM tickets
    WHERE tickets.id = ticket_comments.ticket_id
  )
);

-- =====================================================
-- POLÍTICAS DE UPDATE para ticket_comments
-- =====================================================

-- Administradores pueden actualizar cualquier comentario
CREATE POLICY "Admins can update comments"
ON ticket_comments
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'administrador'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'administrador'
  )
);

-- Usuarios pueden actualizar sus propios comentarios
CREATE POLICY "Users can update own comments"
ON ticket_comments
FOR UPDATE
TO authenticated
USING (created_by = auth.uid())
WITH CHECK (created_by = auth.uid());

-- =====================================================
-- POLÍTICAS DE DELETE para ticket_comments
-- =====================================================

-- Solo administradores pueden eliminar comentarios
CREATE POLICY "Admins can delete comments"
ON ticket_comments
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'administrador'
  )
);

-- =====================================================
-- VERIFICAR POLÍTICAS CREADAS
-- =====================================================
-- Ejecuta estas queries para verificar que todas las políticas se crearon correctamente:
-- 
-- SELECT policyname, cmd FROM pg_policies WHERE tablename = 'tickets' ORDER BY cmd, policyname;
-- SELECT policyname, cmd FROM pg_policies WHERE tablename = 'ticket_comments' ORDER BY cmd, policyname;
-- 
-- TICKETS deberías ver:
-- - Admins can delete tickets (DELETE)
-- - Authenticated users can create tickets (INSERT)
-- - Admins can view all tickets (SELECT)
-- - Leaders can view all tickets (SELECT)
-- - Agents can view all tickets (SELECT)
-- - Clients can view their tickets (SELECT)
-- - Admins can update all tickets (UPDATE)
-- - Leaders can update all tickets (UPDATE)
-- - Agents can update assigned tickets (UPDATE)
--
-- TICKET_COMMENTS deberías ver:
-- - Admins can delete comments (DELETE)
-- - Users can create comments (INSERT)
-- - Admins can view all comments (SELECT)
-- - Leaders can view all comments (SELECT)
-- - Agents can view all comments (SELECT)
-- - Clients can view public comments (SELECT)
-- - Admins can update comments (UPDATE)
-- - Users can update own comments (UPDATE)

-- Agregar columna user_id a la tabla clients para relacionar con auth.users
-- Este script debe ejecutarse en Supabase SQL Editor

-- 1. Agregar la columna user_id (puede ser NULL inicialmente para clientes existentes)
ALTER TABLE clients 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- 2. Crear índice para mejorar performance de búsquedas
CREATE INDEX IF NOT EXISTS idx_clients_user_id ON clients(user_id);

-- 3. Agregar comentario a la columna
COMMENT ON COLUMN clients.user_id IS 'Referencia al usuario en auth.users cuando el cliente tiene cuenta de acceso';

-- 4. (Opcional) Si quieres hacer la relación única (un usuario solo puede tener un cliente)
-- ALTER TABLE clients ADD CONSTRAINT unique_client_user_id UNIQUE (user_id);

-- 5. Actualizar RLS para permitir que usuarios vean su propio cliente
-- Si ya existe una política, ajustarla según sea necesario
DROP POLICY IF EXISTS "Users can view own client" ON clients;
CREATE POLICY "Users can view own client" 
ON clients FOR SELECT 
USING (
  user_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() 
    AND role IN ('administrador', 'lider_soporte', 'agente_soporte')
  )
);

-- 6. Política para que admins puedan gestionar clientes
DROP POLICY IF EXISTS "Admins can manage clients" ON clients;
CREATE POLICY "Admins can manage clients" 
ON clients FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() 
    AND role IN ('administrador', 'lider_soporte')
  )
);


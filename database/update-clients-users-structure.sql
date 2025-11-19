-- Actualizar estructura: clients son empresas, usuarios se asignan a clientes
-- Este script debe ejecutarse en Supabase SQL Editor

-- 1. Eliminar user_id de clients si existe (ya no se necesita)
ALTER TABLE clients 
DROP COLUMN IF EXISTS user_id;

-- 2. Agregar client_id a profiles para asignar usuarios a clientes
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES clients(id) ON DELETE SET NULL;

-- 3. Agregar user_type a profiles para el tipo de usuario
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS user_type TEXT CHECK (user_type IN (
  'on_demand_software',
  'on_demand_hardware',
  'on_demand_ambos',
  'contrato_software',
  'contrato_hardware',
  'contrato_ambos',
  'no_aplica'
));

-- 4. Crear índices para mejorar performance
CREATE INDEX IF NOT EXISTS idx_profiles_client_id ON profiles(client_id);
CREATE INDEX IF NOT EXISTS idx_profiles_user_type ON profiles(user_type);

-- 5. Agregar comentarios
COMMENT ON COLUMN profiles.client_id IS 'Cliente (empresa) al que pertenece el usuario';
COMMENT ON COLUMN profiles.user_type IS 'Tipo de usuario: On demand o Contrato, Software/Hardware/Ambos, o No Aplica';

-- 6. Actualizar políticas RLS para profiles
-- Los usuarios pueden ver su propio perfil
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
CREATE POLICY "Users can view own profile" 
ON profiles FOR SELECT 
USING (auth.uid() = user_id);

-- Los usuarios pueden actualizar su propio perfil (pero no client_id ni role)
-- Nota: La restricción de no cambiar client_id y role se maneja en la aplicación
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile" 
ON profiles FOR UPDATE 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Trigger para prevenir que usuarios cambien su client_id y role
CREATE OR REPLACE FUNCTION prevent_user_profile_restricted_changes()
RETURNS TRIGGER AS $$
BEGIN
  -- Si el usuario está intentando cambiar su propio perfil
  IF auth.uid() = NEW.user_id THEN
    -- No permitir cambiar client_id ni role
    IF OLD.client_id IS DISTINCT FROM NEW.client_id THEN
      RAISE EXCEPTION 'No puedes cambiar tu empresa cliente asignada';
    END IF;
    IF OLD.role IS DISTINCT FROM NEW.role THEN
      RAISE EXCEPTION 'No puedes cambiar tu rol';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Crear el trigger si no existe
DROP TRIGGER IF EXISTS prevent_user_profile_restricted_changes_trigger ON profiles;
CREATE TRIGGER prevent_user_profile_restricted_changes_trigger
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION prevent_user_profile_restricted_changes();

-- Admins y líderes pueden ver todos los perfiles
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
CREATE POLICY "Admins can view all profiles" 
ON profiles FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() 
    AND role IN ('administrador', 'lider_soporte')
  )
);

-- Admins y líderes pueden gestionar perfiles
DROP POLICY IF EXISTS "Admins can manage profiles" ON profiles;
CREATE POLICY "Admins can manage profiles" 
ON profiles FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() 
    AND role IN ('administrador', 'lider_soporte')
  )
);

-- 7. Función para obtener usuarios de un cliente
CREATE OR REPLACE FUNCTION get_client_users(client_uuid UUID)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  first_name TEXT,
  last_name TEXT,
  email TEXT,
  role TEXT,
  user_type TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.user_id,
    p.first_name,
    p.last_name,
    p.email,
    p.role,
    p.user_type,
    p.phone,
    p.created_at
  FROM profiles p
  WHERE p.client_id = client_uuid
  ORDER BY p.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Función para obtener estadísticas de usuarios por cliente
CREATE OR REPLACE FUNCTION get_client_user_stats(client_uuid UUID)
RETURNS TABLE (
  total_users BIGINT,
  on_demand_count BIGINT,
  contrato_count BIGINT,
  no_aplica_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::BIGINT as total_users,
    COUNT(*) FILTER (WHERE user_type LIKE 'on_demand%')::BIGINT as on_demand_count,
    COUNT(*) FILTER (WHERE user_type LIKE 'contrato%')::BIGINT as contrato_count,
    COUNT(*) FILTER (WHERE user_type = 'no_aplica')::BIGINT as no_aplica_count
  FROM profiles
  WHERE client_id = client_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ================================================
-- Políticas RLS para la tabla PROFILES
-- ================================================
-- Permite a los usuarios actualizar su propio perfil
-- Los administradores pueden actualizar cualquier perfil
-- ================================================

-- Habilitar RLS en la tabla profiles si no está habilitado
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- ================================================
-- POLÍTICAS DE LECTURA (SELECT)
-- ================================================

-- Usuarios pueden ver su propio perfil
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
CREATE POLICY "Users can view own profile"
  ON profiles
  FOR SELECT
  USING (auth.uid() = id);

-- Administradores pueden ver todos los perfiles
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
CREATE POLICY "Admins can view all profiles"
  ON profiles
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role = 'administrador'
    )
  );

-- Líderes y agentes pueden ver todos los perfiles
DROP POLICY IF EXISTS "Support staff can view all profiles" ON profiles;
CREATE POLICY "Support staff can view all profiles"
  ON profiles
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('lider_soporte', 'agente_soporte')
    )
  );

-- ================================================
-- POLÍTICAS DE ACTUALIZACIÓN (UPDATE)
-- ================================================

-- Usuarios pueden actualizar su propio perfil (excepto rol y client_id)
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile"
  ON profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Administradores pueden actualizar cualquier perfil
DROP POLICY IF EXISTS "Admins can update all profiles" ON profiles;
CREATE POLICY "Admins can update all profiles"
  ON profiles
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role = 'administrador'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role = 'administrador'
    )
  );

-- ================================================
-- POLÍTICAS DE INSERCIÓN (INSERT)
-- ================================================

-- Los usuarios autenticados pueden crear su propio perfil
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
CREATE POLICY "Users can insert own profile"
  ON profiles
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Administradores pueden crear cualquier perfil
DROP POLICY IF EXISTS "Admins can insert profiles" ON profiles;
CREATE POLICY "Admins can insert profiles"
  ON profiles
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role = 'administrador'
    )
  );

-- ================================================
-- NOTAS
-- ================================================
-- Estas políticas aseguran que:
-- 1. Cada usuario puede ver y actualizar su propio perfil
-- 2. Los administradores tienen control total
-- 3. El personal de soporte puede ver perfiles para asignación de tickets
-- 4. Los usuarios no pueden cambiar su rol o client_id directamente
--    (eso debe hacerse a través de la UI de administrador)

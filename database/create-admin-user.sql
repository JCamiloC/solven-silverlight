-- SQL para crear usuario administrador en Supabase
-- Ejecutar este código en el SQL Editor de Supabase

-- 1. Insertar usuario en auth.users (tabla de autenticación)
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  confirmation_sent_at,
  confirmation_token,
  recovery_sent_at,
  recovery_token,
  email_change_token_new,
  email_change,
  email_change_sent_at,
  last_sign_in_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  created_at,
  updated_at,
  phone,
  phone_confirmed_at,
  phone_change,
  phone_change_token,
  phone_change_sent_at,
  email_change_token_current,
  email_change_confirm_status,
  banned_until,
  reauthentication_token,
  reauthentication_sent_at,
  is_sso_user,
  deleted_at
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'desarrollo@silverlight.com.co',
  crypt('Admin123!', gen_salt('bf')), -- Contraseña: Admin123!
  NOW(),
  NOW(),
  '',
  NULL,
  '',
  '',
  '',
  NULL,
  NULL,
  '{"provider": "email", "providers": ["email"]}',
  '{"first_name": "Administrador", "last_name": "Sistema", "role": "administrador"}',
  false,
  NOW(),
  NOW(),
  NULL,
  NULL,
  '',
  '',
  NULL,
  '',
  0,
  NULL,
  '',
  NULL,
  false,
  NULL
);

-- 2. Obtener el ID del usuario recién creado para crear su perfil
-- (El trigger handle_new_user() debería crear automáticamente el perfil,
-- pero si no funciona, puedes ejecutar esto manualmente)

-- Buscar el ID del usuario admin
-- SELECT id FROM auth.users WHERE email = 'admin@mesadeayuda.com';

-- 3. Si necesitas crear el perfil manualmente, usar este INSERT:
-- (Reemplaza 'USER_ID_AQUI' con el ID real del usuario)
/*
INSERT INTO public.profiles (
  user_id,
  first_name,
  last_name,
  role,
  department,
  created_at,
  updated_at
) VALUES (
  'USER_ID_AQUI', -- Reemplazar con el ID del usuario
  'Administrador',
  'Sistema',
  'administrador',
  'Sistemas',
  NOW(),
  NOW()
);
*/

-- 4. Verificar que el usuario fue creado correctamente
SELECT 
  u.id,
  u.email,
  u.email_confirmed_at,
  p.first_name,
  p.last_name,
  p.role
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.user_id
WHERE u.email = 'desarrollo@silverlight.com.co';

-- 5. Si necesitas cambiar la contraseña más tarde, usa:
-- UPDATE auth.users 
-- SET encrypted_password = crypt('NuevaContraseña123!', gen_salt('bf'))
-- WHERE email = 'desarrollo@silverlight.com.co';
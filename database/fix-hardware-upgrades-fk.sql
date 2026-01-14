-- Fix: Asegurar que la foreign key de hardware_upgrades -> profiles existe correctamente
-- Este script arregla la relación que falta según el error de Supabase

-- Paso 0: Ver qué usuarios en hardware_upgrades no existen en profiles
SELECT DISTINCT hu.updated_by, COUNT(*) as count
FROM hardware_upgrades hu
LEFT JOIN profiles p ON hu.updated_by = p.id
WHERE hu.updated_by IS NOT NULL 
  AND p.id IS NULL
GROUP BY hu.updated_by;

-- Paso 1: Limpiar registros huérfanos (setear a NULL los updated_by que no existen en profiles)
UPDATE hardware_upgrades
SET updated_by = NULL
WHERE updated_by IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM profiles WHERE profiles.id = hardware_upgrades.updated_by
  );

-- Paso 2: Eliminar FK anterior si existe (puede estar apuntando a auth.users)
ALTER TABLE hardware_upgrades 
DROP CONSTRAINT IF EXISTS hardware_upgrades_updated_by_fkey;

-- Paso 3: Agregar la FK correcta hacia profiles.id
ALTER TABLE hardware_upgrades 
ADD CONSTRAINT hardware_upgrades_updated_by_fkey 
FOREIGN KEY (updated_by) 
REFERENCES profiles(id) 
ON DELETE SET NULL;

-- Paso 4: Crear índice para mejorar performance de joins
CREATE INDEX IF NOT EXISTS idx_hardware_upgrades_updated_by 
ON hardware_upgrades(updated_by);

-- Verificar que la FK fue creada correctamente
SELECT
    tc.constraint_name, 
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.table_name = 'hardware_upgrades' 
    AND tc.constraint_type = 'FOREIGN KEY';

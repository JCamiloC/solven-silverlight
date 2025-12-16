-- Modificar tabla software_licenses para quitar campos de cobro y agregar periodicidad

-- 1. Agregar el nuevo campo periodicidad
ALTER TABLE software_licenses
ADD COLUMN IF NOT EXISTS periodicidad TEXT CHECK (periodicidad IN ('mensual', 'anual'));

-- 2. Hacer purchase_date y cost opcionales (quitar NOT NULL)
ALTER TABLE software_licenses
ALTER COLUMN purchase_date DROP NOT NULL;

ALTER TABLE software_licenses
ALTER COLUMN cost DROP NOT NULL;

-- 3. OPCIÓN RECOMENDADA: Eliminar las columnas completamente
-- Descomenta las siguientes líneas si quieres eliminar los campos:
ALTER TABLE software_licenses DROP COLUMN IF EXISTS cost;
ALTER TABLE software_licenses DROP COLUMN IF EXISTS purchase_date;

-- 4. Comentarios sobre las columnas
COMMENT ON COLUMN software_licenses.periodicidad IS 'Periodicidad de la licencia: mensual o anual';

-- 5. Verificar la estructura actualizada
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'software_licenses'
ORDER BY ordinal_position;

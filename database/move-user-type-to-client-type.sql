-- Migración: Mover user_type de profiles a client_type en clients
-- Fecha: 2025-12-03
-- Descripción: El tipo de servicio (on demand/contrato, software/hardware/ambos) 
-- es un atributo del cliente, no del usuario individual

-- Paso 1: Agregar columna client_type a la tabla clients
ALTER TABLE clients
ADD COLUMN IF NOT EXISTS client_type text CHECK (
  client_type IN (
    'on_demand_software',
    'on_demand_hardware', 
    'on_demand_ambos',
    'contrato_software',
    'contrato_hardware',
    'contrato_ambos',
    'no_aplica'
  )
);

-- Paso 2: Migrar datos existentes de user_type a client_type
-- Si hay usuarios con user_type definido, usar ese valor para el cliente
UPDATE clients c
SET client_type = (
  SELECT p.user_type
  FROM profiles p
  WHERE p.client_id = c.id
    AND p.user_type IS NOT NULL
  LIMIT 1
)
WHERE c.client_type IS NULL;

-- Paso 3: Establecer 'no_aplica' como valor por defecto para clientes sin tipo
UPDATE clients
SET client_type = 'no_aplica'
WHERE client_type IS NULL;

-- Paso 4: Remover la columna user_type de profiles
-- NOTA: Ejecuta esto solo después de verificar que la migración de datos fue exitosa
-- ALTER TABLE profiles DROP COLUMN IF EXISTS user_type;

-- Paso 5: Agregar comentario a la columna
COMMENT ON COLUMN clients.client_type IS 'Tipo de servicio del cliente: On demand o Contrato, Software/Hardware/Ambos, o No Aplica';

-- Verificar la migración
SELECT 
  c.name,
  c.client_type,
  COUNT(p.id) as usuarios
FROM clients c
LEFT JOIN profiles p ON p.client_id = c.id
GROUP BY c.id, c.name, c.client_type
ORDER BY c.name;

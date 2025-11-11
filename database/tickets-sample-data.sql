-- Insertar algunos tickets de prueba
-- Nota: Asegúrate de que ya tienes clientes y perfiles en la base de datos

-- Primero vamos a obtener algunos IDs de clientes existentes
-- SELECT id, name FROM clients LIMIT 3;

-- Insertar tickets de prueba (ajusta los UUIDs según tus datos reales)
INSERT INTO tickets (
  client_id,
  title,
  description,
  priority,
  status,
  category,
  created_by,
  assigned_to
) VALUES 
-- Ticket 1: Hardware crítico
(
  (SELECT id FROM clients LIMIT 1 OFFSET 0),  -- Primer cliente
  'Servidor principal sin respuesta',
  'El servidor principal del cliente no responde desde las 14:30. Los empleados no pueden acceder a los sistemas críticos de la empresa. Requiere atención inmediata.',
  'critical',
  'open',
  'hardware',
  (SELECT id FROM profiles WHERE role = 'administrador' LIMIT 1),
  (SELECT id FROM profiles WHERE role IN ('agente_soporte', 'lider_soporte') LIMIT 1)
),

-- Ticket 2: Software en progreso
(
  (SELECT id FROM clients LIMIT 1 OFFSET 1),  -- Segundo cliente
  'Actualización de Office 365',
  'El cliente requiere migración de Office 2019 a Office 365 para 25 usuarios. Se necesita planificar la migración y capacitación.',
  'medium',
  'in_progress',
  'software',
  (SELECT id FROM profiles WHERE role = 'administrador' LIMIT 1),
  (SELECT id FROM profiles WHERE role IN ('agente_soporte', 'lider_soporte') LIMIT 1 OFFSET 1)
),

-- Ticket 3: Red alta prioridad
(
  (SELECT id FROM clients LIMIT 1 OFFSET 0),  -- Primer cliente de nuevo
  'Conectividad intermitente en sucursal',
  'La sucursal sur reporta conectividad intermitente. Los cortes duran entre 5-10 minutos cada hora, afectando la productividad.',
  'high',
  'pending',
  'network',
  (SELECT id FROM profiles WHERE role = 'administrador' LIMIT 1),
  NULL
),

-- Ticket 4: Acceso medio
(
  (SELECT id FROM clients LIMIT 1 OFFSET 1),  -- Segundo cliente
  'Solicitud de acceso VPN para nuevo empleado',
  'Nuevo empleado Juan Pérez necesita acceso VPN para trabajo remoto. Incluir permisos para carpetas compartidas del departamento de ventas.',
  'medium',
  'open',
  'access',
  (SELECT id FROM profiles WHERE role = 'administrador' LIMIT 1),
  (SELECT id FROM profiles WHERE role IN ('agente_soporte', 'lider_soporte') LIMIT 1)
),

-- Ticket 5: Resuelto hardware
(
  (SELECT id FROM clients LIMIT 1 OFFSET 0),  -- Primer cliente
  'Reemplazo de impresora HP LaserJet',
  'Impresora HP LaserJet Pro M404n presenta atascos constantes. Se realizó el reemplazo por modelo actualizado.',
  'low',
  'resolved',
  'hardware',
  (SELECT id FROM profiles WHERE role = 'administrador' LIMIT 1),
  (SELECT id FROM profiles WHERE role IN ('agente_soporte', 'lider_soporte') LIMIT 1),
  resolved_at = NOW() - INTERVAL '2 days'
),

-- Ticket 6: Software bajo
(
  (SELECT id FROM clients LIMIT 1 OFFSET 1),  -- Segundo cliente
  'Licencias adicionales de Adobe Creative Suite',
  'El cliente solicita 3 licencias adicionales de Adobe Creative Suite para el equipo de diseño. Presupuesto ya aprobado.',
  'low',
  'open',
  'software',
  (SELECT id FROM profiles WHERE role = 'administrador' LIMIT 1),
  NULL
);

-- Verificar los tickets insertados
SELECT 
  t.id,
  t.title,
  t.priority,
  t.status,
  t.category,
  c.name as client_name,
  p_created.full_name as created_by_name,
  p_assigned.full_name as assigned_to_name,
  t.created_at
FROM tickets t
  LEFT JOIN clients c ON t.client_id = c.id
  LEFT JOIN profiles p_created ON t.created_by = p_created.id
  LEFT JOIN profiles p_assigned ON t.assigned_to = p_assigned.id
ORDER BY t.created_at DESC;
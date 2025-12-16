-- Agregar política RLS para permitir UPDATE en la tabla clients
-- Solo administradores y líderes de soporte pueden actualizar clientes

CREATE POLICY "Allow admin and leader to update clients"
ON clients
FOR UPDATE
TO public
USING (
  EXISTS (
    SELECT 1
    FROM profiles
    WHERE profiles.user_id = auth.uid()
    AND (profiles.role = 'administrador' OR profiles.role = 'lider_soporte')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM profiles
    WHERE profiles.user_id = auth.uid()
    AND (profiles.role = 'administrador' OR profiles.role = 'lider_soporte')
  )
);

-- También agregar política para DELETE si es necesario
CREATE POLICY "Allow admin to delete clients"
ON clients
FOR DELETE
TO public
USING (
  EXISTS (
    SELECT 1
    FROM profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.role = 'administrador'
  )
);

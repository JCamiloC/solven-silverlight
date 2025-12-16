-- Add foreign key constraint for tecnico_responsable in custom_app_followups
-- This allows Supabase to automatically resolve the relationship with profiles table

-- First, check if the foreign key already exists and drop it if needed
ALTER TABLE custom_app_followups
DROP CONSTRAINT IF EXISTS custom_app_followups_tecnico_responsable_fkey;

-- Add the foreign key constraint
ALTER TABLE custom_app_followups
ADD CONSTRAINT custom_app_followups_tecnico_responsable_fkey
FOREIGN KEY (tecnico_responsable)
REFERENCES profiles(id)
ON DELETE SET NULL
ON UPDATE CASCADE;

-- Create an index on tecnico_responsable for better query performance
CREATE INDEX IF NOT EXISTS idx_custom_app_followups_tecnico_responsable 
ON custom_app_followups(tecnico_responsable);

-- Also add foreign key for application_id if not exists
ALTER TABLE custom_app_followups
DROP CONSTRAINT IF EXISTS custom_app_followups_application_id_fkey;

ALTER TABLE custom_app_followups
ADD CONSTRAINT custom_app_followups_application_id_fkey
FOREIGN KEY (application_id)
REFERENCES custom_applications(id)
ON DELETE CASCADE
ON UPDATE CASCADE;

-- Create an index on application_id for better query performance
CREATE INDEX IF NOT EXISTS idx_custom_app_followups_application_id 
ON custom_app_followups(application_id);

-- Verify the constraints were created
SELECT 
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_name = 'custom_app_followups';

-- Add serial number columns for peripherals (mouse, teclado, diadema)
-- Run this in Supabase SQL Editor

-- Add serial columns for peripherals
ALTER TABLE hardware_assets
ADD COLUMN IF NOT EXISTS mouse_serial TEXT,
ADD COLUMN IF NOT EXISTS teclado_serial TEXT,
ADD COLUMN IF NOT EXISTS diadema_serial TEXT;

-- Add comments for documentation
COMMENT ON COLUMN hardware_assets.mouse_serial IS 'Serial number for mouse peripheral (optional)';
COMMENT ON COLUMN hardware_assets.teclado_serial IS 'Serial number for keyboard peripheral (optional)';
COMMENT ON COLUMN hardware_assets.diadema_serial IS 'Serial number for headset peripheral (optional)';

-- Verify the columns were added
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'hardware_assets'
AND column_name IN ('mouse_serial', 'teclado_serial', 'diadema_serial');

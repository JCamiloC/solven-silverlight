-- SQL migration for Supabase: create 'parametros' table

-- Run this in Supabase SQL editor

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS parametros (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  name text NOT NULL,
  options jsonb DEFAULT '[]'::jsonb,
  description text,
  metadata jsonb DEFAULT '{}'::jsonb,
  client_specific boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_parametros_key ON parametros(key);

-- Optional: trigger to update updated_at
CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_updated_at ON parametros;
CREATE TRIGGER set_updated_at
BEFORE UPDATE ON parametros
FOR EACH ROW
EXECUTE FUNCTION trigger_set_updated_at();

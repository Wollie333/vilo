-- Add company registration number field to tenants
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS company_registration_number TEXT;

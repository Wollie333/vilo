-- Migration: Add business and regional settings to tenants table
-- This adds fields for business information and regional preferences

-- Business Information
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS business_name VARCHAR(255) DEFAULT NULL;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS business_description TEXT DEFAULT NULL;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS logo_url TEXT DEFAULT NULL;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS address_line1 VARCHAR(255) DEFAULT NULL;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS address_line2 VARCHAR(255) DEFAULT NULL;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS city VARCHAR(100) DEFAULT NULL;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS state_province VARCHAR(100) DEFAULT NULL;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS postal_code VARCHAR(20) DEFAULT NULL;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS country VARCHAR(100) DEFAULT 'South Africa';
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS vat_number VARCHAR(50) DEFAULT NULL;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS business_email VARCHAR(255) DEFAULT NULL;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS business_phone VARCHAR(50) DEFAULT NULL;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS website_url VARCHAR(255) DEFAULT NULL;

-- Regional Settings
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS language VARCHAR(10) DEFAULT 'en';
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS currency VARCHAR(10) DEFAULT 'ZAR';
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS timezone VARCHAR(50) DEFAULT 'Africa/Johannesburg';
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS date_format VARCHAR(20) DEFAULT 'DD/MM/YYYY';

-- Add comments for documentation
COMMENT ON COLUMN tenants.business_name IS 'Display name for the business';
COMMENT ON COLUMN tenants.business_description IS 'General description of the business for public display';
COMMENT ON COLUMN tenants.logo_url IS 'URL to the business logo image';
COMMENT ON COLUMN tenants.vat_number IS 'VAT/Tax registration number';
COMMENT ON COLUMN tenants.language IS 'Preferred language code (e.g., en, af, zu)';
COMMENT ON COLUMN tenants.currency IS 'Currency code (e.g., ZAR, USD, EUR)';
COMMENT ON COLUMN tenants.timezone IS 'Timezone identifier';
COMMENT ON COLUMN tenants.date_format IS 'Preferred date format';

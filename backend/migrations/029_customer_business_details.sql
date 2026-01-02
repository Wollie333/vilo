-- Migration: 029_customer_business_details.sql
-- Description: Add optional business details to customers for invoice display

-- Add business details columns to customers table
ALTER TABLE customers
ADD COLUMN IF NOT EXISTS business_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS business_vat_number VARCHAR(50),
ADD COLUMN IF NOT EXISTS business_registration_number VARCHAR(50),
ADD COLUMN IF NOT EXISTS business_address_line1 VARCHAR(255),
ADD COLUMN IF NOT EXISTS business_address_line2 VARCHAR(255),
ADD COLUMN IF NOT EXISTS business_city VARCHAR(100),
ADD COLUMN IF NOT EXISTS business_postal_code VARCHAR(20),
ADD COLUMN IF NOT EXISTS business_country VARCHAR(100),
ADD COLUMN IF NOT EXISTS use_business_details_on_invoice BOOLEAN DEFAULT false;

-- Add comment for documentation
COMMENT ON COLUMN customers.business_name IS 'Optional business/company name for invoice billing';
COMMENT ON COLUMN customers.business_vat_number IS 'Customer VAT number for invoice';
COMMENT ON COLUMN customers.business_registration_number IS 'Company registration number';
COMMENT ON COLUMN customers.use_business_details_on_invoice IS 'When true, use business details instead of personal details on invoices';

-- Add Paystack settings columns to tenants table
-- Run this in Supabase SQL Editor

ALTER TABLE tenants ADD COLUMN IF NOT EXISTS paystack_enabled BOOLEAN DEFAULT false;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS paystack_mode VARCHAR(10) DEFAULT 'test';
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS paystack_test_public_key VARCHAR(100);
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS paystack_test_secret_key VARCHAR(100);
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS paystack_live_public_key VARCHAR(100);
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS paystack_live_secret_key VARCHAR(100);

-- Add EFT settings columns
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS eft_enabled BOOLEAN DEFAULT false;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS eft_account_holder VARCHAR(255);
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS eft_bank_name VARCHAR(255);
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS eft_account_number VARCHAR(50);
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS eft_branch_code VARCHAR(20);
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS eft_account_type VARCHAR(20);

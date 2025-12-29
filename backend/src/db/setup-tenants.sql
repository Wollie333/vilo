-- ============================================
-- TENANTS & PAYMENTS TABLES
-- Run this in Supabase SQL Editor
-- Created: 2025-12-29
-- ============================================

-- ============================================
-- UTILITY FUNCTIONS
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- ============================================
-- TENANTS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255),
  owner_user_id UUID NOT NULL UNIQUE,
  has_lifetime_access BOOLEAN NOT NULL DEFAULT false,
  paystack_customer_code VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tenants_owner_user_id ON tenants(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_tenants_has_lifetime_access ON tenants(has_lifetime_access);

ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own tenant" ON tenants;
DROP POLICY IF EXISTS "Users can insert their own tenant" ON tenants;
DROP POLICY IF EXISTS "Users can update their own tenant" ON tenants;

CREATE POLICY "Users can view their own tenant"
  ON tenants FOR SELECT USING (owner_user_id = auth.uid());

CREATE POLICY "Users can insert their own tenant"
  ON tenants FOR INSERT WITH CHECK (owner_user_id = auth.uid());

CREATE POLICY "Users can update their own tenant"
  ON tenants FOR UPDATE USING (owner_user_id = auth.uid());

DROP TRIGGER IF EXISTS update_tenants_updated_at ON tenants;
CREATE TRIGGER update_tenants_updated_at
  BEFORE UPDATE ON tenants
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- PAYMENTS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  currency VARCHAR(3) NOT NULL DEFAULT 'USD',
  paystack_reference VARCHAR(100) UNIQUE,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT payments_valid_status CHECK (status IN ('pending', 'success', 'failed'))
);

CREATE INDEX IF NOT EXISTS idx_payments_tenant_id ON payments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_paystack_reference ON payments(paystack_reference);

ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their tenant payments" ON payments;
DROP POLICY IF EXISTS "Service role can insert payments" ON payments;
DROP POLICY IF EXISTS "Service role can update payments" ON payments;

CREATE POLICY "Users can view their tenant payments"
  ON payments FOR SELECT
  USING (tenant_id IN (SELECT id FROM tenants WHERE owner_user_id = auth.uid()));

CREATE POLICY "Service role can insert payments"
  ON payments FOR INSERT WITH CHECK (true);

CREATE POLICY "Service role can update payments"
  ON payments FOR UPDATE USING (true);

-- ============================================
-- INSERT YOUR TENANT RECORD
-- ============================================

INSERT INTO tenants (owner_user_id, has_lifetime_access, name)
VALUES ('d6a6d496-8d8d-46a0-88f8-361fcb027785', true, 'My Business')
ON CONFLICT (owner_user_id) DO UPDATE SET has_lifetime_access = true;

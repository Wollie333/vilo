-- Migration: Customer Notes
-- Allow staff to add internal notes about customers

CREATE TABLE IF NOT EXISTS customer_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_by UUID, -- Auth user ID (no FK since auth.users is managed by Supabase)
  created_by_name VARCHAR(255), -- Store name for display
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_customer_notes_customer ON customer_notes(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_notes_tenant ON customer_notes(tenant_id);

-- Enable RLS
ALTER TABLE customer_notes ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only see notes from their tenant
CREATE POLICY customer_notes_tenant_isolation ON customer_notes
  FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

COMMENT ON TABLE customer_notes IS 'Internal staff notes about customers';

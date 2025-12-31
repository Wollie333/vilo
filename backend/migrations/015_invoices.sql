-- =============================================
-- Invoice System Migration
-- =============================================

-- Invoice sequence per tenant (ensures unique sequential numbers)
CREATE TABLE IF NOT EXISTS invoice_sequences (
  tenant_id UUID PRIMARY KEY REFERENCES tenants(id) ON DELETE CASCADE,
  last_number INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Invoices table
CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,

  -- Invoice identification
  invoice_number VARCHAR(20) NOT NULL,  -- e.g., INV-000001

  -- Snapshot of invoice data (in case booking/tenant details change later)
  invoice_data JSONB NOT NULL,

  -- PDF storage
  pdf_url TEXT,                          -- URL to stored PDF in Supabase Storage
  pdf_path TEXT,                         -- Storage path for deletion

  -- Tracking
  sent_via_email_at TIMESTAMP WITH TIME ZONE,
  sent_via_whatsapp_at TIMESTAMP WITH TIME ZONE,
  email_recipient TEXT,

  -- Audit
  generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Unique invoice number per tenant
  CONSTRAINT unique_invoice_number_per_tenant UNIQUE (tenant_id, invoice_number)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_invoices_tenant_id ON invoices(tenant_id);
CREATE INDEX IF NOT EXISTS idx_invoices_booking_id ON invoices(booking_id);
CREATE INDEX IF NOT EXISTS idx_invoices_invoice_number ON invoices(invoice_number);
CREATE INDEX IF NOT EXISTS idx_invoices_generated_at ON invoices(generated_at DESC);

-- Add invoice_id reference to bookings table
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS invoice_id UUID REFERENCES invoices(id);
CREATE INDEX IF NOT EXISTS idx_bookings_invoice_id ON bookings(invoice_id);

-- Function for atomic invoice number generation
-- Returns the next available invoice number for a tenant
CREATE OR REPLACE FUNCTION get_next_invoice_number(p_tenant_id UUID)
RETURNS INTEGER AS $$
DECLARE
  next_num INTEGER;
BEGIN
  INSERT INTO invoice_sequences (tenant_id, last_number, updated_at)
  VALUES (p_tenant_id, 1, NOW())
  ON CONFLICT (tenant_id)
  DO UPDATE SET
    last_number = invoice_sequences.last_number + 1,
    updated_at = NOW()
  RETURNING last_number INTO next_num;

  RETURN next_num;
END;
$$ LANGUAGE plpgsql;

-- Row Level Security for invoices
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only access invoices for their tenant
CREATE POLICY invoices_tenant_isolation ON invoices
  FOR ALL
  USING (tenant_id IN (
    SELECT id FROM tenants WHERE owner_user_id = auth.uid()
  ));

-- Policy: Service role can access all invoices
CREATE POLICY invoices_service_role ON invoices
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Row Level Security for invoice_sequences
ALTER TABLE invoice_sequences ENABLE ROW LEVEL SECURITY;

CREATE POLICY invoice_sequences_tenant_isolation ON invoice_sequences
  FOR ALL
  USING (tenant_id IN (
    SELECT id FROM tenants WHERE owner_user_id = auth.uid()
  ));

CREATE POLICY invoice_sequences_service_role ON invoice_sequences
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

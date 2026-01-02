-- Migration: Business Verification System
-- Allows businesses to upload identity documents for verification badges

-- Verification status columns on tenants table
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS verification_user_status VARCHAR(20) DEFAULT 'none'
  CHECK (verification_user_status IN ('none', 'pending', 'verified', 'rejected'));

ALTER TABLE tenants ADD COLUMN IF NOT EXISTS verification_business_status VARCHAR(20) DEFAULT 'none'
  CHECK (verification_business_status IN ('none', 'pending', 'verified', 'rejected'));

ALTER TABLE tenants ADD COLUMN IF NOT EXISTS verification_submitted_at TIMESTAMPTZ;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS verification_reviewed_at TIMESTAMPTZ;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS verification_notes TEXT;

-- Verification documents table
CREATE TABLE IF NOT EXISTS verification_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  document_type VARCHAR(50) NOT NULL CHECK (document_type IN ('profile_id', 'business_registration', 'photo_verification', 'vat_certificate')),
  file_url TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER,
  mime_type VARCHAR(100),
  verification_code VARCHAR(20), -- For photo verification only
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  rejection_reason TEXT,
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(tenant_id, document_type) -- Only one document per type per tenant
);

-- Verification codes table (for photo verification)
CREATE TABLE IF NOT EXISTS verification_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  code VARCHAR(20) NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(tenant_id, code)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_verification_documents_tenant ON verification_documents(tenant_id);
CREATE INDEX IF NOT EXISTS idx_verification_documents_status ON verification_documents(status);
CREATE INDEX IF NOT EXISTS idx_verification_documents_type ON verification_documents(document_type);
CREATE INDEX IF NOT EXISTS idx_verification_codes_tenant ON verification_codes(tenant_id);
CREATE INDEX IF NOT EXISTS idx_verification_codes_expires ON verification_codes(expires_at);

-- Comments for documentation
COMMENT ON TABLE verification_documents IS 'Stores uploaded verification documents for business verification';
COMMENT ON TABLE verification_codes IS 'Stores temporary verification codes for photo verification';
COMMENT ON COLUMN tenants.verification_user_status IS 'Status of user verification (requires profile_id + photo_verification)';
COMMENT ON COLUMN tenants.verification_business_status IS 'Status of business verification (requires business_registration + vat_certificate)';
COMMENT ON COLUMN verification_documents.verification_code IS 'The code that was displayed during photo verification';

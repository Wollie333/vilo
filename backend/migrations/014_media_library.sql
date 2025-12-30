-- Media library table for storing uploaded files
CREATE TABLE IF NOT EXISTS media_library (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  filename VARCHAR(255) NOT NULL,
  original_filename VARCHAR(255),
  file_url TEXT NOT NULL,
  file_size INTEGER,
  mime_type VARCHAR(100),
  width INTEGER,
  height INTEGER,
  alt_text TEXT,
  folder VARCHAR(100) DEFAULT 'general',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Index for faster tenant lookups
CREATE INDEX IF NOT EXISTS idx_media_library_tenant ON media_library(tenant_id);

-- Index for folder filtering
CREATE INDEX IF NOT EXISTS idx_media_library_folder ON media_library(tenant_id, folder);

-- Enable Row Level Security
ALTER TABLE media_library ENABLE ROW LEVEL SECURITY;

-- Policy to allow tenants to view their own media
CREATE POLICY media_library_tenant_select ON media_library
  FOR SELECT
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

-- Policy to allow tenants to insert their own media
CREATE POLICY media_library_tenant_insert ON media_library
  FOR INSERT
  WITH CHECK (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

-- Policy to allow tenants to update their own media
CREATE POLICY media_library_tenant_update ON media_library
  FOR UPDATE
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

-- Policy to allow tenants to delete their own media
CREATE POLICY media_library_tenant_delete ON media_library
  FOR DELETE
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

-- Add auto-update for updated_at column
CREATE OR REPLACE FUNCTION update_media_library_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER media_library_updated_at
  BEFORE UPDATE ON media_library
  FOR EACH ROW
  EXECUTE FUNCTION update_media_library_timestamp();

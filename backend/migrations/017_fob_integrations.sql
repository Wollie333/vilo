-- FOB (Front of Business) Integration System
-- Enables multi-source booking and review sync from OTAs

-- ============================================
-- 1. Add source fields to bookings table
-- ============================================

ALTER TABLE bookings ADD COLUMN IF NOT EXISTS source VARCHAR(50) DEFAULT 'manual';
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS external_id VARCHAR(255);
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS external_url TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS synced_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS sync_hash VARCHAR(64);

-- Index for filtering by source
CREATE INDEX IF NOT EXISTS idx_bookings_source ON bookings(source);
CREATE INDEX IF NOT EXISTS idx_bookings_external_id ON bookings(external_id) WHERE external_id IS NOT NULL;

-- ============================================
-- 2. Add source fields to reviews table
-- ============================================

ALTER TABLE reviews ADD COLUMN IF NOT EXISTS source VARCHAR(50) DEFAULT 'vilo';
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS external_id VARCHAR(255);
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS external_url TEXT;
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS synced_at TIMESTAMP WITH TIME ZONE;

-- Allow reviews without booking (external reviews)
ALTER TABLE reviews ALTER COLUMN booking_id DROP NOT NULL;

-- Index for filtering by source
CREATE INDEX IF NOT EXISTS idx_reviews_source ON reviews(source);
CREATE INDEX IF NOT EXISTS idx_reviews_external_id ON reviews(external_id) WHERE external_id IS NOT NULL;

-- ============================================
-- 3. Create integrations table
-- ============================================

CREATE TABLE IF NOT EXISTS integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  platform VARCHAR(50) NOT NULL,
  display_name VARCHAR(255),
  credentials JSONB NOT NULL DEFAULT '{}',
  settings JSONB NOT NULL DEFAULT '{}',
  is_active BOOLEAN DEFAULT false,
  is_connected BOOLEAN DEFAULT false,
  last_sync_at TIMESTAMP WITH TIME ZONE,
  last_error TEXT,
  sync_bookings BOOLEAN DEFAULT true,
  sync_reviews BOOLEAN DEFAULT true,
  sync_availability BOOLEAN DEFAULT true,
  auto_sync_enabled BOOLEAN DEFAULT false,
  sync_interval_minutes INTEGER DEFAULT 60,
  webhook_url TEXT,
  webhook_secret VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(tenant_id, platform)
);

-- Index for tenant lookups
CREATE INDEX IF NOT EXISTS idx_integrations_tenant ON integrations(tenant_id);

-- RLS policies for integrations
ALTER TABLE integrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY integrations_tenant_isolation ON integrations
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant', true)::uuid);

-- ============================================
-- 4. Create room_mappings table
-- ============================================

CREATE TABLE IF NOT EXISTS room_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  integration_id UUID NOT NULL REFERENCES integrations(id) ON DELETE CASCADE,
  external_room_id VARCHAR(255) NOT NULL,
  external_room_name VARCHAR(255),
  ical_url TEXT,
  last_ical_sync TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(integration_id, external_room_id)
);

-- Index for lookups
CREATE INDEX IF NOT EXISTS idx_room_mappings_room ON room_mappings(room_id);
CREATE INDEX IF NOT EXISTS idx_room_mappings_integration ON room_mappings(integration_id);

-- RLS policies for room_mappings
ALTER TABLE room_mappings ENABLE ROW LEVEL SECURITY;

CREATE POLICY room_mappings_tenant_isolation ON room_mappings
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant', true)::uuid);

-- ============================================
-- 5. Create sync_logs table
-- ============================================

CREATE TABLE IF NOT EXISTS sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  integration_id UUID NOT NULL REFERENCES integrations(id) ON DELETE CASCADE,
  sync_type VARCHAR(50) NOT NULL,
  direction VARCHAR(20) NOT NULL DEFAULT 'inbound',
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  records_processed INTEGER DEFAULT 0,
  records_created INTEGER DEFAULT 0,
  records_updated INTEGER DEFAULT 0,
  records_skipped INTEGER DEFAULT 0,
  error_message TEXT,
  details JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for lookups and cleanup
CREATE INDEX IF NOT EXISTS idx_sync_logs_integration ON sync_logs(integration_id);
CREATE INDEX IF NOT EXISTS idx_sync_logs_created ON sync_logs(created_at);

-- RLS policies for sync_logs
ALTER TABLE sync_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY sync_logs_tenant_isolation ON sync_logs
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant', true)::uuid);

-- ============================================
-- 6. Comments for documentation
-- ============================================

COMMENT ON TABLE integrations IS 'Stores OTA integration configurations for each tenant';
COMMENT ON COLUMN integrations.platform IS 'Platform identifier: airbnb, booking_com, lekkerslaap, expedia, tripadvisor, ical';
COMMENT ON COLUMN integrations.credentials IS 'Encrypted API keys, tokens, or other auth credentials';
COMMENT ON COLUMN integrations.settings IS 'Platform-specific settings like property IDs';
COMMENT ON COLUMN integrations.sync_interval_minutes IS 'How often to auto-sync if auto_sync_enabled';

COMMENT ON TABLE room_mappings IS 'Maps Vilo rooms to external platform listing IDs';
COMMENT ON COLUMN room_mappings.external_room_id IS 'The listing/room ID on the external platform';
COMMENT ON COLUMN room_mappings.ical_url IS 'iCal feed URL for calendar sync';

COMMENT ON TABLE sync_logs IS 'Audit trail of all sync operations';
COMMENT ON COLUMN sync_logs.sync_type IS 'Type of sync: bookings, reviews, availability, full';
COMMENT ON COLUMN sync_logs.direction IS 'Sync direction: inbound (from platform) or outbound (to platform)';
COMMENT ON COLUMN sync_logs.status IS 'Status: pending, running, success, failed';

COMMENT ON COLUMN bookings.source IS 'Origin: vilo, website, manual, airbnb, booking_com, lekkerslaap, expedia, tripadvisor';
COMMENT ON COLUMN bookings.external_id IS 'Booking ID on the external platform';
COMMENT ON COLUMN bookings.sync_hash IS 'Hash of external data to detect changes';

COMMENT ON COLUMN reviews.source IS 'Origin: vilo, airbnb, booking_com, lekkerslaap, expedia, tripadvisor, google';
COMMENT ON COLUMN reviews.external_id IS 'Review ID on the external platform';

-- Migration: Add sync_settings JSONB column to tenants table
-- This stores iCal sync configuration per platform

ALTER TABLE tenants ADD COLUMN IF NOT EXISTS sync_settings JSONB DEFAULT '{}';

-- Add comment for documentation
COMMENT ON COLUMN tenants.sync_settings IS 'JSONB object storing iCal sync settings per platform (airbnb, booking_com, etc.)';

-- Example structure:
-- {
--   "airbnb": {
--     "enabled": true,
--     "ical_import_url": "https://...",
--     "sync_frequency": "hourly",
--     "updated_at": "2026-01-01T00:00:00Z"
--   },
--   "booking_com": {
--     "enabled": false,
--     ...
--   }
-- }

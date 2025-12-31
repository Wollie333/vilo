-- Migration: Add directory listing fields to tenants table
-- These fields allow tenants to list their properties on the Vilo discovery platform

-- Slug for SEO-friendly URLs (needed for discovery)
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS slug VARCHAR(100) UNIQUE DEFAULT NULL;

-- Directory Listing Fields
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS discoverable BOOLEAN DEFAULT FALSE;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS directory_featured BOOLEAN DEFAULT FALSE;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS property_type VARCHAR(50) DEFAULT NULL;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS region VARCHAR(100) DEFAULT NULL;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS region_slug VARCHAR(100) DEFAULT NULL;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS cover_image TEXT DEFAULT NULL;

-- Add comments for documentation
COMMENT ON COLUMN tenants.discoverable IS 'Whether the property is listed on the Vilo discovery platform';
COMMENT ON COLUMN tenants.directory_featured IS 'Whether the property is featured in directory listings';
COMMENT ON COLUMN tenants.property_type IS 'Type of property (Lodge, Guesthouse, Hotel, etc.)';
COMMENT ON COLUMN tenants.region IS 'Human-readable region name (e.g., Cape Town, Kruger National Park)';
COMMENT ON COLUMN tenants.region_slug IS 'URL-friendly region identifier (e.g., cape-town, kruger)';
COMMENT ON COLUMN tenants.cover_image IS 'Main cover image URL for directory listings';

-- Create index for faster discovery queries
CREATE INDEX IF NOT EXISTS idx_tenants_discoverable ON tenants(discoverable) WHERE discoverable = TRUE;
CREATE INDEX IF NOT EXISTS idx_tenants_region_slug ON tenants(region_slug) WHERE discoverable = TRUE;

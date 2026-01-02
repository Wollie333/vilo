-- Migration: Add Open Graph image fields to tenants table
-- These fields allow tenants to customize how their listing appears when shared on social media

-- OG Image Fields
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS seo_og_image TEXT DEFAULT NULL;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS seo_og_image_alt VARCHAR(255) DEFAULT NULL;

-- Add comments for documentation
COMMENT ON COLUMN tenants.seo_og_image IS 'Open Graph image URL for social media sharing (recommended: 1200x630px)';
COMMENT ON COLUMN tenants.seo_og_image_alt IS 'Alt text for the Open Graph image';

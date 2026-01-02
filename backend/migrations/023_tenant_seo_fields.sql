-- Migration: Add SEO fields to tenants table for directory profile
-- These fields allow tenants to optimize their listing for search engines

-- SEO Fields for Discovery Profile
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS seo_meta_title VARCHAR(70) DEFAULT NULL;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS seo_meta_description VARCHAR(160) DEFAULT NULL;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS seo_keywords TEXT[] DEFAULT NULL;

-- Add comments for documentation
COMMENT ON COLUMN tenants.seo_meta_title IS 'Custom SEO title for search results (60-70 chars optimal)';
COMMENT ON COLUMN tenants.seo_meta_description IS 'Meta description for search results (150-160 chars optimal)';
COMMENT ON COLUMN tenants.seo_keywords IS 'Array of SEO keywords for the property listing';

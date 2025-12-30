-- ============================================
-- Migration: 013_sections_system.sql
-- Description: Enhanced section system for visual page builder
-- Features: Drag-drop sections with configurable widgets
-- ============================================

-- ============================================
-- 1. ADD SECTIONS COLUMN TO WEBSITE_PAGES
-- Format: [{ id, type, enabled, order, config, styles }]
-- ============================================

-- Add sections JSONB column (separate from content_sections for backwards compatibility)
ALTER TABLE website_pages ADD COLUMN IF NOT EXISTS sections JSONB DEFAULT '[]';

-- Add style variant for page-level theming
ALTER TABLE website_pages ADD COLUMN IF NOT EXISTS style_variant VARCHAR(20) DEFAULT 'light';

-- Comment
COMMENT ON COLUMN website_pages.sections IS 'JSONB array of section configurations for the visual page builder';
COMMENT ON COLUMN website_pages.style_variant IS 'Page style variant: light, dark, colorful';


-- ============================================
-- 2. MEDIA LIBRARY TABLE
-- Store uploaded images/files per tenant
-- ============================================

CREATE TABLE IF NOT EXISTS media_library (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- File info
  filename VARCHAR(255) NOT NULL,
  original_filename VARCHAR(255),
  file_url TEXT NOT NULL,
  file_size INTEGER,
  mime_type VARCHAR(100),

  -- Image dimensions (if applicable)
  width INTEGER,
  height INTEGER,

  -- Metadata
  alt_text TEXT,
  title VARCHAR(255),
  folder VARCHAR(100) DEFAULT 'general',

  -- Usage tracking
  used_in JSONB DEFAULT '[]', -- Array of { page_id, section_id } references

  -- Audit
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_media_library_tenant_id ON media_library(tenant_id);
CREATE INDEX IF NOT EXISTS idx_media_library_folder ON media_library(folder);
CREATE INDEX IF NOT EXISTS idx_media_library_mime_type ON media_library(mime_type);
CREATE INDEX IF NOT EXISTS idx_media_library_created_at ON media_library(created_at DESC);

-- RLS
ALTER TABLE media_library ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role full access media_library" ON media_library;
CREATE POLICY "Service role full access media_library"
  ON media_library FOR ALL
  USING (auth.role() = 'service_role');

-- Trigger
DROP TRIGGER IF EXISTS update_media_library_updated_at ON media_library;
CREATE TRIGGER update_media_library_updated_at
  BEFORE UPDATE ON media_library
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Comment
COMMENT ON TABLE media_library IS 'Media library for tenant uploaded images and files';


-- ============================================
-- 3. WEBSITE REDIRECTS TABLE
-- For SEO and URL management
-- ============================================

CREATE TABLE IF NOT EXISTS website_redirects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- Redirect config
  from_path VARCHAR(500) NOT NULL,
  to_path VARCHAR(500) NOT NULL,
  redirect_type INTEGER DEFAULT 301, -- 301 permanent, 302 temporary
  is_active BOOLEAN DEFAULT true,

  -- Stats
  hit_count INTEGER DEFAULT 0,
  last_hit_at TIMESTAMP WITH TIME ZONE,

  -- Audit
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Constraints
  CONSTRAINT website_redirects_unique_tenant_path UNIQUE (tenant_id, from_path),
  CONSTRAINT website_redirects_valid_type CHECK (redirect_type IN (301, 302, 307, 308))
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_website_redirects_tenant_id ON website_redirects(tenant_id);
CREATE INDEX IF NOT EXISTS idx_website_redirects_from_path ON website_redirects(from_path);
CREATE INDEX IF NOT EXISTS idx_website_redirects_is_active ON website_redirects(is_active);

-- RLS
ALTER TABLE website_redirects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role full access website_redirects" ON website_redirects;
CREATE POLICY "Service role full access website_redirects"
  ON website_redirects FOR ALL
  USING (auth.role() = 'service_role');

-- Trigger
DROP TRIGGER IF EXISTS update_website_redirects_updated_at ON website_redirects;
CREATE TRIGGER update_website_redirects_updated_at
  BEFORE UPDATE ON website_redirects
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Comment
COMMENT ON TABLE website_redirects IS 'URL redirects for SEO and broken link management';


-- ============================================
-- 4. UPDATE TEMPLATE CONSTRAINT FOR 8 TEMPLATES
-- ============================================

-- Drop old constraint
ALTER TABLE website_pages DROP CONSTRAINT IF EXISTS website_pages_valid_template;

-- Add new constraint allowing 1-8
ALTER TABLE website_pages ADD CONSTRAINT website_pages_valid_template
  CHECK (template_id BETWEEN 1 AND 8);


-- ============================================
-- 5. BLOG ENHANCEMENTS
-- ============================================

-- Add scheduled publishing
ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMP WITH TIME ZONE;

-- Add auto-save content
ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS auto_save_content TEXT;
ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS auto_save_at TIMESTAMP WITH TIME ZONE;

-- Add block-based content storage
ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS blocks JSONB DEFAULT '[]';

-- Comments
COMMENT ON COLUMN blog_posts.scheduled_at IS 'Scheduled publish date/time';
COMMENT ON COLUMN blog_posts.auto_save_content IS 'Auto-saved draft content';
COMMENT ON COLUMN blog_posts.blocks IS 'Block-based content structure for visual editor';


-- ============================================
-- 6. DEFAULT SECTIONS FOR NEW PAGES
-- ============================================

-- Function to get default sections for a page type
CREATE OR REPLACE FUNCTION get_default_sections(p_page_type VARCHAR)
RETURNS JSONB AS $$
BEGIN
  CASE p_page_type
    WHEN 'home' THEN
      RETURN '[
        {"id": "hero-1", "type": "hero", "enabled": true, "order": 1, "config": {"title": "Welcome", "subtitle": "Your perfect stay awaits", "ctaText": "Book Now", "ctaLink": "/book"}},
        {"id": "features-1", "type": "features", "enabled": true, "order": 2, "config": {"title": "Why Choose Us", "columns": 3}},
        {"id": "rooms-1", "type": "room_grid", "enabled": true, "order": 3, "config": {"title": "Our Rooms", "limit": 4}},
        {"id": "testimonials-1", "type": "testimonials", "enabled": true, "order": 4, "config": {"title": "What Our Guests Say"}},
        {"id": "cta-1", "type": "cta", "enabled": true, "order": 5, "config": {"title": "Ready to Book?", "buttonText": "Reserve Now", "buttonLink": "/book"}}
      ]'::JSONB;
    WHEN 'accommodation' THEN
      RETURN '[
        {"id": "hero-1", "type": "hero", "enabled": true, "order": 1, "config": {"title": "Our Rooms", "subtitle": "Find your perfect stay", "height": "medium"}},
        {"id": "rooms-1", "type": "room_grid", "enabled": true, "order": 2, "config": {"showAll": true, "layout": "grid"}}
      ]'::JSONB;
    WHEN 'reviews' THEN
      RETURN '[
        {"id": "hero-1", "type": "hero", "enabled": true, "order": 1, "config": {"title": "Guest Reviews", "subtitle": "See what our guests say", "height": "small"}},
        {"id": "reviews-1", "type": "review_grid", "enabled": true, "order": 2, "config": {"showAll": true}}
      ]'::JSONB;
    WHEN 'contact' THEN
      RETURN '[
        {"id": "hero-1", "type": "hero", "enabled": true, "order": 1, "config": {"title": "Contact Us", "subtitle": "Get in touch", "height": "small"}},
        {"id": "contact-1", "type": "contact_form", "enabled": true, "order": 2, "config": {"showMap": true, "showDetails": true}}
      ]'::JSONB;
    WHEN 'book' THEN
      RETURN '[
        {"id": "booking-1", "type": "booking_widget", "enabled": true, "order": 1, "config": {"fullScreen": true}}
      ]'::JSONB;
    ELSE
      RETURN '[]'::JSONB;
  END CASE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Comment
COMMENT ON FUNCTION get_default_sections(VARCHAR) IS 'Returns default section configuration for a page type';

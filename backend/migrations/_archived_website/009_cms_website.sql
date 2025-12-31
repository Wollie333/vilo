-- ============================================
-- Migration: 009_cms_website.sql
-- Description: CMS for multi-tenant website customization
-- Features: Website settings, pages, templates, blog posts with SEO
-- ============================================

-- ============================================
-- 1. WEBSITE SETTINGS TABLE
-- Global branding and SEO settings per tenant
-- ============================================

CREATE TABLE IF NOT EXISTS website_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- Branding: Colors
  primary_color VARCHAR(7) DEFAULT '#1f2937',
  secondary_color VARCHAR(7) DEFAULT '#374151',
  accent_color VARCHAR(7) DEFAULT '#3b82f6',
  background_color VARCHAR(7) DEFAULT '#ffffff',
  text_color VARCHAR(7) DEFAULT '#111827',

  -- Branding: Fonts (Google Fonts names)
  heading_font VARCHAR(100) DEFAULT 'Inter',
  body_font VARCHAR(100) DEFAULT 'Inter',

  -- Default SEO (fallback for pages without custom SEO)
  default_seo_title VARCHAR(70),
  default_seo_description VARCHAR(160),
  default_og_image_url TEXT,

  -- Social Media Links
  social_links JSONB DEFAULT '{}',

  -- Analytics
  google_analytics_id VARCHAR(50),
  facebook_pixel_id VARCHAR(50),

  -- Audit
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- One settings record per tenant
  CONSTRAINT website_settings_unique_tenant UNIQUE (tenant_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_website_settings_tenant_id ON website_settings(tenant_id);

-- RLS
ALTER TABLE website_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their tenant website_settings" ON website_settings;
DROP POLICY IF EXISTS "Users can insert their tenant website_settings" ON website_settings;
DROP POLICY IF EXISTS "Users can update their tenant website_settings" ON website_settings;
DROP POLICY IF EXISTS "Public can view website_settings" ON website_settings;
DROP POLICY IF EXISTS "Service role full access website_settings" ON website_settings;

CREATE POLICY "Service role full access website_settings"
  ON website_settings FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Public can view website_settings"
  ON website_settings FOR SELECT
  USING (true);

-- Trigger
DROP TRIGGER IF EXISTS update_website_settings_updated_at ON website_settings;
CREATE TRIGGER update_website_settings_updated_at
  BEFORE UPDATE ON website_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();


-- ============================================
-- 2. WEBSITE PAGES TABLE
-- Pre-defined pages with template selection and SEO
-- ============================================

CREATE TABLE IF NOT EXISTS website_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- Page identification
  page_type VARCHAR(30) NOT NULL,
  slug VARCHAR(100) NOT NULL,

  -- Template selection (1-3 for each page type)
  template_id INTEGER NOT NULL DEFAULT 1,

  -- Page title and status
  title VARCHAR(255) NOT NULL,
  is_published BOOLEAN DEFAULT true,
  is_in_navigation BOOLEAN DEFAULT true,
  navigation_order INTEGER DEFAULT 0,

  -- SEO Fields (Critical)
  seo_title VARCHAR(70),
  seo_description VARCHAR(160),
  seo_keywords TEXT,
  og_image_url TEXT,
  canonical_url TEXT,
  no_index BOOLEAN DEFAULT false,

  -- Page-specific branding overrides (NULL = use global settings)
  override_primary_color VARCHAR(7),
  override_secondary_color VARCHAR(7),
  override_accent_color VARCHAR(7),
  override_heading_font VARCHAR(100),
  override_body_font VARCHAR(100),

  -- Hero section content
  hero_title TEXT,
  hero_subtitle TEXT,
  hero_image_url TEXT,
  hero_cta_text VARCHAR(100),
  hero_cta_link VARCHAR(255),

  -- Custom content sections (flexible JSONB)
  content_sections JSONB DEFAULT '[]',

  -- Audit
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Constraints
  CONSTRAINT website_pages_unique_tenant_type UNIQUE (tenant_id, page_type),
  CONSTRAINT website_pages_unique_tenant_slug UNIQUE (tenant_id, slug),
  CONSTRAINT website_pages_valid_page_type CHECK (page_type IN ('home', 'accommodation', 'reviews', 'contact', 'blog', 'book', 'room_detail')),
  CONSTRAINT website_pages_valid_template CHECK (template_id BETWEEN 1 AND 3)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_website_pages_tenant_id ON website_pages(tenant_id);
CREATE INDEX IF NOT EXISTS idx_website_pages_page_type ON website_pages(page_type);
CREATE INDEX IF NOT EXISTS idx_website_pages_slug ON website_pages(slug);
CREATE INDEX IF NOT EXISTS idx_website_pages_published ON website_pages(is_published);

-- RLS
ALTER TABLE website_pages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role full access website_pages" ON website_pages;
DROP POLICY IF EXISTS "Public can view published website_pages" ON website_pages;

CREATE POLICY "Service role full access website_pages"
  ON website_pages FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Public can view published website_pages"
  ON website_pages FOR SELECT
  USING (is_published = true);

-- Trigger
DROP TRIGGER IF EXISTS update_website_pages_updated_at ON website_pages;
CREATE TRIGGER update_website_pages_updated_at
  BEFORE UPDATE ON website_pages
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();


-- ============================================
-- 3. BLOG CATEGORIES TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS blog_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  name VARCHAR(100) NOT NULL,
  slug VARCHAR(100) NOT NULL,
  description TEXT,
  color VARCHAR(7) DEFAULT '#3b82f6',

  -- Audit
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Constraints
  CONSTRAINT blog_categories_unique_tenant_slug UNIQUE (tenant_id, slug)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_blog_categories_tenant_id ON blog_categories(tenant_id);
CREATE INDEX IF NOT EXISTS idx_blog_categories_slug ON blog_categories(slug);

-- RLS
ALTER TABLE blog_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role full access blog_categories" ON blog_categories;
DROP POLICY IF EXISTS "Public can view blog_categories" ON blog_categories;

CREATE POLICY "Service role full access blog_categories"
  ON blog_categories FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Public can view blog_categories"
  ON blog_categories FOR SELECT
  USING (true);

-- Trigger
DROP TRIGGER IF EXISTS update_blog_categories_updated_at ON blog_categories;
CREATE TRIGGER update_blog_categories_updated_at
  BEFORE UPDATE ON blog_categories
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();


-- ============================================
-- 4. BLOG POSTS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS blog_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- Basic Info
  title VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL,
  excerpt TEXT,
  content TEXT NOT NULL,

  -- Featured Image
  featured_image_url TEXT,
  featured_image_alt VARCHAR(255),

  -- Author Info
  author_name VARCHAR(100),
  author_avatar_url TEXT,

  -- Category
  category_id UUID REFERENCES blog_categories(id) ON DELETE SET NULL,

  -- Tags (JSONB array of strings)
  tags JSONB DEFAULT '[]',

  -- Publishing
  status VARCHAR(20) NOT NULL DEFAULT 'draft',
  published_at TIMESTAMP WITH TIME ZONE,

  -- SEO Fields (Critical)
  seo_title VARCHAR(70),
  seo_description VARCHAR(160),
  og_image_url TEXT,
  canonical_url TEXT,
  no_index BOOLEAN DEFAULT false,

  -- Reading time (calculated)
  reading_time_minutes INTEGER DEFAULT 5,

  -- View count
  view_count INTEGER DEFAULT 0,

  -- Audit
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Constraints
  CONSTRAINT blog_posts_unique_tenant_slug UNIQUE (tenant_id, slug),
  CONSTRAINT blog_posts_valid_status CHECK (status IN ('draft', 'published', 'archived'))
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_blog_posts_tenant_id ON blog_posts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_blog_posts_slug ON blog_posts(slug);
CREATE INDEX IF NOT EXISTS idx_blog_posts_status ON blog_posts(status);
CREATE INDEX IF NOT EXISTS idx_blog_posts_published_at ON blog_posts(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_blog_posts_category_id ON blog_posts(category_id);
CREATE INDEX IF NOT EXISTS idx_blog_posts_tags ON blog_posts USING GIN (tags);

-- RLS
ALTER TABLE blog_posts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role full access blog_posts" ON blog_posts;
DROP POLICY IF EXISTS "Public can view published blog_posts" ON blog_posts;

CREATE POLICY "Service role full access blog_posts"
  ON blog_posts FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Public can view published blog_posts"
  ON blog_posts FOR SELECT
  USING (status = 'published' AND published_at <= NOW());

-- Trigger
DROP TRIGGER IF EXISTS update_blog_posts_updated_at ON blog_posts;
CREATE TRIGGER update_blog_posts_updated_at
  BEFORE UPDATE ON blog_posts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();


-- ============================================
-- 5. HELPER FUNCTION: Calculate reading time
-- ============================================

CREATE OR REPLACE FUNCTION calculate_reading_time(content TEXT)
RETURNS INTEGER AS $$
DECLARE
  word_count INTEGER;
  words_per_minute INTEGER := 200;
BEGIN
  word_count := array_length(
    regexp_split_to_array(
      regexp_replace(COALESCE(content, ''), '<[^>]*>', '', 'g'),
      '\s+'
    ),
    1
  );
  RETURN GREATEST(1, CEIL(COALESCE(word_count, 200)::DECIMAL / words_per_minute));
END;
$$ LANGUAGE plpgsql IMMUTABLE;


-- Trigger function to auto-calculate reading time
CREATE OR REPLACE FUNCTION update_blog_post_reading_time()
RETURNS TRIGGER AS $$
BEGIN
  NEW.reading_time_minutes := calculate_reading_time(NEW.content);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_blog_posts_reading_time ON blog_posts;
CREATE TRIGGER trigger_blog_posts_reading_time
  BEFORE INSERT OR UPDATE OF content ON blog_posts
  FOR EACH ROW
  EXECUTE FUNCTION update_blog_post_reading_time();


-- ============================================
-- 6. SEED FUNCTION FOR NEW TENANTS
-- ============================================

CREATE OR REPLACE FUNCTION seed_tenant_website_data(p_tenant_id UUID)
RETURNS VOID AS $$
BEGIN
  -- Insert default website settings
  INSERT INTO website_settings (tenant_id)
  VALUES (p_tenant_id)
  ON CONFLICT (tenant_id) DO NOTHING;

  -- Insert default pages
  INSERT INTO website_pages (tenant_id, page_type, slug, title, template_id, navigation_order, hero_title, hero_subtitle) VALUES
    (p_tenant_id, 'home', 'home', 'Home', 1, 1, 'Welcome to Our Guest House', 'Your home away from home'),
    (p_tenant_id, 'accommodation', 'accommodation', 'Accommodation', 1, 2, 'Our Rooms', 'Find the perfect room for your stay'),
    (p_tenant_id, 'reviews', 'reviews', 'Reviews', 1, 3, 'Guest Reviews', 'See what our guests say about us'),
    (p_tenant_id, 'blog', 'blog', 'Blog', 1, 4, 'Our Blog', 'Travel tips, local guides, and updates'),
    (p_tenant_id, 'contact', 'contact', 'Contact', 1, 5, 'Contact Us', 'Get in touch with us'),
    (p_tenant_id, 'book', 'book', 'Book Now', 1, 6, 'Book Your Stay', 'Quick and easy online booking'),
    (p_tenant_id, 'room_detail', 'room', 'Room Details', 1, 0, NULL, NULL)
  ON CONFLICT (tenant_id, page_type) DO NOTHING;

  -- Insert default blog category
  INSERT INTO blog_categories (tenant_id, name, slug, description)
  VALUES (p_tenant_id, 'General', 'general', 'General posts and updates')
  ON CONFLICT (tenant_id, slug) DO NOTHING;
END;
$$ LANGUAGE plpgsql;


-- ============================================
-- 7. SEED DATA FOR EXISTING TENANTS
-- ============================================

DO $$
DECLARE
  t RECORD;
BEGIN
  FOR t IN SELECT id FROM tenants LOOP
    PERFORM seed_tenant_website_data(t.id);
  END LOOP;
END $$;


-- ============================================
-- 8. AUTO-SEED TRIGGER FOR NEW TENANTS
-- ============================================

CREATE OR REPLACE FUNCTION trigger_seed_new_tenant_website()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM seed_tenant_website_data(NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_tenant_website_seed ON tenants;
CREATE TRIGGER trigger_tenant_website_seed
  AFTER INSERT ON tenants
  FOR EACH ROW
  EXECUTE FUNCTION trigger_seed_new_tenant_website();


-- ============================================
-- 9. COMMENTS
-- ============================================

COMMENT ON TABLE website_settings IS 'Global website branding and SEO settings per tenant';
COMMENT ON TABLE website_pages IS 'Pre-defined website pages with template selection and SEO';
COMMENT ON TABLE blog_categories IS 'Categories for organizing blog posts';
COMMENT ON TABLE blog_posts IS 'Blog posts with full content, SEO, and publishing workflow';

COMMENT ON COLUMN website_pages.template_id IS 'Template variant (1-3) for layout/style selection';
COMMENT ON COLUMN website_pages.seo_title IS 'Browser tab title (60-70 chars optimal)';
COMMENT ON COLUMN website_pages.seo_description IS 'Meta description (150-160 chars optimal)';
COMMENT ON COLUMN blog_posts.seo_title IS 'SEO title for search results (60-70 chars optimal)';
COMMENT ON COLUMN blog_posts.seo_description IS 'Meta description for search results (150-160 chars optimal)';
COMMENT ON COLUMN blog_posts.tags IS 'JSONB array of tag strings for flexible tagging';
COMMENT ON COLUMN blog_posts.status IS 'Publishing status: draft, published, archived';

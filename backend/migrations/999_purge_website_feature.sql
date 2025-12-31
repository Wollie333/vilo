-- ============================================
-- WEBSITE FEATURE PURGE MIGRATION
-- ============================================
-- This migration removes all website/CMS related tables, columns, views, and functions
-- Run this migration to clean up the database after removing website feature code
-- ============================================

-- Step 1: Drop triggers on tenants table (always exists)
DROP TRIGGER IF EXISTS trigger_tenant_website_seed ON tenants;
DROP TRIGGER IF EXISTS trigger_auto_generate_tenant_slug ON tenants;
DROP TRIGGER IF EXISTS trigger_validate_tenant_slug ON tenants;
DROP TRIGGER IF EXISTS trigger_validate_custom_domain ON tenants;

-- Step 1b: Safely drop triggers on tables that might not exist
DO $$
BEGIN
  -- blog_posts triggers
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'blog_posts') THEN
    DROP TRIGGER IF EXISTS trigger_blog_posts_reading_time ON blog_posts;
    DROP TRIGGER IF EXISTS update_blog_posts_updated_at ON blog_posts;
  END IF;

  -- website_settings triggers
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'website_settings') THEN
    DROP TRIGGER IF EXISTS update_website_settings_updated_at ON website_settings;
  END IF;

  -- website_pages triggers
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'website_pages') THEN
    DROP TRIGGER IF EXISTS update_website_pages_updated_at ON website_pages;
  END IF;

  -- blog_categories triggers
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'blog_categories') THEN
    DROP TRIGGER IF EXISTS update_blog_categories_updated_at ON blog_categories;
  END IF;

  -- media_library triggers
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'media_library') THEN
    DROP TRIGGER IF EXISTS update_media_library_updated_at ON media_library;
  END IF;
END $$;

-- Step 2: Drop functions
DROP FUNCTION IF EXISTS seed_tenant_website_data() CASCADE;
DROP FUNCTION IF EXISTS trigger_seed_new_tenant_website() CASCADE;
DROP FUNCTION IF EXISTS calculate_reading_time(TEXT) CASCADE;
DROP FUNCTION IF EXISTS update_blog_post_reading_time() CASCADE;
DROP FUNCTION IF EXISTS get_default_sections(TEXT) CASCADE;
DROP FUNCTION IF EXISTS generate_slug_from_text(TEXT) CASCADE;
DROP FUNCTION IF EXISTS auto_generate_tenant_slug() CASCADE;
DROP FUNCTION IF EXISTS validate_tenant_slug() CASCADE;
DROP FUNCTION IF EXISTS validate_custom_domain() CASCADE;

-- Step 3: Drop views
DROP VIEW IF EXISTS directory_listings CASCADE;
DROP VIEW IF EXISTS tenant_domain_status CASCADE;

-- Step 4: Drop tables (in order, respecting foreign keys)
DROP TABLE IF EXISTS media_library CASCADE;
DROP TABLE IF EXISTS website_redirects CASCADE;
DROP TABLE IF EXISTS blog_posts CASCADE;
DROP TABLE IF EXISTS blog_categories CASCADE;
DROP TABLE IF EXISTS website_pages CASCADE;
DROP TABLE IF EXISTS website_settings CASCADE;
DROP TABLE IF EXISTS domain_verifications CASCADE;
DROP TABLE IF EXISTS reserved_slugs CASCADE;

-- Step 5: Remove website/domain columns from tenants table
ALTER TABLE tenants
  DROP COLUMN IF EXISTS slug CASCADE,
  DROP COLUMN IF EXISTS custom_domain CASCADE,
  DROP COLUMN IF EXISTS domain_verification_status CASCADE,
  DROP COLUMN IF EXISTS domain_verified_at CASCADE,
  DROP COLUMN IF EXISTS ssl_status CASCADE,
  DROP COLUMN IF EXISTS ssl_issued_at CASCADE,
  DROP COLUMN IF EXISTS ssl_expires_at CASCADE,
  DROP COLUMN IF EXISTS is_listed_in_directory CASCADE,
  DROP COLUMN IF EXISTS directory_description CASCADE,
  DROP COLUMN IF EXISTS directory_featured_image_url CASCADE,
  DROP COLUMN IF EXISTS directory_tags CASCADE;

-- ============================================
-- VERIFICATION QUERIES (run after migration)
-- ============================================
-- SELECT table_name FROM information_schema.tables
-- WHERE table_schema = 'public'
-- AND table_name IN ('media_library', 'website_redirects', 'blog_posts', 'blog_categories', 'website_pages', 'website_settings', 'domain_verifications', 'reserved_slugs');
-- Should return 0 rows

-- SELECT column_name FROM information_schema.columns
-- WHERE table_name = 'tenants'
-- AND column_name IN ('slug', 'custom_domain', 'domain_verification_status', 'is_listed_in_directory');
-- Should return 0 rows

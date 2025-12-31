-- ============================================
-- Migration: 012_custom_domains.sql
-- Description: Custom domain and subdomain support for multi-tenant websites
-- Features: Subdomain slugs, custom domains, DNS verification, directory listing
-- ============================================

-- ============================================
-- 1. ADD DOMAIN COLUMNS TO TENANTS TABLE
-- ============================================

-- Subdomain slug (e.g., "sunset-lodge" for sunset-lodge.vilo.io)
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS slug VARCHAR(63) UNIQUE;

-- Custom domain (e.g., "book.myhotel.com")
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS custom_domain VARCHAR(255) UNIQUE;

-- Domain verification status
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS domain_verification_status VARCHAR(20) DEFAULT 'pending';
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS domain_verified_at TIMESTAMP WITH TIME ZONE;

-- SSL certificate status
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS ssl_status VARCHAR(20) DEFAULT 'pending';
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS ssl_issued_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS ssl_expires_at TIMESTAMP WITH TIME ZONE;

-- Directory listing (opt-in for vilo.io property directory)
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS is_listed_in_directory BOOLEAN DEFAULT false;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS directory_description TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS directory_featured_image_url TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS directory_tags TEXT[] DEFAULT '{}';

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_tenants_slug ON tenants(slug) WHERE slug IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tenants_custom_domain ON tenants(custom_domain) WHERE custom_domain IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tenants_directory ON tenants(is_listed_in_directory) WHERE is_listed_in_directory = true;

-- Comments for documentation
COMMENT ON COLUMN tenants.slug IS 'URL-friendly identifier for subdomain (e.g., slug.vilo.io)';
COMMENT ON COLUMN tenants.custom_domain IS 'Custom domain connected by tenant (e.g., book.myguesthouse.com)';
COMMENT ON COLUMN tenants.domain_verification_status IS 'CNAME verification status: pending, verifying, verified, failed';
COMMENT ON COLUMN tenants.ssl_status IS 'SSL certificate status: pending, provisioning, active, expired, failed';
COMMENT ON COLUMN tenants.is_listed_in_directory IS 'Whether property appears in vilo.io public directory (opt-in)';
COMMENT ON COLUMN tenants.directory_description IS 'Short description for directory listing';
COMMENT ON COLUMN tenants.directory_tags IS 'Tags for directory filtering (e.g., beach, mountain, luxury)';

-- ============================================
-- 2. DOMAIN VERIFICATIONS AUDIT TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS domain_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  domain VARCHAR(255) NOT NULL,
  verification_type VARCHAR(20) NOT NULL DEFAULT 'cname',
  expected_value VARCHAR(500) NOT NULL,
  actual_value VARCHAR(500),
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  error_message TEXT,
  checked_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT domain_verifications_type_valid
    CHECK (verification_type IN ('cname', 'txt', 'http')),
  CONSTRAINT domain_verifications_status_valid
    CHECK (status IN ('pending', 'success', 'failed'))
);

CREATE INDEX IF NOT EXISTS idx_domain_verifications_tenant ON domain_verifications(tenant_id);
CREATE INDEX IF NOT EXISTS idx_domain_verifications_domain ON domain_verifications(domain);

-- RLS for domain_verifications
ALTER TABLE domain_verifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role has full access to domain_verifications" ON domain_verifications;
CREATE POLICY "Service role has full access to domain_verifications"
  ON domain_verifications
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================
-- 3. SLUG GENERATION FUNCTION
-- ============================================

CREATE OR REPLACE FUNCTION generate_slug_from_text(input_text TEXT)
RETURNS TEXT AS $$
DECLARE
  result TEXT;
BEGIN
  -- Convert to lowercase
  result := LOWER(input_text);

  -- Replace spaces and special chars with hyphens
  result := REGEXP_REPLACE(result, '[^a-z0-9]+', '-', 'g');

  -- Remove leading/trailing hyphens
  result := TRIM(BOTH '-' FROM result);

  -- Limit length to 50 chars (leaving room for suffix)
  result := SUBSTRING(result, 1, 50);

  -- Remove trailing hyphen if truncation created one
  result := TRIM(BOTH '-' FROM result);

  RETURN result;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================
-- 4. AUTO-GENERATE SLUG FOR NEW TENANTS
-- ============================================

CREATE OR REPLACE FUNCTION auto_generate_tenant_slug()
RETURNS TRIGGER AS $$
DECLARE
  base_slug TEXT;
  final_slug TEXT;
  counter INTEGER := 0;
BEGIN
  -- Only generate if slug is not provided
  IF NEW.slug IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- Generate base slug from business_name or name
  base_slug := generate_slug_from_text(
    COALESCE(NEW.business_name, NEW.name, 'property')
  );

  -- Ensure we have something
  IF base_slug IS NULL OR base_slug = '' THEN
    base_slug := 'property';
  END IF;

  -- Find unique slug
  final_slug := base_slug;
  WHILE EXISTS (SELECT 1 FROM tenants WHERE slug = final_slug AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)) LOOP
    counter := counter + 1;
    final_slug := base_slug || '-' || counter;
  END LOOP;

  NEW.slug := final_slug;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for auto-generating slug
DROP TRIGGER IF EXISTS trigger_auto_generate_tenant_slug ON tenants;
CREATE TRIGGER trigger_auto_generate_tenant_slug
  BEFORE INSERT ON tenants
  FOR EACH ROW
  EXECUTE FUNCTION auto_generate_tenant_slug();

-- ============================================
-- 5. RESERVED SLUGS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS reserved_slugs (
  slug VARCHAR(63) PRIMARY KEY,
  reason VARCHAR(255) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert reserved slugs (system subdomains)
INSERT INTO reserved_slugs (slug, reason) VALUES
  ('www', 'Main website'),
  ('api', 'API subdomain'),
  ('app', 'Application subdomain'),
  ('admin', 'Admin panel'),
  ('dashboard', 'Dashboard subdomain'),
  ('domains', 'Domain verification endpoint'),
  ('mail', 'Email subdomain'),
  ('smtp', 'SMTP subdomain'),
  ('ftp', 'FTP subdomain'),
  ('blog', 'Blog subdomain'),
  ('help', 'Help/Support subdomain'),
  ('support', 'Support subdomain'),
  ('status', 'Status page subdomain'),
  ('docs', 'Documentation subdomain'),
  ('cdn', 'CDN subdomain'),
  ('assets', 'Assets subdomain'),
  ('static', 'Static files subdomain'),
  ('images', 'Images subdomain'),
  ('img', 'Images subdomain'),
  ('files', 'Files subdomain'),
  ('download', 'Downloads subdomain'),
  ('uploads', 'Uploads subdomain'),
  ('media', 'Media subdomain'),
  ('secure', 'Secure subdomain'),
  ('login', 'Login subdomain'),
  ('auth', 'Authentication subdomain'),
  ('oauth', 'OAuth subdomain'),
  ('sso', 'SSO subdomain'),
  ('account', 'Account subdomain'),
  ('accounts', 'Accounts subdomain'),
  ('billing', 'Billing subdomain'),
  ('pay', 'Payment subdomain'),
  ('checkout', 'Checkout subdomain'),
  ('shop', 'Shop subdomain'),
  ('store', 'Store subdomain'),
  ('test', 'Testing subdomain'),
  ('staging', 'Staging subdomain'),
  ('dev', 'Development subdomain'),
  ('demo', 'Demo subdomain'),
  ('sandbox', 'Sandbox subdomain'),
  ('preview', 'Preview subdomain'),
  ('beta', 'Beta subdomain'),
  ('alpha', 'Alpha subdomain'),
  ('vilo', 'Brand name'),
  ('viloio', 'Brand name variant'),
  ('directory', 'Directory page'),
  ('properties', 'Properties listing'),
  ('search', 'Search functionality'),
  ('explore', 'Explore page'),
  ('book', 'Booking subdomain'),
  ('booking', 'Booking subdomain'),
  ('bookings', 'Bookings subdomain'),
  ('reserve', 'Reservation subdomain'),
  ('reservation', 'Reservation subdomain')
ON CONFLICT (slug) DO NOTHING;

-- ============================================
-- 6. SLUG VALIDATION FUNCTION
-- ============================================

CREATE OR REPLACE FUNCTION validate_tenant_slug()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if slug is reserved
  IF EXISTS (SELECT 1 FROM reserved_slugs WHERE slug = NEW.slug) THEN
    RAISE EXCEPTION 'This subdomain is reserved and cannot be used';
  END IF;

  -- Validate slug format (lowercase alphanumeric with hyphens)
  IF NEW.slug !~ '^[a-z0-9]([a-z0-9-]*[a-z0-9])?$' THEN
    RAISE EXCEPTION 'Invalid slug format. Use lowercase letters, numbers, and hyphens only. Must start and end with alphanumeric.';
  END IF;

  -- Check minimum length
  IF LENGTH(NEW.slug) < 3 THEN
    RAISE EXCEPTION 'Subdomain must be at least 3 characters long';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create validation trigger
DROP TRIGGER IF EXISTS trigger_validate_tenant_slug ON tenants;
CREATE TRIGGER trigger_validate_tenant_slug
  BEFORE INSERT OR UPDATE OF slug ON tenants
  FOR EACH ROW
  WHEN (NEW.slug IS NOT NULL)
  EXECUTE FUNCTION validate_tenant_slug();

-- ============================================
-- 7. CUSTOM DOMAIN VALIDATION
-- ============================================

CREATE OR REPLACE FUNCTION validate_custom_domain()
RETURNS TRIGGER AS $$
BEGIN
  -- Basic domain format validation
  IF NEW.custom_domain IS NOT NULL THEN
    -- Must be lowercase
    NEW.custom_domain := LOWER(NEW.custom_domain);

    -- Basic format check (simplified - real validation happens in backend)
    IF NEW.custom_domain !~ '^[a-z0-9]([a-z0-9-]*\.)+[a-z]{2,}$' THEN
      RAISE EXCEPTION 'Invalid domain format';
    END IF;

    -- Block vilo.io domains (users should use slug instead)
    IF NEW.custom_domain LIKE '%.vilo.io' THEN
      RAISE EXCEPTION 'Cannot use vilo.io as custom domain. Use the subdomain feature instead.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create domain validation trigger
DROP TRIGGER IF EXISTS trigger_validate_custom_domain ON tenants;
CREATE TRIGGER trigger_validate_custom_domain
  BEFORE INSERT OR UPDATE OF custom_domain ON tenants
  FOR EACH ROW
  WHEN (NEW.custom_domain IS NOT NULL)
  EXECUTE FUNCTION validate_custom_domain();

-- ============================================
-- 8. BACKFILL SLUGS FOR EXISTING TENANTS
-- ============================================

-- Generate slugs for existing tenants that don't have one
DO $$
DECLARE
  tenant_record RECORD;
  base_slug TEXT;
  final_slug TEXT;
  counter INTEGER;
BEGIN
  FOR tenant_record IN
    SELECT id, name, business_name
    FROM tenants
    WHERE slug IS NULL
  LOOP
    -- Generate base slug
    base_slug := generate_slug_from_text(
      COALESCE(tenant_record.business_name, tenant_record.name, 'property')
    );

    IF base_slug IS NULL OR base_slug = '' THEN
      base_slug := 'property';
    END IF;

    -- Find unique slug
    counter := 0;
    final_slug := base_slug;
    WHILE EXISTS (SELECT 1 FROM tenants WHERE slug = final_slug) LOOP
      counter := counter + 1;
      final_slug := base_slug || '-' || counter;
    END LOOP;

    -- Update tenant
    UPDATE tenants SET slug = final_slug WHERE id = tenant_record.id;

    RAISE NOTICE 'Generated slug % for tenant %', final_slug, tenant_record.id;
  END LOOP;
END $$;

-- ============================================
-- 9. HELPFUL VIEWS
-- ============================================

-- View for directory listings
CREATE OR REPLACE VIEW directory_listings AS
SELECT
  t.id,
  t.slug,
  t.custom_domain,
  t.business_name,
  t.business_description,
  t.directory_description,
  t.directory_featured_image_url,
  t.directory_tags,
  t.logo_url,
  t.city,
  t.state_province,
  t.country,
  CASE
    WHEN t.custom_domain IS NOT NULL AND t.domain_verification_status = 'verified'
    THEN t.custom_domain
    ELSE t.slug || '.vilo.io'
  END AS website_url,
  ws.primary_color,
  ws.accent_color
FROM tenants t
LEFT JOIN website_settings ws ON ws.tenant_id = t.id
WHERE t.is_listed_in_directory = true
ORDER BY t.business_name;

-- View for tenant domain status
CREATE OR REPLACE VIEW tenant_domain_status AS
SELECT
  t.id,
  t.name,
  t.business_name,
  t.slug,
  t.slug || '.vilo.io' AS subdomain_url,
  t.custom_domain,
  t.domain_verification_status,
  t.domain_verified_at,
  t.ssl_status,
  t.ssl_expires_at,
  t.is_listed_in_directory,
  CASE
    WHEN t.custom_domain IS NOT NULL AND t.domain_verification_status = 'verified'
    THEN t.custom_domain
    WHEN t.slug IS NOT NULL
    THEN t.slug || '.vilo.io'
    ELSE NULL
  END AS active_domain
FROM tenants t;

-- ============================================
-- 10. GRANT PERMISSIONS
-- ============================================

-- Grant permissions to service role
GRANT ALL ON domain_verifications TO service_role;
GRANT ALL ON reserved_slugs TO service_role;
GRANT SELECT ON directory_listings TO service_role;
GRANT SELECT ON tenant_domain_status TO service_role;

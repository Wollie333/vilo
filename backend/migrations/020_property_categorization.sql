-- Migration: Property Categorization & Geographic Hierarchy
-- Creates tables for countries, provinces, destinations, and property categories
-- Adds geographic fields to tenants table

-- ============================================
-- 1. CREATE COUNTRIES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS countries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  code CHAR(2) NOT NULL UNIQUE,
  slug VARCHAR(100) NOT NULL UNIQUE,
  is_active BOOLEAN DEFAULT TRUE,
  display_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed countries (South Africa + neighboring)
INSERT INTO countries (name, code, slug, display_order) VALUES
  ('South Africa', 'ZA', 'south-africa', 1),
  ('Namibia', 'NA', 'namibia', 2),
  ('Botswana', 'BW', 'botswana', 3),
  ('Zimbabwe', 'ZW', 'zimbabwe', 4),
  ('Mozambique', 'MZ', 'mozambique', 5),
  ('Eswatini', 'SZ', 'eswatini', 6),
  ('Lesotho', 'LS', 'lesotho', 7)
ON CONFLICT (code) DO NOTHING;

-- ============================================
-- 2. CREATE PROVINCES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS provinces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  country_id UUID NOT NULL REFERENCES countries(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(100) NOT NULL UNIQUE,
  abbreviation VARCHAR(10),
  image_url TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  display_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed South African provinces
INSERT INTO provinces (country_id, name, slug, abbreviation, display_order)
SELECT c.id, p.name, p.slug, p.abbr, p.ord
FROM countries c
CROSS JOIN (VALUES
  ('Western Cape', 'western-cape', 'WC', 1),
  ('Gauteng', 'gauteng', 'GP', 2),
  ('KwaZulu-Natal', 'kwazulu-natal', 'KZN', 3),
  ('Eastern Cape', 'eastern-cape', 'EC', 4),
  ('Limpopo', 'limpopo', 'LP', 5),
  ('Mpumalanga', 'mpumalanga', 'MP', 6),
  ('North West', 'north-west', 'NW', 7),
  ('Free State', 'free-state', 'FS', 8),
  ('Northern Cape', 'northern-cape', 'NC', 9)
) AS p(name, slug, abbr, ord)
WHERE c.code = 'ZA'
ON CONFLICT (slug) DO NOTHING;

-- Seed regions for neighboring countries
INSERT INTO provinces (country_id, name, slug, abbreviation, display_order)
SELECT c.id, 'Windhoek Region', 'windhoek-region', 'WR', 1 FROM countries c WHERE c.code = 'NA'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO provinces (country_id, name, slug, abbreviation, display_order)
SELECT c.id, 'Chobe District', 'chobe-district', 'CH', 1 FROM countries c WHERE c.code = 'BW'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO provinces (country_id, name, slug, abbreviation, display_order)
SELECT c.id, 'Victoria Falls', 'victoria-falls-region', 'VF', 1 FROM countries c WHERE c.code = 'ZW'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO provinces (country_id, name, slug, abbreviation, display_order)
SELECT c.id, 'Maputo Province', 'maputo-province', 'MPT', 1 FROM countries c WHERE c.code = 'MZ'
ON CONFLICT (slug) DO NOTHING;

-- ============================================
-- 3. CREATE/UPDATE DESTINATIONS TABLE
-- ============================================
-- Drop existing destinations table if it exists (from old migration)
DROP TABLE IF EXISTS destinations CASCADE;

CREATE TABLE destinations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  province_id UUID REFERENCES provinces(id) ON DELETE SET NULL,
  country_id UUID NOT NULL REFERENCES countries(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  image_url TEXT,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  is_featured BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  display_order INT DEFAULT 0,
  meta_title VARCHAR(70),
  meta_description VARCHAR(160),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed popular destinations
-- Western Cape destinations
INSERT INTO destinations (province_id, country_id, name, slug, description, is_featured, latitude, longitude, display_order)
SELECT
  p.id,
  c.id,
  d.name,
  d.slug,
  d.description,
  d.featured,
  d.lat,
  d.lng,
  d.ord
FROM provinces p
JOIN countries c ON p.country_id = c.id
CROSS JOIN (VALUES
  ('Cape Town', 'cape-town', 'The Mother City with Table Mountain, beaches, and vibrant culture', TRUE, -33.9249, 18.4241, 1),
  ('Cape Winelands', 'cape-winelands', 'World-class wine estates in Stellenbosch, Franschhoek, and Paarl', TRUE, -33.9321, 18.8602, 2),
  ('Garden Route', 'garden-route', 'Scenic coastal route from Mossel Bay to Storms River', TRUE, -33.9875, 22.4558, 3),
  ('Hermanus', 'hermanus', 'Whale watching capital and coastal charm', FALSE, -34.4187, 19.2345, 4),
  ('Knysna', 'knysna', 'Lagoon town on the Garden Route', FALSE, -34.0356, 23.0488, 5),
  ('Plettenberg Bay', 'plettenberg-bay', 'Beautiful beaches and nature reserves', FALSE, -34.0527, 23.3716, 6),
  ('Langebaan', 'langebaan', 'West Coast lagoon paradise', FALSE, -33.0926, 18.0296, 7)
) AS d(name, slug, description, featured, lat, lng, ord)
WHERE p.slug = 'western-cape'
ON CONFLICT (slug) DO NOTHING;

-- Gauteng destinations
INSERT INTO destinations (province_id, country_id, name, slug, description, is_featured, latitude, longitude, display_order)
SELECT
  p.id, c.id, d.name, d.slug, d.description, d.featured, d.lat, d.lng, d.ord
FROM provinces p
JOIN countries c ON p.country_id = c.id
CROSS JOIN (VALUES
  ('Johannesburg', 'johannesburg', 'South Africa''s largest city and economic hub', TRUE, -26.2041, 28.0473, 1),
  ('Pretoria', 'pretoria', 'Administrative capital with jacaranda-lined streets', FALSE, -25.7479, 28.2293, 2),
  ('Sandton', 'sandton', 'Upscale business and shopping district', FALSE, -26.1076, 28.0567, 3)
) AS d(name, slug, description, featured, lat, lng, ord)
WHERE p.slug = 'gauteng'
ON CONFLICT (slug) DO NOTHING;

-- KwaZulu-Natal destinations
INSERT INTO destinations (province_id, country_id, name, slug, description, is_featured, latitude, longitude, display_order)
SELECT
  p.id, c.id, d.name, d.slug, d.description, d.featured, d.lat, d.lng, d.ord
FROM provinces p
JOIN countries c ON p.country_id = c.id
CROSS JOIN (VALUES
  ('Durban', 'durban', 'Golden beaches and warm Indian Ocean waters', TRUE, -29.8587, 31.0218, 1),
  ('Drakensberg', 'drakensberg', 'Majestic mountain range with hiking and rock art', TRUE, -29.0576, 29.4652, 2),
  ('Umhlanga', 'umhlanga', 'Upmarket coastal resort town', FALSE, -29.7251, 31.0847, 3),
  ('Ballito', 'ballito', 'Dolphin Coast beaches and family resorts', FALSE, -29.5393, 31.2140, 4),
  ('Hluhluwe', 'hluhluwe', 'Big Five game reserves', FALSE, -28.0167, 32.2833, 5)
) AS d(name, slug, description, featured, lat, lng, ord)
WHERE p.slug = 'kwazulu-natal'
ON CONFLICT (slug) DO NOTHING;

-- Limpopo destinations
INSERT INTO destinations (province_id, country_id, name, slug, description, is_featured, latitude, longitude, display_order)
SELECT
  p.id, c.id, d.name, d.slug, d.description, d.featured, d.lat, d.lng, d.ord
FROM provinces p
JOIN countries c ON p.country_id = c.id
CROSS JOIN (VALUES
  ('Kruger National Park', 'kruger', 'South Africa''s premier Big Five safari destination', TRUE, -24.0111, 31.4854, 1),
  ('Hoedspruit', 'hoedspruit', 'Gateway to private game reserves', FALSE, -24.3550, 30.9667, 2)
) AS d(name, slug, description, featured, lat, lng, ord)
WHERE p.slug = 'limpopo'
ON CONFLICT (slug) DO NOTHING;

-- Mpumalanga destinations
INSERT INTO destinations (province_id, country_id, name, slug, description, is_featured, latitude, longitude, display_order)
SELECT
  p.id, c.id, d.name, d.slug, d.description, d.featured, d.lat, d.lng, d.ord
FROM provinces p
JOIN countries c ON p.country_id = c.id
CROSS JOIN (VALUES
  ('Panorama Route', 'panorama-route', 'Blyde River Canyon, God''s Window, and waterfalls', TRUE, -24.8733, 30.8144, 1),
  ('Hazyview', 'hazyview', 'Gateway to Kruger and adventure activities', FALSE, -25.0508, 31.1319, 2),
  ('White River', 'white-river', 'Arts, crafts and nature escapes', FALSE, -25.3284, 31.0089, 3)
) AS d(name, slug, description, featured, lat, lng, ord)
WHERE p.slug = 'mpumalanga'
ON CONFLICT (slug) DO NOTHING;

-- Eastern Cape destinations
INSERT INTO destinations (province_id, country_id, name, slug, description, is_featured, latitude, longitude, display_order)
SELECT
  p.id, c.id, d.name, d.slug, d.description, d.featured, d.lat, d.lng, d.ord
FROM provinces p
JOIN countries c ON p.country_id = c.id
CROSS JOIN (VALUES
  ('Port Elizabeth', 'port-elizabeth', 'The Friendly City with beaches and game reserves', FALSE, -33.9608, 25.6022, 1),
  ('Addo', 'addo', 'Elephant National Park and malaria-free Big Five', FALSE, -33.4667, 26.0000, 2),
  ('Wild Coast', 'wild-coast', 'Untamed coastline and Xhosa culture', FALSE, -31.5500, 29.5000, 3)
) AS d(name, slug, description, featured, lat, lng, ord)
WHERE p.slug = 'eastern-cape'
ON CONFLICT (slug) DO NOTHING;

-- Northern Cape destinations
INSERT INTO destinations (province_id, country_id, name, slug, description, is_featured, latitude, longitude, display_order)
SELECT
  p.id, c.id, d.name, d.slug, d.description, d.featured, d.lat, d.lng, d.ord
FROM provinces p
JOIN countries c ON p.country_id = c.id
CROSS JOIN (VALUES
  ('Kgalagadi', 'kgalagadi', 'Transfrontier Park and desert wildlife', FALSE, -25.7667, 20.6167, 1),
  ('Namaqualand', 'namaqualand', 'Spring wildflower spectacle', FALSE, -30.2000, 17.8000, 2)
) AS d(name, slug, description, featured, lat, lng, ord)
WHERE p.slug = 'northern-cape'
ON CONFLICT (slug) DO NOTHING;

-- ============================================
-- 4. CREATE PROPERTY CATEGORIES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS property_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  icon VARCHAR(50),
  image_url TEXT,
  category_type VARCHAR(20) NOT NULL CHECK (category_type IN ('experience', 'trip_type')),
  is_active BOOLEAN DEFAULT TRUE,
  display_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed experience-based categories
INSERT INTO property_categories (name, slug, description, icon, category_type, display_order) VALUES
  ('Beach', 'beach', 'Beachfront stays with ocean access', 'Waves', 'experience', 1),
  ('Safari', 'safari', 'Wildlife and game viewing experiences', 'Binoculars', 'experience', 2),
  ('Wine', 'wine', 'Wine estates and vineyard stays', 'Wine', 'experience', 3),
  ('Mountain', 'mountain', 'Mountain retreats and hiking destinations', 'Mountain', 'experience', 4),
  ('City Break', 'city-break', 'Urban getaways with city attractions', 'Building2', 'experience', 5),
  ('Bush', 'bush', 'Bush camps and nature lodges', 'TreePine', 'experience', 6),
  ('Coastal', 'coastal', 'Coastal properties with sea views', 'Anchor', 'experience', 7),
  ('Nature', 'nature', 'Nature reserves and eco-lodges', 'Leaf', 'experience', 8),
  ('Game Reserve', 'game-reserve', 'Private game reserves with wildlife', 'PawPrint', 'experience', 9)
ON CONFLICT (slug) DO NOTHING;

-- Seed trip-type categories
INSERT INTO property_categories (name, slug, description, icon, category_type, display_order) VALUES
  ('Romantic Getaway', 'romantic', 'Perfect for couples and honeymoons', 'Heart', 'trip_type', 1),
  ('Family Friendly', 'family-friendly', 'Great for families with children', 'Users', 'trip_type', 2),
  ('Pet Friendly', 'pet-friendly', 'Welcomes furry friends', 'Dog', 'trip_type', 3),
  ('Adventure', 'adventure', 'For thrill-seekers and outdoor enthusiasts', 'Compass', 'trip_type', 4),
  ('Luxury', 'luxury', 'Premium, high-end experiences', 'Crown', 'trip_type', 5),
  ('Budget-Friendly', 'budget-friendly', 'Great value accommodations', 'Wallet', 'trip_type', 6)
ON CONFLICT (slug) DO NOTHING;

-- ============================================
-- 5. CREATE TENANT CATEGORIES JUNCTION TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS tenant_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES property_categories(id) ON DELETE CASCADE,
  is_primary BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, category_id)
);

CREATE INDEX IF NOT EXISTS idx_tenant_categories_tenant ON tenant_categories(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_categories_category ON tenant_categories(category_id);

-- ============================================
-- 6. ADD NEW COLUMNS TO TENANTS TABLE
-- ============================================
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS country_id UUID REFERENCES countries(id);
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS province_id UUID REFERENCES provinces(id);
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS destination_id UUID REFERENCES destinations(id);
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 8);
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS longitude DECIMAL(11, 8);
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS google_place_id VARCHAR(255);
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS formatted_address TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS category_slugs JSONB DEFAULT '[]'::jsonb;

-- Add indexes for geographic queries
CREATE INDEX IF NOT EXISTS idx_tenants_country ON tenants(country_id) WHERE discoverable = TRUE;
CREATE INDEX IF NOT EXISTS idx_tenants_province ON tenants(province_id) WHERE discoverable = TRUE;
CREATE INDEX IF NOT EXISTS idx_tenants_destination ON tenants(destination_id) WHERE discoverable = TRUE;
CREATE INDEX IF NOT EXISTS idx_tenants_coordinates ON tenants(latitude, longitude) WHERE discoverable = TRUE AND latitude IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tenants_categories ON tenants USING GIN(category_slugs) WHERE discoverable = TRUE;

-- Add comments
COMMENT ON COLUMN tenants.latitude IS 'GPS latitude coordinate (decimal degrees)';
COMMENT ON COLUMN tenants.longitude IS 'GPS longitude coordinate (decimal degrees)';
COMMENT ON COLUMN tenants.category_slugs IS 'Denormalized array of category slugs for fast filtering';
COMMENT ON COLUMN tenants.google_place_id IS 'Google Places API place ID for address verification';
COMMENT ON COLUMN tenants.formatted_address IS 'Formatted address from Google Geocoding API';

-- ============================================
-- 7. DATA MIGRATION - Set defaults for existing properties
-- ============================================
-- Set country_id to South Africa for all existing discoverable properties
UPDATE tenants
SET country_id = (SELECT id FROM countries WHERE code = 'ZA')
WHERE discoverable = TRUE
  AND country_id IS NULL;

-- Try to match existing region_slug to destinations
UPDATE tenants t
SET destination_id = d.id
FROM destinations d
WHERE t.region_slug = d.slug
  AND t.discoverable = TRUE
  AND t.destination_id IS NULL;

-- Set province_id based on destination
UPDATE tenants t
SET province_id = d.province_id
FROM destinations d
WHERE t.destination_id = d.id
  AND t.province_id IS NULL;

-- Migration: Extended directory listing fields for property customization
-- Adds support for gallery images, check-in/out times, cancellation policies, amenities, etc.

-- Gallery images (array of image URLs for the property)
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS gallery_images JSONB DEFAULT '[]'::jsonb;

-- Directory-specific description (can differ from business_description)
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS directory_description TEXT DEFAULT NULL;

-- Check-in/Check-out times
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS check_in_time VARCHAR(5) DEFAULT '14:00';
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS check_out_time VARCHAR(5) DEFAULT '10:00';

-- Cancellation policies array: [{ "days_before": 7, "refund_percentage": 100, "label": "..." }]
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS cancellation_policies JSONB DEFAULT '[{"days_before": 7, "refund_percentage": 100, "label": "Free cancellation up to 7 days before"}]'::jsonb;

-- Property-level amenities (different from room amenities)
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS property_amenities JSONB DEFAULT '[]'::jsonb;

-- House rules array of strings
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS house_rules JSONB DEFAULT '[]'::jsonb;

-- What's included with stay (breakfast, parking, etc.)
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS whats_included JSONB DEFAULT '[]'::jsonb;

-- Property highlights (max 5 key selling points)
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS property_highlights JSONB DEFAULT '[]'::jsonb;

-- Seasonal promotional message
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS seasonal_message TEXT DEFAULT NULL;

-- Special offers: [{ "title": "...", "description": "...", "valid_until": "...", "active": true }]
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS special_offers JSONB DEFAULT '[]'::jsonb;

-- Add comments for documentation
COMMENT ON COLUMN tenants.gallery_images IS 'Array of image URLs for property gallery';
COMMENT ON COLUMN tenants.directory_description IS 'Property description for directory listing (can be different from business_description)';
COMMENT ON COLUMN tenants.check_in_time IS 'Standard check-in time (HH:MM format)';
COMMENT ON COLUMN tenants.check_out_time IS 'Standard check-out time (HH:MM format)';
COMMENT ON COLUMN tenants.cancellation_policies IS 'Array of cancellation policy tiers with days_before, refund_percentage, and label';
COMMENT ON COLUMN tenants.property_amenities IS 'Property-level amenities and facilities (different from room amenities)';
COMMENT ON COLUMN tenants.house_rules IS 'Array of house rules strings';
COMMENT ON COLUMN tenants.whats_included IS 'What is included with stay (breakfast, parking, etc.)';
COMMENT ON COLUMN tenants.property_highlights IS 'Key property highlights/features (max 5)';
COMMENT ON COLUMN tenants.seasonal_message IS 'Seasonal promotional message';
COMMENT ON COLUMN tenants.special_offers IS 'Active special offers and promotions';

-- Migration: Add category ratings and images to reviews
-- This migration adds detailed rating categories and image support for reviews

-- ============================================
-- CATEGORY RATING COLUMNS
-- ============================================

-- Add category rating columns to reviews table
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS rating_cleanliness INTEGER;
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS rating_service INTEGER;
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS rating_location INTEGER;
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS rating_value INTEGER;
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS rating_safety INTEGER;

-- Add constraints for category ratings (1-5)
-- Using DO block to handle cases where constraints might already exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'reviews_valid_cleanliness') THEN
    ALTER TABLE reviews ADD CONSTRAINT reviews_valid_cleanliness
      CHECK (rating_cleanliness IS NULL OR (rating_cleanliness >= 1 AND rating_cleanliness <= 5));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'reviews_valid_service') THEN
    ALTER TABLE reviews ADD CONSTRAINT reviews_valid_service
      CHECK (rating_service IS NULL OR (rating_service >= 1 AND rating_service <= 5));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'reviews_valid_location') THEN
    ALTER TABLE reviews ADD CONSTRAINT reviews_valid_location
      CHECK (rating_location IS NULL OR (rating_location >= 1 AND rating_location <= 5));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'reviews_valid_value') THEN
    ALTER TABLE reviews ADD CONSTRAINT reviews_valid_value
      CHECK (rating_value IS NULL OR (rating_value >= 1 AND rating_value <= 5));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'reviews_valid_safety') THEN
    ALTER TABLE reviews ADD CONSTRAINT reviews_valid_safety
      CHECK (rating_safety IS NULL OR (rating_safety >= 1 AND rating_safety <= 5));
  END IF;
END $$;

-- ============================================
-- REVIEW IMAGES
-- ============================================

-- Add images column (JSONB array)
-- Structure: [{ url: string, path: string, hidden: boolean }]
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS images JSONB DEFAULT '[]'::jsonb;

-- Add index for images (GIN index for JSONB)
CREATE INDEX IF NOT EXISTS idx_reviews_images ON reviews USING gin(images);

-- ============================================
-- STORAGE POLICIES FOR REVIEW IMAGES
-- ============================================

-- Allow authenticated users to upload review images to their tenant folder
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'Users can upload review images'
    AND tablename = 'objects'
  ) THEN
    CREATE POLICY "Users can upload review images" ON storage.objects
      FOR INSERT
      TO authenticated
      WITH CHECK (
        bucket_id = 'gallery-images' AND
        (storage.foldername(name))[2] = 'reviews'
      );
  END IF;
END $$;

-- Allow anonymous users to upload review images (for public review submission via token)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'Public can upload review images'
    AND tablename = 'objects'
  ) THEN
    CREATE POLICY "Public can upload review images" ON storage.objects
      FOR INSERT
      TO anon
      WITH CHECK (
        bucket_id = 'gallery-images' AND
        (storage.foldername(name))[2] = 'reviews'
      );
  END IF;
END $$;

-- Allow anyone to view review images (already covered by existing public view policy)
-- The existing "Anyone can view gallery images" policy covers this

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON COLUMN reviews.rating_cleanliness IS 'Guest rating for cleanliness (1-5)';
COMMENT ON COLUMN reviews.rating_service IS 'Guest rating for service quality (1-5)';
COMMENT ON COLUMN reviews.rating_location IS 'Guest rating for location (1-5)';
COMMENT ON COLUMN reviews.rating_value IS 'Guest rating for value for money (1-5)';
COMMENT ON COLUMN reviews.rating_safety IS 'Guest rating for safety (1-5)';
COMMENT ON COLUMN reviews.images IS 'Array of review images: [{url, path, hidden}]';

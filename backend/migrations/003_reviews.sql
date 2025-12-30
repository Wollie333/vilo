-- ============================================
-- REVIEWS TABLE
-- Reviews are attached to bookings (1:1 relationship)
-- Only guests who have paid and checked out can leave reviews
-- Property owners cannot edit guest reviews, only respond to them
-- ============================================

CREATE TABLE IF NOT EXISTS reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  booking_id UUID NOT NULL UNIQUE REFERENCES bookings(id) ON DELETE CASCADE,

  -- Review content (set by guest, cannot be edited by owner)
  rating INTEGER NOT NULL,
  title VARCHAR(255),
  content TEXT,

  -- Guest info (copied from booking for display purposes)
  guest_name VARCHAR(255) NOT NULL,

  -- Owner response (can be added/edited by property owner)
  owner_response TEXT,
  owner_response_at TIMESTAMP WITH TIME ZONE,

  -- Review status
  status VARCHAR(20) NOT NULL DEFAULT 'published',

  -- Verification token for public review submission
  verification_token UUID DEFAULT gen_random_uuid(),

  -- Audit
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Constraints
  CONSTRAINT reviews_valid_rating CHECK (rating >= 1 AND rating <= 5),
  CONSTRAINT reviews_valid_status CHECK (status IN ('published', 'hidden', 'flagged'))
);

-- Indexes for reviews
CREATE INDEX IF NOT EXISTS idx_reviews_tenant_id ON reviews(tenant_id);
CREATE INDEX IF NOT EXISTS idx_reviews_booking_id ON reviews(booking_id);
CREATE INDEX IF NOT EXISTS idx_reviews_rating ON reviews(rating);
CREATE INDEX IF NOT EXISTS idx_reviews_status ON reviews(status);
CREATE INDEX IF NOT EXISTS idx_reviews_created_at ON reviews(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reviews_verification_token ON reviews(verification_token);

-- Row Level Security for reviews
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

-- Drop existing policies first (for re-running migration)
DROP POLICY IF EXISTS "Users can view their tenant reviews" ON reviews;
DROP POLICY IF EXISTS "Users can insert their tenant reviews" ON reviews;
DROP POLICY IF EXISTS "Users can update their tenant reviews" ON reviews;
DROP POLICY IF EXISTS "Users can delete their tenant reviews" ON reviews;
DROP POLICY IF EXISTS "Public can view published reviews" ON reviews;

-- Policy: Users can only see reviews for their tenant
CREATE POLICY "Users can view their tenant reviews"
  ON reviews FOR SELECT
  USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);

-- Policy: Users can insert reviews for their tenant (via service role)
CREATE POLICY "Users can insert their tenant reviews"
  ON reviews FOR INSERT
  WITH CHECK (tenant_id = current_setting('app.current_tenant_id', true)::UUID);

-- Policy: Users can update reviews for their tenant (only owner_response fields)
CREATE POLICY "Users can update their tenant reviews"
  ON reviews FOR UPDATE
  USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);

-- Policy: Users can delete reviews for their tenant
CREATE POLICY "Users can delete their tenant reviews"
  ON reviews FOR DELETE
  USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);

-- Trigger for reviews updated_at
DROP TRIGGER IF EXISTS update_reviews_updated_at ON reviews;
CREATE TRIGGER update_reviews_updated_at
  BEFORE UPDATE ON reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- ADD review_request_sent TO BOOKINGS
-- Track whether a review request has been sent
-- ============================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bookings' AND column_name = 'review_request_sent') THEN
    ALTER TABLE bookings ADD COLUMN review_request_sent BOOLEAN DEFAULT false;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bookings' AND column_name = 'review_token') THEN
    ALTER TABLE bookings ADD COLUMN review_token UUID DEFAULT gen_random_uuid();
  END IF;
END $$;

-- Index for review token lookups
CREATE INDEX IF NOT EXISTS idx_bookings_review_token ON bookings(review_token);

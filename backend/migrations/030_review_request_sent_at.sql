-- Migration: Add review_request_sent_at timestamp to bookings
-- This allows tracking when a review request was sent to the guest

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bookings' AND column_name = 'review_request_sent_at') THEN
    ALTER TABLE bookings ADD COLUMN review_request_sent_at TIMESTAMPTZ DEFAULT NULL;
  END IF;
END $$;

-- Update existing records that have review_request_sent = true to have a timestamp
-- Use synced_at as a fallback date for existing records
UPDATE bookings
SET review_request_sent_at = COALESCE(synced_at, created_at, NOW())
WHERE review_request_sent = true AND review_request_sent_at IS NULL;

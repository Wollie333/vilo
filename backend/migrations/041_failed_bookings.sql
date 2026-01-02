-- Migration: Add failed bookings tracking fields
-- This enables capturing declined payments and abandoned checkouts

-- Add failure tracking fields to bookings table
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS failure_type VARCHAR(50);
-- Values: 'payment_declined', 'payment_abandoned', 'abandoned_checkout', 'payment_error'

ALTER TABLE bookings ADD COLUMN IF NOT EXISTS failure_reason TEXT;
-- Stores error message from payment processor or system

ALTER TABLE bookings ADD COLUMN IF NOT EXISTS failed_at TIMESTAMPTZ;
-- When the booking was marked as failed

ALTER TABLE bookings ADD COLUMN IF NOT EXISTS retry_count INTEGER DEFAULT 0;
-- How many times customer has attempted to retry payment

ALTER TABLE bookings ADD COLUMN IF NOT EXISTS last_retry_at TIMESTAMPTZ;
-- Last retry attempt timestamp

ALTER TABLE bookings ADD COLUMN IF NOT EXISTS checkout_data JSONB;
-- Stores full checkout state for pre-filling retry flow
-- Contains: rooms, addons, guest details, dates, pricing, coupon info

-- Index for efficient querying of failed bookings
CREATE INDEX IF NOT EXISTS idx_bookings_failure_type ON bookings(failure_type) WHERE failure_type IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_bookings_failed_at ON bookings(failed_at) WHERE failed_at IS NOT NULL;

-- Composite index for portal failed bookings query
CREATE INDEX IF NOT EXISTS idx_bookings_customer_failure
ON bookings(customer_id, failure_type, check_in)
WHERE failure_type IS NOT NULL;

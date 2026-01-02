-- Migration: 044_cancellation_fields.sql
-- Description: Add cancellation tracking fields to bookings table for analytics and support ticket linking

-- Add cancellation reason column (standardized codes for analytics)
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS cancellation_reason VARCHAR(100);
-- Standard reasons: 'change_of_plans', 'alternative_accommodation', 'health_emergency',
--                   'travel_restrictions', 'financial_reasons', 'duplicate_booking',
--                   'property_expectations', 'other'

-- Add cancellation details column (optional free text from customer)
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS cancellation_details TEXT;

-- Add refund requested flag
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS refund_requested BOOLEAN DEFAULT false;

-- Add cancelled_at timestamp for tracking when cancellation occurred
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ;

-- Add reference to support ticket created on cancellation
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS cancellation_ticket_id UUID REFERENCES support_messages(id) ON DELETE SET NULL;

-- Create index for analytics queries on cancellation reasons
CREATE INDEX IF NOT EXISTS idx_bookings_cancellation_reason ON bookings(cancellation_reason) WHERE cancellation_reason IS NOT NULL;

-- Add comments for documentation
COMMENT ON COLUMN bookings.cancellation_reason IS 'Standard cancellation reason code for analytics';
COMMENT ON COLUMN bookings.cancellation_details IS 'Additional details provided by customer during cancellation';
COMMENT ON COLUMN bookings.refund_requested IS 'Whether customer requested a refund during cancellation';
COMMENT ON COLUMN bookings.cancelled_at IS 'Timestamp when booking was cancelled';
COMMENT ON COLUMN bookings.cancellation_ticket_id IS 'Support ticket created for this cancellation request';

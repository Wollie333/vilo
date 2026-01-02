-- Migration: Payment Tracking Fields
-- Add columns to track payment method and processor reference for bookings

-- Add payment method column
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS payment_method VARCHAR(20);
-- Values: 'paystack', 'paypal', 'eft', 'manual', null

-- Add payment reference column (transaction ID from payment processor)
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS payment_reference VARCHAR(255);

-- Add payment completed timestamp
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS payment_completed_at TIMESTAMP WITH TIME ZONE;

-- Add comments for documentation
COMMENT ON COLUMN bookings.payment_method IS 'Payment processor used: paystack, paypal, eft, manual';
COMMENT ON COLUMN bookings.payment_reference IS 'Transaction reference from payment processor';
COMMENT ON COLUMN bookings.payment_completed_at IS 'Timestamp when payment was verified/completed';

-- Create index for querying by payment method
CREATE INDEX IF NOT EXISTS idx_bookings_payment_method ON bookings(payment_method);

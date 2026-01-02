-- Add data JSONB field to notifications for storing dynamic notification data
-- This allows notifications to include contextual information like guest names, amounts, dates, etc.

ALTER TABLE notifications
ADD COLUMN IF NOT EXISTS data JSONB DEFAULT '{}';

-- Add index for querying notifications by data fields if needed
CREATE INDEX IF NOT EXISTS idx_notifications_data ON notifications USING GIN (data);

COMMENT ON COLUMN notifications.data IS 'Dynamic notification data (guest_name, amount, booking_id, etc.)';

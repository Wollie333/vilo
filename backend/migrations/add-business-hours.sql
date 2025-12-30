-- Add business_hours column to tenants table
-- This stores the operating hours for each day of the week as JSONB

ALTER TABLE tenants ADD COLUMN IF NOT EXISTS business_hours JSONB DEFAULT '{
  "monday": {"open": "08:00", "close": "17:00", "closed": false},
  "tuesday": {"open": "08:00", "close": "17:00", "closed": false},
  "wednesday": {"open": "08:00", "close": "17:00", "closed": false},
  "thursday": {"open": "08:00", "close": "17:00", "closed": false},
  "friday": {"open": "08:00", "close": "17:00", "closed": false},
  "saturday": {"open": "09:00", "close": "13:00", "closed": false},
  "sunday": {"open": "09:00", "close": "13:00", "closed": true}
}'::jsonb;

-- Add a comment to describe the column
COMMENT ON COLUMN tenants.business_hours IS 'Operating hours for each day of the week. Each day has open time, close time, and closed flag.';

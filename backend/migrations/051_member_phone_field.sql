-- Migration: 051_member_phone_field.sql
-- Description: Add phone field to tenant_members for team member contact info

-- Add phone column
ALTER TABLE tenant_members ADD COLUMN IF NOT EXISTS phone VARCHAR(50);

-- Add comment for documentation
COMMENT ON COLUMN tenant_members.phone IS 'Team member phone number';

-- Add is_claimable column to coupons table
-- When enabled, visitors can request this coupon via a contact form on the property page

ALTER TABLE coupons ADD COLUMN IF NOT EXISTS is_claimable BOOLEAN DEFAULT false;

-- Add comment for documentation
COMMENT ON COLUMN coupons.is_claimable IS 'When true, visitors can submit a claim request for this coupon via the property page';

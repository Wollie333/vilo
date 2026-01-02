-- Migration: Per-Room Coupon/Promotional Code System
-- Enables room-specific promotional codes with various discount types

-- ============================================
-- 1. Create coupons table
-- ============================================

CREATE TABLE IF NOT EXISTS coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- Coupon identification
  code VARCHAR(50) NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,

  -- Discount configuration
  discount_type VARCHAR(20) NOT NULL CHECK (discount_type IN ('percentage', 'fixed_amount', 'free_nights')),
  discount_value DECIMAL(10, 2) NOT NULL CHECK (discount_value > 0),

  -- Room association (array of room IDs, empty = all rooms)
  applicable_room_ids UUID[] DEFAULT '{}',

  -- Validity period
  valid_from DATE,
  valid_until DATE,

  -- Usage limits
  max_uses INTEGER CHECK (max_uses IS NULL OR max_uses > 0),
  max_uses_per_customer INTEGER CHECK (max_uses_per_customer IS NULL OR max_uses_per_customer > 0),
  current_uses INTEGER NOT NULL DEFAULT 0,

  -- Booking requirements
  min_booking_amount DECIMAL(10, 2) CHECK (min_booking_amount IS NULL OR min_booking_amount >= 0),
  min_nights INTEGER CHECK (min_nights IS NULL OR min_nights > 0),

  -- Status
  is_active BOOLEAN NOT NULL DEFAULT true,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Unique code per tenant (case-insensitive)
  CONSTRAINT coupons_unique_code_per_tenant UNIQUE (tenant_id, code),
  CONSTRAINT coupons_valid_date_range CHECK (valid_until IS NULL OR valid_from IS NULL OR valid_until >= valid_from)
);

-- ============================================
-- 2. Create coupon_usage table for tracking
-- ============================================

CREATE TABLE IF NOT EXISTS coupon_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id UUID NOT NULL REFERENCES coupons(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,

  -- Customer identification
  customer_email VARCHAR(255) NOT NULL,

  -- Usage details
  discount_applied DECIMAL(10, 2) NOT NULL,
  original_amount DECIMAL(10, 2) NOT NULL,
  final_amount DECIMAL(10, 2) NOT NULL,

  -- Timestamps
  used_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 3. Add coupon fields to bookings table
-- ============================================

ALTER TABLE bookings ADD COLUMN IF NOT EXISTS coupon_id UUID REFERENCES coupons(id) ON DELETE SET NULL;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS coupon_code VARCHAR(50);
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS discount_amount DECIMAL(10, 2) DEFAULT 0;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS subtotal_before_discount DECIMAL(10, 2);

-- ============================================
-- 4. Indexes for performance
-- ============================================

CREATE INDEX IF NOT EXISTS idx_coupons_tenant ON coupons(tenant_id);
CREATE INDEX IF NOT EXISTS idx_coupons_code ON coupons(tenant_id, code);
CREATE INDEX IF NOT EXISTS idx_coupons_active ON coupons(tenant_id, is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_coupons_valid_dates ON coupons(valid_from, valid_until);

CREATE INDEX IF NOT EXISTS idx_coupon_usage_coupon ON coupon_usage(coupon_id);
CREATE INDEX IF NOT EXISTS idx_coupon_usage_customer ON coupon_usage(coupon_id, customer_email);
CREATE INDEX IF NOT EXISTS idx_coupon_usage_booking ON coupon_usage(booking_id);

CREATE INDEX IF NOT EXISTS idx_bookings_coupon ON bookings(coupon_id) WHERE coupon_id IS NOT NULL;

-- ============================================
-- 5. Comments for documentation
-- ============================================

COMMENT ON TABLE coupons IS 'Per-room promotional codes with various discount types';
COMMENT ON COLUMN coupons.discount_type IS 'Type: percentage (0-100%), fixed_amount (currency), free_nights (count)';
COMMENT ON COLUMN coupons.applicable_room_ids IS 'Array of room UUIDs this coupon applies to. Empty array means all rooms';
COMMENT ON COLUMN coupons.max_uses IS 'Total maximum redemptions. NULL means unlimited';
COMMENT ON COLUMN coupons.max_uses_per_customer IS 'Max uses per unique email. NULL means unlimited';
COMMENT ON COLUMN coupons.current_uses IS 'Counter tracking total redemptions';

COMMENT ON TABLE coupon_usage IS 'Tracks each coupon redemption for auditing and limit enforcement';
COMMENT ON COLUMN coupon_usage.customer_email IS 'Email used at booking time to track per-customer limits';

COMMENT ON COLUMN bookings.coupon_id IS 'Reference to the coupon used for this booking';
COMMENT ON COLUMN bookings.coupon_code IS 'The coupon code used (denormalized for display)';
COMMENT ON COLUMN bookings.discount_amount IS 'The discount amount applied to this booking';
COMMENT ON COLUMN bookings.subtotal_before_discount IS 'The booking subtotal before discount was applied';

-- ============================================
-- 6. Row Level Security (RLS) Policies
-- ============================================

-- Enable RLS on coupons table
ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;

-- Policy: Allow all operations for service role (backend uses service role key)
CREATE POLICY "Service role full access to coupons"
  ON coupons
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Enable RLS on coupon_usage table
ALTER TABLE coupon_usage ENABLE ROW LEVEL SECURITY;

-- Policy: Allow all operations for service role
CREATE POLICY "Service role full access to coupon_usage"
  ON coupon_usage
  FOR ALL
  USING (true)
  WITH CHECK (true);

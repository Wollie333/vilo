-- ============================================
-- UTILITY FUNCTIONS
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- ============================================
-- TENANTS TABLE (must be created first)
-- ============================================

CREATE TABLE IF NOT EXISTS tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255), -- Business name (optional initially)
  owner_user_id UUID NOT NULL UNIQUE, -- References auth.users (Supabase Auth)
  has_lifetime_access BOOLEAN NOT NULL DEFAULT false,
  paystack_customer_code VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for tenants
CREATE INDEX IF NOT EXISTS idx_tenants_owner_user_id ON tenants(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_tenants_has_lifetime_access ON tenants(has_lifetime_access);

-- Row Level Security for tenants
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;

-- Drop existing policies first (for re-running schema)
DROP POLICY IF EXISTS "Users can view their own tenant" ON tenants;
DROP POLICY IF EXISTS "Users can insert their own tenant" ON tenants;
DROP POLICY IF EXISTS "Users can update their own tenant" ON tenants;

-- Policy: Users can only see their own tenant
CREATE POLICY "Users can view their own tenant"
  ON tenants FOR SELECT
  USING (owner_user_id = auth.uid());

-- Policy: Users can create their own tenant
CREATE POLICY "Users can insert their own tenant"
  ON tenants FOR INSERT
  WITH CHECK (owner_user_id = auth.uid());

-- Policy: Users can update their own tenant
CREATE POLICY "Users can update their own tenant"
  ON tenants FOR UPDATE
  USING (owner_user_id = auth.uid());

-- Trigger for tenants updated_at
DROP TRIGGER IF EXISTS update_tenants_updated_at ON tenants;
CREATE TRIGGER update_tenants_updated_at
  BEFORE UPDATE ON tenants
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- PAYMENTS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL, -- Amount in cents (9900 = $99.00)
  currency VARCHAR(3) NOT NULL DEFAULT 'USD',
  paystack_reference VARCHAR(100) UNIQUE,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT payments_valid_status CHECK (status IN ('pending', 'success', 'failed'))
);

-- Indexes for payments
CREATE INDEX IF NOT EXISTS idx_payments_tenant_id ON payments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_paystack_reference ON payments(paystack_reference);

-- Row Level Security for payments
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Drop existing policies first (for re-running schema)
DROP POLICY IF EXISTS "Users can view their tenant payments" ON payments;
DROP POLICY IF EXISTS "Users can insert their tenant payments" ON payments;
DROP POLICY IF EXISTS "Service role can insert payments" ON payments;
DROP POLICY IF EXISTS "Service role can update payments" ON payments;

-- Policy: Users can only see payments for their tenant
CREATE POLICY "Users can view their tenant payments"
  ON payments FOR SELECT
  USING (tenant_id IN (SELECT id FROM tenants WHERE owner_user_id = auth.uid()));

-- Policy: Service role can insert payments (backend only)
CREATE POLICY "Service role can insert payments"
  ON payments FOR INSERT
  WITH CHECK (true); -- Inserts happen via service role from backend

-- Policy: Service role can update payments (backend only)
CREATE POLICY "Service role can update payments"
  ON payments FOR UPDATE
  USING (true); -- Updates happen via service role from backend

-- ============================================
-- BOOKINGS TABLE
-- ============================================

-- Bookings table for accommodation management
CREATE TABLE IF NOT EXISTS bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL, -- Multi-tenant support
  guest_name VARCHAR(255) NOT NULL,
  guest_email VARCHAR(255),
  guest_phone VARCHAR(50),
  room_id VARCHAR(100) NOT NULL,
  room_name VARCHAR(255),
  check_in DATE NOT NULL,
  check_out DATE NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending', -- pending, confirmed, cancelled, completed
  payment_status VARCHAR(20) NOT NULL DEFAULT 'pending', -- pending, paid, partial, refunded
  total_amount DECIMAL(10, 2) NOT NULL,
  currency VARCHAR(3) NOT NULL DEFAULT 'ZAR',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID, -- User who created the booking
  CONSTRAINT valid_status CHECK (status IN ('pending', 'confirmed', 'checked_in', 'checked_out', 'cancelled', 'completed')),
  CONSTRAINT valid_payment_status CHECK (payment_status IN ('pending', 'paid', 'partial', 'refunded')),
  CONSTRAINT valid_dates CHECK (check_out > check_in)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_bookings_tenant_id ON bookings(tenant_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_dates ON bookings(check_in, check_out);
CREATE INDEX IF NOT EXISTS idx_bookings_created_at ON bookings(created_at DESC);

-- Row Level Security (RLS) - Multi-tenant isolation
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

-- Drop existing policies first (for re-running schema)
DROP POLICY IF EXISTS "Users can view their tenant bookings" ON bookings;
DROP POLICY IF EXISTS "Users can insert their tenant bookings" ON bookings;
DROP POLICY IF EXISTS "Users can update their tenant bookings" ON bookings;
DROP POLICY IF EXISTS "Users can delete their tenant bookings" ON bookings;

-- Policy: Users can only see bookings for their tenant
CREATE POLICY "Users can view their tenant bookings"
  ON bookings FOR SELECT
  USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);

-- Policy: Users can insert bookings for their tenant
CREATE POLICY "Users can insert their tenant bookings"
  ON bookings FOR INSERT
  WITH CHECK (tenant_id = current_setting('app.current_tenant_id', true)::UUID);

-- Policy: Users can update bookings for their tenant
CREATE POLICY "Users can update their tenant bookings"
  ON bookings FOR UPDATE
  USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);

-- Policy: Users can delete bookings for their tenant
CREATE POLICY "Users can delete their tenant bookings"
  ON bookings FOR DELETE
  USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);

-- Trigger to auto-update updated_at
DROP TRIGGER IF EXISTS update_bookings_updated_at ON bookings;
CREATE TRIGGER update_bookings_updated_at
  BEFORE UPDATE ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- ROOMS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,

  -- Basic Info
  name VARCHAR(255) NOT NULL,
  description TEXT,
  room_code VARCHAR(50),

  -- Configuration
  bed_type VARCHAR(100) NOT NULL,
  bed_count INTEGER NOT NULL DEFAULT 1,
  room_size_sqm DECIMAL(6, 2),
  max_guests INTEGER NOT NULL DEFAULT 2,

  -- Amenities (JSON array of strings)
  amenities JSONB NOT NULL DEFAULT '[]'::JSONB,

  -- Images: { featured: {url, path} | null, gallery: [{url, path, caption}] }
  images JSONB NOT NULL DEFAULT '{"featured": null, "gallery": []}'::JSONB,

  -- Pricing
  base_price_per_night DECIMAL(10, 2) NOT NULL,
  currency VARCHAR(3) NOT NULL DEFAULT 'ZAR',

  -- Booking Limits
  min_stay_nights INTEGER NOT NULL DEFAULT 1,
  max_stay_nights INTEGER, -- NULL means no maximum

  -- Inventory
  inventory_mode VARCHAR(20) NOT NULL DEFAULT 'single_unit',
  total_units INTEGER NOT NULL DEFAULT 1,

  -- Status
  is_active BOOLEAN NOT NULL DEFAULT true,

  -- Audit
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID,

  -- Constraints
  CONSTRAINT rooms_valid_inventory_mode CHECK (inventory_mode IN ('single_unit', 'room_type')),
  CONSTRAINT rooms_valid_bed_count CHECK (bed_count > 0),
  CONSTRAINT rooms_valid_max_guests CHECK (max_guests > 0),
  CONSTRAINT rooms_valid_total_units CHECK (total_units > 0),
  CONSTRAINT rooms_valid_base_price CHECK (base_price_per_night >= 0),
  CONSTRAINT rooms_valid_min_stay CHECK (min_stay_nights >= 1),
  CONSTRAINT rooms_valid_max_stay CHECK (max_stay_nights IS NULL OR max_stay_nights >= min_stay_nights)
);

-- Indexes for rooms
CREATE INDEX IF NOT EXISTS idx_rooms_tenant_id ON rooms(tenant_id);
CREATE INDEX IF NOT EXISTS idx_rooms_is_active ON rooms(is_active);
CREATE INDEX IF NOT EXISTS idx_rooms_inventory_mode ON rooms(inventory_mode);
CREATE INDEX IF NOT EXISTS idx_rooms_created_at ON rooms(created_at DESC);

-- Row Level Security for rooms
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;

-- Drop existing policies first (for re-running schema)
DROP POLICY IF EXISTS "Users can view their tenant rooms" ON rooms;
DROP POLICY IF EXISTS "Users can insert their tenant rooms" ON rooms;
DROP POLICY IF EXISTS "Users can update their tenant rooms" ON rooms;
DROP POLICY IF EXISTS "Users can delete their tenant rooms" ON rooms;

CREATE POLICY "Users can view their tenant rooms"
  ON rooms FOR SELECT
  USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);

CREATE POLICY "Users can insert their tenant rooms"
  ON rooms FOR INSERT
  WITH CHECK (tenant_id = current_setting('app.current_tenant_id', true)::UUID);

CREATE POLICY "Users can update their tenant rooms"
  ON rooms FOR UPDATE
  USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);

CREATE POLICY "Users can delete their tenant rooms"
  ON rooms FOR DELETE
  USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);

-- Trigger for rooms updated_at
DROP TRIGGER IF EXISTS update_rooms_updated_at ON rooms;
CREATE TRIGGER update_rooms_updated_at
  BEFORE UPDATE ON rooms
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- SEASONAL RATES TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS seasonal_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,

  -- Rate Info
  name VARCHAR(255) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  price_per_night DECIMAL(10, 2) NOT NULL,
  priority INTEGER NOT NULL DEFAULT 0,

  -- Audit
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Constraints
  CONSTRAINT seasonal_rates_valid_date_range CHECK (end_date >= start_date),
  CONSTRAINT seasonal_rates_valid_price CHECK (price_per_night >= 0)
);

-- Indexes for seasonal_rates
CREATE INDEX IF NOT EXISTS idx_seasonal_rates_tenant_id ON seasonal_rates(tenant_id);
CREATE INDEX IF NOT EXISTS idx_seasonal_rates_room_id ON seasonal_rates(room_id);
CREATE INDEX IF NOT EXISTS idx_seasonal_rates_dates ON seasonal_rates(start_date, end_date);

-- Row Level Security for seasonal_rates
ALTER TABLE seasonal_rates ENABLE ROW LEVEL SECURITY;

-- Drop existing policies first (for re-running schema)
DROP POLICY IF EXISTS "Users can view their tenant seasonal rates" ON seasonal_rates;
DROP POLICY IF EXISTS "Users can insert their tenant seasonal rates" ON seasonal_rates;
DROP POLICY IF EXISTS "Users can update their tenant seasonal rates" ON seasonal_rates;
DROP POLICY IF EXISTS "Users can delete their tenant seasonal rates" ON seasonal_rates;

CREATE POLICY "Users can view their tenant seasonal rates"
  ON seasonal_rates FOR SELECT
  USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);

CREATE POLICY "Users can insert their tenant seasonal rates"
  ON seasonal_rates FOR INSERT
  WITH CHECK (tenant_id = current_setting('app.current_tenant_id', true)::UUID);

CREATE POLICY "Users can update their tenant seasonal rates"
  ON seasonal_rates FOR UPDATE
  USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);

CREATE POLICY "Users can delete their tenant seasonal rates"
  ON seasonal_rates FOR DELETE
  USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);

-- Trigger for seasonal_rates updated_at
DROP TRIGGER IF EXISTS update_seasonal_rates_updated_at ON seasonal_rates;
CREATE TRIGGER update_seasonal_rates_updated_at
  BEFORE UPDATE ON seasonal_rates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- ADD-ONS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS addons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,

  -- Basic Info
  name VARCHAR(255) NOT NULL,
  description TEXT,
  addon_code VARCHAR(50),

  -- Type: service, product, or experience
  addon_type VARCHAR(20) NOT NULL DEFAULT 'service',

  -- Pricing
  price DECIMAL(10, 2) NOT NULL,
  currency VARCHAR(3) NOT NULL DEFAULT 'ZAR',
  pricing_type VARCHAR(30) NOT NULL DEFAULT 'per_booking',
  max_quantity INTEGER NOT NULL DEFAULT 1,

  -- Image: {url, path} or null
  image JSONB,

  -- Room availability: empty array means available for all rooms
  available_for_rooms JSONB NOT NULL DEFAULT '[]'::JSONB,

  -- Status
  is_active BOOLEAN NOT NULL DEFAULT true,

  -- Audit
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID,

  -- Constraints
  CONSTRAINT addons_valid_type CHECK (addon_type IN ('service', 'product', 'experience')),
  CONSTRAINT addons_valid_pricing_type CHECK (pricing_type IN ('per_booking', 'per_night', 'per_guest', 'per_guest_per_night')),
  CONSTRAINT addons_valid_price CHECK (price >= 0),
  CONSTRAINT addons_valid_max_quantity CHECK (max_quantity >= 1)
);

-- Indexes for addons
CREATE INDEX IF NOT EXISTS idx_addons_tenant_id ON addons(tenant_id);
CREATE INDEX IF NOT EXISTS idx_addons_is_active ON addons(is_active);
CREATE INDEX IF NOT EXISTS idx_addons_addon_type ON addons(addon_type);
CREATE INDEX IF NOT EXISTS idx_addons_created_at ON addons(created_at DESC);

-- Row Level Security for addons
ALTER TABLE addons ENABLE ROW LEVEL SECURITY;

-- Drop existing policies first (for re-running schema)
DROP POLICY IF EXISTS "Users can view their tenant addons" ON addons;
DROP POLICY IF EXISTS "Users can insert their tenant addons" ON addons;
DROP POLICY IF EXISTS "Users can update their tenant addons" ON addons;
DROP POLICY IF EXISTS "Users can delete their tenant addons" ON addons;

CREATE POLICY "Users can view their tenant addons"
  ON addons FOR SELECT
  USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);

CREATE POLICY "Users can insert their tenant addons"
  ON addons FOR INSERT
  WITH CHECK (tenant_id = current_setting('app.current_tenant_id', true)::UUID);

CREATE POLICY "Users can update their tenant addons"
  ON addons FOR UPDATE
  USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);

CREATE POLICY "Users can delete their tenant addons"
  ON addons FOR DELETE
  USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);

-- Trigger for addons updated_at
DROP TRIGGER IF EXISTS update_addons_updated_at ON addons;
CREATE TRIGGER update_addons_updated_at
  BEFORE UPDATE ON addons
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- MIGRATIONS (for existing databases)
-- ============================================

-- Add booking duration limits to rooms (if columns don't exist)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rooms' AND column_name = 'min_stay_nights') THEN
    ALTER TABLE rooms ADD COLUMN min_stay_nights INTEGER NOT NULL DEFAULT 1;
    ALTER TABLE rooms ADD CONSTRAINT rooms_valid_min_stay CHECK (min_stay_nights >= 1);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rooms' AND column_name = 'max_stay_nights') THEN
    ALTER TABLE rooms ADD COLUMN max_stay_nights INTEGER;
    ALTER TABLE rooms ADD CONSTRAINT rooms_valid_max_stay CHECK (max_stay_nights IS NULL OR max_stay_nights >= min_stay_nights);
  END IF;
END $$;

-- Add internal_notes and proof_of_payment to bookings (if columns don't exist)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bookings' AND column_name = 'internal_notes') THEN
    ALTER TABLE bookings ADD COLUMN internal_notes TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bookings' AND column_name = 'proof_of_payment') THEN
    ALTER TABLE bookings ADD COLUMN proof_of_payment JSONB;
  END IF;
END $$;

-- Update booking status constraint to include checked_in and checked_out
DO $$
BEGIN
  -- Drop old constraint if it exists and recreate with new values
  IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'valid_status' AND table_name = 'bookings') THEN
    ALTER TABLE bookings DROP CONSTRAINT valid_status;
    ALTER TABLE bookings ADD CONSTRAINT valid_status CHECK (status IN ('pending', 'confirmed', 'checked_in', 'checked_out', 'cancelled', 'completed'));
  END IF;
END $$;


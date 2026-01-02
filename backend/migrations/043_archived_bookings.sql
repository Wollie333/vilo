-- ============================================
-- ARCHIVED BOOKINGS TABLE
-- Stores deleted abandoned/failed bookings for recovery
-- ============================================

CREATE TABLE archived_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  original_booking_id UUID NOT NULL,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  customer_id UUID NOT NULL REFERENCES customers(id),
  room_id UUID REFERENCES rooms(id),
  property_id UUID REFERENCES properties(id),

  -- Booking details snapshot
  booking_ref VARCHAR(50),
  check_in DATE,
  check_out DATE,
  guests INTEGER,
  total_amount DECIMAL(10,2),
  status VARCHAR(50), -- The status when archived (cart_abandoned, payment_failed)

  -- Full booking data for recovery
  booking_data JSONB NOT NULL, -- Complete snapshot of original booking
  checkout_data JSONB,

  -- Archive metadata
  archived_at TIMESTAMPTZ DEFAULT NOW(),
  archived_reason VARCHAR(100), -- 'customer_deleted', 'auto_cleanup', etc.
  recovered_at TIMESTAMPTZ,
  recovered_booking_id UUID,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX idx_archived_bookings_tenant ON archived_bookings(tenant_id);
CREATE INDEX idx_archived_bookings_customer ON archived_bookings(customer_id);
CREATE INDEX idx_archived_bookings_status ON archived_bookings(status);
CREATE INDEX idx_archived_bookings_archived_at ON archived_bookings(archived_at);

-- Partial index for unrecovered bookings (most common query)
CREATE INDEX idx_archived_bookings_unrecovered
ON archived_bookings(tenant_id, customer_id)
WHERE recovered_at IS NULL;

-- Comment documenting the table purpose
COMMENT ON TABLE archived_bookings IS 'Stores deleted abandoned/failed bookings for potential recovery by staff';

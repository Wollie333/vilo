-- Migration: Customer Activity Tracking
-- Track all customer interactions and events for CRM activity timeline

CREATE TABLE IF NOT EXISTS customer_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  customer_email VARCHAR(255) NOT NULL, -- Store email for customers without account

  -- Activity type and details
  activity_type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,

  -- Related entities
  booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
  review_id UUID REFERENCES reviews(id) ON DELETE SET NULL,
  support_ticket_id UUID REFERENCES support_messages(id) ON DELETE SET NULL,

  -- Additional metadata (JSONB for flexibility)
  metadata JSONB DEFAULT '{}',

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_customer_activity_tenant ON customer_activity(tenant_id);
CREATE INDEX IF NOT EXISTS idx_customer_activity_customer ON customer_activity(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_activity_email ON customer_activity(customer_email);
CREATE INDEX IF NOT EXISTS idx_customer_activity_type ON customer_activity(activity_type);
CREATE INDEX IF NOT EXISTS idx_customer_activity_created ON customer_activity(created_at DESC);

-- Enable RLS
ALTER TABLE customer_activity ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only see activities from their tenant
CREATE POLICY customer_activity_tenant_isolation ON customer_activity
  FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

-- Activity types reference:
-- 'booking_created' - New booking was made
-- 'booking_confirmed' - Booking was confirmed
-- 'booking_cancelled' - Booking was cancelled
-- 'booking_checked_in' - Guest checked in
-- 'booking_checked_out' - Guest checked out
-- 'payment_received' - Payment was received
-- 'payment_refunded' - Payment was refunded
-- 'review_submitted' - Customer submitted a review
-- 'review_responded' - Owner responded to review
-- 'support_ticket_created' - Customer created support ticket
-- 'support_ticket_replied' - Reply on support ticket
-- 'support_ticket_resolved' - Support ticket was resolved
-- 'portal_signup' - Customer signed up for portal
-- 'portal_login' - Customer logged into portal
-- 'portal_profile_updated' - Customer updated their profile
-- 'message_sent' - Customer sent a message
-- 'note_added' - Staff added an internal note

COMMENT ON TABLE customer_activity IS 'Tracks all customer interactions and events for CRM activity timeline';
COMMENT ON COLUMN customer_activity.activity_type IS 'Type of activity (booking_created, portal_login, etc.)';
COMMENT ON COLUMN customer_activity.metadata IS 'Additional data like amounts, status changes, etc.';

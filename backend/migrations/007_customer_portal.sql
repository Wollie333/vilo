-- Migration: 007_customer_portal.sql
-- Description: Customer Portal - customers, support messages, access tokens

-- ============================================
-- CUSTOMERS TABLE
-- Represents registered customer accounts
-- ============================================

CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE, -- Links to Supabase Auth user (NULL until they register via password)

  -- Profile info
  email VARCHAR(255) NOT NULL,
  name VARCHAR(255),
  phone VARCHAR(50),

  -- Authentication
  password_hash VARCHAR(255), -- Optional password (bcrypt hash)

  -- Preferences
  preferred_language VARCHAR(10) DEFAULT 'en',
  marketing_consent BOOLEAN DEFAULT false,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_login_at TIMESTAMP WITH TIME ZONE,

  CONSTRAINT customers_email_unique UNIQUE (email)
);

CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(LOWER(email));
CREATE INDEX IF NOT EXISTS idx_customers_user_id ON customers(user_id);

-- ============================================
-- CUSTOMER ACCESS TOKENS TABLE
-- For magic link / one-time access
-- ============================================

CREATE TABLE IF NOT EXISTS customer_access_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  token UUID NOT NULL DEFAULT gen_random_uuid(),
  token_type VARCHAR(20) NOT NULL DEFAULT 'magic_link',

  -- Expiration
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (NOW() + INTERVAL '1 hour'),
  used_at TIMESTAMP WITH TIME ZONE,

  -- Security
  ip_address VARCHAR(45),
  user_agent TEXT,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT customer_tokens_valid_type CHECK (token_type IN ('magic_link', 'booking_access', 'password_reset'))
);

CREATE INDEX IF NOT EXISTS idx_customer_tokens_token ON customer_access_tokens(token);
CREATE INDEX IF NOT EXISTS idx_customer_tokens_customer ON customer_access_tokens(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_tokens_expires ON customer_access_tokens(expires_at);

-- ============================================
-- SUPPORT MESSAGES TABLE
-- Customer support/contact messaging
-- ============================================

CREATE TABLE IF NOT EXISTS support_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,

  -- Message content
  subject VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,

  -- Sender info (for non-logged-in submissions or display)
  sender_email VARCHAR(255),
  sender_name VARCHAR(255),

  -- Status tracking
  status VARCHAR(20) NOT NULL DEFAULT 'new',
  priority VARCHAR(20) DEFAULT 'normal',

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT support_messages_valid_status CHECK (status IN ('new', 'open', 'pending', 'resolved', 'closed')),
  CONSTRAINT support_messages_valid_priority CHECK (priority IN ('low', 'normal', 'high', 'urgent'))
);

CREATE INDEX IF NOT EXISTS idx_support_messages_tenant ON support_messages(tenant_id);
CREATE INDEX IF NOT EXISTS idx_support_messages_customer ON support_messages(customer_id);
CREATE INDEX IF NOT EXISTS idx_support_messages_status ON support_messages(status);
CREATE INDEX IF NOT EXISTS idx_support_messages_booking ON support_messages(booking_id);

-- ============================================
-- SUPPORT REPLIES TABLE
-- Message thread replies
-- ============================================

CREATE TABLE IF NOT EXISTS support_replies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES support_messages(id) ON DELETE CASCADE,

  -- Content
  content TEXT NOT NULL,

  -- Sender
  sender_type VARCHAR(20) NOT NULL, -- 'customer' or 'admin'
  sender_id UUID, -- customer_id or admin user_id
  sender_name VARCHAR(255),

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT support_replies_valid_sender_type CHECK (sender_type IN ('customer', 'admin'))
);

CREATE INDEX IF NOT EXISTS idx_support_replies_message ON support_replies(message_id);
CREATE INDEX IF NOT EXISTS idx_support_replies_created ON support_replies(created_at);

-- ============================================
-- ADD customer_id TO BOOKINGS
-- Links bookings to registered customers
-- ============================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bookings' AND column_name = 'customer_id'
  ) THEN
    ALTER TABLE bookings ADD COLUMN customer_id UUID REFERENCES customers(id) ON DELETE SET NULL;
    CREATE INDEX idx_bookings_customer_id ON bookings(customer_id);
  END IF;
END $$;

-- ============================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================

-- Enable RLS on new tables
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_access_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_replies ENABLE ROW LEVEL SECURITY;

-- Customers table policies (service role can do everything)
CREATE POLICY "Service role has full access to customers" ON customers
  FOR ALL USING (true) WITH CHECK (true);

-- Access tokens policies
CREATE POLICY "Service role has full access to customer_access_tokens" ON customer_access_tokens
  FOR ALL USING (true) WITH CHECK (true);

-- Support messages policies
CREATE POLICY "Service role has full access to support_messages" ON support_messages
  FOR ALL USING (true) WITH CHECK (true);

-- Support replies policies
CREATE POLICY "Service role has full access to support_replies" ON support_replies
  FOR ALL USING (true) WITH CHECK (true);

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Function to clean up expired tokens (can be called via cron)
CREATE OR REPLACE FUNCTION cleanup_expired_customer_tokens()
RETURNS void AS $$
BEGIN
  DELETE FROM customer_access_tokens
  WHERE expires_at < NOW() AND used_at IS NULL;
END;
$$ LANGUAGE plpgsql;

-- Function to get or create customer by email
CREATE OR REPLACE FUNCTION get_or_create_customer(
  p_email VARCHAR(255),
  p_name VARCHAR(255) DEFAULT NULL,
  p_phone VARCHAR(50) DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_customer_id UUID;
BEGIN
  -- Try to find existing customer
  SELECT id INTO v_customer_id
  FROM customers
  WHERE LOWER(email) = LOWER(p_email);

  -- If not found, create new customer
  IF v_customer_id IS NULL THEN
    INSERT INTO customers (email, name, phone)
    VALUES (LOWER(p_email), p_name, p_phone)
    RETURNING id INTO v_customer_id;
  END IF;

  RETURN v_customer_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- UPDATE EXISTING BOOKINGS
-- Link existing bookings to customers by email
-- ============================================

-- Create customers from existing booking emails and link them
DO $$
DECLARE
  r RECORD;
  v_customer_id UUID;
BEGIN
  -- Get unique guest emails from bookings that don't have a customer_id
  FOR r IN
    SELECT DISTINCT LOWER(guest_email) as email,
           MAX(guest_name) as name,
           MAX(guest_phone) as phone
    FROM bookings
    WHERE guest_email IS NOT NULL
      AND guest_email != ''
      AND customer_id IS NULL
    GROUP BY LOWER(guest_email)
  LOOP
    -- Get or create customer
    v_customer_id := get_or_create_customer(r.email, r.name, r.phone);

    -- Update all bookings with this email
    UPDATE bookings
    SET customer_id = v_customer_id
    WHERE LOWER(guest_email) = r.email
      AND customer_id IS NULL;
  END LOOP;
END $$;

-- Notifications table (unified for admin + customers)
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- Recipient (either member OR customer, not both)
  member_id UUID REFERENCES tenant_members(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,

  -- Content
  type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT,

  -- Deep linking
  link_type VARCHAR(50),
  link_id UUID,

  -- Status
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints: must have either member_id OR customer_id, not both
  CONSTRAINT notification_recipient_check CHECK (
    (member_id IS NOT NULL AND customer_id IS NULL) OR
    (member_id IS NULL AND customer_id IS NOT NULL)
  )
);

-- Indexes for efficient queries
CREATE INDEX idx_notifications_member ON notifications(member_id, read_at) WHERE member_id IS NOT NULL;
CREATE INDEX idx_notifications_customer ON notifications(customer_id, read_at) WHERE customer_id IS NOT NULL;
CREATE INDEX idx_notifications_tenant ON notifications(tenant_id, created_at DESC);
CREATE INDEX idx_notifications_type ON notifications(type);

-- Notification preferences table
CREATE TABLE notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- Owner (either member OR customer)
  member_id UUID REFERENCES tenant_members(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,

  -- Toggles (JSON for flexibility)
  preferences JSONB DEFAULT '{
    "bookings": true,
    "payments": true,
    "reviews": true,
    "support": true,
    "system": true
  }'::jsonb,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT prefs_recipient_check CHECK (
    (member_id IS NOT NULL AND customer_id IS NULL) OR
    (member_id IS NULL AND customer_id IS NOT NULL)
  ),
  UNIQUE(member_id),
  UNIQUE(customer_id)
);

-- Enable Row Level Security
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

-- RLS Policies for notifications
CREATE POLICY "Users can view their own notifications"
  ON notifications FOR SELECT
  USING (
    member_id = auth.uid() OR
    customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can update their own notifications"
  ON notifications FOR UPDATE
  USING (
    member_id = auth.uid() OR
    customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid())
  );

-- Service role can do everything
CREATE POLICY "Service role full access to notifications"
  ON notifications FOR ALL
  USING (auth.role() = 'service_role');

-- RLS Policies for notification_preferences
CREATE POLICY "Users can view their own preferences"
  ON notification_preferences FOR SELECT
  USING (
    member_id = auth.uid() OR
    customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can update their own preferences"
  ON notification_preferences FOR UPDATE
  USING (
    member_id = auth.uid() OR
    customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can insert their own preferences"
  ON notification_preferences FOR INSERT
  WITH CHECK (
    member_id = auth.uid() OR
    customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid())
  );

CREATE POLICY "Service role full access to preferences"
  ON notification_preferences FOR ALL
  USING (auth.role() = 'service_role');

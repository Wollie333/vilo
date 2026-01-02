-- =====================================================
-- Migration: 045_growth_analytics_tracking.sql
-- Description: Comprehensive growth analytics tracking
-- for marketing decision support
-- =====================================================

-- =====================================================
-- PART 1: TENANT MARKETING ATTRIBUTION FIELDS
-- =====================================================

-- Signup source tracking
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS signup_source VARCHAR(50);
-- Values: 'organic', 'paid', 'referral', 'direct', 'social', 'partner'

ALTER TABLE tenants ADD COLUMN IF NOT EXISTS signup_campaign VARCHAR(100);
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS signup_referrer TEXT;

-- UTM parameter tracking
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS utm_source VARCHAR(100);
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS utm_medium VARCHAR(100);
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS utm_campaign VARCHAR(100);
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS utm_content VARCHAR(100);
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS utm_term VARCHAR(100);

-- =====================================================
-- PART 2: TENANT ACTIVATION MILESTONE TRACKING
-- =====================================================

-- Activation milestones (timestamps)
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS first_room_created_at TIMESTAMPTZ;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS first_booking_created_at TIMESTAMPTZ;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS first_payment_received_at TIMESTAMPTZ;

-- Activation score (0-100 based on completed milestones and engagement)
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS activation_score INTEGER DEFAULT 0;

-- =====================================================
-- PART 3: TENANT ENGAGEMENT TRACKING
-- =====================================================

-- Last activity timestamp for active tenant calculation
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS last_activity_at TIMESTAMPTZ;

-- =====================================================
-- PART 4: CHURN TRACKING
-- =====================================================

ALTER TABLE tenants ADD COLUMN IF NOT EXISTS churned_at TIMESTAMPTZ;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS churn_reason VARCHAR(100);
-- Values: 'pricing', 'not_needed', 'competitor', 'missing_features',
--         'poor_support', 'business_closed', 'other'
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS churn_feedback TEXT;

-- =====================================================
-- PART 5: INDEXES FOR GROWTH ANALYTICS
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_tenants_signup_source ON tenants(signup_source);
CREATE INDEX IF NOT EXISTS idx_tenants_signup_campaign ON tenants(signup_campaign);
CREATE INDEX IF NOT EXISTS idx_tenants_utm_source ON tenants(utm_source);
CREATE INDEX IF NOT EXISTS idx_tenants_utm_campaign ON tenants(utm_campaign);
CREATE INDEX IF NOT EXISTS idx_tenants_activation_score ON tenants(activation_score);
CREATE INDEX IF NOT EXISTS idx_tenants_last_activity ON tenants(last_activity_at);
CREATE INDEX IF NOT EXISTS idx_tenants_churned_at ON tenants(churned_at);
CREATE INDEX IF NOT EXISTS idx_tenants_first_room ON tenants(first_room_created_at);
CREATE INDEX IF NOT EXISTS idx_tenants_first_booking ON tenants(first_booking_created_at);
CREATE INDEX IF NOT EXISTS idx_tenants_first_payment ON tenants(first_payment_received_at);

-- =====================================================
-- PART 6: TENANT ACTIVITY LOG TABLE
-- For detailed engagement and feature usage tracking
-- =====================================================

CREATE TABLE IF NOT EXISTS tenant_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID,

  -- Activity details
  activity_type VARCHAR(50) NOT NULL,
  -- Types: 'login', 'logout', 'room_created', 'room_updated', 'room_deleted',
  --        'booking_created', 'booking_updated', 'booking_cancelled',
  --        'customer_added', 'team_member_invited', 'team_member_removed',
  --        'settings_updated', 'report_generated', 'invoice_sent',
  --        'payment_recorded', 'calendar_viewed', 'analytics_viewed'

  feature_used VARCHAR(100),
  -- Features: 'dashboard', 'calendar', 'bookings', 'rooms', 'customers',
  --           'analytics', 'invoicing', 'reports', 'settings', 'team'

  session_duration_seconds INTEGER,
  page_path VARCHAR(255),

  -- Additional context
  metadata JSONB DEFAULT '{}',

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for activity log queries
CREATE INDEX IF NOT EXISTS idx_tenant_activity_tenant ON tenant_activity_log(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_activity_type ON tenant_activity_log(activity_type);
CREATE INDEX IF NOT EXISTS idx_tenant_activity_feature ON tenant_activity_log(feature_used);
CREATE INDEX IF NOT EXISTS idx_tenant_activity_created ON tenant_activity_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tenant_activity_user ON tenant_activity_log(user_id);

-- Composite index for common queries
CREATE INDEX IF NOT EXISTS idx_tenant_activity_tenant_date
ON tenant_activity_log(tenant_id, created_at DESC);

-- =====================================================
-- PART 7: GROWTH METRICS DAILY TABLE
-- Pre-aggregated metrics for fast dashboard queries
-- =====================================================

CREATE TABLE IF NOT EXISTS growth_metrics_daily (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_date DATE NOT NULL UNIQUE,

  -- Tenant Growth
  new_signups INTEGER DEFAULT 0,
  signups_by_source JSONB DEFAULT '{}',
  signups_by_campaign JSONB DEFAULT '{}',
  active_tenants_7d INTEGER DEFAULT 0,
  active_tenants_30d INTEGER DEFAULT 0,
  total_tenants INTEGER DEFAULT 0,

  -- Activation Funnel
  tenants_activated_room INTEGER DEFAULT 0,
  tenants_activated_booking INTEGER DEFAULT 0,
  tenants_activated_payment INTEGER DEFAULT 0,
  avg_days_to_first_room DECIMAL(5,2),
  avg_days_to_first_booking DECIMAL(5,2),
  avg_days_to_first_payment DECIMAL(5,2),

  -- Inventory Growth
  total_rooms INTEGER DEFAULT 0,
  new_rooms INTEGER DEFAULT 0,
  active_rooms INTEGER DEFAULT 0,
  avg_rooms_per_tenant DECIMAL(5,2),
  rooms_by_type JSONB DEFAULT '{}',

  -- Team Growth
  total_team_members INTEGER DEFAULT 0,
  new_team_members INTEGER DEFAULT 0,
  avg_team_size DECIMAL(5,2),
  members_by_role JSONB DEFAULT '{}',

  -- Customer Acquisition
  total_customers INTEGER DEFAULT 0,
  new_customers INTEGER DEFAULT 0,
  customers_with_bookings INTEGER DEFAULT 0,
  repeat_customers INTEGER DEFAULT 0,
  customer_conversion_rate DECIMAL(5,2),

  -- GMV & Bookings
  total_bookings INTEGER DEFAULT 0,
  new_bookings INTEGER DEFAULT 0,
  confirmed_bookings INTEGER DEFAULT 0,
  total_gmv DECIMAL(14,2) DEFAULT 0,
  avg_booking_value DECIMAL(10,2),

  -- Engagement
  total_logins INTEGER DEFAULT 0,
  unique_logins INTEGER DEFAULT 0,
  avg_session_duration_seconds INTEGER,
  feature_usage JSONB DEFAULT '{}',

  -- Churn
  churned_tenants INTEGER DEFAULT 0,
  churn_reasons JSONB DEFAULT '{}',

  -- Metadata
  calculated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT growth_metrics_date_unique UNIQUE (metric_date)
);

CREATE INDEX IF NOT EXISTS idx_growth_metrics_date ON growth_metrics_daily(metric_date DESC);

-- =====================================================
-- PART 8: BACKFILL EXISTING DATA
-- Calculate milestones from existing records
-- =====================================================

-- Backfill first_room_created_at from rooms table
UPDATE tenants t
SET first_room_created_at = subquery.first_room
FROM (
  SELECT tenant_id, MIN(created_at) as first_room
  FROM rooms
  GROUP BY tenant_id
) subquery
WHERE t.id = subquery.tenant_id
AND t.first_room_created_at IS NULL;

-- Backfill first_booking_created_at from bookings table
UPDATE tenants t
SET first_booking_created_at = subquery.first_booking
FROM (
  SELECT tenant_id, MIN(created_at) as first_booking
  FROM bookings
  GROUP BY tenant_id
) subquery
WHERE t.id = subquery.tenant_id
AND t.first_booking_created_at IS NULL;

-- Backfill first_payment_received_at from bookings with payment
UPDATE tenants t
SET first_payment_received_at = subquery.first_payment
FROM (
  SELECT tenant_id, MIN(COALESCE(payment_completed_at, updated_at)) as first_payment
  FROM bookings
  WHERE payment_status = 'paid'
  GROUP BY tenant_id
) subquery
WHERE t.id = subquery.tenant_id
AND t.first_payment_received_at IS NULL;

-- Backfill last_activity_at from most recent booking or room activity
UPDATE tenants t
SET last_activity_at = GREATEST(
  COALESCE((SELECT MAX(created_at) FROM bookings WHERE tenant_id = t.id), t.created_at),
  COALESCE((SELECT MAX(updated_at) FROM rooms WHERE tenant_id = t.id), t.created_at),
  t.created_at
)
WHERE t.last_activity_at IS NULL;

-- Calculate activation score based on milestones
-- Score: 25 per milestone (room, booking, payment, team member)
UPDATE tenants t
SET activation_score = (
  CASE WHEN t.first_room_created_at IS NOT NULL THEN 25 ELSE 0 END +
  CASE WHEN t.first_booking_created_at IS NOT NULL THEN 25 ELSE 0 END +
  CASE WHEN t.first_payment_received_at IS NOT NULL THEN 25 ELSE 0 END +
  CASE WHEN EXISTS (
    SELECT 1 FROM tenant_members tm
    WHERE tm.tenant_id = t.id AND tm.status = 'active'
    AND tm.user_id != t.owner_user_id
  ) THEN 25 ELSE 0 END
);

-- Set default signup_source to 'direct' for existing tenants without source
UPDATE tenants
SET signup_source = 'direct'
WHERE signup_source IS NULL;

-- =====================================================
-- PART 9: COLUMN COMMENTS FOR DOCUMENTATION
-- =====================================================

COMMENT ON COLUMN tenants.signup_source IS 'Marketing attribution: organic, paid, referral, direct, social, partner';
COMMENT ON COLUMN tenants.signup_campaign IS 'Campaign name/identifier for tracking marketing ROI';
COMMENT ON COLUMN tenants.utm_source IS 'UTM source parameter from signup URL';
COMMENT ON COLUMN tenants.utm_medium IS 'UTM medium parameter from signup URL';
COMMENT ON COLUMN tenants.utm_campaign IS 'UTM campaign parameter from signup URL';
COMMENT ON COLUMN tenants.first_room_created_at IS 'Timestamp when tenant created their first room';
COMMENT ON COLUMN tenants.first_booking_created_at IS 'Timestamp when tenant received their first booking';
COMMENT ON COLUMN tenants.first_payment_received_at IS 'Timestamp when tenant received their first payment';
COMMENT ON COLUMN tenants.activation_score IS 'Activation score 0-100 based on completed milestones';
COMMENT ON COLUMN tenants.last_activity_at IS 'Last activity timestamp for engagement tracking';
COMMENT ON COLUMN tenants.churned_at IS 'Timestamp when tenant churned/cancelled subscription';
COMMENT ON COLUMN tenants.churn_reason IS 'Primary reason for churn: pricing, not_needed, competitor, etc.';

COMMENT ON TABLE tenant_activity_log IS 'Detailed log of tenant activities for engagement and feature usage analytics';
COMMENT ON TABLE growth_metrics_daily IS 'Pre-aggregated daily growth metrics for fast dashboard queries';

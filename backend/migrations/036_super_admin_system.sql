-- =====================================================
-- SUPER ADMIN SYSTEM MIGRATION
-- Platform-level administration for SaaS owners
-- =====================================================

-- =====================================================
-- SUPER ADMIN USERS TABLE
-- Separate from tenant_members - platform-level administrators
-- =====================================================
CREATE TABLE IF NOT EXISTS super_admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE, -- Supabase Auth user ID
  email VARCHAR(255) NOT NULL UNIQUE,
  display_name VARCHAR(100) NOT NULL,
  avatar_url TEXT,

  -- Role within super-admin team
  role VARCHAR(50) NOT NULL DEFAULT 'admin',
  -- Possible roles: 'super_admin', 'admin', 'support', 'marketing', 'finance'

  -- Granular permissions (JSONB for flexibility)
  permissions JSONB NOT NULL DEFAULT '{
    "analytics": true,
    "tenants": true,
    "users": true,
    "plans": true,
    "integrations": true,
    "marketing": true,
    "teams": true,
    "errors": true,
    "backups": true,
    "settings": true
  }'::jsonb,

  -- Status
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  last_login_at TIMESTAMPTZ,

  -- Audit
  created_by UUID REFERENCES super_admins(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT super_admins_valid_role CHECK (role IN ('super_admin', 'admin', 'support', 'marketing', 'finance')),
  CONSTRAINT super_admins_valid_status CHECK (status IN ('active', 'suspended', 'removed'))
);

CREATE INDEX idx_super_admins_user_id ON super_admins(user_id);
CREATE INDEX idx_super_admins_email ON super_admins(email);
CREATE INDEX idx_super_admins_role ON super_admins(role);
CREATE INDEX idx_super_admins_status ON super_admins(status);

-- =====================================================
-- SUBSCRIPTION PLANS TABLE
-- Define available subscription tiers
-- =====================================================
CREATE TABLE IF NOT EXISTS subscription_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Plan identification
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(50) NOT NULL UNIQUE,
  description TEXT,

  -- Pricing
  price_monthly DECIMAL(10, 2) NOT NULL DEFAULT 0,
  price_yearly DECIMAL(10, 2) NOT NULL DEFAULT 0,
  currency VARCHAR(3) NOT NULL DEFAULT 'ZAR',

  -- Feature limits
  limits JSONB NOT NULL DEFAULT '{
    "max_rooms": 5,
    "max_team_members": 3,
    "max_bookings_per_month": 100,
    "max_storage_mb": 500,
    "analytics_retention_days": 30,
    "api_rate_limit": 1000,
    "custom_domain": false,
    "white_label": false,
    "priority_support": false
  }'::jsonb,

  -- Features included (for display)
  features JSONB NOT NULL DEFAULT '[]'::jsonb,

  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  is_public BOOLEAN DEFAULT TRUE, -- Show on pricing page
  display_order INTEGER DEFAULT 0,

  -- Trial settings
  trial_days INTEGER DEFAULT 14,

  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_subscription_plans_slug ON subscription_plans(slug);
CREATE INDEX idx_subscription_plans_active ON subscription_plans(is_active, is_public);

-- =====================================================
-- TENANT SUBSCRIPTIONS TABLE
-- Links tenants to their subscription plans
-- =====================================================
CREATE TABLE IF NOT EXISTS tenant_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES subscription_plans(id),

  -- Subscription status
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  -- Statuses: trial, active, past_due, cancelled, expired

  -- Billing cycle
  billing_cycle VARCHAR(20) NOT NULL DEFAULT 'monthly', -- 'monthly' or 'yearly'
  current_period_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  current_period_end TIMESTAMPTZ NOT NULL,

  -- Trial info
  trial_start TIMESTAMPTZ,
  trial_end TIMESTAMPTZ,

  -- Payment provider info (Paystack, PayPal, etc.)
  payment_provider VARCHAR(50),
  payment_provider_subscription_id TEXT,
  payment_provider_customer_id TEXT,

  -- Usage tracking (updated by cron job)
  usage_snapshot JSONB DEFAULT '{}'::jsonb,
  usage_updated_at TIMESTAMPTZ,

  -- Cancellation
  cancelled_at TIMESTAMPTZ,
  cancellation_reason TEXT,
  cancel_at_period_end BOOLEAN DEFAULT FALSE,

  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT tenant_subscriptions_valid_status CHECK (
    status IN ('trial', 'active', 'past_due', 'cancelled', 'expired')
  ),
  CONSTRAINT tenant_subscriptions_valid_cycle CHECK (
    billing_cycle IN ('monthly', 'yearly')
  )
);

CREATE UNIQUE INDEX idx_tenant_subscriptions_tenant ON tenant_subscriptions(tenant_id)
  WHERE status IN ('trial', 'active', 'past_due');
CREATE INDEX idx_tenant_subscriptions_status ON tenant_subscriptions(status);
CREATE INDEX idx_tenant_subscriptions_plan ON tenant_subscriptions(plan_id);
CREATE INDEX idx_tenant_subscriptions_period_end ON tenant_subscriptions(current_period_end);

-- =====================================================
-- PLATFORM SETTINGS TABLE
-- Global configuration for the SaaS platform
-- =====================================================
CREATE TABLE IF NOT EXISTS platform_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key VARCHAR(100) NOT NULL UNIQUE,
  value JSONB NOT NULL,
  category VARCHAR(50) NOT NULL DEFAULT 'general',
  description TEXT,
  is_secret BOOLEAN DEFAULT FALSE, -- Mask in API responses

  -- Audit
  updated_by UUID REFERENCES super_admins(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_platform_settings_category ON platform_settings(category);

-- =====================================================
-- ERROR LOGS TABLE
-- Custom error logging for the platform
-- =====================================================
CREATE TABLE IF NOT EXISTS error_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Error identification
  error_code VARCHAR(50),
  error_type VARCHAR(100) NOT NULL, -- 'exception', 'api_error', 'validation', 'auth', 'payment', etc.
  severity VARCHAR(20) NOT NULL DEFAULT 'error', -- 'debug', 'info', 'warning', 'error', 'critical'

  -- Context
  tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL,
  user_id UUID, -- Supabase Auth user ID
  request_id TEXT, -- Correlation ID
  endpoint TEXT,
  http_method VARCHAR(10),

  -- Error details
  message TEXT NOT NULL,
  stack_trace TEXT,
  metadata JSONB DEFAULT '{}', -- Request body, headers, etc.

  -- Environment
  environment VARCHAR(20) NOT NULL DEFAULT 'production',
  server_instance TEXT,

  -- Resolution tracking
  status VARCHAR(20) DEFAULT 'new', -- 'new', 'acknowledged', 'resolved', 'ignored'
  resolved_by UUID REFERENCES super_admins(id),
  resolved_at TIMESTAMPTZ,
  resolution_notes TEXT,

  -- Sentry integration
  sentry_event_id TEXT,
  sentry_issue_id TEXT,

  -- Audit
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_error_logs_tenant ON error_logs(tenant_id);
CREATE INDEX idx_error_logs_type ON error_logs(error_type);
CREATE INDEX idx_error_logs_severity ON error_logs(severity);
CREATE INDEX idx_error_logs_status ON error_logs(status);
CREATE INDEX idx_error_logs_occurred ON error_logs(occurred_at DESC);
CREATE INDEX idx_error_logs_sentry ON error_logs(sentry_event_id) WHERE sentry_event_id IS NOT NULL;

-- Partial index for unresolved errors
CREATE INDEX idx_error_logs_unresolved ON error_logs(occurred_at DESC)
  WHERE status IN ('new', 'acknowledged');

-- =====================================================
-- BACKUP HISTORY TABLE
-- Track database backups and restores
-- =====================================================
CREATE TABLE IF NOT EXISTS backup_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Backup identification
  backup_type VARCHAR(50) NOT NULL, -- 'full', 'incremental', 'tenant_export'
  backup_name TEXT NOT NULL,

  -- Scope
  tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL, -- NULL for full backups

  -- Storage
  storage_provider VARCHAR(50) NOT NULL, -- 's3', 'gcs', 'azure', 'supabase_storage'
  storage_path TEXT NOT NULL,
  storage_bucket TEXT,

  -- Backup details
  size_bytes BIGINT,
  checksum TEXT, -- SHA256 hash
  encryption_method VARCHAR(50),
  compression VARCHAR(20), -- 'gzip', 'lz4', etc.

  -- Status
  status VARCHAR(20) NOT NULL DEFAULT 'in_progress',
  -- Statuses: in_progress, completed, failed, deleted

  -- Timing
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,

  -- Errors
  error_message TEXT,

  -- Retention
  expires_at TIMESTAMPTZ, -- Auto-delete after this date

  -- Initiator
  initiated_by UUID REFERENCES super_admins(id),
  initiated_source VARCHAR(50) DEFAULT 'manual', -- 'manual', 'scheduled', 'pre_update'

  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_backup_history_type ON backup_history(backup_type);
CREATE INDEX idx_backup_history_tenant ON backup_history(tenant_id);
CREATE INDEX idx_backup_history_status ON backup_history(status);
CREATE INDEX idx_backup_history_created ON backup_history(created_at DESC);
CREATE INDEX idx_backup_history_expires ON backup_history(expires_at) WHERE expires_at IS NOT NULL;

-- =====================================================
-- MARKETING CAMPAIGNS TABLE
-- Platform-wide announcements and promotions
-- =====================================================
CREATE TABLE IF NOT EXISTS marketing_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Campaign identification
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) UNIQUE,
  campaign_type VARCHAR(50) NOT NULL, -- 'announcement', 'promotion', 'newsletter', 'feature_launch'

  -- Content
  subject TEXT NOT NULL, -- Email subject / notification title
  body_html TEXT, -- HTML content
  body_text TEXT, -- Plain text fallback
  body_json JSONB, -- Structured content for in-app notifications

  -- Targeting
  target_audience JSONB NOT NULL DEFAULT '{
    "all_tenants": true,
    "plan_slugs": [],
    "tenant_ids": [],
    "regions": [],
    "exclude_tenant_ids": []
  }'::jsonb,

  -- Delivery channels
  channels JSONB NOT NULL DEFAULT '{
    "email": true,
    "in_app_notification": true,
    "dashboard_banner": false,
    "push_notification": false
  }'::jsonb,

  -- Scheduling
  status VARCHAR(20) NOT NULL DEFAULT 'draft',
  -- Statuses: draft, scheduled, sending, sent, cancelled
  scheduled_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,

  -- Metrics
  stats JSONB DEFAULT '{
    "total_recipients": 0,
    "emails_sent": 0,
    "emails_opened": 0,
    "emails_clicked": 0,
    "notifications_sent": 0,
    "notifications_read": 0
  }'::jsonb,

  -- Audit
  created_by UUID REFERENCES super_admins(id),
  updated_by UUID REFERENCES super_admins(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_marketing_campaigns_type ON marketing_campaigns(campaign_type);
CREATE INDEX idx_marketing_campaigns_status ON marketing_campaigns(status);
CREATE INDEX idx_marketing_campaigns_scheduled ON marketing_campaigns(scheduled_at)
  WHERE status = 'scheduled';

-- =====================================================
-- PLATFORM ANALYTICS TABLE
-- Aggregated platform-wide metrics
-- =====================================================
CREATE TABLE IF NOT EXISTS platform_metrics_daily (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_date DATE NOT NULL UNIQUE,

  -- Tenant metrics
  total_tenants INTEGER DEFAULT 0,
  active_tenants INTEGER DEFAULT 0, -- Logged in within 30 days
  new_tenants INTEGER DEFAULT 0,
  churned_tenants INTEGER DEFAULT 0,

  -- User metrics
  total_users INTEGER DEFAULT 0,
  active_users INTEGER DEFAULT 0, -- Logged in today
  new_users INTEGER DEFAULT 0,

  -- Booking metrics (platform-wide)
  total_bookings INTEGER DEFAULT 0,
  total_revenue DECIMAL(14, 2) DEFAULT 0,
  avg_booking_value DECIMAL(10, 2) DEFAULT 0,

  -- System metrics
  api_requests INTEGER DEFAULT 0,
  error_count INTEGER DEFAULT 0,
  avg_response_time_ms INTEGER DEFAULT 0,

  -- Storage metrics
  total_storage_used_mb BIGINT DEFAULT 0,

  -- Plan distribution (JSONB snapshot)
  plan_distribution JSONB DEFAULT '{}', -- {"free": 100, "pro": 50, "enterprise": 10}

  -- Geographic distribution
  tenant_countries JSONB DEFAULT '{}', -- {"ZA": 50, "US": 30, ...}

  -- Audit
  calculated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_platform_metrics_date ON platform_metrics_daily(metric_date DESC);

-- =====================================================
-- ADMIN AUDIT LOG TABLE
-- Track all super-admin actions
-- =====================================================
CREATE TABLE IF NOT EXISTS admin_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Actor
  admin_id UUID REFERENCES super_admins(id),
  admin_email VARCHAR(255),

  -- Action
  action VARCHAR(100) NOT NULL, -- 'tenant.suspend', 'user.delete', 'plan.update', etc.
  resource_type VARCHAR(50) NOT NULL, -- 'tenant', 'user', 'plan', 'setting', etc.
  resource_id UUID,

  -- Details
  description TEXT,
  changes JSONB, -- {"field": {"old": X, "new": Y}}
  metadata JSONB DEFAULT '{}',

  -- Request context
  ip_address INET,
  user_agent TEXT,

  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_admin_audit_action ON admin_audit_logs(action);
CREATE INDEX idx_admin_audit_resource ON admin_audit_logs(resource_type, resource_id);
CREATE INDEX idx_admin_audit_admin ON admin_audit_logs(admin_id);
CREATE INDEX idx_admin_audit_created ON admin_audit_logs(created_at DESC);

-- =====================================================
-- PLATFORM PAYMENT GATEWAYS TABLE
-- Global payment gateway configuration
-- =====================================================
CREATE TABLE IF NOT EXISTS platform_payment_gateways (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Gateway identification
  gateway_name VARCHAR(50) NOT NULL UNIQUE, -- 'paystack', 'paypal', 'eft'
  display_name VARCHAR(100) NOT NULL,
  description TEXT,

  -- Configuration
  is_enabled BOOLEAN DEFAULT FALSE,
  is_test_mode BOOLEAN DEFAULT TRUE,

  -- Credentials (encrypted or use env vars reference)
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  -- For Paystack: { "public_key": "...", "secret_key": "...", "webhook_secret": "..." }
  -- For PayPal: { "client_id": "...", "client_secret": "...", "webhook_id": "..." }
  -- For EFT: { "bank_name": "...", "account_number": "...", "branch_code": "...", "account_holder": "..." }

  -- Test credentials (separate from live)
  test_config JSONB DEFAULT '{}'::jsonb,

  -- Supported features
  supported_currencies JSONB DEFAULT '["ZAR", "USD"]'::jsonb,
  supported_countries JSONB DEFAULT '["ZA"]'::jsonb,

  -- Status
  last_health_check TIMESTAMPTZ,
  health_status VARCHAR(20) DEFAULT 'unknown', -- 'healthy', 'degraded', 'down', 'unknown'

  -- Audit
  updated_by UUID REFERENCES super_admins(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_platform_payment_gateways_enabled ON platform_payment_gateways(is_enabled);

-- =====================================================
-- RLS POLICIES
-- Super-admin tables should NOT have tenant-based RLS
-- Only service role access
-- =====================================================

ALTER TABLE super_admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE error_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE backup_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_metrics_daily ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_payment_gateways ENABLE ROW LEVEL SECURITY;

-- Service role only access for all super-admin tables
CREATE POLICY "Service role access to super_admins"
  ON super_admins FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role access to subscription_plans"
  ON subscription_plans FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role access to tenant_subscriptions"
  ON tenant_subscriptions FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role access to platform_settings"
  ON platform_settings FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role access to error_logs"
  ON error_logs FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role access to backup_history"
  ON backup_history FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role access to marketing_campaigns"
  ON marketing_campaigns FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role access to platform_metrics_daily"
  ON platform_metrics_daily FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role access to admin_audit_logs"
  ON admin_audit_logs FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role access to platform_payment_gateways"
  ON platform_payment_gateways FOR ALL USING (auth.role() = 'service_role');

-- Public read access to subscription plans (for pricing page)
CREATE POLICY "Public read access to active subscription plans"
  ON subscription_plans FOR SELECT
  USING (is_active = TRUE AND is_public = TRUE);

-- =====================================================
-- SEED DEFAULT DATA
-- =====================================================

-- Seed initial platform settings
INSERT INTO platform_settings (key, value, category, description) VALUES
  ('platform_name', '"Vilo"', 'branding', 'Platform display name'),
  ('support_email', '"support@vilo.app"', 'contact', 'Support email address'),
  ('maintenance_mode', 'false', 'system', 'Enable maintenance mode'),
  ('new_registrations_enabled', 'true', 'system', 'Allow new tenant registrations'),
  ('default_plan_slug', '"free"', 'billing', 'Default plan for new tenants'),
  ('payment_gateway_primary', '"paystack"', 'billing', 'Primary payment gateway'),
  ('sentry_dsn', 'null', 'monitoring', 'Sentry DSN for error tracking'),
  ('analytics_retention_default', '90', 'analytics', 'Default analytics retention days')
ON CONFLICT (key) DO NOTHING;

-- Seed default subscription plans
INSERT INTO subscription_plans (name, slug, description, price_monthly, price_yearly, limits, features, is_public, display_order) VALUES
  ('Free', 'free', 'Get started with basic features', 0, 0,
   '{"max_rooms": 2, "max_team_members": 1, "max_bookings_per_month": 20, "max_storage_mb": 100, "analytics_retention_days": 7, "api_rate_limit": 100, "custom_domain": false, "white_label": false, "priority_support": false}',
   '["Up to 2 rooms", "1 team member", "20 bookings/month", "Basic analytics", "Email support"]',
   TRUE, 1),

  ('Starter', 'starter', 'Perfect for small properties', 499, 4990,
   '{"max_rooms": 5, "max_team_members": 3, "max_bookings_per_month": 100, "max_storage_mb": 500, "analytics_retention_days": 30, "api_rate_limit": 1000, "custom_domain": false, "white_label": false, "priority_support": false}',
   '["Up to 5 rooms", "3 team members", "100 bookings/month", "30-day analytics", "iCal sync", "Customer portal"]',
   TRUE, 2),

  ('Professional', 'professional', 'For growing hospitality businesses', 999, 9990,
   '{"max_rooms": 20, "max_team_members": 10, "max_bookings_per_month": 500, "max_storage_mb": 2000, "analytics_retention_days": 90, "api_rate_limit": 5000, "custom_domain": true, "white_label": false, "priority_support": true}',
   '["Up to 20 rooms", "10 team members", "500 bookings/month", "90-day analytics", "Custom domain", "API access", "Priority support"]',
   TRUE, 3),

  ('Enterprise', 'enterprise', 'Custom solutions for large operations', 2499, 24990,
   '{"max_rooms": -1, "max_team_members": -1, "max_bookings_per_month": -1, "max_storage_mb": 10000, "analytics_retention_days": 365, "api_rate_limit": -1, "custom_domain": true, "white_label": true, "priority_support": true}',
   '["Unlimited rooms", "Unlimited team members", "Unlimited bookings", "1-year analytics", "White-label option", "Dedicated support", "Custom integrations"]',
   TRUE, 4),

  ('Lifetime', 'lifetime', 'One-time payment, lifetime access', 9999, 9999,
   '{"max_rooms": 20, "max_team_members": 10, "max_bookings_per_month": -1, "max_storage_mb": 5000, "analytics_retention_days": 365, "api_rate_limit": 5000, "custom_domain": true, "white_label": false, "priority_support": true}',
   '["Up to 20 rooms", "10 team members", "Unlimited bookings", "All Professional features", "Lifetime updates"]',
   FALSE, 10) -- Not public, special offer
ON CONFLICT (slug) DO NOTHING;

-- Seed payment gateways
INSERT INTO platform_payment_gateways (gateway_name, display_name, description, is_enabled, is_test_mode, config, supported_currencies, supported_countries) VALUES
  ('paystack', 'Paystack', 'Accept card payments in Africa', FALSE, TRUE, '{}', '["ZAR", "NGN", "GHS", "KES"]', '["ZA", "NG", "GH", "KE"]'),
  ('paypal', 'PayPal', 'Accept international payments via PayPal', FALSE, TRUE, '{}', '["USD", "EUR", "GBP", "ZAR"]', '["US", "GB", "ZA", "DE", "FR"]'),
  ('eft', 'EFT Bank Transfer', 'Accept manual bank transfers', FALSE, FALSE, '{}', '["ZAR"]', '["ZA"]')
ON CONFLICT (gateway_name) DO NOTHING;

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE super_admins IS 'Platform-level administrators with access to the Super Admin Dashboard';
COMMENT ON TABLE subscription_plans IS 'Available subscription tiers for tenants';
COMMENT ON TABLE tenant_subscriptions IS 'Active subscriptions linking tenants to plans';
COMMENT ON TABLE platform_settings IS 'Global platform configuration key-value store';
COMMENT ON TABLE error_logs IS 'Centralized error logging with Sentry integration support';
COMMENT ON TABLE backup_history IS 'Database backup and restore history';
COMMENT ON TABLE marketing_campaigns IS 'Platform-wide announcements and promotional campaigns';
COMMENT ON TABLE platform_metrics_daily IS 'Pre-aggregated daily platform metrics for dashboard';
COMMENT ON TABLE admin_audit_logs IS 'Audit trail of all super-admin actions';
COMMENT ON TABLE platform_payment_gateways IS 'Global payment gateway configuration';

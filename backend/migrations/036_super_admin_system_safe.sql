-- =====================================================
-- SUPER ADMIN SYSTEM MIGRATION (SAFE VERSION)
-- Handles already existing objects
-- =====================================================

-- Drop existing indexes if they exist (safe approach)
DROP INDEX IF EXISTS idx_super_admins_user_id;
DROP INDEX IF EXISTS idx_super_admins_email;
DROP INDEX IF EXISTS idx_super_admins_role;
DROP INDEX IF EXISTS idx_super_admins_status;
DROP INDEX IF EXISTS idx_subscription_plans_slug;
DROP INDEX IF EXISTS idx_subscription_plans_active;
DROP INDEX IF EXISTS idx_tenant_subscriptions_tenant;
DROP INDEX IF EXISTS idx_tenant_subscriptions_status;
DROP INDEX IF EXISTS idx_tenant_subscriptions_plan;
DROP INDEX IF EXISTS idx_tenant_subscriptions_period_end;
DROP INDEX IF EXISTS idx_platform_settings_category;
DROP INDEX IF EXISTS idx_error_logs_tenant;
DROP INDEX IF EXISTS idx_error_logs_type;
DROP INDEX IF EXISTS idx_error_logs_severity;
DROP INDEX IF EXISTS idx_error_logs_status;
DROP INDEX IF EXISTS idx_error_logs_occurred;
DROP INDEX IF EXISTS idx_error_logs_sentry;
DROP INDEX IF EXISTS idx_error_logs_unresolved;
DROP INDEX IF EXISTS idx_backup_history_type;
DROP INDEX IF EXISTS idx_backup_history_tenant;
DROP INDEX IF EXISTS idx_backup_history_status;
DROP INDEX IF EXISTS idx_backup_history_created;
DROP INDEX IF EXISTS idx_backup_history_expires;
DROP INDEX IF EXISTS idx_marketing_campaigns_type;
DROP INDEX IF EXISTS idx_marketing_campaigns_status;
DROP INDEX IF EXISTS idx_marketing_campaigns_scheduled;
DROP INDEX IF EXISTS idx_platform_metrics_date;
DROP INDEX IF EXISTS idx_admin_audit_action;
DROP INDEX IF EXISTS idx_admin_audit_resource;
DROP INDEX IF EXISTS idx_admin_audit_admin;
DROP INDEX IF EXISTS idx_admin_audit_created;
DROP INDEX IF EXISTS idx_platform_payment_gateways_enabled;

-- =====================================================
-- SUPER ADMIN USERS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS super_admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  email VARCHAR(255) NOT NULL UNIQUE,
  display_name VARCHAR(100) NOT NULL,
  avatar_url TEXT,
  role VARCHAR(50) NOT NULL DEFAULT 'admin',
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
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  last_login_at TIMESTAMPTZ,
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
-- =====================================================
CREATE TABLE IF NOT EXISTS subscription_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(50) NOT NULL UNIQUE,
  description TEXT,
  price_monthly DECIMAL(10, 2) NOT NULL DEFAULT 0,
  price_yearly DECIMAL(10, 2) NOT NULL DEFAULT 0,
  currency VARCHAR(3) NOT NULL DEFAULT 'ZAR',
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
  features JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_active BOOLEAN DEFAULT TRUE,
  is_public BOOLEAN DEFAULT TRUE,
  display_order INTEGER DEFAULT 0,
  trial_days INTEGER DEFAULT 14,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_subscription_plans_slug ON subscription_plans(slug);
CREATE INDEX idx_subscription_plans_active ON subscription_plans(is_active, is_public);

-- =====================================================
-- TENANT SUBSCRIPTIONS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS tenant_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES subscription_plans(id),
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  billing_cycle VARCHAR(20) NOT NULL DEFAULT 'monthly',
  current_period_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  current_period_end TIMESTAMPTZ NOT NULL,
  trial_start TIMESTAMPTZ,
  trial_end TIMESTAMPTZ,
  payment_provider VARCHAR(50),
  payment_provider_subscription_id TEXT,
  payment_provider_customer_id TEXT,
  usage_snapshot JSONB DEFAULT '{}'::jsonb,
  usage_updated_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  cancellation_reason TEXT,
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT tenant_subscriptions_valid_status CHECK (status IN ('trial', 'active', 'past_due', 'cancelled', 'expired')),
  CONSTRAINT tenant_subscriptions_valid_cycle CHECK (billing_cycle IN ('monthly', 'yearly'))
);

CREATE UNIQUE INDEX idx_tenant_subscriptions_tenant ON tenant_subscriptions(tenant_id) WHERE status IN ('trial', 'active', 'past_due');
CREATE INDEX idx_tenant_subscriptions_status ON tenant_subscriptions(status);
CREATE INDEX idx_tenant_subscriptions_plan ON tenant_subscriptions(plan_id);
CREATE INDEX idx_tenant_subscriptions_period_end ON tenant_subscriptions(current_period_end);

-- =====================================================
-- PLATFORM SETTINGS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS platform_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key VARCHAR(100) NOT NULL UNIQUE,
  value JSONB NOT NULL,
  category VARCHAR(50) NOT NULL DEFAULT 'general',
  description TEXT,
  is_secret BOOLEAN DEFAULT FALSE,
  updated_by UUID REFERENCES super_admins(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_platform_settings_category ON platform_settings(category);

-- =====================================================
-- ERROR LOGS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS error_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  error_code VARCHAR(50),
  error_type VARCHAR(100) NOT NULL,
  severity VARCHAR(20) NOT NULL DEFAULT 'error',
  tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL,
  user_id UUID,
  request_id TEXT,
  endpoint TEXT,
  http_method VARCHAR(10),
  message TEXT NOT NULL,
  stack_trace TEXT,
  metadata JSONB DEFAULT '{}',
  environment VARCHAR(20) NOT NULL DEFAULT 'production',
  server_instance TEXT,
  status VARCHAR(20) DEFAULT 'new',
  resolved_by UUID REFERENCES super_admins(id),
  resolved_at TIMESTAMPTZ,
  resolution_notes TEXT,
  sentry_event_id TEXT,
  sentry_issue_id TEXT,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_error_logs_tenant ON error_logs(tenant_id);
CREATE INDEX idx_error_logs_type ON error_logs(error_type);
CREATE INDEX idx_error_logs_severity ON error_logs(severity);
CREATE INDEX idx_error_logs_status ON error_logs(status);
CREATE INDEX idx_error_logs_occurred ON error_logs(occurred_at DESC);
CREATE INDEX idx_error_logs_sentry ON error_logs(sentry_event_id) WHERE sentry_event_id IS NOT NULL;
CREATE INDEX idx_error_logs_unresolved ON error_logs(occurred_at DESC) WHERE status IN ('new', 'acknowledged');

-- =====================================================
-- BACKUP HISTORY TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS backup_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  backup_type VARCHAR(50) NOT NULL,
  backup_name TEXT NOT NULL,
  tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL,
  storage_provider VARCHAR(50) NOT NULL,
  storage_path TEXT NOT NULL,
  storage_bucket TEXT,
  size_bytes BIGINT,
  checksum TEXT,
  encryption_method VARCHAR(50),
  compression VARCHAR(20),
  status VARCHAR(20) NOT NULL DEFAULT 'in_progress',
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  error_message TEXT,
  expires_at TIMESTAMPTZ,
  initiated_by UUID REFERENCES super_admins(id),
  initiated_source VARCHAR(50) DEFAULT 'manual',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_backup_history_type ON backup_history(backup_type);
CREATE INDEX idx_backup_history_tenant ON backup_history(tenant_id);
CREATE INDEX idx_backup_history_status ON backup_history(status);
CREATE INDEX idx_backup_history_created ON backup_history(created_at DESC);
CREATE INDEX idx_backup_history_expires ON backup_history(expires_at) WHERE expires_at IS NOT NULL;

-- =====================================================
-- MARKETING CAMPAIGNS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS marketing_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) UNIQUE,
  campaign_type VARCHAR(50) NOT NULL,
  subject TEXT NOT NULL,
  body_html TEXT,
  body_text TEXT,
  body_json JSONB,
  target_audience JSONB NOT NULL DEFAULT '{
    "all_tenants": true,
    "plan_slugs": [],
    "tenant_ids": [],
    "regions": [],
    "exclude_tenant_ids": []
  }'::jsonb,
  channels JSONB NOT NULL DEFAULT '{
    "email": true,
    "in_app_notification": true,
    "dashboard_banner": false,
    "push_notification": false
  }'::jsonb,
  status VARCHAR(20) NOT NULL DEFAULT 'draft',
  scheduled_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  stats JSONB DEFAULT '{
    "total_recipients": 0,
    "emails_sent": 0,
    "emails_opened": 0,
    "emails_clicked": 0,
    "notifications_sent": 0,
    "notifications_read": 0
  }'::jsonb,
  created_by UUID REFERENCES super_admins(id),
  updated_by UUID REFERENCES super_admins(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_marketing_campaigns_type ON marketing_campaigns(campaign_type);
CREATE INDEX idx_marketing_campaigns_status ON marketing_campaigns(status);
CREATE INDEX idx_marketing_campaigns_scheduled ON marketing_campaigns(scheduled_at) WHERE status = 'scheduled';

-- =====================================================
-- PLATFORM METRICS DAILY TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS platform_metrics_daily (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_date DATE NOT NULL UNIQUE,
  total_tenants INTEGER DEFAULT 0,
  active_tenants INTEGER DEFAULT 0,
  new_tenants INTEGER DEFAULT 0,
  churned_tenants INTEGER DEFAULT 0,
  total_users INTEGER DEFAULT 0,
  active_users INTEGER DEFAULT 0,
  new_users INTEGER DEFAULT 0,
  total_bookings INTEGER DEFAULT 0,
  total_revenue DECIMAL(14, 2) DEFAULT 0,
  avg_booking_value DECIMAL(10, 2) DEFAULT 0,
  api_requests INTEGER DEFAULT 0,
  error_count INTEGER DEFAULT 0,
  avg_response_time_ms INTEGER DEFAULT 0,
  total_storage_used_mb BIGINT DEFAULT 0,
  plan_distribution JSONB DEFAULT '{}',
  tenant_countries JSONB DEFAULT '{}',
  calculated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_platform_metrics_date ON platform_metrics_daily(metric_date DESC);

-- =====================================================
-- ADMIN AUDIT LOGS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS admin_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID REFERENCES super_admins(id),
  admin_email VARCHAR(255),
  action VARCHAR(100) NOT NULL,
  resource_type VARCHAR(50) NOT NULL,
  resource_id UUID,
  description TEXT,
  changes JSONB,
  metadata JSONB DEFAULT '{}',
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_admin_audit_action ON admin_audit_logs(action);
CREATE INDEX idx_admin_audit_resource ON admin_audit_logs(resource_type, resource_id);
CREATE INDEX idx_admin_audit_admin ON admin_audit_logs(admin_id);
CREATE INDEX idx_admin_audit_created ON admin_audit_logs(created_at DESC);

-- =====================================================
-- PLATFORM PAYMENT GATEWAYS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS platform_payment_gateways (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gateway_name VARCHAR(50) NOT NULL UNIQUE,
  display_name VARCHAR(100) NOT NULL,
  description TEXT,
  is_enabled BOOLEAN DEFAULT FALSE,
  is_test_mode BOOLEAN DEFAULT TRUE,
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  test_config JSONB DEFAULT '{}'::jsonb,
  supported_currencies JSONB DEFAULT '["ZAR", "USD"]'::jsonb,
  supported_countries JSONB DEFAULT '["ZA"]'::jsonb,
  last_health_check TIMESTAMPTZ,
  health_status VARCHAR(20) DEFAULT 'unknown',
  updated_by UUID REFERENCES super_admins(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_platform_payment_gateways_enabled ON platform_payment_gateways(is_enabled);

-- =====================================================
-- RLS POLICIES (drop existing first)
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

-- Drop existing policies
DROP POLICY IF EXISTS "Service role access to super_admins" ON super_admins;
DROP POLICY IF EXISTS "Service role access to subscription_plans" ON subscription_plans;
DROP POLICY IF EXISTS "Service role access to tenant_subscriptions" ON tenant_subscriptions;
DROP POLICY IF EXISTS "Service role access to platform_settings" ON platform_settings;
DROP POLICY IF EXISTS "Service role access to error_logs" ON error_logs;
DROP POLICY IF EXISTS "Service role access to backup_history" ON backup_history;
DROP POLICY IF EXISTS "Service role access to marketing_campaigns" ON marketing_campaigns;
DROP POLICY IF EXISTS "Service role access to platform_metrics_daily" ON platform_metrics_daily;
DROP POLICY IF EXISTS "Service role access to admin_audit_logs" ON admin_audit_logs;
DROP POLICY IF EXISTS "Service role access to platform_payment_gateways" ON platform_payment_gateways;
DROP POLICY IF EXISTS "Public read access to active subscription plans" ON subscription_plans;

-- Create policies
CREATE POLICY "Service role access to super_admins" ON super_admins FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role access to subscription_plans" ON subscription_plans FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role access to tenant_subscriptions" ON tenant_subscriptions FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role access to platform_settings" ON platform_settings FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role access to error_logs" ON error_logs FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role access to backup_history" ON backup_history FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role access to marketing_campaigns" ON marketing_campaigns FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role access to platform_metrics_daily" ON platform_metrics_daily FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role access to admin_audit_logs" ON admin_audit_logs FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role access to platform_payment_gateways" ON platform_payment_gateways FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Public read access to active subscription plans" ON subscription_plans FOR SELECT USING (is_active = TRUE AND is_public = TRUE);

-- =====================================================
-- SEED DEFAULT DATA (use ON CONFLICT to avoid duplicates)
-- =====================================================
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
   TRUE, 4)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO platform_payment_gateways (gateway_name, display_name, description, is_enabled, is_test_mode, config, supported_currencies, supported_countries) VALUES
  ('paystack', 'Paystack', 'Accept card payments in Africa', FALSE, TRUE, '{}', '["ZAR", "NGN", "GHS", "KES"]', '["ZA", "NG", "GH", "KE"]'),
  ('paypal', 'PayPal', 'Accept international payments via PayPal', FALSE, TRUE, '{}', '["USD", "EUR", "GBP", "ZAR"]', '["US", "GB", "ZA", "DE", "FR"]'),
  ('eft', 'EFT Bank Transfer', 'Accept manual bank transfers', FALSE, FALSE, '{}', '["ZAR"]', '["ZA"]')
ON CONFLICT (gateway_name) DO NOTHING;

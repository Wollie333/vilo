-- Migration 040: Subscription Automation
-- Adds subscription events, grace periods, and automation settings

-- Subscription events log (for all automated and manual actions)
CREATE TABLE IF NOT EXISTS subscription_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID NOT NULL REFERENCES tenant_subscriptions(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  event_type VARCHAR(50) NOT NULL,
  -- 'trial_started', 'trial_ending_soon', 'trial_expired',
  -- 'payment_succeeded', 'payment_failed', 'payment_retry',
  -- 'grace_period_started', 'grace_period_ended',
  -- 'subscription_renewed', 'subscription_cancelled', 'subscription_expired',
  -- 'plan_upgraded', 'plan_downgraded',
  -- 'limit_reached', 'limit_warning',
  -- 'manually_extended', 'manually_modified'

  -- Event details
  details JSONB DEFAULT '{}'::jsonb,
  previous_status VARCHAR(50),
  new_status VARCHAR(50),

  -- Notifications
  notification_sent BOOLEAN DEFAULT FALSE,
  notification_sent_at TIMESTAMPTZ,
  notification_type VARCHAR(50), -- 'email', 'in_app', 'both'

  -- Automation
  is_automated BOOLEAN DEFAULT TRUE,
  triggered_by UUID REFERENCES super_admins(id), -- NULL if automated

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for subscription_events
CREATE INDEX idx_subscription_events_subscription ON subscription_events(subscription_id);
CREATE INDEX idx_subscription_events_tenant ON subscription_events(tenant_id);
CREATE INDEX idx_subscription_events_type ON subscription_events(event_type);
CREATE INDEX idx_subscription_events_created ON subscription_events(created_at);
CREATE INDEX idx_subscription_events_notification ON subscription_events(notification_sent)
  WHERE notification_sent = FALSE;

-- Grace periods for failed payments
CREATE TABLE IF NOT EXISTS payment_grace_periods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID NOT NULL REFERENCES tenant_subscriptions(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- Grace period timing
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ends_at TIMESTAMPTZ NOT NULL,

  -- Original failure
  original_failure_reason TEXT,
  original_failure_at TIMESTAMPTZ DEFAULT NOW(),

  -- Retry tracking
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  last_retry_at TIMESTAMPTZ,
  next_retry_at TIMESTAMPTZ,
  retry_history JSONB DEFAULT '[]'::jsonb,

  -- Resolution
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  -- 'active', 'resolved_paid', 'resolved_cancelled', 'expired'
  resolved_at TIMESTAMPTZ,
  resolution_method VARCHAR(50), -- 'auto_payment', 'manual_payment', 'admin_override', 'expired'

  -- Notifications sent
  notifications_sent JSONB DEFAULT '[]'::jsonb,
  -- [{type: 'email', sent_at: '...', template: 'payment_failed_1'}, ...]

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for payment_grace_periods
CREATE INDEX idx_payment_grace_periods_subscription ON payment_grace_periods(subscription_id);
CREATE INDEX idx_payment_grace_periods_tenant ON payment_grace_periods(tenant_id);
CREATE INDEX idx_payment_grace_periods_status ON payment_grace_periods(status);
CREATE INDEX idx_payment_grace_periods_ends ON payment_grace_periods(ends_at)
  WHERE status = 'active';
CREATE INDEX idx_payment_grace_periods_next_retry ON payment_grace_periods(next_retry_at)
  WHERE status = 'active' AND next_retry_at IS NOT NULL;

-- Usage limits tracking
CREATE TABLE IF NOT EXISTS usage_limit_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES tenant_subscriptions(id) ON DELETE SET NULL,

  -- Limit details
  limit_type VARCHAR(50) NOT NULL,
  -- 'rooms', 'team_members', 'bookings_monthly', 'storage', 'api_requests'

  current_usage INTEGER NOT NULL,
  limit_value INTEGER NOT NULL,
  usage_percent DECIMAL(5, 2) NOT NULL,

  -- Threshold crossed
  threshold_type VARCHAR(20) NOT NULL, -- 'warning' (80%), 'limit' (100%), 'exceeded'

  -- Action taken
  action_taken VARCHAR(50),
  -- 'notification_sent', 'feature_disabled', 'upgrade_suggested', 'none'

  notification_sent BOOLEAN DEFAULT FALSE,
  notification_sent_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for usage_limit_events
CREATE INDEX idx_usage_limit_events_tenant ON usage_limit_events(tenant_id);
CREATE INDEX idx_usage_limit_events_type ON usage_limit_events(limit_type);
CREATE INDEX idx_usage_limit_events_threshold ON usage_limit_events(threshold_type);
CREATE INDEX idx_usage_limit_events_created ON usage_limit_events(created_at);

-- Automation run log (track when automation jobs ran)
CREATE TABLE IF NOT EXISTS automation_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  job_name VARCHAR(100) NOT NULL,
  -- 'process_expiring_trials', 'process_grace_periods', 'retry_payments',
  -- 'process_renewals', 'cleanup_expired', 'check_usage_limits'

  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,

  -- Results
  status VARCHAR(20) NOT NULL DEFAULT 'running',
  -- 'running', 'completed', 'failed', 'partial'

  items_processed INTEGER DEFAULT 0,
  items_succeeded INTEGER DEFAULT 0,
  items_failed INTEGER DEFAULT 0,

  results JSONB DEFAULT '{}'::jsonb,
  error_message TEXT,

  -- Trigger
  triggered_by VARCHAR(50) DEFAULT 'scheduled', -- 'scheduled', 'manual', 'webhook'
  triggered_by_admin UUID REFERENCES super_admins(id)
);

-- Indexes for automation_runs
CREATE INDEX idx_automation_runs_job ON automation_runs(job_name);
CREATE INDEX idx_automation_runs_status ON automation_runs(status);
CREATE INDEX idx_automation_runs_started ON automation_runs(started_at);

-- Enable RLS on new tables
ALTER TABLE subscription_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_grace_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_limit_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_runs ENABLE ROW LEVEL SECURITY;

-- RLS Policies - service role only for all
CREATE POLICY "Service role access only for subscription_events"
  ON subscription_events FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role access only for payment_grace_periods"
  ON payment_grace_periods FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role access only for usage_limit_events"
  ON usage_limit_events FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role access only for automation_runs"
  ON automation_runs FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Add automation settings
INSERT INTO platform_settings (key, value, category, description, is_secret) VALUES
  ('grace_period_days', '7', 'billing', 'Days of grace period for failed payments', false),
  ('payment_retry_intervals', '[1, 3, 7]', 'billing', 'Days after failure to retry payment (JSON array)', false),
  ('trial_ending_notice_days', '3', 'billing', 'Days before trial end to send notification', false),
  ('limit_warning_threshold', '0.8', 'billing', 'Usage percentage to trigger limit warning (0.8 = 80%)', false),
  ('auto_cancel_after_grace', 'true', 'billing', 'Automatically cancel subscription after grace period expires', false),
  ('downgrade_to_free_on_cancel', 'true', 'billing', 'Downgrade to free plan on cancellation instead of suspend', false),
  ('renewal_reminder_days', '7', 'billing', 'Days before renewal to send reminder', false)
ON CONFLICT (key) DO NOTHING;

-- Function to get tenant's current usage
CREATE OR REPLACE FUNCTION get_tenant_usage(tenant_uuid UUID)
RETURNS TABLE (
  limit_type VARCHAR,
  current_usage BIGINT,
  plan_limit INTEGER,
  usage_percent DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  WITH tenant_plan AS (
    SELECT
      sp.limits
    FROM tenant_subscriptions ts
    JOIN subscription_plans sp ON sp.id = ts.plan_id
    WHERE ts.tenant_id = tenant_uuid
    AND ts.status IN ('active', 'trial')
    ORDER BY ts.created_at DESC
    LIMIT 1
  )
  SELECT
    'rooms'::VARCHAR AS limit_type,
    (SELECT COUNT(*) FROM rooms WHERE tenant_id = tenant_uuid)::BIGINT AS current_usage,
    COALESCE((SELECT (limits->>'max_rooms')::INTEGER FROM tenant_plan), 999999) AS plan_limit,
    ROUND(
      (SELECT COUNT(*) FROM rooms WHERE tenant_id = tenant_uuid)::DECIMAL /
      NULLIF(COALESCE((SELECT (limits->>'max_rooms')::INTEGER FROM tenant_plan), 999999), 0) * 100,
      2
    ) AS usage_percent
  UNION ALL
  SELECT
    'team_members'::VARCHAR,
    (SELECT COUNT(*) FROM tenant_members WHERE tenant_id = tenant_uuid AND status = 'active')::BIGINT,
    COALESCE((SELECT (limits->>'max_team_members')::INTEGER FROM tenant_plan), 999999),
    ROUND(
      (SELECT COUNT(*) FROM tenant_members WHERE tenant_id = tenant_uuid AND status = 'active')::DECIMAL /
      NULLIF(COALESCE((SELECT (limits->>'max_team_members')::INTEGER FROM tenant_plan), 999999), 0) * 100,
      2
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if tenant is within limits
CREATE OR REPLACE FUNCTION check_tenant_limit(
  tenant_uuid UUID,
  limit_type_param VARCHAR
)
RETURNS TABLE (
  is_within_limit BOOLEAN,
  current_usage BIGINT,
  plan_limit INTEGER,
  remaining INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    u.current_usage < u.plan_limit AS is_within_limit,
    u.current_usage,
    u.plan_limit,
    GREATEST(0, u.plan_limit - u.current_usage::INTEGER) AS remaining
  FROM get_tenant_usage(tenant_uuid) u
  WHERE u.limit_type = limit_type_param;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a system admin for automated actions if not exists
INSERT INTO super_admins (id, user_id, email, display_name, role, permissions, status)
VALUES (
  '00000000-0000-0000-0000-000000000000',
  '00000000-0000-0000-0000-000000000000',
  'system@vilo.app',
  'System Automation',
  'admin',
  '{"analytics": true, "tenants": true, "users": true, "plans": true, "integrations": true, "marketing": true, "teams": true, "errors": true, "backups": true, "settings": true}'::jsonb,
  'active'
)
ON CONFLICT (id) DO NOTHING;

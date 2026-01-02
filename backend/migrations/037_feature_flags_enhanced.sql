-- Migration 037: Enhanced Feature Flags System
-- Adds tenant overrides, change history, and scheduled flag changes

-- Feature flag overrides per tenant (for beta/early access)
CREATE TABLE IF NOT EXISTS tenant_feature_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  flag_key VARCHAR(100) NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT true,
  expires_at TIMESTAMPTZ,
  reason TEXT,
  created_by UUID REFERENCES super_admins(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, flag_key)
);

-- Indexes for tenant_feature_overrides
CREATE INDEX idx_tenant_feature_overrides_tenant ON tenant_feature_overrides(tenant_id);
CREATE INDEX idx_tenant_feature_overrides_flag ON tenant_feature_overrides(flag_key);
CREATE INDEX idx_tenant_feature_overrides_expires ON tenant_feature_overrides(expires_at) WHERE expires_at IS NOT NULL;

-- Feature flag audit log (track all flag changes)
CREATE TABLE IF NOT EXISTS feature_flag_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  flag_key VARCHAR(100) NOT NULL,
  action VARCHAR(50) NOT NULL, -- 'created', 'updated', 'enabled', 'disabled', 'deleted'
  old_value JSONB,
  new_value JSONB,
  changed_by UUID REFERENCES super_admins(id),
  change_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for feature_flag_history
CREATE INDEX idx_feature_flag_history_flag ON feature_flag_history(flag_key);
CREATE INDEX idx_feature_flag_history_action ON feature_flag_history(action);
CREATE INDEX idx_feature_flag_history_changed_by ON feature_flag_history(changed_by);
CREATE INDEX idx_feature_flag_history_created ON feature_flag_history(created_at);

-- Scheduled flag changes
CREATE TABLE IF NOT EXISTS feature_flag_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  flag_key VARCHAR(100) NOT NULL,
  action VARCHAR(20) NOT NULL, -- 'enable', 'disable', 'rollout', 'update'
  scheduled_at TIMESTAMPTZ NOT NULL,
  target_value JSONB, -- For rollout: new percentage or tenant list, or new config
  executed_at TIMESTAMPTZ,
  execution_status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'executed', 'failed', 'cancelled'
  execution_error TEXT,
  created_by UUID REFERENCES super_admins(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for feature_flag_schedules
CREATE INDEX idx_feature_flag_schedules_flag ON feature_flag_schedules(flag_key);
CREATE INDEX idx_feature_flag_schedules_status ON feature_flag_schedules(execution_status);
CREATE INDEX idx_feature_flag_schedules_scheduled ON feature_flag_schedules(scheduled_at)
  WHERE execution_status = 'pending';

-- Enable RLS on new tables
ALTER TABLE tenant_feature_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE feature_flag_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE feature_flag_schedules ENABLE ROW LEVEL SECURITY;

-- RLS Policies - service role only
CREATE POLICY "Service role access only for tenant_feature_overrides"
  ON tenant_feature_overrides FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role access only for feature_flag_history"
  ON feature_flag_history FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role access only for feature_flag_schedules"
  ON feature_flag_schedules FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Seed some common feature flags
INSERT INTO platform_settings (key, value, category, description, is_secret) VALUES
  ('feature_flag_advanced_analytics', '{"enabled": false, "targeting": "all", "description": "Advanced analytics dashboard"}', 'feature_flags', 'Enable advanced analytics features', false),
  ('feature_flag_ai_pricing', '{"enabled": false, "targeting": "plans", "plans": ["professional", "enterprise"], "description": "AI-powered pricing suggestions"}', 'feature_flags', 'Enable AI pricing suggestions', false),
  ('feature_flag_white_label', '{"enabled": false, "targeting": "plans", "plans": ["enterprise"], "description": "White-label customization"}', 'feature_flags', 'Enable white-label features', false),
  ('feature_flag_api_access', '{"enabled": false, "targeting": "plans", "plans": ["professional", "enterprise"], "description": "External API access"}', 'feature_flags', 'Enable API access', false),
  ('feature_flag_custom_domain', '{"enabled": false, "targeting": "plans", "plans": ["enterprise"], "description": "Custom domain support"}', 'feature_flags', 'Enable custom domain', false)
ON CONFLICT (key) DO NOTHING;

-- Function to clean up expired overrides
CREATE OR REPLACE FUNCTION cleanup_expired_feature_overrides()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM tenant_feature_overrides
  WHERE expires_at IS NOT NULL AND expires_at < NOW();

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to execute scheduled flag changes
CREATE OR REPLACE FUNCTION execute_scheduled_flag_changes()
RETURNS INTEGER AS $$
DECLARE
  schedule_record RECORD;
  executed_count INTEGER := 0;
BEGIN
  FOR schedule_record IN
    SELECT * FROM feature_flag_schedules
    WHERE execution_status = 'pending'
    AND scheduled_at <= NOW()
    ORDER BY scheduled_at ASC
  LOOP
    BEGIN
      -- Update the platform setting based on action
      IF schedule_record.action = 'enable' THEN
        UPDATE platform_settings
        SET value = jsonb_set(value::jsonb, '{enabled}', 'true')
        WHERE key = schedule_record.flag_key;
      ELSIF schedule_record.action = 'disable' THEN
        UPDATE platform_settings
        SET value = jsonb_set(value::jsonb, '{enabled}', 'false')
        WHERE key = schedule_record.flag_key;
      ELSIF schedule_record.action IN ('rollout', 'update') AND schedule_record.target_value IS NOT NULL THEN
        UPDATE platform_settings
        SET value = schedule_record.target_value
        WHERE key = schedule_record.flag_key;
      END IF;

      -- Mark as executed
      UPDATE feature_flag_schedules
      SET execution_status = 'executed', executed_at = NOW()
      WHERE id = schedule_record.id;

      executed_count := executed_count + 1;
    EXCEPTION WHEN OTHERS THEN
      -- Mark as failed
      UPDATE feature_flag_schedules
      SET execution_status = 'failed', execution_error = SQLERRM
      WHERE id = schedule_record.id;
    END;
  END LOOP;

  RETURN executed_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

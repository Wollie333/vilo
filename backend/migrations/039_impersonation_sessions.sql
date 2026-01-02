-- Migration 039: Secure Impersonation Sessions
-- Adds time-limited, auditable impersonation sessions for support

-- Impersonation sessions (time-limited, auditable)
CREATE TABLE IF NOT EXISTS impersonation_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Who is impersonating
  admin_id UUID NOT NULL REFERENCES super_admins(id),

  -- Who is being impersonated
  target_user_id UUID NOT NULL,
  target_member_id UUID REFERENCES tenant_members(id),
  target_tenant_id UUID NOT NULL REFERENCES tenants(id),

  -- Session details
  token_hash VARCHAR(64) NOT NULL UNIQUE, -- SHA256 of actual token
  reason TEXT NOT NULL, -- Required reason for impersonation

  -- Time limits
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  ended_at TIMESTAMPTZ, -- When admin manually ended or it expired
  end_reason VARCHAR(50), -- 'manual', 'expired', 'logout'

  -- Activity during impersonation
  actions_taken JSONB DEFAULT '[]'::jsonb,
  pages_visited JSONB DEFAULT '[]'::jsonb,
  action_count INTEGER DEFAULT 0,

  -- Request context
  ip_address INET,
  user_agent TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for impersonation_sessions
CREATE INDEX idx_impersonation_sessions_admin ON impersonation_sessions(admin_id);
CREATE INDEX idx_impersonation_sessions_target_user ON impersonation_sessions(target_user_id);
CREATE INDEX idx_impersonation_sessions_target_member ON impersonation_sessions(target_member_id);
CREATE INDEX idx_impersonation_sessions_target_tenant ON impersonation_sessions(target_tenant_id);
CREATE INDEX idx_impersonation_sessions_token ON impersonation_sessions(token_hash);
CREATE INDEX idx_impersonation_sessions_active ON impersonation_sessions(expires_at)
  WHERE ended_at IS NULL;
CREATE INDEX idx_impersonation_sessions_started ON impersonation_sessions(started_at);

-- Impersonation action log (detailed actions during impersonation)
CREATE TABLE IF NOT EXISTS impersonation_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES impersonation_sessions(id) ON DELETE CASCADE,

  -- Action details
  action_type VARCHAR(100) NOT NULL,
  -- 'page_view', 'booking_view', 'booking_create', 'booking_update',
  -- 'customer_view', 'settings_view', 'settings_update', etc.

  resource_type VARCHAR(50),
  resource_id VARCHAR(255),
  action_data JSONB,

  -- Request info
  endpoint VARCHAR(500),
  http_method VARCHAR(10),

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for impersonation_actions
CREATE INDEX idx_impersonation_actions_session ON impersonation_actions(session_id);
CREATE INDEX idx_impersonation_actions_type ON impersonation_actions(action_type);
CREATE INDEX idx_impersonation_actions_created ON impersonation_actions(created_at);

-- Support actions log (quick actions performed by support)
CREATE TABLE IF NOT EXISTS support_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL REFERENCES super_admins(id),

  -- Target
  target_type VARCHAR(50) NOT NULL, -- 'user', 'tenant', 'subscription'
  target_id UUID NOT NULL,

  -- Action
  action_type VARCHAR(100) NOT NULL,
  -- 'password_reset', 'unlock_account', 'extend_trial', 'add_grace_period',
  -- 'apply_credit', 'verify_email', 'resend_invitation', etc.

  action_data JSONB,
  result VARCHAR(50), -- 'success', 'failed', 'pending'
  result_message TEXT,

  -- Context
  reason TEXT,
  ip_address INET,
  user_agent TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for support_actions
CREATE INDEX idx_support_actions_admin ON support_actions(admin_id);
CREATE INDEX idx_support_actions_target ON support_actions(target_type, target_id);
CREATE INDEX idx_support_actions_action ON support_actions(action_type);
CREATE INDEX idx_support_actions_created ON support_actions(created_at);

-- Enable RLS on new tables
ALTER TABLE impersonation_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE impersonation_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_actions ENABLE ROW LEVEL SECURITY;

-- RLS Policies - service role only
CREATE POLICY "Service role access only for impersonation_sessions"
  ON impersonation_sessions FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role access only for impersonation_actions"
  ON impersonation_actions FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role access only for support_actions"
  ON support_actions FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Function to validate and use impersonation token
CREATE OR REPLACE FUNCTION validate_impersonation_token(token_hash_param VARCHAR)
RETURNS TABLE (
  is_valid BOOLEAN,
  session_id UUID,
  admin_id UUID,
  target_user_id UUID,
  target_tenant_id UUID,
  remaining_minutes INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    (s.ended_at IS NULL AND s.expires_at > NOW()) AS is_valid,
    s.id AS session_id,
    s.admin_id,
    s.target_user_id,
    s.target_tenant_id,
    GREATEST(0, EXTRACT(EPOCH FROM (s.expires_at - NOW())) / 60)::INTEGER AS remaining_minutes
  FROM impersonation_sessions s
  WHERE s.token_hash = token_hash_param;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to end impersonation session
CREATE OR REPLACE FUNCTION end_impersonation_session(
  session_id_param UUID,
  end_reason_param VARCHAR DEFAULT 'manual'
)
RETURNS BOOLEAN AS $$
DECLARE
  affected_rows INTEGER;
BEGIN
  UPDATE impersonation_sessions
  SET
    ended_at = NOW(),
    end_reason = end_reason_param
  WHERE id = session_id_param
  AND ended_at IS NULL;

  GET DIAGNOSTICS affected_rows = ROW_COUNT;
  RETURN affected_rows > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to clean up expired sessions
CREATE OR REPLACE FUNCTION cleanup_expired_impersonation_sessions()
RETURNS INTEGER AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  UPDATE impersonation_sessions
  SET
    ended_at = NOW(),
    end_reason = 'expired'
  WHERE ended_at IS NULL
  AND expires_at < NOW();

  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add settings for impersonation
INSERT INTO platform_settings (key, value, category, description, is_secret) VALUES
  ('impersonation_max_duration_minutes', '60', 'system', 'Maximum impersonation session duration in minutes', false),
  ('impersonation_default_duration_minutes', '30', 'system', 'Default impersonation session duration in minutes', false),
  ('impersonation_require_reason', 'true', 'system', 'Require reason for impersonation', false),
  ('impersonation_notify_user', 'false', 'system', 'Notify user when they are being impersonated', false)
ON CONFLICT (key) DO NOTHING;

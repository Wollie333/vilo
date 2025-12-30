-- Migration: Team Members and Invitations
-- This migration adds support for team collaboration with role-based permissions
--
-- Roles:
--   - owner: Full access, can manage team, billing, delete account (fixed to account creator)
--   - general_manager: Full operational access (bookings, rooms, reviews) but NO billing/team management
--   - accountant: View-only for most features, full access to billing/payment reports
--
-- Max 3 team members per account (+ 1 owner = 4 total users)

-- ============================================
-- TENANT MEMBERS TABLE
-- Links users to tenants with role-based permissions
-- ============================================

CREATE TABLE IF NOT EXISTS tenant_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,

  -- Role determines permissions
  role VARCHAR(20) NOT NULL DEFAULT 'general_manager',

  -- Membership lifecycle
  invited_by UUID, -- User ID who sent the invitation (NULL for owner)
  invited_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  joined_at TIMESTAMP WITH TIME ZONE, -- NULL until invitation accepted
  status VARCHAR(20) NOT NULL DEFAULT 'pending',

  -- Audit
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Constraints
  CONSTRAINT tenant_members_unique_user_tenant UNIQUE (tenant_id, user_id),
  CONSTRAINT tenant_members_valid_role CHECK (role IN ('owner', 'general_manager', 'accountant')),
  CONSTRAINT tenant_members_valid_status CHECK (status IN ('pending', 'active', 'suspended', 'removed'))
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_tenant_members_tenant_id ON tenant_members(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_members_user_id ON tenant_members(user_id);
CREATE INDEX IF NOT EXISTS idx_tenant_members_status ON tenant_members(status);
CREATE INDEX IF NOT EXISTS idx_tenant_members_role ON tenant_members(role);

-- Trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION update_tenant_members_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_tenant_members_updated_at ON tenant_members;
CREATE TRIGGER trigger_tenant_members_updated_at
  BEFORE UPDATE ON tenant_members
  FOR EACH ROW
  EXECUTE FUNCTION update_tenant_members_updated_at();

-- RLS Policies
ALTER TABLE tenant_members ENABLE ROW LEVEL SECURITY;

-- Users can view members of tenants they belong to
CREATE POLICY "Users can view their tenant members"
  ON tenant_members FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid() AND status = 'active'
    )
  );

-- Service role can do everything (for backend operations)
CREATE POLICY "Service role full access to tenant_members"
  ON tenant_members FOR ALL
  USING (auth.role() = 'service_role');

-- ============================================
-- MEMBER INVITATIONS TABLE
-- Tracks pending invitations to join a tenant workspace
-- ============================================

CREATE TABLE IF NOT EXISTS member_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- Invitation target
  email VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'general_manager',

  -- Invitation methods (token for email link, code for manual share)
  invitation_token UUID DEFAULT gen_random_uuid(),
  invitation_code VARCHAR(8) DEFAULT UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 8)),

  -- Invitation lifecycle
  invited_by UUID NOT NULL, -- User ID who sent the invitation
  invited_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '7 days'),
  status VARCHAR(20) NOT NULL DEFAULT 'pending',

  -- Email tracking
  email_sent BOOLEAN DEFAULT false,
  email_sent_at TIMESTAMP WITH TIME ZONE,

  -- Acceptance tracking
  accepted_at TIMESTAMP WITH TIME ZONE,
  accepted_by_user_id UUID, -- The user who accepted (may be new or existing)

  -- Audit
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Constraints
  CONSTRAINT member_invitations_valid_role CHECK (role IN ('general_manager', 'accountant')),
  CONSTRAINT member_invitations_valid_status CHECK (status IN ('pending', 'accepted', 'expired', 'cancelled'))
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_member_invitations_tenant_id ON member_invitations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_member_invitations_email ON member_invitations(LOWER(email));
CREATE INDEX IF NOT EXISTS idx_member_invitations_token ON member_invitations(invitation_token);
CREATE INDEX IF NOT EXISTS idx_member_invitations_code ON member_invitations(invitation_code);
CREATE INDEX IF NOT EXISTS idx_member_invitations_status ON member_invitations(status);
CREATE INDEX IF NOT EXISTS idx_member_invitations_expires ON member_invitations(expires_at) WHERE status = 'pending';

-- Trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION update_member_invitations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_member_invitations_updated_at ON member_invitations;
CREATE TRIGGER trigger_member_invitations_updated_at
  BEFORE UPDATE ON member_invitations
  FOR EACH ROW
  EXECUTE FUNCTION update_member_invitations_updated_at();

-- RLS Policies
ALTER TABLE member_invitations ENABLE ROW LEVEL SECURITY;

-- Owners can view and manage invitations for their tenant
CREATE POLICY "Owners can manage invitations"
  ON member_invitations FOR ALL
  USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_members
      WHERE user_id = auth.uid() AND role = 'owner' AND status = 'active'
    )
  );

-- Service role can do everything (for backend operations)
CREATE POLICY "Service role full access to member_invitations"
  ON member_invitations FOR ALL
  USING (auth.role() = 'service_role');

-- ============================================
-- UPDATE TENANTS TABLE
-- Add max_team_members column for limit enforcement
-- ============================================

ALTER TABLE tenants ADD COLUMN IF NOT EXISTS max_team_members INTEGER DEFAULT 3;

COMMENT ON COLUMN tenants.max_team_members IS 'Maximum number of team members allowed (excludes owner). Default is 3.';

-- ============================================
-- SEED EXISTING TENANT OWNERS
-- Migrate existing owner_user_id to tenant_members table
-- ============================================

-- Insert owner records for all existing tenants
INSERT INTO tenant_members (tenant_id, user_id, role, status, joined_at, created_at)
SELECT
  id as tenant_id,
  owner_user_id as user_id,
  'owner' as role,
  'active' as status,
  created_at as joined_at,
  created_at
FROM tenants
WHERE owner_user_id IS NOT NULL
ON CONFLICT (tenant_id, user_id) DO NOTHING;

-- ============================================
-- HELPER FUNCTION: Check member limit
-- ============================================

CREATE OR REPLACE FUNCTION check_tenant_member_limit(p_tenant_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_current_count INTEGER;
  v_max_members INTEGER;
BEGIN
  -- Get current non-owner active member count
  SELECT COUNT(*) INTO v_current_count
  FROM tenant_members
  WHERE tenant_id = p_tenant_id
    AND role != 'owner'
    AND status = 'active';

  -- Get max allowed members
  SELECT COALESCE(max_team_members, 3) INTO v_max_members
  FROM tenants
  WHERE id = p_tenant_id;

  RETURN v_current_count < v_max_members;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- HELPER FUNCTION: Get user's role in tenant
-- ============================================

CREATE OR REPLACE FUNCTION get_user_tenant_role(p_user_id UUID, p_tenant_id UUID)
RETURNS VARCHAR AS $$
DECLARE
  v_role VARCHAR;
BEGIN
  SELECT role INTO v_role
  FROM tenant_members
  WHERE user_id = p_user_id
    AND tenant_id = p_tenant_id
    AND status = 'active';

  RETURN v_role;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE tenant_members IS 'Links users to tenants with role-based access control. Each user can belong to multiple tenants with different roles.';
COMMENT ON TABLE member_invitations IS 'Tracks pending invitations for users to join a tenant workspace. Supports email links and manual codes.';

COMMENT ON COLUMN tenant_members.role IS 'User role: owner (full access), general_manager (operational access), accountant (billing access)';
COMMENT ON COLUMN tenant_members.status IS 'Membership status: pending (invited), active, suspended, removed';
COMMENT ON COLUMN member_invitations.invitation_token IS 'UUID token for email invitation links';
COMMENT ON COLUMN member_invitations.invitation_code IS '8-character alphanumeric code for manual sharing';

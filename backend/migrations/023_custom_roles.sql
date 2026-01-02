-- Migration: Custom Roles and Permissions System
-- Replaces hardcoded roles with tenant-scoped custom roles

-- ============================================
-- ROLES TABLE
-- Stores custom roles per tenant
-- ============================================

CREATE TABLE IF NOT EXISTS roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- Role identification
  name VARCHAR(50) NOT NULL,
  slug VARCHAR(50) NOT NULL,
  description TEXT,

  -- System flags
  is_system_role BOOLEAN DEFAULT FALSE,  -- True for 'owner' role (cannot be deleted/modified)
  is_default BOOLEAN DEFAULT FALSE,      -- Default role for new members

  -- Permissions stored as JSONB
  -- Structure: { "resource_key": "permission_level" }
  -- Permission levels: "none", "view", "edit", "full"
  permissions JSONB NOT NULL DEFAULT '{}'::jsonb,

  -- Audit
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Constraints
  CONSTRAINT roles_unique_slug_per_tenant UNIQUE (tenant_id, slug),
  CONSTRAINT roles_name_not_empty CHECK (char_length(trim(name)) > 0)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_roles_tenant_id ON roles(tenant_id);
CREATE INDEX IF NOT EXISTS idx_roles_is_system ON roles(is_system_role);
CREATE INDEX IF NOT EXISTS idx_roles_slug ON roles(slug);

-- GIN index for JSONB permissions queries
CREATE INDEX IF NOT EXISTS idx_roles_permissions ON roles USING GIN (permissions);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_roles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_roles_updated_at ON roles;
CREATE TRIGGER trigger_roles_updated_at
  BEFORE UPDATE ON roles
  FOR EACH ROW
  EXECUTE FUNCTION update_roles_updated_at();

-- RLS Policies
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view roles in their tenant"
  ON roles FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid() AND status = 'active'
    ) OR
    tenant_id IN (
      SELECT id FROM tenants WHERE owner_user_id = auth.uid()
    )
  );

CREATE POLICY "Service role full access to roles"
  ON roles FOR ALL
  USING (auth.role() = 'service_role');

-- ============================================
-- MODIFY TENANT_MEMBERS TABLE
-- Add role_id column to reference roles table
-- ============================================

ALTER TABLE tenant_members ADD COLUMN IF NOT EXISTS role_id UUID REFERENCES roles(id);

-- Index for role_id lookups
CREATE INDEX IF NOT EXISTS idx_tenant_members_role_id ON tenant_members(role_id);

-- ============================================
-- MIGRATE EXISTING DATA
-- Create default roles for each existing tenant
-- ============================================

-- Create Owner role for each tenant (system role - cannot be deleted)
INSERT INTO roles (tenant_id, name, slug, is_system_role, permissions, created_at)
SELECT DISTINCT
  t.id as tenant_id,
  'Owner' as name,
  'owner' as slug,
  TRUE as is_system_role,
  '{
    "dashboard": "full",
    "bookings": "full",
    "rooms": "full",
    "calendar": "full",
    "reviews": "full",
    "reports": "full",
    "payments": "full",
    "settings.account": "full",
    "settings.business": "full",
    "settings.members": "full",
    "settings.billing": "full",
    "settings.roles": "full",
    "account.delete": "full",
    "seasonal_rates": "full",
    "addons": "full"
  }'::jsonb as permissions,
  NOW() as created_at
FROM tenants t
ON CONFLICT (tenant_id, slug) DO NOTHING;

-- Create General Manager role for each tenant (default role for new members)
INSERT INTO roles (tenant_id, name, slug, is_default, permissions, created_at)
SELECT DISTINCT
  t.id as tenant_id,
  'General Manager' as name,
  'general_manager' as slug,
  TRUE as is_default,
  '{
    "dashboard": "full",
    "bookings": "full",
    "rooms": "full",
    "calendar": "full",
    "reviews": "full",
    "reports": "view",
    "payments": "view",
    "settings.account": "edit",
    "settings.business": "full",
    "settings.members": "view",
    "settings.billing": "none",
    "settings.roles": "none",
    "account.delete": "none",
    "seasonal_rates": "full",
    "addons": "full"
  }'::jsonb as permissions,
  NOW() as created_at
FROM tenants t
ON CONFLICT (tenant_id, slug) DO NOTHING;

-- Create Accountant role for each tenant
INSERT INTO roles (tenant_id, name, slug, permissions, created_at)
SELECT DISTINCT
  t.id as tenant_id,
  'Accountant' as name,
  'accountant' as slug,
  '{
    "dashboard": "view",
    "bookings": "view",
    "rooms": "view",
    "calendar": "view",
    "reviews": "view",
    "reports": "full",
    "payments": "full",
    "settings.account": "edit",
    "settings.business": "view",
    "settings.members": "none",
    "settings.billing": "full",
    "settings.roles": "none",
    "account.delete": "none",
    "seasonal_rates": "view",
    "addons": "view"
  }'::jsonb as permissions,
  NOW() as created_at
FROM tenants t
ON CONFLICT (tenant_id, slug) DO NOTHING;

-- ============================================
-- UPDATE EXISTING TENANT_MEMBERS
-- Set role_id based on existing role column
-- ============================================

UPDATE tenant_members tm
SET role_id = r.id
FROM roles r
WHERE tm.tenant_id = r.tenant_id
  AND tm.role = r.slug
  AND tm.role_id IS NULL;

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Get default role ID for a tenant
CREATE OR REPLACE FUNCTION get_default_role_id(p_tenant_id UUID)
RETURNS UUID AS $$
DECLARE
  v_role_id UUID;
BEGIN
  SELECT id INTO v_role_id
  FROM roles
  WHERE tenant_id = p_tenant_id
    AND is_default = TRUE
  LIMIT 1;

  -- Fallback to General Manager if no default set
  IF v_role_id IS NULL THEN
    SELECT id INTO v_role_id
    FROM roles
    WHERE tenant_id = p_tenant_id
      AND slug = 'general_manager'
    LIMIT 1;
  END IF;

  RETURN v_role_id;
END;
$$ LANGUAGE plpgsql;

-- Get owner role ID for a tenant
CREATE OR REPLACE FUNCTION get_owner_role_id(p_tenant_id UUID)
RETURNS UUID AS $$
BEGIN
  RETURN (
    SELECT id FROM roles
    WHERE tenant_id = p_tenant_id
      AND is_system_role = TRUE
      AND slug = 'owner'
    LIMIT 1
  );
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE roles IS 'Tenant-scoped custom roles with configurable permissions';
COMMENT ON COLUMN roles.permissions IS 'JSONB object mapping resource keys to permission levels (none/view/edit/full)';
COMMENT ON COLUMN roles.is_system_role IS 'System roles (owner) cannot be deleted or have permissions modified';
COMMENT ON COLUMN roles.is_default IS 'Default role assigned to new team members';
COMMENT ON COLUMN tenant_members.role_id IS 'Reference to the roles table for dynamic role assignment';

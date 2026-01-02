-- Migration: Simplified Team Members
-- Transforms the invitation system to direct member creation
-- Members are created immediately, then set their password via email link

-- ============================================
-- ADD NEW COLUMNS TO TENANT_MEMBERS
-- ============================================

-- Allow user_id to be NULL (member exists before Supabase account is created)
ALTER TABLE tenant_members ALTER COLUMN user_id DROP NOT NULL;

-- Store email directly on tenant_members (before Supabase user exists)
ALTER TABLE tenant_members ADD COLUMN IF NOT EXISTS email VARCHAR(255);

-- Store member's display name
ALTER TABLE tenant_members ADD COLUMN IF NOT EXISTS member_name VARCHAR(255);

-- Password setup token (UUID for secure link)
ALTER TABLE tenant_members ADD COLUMN IF NOT EXISTS password_setup_token UUID;

-- Timestamp when password was set (NULL = pending password setup)
ALTER TABLE tenant_members ADD COLUMN IF NOT EXISTS password_set_at TIMESTAMP WITH TIME ZONE;

-- Track when notification email was sent
ALTER TABLE tenant_members ADD COLUMN IF NOT EXISTS email_notification_sent_at TIMESTAMP WITH TIME ZONE;

-- ============================================
-- UPDATE CONSTRAINTS
-- ============================================

-- Drop the old unique constraint (requires user_id to be NOT NULL in practice)
ALTER TABLE tenant_members DROP CONSTRAINT IF EXISTS tenant_members_unique_user_tenant;

-- Create new unique constraint that handles NULL user_id
-- When user_id is NULL, we use email as the unique identifier
CREATE UNIQUE INDEX IF NOT EXISTS idx_tenant_members_unique_user
  ON tenant_members(tenant_id, user_id)
  WHERE user_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_tenant_members_unique_email
  ON tenant_members(tenant_id, LOWER(email))
  WHERE user_id IS NULL AND email IS NOT NULL;

-- ============================================
-- ADD INDEXES FOR NEW COLUMNS
-- ============================================

-- Index for password setup token lookup (public endpoint)
CREATE INDEX IF NOT EXISTS idx_tenant_members_password_token
  ON tenant_members(password_setup_token)
  WHERE password_setup_token IS NOT NULL;

-- Index for email lookup
CREATE INDEX IF NOT EXISTS idx_tenant_members_email
  ON tenant_members(LOWER(email))
  WHERE email IS NOT NULL;

-- ============================================
-- CANCEL EXISTING PENDING INVITATIONS
-- Keep the table for backward compatibility but mark all pending as cancelled
-- ============================================

UPDATE member_invitations
SET status = 'cancelled', updated_at = NOW()
WHERE status = 'pending';

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON COLUMN tenant_members.email IS 'Email address for member. Required when user_id is NULL (pending password setup).';
COMMENT ON COLUMN tenant_members.member_name IS 'Display name for the member.';
COMMENT ON COLUMN tenant_members.password_setup_token IS 'UUID token for password setup link. NULL means password already set.';
COMMENT ON COLUMN tenant_members.password_set_at IS 'When member set their password. NULL means pending setup.';
COMMENT ON COLUMN tenant_members.email_notification_sent_at IS 'When the setup notification email was sent to the member.';

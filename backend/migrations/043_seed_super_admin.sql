-- =====================================================
-- SEED SUPER ADMIN USER
-- Creates the initial super admin account for platform management
-- =====================================================

-- Insert super admin user (the user must already exist in Supabase Auth)
INSERT INTO super_admins (user_id, email, display_name, role, permissions, status)
VALUES (
  'd6a6d496-8d8d-46a0-88f8-361fcb027785',
  'wollie333@gmail.com',
  'Wollie',
  'super_admin',
  '{
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
  'active'
)
ON CONFLICT (user_id) DO UPDATE SET
  email = EXCLUDED.email,
  display_name = EXCLUDED.display_name,
  role = EXCLUDED.role,
  permissions = EXCLUDED.permissions,
  status = EXCLUDED.status,
  updated_at = NOW();

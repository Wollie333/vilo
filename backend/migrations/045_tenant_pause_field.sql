-- Add pause functionality to tenants
-- This allows super admins to temporarily hide tenants from public discovery
-- while maintaining their full dashboard access

ALTER TABLE tenants ADD COLUMN IF NOT EXISTS is_paused BOOLEAN DEFAULT FALSE;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS paused_at TIMESTAMPTZ;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS pause_reason TEXT;

-- Create index for efficient filtering of paused tenants
CREATE INDEX IF NOT EXISTS idx_tenants_is_paused ON tenants(is_paused) WHERE is_paused = true;

COMMENT ON COLUMN tenants.is_paused IS 'When true, tenant is hidden from public discovery but retains dashboard access';
COMMENT ON COLUMN tenants.paused_at IS 'Timestamp when the tenant was paused';
COMMENT ON COLUMN tenants.pause_reason IS 'Reason provided by super admin for pausing the tenant';

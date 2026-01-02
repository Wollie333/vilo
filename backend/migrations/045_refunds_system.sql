-- Migration: 045_refunds_system.sql
-- Description: Complete refund management system with status workflow and audit trail

-- ============================================
-- MAIN REFUNDS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS refunds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,

  -- Amounts (all in the booking's currency)
  original_amount DECIMAL(10,2) NOT NULL,
  eligible_amount DECIMAL(10,2) NOT NULL,
  approved_amount DECIMAL(10,2),
  processed_amount DECIMAL(10,2),
  currency VARCHAR(3) DEFAULT 'ZAR',

  -- Policy snapshot at time of request (for audit/reference)
  policy_applied JSONB,
  days_before_checkin INTEGER,
  refund_percentage INTEGER,

  -- Status workflow: requested → under_review → approved/rejected → processing → completed/failed
  status VARCHAR(30) NOT NULL DEFAULT 'requested',

  -- Payment tracking
  payment_method VARCHAR(30),  -- paystack, eft, manual
  original_payment_reference VARCHAR(100),
  refund_reference VARCHAR(100),  -- Paystack refund ID or manual reference

  -- Notes and reasons
  rejection_reason TEXT,
  staff_notes TEXT,
  override_reason TEXT,  -- Required when approved_amount differs from eligible_amount

  -- Audit timestamps
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID,
  approved_at TIMESTAMPTZ,
  approved_by UUID,
  rejected_at TIMESTAMPTZ,
  rejected_by UUID,
  processed_at TIMESTAMPTZ,
  processed_by UUID,
  completed_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  failure_reason TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT refunds_valid_status CHECK (status IN (
    'requested', 'under_review', 'approved', 'rejected',
    'processing', 'completed', 'failed'
  )),
  CONSTRAINT refunds_valid_payment_method CHECK (
    payment_method IS NULL OR payment_method IN ('paystack', 'eft', 'manual', 'paypal')
  )
);

-- ============================================
-- REFUND STATUS HISTORY (Audit Trail)
-- ============================================
CREATE TABLE IF NOT EXISTS refund_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  refund_id UUID NOT NULL REFERENCES refunds(id) ON DELETE CASCADE,
  previous_status VARCHAR(30),
  new_status VARCHAR(30) NOT NULL,
  changed_by UUID,
  changed_by_name VARCHAR(255),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- UPDATE BOOKINGS TABLE
-- ============================================
-- Add refund tracking columns to bookings for quick access
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS refund_id UUID REFERENCES refunds(id) ON DELETE SET NULL;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS refund_status VARCHAR(30);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_refunds_tenant_id ON refunds(tenant_id);
CREATE INDEX IF NOT EXISTS idx_refunds_tenant_status ON refunds(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_refunds_booking_id ON refunds(booking_id);
CREATE INDEX IF NOT EXISTS idx_refunds_customer_id ON refunds(customer_id);
CREATE INDEX IF NOT EXISTS idx_refunds_status ON refunds(status);
CREATE INDEX IF NOT EXISTS idx_refunds_requested_at ON refunds(requested_at DESC);
CREATE INDEX IF NOT EXISTS idx_refunds_pending ON refunds(tenant_id, requested_at) WHERE status IN ('requested', 'under_review', 'approved');

CREATE INDEX IF NOT EXISTS idx_refund_history_refund_id ON refund_status_history(refund_id);
CREATE INDEX IF NOT EXISTS idx_refund_history_created_at ON refund_status_history(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_bookings_refund_status ON bookings(refund_status) WHERE refund_status IS NOT NULL;

-- ============================================
-- TRIGGER FOR UPDATED_AT
-- ============================================
CREATE OR REPLACE FUNCTION update_refunds_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_refunds_updated_at ON refunds;
CREATE TRIGGER trigger_refunds_updated_at
  BEFORE UPDATE ON refunds
  FOR EACH ROW
  EXECUTE FUNCTION update_refunds_updated_at();

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
ALTER TABLE refunds ENABLE ROW LEVEL SECURITY;
ALTER TABLE refund_status_history ENABLE ROW LEVEL SECURITY;

-- Allow service role full access (drop first to make idempotent)
DROP POLICY IF EXISTS "Service role has full access to refunds" ON refunds;
CREATE POLICY "Service role has full access to refunds" ON refunds
  FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role has full access to refund_status_history" ON refund_status_history;
CREATE POLICY "Service role has full access to refund_status_history" ON refund_status_history
  FOR ALL USING (true) WITH CHECK (true);

-- ============================================
-- COMMENTS
-- ============================================
COMMENT ON TABLE refunds IS 'Tracks all refund requests and their lifecycle from request to completion';
COMMENT ON TABLE refund_status_history IS 'Audit trail of all status changes for refunds';

COMMENT ON COLUMN refunds.status IS 'Workflow status: requested, under_review, approved, rejected, processing, completed, failed';
COMMENT ON COLUMN refunds.eligible_amount IS 'Calculated refund amount based on cancellation policy';
COMMENT ON COLUMN refunds.approved_amount IS 'Staff-approved amount (may differ from eligible with override_reason)';
COMMENT ON COLUMN refunds.processed_amount IS 'Actual amount processed/refunded';
COMMENT ON COLUMN refunds.policy_applied IS 'Snapshot of cancellation policy used for calculation';
COMMENT ON COLUMN refunds.override_reason IS 'Required explanation when approved_amount differs from eligible_amount';
COMMENT ON COLUMN bookings.refund_id IS 'Reference to active/completed refund for this booking';
COMMENT ON COLUMN bookings.refund_status IS 'Cached refund status for quick filtering';

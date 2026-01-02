-- ============================================
-- BOOKING STATUS CONSOLIDATION MIGRATION
-- Consolidates failure_type into main status field
-- ============================================

-- Step 0: Update the check constraint to include new status values
ALTER TABLE bookings DROP CONSTRAINT IF EXISTS valid_status;

ALTER TABLE bookings ADD CONSTRAINT valid_status CHECK (
  status IN (
    'pending',
    'confirmed',
    'cancelled',
    'checked_in',
    'checked_out',
    'completed',
    'payment_failed',
    'cart_abandoned'
  )
);

-- Step 1: Migrate existing failure_type values to status
UPDATE bookings
SET status = 'payment_failed'
WHERE failure_type IN ('payment_declined', 'payment_error')
  AND status = 'pending';

UPDATE bookings
SET status = 'cart_abandoned'
WHERE failure_type IN ('payment_abandoned', 'abandoned_checkout')
  AND status = 'pending';

-- Step 2: Clear failure_type and failure_reason for migrated records
-- (keeping the data in checkout_data for audit purposes)
UPDATE bookings
SET checkout_data = COALESCE(checkout_data, '{}'::jsonb) ||
    jsonb_build_object(
      'migrated_failure_type', failure_type,
      'migrated_failure_reason', failure_reason,
      'migration_date', NOW()
    )
WHERE failure_type IS NOT NULL;

-- Step 3: Drop old index on failure_type if exists
DROP INDEX IF EXISTS idx_bookings_failure_type;

-- Step 4: Create new index for status-based filtering
CREATE INDEX IF NOT EXISTS idx_bookings_status_category
ON bookings(status)
WHERE status IN ('payment_failed', 'cart_abandoned', 'pending');

-- Step 5: Create composite index for portal queries (customer + status)
CREATE INDEX IF NOT EXISTS idx_bookings_customer_status
ON bookings(customer_id, status);

-- Step 6: Add comment documenting the new status values
COMMENT ON COLUMN bookings.status IS
'Booking status: pending, confirmed, payment_failed, cart_abandoned, checked_in, checked_out, cancelled, completed';

-- Note: failure_type and failure_reason columns can be dropped in a future migration
-- after verifying all code has been updated

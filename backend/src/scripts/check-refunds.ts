import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config()

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function checkRefunds() {
  console.log('Checking refunds table...')

  const { data: refunds, error } = await supabase
    .from('refunds')
    .select('id, tenant_id, booking_id, status, requested_at')

  if (error) {
    console.error('Error:', error)
    return
  }

  console.log('Refunds found:', refunds?.length || 0)
  if (refunds) {
    for (const r of refunds) {
      const id = r.id ? r.id.substring(0, 8) : 'NULL'
      const tenant = r.tenant_id ? r.tenant_id.substring(0, 8) : 'NULL'
      console.log('- ID:', id, 'Tenant:', tenant, 'Status:', r.status)
    }
  }

  // Also check bookings with refund_requested
  const { data: bookings } = await supabase
    .from('bookings')
    .select('id, tenant_id, guest_name, refund_requested, refund_id, refund_status')
    .eq('refund_requested', true)

  console.log('\nBookings with refund_requested=true:', bookings?.length || 0)
  if (bookings) {
    for (const b of bookings) {
      const id = b.id ? b.id.substring(0, 8) : 'NULL'
      const tenant = b.tenant_id ? b.tenant_id.substring(0, 8) : 'NULL'
      const refundId = b.refund_id ? b.refund_id.substring(0, 8) : 'NULL'
      console.log('- Booking:', id, 'Tenant:', tenant, 'RefundID:', refundId, 'Status:', b.refund_status || 'NULL')
    }
  }
}

checkRefunds().then(() => process.exit(0))

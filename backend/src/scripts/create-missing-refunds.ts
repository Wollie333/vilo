import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config()

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function createMissingRefunds() {
  console.log('Finding bookings with refund_requested=true but no refund...')

  // Get bookings that requested refund but have no refund_id
  const { data: bookings, error: bookingsError } = await supabase
    .from('bookings')
    .select('*')
    .eq('refund_requested', true)
    .is('refund_id', null)

  if (bookingsError) {
    console.error('Error fetching bookings:', bookingsError)
    return
  }

  console.log('Found', bookings?.length || 0, 'bookings needing refunds')

  for (const booking of bookings || []) {
    console.log('\nProcessing booking:', booking.id.substring(0, 8))
    console.log('- Guest:', booking.guest_name)
    console.log('- Tenant:', booking.tenant_id)
    console.log('- Amount:', booking.total_amount, booking.currency)

    // Try to create refund
    const { data: refund, error: refundError } = await supabase
      .from('refunds')
      .insert({
        tenant_id: booking.tenant_id,
        booking_id: booking.id,
        customer_id: booking.customer_id || null,
        original_amount: parseFloat(booking.total_amount) || 0,
        eligible_amount: parseFloat(booking.total_amount) || 0, // Full refund for now
        currency: booking.currency || 'ZAR',
        policy_applied: { days_before: 7, refund_percentage: 100, label: 'Full refund' },
        days_before_checkin: 30,
        refund_percentage: 100,
        status: 'requested',
        payment_method: booking.payment_method || null,
        original_payment_reference: booking.payment_reference || null,
        requested_at: new Date().toISOString()
      })
      .select()
      .single()

    if (refundError) {
      console.error('ERROR creating refund:', refundError)
      continue
    }

    console.log('Created refund:', refund.id.substring(0, 8))

    // Update booking with refund reference
    const { error: updateError } = await supabase
      .from('bookings')
      .update({
        refund_id: refund.id,
        refund_status: 'requested'
      })
      .eq('id', booking.id)

    if (updateError) {
      console.error('ERROR updating booking:', updateError)
    } else {
      console.log('Updated booking with refund_id')
    }
  }

  console.log('\nDone!')
}

createMissingRefunds().then(() => process.exit(0))

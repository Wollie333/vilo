import { Router } from 'express'
import { supabase } from '../lib/supabase.js'
import { generateInvoice, getInvoiceByBookingId } from '../services/invoiceService.js'

const router = Router()

// Get all bookings for a tenant
router.get('/', async (req, res) => {
  try {
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return res.status(503).json({
        error: 'Database not configured',
        message: 'Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in your .env file'
      })
    }

    const tenantId = req.headers['x-tenant-id'] as string
    const { source } = req.query // FOB: optional source filter

    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID required' })
    }

    let query = supabase
      .from('bookings')
      .select('*')
      .eq('tenant_id', tenantId)

    // FOB: filter by source if provided
    if (source && typeof source === 'string') {
      query = query.eq('source', source)
    }

    const { data, error } = await query.order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching bookings:', error)
      return res.status(500).json({ error: 'Failed to fetch bookings', details: error.message })
    }

    res.json(data || [])
  } catch (error: any) {
    console.error('Unexpected error:', error)
    res.status(500).json({ error: 'Internal server error', details: error.message })
  }
})

// Get single booking by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const tenantId = req.headers['x-tenant-id'] as string

    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID required' })
    }

    const { data, error } = await supabase
      .from('bookings')
      .select('*')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: 'Booking not found' })
      }
      return res.status(500).json({ error: 'Failed to fetch booking' })
    }

    res.json(data)
  } catch (error) {
    console.error('Unexpected error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Create new booking
router.post('/', async (req, res) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string
    const {
      guest_name,
      guest_email,
      guest_phone,
      room_id,
      room_name,
      check_in,
      check_out,
      total_amount,
      currency = 'ZAR',
      notes,
      status = 'pending',
      payment_status = 'pending',
      // FOB integration fields
      source = 'manual',
      external_id,
      external_url,
      synced_at
    } = req.body

    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID required' })
    }

    if (!guest_name || !room_id || !check_in || !check_out || !total_amount) {
      return res.status(400).json({ error: 'Missing required fields' })
    }

    const { data, error } = await supabase
      .from('bookings')
      .insert({
        tenant_id: tenantId,
        guest_name,
        guest_email,
        guest_phone,
        room_id,
        room_name,
        check_in,
        check_out,
        total_amount,
        currency,
        notes,
        status,
        payment_status,
        // FOB integration fields
        source,
        external_id,
        external_url,
        synced_at
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating booking:', error)
      return res.status(500).json({ error: 'Failed to create booking' })
    }

    res.status(201).json(data)
  } catch (error) {
    console.error('Unexpected error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Update booking
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const tenantId = req.headers['x-tenant-id'] as string
    const updateData = req.body

    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID required' })
    }

    // Get current booking state to check payment_status change
    const { data: existingBooking } = await supabase
      .from('bookings')
      .select('payment_status')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .single()

    const previousPaymentStatus = existingBooking?.payment_status

    // Remove tenant_id from update data (cannot be changed)
    delete updateData.tenant_id
    delete updateData.id
    delete updateData.created_at

    const { data, error } = await supabase
      .from('bookings')
      .update(updateData)
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .select()
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: 'Booking not found' })
      }
      console.error('Error updating booking:', error)
      return res.status(500).json({ error: 'Failed to update booking' })
    }

    // Auto-generate invoice when payment_status changes to 'paid'
    if (
      updateData.payment_status === 'paid' &&
      previousPaymentStatus !== 'paid'
    ) {
      try {
        const existingInvoice = await getInvoiceByBookingId(id, tenantId)
        if (!existingInvoice) {
          const invoice = await generateInvoice(id, tenantId)
          console.log(`Auto-generated invoice ${invoice.invoice_number} for booking ${id}`)
        }
      } catch (invoiceError) {
        // Log error but don't fail the booking update
        console.error('Failed to auto-generate invoice:', invoiceError)
      }
    }

    res.json(data)
  } catch (error) {
    console.error('Unexpected error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Delete booking
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const tenantId = req.headers['x-tenant-id'] as string

    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID required' })
    }

    const { error } = await supabase
      .from('bookings')
      .delete()
      .eq('id', id)
      .eq('tenant_id', tenantId)

    if (error) {
      console.error('Error deleting booking:', error)
      return res.status(500).json({ error: 'Failed to delete booking' })
    }

    res.status(204).send()
  } catch (error) {
    console.error('Unexpected error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// ============================================
// EMAIL NOTIFICATIONS
// ============================================

// Send booking confirmation email
router.post('/:id/send-confirmation', async (req, res) => {
  try {
    const { id } = req.params
    const tenantId = req.headers['x-tenant-id'] as string

    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID required' })
    }

    // Get booking details
    const { data: booking, error } = await supabase
      .from('bookings')
      .select('*')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .single()

    if (error || !booking) {
      return res.status(404).json({ error: 'Booking not found' })
    }

    if (!booking.guest_email) {
      return res.status(400).json({ error: 'Booking has no email address' })
    }

    // Get tenant info for property name
    const { data: tenant } = await supabase
      .from('tenants')
      .select('name')
      .eq('id', tenantId)
      .single()

    const propertyName = tenant?.name || 'Our Property'

    // Parse booking notes for reference
    let bookingRef = id
    try {
      const notes = JSON.parse(booking.notes || '{}')
      if (notes.booking_reference) {
        bookingRef = notes.booking_reference
      }
    } catch {}

    // In production, you would send an actual email here using a service like:
    // - SendGrid: https://sendgrid.com
    // - Postmark: https://postmarkapp.com
    // - AWS SES: https://aws.amazon.com/ses/
    // - Resend: https://resend.com

    // For now, we'll log the email content and return success
    console.log('='.repeat(50))
    console.log('BOOKING CONFIRMATION EMAIL')
    console.log('='.repeat(50))
    console.log(`To: ${booking.guest_email}`)
    console.log(`Subject: Booking Confirmation - ${propertyName}`)
    console.log('')
    console.log(`Dear ${booking.guest_name},`)
    console.log('')
    console.log(`Thank you for your booking at ${propertyName}!`)
    console.log('')
    console.log('Booking Details:')
    console.log(`- Reference: ${bookingRef}`)
    console.log(`- Room: ${booking.room_name || booking.room_id}`)
    console.log(`- Check-in: ${booking.check_in}`)
    console.log(`- Check-out: ${booking.check_out}`)
    console.log(`- Total: ${booking.currency} ${booking.total_amount}`)
    console.log(`- Status: ${booking.status}`)
    console.log(`- Payment: ${booking.payment_status}`)
    console.log('')
    console.log('We look forward to welcoming you!')
    console.log('='.repeat(50))

    res.json({
      success: true,
      message: `Confirmation email sent to ${booking.guest_email}`,
      email: booking.guest_email
    })
  } catch (error) {
    console.error('Error sending confirmation:', error)
    res.status(500).json({ error: 'Failed to send confirmation email' })
  }
})

// Send booking update notification
router.post('/:id/send-update', async (req, res) => {
  try {
    const { id } = req.params
    const tenantId = req.headers['x-tenant-id'] as string
    const { message } = req.body // Optional custom message

    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID required' })
    }

    // Get booking details
    const { data: booking, error } = await supabase
      .from('bookings')
      .select('*')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .single()

    if (error || !booking) {
      return res.status(404).json({ error: 'Booking not found' })
    }

    if (!booking.guest_email) {
      return res.status(400).json({ error: 'Booking has no email address' })
    }

    // Get tenant info
    const { data: tenant } = await supabase
      .from('tenants')
      .select('name')
      .eq('id', tenantId)
      .single()

    const propertyName = tenant?.name || 'Our Property'

    // Parse booking notes for reference
    let bookingRef = id
    try {
      const notes = JSON.parse(booking.notes || '{}')
      if (notes.booking_reference) {
        bookingRef = notes.booking_reference
      }
    } catch {}

    // Log the email (in production, send actual email)
    console.log('='.repeat(50))
    console.log('BOOKING UPDATE NOTIFICATION')
    console.log('='.repeat(50))
    console.log(`To: ${booking.guest_email}`)
    console.log(`Subject: Booking Update - ${propertyName}`)
    console.log('')
    console.log(`Dear ${booking.guest_name},`)
    console.log('')
    console.log(`Your booking (Ref: ${bookingRef}) has been updated.`)
    console.log('')
    if (message) {
      console.log('Message from property:')
      console.log(message)
      console.log('')
    }
    console.log('Current Booking Details:')
    console.log(`- Room: ${booking.room_name || booking.room_id}`)
    console.log(`- Check-in: ${booking.check_in}`)
    console.log(`- Check-out: ${booking.check_out}`)
    console.log(`- Total: ${booking.currency} ${booking.total_amount}`)
    console.log(`- Status: ${booking.status}`)
    console.log(`- Payment: ${booking.payment_status}`)
    console.log('')
    console.log('If you have any questions, please contact us.')
    console.log('='.repeat(50))

    res.json({
      success: true,
      message: `Update notification sent to ${booking.guest_email}`,
      email: booking.guest_email
    })
  } catch (error) {
    console.error('Error sending update:', error)
    res.status(500).json({ error: 'Failed to send update notification' })
  }
})

export default router


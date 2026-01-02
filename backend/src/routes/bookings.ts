import { Router } from 'express'
import { supabase } from '../lib/supabase.js'
import { generateInvoice, getInvoiceByBookingId } from '../services/invoiceService.js'
import { recordCouponUsage } from './coupons.js'
import { logBookingCreated, logBookingStatusChange, logPaymentReceived } from '../services/activityService.js'
import {
  notifyNewBooking,
  notifyBookingCancelled,
  notifyCheckIn,
  notifyCheckOut,
  notifyPaymentReceived,
  notifyCustomerBookingConfirmed,
  notifyCustomerBookingCancelled,
  notifyCustomerPaymentConfirmed,
  notifyBookingModified,
  notifyCustomerBookingModified,
  notifyRoomBlocked
} from '../services/notificationService.js'

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

    // Fetch refund status for cancelled bookings with refund_requested
    const bookingsWithRefund = (data || []).filter((b: any) => b.refund_requested)
    const bookingIds = bookingsWithRefund.map((b: any) => b.id)
    const refundStatusMap = new Map<string, string>()

    if (bookingIds.length > 0) {
      const { data: refunds } = await supabase
        .from('refunds')
        .select('booking_id, status')
        .in('booking_id', bookingIds)

      for (const refund of (refunds || [])) {
        refundStatusMap.set(refund.booking_id, refund.status)
      }
    }

    // Add refund_status to bookings
    const bookingsWithStatus = (data || []).map((b: any) => ({
      ...b,
      refund_status: refundStatusMap.get(b.id) || null
    }))

    res.json(bookingsWithStatus)
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

// Check for booking conflicts
router.post('/check-conflicts', async (req, res) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string
    const { room_id, check_in, check_out, exclude_booking_id } = req.body

    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID required' })
    }

    if (!room_id || !check_in || !check_out) {
      return res.status(400).json({ error: 'room_id, check_in, and check_out are required' })
    }

    // Find overlapping bookings for the same room
    // Overlap: existing.check_in < new.check_out AND existing.check_out > new.check_in
    let query = supabase
      .from('bookings')
      .select('id, guest_name, source, check_in, check_out, status')
      .eq('room_id', room_id)
      .eq('tenant_id', tenantId)
      .neq('status', 'cancelled')
      .lt('check_in', check_out)
      .gt('check_out', check_in)

    // Exclude the current booking if editing
    if (exclude_booking_id) {
      query = query.neq('id', exclude_booking_id)
    }

    const { data: conflicts, error } = await query

    if (error) {
      console.error('Error checking conflicts:', error)
      return res.status(500).json({ error: 'Failed to check conflicts' })
    }

    if (conflicts && conflicts.length > 0) {
      res.json({
        hasConflict: true,
        conflicts: conflicts.map(c => ({
          id: c.id,
          guest: c.guest_name,
          source: c.source || 'vilo',
          dates: `${c.check_in} - ${c.check_out}`,
          status: c.status
        }))
      })
    } else {
      res.json({ hasConflict: false, conflicts: [] })
    }
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
      guests,
      total_amount,
      currency = 'ZAR',
      notes,
      status = 'pending',
      payment_status = 'pending',
      // FOB integration fields
      source = 'vilo',
      external_id,
      external_url,
      synced_at,
      // Conflict handling
      force_create = false,
      // Coupon fields
      coupon,
      subtotal_before_discount,
      discount_amount
    } = req.body

    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID required' })
    }

    if (!guest_name || !room_id || !check_in || !check_out || total_amount === undefined) {
      return res.status(400).json({ error: 'Missing required fields' })
    }

    // Check for conflicts unless force_create is true
    if (!force_create) {
      const { data: conflicts, error: conflictError } = await supabase
        .from('bookings')
        .select('id, guest_name, source, check_in, check_out, status')
        .eq('room_id', room_id)
        .eq('tenant_id', tenantId)
        .neq('status', 'cancelled')
        .lt('check_in', check_out)
        .gt('check_out', check_in)

      if (!conflictError && conflicts && conflicts.length > 0) {
        return res.status(409).json({
          error: 'Booking conflict detected',
          conflicts: conflicts.map(c => ({
            id: c.id,
            guest: c.guest_name,
            source: c.source || 'vilo',
            dates: `${c.check_in} - ${c.check_out}`,
            status: c.status
          })),
          message: `This room has ${conflicts.length} overlapping booking(s). Set force_create=true to create anyway.`
        })
      }
    }

    // Build insert data
    const insertData: any = {
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
    }

    // Add coupon fields if coupon was applied
    if (coupon && coupon.id) {
      insertData.coupon_id = coupon.id
      insertData.coupon_code = coupon.code
      insertData.discount_amount = discount_amount || coupon.discount_amount || 0
      insertData.subtotal_before_discount = subtotal_before_discount || (total_amount + (discount_amount || coupon.discount_amount || 0))
    }

    const { data, error } = await supabase
      .from('bookings')
      .insert(insertData)
      .select()
      .single()

    if (error) {
      console.error('Error creating booking:', error)
      return res.status(500).json({ error: 'Failed to create booking' })
    }

    // Record coupon usage if a coupon was applied
    if (coupon && coupon.id && data.id && guest_email) {
      const originalAmount = subtotal_before_discount || (total_amount + (discount_amount || coupon.discount_amount || 0))
      await recordCouponUsage(
        tenantId,
        coupon.id,
        data.id,
        guest_email,
        discount_amount || coupon.discount_amount || 0,
        originalAmount,
        total_amount
      )
    }

    // Log activity for customer tracking
    console.log('[Booking] Created booking:', data.id, 'guest_email:', guest_email, 'source:', source)

    // Check if this is a room block (not a real booking)
    if (source === 'block' || source === 'blocked' || source === 'maintenance') {
      // Notify about room block instead of new booking
      console.log('[Booking] Room block created, sending block notification')
      notifyRoomBlocked(tenantId, {
        room_id,
        room_name: room_name || 'Room',
        start_date: check_in,
        end_date: check_out,
        reason: notes // Use notes as the block reason
      })
    } else if (guest_email) {
      // Get customer_id if exists
      const { data: customer } = await supabase
        .from('customers')
        .select('id')
        .ilike('email', guest_email)
        .single()

      logBookingCreated(
        tenantId,
        guest_email,
        customer?.id || null,
        data.id,
        room_name || 'Room',
        total_amount,
        currency
      )

      // Send notification to all team members
      console.log('[Booking] Calling notifyNewBooking for tenant:', tenantId)
      notifyNewBooking(tenantId, {
        id: data.id,
        guest_name,
        guest_email,
        room_name: room_name || 'Room',
        room_id,
        check_in,
        check_out,
        guests,
        total_amount,
        currency
      })
    } else {
      console.log('[Booking] Skipping notification - no guest_email')
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

    // Get current booking state to check status/payment changes
    const { data: existingBooking } = await supabase
      .from('bookings')
      .select('status, payment_status, guest_email, guest_name, room_name, room_id, total_amount, currency, check_in, check_out, guests')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .single()

    const previousStatus = existingBooking?.status
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

    // Log activity for customer tracking
    const guestEmail = data.guest_email || existingBooking?.guest_email
    if (guestEmail) {
      // Get customer_id if exists
      const { data: customer } = await supabase
        .from('customers')
        .select('id')
        .ilike('email', guestEmail)
        .single()

      const customerId = customer?.id || null
      const roomName = data.room_name || existingBooking?.room_name || 'Room'

      const guestName = data.guest_name || existingBooking?.guest_name || 'Guest'

      // Log status change and send notifications
      if (updateData.status && updateData.status !== previousStatus) {
        logBookingStatusChange(
          tenantId,
          guestEmail,
          customerId,
          id,
          roomName,
          updateData.status
        )

        // Build booking data for notifications
        const checkIn = data.check_in || existingBooking?.check_in
        const checkOut = data.check_out || existingBooking?.check_out
        const roomId = data.room_id || existingBooking?.room_id
        const totalAmount = data.total_amount || existingBooking?.total_amount
        const bookingCurrency = data.currency || existingBooking?.currency || 'ZAR'

        // Send notifications based on status change
        switch (updateData.status) {
          case 'confirmed':
            // Notify customer their booking is confirmed
            if (customerId) {
              notifyCustomerBookingConfirmed(tenantId, customerId, {
                id,
                room_name: roomName,
                check_in: checkIn,
                check_out: checkOut,
                total_amount: totalAmount,
                currency: bookingCurrency
              })
            }
            break
          case 'cancelled':
            // Notify all team members about cancellation
            notifyBookingCancelled(tenantId, {
              id,
              guest_name: guestName,
              guest_email: guestEmail,
              room_name: roomName,
              check_in: checkIn,
              check_out: checkOut,
              total_amount: totalAmount,
              currency: bookingCurrency
            })
            // Notify customer about cancellation
            if (customerId) {
              notifyCustomerBookingCancelled(tenantId, customerId, {
                id,
                room_name: roomName,
                check_in: checkIn,
                check_out: checkOut
              })
            }
            break
          case 'checked_in':
            // Notify all team members about check-in
            notifyCheckIn(tenantId, {
              id,
              guest_name: guestName,
              room_name: roomName,
              check_in: checkIn,
              check_out: checkOut,
              guests: data.guests || existingBooking?.guests
            })
            break
          case 'checked_out':
            // Notify all team members about check-out
            notifyCheckOut(tenantId, {
              id,
              guest_name: guestName,
              room_name: roomName,
              check_in: checkIn,
              check_out: checkOut
            })
            break
        }
      }

      // Log payment received and send notification
      if (updateData.payment_status === 'paid' && previousPaymentStatus !== 'paid') {
        const amount = data.total_amount || existingBooking?.total_amount || 0
        const currency = data.currency || existingBooking?.currency || 'ZAR'
        logPaymentReceived(tenantId, guestEmail, customerId, id, amount, currency)

        // Notify all team members about payment
        notifyPaymentReceived(tenantId, {
          booking_id: id,
          guest_name: guestName,
          amount,
          currency
        })

        // Notify customer that their payment is confirmed
        if (customerId) {
          notifyCustomerPaymentConfirmed(tenantId, customerId, {
            booking_id: id,
            room_name: roomName,
            amount,
            currency
          })
        }
      }

      // Check for booking modifications (dates, room changes)
      const changes: string[] = []
      if (updateData.check_in && updateData.check_in !== existingBooking?.check_in) {
        changes.push(`check-in date changed to ${new Date(updateData.check_in).toLocaleDateString()}`)
      }
      if (updateData.check_out && updateData.check_out !== existingBooking?.check_out) {
        changes.push(`check-out date changed to ${new Date(updateData.check_out).toLocaleDateString()}`)
      }
      if (updateData.room_id && updateData.room_id !== existingBooking?.room_id) {
        changes.push('room changed')
      }
      if (updateData.guests !== undefined && updateData.guests !== existingBooking?.guests) {
        changes.push(`guests updated to ${updateData.guests}`)
      }

      // Send booking modified notifications if there are relevant changes
      if (changes.length > 0 && updateData.status !== 'cancelled') {
        const changesSummary = changes.join(', ')
        const checkIn = data.check_in || existingBooking?.check_in
        const checkOut = data.check_out || existingBooking?.check_out

        notifyBookingModified(tenantId, {
          id,
          guest_name: guestName,
          room_name: roomName,
          check_in: checkIn,
          check_out: checkOut,
          changes: changesSummary
        })

        if (customerId) {
          notifyCustomerBookingModified(tenantId, customerId, {
            id,
            room_name: roomName,
            check_in: checkIn,
            check_out: checkOut,
            changes: changesSummary
          })
        }
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


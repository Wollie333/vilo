import { Router, Request, Response } from 'express'
import { supabase } from '../lib/supabase.js'
import { getOrCreateCustomer, createSessionToken } from '../middleware/customerAuth.js'

const router = Router()

// ============================================
// PUBLIC BOOKING API
// All endpoints use path-based routing: /:tenantId/...
// ============================================

// Get public property info by tenant ID
router.get('/:tenantId/property', async (req, res) => {
  try {
    const { tenantId } = req.params

    const { data: tenant, error } = await supabase
      .from('tenants')
      .select(`
        id,
        name,
        business_name,
        business_email,
        business_phone,
        address_line1,
        address_line2,
        city,
        state_province,
        postal_code,
        country,
        business_hours
      `)
      .eq('id', tenantId)
      .single()

    if (error || !tenant) {
      return res.status(404).json({ error: 'Property not found' })
    }

    // Build full address from components
    const addressParts = [
      tenant.address_line1,
      tenant.address_line2,
      tenant.city,
      tenant.state_province,
      tenant.postal_code,
      tenant.country
    ].filter(Boolean)

    res.json({
      id: tenant.id,
      name: tenant.business_name || tenant.name || 'Accommodation',
      email: tenant.business_email || null,
      phone: tenant.business_phone || null,
      address: addressParts.length > 0 ? addressParts.join(', ') : null,
      address_line1: tenant.address_line1 || null,
      address_line2: tenant.address_line2 || null,
      city: tenant.city || null,
      state_province: tenant.state_province || null,
      postal_code: tenant.postal_code || null,
      country: tenant.country || null,
      business_hours: tenant.business_hours || null
    })
  } catch (error) {
    console.error('Error fetching property:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Get all active rooms for public booking
router.get('/:tenantId/rooms', async (req, res) => {
  try {
    const { tenantId } = req.params

    const { data, error } = await supabase
      .from('rooms')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .order('base_price_per_night', { ascending: true })

    if (error) {
      console.error('Error fetching rooms:', error)
      return res.status(500).json({ error: 'Failed to fetch rooms' })
    }

    res.json(data || [])
  } catch (error) {
    console.error('Unexpected error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Get single room details
router.get('/:tenantId/rooms/:roomId', async (req, res) => {
  try {
    const { tenantId, roomId } = req.params

    const { data: room, error } = await supabase
      .from('rooms')
      .select('*')
      .eq('id', roomId)
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .single()

    if (error || !room) {
      return res.status(404).json({ error: 'Room not found' })
    }

    // Get seasonal rates for this room
    const { data: rates } = await supabase
      .from('seasonal_rates')
      .select('*')
      .eq('room_id', roomId)
      .eq('tenant_id', tenantId)
      .order('start_date', { ascending: true })

    res.json({
      ...room,
      seasonal_rates: rates || []
    })
  } catch (error) {
    console.error('Unexpected error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Get add-ons available for a room (or all rooms)
router.get('/:tenantId/rooms/:roomId/addons', async (req, res) => {
  try {
    const { tenantId, roomId } = req.params

    // Get all active add-ons
    const { data: addons, error } = await supabase
      .from('addons')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .order('price', { ascending: true })

    if (error) {
      console.error('Error fetching addons:', error)
      return res.status(500).json({ error: 'Failed to fetch addons' })
    }

    // Filter add-ons available for this room
    const availableAddons = (addons || []).filter(addon => {
      // If available_for_rooms is empty, it's available for all rooms
      if (!addon.available_for_rooms || addon.available_for_rooms.length === 0) {
        return true
      }
      // Otherwise check if this room is in the list
      return addon.available_for_rooms.includes(roomId)
    })

    res.json(availableAddons)
  } catch (error) {
    console.error('Unexpected error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Check room availability for date range
router.get('/:tenantId/rooms/:roomId/availability', async (req, res) => {
  try {
    const { tenantId, roomId } = req.params
    const { check_in, check_out } = req.query

    if (!check_in || !check_out) {
      return res.status(400).json({ error: 'check_in and check_out dates required' })
    }

    // Get room details
    const { data: room, error: roomError } = await supabase
      .from('rooms')
      .select('*')
      .eq('id', roomId)
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .single()

    if (roomError || !room) {
      return res.status(404).json({ error: 'Room not found' })
    }

    // Count existing bookings for this room in the date range
    const { data: bookings, error: bookingsError } = await supabase
      .from('bookings')
      .select('id')
      .eq('room_id', roomId)
      .eq('tenant_id', tenantId)
      .in('status', ['pending', 'confirmed'])
      .or(`and(check_in.lt.${check_out},check_out.gt.${check_in})`)

    if (bookingsError) {
      console.error('Error checking availability:', bookingsError)
      return res.status(500).json({ error: 'Failed to check availability' })
    }

    const bookedCount = bookings?.length || 0
    const availableUnits = room.total_units - bookedCount

    // Calculate number of nights
    const checkInDate = new Date(check_in as string)
    const checkOutDate = new Date(check_out as string)
    const nights = Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24))

    // Check min/max stay
    const meetsMinStay = nights >= room.min_stay_nights
    const meetsMaxStay = !room.max_stay_nights || nights <= room.max_stay_nights

    res.json({
      available: availableUnits > 0 && meetsMinStay && meetsMaxStay,
      available_units: availableUnits,
      total_units: room.total_units,
      nights,
      min_stay_nights: room.min_stay_nights,
      max_stay_nights: room.max_stay_nights,
      meets_min_stay: meetsMinStay,
      meets_max_stay: meetsMaxStay
    })
  } catch (error) {
    console.error('Unexpected error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Get booked/unavailable dates for a room (for calendar display)
router.get('/:tenantId/rooms/:roomId/booked-dates', async (req, res) => {
  try {
    const { tenantId, roomId } = req.params
    const { start_date, end_date } = req.query

    // Default to next 6 months if no date range provided
    const startDate = start_date
      ? new Date(start_date as string)
      : new Date()
    const endDate = end_date
      ? new Date(end_date as string)
      : new Date(new Date().setMonth(new Date().getMonth() + 6))

    // Get room details to check total units
    const { data: room, error: roomError } = await supabase
      .from('rooms')
      .select('total_units, inventory_mode')
      .eq('id', roomId)
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .single()

    if (roomError || !room) {
      return res.status(404).json({ error: 'Room not found' })
    }

    // Get all bookings for this room in the date range
    const { data: bookings, error: bookingsError } = await supabase
      .from('bookings')
      .select('check_in, check_out')
      .eq('room_id', roomId)
      .eq('tenant_id', tenantId)
      .in('status', ['pending', 'confirmed'])
      .gte('check_out', startDate.toISOString().split('T')[0])
      .lte('check_in', endDate.toISOString().split('T')[0])

    if (bookingsError) {
      console.error('Error fetching booked dates:', bookingsError)
      return res.status(500).json({ error: 'Failed to fetch booked dates' })
    }

    // For single unit rooms, all dates in booking ranges are unavailable
    // For room type (multiple units), need to count bookings per date
    const unavailableDates: string[] = []

    if (room.inventory_mode === 'single_unit' || room.total_units === 1) {
      // Single unit - mark all dates in bookings as unavailable
      (bookings || []).forEach(booking => {
        const checkIn = new Date(booking.check_in)
        const checkOut = new Date(booking.check_out)
        const current = new Date(checkIn)

        while (current < checkOut) {
          unavailableDates.push(current.toISOString().split('T')[0])
          current.setDate(current.getDate() + 1)
        }
      })
    } else {
      // Multiple units - count bookings per date
      const dateBookingCount: Record<string, number> = {}

      (bookings || []).forEach(booking => {
        const checkIn = new Date(booking.check_in)
        const checkOut = new Date(booking.check_out)
        const current = new Date(checkIn)

        while (current < checkOut) {
          const dateStr = current.toISOString().split('T')[0]
          dateBookingCount[dateStr] = (dateBookingCount[dateStr] || 0) + 1
          current.setDate(current.getDate() + 1)
        }
      })

      // Mark dates as unavailable where all units are booked
      Object.entries(dateBookingCount).forEach(([date, count]) => {
        if (count >= room.total_units) {
          unavailableDates.push(date)
        }
      })
    }

    res.json({
      unavailable_dates: [...new Set(unavailableDates)].sort(),
      total_units: room.total_units,
      inventory_mode: room.inventory_mode
    })
  } catch (error) {
    console.error('Unexpected error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Get seasonal rate periods for a room (for calendar display)
router.get('/:tenantId/rooms/:roomId/seasonal-rates', async (req, res) => {
  try {
    const { tenantId, roomId } = req.params

    // Verify room exists and is active
    const { data: room, error: roomError } = await supabase
      .from('rooms')
      .select('id')
      .eq('id', roomId)
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .single()

    if (roomError || !room) {
      return res.status(404).json({ error: 'Room not found' })
    }

    // Get all seasonal rates for this room
    const { data: rates, error: ratesError } = await supabase
      .from('seasonal_rates')
      .select('name, start_date, end_date')
      .eq('room_id', roomId)
      .eq('tenant_id', tenantId)
      .order('start_date', { ascending: true })

    if (ratesError) {
      console.error('Error fetching seasonal rates:', ratesError)
      return res.status(500).json({ error: 'Failed to fetch seasonal rates' })
    }

    res.json({
      rates: rates || []
    })
  } catch (error) {
    console.error('Unexpected error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Get pricing for a room for date range
router.get('/:tenantId/rooms/:roomId/pricing', async (req, res) => {
  try {
    const { tenantId, roomId } = req.params
    const { check_in, check_out } = req.query

    if (!check_in || !check_out) {
      return res.status(400).json({ error: 'check_in and check_out dates required' })
    }

    // Get room base price
    const { data: room, error: roomError } = await supabase
      .from('rooms')
      .select('base_price_per_night, currency, name')
      .eq('id', roomId)
      .eq('tenant_id', tenantId)
      .single()

    if (roomError || !room) {
      return res.status(404).json({ error: 'Room not found' })
    }

    // Get all seasonal rates that overlap with the date range
    const { data: rates } = await supabase
      .from('seasonal_rates')
      .select('*')
      .eq('room_id', roomId)
      .eq('tenant_id', tenantId)
      .lte('start_date', check_out)
      .gte('end_date', check_in)
      .order('priority', { ascending: false })

    // Calculate prices for each night
    const nights: Array<{
      date: string
      price: number
      rate_name: string | null
    }> = []

    const startDate = new Date(check_in as string)
    const endDate = new Date(check_out as string)
    let totalAmount = 0

    const currentDate = new Date(startDate)
    while (currentDate < endDate) {
      const dateStr = currentDate.toISOString().split('T')[0]

      // Find applicable seasonal rate
      const applicableRate = (rates || []).find(rate => {
        const rateStart = new Date(rate.start_date)
        const rateEnd = new Date(rate.end_date)
        return currentDate >= rateStart && currentDate <= rateEnd
      })

      const price = applicableRate ? applicableRate.price_per_night : room.base_price_per_night
      totalAmount += price

      nights.push({
        date: dateStr,
        price,
        rate_name: applicableRate?.name || null
      })

      currentDate.setDate(currentDate.getDate() + 1)
    }

    res.json({
      room_name: room.name,
      nights,
      subtotal: totalAmount,
      currency: room.currency,
      night_count: nights.length
    })
  } catch (error) {
    console.error('Unexpected error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Create a new booking (public)
router.post('/:tenantId/bookings', async (req, res) => {
  try {
    const { tenantId } = req.params
    const {
      guest_name,
      guest_email,
      guest_phone,
      room_id,
      check_in,
      check_out,
      guests,
      addons,
      special_requests,
      total_amount,
      currency
    } = req.body

    // Validate required fields
    if (!guest_name || !guest_email || !room_id || !check_in || !check_out) {
      return res.status(400).json({
        error: 'Missing required fields: guest_name, guest_email, room_id, check_in, check_out'
      })
    }

    // Get room details for booking
    const { data: room, error: roomError } = await supabase
      .from('rooms')
      .select('name, max_guests, base_price_per_night, currency')
      .eq('id', room_id)
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .single()

    if (roomError || !room) {
      return res.status(404).json({ error: 'Room not found or unavailable' })
    }

    // Check guest count
    if (guests && guests > room.max_guests) {
      return res.status(400).json({
        error: `This room allows maximum ${room.max_guests} guests`
      })
    }

    // Calculate total price server-side with seasonal rates
    // Use noon to avoid timezone/DST issues
    const checkInDate = new Date(check_in + 'T12:00:00')
    const checkOutDate = new Date(check_out + 'T12:00:00')
    const nights = Math.round((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24))

    if (nights <= 0) {
      return res.status(400).json({ error: 'Check-out must be after check-in' })
    }

    // Get seasonal rates that overlap with the booking dates
    const { data: seasonalRates } = await supabase
      .from('seasonal_rates')
      .select('*')
      .eq('room_id', room_id)
      .eq('tenant_id', tenantId)
      .lte('start_date', check_out)
      .gte('end_date', check_in)
      .order('priority', { ascending: false })

    // Calculate room total by iterating through each night
    // Use noon to avoid DST issues
    let calculatedRoomTotal = 0
    const currentDate = new Date(check_in + 'T12:00:00')
    const endDateForLoop = new Date(check_out + 'T12:00:00')

    while (currentDate < endDateForLoop) {
      const year = currentDate.getFullYear()
      const month = String(currentDate.getMonth() + 1).padStart(2, '0')
      const day = String(currentDate.getDate()).padStart(2, '0')
      const dateStr = `${year}-${month}-${day}`

      // Compare date strings directly to avoid timezone issues
      const applicableRate = (seasonalRates || []).find(rate => {
        const rateStart = rate.start_date
        const rateEnd = rate.end_date
        return dateStr >= rateStart && dateStr <= rateEnd
      })

      const nightPrice = applicableRate ? Number(applicableRate.price_per_night) : room.base_price_per_night
      calculatedRoomTotal += nightPrice
      currentDate.setDate(currentDate.getDate() + 1)
    }

    // Calculate add-ons total (trust client values for add-on selection but could be validated)
    const addonsTotal = (addons || []).reduce((sum: number, addon: any) => {
      return sum + ((addon.price || 0) * (addon.quantity || 1))
    }, 0)

    // Use server-calculated total
    const calculatedTotalAmount = calculatedRoomTotal + addonsTotal

    // Generate short booking reference (VILO-XXXX format)
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // Exclude confusing chars: I, O, 0, 1
    let refCode = ''
    for (let i = 0; i < 4; i++) {
      refCode += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    const bookingRef = `VILO-${refCode}`

    // Get or create customer for this email
    const customer = await getOrCreateCustomer(guest_email, guest_name, guest_phone)

    // Create booking with customer_id if we have a customer
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .insert({
        tenant_id: tenantId,
        customer_id: customer?.id || null,
        guest_name,
        guest_email,
        guest_phone,
        room_id,
        room_name: room.name,
        check_in,
        check_out,
        status: 'pending',
        payment_status: 'pending',
        total_amount: calculatedTotalAmount,
        currency: room.currency || currency || 'ZAR',
        notes: JSON.stringify({
          guests: guests || 1,
          addons: addons || [],
          special_requests: special_requests || '',
          booking_reference: bookingRef,
          booked_online: true
        })
      })
      .select()
      .single()

    if (bookingError) {
      console.error('Error creating booking:', bookingError)
      return res.status(500).json({ error: 'Failed to create booking' })
    }

    // Create session token for automatic login to customer portal
    let sessionToken = null
    let sessionExpiresAt = null
    if (customer) {
      const session = await createSessionToken(customer.id)
      if (session) {
        sessionToken = session.token
        sessionExpiresAt = session.expiresAt
      }
    }

    res.status(201).json({
      success: true,
      booking: {
        id: booking.id,
        reference: bookingRef,
        guest_name: booking.guest_name,
        guest_email: booking.guest_email,
        room_name: booking.room_name,
        check_in: booking.check_in,
        check_out: booking.check_out,
        total_amount: booking.total_amount,
        currency: booking.currency,
        status: booking.status
      },
      // Include customer session info for automatic portal login
      customer: customer ? {
        id: customer.id,
        email: customer.email,
        name: customer.name,
        hasPassword: !!customer.password_hash
      } : null,
      token: sessionToken,
      expiresAt: sessionExpiresAt
    })
  } catch (error) {
    console.error('Unexpected error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Get booking by reference (for confirmation page)
router.get('/:tenantId/bookings/:reference', async (req, res) => {
  try {
    const { tenantId, reference } = req.params

    const { data: bookings, error } = await supabase
      .from('bookings')
      .select('*')
      .eq('tenant_id', tenantId)
      .like('notes', `%"booking_reference":"${reference}"%`)
      .limit(1)

    if (error || !bookings || bookings.length === 0) {
      return res.status(404).json({ error: 'Booking not found' })
    }

    const booking = bookings[0]
    const notes = JSON.parse(booking.notes || '{}')

    res.json({
      id: booking.id,
      reference: notes.booking_reference,
      guest_name: booking.guest_name,
      guest_email: booking.guest_email,
      guest_phone: booking.guest_phone,
      room_name: booking.room_name,
      check_in: booking.check_in,
      check_out: booking.check_out,
      guests: notes.guests,
      addons: notes.addons,
      special_requests: notes.special_requests,
      total_amount: booking.total_amount,
      currency: booking.currency,
      status: booking.status,
      payment_status: booking.payment_status,
      created_at: booking.created_at
    })
  } catch (error) {
    console.error('Unexpected error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})


// ============================================
// PUBLIC CONTACT FORM
// ============================================

/**
 * Submit contact form (website inquiry)
 * POST /:tenantId/contact
 */
router.post('/:tenantId/contact', async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.params
    const { name, email, phone, subject, message } = req.body

    // Validate required fields
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return res.status(400).json({ error: 'Name is required' })
    }
    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return res.status(400).json({ error: 'Valid email is required' })
    }
    if (!subject || typeof subject !== 'string' || subject.trim().length === 0) {
      return res.status(400).json({ error: 'Subject is required' })
    }
    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return res.status(400).json({ error: 'Message is required' })
    }

    // Verify tenant exists
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select('id')
      .eq('id', tenantId)
      .single()

    if (tenantError || !tenant) {
      return res.status(404).json({ error: 'Property not found' })
    }

    // Check if customer exists with this email
    const { data: existingCustomer } = await supabase
      .from('customers')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('email', email.toLowerCase().trim())
      .single()

    // Create support message with source='website'
    const { data: supportMessage, error: createError } = await supabase
      .from('support_messages')
      .insert({
        tenant_id: tenantId,
        customer_id: existingCustomer?.id || null,
        sender_email: email.toLowerCase().trim(),
        sender_name: name.trim(),
        sender_phone: phone?.trim() || null,
        subject: subject.trim(),
        message: message.trim(),
        source: 'website',
        status: 'new'
      })
      .select()
      .single()

    if (createError) {
      console.error('Error creating contact submission:', createError)
      return res.status(500).json({ error: 'Failed to submit contact form' })
    }

    res.status(201).json({
      success: true,
      message: 'Thank you for your message. We will get back to you soon.',
      id: supportMessage.id
    })
  } catch (error) {
    console.error('Unexpected error in contact form:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router

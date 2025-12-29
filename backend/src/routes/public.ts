import { Router } from 'express'
import { supabase } from '../lib/supabase.js'

const router = Router()

// ============================================
// PUBLIC BOOKING API
// These endpoints don't require authentication
// They use tenant slug/id in the URL path
// ============================================

// Get public property info by tenant ID
router.get('/:tenantId/property', async (req, res) => {
  try {
    const { tenantId } = req.params

    const { data: tenant, error } = await supabase
      .from('tenants')
      .select('id, name')
      .eq('id', tenantId)
      .single()

    if (error || !tenant) {
      return res.status(404).json({ error: 'Property not found' })
    }

    res.json({
      id: tenant.id,
      name: tenant.name || 'Accommodation'
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
      .select('name, max_guests')
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

    // Generate booking reference
    const bookingRef = `BK-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`

    // Create booking
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .insert({
        tenant_id: tenantId,
        guest_name,
        guest_email,
        guest_phone,
        room_id,
        room_name: room.name,
        check_in,
        check_out,
        status: 'pending',
        payment_status: 'pending',
        total_amount,
        currency: currency || 'ZAR',
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
      }
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

export default router

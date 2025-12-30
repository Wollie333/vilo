import { Router } from 'express'
import { supabase } from '../lib/supabase.js'

const router = Router()

// ============================================
// ROOMS CRUD
// ============================================

// Get all rooms for a tenant
router.get('/', async (req, res) => {
  try {
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return res.status(503).json({
        error: 'Database not configured',
        message: 'Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in your .env file'
      })
    }

    const tenantId = req.headers['x-tenant-id'] as string

    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID required' })
    }

    // Optional query params
    const { is_active, inventory_mode, search } = req.query

    let query = supabase
      .from('rooms')
      .select('*')
      .eq('tenant_id', tenantId)

    if (is_active !== undefined) {
      query = query.eq('is_active', is_active === 'true')
    }

    if (inventory_mode) {
      query = query.eq('inventory_mode', inventory_mode)
    }

    if (search) {
      query = query.ilike('name', `%${search}%`)
    }

    const { data, error } = await query.order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching rooms:', error)
      return res.status(500).json({ error: 'Failed to fetch rooms', details: error.message })
    }

    res.json(data || [])
  } catch (error: any) {
    console.error('Unexpected error:', error)
    res.status(500).json({ error: 'Internal server error', details: error.message })
  }
})

// ============================================
// PUBLIC ENDPOINTS (no tenant header required)
// MUST be before /:id routes to avoid conflicts
// ============================================

// Get room by room_code (public)
router.get('/public/by-code/:roomCode', async (req, res) => {
  try {
    const { roomCode } = req.params
    const { tenant_id } = req.query

    let query = supabase
      .from('rooms')
      .select('*')
      .eq('room_code', roomCode)
      .eq('is_active', true)

    if (tenant_id) {
      query = query.eq('tenant_id', tenant_id)
    }

    const { data, error } = await query.single()

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: 'Room not found' })
      }
      console.error('Error fetching room by code:', error)
      return res.status(500).json({ error: 'Failed to fetch room' })
    }

    res.json(data)
  } catch (error) {
    console.error('Unexpected error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Get all active rooms for a tenant (public - for listing pages)
router.get('/public/tenant/:tenantId', async (req, res) => {
  try {
    const { tenantId } = req.params

    const { data, error } = await supabase
      .from('rooms')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching public rooms:', error)
      return res.status(500).json({ error: 'Failed to fetch rooms' })
    }

    res.json(data || [])
  } catch (error) {
    console.error('Unexpected error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Get room by UUID (public - for room detail pages)
router.get('/public/by-id/:roomId', async (req, res) => {
  try {
    const { roomId } = req.params

    const { data, error } = await supabase
      .from('rooms')
      .select('*')
      .eq('id', roomId)
      .eq('is_active', true)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: 'Room not found' })
      }
      console.error('Error fetching room by id:', error)
      return res.status(500).json({ error: 'Failed to fetch room' })
    }

    res.json(data)
  } catch (error) {
    console.error('Unexpected error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// ============================================
// ADMIN ENDPOINTS (require tenant header)
// ============================================

// Get single room by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const tenantId = req.headers['x-tenant-id'] as string

    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID required' })
    }

    const { data, error } = await supabase
      .from('rooms')
      .select('*')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: 'Room not found' })
      }
      return res.status(500).json({ error: 'Failed to fetch room' })
    }

    res.json(data)
  } catch (error) {
    console.error('Unexpected error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Create new room
router.post('/', async (req, res) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string
    const {
      name,
      description,
      room_code,
      beds = [], // New flexible bed configuration
      bed_type, // Legacy - kept for backwards compatibility
      bed_count = 1, // Legacy
      room_size_sqm,
      max_guests = 2,
      max_adults = null,
      max_children = null,
      amenities = [],
      extra_options = [], // Extra room features like "Balcony", "Sea View"
      images = { featured: null, gallery: [] },
      // Pricing configuration
      pricing_mode = 'per_unit', // per_unit, per_person, per_person_sharing
      base_price_per_night,
      additional_person_rate = null, // For per_person_sharing mode
      child_price_per_night = null,
      child_free_until_age = null,
      child_age_limit = 12,
      currency = 'ZAR',
      min_stay_nights = 1,
      max_stay_nights = null,
      inventory_mode = 'single_unit',
      total_units = 1,
      is_active = true
    } = req.body

    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID required' })
    }

    if (!name || base_price_per_night === undefined) {
      return res.status(400).json({ error: 'Missing required fields: name, base_price_per_night' })
    }

    // Derive legacy bed_type from beds array if not provided
    const effectiveBedType = bed_type || (beds.length > 0 ? beds[0].bed_type : 'Double')
    const effectiveBedCount = bed_count || (beds.length > 0 ? beds.reduce((sum: number, b: any) => sum + b.quantity, 0) : 1)

    const { data, error } = await supabase
      .from('rooms')
      .insert({
        tenant_id: tenantId,
        name,
        description,
        room_code,
        beds, // JSONB column
        bed_type: effectiveBedType,
        bed_count: effectiveBedCount,
        room_size_sqm,
        max_guests,
        max_adults,
        max_children,
        amenities,
        extra_options, // JSONB column
        images,
        pricing_mode,
        base_price_per_night,
        additional_person_rate,
        child_price_per_night,
        child_free_until_age,
        child_age_limit,
        currency,
        min_stay_nights,
        max_stay_nights,
        inventory_mode,
        total_units,
        is_active
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating room:', error)
      return res.status(500).json({ error: 'Failed to create room', details: error.message })
    }

    res.status(201).json(data)
  } catch (error: any) {
    console.error('Unexpected error:', error)
    res.status(500).json({ error: 'Internal server error', details: error.message })
  }
})

// Update room
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const tenantId = req.headers['x-tenant-id'] as string
    const updateData = { ...req.body }

    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID required' })
    }

    // Remove fields that cannot be changed
    delete updateData.tenant_id
    delete updateData.id
    delete updateData.created_at

    const { data, error } = await supabase
      .from('rooms')
      .update(updateData)
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .select()
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: 'Room not found' })
      }
      console.error('Error updating room:', error)
      return res.status(500).json({ error: 'Failed to update room', details: error.message })
    }

    res.json(data)
  } catch (error: any) {
    console.error('Unexpected error:', error)
    res.status(500).json({ error: 'Internal server error', details: error.message })
  }
})

// Delete room (soft delete via is_active = false)
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const tenantId = req.headers['x-tenant-id'] as string
    const { hard } = req.query // Optional: ?hard=true for permanent delete

    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID required' })
    }

    if (hard === 'true') {
      // Hard delete
      const { error } = await supabase
        .from('rooms')
        .delete()
        .eq('id', id)
        .eq('tenant_id', tenantId)

      if (error) {
        console.error('Error deleting room:', error)
        return res.status(500).json({ error: 'Failed to delete room' })
      }
    } else {
      // Soft delete
      const { error } = await supabase
        .from('rooms')
        .update({ is_active: false })
        .eq('id', id)
        .eq('tenant_id', tenantId)

      if (error) {
        console.error('Error deactivating room:', error)
        return res.status(500).json({ error: 'Failed to deactivate room' })
      }
    }

    res.status(204).send()
  } catch (error) {
    console.error('Unexpected error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// ============================================
// ROOM IMAGES
// ============================================

// Update room images (featured + gallery)
router.put('/:id/images', async (req, res) => {
  try {
    const { id } = req.params
    const tenantId = req.headers['x-tenant-id'] as string
    const { featured, gallery } = req.body

    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID required' })
    }

    // Validate gallery limit (max 10 images)
    if (gallery && gallery.length > 10) {
      return res.status(400).json({ error: 'Gallery cannot have more than 10 images' })
    }

    const images = {
      featured: featured || null,
      gallery: gallery || []
    }

    const { data, error } = await supabase
      .from('rooms')
      .update({ images })
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .select()
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: 'Room not found' })
      }
      console.error('Error updating room images:', error)
      return res.status(500).json({ error: 'Failed to update room images' })
    }

    res.json(data)
  } catch (error) {
    console.error('Unexpected error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// ============================================
// SEASONAL RATES
// ============================================

// Get all seasonal rates for a room
router.get('/:id/rates', async (req, res) => {
  try {
    const { id } = req.params
    const tenantId = req.headers['x-tenant-id'] as string

    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID required' })
    }

    const { data, error } = await supabase
      .from('seasonal_rates')
      .select('*')
      .eq('room_id', id)
      .eq('tenant_id', tenantId)
      .order('start_date', { ascending: true })

    if (error) {
      console.error('Error fetching seasonal rates:', error)
      return res.status(500).json({ error: 'Failed to fetch seasonal rates' })
    }

    res.json(data || [])
  } catch (error) {
    console.error('Unexpected error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Create seasonal rate for a room
router.post('/:id/rates', async (req, res) => {
  try {
    const { id } = req.params
    const tenantId = req.headers['x-tenant-id'] as string
    const {
      name,
      start_date,
      end_date,
      price_per_night,
      priority = 0
    } = req.body

    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID required' })
    }

    if (!name || !start_date || !end_date || price_per_night === undefined) {
      return res.status(400).json({ error: 'Missing required fields: name, start_date, end_date, price_per_night' })
    }

    // Verify room exists and belongs to tenant
    const { data: room, error: roomError } = await supabase
      .from('rooms')
      .select('id')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .single()

    if (roomError || !room) {
      return res.status(404).json({ error: 'Room not found' })
    }

    const { data, error } = await supabase
      .from('seasonal_rates')
      .insert({
        tenant_id: tenantId,
        room_id: id,
        name,
        start_date,
        end_date,
        price_per_night,
        priority
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating seasonal rate:', error)
      return res.status(500).json({ error: 'Failed to create seasonal rate', details: error.message })
    }

    res.status(201).json(data)
  } catch (error: any) {
    console.error('Unexpected error:', error)
    res.status(500).json({ error: 'Internal server error', details: error.message })
  }
})

// Update seasonal rate
router.put('/:id/rates/:rateId', async (req, res) => {
  try {
    const { id, rateId } = req.params
    const tenantId = req.headers['x-tenant-id'] as string
    const updateData = { ...req.body }

    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID required' })
    }

    // Remove fields that cannot be changed
    delete updateData.tenant_id
    delete updateData.id
    delete updateData.room_id
    delete updateData.created_at

    const { data, error } = await supabase
      .from('seasonal_rates')
      .update(updateData)
      .eq('id', rateId)
      .eq('room_id', id)
      .eq('tenant_id', tenantId)
      .select()
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: 'Seasonal rate not found' })
      }
      console.error('Error updating seasonal rate:', error)
      return res.status(500).json({ error: 'Failed to update seasonal rate' })
    }

    res.json(data)
  } catch (error) {
    console.error('Unexpected error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Delete seasonal rate
router.delete('/:id/rates/:rateId', async (req, res) => {
  try {
    const { id, rateId } = req.params
    const tenantId = req.headers['x-tenant-id'] as string

    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID required' })
    }

    const { error } = await supabase
      .from('seasonal_rates')
      .delete()
      .eq('id', rateId)
      .eq('room_id', id)
      .eq('tenant_id', tenantId)

    if (error) {
      console.error('Error deleting seasonal rate:', error)
      return res.status(500).json({ error: 'Failed to delete seasonal rate' })
    }

    res.status(204).send()
  } catch (error) {
    console.error('Unexpected error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// ============================================
// UTILITY ENDPOINTS
// ============================================

// Get effective price for a room on a specific date
router.get('/:id/price', async (req, res) => {
  try {
    const { id } = req.params
    const { date } = req.query
    const tenantId = req.headers['x-tenant-id'] as string

    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID required' })
    }

    if (!date) {
      return res.status(400).json({ error: 'Date query parameter required' })
    }

    // Get room base price
    const { data: room, error: roomError } = await supabase
      .from('rooms')
      .select('base_price_per_night, currency')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .single()

    if (roomError || !room) {
      return res.status(404).json({ error: 'Room not found' })
    }

    // Check for seasonal rate on this date
    const { data: rates, error: ratesError } = await supabase
      .from('seasonal_rates')
      .select('*')
      .eq('room_id', id)
      .eq('tenant_id', tenantId)
      .lte('start_date', date)
      .gte('end_date', date)
      .order('priority', { ascending: false })
      .limit(1)

    if (ratesError) {
      console.error('Error fetching seasonal rates:', ratesError)
    }

    const seasonalRate = rates && rates.length > 0 ? rates[0] : null

    res.json({
      date,
      base_price: room.base_price_per_night,
      effective_price: seasonalRate ? seasonalRate.price_per_night : room.base_price_per_night,
      seasonal_rate: seasonalRate ? {
        id: seasonalRate.id,
        name: seasonalRate.name,
        price_per_night: seasonalRate.price_per_night
      } : null,
      currency: room.currency
    })
  } catch (error) {
    console.error('Unexpected error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Get batch prices for a date range (for booking wizard)
router.get('/:id/prices', async (req, res) => {
  try {
    const { id } = req.params
    const { start_date, end_date } = req.query
    const tenantId = req.headers['x-tenant-id'] as string

    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID required' })
    }

    if (!start_date || !end_date) {
      return res.status(400).json({ error: 'start_date and end_date query parameters required' })
    }

    // Get room base price
    const { data: room, error: roomError } = await supabase
      .from('rooms')
      .select('base_price_per_night, currency')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .single()

    if (roomError || !room) {
      return res.status(404).json({ error: 'Room not found' })
    }

    // Get all seasonal rates that overlap with the date range
    const { data: rates, error: ratesError } = await supabase
      .from('seasonal_rates')
      .select('*')
      .eq('room_id', id)
      .eq('tenant_id', tenantId)
      .lte('start_date', end_date)
      .gte('end_date', start_date)
      .order('priority', { ascending: false })

    if (ratesError) {
      console.error('Error fetching seasonal rates:', ratesError)
    }

    // Calculate prices for each night
    const nights: Array<{
      date: string
      base_price: number
      effective_price: number
      seasonal_rate: { id: string; name: string; price_per_night: number } | null
    }> = []

    const startDate = new Date(start_date as string)
    const endDate = new Date(end_date as string)
    let totalAmount = 0

    const currentDate = new Date(startDate)
    while (currentDate < endDate) {
      const dateStr = currentDate.toISOString().split('T')[0]

      // Find applicable seasonal rate (highest priority that includes this date)
      const applicableRate = (rates || []).find(rate => {
        const rateStart = new Date(rate.start_date)
        const rateEnd = new Date(rate.end_date)
        return currentDate >= rateStart && currentDate <= rateEnd
      })

      const effectivePrice = applicableRate ? applicableRate.price_per_night : room.base_price_per_night
      totalAmount += effectivePrice

      nights.push({
        date: dateStr,
        base_price: room.base_price_per_night,
        effective_price: effectivePrice,
        seasonal_rate: applicableRate ? {
          id: applicableRate.id,
          name: applicableRate.name,
          price_per_night: applicableRate.price_per_night
        } : null
      })

      currentDate.setDate(currentDate.getDate() + 1)
    }

    res.json({
      nights,
      total_amount: totalAmount,
      currency: room.currency,
      night_count: nights.length
    })
  } catch (error) {
    console.error('Unexpected error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router

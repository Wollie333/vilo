import { Router } from 'express'
import { supabase } from '../lib/supabase.js'

const router = Router()

// ============================================
// COUPONS CRUD
// ============================================

// Get all coupons for a tenant
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

    const { is_active, room_id, search } = req.query

    let query = supabase
      .from('coupons')
      .select('*')
      .eq('tenant_id', tenantId)

    if (is_active !== undefined) {
      query = query.eq('is_active', is_active === 'true')
    }

    if (search) {
      query = query.or(`code.ilike.%${search}%,name.ilike.%${search}%`)
    }

    const { data, error } = await query.order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching coupons:', error)
      return res.status(500).json({ error: 'Failed to fetch coupons', details: error.message })
    }

    // Filter by room_id if provided (coupons applicable to this room or all rooms)
    let filteredData = data || []
    if (room_id && typeof room_id === 'string') {
      filteredData = filteredData.filter(coupon => {
        // Empty array means applicable to all rooms
        if (!coupon.applicable_room_ids || coupon.applicable_room_ids.length === 0) {
          return true
        }
        return coupon.applicable_room_ids.includes(room_id)
      })
    }

    res.json(filteredData)
  } catch (error: any) {
    console.error('Unexpected error:', error)
    res.status(500).json({ error: 'Internal server error', details: error.message })
  }
})

// Get single coupon by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const tenantId = req.headers['x-tenant-id'] as string

    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID required' })
    }

    const { data, error } = await supabase
      .from('coupons')
      .select('*')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: 'Coupon not found' })
      }
      return res.status(500).json({ error: 'Failed to fetch coupon' })
    }

    res.json(data)
  } catch (error) {
    console.error('Unexpected error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Create new coupon
router.post('/', async (req, res) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string
    const {
      code,
      name,
      description,
      discount_type,
      discount_value,
      applicable_room_ids = [],
      valid_from,
      valid_until,
      max_uses,
      max_uses_per_customer,
      min_booking_amount,
      min_nights,
      is_active = true,
      is_claimable = false
    } = req.body

    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID required' })
    }

    if (!code || !name || !discount_type || discount_value === undefined) {
      return res.status(400).json({ error: 'Missing required fields: code, name, discount_type, discount_value' })
    }

    // Validate discount type
    if (!['percentage', 'fixed_amount', 'free_nights'].includes(discount_type)) {
      return res.status(400).json({ error: 'Invalid discount_type. Must be: percentage, fixed_amount, or free_nights' })
    }

    // Validate discount value
    if (discount_value <= 0) {
      return res.status(400).json({ error: 'discount_value must be greater than 0' })
    }

    if (discount_type === 'percentage' && discount_value > 100) {
      return res.status(400).json({ error: 'Percentage discount cannot exceed 100' })
    }

    const { data, error } = await supabase
      .from('coupons')
      .insert({
        tenant_id: tenantId,
        code: code.toUpperCase().trim(),
        name,
        description,
        discount_type,
        discount_value,
        applicable_room_ids,
        valid_from: valid_from || null,
        valid_until: valid_until || null,
        max_uses: max_uses || null,
        max_uses_per_customer: max_uses_per_customer || null,
        min_booking_amount: min_booking_amount || null,
        min_nights: min_nights || null,
        is_active,
        is_claimable
      })
      .select()
      .single()

    if (error) {
      if (error.code === '23505') {
        return res.status(409).json({ error: 'A coupon with this code already exists' })
      }
      console.error('Error creating coupon:', error)
      return res.status(500).json({ error: 'Failed to create coupon', details: error.message })
    }

    res.status(201).json(data)
  } catch (error: any) {
    console.error('Unexpected error:', error)
    res.status(500).json({ error: 'Internal server error', details: error.message })
  }
})

// Update coupon
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
    delete updateData.current_uses // Prevent manual manipulation of usage counter

    // Normalize code to uppercase
    if (updateData.code) {
      updateData.code = updateData.code.toUpperCase().trim()
    }

    // Validate discount type if provided
    if (updateData.discount_type && !['percentage', 'fixed_amount', 'free_nights'].includes(updateData.discount_type)) {
      return res.status(400).json({ error: 'Invalid discount_type' })
    }

    // Validate discount value if provided
    if (updateData.discount_value !== undefined && updateData.discount_value <= 0) {
      return res.status(400).json({ error: 'discount_value must be greater than 0' })
    }

    const { data, error } = await supabase
      .from('coupons')
      .update(updateData)
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .select()
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: 'Coupon not found' })
      }
      if (error.code === '23505') {
        return res.status(409).json({ error: 'A coupon with this code already exists' })
      }
      console.error('Error updating coupon:', error)
      return res.status(500).json({ error: 'Failed to update coupon', details: error.message })
    }

    res.json(data)
  } catch (error: any) {
    console.error('Unexpected error:', error)
    res.status(500).json({ error: 'Internal server error', details: error.message })
  }
})

// Delete coupon
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const tenantId = req.headers['x-tenant-id'] as string
    const { hard } = req.query

    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID required' })
    }

    if (hard === 'true') {
      // Hard delete
      const { error } = await supabase
        .from('coupons')
        .delete()
        .eq('id', id)
        .eq('tenant_id', tenantId)

      if (error) {
        console.error('Error deleting coupon:', error)
        return res.status(500).json({ error: 'Failed to delete coupon' })
      }
    } else {
      // Soft delete
      const { error } = await supabase
        .from('coupons')
        .update({ is_active: false })
        .eq('id', id)
        .eq('tenant_id', tenantId)

      if (error) {
        console.error('Error deactivating coupon:', error)
        return res.status(500).json({ error: 'Failed to deactivate coupon' })
      }
    }

    res.status(204).send()
  } catch (error) {
    console.error('Unexpected error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// ============================================
// COUPON VALIDATION
// ============================================

// Validate a coupon code
router.post('/validate', async (req, res) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string
    const {
      code,
      room_id,
      room_ids = [],
      customer_email,
      subtotal,
      nights,
      check_in
    } = req.body

    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID required' })
    }

    if (!code) {
      return res.status(400).json({ valid: false, errors: ['Coupon code is required'] })
    }

    // Fetch coupon (case-insensitive)
    const { data: coupon, error } = await supabase
      .from('coupons')
      .select('*')
      .eq('tenant_id', tenantId)
      .ilike('code', code.trim())
      .single()

    if (error || !coupon) {
      return res.json({ valid: false, errors: ['Invalid coupon code'] })
    }

    // Validation checks
    const errors: string[] = []

    // 1. Check if active
    if (!coupon.is_active) {
      errors.push('This coupon is no longer active')
    }

    // 2. Check validity period
    if (coupon.valid_from && check_in && check_in < coupon.valid_from) {
      errors.push(`This coupon is valid from ${coupon.valid_from}`)
    }
    if (coupon.valid_until && check_in && check_in > coupon.valid_until) {
      errors.push('This coupon has expired')
    }

    // 3. Check room applicability
    const targetRoomIds = room_ids.length > 0 ? room_ids : (room_id ? [room_id] : [])
    if (coupon.applicable_room_ids && coupon.applicable_room_ids.length > 0 && targetRoomIds.length > 0) {
      const applicableToAny = targetRoomIds.some(
        (rid: string) => coupon.applicable_room_ids.includes(rid)
      )
      if (!applicableToAny) {
        errors.push('This coupon is not valid for the selected room(s)')
      }
    }

    // 4. Check total usage limit
    if (coupon.max_uses !== null && coupon.current_uses >= coupon.max_uses) {
      errors.push('This coupon has reached its maximum usage limit')
    }

    // 5. Check per-customer limit
    if (coupon.max_uses_per_customer !== null && customer_email) {
      const { count } = await supabase
        .from('coupon_usage')
        .select('*', { count: 'exact', head: true })
        .eq('coupon_id', coupon.id)
        .ilike('customer_email', customer_email)

      if (count !== null && count >= coupon.max_uses_per_customer) {
        errors.push('You have already used this coupon the maximum number of times')
      }
    }

    // 6. Check minimum booking amount
    if (coupon.min_booking_amount !== null && subtotal !== undefined && subtotal < coupon.min_booking_amount) {
      errors.push(`Minimum booking amount of ${coupon.min_booking_amount} required`)
    }

    // 7. Check minimum nights
    if (coupon.min_nights !== null && nights !== undefined && nights < coupon.min_nights) {
      errors.push(`Minimum stay of ${coupon.min_nights} night${coupon.min_nights > 1 ? 's' : ''} required`)
    }

    if (errors.length > 0) {
      return res.json({ valid: false, errors })
    }

    // Calculate discount amount
    let discountAmount = 0
    const effectiveSubtotal = subtotal || 0
    const effectiveNights = nights || 1

    switch (coupon.discount_type) {
      case 'percentage':
        discountAmount = (effectiveSubtotal * coupon.discount_value) / 100
        break
      case 'fixed_amount':
        discountAmount = Math.min(coupon.discount_value, effectiveSubtotal)
        break
      case 'free_nights':
        if (effectiveNights > 0) {
          const nightlyRate = effectiveSubtotal / effectiveNights
          const freeNights = Math.min(coupon.discount_value, effectiveNights)
          discountAmount = nightlyRate * freeNights
        }
        break
    }

    // Round to 2 decimal places
    discountAmount = Math.round(discountAmount * 100) / 100

    res.json({
      valid: true,
      coupon: {
        id: coupon.id,
        code: coupon.code,
        name: coupon.name,
        description: coupon.description,
        discount_type: coupon.discount_type,
        discount_value: coupon.discount_value
      },
      discount_amount: discountAmount,
      final_amount: Math.round((effectiveSubtotal - discountAmount) * 100) / 100
    })
  } catch (error: any) {
    console.error('Unexpected error:', error)
    res.status(500).json({ error: 'Internal server error', details: error.message })
  }
})

// ============================================
// COUPON USAGE TRACKING
// ============================================

// Get usage history for a coupon
router.get('/:id/usage', async (req, res) => {
  try {
    const { id } = req.params
    const tenantId = req.headers['x-tenant-id'] as string

    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID required' })
    }

    const { data, error } = await supabase
      .from('coupon_usage')
      .select(`
        *,
        bookings (
          id,
          guest_name,
          room_name,
          check_in,
          check_out
        )
      `)
      .eq('coupon_id', id)
      .eq('tenant_id', tenantId)
      .order('used_at', { ascending: false })

    if (error) {
      console.error('Error fetching coupon usage:', error)
      return res.status(500).json({ error: 'Failed to fetch coupon usage' })
    }

    res.json(data || [])
  } catch (error) {
    console.error('Unexpected error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Record coupon usage (internal helper - typically called when creating a booking)
export async function recordCouponUsage(
  tenantId: string,
  couponId: string,
  bookingId: string,
  customerEmail: string,
  discountApplied: number,
  originalAmount: number,
  finalAmount: number
): Promise<boolean> {
  try {
    // Record usage
    const { error: usageError } = await supabase
      .from('coupon_usage')
      .insert({
        tenant_id: tenantId,
        coupon_id: couponId,
        booking_id: bookingId,
        customer_email: customerEmail.toLowerCase(),
        discount_applied: discountApplied,
        original_amount: originalAmount,
        final_amount: finalAmount
      })

    if (usageError) {
      console.error('Error recording coupon usage:', usageError)
      return false
    }

    // Increment current_uses counter
    const { error: updateError } = await supabase.rpc('increment_coupon_uses', { coupon_id: couponId })

    // If RPC doesn't exist, fall back to manual increment
    if (updateError) {
      const { data: coupon } = await supabase
        .from('coupons')
        .select('current_uses')
        .eq('id', couponId)
        .single()

      if (coupon) {
        await supabase
          .from('coupons')
          .update({ current_uses: (coupon.current_uses || 0) + 1 })
          .eq('id', couponId)
      }
    }

    return true
  } catch (error) {
    console.error('Error in recordCouponUsage:', error)
    return false
  }
}

export default router

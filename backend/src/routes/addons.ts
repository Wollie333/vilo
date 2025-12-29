import { Router } from 'express'
import { supabase } from '../lib/supabase.js'

const router = Router()

// ============================================
// ADD-ONS CRUD
// ============================================

// Get all add-ons for a tenant
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
    const { is_active, addon_type, search } = req.query

    let query = supabase
      .from('addons')
      .select('*')
      .eq('tenant_id', tenantId)

    if (is_active !== undefined) {
      query = query.eq('is_active', is_active === 'true')
    }

    if (addon_type) {
      query = query.eq('addon_type', addon_type)
    }

    if (search) {
      query = query.ilike('name', `%${search}%`)
    }

    const { data, error } = await query.order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching add-ons:', error)
      return res.status(500).json({ error: 'Failed to fetch add-ons', details: error.message })
    }

    res.json(data || [])
  } catch (error: any) {
    console.error('Unexpected error:', error)
    res.status(500).json({ error: 'Internal server error', details: error.message })
  }
})

// Get single add-on by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const tenantId = req.headers['x-tenant-id'] as string

    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID required' })
    }

    const { data, error } = await supabase
      .from('addons')
      .select('*')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: 'Add-on not found' })
      }
      return res.status(500).json({ error: 'Failed to fetch add-on' })
    }

    res.json(data)
  } catch (error) {
    console.error('Unexpected error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Create new add-on
router.post('/', async (req, res) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string
    const {
      name,
      description,
      addon_code,
      addon_type = 'service',
      price,
      currency = 'ZAR',
      pricing_type = 'per_booking',
      max_quantity = 1,
      image = null,
      available_for_rooms = [],
      is_active = true
    } = req.body

    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID required' })
    }

    if (!name || price === undefined) {
      return res.status(400).json({ error: 'Missing required fields: name, price' })
    }

    const { data, error } = await supabase
      .from('addons')
      .insert({
        tenant_id: tenantId,
        name,
        description,
        addon_code,
        addon_type,
        price,
        currency,
        pricing_type,
        max_quantity,
        image,
        available_for_rooms,
        is_active
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating add-on:', error)
      return res.status(500).json({ error: 'Failed to create add-on', details: error.message })
    }

    res.status(201).json(data)
  } catch (error: any) {
    console.error('Unexpected error:', error)
    res.status(500).json({ error: 'Internal server error', details: error.message })
  }
})

// Update add-on
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
      .from('addons')
      .update(updateData)
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .select()
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: 'Add-on not found' })
      }
      console.error('Error updating add-on:', error)
      return res.status(500).json({ error: 'Failed to update add-on', details: error.message })
    }

    res.json(data)
  } catch (error: any) {
    console.error('Unexpected error:', error)
    res.status(500).json({ error: 'Internal server error', details: error.message })
  }
})

// Delete add-on (soft delete via is_active = false)
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
        .from('addons')
        .delete()
        .eq('id', id)
        .eq('tenant_id', tenantId)

      if (error) {
        console.error('Error deleting add-on:', error)
        return res.status(500).json({ error: 'Failed to delete add-on' })
      }
    } else {
      // Soft delete
      const { error } = await supabase
        .from('addons')
        .update({ is_active: false })
        .eq('id', id)
        .eq('tenant_id', tenantId)

      if (error) {
        console.error('Error deactivating add-on:', error)
        return res.status(500).json({ error: 'Failed to deactivate add-on' })
      }
    }

    res.status(204).send()
  } catch (error) {
    console.error('Unexpected error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router

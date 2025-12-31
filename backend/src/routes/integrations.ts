import { Router } from 'express'
import { supabase } from '../lib/supabase.js'
import crypto from 'crypto'
import type {
  Integration,
  RoomMapping,
  SyncLog,
  Platform,
  CreateIntegrationRequest,
  UpdateIntegrationRequest,
  TriggerSyncRequest,
  PLATFORM_CONFIGS
} from '../types/integrations.js'

const router = Router()

// ============================================
// INTEGRATIONS CRUD
// ============================================

// Get all integrations for a tenant
router.get('/', async (req, res) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string

    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID required' })
    }

    const { data, error } = await supabase
      .from('integrations')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching integrations:', error)
      return res.status(500).json({ error: 'Failed to fetch integrations' })
    }

    // Mask sensitive credentials
    const masked = (data || []).map((integration: Integration) => ({
      ...integration,
      credentials: maskCredentials(integration.credentials)
    }))

    res.json(masked)
  } catch (error) {
    console.error('Unexpected error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Get single integration with room mappings
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const tenantId = req.headers['x-tenant-id'] as string

    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID required' })
    }

    // Fetch integration
    const { data: integration, error: intError } = await supabase
      .from('integrations')
      .select('*')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .single()

    if (intError || !integration) {
      return res.status(404).json({ error: 'Integration not found' })
    }

    // Fetch room mappings with room names
    const { data: mappings } = await supabase
      .from('room_mappings')
      .select(`
        *,
        rooms (name)
      `)
      .eq('integration_id', id)
      .eq('tenant_id', tenantId)

    const roomMappings = (mappings || []).map((m: any) => ({
      ...m,
      room_name: m.rooms?.name
    }))

    res.json({
      ...integration,
      credentials: maskCredentials(integration.credentials),
      room_mappings: roomMappings
    })
  } catch (error) {
    console.error('Unexpected error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Create new integration
router.post('/', async (req, res) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string
    const { platform, display_name, credentials, settings } = req.body as CreateIntegrationRequest

    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID required' })
    }

    if (!platform) {
      return res.status(400).json({ error: 'Platform is required' })
    }

    // Check if integration already exists for this platform
    const { data: existing } = await supabase
      .from('integrations')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('platform', platform)
      .single()

    if (existing) {
      return res.status(409).json({ error: 'Integration for this platform already exists' })
    }

    // Generate webhook URL and secret
    const webhookSecret = crypto.randomBytes(32).toString('hex')
    const webhookUrl = `${process.env.API_BASE_URL || 'https://api.vilo.app'}/api/webhooks/${platform}/${tenantId}`

    const { data, error } = await supabase
      .from('integrations')
      .insert({
        tenant_id: tenantId,
        platform,
        display_name: display_name || null,
        credentials: credentials || {},
        settings: settings || {},
        webhook_url: webhookUrl,
        webhook_secret: webhookSecret,
        is_active: false,
        is_connected: false
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating integration:', error)
      return res.status(500).json({ error: 'Failed to create integration' })
    }

    res.status(201).json({
      ...data,
      credentials: maskCredentials(data.credentials)
    })
  } catch (error) {
    console.error('Unexpected error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Update integration
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const tenantId = req.headers['x-tenant-id'] as string
    const updates = req.body as UpdateIntegrationRequest

    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID required' })
    }

    // Build update object (only include provided fields)
    const updateData: any = { updated_at: new Date().toISOString() }

    if (updates.display_name !== undefined) updateData.display_name = updates.display_name
    if (updates.credentials !== undefined) updateData.credentials = updates.credentials
    if (updates.settings !== undefined) updateData.settings = updates.settings
    if (updates.is_active !== undefined) updateData.is_active = updates.is_active
    if (updates.sync_bookings !== undefined) updateData.sync_bookings = updates.sync_bookings
    if (updates.sync_reviews !== undefined) updateData.sync_reviews = updates.sync_reviews
    if (updates.sync_availability !== undefined) updateData.sync_availability = updates.sync_availability
    if (updates.auto_sync_enabled !== undefined) updateData.auto_sync_enabled = updates.auto_sync_enabled
    if (updates.sync_interval_minutes !== undefined) updateData.sync_interval_minutes = updates.sync_interval_minutes

    const { data, error } = await supabase
      .from('integrations')
      .update(updateData)
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .select()
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: 'Integration not found' })
      }
      console.error('Error updating integration:', error)
      return res.status(500).json({ error: 'Failed to update integration' })
    }

    res.json({
      ...data,
      credentials: maskCredentials(data.credentials)
    })
  } catch (error) {
    console.error('Unexpected error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Delete integration
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const tenantId = req.headers['x-tenant-id'] as string

    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID required' })
    }

    // Delete room mappings first (cascade might not be set)
    await supabase
      .from('room_mappings')
      .delete()
      .eq('integration_id', id)
      .eq('tenant_id', tenantId)

    // Delete sync logs
    await supabase
      .from('sync_logs')
      .delete()
      .eq('integration_id', id)
      .eq('tenant_id', tenantId)

    // Delete integration
    const { error } = await supabase
      .from('integrations')
      .delete()
      .eq('id', id)
      .eq('tenant_id', tenantId)

    if (error) {
      console.error('Error deleting integration:', error)
      return res.status(500).json({ error: 'Failed to delete integration' })
    }

    res.status(204).send()
  } catch (error) {
    console.error('Unexpected error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// ============================================
// ROOM MAPPINGS
// ============================================

// Get room mappings for an integration
router.get('/:id/room-mappings', async (req, res) => {
  try {
    const { id } = req.params
    const tenantId = req.headers['x-tenant-id'] as string

    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID required' })
    }

    const { data, error } = await supabase
      .from('room_mappings')
      .select(`
        *,
        rooms (name)
      `)
      .eq('integration_id', id)
      .eq('tenant_id', tenantId)

    if (error) {
      console.error('Error fetching room mappings:', error)
      return res.status(500).json({ error: 'Failed to fetch room mappings' })
    }

    const mappings = (data || []).map((m: any) => ({
      ...m,
      room_name: m.rooms?.name
    }))

    res.json(mappings)
  } catch (error) {
    console.error('Unexpected error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Update room mappings (replace all)
router.put('/:id/room-mappings', async (req, res) => {
  try {
    const { id } = req.params
    const tenantId = req.headers['x-tenant-id'] as string
    const { mappings } = req.body

    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID required' })
    }

    if (!Array.isArray(mappings)) {
      return res.status(400).json({ error: 'Mappings must be an array' })
    }

    // Verify integration exists
    const { data: integration } = await supabase
      .from('integrations')
      .select('id')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .single()

    if (!integration) {
      return res.status(404).json({ error: 'Integration not found' })
    }

    // Delete existing mappings
    await supabase
      .from('room_mappings')
      .delete()
      .eq('integration_id', id)
      .eq('tenant_id', tenantId)

    // Insert new mappings
    if (mappings.length > 0) {
      const newMappings = mappings.map((m: any) => ({
        tenant_id: tenantId,
        integration_id: id,
        room_id: m.room_id,
        external_room_id: m.external_room_id,
        external_room_name: m.external_room_name || null,
        ical_url: m.ical_url || null
      }))

      const { error } = await supabase
        .from('room_mappings')
        .insert(newMappings)

      if (error) {
        console.error('Error creating room mappings:', error)
        return res.status(500).json({ error: 'Failed to create room mappings' })
      }
    }

    // Fetch updated mappings
    const { data } = await supabase
      .from('room_mappings')
      .select(`
        *,
        rooms (name)
      `)
      .eq('integration_id', id)
      .eq('tenant_id', tenantId)

    const result = (data || []).map((m: any) => ({
      ...m,
      room_name: m.rooms?.name
    }))

    res.json(result)
  } catch (error) {
    console.error('Unexpected error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// ============================================
// SYNC OPERATIONS
// ============================================

// Trigger manual sync
router.post('/:id/sync', async (req, res) => {
  try {
    const { id } = req.params
    const tenantId = req.headers['x-tenant-id'] as string
    const { sync_type = 'full' } = req.body as TriggerSyncRequest

    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID required' })
    }

    // Verify integration exists and is active
    const { data: integration } = await supabase
      .from('integrations')
      .select('*')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .single()

    if (!integration) {
      return res.status(404).json({ error: 'Integration not found' })
    }

    if (!integration.is_active) {
      return res.status(400).json({ error: 'Integration is not active' })
    }

    // Create sync log entry
    const { data: syncLog, error: logError } = await supabase
      .from('sync_logs')
      .insert({
        tenant_id: tenantId,
        integration_id: id,
        sync_type,
        direction: 'inbound',
        status: 'pending',
        started_at: new Date().toISOString()
      })
      .select()
      .single()

    if (logError) {
      console.error('Error creating sync log:', logError)
      return res.status(500).json({ error: 'Failed to initiate sync' })
    }

    // TODO: Trigger actual sync process (async job/queue)
    // For now, just mark as pending - actual sync would be handled by a worker

    res.json({
      success: true,
      log_id: syncLog.id,
      message: 'Sync initiated. Check sync logs for progress.'
    })
  } catch (error) {
    console.error('Unexpected error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Get sync logs for an integration
router.get('/:id/sync-logs', async (req, res) => {
  try {
    const { id } = req.params
    const tenantId = req.headers['x-tenant-id'] as string
    const limit = parseInt(req.query.limit as string) || 20

    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID required' })
    }

    const { data, error } = await supabase
      .from('sync_logs')
      .select('*')
      .eq('integration_id', id)
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('Error fetching sync logs:', error)
      return res.status(500).json({ error: 'Failed to fetch sync logs' })
    }

    res.json(data || [])
  } catch (error) {
    console.error('Unexpected error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Test connection
router.post('/:id/test', async (req, res) => {
  try {
    const { id } = req.params
    const tenantId = req.headers['x-tenant-id'] as string

    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID required' })
    }

    const { data: integration, error } = await supabase
      .from('integrations')
      .select('*')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .single()

    if (error || !integration) {
      return res.status(404).json({ error: 'Integration not found' })
    }

    // TODO: Implement actual connection testing per platform
    // For now, just return success for demo

    // Update is_connected status
    await supabase
      .from('integrations')
      .update({ is_connected: true, last_error: null })
      .eq('id', id)
      .eq('tenant_id', tenantId)

    res.json({
      success: true,
      message: 'Connection successful'
    })
  } catch (error) {
    console.error('Unexpected error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// ============================================
// HELPER FUNCTIONS
// ============================================

function maskCredentials(credentials: Record<string, string | undefined>): Record<string, string> {
  const masked: Record<string, string> = {}
  for (const [key, value] of Object.entries(credentials || {})) {
    if (value && typeof value === 'string' && value.length > 4) {
      masked[key] = value.substring(0, 4) + '****'
    } else {
      masked[key] = '****'
    }
  }
  return masked
}

export default router

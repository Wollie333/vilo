import { Router } from 'express'
import { supabase } from '../lib/supabase.js'
import crypto from 'crypto'
import { fetchICalFeed, parseICalFeed, validateICalUrl } from '../services/icalService.js'
import { notifySyncCompleted, notifySyncFailed } from '../services/notificationService.js'
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
    const removeBookings = req.query.remove_bookings === 'true'

    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID required' })
    }

    // Get integration to find the platform (needed for removing bookings)
    const { data: integration } = await supabase
      .from('integrations')
      .select('platform')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .single()

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

    // Optionally delete synced bookings from this platform
    if (removeBookings && integration) {
      await supabase
        .from('bookings')
        .delete()
        .eq('tenant_id', tenantId)
        .eq('source', integration.platform)
    }

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

// Get count of synced bookings for an integration
router.get('/:id/synced-bookings/count', async (req, res) => {
  try {
    const { id } = req.params
    const tenantId = req.headers['x-tenant-id'] as string

    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID required' })
    }

    // Get integration to find the platform
    const { data: integration, error: fetchError } = await supabase
      .from('integrations')
      .select('platform')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .single()

    if (fetchError || !integration) {
      return res.status(404).json({ error: 'Integration not found' })
    }

    // Count bookings from this platform
    const { count, error: countError } = await supabase
      .from('bookings')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('source', integration.platform)

    if (countError) {
      console.error('Error counting synced bookings:', countError)
      return res.status(500).json({ error: 'Failed to count synced bookings' })
    }

    res.json({
      platform: integration.platform,
      count: count || 0
    })
  } catch (error) {
    console.error('Unexpected error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Delete synced bookings for an integration (without deleting the integration)
router.delete('/:id/synced-bookings', async (req, res) => {
  try {
    const { id } = req.params
    const tenantId = req.headers['x-tenant-id'] as string

    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID required' })
    }

    // Get integration to find the platform
    const { data: integration, error: fetchError } = await supabase
      .from('integrations')
      .select('platform')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .single()

    if (fetchError || !integration) {
      return res.status(404).json({ error: 'Integration not found' })
    }

    // Delete all bookings from this platform
    const { data: deleted, error: deleteError } = await supabase
      .from('bookings')
      .delete()
      .eq('tenant_id', tenantId)
      .eq('source', integration.platform)
      .select('id')

    if (deleteError) {
      console.error('Error deleting synced bookings:', deleteError)
      return res.status(500).json({ error: 'Failed to delete synced bookings' })
    }

    res.json({
      success: true,
      deleted_count: deleted?.length || 0,
      message: `Deleted ${deleted?.length || 0} bookings from ${integration.platform}`
    })
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

    // Get room mappings with iCal URLs and room names
    const { data: mappings, error: mappingsError } = await supabase
      .from('room_mappings')
      .select('*, rooms(name)')
      .eq('integration_id', id)
      .eq('tenant_id', tenantId)

    if (mappingsError) {
      console.error('Error fetching room mappings:', mappingsError)
      return res.status(500).json({ error: 'Failed to fetch room mappings' })
    }

    // Create sync log entry
    const { data: syncLog, error: logError } = await supabase
      .from('sync_logs')
      .insert({
        tenant_id: tenantId,
        integration_id: id,
        sync_type,
        direction: 'inbound',
        status: 'in_progress',
        started_at: new Date().toISOString()
      })
      .select()
      .single()

    if (logError) {
      console.error('Error creating sync log:', logError)
      return res.status(500).json({ error: 'Failed to initiate sync' })
    }

    // Process iCal sync
    let recordsCreated = 0
    let recordsUpdated = 0
    let recordsSkipped = 0
    const errors: string[] = []
    const conflicts: string[] = []

    for (const mapping of mappings || []) {
      if (!mapping.ical_url) {
        recordsSkipped++
        continue
      }

      try {
        // Fetch and parse iCal feed
        console.log(`Syncing iCal from: ${mapping.ical_url} for room: ${mapping.room_id}`)
        const icalData = await fetchICalFeed(mapping.ical_url)
        const bookings = parseICalFeed(icalData, integration.platform)

        console.log(`Found ${bookings.length} bookings in iCal feed`)

        // Get existing bookings for this room to check for conflicts
        const { data: existingRoomBookings } = await supabase
          .from('bookings')
          .select('id, guest_name, check_in, check_out, external_id, source, status')
          .eq('tenant_id', tenantId)
          .eq('room_id', mapping.room_id)
          .neq('status', 'cancelled')

        for (const booking of bookings) {
          // Check if booking already exists by external_id
          const { data: existing } = await supabase
            .from('bookings')
            .select('id')
            .eq('external_id', booking.external_id)
            .eq('tenant_id', tenantId)
            .single()

          if (existing) {
            // Update existing booking
            const { error: updateError } = await supabase
              .from('bookings')
              .update({
                guest_name: booking.guest_name,
                check_in: booking.check_in,
                check_out: booking.check_out,
                notes: booking.notes || null,
                synced_at: new Date().toISOString()
              })
              .eq('id', existing.id)

            if (updateError) {
              console.error('Error updating booking:', updateError)
              errors.push(`Failed to update booking ${booking.external_id}`)
            } else {
              recordsUpdated++
            }
          } else {
            // Check for conflicts with existing bookings (different external_id means different source)
            const conflictingBookings = (existingRoomBookings || []).filter(existingBooking => {
              // Don't compare with same external_id
              if (existingBooking.external_id === booking.external_id) return false

              // Check for date overlap
              const newStart = new Date(booking.check_in)
              const newEnd = new Date(booking.check_out)
              const existStart = new Date(existingBooking.check_in)
              const existEnd = new Date(existingBooking.check_out)

              // Overlap occurs if: newStart < existEnd AND existStart < newEnd
              return newStart < existEnd && existStart < newEnd
            })

            if (conflictingBookings.length > 0) {
              const conflictInfo = conflictingBookings.map(c =>
                `${c.guest_name} (${c.source || 'vilo'}: ${c.check_in} to ${c.check_out})`
              ).join(', ')
              conflicts.push(
                `CONFLICT: ${booking.guest_name} (${integration.platform}: ${booking.check_in} to ${booking.check_out}) overlaps with ${conflictInfo}`
              )
              console.warn(`Booking conflict detected:`, conflicts[conflicts.length - 1])
            }

            // Create new booking (even with conflicts - the booking exists on the platform)
            const { error: insertError } = await supabase
              .from('bookings')
              .insert({
                tenant_id: tenantId,
                room_id: mapping.room_id,
                guest_name: booking.guest_name,
                check_in: booking.check_in,
                check_out: booking.check_out,
                status: conflictingBookings.length > 0 ? 'pending' : 'confirmed', // Mark conflicting as pending
                payment_status: 'pending',
                source: integration.platform,
                external_id: booking.external_id,
                synced_at: new Date().toISOString(),
                total_amount: 0,
                currency: 'ZAR',
                notes: conflictingBookings.length > 0
                  ? `${booking.notes || ''}\n[CONFLICT WARNING: Overlaps with existing booking]`.trim()
                  : (booking.notes || null)
              })

            if (insertError) {
              console.error('Error creating booking:', insertError)
              errors.push(`Failed to create booking ${booking.external_id}`)
            } else {
              recordsCreated++
            }
          }
        }
      } catch (error: any) {
        console.error(`Error syncing room ${mapping.room_id}:`, error.message)
        errors.push(`Room ${mapping.room_id}: ${error.message}`)
      }
    }

    // Update sync log with results
    const syncStatus = errors.length > 0 ? 'partial' : (conflicts.length > 0 ? 'warning' : 'success')
    await supabase
      .from('sync_logs')
      .update({
        status: syncStatus,
        completed_at: new Date().toISOString(),
        records_synced: recordsCreated + recordsUpdated,
        records_created: recordsCreated,
        records_updated: recordsUpdated,
        records_failed: errors.length,
        error_message: errors.length > 0
          ? errors.join('; ')
          : (conflicts.length > 0 ? `${conflicts.length} conflicts detected` : null)
      })
      .eq('id', syncLog.id)

    // Update integration last_synced_at
    await supabase
      .from('integrations')
      .update({
        last_synced_at: new Date().toISOString(),
        is_connected: true,
        last_error: errors.length > 0 ? errors[0] : (conflicts.length > 0 ? `${conflicts.length} booking conflicts` : null)
      })
      .eq('id', id)

    // Send sync notifications
    const totalSynced = recordsCreated + recordsUpdated
    const roomNames = (mappings || [])
      .filter((m: any) => m.ical_url)
      .map((m: any) => (m.rooms as any)?.name || 'Room')
      .filter((name: string, index: number, arr: string[]) => arr.indexOf(name) === index) // unique
    const roomSummary = roomNames.length > 1
      ? `${roomNames.length} rooms`
      : (roomNames[0] || 'Calendar')

    if (errors.length > 0 && totalSynced === 0) {
      // Complete failure
      notifySyncFailed(tenantId, {
        room_name: roomSummary,
        source: integration.platform,
        error: errors[0]
      })
    } else if (totalSynced > 0) {
      // Success (even with some errors)
      notifySyncCompleted(tenantId, {
        room_name: roomSummary,
        source: integration.platform,
        bookings_imported: totalSynced
      })
    }

    res.json({
      success: true,
      log_id: syncLog.id,
      records_created: recordsCreated,
      records_updated: recordsUpdated,
      records_skipped: recordsSkipped,
      conflicts_detected: conflicts.length,
      conflicts: conflicts.length > 0 ? conflicts : undefined,
      errors: errors.length > 0 ? errors : undefined,
      message: conflicts.length > 0
        ? `Sync completed with ${conflicts.length} conflicts. Created: ${recordsCreated}, Updated: ${recordsUpdated}`
        : `Sync completed. Created: ${recordsCreated}, Updated: ${recordsUpdated}`
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

    // Get room mappings to test iCal URLs
    const { data: mappings } = await supabase
      .from('room_mappings')
      .select('ical_url')
      .eq('integration_id', id)
      .eq('tenant_id', tenantId)

    let testedUrls = 0
    let validUrls = 0
    const errors: string[] = []

    for (const mapping of mappings || []) {
      if (mapping.ical_url) {
        testedUrls++
        const result = await validateICalUrl(mapping.ical_url)
        if (result.valid) {
          validUrls++
        } else {
          errors.push(result.error || 'Unknown error')
        }
      }
    }

    const isConnected = testedUrls === 0 || validUrls > 0

    // Update is_connected status
    await supabase
      .from('integrations')
      .update({
        is_connected: isConnected,
        last_error: errors.length > 0 ? errors[0] : null
      })
      .eq('id', id)
      .eq('tenant_id', tenantId)

    res.json({
      success: isConnected,
      tested: testedUrls,
      valid: validUrls,
      message: isConnected ? 'Connection successful' : 'Some iCal URLs failed',
      errors: errors.length > 0 ? errors : undefined
    })
  } catch (error) {
    console.error('Unexpected error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Validate iCal URL
router.post('/validate-ical', async (req, res) => {
  try {
    const { url } = req.body

    if (!url) {
      return res.status(400).json({ error: 'URL is required' })
    }

    const result = await validateICalUrl(url)

    res.json({
      valid: result.valid,
      eventCount: result.eventCount,
      error: result.error
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

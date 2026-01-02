import { Router, Response } from 'express'
import { supabase } from '../../lib/supabase.js'
import { SuperAdminRequest, requirePermission, logAdminAction, auditLog } from '../../middleware/superAdmin.js'
import crypto from 'crypto'

const router = Router()

// Webhook configurations stored in platform_settings
const WEBHOOK_CATEGORY = 'webhooks'

interface WebhookConfig {
  id: string
  name: string
  url: string
  events: string[]
  secret: string
  isActive: boolean
  lastTriggered?: string
  lastStatus?: 'success' | 'failed'
  failureCount: number
  createdAt: string
  updatedAt: string
}

/**
 * GET /api/admin/webhooks
 * List all webhook configurations
 */
router.get('/', requirePermission('integrations'), async (req: SuperAdminRequest, res: Response) => {
  try {
    const { data: settings, error } = await supabase
      .from('platform_settings')
      .select('*')
      .eq('category', WEBHOOK_CATEGORY)
      .order('key')

    if (error) {
      return res.status(500).json({ error: 'Failed to get webhooks' })
    }

    const webhooks = settings?.map(setting => {
      const value = setting.value as any
      return {
        id: setting.id,
        key: setting.key.replace('webhook_', ''),
        name: value?.name || setting.key,
        url: value?.url,
        events: value?.events || [],
        isActive: value?.isActive ?? true,
        lastTriggered: value?.lastTriggered,
        lastStatus: value?.lastStatus,
        failureCount: value?.failureCount || 0,
        createdAt: setting.created_at,
        updatedAt: setting.updated_at
      }
    }) || []

    res.json({ webhooks })
  } catch (error) {
    console.error('Get webhooks error:', error)
    res.status(500).json({ error: 'Failed to get webhooks' })
  }
})

/**
 * GET /api/admin/webhooks/events
 * Get available webhook event types
 */
router.get('/events', requirePermission('integrations'), async (req: SuperAdminRequest, res: Response) => {
  const events = [
    { name: 'tenant.created', description: 'When a new tenant registers' },
    { name: 'tenant.updated', description: 'When tenant details are updated' },
    { name: 'tenant.deleted', description: 'When a tenant is deleted' },
    { name: 'subscription.created', description: 'When a new subscription is created' },
    { name: 'subscription.updated', description: 'When a subscription is modified' },
    { name: 'subscription.cancelled', description: 'When a subscription is cancelled' },
    { name: 'payment.success', description: 'When a payment is successful' },
    { name: 'payment.failed', description: 'When a payment fails' },
    { name: 'booking.created', description: 'When a new booking is made' },
    { name: 'booking.confirmed', description: 'When a booking is confirmed' },
    { name: 'booking.cancelled', description: 'When a booking is cancelled' },
    { name: 'user.created', description: 'When a new user is created' },
    { name: 'user.deleted', description: 'When a user is deleted' },
    { name: 'error.critical', description: 'When a critical error occurs' }
  ]

  res.json({ events })
})

/**
 * GET /api/admin/webhooks/:id
 * Get a specific webhook configuration
 */
router.get('/:id', requirePermission('integrations'), async (req: SuperAdminRequest, res: Response) => {
  try {
    const { id } = req.params

    const { data: setting, error } = await supabase
      .from('platform_settings')
      .select('*')
      .eq('id', id)
      .eq('category', WEBHOOK_CATEGORY)
      .single()

    if (error || !setting) {
      return res.status(404).json({ error: 'Webhook not found' })
    }

    const value = setting.value as any

    res.json({
      id: setting.id,
      key: setting.key.replace('webhook_', ''),
      name: value?.name || setting.key,
      url: value?.url,
      events: value?.events || [],
      secret: value?.secret ? '********' : null, // Mask secret
      isActive: value?.isActive ?? true,
      lastTriggered: value?.lastTriggered,
      lastStatus: value?.lastStatus,
      failureCount: value?.failureCount || 0,
      recentDeliveries: value?.recentDeliveries || [],
      createdAt: setting.created_at,
      updatedAt: setting.updated_at
    })
  } catch (error) {
    console.error('Get webhook error:', error)
    res.status(500).json({ error: 'Failed to get webhook' })
  }
})

/**
 * POST /api/admin/webhooks
 * Create a new webhook
 */
router.post('/', requirePermission('integrations'), auditLog('webhook.create', 'webhook'), async (req: SuperAdminRequest, res: Response) => {
  try {
    const { name, url, events } = req.body

    if (!name || !url) {
      return res.status(400).json({ error: 'Name and URL are required' })
    }

    // Generate webhook secret
    const secret = crypto.randomBytes(32).toString('hex')

    const key = `webhook_${name.toLowerCase().replace(/\s+/g, '_')}_${Date.now()}`

    const { data: setting, error } = await supabase
      .from('platform_settings')
      .insert({
        key,
        value: {
          name,
          url,
          events: events || [],
          secret,
          isActive: true,
          failureCount: 0,
          recentDeliveries: []
        },
        category: WEBHOOK_CATEGORY,
        description: `Webhook: ${name}`,
        is_secret: true,
        updated_by: req.superAdmin?.id
      })
      .select()
      .single()

    if (error) {
      return res.status(500).json({ error: 'Failed to create webhook' })
    }

    res.json({
      success: true,
      webhook: {
        id: setting.id,
        name,
        url,
        events,
        secret, // Return secret only on creation
        isActive: true
      },
      message: 'Save the secret - it won\'t be shown again!'
    })
  } catch (error) {
    console.error('Create webhook error:', error)
    res.status(500).json({ error: 'Failed to create webhook' })
  }
})

/**
 * PUT /api/admin/webhooks/:id
 * Update a webhook
 */
router.put('/:id', requirePermission('integrations'), auditLog('webhook.update', 'webhook'), async (req: SuperAdminRequest, res: Response) => {
  try {
    const { id } = req.params
    const { name, url, events, isActive } = req.body

    // Get current value
    const { data: current } = await supabase
      .from('platform_settings')
      .select('value')
      .eq('id', id)
      .single()

    if (!current) {
      return res.status(404).json({ error: 'Webhook not found' })
    }

    const currentValue = current.value as any
    const newValue = {
      ...currentValue,
      name: name ?? currentValue.name,
      url: url ?? currentValue.url,
      events: events ?? currentValue.events,
      isActive: isActive ?? currentValue.isActive
    }

    const { error } = await supabase
      .from('platform_settings')
      .update({
        value: newValue,
        updated_by: req.superAdmin?.id,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)

    if (error) {
      return res.status(500).json({ error: 'Failed to update webhook' })
    }

    res.json({
      success: true,
      webhook: {
        id,
        name: newValue.name,
        url: newValue.url,
        events: newValue.events,
        isActive: newValue.isActive
      }
    })
  } catch (error) {
    console.error('Update webhook error:', error)
    res.status(500).json({ error: 'Failed to update webhook' })
  }
})

/**
 * POST /api/admin/webhooks/:id/regenerate-secret
 * Regenerate webhook secret
 */
router.post('/:id/regenerate-secret', requirePermission('integrations'), async (req: SuperAdminRequest, res: Response) => {
  try {
    const { id } = req.params

    // Get current value
    const { data: current } = await supabase
      .from('platform_settings')
      .select('value')
      .eq('id', id)
      .single()

    if (!current) {
      return res.status(404).json({ error: 'Webhook not found' })
    }

    // Generate new secret
    const newSecret = crypto.randomBytes(32).toString('hex')

    const currentValue = current.value as any
    const { error } = await supabase
      .from('platform_settings')
      .update({
        value: { ...currentValue, secret: newSecret },
        updated_by: req.superAdmin?.id,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)

    if (error) {
      return res.status(500).json({ error: 'Failed to regenerate secret' })
    }

    // Log the action
    if (req.superAdmin) {
      await logAdminAction({
        adminId: req.superAdmin.id,
        adminEmail: req.superAdmin.email,
        action: 'webhook.regenerate_secret',
        resourceType: 'webhook',
        resourceId: id,
        description: 'Regenerated webhook secret',
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      })
    }

    res.json({
      success: true,
      secret: newSecret,
      message: 'Save the new secret - it won\'t be shown again!'
    })
  } catch (error) {
    console.error('Regenerate secret error:', error)
    res.status(500).json({ error: 'Failed to regenerate secret' })
  }
})

/**
 * POST /api/admin/webhooks/:id/test
 * Send a test webhook
 */
router.post('/:id/test', requirePermission('integrations'), async (req: SuperAdminRequest, res: Response) => {
  try {
    const { id } = req.params

    // Get webhook config
    const { data: setting, error: fetchError } = await supabase
      .from('platform_settings')
      .select('value')
      .eq('id', id)
      .single()

    if (fetchError || !setting) {
      return res.status(404).json({ error: 'Webhook not found' })
    }

    const value = setting.value as any

    // Create test payload
    const testPayload = {
      event: 'webhook.test',
      timestamp: new Date().toISOString(),
      data: {
        message: 'This is a test webhook from Vilo Admin',
        webhookId: id
      }
    }

    // Create signature
    const signature = crypto
      .createHmac('sha256', value.secret || '')
      .update(JSON.stringify(testPayload))
      .digest('hex')

    // Send test webhook
    try {
      const response = await fetch(value.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Signature': signature,
          'X-Webhook-Event': 'webhook.test'
        },
        body: JSON.stringify(testPayload)
      })

      const success = response.ok

      // Update delivery history
      const delivery = {
        event: 'webhook.test',
        timestamp: new Date().toISOString(),
        success,
        statusCode: response.status,
        duration: 0 // Would need to measure actual duration
      }

      const recentDeliveries = [delivery, ...(value.recentDeliveries || [])].slice(0, 10)

      await supabase
        .from('platform_settings')
        .update({
          value: {
            ...value,
            lastTriggered: new Date().toISOString(),
            lastStatus: success ? 'success' : 'failed',
            recentDeliveries
          }
        })
        .eq('id', id)

      res.json({
        success,
        statusCode: response.status,
        message: success ? 'Test webhook sent successfully' : 'Webhook delivery failed'
      })
    } catch (err) {
      res.json({
        success: false,
        error: err instanceof Error ? err.message : 'Network error',
        message: 'Failed to deliver webhook'
      })
    }
  } catch (error) {
    console.error('Test webhook error:', error)
    res.status(500).json({ error: 'Failed to test webhook' })
  }
})

/**
 * DELETE /api/admin/webhooks/:id
 * Delete a webhook
 */
router.delete('/:id', requirePermission('integrations'), auditLog('webhook.delete', 'webhook'), async (req: SuperAdminRequest, res: Response) => {
  try {
    const { id } = req.params

    const { error } = await supabase
      .from('platform_settings')
      .delete()
      .eq('id', id)
      .eq('category', WEBHOOK_CATEGORY)

    if (error) {
      return res.status(500).json({ error: 'Failed to delete webhook' })
    }

    res.json({ success: true, message: 'Webhook deleted' })
  } catch (error) {
    console.error('Delete webhook error:', error)
    res.status(500).json({ error: 'Failed to delete webhook' })
  }
})

/**
 * POST /api/admin/webhooks/:id/toggle
 * Toggle webhook active status
 */
router.post('/:id/toggle', requirePermission('integrations'), async (req: SuperAdminRequest, res: Response) => {
  try {
    const { id } = req.params

    // Get current value
    const { data: current } = await supabase
      .from('platform_settings')
      .select('value')
      .eq('id', id)
      .single()

    if (!current) {
      return res.status(404).json({ error: 'Webhook not found' })
    }

    const currentValue = current.value as any
    const newActive = !currentValue.isActive

    const { error } = await supabase
      .from('platform_settings')
      .update({
        value: { ...currentValue, isActive: newActive },
        updated_by: req.superAdmin?.id,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)

    if (error) {
      return res.status(500).json({ error: 'Failed to toggle webhook' })
    }

    res.json({
      success: true,
      isActive: newActive,
      message: `Webhook ${newActive ? 'enabled' : 'disabled'}`
    })
  } catch (error) {
    console.error('Toggle webhook error:', error)
    res.status(500).json({ error: 'Failed to toggle webhook' })
  }
})

export default router

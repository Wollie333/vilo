import { Router, Response } from 'express'
import { supabase } from '../../lib/supabase.js'
import { SuperAdminRequest, requirePermission, logAdminAction, auditLog } from '../../middleware/superAdmin.js'

const router = Router()

/**
 * GET /api/admin/settings
 * Get all platform settings
 */
router.get('/', requirePermission('settings'), async (req: SuperAdminRequest, res: Response) => {
  try {
    const category = req.query.category as string

    let query = supabase
      .from('platform_settings')
      .select('*')
      .order('category')
      .order('key')

    if (category) {
      query = query.eq('category', category)
    }

    const { data: settings, error } = await query

    if (error) {
      console.error('Get settings error:', error)
      return res.status(500).json({ error: 'Failed to get settings' })
    }

    // Transform and mask secrets
    const transformedSettings = settings?.map(setting => ({
      id: setting.id,
      key: setting.key,
      value: setting.is_secret ? '********' : setting.value,
      category: setting.category,
      description: setting.description,
      isSecret: setting.is_secret,
      updatedAt: setting.updated_at
    })) || []

    // Group by category
    const grouped = transformedSettings.reduce((acc: Record<string, any[]>, setting) => {
      if (!acc[setting.category]) {
        acc[setting.category] = []
      }
      acc[setting.category].push(setting)
      return acc
    }, {})

    res.json({
      settings: transformedSettings,
      grouped
    })
  } catch (error) {
    console.error('Get settings error:', error)
    res.status(500).json({ error: 'Failed to get settings' })
  }
})

/**
 * GET /api/admin/settings/:key
 * Get a specific setting
 */
router.get('/:key', requirePermission('settings'), async (req: SuperAdminRequest, res: Response) => {
  try {
    const { key } = req.params

    const { data: setting, error } = await supabase
      .from('platform_settings')
      .select('*')
      .eq('key', key)
      .single()

    if (error || !setting) {
      return res.status(404).json({ error: 'Setting not found' })
    }

    res.json({
      id: setting.id,
      key: setting.key,
      value: setting.is_secret ? '********' : setting.value,
      category: setting.category,
      description: setting.description,
      isSecret: setting.is_secret,
      updatedAt: setting.updated_at
    })
  } catch (error) {
    console.error('Get setting error:', error)
    res.status(500).json({ error: 'Failed to get setting' })
  }
})

/**
 * PUT /api/admin/settings/:key
 * Update a setting
 */
router.put('/:key', requirePermission('settings'), auditLog('setting.update', 'platform_setting'), async (req: SuperAdminRequest, res: Response) => {
  try {
    const { key } = req.params
    const { value, description } = req.body

    // Get current value for audit log
    const { data: current } = await supabase
      .from('platform_settings')
      .select('value, is_secret')
      .eq('key', key)
      .single()

    // Update setting
    const { data: updated, error } = await supabase
      .from('platform_settings')
      .update({
        value,
        description: description ?? undefined,
        updated_by: req.superAdmin?.id,
        updated_at: new Date().toISOString()
      })
      .eq('key', key)
      .select()
      .single()

    if (error) {
      return res.status(500).json({ error: 'Failed to update setting' })
    }

    // Log the change
    if (req.superAdmin) {
      await logAdminAction({
        adminId: req.superAdmin.id,
        adminEmail: req.superAdmin.email,
        action: 'setting.update',
        resourceType: 'platform_setting',
        resourceId: updated.id,
        description: `Updated setting: ${key}`,
        changes: {
          value: {
            old: current?.is_secret ? '[REDACTED]' : current?.value,
            new: updated.is_secret ? '[REDACTED]' : value
          }
        },
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      })
    }

    res.json({
      success: true,
      setting: {
        key: updated.key,
        value: updated.is_secret ? '********' : updated.value,
        updatedAt: updated.updated_at
      }
    })
  } catch (error) {
    console.error('Update setting error:', error)
    res.status(500).json({ error: 'Failed to update setting' })
  }
})

/**
 * POST /api/admin/settings
 * Create a new setting
 */
router.post('/', requirePermission('settings'), auditLog('setting.create', 'platform_setting'), async (req: SuperAdminRequest, res: Response) => {
  try {
    const { key, value, category, description, isSecret } = req.body

    if (!key || value === undefined) {
      return res.status(400).json({ error: 'Key and value are required' })
    }

    // Check if key already exists
    const { data: existing } = await supabase
      .from('platform_settings')
      .select('id')
      .eq('key', key)
      .single()

    if (existing) {
      return res.status(409).json({ error: 'Setting with this key already exists' })
    }

    const { data: setting, error } = await supabase
      .from('platform_settings')
      .insert({
        key,
        value,
        category: category || 'general',
        description,
        is_secret: isSecret || false,
        updated_by: req.superAdmin?.id
      })
      .select()
      .single()

    if (error) {
      return res.status(500).json({ error: 'Failed to create setting' })
    }

    res.json({
      success: true,
      setting: {
        id: setting.id,
        key: setting.key,
        value: setting.is_secret ? '********' : setting.value,
        category: setting.category,
        description: setting.description,
        isSecret: setting.is_secret
      }
    })
  } catch (error) {
    console.error('Create setting error:', error)
    res.status(500).json({ error: 'Failed to create setting' })
  }
})

/**
 * DELETE /api/admin/settings/:key
 * Delete a setting
 */
router.delete('/:key', requirePermission('settings'), auditLog('setting.delete', 'platform_setting'), async (req: SuperAdminRequest, res: Response) => {
  try {
    const { key } = req.params

    const { error } = await supabase
      .from('platform_settings')
      .delete()
      .eq('key', key)

    if (error) {
      return res.status(500).json({ error: 'Failed to delete setting' })
    }

    res.json({ success: true, message: 'Setting deleted' })
  } catch (error) {
    console.error('Delete setting error:', error)
    res.status(500).json({ error: 'Failed to delete setting' })
  }
})

/**
 * GET /api/admin/settings/categories
 * Get all setting categories
 */
router.get('/meta/categories', requirePermission('settings'), async (req: SuperAdminRequest, res: Response) => {
  try {
    const { data: settings } = await supabase
      .from('platform_settings')
      .select('category')

    const categories = [...new Set(settings?.map(s => s.category) || [])]

    res.json({ categories })
  } catch (error) {
    console.error('Get categories error:', error)
    res.status(500).json({ error: 'Failed to get categories' })
  }
})

/**
 * POST /api/admin/settings/bulk
 * Bulk update settings
 */
router.post('/bulk', requirePermission('settings'), async (req: SuperAdminRequest, res: Response) => {
  try {
    const { settings } = req.body

    if (!Array.isArray(settings)) {
      return res.status(400).json({ error: 'Settings must be an array' })
    }

    const results: { key: string; success: boolean; error?: string }[] = []

    for (const { key, value } of settings) {
      try {
        const { error } = await supabase
          .from('platform_settings')
          .update({
            value,
            updated_by: req.superAdmin?.id,
            updated_at: new Date().toISOString()
          })
          .eq('key', key)

        if (error) {
          results.push({ key, success: false, error: error.message })
        } else {
          results.push({ key, success: true })
        }
      } catch (err) {
        results.push({ key, success: false, error: 'Update failed' })
      }
    }

    // Log the bulk update
    if (req.superAdmin) {
      await logAdminAction({
        adminId: req.superAdmin.id,
        adminEmail: req.superAdmin.email,
        action: 'setting.bulk_update',
        resourceType: 'platform_setting',
        description: `Bulk updated ${settings.length} settings`,
        metadata: { keys: settings.map((s: any) => s.key) },
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      })
    }

    const successCount = results.filter(r => r.success).length
    const failedCount = results.filter(r => !r.success).length

    res.json({
      success: failedCount === 0,
      message: `Updated ${successCount} settings${failedCount > 0 ? `, ${failedCount} failed` : ''}`,
      results
    })
  } catch (error) {
    console.error('Bulk update settings error:', error)
    res.status(500).json({ error: 'Failed to bulk update settings' })
  }
})

/**
 * GET /api/admin/settings/payment-gateways
 * Get payment gateway configurations
 */
router.get('/payment/gateways', requirePermission('settings'), async (req: SuperAdminRequest, res: Response) => {
  try {
    const { data: gateways, error } = await supabase
      .from('platform_payment_gateways')
      .select('*')
      .order('gateway_name')

    if (error) {
      return res.status(500).json({ error: 'Failed to get payment gateways' })
    }

    // Mask sensitive config values
    const maskedGateways = gateways?.map(gateway => ({
      id: gateway.id,
      gatewayName: gateway.gateway_name,
      displayName: gateway.display_name,
      description: gateway.description,
      isEnabled: gateway.is_enabled,
      isTestMode: gateway.is_test_mode,
      supportedCurrencies: gateway.supported_currencies,
      supportedCountries: gateway.supported_countries,
      healthStatus: gateway.health_status,
      lastHealthCheck: gateway.last_health_check,
      updatedAt: gateway.updated_at
    })) || []

    res.json({ gateways: maskedGateways })
  } catch (error) {
    console.error('Get payment gateways error:', error)
    res.status(500).json({ error: 'Failed to get payment gateways' })
  }
})

/**
 * PUT /api/admin/settings/payment-gateways/:name
 * Update payment gateway configuration
 */
router.put('/payment/gateways/:name', requirePermission('settings'), auditLog('payment_gateway.update', 'platform_payment_gateway'), async (req: SuperAdminRequest, res: Response) => {
  try {
    const { name } = req.params
    const { isEnabled, isTestMode, config, testConfig } = req.body

    const updateData: Record<string, any> = {
      updated_by: req.superAdmin?.id,
      updated_at: new Date().toISOString()
    }

    if (isEnabled !== undefined) updateData.is_enabled = isEnabled
    if (isTestMode !== undefined) updateData.is_test_mode = isTestMode
    if (config) updateData.config = config
    if (testConfig) updateData.test_config = testConfig

    const { error } = await supabase
      .from('platform_payment_gateways')
      .update(updateData)
      .eq('gateway_name', name)

    if (error) {
      return res.status(500).json({ error: 'Failed to update payment gateway' })
    }

    res.json({ success: true, message: 'Payment gateway updated' })
  } catch (error) {
    console.error('Update payment gateway error:', error)
    res.status(500).json({ error: 'Failed to update payment gateway' })
  }
})

export default router

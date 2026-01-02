import { Router, Response } from 'express'
import { supabase } from '../../lib/supabase.js'
import { SuperAdminRequest, requirePermission, logAdminAction, auditLog } from '../../middleware/superAdmin.js'

const router = Router()

// Feature flags are stored in platform_settings with category 'feature_flags'
const FEATURE_FLAG_CATEGORY = 'feature_flags'

interface FeatureFlag {
  key: string
  enabled: boolean
  description?: string
  targetType?: 'all' | 'percentage' | 'tenants' | 'plans'
  targetValue?: any
  createdAt?: string
  updatedAt?: string
}

/**
 * GET /api/admin/feature-flags
 * Get all feature flags
 */
router.get('/', requirePermission('settings'), async (req: SuperAdminRequest, res: Response) => {
  try {
    const { data: settings, error } = await supabase
      .from('platform_settings')
      .select('*')
      .eq('category', FEATURE_FLAG_CATEGORY)
      .order('key')

    if (error) {
      return res.status(500).json({ error: 'Failed to get feature flags' })
    }

    const flags = settings?.map(setting => {
      const value = setting.value as any
      return {
        id: setting.id,
        key: setting.key.replace('ff_', ''),
        enabled: value?.enabled ?? false,
        description: setting.description,
        targetType: value?.targetType || 'all',
        targetValue: value?.targetValue,
        createdAt: setting.created_at,
        updatedAt: setting.updated_at
      }
    }) || []

    res.json({ flags })
  } catch (error) {
    console.error('Get feature flags error:', error)
    res.status(500).json({ error: 'Failed to get feature flags' })
  }
})

/**
 * GET /api/admin/feature-flags/:key
 * Get a specific feature flag
 */
router.get('/:key', requirePermission('settings'), async (req: SuperAdminRequest, res: Response) => {
  try {
    const { key } = req.params

    const { data: setting, error } = await supabase
      .from('platform_settings')
      .select('*')
      .eq('key', `ff_${key}`)
      .eq('category', FEATURE_FLAG_CATEGORY)
      .single()

    if (error || !setting) {
      return res.status(404).json({ error: 'Feature flag not found' })
    }

    const value = setting.value as any

    res.json({
      id: setting.id,
      key: setting.key.replace('ff_', ''),
      enabled: value?.enabled ?? false,
      description: setting.description,
      targetType: value?.targetType || 'all',
      targetValue: value?.targetValue,
      createdAt: setting.created_at,
      updatedAt: setting.updated_at
    })
  } catch (error) {
    console.error('Get feature flag error:', error)
    res.status(500).json({ error: 'Failed to get feature flag' })
  }
})

/**
 * POST /api/admin/feature-flags
 * Create a new feature flag
 */
router.post('/', requirePermission('settings'), auditLog('feature_flag.create', 'feature_flag'), async (req: SuperAdminRequest, res: Response) => {
  try {
    const { key, enabled, description, targetType, targetValue } = req.body

    if (!key) {
      return res.status(400).json({ error: 'Feature flag key is required' })
    }

    // Check if already exists
    const { data: existing } = await supabase
      .from('platform_settings')
      .select('id')
      .eq('key', `ff_${key}`)
      .single()

    if (existing) {
      return res.status(409).json({ error: 'Feature flag already exists' })
    }

    const { data: setting, error } = await supabase
      .from('platform_settings')
      .insert({
        key: `ff_${key}`,
        value: {
          enabled: enabled ?? false,
          targetType: targetType || 'all',
          targetValue: targetValue
        },
        category: FEATURE_FLAG_CATEGORY,
        description,
        updated_by: req.superAdmin?.id
      })
      .select()
      .single()

    if (error) {
      return res.status(500).json({ error: 'Failed to create feature flag' })
    }

    res.json({
      success: true,
      flag: {
        id: setting.id,
        key,
        enabled: enabled ?? false,
        description,
        targetType: targetType || 'all',
        targetValue
      }
    })
  } catch (error) {
    console.error('Create feature flag error:', error)
    res.status(500).json({ error: 'Failed to create feature flag' })
  }
})

/**
 * PUT /api/admin/feature-flags/:key
 * Update a feature flag
 */
router.put('/:key', requirePermission('settings'), auditLog('feature_flag.update', 'feature_flag'), async (req: SuperAdminRequest, res: Response) => {
  try {
    const { key } = req.params
    const { enabled, description, targetType, targetValue } = req.body

    // Get current value
    const { data: current } = await supabase
      .from('platform_settings')
      .select('value')
      .eq('key', `ff_${key}`)
      .single()

    if (!current) {
      return res.status(404).json({ error: 'Feature flag not found' })
    }

    const currentValue = current.value as any
    const newValue = {
      enabled: enabled ?? currentValue?.enabled ?? false,
      targetType: targetType ?? currentValue?.targetType ?? 'all',
      targetValue: targetValue ?? currentValue?.targetValue
    }

    const { error } = await supabase
      .from('platform_settings')
      .update({
        value: newValue,
        description: description ?? undefined,
        updated_by: req.superAdmin?.id,
        updated_at: new Date().toISOString()
      })
      .eq('key', `ff_${key}`)

    if (error) {
      return res.status(500).json({ error: 'Failed to update feature flag' })
    }

    // Log the change
    if (req.superAdmin) {
      await logAdminAction({
        adminId: req.superAdmin.id,
        adminEmail: req.superAdmin.email,
        action: 'feature_flag.update',
        resourceType: 'feature_flag',
        description: `Updated feature flag: ${key}`,
        changes: {
          enabled: { old: currentValue?.enabled, new: newValue.enabled }
        },
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      })
    }

    res.json({
      success: true,
      flag: {
        key,
        ...newValue
      }
    })
  } catch (error) {
    console.error('Update feature flag error:', error)
    res.status(500).json({ error: 'Failed to update feature flag' })
  }
})

/**
 * POST /api/admin/feature-flags/:key/toggle
 * Toggle a feature flag on/off
 */
router.post('/:key/toggle', requirePermission('settings'), async (req: SuperAdminRequest, res: Response) => {
  try {
    const { key } = req.params

    // Get current value
    const { data: current, error: fetchError } = await supabase
      .from('platform_settings')
      .select('value')
      .eq('key', `ff_${key}`)
      .single()

    if (fetchError || !current) {
      return res.status(404).json({ error: 'Feature flag not found' })
    }

    const currentValue = current.value as any
    const newEnabled = !currentValue?.enabled

    const { error } = await supabase
      .from('platform_settings')
      .update({
        value: { ...currentValue, enabled: newEnabled },
        updated_by: req.superAdmin?.id,
        updated_at: new Date().toISOString()
      })
      .eq('key', `ff_${key}`)

    if (error) {
      return res.status(500).json({ error: 'Failed to toggle feature flag' })
    }

    // Log the change
    if (req.superAdmin) {
      await logAdminAction({
        adminId: req.superAdmin.id,
        adminEmail: req.superAdmin.email,
        action: 'feature_flag.toggle',
        resourceType: 'feature_flag',
        description: `Toggled feature flag ${key} to ${newEnabled ? 'enabled' : 'disabled'}`,
        changes: {
          enabled: { old: !newEnabled, new: newEnabled }
        },
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      })
    }

    res.json({
      success: true,
      key,
      enabled: newEnabled
    })
  } catch (error) {
    console.error('Toggle feature flag error:', error)
    res.status(500).json({ error: 'Failed to toggle feature flag' })
  }
})

/**
 * DELETE /api/admin/feature-flags/:key
 * Delete a feature flag
 */
router.delete('/:key', requirePermission('settings'), auditLog('feature_flag.delete', 'feature_flag'), async (req: SuperAdminRequest, res: Response) => {
  try {
    const { key } = req.params

    const { error } = await supabase
      .from('platform_settings')
      .delete()
      .eq('key', `ff_${key}`)
      .eq('category', FEATURE_FLAG_CATEGORY)

    if (error) {
      return res.status(500).json({ error: 'Failed to delete feature flag' })
    }

    res.json({ success: true, message: 'Feature flag deleted' })
  } catch (error) {
    console.error('Delete feature flag error:', error)
    res.status(500).json({ error: 'Failed to delete feature flag' })
  }
})

/**
 * GET /api/admin/feature-flags/check/:key
 * Check if a feature flag is enabled for a specific tenant
 */
router.get('/check/:key', async (req: SuperAdminRequest, res: Response) => {
  try {
    const { key } = req.params
    const tenantId = req.query.tenantId as string

    const { data: setting } = await supabase
      .from('platform_settings')
      .select('value')
      .eq('key', `ff_${key}`)
      .single()

    if (!setting) {
      return res.json({ enabled: false, reason: 'Flag not found' })
    }

    const value = setting.value as any

    // If globally disabled, return false
    if (!value?.enabled) {
      return res.json({ enabled: false, reason: 'Globally disabled' })
    }

    // Check targeting
    switch (value.targetType) {
      case 'all':
        return res.json({ enabled: true, reason: 'Enabled for all' })

      case 'percentage':
        // Use tenant ID hash to determine if enabled
        if (tenantId) {
          const hash = hashCode(tenantId)
          const percentage = value.targetValue || 0
          const enabled = (Math.abs(hash) % 100) < percentage
          return res.json({ enabled, reason: `${percentage}% rollout` })
        }
        return res.json({ enabled: false, reason: 'No tenant ID provided' })

      case 'tenants':
        const targetTenants = value.targetValue || []
        const enabled = targetTenants.includes(tenantId)
        return res.json({ enabled, reason: enabled ? 'Tenant in list' : 'Tenant not in list' })

      case 'plans':
        if (tenantId) {
          const { data: subscription } = await supabase
            .from('tenant_subscriptions')
            .select('subscription_plans(slug)')
            .eq('tenant_id', tenantId)
            .in('status', ['active', 'trial'])
            .single()

          const planSlug = (subscription?.subscription_plans as any)?.slug
          const targetPlans = value.targetValue || []
          const planEnabled = targetPlans.includes(planSlug)
          return res.json({ enabled: planEnabled, reason: planEnabled ? 'Plan in list' : 'Plan not in list' })
        }
        return res.json({ enabled: false, reason: 'No tenant ID provided' })

      default:
        return res.json({ enabled: value.enabled, reason: 'Default' })
    }
  } catch (error) {
    console.error('Check feature flag error:', error)
    res.status(500).json({ error: 'Failed to check feature flag' })
  }
})

// Simple hash function for percentage-based targeting
function hashCode(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32bit integer
  }
  return hash
}

export default router

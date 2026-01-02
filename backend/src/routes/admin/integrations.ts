import { Router, Response } from 'express'
import { supabase } from '../../lib/supabase.js'
import { SuperAdminRequest, requirePermission, logAdminAction, auditLog } from '../../middleware/superAdmin.js'

const router = Router()

/**
 * GET /api/admin/integrations/gateways
 * Get all payment gateways configuration
 */
router.get('/gateways', requirePermission('integrations'), async (req: SuperAdminRequest, res: Response) => {
  try {
    const { data: gateways, error } = await supabase
      .from('platform_payment_gateways')
      .select('*')
      .order('gateway_name', { ascending: true })

    if (error) {
      return res.status(500).json({ error: 'Failed to get gateways' })
    }

    // Mask sensitive config values
    const maskedGateways = gateways?.map(gateway => ({
      ...gateway,
      config: maskSensitiveConfig(gateway.config),
      test_config: maskSensitiveConfig(gateway.test_config)
    })) || []

    res.json(maskedGateways)
  } catch (error) {
    console.error('Get gateways error:', error)
    res.status(500).json({ error: 'Failed to get gateways' })
  }
})

/**
 * GET /api/admin/integrations/gateways/:name
 * Get specific gateway configuration
 */
router.get('/gateways/:name', requirePermission('integrations'), async (req: SuperAdminRequest, res: Response) => {
  try {
    const { name } = req.params

    const { data: gateway, error } = await supabase
      .from('platform_payment_gateways')
      .select('*')
      .eq('gateway_name', name)
      .single()

    if (error || !gateway) {
      return res.status(404).json({ error: 'Gateway not found' })
    }

    // Mask sensitive config
    res.json({
      ...gateway,
      config: maskSensitiveConfig(gateway.config),
      test_config: maskSensitiveConfig(gateway.test_config)
    })
  } catch (error) {
    console.error('Get gateway error:', error)
    res.status(500).json({ error: 'Failed to get gateway' })
  }
})

/**
 * PUT /api/admin/integrations/gateways/:name
 * Update gateway configuration
 */
router.put('/gateways/:name', requirePermission('integrations'), auditLog('gateway.update', 'integration'), async (req: SuperAdminRequest, res: Response) => {
  try {
    const { name } = req.params
    const { is_enabled, is_test_mode, config, test_config, description } = req.body

    // Get current gateway
    const { data: current } = await supabase
      .from('platform_payment_gateways')
      .select('*')
      .eq('gateway_name', name)
      .single()

    if (!current) {
      return res.status(404).json({ error: 'Gateway not found' })
    }

    const updates: Record<string, any> = {
      updated_at: new Date().toISOString(),
      updated_by: req.superAdmin?.id
    }

    if (is_enabled !== undefined) updates.is_enabled = is_enabled
    if (is_test_mode !== undefined) updates.is_test_mode = is_test_mode
    if (description !== undefined) updates.description = description

    // Merge config (don't overwrite with masked values)
    if (config) {
      updates.config = mergeConfig(current.config, config)
    }
    if (test_config) {
      updates.test_config = mergeConfig(current.test_config, test_config)
    }

    const { data: gateway, error } = await supabase
      .from('platform_payment_gateways')
      .update(updates)
      .eq('gateway_name', name)
      .select()
      .single()

    if (error) {
      return res.status(500).json({ error: 'Failed to update gateway' })
    }

    // Log the action
    if (req.superAdmin) {
      await logAdminAction({
        adminId: req.superAdmin.id,
        adminEmail: req.superAdmin.email,
        action: 'gateway.update',
        resourceType: 'integration',
        resourceId: gateway.id,
        description: `Updated ${name} gateway configuration`,
        changes: {
          ...(current.is_enabled !== is_enabled && { is_enabled: { old: current.is_enabled, new: is_enabled } }),
          ...(current.is_test_mode !== is_test_mode && { is_test_mode: { old: current.is_test_mode, new: is_test_mode } })
        },
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      })
    }

    res.json({
      ...gateway,
      config: maskSensitiveConfig(gateway.config),
      test_config: maskSensitiveConfig(gateway.test_config)
    })
  } catch (error) {
    console.error('Update gateway error:', error)
    res.status(500).json({ error: 'Failed to update gateway' })
  }
})

/**
 * POST /api/admin/integrations/gateways/:name/test
 * Test gateway connection
 */
router.post('/gateways/:name/test', requirePermission('integrations'), async (req: SuperAdminRequest, res: Response) => {
  try {
    const { name } = req.params

    const { data: gateway } = await supabase
      .from('platform_payment_gateways')
      .select('*')
      .eq('gateway_name', name)
      .single()

    if (!gateway) {
      return res.status(404).json({ error: 'Gateway not found' })
    }

    // Test based on gateway type
    let testResult = { success: false, message: 'Unknown gateway' }

    if (name === 'paystack') {
      testResult = await testPaystackConnection(
        gateway.is_test_mode ? gateway.test_config : gateway.config
      )
    } else if (name === 'paypal') {
      testResult = await testPaypalConnection(
        gateway.is_test_mode ? gateway.test_config : gateway.config
      )
    } else if (name === 'eft') {
      // EFT doesn't need connection test
      testResult = { success: true, message: 'EFT configuration valid' }
    }

    // Update health status
    await supabase
      .from('platform_payment_gateways')
      .update({
        last_health_check: new Date().toISOString(),
        health_status: testResult.success ? 'healthy' : 'down'
      })
      .eq('gateway_name', name)

    res.json(testResult)
  } catch (error) {
    console.error('Test gateway error:', error)
    res.status(500).json({ error: 'Failed to test gateway', success: false })
  }
})

/**
 * GET /api/admin/integrations/usage
 * Get integration usage statistics
 */
router.get('/usage', requirePermission('integrations'), async (req: SuperAdminRequest, res: Response) => {
  try {
    // Count tenants using each payment method
    const { data: tenants } = await supabase
      .from('tenants')
      .select('paystack_enabled, paypal_enabled, eft_enabled')

    const usage = {
      paystack: tenants?.filter((t: any) => t.paystack_enabled).length || 0,
      paypal: tenants?.filter((t: any) => t.paypal_enabled).length || 0,
      eft: tenants?.filter((t: any) => t.eft_enabled).length || 0,
      total: tenants?.length || 0
    }

    res.json(usage)
  } catch (error) {
    console.error('Get usage error:', error)
    res.status(500).json({ error: 'Failed to get usage' })
  }
})

// Helper functions
function maskSensitiveConfig(config: Record<string, any>): Record<string, any> {
  if (!config) return {}

  const masked: Record<string, any> = {}
  const sensitiveKeys = ['secret_key', 'client_secret', 'webhook_secret', 'api_secret', 'private_key']

  for (const [key, value] of Object.entries(config)) {
    if (sensitiveKeys.some(sk => key.toLowerCase().includes(sk))) {
      if (typeof value === 'string' && value.length > 4) {
        masked[key] = '****' + value.slice(-4)
      } else {
        masked[key] = '****'
      }
    } else {
      masked[key] = value
    }
  }

  return masked
}

function mergeConfig(existing: Record<string, any>, updates: Record<string, any>): Record<string, any> {
  const merged = { ...existing }

  for (const [key, value] of Object.entries(updates)) {
    // Don't overwrite with masked values
    if (typeof value === 'string' && value.startsWith('****')) {
      continue
    }
    merged[key] = value
  }

  return merged
}

async function testPaystackConnection(config: Record<string, any>): Promise<{ success: boolean; message: string }> {
  try {
    if (!config?.secret_key) {
      return { success: false, message: 'Secret key not configured' }
    }

    const response = await fetch('https://api.paystack.co/balance', {
      headers: {
        'Authorization': `Bearer ${config.secret_key}`
      }
    })

    if (response.ok) {
      return { success: true, message: 'Paystack connection successful' }
    } else {
      return { success: false, message: 'Paystack authentication failed' }
    }
  } catch (error) {
    return { success: false, message: 'Failed to connect to Paystack' }
  }
}

async function testPaypalConnection(config: Record<string, any>): Promise<{ success: boolean; message: string }> {
  try {
    if (!config?.client_id || !config?.client_secret) {
      return { success: false, message: 'Client ID and Secret not configured' }
    }

    // PayPal OAuth token request to test credentials
    const auth = Buffer.from(`${config.client_id}:${config.client_secret}`).toString('base64')
    const response = await fetch('https://api-m.sandbox.paypal.com/v1/oauth2/token', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: 'grant_type=client_credentials'
    })

    if (response.ok) {
      return { success: true, message: 'PayPal connection successful' }
    } else {
      return { success: false, message: 'PayPal authentication failed' }
    }
  } catch (error) {
    return { success: false, message: 'Failed to connect to PayPal' }
  }
}

export default router

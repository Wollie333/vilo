import { Request, Response, NextFunction, RequestHandler } from 'express'
import { supabase } from '../lib/supabase.js'

interface FeatureFlagConfig {
  enabled: boolean
  targeting: 'all' | 'percentage' | 'tenants' | 'plans'
  percentage?: number
  tenants?: string[]
  plans?: string[]
  description?: string
}

// Cache for feature flags (refreshed every 5 minutes)
let flagCache: Record<string, FeatureFlagConfig> = {}
let cacheLastRefreshed = 0
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

/**
 * Refresh the feature flag cache from platform_settings
 */
async function refreshFlagCache(): Promise<void> {
  const now = Date.now()
  if (now - cacheLastRefreshed < CACHE_TTL) {
    return // Cache is still fresh
  }

  try {
    const { data: settings } = await supabase
      .from('platform_settings')
      .select('key, value')
      .eq('category', 'feature_flags')

    const newCache: Record<string, FeatureFlagConfig> = {}

    settings?.forEach((setting) => {
      try {
        const config = typeof setting.value === 'string'
          ? JSON.parse(setting.value)
          : setting.value

        newCache[setting.key] = config
      } catch (e) {
        console.error(`[FeatureFlags] Failed to parse flag ${setting.key}:`, e)
      }
    })

    flagCache = newCache
    cacheLastRefreshed = now
    console.log(`[FeatureFlags] Cache refreshed with ${Object.keys(newCache).length} flags`)
  } catch (error) {
    console.error('[FeatureFlags] Failed to refresh cache:', error)
  }
}

/**
 * Get a feature flag configuration
 */
export async function getFeatureFlag(flagKey: string): Promise<FeatureFlagConfig | null> {
  await refreshFlagCache()
  return flagCache[flagKey] || null
}

/**
 * Check if a feature flag is enabled for a specific tenant
 */
export async function checkFeature(flagKey: string, tenantId?: string): Promise<boolean> {
  await refreshFlagCache()

  const flag = flagCache[flagKey]
  if (!flag) {
    return false // Flag doesn't exist, default to disabled
  }

  if (!flag.enabled) {
    return false
  }

  // Check tenant-specific override
  if (tenantId) {
    const { data: override } = await supabase
      .from('tenant_feature_overrides')
      .select('enabled, expires_at')
      .eq('tenant_id', tenantId)
      .eq('flag_key', flagKey)
      .single()

    if (override) {
      // Check if override has expired
      if (override.expires_at && new Date(override.expires_at) < new Date()) {
        return flag.enabled // Override expired, use flag default
      }
      return override.enabled
    }
  }

  // Apply targeting rules
  switch (flag.targeting) {
    case 'all':
      return true

    case 'percentage':
      if (!flag.percentage) return false
      // Use tenant ID for consistent assignment, or random if no tenant
      const hash = tenantId
        ? hashString(tenantId + flagKey)
        : Math.random() * 100
      return (hash % 100) < flag.percentage

    case 'tenants':
      if (!flag.tenants || !tenantId) return false
      return flag.tenants.includes(tenantId)

    case 'plans':
      if (!flag.plans || !tenantId) return false
      // Get tenant's current plan
      const { data: subscription } = await supabase
        .from('tenant_subscriptions')
        .select('plans:plan_id(slug)')
        .eq('tenant_id', tenantId)
        .in('status', ['active', 'trial'])
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (!subscription) return false
      const planSlug = (subscription.plans as any)?.slug
      return flag.plans.includes(planSlug)

    default:
      return false
  }
}

/**
 * Check if a tenant has access to a plan feature
 */
export async function checkPlanFeature(
  featureName: string,
  tenantId: string
): Promise<boolean> {
  try {
    // Get tenant's current plan limits
    const { data: subscription } = await supabase
      .from('tenant_subscriptions')
      .select('plans:plan_id(limits, features)')
      .eq('tenant_id', tenantId)
      .in('status', ['active', 'trial'])
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (!subscription) {
      return false // No active subscription
    }

    const plan = subscription.plans as any
    const limits = plan?.limits || {}
    const features = plan?.features || []

    // Check in limits (e.g., 'custom_domain', 'white_label')
    if (featureName in limits) {
      return !!limits[featureName]
    }

    // Check in features array
    if (Array.isArray(features)) {
      return features.some((f: string) =>
        f.toLowerCase().includes(featureName.toLowerCase())
      )
    }

    return false
  } catch (error) {
    console.error('[FeatureFlags] Error checking plan feature:', error)
    return false
  }
}

/**
 * Middleware to require a feature flag to be enabled
 * Returns 403 if feature is not enabled for the tenant
 */
export function requireFeature(flagKey: string): RequestHandler {
  return async (req: Request, res: Response, next: NextFunction) => {
    const tenantId = req.headers['x-tenant-id'] as string

    const isEnabled = await checkFeature(flagKey, tenantId)

    if (!isEnabled) {
      return res.status(403).json({
        error: 'Feature not available',
        message: 'This feature is not enabled for your account',
        featureFlag: flagKey
      })
    }

    next()
  }
}

/**
 * Middleware to require a plan feature
 * Returns 403 if feature is not included in the tenant's plan
 */
export function requirePlanFeature(featureName: string): RequestHandler {
  return async (req: Request, res: Response, next: NextFunction) => {
    const tenantId = req.headers['x-tenant-id'] as string

    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID required' })
    }

    const hasFeature = await checkPlanFeature(featureName, tenantId)

    if (!hasFeature) {
      return res.status(403).json({
        error: 'Feature not available',
        message: `This feature (${featureName}) is not included in your current plan`,
        upgradeRequired: true
      })
    }

    next()
  }
}

/**
 * Simple hash function for consistent percentage assignment
 */
function hashString(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32-bit integer
  }
  return Math.abs(hash)
}

/**
 * Get all enabled features for a tenant
 */
export async function getTenantFeatures(tenantId: string): Promise<string[]> {
  await refreshFlagCache()

  const enabledFeatures: string[] = []

  for (const [flagKey, config] of Object.entries(flagCache)) {
    if (await checkFeature(flagKey, tenantId)) {
      enabledFeatures.push(flagKey)
    }
  }

  return enabledFeatures
}

/**
 * Force refresh the feature flag cache
 */
export function invalidateFlagCache(): void {
  cacheLastRefreshed = 0
  console.log('[FeatureFlags] Cache invalidated')
}

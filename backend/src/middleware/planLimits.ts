import { Request, Response, NextFunction, RequestHandler } from 'express'
import { supabase } from '../lib/supabase.js'

export interface TenantUsage {
  rooms: number
  teamMembers: number
  monthlyBookings: number
}

export interface PlanLimits {
  maxRooms: number
  maxTeamMembers: number
  maxBookingsPerMonth: number
  maxStorageMB: number
  hasApiAccess: boolean
  hasCustomDomain: boolean
  hasWhiteLabel: boolean
  hasPrioritySupport: boolean
}

export interface LimitCheckResult {
  isWithinLimit: boolean
  currentUsage: number
  limit: number
  remaining: number
  percentUsed: number
}

/**
 * Get the plan limits for a tenant
 */
export async function getTenantPlanLimits(tenantId: string): Promise<PlanLimits | null> {
  try {
    const { data: subscription } = await supabase
      .from('tenant_subscriptions')
      .select('plans:plan_id(limits)')
      .eq('tenant_id', tenantId)
      .in('status', ['active', 'trial'])
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (!subscription) {
      // Default to free plan limits
      return {
        maxRooms: 1,
        maxTeamMembers: 1,
        maxBookingsPerMonth: 10,
        maxStorageMB: 100,
        hasApiAccess: false,
        hasCustomDomain: false,
        hasWhiteLabel: false,
        hasPrioritySupport: false
      }
    }

    const limits = (subscription.plans as any)?.limits || {}

    return {
      maxRooms: limits.max_rooms ?? 999999,
      maxTeamMembers: limits.max_team_members ?? 999999,
      maxBookingsPerMonth: limits.max_bookings_per_month ?? 999999,
      maxStorageMB: limits.max_storage_mb ?? 1000,
      hasApiAccess: limits.api_access ?? false,
      hasCustomDomain: limits.custom_domain ?? false,
      hasWhiteLabel: limits.white_label ?? false,
      hasPrioritySupport: limits.priority_support ?? false
    }
  } catch (error) {
    console.error('[PlanLimits] Error getting plan limits:', error)
    return null
  }
}

/**
 * Get current usage for a tenant
 */
export async function getTenantUsage(tenantId: string): Promise<TenantUsage> {
  try {
    // Get room count
    const { count: roomCount } = await supabase
      .from('rooms')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)

    // Get active team member count
    const { count: memberCount } = await supabase
      .from('tenant_members')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('status', 'active')

    // Get this month's booking count
    const startOfMonth = new Date()
    startOfMonth.setDate(1)
    startOfMonth.setHours(0, 0, 0, 0)

    const { count: bookingCount } = await supabase
      .from('bookings')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .gte('created_at', startOfMonth.toISOString())

    return {
      rooms: roomCount || 0,
      teamMembers: memberCount || 0,
      monthlyBookings: bookingCount || 0
    }
  } catch (error) {
    console.error('[PlanLimits] Error getting tenant usage:', error)
    return {
      rooms: 0,
      teamMembers: 0,
      monthlyBookings: 0
    }
  }
}

/**
 * Check if tenant is within a specific limit
 */
export async function checkLimit(
  tenantId: string,
  limitType: 'rooms' | 'teamMembers' | 'monthlyBookings'
): Promise<LimitCheckResult> {
  const [limits, usage] = await Promise.all([
    getTenantPlanLimits(tenantId),
    getTenantUsage(tenantId)
  ])

  if (!limits) {
    return {
      isWithinLimit: true,
      currentUsage: 0,
      limit: 999999,
      remaining: 999999,
      percentUsed: 0
    }
  }

  let currentUsage: number
  let limit: number

  switch (limitType) {
    case 'rooms':
      currentUsage = usage.rooms
      limit = limits.maxRooms
      break
    case 'teamMembers':
      currentUsage = usage.teamMembers
      limit = limits.maxTeamMembers
      break
    case 'monthlyBookings':
      currentUsage = usage.monthlyBookings
      limit = limits.maxBookingsPerMonth
      break
  }

  const remaining = Math.max(0, limit - currentUsage)
  const percentUsed = limit > 0 ? (currentUsage / limit) * 100 : 0

  return {
    isWithinLimit: currentUsage < limit,
    currentUsage,
    limit,
    remaining,
    percentUsed
  }
}

/**
 * Middleware to check room limit before creating a room
 */
export function checkRoomLimit(): RequestHandler {
  return async (req: Request, res: Response, next: NextFunction) => {
    const tenantId = req.headers['x-tenant-id'] as string

    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID required' })
    }

    const result = await checkLimit(tenantId, 'rooms')

    if (!result.isWithinLimit) {
      return res.status(403).json({
        error: 'Limit reached',
        message: `You have reached your room limit (${result.limit} rooms). Please upgrade your plan to add more rooms.`,
        limitType: 'rooms',
        currentUsage: result.currentUsage,
        limit: result.limit,
        upgradeRequired: true
      })
    }

    // Add limit info to request for potential use downstream
    (req as any).limitInfo = result
    next()
  }
}

/**
 * Middleware to check team member limit before inviting
 */
export function checkMemberLimit(): RequestHandler {
  return async (req: Request, res: Response, next: NextFunction) => {
    const tenantId = req.headers['x-tenant-id'] as string

    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID required' })
    }

    const result = await checkLimit(tenantId, 'teamMembers')

    if (!result.isWithinLimit) {
      return res.status(403).json({
        error: 'Limit reached',
        message: `You have reached your team member limit (${result.limit} members). Please upgrade your plan to add more team members.`,
        limitType: 'teamMembers',
        currentUsage: result.currentUsage,
        limit: result.limit,
        upgradeRequired: true
      })
    }

    (req as any).limitInfo = result
    next()
  }
}

/**
 * Middleware to check booking limit before creating a booking
 */
export function checkBookingLimit(): RequestHandler {
  return async (req: Request, res: Response, next: NextFunction) => {
    const tenantId = req.headers['x-tenant-id'] as string

    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID required' })
    }

    const result = await checkLimit(tenantId, 'monthlyBookings')

    if (!result.isWithinLimit) {
      return res.status(403).json({
        error: 'Limit reached',
        message: `You have reached your monthly booking limit (${result.limit} bookings). Please upgrade your plan for unlimited bookings.`,
        limitType: 'monthlyBookings',
        currentUsage: result.currentUsage,
        limit: result.limit,
        upgradeRequired: true
      })
    }

    (req as any).limitInfo = result
    next()
  }
}

/**
 * Get full usage summary for a tenant (for dashboard display)
 */
export async function getUsageSummary(tenantId: string): Promise<{
  usage: TenantUsage
  limits: PlanLimits | null
  percentages: {
    rooms: number
    teamMembers: number
    monthlyBookings: number
  }
  warnings: string[]
}> {
  const [usage, limits] = await Promise.all([
    getTenantUsage(tenantId),
    getTenantPlanLimits(tenantId)
  ])

  const percentages = {
    rooms: limits ? (usage.rooms / limits.maxRooms) * 100 : 0,
    teamMembers: limits ? (usage.teamMembers / limits.maxTeamMembers) * 100 : 0,
    monthlyBookings: limits ? (usage.monthlyBookings / limits.maxBookingsPerMonth) * 100 : 0
  }

  const warnings: string[] = []
  const WARNING_THRESHOLD = 80

  if (percentages.rooms >= WARNING_THRESHOLD) {
    warnings.push(`You're using ${Math.round(percentages.rooms)}% of your room limit`)
  }
  if (percentages.teamMembers >= WARNING_THRESHOLD) {
    warnings.push(`You're using ${Math.round(percentages.teamMembers)}% of your team member limit`)
  }
  if (percentages.monthlyBookings >= WARNING_THRESHOLD) {
    warnings.push(`You're using ${Math.round(percentages.monthlyBookings)}% of your monthly booking limit`)
  }

  return {
    usage,
    limits,
    percentages,
    warnings
  }
}

/**
 * Record a usage limit event (warning or limit reached)
 */
export async function recordLimitEvent(
  tenantId: string,
  limitType: string,
  currentUsage: number,
  limit: number,
  thresholdType: 'warning' | 'limit' | 'exceeded'
): Promise<void> {
  try {
    const usagePercent = limit > 0 ? (currentUsage / limit) * 100 : 0

    // Get subscription ID
    const { data: subscription } = await supabase
      .from('tenant_subscriptions')
      .select('id')
      .eq('tenant_id', tenantId)
      .in('status', ['active', 'trial'])
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    await supabase
      .from('usage_limit_events')
      .insert({
        tenant_id: tenantId,
        subscription_id: subscription?.id,
        limit_type: limitType,
        current_usage: currentUsage,
        limit_value: limit,
        usage_percent: usagePercent,
        threshold_type: thresholdType,
        action_taken: thresholdType === 'limit' ? 'feature_disabled' : 'notification_sent'
      })
  } catch (error) {
    console.error('[PlanLimits] Error recording limit event:', error)
  }
}

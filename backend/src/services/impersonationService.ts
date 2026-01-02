import { Request, Response, NextFunction, RequestHandler } from 'express'
import crypto from 'crypto'
import { supabase } from '../lib/supabase.js'

/**
 * Impersonation Service
 * Provides secure, time-limited, auditable impersonation for support purposes
 */

interface ImpersonationSession {
  id: string
  adminId: string
  targetUserId: string
  targetMemberId?: string
  targetTenantId: string
  token: string
  expiresAt: Date
  reason: string
}

interface ImpersonationAction {
  sessionId: string
  actionType: string
  resourceType?: string
  resourceId?: string
  actionData?: Record<string, any>
  endpoint?: string
  httpMethod?: string
}

// ============================================================================
// SETTINGS HELPERS
// ============================================================================

async function getSetting(key: string, defaultValue: string): Promise<string> {
  try {
    const { data } = await supabase
      .from('platform_settings')
      .select('value')
      .eq('key', key)
      .single()
    return data?.value || defaultValue
  } catch {
    return defaultValue
  }
}

async function getSettingNumber(key: string, defaultValue: number): Promise<number> {
  const value = await getSetting(key, String(defaultValue))
  return parseInt(value, 10) || defaultValue
}

async function getSettingBoolean(key: string, defaultValue: boolean): Promise<boolean> {
  const value = await getSetting(key, String(defaultValue))
  return value === 'true'
}

// ============================================================================
// TOKEN UTILITIES
// ============================================================================

/**
 * Generate a secure random token
 */
function generateToken(): string {
  return crypto.randomBytes(32).toString('hex')
}

/**
 * Hash a token for storage
 */
function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex')
}

// ============================================================================
// SESSION MANAGEMENT
// ============================================================================

/**
 * Start an impersonation session
 */
export async function startImpersonation(
  adminId: string,
  targetUserId: string,
  targetTenantId: string,
  reason: string,
  durationMinutes?: number,
  ipAddress?: string,
  userAgent?: string
): Promise<ImpersonationSession | null> {
  try {
    // Validate reason is provided
    const requireReason = await getSettingBoolean('impersonation_require_reason', true)
    if (requireReason && (!reason || reason.trim().length < 10)) {
      throw new Error('A reason (minimum 10 characters) is required for impersonation')
    }

    // Get duration settings
    const maxDuration = await getSettingNumber('impersonation_max_duration_minutes', 60)
    const defaultDuration = await getSettingNumber('impersonation_default_duration_minutes', 30)
    const actualDuration = Math.min(durationMinutes || defaultDuration, maxDuration)

    // Check if admin has impersonation permission
    const { data: admin } = await supabase
      .from('super_admins')
      .select('permissions, status')
      .eq('id', adminId)
      .single()

    if (!admin || admin.status !== 'active') {
      throw new Error('Admin not found or inactive')
    }

    const permissions = admin.permissions as Record<string, boolean>
    if (!permissions?.tenants) {
      throw new Error('Admin does not have permission to impersonate users')
    }

    // Find the member record for the user in this tenant
    const { data: member } = await supabase
      .from('tenant_members')
      .select('id')
      .eq('user_id', targetUserId)
      .eq('tenant_id', targetTenantId)
      .single()

    // Generate secure token
    const token = generateToken()
    const tokenHash = hashToken(token)

    // Calculate expiration
    const expiresAt = new Date()
    expiresAt.setMinutes(expiresAt.getMinutes() + actualDuration)

    // Create session
    const { data: session, error } = await supabase
      .from('impersonation_sessions')
      .insert({
        admin_id: adminId,
        target_user_id: targetUserId,
        target_member_id: member?.id,
        target_tenant_id: targetTenantId,
        token_hash: tokenHash,
        reason: reason.trim(),
        expires_at: expiresAt.toISOString(),
        ip_address: ipAddress,
        user_agent: userAgent
      })
      .select('id')
      .single()

    if (error) throw error

    // Optionally notify the user
    const notifyUser = await getSettingBoolean('impersonation_notify_user', false)
    if (notifyUser) {
      // TODO: Send notification to user about being impersonated
      console.log(`[Impersonation] User ${targetUserId} would be notified about impersonation`)
    }

    console.log(`[Impersonation] Session started: Admin ${adminId} -> User ${targetUserId} (${actualDuration} min)`)

    return {
      id: session.id,
      adminId,
      targetUserId,
      targetMemberId: member?.id,
      targetTenantId,
      token, // Return the actual token (only time it's available in plain text)
      expiresAt,
      reason
    }
  } catch (error) {
    console.error('[Impersonation] Failed to start session:', error)
    return null
  }
}

/**
 * Validate an impersonation token and return session details
 */
export async function validateImpersonationToken(token: string): Promise<{
  isValid: boolean
  sessionId?: string
  adminId?: string
  targetUserId?: string
  targetTenantId?: string
  remainingMinutes?: number
} | null> {
  try {
    const tokenHash = hashToken(token)

    const { data: session } = await supabase
      .from('impersonation_sessions')
      .select('id, admin_id, target_user_id, target_tenant_id, expires_at, ended_at')
      .eq('token_hash', tokenHash)
      .single()

    if (!session) {
      return { isValid: false }
    }

    const isExpired = new Date(session.expires_at) < new Date()
    const isEnded = session.ended_at !== null

    if (isExpired || isEnded) {
      return { isValid: false }
    }

    const remainingMinutes = Math.max(
      0,
      Math.floor((new Date(session.expires_at).getTime() - Date.now()) / (1000 * 60))
    )

    return {
      isValid: true,
      sessionId: session.id,
      adminId: session.admin_id,
      targetUserId: session.target_user_id,
      targetTenantId: session.target_tenant_id,
      remainingMinutes
    }
  } catch (error) {
    console.error('[Impersonation] Failed to validate token:', error)
    return null
  }
}

/**
 * End an impersonation session
 */
export async function endImpersonation(
  sessionId: string,
  endReason: 'manual' | 'expired' | 'logout' = 'manual'
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('impersonation_sessions')
      .update({
        ended_at: new Date().toISOString(),
        end_reason: endReason
      })
      .eq('id', sessionId)
      .is('ended_at', null)

    if (error) throw error

    console.log(`[Impersonation] Session ${sessionId} ended: ${endReason}`)
    return true
  } catch (error) {
    console.error('[Impersonation] Failed to end session:', error)
    return false
  }
}

/**
 * Get active sessions for an admin
 */
export async function getAdminActiveSessions(adminId: string): Promise<any[]> {
  try {
    const { data, error } = await supabase
      .from('impersonation_sessions')
      .select(`
        id,
        target_user_id,
        target_tenant_id,
        reason,
        started_at,
        expires_at,
        action_count,
        tenants:target_tenant_id(name)
      `)
      .eq('admin_id', adminId)
      .is('ended_at', null)
      .gt('expires_at', new Date().toISOString())
      .order('started_at', { ascending: false })

    if (error) throw error
    return data || []
  } catch (error) {
    console.error('[Impersonation] Failed to get active sessions:', error)
    return []
  }
}

/**
 * Get session history with pagination
 */
export async function getSessionHistory(options: {
  adminId?: string
  targetTenantId?: string
  limit?: number
  offset?: number
}): Promise<{ sessions: any[]; total: number }> {
  try {
    let query = supabase
      .from('impersonation_sessions')
      .select(`
        id,
        admin_id,
        target_user_id,
        target_tenant_id,
        reason,
        started_at,
        ended_at,
        end_reason,
        action_count,
        ip_address,
        super_admins:admin_id(display_name, email),
        tenants:target_tenant_id(name)
      `, { count: 'exact' })

    if (options.adminId) {
      query = query.eq('admin_id', options.adminId)
    }
    if (options.targetTenantId) {
      query = query.eq('target_tenant_id', options.targetTenantId)
    }

    query = query
      .order('started_at', { ascending: false })
      .range(options.offset || 0, (options.offset || 0) + (options.limit || 50) - 1)

    const { data, count, error } = await query

    if (error) throw error

    return {
      sessions: data || [],
      total: count || 0
    }
  } catch (error) {
    console.error('[Impersonation] Failed to get session history:', error)
    return { sessions: [], total: 0 }
  }
}

// ============================================================================
// ACTION LOGGING
// ============================================================================

/**
 * Log an action taken during impersonation
 */
export async function logImpersonationAction(action: ImpersonationAction): Promise<void> {
  try {
    await supabase
      .from('impersonation_actions')
      .insert({
        session_id: action.sessionId,
        action_type: action.actionType,
        resource_type: action.resourceType,
        resource_id: action.resourceId,
        action_data: action.actionData,
        endpoint: action.endpoint,
        http_method: action.httpMethod
      })

    // Increment action count on session
    await supabase.rpc('increment', {
      table_name: 'impersonation_sessions',
      row_id: action.sessionId,
      column_name: 'action_count'
    })
  } catch (error) {
    console.error('[Impersonation] Failed to log action:', error)
  }
}

/**
 * Get actions for a session
 */
export async function getSessionActions(sessionId: string): Promise<any[]> {
  try {
    const { data, error } = await supabase
      .from('impersonation_actions')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true })

    if (error) throw error
    return data || []
  } catch (error) {
    console.error('[Impersonation] Failed to get session actions:', error)
    return []
  }
}

// ============================================================================
// SUPPORT ACTIONS
// ============================================================================

/**
 * Log a support action (not impersonation, but quick admin action)
 */
export async function logSupportAction(
  adminId: string,
  targetType: 'user' | 'tenant' | 'subscription',
  targetId: string,
  actionType: string,
  actionData?: Record<string, any>,
  reason?: string,
  ipAddress?: string,
  userAgent?: string
): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from('support_actions')
      .insert({
        admin_id: adminId,
        target_type: targetType,
        target_id: targetId,
        action_type: actionType,
        action_data: actionData,
        reason,
        result: 'success',
        ip_address: ipAddress,
        user_agent: userAgent
      })
      .select('id')
      .single()

    if (error) throw error
    return data?.id || null
  } catch (error) {
    console.error('[Impersonation] Failed to log support action:', error)
    return null
  }
}

/**
 * Get support action history
 */
export async function getSupportActionHistory(options: {
  adminId?: string
  targetType?: string
  targetId?: string
  limit?: number
  offset?: number
}): Promise<{ actions: any[]; total: number }> {
  try {
    let query = supabase
      .from('support_actions')
      .select(`
        id,
        admin_id,
        target_type,
        target_id,
        action_type,
        action_data,
        result,
        result_message,
        reason,
        ip_address,
        created_at,
        super_admins:admin_id(display_name, email)
      `, { count: 'exact' })

    if (options.adminId) {
      query = query.eq('admin_id', options.adminId)
    }
    if (options.targetType) {
      query = query.eq('target_type', options.targetType)
    }
    if (options.targetId) {
      query = query.eq('target_id', options.targetId)
    }

    query = query
      .order('created_at', { ascending: false })
      .range(options.offset || 0, (options.offset || 0) + (options.limit || 50) - 1)

    const { data, count, error } = await query

    if (error) throw error

    return {
      actions: data || [],
      total: count || 0
    }
  } catch (error) {
    console.error('[Impersonation] Failed to get support action history:', error)
    return { actions: [], total: 0 }
  }
}

// ============================================================================
// MIDDLEWARE
// ============================================================================

/**
 * Middleware to handle impersonation tokens
 * Adds impersonation context to request if valid token is present
 */
export function impersonationMiddleware(): RequestHandler {
  return async (req: Request, res: Response, next: NextFunction) => {
    const impersonationToken = req.headers['x-impersonation-token'] as string

    if (!impersonationToken) {
      return next()
    }

    const validation = await validateImpersonationToken(impersonationToken)

    if (!validation || !validation.isValid) {
      return res.status(401).json({
        error: 'Invalid or expired impersonation token',
        code: 'INVALID_IMPERSONATION_TOKEN'
      })
    }

    // Add impersonation context to request
    ;(req as any).impersonation = {
      sessionId: validation.sessionId,
      adminId: validation.adminId,
      isImpersonating: true,
      remainingMinutes: validation.remainingMinutes
    }

    // Override tenant/user context for the request
    ;(req as any).originalUser = req.headers['x-user-id']
    ;(req as any).originalTenant = req.headers['x-tenant-id']

    req.headers['x-user-id'] = validation.targetUserId
    req.headers['x-tenant-id'] = validation.targetTenantId

    // Log this action
    await logImpersonationAction({
      sessionId: validation.sessionId!,
      actionType: 'api_request',
      endpoint: req.path,
      httpMethod: req.method,
      actionData: {
        query: req.query,
        bodyKeys: Object.keys(req.body || {})
      }
    })

    next()
  }
}

/**
 * Middleware to block certain actions during impersonation
 */
export function blockDuringImpersonation(blockedActions: string[]): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    const impersonation = (req as any).impersonation

    if (!impersonation?.isImpersonating) {
      return next()
    }

    // Check if this action is blocked
    const actionPath = `${req.method}:${req.path}`
    const isBlocked = blockedActions.some(pattern => {
      if (pattern.includes('*')) {
        const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$')
        return regex.test(actionPath)
      }
      return actionPath === pattern
    })

    if (isBlocked) {
      return res.status(403).json({
        error: 'This action is not allowed during impersonation',
        code: 'ACTION_BLOCKED_DURING_IMPERSONATION'
      })
    }

    next()
  }
}

// ============================================================================
// CLEANUP
// ============================================================================

/**
 * Clean up expired impersonation sessions
 */
export async function cleanupExpiredSessions(): Promise<number> {
  try {
    const { data, error } = await supabase
      .from('impersonation_sessions')
      .update({
        ended_at: new Date().toISOString(),
        end_reason: 'expired'
      })
      .is('ended_at', null)
      .lt('expires_at', new Date().toISOString())
      .select('id')

    if (error) throw error

    const count = data?.length || 0
    if (count > 0) {
      console.log(`[Impersonation] Cleaned up ${count} expired sessions`)
    }
    return count
  } catch (error) {
    console.error('[Impersonation] Failed to cleanup expired sessions:', error)
    return 0
  }
}

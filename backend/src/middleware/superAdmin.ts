import { Request, Response, NextFunction } from 'express'
import { supabase } from '../lib/supabase.js'

// Super-admin permission types
export type AdminPermission = 'none' | 'view' | 'edit' | 'full'

// Super-admin role interface
export interface SuperAdminRole {
  id: string
  user_id: string
  email: string
  display_name: string
  role: 'super_admin' | 'admin' | 'support' | 'marketing' | 'finance'
  permissions: Record<string, boolean>
  status: 'active' | 'suspended' | 'removed'
}

// Extended Request type for super-admin context
export interface SuperAdminRequest extends Request {
  superAdmin?: SuperAdminRole
}

/**
 * Verify super-admin JWT and attach context to request
 */
export async function requireSuperAdmin(
  req: SuperAdminRequest,
  res: Response,
  next: NextFunction
) {
  const authHeader = req.headers.authorization

  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing authorization header' })
  }

  const token = authHeader.split(' ')[1]

  try {
    // Verify JWT with Supabase
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      return res.status(401).json({ error: 'Invalid token' })
    }

    // Check if user is a super-admin
    const { data: superAdmin, error: adminError } = await supabase
      .from('super_admins')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single()

    if (adminError || !superAdmin) {
      return res.status(403).json({ error: 'Not authorized as super-admin' })
    }

    // Update last login
    await supabase
      .from('super_admins')
      .update({ last_login_at: new Date().toISOString() })
      .eq('id', superAdmin.id)

    // Attach super-admin context to request
    req.superAdmin = {
      id: superAdmin.id,
      user_id: superAdmin.user_id,
      email: superAdmin.email,
      display_name: superAdmin.display_name,
      role: superAdmin.role,
      permissions: superAdmin.permissions,
      status: superAdmin.status
    }

    next()
  } catch (error) {
    console.error('Super-admin auth error:', error)
    return res.status(500).json({ error: 'Authentication failed' })
  }
}

/**
 * Check if super-admin has specific permission
 */
export function requirePermission(permission: string) {
  return (req: SuperAdminRequest, res: Response, next: NextFunction) => {
    if (!req.superAdmin) {
      return res.status(401).json({ error: 'Not authenticated' })
    }

    // Super-admins have all permissions
    if (req.superAdmin.role === 'super_admin') {
      return next()
    }

    // Check specific permission
    if (!req.superAdmin.permissions[permission]) {
      return res.status(403).json({
        error: 'Insufficient permissions',
        required: permission
      })
    }

    next()
  }
}

/**
 * Check if user has any of the specified permissions
 */
export function requireAnyPermission(...permissions: string[]) {
  return (req: SuperAdminRequest, res: Response, next: NextFunction) => {
    if (!req.superAdmin) {
      return res.status(401).json({ error: 'Not authenticated' })
    }

    // Super-admins have all permissions
    if (req.superAdmin.role === 'super_admin') {
      return next()
    }

    // Check if user has any of the permissions
    const hasPermission = permissions.some(p => req.superAdmin?.permissions[p])
    if (!hasPermission) {
      return res.status(403).json({
        error: 'Insufficient permissions',
        required: permissions
      })
    }

    next()
  }
}

/**
 * Log admin action to audit log
 */
export async function logAdminAction(params: {
  adminId: string
  adminEmail: string
  action: string
  resourceType: string
  resourceId?: string
  description?: string
  changes?: Record<string, { old: any; new: any }>
  metadata?: Record<string, any>
  ipAddress?: string
  userAgent?: string
}): Promise<void> {
  try {
    await supabase.from('admin_audit_logs').insert({
      admin_id: params.adminId,
      admin_email: params.adminEmail,
      action: params.action,
      resource_type: params.resourceType,
      resource_id: params.resourceId,
      description: params.description,
      changes: params.changes,
      metadata: params.metadata || {},
      ip_address: params.ipAddress,
      user_agent: params.userAgent
    })
  } catch (error) {
    console.error('Failed to log admin action:', error)
    // Don't throw - audit logging should not break the main flow
  }
}

/**
 * Audit logging middleware - wraps response to log after success
 */
export function auditLog(action: string, resourceType: string) {
  return async (req: SuperAdminRequest, res: Response, next: NextFunction) => {
    // Store original send function
    const originalSend = res.send

    // Override send to log after successful response
    res.send = function (body) {
      // Only log on success (2xx responses)
      if (res.statusCode >= 200 && res.statusCode < 300 && req.superAdmin) {
        logAdminAction({
          adminId: req.superAdmin.id,
          adminEmail: req.superAdmin.email,
          action,
          resourceType,
          resourceId: req.params.id,
          metadata: {
            method: req.method,
            path: req.path,
            query: req.query
          },
          ipAddress: req.ip,
          userAgent: req.get('user-agent')
        }).catch(err => console.error('Audit log error:', err))
      }
      return originalSend.call(this, body)
    }

    next()
  }
}

/**
 * Helper to check permission level
 */
export function hasPermission(
  adminPermissions: Record<string, boolean>,
  role: string,
  resource: string
): boolean {
  // Super-admin has all permissions
  if (role === 'super_admin') return true
  return adminPermissions[resource] === true
}

/**
 * Get permission level for a resource
 */
export function getPermissionLevel(
  adminPermissions: Record<string, boolean>,
  role: string,
  resource: string
): AdminPermission {
  if (role === 'super_admin') return 'full'
  if (adminPermissions[resource] === true) return 'full'
  return 'none'
}

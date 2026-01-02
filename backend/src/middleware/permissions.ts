import { Request, Response, NextFunction } from 'express'
import { supabase } from '../lib/supabase.js'

// ============================================
// TYPES
// ============================================

export type Permission = 'none' | 'view' | 'edit' | 'full'

export interface RoleInfo {
  id: string
  name: string
  slug: string
  is_system_role: boolean
  permissions: Record<string, Permission>
}

export interface UserContext {
  userId: string
  email: string
  tenantId: string
  role: RoleInfo
}

// Extend Express Request to include user context
declare global {
  namespace Express {
    interface Request {
      userContext?: UserContext
    }
  }
}

// ============================================
// PERMISSION FUNCTIONS
// ============================================

/**
 * Get the permission level for a resource from a role's permissions
 */
export function getPermission(permissions: Record<string, Permission>, resource: string): Permission {
  return permissions[resource] || 'none'
}

/**
 * Check if a role has at least the required permission level
 */
export function hasPermission(permissions: Record<string, Permission>, resource: string, required: Permission): boolean {
  const userPermission = getPermission(permissions, resource)
  const levels: Permission[] = ['none', 'view', 'edit', 'full']
  return levels.indexOf(userPermission) >= levels.indexOf(required)
}

// ============================================
// MIDDLEWARE
// ============================================

/**
 * Middleware to attach user context (role with permissions, tenant) to request
 * Must be called before requirePermission
 */
export async function attachUserContext(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization
  const tenantIdHeader = req.headers['x-tenant-id'] as string

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next() // Continue without context, let route handle auth
  }

  const token = authHeader.split(' ')[1]

  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      return next()
    }

    // Determine which tenant to use
    let tenantId = tenantIdHeader

    // If no tenant ID provided, find user's primary tenant
    if (!tenantId) {
      // First check if user is an owner
      const { data: ownedTenant } = await supabase
        .from('tenants')
        .select('id')
        .eq('owner_user_id', user.id)
        .single()

      if (ownedTenant) {
        tenantId = ownedTenant.id
      } else {
        // Check for membership
        const { data: membership } = await supabase
          .from('tenant_members')
          .select('tenant_id')
          .eq('user_id', user.id)
          .eq('status', 'active')
          .limit(1)
          .single()

        if (membership) {
          tenantId = membership.tenant_id
        }
      }
    }

    if (!tenantId) {
      return next()
    }

    // Get user's role in the tenant
    // First check if owner
    const { data: tenant } = await supabase
      .from('tenants')
      .select('id, owner_user_id')
      .eq('id', tenantId)
      .single()

    let roleInfo: RoleInfo | null = null

    if (tenant && tenant.owner_user_id === user.id) {
      // User is owner - get owner role from roles table
      const { data: ownerRole } = await supabase
        .from('roles')
        .select('id, name, slug, is_system_role, permissions')
        .eq('tenant_id', tenantId)
        .eq('slug', 'owner')
        .single()

      if (ownerRole) {
        roleInfo = ownerRole as RoleInfo
      }
    } else {
      // Check tenant_members with role join
      const { data: membership } = await supabase
        .from('tenant_members')
        .select(`
          role_id,
          roles (id, name, slug, is_system_role, permissions)
        `)
        .eq('tenant_id', tenantId)
        .eq('user_id', user.id)
        .eq('status', 'active')
        .single()

      if (!membership || !membership.roles) {
        return next() // No valid membership
      }

      roleInfo = membership.roles as unknown as RoleInfo
    }

    if (!roleInfo) {
      return next()
    }

    // Attach context to request
    req.userContext = {
      userId: user.id,
      email: user.email || '',
      tenantId,
      role: roleInfo
    }

    next()
  } catch (error) {
    console.error('Error in attachUserContext:', error)
    next()
  }
}

/**
 * Middleware factory to require a specific permission level
 * Must be used after attachUserContext
 */
export function requirePermission(resource: string, required: Permission) {
  return (req: Request, res: Response, next: NextFunction) => {
    const context = req.userContext

    if (!context) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const permissions = context.role.permissions || {}
    if (!hasPermission(permissions, resource, required)) {
      return res.status(403).json({
        error: 'Access denied',
        message: `Insufficient permissions for ${resource}`,
        required_permission: required,
        your_permission: getPermission(permissions, resource)
      })
    }

    next()
  }
}

/**
 * Middleware to require owner role specifically
 */
export function requireOwner(req: Request, res: Response, next: NextFunction) {
  const context = req.userContext

  if (!context) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  if (context.role.slug !== 'owner' && !context.role.is_system_role) {
    return res.status(403).json({
      error: 'Access denied',
      message: 'This action requires owner privileges'
    })
  }

  next()
}

/**
 * Middleware to require authentication (any role)
 */
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const context = req.userContext

  if (!context) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  next()
}

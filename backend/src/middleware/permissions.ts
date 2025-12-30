import { Request, Response, NextFunction } from 'express'
import { supabase } from '../lib/supabase.js'

// ============================================
// TYPES
// ============================================

export type Role = 'owner' | 'general_manager' | 'accountant'
export type Permission = 'none' | 'view' | 'edit' | 'full'

export interface UserContext {
  userId: string
  email: string
  tenantId: string
  role: Role
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
// PERMISSION MATRIX
// Industry standard for hospitality management
// ============================================

const PERMISSIONS: Record<string, Record<Role, Permission>> = {
  // Dashboard - View analytics and overview
  'dashboard': {
    owner: 'full',
    general_manager: 'full',
    accountant: 'view'
  },

  // Bookings - Create, view, modify reservations
  'bookings': {
    owner: 'full',
    general_manager: 'full',
    accountant: 'view'
  },

  // Rooms - Manage room inventory and settings
  'rooms': {
    owner: 'full',
    general_manager: 'full',
    accountant: 'view'
  },

  // Reviews - View and respond to guest reviews
  'reviews': {
    owner: 'full',
    general_manager: 'full',
    accountant: 'view'
  },

  // Calendar - View and manage availability
  'calendar': {
    owner: 'full',
    general_manager: 'full',
    accountant: 'view'
  },

  // Settings - Account (own profile)
  'settings.account': {
    owner: 'full',
    general_manager: 'edit', // Can edit own profile only
    accountant: 'edit'       // Can edit own profile only
  },

  // Settings - Business information
  'settings.business': {
    owner: 'full',
    general_manager: 'full',
    accountant: 'view'
  },

  // Settings - Team members
  'settings.members': {
    owner: 'full',
    general_manager: 'view',
    accountant: 'none'
  },

  // Settings - Billing and payments
  'settings.billing': {
    owner: 'full',
    general_manager: 'none',
    accountant: 'full'
  },

  // Account deletion
  'account.delete': {
    owner: 'full',
    general_manager: 'none',
    accountant: 'none'
  },

  // Seasonal rates
  'seasonal_rates': {
    owner: 'full',
    general_manager: 'full',
    accountant: 'view'
  },

  // Addons
  'addons': {
    owner: 'full',
    general_manager: 'full',
    accountant: 'view'
  },

  // Reports (financial)
  'reports': {
    owner: 'full',
    general_manager: 'view',
    accountant: 'full'
  },

  // Payments
  'payments': {
    owner: 'full',
    general_manager: 'view',
    accountant: 'full'
  }
}

// ============================================
// PERMISSION FUNCTIONS
// ============================================

/**
 * Get the permission level for a resource and role
 */
export function getPermission(resource: string, role: Role): Permission {
  return PERMISSIONS[resource]?.[role] || 'none'
}

/**
 * Check if a role has at least the required permission level
 */
export function hasPermission(resource: string, role: Role, required: Permission): boolean {
  const userPermission = getPermission(resource, role)
  const levels: Permission[] = ['none', 'view', 'edit', 'full']
  return levels.indexOf(userPermission) >= levels.indexOf(required)
}

/**
 * Get all permissions for a role (for frontend)
 */
export function getRolePermissions(role: Role): Record<string, Permission> {
  const result: Record<string, Permission> = {}
  for (const resource of Object.keys(PERMISSIONS)) {
    result[resource] = PERMISSIONS[resource][role]
  }
  return result
}

// ============================================
// MIDDLEWARE
// ============================================

/**
 * Middleware to attach user context (role, tenant) to request
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

    let role: Role

    if (tenant && tenant.owner_user_id === user.id) {
      role = 'owner'
    } else {
      // Check tenant_members
      const { data: membership } = await supabase
        .from('tenant_members')
        .select('role')
        .eq('tenant_id', tenantId)
        .eq('user_id', user.id)
        .eq('status', 'active')
        .single()

      if (!membership) {
        return next() // No valid membership
      }

      role = membership.role as Role
    }

    // Attach context to request
    req.userContext = {
      userId: user.id,
      email: user.email || '',
      tenantId,
      role
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

    if (!hasPermission(resource, context.role, required)) {
      return res.status(403).json({
        error: 'Access denied',
        message: `Insufficient permissions for ${resource}`,
        required_permission: required,
        your_permission: getPermission(resource, context.role)
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

  if (context.role !== 'owner') {
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

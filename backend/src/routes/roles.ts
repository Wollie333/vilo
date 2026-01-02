import { Router, Request, Response } from 'express'
import { supabase } from '../lib/supabase.js'

const router = Router()

// Types
type Permission = 'none' | 'view' | 'edit' | 'full'

interface Role {
  id: string
  tenant_id: string
  name: string
  slug: string
  description: string | null
  is_system_role: boolean
  is_default: boolean
  permissions: Record<string, Permission>
  created_at: string
  updated_at: string
}

interface RoleWithMemberCount extends Role {
  member_count: number
}

interface AuthResult {
  user: { id: string; email: string } | null
  tenant: { id: string; name: string } | null
  role: Role | null
  error: string | null
}

// All available resources that can have permissions
const RESOURCES = [
  'dashboard',
  'bookings',
  'rooms',
  'calendar',
  'reviews',
  'reports',
  'payments',
  'settings.account',
  'settings.business',
  'settings.members',
  'settings.billing',
  'settings.roles',
  'account.delete',
  'seasonal_rates',
  'addons'
] as const

const VALID_PERMISSIONS: Permission[] = ['none', 'view', 'edit', 'full']

// ============================================
// HELPER FUNCTIONS
// ============================================

// Generate a URL-friendly slug from a name
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '_')
    .replace(/-+/g, '_')
    .substring(0, 50)
}

// Verify JWT and get user's role in their tenant
async function verifyAuthWithRole(authHeader: string | undefined): Promise<AuthResult> {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { user: null, tenant: null, role: null, error: 'Missing or invalid authorization header' }
  }

  const token = authHeader.split(' ')[1]

  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      return { user: null, tenant: null, role: null, error: 'Invalid token' }
    }

    // Check if user is an owner
    const { data: ownerTenant } = await supabase
      .from('tenants')
      .select('id, name, business_name')
      .eq('owner_user_id', user.id)
      .single()

    if (ownerTenant) {
      // Get the owner role
      const { data: ownerRole } = await supabase
        .from('roles')
        .select('*')
        .eq('tenant_id', ownerTenant.id)
        .eq('slug', 'owner')
        .single()

      return {
        user: { id: user.id, email: user.email || '' },
        tenant: {
          id: ownerTenant.id,
          name: ownerTenant.business_name || ownerTenant.name || 'Workspace'
        },
        role: ownerRole as Role,
        error: null
      }
    }

    // Check if user is a team member
    const { data: membership } = await supabase
      .from('tenant_members')
      .select(`
        role_id,
        tenant_id,
        tenants (id, name, business_name),
        roles (*)
      `)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single()

    if (membership && membership.tenants && membership.roles) {
      const tenant = membership.tenants as any
      // Cast roles to single object since Supabase returns foreign key relations as objects
      const roleData = membership.roles as unknown as Role
      return {
        user: { id: user.id, email: user.email || '' },
        tenant: {
          id: tenant.id,
          name: tenant.business_name || tenant.name || 'Workspace'
        },
        role: roleData,
        error: null
      }
    }

    return { user: { id: user.id, email: user.email || '' }, tenant: null, role: null, error: 'No workspace found' }
  } catch (error) {
    console.error('Error in verifyAuthWithRole:', error)
    return { user: null, tenant: null, role: null, error: 'Authentication failed' }
  }
}

// Validate permissions object
function validatePermissions(permissions: Record<string, string>): { valid: boolean; error?: string } {
  for (const [resource, permission] of Object.entries(permissions)) {
    if (!RESOURCES.includes(resource as any)) {
      return { valid: false, error: `Invalid resource: ${resource}` }
    }
    if (!VALID_PERMISSIONS.includes(permission as Permission)) {
      return { valid: false, error: `Invalid permission level for ${resource}: ${permission}` }
    }
  }
  return { valid: true }
}

// ============================================
// ROUTES
// ============================================

/**
 * GET /roles
 * List all roles for the tenant with member counts
 */
router.get('/', async (req: Request, res: Response) => {
  const { user, tenant, role, error } = await verifyAuthWithRole(req.headers.authorization)

  if (error || !user || !tenant) {
    return res.status(401).json({ error: error || 'Unauthorized' })
  }

  // Check if user has permission to view roles
  const rolePermission = role?.permissions?.['settings.roles'] || 'none'
  if (rolePermission === 'none') {
    return res.status(403).json({ error: 'Access denied', message: 'You do not have permission to view roles' })
  }

  try {
    // Get all roles for the tenant
    const { data: roles, error: rolesError } = await supabase
      .from('roles')
      .select('*')
      .eq('tenant_id', tenant.id)
      .order('is_system_role', { ascending: false })
      .order('is_default', { ascending: false })
      .order('name', { ascending: true })

    if (rolesError) {
      console.error('Error fetching roles:', rolesError)
      return res.status(500).json({ error: 'Failed to fetch roles' })
    }

    // Get member counts per role
    const { data: memberCounts, error: countError } = await supabase
      .from('tenant_members')
      .select('role_id')
      .eq('tenant_id', tenant.id)
      .in('status', ['active', 'pending'])

    if (countError) {
      console.error('Error fetching member counts:', countError)
    }

    // Count members per role
    const countMap: Record<string, number> = {}
    if (memberCounts) {
      for (const member of memberCounts) {
        if (member.role_id) {
          countMap[member.role_id] = (countMap[member.role_id] || 0) + 1
        }
      }
    }

    // Also count owner (who isn't in tenant_members)
    const ownerRoleId = roles?.find(r => r.slug === 'owner')?.id
    if (ownerRoleId) {
      countMap[ownerRoleId] = (countMap[ownerRoleId] || 0) + 1
    }

    // Combine roles with member counts
    const rolesWithCounts: RoleWithMemberCount[] = (roles || []).map(r => ({
      ...r,
      member_count: countMap[r.id] || 0
    }))

    res.json({ roles: rolesWithCounts })
  } catch (error) {
    console.error('Error in GET /roles:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * GET /roles/:id
 * Get a single role with its permissions
 */
router.get('/:id', async (req: Request, res: Response) => {
  const { id } = req.params
  const { user, tenant, role, error } = await verifyAuthWithRole(req.headers.authorization)

  if (error || !user || !tenant) {
    return res.status(401).json({ error: error || 'Unauthorized' })
  }

  // Check permission
  const rolePermission = role?.permissions?.['settings.roles'] || 'none'
  if (rolePermission === 'none') {
    return res.status(403).json({ error: 'Access denied' })
  }

  try {
    const { data: targetRole, error: roleError } = await supabase
      .from('roles')
      .select('*')
      .eq('id', id)
      .eq('tenant_id', tenant.id)
      .single()

    if (roleError || !targetRole) {
      return res.status(404).json({ error: 'Role not found' })
    }

    res.json({ role: targetRole })
  } catch (error) {
    console.error('Error in GET /roles/:id:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * POST /roles
 * Create a new custom role
 */
router.post('/', async (req: Request, res: Response) => {
  const { name, description, permissions, copyFromRoleId } = req.body
  const { user, tenant, role, error } = await verifyAuthWithRole(req.headers.authorization)

  if (error || !user || !tenant) {
    return res.status(401).json({ error: error || 'Unauthorized' })
  }

  // Check permission - need 'full' to create roles
  const rolePermission = role?.permissions?.['settings.roles'] || 'none'
  if (rolePermission !== 'full') {
    return res.status(403).json({ error: 'Access denied', message: 'You do not have permission to create roles' })
  }

  // Validate name
  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return res.status(400).json({ error: 'Role name is required' })
  }

  if (name.trim().length > 50) {
    return res.status(400).json({ error: 'Role name must be 50 characters or less' })
  }

  try {
    // Generate slug
    let slug = generateSlug(name)

    // Check for slug uniqueness and append number if needed
    const { data: existingSlugs } = await supabase
      .from('roles')
      .select('slug')
      .eq('tenant_id', tenant.id)
      .like('slug', `${slug}%`)

    if (existingSlugs && existingSlugs.length > 0) {
      const slugSet = new Set(existingSlugs.map(r => r.slug))
      let counter = 1
      let newSlug = slug
      while (slugSet.has(newSlug)) {
        newSlug = `${slug}_${counter}`
        counter++
      }
      slug = newSlug
    }

    // Determine permissions
    let rolePermissions: Record<string, Permission> = {}

    if (copyFromRoleId) {
      // Copy permissions from existing role
      const { data: sourceRole } = await supabase
        .from('roles')
        .select('permissions')
        .eq('id', copyFromRoleId)
        .eq('tenant_id', tenant.id)
        .single()

      if (sourceRole) {
        rolePermissions = sourceRole.permissions as Record<string, Permission>
      }
    } else if (permissions) {
      // Use provided permissions
      const validation = validatePermissions(permissions)
      if (!validation.valid) {
        return res.status(400).json({ error: validation.error })
      }
      rolePermissions = permissions
    } else {
      // Default: all permissions set to 'view'
      for (const resource of RESOURCES) {
        rolePermissions[resource] = 'view'
      }
    }

    // Create the role
    const { data: newRole, error: createError } = await supabase
      .from('roles')
      .insert({
        tenant_id: tenant.id,
        name: name.trim(),
        slug,
        description: description?.trim() || null,
        is_system_role: false,
        is_default: false,
        permissions: rolePermissions
      })
      .select()
      .single()

    if (createError) {
      console.error('Error creating role:', createError)
      if (createError.code === '23505') {
        return res.status(409).json({ error: 'A role with this name already exists' })
      }
      return res.status(500).json({ error: 'Failed to create role' })
    }

    res.status(201).json({ role: newRole })
  } catch (error) {
    console.error('Error in POST /roles:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * PATCH /roles/:id
 * Update role name and description
 */
router.patch('/:id', async (req: Request, res: Response) => {
  const { id } = req.params
  const { name, description } = req.body
  const { user, tenant, role, error } = await verifyAuthWithRole(req.headers.authorization)

  if (error || !user || !tenant) {
    return res.status(401).json({ error: error || 'Unauthorized' })
  }

  // Check permission
  const rolePermission = role?.permissions?.['settings.roles'] || 'none'
  if (rolePermission !== 'full') {
    return res.status(403).json({ error: 'Access denied' })
  }

  try {
    // Get the role to update
    const { data: targetRole } = await supabase
      .from('roles')
      .select('*')
      .eq('id', id)
      .eq('tenant_id', tenant.id)
      .single()

    if (!targetRole) {
      return res.status(404).json({ error: 'Role not found' })
    }

    // Cannot modify system roles
    if (targetRole.is_system_role) {
      return res.status(403).json({ error: 'Cannot modify system roles' })
    }

    // Build update object
    const updates: Partial<Role> = {}

    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim().length === 0) {
        return res.status(400).json({ error: 'Role name cannot be empty' })
      }
      if (name.trim().length > 50) {
        return res.status(400).json({ error: 'Role name must be 50 characters or less' })
      }
      updates.name = name.trim()
    }

    if (description !== undefined) {
      updates.description = description?.trim() || null
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' })
    }

    const { data: updatedRole, error: updateError } = await supabase
      .from('roles')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating role:', updateError)
      return res.status(500).json({ error: 'Failed to update role' })
    }

    res.json({ role: updatedRole })
  } catch (error) {
    console.error('Error in PATCH /roles/:id:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * PATCH /roles/:id/permissions
 * Update role permissions
 */
router.patch('/:id/permissions', async (req: Request, res: Response) => {
  const { id } = req.params
  const { permissions } = req.body
  const { user, tenant, role, error } = await verifyAuthWithRole(req.headers.authorization)

  if (error || !user || !tenant) {
    return res.status(401).json({ error: error || 'Unauthorized' })
  }

  // Check permission
  const rolePermission = role?.permissions?.['settings.roles'] || 'none'
  if (rolePermission !== 'full') {
    return res.status(403).json({ error: 'Access denied' })
  }

  if (!permissions || typeof permissions !== 'object') {
    return res.status(400).json({ error: 'Permissions object is required' })
  }

  // Validate permissions
  const validation = validatePermissions(permissions)
  if (!validation.valid) {
    return res.status(400).json({ error: validation.error })
  }

  try {
    // Get the role to update
    const { data: targetRole } = await supabase
      .from('roles')
      .select('*')
      .eq('id', id)
      .eq('tenant_id', tenant.id)
      .single()

    if (!targetRole) {
      return res.status(404).json({ error: 'Role not found' })
    }

    // Cannot modify system role permissions
    if (targetRole.is_system_role) {
      return res.status(403).json({ error: 'Cannot modify system role permissions' })
    }

    // Merge with existing permissions
    const updatedPermissions = {
      ...targetRole.permissions,
      ...permissions
    }

    const { data: updatedRole, error: updateError } = await supabase
      .from('roles')
      .update({ permissions: updatedPermissions })
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating permissions:', updateError)
      return res.status(500).json({ error: 'Failed to update permissions' })
    }

    res.json({ role: updatedRole })
  } catch (error) {
    console.error('Error in PATCH /roles/:id/permissions:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * DELETE /roles/:id
 * Delete a custom role
 */
router.delete('/:id', async (req: Request, res: Response) => {
  const { id } = req.params
  const { reassignToRoleId } = req.body
  const { user, tenant, role, error } = await verifyAuthWithRole(req.headers.authorization)

  if (error || !user || !tenant) {
    return res.status(401).json({ error: error || 'Unauthorized' })
  }

  // Check permission
  const rolePermission = role?.permissions?.['settings.roles'] || 'none'
  if (rolePermission !== 'full') {
    return res.status(403).json({ error: 'Access denied' })
  }

  try {
    // Get the role to delete
    const { data: targetRole } = await supabase
      .from('roles')
      .select('*')
      .eq('id', id)
      .eq('tenant_id', tenant.id)
      .single()

    if (!targetRole) {
      return res.status(404).json({ error: 'Role not found' })
    }

    // Cannot delete system roles
    if (targetRole.is_system_role) {
      return res.status(403).json({ error: 'Cannot delete system roles' })
    }

    // Cannot delete default role without reassigning
    if (targetRole.is_default) {
      return res.status(400).json({ error: 'Cannot delete the default role. Set another role as default first.' })
    }

    // Check if any members have this role
    const { data: membersWithRole, error: memberError } = await supabase
      .from('tenant_members')
      .select('id')
      .eq('role_id', id)
      .in('status', ['active', 'pending'])

    if (memberError) {
      console.error('Error checking members:', memberError)
      return res.status(500).json({ error: 'Failed to check members with this role' })
    }

    if (membersWithRole && membersWithRole.length > 0) {
      if (!reassignToRoleId) {
        return res.status(400).json({
          error: 'Cannot delete role with assigned members',
          message: `${membersWithRole.length} member(s) have this role. Provide a reassignToRoleId to move them to another role.`,
          member_count: membersWithRole.length
        })
      }

      // Validate reassignment role
      const { data: reassignRole } = await supabase
        .from('roles')
        .select('id, is_system_role')
        .eq('id', reassignToRoleId)
        .eq('tenant_id', tenant.id)
        .single()

      if (!reassignRole) {
        return res.status(400).json({ error: 'Reassignment role not found' })
      }

      // Cannot reassign to owner role
      if (reassignRole.is_system_role) {
        return res.status(400).json({ error: 'Cannot reassign members to the owner role' })
      }

      // Reassign members
      const { error: reassignError } = await supabase
        .from('tenant_members')
        .update({ role_id: reassignToRoleId })
        .eq('role_id', id)

      if (reassignError) {
        console.error('Error reassigning members:', reassignError)
        return res.status(500).json({ error: 'Failed to reassign members' })
      }
    }

    // Delete the role
    const { error: deleteError } = await supabase
      .from('roles')
      .delete()
      .eq('id', id)

    if (deleteError) {
      console.error('Error deleting role:', deleteError)
      return res.status(500).json({ error: 'Failed to delete role' })
    }

    res.json({ success: true, message: 'Role deleted successfully' })
  } catch (error) {
    console.error('Error in DELETE /roles/:id:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * POST /roles/:id/duplicate
 * Duplicate a role with a new name
 */
router.post('/:id/duplicate', async (req: Request, res: Response) => {
  const { id } = req.params
  const { name } = req.body
  const { user, tenant, role, error } = await verifyAuthWithRole(req.headers.authorization)

  if (error || !user || !tenant) {
    return res.status(401).json({ error: error || 'Unauthorized' })
  }

  // Check permission
  const rolePermission = role?.permissions?.['settings.roles'] || 'none'
  if (rolePermission !== 'full') {
    return res.status(403).json({ error: 'Access denied' })
  }

  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return res.status(400).json({ error: 'New role name is required' })
  }

  try {
    // Get the source role
    const { data: sourceRole } = await supabase
      .from('roles')
      .select('*')
      .eq('id', id)
      .eq('tenant_id', tenant.id)
      .single()

    if (!sourceRole) {
      return res.status(404).json({ error: 'Role not found' })
    }

    // Generate unique slug
    let slug = generateSlug(name)
    const { data: existingSlugs } = await supabase
      .from('roles')
      .select('slug')
      .eq('tenant_id', tenant.id)
      .like('slug', `${slug}%`)

    if (existingSlugs && existingSlugs.length > 0) {
      const slugSet = new Set(existingSlugs.map(r => r.slug))
      let counter = 1
      let newSlug = slug
      while (slugSet.has(newSlug)) {
        newSlug = `${slug}_${counter}`
        counter++
      }
      slug = newSlug
    }

    // Create the duplicate
    const { data: newRole, error: createError } = await supabase
      .from('roles')
      .insert({
        tenant_id: tenant.id,
        name: name.trim(),
        slug,
        description: sourceRole.description,
        is_system_role: false,
        is_default: false,
        permissions: sourceRole.permissions
      })
      .select()
      .single()

    if (createError) {
      console.error('Error duplicating role:', createError)
      return res.status(500).json({ error: 'Failed to duplicate role' })
    }

    res.status(201).json({ role: newRole })
  } catch (error) {
    console.error('Error in POST /roles/:id/duplicate:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * PATCH /roles/:id/default
 * Set a role as the default for new members
 */
router.patch('/:id/default', async (req: Request, res: Response) => {
  const { id } = req.params
  const { user, tenant, role, error } = await verifyAuthWithRole(req.headers.authorization)

  if (error || !user || !tenant) {
    return res.status(401).json({ error: error || 'Unauthorized' })
  }

  // Check permission
  const rolePermission = role?.permissions?.['settings.roles'] || 'none'
  if (rolePermission !== 'full') {
    return res.status(403).json({ error: 'Access denied' })
  }

  try {
    // Get the role
    const { data: targetRole } = await supabase
      .from('roles')
      .select('*')
      .eq('id', id)
      .eq('tenant_id', tenant.id)
      .single()

    if (!targetRole) {
      return res.status(404).json({ error: 'Role not found' })
    }

    // Cannot set system role as default
    if (targetRole.is_system_role) {
      return res.status(400).json({ error: 'Cannot set system role as default' })
    }

    // Clear default from all other roles
    await supabase
      .from('roles')
      .update({ is_default: false })
      .eq('tenant_id', tenant.id)

    // Set this role as default
    const { data: updatedRole, error: updateError } = await supabase
      .from('roles')
      .update({ is_default: true })
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      console.error('Error setting default role:', updateError)
      return res.status(500).json({ error: 'Failed to set default role' })
    }

    res.json({ role: updatedRole })
  } catch (error) {
    console.error('Error in PATCH /roles/:id/default:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router

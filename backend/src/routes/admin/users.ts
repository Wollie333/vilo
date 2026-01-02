import { Router, Response } from 'express'
import { supabase } from '../../lib/supabase.js'
import { SuperAdminRequest, requirePermission, logAdminAction, auditLog } from '../../middleware/superAdmin.js'

const router = Router()

/**
 * GET /api/admin/users
 * List all users across all tenants (grouped by user_id)
 */
router.get('/', requirePermission('users'), async (req: SuperAdminRequest, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1
    const limit = parseInt(req.query.limit as string) || 20
    const search = req.query.search as string
    const tenantId = req.query.tenantId as string

    // Get all tenant_members with their tenant info (exclude removed)
    let query = supabase
      .from('tenant_members')
      .select(`
        id,
        user_id,
        email,
        tenant_id,
        status,
        created_at,
        tenants (id, business_name),
        roles (id, name, slug)
      `)
      .neq('status', 'removed')

    // Apply filters
    if (search) {
      query = query.ilike('email', `%${search}%`)
    }

    if (tenantId) {
      query = query.eq('tenant_id', tenantId)
    }

    query = query.order('created_at', { ascending: false })

    const { data: members, error } = await query

    if (error) {
      console.error('List users error:', error)
      return res.status(500).json({ error: 'Failed to list users' })
    }

    // Group members by user_id to create unique users with their memberships
    const userMap = new Map<string, {
      id: string
      email: string
      displayName?: string
      tenantMemberships: {
        tenantId: string
        tenantName: string
        role: string
        status: string
      }[]
      createdAt: string
    }>()

    for (const member of (members || [])) {
      const userId = member.user_id

      if (!userMap.has(userId)) {
        userMap.set(userId, {
          id: userId,
          email: member.email,
          displayName: member.email.split('@')[0], // Use email prefix as display name
          tenantMemberships: [],
          createdAt: member.created_at
        })
      }

      const user = userMap.get(userId)!
      user.tenantMemberships.push({
        tenantId: member.tenant_id,
        tenantName: (member.tenants as any)?.business_name || 'Unknown',
        role: (member.roles as any)?.name || 'Unknown',
        status: member.status
      })

      // Use earliest createdAt
      if (member.created_at < user.createdAt) {
        user.createdAt = member.created_at
      }
    }

    // Convert to array and paginate
    const allUsers = Array.from(userMap.values())
    const total = allUsers.length
    const offset = (page - 1) * limit
    const paginatedUsers = allUsers.slice(offset, offset + limit)

    res.json({
      users: paginatedUsers,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    })
  } catch (error) {
    console.error('List users error:', error)
    res.status(500).json({ error: 'Failed to list users' })
  }
})

/**
 * GET /api/admin/users/:id
 * Get user details with all tenant memberships
 */
router.get('/:id', requirePermission('users'), async (req: SuperAdminRequest, res: Response) => {
  try {
    const { id } = req.params

    // Get user membership
    const { data: member, error } = await supabase
      .from('tenant_members')
      .select(`
        *,
        tenants (id, business_name, business_email),
        roles (id, name, slug, permissions)
      `)
      .eq('id', id)
      .single()

    if (error || !member) {
      return res.status(404).json({ error: 'User not found' })
    }

    // Get all memberships for this user
    const { data: allMemberships } = await supabase
      .from('tenant_members')
      .select(`
        id,
        tenant_id,
        status,
        created_at,
        tenants (business_name),
        roles (name, slug)
      `)
      .eq('user_id', member.user_id)

    res.json({
      user: {
        id: member.id,
        userId: member.user_id,
        email: member.email,
        name: member.email.split('@')[0], // Use email prefix as display name
        status: member.status,
        createdAt: member.created_at
      },
      currentMembership: {
        tenantId: member.tenant_id,
        tenantName: member.tenants?.business_name,
        role: member.roles?.name,
        roleSlug: member.roles?.slug,
        permissions: member.roles?.permissions
      },
      allMemberships: allMemberships?.map((m: any) => ({
        id: m.id,
        tenantId: m.tenant_id,
        tenantName: m.tenants?.business_name,
        role: m.roles?.name,
        status: m.status,
        createdAt: m.created_at
      })) || []
    })
  } catch (error) {
    console.error('Get user error:', error)
    res.status(500).json({ error: 'Failed to get user' })
  }
})

/**
 * POST /api/admin/users/:id/suspend
 * Suspend user across all tenants
 */
router.post('/:id/suspend', requirePermission('users'), auditLog('user.suspend', 'user'), async (req: SuperAdminRequest, res: Response) => {
  try {
    const { id } = req.params
    const { reason } = req.body

    // Get user's user_id
    const { data: member } = await supabase
      .from('tenant_members')
      .select('user_id, email')
      .eq('id', id)
      .single()

    if (!member) {
      return res.status(404).json({ error: 'User not found' })
    }

    // Suspend all memberships for this user
    await supabase
      .from('tenant_members')
      .update({ status: 'suspended' })
      .eq('user_id', member.user_id)

    // Log the action
    if (req.superAdmin) {
      await logAdminAction({
        adminId: req.superAdmin.id,
        adminEmail: req.superAdmin.email,
        action: 'user.suspend',
        resourceType: 'user',
        resourceId: id,
        description: `Suspended user ${member.email}: ${reason || 'No reason provided'}`,
        metadata: { reason, userEmail: member.email },
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      })
    }

    res.json({ success: true, message: 'User suspended successfully' })
  } catch (error) {
    console.error('Suspend user error:', error)
    res.status(500).json({ error: 'Failed to suspend user' })
  }
})

/**
 * POST /api/admin/users/:id/activate
 * Reactivate a suspended user
 */
router.post('/:id/activate', requirePermission('users'), auditLog('user.activate', 'user'), async (req: SuperAdminRequest, res: Response) => {
  try {
    const { id } = req.params

    // Get user's user_id
    const { data: member } = await supabase
      .from('tenant_members')
      .select('user_id, email')
      .eq('id', id)
      .single()

    if (!member) {
      return res.status(404).json({ error: 'User not found' })
    }

    // Reactivate all memberships for this user
    await supabase
      .from('tenant_members')
      .update({ status: 'active' })
      .eq('user_id', member.user_id)
      .eq('status', 'suspended')

    // Log the action
    if (req.superAdmin) {
      await logAdminAction({
        adminId: req.superAdmin.id,
        adminEmail: req.superAdmin.email,
        action: 'user.activate',
        resourceType: 'user',
        resourceId: id,
        description: `Reactivated user ${member.email}`,
        metadata: { userEmail: member.email },
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      })
    }

    res.json({ success: true, message: 'User activated successfully' })
  } catch (error) {
    console.error('Activate user error:', error)
    res.status(500).json({ error: 'Failed to activate user' })
  }
})

/**
 * DELETE /api/admin/users/:id
 * Delete a user (remove from all tenants)
 */
router.delete('/:id', requirePermission('users'), auditLog('user.delete', 'user'), async (req: SuperAdminRequest, res: Response) => {
  try {
    const { id } = req.params

    // Get user's user_id
    const { data: member } = await supabase
      .from('tenant_members')
      .select('user_id, email')
      .eq('id', id)
      .single()

    if (!member) {
      return res.status(404).json({ error: 'User not found' })
    }

    // Mark all memberships as removed
    await supabase
      .from('tenant_members')
      .update({ status: 'removed' })
      .eq('user_id', member.user_id)

    // Log the action
    if (req.superAdmin) {
      await logAdminAction({
        adminId: req.superAdmin.id,
        adminEmail: req.superAdmin.email,
        action: 'user.delete',
        resourceType: 'user',
        resourceId: id,
        description: `Deleted user ${member.email}`,
        metadata: { userEmail: member.email },
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      })
    }

    res.json({ success: true, message: 'User deleted successfully' })
  } catch (error) {
    console.error('Delete user error:', error)
    res.status(500).json({ error: 'Failed to delete user' })
  }
})

/**
 * POST /api/admin/users/:id/impersonate
 * Generate impersonation token (with strict audit logging)
 */
router.post('/:id/impersonate', requirePermission('users'), async (req: SuperAdminRequest, res: Response) => {
  try {
    const { id } = req.params

    // Only super_admin can impersonate
    if (req.superAdmin?.role !== 'super_admin') {
      return res.status(403).json({ error: 'Only super admins can impersonate users' })
    }

    // Get user details
    const { data: member } = await supabase
      .from('tenant_members')
      .select('user_id, email, tenant_id, tenants(business_name)')
      .eq('id', id)
      .single()

    if (!member) {
      return res.status(404).json({ error: 'User not found' })
    }

    // Log this action with high detail (CRITICAL for security)
    if (req.superAdmin) {
      await logAdminAction({
        adminId: req.superAdmin.id,
        adminEmail: req.superAdmin.email,
        action: 'user.impersonate',
        resourceType: 'user',
        resourceId: id,
        description: `SECURITY: Admin impersonated user ${member.email}`,
        metadata: {
          userEmail: member.email,
          userId: member.user_id,
          tenantId: member.tenant_id,
          timestamp: new Date().toISOString()
        },
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      })
    }

    // Return impersonation info (actual token generation depends on auth system)
    // In production, you'd generate a special JWT or session token
    res.json({
      success: true,
      impersonation: {
        userId: member.user_id,
        email: member.email,
        tenantId: member.tenant_id,
        tenantName: (member.tenants as any)?.business_name,
        // In production: include a signed impersonation token
        note: 'Impersonation logged for audit purposes'
      }
    })
  } catch (error) {
    console.error('Impersonate user error:', error)
    res.status(500).json({ error: 'Failed to impersonate user' })
  }
})

/**
 * GET /api/admin/users/:id/activity
 * Get user activity log
 */
router.get('/:id/activity', requirePermission('users'), async (req: SuperAdminRequest, res: Response) => {
  try {
    const { id } = req.params
    const limit = parseInt(req.query.limit as string) || 50

    // Get user's user_id first
    const { data: member } = await supabase
      .from('tenant_members')
      .select('user_id')
      .eq('id', id)
      .single()

    if (!member) {
      return res.status(404).json({ error: 'User not found' })
    }

    // Get activity from customer_activity if the user has any
    const { data: activity } = await supabase
      .from('customer_activity')
      .select('*')
      .eq('user_id', member.user_id)
      .order('created_at', { ascending: false })
      .limit(limit)

    res.json(activity || [])
  } catch (error) {
    console.error('Get user activity error:', error)
    res.status(500).json({ error: 'Failed to get user activity' })
  }
})

export default router

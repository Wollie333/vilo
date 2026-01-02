import { Router, Response } from 'express'
import { supabase } from '../../lib/supabase.js'
import { SuperAdminRequest, requirePermission, logAdminAction, auditLog } from '../../middleware/superAdmin.js'

const router = Router()

/**
 * GET /api/admin/teams
 * List all super-admin team members
 */
router.get('/', requirePermission('teams'), async (req: SuperAdminRequest, res: Response) => {
  try {
    const { data: members, error } = await supabase
      .from('super_admins')
      .select('*')
      .neq('status', 'removed')
      .order('created_at', { ascending: true })

    if (error) {
      return res.status(500).json({ error: 'Failed to get team members' })
    }

    const safeMembers = members?.map(m => ({
      id: m.id,
      email: m.email,
      displayName: m.display_name,
      role: m.role,
      permissions: m.permissions,
      status: m.status,
      avatarUrl: m.avatar_url,
      lastLoginAt: m.last_login_at,
      createdAt: m.created_at
    })) || []

    res.json(safeMembers)
  } catch (error) {
    console.error('Get team members error:', error)
    res.status(500).json({ error: 'Failed to get team members' })
  }
})

/**
 * GET /api/admin/teams/:id
 * Get team member details
 */
router.get('/:id', requirePermission('teams'), async (req: SuperAdminRequest, res: Response) => {
  try {
    const { id } = req.params

    const { data: member, error } = await supabase
      .from('super_admins')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !member) {
      return res.status(404).json({ error: 'Team member not found' })
    }

    res.json({
      id: member.id,
      email: member.email,
      displayName: member.display_name,
      role: member.role,
      permissions: member.permissions,
      status: member.status,
      avatarUrl: member.avatar_url,
      lastLoginAt: member.last_login_at,
      createdBy: member.created_by,
      createdAt: member.created_at,
      updatedAt: member.updated_at
    })
  } catch (error) {
    console.error('Get team member error:', error)
    res.status(500).json({ error: 'Failed to get team member' })
  }
})

/**
 * POST /api/admin/teams/invite
 * Invite a new super-admin team member
 */
router.post('/invite', requirePermission('teams'), auditLog('team.invite', 'team'), async (req: SuperAdminRequest, res: Response) => {
  try {
    // Only super_admin can invite new team members
    if (req.superAdmin?.role !== 'super_admin') {
      return res.status(403).json({ error: 'Only super admins can invite team members' })
    }

    const { email, display_name, role, permissions } = req.body

    if (!email || !role) {
      return res.status(400).json({ error: 'Email and role are required' })
    }

    // Check if email already exists
    const { data: existing } = await supabase
      .from('super_admins')
      .select('id')
      .eq('email', email)
      .single()

    if (existing) {
      return res.status(400).json({ error: 'Email already registered as admin' })
    }

    // Create Supabase auth user
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email,
      email_confirm: true,
      user_metadata: { display_name, role: 'super_admin' }
    })

    if (authError || !authUser.user) {
      console.error('Create auth user error:', authError)
      return res.status(500).json({ error: 'Failed to create user account' })
    }

    // Default permissions based on role
    const defaultPermissions: Record<string, Record<string, boolean>> = {
      super_admin: {
        analytics: true, tenants: true, users: true, plans: true,
        integrations: true, marketing: true, teams: true, errors: true,
        backups: true, settings: true
      },
      admin: {
        analytics: true, tenants: true, users: true, plans: true,
        integrations: true, marketing: true, teams: false, errors: true,
        backups: false, settings: false
      },
      support: {
        analytics: true, tenants: true, users: true, plans: false,
        integrations: false, marketing: false, teams: false, errors: true,
        backups: false, settings: false
      },
      marketing: {
        analytics: true, tenants: false, users: false, plans: false,
        integrations: false, marketing: true, teams: false, errors: false,
        backups: false, settings: false
      },
      finance: {
        analytics: true, tenants: true, users: false, plans: true,
        integrations: true, marketing: false, teams: false, errors: false,
        backups: false, settings: false
      }
    }

    // Create super_admin record
    const { data: member, error } = await supabase
      .from('super_admins')
      .insert({
        user_id: authUser.user.id,
        email,
        display_name: display_name || email.split('@')[0],
        role,
        permissions: permissions || defaultPermissions[role] || defaultPermissions.support,
        status: 'active',
        created_by: req.superAdmin?.id
      })
      .select()
      .single()

    if (error) {
      console.error('Create admin record error:', error)
      // Cleanup auth user
      await supabase.auth.admin.deleteUser(authUser.user.id)
      return res.status(500).json({ error: 'Failed to create team member' })
    }

    // Send password reset email
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/admin/setup-password`
    })

    res.status(201).json({
      id: member.id,
      email: member.email,
      displayName: member.display_name,
      role: member.role,
      status: member.status,
      message: 'Invitation sent. User will receive a password setup email.'
    })
  } catch (error) {
    console.error('Invite team member error:', error)
    res.status(500).json({ error: 'Failed to invite team member' })
  }
})

/**
 * PATCH /api/admin/teams/:id
 * Update team member role/permissions
 */
router.patch('/:id', requirePermission('teams'), auditLog('team.update', 'team'), async (req: SuperAdminRequest, res: Response) => {
  try {
    // Only super_admin can update team members
    if (req.superAdmin?.role !== 'super_admin') {
      return res.status(403).json({ error: 'Only super admins can update team members' })
    }

    const { id } = req.params
    const { role, permissions, display_name, status } = req.body

    // Can't edit yourself
    if (id === req.superAdmin?.id) {
      return res.status(400).json({ error: 'Cannot edit your own account' })
    }

    const updates: Record<string, any> = { updated_at: new Date().toISOString() }

    if (role) updates.role = role
    if (permissions) updates.permissions = permissions
    if (display_name) updates.display_name = display_name
    if (status) updates.status = status

    const { data: member, error } = await supabase
      .from('super_admins')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return res.status(500).json({ error: 'Failed to update team member' })
    }

    res.json({
      id: member.id,
      email: member.email,
      displayName: member.display_name,
      role: member.role,
      permissions: member.permissions,
      status: member.status
    })
  } catch (error) {
    console.error('Update team member error:', error)
    res.status(500).json({ error: 'Failed to update team member' })
  }
})

/**
 * DELETE /api/admin/teams/:id
 * Remove team member
 */
router.delete('/:id', requirePermission('teams'), auditLog('team.remove', 'team'), async (req: SuperAdminRequest, res: Response) => {
  try {
    // Only super_admin can remove team members
    if (req.superAdmin?.role !== 'super_admin') {
      return res.status(403).json({ error: 'Only super admins can remove team members' })
    }

    const { id } = req.params

    // Can't remove yourself
    if (id === req.superAdmin?.id) {
      return res.status(400).json({ error: 'Cannot remove your own account' })
    }

    // Get member to check role
    const { data: member } = await supabase
      .from('super_admins')
      .select('role, user_id')
      .eq('id', id)
      .single()

    if (!member) {
      return res.status(404).json({ error: 'Team member not found' })
    }

    // Can't remove the last super_admin
    if (member.role === 'super_admin') {
      const { count } = await supabase
        .from('super_admins')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'super_admin')
        .eq('status', 'active')

      if (count && count <= 1) {
        return res.status(400).json({ error: 'Cannot remove the last super admin' })
      }
    }

    // Soft delete
    await supabase
      .from('super_admins')
      .update({ status: 'removed', updated_at: new Date().toISOString() })
      .eq('id', id)

    res.json({ success: true, message: 'Team member removed' })
  } catch (error) {
    console.error('Remove team member error:', error)
    res.status(500).json({ error: 'Failed to remove team member' })
  }
})

/**
 * GET /api/admin/teams/audit-log
 * Get admin action audit log
 */
router.get('/audit/log', requirePermission('teams'), async (req: SuperAdminRequest, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1
    const limit = parseInt(req.query.limit as string) || 50
    const adminId = req.query.admin_id as string
    const action = req.query.action as string
    const resourceType = req.query.resource_type as string

    const offset = (page - 1) * limit

    let query = supabase
      .from('admin_audit_logs')
      .select('*', { count: 'exact' })

    if (adminId) {
      query = query.eq('admin_id', adminId)
    }

    if (action) {
      query = query.ilike('action', `%${action}%`)
    }

    if (resourceType) {
      query = query.eq('resource_type', resourceType)
    }

    query = query.order('created_at', { ascending: false })
    query = query.range(offset, offset + limit - 1)

    const { data: logs, count, error } = await query

    if (error) {
      return res.status(500).json({ error: 'Failed to get audit logs' })
    }

    res.json({
      logs: logs || [],
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit)
    })
  } catch (error) {
    console.error('Get audit logs error:', error)
    res.status(500).json({ error: 'Failed to get audit logs' })
  }
})

export default router

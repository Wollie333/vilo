import { Router, Request, Response } from 'express'
import { supabase } from '../lib/supabase.js'
import crypto from 'crypto'
import { notifyMemberInvited, notifyMemberRoleChanged, notifyMemberRemoved } from '../services/notificationService.js'

const router = Router()

// Types
type Permission = 'none' | 'view' | 'edit' | 'full'
type MemberStatus = 'pending' | 'active' | 'suspended' | 'removed'
type InvitationStatus = 'pending' | 'accepted' | 'expired' | 'cancelled'

interface Role {
  id: string
  name: string
  slug: string
  is_system_role: boolean
  is_default: boolean
  permissions: Record<string, Permission>
}

interface AuthResult {
  user: { id: string; email: string } | null
  tenant: { id: string; name: string; max_team_members: number } | null
  role: Role | null
  error: string | null
}

// ============================================
// HELPER FUNCTIONS
// ============================================

// Verify JWT and get user's role in their tenant
async function verifyAuthWithRole(authHeader: string | undefined): Promise<AuthResult> {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { user: null, tenant: null, role: null, error: 'Missing or invalid authorization header' }
  }

  const token = authHeader.split(' ')[1]

  try {
    // Verify the JWT and get user
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      return { user: null, tenant: null, role: null, error: 'Invalid token' }
    }

    // Get user's membership - first check if they're an owner
    const { data: ownerTenant } = await supabase
      .from('tenants')
      .select('id, name, max_team_members, business_name')
      .eq('owner_user_id', user.id)
      .single()

    if (ownerTenant) {
      // Fetch the owner role from roles table
      const { data: ownerRole } = await supabase
        .from('roles')
        .select('id, name, slug, is_system_role, is_default, permissions')
        .eq('tenant_id', ownerTenant.id)
        .eq('slug', 'owner')
        .single()

      return {
        user: { id: user.id, email: user.email || '' },
        tenant: {
          id: ownerTenant.id,
          name: ownerTenant.business_name || ownerTenant.name || 'Workspace',
          max_team_members: ownerTenant.max_team_members || 3
        },
        role: ownerRole as Role || null,
        error: null
      }
    }

    // Check if they're a team member
    const { data: membership } = await supabase
      .from('tenant_members')
      .select(`
        role_id,
        tenant_id,
        tenants (id, name, max_team_members, business_name),
        roles (id, name, slug, is_system_role, is_default, permissions)
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
          name: tenant.business_name || tenant.name || 'Workspace',
          max_team_members: tenant.max_team_members || 3
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

// Get user details from Supabase Auth
async function getUserDetails(userId: string) {
  try {
    const { data: { user }, error } = await supabase.auth.admin.getUserById(userId)
    if (error || !user) return null
    return {
      id: user.id,
      email: user.email || '',
      name: user.user_metadata?.first_name
        ? `${user.user_metadata.first_name} ${user.user_metadata.last_name || ''}`.trim()
        : null,
      avatar_url: user.user_metadata?.avatar_url || null
    }
  } catch {
    return null
  }
}

// ============================================
// AUTHENTICATED ROUTES
// ============================================

// GET /members/me - Get current user's membership info
router.get('/me', async (req: Request, res: Response) => {
  const { user, tenant, role, error } = await verifyAuthWithRole(req.headers.authorization)

  if (error || !user) {
    return res.status(401).json({ error: error || 'Unauthorized' })
  }

  if (!tenant || !role) {
    return res.status(404).json({ error: 'No workspace membership found' })
  }

  // Return full role object with permissions
  res.json({
    user_id: user.id,
    tenant_id: tenant.id,
    tenant_name: tenant.name,
    role: {
      id: role.id,
      name: role.name,
      slug: role.slug,
      is_system_role: role.is_system_role,
      permissions: role.permissions
    },
    max_team_members: tenant.max_team_members
  })
})

// GET /members - List all team members
router.get('/', async (req: Request, res: Response) => {
  const { user, tenant, role, error } = await verifyAuthWithRole(req.headers.authorization)

  if (error || !user) {
    return res.status(401).json({ error: error || 'Unauthorized' })
  }

  if (!tenant || !role) {
    return res.status(404).json({ error: 'No workspace found' })
  }

  // Check permission to view members
  const membersPermission = role.permissions?.['settings.members'] || 'none'
  if (membersPermission === 'none') {
    return res.status(403).json({ error: 'Access denied' })
  }

  try {
    // Get all active members with their role info
    const { data: members, error: fetchError } = await supabase
      .from('tenant_members')
      .select('id, user_id, email, member_name, role, role_id, status, invited_at, joined_at, password_set_at, email_notification_sent_at, roles (id, name, slug)')
      .eq('tenant_id', tenant.id)
      .in('status', ['active', 'pending'])
      .order('joined_at', { ascending: true, nullsFirst: false })

    if (fetchError) {
      console.error('Error fetching members:', fetchError)
      return res.status(500).json({ error: 'Failed to fetch members' })
    }

    // Enrich with user details (if user_id exists)
    const enrichedMembers = await Promise.all(
      (members || []).map(async (member) => {
        let userDetails = null
        if (member.user_id) {
          userDetails = await getUserDetails(member.user_id)
        }
        const roleInfo = member.roles as any
        return {
          id: member.id,
          user_id: member.user_id,
          email: userDetails?.email || member.email || 'Unknown',
          name: userDetails?.name || member.member_name || null,
          avatar_url: userDetails?.avatar_url || null,
          role: member.role, // Keep legacy role for backward compatibility
          role_id: member.role_id,
          role_name: roleInfo?.name || member.role || 'Unknown',
          role_slug: roleInfo?.slug || member.role || 'unknown',
          status: member.status,
          invited_at: member.invited_at,
          joined_at: member.joined_at,
          password_pending: !member.password_set_at && !member.user_id
        }
      })
    )

    res.json({
      members: enrichedMembers,
      total: enrichedMembers.length,
      max_members: tenant.max_team_members + 1 // +1 for owner
    })
  } catch (error) {
    console.error('Error in GET /members:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// POST /members - Add a new team member directly (simplified flow)
router.post('/', async (req: Request, res: Response) => {
  const { user, tenant, role, error } = await verifyAuthWithRole(req.headers.authorization)

  if (error || !user) {
    return res.status(401).json({ error: error || 'Unauthorized' })
  }

  if (!tenant || !role) {
    return res.status(404).json({ error: 'No workspace found' })
  }

  // Check permission to add members (need 'full' access)
  const membersPermission = role.permissions?.['settings.members'] || 'none'
  if (membersPermission !== 'full') {
    return res.status(403).json({ error: 'Only users with full member access can add team members' })
  }

  const { email, name, role_id: memberRoleId, role: memberRoleSlug } = req.body

  // Validate inputs
  if (!email || typeof email !== 'string' || !email.includes('@')) {
    return res.status(400).json({ error: 'Valid email is required' })
  }

  if (!name || typeof name !== 'string' || name.trim().length < 2) {
    return res.status(400).json({ error: 'Name is required (at least 2 characters)' })
  }

  // Validate role - can be role_id or role slug for backward compatibility
  let targetRoleId: string | null = null
  let targetRoleSlug: string | null = null

  if (memberRoleId) {
    // Validate role_id exists and belongs to tenant
    const { data: roleData } = await supabase
      .from('roles')
      .select('id, slug, is_system_role')
      .eq('id', memberRoleId)
      .eq('tenant_id', tenant.id)
      .single()

    if (!roleData) {
      return res.status(400).json({ error: 'Invalid role' })
    }
    if (roleData.is_system_role) {
      return res.status(400).json({ error: 'Cannot assign system role to members' })
    }
    targetRoleId = roleData.id
    targetRoleSlug = roleData.slug
  } else if (memberRoleSlug) {
    // Legacy: lookup by slug
    if (!['general_manager', 'accountant'].includes(memberRoleSlug)) {
      return res.status(400).json({ error: 'Invalid role. Must be general_manager or accountant' })
    }
    const { data: roleData } = await supabase
      .from('roles')
      .select('id, slug')
      .eq('slug', memberRoleSlug)
      .eq('tenant_id', tenant.id)
      .single()

    if (!roleData) {
      return res.status(400).json({ error: 'Role not found' })
    }
    targetRoleId = roleData.id
    targetRoleSlug = roleData.slug
  } else {
    return res.status(400).json({ error: 'Role is required' })
  }

  const normalizedEmail = email.toLowerCase().trim()
  const trimmedName = name.trim()

  try {
    // Check member limit (excluding owner)
    const { count: memberCount } = await supabase
      .from('tenant_members')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenant.id)
      .in('status', ['active', 'pending'])

    if ((memberCount || 0) >= tenant.max_team_members) {
      return res.status(400).json({
        error: `Maximum team members reached (${tenant.max_team_members})`,
        limit: tenant.max_team_members
      })
    }

    // Check if user already exists in Supabase Auth
    const { data: existingUsers } = await supabase.auth.admin.listUsers()
    const existingUser = existingUsers?.users?.find(
      u => u.email?.toLowerCase() === normalizedEmail
    )

    // Check if already a member (by user_id or email)
    let existingMemberQuery = supabase
      .from('tenant_members')
      .select('id, status, user_id, email')
      .eq('tenant_id', tenant.id)

    if (existingUser) {
      existingMemberQuery = existingMemberQuery.or(`user_id.eq.${existingUser.id},email.ilike.${normalizedEmail}`)
    } else {
      existingMemberQuery = existingMemberQuery.ilike('email', normalizedEmail)
    }

    const { data: existingMembers } = await existingMemberQuery

    const activeMember = existingMembers?.find(m => m.status === 'active')
    if (activeMember) {
      return res.status(400).json({ error: 'This email is already a team member' })
    }

    const pendingMember = existingMembers?.find(m => m.status === 'pending')

    // If existing user in Supabase, they already have password
    const userId = existingUser?.id || null
    const passwordSetAt = existingUser ? new Date().toISOString() : null
    const passwordSetupToken = existingUser ? null : crypto.randomUUID()
    const memberStatus = existingUser ? 'active' : 'pending'

    if (pendingMember) {
      // Reactivate/update existing pending member
      const { error: updateError } = await supabase
        .from('tenant_members')
        .update({
          status: memberStatus,
          role: targetRoleSlug,
          role_id: targetRoleId,
          member_name: trimmedName,
          email: normalizedEmail,
          user_id: userId,
          password_setup_token: passwordSetupToken,
          password_set_at: passwordSetAt,
          invited_by: user.id,
          invited_at: new Date().toISOString(),
          joined_at: existingUser ? new Date().toISOString() : null
        })
        .eq('id', pendingMember.id)

      if (updateError) {
        console.error('Error updating member:', updateError)
        return res.status(500).json({ error: 'Failed to add team member' })
      }

      return res.status(201).json({
        success: true,
        member: {
          id: pendingMember.id,
          email: normalizedEmail,
          name: trimmedName,
          role: targetRoleSlug,
          role_id: targetRoleId,
          password_pending: !existingUser
        }
      })
    }

    // Create new membership
    const { data: newMember, error: insertError } = await supabase
      .from('tenant_members')
      .insert({
        tenant_id: tenant.id,
        user_id: userId,
        email: normalizedEmail,
        member_name: trimmedName,
        role: targetRoleSlug,
        role_id: targetRoleId,
        status: memberStatus,
        password_setup_token: passwordSetupToken,
        password_set_at: passwordSetAt,
        invited_by: user.id,
        invited_at: new Date().toISOString(),
        joined_at: existingUser ? new Date().toISOString() : null
      })
      .select('id')
      .single()

    if (insertError) {
      console.error('Error creating member:', insertError)
      return res.status(500).json({ error: 'Failed to add team member' })
    }

    // Notify the new member about their invitation
    console.log('[Members] Notifying new member about invitation:', newMember.id)
    notifyMemberInvited(tenant.id, newMember.id, tenant.name)

    res.status(201).json({
      success: true,
      member: {
        id: newMember.id,
        email: normalizedEmail,
        name: trimmedName,
        role: targetRoleSlug,
        role_id: targetRoleId,
        password_pending: !existingUser
      }
    })
  } catch (error) {
    console.error('Error in POST /members:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// POST /members/:id/send-notification - Send setup email to member
router.post('/:id/send-notification', async (req: Request, res: Response) => {
  const { user, tenant, role, error } = await verifyAuthWithRole(req.headers.authorization)

  if (error || !user) {
    return res.status(401).json({ error: error || 'Unauthorized' })
  }

  if (!tenant || !role) {
    return res.status(404).json({ error: 'No workspace found' })
  }

  // Check permission - need 'full' access to settings.members
  const membersPermission = role?.permissions?.['settings.members'] || 'none'
  if (membersPermission !== 'full') {
    return res.status(403).json({ error: 'Access denied' })
  }

  const { id } = req.params

  try {
    const { data: member, error: fetchError } = await supabase
      .from('tenant_members')
      .select('id, email, member_name, password_setup_token, password_set_at')
      .eq('id', id)
      .eq('tenant_id', tenant.id)
      .single()

    if (fetchError || !member) {
      return res.status(404).json({ error: 'Member not found' })
    }

    if (!member.password_setup_token || member.password_set_at) {
      return res.status(400).json({ error: 'Member has already set their password' })
    }

    // Build the setup link
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173'
    const setupLink = `${frontendUrl}/setup-password?token=${member.password_setup_token}`

    // Update notification sent timestamp
    await supabase
      .from('tenant_members')
      .update({ email_notification_sent_at: new Date().toISOString() })
      .eq('id', id)

    // TODO: Send actual email via email service (e.g., Resend, SendGrid)
    // For now, return the setup link for manual sharing
    res.json({
      success: true,
      message: 'Notification sent',
      setup_link: setupLink, // For development/testing - remove in production
      member_email: member.email,
      member_name: member.member_name
    })
  } catch (error) {
    console.error('Error in POST /members/:id/send-notification:', error)
    res.status(500).json({ error: 'Failed to send notification' })
  }
})

// POST /members/invite - Create an invitation
router.post('/invite', async (req: Request, res: Response) => {
  const { user, tenant, role, error } = await verifyAuthWithRole(req.headers.authorization)

  if (error || !user) {
    return res.status(401).json({ error: error || 'Unauthorized' })
  }

  if (!tenant || !role) {
    return res.status(404).json({ error: 'No workspace found' })
  }

  // Check permission - need 'full' access to settings.members
  const membersPermission = role?.permissions?.['settings.members'] || 'none'
  if (membersPermission !== 'full') {
    return res.status(403).json({ error: 'Only users with full member access can invite team members' })
  }

  const { email, role: inviteRole, send_email = false } = req.body

  // Validate email
  if (!email || typeof email !== 'string' || !email.includes('@')) {
    return res.status(400).json({ error: 'Valid email is required' })
  }

  // Validate role
  if (!inviteRole || !['general_manager', 'accountant'].includes(inviteRole)) {
    return res.status(400).json({ error: 'Invalid role. Must be general_manager or accountant' })
  }

  const normalizedEmail = email.toLowerCase().trim()

  try {
    // Check member limit (excluding owner)
    const { count: memberCount } = await supabase
      .from('tenant_members')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenant.id)
      .neq('role', 'owner')
      .eq('status', 'active')

    if ((memberCount || 0) >= tenant.max_team_members) {
      return res.status(400).json({
        error: `Maximum team members reached (${tenant.max_team_members})`,
        limit: tenant.max_team_members
      })
    }

    // Check if user is already a member
    const { data: existingUsers } = await supabase.auth.admin.listUsers()
    const existingUser = existingUsers?.users?.find(u => u.email?.toLowerCase() === normalizedEmail)

    if (existingUser) {
      const { data: existingMember } = await supabase
        .from('tenant_members')
        .select('id, status')
        .eq('tenant_id', tenant.id)
        .eq('user_id', existingUser.id)
        .single()

      if (existingMember && existingMember.status === 'active') {
        return res.status(400).json({ error: 'This user is already a team member' })
      }
    }

    // Check for existing pending invitation
    const { data: existingInvite } = await supabase
      .from('member_invitations')
      .select('id, status, expires_at')
      .eq('tenant_id', tenant.id)
      .ilike('email', normalizedEmail)
      .eq('status', 'pending')
      .single()

    if (existingInvite) {
      // Check if expired
      if (new Date(existingInvite.expires_at) > new Date()) {
        return res.status(400).json({
          error: 'An invitation is already pending for this email',
          invitation_id: existingInvite.id
        })
      }
      // If expired, we can create a new one (update status first)
      await supabase
        .from('member_invitations')
        .update({ status: 'expired' })
        .eq('id', existingInvite.id)
    }

    // Create invitation
    const invitationToken = crypto.randomUUID()
    const invitationCode = crypto.randomBytes(4).toString('hex').toUpperCase()

    const { data: invitation, error: createError } = await supabase
      .from('member_invitations')
      .insert({
        tenant_id: tenant.id,
        email: normalizedEmail,
        role: inviteRole,
        invitation_token: invitationToken,
        invitation_code: invitationCode,
        invited_by: user.id,
        email_sent: send_email
      })
      .select()
      .single()

    if (createError) {
      console.error('Error creating invitation:', createError)
      return res.status(500).json({ error: 'Failed to create invitation' })
    }

    // TODO: If send_email is true, send email via email service
    // For now, return the invitation details for manual sharing

    res.status(201).json({
      invitation: {
        id: invitation.id,
        email: invitation.email,
        role: invitation.role,
        invitation_code: invitation.invitation_code,
        invitation_token: invitation.invitation_token,
        expires_at: invitation.expires_at,
        status: invitation.status
      },
      message: send_email
        ? 'Invitation sent via email'
        : 'Invitation created. Share the code with the team member.'
    })
  } catch (error) {
    console.error('Error in POST /members/invite:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// GET /members/invitations - List pending invitations
router.get('/invitations', async (req: Request, res: Response) => {
  const { user, tenant, role, error } = await verifyAuthWithRole(req.headers.authorization)

  if (error || !user) {
    return res.status(401).json({ error: error || 'Unauthorized' })
  }

  if (!tenant || !role) {
    return res.status(404).json({ error: 'No workspace found' })
  }

  // Check permission - need at least 'view' access to settings.members
  const membersPermission = role?.permissions?.['settings.members'] || 'none'
  if (membersPermission === 'none') {
    return res.status(403).json({ error: 'Access denied' })
  }

  try {
    const { data: invitations, error: fetchError } = await supabase
      .from('member_invitations')
      .select('id, email, role, invitation_code, expires_at, status, invited_at, email_sent')
      .eq('tenant_id', tenant.id)
      .eq('status', 'pending')
      .order('invited_at', { ascending: false })

    if (fetchError) {
      console.error('Error fetching invitations:', fetchError)
      return res.status(500).json({ error: 'Failed to fetch invitations' })
    }

    // Mark expired invitations
    const now = new Date()
    const processedInvitations = (invitations || []).map(inv => ({
      ...inv,
      is_expired: new Date(inv.expires_at) < now
    }))

    res.json({ invitations: processedInvitations })
  } catch (error) {
    console.error('Error in GET /members/invitations:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// DELETE /members/invite/:id - Cancel an invitation
router.delete('/invite/:id', async (req: Request, res: Response) => {
  const { user, tenant, role, error } = await verifyAuthWithRole(req.headers.authorization)

  if (error || !user) {
    return res.status(401).json({ error: error || 'Unauthorized' })
  }

  if (!tenant || !role) {
    return res.status(404).json({ error: 'No workspace found' })
  }

  // Check permission - need 'full' access to settings.members
  const membersPermission = role?.permissions?.['settings.members'] || 'none'
  if (membersPermission !== 'full') {
    return res.status(403).json({ error: 'Only users with full member access can cancel invitations' })
  }

  const { id } = req.params

  try {
    const { error: updateError } = await supabase
      .from('member_invitations')
      .update({ status: 'cancelled' })
      .eq('id', id)
      .eq('tenant_id', tenant.id)
      .eq('status', 'pending')

    if (updateError) {
      console.error('Error cancelling invitation:', updateError)
      return res.status(500).json({ error: 'Failed to cancel invitation' })
    }

    res.json({ success: true, message: 'Invitation cancelled' })
  } catch (error) {
    console.error('Error in DELETE /members/invite/:id:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// POST /members/invite/:id/resend - Resend invitation (placeholder for email)
router.post('/invite/:id/resend', async (req: Request, res: Response) => {
  const { user, tenant, role, error } = await verifyAuthWithRole(req.headers.authorization)

  if (error || !user) {
    return res.status(401).json({ error: error || 'Unauthorized' })
  }

  if (!tenant || !role) {
    return res.status(404).json({ error: 'No workspace found' })
  }

  // Check permission - need 'full' access to settings.members
  const membersPermission = role?.permissions?.['settings.members'] || 'none'
  if (membersPermission !== 'full') {
    return res.status(403).json({ error: 'Only users with full member access can resend invitations' })
  }

  const { id } = req.params

  try {
    // Get the invitation
    const { data: invitation, error: fetchError } = await supabase
      .from('member_invitations')
      .select('*')
      .eq('id', id)
      .eq('tenant_id', tenant.id)
      .eq('status', 'pending')
      .single()

    if (fetchError || !invitation) {
      return res.status(404).json({ error: 'Invitation not found' })
    }

    // Extend expiration and regenerate code
    const newExpiry = new Date()
    newExpiry.setDate(newExpiry.getDate() + 7)
    const newCode = crypto.randomBytes(4).toString('hex').toUpperCase()

    const { error: updateError } = await supabase
      .from('member_invitations')
      .update({
        expires_at: newExpiry.toISOString(),
        invitation_code: newCode
      })
      .eq('id', id)

    if (updateError) {
      console.error('Error updating invitation:', updateError)
      return res.status(500).json({ error: 'Failed to resend invitation' })
    }

    // TODO: Actually send email here

    res.json({
      success: true,
      message: 'Invitation resent',
      invitation_code: newCode,
      expires_at: newExpiry.toISOString()
    })
  } catch (error) {
    console.error('Error in POST /members/invite/:id/resend:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// DELETE /members/:userId - Remove a team member
router.delete('/:userId', async (req: Request, res: Response) => {
  const { user, tenant, role, error } = await verifyAuthWithRole(req.headers.authorization)

  if (error || !user) {
    return res.status(401).json({ error: error || 'Unauthorized' })
  }

  if (!tenant || !role) {
    return res.status(404).json({ error: 'No workspace found' })
  }

  // Check permission - need 'full' access to settings.members
  const membersPermission = role?.permissions?.['settings.members'] || 'none'
  if (membersPermission !== 'full') {
    return res.status(403).json({ error: 'Only users with full member access can remove team members' })
  }

  const { userId } = req.params

  // Cannot remove yourself
  if (userId === user.id) {
    return res.status(400).json({ error: 'Cannot remove yourself from the workspace' })
  }

  try {
    // Verify member exists and is not owner
    const { data: member, error: fetchError } = await supabase
      .from('tenant_members')
      .select('id, role, role_id, roles (slug, is_system_role)')
      .eq('tenant_id', tenant.id)
      .eq('user_id', userId)
      .eq('status', 'active')
      .single()

    if (fetchError || !member) {
      return res.status(404).json({ error: 'Member not found' })
    }

    // Check if member has the owner role (system role)
    const memberRole = member.roles as any
    if (memberRole?.is_system_role || memberRole?.slug === 'owner') {
      return res.status(400).json({ error: 'Cannot remove the owner' })
    }

    // Update status to removed
    const { error: updateError } = await supabase
      .from('tenant_members')
      .update({ status: 'removed' })
      .eq('id', member.id)

    if (updateError) {
      console.error('Error removing member:', updateError)
      return res.status(500).json({ error: 'Failed to remove member' })
    }

    // Notify the removed member
    console.log('[Members] Notifying member about removal:', member.id)
    notifyMemberRemoved(tenant.id, member.id)

    res.json({ success: true, message: 'Member removed' })
  } catch (error) {
    console.error('Error in DELETE /members/:userId:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// PATCH /members/:userId - Update a member's role
router.patch('/:userId', async (req: Request, res: Response) => {
  const { user, tenant, role, error } = await verifyAuthWithRole(req.headers.authorization)

  if (error || !user) {
    return res.status(401).json({ error: error || 'Unauthorized' })
  }

  if (!tenant || !role) {
    return res.status(404).json({ error: 'No workspace found' })
  }

  // Check permission to update members (need 'full' access)
  const membersPermission = role.permissions?.['settings.members'] || 'none'
  if (membersPermission !== 'full') {
    return res.status(403).json({ error: 'Only users with full member access can change member roles' })
  }

  const { userId } = req.params
  const { role_id: newRoleId, role: newRoleSlug } = req.body

  // Validate new role - can be role_id or slug for backward compatibility
  let targetRoleId: string | null = null
  let targetRoleSlug: string | null = null

  if (newRoleId) {
    const { data: roleData } = await supabase
      .from('roles')
      .select('id, slug, is_system_role')
      .eq('id', newRoleId)
      .eq('tenant_id', tenant.id)
      .single()

    if (!roleData) {
      return res.status(400).json({ error: 'Invalid role' })
    }
    if (roleData.is_system_role) {
      return res.status(400).json({ error: 'Cannot assign system role to members' })
    }
    targetRoleId = roleData.id
    targetRoleSlug = roleData.slug
  } else if (newRoleSlug) {
    if (!['general_manager', 'accountant'].includes(newRoleSlug)) {
      return res.status(400).json({ error: 'Invalid role' })
    }
    const { data: roleData } = await supabase
      .from('roles')
      .select('id, slug')
      .eq('slug', newRoleSlug)
      .eq('tenant_id', tenant.id)
      .single()

    if (!roleData) {
      return res.status(400).json({ error: 'Role not found' })
    }
    targetRoleId = roleData.id
    targetRoleSlug = roleData.slug
  } else {
    return res.status(400).json({ error: 'Role is required' })
  }

  // Cannot change own role
  if (userId === user.id) {
    return res.status(400).json({ error: 'Cannot change your own role' })
  }

  try {
    const { data: member, error: fetchError } = await supabase
      .from('tenant_members')
      .select('id, role, role_id, roles (slug, is_system_role)')
      .eq('tenant_id', tenant.id)
      .eq('user_id', userId)
      .eq('status', 'active')
      .single()

    if (fetchError || !member) {
      return res.status(404).json({ error: 'Member not found' })
    }

    // Check if member has the owner role (system role)
    const memberRole = member.roles as any
    if (memberRole?.is_system_role || memberRole?.slug === 'owner') {
      return res.status(400).json({ error: 'Cannot change the owner role' })
    }

    const { error: updateError } = await supabase
      .from('tenant_members')
      .update({ role: targetRoleSlug, role_id: targetRoleId })
      .eq('id', member.id)

    if (updateError) {
      console.error('Error updating member role:', updateError)
      return res.status(500).json({ error: 'Failed to update role' })
    }

    // Notify the member about role change
    console.log('[Members] Notifying member about role change:', member.id)
    notifyMemberRoleChanged(tenant.id, member.id, targetRoleSlug || 'Team Member')

    res.json({ success: true, message: 'Role updated', new_role: targetRoleSlug, new_role_id: targetRoleId })
  } catch (error) {
    console.error('Error in PATCH /members/:userId:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// ============================================
// PUBLIC ROUTES (No auth required)
// ============================================

// GET /members/setup/:token - Validate password setup token
router.get('/setup/:token', async (req: Request, res: Response) => {
  const { token } = req.params

  try {
    const { data: member, error } = await supabase
      .from('tenant_members')
      .select(`
        id,
        email,
        member_name,
        role,
        tenant_id,
        password_set_at,
        tenants (id, name, business_name, logo_url)
      `)
      .eq('password_setup_token', token)
      .single()

    if (error || !member) {
      return res.status(404).json({ error: 'Invalid or expired token' })
    }

    // Check if password already set
    if (member.password_set_at) {
      return res.status(400).json({ error: 'Password has already been set. Please log in.' })
    }

    const tenant = member.tenants as any

    res.json({
      valid: true,
      email: member.email,
      name: member.member_name,
      role: member.role,
      tenant_name: tenant?.business_name || tenant?.name || 'Workspace',
      tenant_logo: tenant?.logo_url || null
    })
  } catch (error) {
    console.error('Error in GET /members/setup/:token:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// POST /members/setup/:token - Set password and complete account setup
router.post('/setup/:token', async (req: Request, res: Response) => {
  const { token } = req.params
  const { password } = req.body

  if (!password || typeof password !== 'string' || password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters' })
  }

  try {
    // Get member by token
    const { data: member, error: fetchError } = await supabase
      .from('tenant_members')
      .select('id, email, member_name, tenant_id, password_set_at, role')
      .eq('password_setup_token', token)
      .single()

    if (fetchError || !member) {
      return res.status(404).json({ error: 'Invalid token' })
    }

    // Check if password already set
    if (member.password_set_at) {
      return res.status(400).json({ error: 'Password has already been set. Please log in.' })
    }

    // Create Supabase Auth user
    const nameParts = (member.member_name || '').split(' ')
    const firstName = nameParts[0] || ''
    const lastName = nameParts.slice(1).join(' ') || ''

    const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
      email: member.email,
      password: password,
      email_confirm: true,
      user_metadata: {
        first_name: firstName,
        last_name: lastName,
        invited_to_workspace: true
      }
    })

    if (createError || !newUser?.user) {
      console.error('Error creating user:', createError)
      // Check if user already exists
      if (createError?.message?.includes('already been registered')) {
        return res.status(400).json({ error: 'An account with this email already exists. Please log in instead.' })
      }
      return res.status(500).json({ error: 'Failed to create account' })
    }

    // Update membership with user_id and clear token
    const { error: updateError } = await supabase
      .from('tenant_members')
      .update({
        user_id: newUser.user.id,
        status: 'active',
        password_setup_token: null,
        password_set_at: new Date().toISOString(),
        joined_at: new Date().toISOString()
      })
      .eq('id', member.id)

    if (updateError) {
      console.error('Error updating member:', updateError)
      // Still return success since user was created
    }

    res.json({
      success: true,
      message: 'Account created successfully',
      user_id: newUser.user.id,
      tenant_id: member.tenant_id,
      email: member.email
    })
  } catch (error) {
    console.error('Error in POST /members/setup/:token:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// ============================================
// LEGACY INVITATION ROUTES (kept for backward compatibility)
// ============================================

// GET /members/invitation/:token - Validate invitation by token
router.get('/invitation/:token', async (req: Request, res: Response) => {
  const { token } = req.params

  try {
    const { data: invitation, error } = await supabase
      .from('member_invitations')
      .select(`
        id,
        email,
        role,
        expires_at,
        status,
        tenant_id,
        tenants (id, name, business_name, logo_url)
      `)
      .eq('invitation_token', token)
      .single()

    if (error || !invitation) {
      return res.status(404).json({ error: 'Invalid invitation' })
    }

    if (invitation.status !== 'pending') {
      return res.status(400).json({ error: `Invitation has been ${invitation.status}` })
    }

    if (new Date(invitation.expires_at) < new Date()) {
      return res.status(400).json({ error: 'Invitation has expired' })
    }

    const tenant = invitation.tenants as any

    res.json({
      valid: true,
      email: invitation.email,
      role: invitation.role,
      tenant_id: invitation.tenant_id,
      tenant_name: tenant?.business_name || tenant?.name || 'Workspace',
      tenant_logo: tenant?.logo_url || null
    })
  } catch (error) {
    console.error('Error in GET /members/invitation/:token:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// GET /members/invitation/code/:code - Validate invitation by code
router.get('/invitation/code/:code', async (req: Request, res: Response) => {
  const { code } = req.params
  const { email } = req.query

  if (!email || typeof email !== 'string') {
    return res.status(400).json({ error: 'Email is required' })
  }

  try {
    const { data: invitation, error } = await supabase
      .from('member_invitations')
      .select(`
        id,
        email,
        role,
        expires_at,
        status,
        tenant_id,
        tenants (id, name, business_name, logo_url)
      `)
      .eq('invitation_code', code.toUpperCase())
      .ilike('email', email.toLowerCase())
      .single()

    if (error || !invitation) {
      return res.status(404).json({ error: 'Invalid code or email' })
    }

    if (invitation.status !== 'pending') {
      return res.status(400).json({ error: `Invitation has been ${invitation.status}` })
    }

    if (new Date(invitation.expires_at) < new Date()) {
      return res.status(400).json({ error: 'Invitation has expired' })
    }

    const tenant = invitation.tenants as any

    res.json({
      valid: true,
      email: invitation.email,
      role: invitation.role,
      tenant_id: invitation.tenant_id,
      tenant_name: tenant?.business_name || tenant?.name || 'Workspace',
      tenant_logo: tenant?.logo_url || null
    })
  } catch (error) {
    console.error('Error in GET /members/invitation/code/:code:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// POST /members/join - Accept invitation and join workspace
router.post('/join', async (req: Request, res: Response) => {
  const { token, code, email, password } = req.body

  if (!token && (!code || !email)) {
    return res.status(400).json({ error: 'Either token or code+email is required' })
  }

  try {
    // Find the invitation
    let invitation
    if (token) {
      const { data, error } = await supabase
        .from('member_invitations')
        .select('*')
        .eq('invitation_token', token)
        .eq('status', 'pending')
        .single()

      if (error || !data) {
        return res.status(404).json({ error: 'Invalid or expired invitation' })
      }
      invitation = data
    } else {
      const { data, error } = await supabase
        .from('member_invitations')
        .select('*')
        .eq('invitation_code', code.toUpperCase())
        .ilike('email', email.toLowerCase())
        .eq('status', 'pending')
        .single()

      if (error || !data) {
        return res.status(404).json({ error: 'Invalid code or email' })
      }
      invitation = data
    }

    // Check expiration
    if (new Date(invitation.expires_at) < new Date()) {
      await supabase
        .from('member_invitations')
        .update({ status: 'expired' })
        .eq('id', invitation.id)

      return res.status(400).json({ error: 'Invitation has expired' })
    }

    // Check if user already exists
    const { data: existingUsers } = await supabase.auth.admin.listUsers()
    let existingUser = existingUsers?.users?.find(
      u => u.email?.toLowerCase() === invitation.email.toLowerCase()
    )

    let userId: string

    if (existingUser) {
      userId = existingUser.id

      // Check if already a member
      const { data: existingMember } = await supabase
        .from('tenant_members')
        .select('id, status')
        .eq('tenant_id', invitation.tenant_id)
        .eq('user_id', userId)
        .single()

      if (existingMember) {
        if (existingMember.status === 'active') {
          return res.status(400).json({ error: 'You are already a member of this workspace' })
        }
        // Reactivate if previously removed
        await supabase
          .from('tenant_members')
          .update({
            status: 'active',
            role: invitation.role,
            joined_at: new Date().toISOString()
          })
          .eq('id', existingMember.id)
      } else {
        // Create membership
        await supabase
          .from('tenant_members')
          .insert({
            tenant_id: invitation.tenant_id,
            user_id: userId,
            role: invitation.role,
            invited_by: invitation.invited_by,
            status: 'active',
            joined_at: new Date().toISOString()
          })
      }
    } else {
      // Create new user account
      if (!password || password.length < 6) {
        return res.status(400).json({
          error: 'Password is required for new accounts (min 6 characters)',
          requires_account_creation: true
        })
      }

      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email: invitation.email,
        password: password,
        email_confirm: true,
        user_metadata: {
          invited_to_workspace: true
        }
      })

      if (createError || !newUser?.user) {
        console.error('Error creating user:', createError)
        return res.status(500).json({ error: 'Failed to create account' })
      }

      userId = newUser.user.id

      // Create membership
      await supabase
        .from('tenant_members')
        .insert({
          tenant_id: invitation.tenant_id,
          user_id: userId,
          role: invitation.role,
          invited_by: invitation.invited_by,
          status: 'active',
          joined_at: new Date().toISOString()
        })
    }

    // Mark invitation as accepted
    await supabase
      .from('member_invitations')
      .update({
        status: 'accepted',
        accepted_at: new Date().toISOString(),
        accepted_by_user_id: userId
      })
      .eq('id', invitation.id)

    res.json({
      success: true,
      tenant_id: invitation.tenant_id,
      user_id: userId,
      role: invitation.role,
      is_new_account: !existingUser
    })
  } catch (error) {
    console.error('Error in POST /members/join:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router

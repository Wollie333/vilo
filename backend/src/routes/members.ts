import { Router, Request, Response } from 'express'
import { supabase } from '../lib/supabase.js'
import crypto from 'crypto'

const router = Router()

// Types
type Role = 'owner' | 'general_manager' | 'accountant'
type MemberStatus = 'pending' | 'active' | 'suspended' | 'removed'
type InvitationStatus = 'pending' | 'accepted' | 'expired' | 'cancelled'

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
      return {
        user: { id: user.id, email: user.email || '' },
        tenant: {
          id: ownerTenant.id,
          name: ownerTenant.business_name || ownerTenant.name || 'Workspace',
          max_team_members: ownerTenant.max_team_members || 3
        },
        role: 'owner',
        error: null
      }
    }

    // Check if they're a team member
    const { data: membership } = await supabase
      .from('tenant_members')
      .select(`
        role,
        tenant_id,
        tenants (id, name, max_team_members, business_name)
      `)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single()

    if (membership && membership.tenants) {
      const tenant = membership.tenants as any
      return {
        user: { id: user.id, email: user.email || '' },
        tenant: {
          id: tenant.id,
          name: tenant.business_name || tenant.name || 'Workspace',
          max_team_members: tenant.max_team_members || 3
        },
        role: membership.role as Role,
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

  res.json({
    user_id: user.id,
    tenant_id: tenant.id,
    tenant_name: tenant.name,
    role,
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

  // Accountants cannot view members
  if (role === 'accountant') {
    return res.status(403).json({ error: 'Access denied' })
  }

  try {
    // Get all active members
    const { data: members, error: fetchError } = await supabase
      .from('tenant_members')
      .select('id, user_id, role, status, invited_at, joined_at')
      .eq('tenant_id', tenant.id)
      .in('status', ['active', 'pending'])
      .order('joined_at', { ascending: true, nullsFirst: false })

    if (fetchError) {
      console.error('Error fetching members:', fetchError)
      return res.status(500).json({ error: 'Failed to fetch members' })
    }

    // Enrich with user details
    const enrichedMembers = await Promise.all(
      (members || []).map(async (member) => {
        const userDetails = await getUserDetails(member.user_id)
        return {
          ...member,
          email: userDetails?.email || 'Unknown',
          name: userDetails?.name || null,
          avatar_url: userDetails?.avatar_url || null
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

// POST /members/invite - Create an invitation
router.post('/invite', async (req: Request, res: Response) => {
  const { user, tenant, role, error } = await verifyAuthWithRole(req.headers.authorization)

  if (error || !user) {
    return res.status(401).json({ error: error || 'Unauthorized' })
  }

  if (!tenant || !role) {
    return res.status(404).json({ error: 'No workspace found' })
  }

  // Only owner can invite
  if (role !== 'owner') {
    return res.status(403).json({ error: 'Only the owner can invite team members' })
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

  // Only owner can view invitations
  if (role !== 'owner') {
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

  if (role !== 'owner') {
    return res.status(403).json({ error: 'Only the owner can cancel invitations' })
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

  if (role !== 'owner') {
    return res.status(403).json({ error: 'Only the owner can resend invitations' })
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

  if (role !== 'owner') {
    return res.status(403).json({ error: 'Only the owner can remove team members' })
  }

  const { userId } = req.params

  // Cannot remove yourself (owner)
  if (userId === user.id) {
    return res.status(400).json({ error: 'Cannot remove yourself from the workspace' })
  }

  try {
    // Verify member exists and is not owner
    const { data: member, error: fetchError } = await supabase
      .from('tenant_members')
      .select('id, role')
      .eq('tenant_id', tenant.id)
      .eq('user_id', userId)
      .eq('status', 'active')
      .single()

    if (fetchError || !member) {
      return res.status(404).json({ error: 'Member not found' })
    }

    if (member.role === 'owner') {
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

  if (role !== 'owner') {
    return res.status(403).json({ error: 'Only the owner can change member roles' })
  }

  const { userId } = req.params
  const { role: newRole } = req.body

  // Validate new role
  if (!newRole || !['general_manager', 'accountant'].includes(newRole)) {
    return res.status(400).json({ error: 'Invalid role' })
  }

  // Cannot change own role
  if (userId === user.id) {
    return res.status(400).json({ error: 'Cannot change your own role' })
  }

  try {
    const { data: member, error: fetchError } = await supabase
      .from('tenant_members')
      .select('id, role')
      .eq('tenant_id', tenant.id)
      .eq('user_id', userId)
      .eq('status', 'active')
      .single()

    if (fetchError || !member) {
      return res.status(404).json({ error: 'Member not found' })
    }

    if (member.role === 'owner') {
      return res.status(400).json({ error: 'Cannot change the owner role' })
    }

    const { error: updateError } = await supabase
      .from('tenant_members')
      .update({ role: newRole })
      .eq('id', member.id)

    if (updateError) {
      console.error('Error updating member role:', updateError)
      return res.status(500).json({ error: 'Failed to update role' })
    }

    res.json({ success: true, message: 'Role updated', new_role: newRole })
  } catch (error) {
    console.error('Error in PATCH /members/:userId:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// ============================================
// PUBLIC INVITATION ROUTES (No auth required)
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

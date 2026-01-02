import { Router, Request, Response } from 'express'
import { supabase } from '../../lib/supabase.js'
import { requireSuperAdmin, SuperAdminRequest, logAdminAction } from '../../middleware/superAdmin.js'

const router = Router()

/**
 * POST /api/admin/auth/login
 * Authenticate super-admin user
 */
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' })
    }

    // Authenticate with Supabase
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password
    })

    if (authError || !authData.user) {
      return res.status(401).json({ error: 'Invalid credentials' })
    }

    // Check if user is a super-admin
    const { data: superAdmin, error: adminError } = await supabase
      .from('super_admins')
      .select('*')
      .eq('user_id', authData.user.id)
      .eq('status', 'active')
      .single()

    if (adminError || !superAdmin) {
      // Sign out the user since they're not a super-admin
      await supabase.auth.signOut()
      return res.status(403).json({ error: 'Not authorized as super-admin' })
    }

    // Update last login
    await supabase
      .from('super_admins')
      .update({ last_login_at: new Date().toISOString() })
      .eq('id', superAdmin.id)

    // Log the login action
    await logAdminAction({
      adminId: superAdmin.id,
      adminEmail: superAdmin.email,
      action: 'auth.login',
      resourceType: 'auth',
      description: 'Super-admin logged in',
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    })

    res.json({
      admin: {
        id: superAdmin.id,
        email: superAdmin.email,
        display_name: superAdmin.display_name,
        role: superAdmin.role,
        permissions: superAdmin.permissions,
        avatar_url: superAdmin.avatar_url
      },
      role: {
        id: superAdmin.id,
        name: superAdmin.role,
        slug: superAdmin.role,
        permissions: superAdmin.permissions
      },
      token: authData.session?.access_token,
      refresh_token: authData.session?.refresh_token
    })
  } catch (error) {
    console.error('Admin login error:', error)
    res.status(500).json({ error: 'Login failed' })
  }
})

/**
 * GET /api/admin/auth/me
 * Get current super-admin info
 */
router.get('/me', requireSuperAdmin, async (req: SuperAdminRequest, res: Response) => {
  try {
    if (!req.superAdmin) {
      return res.status(401).json({ error: 'Not authenticated' })
    }

    // Get full admin details
    const { data: superAdmin, error } = await supabase
      .from('super_admins')
      .select('*')
      .eq('id', req.superAdmin.id)
      .single()

    if (error || !superAdmin) {
      return res.status(404).json({ error: 'Admin not found' })
    }

    res.json({
      admin: {
        id: superAdmin.id,
        email: superAdmin.email,
        display_name: superAdmin.display_name,
        role: superAdmin.role,
        permissions: superAdmin.permissions,
        avatar_url: superAdmin.avatar_url,
        last_login_at: superAdmin.last_login_at,
        created_at: superAdmin.created_at
      },
      role: {
        id: superAdmin.id,
        name: superAdmin.role,
        slug: superAdmin.role,
        permissions: superAdmin.permissions
      }
    })
  } catch (error) {
    console.error('Get admin info error:', error)
    res.status(500).json({ error: 'Failed to get admin info' })
  }
})

/**
 * POST /api/admin/auth/logout
 * Logout super-admin
 */
router.post('/logout', requireSuperAdmin, async (req: SuperAdminRequest, res: Response) => {
  try {
    if (req.superAdmin) {
      await logAdminAction({
        adminId: req.superAdmin.id,
        adminEmail: req.superAdmin.email,
        action: 'auth.logout',
        resourceType: 'auth',
        description: 'Super-admin logged out',
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      })
    }

    await supabase.auth.signOut()
    res.json({ success: true })
  } catch (error) {
    console.error('Admin logout error:', error)
    res.status(500).json({ error: 'Logout failed' })
  }
})

/**
 * POST /api/admin/auth/refresh
 * Refresh access token
 */
router.post('/refresh', async (req: Request, res: Response) => {
  try {
    const { refresh_token } = req.body

    if (!refresh_token) {
      return res.status(400).json({ error: 'Refresh token is required' })
    }

    const { data, error } = await supabase.auth.refreshSession({ refresh_token })

    if (error || !data.session) {
      return res.status(401).json({ error: 'Invalid refresh token' })
    }

    res.json({
      token: data.session.access_token,
      refresh_token: data.session.refresh_token
    })
  } catch (error) {
    console.error('Token refresh error:', error)
    res.status(500).json({ error: 'Token refresh failed' })
  }
})

/**
 * PUT /api/admin/auth/profile
 * Update super-admin profile
 */
router.put('/profile', requireSuperAdmin, async (req: SuperAdminRequest, res: Response) => {
  try {
    if (!req.superAdmin) {
      return res.status(401).json({ error: 'Not authenticated' })
    }

    const { display_name, avatar_url } = req.body

    const updates: Record<string, any> = {
      updated_at: new Date().toISOString()
    }

    if (display_name) updates.display_name = display_name
    if (avatar_url !== undefined) updates.avatar_url = avatar_url

    const { data, error } = await supabase
      .from('super_admins')
      .update(updates)
      .eq('id', req.superAdmin.id)
      .select()
      .single()

    if (error) {
      return res.status(500).json({ error: 'Failed to update profile' })
    }

    await logAdminAction({
      adminId: req.superAdmin.id,
      adminEmail: req.superAdmin.email,
      action: 'auth.profile_update',
      resourceType: 'admin',
      resourceId: req.superAdmin.id,
      description: 'Updated profile',
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    })

    res.json({
      admin: {
        id: data.id,
        email: data.email,
        display_name: data.display_name,
        role: data.role,
        permissions: data.permissions,
        avatar_url: data.avatar_url
      }
    })
  } catch (error) {
    console.error('Profile update error:', error)
    res.status(500).json({ error: 'Failed to update profile' })
  }
})

export default router

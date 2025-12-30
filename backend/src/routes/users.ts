import { Router, Request, Response } from 'express'
import { supabase } from '../lib/supabase.js'

const router = Router()

// Helper to verify JWT and get user
async function verifyAuth(authHeader: string | undefined) {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { user: null, error: 'Missing or invalid authorization header' }
  }

  try {
    const token = authHeader.split(' ')[1]
    const { data: { user }, error } = await supabase.auth.getUser(token)

    if (error || !user) {
      return { user: null, error: error?.message || 'Invalid token' }
    }

    return { user, error: null }
  } catch (err) {
    console.error('Error verifying auth:', err)
    return { user: null, error: 'Authentication service unavailable' }
  }
}

// Get current user profile
router.get('/me', async (req: Request, res: Response) => {
  try {
    const { user, error } = await verifyAuth(req.headers.authorization)

    if (error || !user) {
      return res.status(401).json({ error: error || 'Unauthorized' })
    }

    res.json({
      id: user.id,
      email: user.email,
      phone: user.phone,
      user_metadata: user.user_metadata,
      created_at: user.created_at
    })
  } catch (err) {
    console.error('Error in GET /users/me:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Update user profile (metadata)
router.patch('/me', async (req: Request, res: Response) => {
  const { user, error: authError } = await verifyAuth(req.headers.authorization)

  if (authError || !user) {
    return res.status(401).json({ error: authError || 'Unauthorized' })
  }

  const { first_name, last_name, phone, avatar_url } = req.body

  try {
    // Build metadata update object
    const metadataUpdate: Record<string, unknown> = { ...user.user_metadata }

    if (first_name !== undefined) metadataUpdate.first_name = first_name
    if (last_name !== undefined) metadataUpdate.last_name = last_name
    if (avatar_url !== undefined) metadataUpdate.avatar_url = avatar_url

    // Update user metadata using admin API
    const { data, error } = await supabase.auth.admin.updateUserById(user.id, {
      phone: phone || undefined,
      user_metadata: metadataUpdate
    })

    if (error) {
      console.error('Error updating user:', error)
      return res.status(500).json({ error: 'Failed to update profile' })
    }

    res.json({
      message: 'Profile updated successfully',
      user: {
        id: data.user.id,
        email: data.user.email,
        phone: data.user.phone,
        user_metadata: data.user.user_metadata
      }
    })
  } catch (error) {
    console.error('Error in PATCH /users/me:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Upload user avatar
router.post('/me/avatar', async (req: Request, res: Response) => {
  const { user, error: authError } = await verifyAuth(req.headers.authorization)

  if (authError || !user) {
    return res.status(401).json({ error: authError || 'Unauthorized' })
  }

  const { image } = req.body

  if (!image) {
    return res.status(400).json({ error: 'Image data is required' })
  }

  try {
    // Extract base64 data and mime type
    const matches = image.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/)
    if (!matches || matches.length !== 3) {
      return res.status(400).json({ error: 'Invalid image format' })
    }

    const mimeType = matches[1]
    const base64Data = matches[2]
    const buffer = Buffer.from(base64Data, 'base64')

    // Determine file extension
    const extMap: Record<string, string> = {
      'image/png': 'png',
      'image/jpeg': 'jpg',
      'image/gif': 'gif',
      'image/webp': 'webp'
    }
    const ext = extMap[mimeType] || 'png'
    const fileName = `avatars/${user.id}/avatar.${ext}`

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('user-assets')
      .upload(fileName, buffer, {
        contentType: mimeType,
        upsert: true
      })

    if (uploadError) {
      console.error('Error uploading avatar:', uploadError)
      return res.status(500).json({ error: 'Failed to upload avatar' })
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('user-assets')
      .getPublicUrl(fileName)

    const avatarUrl = urlData.publicUrl

    // Update user metadata with avatar URL
    const { error: updateError } = await supabase.auth.admin.updateUserById(user.id, {
      user_metadata: {
        ...user.user_metadata,
        avatar_url: avatarUrl
      }
    })

    if (updateError) {
      console.error('Error updating user avatar:', updateError)
      return res.status(500).json({ error: 'Failed to save avatar URL' })
    }

    res.json({ avatar_url: avatarUrl })
  } catch (error) {
    console.error('Error in POST /users/me/avatar:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Update user email
router.patch('/me/email', async (req: Request, res: Response) => {
  const { user, error: authError } = await verifyAuth(req.headers.authorization)

  if (authError || !user) {
    return res.status(401).json({ error: authError || 'Unauthorized' })
  }

  const { email } = req.body

  if (!email) {
    return res.status(400).json({ error: 'Email is required' })
  }

  try {
    const { data, error } = await supabase.auth.admin.updateUserById(user.id, {
      email: email
    })

    if (error) {
      console.error('Error updating email:', error)
      return res.status(500).json({ error: error.message || 'Failed to update email' })
    }

    res.json({
      message: 'Email updated successfully',
      email: data.user.email
    })
  } catch (error) {
    console.error('Error in PATCH /users/me/email:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Update user password
router.patch('/me/password', async (req: Request, res: Response) => {
  const { user, error: authError } = await verifyAuth(req.headers.authorization)

  if (authError || !user) {
    return res.status(401).json({ error: authError || 'Unauthorized' })
  }

  const { new_password } = req.body

  if (!new_password) {
    return res.status(400).json({ error: 'New password is required' })
  }

  if (new_password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' })
  }

  try {
    const { error } = await supabase.auth.admin.updateUserById(user.id, {
      password: new_password
    })

    if (error) {
      console.error('Error updating password:', error)
      return res.status(500).json({ error: error.message || 'Failed to update password' })
    }

    res.json({ message: 'Password updated successfully' })
  } catch (error) {
    console.error('Error in PATCH /users/me/password:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Delete user account
router.delete('/me', async (req: Request, res: Response) => {
  const { user, error: authError } = await verifyAuth(req.headers.authorization)

  if (authError || !user) {
    return res.status(401).json({ error: authError || 'Unauthorized' })
  }

  try {
    // First, delete the user's tenant and all associated data
    const { data: tenant } = await supabase
      .from('tenants')
      .select('id')
      .eq('owner_user_id', user.id)
      .single()

    if (tenant) {
      // Delete all data associated with this tenant
      // Order matters due to foreign key constraints
      await supabase.from('bookings').delete().eq('tenant_id', tenant.id)
      await supabase.from('seasonal_rates').delete().eq('tenant_id', tenant.id)
      await supabase.from('rooms').delete().eq('tenant_id', tenant.id)
      await supabase.from('addons').delete().eq('tenant_id', tenant.id)
      await supabase.from('reviews').delete().eq('tenant_id', tenant.id)
      await supabase.from('tenants').delete().eq('id', tenant.id)
    }

    // Finally, delete the user using admin API
    const { error } = await supabase.auth.admin.deleteUser(user.id)

    if (error) {
      console.error('Error deleting user:', error)
      return res.status(500).json({ error: 'Failed to delete account' })
    }

    res.json({ message: 'Account deleted successfully' })
  } catch (error) {
    console.error('Error in DELETE /users/me:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router

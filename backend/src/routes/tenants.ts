import { Router, Request, Response } from 'express'
import { supabase } from '../lib/supabase.js'

const router = Router()

// Get current user's tenant
// Requires: Authorization header with Supabase JWT
router.get('/me', async (req: Request, res: Response) => {
  const authHeader = req.headers.authorization

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid authorization header' })
  }

  const token = authHeader.split(' ')[1]

  try {
    // Verify the JWT and get user
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      return res.status(401).json({ error: 'Invalid token' })
    }

    // Get tenant for this user
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select('*')
      .eq('owner_user_id', user.id)
      .single()

    if (tenantError && tenantError.code !== 'PGRST116') {
      // PGRST116 = no rows found, which is okay
      console.error('Error fetching tenant:', tenantError)
      return res.status(500).json({ error: 'Failed to fetch tenant' })
    }

    // Return tenant (or null if not found)
    res.json({ tenant: tenant || null })
  } catch (error) {
    console.error('Error in /tenants/me:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Update tenant settings
router.patch('/me', async (req: Request, res: Response) => {
  const authHeader = req.headers.authorization

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid authorization header' })
  }

  const token = authHeader.split(' ')[1]

  try {
    // Verify the JWT and get user
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      return res.status(401).json({ error: 'Invalid token' })
    }

    // Get tenant for this user
    const { data: existingTenant, error: fetchError } = await supabase
      .from('tenants')
      .select('id')
      .eq('owner_user_id', user.id)
      .single()

    if (fetchError || !existingTenant) {
      return res.status(404).json({ error: 'Tenant not found' })
    }

    // Extract allowed fields from request body
    const allowedFields = [
      'business_name',
      'business_description',
      'logo_url',
      'address_line1',
      'address_line2',
      'city',
      'state_province',
      'postal_code',
      'country',
      'vat_number',
      'business_email',
      'business_phone',
      'website_url',
      'language',
      'currency',
      'timezone',
      'date_format',
      'business_hours'
    ]

    const updates: Record<string, unknown> = {}
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field]
      }
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' })
    }

    // Update tenant
    const { data: tenant, error: updateError } = await supabase
      .from('tenants')
      .update(updates)
      .eq('id', existingTenant.id)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating tenant:', updateError)
      return res.status(500).json({ error: 'Failed to update settings' })
    }

    res.json({ tenant })
  } catch (error) {
    console.error('Error in PATCH /tenants/me:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Upload logo image
router.post('/me/logo', async (req: Request, res: Response) => {
  const authHeader = req.headers.authorization

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid authorization header' })
  }

  const token = authHeader.split(' ')[1]
  const { image } = req.body // Base64 encoded image

  if (!image) {
    return res.status(400).json({ error: 'Image data is required' })
  }

  try {
    // Verify the JWT and get user
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      return res.status(401).json({ error: 'Invalid token' })
    }

    // Get tenant for this user
    const { data: tenant, error: fetchError } = await supabase
      .from('tenants')
      .select('id')
      .eq('owner_user_id', user.id)
      .single()

    if (fetchError || !tenant) {
      return res.status(404).json({ error: 'Tenant not found' })
    }

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
    const fileName = `logos/${tenant.id}/logo.${ext}`

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('tenant-assets')
      .upload(fileName, buffer, {
        contentType: mimeType,
        upsert: true
      })

    if (uploadError) {
      console.error('Error uploading logo:', uploadError)
      return res.status(500).json({ error: 'Failed to upload logo' })
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('tenant-assets')
      .getPublicUrl(fileName)

    const logoUrl = urlData.publicUrl

    // Update tenant with logo URL
    const { error: updateError } = await supabase
      .from('tenants')
      .update({ logo_url: logoUrl })
      .eq('id', tenant.id)

    if (updateError) {
      console.error('Error updating tenant logo:', updateError)
      return res.status(500).json({ error: 'Failed to save logo URL' })
    }

    res.json({ logo_url: logoUrl })
  } catch (error) {
    console.error('Error in POST /tenants/me/logo:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Create a new tenant for the authenticated user
router.post('/', async (req: Request, res: Response) => {
  const authHeader = req.headers.authorization

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid authorization header' })
  }

  const token = authHeader.split(' ')[1]
  const { name } = req.body

  try {
    // Verify the JWT and get user
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      return res.status(401).json({ error: 'Invalid token' })
    }

    // Check if tenant already exists
    const { data: existingTenant } = await supabase
      .from('tenants')
      .select('id')
      .eq('owner_user_id', user.id)
      .single()

    if (existingTenant) {
      return res.status(400).json({ error: 'Tenant already exists for this user' })
    }

    // Create new tenant
    const { data: tenant, error: createError } = await supabase
      .from('tenants')
      .insert({
        owner_user_id: user.id,
        name: name || null,
        has_lifetime_access: false,
      })
      .select()
      .single()

    if (createError) {
      console.error('Error creating tenant:', createError)
      return res.status(500).json({ error: 'Failed to create tenant' })
    }

    res.status(201).json({ tenant })
  } catch (error) {
    console.error('Error in POST /tenants:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Save Paystack settings for tenant
router.put('/me/payment-apps/paystack', async (req: Request, res: Response) => {
  const authHeader = req.headers.authorization

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid authorization header' })
  }

  const token = authHeader.split(' ')[1]

  try {
    // Verify the JWT and get user
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      return res.status(401).json({ error: 'Invalid token' })
    }

    // Get tenant for this user
    const { data: existingTenant, error: fetchError } = await supabase
      .from('tenants')
      .select('id')
      .eq('owner_user_id', user.id)
      .single()

    if (fetchError || !existingTenant) {
      return res.status(404).json({ error: 'Tenant not found' })
    }

    const {
      enabled,
      mode,
      test_public_key,
      test_secret_key,
      live_public_key,
      live_secret_key
    } = req.body

    // Update tenant with Paystack settings
    const { data: tenant, error: updateError } = await supabase
      .from('tenants')
      .update({
        paystack_enabled: enabled,
        paystack_mode: mode,
        paystack_test_public_key: test_public_key,
        paystack_test_secret_key: test_secret_key,
        paystack_live_public_key: live_public_key,
        paystack_live_secret_key: live_secret_key,
      })
      .eq('id', existingTenant.id)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating Paystack settings:', updateError)
      return res.status(500).json({ error: 'Failed to save Paystack settings' })
    }

    res.json({ success: true, tenant })
  } catch (error) {
    console.error('Error in PUT /tenants/me/payment-apps/paystack:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Save EFT settings for tenant
router.put('/me/payment-apps/eft', async (req: Request, res: Response) => {
  const authHeader = req.headers.authorization

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid authorization header' })
  }

  const token = authHeader.split(' ')[1]

  try {
    // Verify the JWT and get user
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      return res.status(401).json({ error: 'Invalid token' })
    }

    // Get tenant for this user
    const { data: existingTenant, error: fetchError } = await supabase
      .from('tenants')
      .select('id')
      .eq('owner_user_id', user.id)
      .single()

    if (fetchError || !existingTenant) {
      return res.status(404).json({ error: 'Tenant not found' })
    }

    const {
      enabled,
      account_holder,
      bank_name,
      account_number,
      branch_code,
      account_type
    } = req.body

    // Update tenant with EFT settings
    const { data: tenant, error: updateError } = await supabase
      .from('tenants')
      .update({
        eft_enabled: enabled,
        eft_account_holder: account_holder,
        eft_bank_name: bank_name,
        eft_account_number: account_number,
        eft_branch_code: branch_code,
        eft_account_type: account_type,
      })
      .eq('id', existingTenant.id)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating EFT settings:', updateError)
      return res.status(500).json({ error: 'Failed to save EFT settings' })
    }

    res.json({ success: true, tenant })
  } catch (error) {
    console.error('Error in PUT /tenants/me/payment-apps/eft:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router

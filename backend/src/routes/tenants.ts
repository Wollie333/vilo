import { Router, Request, Response } from 'express'
import { supabase } from '../lib/supabase.js'
import { syncICalFeed, validateICalUrl } from '../services/icalService.js'

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

    // Get tenant for this user (include slug, business_name, name for slug generation)
    const { data: existingTenant, error: fetchError } = await supabase
      .from('tenants')
      .select('id, slug, business_name, name')
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
      'company_registration_number',
      'business_email',
      'business_phone',
      'website_url',
      'language',
      'currency',
      'timezone',
      'date_format',
      'business_hours',
      // Directory listing fields
      'slug',
      'discoverable',
      'directory_featured',
      'property_type',
      'region',
      'region_slug',
      'cover_image',
      // Extended directory listing fields
      'gallery_images',
      'directory_description',
      'check_in_time',
      'check_out_time',
      'cancellation_policies',
      'property_amenities',
      'house_rules',
      'whats_included',
      'property_highlights',
      'seasonal_message',
      'special_offers',
      // Geographic hierarchy fields
      'country_id',
      'province_id',
      'destination_id',
      'latitude',
      'longitude',
      'google_place_id',
      'formatted_address',
      'category_slugs',
      // SEO fields
      'seo_meta_title',
      'seo_meta_description',
      'seo_keywords',
      'seo_og_image',
      'seo_og_image_alt',
      // Verification fields
      'verification_user_status',
      'verification_business_status'
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

    // Auto-generate slug from business_name if:
    // 1. business_name is being updated and slug wasn't explicitly provided, OR
    // 2. discoverable is being set to true and no slug exists yet
    const shouldGenerateSlug =
      (updates.business_name && !updates.slug) ||
      (updates.discoverable === true && !existingTenant.slug && !updates.slug)

    if (shouldGenerateSlug) {
      const businessName = (updates.business_name as string) || existingTenant.business_name || existingTenant.name
      if (businessName) {
        let baseSlug = businessName
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '')
          .substring(0, 50)

        // Check if slug exists and make unique if needed
        let slug = baseSlug
        let counter = 1
        while (true) {
          const { data: existing } = await supabase
            .from('tenants')
            .select('id')
            .eq('slug', slug)
            .neq('id', existingTenant.id)
            .single()

          if (!existing) break
          slug = `${baseSlug}-${counter}`
          counter++
        }
        updates.slug = slug
      }
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

    // Sync category_slugs to tenant_categories table if categories were updated
    if (updates.category_slugs !== undefined) {
      const categorySlugs = updates.category_slugs as string[] || []

      // Get category IDs for the slugs
      const { data: categoryRecords } = await supabase
        .from('property_categories')
        .select('id, slug')
        .in('slug', categorySlugs)
        .eq('is_active', true)

      // Delete existing tenant categories
      await supabase
        .from('tenant_categories')
        .delete()
        .eq('tenant_id', existingTenant.id)

      // Insert new tenant categories
      if (categoryRecords && categoryRecords.length > 0) {
        const insertData = categoryRecords.map((cat, idx) => ({
          tenant_id: existingTenant.id,
          category_id: cat.id,
          is_primary: idx === 0
        }))

        await supabase
          .from('tenant_categories')
          .insert(insertData)
      }
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

// Update property categories
router.put('/me/categories', async (req: Request, res: Response) => {
  const authHeader = req.headers.authorization

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid authorization header' })
  }

  const token = authHeader.split(' ')[1]
  const { categories } = req.body // Array of category slugs

  if (!Array.isArray(categories)) {
    return res.status(400).json({ error: 'Categories must be an array of slugs' })
  }

  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      return res.status(401).json({ error: 'Invalid token' })
    }

    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select('id')
      .eq('owner_user_id', user.id)
      .single()

    if (tenantError || !tenant) {
      return res.status(404).json({ error: 'Tenant not found' })
    }

    // Get category IDs from slugs
    const { data: categoryRecords, error: catError } = await supabase
      .from('property_categories')
      .select('id, slug')
      .in('slug', categories)
      .eq('is_active', true)

    if (catError) {
      console.error('Error fetching categories:', catError)
      return res.status(500).json({ error: 'Failed to fetch categories' })
    }

    // Delete existing tenant categories
    const { error: deleteError } = await supabase
      .from('tenant_categories')
      .delete()
      .eq('tenant_id', tenant.id)

    if (deleteError) {
      console.error('Error deleting existing categories:', deleteError)
      return res.status(500).json({ error: 'Failed to update categories' })
    }

    // Insert new tenant categories
    if (categoryRecords && categoryRecords.length > 0) {
      const insertData = categoryRecords.map((cat, idx) => ({
        tenant_id: tenant.id,
        category_id: cat.id,
        is_primary: idx === 0 // First category is primary
      }))

      const { error: insertError } = await supabase
        .from('tenant_categories')
        .insert(insertData)

      if (insertError) {
        console.error('Error inserting categories:', insertError)
        return res.status(500).json({ error: 'Failed to save categories' })
      }
    }

    // Update denormalized category_slugs on tenant
    const validSlugs = categoryRecords?.map(c => c.slug) || []
    const { error: updateError } = await supabase
      .from('tenants')
      .update({ category_slugs: validSlugs })
      .eq('id', tenant.id)

    if (updateError) {
      console.error('Error updating category_slugs:', updateError)
    }

    res.json({ success: true, categories: validSlugs })
  } catch (error) {
    console.error('Error in PUT /tenants/me/categories:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Get property categories for current tenant
router.get('/me/categories', async (req: Request, res: Response) => {
  const authHeader = req.headers.authorization

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid authorization header' })
  }

  const token = authHeader.split(' ')[1]

  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      return res.status(401).json({ error: 'Invalid token' })
    }

    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select('id, category_slugs')
      .eq('owner_user_id', user.id)
      .single()

    if (tenantError || !tenant) {
      return res.status(404).json({ error: 'Tenant not found' })
    }

    res.json({ categories: tenant.category_slugs || [] })
  } catch (error) {
    console.error('Error in GET /tenants/me/categories:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// ============================================
// SYNC APPS (iCal sync per platform)
// ============================================

// Platform name mapping for source field
const PLATFORM_SOURCE_MAP: Record<string, string> = {
  airbnb: 'airbnb',
  bookingcom: 'booking_com',
  booking_com: 'booking_com',
  lekkeslaap: 'lekkerslaap',
  vrbo: 'vrbo',
  expedia: 'expedia',
  tripadvisor: 'tripadvisor',
  agoda: 'agoda',
  hotels_com: 'hotels_com',
  google: 'google',
  outlook: 'outlook',
}

// Save sync settings for a platform
router.put('/me/sync-apps/:platform', async (req: Request, res: Response) => {
  const authHeader = req.headers.authorization
  const { platform } = req.params

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid authorization header' })
  }

  const token = authHeader.split(' ')[1]
  const { enabled, ical_import_url, sync_frequency } = req.body

  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      return res.status(401).json({ error: 'Invalid token' })
    }

    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select('id')
      .eq('owner_user_id', user.id)
      .single()

    if (tenantError || !tenant) {
      console.error('Tenant lookup error:', tenantError)
      return res.status(404).json({ error: 'Tenant not found' })
    }

    // Validate iCal URL if provided
    if (ical_import_url && enabled) {
      const validation = await validateICalUrl(ical_import_url)
      if (!validation.valid) {
        return res.status(400).json({
          error: `Invalid iCal URL: ${validation.error}`,
          valid: false
        })
      }
    }

    // Try to update sync settings in the tenant's sync_settings JSONB field
    // Note: sync_settings column may not exist yet if migration hasn't run
    let updatedSettings: Record<string, unknown> = {}
    try {
      // First try to get current settings
      const { data: tenantWithSettings } = await supabase
        .from('tenants')
        .select('sync_settings')
        .eq('id', tenant.id)
        .single()

      const currentSettings = (tenantWithSettings?.sync_settings as Record<string, unknown>) || {}
      updatedSettings = {
        ...currentSettings,
        [platform]: {
          enabled: enabled || false,
          ical_import_url: ical_import_url || null,
          sync_frequency: sync_frequency || 'hourly',
          updated_at: new Date().toISOString()
        }
      }

      await supabase
        .from('tenants')
        .update({ sync_settings: updatedSettings })
        .eq('id', tenant.id)
    } catch (settingsError) {
      // sync_settings column may not exist - that's okay, continue with sync
      console.log('Note: sync_settings column may not exist yet, skipping settings save')
    }

    // If enabled and has iCal URL, trigger an immediate sync
    if (enabled && ical_import_url) {
      // Get all rooms for this tenant to sync bookings to
      const { data: rooms } = await supabase
        .from('rooms')
        .select('id')
        .eq('tenant_id', tenant.id)
        .limit(1) // For now, sync to first room (in production, user would select which room)

      if (rooms && rooms.length > 0) {
        try {
          console.log(`Syncing iCal from ${platform}: ${ical_import_url}`)
          const bookings = await syncICalFeed(ical_import_url, platform)
          const source = PLATFORM_SOURCE_MAP[platform] || platform

          let created = 0
          let updated = 0

          for (const booking of bookings) {
            // Check if booking already exists
            const { data: existing } = await supabase
              .from('bookings')
              .select('id')
              .eq('external_id', booking.external_id)
              .eq('tenant_id', tenant.id)
              .single()

            if (existing) {
              // Update existing
              await supabase
                .from('bookings')
                .update({
                  guest_name: booking.guest_name,
                  check_in: booking.check_in,
                  check_out: booking.check_out,
                  notes: booking.notes,
                  synced_at: new Date().toISOString()
                })
                .eq('id', existing.id)
              updated++
            } else {
              // Create new booking
              await supabase
                .from('bookings')
                .insert({
                  tenant_id: tenant.id,
                  room_id: rooms[0].id,
                  guest_name: booking.guest_name,
                  check_in: booking.check_in,
                  check_out: booking.check_out,
                  status: 'confirmed',
                  payment_status: 'pending',
                  source: source,
                  external_id: booking.external_id,
                  synced_at: new Date().toISOString(),
                  total_amount: 0,
                  currency: 'ZAR',
                  notes: booking.notes
                })
              created++
            }
          }

          console.log(`Sync complete for ${platform}: ${created} created, ${updated} updated`)

          return res.json({
            success: true,
            platform,
            sync_result: {
              bookings_found: bookings.length,
              created,
              updated
            }
          })
        } catch (syncError: any) {
          console.error(`Sync error for ${platform}:`, syncError)
          // Still return success for settings save, but include sync error
          return res.json({
            success: true,
            platform,
            sync_error: syncError.message
          })
        }
      }
    }

    res.json({
      success: true,
      platform,
      message: 'Settings saved. Sync will run when a room is available.'
    })
  } catch (error) {
    console.error('Error in PUT /tenants/me/sync-apps/:platform:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Get sync settings for all platforms
router.get('/me/sync-apps', async (req: Request, res: Response) => {
  const authHeader = req.headers.authorization

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid authorization header' })
  }

  const token = authHeader.split(' ')[1]

  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      return res.status(401).json({ error: 'Invalid token' })
    }

    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select('id, sync_settings')
      .eq('owner_user_id', user.id)
      .single()

    if (tenantError || !tenant) {
      return res.status(404).json({ error: 'Tenant not found' })
    }

    res.json({ sync_settings: tenant.sync_settings || {} })
  } catch (error) {
    console.error('Error in GET /tenants/me/sync-apps:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router

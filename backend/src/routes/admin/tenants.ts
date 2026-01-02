import { Router, Response } from 'express'
import { supabase } from '../../lib/supabase.js'
import { SuperAdminRequest, requirePermission, logAdminAction, auditLog } from '../../middleware/superAdmin.js'

const router = Router()

/**
 * GET /api/admin/tenants
 * List all tenants with filters and pagination
 */
router.get('/', requirePermission('tenants'), async (req: SuperAdminRequest, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1
    const limit = parseInt(req.query.limit as string) || 20
    const status = req.query.status as string
    const plan = req.query.plan as string
    const search = req.query.search as string
    const sortBy = (req.query.sortBy as string) || 'created_at'
    const sortOrder = (req.query.sortOrder as string) || 'desc'
    // Advanced filter parameters
    const isPaused = req.query.isPaused as string
    const country = req.query.country as string
    const verification = req.query.verification as string
    const discoverable = req.query.discoverable as string
    const dateFrom = req.query.dateFrom as string
    const dateTo = req.query.dateTo as string

    const offset = (page - 1) * limit

    // Build query - Note: rooms and bookings have FK to tenant, not reverse
    let query = supabase
      .from('tenants')
      .select(`
        *,
        tenant_subscriptions (
          status,
          plan_id,
          billing_cycle,
          current_period_end,
          subscription_plans (id, name, slug)
        ),
        tenant_members (id)
      `, { count: 'exact' })

    // Apply search filter
    if (search) {
      query = query.or(`business_name.ilike.%${search}%,business_email.ilike.%${search}%,slug.ilike.%${search}%`)
    }

    // Apply direct column filters
    if (isPaused === 'true') {
      query = query.eq('is_paused', true)
    } else if (isPaused === 'false') {
      query = query.eq('is_paused', false)
    }

    if (country) {
      query = query.eq('country', country)
    }

    if (verification) {
      query = query.eq('verification_business_status', verification)
    }

    if (discoverable === 'true') {
      query = query.eq('discoverable', true)
    } else if (discoverable === 'false') {
      query = query.eq('discoverable', false)
    }

    if (dateFrom) {
      query = query.gte('created_at', dateFrom)
    }

    if (dateTo) {
      // Add end of day to include the full day
      query = query.lte('created_at', `${dateTo}T23:59:59.999Z`)
    }

    // Sort
    const ascending = sortOrder === 'asc'
    query = query.order(sortBy, { ascending })

    // Paginate
    query = query.range(offset, offset + limit - 1)

    const { data: tenants, count, error } = await query

    if (error) {
      console.error('List tenants error:', error)
      return res.status(500).json({ error: 'Failed to list tenants' })
    }

    // Collect tenant IDs for batch queries
    const tenantIds = tenants?.map((t: any) => t.id) || []

    // Batch query for room counts per tenant
    const { data: roomCounts } = tenantIds.length > 0
      ? await supabase
          .from('rooms')
          .select('tenant_id')
          .in('tenant_id', tenantIds)
      : { data: [] }

    // Batch query for booking counts and revenue per tenant
    const { data: bookingStats } = tenantIds.length > 0
      ? await supabase
          .from('bookings')
          .select('tenant_id, total_amount')
          .in('tenant_id', tenantIds)
      : { data: [] }

    // Create lookup maps for room counts
    const roomCountMap = new Map<string, number>()
    roomCounts?.forEach((r: any) => {
      roomCountMap.set(r.tenant_id, (roomCountMap.get(r.tenant_id) || 0) + 1)
    })

    // Create lookup maps for booking counts and revenue
    const bookingCountMap = new Map<string, number>()
    const revenueMap = new Map<string, number>()
    bookingStats?.forEach((b: any) => {
      bookingCountMap.set(b.tenant_id, (bookingCountMap.get(b.tenant_id) || 0) + 1)
      revenueMap.set(b.tenant_id, (revenueMap.get(b.tenant_id) || 0) + (Number(b.total_amount) || 0))
    })

    // Transform data
    let transformedTenants = tenants?.map((tenant: any) => {
      const subscription = tenant.tenant_subscriptions?.[0]

      return {
        id: tenant.id,
        name: tenant.business_name,
        slug: tenant.slug || null,
        ownerUserId: tenant.owner_user_id || null,
        ownerEmail: tenant.business_email,
        status: subscription?.status || 'active',
        subscriptionPlan: subscription?.subscription_plans?.name || 'Free',
        planSlug: subscription?.subscription_plans?.slug || 'free',
        subscriptionStatus: subscription?.status,
        billingCycle: subscription?.billing_cycle,
        periodEnd: subscription?.current_period_end,
        memberCount: tenant.tenant_members?.length || 0,
        roomCount: roomCountMap.get(tenant.id) || 0,
        bookingCount: bookingCountMap.get(tenant.id) || 0,
        totalRevenue: revenueMap.get(tenant.id) || 0,
        createdAt: tenant.created_at,
        lastActiveAt: tenant.updated_at,
        country: tenant.country,
        currency: tenant.currency,
        isPaused: tenant.is_paused || false,
        verification: tenant.verification_business_status || 'none',
        discoverable: tenant.discoverable || false
      }
    }) || []

    // Post-filter by subscription status (can't filter on joined table in Supabase query)
    if (status) {
      transformedTenants = transformedTenants.filter(t => t.status === status)
    }

    // Post-filter by plan slug
    if (plan) {
      transformedTenants = transformedTenants.filter(t => t.planSlug === plan)
    }

    // Note: For status/plan filtering, the total count may differ from actual results
    // This is a known limitation - consider using a separate count query if exact counts are needed
    const filteredTotal = (status || plan) ? transformedTenants.length : (count || 0)

    res.json({
      tenants: transformedTenants,
      total: filteredTotal,
      page,
      limit,
      totalPages: Math.ceil(filteredTotal / limit)
    })
  } catch (error) {
    console.error('List tenants error:', error)
    res.status(500).json({ error: 'Failed to list tenants' })
  }
})

/**
 * GET /api/admin/tenants/filters
 * Get available filter options (plans, countries)
 */
router.get('/filters', requirePermission('tenants'), async (req: SuperAdminRequest, res: Response) => {
  try {
    // Get all active plans
    const { data: plans } = await supabase
      .from('subscription_plans')
      .select('id, name, slug')
      .eq('is_active', true)
      .order('display_order', { ascending: true })

    // Get distinct countries from tenants
    const { data: countriesData } = await supabase
      .from('tenants')
      .select('country')
      .not('country', 'is', null)

    // Extract unique countries
    const countries = [...new Set(countriesData?.map((t: any) => t.country).filter(Boolean))]
      .sort() as string[]

    res.json({
      plans: plans || [],
      countries,
      statuses: ['active', 'trial', 'suspended', 'cancelled'],
      verificationStatuses: ['none', 'pending', 'verified', 'rejected']
    })
  } catch (error) {
    console.error('Get filters error:', error)
    res.status(500).json({ error: 'Failed to get filter options' })
  }
})

/**
 * GET /api/admin/tenants/:id
 * Get single tenant details
 */
router.get('/:id', requirePermission('tenants'), async (req: SuperAdminRequest, res: Response) => {
  try {
    const { id } = req.params

    // First, get the basic tenant data
    const { data: tenant, error } = await supabase
      .from('tenants')
      .select(`
        *,
        tenant_subscriptions (
          *,
          subscription_plans (*)
        ),
        tenant_members (
          id,
          user_id,
          email,
          member_name,
          role_id,
          status,
          created_at,
          job_title,
          bio,
          social_links,
          avatar_url,
          roles (
            id,
            name,
            slug
          )
        )
      `)
      .eq('id', id)
      .single()

    if (error) {
      console.error('Get tenant error:', error)
      return res.status(500).json({ error: 'Failed to fetch tenant', details: error.message })
    }

    if (!tenant) {
      return res.status(404).json({ error: 'Tenant not found' })
    }

    // Fetch rooms separately - rooms use is_active instead of status
    // Note: images is a JSONB column with { featured: string | null, gallery: string[] }
    const { data: roomsData, error: roomsError } = await supabase
      .from('rooms')
      .select('id, name, room_code, is_active, is_paused, images')
      .eq('tenant_id', id)

    if (roomsError) {
      console.error('Get tenant rooms error:', roomsError)
    }
    console.log(`[Admin] Tenant ${id} has ${roomsData?.length || 0} rooms`)

    // Fetch bookings separately - guest_name is on bookings table directly
    const { data: bookingsData, error: bookingsError } = await supabase
      .from('bookings')
      .select('id, status, total_amount, created_at, guest_name, room_id, room_name, check_in, check_out, guest_email, guest_phone')
      .eq('tenant_id', id)
      .order('created_at', { ascending: false })

    if (bookingsError) {
      console.error('Get tenant bookings error:', bookingsError)
    }
    console.log(`[Admin] Tenant ${id} has ${bookingsData?.length || 0} bookings`)

    // Fetch room images for bookings
    // Room images are stored in JSONB 'images' column: { featured: string | null, gallery: string[] }
    const roomIds = [...new Set((bookingsData || []).map(b => b.room_id).filter(Boolean))]
    const roomImageMap = new Map<string, string>()
    console.log(`[Admin] Fetching images for ${roomIds.length} room IDs:`, roomIds)
    if (roomIds.length > 0) {
      const { data: roomImages, error: roomImagesError } = await supabase
        .from('rooms')
        .select('id, name, images')
        .in('id', roomIds)

      console.log(`[Admin] Room images query result:`, roomImages?.map(r => ({ id: r.id.slice(0,8), name: r.name, hasImage: !!(r.images as any)?.featured })))
      if (roomImagesError) {
        console.error('[Admin] Room images error:', roomImagesError)
      }

      for (const room of roomImages || []) {
        // images.featured is an object { url: string, ... } - extract the URL
        const featuredUrl = (room.images as any)?.featured?.url
        if (featuredUrl) {
          roomImageMap.set(room.id, featuredUrl)
        }
      }
      console.log(`[Admin] roomImageMap has ${roomImageMap.size} entries`)
    }

    // Calculate metrics
    const bookings = bookingsData || []
    const rooms = roomsData || []
    const members = tenant.tenant_members || []

    // Find the owner member
    const ownerMember = members.find((m: any) => m.roles?.slug === 'owner')
    const owner = ownerMember ? {
      userId: ownerMember.user_id || null,
      email: ownerMember.email || tenant.business_email,
      displayName: ownerMember.member_name || null,
      phone: tenant.business_phone || null,
      avatarUrl: ownerMember.avatar_url || null,
      jobTitle: ownerMember.job_title || null,
      bio: ownerMember.bio || null,
      socialLinks: ownerMember.social_links || null,
      address: {
        line1: tenant.address_line1 || null,
        line2: tenant.address_line2 || null,
        city: tenant.city || null,
        state: tenant.state_province || null,
        postalCode: tenant.postal_code || null,
        country: tenant.country || null
      },
      createdAt: ownerMember.created_at,
      lastSignInAt: null // Would need to query auth.users for this
    } : null

    // Get current month bookings count
    const monthStart = new Date()
    monthStart.setDate(1)
    monthStart.setHours(0, 0, 0, 0)
    const monthlyBookings = bookings.filter((b: any) =>
      new Date(b.created_at) >= monthStart
    ).length

    // Get subscription info and plan limits
    const subscription = tenant.tenant_subscriptions?.[0]
    const plan = subscription?.subscription_plans
    const limits = plan?.limits || {
      max_rooms: 2,
      max_team_members: 1,
      max_bookings_per_month: 20,
      max_storage_mb: 100
    }

    // Return flat structure matching frontend TenantDetail interface
    res.json({
      id: tenant.id,
      name: tenant.business_name,
      slug: tenant.slug || null,
      ownerUserId: tenant.owner_user_id || null,
      ownerEmail: tenant.business_email,
      status: subscription?.status || 'active',
      // Property fields
      businessName: tenant.business_name,
      businessDescription: tenant.business_description,
      logoUrl: tenant.logo_url,
      businessEmail: tenant.business_email,
      businessPhone: tenant.business_phone,
      websiteUrl: tenant.website_url,
      // Address fields
      addressLine1: tenant.address_line1,
      addressLine2: tenant.address_line2,
      city: tenant.city,
      stateProvince: tenant.state_province,
      postalCode: tenant.postal_code,
      country: tenant.country,
      // Legal info
      vatNumber: tenant.vat_number,
      companyRegistrationNumber: tenant.company_registration_number,
      // Settings
      currency: tenant.currency,
      timezone: tenant.timezone,
      language: tenant.language,
      dateFormat: tenant.date_format,
      discoverable: tenant.discoverable,
      // Timestamps
      createdAt: tenant.created_at,
      lastActiveAt: tenant.updated_at,
      subscription: subscription ? {
        id: subscription.id,
        planName: plan?.name || 'Free',
        status: subscription.status,
        currentPeriodEnd: subscription.current_period_end,
        cancelAtPeriodEnd: subscription.cancel_at_period_end || false
      } : null,
      usage: {
        rooms: rooms.length,
        teamMembers: members.filter((m: any) => m.status === 'active').length,
        monthlyBookings: monthlyBookings,
        storageUsedMB: 0 // TODO: Calculate actual storage usage
      },
      limits: {
        maxRooms: limits.max_rooms || 2,
        maxTeamMembers: limits.max_team_members || 1,
        maxBookingsPerMonth: limits.max_bookings_per_month || 20,
        maxStorageMB: limits.max_storage_mb || 100
      },
      // Owner data for the Owner section
      owner,
      // Include raw arrays for detail sections
      tenant_members: members.map((m: any) => ({
        ...m,
        display_name: m.member_name || null // Frontend expects display_name
      })),
      // Map is_active to status for frontend compatibility
      rooms: rooms.map((r: any) => ({
        id: r.id,
        name: r.name,
        roomCode: r.room_code || null,
        status: r.is_active ? 'active' : 'inactive',
        isPaused: r.is_paused || false,
        primary_image_url: r.images?.featured?.url || null
      })),
      bookings: bookings.map((b: any) => ({
        id: b.id,
        status: b.status,
        total_amount: b.total_amount,
        created_at: b.created_at,
        customer_name: b.guest_name || null,
        guest_email: b.guest_email || null,
        guest_phone: b.guest_phone || null,
        room_id: b.room_id || null,
        room_name: b.room_name || null,
        room_image: b.room_id ? roomImageMap.get(b.room_id) || null : null,
        check_in: b.check_in || null,
        check_out: b.check_out || null
      })).sort((a: any, b: any) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )
    })
  } catch (error) {
    console.error('Get tenant error:', error)
    res.status(500).json({ error: 'Failed to get tenant' })
  }
})

/**
 * PATCH /api/admin/tenants/:id
 * Update tenant details
 */
router.patch('/:id', requirePermission('tenants'), auditLog('tenant.update', 'tenant'), async (req: SuperAdminRequest, res: Response) => {
  try {
    const { id } = req.params
    const updates = req.body

    // Allowed fields that can be updated
    const allowedFields = [
      'business_name',
      'business_description',
      'logo_url',
      'business_email',
      'business_phone',
      'website_url',
      'address_line1',
      'address_line2',
      'city',
      'state_province',
      'postal_code',
      'country',
      'vat_number',
      'company_registration_number',
      'currency',
      'timezone',
      'language',
      'date_format',
      'discoverable'
    ]

    // Filter to only allowed fields
    const filteredUpdates: Record<string, any> = {}
    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        filteredUpdates[field] = updates[field]
      }
    }

    if (Object.keys(filteredUpdates).length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' })
    }

    // Add updated_at timestamp
    filteredUpdates.updated_at = new Date().toISOString()

    // Update tenant
    const { data: tenant, error } = await supabase
      .from('tenants')
      .update(filteredUpdates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Update tenant error:', error)
      return res.status(500).json({ error: 'Failed to update tenant', details: error.message })
    }

    if (!tenant) {
      return res.status(404).json({ error: 'Tenant not found' })
    }

    // Log the action
    if (req.superAdmin) {
      await logAdminAction({
        adminId: req.superAdmin.id,
        adminEmail: req.superAdmin.email,
        action: 'tenant.update',
        resourceType: 'tenant',
        resourceId: id,
        description: `Updated tenant fields: ${Object.keys(filteredUpdates).join(', ')}`,
        metadata: { updatedFields: Object.keys(filteredUpdates) },
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      })
    }

    res.json({
      success: true,
      message: 'Tenant updated successfully',
      tenant: {
        id: tenant.id,
        businessName: tenant.business_name,
        businessDescription: tenant.business_description,
        logoUrl: tenant.logo_url,
        businessEmail: tenant.business_email,
        businessPhone: tenant.business_phone,
        websiteUrl: tenant.website_url,
        addressLine1: tenant.address_line1,
        addressLine2: tenant.address_line2,
        city: tenant.city,
        stateProvince: tenant.state_province,
        postalCode: tenant.postal_code,
        country: tenant.country,
        vatNumber: tenant.vat_number,
        companyRegistrationNumber: tenant.company_registration_number,
        currency: tenant.currency,
        timezone: tenant.timezone,
        language: tenant.language,
        dateFormat: tenant.date_format,
        discoverable: tenant.discoverable
      }
    })
  } catch (error) {
    console.error('Update tenant error:', error)
    res.status(500).json({ error: 'Failed to update tenant' })
  }
})

/**
 * PATCH /api/admin/tenants/:id/owner
 * Update tenant owner profile
 */
router.patch('/:id/owner', requirePermission('tenants'), auditLog('owner.update', 'tenant'), async (req: SuperAdminRequest, res: Response) => {
  try {
    const { id } = req.params
    const { displayName, email, phone, avatarUrl, jobTitle, bio, socialLinks, address } = req.body

    // Get the tenant and find the owner member
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select(`
        id,
        owner_user_id,
        tenant_members (
          id,
          user_id,
          email,
          member_name,
          roles (slug)
        )
      `)
      .eq('id', id)
      .single()

    if (tenantError || !tenant) {
      return res.status(404).json({ error: 'Tenant not found' })
    }

    const ownerMember = tenant.tenant_members?.find((m: any) => m.roles?.slug === 'owner')
    if (!ownerMember) {
      return res.status(404).json({ error: 'Owner not found' })
    }

    // Update tenant_members for name, email, and new profile fields
    const memberUpdates: Record<string, any> = { updated_at: new Date().toISOString() }
    if (displayName !== undefined) memberUpdates.member_name = displayName
    if (email !== undefined) memberUpdates.email = email
    if (avatarUrl !== undefined) memberUpdates.avatar_url = avatarUrl
    if (jobTitle !== undefined) memberUpdates.job_title = jobTitle
    if (bio !== undefined) memberUpdates.bio = bio
    if (socialLinks !== undefined) memberUpdates.social_links = socialLinks

    if (Object.keys(memberUpdates).length > 1) {
      const { error: memberError } = await supabase
        .from('tenant_members')
        .update(memberUpdates)
        .eq('id', ownerMember.id)

      if (memberError) {
        console.error('Update owner member error:', memberError)
        return res.status(500).json({ error: 'Failed to update owner profile' })
      }
    }

    // Update tenant for phone and address (stored on tenant level)
    const tenantUpdates: Record<string, any> = { updated_at: new Date().toISOString() }
    if (phone !== undefined) tenantUpdates.business_phone = phone
    if (address) {
      if (address.line1 !== undefined) tenantUpdates.address_line1 = address.line1
      if (address.line2 !== undefined) tenantUpdates.address_line2 = address.line2
      if (address.city !== undefined) tenantUpdates.city = address.city
      if (address.state !== undefined) tenantUpdates.state_province = address.state
      if (address.postalCode !== undefined) tenantUpdates.postal_code = address.postalCode
      if (address.country !== undefined) tenantUpdates.country = address.country
    }

    if (Object.keys(tenantUpdates).length > 1) {
      const { error: tenantUpdateError } = await supabase
        .from('tenants')
        .update(tenantUpdates)
        .eq('id', id)

      if (tenantUpdateError) {
        console.error('Update tenant for owner error:', tenantUpdateError)
        return res.status(500).json({ error: 'Failed to update owner address/phone' })
      }
    }

    // Log the action
    if (req.superAdmin) {
      await logAdminAction({
        adminId: req.superAdmin.id,
        adminEmail: req.superAdmin.email,
        action: 'owner.update',
        resourceType: 'tenant',
        resourceId: id,
        description: `Updated owner profile for tenant`,
        metadata: { updatedFields: Object.keys({ ...memberUpdates, ...tenantUpdates }).filter(k => k !== 'updated_at') },
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      })
    }

    // Return updated owner data
    const { data: updatedTenant } = await supabase
      .from('tenants')
      .select('*, tenant_members(id, user_id, email, member_name, avatar_url, job_title, bio, social_links, created_at, roles(slug))')
      .eq('id', id)
      .single()

    const updatedOwner = updatedTenant?.tenant_members?.find((m: any) => m.roles?.slug === 'owner')

    res.json({
      success: true,
      owner: {
        userId: updatedOwner?.user_id || null,
        email: updatedOwner?.email || updatedTenant?.business_email,
        displayName: updatedOwner?.member_name || null,
        phone: updatedTenant?.business_phone || null,
        avatarUrl: updatedOwner?.avatar_url || null,
        jobTitle: updatedOwner?.job_title || null,
        bio: updatedOwner?.bio || null,
        socialLinks: updatedOwner?.social_links || null,
        address: {
          line1: updatedTenant?.address_line1 || null,
          line2: updatedTenant?.address_line2 || null,
          city: updatedTenant?.city || null,
          state: updatedTenant?.state_province || null,
          postalCode: updatedTenant?.postal_code || null,
          country: updatedTenant?.country || null
        },
        createdAt: updatedOwner?.created_at,
        lastSignInAt: null
      }
    })
  } catch (error) {
    console.error('Update owner error:', error)
    res.status(500).json({ error: 'Failed to update owner' })
  }
})

/**
 * POST /api/admin/tenants/:id/owner/reset-password
 * Send password reset email to owner
 */
router.post('/:id/owner/reset-password', requirePermission('tenants'), auditLog('owner.reset_password', 'tenant'), async (req: SuperAdminRequest, res: Response) => {
  try {
    const { id } = req.params

    // Get the tenant and find the owner
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select(`
        id,
        tenant_members (
          id,
          email,
          roles (slug)
        )
      `)
      .eq('id', id)
      .single()

    if (tenantError || !tenant) {
      return res.status(404).json({ error: 'Tenant not found' })
    }

    const ownerMember = tenant.tenant_members?.find((m: any) => m.roles?.slug === 'owner')
    if (!ownerMember || !ownerMember.email) {
      return res.status(404).json({ error: 'Owner email not found' })
    }

    // Send password reset email via Supabase Auth
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(ownerMember.email, {
      redirectTo: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password`
    })

    if (resetError) {
      console.error('Password reset error:', resetError)
      return res.status(500).json({ error: 'Failed to send password reset email' })
    }

    // Log the action
    if (req.superAdmin) {
      await logAdminAction({
        adminId: req.superAdmin.id,
        adminEmail: req.superAdmin.email,
        action: 'owner.reset_password',
        resourceType: 'tenant',
        resourceId: id,
        description: `Sent password reset email to owner: ${ownerMember.email}`,
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      })
    }

    res.json({ success: true, message: 'Password reset email sent' })
  } catch (error) {
    console.error('Reset password error:', error)
    res.status(500).json({ error: 'Failed to send password reset email' })
  }
})

/**
 * POST /api/admin/tenants/:id/owner/avatar
 * Upload avatar for tenant owner
 */
router.post('/:id/owner/avatar', requirePermission('tenants'), auditLog('owner.avatar_upload', 'tenant'), async (req: SuperAdminRequest, res: Response) => {
  try {
    const { id } = req.params
    const { data, filename } = req.body

    if (!data) {
      return res.status(400).json({ error: 'No image data provided' })
    }

    // Get the tenant and find the owner member
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select(`
        id,
        tenant_members (
          id,
          roles (slug)
        )
      `)
      .eq('id', id)
      .single()

    if (tenantError || !tenant) {
      return res.status(404).json({ error: 'Tenant not found' })
    }

    const ownerMember = tenant.tenant_members?.find((m: any) => m.roles?.slug === 'owner')
    if (!ownerMember) {
      return res.status(404).json({ error: 'Owner not found' })
    }

    // Parse base64 data
    const matches = data.match(/^data:image\/(\w+);base64,(.+)$/)
    if (!matches) {
      return res.status(400).json({ error: 'Invalid image data format' })
    }

    const mimeType = `image/${matches[1]}`
    const base64Data = matches[2]
    const buffer = Buffer.from(base64Data, 'base64')

    // Validate file size (max 5MB)
    if (buffer.length > 5 * 1024 * 1024) {
      return res.status(400).json({ error: 'Image size must be less than 5MB' })
    }

    const ext = matches[1] === 'jpeg' ? 'jpg' : matches[1]
    const fileName = `owner-avatars/${id}/avatar-${Date.now()}.${ext}`

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('tenant-assets')
      .upload(fileName, buffer, {
        contentType: mimeType,
        upsert: true
      })

    if (uploadError) {
      console.error('Error uploading owner avatar:', uploadError)
      return res.status(500).json({ error: 'Failed to upload avatar' })
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('tenant-assets')
      .getPublicUrl(fileName)

    const avatarUrl = urlData.publicUrl

    // Update owner member record
    const { error: updateError } = await supabase
      .from('tenant_members')
      .update({
        avatar_url: avatarUrl,
        updated_at: new Date().toISOString()
      })
      .eq('id', ownerMember.id)

    if (updateError) {
      console.error('Error updating owner avatar URL:', updateError)
      return res.status(500).json({ error: 'Failed to save avatar URL' })
    }

    // Log the action
    if (req.superAdmin) {
      await logAdminAction({
        adminId: req.superAdmin.id,
        adminEmail: req.superAdmin.email,
        action: 'owner.avatar_upload',
        resourceType: 'tenant',
        resourceId: id,
        description: `Uploaded new avatar for owner`,
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      })
    }

    res.json({
      success: true,
      url: avatarUrl
    })
  } catch (error) {
    console.error('Avatar upload error:', error)
    res.status(500).json({ error: 'Failed to upload avatar' })
  }
})

/**
 * GET /api/admin/tenants/:id/owner/activity
 * Get activity log for owner profile changes
 */
router.get('/:id/owner/activity', requirePermission('tenants'), async (req: SuperAdminRequest, res: Response) => {
  try {
    const { id } = req.params
    const limit = parseInt(req.query.limit as string) || 20

    // Query audit logs for owner-related actions on this tenant
    const { data: logs, error } = await supabase
      .from('admin_audit_logs')
      .select('id, action, description, metadata, admin_email, created_at, ip_address')
      .eq('resource_id', id)
      .eq('resource_type', 'tenant')
      .like('action', 'owner.%')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('Get owner activity error:', error)
      return res.status(500).json({ error: 'Failed to fetch activity log' })
    }

    // Transform to activity items
    const activity = (logs || []).map((log: any) => ({
      id: log.id,
      action: log.action,
      description: log.description,
      adminEmail: log.admin_email,
      metadata: log.metadata,
      timestamp: log.created_at,
      ipAddress: log.ip_address
    }))

    res.json(activity)
  } catch (error) {
    console.error('Get owner activity error:', error)
    res.status(500).json({ error: 'Failed to fetch activity log' })
  }
})

/**
 * POST /api/admin/tenants/:id/suspend
 * Suspend a tenant account
 */
router.post('/:id/suspend', requirePermission('tenants'), auditLog('tenant.suspend', 'tenant'), async (req: SuperAdminRequest, res: Response) => {
  try {
    const { id } = req.params
    const { reason } = req.body

    // Update tenant subscription status
    const { error: subError } = await supabase
      .from('tenant_subscriptions')
      .update({
        status: 'cancelled',
        cancellation_reason: reason || 'Suspended by admin',
        cancelled_at: new Date().toISOString()
      })
      .eq('tenant_id', id)
      .in('status', ['active', 'trial'])

    if (subError) {
      console.error('Suspend subscription error:', subError)
    }

    // Log the action
    if (req.superAdmin) {
      await logAdminAction({
        adminId: req.superAdmin.id,
        adminEmail: req.superAdmin.email,
        action: 'tenant.suspend',
        resourceType: 'tenant',
        resourceId: id,
        description: `Suspended tenant: ${reason || 'No reason provided'}`,
        metadata: { reason },
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      })
    }

    res.json({ success: true, message: 'Tenant suspended successfully' })
  } catch (error) {
    console.error('Suspend tenant error:', error)
    res.status(500).json({ error: 'Failed to suspend tenant' })
  }
})

/**
 * POST /api/admin/tenants/:id/activate
 * Reactivate a suspended tenant
 */
router.post('/:id/activate', requirePermission('tenants'), auditLog('tenant.activate', 'tenant'), async (req: SuperAdminRequest, res: Response) => {
  try {
    const { id } = req.params
    const { planId } = req.body

    // Get default plan if not specified
    let targetPlanId = planId
    if (!targetPlanId) {
      const { data: defaultPlan } = await supabase
        .from('subscription_plans')
        .select('id')
        .eq('slug', 'free')
        .single()

      targetPlanId = defaultPlan?.id
    }

    // Check if tenant has a subscription to reactivate
    const { data: existingSub } = await supabase
      .from('tenant_subscriptions')
      .select('id')
      .eq('tenant_id', id)
      .single()

    if (existingSub) {
      // Update existing subscription
      await supabase
        .from('tenant_subscriptions')
        .update({
          status: 'active',
          cancelled_at: null,
          cancellation_reason: null,
          current_period_start: new Date().toISOString(),
          current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        })
        .eq('id', existingSub.id)
    } else if (targetPlanId) {
      // Create new subscription
      await supabase
        .from('tenant_subscriptions')
        .insert({
          tenant_id: id,
          plan_id: targetPlanId,
          status: 'active',
          billing_cycle: 'monthly',
          current_period_start: new Date().toISOString(),
          current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        })
    }

    // Log the action
    if (req.superAdmin) {
      await logAdminAction({
        adminId: req.superAdmin.id,
        adminEmail: req.superAdmin.email,
        action: 'tenant.activate',
        resourceType: 'tenant',
        resourceId: id,
        description: 'Reactivated tenant account',
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      })
    }

    res.json({ success: true, message: 'Tenant activated successfully' })
  } catch (error) {
    console.error('Activate tenant error:', error)
    res.status(500).json({ error: 'Failed to activate tenant' })
  }
})

/**
 * POST /api/admin/tenants/:id/pause
 * Pause a tenant - hides from public discovery but retains dashboard access
 */
router.post('/:id/pause', requirePermission('tenants'), auditLog('tenant.pause', 'tenant'), async (req: SuperAdminRequest, res: Response) => {
  try {
    const { id } = req.params
    const { reason } = req.body

    if (!reason) {
      return res.status(400).json({ error: 'Reason is required for pausing a tenant' })
    }

    // Update tenant to paused state
    const { error } = await supabase
      .from('tenants')
      .update({
        is_paused: true,
        paused_at: new Date().toISOString(),
        pause_reason: reason
      })
      .eq('id', id)

    if (error) {
      console.error('Pause tenant error:', error)
      return res.status(500).json({ error: 'Failed to pause tenant' })
    }

    // Log the action
    if (req.superAdmin) {
      await logAdminAction({
        adminId: req.superAdmin.id,
        adminEmail: req.superAdmin.email,
        action: 'tenant.pause',
        resourceType: 'tenant',
        resourceId: id,
        description: `Paused tenant: ${reason}`,
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      })
    }

    res.json({ success: true, message: 'Tenant paused successfully' })
  } catch (error) {
    console.error('Pause tenant error:', error)
    res.status(500).json({ error: 'Failed to pause tenant' })
  }
})

/**
 * POST /api/admin/tenants/:id/unpause
 * Unpause a tenant - restores public discovery visibility
 */
router.post('/:id/unpause', requirePermission('tenants'), auditLog('tenant.unpause', 'tenant'), async (req: SuperAdminRequest, res: Response) => {
  try {
    const { id } = req.params

    // Update tenant to unpaused state
    const { error } = await supabase
      .from('tenants')
      .update({
        is_paused: false,
        paused_at: null,
        pause_reason: null
      })
      .eq('id', id)

    if (error) {
      console.error('Unpause tenant error:', error)
      return res.status(500).json({ error: 'Failed to unpause tenant' })
    }

    // Log the action
    if (req.superAdmin) {
      await logAdminAction({
        adminId: req.superAdmin.id,
        adminEmail: req.superAdmin.email,
        action: 'tenant.unpause',
        resourceType: 'tenant',
        resourceId: id,
        description: 'Unpaused tenant - restored public visibility',
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      })
    }

    res.json({ success: true, message: 'Tenant unpaused successfully' })
  } catch (error) {
    console.error('Unpause tenant error:', error)
    res.status(500).json({ error: 'Failed to unpause tenant' })
  }
})

/**
 * DELETE /api/admin/tenants/:id
 * Soft delete a tenant (mark as deleted)
 */
router.delete('/:id', requirePermission('tenants'), auditLog('tenant.delete', 'tenant'), async (req: SuperAdminRequest, res: Response) => {
  try {
    const { id } = req.params

    // Soft delete - we don't actually delete data
    // Just cancel subscription and mark members as removed

    // Cancel any active subscriptions
    await supabase
      .from('tenant_subscriptions')
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        cancellation_reason: 'Account deleted by admin'
      })
      .eq('tenant_id', id)

    // Mark all members as removed
    await supabase
      .from('tenant_members')
      .update({ status: 'removed' })
      .eq('tenant_id', id)

    // Log the action
    if (req.superAdmin) {
      await logAdminAction({
        adminId: req.superAdmin.id,
        adminEmail: req.superAdmin.email,
        action: 'tenant.delete',
        resourceType: 'tenant',
        resourceId: id,
        description: 'Deleted tenant account (soft delete)',
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      })
    }

    res.json({ success: true, message: 'Tenant deleted successfully' })
  } catch (error) {
    console.error('Delete tenant error:', error)
    res.status(500).json({ error: 'Failed to delete tenant' })
  }
})

/**
 * GET /api/admin/tenants/:id/usage
 * Get tenant usage vs plan limits
 */
router.get('/:id/usage', requirePermission('tenants'), async (req: SuperAdminRequest, res: Response) => {
  try {
    const { id } = req.params

    // Get tenant's subscription and plan limits
    const { data: subscription } = await supabase
      .from('tenant_subscriptions')
      .select('*, subscription_plans(limits)')
      .eq('tenant_id', id)
      .in('status', ['active', 'trial'])
      .single()

    const limits = subscription?.subscription_plans?.limits || {
      max_rooms: 2,
      max_team_members: 1,
      max_bookings_per_month: 20
    }

    // Get current usage
    const { count: roomCount } = await supabase
      .from('rooms')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', id)

    const { count: memberCount } = await supabase
      .from('tenant_members')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', id)
      .eq('status', 'active')

    // Get bookings this month
    const monthStart = new Date()
    monthStart.setDate(1)
    monthStart.setHours(0, 0, 0, 0)

    const { count: monthlyBookings } = await supabase
      .from('bookings')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', id)
      .gte('created_at', monthStart.toISOString())

    res.json({
      rooms: {
        used: roomCount || 0,
        limit: limits.max_rooms,
        unlimited: limits.max_rooms === -1
      },
      members: {
        used: memberCount || 0,
        limit: limits.max_team_members,
        unlimited: limits.max_team_members === -1
      },
      bookings: {
        used: monthlyBookings || 0,
        limit: limits.max_bookings_per_month,
        unlimited: limits.max_bookings_per_month === -1
      }
    })
  } catch (error) {
    console.error('Get usage error:', error)
    res.status(500).json({ error: 'Failed to get usage' })
  }
})

/**
 * GET /api/admin/tenants/:id/activity
 * Get tenant activity log
 */
router.get('/:id/activity', requirePermission('tenants'), async (req: SuperAdminRequest, res: Response) => {
  try {
    const { id } = req.params
    const limit = parseInt(req.query.limit as string) || 50

    // Get recent bookings
    const { data: bookings } = await supabase
      .from('bookings')
      .select('id, status, total_amount, created_at, customer_name')
      .eq('tenant_id', id)
      .order('created_at', { ascending: false })
      .limit(limit)

    // Transform to activity items
    const activity = bookings?.map(booking => ({
      type: 'booking',
      id: booking.id,
      description: `Booking created for ${booking.customer_name || 'Guest'}`,
      status: booking.status,
      amount: booking.total_amount,
      timestamp: booking.created_at
    })) || []

    res.json(activity)
  } catch (error) {
    console.error('Get activity error:', error)
    res.status(500).json({ error: 'Failed to get activity' })
  }
})

/**
 * GET /api/admin/tenants/export
 * Export tenants as CSV
 */
router.get('/export/csv', requirePermission('tenants'), async (req: SuperAdminRequest, res: Response) => {
  try {
    const { data: tenants } = await supabase
      .from('tenants')
      .select(`
        id,
        business_name,
        business_email,
        business_phone,
        country,
        created_at,
        tenant_subscriptions (
          status,
          subscription_plans (name)
        ),
        bookings (total_amount)
      `)
      .order('created_at', { ascending: false })

    // Build CSV
    const headers = ['ID', 'Business Name', 'Email', 'Phone', 'Country', 'Plan', 'Status', 'Total Revenue', 'Created At']
    const rows = tenants?.map((t: any) => {
      const sub = t.tenant_subscriptions?.[0]
      const revenue = t.bookings?.reduce((sum: number, b: any) => sum + (Number(b.total_amount) || 0), 0) || 0
      return [
        t.id,
        t.business_name || '',
        t.business_email || '',
        t.business_phone || '',
        t.country || '',
        sub?.subscription_plans?.name || 'Free',
        sub?.status || 'none',
        revenue.toFixed(2),
        t.created_at
      ].join(',')
    }) || []

    const csv = [headers.join(','), ...rows].join('\n')

    res.setHeader('Content-Type', 'text/csv')
    res.setHeader('Content-Disposition', `attachment; filename=tenants-${new Date().toISOString().split('T')[0]}.csv`)
    res.send(csv)
  } catch (error) {
    console.error('Export tenants error:', error)
    res.status(500).json({ error: 'Failed to export tenants' })
  }
})

// ============================================
// BOOKING FORM DATA ENDPOINTS
// These endpoints provide data needed for the AdminBookingWizard
// IMPORTANT: These must be defined BEFORE /:tenantId/rooms/:roomId to avoid route conflicts
// ============================================

/**
 * GET /api/admin/tenants/:tenantId/rooms/full
 * Get all rooms with full details for booking form
 */
router.get('/:tenantId/rooms/full', requirePermission('tenants'), async (req: SuperAdminRequest, res: Response) => {
  try {
    const { tenantId } = req.params

    // Get all rooms for the tenant
    const { data: rooms, error } = await supabase
      .from('rooms')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching rooms:', error)
      return res.status(500).json({ error: 'Failed to fetch rooms' })
    }

    // Transform rooms to include primary_image_url
    const transformedRooms = (rooms || []).map((room: any) => ({
      ...room,
      primary_image_url: room.images?.featured?.url || null
    }))

    res.json(transformedRooms)
  } catch (error) {
    console.error('Get tenant rooms error:', error)
    res.status(500).json({ error: 'Failed to fetch rooms' })
  }
})

/**
 * GET /api/admin/tenants/:tenantId/addons
 * Get all addons for a tenant
 */
router.get('/:tenantId/addons', requirePermission('tenants'), async (req: SuperAdminRequest, res: Response) => {
  try {
    const { tenantId } = req.params

    const { data: addons, error } = await supabase
      .from('addons')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching addons:', error)
      return res.status(500).json({ error: 'Failed to fetch addons' })
    }

    res.json(addons || [])
  } catch (error) {
    console.error('Get tenant addons error:', error)
    res.status(500).json({ error: 'Failed to fetch addons' })
  }
})

/**
 * POST /api/admin/tenants/:tenantId/coupons/validate
 * Validate a coupon code for a tenant
 */
router.post('/:tenantId/coupons/validate', requirePermission('tenants'), async (req: SuperAdminRequest, res: Response) => {
  try {
    const { tenantId } = req.params
    const {
      code,
      room_id,
      room_ids = [],
      customer_email,
      subtotal,
      nights,
      check_in
    } = req.body

    if (!code) {
      return res.status(400).json({ valid: false, errors: ['Coupon code is required'] })
    }

    // Fetch coupon (case-insensitive)
    const { data: coupon, error } = await supabase
      .from('coupons')
      .select('*')
      .eq('tenant_id', tenantId)
      .ilike('code', code.trim())
      .single()

    if (error || !coupon) {
      return res.json({ valid: false, errors: ['Invalid coupon code'] })
    }

    // Validation checks
    const errors: string[] = []

    // 1. Check if active
    if (!coupon.is_active) {
      errors.push('This coupon is no longer active')
    }

    // 2. Check validity period
    if (coupon.valid_from && check_in && check_in < coupon.valid_from) {
      errors.push(`This coupon is valid from ${coupon.valid_from}`)
    }
    if (coupon.valid_until && check_in && check_in > coupon.valid_until) {
      errors.push('This coupon has expired')
    }

    // 3. Check room applicability
    const targetRoomIds = room_ids.length > 0 ? room_ids : (room_id ? [room_id] : [])
    if (coupon.applicable_room_ids && coupon.applicable_room_ids.length > 0 && targetRoomIds.length > 0) {
      const applicableToAny = targetRoomIds.some(
        (rid: string) => coupon.applicable_room_ids.includes(rid)
      )
      if (!applicableToAny) {
        errors.push('This coupon is not valid for the selected room(s)')
      }
    }

    // 4. Check total usage limit
    if (coupon.max_uses !== null && coupon.current_uses >= coupon.max_uses) {
      errors.push('This coupon has reached its maximum usage limit')
    }

    // 5. Check per-customer limit
    if (coupon.max_uses_per_customer !== null && customer_email) {
      const { count } = await supabase
        .from('coupon_usage')
        .select('*', { count: 'exact', head: true })
        .eq('coupon_id', coupon.id)
        .ilike('customer_email', customer_email)

      if (count !== null && count >= coupon.max_uses_per_customer) {
        errors.push('You have already used this coupon the maximum number of times')
      }
    }

    // 6. Check minimum booking amount
    if (coupon.min_booking_amount !== null && subtotal !== undefined && subtotal < coupon.min_booking_amount) {
      errors.push(`Minimum booking amount of ${coupon.min_booking_amount} required`)
    }

    // 7. Check minimum nights
    if (coupon.min_nights !== null && nights !== undefined && nights < coupon.min_nights) {
      errors.push(`Minimum stay of ${coupon.min_nights} night${coupon.min_nights > 1 ? 's' : ''} required`)
    }

    if (errors.length > 0) {
      return res.json({ valid: false, errors })
    }

    // Calculate discount amount
    let discountAmount = 0
    const effectiveSubtotal = subtotal || 0
    const effectiveNights = nights || 1

    switch (coupon.discount_type) {
      case 'percentage':
        discountAmount = (effectiveSubtotal * coupon.discount_value) / 100
        break
      case 'fixed_amount':
        discountAmount = Math.min(coupon.discount_value, effectiveSubtotal)
        break
      case 'free_nights':
        if (effectiveNights > 0) {
          const nightlyRate = effectiveSubtotal / effectiveNights
          const freeNights = Math.min(coupon.discount_value, effectiveNights)
          discountAmount = nightlyRate * freeNights
        }
        break
    }

    // Round to 2 decimal places
    discountAmount = Math.round(discountAmount * 100) / 100

    res.json({
      valid: true,
      coupon: {
        id: coupon.id,
        code: coupon.code,
        name: coupon.name,
        discount_type: coupon.discount_type,
        discount_value: coupon.discount_value
      },
      discount_amount: discountAmount
    })
  } catch (error) {
    console.error('Validate coupon error:', error)
    res.status(500).json({ error: 'Failed to validate coupon' })
  }
})

/**
 * GET /api/admin/tenants/:tenantId/rooms/:roomId/prices
 * Calculate room pricing for a date range
 */
router.get('/:tenantId/rooms/:roomId/prices', requirePermission('tenants'), async (req: SuperAdminRequest, res: Response) => {
  try {
    const { tenantId, roomId } = req.params
    const { start_date, end_date } = req.query

    if (!start_date || !end_date) {
      return res.status(400).json({ error: 'start_date and end_date are required' })
    }

    // Fetch the room
    const { data: room, error: roomError } = await supabase
      .from('rooms')
      .select('*')
      .eq('id', roomId)
      .eq('tenant_id', tenantId)
      .single()

    if (roomError) {
      if (roomError.code === 'PGRST116') {
        return res.status(404).json({ error: 'Room not found' })
      }
      return res.status(500).json({ error: 'Failed to fetch room' })
    }

    // Get all seasonal rates that overlap with the date range
    const { data: rates, error: ratesError } = await supabase
      .from('seasonal_rates')
      .select('*')
      .eq('room_id', roomId)
      .eq('tenant_id', tenantId)
      .lte('start_date', end_date as string)
      .gte('end_date', start_date as string)
      .order('priority', { ascending: false })

    if (ratesError) {
      console.error('Error fetching seasonal rates:', ratesError)
    }

    // Calculate prices for each night
    const nights: Array<{
      date: string
      base_price: number
      effective_price: number
      seasonal_rate: { id: string; name: string; price_per_night: number } | null
    }> = []

    const startDate = new Date(start_date as string)
    const endDate = new Date(end_date as string)

    const currentDate = new Date(startDate)
    let totalAmount = 0

    while (currentDate < endDate) {
      const dateStr = currentDate.toISOString().split('T')[0]

      // Find applicable seasonal rate (highest priority that includes this date)
      const applicableRate = (rates || []).find(rate => {
        const rateStart = new Date(rate.start_date)
        const rateEnd = new Date(rate.end_date)
        return currentDate >= rateStart && currentDate <= rateEnd
      })

      const effectivePrice = applicableRate ? applicableRate.price_per_night : room.base_price_per_night
      totalAmount += effectivePrice

      nights.push({
        date: dateStr,
        base_price: room.base_price_per_night,
        effective_price: effectivePrice,
        seasonal_rate: applicableRate ? {
          id: applicableRate.id,
          name: applicableRate.name,
          price_per_night: applicableRate.price_per_night
        } : null
      })

      currentDate.setDate(currentDate.getDate() + 1)
    }

    res.json({
      room_id: roomId,
      start_date,
      end_date,
      nights,
      total_nights: nights.length,
      total_amount: totalAmount,
      currency: room.currency || 'ZAR'
    })
  } catch (error) {
    console.error('Get room prices error:', error)
    res.status(500).json({ error: 'Failed to calculate prices' })
  }
})

// ============================================
// END BOOKING FORM DATA ENDPOINTS
// ============================================

/**
 * GET /api/admin/tenants/:tenantId/rooms/:roomId
 * Get a single room for a tenant (full data for editing)
 */
router.get('/:tenantId/rooms/:roomId', requirePermission('tenants'), async (req: SuperAdminRequest, res: Response) => {
  try {
    const { tenantId, roomId } = req.params

    const { data: room, error } = await supabase
      .from('rooms')
      .select('*')
      .eq('id', roomId)
      .eq('tenant_id', tenantId)
      .single()

    if (error || !room) {
      return res.status(404).json({ error: 'Room not found' })
    }

    // Return all fields matching RoomFormData structure
    res.json({
      id: room.id,
      tenantId: room.tenant_id,
      // Basic Info
      name: room.name || '',
      description: room.description || '',
      roomCode: room.room_code || '',
      roomSizeSqm: room.room_size_sqm || null,
      // Beds
      beds: room.beds || [],
      // Capacity
      maxGuests: room.max_guests || 2,
      maxAdults: room.max_adults || null,
      maxChildren: room.max_children || null,
      // Amenities
      amenities: room.amenities || [],
      extraOptions: room.extra_options || [],
      // Images (stored as JSONB { featured, gallery })
      images: {
        featured: room.images?.featured || null,
        gallery: room.images?.gallery || []
      },
      // Pricing
      pricingMode: room.pricing_mode || 'per_unit',
      basePricePerNight: room.base_price_per_night || 0,
      additionalPersonRate: room.additional_person_rate || null,
      currency: room.currency || 'ZAR',
      // Children Pricing
      childPricePerNight: room.child_price_per_night || null,
      childFreeUntilAge: room.child_free_until_age || null,
      childAgeLimit: room.child_age_limit || 12,
      // Stay Rules
      minStayNights: room.min_stay_nights || 1,
      maxStayNights: room.max_stay_nights || null,
      checkInTime: room.check_in_time || '14:00',
      checkOutTime: room.check_out_time || '10:00',
      // Inventory
      inventoryMode: room.inventory_mode || 'single_unit',
      totalUnits: room.total_units || 1,
      isActive: room.is_active ?? true,
      // Timestamps
      createdAt: room.created_at,
      updatedAt: room.updated_at
    })
  } catch (error) {
    console.error('Get room error:', error)
    res.status(500).json({ error: 'Failed to get room' })
  }
})

/**
 * PATCH /api/admin/tenants/:tenantId/rooms/:roomId
 * Update a room for a tenant (full update for admin wizard)
 */
router.patch('/:tenantId/rooms/:roomId', requirePermission('tenants'), auditLog('room.update', 'room'), async (req: SuperAdminRequest, res: Response) => {
  try {
    const { tenantId, roomId } = req.params
    const updates = req.body

    // Convert featured_image/gallery_images to images JSONB structure
    if (updates.featured_image !== undefined || updates.gallery_images !== undefined) {
      updates.images = {
        featured: updates.featured_image ?? null,
        gallery: updates.gallery_images ?? []
      }
      delete updates.featured_image
      delete updates.gallery_images
    }

    // All fields that can be updated (matching RoomFormData)
    const allowedFields = [
      // Basic Info
      'name',
      'description',
      'room_code',
      'room_size_sqm',
      // Beds
      'beds',
      // Capacity
      'max_guests',
      'max_adults',
      'max_children',
      // Amenities
      'amenities',
      'extra_options',
      // Images (stored as JSONB)
      'images',
      // Pricing
      'pricing_mode',
      'base_price_per_night',
      'additional_person_rate',
      'currency',
      // Children Pricing
      'child_price_per_night',
      'child_free_until_age',
      'child_age_limit',
      // Stay Rules
      'min_stay_nights',
      'max_stay_nights',
      'check_in_time',
      'check_out_time',
      // Inventory
      'inventory_mode',
      'total_units',
      'is_active'
    ]

    // Filter to only allowed fields
    const filteredUpdates: Record<string, any> = {}
    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        filteredUpdates[field] = updates[field]
      }
    }

    if (Object.keys(filteredUpdates).length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' })
    }

    // Add updated_at timestamp
    filteredUpdates.updated_at = new Date().toISOString()

    // Update room
    const { data: room, error } = await supabase
      .from('rooms')
      .update(filteredUpdates)
      .eq('id', roomId)
      .eq('tenant_id', tenantId)
      .select()
      .single()

    if (error) {
      console.error('Update room error:', error)
      return res.status(500).json({ error: 'Failed to update room', details: error.message })
    }

    if (!room) {
      return res.status(404).json({ error: 'Room not found' })
    }

    // Log the action
    if (req.superAdmin) {
      await logAdminAction({
        adminId: req.superAdmin.id,
        adminEmail: req.superAdmin.email,
        action: 'room.update',
        resourceType: 'room',
        resourceId: roomId,
        description: `Updated room "${room.name}" for tenant ${tenantId}`,
        metadata: { tenantId, updatedFields: Object.keys(filteredUpdates) },
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      })
    }

    res.json({
      success: true,
      message: 'Room updated successfully',
      room: {
        id: room.id,
        tenantId: room.tenant_id,
        name: room.name || '',
        description: room.description || '',
        roomCode: room.room_code || '',
        roomSizeSqm: room.room_size_sqm || null,
        beds: room.beds || [],
        maxGuests: room.max_guests || 2,
        maxAdults: room.max_adults || null,
        maxChildren: room.max_children || null,
        amenities: room.amenities || [],
        extraOptions: room.extra_options || [],
        images: {
          featured: room.images?.featured || null,
          gallery: room.images?.gallery || []
        },
        pricingMode: room.pricing_mode || 'per_unit',
        basePricePerNight: room.base_price_per_night || 0,
        additionalPersonRate: room.additional_person_rate || null,
        currency: room.currency || 'ZAR',
        childPricePerNight: room.child_price_per_night || null,
        childFreeUntilAge: room.child_free_until_age || null,
        childAgeLimit: room.child_age_limit || 12,
        minStayNights: room.min_stay_nights || 1,
        maxStayNights: room.max_stay_nights || null,
        checkInTime: room.check_in_time || '14:00',
        checkOutTime: room.check_out_time || '10:00',
        inventoryMode: room.inventory_mode || 'single_unit',
        totalUnits: room.total_units || 1,
        isActive: room.is_active ?? true
      }
    })
  } catch (error) {
    console.error('Update room error:', error)
    res.status(500).json({ error: 'Failed to update room' })
  }
})

/**
 * GET /api/admin/tenants/:tenantId/rooms/:roomId/rates
 * Get seasonal rates for a room
 */
router.get('/:tenantId/rooms/:roomId/rates', requirePermission('tenants'), async (req: SuperAdminRequest, res: Response) => {
  try {
    const { tenantId, roomId } = req.params

    // Verify room belongs to tenant
    const { data: room, error: roomError } = await supabase
      .from('rooms')
      .select('id')
      .eq('id', roomId)
      .eq('tenant_id', tenantId)
      .single()

    if (roomError || !room) {
      return res.status(404).json({ error: 'Room not found' })
    }

    const { data: rates, error } = await supabase
      .from('seasonal_rates')
      .select('*')
      .eq('room_id', roomId)
      .order('priority', { ascending: false })
      .order('start_date', { ascending: true })

    if (error) {
      console.error('Get rates error:', error)
      return res.status(500).json({ error: 'Failed to get rates' })
    }

    // Convert snake_case to camelCase for frontend
    const formattedRates = (rates || []).map(rate => ({
      id: rate.id,
      roomId: rate.room_id,
      name: rate.name,
      startDate: rate.start_date,
      endDate: rate.end_date,
      pricePerNight: rate.price_per_night,
      additionalPersonRate: rate.additional_person_rate || null,
      childPricePerNight: rate.child_price_per_night || null,
      minNights: rate.min_nights || null,
      priority: rate.priority || 0,
      isActive: rate.is_active ?? true,
      createdAt: rate.created_at,
      updatedAt: rate.updated_at
    }))

    res.json(formattedRates)
  } catch (error) {
    console.error('Get rates error:', error)
    res.status(500).json({ error: 'Failed to get rates' })
  }
})

/**
 * POST /api/admin/tenants/:tenantId/rooms/:roomId/rates
 * Create a seasonal rate for a room
 */
router.post('/:tenantId/rooms/:roomId/rates', requirePermission('tenants'), auditLog('rate.create', 'seasonal_rate'), async (req: SuperAdminRequest, res: Response) => {
  try {
    const { tenantId, roomId } = req.params
    const { name, start_date, end_date, price_per_night, priority } = req.body

    // Verify room belongs to tenant
    const { data: room, error: roomError } = await supabase
      .from('rooms')
      .select('id')
      .eq('id', roomId)
      .eq('tenant_id', tenantId)
      .single()

    if (roomError || !room) {
      return res.status(404).json({ error: 'Room not found' })
    }

    const { data: rate, error } = await supabase
      .from('seasonal_rates')
      .insert({
        room_id: roomId,
        name,
        start_date,
        end_date,
        price_per_night,
        priority: priority || 0
      })
      .select()
      .single()

    if (error) {
      console.error('Create rate error:', error)
      return res.status(500).json({ error: 'Failed to create rate', details: error.message })
    }

    // Log the action
    if (req.superAdmin) {
      await logAdminAction({
        adminId: req.superAdmin.id,
        adminEmail: req.superAdmin.email,
        action: 'rate.create',
        resourceType: 'seasonal_rate',
        resourceId: rate.id,
        description: `Created seasonal rate "${name}" for room ${roomId}`,
        metadata: { tenantId, roomId },
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      })
    }

    // Convert to camelCase for frontend
    res.json({
      rate: {
        id: rate.id,
        roomId: rate.room_id,
        name: rate.name,
        startDate: rate.start_date,
        endDate: rate.end_date,
        pricePerNight: rate.price_per_night,
        additionalPersonRate: rate.additional_person_rate || null,
        childPricePerNight: rate.child_price_per_night || null,
        minNights: rate.min_nights || null,
        priority: rate.priority || 0,
        isActive: rate.is_active ?? true,
        createdAt: rate.created_at,
        updatedAt: rate.updated_at
      }
    })
  } catch (error) {
    console.error('Create rate error:', error)
    res.status(500).json({ error: 'Failed to create rate' })
  }
})

/**
 * PATCH /api/admin/tenants/:tenantId/rooms/:roomId/rates/:rateId
 * Update a seasonal rate
 */
router.patch('/:tenantId/rooms/:roomId/rates/:rateId', requirePermission('tenants'), auditLog('rate.update', 'seasonal_rate'), async (req: SuperAdminRequest, res: Response) => {
  try {
    const { tenantId, roomId, rateId } = req.params
    const { name, start_date, end_date, price_per_night, priority } = req.body

    // Verify room belongs to tenant
    const { data: room, error: roomError } = await supabase
      .from('rooms')
      .select('id')
      .eq('id', roomId)
      .eq('tenant_id', tenantId)
      .single()

    if (roomError || !room) {
      return res.status(404).json({ error: 'Room not found' })
    }

    const updates: Record<string, any> = {}
    if (name !== undefined) updates.name = name
    if (start_date !== undefined) updates.start_date = start_date
    if (end_date !== undefined) updates.end_date = end_date
    if (price_per_night !== undefined) updates.price_per_night = price_per_night
    if (priority !== undefined) updates.priority = priority
    updates.updated_at = new Date().toISOString()

    const { data: rate, error } = await supabase
      .from('seasonal_rates')
      .update(updates)
      .eq('id', rateId)
      .eq('room_id', roomId)
      .select()
      .single()

    if (error) {
      console.error('Update rate error:', error)
      return res.status(500).json({ error: 'Failed to update rate', details: error.message })
    }

    if (!rate) {
      return res.status(404).json({ error: 'Rate not found' })
    }

    // Log the action
    if (req.superAdmin) {
      await logAdminAction({
        adminId: req.superAdmin.id,
        adminEmail: req.superAdmin.email,
        action: 'rate.update',
        resourceType: 'seasonal_rate',
        resourceId: rateId,
        description: `Updated seasonal rate "${rate.name}" for room ${roomId}`,
        metadata: { tenantId, roomId },
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      })
    }

    // Convert to camelCase for frontend
    res.json({
      rate: {
        id: rate.id,
        roomId: rate.room_id,
        name: rate.name,
        startDate: rate.start_date,
        endDate: rate.end_date,
        pricePerNight: rate.price_per_night,
        additionalPersonRate: rate.additional_person_rate || null,
        childPricePerNight: rate.child_price_per_night || null,
        minNights: rate.min_nights || null,
        priority: rate.priority || 0,
        isActive: rate.is_active ?? true,
        createdAt: rate.created_at,
        updatedAt: rate.updated_at
      }
    })
  } catch (error) {
    console.error('Update rate error:', error)
    res.status(500).json({ error: 'Failed to update rate' })
  }
})

/**
 * DELETE /api/admin/tenants/:tenantId/rooms/:roomId/rates/:rateId
 * Delete a seasonal rate
 */
router.delete('/:tenantId/rooms/:roomId/rates/:rateId', requirePermission('tenants'), auditLog('rate.delete', 'seasonal_rate'), async (req: SuperAdminRequest, res: Response) => {
  try {
    const { tenantId, roomId, rateId } = req.params

    // Verify room belongs to tenant
    const { data: room, error: roomError } = await supabase
      .from('rooms')
      .select('id')
      .eq('id', roomId)
      .eq('tenant_id', tenantId)
      .single()

    if (roomError || !room) {
      return res.status(404).json({ error: 'Room not found' })
    }

    const { error } = await supabase
      .from('seasonal_rates')
      .delete()
      .eq('id', rateId)
      .eq('room_id', roomId)

    if (error) {
      console.error('Delete rate error:', error)
      return res.status(500).json({ error: 'Failed to delete rate', details: error.message })
    }

    // Log the action
    if (req.superAdmin) {
      await logAdminAction({
        adminId: req.superAdmin.id,
        adminEmail: req.superAdmin.email,
        action: 'rate.delete',
        resourceType: 'seasonal_rate',
        resourceId: rateId,
        description: `Deleted seasonal rate for room ${roomId}`,
        metadata: { tenantId, roomId },
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      })
    }

    res.json({ success: true, message: 'Rate deleted successfully' })
  } catch (error) {
    console.error('Delete rate error:', error)
    res.status(500).json({ error: 'Failed to delete rate' })
  }
})

/**
 * POST /api/admin/tenants/:tenantId/rooms/:roomId/pause
 * Pause or unpause a room
 */
router.post('/:tenantId/rooms/:roomId/pause', requirePermission('tenants'), auditLog('room.pause', 'room'), async (req: SuperAdminRequest, res: Response) => {
  try {
    const { tenantId, roomId } = req.params
    const { paused, reason } = req.body

    // Verify room belongs to tenant
    const { data: room, error: roomError } = await supabase
      .from('rooms')
      .select('id, name, is_paused')
      .eq('id', roomId)
      .eq('tenant_id', tenantId)
      .single()

    if (roomError || !room) {
      return res.status(404).json({ error: 'Room not found' })
    }

    const isPausing = paused !== false // Default to pause if not specified

    const updateData: Record<string, any> = {
      is_paused: isPausing,
      paused_at: isPausing ? new Date().toISOString() : null,
      pause_reason: isPausing ? (reason || null) : null
    }

    const { error } = await supabase
      .from('rooms')
      .update(updateData)
      .eq('id', roomId)

    if (error) {
      console.error('Pause room error:', error)
      return res.status(500).json({ error: 'Failed to update room', details: error.message })
    }

    // Log the action
    if (req.superAdmin) {
      await logAdminAction({
        adminId: req.superAdmin.id,
        adminEmail: req.superAdmin.email,
        action: isPausing ? 'room.pause' : 'room.unpause',
        resourceType: 'room',
        resourceId: roomId,
        description: isPausing ? `Paused room "${room.name}"` : `Unpaused room "${room.name}"`,
        metadata: { tenantId, reason: reason || null },
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      })
    }

    res.json({
      success: true,
      message: isPausing ? 'Room paused successfully' : 'Room unpaused successfully',
      isPaused: isPausing
    })
  } catch (error) {
    console.error('Pause room error:', error)
    res.status(500).json({ error: 'Failed to pause room' })
  }
})

/**
 * DELETE /api/admin/tenants/:tenantId/rooms/:roomId
 * Soft delete a room (sets is_active = false)
 */
router.delete('/:tenantId/rooms/:roomId', requirePermission('tenants'), auditLog('room.delete', 'room'), async (req: SuperAdminRequest, res: Response) => {
  try {
    const { tenantId, roomId } = req.params

    // Verify room belongs to tenant
    const { data: room, error: roomError } = await supabase
      .from('rooms')
      .select('id, name')
      .eq('id', roomId)
      .eq('tenant_id', tenantId)
      .single()

    if (roomError || !room) {
      return res.status(404).json({ error: 'Room not found' })
    }

    // Soft delete by setting is_active = false
    const { error } = await supabase
      .from('rooms')
      .update({ is_active: false })
      .eq('id', roomId)

    if (error) {
      console.error('Delete room error:', error)
      return res.status(500).json({ error: 'Failed to delete room', details: error.message })
    }

    // Log the action
    if (req.superAdmin) {
      await logAdminAction({
        adminId: req.superAdmin.id,
        adminEmail: req.superAdmin.email,
        action: 'room.delete',
        resourceType: 'room',
        resourceId: roomId,
        description: `Deleted room "${room.name}"`,
        metadata: { tenantId },
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      })
    }

    res.json({ success: true, message: 'Room deleted successfully' })
  } catch (error) {
    console.error('Delete room error:', error)
    res.status(500).json({ error: 'Failed to delete room' })
  }
})

/**
 * POST /api/admin/tenants/:tenantId/rooms
 * Create a new room for a tenant
 */
router.post('/:tenantId/rooms', requirePermission('tenants'), auditLog('room.create', 'room'), async (req: SuperAdminRequest, res: Response) => {
  try {
    const { tenantId } = req.params
    const { name, description, base_price_per_night, max_guests, currency } = req.body

    if (!name || base_price_per_night === undefined) {
      return res.status(400).json({ error: 'Name and base price are required' })
    }

    // Verify tenant exists
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select('id, currency')
      .eq('id', tenantId)
      .single()

    if (tenantError || !tenant) {
      return res.status(404).json({ error: 'Tenant not found' })
    }

    // Create the room with basic fields
    const { data: newRoom, error: insertError } = await supabase
      .from('rooms')
      .insert({
        tenant_id: tenantId,
        name,
        description: description || null,
        base_price_per_night: Number(base_price_per_night),
        max_guests: max_guests || 2,
        currency: currency || tenant.currency || 'ZAR',
        is_active: true,
        is_paused: false,
        pricing_mode: 'per_unit',
        inventory_mode: 'single_unit',
        total_units: 1,
        min_stay_nights: 1
      })
      .select('id, name, room_code, is_active, is_paused')
      .single()

    if (insertError) {
      console.error('Create room error:', insertError)
      return res.status(500).json({ error: 'Failed to create room', details: insertError.message })
    }

    // Log the action
    if (req.superAdmin) {
      await logAdminAction({
        adminId: req.superAdmin.id,
        adminEmail: req.superAdmin.email,
        action: 'room.create',
        resourceType: 'room',
        resourceId: newRoom.id,
        description: `Created room "${name}" for tenant`,
        metadata: { tenantId, base_price_per_night, max_guests },
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      })
    }

    res.status(201).json({
      success: true,
      message: 'Room created successfully',
      room: {
        id: newRoom.id,
        name: newRoom.name,
        roomCode: newRoom.room_code,
        status: newRoom.is_active ? 'active' : 'inactive',
        isPaused: newRoom.is_paused || false
      }
    })
  } catch (error) {
    console.error('Create room error:', error)
    res.status(500).json({ error: 'Failed to create room' })
  }
})

/**
 * POST /api/admin/tenants/:tenantId/members/:memberId/suspend
 * Suspend or unsuspend a team member
 */
router.post('/:tenantId/members/:memberId/suspend', requirePermission('tenants'), auditLog('member.suspend', 'tenant_member'), async (req: SuperAdminRequest, res: Response) => {
  try {
    const { tenantId, memberId } = req.params
    const { suspended } = req.body

    // Verify member belongs to tenant
    const { data: member, error: memberError } = await supabase
      .from('tenant_members')
      .select('id, email, member_name, status, roles!inner(slug)')
      .eq('id', memberId)
      .eq('tenant_id', tenantId)
      .single()

    if (memberError || !member) {
      return res.status(404).json({ error: 'Team member not found' })
    }

    // Don't allow suspending the owner
    if ((member.roles as any)?.slug === 'owner') {
      return res.status(400).json({ error: 'Cannot suspend the owner' })
    }

    const isSuspending = suspended !== false // Default to suspend if not specified
    const newStatus = isSuspending ? 'suspended' : 'active'

    const { error } = await supabase
      .from('tenant_members')
      .update({ status: newStatus })
      .eq('id', memberId)

    if (error) {
      console.error('Suspend member error:', error)
      return res.status(500).json({ error: 'Failed to update member', details: error.message })
    }

    // Log the action
    if (req.superAdmin) {
      await logAdminAction({
        adminId: req.superAdmin.id,
        adminEmail: req.superAdmin.email,
        action: isSuspending ? 'member.suspend' : 'member.unsuspend',
        resourceType: 'tenant_member',
        resourceId: memberId,
        description: isSuspending
          ? `Suspended team member "${member.member_name || member.email}"`
          : `Unsuspended team member "${member.member_name || member.email}"`,
        metadata: { tenantId },
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      })
    }

    res.json({
      success: true,
      message: isSuspending ? 'Member suspended successfully' : 'Member unsuspended successfully',
      status: newStatus
    })
  } catch (error) {
    console.error('Suspend member error:', error)
    res.status(500).json({ error: 'Failed to suspend member' })
  }
})

/**
 * DELETE /api/admin/tenants/:tenantId/members/:memberId
 * Remove a team member (soft delete by setting status to 'removed')
 */
router.delete('/:tenantId/members/:memberId', requirePermission('tenants'), auditLog('member.delete', 'tenant_member'), async (req: SuperAdminRequest, res: Response) => {
  try {
    const { tenantId, memberId } = req.params

    // Verify member belongs to tenant
    const { data: member, error: memberError } = await supabase
      .from('tenant_members')
      .select('id, email, member_name, roles!inner(slug)')
      .eq('id', memberId)
      .eq('tenant_id', tenantId)
      .single()

    if (memberError || !member) {
      return res.status(404).json({ error: 'Team member not found' })
    }

    // Don't allow removing the owner
    if ((member.roles as any)?.slug === 'owner') {
      return res.status(400).json({ error: 'Cannot remove the owner' })
    }

    // Soft delete by setting status to 'removed'
    const { error } = await supabase
      .from('tenant_members')
      .update({ status: 'removed' })
      .eq('id', memberId)

    if (error) {
      console.error('Delete member error:', error)
      return res.status(500).json({ error: 'Failed to remove member', details: error.message })
    }

    // Log the action
    if (req.superAdmin) {
      await logAdminAction({
        adminId: req.superAdmin.id,
        adminEmail: req.superAdmin.email,
        action: 'member.delete',
        resourceType: 'tenant_member',
        resourceId: memberId,
        description: `Removed team member "${member.member_name || member.email}"`,
        metadata: { tenantId },
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      })
    }

    res.json({ success: true, message: 'Member removed successfully' })
  } catch (error) {
    console.error('Delete member error:', error)
    res.status(500).json({ error: 'Failed to remove member' })
  }
})

/**
 * POST /api/admin/tenants/:tenantId/members
 * Add a new team member to a tenant
 */
router.post('/:tenantId/members', requirePermission('tenants'), auditLog('member.add', 'tenant_member'), async (req: SuperAdminRequest, res: Response) => {
  try {
    const { tenantId } = req.params
    const { email, name, role_id, phone, avatar } = req.body

    if (!email || !name || !role_id) {
      return res.status(400).json({ error: 'Email, name, and role are required' })
    }

    // Verify tenant exists
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select('id')
      .eq('id', tenantId)
      .single()

    if (tenantError || !tenant) {
      return res.status(404).json({ error: 'Tenant not found' })
    }

    // Verify role exists
    const { data: role, error: roleError } = await supabase
      .from('roles')
      .select('id, name, slug')
      .eq('id', role_id)
      .single()

    if (roleError || !role) {
      return res.status(400).json({ error: 'Invalid role' })
    }

    // Check if member already exists for this tenant
    const { data: existingMember } = await supabase
      .from('tenant_members')
      .select('id')
      .eq('tenant_id', tenantId)
      .ilike('email', email)
      .single()

    if (existingMember) {
      return res.status(400).json({ error: 'A member with this email already exists' })
    }

    // Handle avatar upload if provided
    let avatarUrl: string | null = null
    if (avatar) {
      const matches = avatar.match(/^data:image\/(\w+);base64,(.+)$/)
      if (matches) {
        const mimeType = `image/${matches[1]}`
        const base64Data = matches[2]
        const buffer = Buffer.from(base64Data, 'base64')

        // Validate file size (max 5MB)
        if (buffer.length <= 5 * 1024 * 1024) {
          const ext = matches[1] === 'jpeg' ? 'jpg' : matches[1]
          const memberId = crypto.randomUUID()
          const fileName = `team-avatars/${tenantId}/${memberId}/avatar-${Date.now()}.${ext}`

          const { error: uploadError } = await supabase.storage
            .from('tenant-assets')
            .upload(fileName, buffer, {
              contentType: mimeType,
              upsert: true
            })

          if (!uploadError) {
            const { data: urlData } = supabase.storage
              .from('tenant-assets')
              .getPublicUrl(fileName)
            avatarUrl = urlData.publicUrl
          }
        }
      }
    }

    // Create the member
    const { data: newMember, error: insertError } = await supabase
      .from('tenant_members')
      .insert({
        tenant_id: tenantId,
        email: email.toLowerCase(),
        member_name: name,
        role_id: role_id,
        phone: phone || null,
        avatar_url: avatarUrl,
        status: 'pending',
        invited_at: new Date().toISOString()
      })
      .select('id, email, member_name, phone, avatar_url, status, role_id, created_at')
      .single()

    if (insertError) {
      console.error('Add member error:', insertError)
      return res.status(500).json({ error: 'Failed to add member', details: insertError.message })
    }

    // Log the action
    if (req.superAdmin) {
      await logAdminAction({
        adminId: req.superAdmin.id,
        adminEmail: req.superAdmin.email,
        action: 'member.add',
        resourceType: 'tenant_member',
        resourceId: newMember.id,
        description: `Added team member "${name}" (${email}) with role "${role.name}"`,
        metadata: { tenantId, role: role.slug },
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      })
    }

    res.status(201).json({
      success: true,
      message: 'Team member added successfully',
      member: {
        ...newMember,
        roles: role
      }
    })
  } catch (error) {
    console.error('Add member error:', error)
    res.status(500).json({ error: 'Failed to add member' })
  }
})

/**
 * GET /api/admin/tenants/:tenantId/roles
 * Get available roles for a tenant
 */
router.get('/:tenantId/roles', requirePermission('tenants'), async (req: SuperAdminRequest, res: Response) => {
  try {
    const { tenantId } = req.params

    const { data: roles, error } = await supabase
      .from('roles')
      .select('id, name, slug')
      .eq('tenant_id', tenantId) // Filter by tenant - each tenant has their own roles
      .neq('slug', 'owner') // Don't include owner role for adding new members
      .order('name')

    if (error) {
      console.error('Get roles error:', error)
      return res.status(500).json({ error: 'Failed to fetch roles' })
    }

    res.json({ roles: roles || [] })
  } catch (error) {
    console.error('Get roles error:', error)
    res.status(500).json({ error: 'Failed to fetch roles' })
  }
})

/**
 * GET /api/admin/tenants/:id/customers
 * Get all customers for a tenant (derived from bookings)
 */
router.get('/:id/customers', requirePermission('tenants'), async (req: SuperAdminRequest, res: Response) => {
  try {
    const { id } = req.params
    const search = req.query.search as string

    // Get all bookings for this tenant to derive customers
    let query = supabase
      .from('bookings')
      .select('guest_email, guest_name, guest_phone, total_amount, check_in, created_at, customer_id')
      .eq('tenant_id', id)
      .order('created_at', { ascending: false })

    const { data: bookings, error } = await query

    if (error) {
      console.error('Get customers error:', error)
      return res.status(500).json({ error: 'Failed to fetch customers' })
    }

    // Get customer IDs to fetch profile pictures
    const customerIds = [...new Set((bookings || []).map(b => b.customer_id).filter(Boolean))]

    // Fetch customer profile pictures
    const customerProfiles = new Map<string, string>()
    if (customerIds.length > 0) {
      const { data: customers } = await supabase
        .from('customers')
        .select('id, profile_picture_url')
        .in('id', customerIds)

      for (const c of customers || []) {
        if (c.profile_picture_url) {
          customerProfiles.set(c.id, c.profile_picture_url)
        }
      }
    }

    // Aggregate by email to get unique customers
    const customerMap = new Map<string, any>()

    for (const booking of bookings || []) {
      const email = booking.guest_email?.toLowerCase()
      if (!email) continue

      if (!customerMap.has(email)) {
        customerMap.set(email, {
          id: booking.customer_id || email,
          email: booking.guest_email,
          name: booking.guest_name,
          phone: booking.guest_phone,
          avatar: booking.customer_id ? customerProfiles.get(booking.customer_id) || null : null,
          bookingCount: 0,
          totalSpent: 0,
          firstStay: booking.check_in,
          lastStay: booking.check_in,
          hasPortalAccess: !!booking.customer_id
        })
      }

      const customer = customerMap.get(email)
      customer.bookingCount++
      customer.totalSpent += Number(booking.total_amount) || 0
      if (booking.check_in && (!customer.lastStay || booking.check_in > customer.lastStay)) {
        customer.lastStay = booking.check_in
      }
      if (booking.check_in && (!customer.firstStay || booking.check_in < customer.firstStay)) {
        customer.firstStay = booking.check_in
      }
    }

    let customers = Array.from(customerMap.values())

    // Apply search filter
    if (search) {
      const searchLower = search.toLowerCase()
      customers = customers.filter(c =>
        c.email?.toLowerCase().includes(searchLower) ||
        c.name?.toLowerCase().includes(searchLower) ||
        c.phone?.includes(search)
      )
    }

    // Sort by last stay date
    customers.sort((a, b) => {
      if (!a.lastStay) return 1
      if (!b.lastStay) return -1
      return new Date(b.lastStay).getTime() - new Date(a.lastStay).getTime()
    })

    res.json(customers)
  } catch (error) {
    console.error('Get customers error:', error)
    res.status(500).json({ error: 'Failed to fetch customers' })
  }
})

/**
 * GET /api/admin/tenants/:id/reviews
 * Get all reviews for a tenant
 */
router.get('/:id/reviews', requirePermission('tenants'), async (req: SuperAdminRequest, res: Response) => {
  try {
    const { id } = req.params
    const status = req.query.status as string

    let query = supabase
      .from('reviews')
      .select(`
        id,
        rating,
        title,
        comment,
        status,
        source,
        created_at,
        bookings (
          guest_name,
          rooms (name)
        )
      `)
      .eq('tenant_id', id)
      .order('created_at', { ascending: false })

    if (status && status !== 'all') {
      query = query.eq('status', status)
    }

    const { data: reviews, error } = await query

    if (error) {
      console.error('Get reviews error:', error)
      return res.status(500).json({ error: 'Failed to fetch reviews' })
    }

    // Transform to flatten booking data
    const transformedReviews = (reviews || []).map((r: any) => ({
      id: r.id,
      rating: r.rating,
      title: r.title,
      comment: r.comment,
      status: r.status,
      source: r.source,
      created_at: r.created_at,
      guest_name: r.bookings?.guest_name || null,
      room_name: r.bookings?.rooms?.name || null
    }))

    res.json(transformedReviews)
  } catch (error) {
    console.error('Get reviews error:', error)
    res.status(500).json({ error: 'Failed to fetch reviews' })
  }
})

/**
 * GET /api/admin/tenants/:id/refunds
 * Get all refunds for a tenant
 */
router.get('/:id/refunds', requirePermission('tenants'), async (req: SuperAdminRequest, res: Response) => {
  try {
    const { id } = req.params
    const status = req.query.status as string

    let query = supabase
      .from('refunds')
      .select(`
        id,
        booking_id,
        original_amount,
        eligible_amount,
        approved_amount,
        status,
        currency,
        requested_at,
        bookings (
          guest_name
        )
      `)
      .eq('tenant_id', id)
      .order('requested_at', { ascending: false })

    if (status && status !== 'all') {
      query = query.eq('status', status)
    }

    const { data: refunds, error } = await query

    if (error) {
      console.error('Get refunds error:', error)
      return res.status(500).json({ error: 'Failed to fetch refunds' })
    }

    // Transform to flatten booking data
    const transformedRefunds = (refunds || []).map((r: any) => ({
      id: r.id,
      booking_id: r.booking_id,
      original_amount: r.original_amount,
      eligible_amount: r.eligible_amount,
      approved_amount: r.approved_amount,
      status: r.status,
      currency: r.currency || 'ZAR',
      requested_at: r.requested_at,
      guest_name: r.bookings?.guest_name || null
    }))

    res.json(transformedRefunds)
  } catch (error) {
    console.error('Get refunds error:', error)
    res.status(500).json({ error: 'Failed to fetch refunds' })
  }
})

/**
 * GET /api/admin/tenants/:tenantId/bookings/:bookingId
 * Get a single booking for editing
 */
router.get('/:tenantId/bookings/:bookingId', requirePermission('tenants'), async (req: SuperAdminRequest, res: Response) => {
  try {
    const { tenantId, bookingId } = req.params
    console.log(`[Admin] Fetching booking ${bookingId} for tenant ${tenantId}`)

    const { data: booking, error } = await supabase
      .from('bookings')
      .select('*')
      .eq('id', bookingId)
      .eq('tenant_id', tenantId)
      .single()

    if (error) {
      console.error('Get booking error:', error)
      return res.status(404).json({ error: 'Booking not found' })
    }

    console.log(`[Admin] Found booking:`, booking?.id, booking?.guest_name)

    // Fetch room image if room_id exists
    // Images are stored in JSONB 'images' column: { featured: { url: string } | null, gallery: { url: string }[] }
    let room_image = null
    if (booking.room_id) {
      const { data: room } = await supabase
        .from('rooms')
        .select('images')
        .eq('id', booking.room_id)
        .single()
      room_image = (room?.images as any)?.featured?.url || null
    }

    res.json({
      ...booking,
      room_image
    })
  } catch (error) {
    console.error('Get booking error:', error)
    res.status(500).json({ error: 'Failed to fetch booking' })
  }
})

/**
 * POST /api/admin/tenants/:tenantId/bookings
 * Create a new booking for a tenant
 */
router.post('/:tenantId/bookings', requirePermission('tenants'), async (req: SuperAdminRequest, res: Response) => {
  try {
    const { tenantId } = req.params
    const {
      room_id,
      guest_name,
      guest_email,
      guest_phone,
      check_in,
      check_out,
      adults,
      children,
      total_amount,
      status,
      notes
    } = req.body

    // Get room details
    const { data: room, error: roomError } = await supabase
      .from('rooms')
      .select('name, currency')
      .eq('id', room_id)
      .eq('tenant_id', tenantId)
      .single()

    if (roomError || !room) {
      return res.status(400).json({ error: 'Room not found' })
    }

    // Create the booking
    const { data: booking, error } = await supabase
      .from('bookings')
      .insert({
        tenant_id: tenantId,
        room_id,
        room_name: room.name,
        guest_name,
        guest_email,
        guest_phone,
        check_in,
        check_out,
        adults: adults || 1,
        children: children || 0,
        total_amount: total_amount || 0,
        currency: room.currency || 'ZAR',
        status: status || 'confirmed',
        payment_status: 'pending',
        notes,
        source: 'admin'
      })
      .select()
      .single()

    if (error) {
      console.error('Create booking error:', error)
      return res.status(500).json({ error: 'Failed to create booking' })
    }

    // Log admin action
    if (req.superAdmin) {
      await logAdminAction({
        adminId: req.superAdmin.id,
        adminEmail: req.superAdmin.email,
        action: 'booking.create',
        resourceType: 'booking',
        resourceId: booking.id,
        metadata: {
          tenantId,
          guestName: guest_name,
          roomName: room.name
        }
      })
    }

    res.status(201).json(booking)
  } catch (error) {
    console.error('Create booking error:', error)
    res.status(500).json({ error: 'Failed to create booking' })
  }
})

/**
 * PUT /api/admin/tenants/:tenantId/bookings/:bookingId
 * Update an existing booking
 */
router.put('/:tenantId/bookings/:bookingId', requirePermission('tenants'), async (req: SuperAdminRequest, res: Response) => {
  try {
    const { tenantId, bookingId } = req.params
    const {
      room_id,
      guest_name,
      guest_email,
      guest_phone,
      check_in,
      check_out,
      adults,
      children,
      total_amount,
      status,
      notes
    } = req.body

    // Build update object with only provided fields
    const updates: any = {}
    if (guest_name !== undefined) updates.guest_name = guest_name
    if (guest_email !== undefined) updates.guest_email = guest_email
    if (guest_phone !== undefined) updates.guest_phone = guest_phone
    if (check_in !== undefined) updates.check_in = check_in
    if (check_out !== undefined) updates.check_out = check_out
    if (adults !== undefined) updates.adults = adults
    if (children !== undefined) updates.children = children
    if (total_amount !== undefined) updates.total_amount = total_amount
    if (status !== undefined) updates.status = status
    if (notes !== undefined) updates.notes = notes

    // If room_id changed, update room_name too
    if (room_id !== undefined) {
      const { data: room } = await supabase
        .from('rooms')
        .select('name')
        .eq('id', room_id)
        .eq('tenant_id', tenantId)
        .single()

      if (room) {
        updates.room_id = room_id
        updates.room_name = room.name
      }
    }

    const { data: booking, error } = await supabase
      .from('bookings')
      .update(updates)
      .eq('id', bookingId)
      .eq('tenant_id', tenantId)
      .select()
      .single()

    if (error) {
      console.error('Update booking error:', error)
      return res.status(500).json({ error: 'Failed to update booking' })
    }

    // Log admin action
    if (req.superAdmin) {
      await logAdminAction({
        adminId: req.superAdmin.id,
        adminEmail: req.superAdmin.email,
        action: 'booking.update',
        resourceType: 'booking',
        resourceId: bookingId,
        metadata: {
          tenantId,
          updatedFields: Object.keys(updates)
        }
      })
    }

    res.json(booking)
  } catch (error) {
    console.error('Update booking error:', error)
    res.status(500).json({ error: 'Failed to update booking' })
  }
})

export default router

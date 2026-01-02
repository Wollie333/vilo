import { Router, Request, Response } from 'express'
import { supabase } from '../lib/supabase.js'
import { attachUserContext, requireAuth, requirePermission } from '../middleware/permissions.js'
import { getCustomerActivities, logNoteAdded, logBookingRecovered } from '../services/activityService.js'
import { notifyCustomerSupportReply, notifyCustomerSupportStatusChanged } from '../services/notificationService.js'

const router = Router()

// Apply auth middleware to all routes
router.use(attachUserContext)

// ============================================
// CUSTOMER LIST FOR ADMIN
// ============================================

/**
 * Get all customers for tenant (derived from bookings)
 * GET /api/customers
 */
router.get('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const tenantId = req.userContext!.tenantId
    const { search, sort = 'last_stay', order = 'desc', page = '1', limit = '20' } = req.query

    // Get all bookings for tenant with customer data
    let query = supabase
      .from('bookings')
      .select(`
        id,
        guest_name,
        guest_email,
        guest_phone,
        total_amount,
        currency,
        check_in,
        check_out,
        created_at,
        customer_id,
        customers (
          id,
          name,
          email,
          phone,
          created_at,
          last_login_at
        )
      `)
      .eq('tenant_id', tenantId)
      .not('guest_email', 'is', null)

    const { data: bookings, error } = await query

    if (error) {
      console.error('Error fetching bookings:', error)
      return res.status(500).json({ error: 'Failed to fetch customers' })
    }

    // Aggregate by email to get unique customers with stats
    const customerMap = new Map<string, any>()

    for (const booking of bookings || []) {
      const email = booking.guest_email?.toLowerCase()
      if (!email) continue

      const existing = customerMap.get(email)

      if (existing) {
        existing.bookingCount += 1
        existing.totalSpent += booking.total_amount || 0

        // Update first/last stay dates
        if (new Date(booking.check_in) < new Date(existing.firstStay)) {
          existing.firstStay = booking.check_in
        }
        if (new Date(booking.check_in) > new Date(existing.lastStay)) {
          existing.lastStay = booking.check_in
        }

        // Update name/phone if we have better data
        // Cast to single object since Supabase returns foreign key relations as objects
        const customerData = booking.customers as unknown as { id: string; name: string | null; email: string | null; phone: string | null; created_at: string; last_login_at: string | null } | null
        if (customerData) {
          existing.name = customerData.name || existing.name
          existing.phone = customerData.phone || existing.phone
          existing.customerId = customerData.id
          existing.hasPortalAccess = !!customerData.id
          existing.hasLoggedIn = !!customerData.last_login_at
        } else if (!existing.name && booking.guest_name) {
          existing.name = booking.guest_name
        }
        if (!existing.phone && booking.guest_phone) {
          existing.phone = booking.guest_phone
        }
      } else {
        // Cast to single object since Supabase returns foreign key relations as objects
        const customerData = booking.customers as unknown as { id: string; name: string | null; email: string | null; phone: string | null; created_at: string; last_login_at: string | null } | null
        customerMap.set(email, {
          email,
          name: customerData?.name || booking.guest_name || null,
          phone: customerData?.phone || booking.guest_phone || null,
          customerId: customerData?.id || null,
          hasPortalAccess: !!customerData?.id,
          hasLoggedIn: !!customerData?.last_login_at,
          bookingCount: 1,
          totalSpent: booking.total_amount || 0,
          currency: booking.currency || 'ZAR',
          firstStay: booking.check_in,
          lastStay: booking.check_in,
          createdAt: customerData?.created_at || booking.created_at
        })
      }
    }

    let customers = Array.from(customerMap.values())

    // Apply search filter
    if (search && typeof search === 'string') {
      const searchLower = search.toLowerCase()
      customers = customers.filter(c =>
        c.email?.toLowerCase().includes(searchLower) ||
        c.name?.toLowerCase().includes(searchLower) ||
        c.phone?.includes(search)
      )
    }

    // Apply sorting
    const sortField = sort as string
    const sortOrder = order === 'asc' ? 1 : -1

    customers.sort((a, b) => {
      let aVal: any, bVal: any

      switch (sortField) {
        case 'name':
          aVal = a.name?.toLowerCase() || ''
          bVal = b.name?.toLowerCase() || ''
          break
        case 'email':
          aVal = a.email?.toLowerCase() || ''
          bVal = b.email?.toLowerCase() || ''
          break
        case 'bookings':
          aVal = a.bookingCount
          bVal = b.bookingCount
          break
        case 'total_spent':
          aVal = a.totalSpent
          bVal = b.totalSpent
          break
        case 'first_stay':
          aVal = new Date(a.firstStay).getTime()
          bVal = new Date(b.firstStay).getTime()
          break
        case 'last_stay':
        default:
          aVal = new Date(a.lastStay).getTime()
          bVal = new Date(b.lastStay).getTime()
          break
      }

      if (aVal < bVal) return -1 * sortOrder
      if (aVal > bVal) return 1 * sortOrder
      return 0
    })

    // Apply pagination
    const pageNum = parseInt(page as string, 10)
    const limitNum = parseInt(limit as string, 10)
    const startIndex = (pageNum - 1) * limitNum
    const endIndex = startIndex + limitNum

    const paginatedCustomers = customers.slice(startIndex, endIndex)

    res.json({
      customers: paginatedCustomers,
      total: customers.length,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(customers.length / limitNum)
    })
  } catch (error) {
    console.error('Error fetching customers:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * Get customer statistics
 * GET /api/customers/stats
 */
router.get('/stats', requireAuth, async (req: Request, res: Response) => {
  try {
    const tenantId = req.userContext!.tenantId

    // Get all bookings
    const { data: bookings, error } = await supabase
      .from('bookings')
      .select('guest_email, total_amount')
      .eq('tenant_id', tenantId)
      .not('guest_email', 'is', null)

    if (error) {
      console.error('Error fetching bookings:', error)
      return res.status(500).json({ error: 'Failed to fetch statistics' })
    }

    // Calculate stats
    const emailCounts = new Map<string, number>()
    let totalRevenue = 0

    for (const booking of bookings || []) {
      const email = booking.guest_email?.toLowerCase()
      if (email) {
        emailCounts.set(email, (emailCounts.get(email) || 0) + 1)
        totalRevenue += booking.total_amount || 0
      }
    }

    const totalCustomers = emailCounts.size
    const repeatCustomers = Array.from(emailCounts.values()).filter(count => count > 1).length
    const averageBookingsPerCustomer = totalCustomers > 0
      ? (bookings?.length || 0) / totalCustomers
      : 0

    // Get customers with portal access
    const { count: portalAccessCount } = await supabase
      .from('customers')
      .select('id', { count: 'exact', head: true })
      .not('last_login_at', 'is', null)
      .in('email', Array.from(emailCounts.keys()))

    res.json({
      totalCustomers,
      repeatCustomers,
      repeatRate: totalCustomers > 0 ? (repeatCustomers / totalCustomers * 100).toFixed(1) : 0,
      totalRevenue,
      averageBookingsPerCustomer: averageBookingsPerCustomer.toFixed(1),
      customersWithPortalAccess: portalAccessCount || 0
    })
  } catch (error) {
    console.error('Error fetching statistics:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * Export customers as CSV
 * GET /api/customers/export
 */
router.get('/export', requireAuth, async (req: Request, res: Response) => {
  try {
    const tenantId = req.userContext!.tenantId

    // Get all bookings
    const { data: bookings, error } = await supabase
      .from('bookings')
      .select(`
        guest_name,
        guest_email,
        guest_phone,
        total_amount,
        currency,
        check_in,
        customers (
          name,
          email,
          phone
        )
      `)
      .eq('tenant_id', tenantId)
      .not('guest_email', 'is', null)

    if (error) {
      console.error('Error fetching bookings:', error)
      return res.status(500).json({ error: 'Failed to export customers' })
    }

    // Aggregate by email
    const customerMap = new Map<string, any>()

    for (const booking of bookings || []) {
      const email = booking.guest_email?.toLowerCase()
      if (!email) continue

      const existing = customerMap.get(email)

      if (existing) {
        existing.bookingCount += 1
        existing.totalSpent += booking.total_amount || 0

        if (new Date(booking.check_in) < new Date(existing.firstStay)) {
          existing.firstStay = booking.check_in
        }
        if (new Date(booking.check_in) > new Date(existing.lastStay)) {
          existing.lastStay = booking.check_in
        }
      } else {
        customerMap.set(email, {
          email,
          name: (booking.customers as any)?.name || booking.guest_name || '',
          phone: (booking.customers as any)?.phone || booking.guest_phone || '',
          bookingCount: 1,
          totalSpent: booking.total_amount || 0,
          currency: booking.currency || 'ZAR',
          firstStay: booking.check_in,
          lastStay: booking.check_in
        })
      }
    }

    const customers = Array.from(customerMap.values())

    // Generate CSV
    const headers = ['Name', 'Email', 'Phone', 'Total Bookings', 'Total Spent', 'Currency', 'First Stay', 'Last Stay']
    const rows = customers.map(c => [
      `"${(c.name || '').replace(/"/g, '""')}"`,
      `"${c.email}"`,
      `"${c.phone || ''}"`,
      c.bookingCount,
      c.totalSpent.toFixed(2),
      c.currency,
      c.firstStay,
      c.lastStay
    ])

    const csv = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n')

    res.setHeader('Content-Type', 'text/csv')
    res.setHeader('Content-Disposition', `attachment; filename="customers-${new Date().toISOString().split('T')[0]}.csv"`)
    res.send(csv)
  } catch (error) {
    console.error('Error exporting customers:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * Get single customer details
 * GET /api/customers/:email
 */
router.get('/:email', requireAuth, async (req: Request, res: Response) => {
  try {
    const tenantId = req.userContext!.tenantId
    const { email } = req.params

    // Get all bookings for this customer at this tenant
    const { data: bookings, error } = await supabase
      .from('bookings')
      .select('*')
      .eq('tenant_id', tenantId)
      .ilike('guest_email', email)
      .order('check_in', { ascending: false })

    if (error) {
      console.error('Error fetching customer bookings:', error)
      return res.status(500).json({ error: 'Failed to fetch customer' })
    }

    if (!bookings || bookings.length === 0) {
      return res.status(404).json({ error: 'Customer not found' })
    }

    // Get booking IDs for review lookup
    const bookingIds = bookings.map(b => b.id)

    // Fetch reviews separately to avoid nested query issues
    const { data: allReviews, error: reviewsError } = await supabase
      .from('reviews')
      .select('*')
      .eq('tenant_id', tenantId)
      .in('booking_id', bookingIds)
      .order('created_at', { ascending: false })

    if (reviewsError) {
      console.error('Error fetching reviews:', reviewsError)
    }

    // Map reviews to bookings
    const reviewsByBookingId = new Map()
    if (allReviews) {
      for (const review of allReviews) {
        if (!reviewsByBookingId.has(review.booking_id)) {
          reviewsByBookingId.set(review.booking_id, [])
        }
        reviewsByBookingId.get(review.booking_id).push(review)
      }
    }

    // Fetch room data for images
    const roomIds = [...new Set(bookings.map(b => b.room_id).filter(Boolean))]
    const roomsMap = new Map()

    if (roomIds.length > 0) {
      const { data: rooms } = await supabase
        .from('rooms')
        .select('id, images')
        .in('id', roomIds)

      if (rooms) {
        for (const room of rooms) {
          roomsMap.set(room.id, { images: room.images })
        }
      }
    }

    // Add reviews and room data to each booking
    const enrichedBookings = bookings.map(booking => ({
      ...booking,
      reviews: reviewsByBookingId.get(booking.id) || [],
      room: roomsMap.get(booking.room_id) || null
    }))

    // Get customer record if exists
    const { data: customer } = await supabase
      .from('customers')
      .select('*')
      .ilike('email', email)
      .single()

    // Get support tickets
    const { data: supportTickets } = await supabase
      .from('support_messages')
      .select('*')
      .eq('tenant_id', tenantId)
      .ilike('sender_email', email)
      .order('created_at', { ascending: false })

    // Calculate stats
    const totalSpent = enrichedBookings.reduce((sum, b) => sum + (b.total_amount || 0), 0)
    const bookingsWithReviewsCount = enrichedBookings.filter(b => b.reviews && b.reviews.length > 0)
    const avgRating = bookingsWithReviewsCount.length > 0
      ? bookingsWithReviewsCount.reduce((sum, b) => sum + (b.reviews[0]?.rating || 0), 0) / bookingsWithReviewsCount.length
      : null

    // Extract all reviews with booking info
    const reviews = enrichedBookings
      .filter(b => b.reviews && b.reviews.length > 0)
      .flatMap(b => b.reviews.map((review: any) => ({
        ...review,
        booking_id: b.id,
        room_name: b.room_name,
        check_in: b.check_in,
        check_out: b.check_out
      })))
      .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

    res.json({
      customer: {
        email,
        name: customer?.name || enrichedBookings[0].guest_name,
        phone: customer?.phone || enrichedBookings[0].guest_phone,
        customerId: customer?.id || null,
        hasPortalAccess: !!customer?.id,
        hasLoggedIn: !!customer?.last_login_at,
        lastLoginAt: customer?.last_login_at || null,
        // Profile fields
        profilePictureUrl: customer?.profile_picture_url || null,
        // Business details
        businessName: customer?.business_name || null,
        businessVatNumber: customer?.business_vat_number || null,
        businessRegistrationNumber: customer?.business_registration_number || null,
        businessAddressLine1: customer?.business_address_line1 || null,
        businessAddressLine2: customer?.business_address_line2 || null,
        businessCity: customer?.business_city || null,
        businessPostalCode: customer?.business_postal_code || null,
        businessCountry: customer?.business_country || null,
        useBusinessDetailsOnInvoice: customer?.use_business_details_on_invoice || false
      },
      stats: {
        totalBookings: enrichedBookings.length,
        totalSpent,
        currency: enrichedBookings[0].currency || 'ZAR',
        firstStay: enrichedBookings[enrichedBookings.length - 1].check_in,
        lastStay: enrichedBookings[0].check_in,
        averageRating: avgRating,
        totalReviews: reviews.length
      },
      bookings: enrichedBookings,
      reviews,
      supportTickets: supportTickets || []
    })
  } catch (error) {
    console.error('Error fetching customer:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// ============================================
// CUSTOMER NOTES
// ============================================

/**
 * Get notes for a customer
 * GET /api/customers/:email/notes
 */
router.get('/:email/notes', requireAuth, async (req: Request, res: Response) => {
  try {
    const tenantId = req.userContext!.tenantId
    const { email } = req.params

    // Verify customer has bookings with this tenant
    const { data: bookings } = await supabase
      .from('bookings')
      .select('id')
      .eq('tenant_id', tenantId)
      .ilike('guest_email', email)
      .limit(1)

    if (!bookings || bookings.length === 0) {
      return res.status(404).json({ error: 'Customer not found' })
    }

    // Get customer ID if exists
    const { data: customer } = await supabase
      .from('customers')
      .select('id')
      .ilike('email', email)
      .single()

    if (!customer) {
      return res.json([]) // No customer record means no notes yet
    }

    // Get notes
    const { data: notes, error } = await supabase
      .from('customer_notes')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('customer_id', customer.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching notes:', error)
      return res.status(500).json({ error: 'Failed to fetch notes' })
    }

    res.json(notes || [])
  } catch (error) {
    console.error('Error fetching notes:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * Add a note for a customer
 * POST /api/customers/:email/notes
 */
router.post('/:email/notes', requireAuth, async (req: Request, res: Response) => {
  try {
    const tenantId = req.userContext!.tenantId
    const userId = req.userContext!.userId
    const { email } = req.params
    const { content } = req.body

    if (!content || !content.trim()) {
      return res.status(400).json({ error: 'Content is required' })
    }

    // Verify customer has bookings with this tenant
    const { data: bookings } = await supabase
      .from('bookings')
      .select('id')
      .eq('tenant_id', tenantId)
      .ilike('guest_email', email)
      .limit(1)

    if (!bookings || bookings.length === 0) {
      return res.status(404).json({ error: 'Customer not found' })
    }

    // Get or create customer record
    let customerId: string
    const { data: existingCustomer } = await supabase
      .from('customers')
      .select('id')
      .ilike('email', email)
      .single()

    if (existingCustomer) {
      customerId = existingCustomer.id
    } else {
      // Create customer record
      const { data: newCustomer, error: createError } = await supabase
        .from('customers')
        .insert({ email: email.toLowerCase() })
        .select('id')
        .single()

      if (createError || !newCustomer) {
        console.error('Error creating customer:', createError)
        return res.status(500).json({ error: 'Failed to create customer record' })
      }

      customerId = newCustomer.id
    }

    // Get user name for the note
    const { data: { user } } = await supabase.auth.admin.getUserById(userId)
    const userName = user?.user_metadata?.first_name
      ? `${user.user_metadata.first_name} ${user.user_metadata.last_name || ''}`.trim()
      : user?.email || 'Staff'

    // Create note
    const { data: note, error } = await supabase
      .from('customer_notes')
      .insert({
        tenant_id: tenantId,
        customer_id: customerId,
        content: content.trim(),
        created_by: userId,
        created_by_name: userName
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating note:', error)
      return res.status(500).json({ error: 'Failed to create note' })
    }

    // Log activity
    logNoteAdded(tenantId, email, customerId, userName)

    res.status(201).json(note)
  } catch (error) {
    console.error('Error creating note:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * Update a customer note
 * PATCH /api/customers/:email/notes/:noteId
 */
router.patch('/:email/notes/:noteId', requireAuth, async (req: Request, res: Response) => {
  try {
    const tenantId = req.userContext!.tenantId
    const { noteId } = req.params
    const { content } = req.body

    if (!content || !content.trim()) {
      return res.status(400).json({ error: 'Content is required' })
    }

    const { data: note, error } = await supabase
      .from('customer_notes')
      .update({
        content: content.trim(),
        updated_at: new Date().toISOString()
      })
      .eq('id', noteId)
      .eq('tenant_id', tenantId)
      .select()
      .single()

    if (error) {
      console.error('Error updating note:', error)
      return res.status(500).json({ error: 'Failed to update note' })
    }

    res.json(note)
  } catch (error) {
    console.error('Error updating note:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * Delete a customer note
 * DELETE /api/customers/:email/notes/:noteId
 */
router.delete('/:email/notes/:noteId', requireAuth, async (req: Request, res: Response) => {
  try {
    const tenantId = req.userContext!.tenantId
    const { noteId } = req.params

    const { error } = await supabase
      .from('customer_notes')
      .delete()
      .eq('id', noteId)
      .eq('tenant_id', tenantId)

    if (error) {
      console.error('Error deleting note:', error)
      return res.status(500).json({ error: 'Failed to delete note' })
    }

    res.status(204).send()
  } catch (error) {
    console.error('Error deleting note:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * Update customer details (admin)
 * PATCH /api/customers/:email
 */
router.patch('/:email', requireAuth, async (req: Request, res: Response) => {
  try {
    const tenantId = req.userContext!.tenantId
    const { email } = req.params
    const {
      name,
      phone,
      // Business details
      businessName,
      businessVatNumber,
      businessRegistrationNumber,
      businessAddressLine1,
      businessAddressLine2,
      businessCity,
      businessPostalCode,
      businessCountry,
      useBusinessDetailsOnInvoice
    } = req.body

    // First verify this customer has bookings with this tenant
    const { data: bookings, error: bookingsError } = await supabase
      .from('bookings')
      .select('id')
      .eq('tenant_id', tenantId)
      .ilike('guest_email', email)
      .limit(1)

    if (bookingsError || !bookings || bookings.length === 0) {
      return res.status(404).json({ error: 'Customer not found for this tenant' })
    }

    // Check if customer record exists
    const { data: existingCustomer } = await supabase
      .from('customers')
      .select('id')
      .ilike('email', email)
      .single()

    const updateData: any = {}

    // Basic info
    if (name !== undefined) updateData.name = name
    if (phone !== undefined) updateData.phone = phone

    // Business details
    if (businessName !== undefined) updateData.business_name = businessName
    if (businessVatNumber !== undefined) updateData.business_vat_number = businessVatNumber
    if (businessRegistrationNumber !== undefined) updateData.business_registration_number = businessRegistrationNumber
    if (businessAddressLine1 !== undefined) updateData.business_address_line1 = businessAddressLine1
    if (businessAddressLine2 !== undefined) updateData.business_address_line2 = businessAddressLine2
    if (businessCity !== undefined) updateData.business_city = businessCity
    if (businessPostalCode !== undefined) updateData.business_postal_code = businessPostalCode
    if (businessCountry !== undefined) updateData.business_country = businessCountry
    if (useBusinessDetailsOnInvoice !== undefined) updateData.use_business_details_on_invoice = useBusinessDetailsOnInvoice

    let customer

    if (existingCustomer) {
      // Update existing customer
      const { data, error } = await supabase
        .from('customers')
        .update(updateData)
        .eq('id', existingCustomer.id)
        .select()
        .single()

      if (error) {
        console.error('Error updating customer:', error)
        return res.status(500).json({ error: 'Failed to update customer' })
      }

      customer = data
    } else {
      // Create new customer record with email
      const { data, error } = await supabase
        .from('customers')
        .insert({
          email: email.toLowerCase(),
          ...updateData
        })
        .select()
        .single()

      if (error) {
        console.error('Error creating customer:', error)
        return res.status(500).json({ error: 'Failed to create customer record' })
      }

      customer = data
    }

    // Also update the bookings guest_name and guest_phone if provided
    if (name || phone) {
      const bookingUpdate: any = {}
      if (name) bookingUpdate.guest_name = name
      if (phone) bookingUpdate.guest_phone = phone

      await supabase
        .from('bookings')
        .update(bookingUpdate)
        .eq('tenant_id', tenantId)
        .ilike('guest_email', email)
    }

    res.json({
      success: true,
      customer: {
        email: customer.email,
        name: customer.name,
        phone: customer.phone,
        customerId: customer.id,
        hasPortalAccess: !!customer.id,
        profilePictureUrl: customer.profile_picture_url,
        businessName: customer.business_name,
        businessVatNumber: customer.business_vat_number,
        businessRegistrationNumber: customer.business_registration_number,
        businessAddressLine1: customer.business_address_line1,
        businessAddressLine2: customer.business_address_line2,
        businessCity: customer.business_city,
        businessPostalCode: customer.business_postal_code,
        businessCountry: customer.business_country,
        useBusinessDetailsOnInvoice: customer.use_business_details_on_invoice
      }
    })
  } catch (error) {
    console.error('Error updating customer:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * Get support tickets for admin view
 * GET /api/customers/support/tickets
 */
router.get('/support/tickets', requireAuth, async (req: Request, res: Response) => {
  try {
    const tenantId = req.userContext!.tenantId
    const { status, source, assigned_to, page = '1', limit = '20' } = req.query

    let query = supabase
      .from('support_messages')
      .select(`
        *,
        customers (
          id,
          name,
          email
        ),
        bookings (
          id,
          room_name,
          check_in,
          check_out
        ),
        support_replies (
          id
        )
      `)
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })

    if (status && typeof status === 'string' && status !== 'all') {
      query = query.eq('status', status)
    }

    // Filter by source (website or portal)
    if (source && typeof source === 'string' && source !== 'all') {
      query = query.eq('source', source)
    }

    // Filter by assigned team member
    if (assigned_to && typeof assigned_to === 'string') {
      if (assigned_to === 'unassigned') {
        query = query.is('assigned_to', null)
      } else if (assigned_to !== 'all') {
        query = query.eq('assigned_to', assigned_to)
      }
    }

    const { data: tickets, error, count } = await query

    if (error) {
      console.error('Error fetching support tickets:', error)
      return res.status(500).json({ error: 'Failed to fetch support tickets' })
    }

    // Apply pagination
    const pageNum = parseInt(page as string, 10)
    const limitNum = parseInt(limit as string, 10)
    const startIndex = (pageNum - 1) * limitNum
    const endIndex = startIndex + limitNum

    const paginatedTickets = (tickets || []).slice(startIndex, endIndex).map(t => ({
      ...t,
      replyCount: t.support_replies?.length || 0
    }))

    res.json({
      tickets: paginatedTickets,
      total: tickets?.length || 0,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil((tickets?.length || 0) / limitNum)
    })
  } catch (error) {
    console.error('Error fetching support tickets:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * Get single support ticket with thread (admin)
 * GET /api/customers/support/tickets/:id
 */
router.get('/support/tickets/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const tenantId = req.userContext!.tenantId
    const { id } = req.params

    const { data: ticket, error } = await supabase
      .from('support_messages')
      .select(`
        *,
        customers (
          id,
          name,
          email,
          phone
        ),
        bookings (
          id,
          room_name,
          check_in,
          check_out,
          status,
          total_amount
        ),
        support_replies (
          id,
          content,
          sender_type,
          sender_name,
          created_at
        )
      `)
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .single()

    if (error || !ticket) {
      return res.status(404).json({ error: 'Support ticket not found' })
    }

    // Sort replies
    if (ticket.support_replies) {
      ticket.support_replies.sort((a: any, b: any) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      )
    }

    res.json(ticket)
  } catch (error) {
    console.error('Error fetching support ticket:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * Reply to support ticket (admin)
 * POST /api/customers/support/tickets/:id/reply
 */
router.post('/support/tickets/:id/reply', requireAuth, async (req: Request, res: Response) => {
  try {
    const tenantId = req.userContext!.tenantId
    const userId = req.userContext!.userId
    const { id } = req.params
    const { content, status } = req.body

    if (!content) {
      return res.status(400).json({ error: 'Content is required' })
    }

    // Verify ticket belongs to tenant
    const { data: ticket, error: fetchError } = await supabase
      .from('support_messages')
      .select('id, status, customer_id, subject')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .single()

    if (fetchError || !ticket) {
      return res.status(404).json({ error: 'Support ticket not found' })
    }

    // Get admin user info
    const { data: { user } } = await supabase.auth.admin.getUserById(userId)
    const adminName = user?.user_metadata?.first_name
      ? `${user.user_metadata.first_name} ${user.user_metadata.last_name || ''}`.trim()
      : 'Property Manager'

    // Create reply
    const { data: reply, error: createError } = await supabase
      .from('support_replies')
      .insert({
        message_id: id,
        content,
        sender_type: 'admin',
        sender_id: userId,
        sender_name: adminName
      })
      .select()
      .single()

    if (createError) {
      console.error('Error creating reply:', createError)
      return res.status(500).json({ error: 'Failed to create reply' })
    }

    // Update ticket status
    const newStatus = status || (ticket.status === 'new' ? 'open' : ticket.status)
    await supabase
      .from('support_messages')
      .update({
        status: newStatus,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)

    // Notify customer about the reply
    if (ticket.customer_id) {
      console.log('[Support] Notifying customer about staff reply:', ticket.customer_id)
      notifyCustomerSupportReply(tenantId, ticket.customer_id, {
        ticket_id: id,
        subject: ticket.subject
      })
    }

    res.json({
      success: true,
      reply
    })
  } catch (error) {
    console.error('Error creating reply:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * Create new support ticket (admin outreach)
 * POST /api/customers/support/tickets
 */
router.post('/support/tickets', requireAuth, async (req: Request, res: Response) => {
  try {
    const tenantId = req.userContext!.tenantId
    const userId = req.userContext!.userId
    const { sender_email, sender_name, subject, message, source = 'portal' } = req.body

    if (!sender_email || !subject || !message) {
      return res.status(400).json({ error: 'Email, subject, and message are required' })
    }

    // Get admin user info
    const { data: { user } } = await supabase.auth.admin.getUserById(userId)
    const adminName = user?.user_metadata?.first_name
      ? `${user.user_metadata.first_name} ${user.user_metadata.last_name || ''}`.trim()
      : 'Property Manager'

    // Check if customer exists
    const { data: customer } = await supabase
      .from('customers')
      .select('id')
      .ilike('email', sender_email)
      .single()

    // Create the support ticket
    const { data: ticket, error: ticketError } = await supabase
      .from('support_messages')
      .insert({
        tenant_id: tenantId,
        sender_email: sender_email.toLowerCase(),
        sender_name: sender_name || null,
        customer_id: customer?.id || null,
        subject,
        message: `[Outreach from ${adminName}]\n\n${message}`,
        source,
        status: 'open',
        assigned_to: userId
      })
      .select()
      .single()

    if (ticketError) {
      console.error('Error creating ticket:', ticketError)
      return res.status(500).json({ error: 'Failed to create ticket' })
    }

    // Add the admin's message as the first reply
    await supabase
      .from('support_replies')
      .insert({
        message_id: ticket.id,
        content: message,
        sender_type: 'admin',
        sender_id: userId,
        sender_name: adminName
      })

    res.json({
      success: true,
      ticket
    })
  } catch (error) {
    console.error('Error creating ticket:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * Update support ticket status (admin)
 * PATCH /api/customers/support/tickets/:id
 */
router.patch('/support/tickets/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const tenantId = req.userContext!.tenantId
    const { id } = req.params
    const { status, priority, assigned_to } = req.body

    // Get current ticket to check for status changes
    const { data: currentTicket } = await supabase
      .from('support_messages')
      .select('status, customer_id, subject')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .single()

    const updateData: any = {
      updated_at: new Date().toISOString()
    }

    if (status) updateData.status = status
    if (priority) updateData.priority = priority
    // Handle assignment (can be null to unassign)
    if (assigned_to !== undefined) updateData.assigned_to = assigned_to

    const { data: ticket, error } = await supabase
      .from('support_messages')
      .update(updateData)
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .select()
      .single()

    if (error) {
      console.error('Error updating ticket:', error)
      return res.status(500).json({ error: 'Failed to update ticket' })
    }

    // Notify customer if status changed
    if (status && currentTicket?.status !== status && currentTicket?.customer_id) {
      console.log('[Support] Notifying customer about status change:', currentTicket.customer_id)
      notifyCustomerSupportStatusChanged(tenantId, currentTicket.customer_id, {
        ticket_id: id,
        subject: currentTicket.subject,
        status
      })
    }

    res.json({
      success: true,
      ticket
    })
  } catch (error) {
    console.error('Error updating ticket:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * Get team members for ticket assignment
 * GET /api/customers/support/team-members
 */
router.get('/support/team-members', requireAuth, async (req: Request, res: Response) => {
  try {
    const tenantId = req.userContext!.tenantId

    // Get owner from tenants table
    const { data: tenant } = await supabase
      .from('tenants')
      .select('owner_user_id')
      .eq('id', tenantId)
      .single()

    // Get team members from tenant_members table
    const { data: members, error: membersError } = await supabase
      .from('tenant_members')
      .select('user_id, role')
      .eq('tenant_id', tenantId)
      .eq('status', 'active')

    if (membersError) {
      console.error('Error fetching team members:', membersError)
      return res.status(500).json({ error: 'Failed to fetch team members' })
    }

    // Collect all user IDs (owner + members)
    const userIds: string[] = []
    if (tenant?.owner_user_id) {
      userIds.push(tenant.owner_user_id)
    }
    if (members) {
      members.forEach(m => userIds.push(m.user_id))
    }

    // Fetch user details from auth
    const teamMembers = await Promise.all(
      userIds.map(async (userId) => {
        const { data: { user } } = await supabase.auth.admin.getUserById(userId)
        const memberRecord = members?.find(m => m.user_id === userId)
        return {
          id: userId,
          email: user?.email || '',
          name: user?.user_metadata?.first_name
            ? `${user.user_metadata.first_name} ${user.user_metadata.last_name || ''}`.trim()
            : null,
          role: userId === tenant?.owner_user_id ? 'owner' : (memberRecord?.role || 'member'),
          avatar_url: user?.user_metadata?.avatar_url || null
        }
      })
    )

    res.json(teamMembers)
  } catch (error) {
    console.error('Error fetching team members:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// ============================================
// CUSTOMER ACTIVITY
// ============================================

/**
 * Get activity timeline for a customer
 * GET /api/customers/:email/activity
 */
router.get('/:email/activity', requireAuth, async (req: Request, res: Response) => {
  try {
    const tenantId = req.userContext!.tenantId
    const { email } = req.params
    const { limit = '50' } = req.query

    // Verify customer has bookings with this tenant
    const { data: bookings } = await supabase
      .from('bookings')
      .select('id')
      .eq('tenant_id', tenantId)
      .ilike('guest_email', email)
      .limit(1)

    if (!bookings || bookings.length === 0) {
      return res.status(404).json({ error: 'Customer not found' })
    }

    const activities = await getCustomerActivities(
      tenantId,
      email,
      parseInt(limit as string, 10)
    )

    // Transform activities to frontend format
    const formattedActivities = activities.map(activity => ({
      id: activity.id,
      type: mapActivityType(activity.activity_type),
      title: activity.title,
      description: activity.description,
      date: activity.created_at,
      metadata: {
        bookingId: activity.booking_id,
        ticketId: activity.support_ticket_id,
        ...activity.metadata
      }
    }))

    res.json(formattedActivities)
  } catch (error) {
    console.error('Error fetching activities:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Pass through activity types to frontend (frontend handles all types)
function mapActivityType(type: string): string {
  // Return the original type - frontend has icons for all detailed types
  return type
}

// ============================================
// ARCHIVED BOOKINGS (For Cart Abandoned Recovery)
// ============================================

/**
 * Get archived bookings for a customer
 * GET /api/customers/:id/archived-bookings
 */
router.get('/:id/archived-bookings', requireAuth, async (req: Request, res: Response) => {
  try {
    const tenantId = req.userContext!.tenantId
    const { id: customerId } = req.params

    const { data: archives, error } = await supabase
      .from('archived_bookings')
      .select(`
        *,
        room:rooms(id, name, property:properties(id, name))
      `)
      .eq('tenant_id', tenantId)
      .eq('customer_id', customerId)
      .is('recovered_at', null)
      .order('archived_at', { ascending: false })

    if (error) {
      console.error('Error fetching archived bookings:', error)
      return res.status(500).json({ error: 'Failed to fetch archived bookings' })
    }

    res.json(archives || [])
  } catch (error) {
    console.error('Error fetching archived bookings:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * Recover a booking from archive
 * POST /api/customers/:id/archived-bookings/:archiveId/recover
 */
router.post('/:id/archived-bookings/:archiveId/recover', requireAuth, async (req: Request, res: Response) => {
  try {
    const tenantId = req.userContext!.tenantId
    const memberName = req.userContext!.email || 'Staff'
    const { id: customerId, archiveId } = req.params

    // Get archived booking
    const { data: archive, error: archiveError } = await supabase
      .from('archived_bookings')
      .select('*')
      .eq('id', archiveId)
      .eq('tenant_id', tenantId)
      .eq('customer_id', customerId)
      .is('recovered_at', null)
      .single()

    if (archiveError || !archive) {
      return res.status(404).json({ error: 'Archived booking not found' })
    }

    const bookingData = archive.booking_data as Record<string, unknown>

    // Check room availability for the dates
    const { data: conflicts } = await supabase
      .from('bookings')
      .select('id')
      .eq('room_id', archive.room_id)
      .not('status', 'in', '("cancelled","payment_failed","cart_abandoned")')
      .or(`and(check_in.lt.${archive.check_out},check_out.gt.${archive.check_in})`)
      .limit(1)

    if (conflicts && conflicts.length > 0) {
      return res.status(400).json({
        error: 'Room is no longer available for these dates',
        details: 'The room has been booked by someone else. Please choose different dates.'
      })
    }

    // Create new booking from archived data
    const newBookingRef = `VIL-${Date.now().toString(36).toUpperCase()}`

    const { data: newBooking, error: createError } = await supabase
      .from('bookings')
      .insert({
        tenant_id: tenantId,
        room_id: archive.room_id,
        customer_id: archive.customer_id,
        booking_ref: newBookingRef,
        guest_name: bookingData.guest_name as string,
        guest_email: bookingData.guest_email as string,
        guest_phone: bookingData.guest_phone as string,
        check_in: archive.check_in,
        check_out: archive.check_out,
        guests: archive.guests,
        total_amount: archive.total_amount,
        currency: (bookingData.currency as string) || 'ZAR',
        status: 'pending',
        payment_status: 'unpaid',
        source: 'recovered',
        checkout_data: archive.checkout_data,
        notes: `Recovered from archived booking ${archive.booking_ref || archive.original_booking_id} by ${memberName}`
      })
      .select()
      .single()

    if (createError || !newBooking) {
      console.error('Error creating recovered booking:', createError)
      return res.status(500).json({ error: 'Failed to create booking' })
    }

    // Mark archive as recovered
    await supabase
      .from('archived_bookings')
      .update({
        recovered_at: new Date().toISOString(),
        recovered_booking_id: newBooking.id
      })
      .eq('id', archiveId)

    // Get customer email for activity logging
    const { data: customer } = await supabase
      .from('customers')
      .select('email')
      .eq('id', customerId)
      .single()

    // Log activity
    if (customer) {
      await logBookingRecovered(
        tenantId,
        customer.email,
        customerId,
        archive.booking_ref || archive.original_booking_id,
        newBooking.id,
        (archive.booking_data as { room?: { name?: string } })?.room?.name || 'Room',
        memberName
      )
    }

    console.log(`[Customers] Booking recovered from archive ${archiveId} to new booking ${newBooking.id}`)

    res.json({
      success: true,
      booking: newBooking,
      message: 'Booking recovered successfully'
    })
  } catch (error) {
    console.error('Error recovering booking:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * Create support ticket from abandoned booking
 * POST /api/customers/:id/support-from-abandoned
 */
router.post('/:id/support-from-abandoned', requireAuth, async (req: Request, res: Response) => {
  try {
    const tenantId = req.userContext!.tenantId
    const { id: customerId } = req.params
    const { bookingRef, roomName, checkIn, checkOut, totalAmount, activityId } = req.body

    // Get customer details
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .select('id, email, first_name, last_name')
      .eq('id', customerId)
      .eq('tenant_id', tenantId)
      .single()

    if (customerError || !customer) {
      return res.status(404).json({ error: 'Customer not found' })
    }

    const customerName = `${customer.first_name || ''} ${customer.last_name || ''}`.trim() || customer.email

    // Generate ticket reference
    const ticketRef = `TKT-${Date.now().toString(36).toUpperCase()}`

    // Pre-fill message template
    const draftMessage = `Hi ${customer.first_name || 'there'},

We noticed you didn't complete your booking for ${roomName}.

Booking Details:
- Check-in: ${checkIn}
- Check-out: ${checkOut}
- Amount: R${totalAmount?.toFixed(2) || 'N/A'}

Is there anything we can help with? We'd love to assist you in completing your reservation.

Best regards`

    // Create support ticket in draft status
    const { data: ticket, error: ticketError } = await supabase
      .from('support_messages')
      .insert({
        tenant_id: tenantId,
        customer_id: customerId,
        ticket_ref: ticketRef,
        subject: `Booking Assistance - ${bookingRef || roomName}`,
        message: draftMessage,
        status: 'draft',
        priority: 'normal',
        metadata: {
          source: 'abandoned_cart',
          activity_id: activityId,
          booking_ref: bookingRef,
          room_name: roomName,
          check_in: checkIn,
          check_out: checkOut,
          total_amount: totalAmount
        }
      })
      .select()
      .single()

    if (ticketError) {
      console.error('Error creating support ticket:', ticketError)
      return res.status(500).json({ error: 'Failed to create support ticket' })
    }

    console.log(`[Customers] Support ticket ${ticketRef} created for abandoned cart recovery`)

    res.json({
      success: true,
      ticket: ticket,
      message: 'Support ticket created as draft. Review and send when ready.'
    })
  } catch (error) {
    console.error('Error creating support ticket:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router

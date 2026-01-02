import { Router, Request, Response } from 'express'
import { supabase } from '../lib/supabase.js'
import {
  attachCustomerContext,
  requireCustomerAuth,
  getCustomerByEmail,
  getOrCreateCustomer,
  createMagicLinkToken,
  verifyMagicLinkToken,
  createSessionToken,
  invalidateSessionToken,
  verifyCustomerPassword,
  setCustomerPassword,
  getCustomerBookings,
  canModifyBookingAddons,
  getCustomerById
} from '../middleware/customerAuth.js'
import {
  logPortalLogin,
  logPortalSignup,
  logSupportTicketCreated,
  logSupportTicketReplied,
  logProfileUpdated
} from '../services/activityService.js'
import {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  getPreferences,
  updatePreferences,
  notifyNewSupportTicket,
  notifyCustomerReplied,
  notifyPortalWelcome,
  notifyNewBooking,
  notifyBookingCancelled,
  notifyCustomerBookingConfirmed,
  notifyPaymentProofUploaded
} from '../services/notificationService.js'

const router = Router()

// Apply customer context middleware to all routes
router.use(attachCustomerContext)

// ============================================
// AUTHENTICATION ENDPOINTS
// ============================================

/**
 * Request magic link
 * POST /api/portal/auth/magic-link
 */
router.post('/auth/magic-link', async (req: Request, res: Response) => {
  try {
    const { email } = req.body

    if (!email) {
      return res.status(400).json({ error: 'Email is required' })
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' })
    }

    // Check if this email has any bookings
    const { data: bookings } = await supabase
      .from('bookings')
      .select('id')
      .ilike('guest_email', email)
      .limit(1)

    if (!bookings || bookings.length === 0) {
      // Don't reveal if email exists - just say link sent
      return res.json({
        success: true,
        message: 'If this email has bookings, a magic link has been sent'
      })
    }

    // Get or create customer
    const customer = await getOrCreateCustomer(email)

    if (!customer) {
      return res.status(500).json({ error: 'Failed to process request' })
    }

    // Create magic link token
    const ipAddress = req.ip || req.connection.remoteAddress
    const userAgent = req.headers['user-agent']
    const tokenData = await createMagicLinkToken(customer.id, ipAddress, userAgent)

    if (!tokenData) {
      return res.status(500).json({ error: 'Failed to create magic link' })
    }

    // In production, send email with magic link
    // For now, log the link (or return in dev mode)
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173'
    const magicLink = `${frontendUrl}/portal/verify?token=${tokenData.token}`

    console.log('=== Magic Link Email ===')
    console.log(`To: ${email}`)
    console.log(`Subject: Your Vilo Portal Login Link`)
    console.log(`Link: ${magicLink}`)
    console.log('========================')

    // In development, return the token for testing
    if (process.env.NODE_ENV === 'development') {
      return res.json({
        success: true,
        message: 'Magic link sent',
        dev_token: tokenData.token,
        dev_link: magicLink
      })
    }

    res.json({
      success: true,
      message: 'If this email has bookings, a magic link has been sent'
    })
  } catch (error) {
    console.error('Error requesting magic link:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * Verify magic link token
 * POST /api/portal/auth/verify
 */
router.post('/auth/verify', async (req: Request, res: Response) => {
  try {
    const { token } = req.body

    if (!token) {
      return res.status(400).json({ error: 'Token is required' })
    }

    const customer = await verifyMagicLinkToken(token)

    if (!customer) {
      return res.status(401).json({ error: 'Invalid or expired token' })
    }

    // Create session token
    const session = await createSessionToken(customer.id)

    if (!session) {
      return res.status(500).json({ error: 'Failed to create session' })
    }

    // Link any bookings with this email to the customer
    await supabase
      .from('bookings')
      .update({ customer_id: customer.id })
      .ilike('guest_email', customer.email)
      .is('customer_id', null)

    // Log portal login activity for each tenant the customer has bookings with
    const { data: tenantBookings } = await supabase
      .from('bookings')
      .select('tenant_id')
      .eq('customer_id', customer.id)

    if (tenantBookings) {
      const uniqueTenantIds = [...new Set(tenantBookings.map(b => b.tenant_id))]
      // Check if this is the first login (no previous activity)
      const { count: activityCount } = await supabase
        .from('customer_activity')
        .select('id', { count: 'exact', head: true })
        .eq('customer_id', customer.id)
        .eq('activity_type', 'portal_login')

      for (const tenantId of uniqueTenantIds) {
        if (activityCount === 0) {
          // First login - log as signup
          logPortalSignup(tenantId, customer.email, customer.id)
        }
        logPortalLogin(tenantId, customer.email, customer.id)
      }
    }

    res.json({
      success: true,
      customer: {
        id: customer.id,
        email: customer.email,
        name: customer.name,
        phone: customer.phone,
        profilePictureUrl: customer.profile_picture_url || null,
        hasPassword: !!customer.password_hash
      },
      token: session.token,
      expiresAt: session.expiresAt
    })
  } catch (error) {
    console.error('Error verifying token:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * Login with email and password
 * POST /api/portal/auth/login
 */
router.post('/auth/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' })
    }

    const customer = await verifyCustomerPassword(email, password)

    if (!customer) {
      return res.status(401).json({ error: 'Invalid email or password' })
    }

    // Create session token
    const session = await createSessionToken(customer.id)

    if (!session) {
      return res.status(500).json({ error: 'Failed to create session' })
    }

    // Log activity for each tenant the customer has bookings with
    const { data: tenantBookings } = await supabase
      .from('bookings')
      .select('tenant_id')
      .eq('customer_id', customer.id)

    if (tenantBookings) {
      const uniqueTenantIds = [...new Set(tenantBookings.map(b => b.tenant_id))]
      for (const tenantId of uniqueTenantIds) {
        logPortalLogin(tenantId, customer.email, customer.id)
      }
    }

    res.json({
      success: true,
      customer: {
        id: customer.id,
        email: customer.email,
        name: customer.name,
        phone: customer.phone,
        profilePictureUrl: customer.profile_picture_url || null,
        hasPassword: true
      },
      token: session.token,
      expiresAt: session.expiresAt
    })
  } catch (error) {
    console.error('Error logging in:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * Set password (for customers who logged in via magic link)
 * POST /api/portal/auth/set-password
 */
router.post('/auth/set-password', requireCustomerAuth, async (req: Request, res: Response) => {
  try {
    const { password } = req.body
    const customerId = req.customerContext!.customerId

    if (!password || password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' })
    }

    const customer = await setCustomerPassword(customerId, password)

    if (!customer) {
      return res.status(500).json({ error: 'Failed to set password' })
    }

    res.json({
      success: true,
      message: 'Password set successfully'
    })
  } catch (error) {
    console.error('Error setting password:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * Get current customer
 * GET /api/portal/auth/me
 */
router.get('/auth/me', requireCustomerAuth, async (req: Request, res: Response) => {
  try {
    const customer = await getCustomerById(req.customerContext!.customerId)

    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' })
    }

    res.json({
      id: customer.id,
      email: customer.email,
      name: customer.name,
      phone: customer.phone,
      profilePictureUrl: customer.profile_picture_url || null,
      hasPassword: !!customer.password_hash,
      preferredLanguage: customer.preferred_language,
      marketingConsent: customer.marketing_consent,
      createdAt: customer.created_at,
      lastLoginAt: customer.last_login_at,
      // Business details
      businessName: customer.business_name || null,
      businessVatNumber: customer.business_vat_number || null,
      businessRegistrationNumber: customer.business_registration_number || null,
      businessAddressLine1: customer.business_address_line1 || null,
      businessAddressLine2: customer.business_address_line2 || null,
      businessCity: customer.business_city || null,
      businessPostalCode: customer.business_postal_code || null,
      businessCountry: customer.business_country || null,
      useBusinessDetailsOnInvoice: customer.use_business_details_on_invoice || false
    })
  } catch (error) {
    console.error('Error fetching customer:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * Logout
 * POST /api/portal/auth/logout
 */
router.post('/auth/logout', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization
    const customerToken = req.headers['x-customer-token'] as string

    let token: string | null = null
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1]
    } else if (customerToken) {
      token = customerToken
    }

    if (token) {
      await invalidateSessionToken(token)
    }

    res.json({ success: true })
  } catch (error) {
    console.error('Error logging out:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// ============================================
// BOOKINGS ENDPOINTS
// ============================================

/**
 * Get customer's bookings
 * GET /api/portal/bookings
 */
router.get('/bookings', requireCustomerAuth, async (req: Request, res: Response) => {
  try {
    const customerId = req.customerContext!.customerId
    const customerEmail = req.customerContext!.email

    // Get bookings by customer_id
    const { data: bookingsByCustomerId, error: error1 } = await supabase
      .from('bookings')
      .select('*')
      .eq('customer_id', customerId)
      .order('check_in', { ascending: false })

    // Also get bookings by email (in case customer_id wasn't linked)
    const { data: bookingsByEmail, error: error2 } = await supabase
      .from('bookings')
      .select('*')
      .ilike('guest_email', customerEmail)
      .order('check_in', { ascending: false })

    if (error1 || error2) {
      console.error('Error fetching bookings:', error1 || error2)
      return res.status(500).json({ error: 'Failed to fetch bookings' })
    }

    // Merge and deduplicate bookings
    const bookingsMap = new Map<string, any>()
    for (const b of (bookingsByCustomerId || [])) {
      bookingsMap.set(b.id, b)
    }
    for (const b of (bookingsByEmail || [])) {
      if (!bookingsMap.has(b.id)) {
        bookingsMap.set(b.id, b)
      }
    }
    const bookings = Array.from(bookingsMap.values())
      .sort((a, b) => new Date(b.check_in).getTime() - new Date(a.check_in).getTime())

    // Link any unlinked bookings to this customer (auto-fix)
    const unlinkedBookings = bookings.filter(b => !b.customer_id)
    if (unlinkedBookings.length > 0) {
      await supabase
        .from('bookings')
        .update({ customer_id: customerId })
        .in('id', unlinkedBookings.map(b => b.id))
    }

    // Get unique tenant IDs and fetch tenant info
    const tenantIds = [...new Set((bookings || []).map(b => b.tenant_id))]
    const { data: tenants } = await supabase
      .from('tenants')
      .select('id, business_name, logo_url')
      .in('id', tenantIds)

    const tenantsMap = new Map((tenants || []).map(t => [t.id, t]))

    // Get unique room IDs and fetch room info (for images)
    const roomIds = [...new Set((bookings || []).map(b => b.room_id))]
    const { data: rooms } = await supabase
      .from('rooms')
      .select('id, name, images')
      .in('id', roomIds)

    const roomsMap = new Map((rooms || []).map(r => [r.id, r]))

    // Get reviews for all bookings to determine if user has left a review
    const bookingIds = (bookings || []).map(b => b.id)
    const { data: allReviews } = await supabase
      .from('reviews')
      .select('id, booking_id, rating')
      .in('booking_id', bookingIds)

    // Create a map of booking_id -> reviews
    const reviewsMap = new Map<string, any[]>()
    for (const review of (allReviews || [])) {
      const existing = reviewsMap.get(review.booking_id) || []
      existing.push(review)
      reviewsMap.set(review.booking_id, existing)
    }

    // Attach tenant, room, and reviews info to bookings
    const bookingsWithDetails = (bookings || []).map(b => ({
      ...b,
      tenants: tenantsMap.get(b.tenant_id) || null,
      room: roomsMap.get(b.room_id) || null,
      reviews: reviewsMap.get(b.id) || []
    }))

    res.json(bookingsWithDetails)
  } catch (error) {
    console.error('Error fetching bookings:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * Get single booking
 * GET /api/portal/bookings/:id
 */
router.get('/bookings/:id', requireCustomerAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const customerId = req.customerContext!.customerId
    const customerEmail = req.customerContext!.email

    // Get booking by id
    const { data: booking, error } = await supabase
      .from('bookings')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !booking) {
      console.error('Error fetching booking:', error)
      return res.status(404).json({ error: 'Booking not found' })
    }

    // Verify this booking belongs to the customer (by customer_id or email)
    const emailMatch = booking.guest_email?.toLowerCase() === customerEmail?.toLowerCase()
    const customerIdMatch = booking.customer_id === customerId

    if (!emailMatch && !customerIdMatch) {
      return res.status(404).json({ error: 'Booking not found' })
    }

    // Auto-link if not linked yet
    if (!booking.customer_id && emailMatch) {
      await supabase
        .from('bookings')
        .update({ customer_id: customerId })
        .eq('id', id)
      booking.customer_id = customerId
    }

    // Get tenant info
    const { data: tenant } = await supabase
      .from('tenants')
      .select('id, business_name, logo_url, business_email, business_phone')
      .eq('id', booking.tenant_id)
      .single()

    // Get room info with images
    const { data: room } = await supabase
      .from('rooms')
      .select('id, name, images')
      .eq('id', booking.room_id)
      .single()

    // Get reviews for this booking
    const { data: reviews } = await supabase
      .from('reviews')
      .select('id, rating, rating_cleanliness, rating_service, rating_location, rating_value, rating_safety, title, content, images, owner_response, owner_response_at, status, created_at')
      .eq('booking_id', id)

    // Get available addons for this booking's room
    const { data: addons } = await supabase
      .from('addons')
      .select('*')
      .eq('tenant_id', booking.tenant_id)
      .eq('is_active', true)

    res.json({
      ...booking,
      tenants: tenant,
      room: room || null,
      reviews: reviews || [],
      availableAddons: addons || [],
      canModifyAddons: canModifyBookingAddons(booking)
    })
  } catch (error) {
    console.error('Error fetching booking:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * Update booking add-ons
 * PUT /api/portal/bookings/:id/addons
 */
router.put('/bookings/:id/addons', requireCustomerAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const { addons } = req.body
    const customerId = req.customerContext!.customerId
    const customerEmail = req.customerContext!.email

    // Get the booking
    const { data: booking, error: fetchError } = await supabase
      .from('bookings')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError || !booking) {
      return res.status(404).json({ error: 'Booking not found' })
    }

    // Verify ownership
    const emailMatch = booking.guest_email?.toLowerCase() === customerEmail?.toLowerCase()
    const customerIdMatch = booking.customer_id === customerId
    if (!emailMatch && !customerIdMatch) {
      return res.status(404).json({ error: 'Booking not found' })
    }

    // Check if modifications are allowed
    if (!canModifyBookingAddons(booking)) {
      return res.status(400).json({
        error: 'Cannot modify add-ons',
        message: 'Add-ons can only be modified before check-in date'
      })
    }

    // Parse existing notes
    let notes = {}
    try {
      notes = booking.notes ? JSON.parse(booking.notes) : {}
    } catch {
      notes = {}
    }

    // Update addons in notes
    const updatedNotes = {
      ...notes,
      addons: addons || []
    }

    // Calculate new total (base amount + addons)
    // This is a simplified calculation - in production you'd recalculate properly
    let addonsTotal = 0
    if (addons && Array.isArray(addons)) {
      for (const addon of addons) {
        addonsTotal += (addon.total || 0)
      }
    }

    // Get the base amount (total minus old addons)
    let oldAddonsTotal = 0
    if (notes && (notes as any).addons && Array.isArray((notes as any).addons)) {
      for (const addon of (notes as any).addons) {
        oldAddonsTotal += (addon.total || 0)
      }
    }
    const baseAmount = booking.total_amount - oldAddonsTotal
    const newTotalAmount = baseAmount + addonsTotal

    // Update booking
    const { data: updatedBooking, error: updateError } = await supabase
      .from('bookings')
      .update({
        notes: JSON.stringify(updatedNotes),
        total_amount: newTotalAmount,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating booking:', updateError)
      return res.status(500).json({ error: 'Failed to update booking' })
    }

    res.json({
      success: true,
      booking: updatedBooking
    })
  } catch (error) {
    console.error('Error updating add-ons:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * Cancel booking
 * POST /api/portal/bookings/:id/cancel
 */
router.post('/bookings/:id/cancel', requireCustomerAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const customerId = req.customerContext!.customerId
    const customerEmail = req.customerContext!.email

    // Get the booking
    const { data: booking, error: fetchError } = await supabase
      .from('bookings')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError || !booking) {
      return res.status(404).json({ error: 'Booking not found' })
    }

    // Verify ownership
    const emailMatch = booking.guest_email?.toLowerCase() === customerEmail?.toLowerCase()
    const customerIdMatch = booking.customer_id === customerId
    if (!emailMatch && !customerIdMatch) {
      return res.status(404).json({ error: 'Booking not found' })
    }

    // Check if booking can be cancelled
    // Only pending or confirmed bookings can be cancelled
    // Also check if check-in date hasn't passed
    const checkInDate = new Date(booking.check_in)
    const now = new Date()

    if (['cancelled', 'checked_in', 'checked_out', 'completed'].includes(booking.status)) {
      return res.status(400).json({
        error: 'Cannot cancel booking',
        message: 'This booking cannot be cancelled in its current status.'
      })
    }

    if (checkInDate < now) {
      return res.status(400).json({
        error: 'Cannot cancel booking',
        message: 'Cannot cancel a booking after the check-in date has passed.'
      })
    }

    // Update booking status to cancelled
    const { data: updatedBooking, error: updateError } = await supabase
      .from('bookings')
      .update({
        status: 'cancelled',
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      console.error('Error cancelling booking:', updateError)
      return res.status(500).json({ error: 'Failed to cancel booking' })
    }

    // Notify staff about the cancellation
    console.log('[Portal] Sending cancellation notification for booking:', id)
    notifyBookingCancelled(
      booking.tenant_id,
      id,
      booking.guest_name || 'Guest',
      booking.room_name || 'Room'
    )

    res.json({
      success: true,
      booking: updatedBooking,
      message: 'Your reservation has been cancelled.'
    })
  } catch (error) {
    console.error('Error cancelling booking:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * Upload proof of payment for EFT/manual payments
 * POST /api/portal/bookings/:id/proof
 */
router.post('/bookings/:id/proof', requireCustomerAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const customerId = req.customerContext!.customerId
    const customerEmail = req.customerContext!.email
    const { filename, data } = req.body

    if (!filename || !data) {
      return res.status(400).json({ error: 'Filename and data are required' })
    }

    // Get the booking
    const { data: booking, error: fetchError } = await supabase
      .from('bookings')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError || !booking) {
      return res.status(404).json({ error: 'Booking not found' })
    }

    // Verify ownership
    const emailMatch = booking.guest_email?.toLowerCase() === customerEmail?.toLowerCase()
    const customerIdMatch = booking.customer_id === customerId
    if (!emailMatch && !customerIdMatch) {
      return res.status(404).json({ error: 'Booking not found' })
    }

    // Only allow upload for non-paid, non-online-payment bookings
    if (booking.payment_status === 'paid') {
      return res.status(400).json({ error: 'This booking is already paid' })
    }

    if (booking.payment_method === 'paystack' || booking.payment_method === 'paypal') {
      return res.status(400).json({ error: 'Cannot upload proof for online payments' })
    }

    // Create proof of payment object
    const proofOfPayment = {
      url: data, // Base64 data URL
      path: `proof/${id}/${Date.now()}-${filename}`,
      filename: filename,
      uploaded_at: new Date().toISOString()
    }

    // Update booking with proof of payment and mark as EFT payment
    const { error: updateError } = await supabase
      .from('bookings')
      .update({
        proof_of_payment: proofOfPayment,
        payment_method: booking.payment_method || 'eft'
      })
      .eq('id', id)

    if (updateError) {
      console.error('Error updating booking:', updateError)
      return res.status(500).json({ error: 'Failed to upload proof of payment' })
    }

    // Notify staff about the payment proof upload
    console.log('[Portal] Notifying staff about payment proof upload for booking:', id)
    notifyPaymentProofUploaded(
      booking.tenant_id,
      id,
      booking.guest_name || 'Guest',
      booking.total_amount || 0,
      booking.currency || 'ZAR'
    )

    res.json({
      success: true,
      message: 'Proof of payment uploaded successfully'
    })
  } catch (error) {
    console.error('Error uploading proof:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// ============================================
// REVIEWS ENDPOINTS
// ============================================

/**
 * Get customer's reviews
 * GET /api/portal/reviews
 */
router.get('/reviews', requireCustomerAuth, async (req: Request, res: Response) => {
  try {
    const customerId = req.customerContext!.customerId

    // Get all bookings
    const { data: bookings, error } = await supabase
      .from('bookings')
      .select('id, room_name, check_in, check_out, tenant_id')
      .eq('customer_id', customerId)
      .order('check_in', { ascending: false })

    if (error) {
      console.error('Error fetching reviews:', error)
      return res.status(500).json({ error: 'Failed to fetch reviews' })
    }

    if (!bookings || bookings.length === 0) {
      return res.json([])
    }

    // Get tenant info
    const tenantIds = [...new Set(bookings.map(b => b.tenant_id))]
    const { data: tenants } = await supabase
      .from('tenants')
      .select('id, business_name')
      .in('id', tenantIds)

    const tenantsMap = new Map((tenants || []).map(t => [t.id, t]))

    // Get reviews for all bookings
    const bookingIds = bookings.map(b => b.id)
    const { data: reviewsData } = await supabase
      .from('reviews')
      .select('id, booking_id, tenant_id, rating, rating_cleanliness, rating_service, rating_location, rating_value, rating_safety, title, content, images, owner_response, owner_response_at, status, created_at')
      .in('booking_id', bookingIds)

    // Create a map of reviews by booking_id
    const reviewsMap = new Map((reviewsData || []).map(r => [r.booking_id, r]))

    // Transform data to show reviews with booking context
    const reviews = bookings
      .filter(b => reviewsMap.has(b.id))
      .map(b => {
        const review = reviewsMap.get(b.id)!
        const tenant = tenantsMap.get(b.tenant_id)
        return {
          ...review,
          booking: {
            id: b.id,
            roomName: b.room_name,
            checkIn: b.check_in,
            checkOut: b.check_out,
            propertyName: tenant?.business_name || ''
          }
        }
      })

    res.json(reviews)
  } catch (error) {
    console.error('Error fetching reviews:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * Submit review for booking
 * POST /api/portal/bookings/:id/review
 */
router.post('/bookings/:id/review', requireCustomerAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const {
      rating_cleanliness,
      rating_service,
      rating_location,
      rating_value,
      rating_safety,
      title,
      content,
      images
    } = req.body
    const customerId = req.customerContext!.customerId
    const customerEmail = req.customerContext!.email
    const customerName = req.customerContext!.name

    // Validate all category ratings
    const categoryRatings = [rating_cleanliness, rating_service, rating_location, rating_value, rating_safety]
    for (const rating of categoryRatings) {
      if (rating === undefined || rating === null || rating < 1 || rating > 5) {
        return res.status(400).json({ error: 'All category ratings must be between 1 and 5' })
      }
    }

    // Calculate overall rating as average of categories (rounded to nearest integer for DB)
    const overallRating = Math.round((rating_cleanliness + rating_service + rating_location + rating_value + rating_safety) / 5)

    // Validate images if provided
    if (images && (!Array.isArray(images) || images.length > 4)) {
      return res.status(400).json({ error: 'Maximum 4 images allowed' })
    }

    // Get the booking
    const { data: booking, error: fetchError } = await supabase
      .from('bookings')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError || !booking) {
      return res.status(404).json({ error: 'Booking not found' })
    }

    // Verify ownership
    const emailMatch = booking.guest_email?.toLowerCase() === customerEmail?.toLowerCase()
    const customerIdMatch = booking.customer_id === customerId
    if (!emailMatch && !customerIdMatch) {
      return res.status(404).json({ error: 'Booking not found' })
    }

    // Check if booking is eligible for review (checked out and paid)
    if (!['checked_out', 'completed'].includes(booking.status)) {
      return res.status(400).json({
        error: 'Cannot leave review',
        message: 'Reviews can only be submitted after checkout'
      })
    }

    // Check if review already exists
    const { data: existingReview } = await supabase
      .from('reviews')
      .select('id')
      .eq('booking_id', id)
      .single()

    if (existingReview) {
      return res.status(400).json({
        error: 'Review already submitted',
        message: 'You have already reviewed this booking'
      })
    }

    // Prepare images array with hidden flag
    const processedImages = images?.map((img: { url: string; path: string }) => ({
      url: img.url,
      path: img.path,
      hidden: false
    })) || null

    // Create review with all fields
    const { data: review, error: createError } = await supabase
      .from('reviews')
      .insert({
        tenant_id: booking.tenant_id,
        booking_id: id,
        rating: overallRating,
        rating_cleanliness,
        rating_service,
        rating_location,
        rating_value,
        rating_safety,
        title: title || null,
        content: content || null,
        images: processedImages,
        guest_name: customerName || booking.guest_name || 'Guest',
        status: 'published'
      })
      .select()
      .single()

    if (createError) {
      console.error('Error creating review:', createError)
      return res.status(500).json({ error: 'Failed to create review' })
    }

    res.json({
      success: true,
      review
    })
  } catch (error) {
    console.error('Error submitting review:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * Get single review
 * GET /api/portal/reviews/:id
 */
router.get('/reviews/:id', requireCustomerAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const customerId = req.customerContext!.customerId

    // Get review
    const { data: review, error } = await supabase
      .from('reviews')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !review) {
      return res.status(404).json({ error: 'Review not found' })
    }

    // Get booking and verify it belongs to customer
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('id, room_name, check_in, check_out, customer_id, tenant_id')
      .eq('id', review.booking_id)
      .single()

    if (bookingError || !booking || booking.customer_id !== customerId) {
      return res.status(404).json({ error: 'Review not found' })
    }

    // Get tenant info
    const { data: tenant } = await supabase
      .from('tenants')
      .select('business_name')
      .eq('id', booking.tenant_id)
      .single()

    res.json({
      ...review,
      bookings: {
        ...booking,
        tenants: tenant
      }
    })
  } catch (error) {
    console.error('Error fetching review:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * Update customer's review
 * PUT /api/portal/reviews/:id
 * Only the customer who wrote the review can edit it
 */
router.put('/reviews/:id', requireCustomerAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const customerId = req.customerContext!.customerId
    const {
      rating,
      rating_cleanliness,
      rating_service,
      rating_location,
      rating_value,
      rating_safety,
      title,
      content,
      images
    } = req.body

    // If category ratings provided, validate them
    if (rating_cleanliness !== undefined) {
      const categoryRatings = [rating_cleanliness, rating_service, rating_location, rating_value, rating_safety]
      for (const catRating of categoryRatings) {
        if (catRating === undefined || catRating === null || catRating < 1 || catRating > 5) {
          return res.status(400).json({ error: 'All category ratings must be between 1 and 5' })
        }
      }
    }

    // Calculate overall rating from categories if provided, otherwise use provided rating
    let overallRating = rating
    if (rating_cleanliness !== undefined) {
      overallRating = Math.round((rating_cleanliness + rating_service + rating_location + rating_value + rating_safety) / 5)
    }

    // Validate overall rating
    if (overallRating === undefined || overallRating < 1 || overallRating > 5) {
      return res.status(400).json({ error: 'Rating must be between 1 and 5' })
    }

    // Validate images if provided
    if (images && (!Array.isArray(images) || images.length > 4)) {
      return res.status(400).json({ error: 'Maximum 4 images allowed' })
    }

    // Get review
    const { data: review, error } = await supabase
      .from('reviews')
      .select('*, bookings!inner(customer_id)')
      .eq('id', id)
      .single()

    if (error || !review) {
      return res.status(404).json({ error: 'Review not found' })
    }

    // Verify review belongs to this customer
    if (review.bookings.customer_id !== customerId) {
      return res.status(403).json({ error: 'You can only edit your own reviews' })
    }

    // Prepare images array with hidden flag
    const processedImages = images?.map((img: { url: string; path: string }) => ({
      url: img.url,
      path: img.path,
      hidden: false
    })) || null

    // Build update object
    const updateData: Record<string, any> = {
      rating: overallRating,
      title: title || null,
      content: content || null,
      updated_at: new Date().toISOString()
    }

    // Add category ratings if provided
    if (rating_cleanliness !== undefined) {
      updateData.rating_cleanliness = rating_cleanliness
      updateData.rating_service = rating_service
      updateData.rating_location = rating_location
      updateData.rating_value = rating_value
      updateData.rating_safety = rating_safety
    }

    // Add images if provided
    if (images !== undefined) {
      updateData.images = processedImages
    }

    // Update review
    const { data: updatedReview, error: updateError } = await supabase
      .from('reviews')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating review:', updateError)
      return res.status(500).json({ error: 'Failed to update review' })
    }

    // Get booking info for response
    const { data: booking } = await supabase
      .from('bookings')
      .select('id, room_name, check_in, check_out, tenant_id')
      .eq('id', updatedReview.booking_id)
      .single()

    const { data: tenant } = await supabase
      .from('tenants')
      .select('business_name')
      .eq('id', booking?.tenant_id)
      .single()

    res.json({
      id: updatedReview.id,
      rating: updatedReview.rating,
      title: updatedReview.title,
      content: updatedReview.content,
      status: updatedReview.status,
      owner_response: updatedReview.owner_response,
      owner_response_at: updatedReview.owner_response_at,
      created_at: updatedReview.created_at,
      updated_at: updatedReview.updated_at,
      booking: {
        id: booking?.id,
        roomName: booking?.room_name,
        propertyName: tenant?.business_name,
        checkIn: booking?.check_in,
        checkOut: booking?.check_out
      }
    })
  } catch (error) {
    console.error('Error updating review:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// ============================================
// SUPPORT ENDPOINTS
// ============================================

/**
 * Get customer's support tickets
 * GET /api/portal/support
 */
router.get('/support', requireCustomerAuth, async (req: Request, res: Response) => {
  try {
    const customerId = req.customerContext!.customerId

    // Get tickets
    const { data: tickets, error } = await supabase
      .from('support_messages')
      .select('*')
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching support tickets:', error)
      return res.status(500).json({ error: 'Failed to fetch support tickets' })
    }

    if (!tickets || tickets.length === 0) {
      return res.json([])
    }

    // Get tenant and booking info
    const tenantIds = [...new Set(tickets.map(t => t.tenant_id))]
    const bookingIds = tickets.filter(t => t.booking_id).map(t => t.booking_id)

    const [tenantsResult, bookingsResult] = await Promise.all([
      supabase.from('tenants').select('id, business_name').in('id', tenantIds),
      bookingIds.length > 0
        ? supabase.from('bookings').select('id, room_name, check_in, check_out').in('id', bookingIds)
        : { data: [] }
    ])

    const tenantsMap = new Map((tenantsResult.data || []).map(t => [t.id, t]))
    const bookingsMap = new Map((bookingsResult.data || []).map(b => [b.id, b]))

    // Attach tenant and booking info
    const ticketsWithRelations = tickets.map(t => ({
      ...t,
      tenants: tenantsMap.get(t.tenant_id) || null,
      bookings: t.booking_id ? bookingsMap.get(t.booking_id) || null : null
    }))

    res.json(ticketsWithRelations)
  } catch (error) {
    console.error('Error fetching support tickets:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * Create support ticket
 * POST /api/portal/support
 */
router.post('/support', requireCustomerAuth, async (req: Request, res: Response) => {
  try {
    const { tenantId, bookingId, subject, message } = req.body
    const customerId = req.customerContext!.customerId
    const customerEmail = req.customerContext!.email
    const customerName = req.customerContext!.name

    if (!tenantId || !subject || !message) {
      return res.status(400).json({ error: 'Property, subject, and message are required' })
    }

    // Verify customer has bookings with this tenant
    const { data: customerBookings } = await supabase
      .from('bookings')
      .select('id')
      .eq('customer_id', customerId)
      .eq('tenant_id', tenantId)
      .limit(1)

    if (!customerBookings || customerBookings.length === 0) {
      return res.status(403).json({ error: 'No bookings found with this property' })
    }

    // Create support ticket
    const { data: ticket, error } = await supabase
      .from('support_messages')
      .insert({
        tenant_id: tenantId,
        customer_id: customerId,
        booking_id: bookingId || null,
        subject,
        message,
        sender_email: customerEmail,
        sender_name: customerName || 'Customer',
        status: 'new'
      })
      .select('*')
      .single()

    if (error) {
      console.error('Error creating support ticket:', error)
      return res.status(500).json({ error: 'Failed to create support ticket' })
    }

    // Get tenant info
    const { data: tenant } = await supabase
      .from('tenants')
      .select('id, business_name')
      .eq('id', tenantId)
      .single()

    // Log activity
    logSupportTicketCreated(tenantId, customerEmail, customerId, ticket.id, subject)

    // Notify all team members about new support ticket
    notifyNewSupportTicket(
      tenantId,
      ticket.id,
      customerName || 'Customer',
      subject
    )

    res.json({
      success: true,
      ticket: {
        ...ticket,
        tenants: tenant
      }
    })
  } catch (error) {
    console.error('Error creating support ticket:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * Get support ticket with thread
 * GET /api/portal/support/:id
 */
router.get('/support/:id', requireCustomerAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const customerId = req.customerContext!.customerId

    // Get ticket
    const { data: ticket, error } = await supabase
      .from('support_messages')
      .select('*')
      .eq('id', id)
      .eq('customer_id', customerId)
      .single()

    if (error || !ticket) {
      return res.status(404).json({ error: 'Support ticket not found' })
    }

    // Get tenant info
    const { data: tenant } = await supabase
      .from('tenants')
      .select('id, business_name, slug')
      .eq('id', ticket.tenant_id)
      .single()

    // Get booking info if exists
    let booking = null
    if (ticket.booking_id) {
      const { data: bookingData } = await supabase
        .from('bookings')
        .select('id, room_name, check_in, check_out')
        .eq('id', ticket.booking_id)
        .single()
      booking = bookingData
    }

    // Get replies
    const { data: replies } = await supabase
      .from('support_replies')
      .select('id, content, sender_type, sender_name, created_at')
      .eq('message_id', id)
      .order('created_at', { ascending: true })

    res.json({
      ...ticket,
      tenants: tenant,
      bookings: booking,
      support_replies: replies || []
    })
  } catch (error) {
    console.error('Error fetching support ticket:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * Reply to support ticket
 * POST /api/portal/support/:id/reply
 */
router.post('/support/:id/reply', requireCustomerAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const { content } = req.body
    const customerId = req.customerContext!.customerId
    const customerName = req.customerContext!.name

    if (!content) {
      return res.status(400).json({ error: 'Content is required' })
    }

    // Verify ticket belongs to customer
    const { data: ticket, error: fetchError } = await supabase
      .from('support_messages')
      .select('id, status, tenant_id, subject')
      .eq('id', id)
      .eq('customer_id', customerId)
      .single()

    if (fetchError || !ticket) {
      return res.status(404).json({ error: 'Support ticket not found' })
    }

    // Check if ticket is closed
    if (ticket.status === 'closed') {
      return res.status(400).json({ error: 'Cannot reply to closed ticket' })
    }

    // Create reply
    const { data: reply, error: createError } = await supabase
      .from('support_replies')
      .insert({
        message_id: id,
        content,
        sender_type: 'customer',
        sender_id: customerId,
        sender_name: customerName || 'Customer'
      })
      .select()
      .single()

    if (createError) {
      console.error('Error creating reply:', createError)
      return res.status(500).json({ error: 'Failed to create reply' })
    }

    // Update ticket status to open if it was new or resolved
    if (['new', 'resolved'].includes(ticket.status)) {
      await supabase
        .from('support_messages')
        .update({
          status: 'open',
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
    }

    // Log activity
    const customerEmail = req.customerContext!.email
    logSupportTicketReplied(ticket.tenant_id, customerEmail, customerId, id, 'customer')

    // Notify all team members about customer reply
    notifyCustomerReplied(
      ticket.tenant_id,
      id,
      customerName || 'Customer'
    )

    res.json({
      success: true,
      reply
    })
  } catch (error) {
    console.error('Error creating reply:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// ============================================
// PROFILE ENDPOINTS
// ============================================

/**
 * Get customer profile
 * GET /api/portal/profile
 */
router.get('/profile', requireCustomerAuth, async (req: Request, res: Response) => {
  try {
    const customer = await getCustomerById(req.customerContext!.customerId)

    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' })
    }

    res.json({
      id: customer.id,
      email: customer.email,
      name: customer.name,
      phone: customer.phone,
      profilePictureUrl: customer.profile_picture_url || null,
      preferredLanguage: customer.preferred_language,
      marketingConsent: customer.marketing_consent,
      hasPassword: !!customer.password_hash,
      createdAt: customer.created_at,
      lastLoginAt: customer.last_login_at,
      // Business details
      businessName: customer.business_name || null,
      businessVatNumber: customer.business_vat_number || null,
      businessRegistrationNumber: customer.business_registration_number || null,
      businessAddressLine1: customer.business_address_line1 || null,
      businessAddressLine2: customer.business_address_line2 || null,
      businessCity: customer.business_city || null,
      businessPostalCode: customer.business_postal_code || null,
      businessCountry: customer.business_country || null,
      useBusinessDetailsOnInvoice: customer.use_business_details_on_invoice || false
    })
  } catch (error) {
    console.error('Error fetching profile:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * Update customer profile
 * PUT /api/portal/profile
 */
router.put('/profile', requireCustomerAuth, async (req: Request, res: Response) => {
  try {
    const {
      name,
      phone,
      preferredLanguage,
      marketingConsent,
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
    const customerId = req.customerContext!.customerId

    const updateData: any = {
      updated_at: new Date().toISOString()
    }

    // Personal details
    if (name !== undefined) updateData.name = name
    if (phone !== undefined) updateData.phone = phone
    if (preferredLanguage !== undefined) updateData.preferred_language = preferredLanguage
    if (marketingConsent !== undefined) updateData.marketing_consent = marketingConsent

    // Business details
    if (businessName !== undefined) updateData.business_name = businessName || null
    if (businessVatNumber !== undefined) updateData.business_vat_number = businessVatNumber || null
    if (businessRegistrationNumber !== undefined) updateData.business_registration_number = businessRegistrationNumber || null
    if (businessAddressLine1 !== undefined) updateData.business_address_line1 = businessAddressLine1 || null
    if (businessAddressLine2 !== undefined) updateData.business_address_line2 = businessAddressLine2 || null
    if (businessCity !== undefined) updateData.business_city = businessCity || null
    if (businessPostalCode !== undefined) updateData.business_postal_code = businessPostalCode || null
    if (businessCountry !== undefined) updateData.business_country = businessCountry || null
    if (useBusinessDetailsOnInvoice !== undefined) updateData.use_business_details_on_invoice = useBusinessDetailsOnInvoice

    const { data: customer, error } = await supabase
      .from('customers')
      .update(updateData)
      .eq('id', customerId)
      .select()
      .single()

    if (error) {
      console.error('Error updating profile:', error)
      return res.status(500).json({ error: 'Failed to update profile' })
    }

    // Log activity for each tenant the customer has bookings with
    const { data: tenantBookings } = await supabase
      .from('bookings')
      .select('tenant_id')
      .eq('customer_id', customerId)

    if (tenantBookings) {
      const uniqueTenantIds = [...new Set(tenantBookings.map(b => b.tenant_id))]
      // Collect which fields were updated
      const updatedFields: string[] = []
      if (name !== undefined) updatedFields.push('name')
      if (phone !== undefined) updatedFields.push('phone')
      if (preferredLanguage !== undefined) updatedFields.push('language')
      if (businessName !== undefined || businessVatNumber !== undefined ||
          businessRegistrationNumber !== undefined || businessAddressLine1 !== undefined ||
          businessCity !== undefined || businessCountry !== undefined) {
        updatedFields.push('business details')
      }

      for (const tenantId of uniqueTenantIds) {
        logProfileUpdated(tenantId, customer.email, customerId, updatedFields.length > 0 ? updatedFields : ['profile'])
      }
    }

    res.json({
      success: true,
      customer: {
        id: customer.id,
        email: customer.email,
        name: customer.name,
        phone: customer.phone,
        profilePictureUrl: customer.profile_picture_url || null,
        preferredLanguage: customer.preferred_language,
        marketingConsent: customer.marketing_consent,
        hasPassword: !!customer.password_hash,
        businessName: customer.business_name || null,
        businessVatNumber: customer.business_vat_number || null,
        businessRegistrationNumber: customer.business_registration_number || null,
        businessAddressLine1: customer.business_address_line1 || null,
        businessAddressLine2: customer.business_address_line2 || null,
        businessCity: customer.business_city || null,
        businessPostalCode: customer.business_postal_code || null,
        businessCountry: customer.business_country || null,
        useBusinessDetailsOnInvoice: customer.use_business_details_on_invoice || false
      }
    })
  } catch (error) {
    console.error('Error updating profile:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * Upload profile picture
 * POST /api/portal/profile/picture
 */
router.post('/profile/picture', requireCustomerAuth, async (req: Request, res: Response) => {
  try {
    const customerId = req.customerContext!.customerId
    const { image } = req.body

    if (!image) {
      return res.status(400).json({ error: 'Image data is required' })
    }

    // Parse base64 image data
    const matches = image.match(/^data:image\/(png|jpeg|jpg|gif|webp);base64,(.+)$/)
    if (!matches) {
      return res.status(400).json({ error: 'Invalid image format. Please provide a base64 encoded image.' })
    }

    const mimeType = `image/${matches[1]}`
    const base64Data = matches[2]
    const buffer = Buffer.from(base64Data, 'base64')

    // Check file size (max 5MB)
    if (buffer.length > 5 * 1024 * 1024) {
      return res.status(400).json({ error: 'Image too large. Maximum size is 5MB.' })
    }

    const ext = matches[1] === 'jpeg' ? 'jpg' : matches[1]
    const fileName = `customer-avatars/${customerId}/avatar.${ext}`

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('tenant-assets')
      .upload(fileName, buffer, {
        contentType: mimeType,
        upsert: true
      })

    if (uploadError) {
      console.error('Error uploading profile picture:', uploadError)
      return res.status(500).json({ error: 'Failed to upload profile picture' })
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('tenant-assets')
      .getPublicUrl(fileName)

    const profilePictureUrl = urlData.publicUrl

    // Update customer record with new profile picture URL
    const { data: customer, error: updateError } = await supabase
      .from('customers')
      .update({
        profile_picture_url: profilePictureUrl,
        updated_at: new Date().toISOString()
      })
      .eq('id', customerId)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating customer profile picture:', updateError)
      return res.status(500).json({ error: 'Failed to update profile' })
    }

    res.json({
      success: true,
      profilePictureUrl: customer.profile_picture_url
    })
  } catch (error) {
    console.error('Error uploading profile picture:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * Delete profile picture
 * DELETE /api/portal/profile/picture
 */
router.delete('/profile/picture', requireCustomerAuth, async (req: Request, res: Response) => {
  try {
    const customerId = req.customerContext!.customerId

    // Get current customer to find existing picture path
    const customer = await getCustomerById(customerId)
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' })
    }

    // Delete from storage if exists
    if (customer.profile_picture_url) {
      // Extract file path from URL
      const urlParts = customer.profile_picture_url.split('/tenant-assets/')
      if (urlParts.length > 1) {
        const filePath = urlParts[1]
        await supabase.storage
          .from('tenant-assets')
          .remove([filePath])
      }
    }

    // Update customer record
    const { error: updateError } = await supabase
      .from('customers')
      .update({
        profile_picture_url: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', customerId)

    if (updateError) {
      console.error('Error removing profile picture:', updateError)
      return res.status(500).json({ error: 'Failed to remove profile picture' })
    }

    res.json({ success: true })
  } catch (error) {
    console.error('Error deleting profile picture:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// ============================================
// BOOKING CREATION ENDPOINTS
// ============================================

/**
 * Get available rooms for a property
 * GET /api/portal/properties/:tenantId/rooms
 */
router.get('/properties/:tenantId/rooms', requireCustomerAuth, async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.params
    const { checkIn, checkOut } = req.query
    const customerId = req.customerContext!.customerId

    // Verify customer has bookings with this tenant
    const { data: customerBookings } = await supabase
      .from('bookings')
      .select('id')
      .eq('customer_id', customerId)
      .eq('tenant_id', tenantId)
      .limit(1)

    if (!customerBookings || customerBookings.length === 0) {
      return res.status(403).json({ error: 'No bookings found with this property' })
    }

    // Get all active rooms for this tenant
    const { data: rooms, error } = await supabase
      .from('rooms')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .order('name')

    if (error) {
      console.error('Error fetching rooms:', error)
      return res.status(500).json({ error: 'Failed to fetch rooms' })
    }

    // If dates provided, check availability
    if (checkIn && checkOut) {
      const { data: bookings } = await supabase
        .from('bookings')
        .select('room_id, check_in, check_out')
        .eq('tenant_id', tenantId)
        .in('status', ['pending', 'confirmed', 'checked_in'])
        .or(`check_in.lte.${checkOut},check_out.gte.${checkIn}`)

      const bookedRoomIds = new Set(
        (bookings || [])
          .filter(b => {
            const bCheckIn = new Date(b.check_in)
            const bCheckOut = new Date(b.check_out)
            const qCheckIn = new Date(checkIn as string)
            const qCheckOut = new Date(checkOut as string)
            return bCheckIn < qCheckOut && bCheckOut > qCheckIn
          })
          .map(b => b.room_id)
      )

      const availableRooms = (rooms || []).map(room => ({
        ...room,
        isAvailable: !bookedRoomIds.has(room.id)
      }))

      return res.json(availableRooms)
    }

    res.json(rooms || [])
  } catch (error) {
    console.error('Error fetching rooms:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * Get room pricing with seasonal rates
 * GET /api/portal/properties/:tenantId/rooms/:roomId/pricing
 */
router.get('/properties/:tenantId/rooms/:roomId/pricing', requireCustomerAuth, async (req: Request, res: Response) => {
  try {
    const { tenantId, roomId } = req.params
    const { checkIn, checkOut } = req.query
    const customerId = req.customerContext!.customerId

    if (!checkIn || !checkOut) {
      return res.status(400).json({ error: 'checkIn and checkOut dates required' })
    }

    // Verify customer has bookings with this tenant
    const { data: customerBookings } = await supabase
      .from('bookings')
      .select('id')
      .eq('customer_id', customerId)
      .eq('tenant_id', tenantId)
      .limit(1)

    if (!customerBookings || customerBookings.length === 0) {
      return res.status(403).json({ error: 'No bookings found with this property' })
    }

    // Get room base price
    const { data: room, error: roomError } = await supabase
      .from('rooms')
      .select('base_price_per_night, currency, name')
      .eq('id', roomId)
      .eq('tenant_id', tenantId)
      .single()

    if (roomError || !room) {
      return res.status(404).json({ error: 'Room not found' })
    }

    // Get all seasonal rates that overlap with the date range
    const { data: rates } = await supabase
      .from('seasonal_rates')
      .select('*')
      .eq('room_id', roomId)
      .eq('tenant_id', tenantId)
      .lte('start_date', checkOut)
      .gte('end_date', checkIn)
      .order('priority', { ascending: false })

    // Calculate prices for each night
    const nights: Array<{
      date: string
      price: number
      rate_name: string | null
    }> = []

    // Parse dates and work with date strings to avoid timezone issues
    const startDateStr = checkIn as string
    const endDateStr = checkOut as string
    let totalAmount = 0

    const currentDate = new Date(startDateStr + 'T12:00:00') // Use noon to avoid DST issues
    const endDate = new Date(endDateStr + 'T12:00:00')

    while (currentDate < endDate) {
      const year = currentDate.getFullYear()
      const month = String(currentDate.getMonth() + 1).padStart(2, '0')
      const day = String(currentDate.getDate()).padStart(2, '0')
      const dateStr = `${year}-${month}-${day}`

      // Compare date strings directly to avoid timezone issues
      const applicableRate = (rates || []).find(rate => {
        const rateStart = rate.start_date
        const rateEnd = rate.end_date
        return dateStr >= rateStart && dateStr <= rateEnd
      })

      const price = applicableRate ? Number(applicableRate.price_per_night) : room.base_price_per_night
      totalAmount += price

      nights.push({
        date: dateStr,
        price,
        rate_name: applicableRate?.name || null
      })

      currentDate.setDate(currentDate.getDate() + 1)
    }

    res.json({
      room_name: room.name,
      nights,
      subtotal: totalAmount,
      currency: room.currency,
      night_count: nights.length
    })
  } catch (error) {
    console.error('Error fetching room pricing:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * Get available add-ons for a property
 * GET /api/portal/properties/:tenantId/addons
 */
router.get('/properties/:tenantId/addons', requireCustomerAuth, async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.params
    const customerId = req.customerContext!.customerId

    // Verify customer has bookings with this tenant
    const { data: customerBookings } = await supabase
      .from('bookings')
      .select('id')
      .eq('customer_id', customerId)
      .eq('tenant_id', tenantId)
      .limit(1)

    if (!customerBookings || customerBookings.length === 0) {
      return res.status(403).json({ error: 'No bookings found with this property' })
    }

    // Get all active add-ons for this tenant
    const { data: addons, error } = await supabase
      .from('addons')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .order('name')

    if (error) {
      console.error('Error fetching addons:', error)
      return res.status(500).json({ error: 'Failed to fetch addons' })
    }

    res.json(addons || [])
  } catch (error) {
    console.error('Error fetching addons:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * Create a new booking as customer
 * POST /api/portal/bookings
 */
router.post('/bookings', requireCustomerAuth, async (req: Request, res: Response) => {
  try {
    const {
      tenantId,
      roomId,
      checkIn,
      checkOut,
      guests,
      adults,
      children,
      specialRequests,
      addons
    } = req.body

    const customerId = req.customerContext!.customerId
    const customerEmail = req.customerContext!.email
    const customerName = req.customerContext!.name
    const customerPhone = req.customerContext!.phone

    // Validate required fields
    if (!tenantId || !roomId || !checkIn || !checkOut) {
      return res.status(400).json({ error: 'Missing required fields: tenantId, roomId, checkIn, checkOut' })
    }

    // Verify customer has bookings with this tenant (returning customer)
    const { data: customerBookings } = await supabase
      .from('bookings')
      .select('id')
      .eq('customer_id', customerId)
      .eq('tenant_id', tenantId)
      .limit(1)

    if (!customerBookings || customerBookings.length === 0) {
      return res.status(403).json({ error: 'You can only book with properties you have previously stayed with' })
    }

    // Get room details
    const { data: room, error: roomError } = await supabase
      .from('rooms')
      .select('*')
      .eq('id', roomId)
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .single()

    if (roomError || !room) {
      return res.status(404).json({ error: 'Room not found or not available' })
    }

    // Check room availability
    const { data: conflictingBookings } = await supabase
      .from('bookings')
      .select('id')
      .eq('room_id', roomId)
      .in('status', ['pending', 'confirmed', 'checked_in'])
      .or(`and(check_in.lt.${checkOut},check_out.gt.${checkIn})`)

    if (conflictingBookings && conflictingBookings.length > 0) {
      return res.status(400).json({ error: 'Room is not available for selected dates' })
    }

    // Calculate pricing
    const checkInDate = new Date(checkIn)
    const checkOutDate = new Date(checkOut)
    const nights = Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24))

    if (nights <= 0) {
      return res.status(400).json({ error: 'Check-out must be after check-in' })
    }

    // Get seasonal rates that overlap with the booking dates
    const { data: seasonalRates } = await supabase
      .from('seasonal_rates')
      .select('*')
      .eq('room_id', roomId)
      .eq('tenant_id', tenantId)
      .lte('start_date', checkOut)
      .gte('end_date', checkIn)
      .order('priority', { ascending: false })

    // Calculate total by iterating through each night and applying seasonal rates
    const basePricePerNight = room.base_price_per_night || room.base_price || 0
    let baseTotal = 0
    const nightlyBreakdown: Array<{ date: string; price: number; rateName: string | null }> = []

    // Use noon to avoid DST issues
    const currentDate = new Date(checkIn + 'T12:00:00')
    const endDateForLoop = new Date(checkOut + 'T12:00:00')

    while (currentDate < endDateForLoop) {
      const year = currentDate.getFullYear()
      const month = String(currentDate.getMonth() + 1).padStart(2, '0')
      const day = String(currentDate.getDate()).padStart(2, '0')
      const dateStr = `${year}-${month}-${day}`

      // Compare date strings directly to avoid timezone issues
      const applicableRate = (seasonalRates || []).find(rate => {
        const rateStart = rate.start_date
        const rateEnd = rate.end_date
        return dateStr >= rateStart && dateStr <= rateEnd
      })

      const nightPrice = applicableRate ? Number(applicableRate.price_per_night) : basePricePerNight
      baseTotal += nightPrice
      nightlyBreakdown.push({
        date: dateStr,
        price: nightPrice,
        rateName: applicableRate?.name || null
      })

      currentDate.setDate(currentDate.getDate() + 1)
    }

    // Calculate add-ons total
    let addonsTotal = 0
    const processedAddons: any[] = []

    if (addons && Array.isArray(addons)) {
      for (const addon of addons) {
        const addonTotal = (addon.price || 0) * (addon.quantity || 1)
        addonsTotal += addonTotal
        processedAddons.push({
          id: addon.id,
          name: addon.name,
          price: addon.price,
          quantity: addon.quantity || 1,
          total: addonTotal
        })
      }
    }

    const totalAmount = baseTotal + addonsTotal

    // Get tenant's default currency
    const { data: tenant } = await supabase
      .from('tenants')
      .select('currency')
      .eq('id', tenantId)
      .single()

    const currency = tenant?.currency || 'ZAR'

    // Create booking notes
    const notes = JSON.stringify({
      guests: guests || 1,
      adults: adults || 1,
      children: children || 0,
      special_requests: specialRequests || '',
      addons: processedAddons,
      bookedVia: 'customer_portal'
    })

    // Create booking
    const { data: booking, error: createError } = await supabase
      .from('bookings')
      .insert({
        tenant_id: tenantId,
        customer_id: customerId,
        room_id: roomId,
        room_name: room.name,
        guest_name: customerName || 'Guest',
        guest_email: customerEmail,
        guest_phone: customerPhone || null,
        check_in: checkIn,
        check_out: checkOut,
        status: 'pending',
        payment_status: 'pending',
        total_amount: totalAmount,
        currency,
        notes
      })
      .select('*')
      .single()

    if (createError) {
      console.error('Error creating booking:', createError)
      return res.status(500).json({ error: 'Failed to create booking' })
    }

    // Send notifications
    console.log('[Portal] Sending notifications for new booking:', booking.id)

    // Notify staff about the new booking
    notifyNewBooking(
      tenantId,
      booking.id,
      customerName || 'Guest',
      room.name
    )

    // Notify the customer about their booking confirmation
    notifyCustomerBookingConfirmed(
      tenantId,
      customerId,
      booking.id,
      room.name,
      checkIn
    )

    // Get tenant info
    const { data: tenantInfo } = await supabase
      .from('tenants')
      .select('id, business_name, logo_url')
      .eq('id', tenantId)
      .single()

    res.json({
      success: true,
      booking: {
        ...booking,
        tenants: tenantInfo
      },
      summary: {
        nights,
        nightlyBreakdown,
        baseTotal,
        addonsTotal,
        totalAmount,
        currency
      }
    })
  } catch (error) {
    console.error('Error creating booking:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// ============================================
// INVOICE ENDPOINTS
// ============================================

/**
 * Get invoice for a booking
 * GET /api/portal/bookings/:id/invoice
 */
router.get('/bookings/:id/invoice', requireCustomerAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const customerId = req.customerContext!.customerId
    const customerEmail = req.customerContext!.email

    // Get the booking
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('id, tenant_id, customer_id, guest_email, payment_status')
      .eq('id', id)
      .single()

    if (bookingError || !booking) {
      return res.status(404).json({ error: 'Booking not found' })
    }

    // Verify ownership
    const emailMatch = booking.guest_email?.toLowerCase() === customerEmail?.toLowerCase()
    const customerIdMatch = booking.customer_id === customerId
    if (!emailMatch && !customerIdMatch) {
      return res.status(404).json({ error: 'Booking not found' })
    }

    // Get invoice for this booking
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select('*')
      .eq('booking_id', id)
      .eq('tenant_id', booking.tenant_id)
      .single()

    if (invoiceError || !invoice) {
      return res.status(404).json({ error: 'Invoice not found', message: 'No invoice has been generated for this booking yet' })
    }

    res.json(invoice)
  } catch (error) {
    console.error('Error fetching invoice:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * Download invoice PDF for a booking
 * GET /api/portal/bookings/:id/invoice/download
 */
router.get('/bookings/:id/invoice/download', requireCustomerAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const customerId = req.customerContext!.customerId
    const customerEmail = req.customerContext!.email

    // Get the booking
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('id, tenant_id, customer_id, guest_email')
      .eq('id', id)
      .single()

    if (bookingError || !booking) {
      return res.status(404).json({ error: 'Booking not found' })
    }

    // Verify ownership
    const emailMatch = booking.guest_email?.toLowerCase() === customerEmail?.toLowerCase()
    const customerIdMatch = booking.customer_id === customerId
    if (!emailMatch && !customerIdMatch) {
      return res.status(404).json({ error: 'Booking not found' })
    }

    // Get invoice for this booking
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select('*')
      .eq('booking_id', id)
      .eq('tenant_id', booking.tenant_id)
      .single()

    if (invoiceError || !invoice) {
      return res.status(404).json({ error: 'Invoice not found' })
    }

    // Import PDF generator dynamically
    const { generateInvoicePDF } = await import('../services/pdfGenerator.js')

    // Generate PDF from stored invoice data
    const pdfBuffer = await generateInvoicePDF(invoice.invoice_data)

    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `attachment; filename="${invoice.invoice_number}.pdf"`)
    res.setHeader('Content-Length', pdfBuffer.length)
    res.send(pdfBuffer)
  } catch (error) {
    console.error('Error downloading invoice:', error)
    res.status(500).json({ error: 'Failed to download invoice' })
  }
})

/**
 * Get customer's properties (tenants they have bookings with)
 * GET /api/portal/properties
 */
router.get('/properties', requireCustomerAuth, async (req: Request, res: Response) => {
  try {
    const customerId = req.customerContext!.customerId

    // Get unique tenant IDs from customer's bookings
    const { data: bookings, error } = await supabase
      .from('bookings')
      .select('tenant_id')
      .eq('customer_id', customerId)

    if (error) {
      console.error('Error fetching properties:', error)
      return res.status(500).json({ error: 'Failed to fetch properties' })
    }

    // Get unique tenant IDs
    const tenantIds = [...new Set((bookings || []).map(b => b.tenant_id))]

    if (tenantIds.length === 0) {
      return res.json([])
    }

    // Get tenant details
    const { data: tenants } = await supabase
      .from('tenants')
      .select('id, business_name, logo_url, business_email, business_phone')
      .in('id', tenantIds)

    res.json(tenants || [])
  } catch (error) {
    console.error('Error fetching properties:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// ============================================
// NOTIFICATION ENDPOINTS
// ============================================

/**
 * Get notifications for customer
 * GET /api/portal/notifications
 */
router.get('/notifications', requireCustomerAuth, async (req: Request, res: Response) => {
  try {
    const { limit = '20', offset = '0', unread_only } = req.query
    const customerId = req.customerContext!.customerId

    // Pass null for tenantId - customers can see notifications from all tenants
    const result = await getNotifications(null, undefined, customerId, {
      limit: parseInt(limit as string),
      offset: parseInt(offset as string),
      unreadOnly: unread_only === 'true'
    })

    res.json(result)
  } catch (error: any) {
    console.error('Error fetching customer notifications:', error)
    res.status(500).json({ error: 'Failed to fetch notifications', details: error.message })
  }
})

/**
 * Get unread notification count
 * GET /api/portal/notifications/unread-count
 */
router.get('/notifications/unread-count', requireCustomerAuth, async (req: Request, res: Response) => {
  try {
    const customerId = req.customerContext!.customerId

    // Pass null for tenantId - customers can see notifications from all tenants
    const count = await getUnreadCount(null, undefined, customerId)
    res.json({ count })
  } catch (error: any) {
    console.error('Error fetching unread count:', error)
    res.status(500).json({ error: 'Failed to fetch unread count', details: error.message })
  }
})

/**
 * Mark notification as read
 * POST /api/portal/notifications/:id/read
 */
router.post('/notifications/:id/read', requireCustomerAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const customerId = req.customerContext!.customerId

    // Pass null for tenantId - mark notification by customer only
    const success = await markAsRead(id, null, undefined, customerId)
    if (!success) {
      return res.status(404).json({ error: 'Notification not found' })
    }

    res.json({ success: true })
  } catch (error: any) {
    console.error('Error marking notification as read:', error)
    res.status(500).json({ error: 'Failed to mark as read', details: error.message })
  }
})

/**
 * Mark all notifications as read
 * POST /api/portal/notifications/read-all
 */
router.post('/notifications/read-all', requireCustomerAuth, async (req: Request, res: Response) => {
  try {
    const customerId = req.customerContext!.customerId

    // Pass null for tenantId - mark all customer's notifications as read
    const success = await markAllAsRead(null, undefined, customerId)
    res.json({ success })
  } catch (error: any) {
    console.error('Error marking all as read:', error)
    res.status(500).json({ error: 'Failed to mark all as read', details: error.message })
  }
})

/**
 * Get notification preferences
 * GET /api/portal/notifications/preferences
 * Note: Returns default preferences for customers (preferences are per-tenant and not exposed in portal)
 */
router.get('/notifications/preferences', requireCustomerAuth, async (req: Request, res: Response) => {
  try {
    // Customers always get default preferences - full preferences are per-tenant
    const preferences = await getPreferences(null, undefined, req.customerContext!.customerId)
    res.json(preferences)
  } catch (error: any) {
    console.error('Error fetching preferences:', error)
    res.status(500).json({ error: 'Failed to fetch preferences', details: error.message })
  }
})

/**
 * Update notification preferences
 * PUT /api/portal/notifications/preferences
 * Note: Not supported for customers in portal (preferences are per-tenant)
 */
router.put('/notifications/preferences', requireCustomerAuth, async (_req: Request, res: Response) => {
  // Customers cannot update preferences from the portal - they don't have a tenant context
  // Preferences are managed per-tenant and would require tenant selection
  res.status(501).json({ error: 'Notification preferences are not customizable in the customer portal' })
})

export default router

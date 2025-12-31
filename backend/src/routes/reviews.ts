import { Router } from 'express'
import { supabase } from '../lib/supabase.js'

const router = Router()

// ============================================
// ADMIN ROUTES (require tenant_id header)
// ============================================

// Get all reviews for a tenant
router.get('/', async (req, res) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string

    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID required' })
    }

    const { status, room_id, rating, source, sort } = req.query

    let query = supabase
      .from('reviews')
      .select(`
        *,
        bookings!inner (
          id,
          guest_name,
          guest_email,
          room_id,
          room_name,
          check_in,
          check_out
        )
      `)
      .eq('tenant_id', tenantId)

    // Filter by status
    if (status && status !== 'all') {
      query = query.eq('status', status)
    }

    // Filter by rating
    if (rating) {
      query = query.eq('rating', Number(rating))
    }

    // Filter by source (FOB)
    if (source && typeof source === 'string') {
      query = query.eq('source', source)
    }

    // Sort
    if (sort === 'oldest') {
      query = query.order('created_at', { ascending: true })
    } else if (sort === 'highest') {
      query = query.order('rating', { ascending: false })
    } else if (sort === 'lowest') {
      query = query.order('rating', { ascending: true })
    } else {
      query = query.order('created_at', { ascending: false })
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching reviews:', error)
      return res.status(500).json({ error: 'Failed to fetch reviews', details: error.message })
    }

    // If room_id filter is provided, filter in memory
    let filteredData = data || []
    if (room_id) {
      filteredData = filteredData.filter((r: any) => r.bookings?.room_id === room_id)
    }

    res.json(filteredData)
  } catch (error: any) {
    console.error('Unexpected error:', error)
    res.status(500).json({ error: 'Internal server error', details: error.message })
  }
})

// Get review statistics for tenant
// NOTE: ALL reviews count toward rating (including hidden ones) for fair rating system
router.get('/stats', async (req, res) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string

    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID required' })
    }

    // Get ALL reviews - hidden reviews still count toward rating for fairness
    const { data: reviews, error } = await supabase
      .from('reviews')
      .select('rating, status, rating_cleanliness, rating_service, rating_location, rating_value, rating_safety')
      .eq('tenant_id', tenantId)

    if (error) {
      console.error('Error fetching review stats:', error)
      return res.status(500).json({ error: 'Failed to fetch review stats' })
    }

    const totalReviews = reviews?.length || 0
    const averageRating = totalReviews > 0
      ? reviews!.reduce((sum, r) => sum + r.rating, 0) / totalReviews
      : 0

    // Calculate category averages (only from reviews that have category ratings)
    const reviewsWithCategories = reviews?.filter(r =>
      r.rating_cleanliness != null &&
      r.rating_service != null &&
      r.rating_location != null &&
      r.rating_value != null &&
      r.rating_safety != null
    ) || []

    const categoryCount = reviewsWithCategories.length
    const avgCleanliness = categoryCount > 0
      ? reviewsWithCategories.reduce((sum, r) => sum + (r.rating_cleanliness || 0), 0) / categoryCount
      : null
    const avgService = categoryCount > 0
      ? reviewsWithCategories.reduce((sum, r) => sum + (r.rating_service || 0), 0) / categoryCount
      : null
    const avgLocation = categoryCount > 0
      ? reviewsWithCategories.reduce((sum, r) => sum + (r.rating_location || 0), 0) / categoryCount
      : null
    const avgValue = categoryCount > 0
      ? reviewsWithCategories.reduce((sum, r) => sum + (r.rating_value || 0), 0) / categoryCount
      : null
    const avgSafety = categoryCount > 0
      ? reviewsWithCategories.reduce((sum, r) => sum + (r.rating_safety || 0), 0) / categoryCount
      : null

    // Count by rating (all reviews count)
    const ratingCounts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
    reviews?.forEach(r => {
      ratingCounts[r.rating as keyof typeof ratingCounts]++
    })

    // Count visible vs hidden
    const publishedCount = reviews?.filter(r => r.status === 'published').length || 0
    const hiddenCount = reviews?.filter(r => r.status === 'hidden' || r.status === 'flagged').length || 0

    res.json({
      total_reviews: totalReviews,
      published_reviews: publishedCount,
      hidden_reviews: hiddenCount,
      average_rating: Math.round(averageRating * 10) / 10,
      average_cleanliness: avgCleanliness !== null ? Math.round(avgCleanliness * 10) / 10 : null,
      average_service: avgService !== null ? Math.round(avgService * 10) / 10 : null,
      average_location: avgLocation !== null ? Math.round(avgLocation * 10) / 10 : null,
      average_value: avgValue !== null ? Math.round(avgValue * 10) / 10 : null,
      average_safety: avgSafety !== null ? Math.round(avgSafety * 10) / 10 : null,
      rating_distribution: ratingCounts
    })
  } catch (error: any) {
    console.error('Unexpected error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Get single review
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const tenantId = req.headers['x-tenant-id'] as string

    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID required' })
    }

    const { data, error } = await supabase
      .from('reviews')
      .select(`
        *,
        bookings!inner (
          id,
          guest_name,
          guest_email,
          room_id,
          room_name,
          check_in,
          check_out
        )
      `)
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: 'Review not found' })
      }
      return res.status(500).json({ error: 'Failed to fetch review' })
    }

    res.json(data)
  } catch (error: any) {
    console.error('Unexpected error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Get review by booking ID
router.get('/booking/:bookingId', async (req, res) => {
  try {
    const { bookingId } = req.params
    const tenantId = req.headers['x-tenant-id'] as string

    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID required' })
    }

    const { data, error } = await supabase
      .from('reviews')
      .select('*')
      .eq('booking_id', bookingId)
      .eq('tenant_id', tenantId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: 'Review not found', hasReview: false })
      }
      return res.status(500).json({ error: 'Failed to fetch review' })
    }

    res.json({ ...data, hasReview: true })
  } catch (error: any) {
    console.error('Unexpected error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Update review (owner response, status, and image moderation - cannot edit guest content)
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const tenantId = req.headers['x-tenant-id'] as string
    const { owner_response, status, images } = req.body

    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID required' })
    }

    // Only allow updating owner_response, status, and images (for moderation)
    const updateData: any = {}

    if (owner_response !== undefined) {
      updateData.owner_response = owner_response
      updateData.owner_response_at = owner_response ? new Date().toISOString() : null
    }

    if (status !== undefined) {
      if (!['published', 'hidden', 'flagged'].includes(status)) {
        return res.status(400).json({ error: 'Invalid status' })
      }
      updateData.status = status
    }

    // Allow updating images for moderation (hiding inappropriate images)
    if (images !== undefined) {
      if (!Array.isArray(images)) {
        return res.status(400).json({ error: 'Images must be an array' })
      }
      // Validate image structure
      for (const img of images) {
        if (!img.url || !img.path) {
          return res.status(400).json({ error: 'Each image must have url and path' })
        }
      }
      updateData.images = images
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' })
    }

    const { data, error } = await supabase
      .from('reviews')
      .update(updateData)
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .select()
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: 'Review not found' })
      }
      console.error('Error updating review:', error)
      return res.status(500).json({ error: 'Failed to update review' })
    }

    res.json(data)
  } catch (error: any) {
    console.error('Unexpected error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Delete review
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const tenantId = req.headers['x-tenant-id'] as string

    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID required' })
    }

    const { error } = await supabase
      .from('reviews')
      .delete()
      .eq('id', id)
      .eq('tenant_id', tenantId)

    if (error) {
      console.error('Error deleting review:', error)
      return res.status(500).json({ error: 'Failed to delete review' })
    }

    res.status(204).send()
  } catch (error: any) {
    console.error('Unexpected error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Send review request to guest
router.post('/send-request/:bookingId', async (req, res) => {
  try {
    const { bookingId } = req.params
    const tenantId = req.headers['x-tenant-id'] as string

    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID required' })
    }

    // Get booking details
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('*')
      .eq('id', bookingId)
      .eq('tenant_id', tenantId)
      .single()

    if (bookingError || !booking) {
      return res.status(404).json({ error: 'Booking not found' })
    }

    // Check if booking is eligible for review
    if (!['checked_out', 'completed'].includes(booking.status)) {
      return res.status(400).json({ error: 'Booking must be checked out or completed to request review' })
    }

    if (booking.payment_status !== 'paid') {
      return res.status(400).json({ error: 'Booking must be paid to request review' })
    }

    if (!booking.guest_email) {
      return res.status(400).json({ error: 'Booking has no email address' })
    }

    // Check if review already exists
    const { data: existingReview } = await supabase
      .from('reviews')
      .select('id')
      .eq('booking_id', bookingId)
      .single()

    if (existingReview) {
      return res.status(400).json({ error: 'Review already exists for this booking' })
    }

    // Generate or get review token
    let reviewToken = booking.review_token
    if (!reviewToken) {
      reviewToken = crypto.randomUUID()
      await supabase
        .from('bookings')
        .update({ review_token: reviewToken })
        .eq('id', bookingId)
    }

    // Get tenant info
    const { data: tenant } = await supabase
      .from('tenants')
      .select('name')
      .eq('id', tenantId)
      .single()

    const propertyName = tenant?.name || 'Our Property'

    // Log email (in production, send actual email)
    console.log('='.repeat(50))
    console.log('REVIEW REQUEST EMAIL')
    console.log('='.repeat(50))
    console.log(`To: ${booking.guest_email}`)
    console.log(`Subject: How was your stay at ${propertyName}?`)
    console.log('')
    console.log(`Dear ${booking.guest_name},`)
    console.log('')
    console.log(`Thank you for staying at ${propertyName}!`)
    console.log('')
    console.log('We would love to hear about your experience.')
    console.log('Please take a moment to leave us a review:')
    console.log('')
    console.log(`Review Link: ${process.env.FRONTEND_URL || 'http://localhost:5173'}/review/${tenantId}/${reviewToken}`)
    console.log('')
    console.log('Your feedback helps us improve and helps other travelers make their booking decisions.')
    console.log('')
    console.log('Thank you!')
    console.log('='.repeat(50))

    // Update booking to mark review request as sent
    await supabase
      .from('bookings')
      .update({ review_request_sent: true })
      .eq('id', bookingId)

    res.json({
      success: true,
      message: `Review request sent to ${booking.guest_email}`,
      reviewUrl: `/review/${tenantId}/${reviewToken}`
    })
  } catch (error: any) {
    console.error('Error sending review request:', error)
    res.status(500).json({ error: 'Failed to send review request' })
  }
})

// ============================================
// PUBLIC ROUTES (no auth required)
// ============================================

// Get room reviews by room_code (public) - MUST be before :roomId route
router.get('/public/:tenantId/room/by-code/:roomCode', async (req, res) => {
  try {
    const { tenantId, roomCode } = req.params

    // First, find the room by room_code
    const { data: room, error: roomError } = await supabase
      .from('rooms')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('room_code', roomCode)
      .eq('is_active', true)
      .single()

    if (roomError || !room) {
      return res.json([]) // Return empty array if room not found
    }

    const { data, error } = await supabase
      .from('reviews')
      .select(`
        id,
        rating,
        rating_cleanliness,
        rating_service,
        rating_location,
        rating_value,
        rating_safety,
        title,
        content,
        guest_name,
        owner_response,
        owner_response_at,
        created_at,
        images,
        bookings!inner (
          room_id,
          room_name,
          check_in,
          check_out
        )
      `)
      .eq('tenant_id', tenantId)
      .eq('status', 'published')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching room reviews:', error)
      return res.status(500).json({ error: 'Failed to fetch reviews' })
    }

    // Filter by room_id and filter out hidden images
    const roomReviews = (data || [])
      .filter((r: any) => r.bookings?.room_id === room.id)
      .map((review: any) => ({
        ...review,
        images: (review.images || []).filter((img: any) => !img.hidden)
      }))

    res.json(roomReviews)
  } catch (error: any) {
    console.error('Unexpected error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Get room reviews (public) - by room UUID
router.get('/public/:tenantId/room/:roomId', async (req, res) => {
  try {
    const { tenantId, roomId } = req.params

    const { data, error } = await supabase
      .from('reviews')
      .select(`
        id,
        rating,
        rating_cleanliness,
        rating_service,
        rating_location,
        rating_value,
        rating_safety,
        title,
        content,
        guest_name,
        owner_response,
        owner_response_at,
        created_at,
        images,
        bookings!inner (
          room_id,
          room_name,
          check_in,
          check_out
        )
      `)
      .eq('tenant_id', tenantId)
      .eq('status', 'published')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching room reviews:', error)
      return res.status(500).json({ error: 'Failed to fetch reviews' })
    }

    // Filter by room_id and filter out hidden images
    const roomReviews = (data || [])
      .filter((r: any) => r.bookings?.room_id === roomId)
      .map((review: any) => ({
        ...review,
        images: (review.images || []).filter((img: any) => !img.hidden)
      }))

    res.json(roomReviews)
  } catch (error: any) {
    console.error('Unexpected error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Get property reviews (public)
router.get('/public/:tenantId', async (req, res) => {
  try {
    const { tenantId } = req.params
    const { limit } = req.query

    let query = supabase
      .from('reviews')
      .select(`
        id,
        rating,
        rating_cleanliness,
        rating_service,
        rating_location,
        rating_value,
        rating_safety,
        title,
        content,
        guest_name,
        owner_response,
        owner_response_at,
        created_at,
        images,
        bookings!inner (
          room_id,
          room_name,
          check_in,
          check_out
        )
      `)
      .eq('tenant_id', tenantId)
      .eq('status', 'published')
      .order('created_at', { ascending: false })

    if (limit) {
      query = query.limit(Number(limit))
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching property reviews:', error)
      return res.status(500).json({ error: 'Failed to fetch reviews' })
    }

    // Filter out hidden images for public display
    const reviews = (data || []).map((review: any) => ({
      ...review,
      images: (review.images || []).filter((img: any) => !img.hidden)
    }))

    res.json(reviews)
  } catch (error: any) {
    console.error('Unexpected error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Get property review stats (public)
// NOTE: ALL reviews count toward rating (including hidden ones) for fair rating system
router.get('/public/:tenantId/stats', async (req, res) => {
  try {
    const { tenantId } = req.params

    // Get ALL reviews - hidden reviews still count toward rating for fairness
    const { data: reviews, error } = await supabase
      .from('reviews')
      .select('rating, status, rating_cleanliness, rating_service, rating_location, rating_value, rating_safety')
      .eq('tenant_id', tenantId)

    if (error) {
      console.error('Error fetching review stats:', error)
      return res.status(500).json({ error: 'Failed to fetch review stats' })
    }

    // All reviews count toward rating (fair system - can't hide bad ratings)
    const totalReviews = reviews?.length || 0
    const averageRating = totalReviews > 0
      ? reviews!.reduce((sum, r) => sum + r.rating, 0) / totalReviews
      : 0

    // Calculate category averages (only from reviews that have category ratings)
    const reviewsWithCategories = reviews?.filter(r =>
      r.rating_cleanliness != null &&
      r.rating_service != null &&
      r.rating_location != null &&
      r.rating_value != null &&
      r.rating_safety != null
    ) || []

    const categoryCount = reviewsWithCategories.length
    const avgCleanliness = categoryCount > 0
      ? reviewsWithCategories.reduce((sum, r) => sum + (r.rating_cleanliness || 0), 0) / categoryCount
      : null
    const avgService = categoryCount > 0
      ? reviewsWithCategories.reduce((sum, r) => sum + (r.rating_service || 0), 0) / categoryCount
      : null
    const avgLocation = categoryCount > 0
      ? reviewsWithCategories.reduce((sum, r) => sum + (r.rating_location || 0), 0) / categoryCount
      : null
    const avgValue = categoryCount > 0
      ? reviewsWithCategories.reduce((sum, r) => sum + (r.rating_value || 0), 0) / categoryCount
      : null
    const avgSafety = categoryCount > 0
      ? reviewsWithCategories.reduce((sum, r) => sum + (r.rating_safety || 0), 0) / categoryCount
      : null

    // Only count published for "visible reviews" display
    const visibleReviews = reviews?.filter(r => r.status === 'published').length || 0

    res.json({
      total_reviews: totalReviews,
      visible_reviews: visibleReviews,
      average_rating: Math.round(averageRating * 10) / 10,
      average_cleanliness: avgCleanliness !== null ? Math.round(avgCleanliness * 10) / 10 : null,
      average_service: avgService !== null ? Math.round(avgService * 10) / 10 : null,
      average_location: avgLocation !== null ? Math.round(avgLocation * 10) / 10 : null,
      average_value: avgValue !== null ? Math.round(avgValue * 10) / 10 : null,
      average_safety: avgSafety !== null ? Math.round(avgSafety * 10) / 10 : null
    })
  } catch (error: any) {
    console.error('Unexpected error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Get room review stats by room_code (public) - MUST be before :roomId route
router.get('/public/:tenantId/room/by-code/:roomCode/stats', async (req, res) => {
  try {
    const { tenantId, roomCode } = req.params

    // First, find the room by room_code
    const { data: room, error: roomError } = await supabase
      .from('rooms')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('room_code', roomCode)
      .eq('is_active', true)
      .single()

    if (roomError || !room) {
      return res.json({ total_reviews: 0, visible_reviews: 0, average_rating: 0 })
    }

    // Get ALL reviews - hidden reviews still count toward rating for fairness
    const { data: reviews, error } = await supabase
      .from('reviews')
      .select(`
        rating,
        status,
        bookings!inner (room_id)
      `)
      .eq('tenant_id', tenantId)

    if (error) {
      console.error('Error fetching room review stats:', error)
      return res.status(500).json({ error: 'Failed to fetch review stats' })
    }

    // Filter by room_id
    const roomReviews = (reviews || []).filter((r: any) => r.bookings?.room_id === room.id)

    // All reviews count toward rating (fair system)
    const totalReviews = roomReviews.length
    const averageRating = totalReviews > 0
      ? roomReviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews
      : 0

    // Only count published for "visible reviews" display
    const visibleReviews = roomReviews.filter((r: any) => r.status === 'published').length

    res.json({
      total_reviews: totalReviews,
      visible_reviews: visibleReviews,
      average_rating: Math.round(averageRating * 10) / 10
    })
  } catch (error: any) {
    console.error('Unexpected error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Get room review stats (public) - by room UUID
// NOTE: ALL reviews count toward rating (including hidden ones) for fair rating system
router.get('/public/:tenantId/room/:roomId/stats', async (req, res) => {
  try {
    const { tenantId, roomId } = req.params

    // Get ALL reviews - hidden reviews still count toward rating for fairness
    const { data: reviews, error } = await supabase
      .from('reviews')
      .select(`
        rating,
        status,
        bookings!inner (room_id)
      `)
      .eq('tenant_id', tenantId)

    if (error) {
      console.error('Error fetching room review stats:', error)
      return res.status(500).json({ error: 'Failed to fetch review stats' })
    }

    // Filter by room_id
    const roomReviews = (reviews || []).filter((r: any) => r.bookings?.room_id === roomId)

    // All reviews count toward rating (fair system)
    const totalReviews = roomReviews.length
    const averageRating = totalReviews > 0
      ? roomReviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews
      : 0

    // Only count published for "visible reviews" display
    const visibleReviews = roomReviews.filter((r: any) => r.status === 'published').length

    res.json({
      total_reviews: totalReviews,
      visible_reviews: visibleReviews,
      average_rating: Math.round(averageRating * 10) / 10
    })
  } catch (error: any) {
    console.error('Unexpected error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Verify review token and get booking info
router.get('/public/verify/:tenantId/:token', async (req, res) => {
  try {
    const { tenantId, token } = req.params

    // Find booking with this review token
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('review_token', token)
      .single()

    if (bookingError || !booking) {
      return res.status(404).json({ error: 'Invalid or expired review link' })
    }

    // Check if booking is eligible for review
    if (!['checked_out', 'completed'].includes(booking.status)) {
      return res.status(400).json({ error: 'This booking is not eligible for review' })
    }

    if (booking.payment_status !== 'paid') {
      return res.status(400).json({ error: 'This booking is not eligible for review' })
    }

    // Check if review already exists
    const { data: existingReview } = await supabase
      .from('reviews')
      .select('id')
      .eq('booking_id', booking.id)
      .single()

    if (existingReview) {
      return res.status(400).json({ error: 'A review has already been submitted for this booking' })
    }

    // Get property info
    const { data: tenant } = await supabase
      .from('tenants')
      .select('name')
      .eq('id', tenantId)
      .single()

    res.json({
      valid: true,
      booking: {
        id: booking.id,
        guest_name: booking.guest_name,
        room_name: booking.room_name,
        check_in: booking.check_in,
        check_out: booking.check_out
      },
      property_name: tenant?.name || 'Property'
    })
  } catch (error: any) {
    console.error('Unexpected error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Submit review (public - via token)
router.post('/public/submit/:tenantId/:token', async (req, res) => {
  try {
    const { tenantId, token } = req.params
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

    // Validate category ratings (all required, 1-5)
    const categoryRatings = [
      { name: 'cleanliness', value: rating_cleanliness },
      { name: 'service', value: rating_service },
      { name: 'location', value: rating_location },
      { name: 'value', value: rating_value },
      { name: 'safety', value: rating_safety }
    ]

    for (const { name, value } of categoryRatings) {
      if (value === undefined || value === null) {
        return res.status(400).json({ error: `Rating for ${name} is required` })
      }
      if (value < 1 || value > 5) {
        return res.status(400).json({ error: `Rating for ${name} must be between 1 and 5` })
      }
    }

    // Calculate overall rating as average of categories
    const overallRating = Math.round(
      (rating_cleanliness + rating_service + rating_location + rating_value + rating_safety) / 5 * 10
    ) / 10

    // Validate images (optional, max 4)
    let reviewImages: any[] = []
    if (images) {
      if (!Array.isArray(images)) {
        return res.status(400).json({ error: 'Images must be an array' })
      }
      if (images.length > 4) {
        return res.status(400).json({ error: 'Maximum 4 images allowed' })
      }
      // Add hidden: false to each image
      reviewImages = images.map(img => ({
        url: img.url,
        path: img.path,
        hidden: false
      }))
    }

    // Find booking with this review token
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('review_token', token)
      .single()

    if (bookingError || !booking) {
      return res.status(404).json({ error: 'Invalid or expired review link' })
    }

    // Check if booking is eligible for review
    if (!['checked_out', 'completed'].includes(booking.status)) {
      return res.status(400).json({ error: 'This booking is not eligible for review' })
    }

    if (booking.payment_status !== 'paid') {
      return res.status(400).json({ error: 'This booking is not eligible for review' })
    }

    // Check if review already exists
    const { data: existingReview } = await supabase
      .from('reviews')
      .select('id')
      .eq('booking_id', booking.id)
      .single()

    if (existingReview) {
      return res.status(400).json({ error: 'A review has already been submitted for this booking' })
    }

    // Create review
    const { data: review, error: reviewError } = await supabase
      .from('reviews')
      .insert({
        tenant_id: tenantId,
        booking_id: booking.id,
        rating: overallRating,
        rating_cleanliness,
        rating_service,
        rating_location,
        rating_value,
        rating_safety,
        title: title || null,
        content: content || null,
        guest_name: booking.guest_name,
        status: 'published',
        images: reviewImages
      })
      .select()
      .single()

    if (reviewError) {
      console.error('Error creating review:', reviewError)
      return res.status(500).json({ error: 'Failed to submit review' })
    }

    // Invalidate the review token so it can't be used again
    await supabase
      .from('bookings')
      .update({ review_token: null })
      .eq('id', booking.id)

    res.status(201).json({
      success: true,
      message: 'Thank you for your review!',
      review: {
        id: review.id,
        rating: review.rating,
        title: review.title
      }
    })
  } catch (error: any) {
    console.error('Unexpected error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router

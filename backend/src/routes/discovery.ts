import { Router, Request, Response } from 'express'
import { supabase } from '../lib/supabase.js'
import { getOrCreateCustomer, createSessionToken } from '../middleware/customerAuth.js'
import { recordCouponUsage } from './coupons.js'
import { notifyNewBooking, notifyCustomerBookingConfirmed } from '../services/notificationService.js'

const router = Router()

// ============================================
// DISCOVERY API
// Cross-tenant search and listing endpoints
// For the public directory/marketplace
// ============================================

/**
 * GET /api/discovery/properties
 * List all discoverable properties with optional filters
 * Query params: location, checkIn, checkOut, guests, minPrice, maxPrice, propertyType, amenities, sort, limit, offset
 */
router.get('/properties', async (req: Request, res: Response) => {
  try {
    const {
      location,
      checkIn,
      checkOut,
      guests,
      minPrice,
      maxPrice,
      propertyType,
      amenities,
      sort = 'popular',
      limit = '20',
      offset = '0',
      // New geographic filters
      destination_id,
      destination_slug,
      province_id,
      province_slug,
      country_code,
      // Category filter
      categories,
      // Proximity search
      near_lat,
      near_lng,
      radius_km,
      // Special offers filter
      has_coupons
    } = req.query

    // Build query for discoverable tenants
    let query = supabase
      .from('tenants')
      .select(`
        id,
        slug,
        business_name,
        business_description,
        directory_description,
        logo_url,
        cover_image,
        gallery_images,
        city,
        state_province,
        country,
        property_type,
        region,
        region_slug,
        discoverable,
        directory_featured,
        latitude,
        longitude,
        country_id,
        province_id,
        destination_id,
        category_slugs
      `)
      .eq('discoverable', true)

    // Filter by location (city or region) - text search
    if (location && typeof location === 'string') {
      const searchTerm = `%${location.toLowerCase()}%`
      query = query.or(`city.ilike.${searchTerm},state_province.ilike.${searchTerm},region.ilike.${searchTerm}`)
    }

    // Filter by destination
    if (destination_id && typeof destination_id === 'string') {
      query = query.eq('destination_id', destination_id)
    } else if (destination_slug && typeof destination_slug === 'string') {
      // Need to look up destination ID first
      const { data: dest } = await supabase
        .from('destinations')
        .select('id')
        .eq('slug', destination_slug)
        .single()
      if (dest) {
        query = query.eq('destination_id', dest.id)
      }
    }

    // Filter by province
    if (province_id && typeof province_id === 'string') {
      query = query.eq('province_id', province_id)
    } else if (province_slug && typeof province_slug === 'string') {
      const { data: prov } = await supabase
        .from('provinces')
        .select('id')
        .eq('slug', province_slug)
        .single()
      if (prov) {
        query = query.eq('province_id', prov.id)
      }
    }

    // Filter by country
    if (country_code && typeof country_code === 'string') {
      const { data: ctry } = await supabase
        .from('countries')
        .select('id')
        .eq('code', country_code.toUpperCase())
        .single()
      if (ctry) {
        query = query.eq('country_id', ctry.id)
      }
    }

    // Filter by property type
    if (propertyType && propertyType !== 'All' && typeof propertyType === 'string') {
      query = query.eq('property_type', propertyType)
    }

    const { data: tenants, error: tenantsError } = await query

    if (tenantsError) {
      console.error('Error fetching discoverable tenants:', tenantsError)
      return res.status(500).json({ error: 'Failed to fetch properties' })
    }

    // Get rooms for each tenant to calculate pricing and ratings
    const properties = await Promise.all((tenants || []).map(async (tenant) => {
      // Get rooms for price range
      const { data: rooms } = await supabase
        .from('rooms')
        .select('base_price_per_night, currency')
        .eq('tenant_id', tenant.id)
        .eq('is_active', true)
        .order('base_price_per_night', { ascending: true })

      // Get reviews for rating
      const { data: reviews } = await supabase
        .from('reviews')
        .select('rating')
        .eq('tenant_id', tenant.id)

      const priceFrom = rooms && rooms.length > 0 ? rooms[0].base_price_per_night : null
      const currency = rooms && rooms.length > 0 ? rooms[0].currency : 'ZAR'

      // Calculate average rating
      let rating = null
      let reviewCount = 0
      if (reviews && reviews.length > 0) {
        reviewCount = reviews.length
        const sum = reviews.reduce((acc, r) => acc + (r.rating || 0), 0)
        rating = Math.round((sum / reviewCount) * 10) / 10
      }

      // Build images array from gallery or cover
      const images = tenant.gallery_images && Array.isArray(tenant.gallery_images) && tenant.gallery_images.length > 0
        ? tenant.gallery_images
        : tenant.cover_image
          ? [tenant.cover_image]
          : []

      return {
        id: tenant.id,
        slug: tenant.slug,
        tenantId: tenant.id,
        name: tenant.business_name || 'Unnamed Property',
        description: tenant.directory_description || tenant.business_description || '',
        location: {
          city: tenant.city || '',
          region: tenant.state_province || tenant.region || ''
        },
        images,
        logoUrl: tenant.logo_url,
        priceFrom,
        currency,
        rating,
        reviewCount,
        propertyType: tenant.property_type || 'Accommodation',
        amenities: [],
        featured: tenant.directory_featured || false,
        latitude: tenant.latitude,
        longitude: tenant.longitude,
        categories: tenant.category_slugs || []
      }
    }))

    // Filter by categories
    let filtered = [...properties]

    if (categories && typeof categories === 'string') {
      const categoryList = categories.split(',').map(c => c.trim().toLowerCase())
      filtered = filtered.filter(p => {
        const propCategories = (p.categories as string[]) || []
        return categoryList.some(cat => propCategories.includes(cat))
      })
    }

    // Filter by properties with active coupons (Special Offers)
    if (has_coupons === 'true') {
      const today = new Date().toISOString().split('T')[0]
      const { data: activeCoupons } = await supabase
        .from('coupons')
        .select('tenant_id')
        .eq('is_active', true)
        .or(`valid_from.is.null,valid_from.lte.${today}`)
        .or(`valid_until.is.null,valid_until.gte.${today}`)

      if (activeCoupons && activeCoupons.length > 0) {
        const tenantIdsWithCoupons = new Set(activeCoupons.map(c => c.tenant_id))
        filtered = filtered.filter(p => tenantIdsWithCoupons.has(p.id))
      } else {
        // No active coupons found, return empty list
        filtered = []
      }
    }

    // Filter by proximity (Haversine distance)
    if (near_lat && near_lng && typeof near_lat === 'string' && typeof near_lng === 'string') {
      const lat = parseFloat(near_lat)
      const lng = parseFloat(near_lng)
      const radius = radius_km && typeof radius_km === 'string' ? parseFloat(radius_km) : 50 // Default 50km

      if (!isNaN(lat) && !isNaN(lng) && !isNaN(radius)) {
        filtered = filtered.filter(p => {
          if (!p.latitude || !p.longitude) return false

          // Haversine formula
          const R = 6371 // Earth's radius in km
          const dLat = (p.latitude - lat) * Math.PI / 180
          const dLon = (p.longitude - lng) * Math.PI / 180
          const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                    Math.cos(lat * Math.PI / 180) * Math.cos(p.latitude * Math.PI / 180) *
                    Math.sin(dLon/2) * Math.sin(dLon/2)
          const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
          const distance = R * c

          return distance <= radius
        })
      }
    }

    // Filter by price range (only if price filters are specified)

    if (minPrice && typeof minPrice === 'string') {
      filtered = filtered.filter(p => p.priceFrom !== null)
      const min = parseFloat(minPrice)
      filtered = filtered.filter(p => (p.priceFrom || 0) >= min)
    }

    if (maxPrice && typeof maxPrice === 'string') {
      const max = parseFloat(maxPrice)
      filtered = filtered.filter(p => (p.priceFrom || 0) <= max)
    }

    // Sort
    switch (sort) {
      case 'price_asc':
        filtered.sort((a, b) => (a.priceFrom || 0) - (b.priceFrom || 0))
        break
      case 'price_desc':
        filtered.sort((a, b) => (b.priceFrom || 0) - (a.priceFrom || 0))
        break
      case 'rating':
        filtered.sort((a, b) => (b.rating || 0) - (a.rating || 0))
        break
      case 'popular':
      default:
        // Featured first, then by review count
        filtered.sort((a, b) => {
          if (a.featured && !b.featured) return -1
          if (!a.featured && b.featured) return 1
          return (b.reviewCount || 0) - (a.reviewCount || 0)
        })
    }

    // Pagination
    const limitNum = parseInt(limit as string) || 20
    const offsetNum = parseInt(offset as string) || 0
    const total = filtered.length
    const paginated = filtered.slice(offsetNum, offsetNum + limitNum)

    res.json({
      properties: paginated,
      total,
      limit: limitNum,
      offset: offsetNum,
      hasMore: offsetNum + limitNum < total
    })
  } catch (error) {
    console.error('Error in discovery properties:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * GET /api/discovery/properties/:slug
 * Get single property with full details, rooms, and reviews
 */
router.get('/properties/:slug', async (req: Request, res: Response) => {
  try {
    const { slug } = req.params

    // Get tenant by slug
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select(`
        id,
        slug,
        business_name,
        business_description,
        logo_url,
        cover_image,
        business_email,
        business_phone,
        address_line1,
        address_line2,
        city,
        state_province,
        postal_code,
        country,
        property_type,
        region,
        region_slug,
        discoverable,
        directory_featured,
        business_hours,
        gallery_images,
        directory_description,
        check_in_time,
        check_out_time,
        cancellation_policies,
        property_amenities,
        house_rules,
        whats_included,
        property_highlights,
        seasonal_message,
        special_offers,
        category_slugs,
        latitude,
        longitude
      `)
      .eq('slug', slug)
      .eq('discoverable', true)
      .single()

    if (tenantError || !tenant) {
      return res.status(404).json({ error: 'Property not found' })
    }

    // Get all active rooms
    const { data: rooms } = await supabase
      .from('rooms')
      .select('*')
      .eq('tenant_id', tenant.id)
      .eq('is_active', true)
      .order('base_price_per_night', { ascending: true })

    // Get reviews (only published ones) - including category ratings, images, and customer info
    const { data: reviews } = await supabase
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
        created_at,
        booking_id,
        images,
        bookings (
          customer_id,
          customers (
            id,
            name,
            profile_picture_url
          )
        )
      `)
      .eq('tenant_id', tenant.id)
      .eq('status', 'published')
      .order('created_at', { ascending: false })
      .limit(20)

    // Calculate average rating and category averages
    let rating = null
    let reviewCount = 0
    let categoryAverages: {
      cleanliness: number | null
      service: number | null
      location: number | null
      value: number | null
      safety: number | null
    } = {
      cleanliness: null,
      service: null,
      location: null,
      value: null,
      safety: null
    }

    if (reviews && reviews.length > 0) {
      reviewCount = reviews.length
      const sum = reviews.reduce((acc, r) => acc + (r.rating || 0), 0)
      rating = Math.round((sum / reviewCount) * 10) / 10

      // Calculate category averages from reviews that have category ratings
      const categoryFields = ['cleanliness', 'service', 'location', 'value', 'safety'] as const
      for (const category of categoryFields) {
        const fieldName = `rating_${category}` as keyof typeof reviews[0]
        const validRatings = reviews.filter(r => r[fieldName] != null).map(r => r[fieldName] as number)
        if (validRatings.length > 0) {
          const categorySum = validRatings.reduce((acc, val) => acc + val, 0)
          categoryAverages[category] = Math.round((categorySum / validRatings.length) * 10) / 10
        }
      }
    }

    // Get price range
    const priceFrom = rooms && rooms.length > 0 ? rooms[0].base_price_per_night : null
    const currency = rooms && rooms.length > 0 ? rooms[0].currency : 'ZAR'

    // Build full address
    const addressParts = [
      tenant.address_line1,
      tenant.address_line2,
      tenant.city,
      tenant.state_province,
      tenant.postal_code,
      tenant.country
    ].filter(Boolean)

    // Determine images - use gallery_images but ensure cover_image is first
    let images: string[] = []
    if (tenant.gallery_images && tenant.gallery_images.length > 0) {
      // If cover_image is set, put it first, then add remaining gallery images
      if (tenant.cover_image) {
        images = [tenant.cover_image]
        // Add other gallery images (excluding the cover to avoid duplicates)
        for (const img of tenant.gallery_images) {
          if (img !== tenant.cover_image) {
            images.push(img)
          }
        }
      } else {
        images = tenant.gallery_images
      }
    } else if (tenant.cover_image) {
      images = [tenant.cover_image]
    }

    res.json({
      id: tenant.id,
      slug: tenant.slug,
      tenantId: tenant.id,
      name: tenant.business_name || 'Property',
      description: tenant.directory_description || tenant.business_description || '',
      location: {
        city: tenant.city || '',
        region: tenant.state_province || tenant.region || '',
        address: addressParts.join(', ')
      },
      images,
      logoUrl: tenant.logo_url,
      email: tenant.business_email,
      phone: tenant.business_phone,
      priceFrom,
      currency,
      rating,
      reviewCount,
      propertyType: tenant.property_type || 'Accommodation',
      amenities: tenant.property_amenities || [],
      businessHours: tenant.business_hours,
      // New directory listing fields
      checkInTime: tenant.check_in_time || '14:00',
      checkOutTime: tenant.check_out_time || '10:00',
      cancellationPolicies: tenant.cancellation_policies || [{ days_before: 7, refund_percentage: 100, label: 'Free cancellation up to 7 days before' }],
      houseRules: tenant.house_rules || [],
      whatsIncluded: tenant.whats_included || [],
      propertyHighlights: tenant.property_highlights || [],
      seasonalMessage: tenant.seasonal_message,
      specialOffers: tenant.special_offers || [],
      categories: tenant.category_slugs || [],
      latitude: tenant.latitude,
      longitude: tenant.longitude,
      featured: tenant.directory_featured || false,
      rooms: await Promise.all((rooms || []).map(async (room) => {
        // Room images are stored as JSONB: { featured: {url, path} | null, gallery: {url, path}[] }
        // Convert to flat array of URLs with featured image first
        let roomImages: string[] = []
        if (room.images) {
          // Handle featured image
          if (room.images.featured) {
            const featuredUrl = typeof room.images.featured === 'string'
              ? room.images.featured
              : room.images.featured.url
            if (featuredUrl) {
              roomImages.push(featuredUrl)
            }
          }
          // Handle gallery images
          if (room.images.gallery && Array.isArray(room.images.gallery)) {
            for (const img of room.images.gallery) {
              const imgUrl = typeof img === 'string' ? img : img.url
              if (imgUrl && !roomImages.includes(imgUrl)) {
                roomImages.push(imgUrl)
              }
            }
          }
        }

        // Get room-specific reviews via bookings
        const { data: roomReviews } = await supabase
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
            created_at,
            images,
            booking_id,
            bookings!inner (
              room_id,
              customer_id,
              customers (
                id,
                name,
                profile_picture_url
              )
            )
          `)
          .eq('tenant_id', tenant.id)
          .eq('status', 'published')
          .order('created_at', { ascending: false })

        // Filter to only reviews for this room
        const filteredRoomReviews = (roomReviews || []).filter((r: any) => r.bookings?.room_id === room.id)

        // Calculate room rating
        let roomRating = null
        let roomReviewCount = 0
        if (filteredRoomReviews.length > 0) {
          roomReviewCount = filteredRoomReviews.length
          const sum = filteredRoomReviews.reduce((acc: number, r: any) => acc + (r.rating || 0), 0)
          roomRating = Math.round((sum / roomReviewCount) * 10) / 10
        }

        return {
          id: room.id,
          name: room.name,
          description: room.description,
          basePrice: room.base_price_per_night,
          currency: room.currency,
          maxGuests: room.max_guests,
          bedrooms: room.bedrooms,
          bathrooms: room.bathrooms,
          amenities: room.amenities || [],
          images: roomImages,
          minStay: room.min_stay_nights,
          maxStay: room.max_stay_nights,
          // Child pricing configuration
          pricingMode: room.pricing_mode || 'per_unit',
          additionalPersonRate: room.additional_person_rate,
          childPricePerNight: room.child_price_per_night,
          childFreeUntilAge: room.child_free_until_age,
          childAgeLimit: room.child_age_limit,
          // Room reviews
          rating: roomRating,
          reviewCount: roomReviewCount,
          reviews: filteredRoomReviews.slice(0, 10).map((review: any) => {
            const customer = review.bookings?.customers
            return {
              id: review.id,
              rating: review.rating,
              ratingCleanliness: review.rating_cleanliness,
              ratingService: review.rating_service,
              ratingLocation: review.rating_location,
              ratingValue: review.rating_value,
              ratingSafety: review.rating_safety,
              title: review.title,
              comment: review.content,
              guestName: customer?.name || review.guest_name,
              guestProfilePicture: customer?.profile_picture_url || null,
              date: review.created_at,
              images: review.images || []
            }
          })
        }
      })),
      categoryAverages,
      reviews: (reviews || []).map(review => {
        // Prefer current customer profile over snapshot
        const customer = (review.bookings as any)?.customers
        return {
          id: review.id,
          rating: review.rating,
          ratingCleanliness: review.rating_cleanliness,
          ratingService: review.rating_service,
          ratingLocation: review.rating_location,
          ratingValue: review.rating_value,
          ratingSafety: review.rating_safety,
          title: review.title,
          comment: review.content,
          guestName: customer?.name || review.guest_name,
          guestProfilePicture: customer?.profile_picture_url || null,
          date: review.created_at,
          images: review.images || []
        }
      })
    })
  } catch (error) {
    console.error('Error fetching property:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * GET /api/discovery/destinations
 * Get all destinations with property counts
 */
router.get('/destinations', async (req: Request, res: Response) => {
  try {
    // Get destinations from table
    const { data: destinations, error: destError } = await supabase
      .from('destinations')
      .select('*')
      .order('name', { ascending: true })

    if (destError) {
      // If destinations table doesn't exist, fall back to aggregating from tenants
      console.warn('Destinations table not found, aggregating from tenants')

      const { data: tenants } = await supabase
        .from('tenants')
        .select('region, region_slug, state_province')
        .eq('discoverable', true)

      // Aggregate by region
      const regionCounts: Record<string, { name: string, slug: string, count: number }> = {}

      for (const tenant of tenants || []) {
        const regionName = tenant.region || tenant.state_province || 'Other'
        const regionSlug = tenant.region_slug || regionName.toLowerCase().replace(/\s+/g, '-')

        if (!regionCounts[regionSlug]) {
          regionCounts[regionSlug] = { name: regionName, slug: regionSlug, count: 0 }
        }
        regionCounts[regionSlug].count++
      }

      return res.json({
        destinations: Object.values(regionCounts).map(r => ({
          slug: r.slug,
          name: r.name,
          propertyCount: r.count,
          image: null,
          description: null
        }))
      })
    }

    // Get property counts for each destination
    const destinationsWithCounts = await Promise.all((destinations || []).map(async (dest) => {
      const { count } = await supabase
        .from('tenants')
        .select('*', { count: 'exact', head: true })
        .eq('discoverable', true)
        .eq('region_slug', dest.slug)

      return {
        slug: dest.slug,
        name: dest.name,
        description: dest.description,
        image: dest.image_url,
        propertyCount: count || 0
      }
    }))

    res.json({ destinations: destinationsWithCounts })
  } catch (error) {
    console.error('Error fetching destinations:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * GET /api/discovery/destinations/:slug
 * Get single destination with its properties
 */
router.get('/destinations/:slug', async (req: Request, res: Response) => {
  try {
    const { slug } = req.params
    const { sort = 'popular', limit = '20', offset = '0' } = req.query

    // Get destination info
    const { data: destination } = await supabase
      .from('destinations')
      .select('*')
      .eq('slug', slug)
      .single()

    // Get properties in this destination
    const { data: tenants } = await supabase
      .from('tenants')
      .select(`
        id,
        slug,
        business_name,
        business_description,
        logo_url,
        cover_image,
        city,
        state_province,
        property_type,
        region,
        region_slug,
        directory_featured
      `)
      .eq('discoverable', true)
      .eq('region_slug', slug)

    // Get rooms and reviews for each property
    const properties = await Promise.all((tenants || []).map(async (tenant) => {
      const { data: rooms } = await supabase
        .from('rooms')
        .select('base_price_per_night, currency')
        .eq('tenant_id', tenant.id)
        .eq('is_active', true)
        .order('base_price_per_night', { ascending: true })
        .limit(1)

      const { data: reviews } = await supabase
        .from('reviews')
        .select('rating')
        .eq('tenant_id', tenant.id)

      const priceFrom = rooms && rooms.length > 0 ? rooms[0].base_price_per_night : null
      const currency = rooms && rooms.length > 0 ? rooms[0].currency : 'ZAR'

      let rating = null
      let reviewCount = 0
      if (reviews && reviews.length > 0) {
        reviewCount = reviews.length
        const sum = reviews.reduce((acc, r) => acc + (r.rating || 0), 0)
        rating = Math.round((sum / reviewCount) * 10) / 10
      }

      return {
        id: tenant.id,
        slug: tenant.slug,
        tenantId: tenant.id,
        name: tenant.business_name || 'Property',
        description: tenant.business_description,
        location: {
          city: tenant.city || '',
          region: tenant.state_province || tenant.region || ''
        },
        images: tenant.cover_image ? [tenant.cover_image] : [],
        priceFrom,
        currency,
        rating,
        reviewCount,
        propertyType: tenant.property_type || 'Accommodation',
        featured: tenant.directory_featured || false
      }
    }))

    // Sort and paginate
    let sorted = [...properties]
    switch (sort) {
      case 'price_asc':
        sorted.sort((a, b) => (a.priceFrom || 0) - (b.priceFrom || 0))
        break
      case 'price_desc':
        sorted.sort((a, b) => (b.priceFrom || 0) - (a.priceFrom || 0))
        break
      case 'rating':
        sorted.sort((a, b) => (b.rating || 0) - (a.rating || 0))
        break
      default:
        sorted.sort((a, b) => (b.reviewCount || 0) - (a.reviewCount || 0))
    }

    const limitNum = parseInt(limit as string) || 20
    const offsetNum = parseInt(offset as string) || 0
    const paginated = sorted.slice(offsetNum, offsetNum + limitNum)

    res.json({
      destination: destination ? {
        slug: destination.slug,
        name: destination.name,
        description: destination.description,
        image: destination.image_url
      } : {
        slug,
        name: slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
        description: null,
        image: null
      },
      properties: paginated,
      total: properties.length,
      hasMore: offsetNum + limitNum < properties.length
    })
  } catch (error) {
    console.error('Error fetching destination:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * GET /api/discovery/featured
 * Get featured properties for homepage
 */
router.get('/featured', async (req: Request, res: Response) => {
  try {
    const { limit = '6' } = req.query

    // Get featured tenants first, then fall back to highest rated
    let { data: tenants } = await supabase
      .from('tenants')
      .select(`
        id,
        slug,
        business_name,
        business_description,
        logo_url,
        cover_image,
        city,
        state_province,
        property_type,
        region,
        directory_featured
      `)
      .eq('discoverable', true)
      .eq('directory_featured', true)
      .limit(parseInt(limit as string))

    // If not enough featured, get more by recent activity
    if (!tenants || tenants.length < parseInt(limit as string)) {
      const { data: moreTenants } = await supabase
        .from('tenants')
        .select(`
          id,
          slug,
          business_name,
          business_description,
          logo_url,
          cover_image,
          city,
          state_province,
          property_type,
          region,
          directory_featured
        `)
        .eq('discoverable', true)
        .limit(parseInt(limit as string))

      tenants = moreTenants || []
    }

    // Get pricing and ratings
    const properties = await Promise.all((tenants || []).map(async (tenant) => {
      const { data: rooms } = await supabase
        .from('rooms')
        .select('base_price_per_night, currency')
        .eq('tenant_id', tenant.id)
        .eq('is_active', true)
        .order('base_price_per_night', { ascending: true })
        .limit(1)

      const { data: reviews } = await supabase
        .from('reviews')
        .select('rating')
        .eq('tenant_id', tenant.id)

      const priceFrom = rooms && rooms.length > 0 ? rooms[0].base_price_per_night : null
      const currency = rooms && rooms.length > 0 ? rooms[0].currency : 'ZAR'

      let rating = null
      let reviewCount = 0
      if (reviews && reviews.length > 0) {
        reviewCount = reviews.length
        const sum = reviews.reduce((acc, r) => acc + (r.rating || 0), 0)
        rating = Math.round((sum / reviewCount) * 10) / 10
      }

      return {
        id: tenant.id,
        slug: tenant.slug,
        tenantId: tenant.id,
        name: tenant.business_name || 'Property',
        description: tenant.business_description,
        location: {
          city: tenant.city || '',
          region: tenant.state_province || tenant.region || ''
        },
        images: tenant.cover_image ? [tenant.cover_image] : [],
        priceFrom,
        currency,
        rating,
        reviewCount,
        propertyType: tenant.property_type || 'Accommodation',
        featured: tenant.directory_featured || false
      }
    }))

    res.json({ properties })
  } catch (error) {
    console.error('Error fetching featured:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * GET /api/discovery/newly-added
 * Get recently added properties for homepage
 */
router.get('/newly-added', async (req: Request, res: Response) => {
  try {
    const { limit = '4' } = req.query

    // Get most recently created discoverable tenants
    const { data: tenants } = await supabase
      .from('tenants')
      .select(`
        id,
        slug,
        business_name,
        business_description,
        logo_url,
        cover_image,
        city,
        state_province,
        property_type,
        region,
        directory_featured,
        created_at
      `)
      .eq('discoverable', true)
      .order('created_at', { ascending: false })
      .limit(parseInt(limit as string))

    // Get pricing and ratings
    const properties = await Promise.all((tenants || []).map(async (tenant) => {
      const { data: rooms } = await supabase
        .from('rooms')
        .select('base_price_per_night, currency')
        .eq('tenant_id', tenant.id)
        .eq('is_active', true)
        .order('base_price_per_night', { ascending: true })
        .limit(1)

      const { data: reviews } = await supabase
        .from('reviews')
        .select('rating')
        .eq('tenant_id', tenant.id)

      const priceFrom = rooms && rooms.length > 0 ? rooms[0].base_price_per_night : null
      const currency = rooms && rooms.length > 0 ? rooms[0].currency : 'ZAR'

      let rating = null
      let reviewCount = 0
      if (reviews && reviews.length > 0) {
        reviewCount = reviews.length
        const sum = reviews.reduce((acc, r) => acc + (r.rating || 0), 0)
        rating = Math.round((sum / reviewCount) * 10) / 10
      }

      return {
        id: tenant.id,
        slug: tenant.slug,
        tenantId: tenant.id,
        name: tenant.business_name || 'Property',
        description: tenant.business_description,
        location: {
          city: tenant.city || '',
          region: tenant.state_province || tenant.region || ''
        },
        images: tenant.cover_image ? [tenant.cover_image] : [],
        priceFrom,
        currency,
        rating,
        reviewCount,
        propertyType: tenant.property_type || 'Accommodation',
        featured: tenant.directory_featured || false
      }
    }))

    res.json({ properties })
  } catch (error) {
    console.error('Error fetching newly added:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * GET /api/discovery/reviews
 * Get all platform reviews for review carousel
 */
router.get('/reviews', async (req: Request, res: Response) => {
  try {
    const { limit = '20' } = req.query

    // Get published reviews with tenant and customer info
    const { data: reviews, error } = await supabase
      .from('reviews')
      .select(`
        id,
        rating,
        title,
        content,
        guest_name,
        created_at,
        tenant_id,
        booking_id,
        tenants!inner (
          business_name,
          slug,
          discoverable
        ),
        bookings (
          customer_id,
          customers (
            id,
            name,
            profile_picture_url
          )
        )
      `)
      .eq('status', 'published')
      .eq('tenants.discoverable', true)
      .order('created_at', { ascending: false })
      .limit(parseInt(limit as string))

    if (error) {
      console.error('Error fetching reviews:', error)
      return res.status(500).json({ error: 'Failed to fetch reviews' })
    }

    res.json({
      reviews: (reviews || []).map(review => {
        const customer = (review.bookings as any)?.customers
        return {
          id: review.id,
          rating: review.rating,
          title: review.title,
          comment: review.content,
          guestName: customer?.name || review.guest_name,
          guestProfilePicture: customer?.profile_picture_url || null,
          date: review.created_at,
          propertyName: (review.tenants as any)?.business_name || 'Property',
          propertySlug: (review.tenants as any)?.slug || ''
        }
      })
    })
  } catch (error) {
    console.error('Error fetching reviews:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * GET /api/discovery/stats
 * Get platform statistics for homepage
 */
router.get('/stats', async (req: Request, res: Response) => {
  try {
    // Count discoverable properties
    const { count: propertyCount } = await supabase
      .from('tenants')
      .select('*', { count: 'exact', head: true })
      .eq('discoverable', true)

    // Count total rooms
    const { data: discoverableTenants } = await supabase
      .from('tenants')
      .select('id')
      .eq('discoverable', true)

    const tenantIds = (discoverableTenants || []).map(t => t.id)

    let roomCount = 0
    if (tenantIds.length > 0) {
      const { count } = await supabase
        .from('rooms')
        .select('*', { count: 'exact', head: true })
        .in('tenant_id', tenantIds)
        .eq('is_active', true)
      roomCount = count || 0
    }

    // Count total bookings
    let bookingCount = 0
    if (tenantIds.length > 0) {
      const { count } = await supabase
        .from('bookings')
        .select('*', { count: 'exact', head: true })
        .in('tenant_id', tenantIds)
        .in('status', ['confirmed', 'completed'])
      bookingCount = count || 0
    }

    // Count destinations
    const { count: destinationCount } = await supabase
      .from('destinations')
      .select('*', { count: 'exact', head: true })

    res.json({
      properties: propertyCount || 0,
      rooms: roomCount,
      bookings: bookingCount,
      destinations: destinationCount || 8 // Fallback to 8 if no destinations table
    })
  } catch (error) {
    console.error('Error fetching stats:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * POST /api/discovery/bookings
 * Create a booking for a discovery property
 */
router.post('/bookings', async (req: Request, res: Response) => {
  try {
    const {
      property_slug,
      guest_name,
      guest_email,
      guest_phone,
      room_id,
      room_ids,
      room_details,
      check_in,
      check_out,
      guests,
      addons,
      special_requests,
      total_amount,
      currency,
      coupon,
      subtotal_before_discount,
      discount_amount
    } = req.body

    // Validate required fields
    if (!property_slug || !guest_name || !guest_email || !room_id || !check_in || !check_out) {
      return res.status(400).json({
        error: 'Missing required fields: property_slug, guest_name, guest_email, room_id, check_in, check_out'
      })
    }

    // Get tenant by slug
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select('id, business_name')
      .eq('slug', property_slug)
      .eq('discoverable', true)
      .single()

    if (tenantError || !tenant) {
      return res.status(404).json({ error: 'Property not found' })
    }

    // Verify room belongs to this tenant
    const { data: room, error: roomError } = await supabase
      .from('rooms')
      .select('name, max_guests')
      .eq('id', room_id)
      .eq('tenant_id', tenant.id)
      .eq('is_active', true)
      .single()

    if (roomError || !room) {
      return res.status(404).json({ error: 'Room not found or unavailable' })
    }

    // Check guest count - validate per-room if room_details provided
    if (room_details && Array.isArray(room_details)) {
      // Multi-room booking: validate each room's guests
      for (const roomDetail of room_details) {
        const { data: detailRoom } = await supabase
          .from('rooms')
          .select('name, max_guests')
          .eq('id', roomDetail.room_id)
          .eq('tenant_id', tenant.id)
          .single()

        if (detailRoom) {
          const roomGuests = (roomDetail.adults || 0) + (roomDetail.children || 0)
          if (roomGuests > detailRoom.max_guests) {
            return res.status(400).json({
              error: `${detailRoom.name} allows maximum ${detailRoom.max_guests} guests (you selected ${roomGuests})`
            })
          }
        }
      }
    } else if (guests && guests > room.max_guests) {
      // Single room booking: validate total guests against primary room
      return res.status(400).json({
        error: `This room allows maximum ${room.max_guests} guests`
      })
    }

    // Generate short booking reference (VILO-XXXX format)
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // Exclude confusing chars: I, O, 0, 1
    let refCode = ''
    for (let i = 0; i < 4; i++) {
      refCode += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    const bookingRef = `VILO-${refCode}`

    // Get or create customer for this email
    const customer = await getOrCreateCustomer(guest_email, guest_name, guest_phone)

    // Build notes object
    const notesData: any = {
      guests: guests || 1,
      room_ids: room_ids || [room_id],
      room_details: room_details || null,
      addons: addons || [],
      special_requests: special_requests || '',
      booking_reference: bookingRef,
      booked_online: true,
      booked_via: 'discovery'
    }

    // Add coupon info to notes if present
    if (coupon) {
      notesData.coupon = coupon
    }

    // Build booking insert data
    const bookingInsertData: any = {
      tenant_id: tenant.id,
      customer_id: customer?.id || null,
      guest_name,
      guest_email,
      guest_phone,
      room_id,
      room_name: room.name,
      check_in,
      check_out,
      status: 'pending',
      payment_status: 'pending',
      total_amount,
      currency: currency || 'ZAR',
      notes: JSON.stringify(notesData)
    }

    // Add coupon fields if coupon was applied
    if (coupon && coupon.id) {
      bookingInsertData.coupon_id = coupon.id
      bookingInsertData.coupon_code = coupon.code
      bookingInsertData.discount_amount = discount_amount || coupon.discount_amount || 0
      bookingInsertData.subtotal_before_discount = subtotal_before_discount || (total_amount + (discount_amount || coupon.discount_amount || 0))
    }

    // Create booking
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .insert(bookingInsertData)
      .select()
      .single()

    if (bookingError) {
      console.error('Error creating booking:', bookingError)
      return res.status(500).json({ error: 'Failed to create booking' })
    }

    // Record coupon usage if a coupon was applied
    if (coupon && coupon.id && booking.id) {
      const originalAmount = subtotal_before_discount || (total_amount + (discount_amount || coupon.discount_amount || 0))
      await recordCouponUsage(
        tenant.id,
        coupon.id,
        booking.id,
        guest_email,
        discount_amount || coupon.discount_amount || 0,
        originalAmount,
        total_amount
      )
    }

    // Send notifications for new booking
    console.log('[Discovery] Sending notifications for new booking:', booking.id)

    // Notify all team members about the new booking
    notifyNewBooking(
      tenant.id,
      booking.id,
      guest_name,
      room.name
    )

    // Notify customer if they have an account
    if (customer) {
      notifyCustomerBookingConfirmed(
        tenant.id,
        customer.id,
        booking.id,
        room.name,
        check_in
      )
    }

    // Create session token for automatic login
    let sessionToken = null
    let sessionExpiresAt = null
    if (customer) {
      const session = await createSessionToken(customer.id)
      if (session) {
        sessionToken = session.token
        sessionExpiresAt = session.expiresAt
      }
    }

    res.status(201).json({
      success: true,
      booking: {
        id: booking.id,
        reference: bookingRef,
        propertyName: tenant.business_name,
        propertySlug: property_slug,
        guest_name: booking.guest_name,
        guest_email: booking.guest_email,
        room_name: booking.room_name,
        check_in: booking.check_in,
        check_out: booking.check_out,
        total_amount: booking.total_amount,
        currency: booking.currency,
        status: booking.status
      },
      customer: customer ? {
        id: customer.id,
        email: customer.email,
        name: customer.name,
        hasPassword: !!customer.password_hash
      } : null,
      token: sessionToken,
      expiresAt: sessionExpiresAt
    })
  } catch (error) {
    console.error('Unexpected error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * GET /api/discovery/properties/:slug/availability
 * Check room availability for a property
 */
router.get('/properties/:slug/availability', async (req: Request, res: Response) => {
  try {
    const { slug } = req.params
    const { room_id, check_in, check_out } = req.query

    if (!room_id || !check_in || !check_out) {
      return res.status(400).json({ error: 'room_id, check_in, and check_out are required' })
    }

    // Get tenant by slug
    const { data: tenant } = await supabase
      .from('tenants')
      .select('id')
      .eq('slug', slug)
      .eq('discoverable', true)
      .single()

    if (!tenant) {
      return res.status(404).json({ error: 'Property not found' })
    }

    // Get room details
    const { data: room } = await supabase
      .from('rooms')
      .select('*')
      .eq('id', room_id)
      .eq('tenant_id', tenant.id)
      .eq('is_active', true)
      .single()

    if (!room) {
      return res.status(404).json({ error: 'Room not found' })
    }

    // Count existing bookings
    const { data: bookings } = await supabase
      .from('bookings')
      .select('id')
      .eq('room_id', room_id)
      .eq('tenant_id', tenant.id)
      .in('status', ['pending', 'confirmed'])
      .or(`and(check_in.lt.${check_out},check_out.gt.${check_in})`)

    const bookedCount = bookings?.length || 0
    const totalUnits = room.total_units || 1 // Default to 1 if not set
    const availableUnits = totalUnits - bookedCount

    // Calculate nights
    const checkInDate = new Date(check_in as string)
    const checkOutDate = new Date(check_out as string)
    const nights = Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24))

    const meetsMinStay = nights >= (room.min_stay_nights || 1)
    const meetsMaxStay = !room.max_stay_nights || nights <= room.max_stay_nights

    // Debug logging
    console.log('[Availability]', {
      room_id,
      room_name: room.name,
      check_in,
      check_out,
      bookedCount,
      totalUnits,
      availableUnits,
      nights,
      min_stay: room.min_stay_nights,
      meetsMinStay,
      meetsMaxStay,
      available: availableUnits > 0 && meetsMinStay && meetsMaxStay
    })

    res.json({
      available: availableUnits > 0 && meetsMinStay && meetsMaxStay,
      available_units: availableUnits,
      total_units: room.total_units,
      nights,
      min_stay_nights: room.min_stay_nights,
      max_stay_nights: room.max_stay_nights,
      meets_min_stay: meetsMinStay,
      meets_max_stay: meetsMaxStay
    })
  } catch (error) {
    console.error('Error checking availability:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * GET /api/discovery/properties/:slug/booked-dates
 * Get list of booked dates for a room within a date range
 * Returns an array of dates that are unavailable
 */
router.get('/properties/:slug/booked-dates', async (req: Request, res: Response) => {
  try {
    const { slug } = req.params
    const { room_id, start_date, end_date } = req.query

    if (!room_id || !start_date || !end_date) {
      return res.status(400).json({ error: 'room_id, start_date, and end_date are required' })
    }

    // Get tenant by slug
    const { data: tenant } = await supabase
      .from('tenants')
      .select('id')
      .eq('slug', slug)
      .eq('discoverable', true)
      .single()

    if (!tenant) {
      return res.status(404).json({ error: 'Property not found' })
    }

    // Get room details for total_units
    const { data: room } = await supabase
      .from('rooms')
      .select('total_units')
      .eq('id', room_id)
      .eq('tenant_id', tenant.id)
      .eq('is_active', true)
      .single()

    if (!room) {
      return res.status(404).json({ error: 'Room not found' })
    }

    const totalUnits = room.total_units || 1

    // Get all bookings that overlap with the requested date range
    const { data: bookings } = await supabase
      .from('bookings')
      .select('check_in, check_out')
      .eq('room_id', room_id)
      .eq('tenant_id', tenant.id)
      .in('status', ['pending', 'confirmed'])
      .or(`and(check_in.lt.${end_date},check_out.gt.${start_date})`)

    // Build a map of date -> booking count
    const bookingCountByDate: Record<string, number> = {}

    for (const booking of bookings || []) {
      const bookingStart = new Date(booking.check_in + 'T12:00:00')
      const bookingEnd = new Date(booking.check_out + 'T12:00:00')
      const rangeStart = new Date(start_date as string + 'T12:00:00')
      const rangeEnd = new Date(end_date as string + 'T12:00:00')

      // Iterate through each night of the booking
      const currentDate = new Date(Math.max(bookingStart.getTime(), rangeStart.getTime()))
      const endDate = new Date(Math.min(bookingEnd.getTime(), rangeEnd.getTime()))

      while (currentDate < endDate) {
        const year = currentDate.getFullYear()
        const month = String(currentDate.getMonth() + 1).padStart(2, '0')
        const day = String(currentDate.getDate()).padStart(2, '0')
        const dateStr = `${year}-${month}-${day}`

        bookingCountByDate[dateStr] = (bookingCountByDate[dateStr] || 0) + 1
        currentDate.setDate(currentDate.getDate() + 1)
      }
    }

    // Find dates where all units are booked
    const bookedDates: string[] = []
    for (const [date, count] of Object.entries(bookingCountByDate)) {
      if (count >= totalUnits) {
        bookedDates.push(date)
      }
    }

    res.json({
      booked_dates: bookedDates.sort(),
      total_units: totalUnits
    })
  } catch (error) {
    console.error('Error fetching booked dates:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * GET /api/discovery/properties/:slug/pricing
 * Get pricing for a room in date range
 */
router.get('/properties/:slug/pricing', async (req: Request, res: Response) => {
  try {
    const { slug } = req.params
    const { room_id, check_in, check_out } = req.query

    if (!room_id || !check_in || !check_out) {
      return res.status(400).json({ error: 'room_id, check_in, and check_out are required' })
    }

    // Get tenant by slug
    const { data: tenant } = await supabase
      .from('tenants')
      .select('id')
      .eq('slug', slug)
      .eq('discoverable', true)
      .single()

    if (!tenant) {
      return res.status(404).json({ error: 'Property not found' })
    }

    // Get room base price
    const { data: room } = await supabase
      .from('rooms')
      .select('base_price_per_night, currency, name')
      .eq('id', room_id)
      .eq('tenant_id', tenant.id)
      .single()

    if (!room) {
      return res.status(404).json({ error: 'Room not found' })
    }

    // Get seasonal rates
    const { data: rates, error: ratesError } = await supabase
      .from('seasonal_rates')
      .select('*')
      .eq('room_id', room_id)
      .eq('tenant_id', tenant.id)
      .lte('start_date', check_out)
      .gte('end_date', check_in)
      .order('priority', { ascending: false })

    // Debug logging
    console.log('[Pricing] Query params:', { slug, room_id, check_in, check_out, tenant_id: tenant.id })
    console.log('[Pricing] Found seasonal rates:', rates?.length || 0, ratesError ? `Error: ${ratesError.message}` : '')
    if (rates && rates.length > 0) {
      console.log('[Pricing] Rate details:', rates.map(r => ({ name: r.name, start: r.start_date, end: r.end_date, price: r.price_per_night })))
    }

    // Calculate prices per night
    const nights: Array<{ date: string; price: number; rate_name: string | null }> = []
    // Parse dates and work with date strings to avoid timezone issues
    const startDateStr = check_in as string
    const endDateStr = check_out as string
    let totalAmount = 0

    // Generate array of date strings between check_in and check_out
    const currentDate = new Date(startDateStr + 'T12:00:00') // Use noon to avoid DST issues
    const endDate = new Date(endDateStr + 'T12:00:00')

    while (currentDate < endDate) {
      const year = currentDate.getFullYear()
      const month = String(currentDate.getMonth() + 1).padStart(2, '0')
      const day = String(currentDate.getDate()).padStart(2, '0')
      const dateStr = `${year}-${month}-${day}`

      // Compare date strings directly to avoid timezone issues
      const applicableRate = (rates || []).find(rate => {
        const rateStart = rate.start_date // Already a string like "2024-01-15"
        const rateEnd = rate.end_date
        return dateStr >= rateStart && dateStr <= rateEnd
      })

      const price = applicableRate ? applicableRate.price_per_night : room.base_price_per_night
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
    console.error('Error calculating pricing:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * GET /api/discovery/properties/:slug/payment-methods
 * Get enabled payment methods for a property
 */
router.get('/properties/:slug/payment-methods', async (req: Request, res: Response) => {
  try {
    const { slug } = req.params

    // Get tenant payment settings
    const { data: tenant, error } = await supabase
      .from('tenants')
      .select(`
        paystack_enabled,
        paystack_mode,
        paystack_test_public_key,
        paystack_live_public_key,
        eft_enabled,
        eft_account_holder,
        eft_bank_name,
        eft_account_number,
        eft_branch_code,
        eft_account_type,
        eft_reference_prefix,
        currency
      `)
      .eq('slug', slug)
      .eq('discoverable', true)
      .single()

    if (error || !tenant) {
      return res.status(404).json({ error: 'Property not found' })
    }

    // Build payment methods response
    const paymentMethods: {
      paystack?: { enabled: boolean; publicKey: string }
      eft?: {
        enabled: boolean
        accountHolder: string
        bankName: string
        accountNumber: string
        branchCode: string
        accountType: string
        referencePrefix?: string
      }
      paypal?: { enabled: boolean; clientId: string }
    } = {}

    // Paystack
    if (tenant.paystack_enabled) {
      const publicKey = tenant.paystack_mode === 'live'
        ? tenant.paystack_live_public_key
        : tenant.paystack_test_public_key

      if (publicKey) {
        paymentMethods.paystack = {
          enabled: true,
          publicKey
        }
      }
    }

    // EFT
    if (tenant.eft_enabled && tenant.eft_account_number) {
      paymentMethods.eft = {
        enabled: true,
        accountHolder: tenant.eft_account_holder || '',
        bankName: tenant.eft_bank_name || '',
        accountNumber: tenant.eft_account_number,
        branchCode: tenant.eft_branch_code || '',
        accountType: tenant.eft_account_type || 'Cheque',
        referencePrefix: tenant.eft_reference_prefix || undefined
      }
    }

    // PayPal - not yet implemented in database

    res.json({
      currency: tenant.currency || 'ZAR',
      methods: paymentMethods,
      hasPaymentMethods: Object.keys(paymentMethods).length > 0
    })
  } catch (error) {
    console.error('Error fetching payment methods:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * GET /api/discovery/bookings/:id
 * Get booking details by ID (for confirmation page)
 */
router.get('/bookings/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params

    // Get booking with related data
    const { data: booking, error } = await supabase
      .from('bookings')
      .select(`
        id,
        guest_name,
        guest_email,
        guest_phone,
        room_id,
        room_name,
        check_in,
        check_out,
        status,
        payment_status,
        total_amount,
        currency,
        notes,
        created_at,
        tenant_id
      `)
      .eq('id', id)
      .single()

    if (error || !booking) {
      return res.status(404).json({ error: 'Booking not found' })
    }

    // Get tenant/property details
    const { data: tenant } = await supabase
      .from('tenants')
      .select(`
        slug,
        business_name,
        business_email,
        business_phone,
        address_line1,
        city,
        state_province,
        check_in_time,
        check_out_time
      `)
      .eq('id', booking.tenant_id)
      .single()

    // Parse notes for additional data
    let parsedNotes: {
      guests?: number
      booking_reference?: string
      addons?: Array<{ id: string; quantity: number }>
      special_requests?: string
    } = {}

    try {
      if (booking.notes) {
        parsedNotes = typeof booking.notes === 'string'
          ? JSON.parse(booking.notes)
          : booking.notes
      }
    } catch (e) {
      console.warn('Failed to parse booking notes:', e)
    }

    // Calculate nights
    const checkInDate = new Date(booking.check_in)
    const checkOutDate = new Date(booking.check_out)
    const nights = Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24))

    res.json({
      id: booking.id,
      reference: parsedNotes.booking_reference || `VILO-${booking.id.substring(0, 4).toUpperCase()}`,
      status: booking.status,
      payment_status: booking.payment_status,
      property: {
        id: booking.tenant_id,
        name: tenant?.business_name || 'Property',
        slug: tenant?.slug || '',
        address: [tenant?.address_line1, tenant?.city, tenant?.state_province].filter(Boolean).join(', '),
        email: tenant?.business_email || '',
        phone: tenant?.business_phone || '',
        checkInTime: tenant?.check_in_time || '14:00',
        checkOutTime: tenant?.check_out_time || '10:00'
      },
      room: {
        id: booking.room_id,
        name: booking.room_name
      },
      guest: {
        name: booking.guest_name,
        email: booking.guest_email,
        phone: booking.guest_phone
      },
      dates: {
        checkIn: booking.check_in,
        checkOut: booking.check_out,
        nights
      },
      guests: parsedNotes.guests || 1,
      total: booking.total_amount,
      currency: booking.currency || 'ZAR',
      createdAt: booking.created_at
    })
  } catch (error) {
    console.error('Error fetching booking:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * POST /api/discovery/bookings/:id/verify-payment
 * Verify Paystack payment and update booking status
 */
router.post('/bookings/:id/verify-payment', async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const { reference } = req.body

    if (!reference) {
      return res.status(400).json({ error: 'Payment reference is required' })
    }

    // Get booking with tenant details
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select(`
        id,
        tenant_id,
        total_amount,
        currency,
        status,
        payment_status,
        notes
      `)
      .eq('id', id)
      .single()

    if (bookingError || !booking) {
      return res.status(404).json({ error: 'Booking not found' })
    }

    // Get tenant's Paystack credentials
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select(`
        paystack_mode,
        paystack_test_secret_key,
        paystack_live_secret_key
      `)
      .eq('id', booking.tenant_id)
      .single()

    if (tenantError || !tenant) {
      return res.status(404).json({ error: 'Property configuration not found' })
    }

    // Get the appropriate secret key based on mode
    const secretKey = tenant.paystack_mode === 'live'
      ? tenant.paystack_live_secret_key
      : tenant.paystack_test_secret_key

    if (!secretKey) {
      return res.status(400).json({ error: 'Payment configuration not set up' })
    }

    // Verify payment with Paystack
    const paystackResponse = await fetch(
      `https://api.paystack.co/transaction/verify/${reference}`,
      {
        headers: {
          Authorization: `Bearer ${secretKey}`,
          'Content-Type': 'application/json'
        }
      }
    )

    const paystackData = await paystackResponse.json() as {
      status: boolean
      message?: string
      data?: {
        status: string
        amount: number
        currency: string
        reference: string
      }
    }

    if (!paystackData.status || paystackData.data?.status !== 'success') {
      return res.status(400).json({
        error: 'Payment verification failed',
        details: paystackData.message || 'Transaction not successful'
      })
    }

    // Verify amount matches (Paystack returns amount in kobo/cents)
    const paidAmount = (paystackData.data?.amount || 0) / 100
    const expectedAmount = booking.total_amount

    // Allow small rounding differences (within 1 unit of currency)
    if (Math.abs(paidAmount - expectedAmount) > 1) {
      console.error('Amount mismatch:', { paid: paidAmount, expected: expectedAmount })
      return res.status(400).json({
        error: 'Payment amount mismatch',
        details: `Paid: ${paidAmount}, Expected: ${expectedAmount}`
      })
    }

    // Update booking status with payment tracking
    const paymentCompletedAt = new Date().toISOString()
    const { data: updatedBooking, error: updateError } = await supabase
      .from('bookings')
      .update({
        status: 'confirmed',
        payment_status: 'paid',
        payment_method: 'paystack',
        payment_reference: reference,
        payment_completed_at: paymentCompletedAt,
        notes: JSON.stringify({
          ...(typeof booking.notes === 'string' ? JSON.parse(booking.notes || '{}') : booking.notes || {}),
          paystack_reference: reference,
          payment_verified_at: paymentCompletedAt
        })
      })
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating booking:', updateError)
      return res.status(500).json({ error: 'Failed to update booking status' })
    }

    // Parse notes for reference
    let parsedNotes: { booking_reference?: string } = {}
    try {
      parsedNotes = typeof updatedBooking.notes === 'string'
        ? JSON.parse(updatedBooking.notes)
        : updatedBooking.notes || {}
    } catch (e) {
      // ignore parsing errors
    }

    res.json({
      success: true,
      booking: {
        id: updatedBooking.id,
        reference: parsedNotes.booking_reference || `VILO-${updatedBooking.id.substring(0, 4).toUpperCase()}`,
        status: updatedBooking.status,
        payment_status: updatedBooking.payment_status
      }
    })
  } catch (error) {
    console.error('Error verifying payment:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * GET /api/discovery/properties/:slug/addons
 * Get available add-ons for a property
 */
router.get('/properties/:slug/addons', async (req: Request, res: Response) => {
  try {
    const { slug } = req.params

    // Get tenant by slug
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select('id')
      .eq('slug', slug)
      .eq('discoverable', true)
      .single()

    if (tenantError || !tenant) {
      return res.status(404).json({ error: 'Property not found' })
    }

    // Get active addons
    const { data: addons, error: addonsError } = await supabase
      .from('addons')
      .select(`
        id,
        name,
        description,
        price,
        pricing_type,
        max_quantity,
        image
      `)
      .eq('tenant_id', tenant.id)
      .eq('is_active', true)
      .order('name', { ascending: true })

    if (addonsError) {
      console.error('Error fetching addons:', addonsError)
      return res.status(500).json({ error: 'Failed to fetch add-ons' })
    }

    res.json({
      addons: (addons || []).map(addon => ({
        id: addon.id,
        name: addon.name,
        description: addon.description,
        price: addon.price,
        pricingType: addon.pricing_type, // per_booking, per_night, per_guest, per_guest_per_night
        maxQuantity: addon.max_quantity || 10,
        imageUrl: addon.image?.url || null // image is JSONB: {url, path}
      }))
    })
  } catch (error) {
    console.error('Error fetching addons:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * GET /api/discovery/properties/map
 * Get minimal property data for map markers
 * Returns only: id, slug, name, lat, lng, priceFrom
 */
router.get('/properties-map', async (req: Request, res: Response) => {
  try {
    const {
      destination_slug,
      province_slug,
      country_code,
      categories,
      bounds_ne_lat,
      bounds_ne_lng,
      bounds_sw_lat,
      bounds_sw_lng
    } = req.query

    // Get all discoverable tenants with coordinates
    let query = supabase
      .from('tenants')
      .select(`
        id,
        slug,
        business_name,
        latitude,
        longitude,
        destination_id,
        province_id,
        country_id,
        category_slugs,
        rooms (
          base_price_per_night,
          currency
        )
      `)
      .eq('discoverable', true)
      .not('latitude', 'is', null)
      .not('longitude', 'is', null)

    // Filter by destination
    if (destination_slug && typeof destination_slug === 'string') {
      const { data: dest } = await supabase
        .from('destinations')
        .select('id')
        .eq('slug', destination_slug)
        .single()
      if (dest) {
        query = query.eq('destination_id', dest.id)
      }
    }

    // Filter by province
    if (province_slug && typeof province_slug === 'string') {
      const { data: prov } = await supabase
        .from('provinces')
        .select('id')
        .eq('slug', province_slug)
        .single()
      if (prov) {
        query = query.eq('province_id', prov.id)
      }
    }

    // Filter by country
    if (country_code && typeof country_code === 'string') {
      const { data: ctry } = await supabase
        .from('countries')
        .select('id')
        .eq('code', country_code.toUpperCase())
        .single()
      if (ctry) {
        query = query.eq('country_id', ctry.id)
      }
    }

    const { data: tenants, error } = await query

    if (error) throw error

    // Filter by map bounds if provided
    let filtered = tenants || []

    if (bounds_ne_lat && bounds_ne_lng && bounds_sw_lat && bounds_sw_lng) {
      const neLat = parseFloat(bounds_ne_lat as string)
      const neLng = parseFloat(bounds_ne_lng as string)
      const swLat = parseFloat(bounds_sw_lat as string)
      const swLng = parseFloat(bounds_sw_lng as string)

      if (!isNaN(neLat) && !isNaN(neLng) && !isNaN(swLat) && !isNaN(swLng)) {
        filtered = filtered.filter(t =>
          t.latitude >= swLat && t.latitude <= neLat &&
          t.longitude >= swLng && t.longitude <= neLng
        )
      }
    }

    // Filter by categories
    if (categories && typeof categories === 'string') {
      const categoryList = categories.split(',').map(c => c.trim().toLowerCase())
      filtered = filtered.filter(t => {
        const propCategories = (t.category_slugs as string[]) || []
        return categoryList.some(cat => propCategories.includes(cat))
      })
    }

    // Build minimal response
    const markers = filtered.map(t => {
      const rooms = t.rooms || []
      const prices = rooms.map((r: any) => r.base_price_per_night).filter(Boolean)
      const priceFrom = prices.length > 0 ? Math.min(...prices) : null
      const currency = rooms[0]?.currency || 'ZAR'

      return {
        id: t.id,
        slug: t.slug,
        name: t.business_name,
        latitude: t.latitude,
        longitude: t.longitude,
        priceFrom,
        currency
      }
    })

    res.json({ markers })
  } catch (error) {
    console.error('Error fetching map properties:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * GET /api/discovery/platform-stats
 * Get platform-wide statistics for the landing page
 * Returns: total revenue, fees saved, properties, bookings
 */
router.get('/platform-stats', async (req: Request, res: Response) => {
  try {
    // Industry standard OTA commission rate (average of Airbnb 15%, Booking.com 15-20%)
    const OTA_COMMISSION_RATE = 0.15

    // Get total revenue from paid bookings
    const { data: revenueData, error: revenueError } = await supabase
      .from('bookings')
      .select('total_amount')
      .eq('payment_status', 'paid')

    if (revenueError) {
      console.error('Error fetching revenue:', revenueError)
    }

    const totalRevenue = (revenueData || []).reduce((sum, booking) => {
      return sum + (Number(booking.total_amount) || 0)
    }, 0)

    // Calculate fees saved (what hosts would have paid to OTAs)
    const feesSaved = Math.round(totalRevenue * OTA_COMMISSION_RATE)

    // Get total discoverable properties count
    const { count: propertiesCount, error: propertiesError } = await supabase
      .from('tenants')
      .select('id', { count: 'exact', head: true })
      .eq('discoverable', true)

    if (propertiesError) {
      console.error('Error counting properties:', propertiesError)
    }

    // Get total completed bookings count
    const { count: bookingsCount, error: bookingsError } = await supabase
      .from('bookings')
      .select('id', { count: 'exact', head: true })
      .eq('payment_status', 'paid')

    if (bookingsError) {
      console.error('Error counting bookings:', bookingsError)
    }

    // Get total reviews count
    const { count: reviewsCount, error: reviewsError } = await supabase
      .from('reviews')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'approved')

    if (reviewsError) {
      console.error('Error counting reviews:', reviewsError)
    }

    // Get average rating
    const { data: ratingsData, error: ratingsError } = await supabase
      .from('reviews')
      .select('rating')
      .eq('status', 'approved')

    let averageRating = 0
    if (!ratingsError && ratingsData && ratingsData.length > 0) {
      const sum = ratingsData.reduce((acc, r) => acc + (r.rating || 0), 0)
      averageRating = Math.round((sum / ratingsData.length) * 10) / 10
    }

    res.json({
      totalRevenue,
      feesSaved,
      commissionRate: OTA_COMMISSION_RATE,
      propertiesCount: propertiesCount || 0,
      bookingsCount: bookingsCount || 0,
      reviewsCount: reviewsCount || 0,
      averageRating,
      currency: 'ZAR'
    })
  } catch (error) {
    console.error('Error fetching platform stats:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * POST /api/discovery/properties/:slug/claim-coupon
 * Submit a coupon claim request (creates a support ticket)
 * For coupons with is_claimable = true
 */
router.post('/properties/:slug/claim-coupon', async (req: Request, res: Response) => {
  try {
    const { slug } = req.params
    const {
      coupon_code,
      name,
      email,
      phone,
      check_in,
      check_out,
      message
    } = req.body

    // Validate required fields
    if (!coupon_code || !name || !email || !phone) {
      return res.status(400).json({
        error: 'Missing required fields: coupon_code, name, email, phone'
      })
    }

    // Get tenant by slug
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select('id, business_name, business_email')
      .eq('slug', slug)
      .eq('discoverable', true)
      .single()

    if (tenantError || !tenant) {
      return res.status(404).json({ error: 'Property not found' })
    }

    // Find the coupon by code for this tenant
    const { data: coupon, error: couponError } = await supabase
      .from('coupons')
      .select('id, code, name, description, discount_type, discount_value, is_claimable, is_active')
      .eq('tenant_id', tenant.id)
      .ilike('code', coupon_code.trim())
      .single()

    if (couponError || !coupon) {
      return res.status(404).json({ error: 'Coupon not found' })
    }

    // Verify the coupon is claimable
    if (!coupon.is_claimable) {
      return res.status(400).json({ error: 'This coupon is not available for claim requests' })
    }

    // Verify the coupon is active
    if (!coupon.is_active) {
      return res.status(400).json({ error: 'This coupon is no longer active' })
    }

    // Format the message for the support ticket
    const discountText = coupon.discount_type === 'percentage'
      ? `${coupon.discount_value}% off`
      : coupon.discount_type === 'fixed_amount'
        ? `R${coupon.discount_value} off`
        : `${coupon.discount_value} free nights`

    const ticketMessage = `
Coupon Claim Request

Coupon Details:
- Code: ${coupon.code}
- Name: ${coupon.name}
- Discount: ${discountText}
${coupon.description ? `- Description: ${coupon.description}` : ''}

Contact Information:
- Name: ${name}
- Email: ${email}
- Phone: ${phone}

${check_in || check_out ? `Intended Stay:
- Check-in: ${check_in || 'Not specified'}
- Check-out: ${check_out || 'Not specified'}
` : ''}
${message ? `Additional Message:
${message}` : ''}
`.trim()

    // Create support ticket
    const { data: ticket, error: ticketError } = await supabase
      .from('support_messages')
      .insert({
        tenant_id: tenant.id,
        subject: `Coupon Claim Request: ${coupon.code}`,
        message: ticketMessage,
        sender_email: email,
        sender_name: name,
        sender_phone: phone,
        source: 'website',
        status: 'new',
        priority: 'normal'
      })
      .select('id')
      .single()

    if (ticketError) {
      console.error('Error creating support ticket:', ticketError)
      return res.status(500).json({ error: 'Failed to submit claim request' })
    }

    // Create or get customer account and issue session token
    // This allows the user to access the customer portal immediately
    let customerToken: string | null = null
    let customerId: string | null = null

    try {
      // getOrCreateCustomer already handles updating name/phone if missing
      const customer = await getOrCreateCustomer(email, name, phone)
      if (customer) {
        customerId = customer.id

        // Link the support message to the customer
        await supabase
          .from('support_messages')
          .update({ customer_id: customer.id })
          .eq('id', ticket.id)

        // Create session token for immediate portal access
        const session = await createSessionToken(customer.id)
        if (session) {
          customerToken = session.token
        }
      }
    } catch (customerError) {
      // Don't fail the whole request if customer creation fails
      console.error('Error creating customer session:', customerError)
    }

    res.json({
      success: true,
      message: 'Your coupon claim request has been submitted. The property owner will contact you shortly.',
      ticket_id: ticket.id,
      tenant_id: tenant.id,
      tenant_name: tenant.business_name,
      customer_token: customerToken,
      customer_id: customerId
    })
  } catch (error) {
    console.error('Error processing coupon claim:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * POST /api/discovery/properties/:slug/contact
 * Submit a contact/inquiry request to the property host
 * Creates a support ticket and customer account
 */
router.post('/properties/:slug/contact', async (req: Request, res: Response) => {
  try {
    const { slug } = req.params
    const {
      name,
      email,
      phone,
      check_in,
      check_out,
      guests,
      message
    } = req.body

    // Validate required fields
    if (!name || !email || !phone || !message) {
      return res.status(400).json({
        error: 'Missing required fields: name, email, phone, message'
      })
    }

    // Get tenant by slug
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select('id, business_name, business_email')
      .eq('slug', slug)
      .eq('discoverable', true)
      .single()

    if (tenantError || !tenant) {
      return res.status(404).json({ error: 'Property not found' })
    }

    // Format the message for the support ticket
    const ticketMessage = `
Inquiry from Website

Contact Information:
- Name: ${name}
- Email: ${email}
- Phone: ${phone}

${check_in || check_out || guests ? `Stay Details:
${check_in ? `- Check-in: ${check_in}` : ''}
${check_out ? `- Check-out: ${check_out}` : ''}
${guests ? `- Guests: ${guests}` : ''}
` : ''}
Message:
${message}
`.trim()

    // Create support ticket
    const { data: ticket, error: ticketError } = await supabase
      .from('support_messages')
      .insert({
        tenant_id: tenant.id,
        subject: `Website Inquiry from ${name}`,
        message: ticketMessage,
        sender_email: email,
        sender_name: name,
        sender_phone: phone,
        source: 'website',
        status: 'new',
        priority: 'normal'
      })
      .select('id')
      .single()

    if (ticketError) {
      console.error('Error creating support ticket:', ticketError)
      return res.status(500).json({ error: 'Failed to submit inquiry' })
    }

    // Create or get customer account and issue session token
    let customerToken: string | null = null
    let customerId: string | null = null

    try {
      const customer = await getOrCreateCustomer(email, name, phone)
      if (customer) {
        customerId = customer.id

        // Link the support message to the customer
        await supabase
          .from('support_messages')
          .update({ customer_id: customer.id })
          .eq('id', ticket.id)

        // Create session token for immediate portal access
        const session = await createSessionToken(customer.id)
        if (session) {
          customerToken = session.token
        }
      }
    } catch (customerError) {
      console.error('Error creating customer session:', customerError)
    }

    res.json({
      success: true,
      message: 'Your inquiry has been submitted. The property host will contact you shortly.',
      ticket_id: ticket.id,
      tenant_id: tenant.id,
      tenant_name: tenant.business_name,
      customer_token: customerToken,
      customer_id: customerId
    })
  } catch (error) {
    console.error('Error processing contact inquiry:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * GET /api/discovery/properties/:slug/claimable-coupons
 * Get all claimable coupons for a property
 */
router.get('/properties/:slug/claimable-coupons', async (req: Request, res: Response) => {
  try {
    const { slug } = req.params

    // Get tenant by slug
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select('id')
      .eq('slug', slug)
      .eq('discoverable', true)
      .single()

    if (tenantError || !tenant) {
      return res.status(404).json({ error: 'Property not found' })
    }

    // Get all active claimable coupons for this tenant
    const { data: coupons, error: couponsError } = await supabase
      .from('coupons')
      .select(`
        id,
        code,
        name,
        description,
        discount_type,
        discount_value,
        valid_from,
        valid_until
      `)
      .eq('tenant_id', tenant.id)
      .eq('is_active', true)
      .eq('is_claimable', true)
      .order('created_at', { ascending: false })

    if (couponsError) {
      console.error('Error fetching claimable coupons:', couponsError)
      return res.status(500).json({ error: 'Failed to fetch coupons' })
    }

    // Filter out expired coupons
    const today = new Date().toISOString().split('T')[0]
    const validCoupons = (coupons || []).filter(coupon => {
      if (coupon.valid_until && coupon.valid_until < today) {
        return false
      }
      return true
    })

    res.json(validCoupons)
  } catch (error) {
    console.error('Error fetching claimable coupons:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * GET /api/discovery/properties/:slug/coupon/:code
 * Get coupon info by code for a property (including applicable rooms)
 */
router.get('/properties/:slug/coupon/:code', async (req: Request, res: Response) => {
  try {
    const { slug, code } = req.params

    // Get tenant by slug
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select('id')
      .eq('slug', slug)
      .eq('discoverable', true)
      .single()

    if (tenantError || !tenant) {
      return res.status(404).json({ error: 'Property not found' })
    }

    // Get coupon by code (case-insensitive)
    const { data: coupon, error: couponError } = await supabase
      .from('coupons')
      .select(`
        id,
        code,
        name,
        description,
        discount_type,
        discount_value,
        valid_from,
        valid_until,
        applicable_room_ids
      `)
      .eq('tenant_id', tenant.id)
      .eq('is_active', true)
      .ilike('code', code)
      .single()

    if (couponError || !coupon) {
      return res.status(404).json({ error: 'Coupon not found' })
    }

    // Check if coupon is expired
    const today = new Date().toISOString().split('T')[0]
    if (coupon.valid_until && coupon.valid_until < today) {
      return res.status(404).json({ error: 'Coupon has expired' })
    }

    // Get room names if applicable_room_ids exists
    let applicable_rooms: { id: string; name: string }[] = []
    if (coupon.applicable_room_ids && coupon.applicable_room_ids.length > 0) {
      const { data: rooms } = await supabase
        .from('rooms')
        .select('id, name')
        .in('id', coupon.applicable_room_ids)

      applicable_rooms = rooms || []
    }

    res.json({
      ...coupon,
      applicable_rooms
    })
  } catch (error) {
    console.error('Error fetching coupon by code:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router

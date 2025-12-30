import { Router, Request, Response } from 'express'
import { supabase } from '../lib/supabase.js'

const router = Router()

// ============================================
// TYPES
// ============================================

interface DirectoryProperty {
  id: string
  slug: string
  custom_domain: string | null
  business_name: string
  business_description: string | null
  directory_description: string | null
  directory_featured_image_url: string | null
  directory_tags: string[]
  logo_url: string | null
  city: string | null
  state_province: string | null
  country: string | null
  website_url: string
  primary_color: string | null
  accent_color: string | null
  room_count?: number
  min_price?: number
  max_price?: number
  currency?: string
  average_rating?: number
  review_count?: number
}

// ============================================
// ROUTES
// ============================================

/**
 * GET /directory/properties
 * List all properties in the directory (public, no auth required)
 */
router.get('/properties', async (req: Request, res: Response) => {
  try {
    const {
      search,
      city,
      country,
      tags,
      sort = 'name',
      limit = '20',
      offset = '0'
    } = req.query

    // Build the query
    let query = supabase
      .from('tenants')
      .select(`
        id,
        slug,
        custom_domain,
        domain_verification_status,
        business_name,
        business_description,
        directory_description,
        directory_featured_image_url,
        directory_tags,
        logo_url,
        city,
        state_province,
        country,
        currency
      `)
      .eq('is_listed_in_directory', true)
      .not('slug', 'is', null)

    // Search filter
    if (search && typeof search === 'string') {
      query = query.or(`business_name.ilike.%${search}%,directory_description.ilike.%${search}%,city.ilike.%${search}%`)
    }

    // City filter
    if (city && typeof city === 'string') {
      query = query.ilike('city', `%${city}%`)
    }

    // Country filter
    if (country && typeof country === 'string') {
      query = query.eq('country', country)
    }

    // Tags filter (any match)
    if (tags && typeof tags === 'string') {
      const tagList = tags.split(',').map(t => t.trim())
      query = query.overlaps('directory_tags', tagList)
    }

    // Sorting
    switch (sort) {
      case 'newest':
        query = query.order('created_at', { ascending: false })
        break
      case 'name':
      default:
        query = query.order('business_name', { ascending: true })
        break
    }

    // Pagination
    const limitNum = Math.min(parseInt(limit as string) || 20, 100)
    const offsetNum = parseInt(offset as string) || 0
    query = query.range(offsetNum, offsetNum + limitNum - 1)

    const { data: tenants, error } = await query

    if (error) {
      console.error('Error fetching directory properties:', error)
      return res.status(500).json({ error: 'Failed to fetch properties' })
    }

    // Transform data and add website URLs
    const properties: DirectoryProperty[] = (tenants || []).map(tenant => ({
      id: tenant.id,
      slug: tenant.slug,
      custom_domain: tenant.custom_domain,
      business_name: tenant.business_name || 'Unnamed Property',
      business_description: tenant.business_description,
      directory_description: tenant.directory_description,
      directory_featured_image_url: tenant.directory_featured_image_url,
      directory_tags: tenant.directory_tags || [],
      logo_url: tenant.logo_url,
      city: tenant.city,
      state_province: tenant.state_province,
      country: tenant.country,
      currency: tenant.currency,
      // Generate website URL
      website_url: tenant.custom_domain && tenant.domain_verification_status === 'verified'
        ? `https://${tenant.custom_domain}`
        : `https://${tenant.slug}.vilo.io`,
      primary_color: null,
      accent_color: null
    }))

    // Get room counts and prices for each property
    const propertyIds = properties.map(p => p.id)
    if (propertyIds.length > 0) {
      const { data: roomStats } = await supabase
        .from('rooms')
        .select('tenant_id, base_price')
        .in('tenant_id', propertyIds)
        .eq('is_active', true)

      if (roomStats) {
        const statsMap = new Map<string, { count: number; minPrice: number; maxPrice: number }>()

        roomStats.forEach(room => {
          const existing = statsMap.get(room.tenant_id)
          if (existing) {
            existing.count++
            existing.minPrice = Math.min(existing.minPrice, room.base_price || Infinity)
            existing.maxPrice = Math.max(existing.maxPrice, room.base_price || 0)
          } else {
            statsMap.set(room.tenant_id, {
              count: 1,
              minPrice: room.base_price || 0,
              maxPrice: room.base_price || 0
            })
          }
        })

        properties.forEach(p => {
          const stats = statsMap.get(p.id)
          if (stats) {
            p.room_count = stats.count
            p.min_price = stats.minPrice === Infinity ? undefined : stats.minPrice
            p.max_price = stats.maxPrice || undefined
          }
        })
      }

      // Get review stats
      const { data: reviewStats } = await supabase
        .from('reviews')
        .select('tenant_id, rating')
        .in('tenant_id', propertyIds)
        .eq('status', 'approved')

      if (reviewStats) {
        const reviewMap = new Map<string, { total: number; count: number }>()

        reviewStats.forEach(review => {
          const existing = reviewMap.get(review.tenant_id)
          if (existing) {
            existing.total += review.rating
            existing.count++
          } else {
            reviewMap.set(review.tenant_id, {
              total: review.rating,
              count: 1
            })
          }
        })

        properties.forEach(p => {
          const stats = reviewMap.get(p.id)
          if (stats) {
            p.average_rating = Math.round((stats.total / stats.count) * 10) / 10
            p.review_count = stats.count
          }
        })
      }
    }

    // Get total count for pagination
    const { count } = await supabase
      .from('tenants')
      .select('id', { count: 'exact', head: true })
      .eq('is_listed_in_directory', true)

    res.json({
      properties,
      pagination: {
        total: count || 0,
        limit: limitNum,
        offset: offsetNum,
        has_more: (offsetNum + properties.length) < (count || 0)
      }
    })
  } catch (error) {
    console.error('Error in GET /directory/properties:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * GET /directory/properties/:slug
 * Get a single property by slug (for directory detail page)
 */
router.get('/properties/:slug', async (req: Request, res: Response) => {
  const { slug } = req.params

  try {
    const { data: tenant, error } = await supabase
      .from('tenants')
      .select(`
        id,
        slug,
        custom_domain,
        domain_verification_status,
        business_name,
        business_description,
        directory_description,
        directory_featured_image_url,
        directory_tags,
        logo_url,
        city,
        state_province,
        country,
        currency,
        business_email,
        business_phone
      `)
      .eq('slug', slug)
      .eq('is_listed_in_directory', true)
      .single()

    if (error || !tenant) {
      return res.status(404).json({ error: 'Property not found' })
    }

    // Get rooms
    const { data: rooms } = await supabase
      .from('rooms')
      .select('id, name, base_price, max_guests, images')
      .eq('tenant_id', tenant.id)
      .eq('is_active', true)
      .order('base_price', { ascending: true })
      .limit(6)

    // Get reviews
    const { data: reviews } = await supabase
      .from('reviews')
      .select('id, guest_name, rating, comment, stay_date, created_at')
      .eq('tenant_id', tenant.id)
      .eq('status', 'approved')
      .order('created_at', { ascending: false })
      .limit(5)

    // Calculate stats
    const { data: allReviews } = await supabase
      .from('reviews')
      .select('rating')
      .eq('tenant_id', tenant.id)
      .eq('status', 'approved')

    let averageRating = null
    let reviewCount = 0
    if (allReviews && allReviews.length > 0) {
      reviewCount = allReviews.length
      const totalRating = allReviews.reduce((sum, r) => sum + r.rating, 0)
      averageRating = Math.round((totalRating / reviewCount) * 10) / 10
    }

    const property: DirectoryProperty & {
      rooms: any[]
      reviews: any[]
      contact: { email: string | null; phone: string | null }
    } = {
      id: tenant.id,
      slug: tenant.slug,
      custom_domain: tenant.custom_domain,
      business_name: tenant.business_name || 'Unnamed Property',
      business_description: tenant.business_description,
      directory_description: tenant.directory_description,
      directory_featured_image_url: tenant.directory_featured_image_url,
      directory_tags: tenant.directory_tags || [],
      logo_url: tenant.logo_url,
      city: tenant.city,
      state_province: tenant.state_province,
      country: tenant.country,
      currency: tenant.currency,
      website_url: tenant.custom_domain && tenant.domain_verification_status === 'verified'
        ? `https://${tenant.custom_domain}`
        : `https://${tenant.slug}.vilo.io`,
      primary_color: null,
      accent_color: null,
      room_count: rooms?.length || 0,
      min_price: rooms && rooms.length > 0 ? rooms[0].base_price : undefined,
      max_price: rooms && rooms.length > 0 ? rooms[rooms.length - 1].base_price : undefined,
      average_rating: averageRating ?? undefined,
      review_count: reviewCount,
      rooms: rooms || [],
      reviews: reviews || [],
      contact: {
        email: tenant.business_email,
        phone: tenant.business_phone
      }
    }

    res.json(property)
  } catch (error) {
    console.error('Error in GET /directory/properties/:slug:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * GET /directory/search
 * Search properties with autocomplete
 */
router.get('/search', async (req: Request, res: Response) => {
  const { q, limit = '5' } = req.query

  if (!q || typeof q !== 'string' || q.length < 2) {
    return res.json([])
  }

  try {
    const { data, error } = await supabase
      .from('tenants')
      .select('id, slug, business_name, city, country, logo_url')
      .eq('is_listed_in_directory', true)
      .or(`business_name.ilike.%${q}%,city.ilike.%${q}%`)
      .limit(parseInt(limit as string) || 5)

    if (error) {
      console.error('Error searching directory:', error)
      return res.status(500).json({ error: 'Search failed' })
    }

    res.json((data || []).map(t => ({
      id: t.id,
      slug: t.slug,
      name: t.business_name,
      location: [t.city, t.country].filter(Boolean).join(', '),
      logo_url: t.logo_url
    })))
  } catch (error) {
    console.error('Error in GET /directory/search:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * GET /directory/locations
 * Get list of locations with property counts
 */
router.get('/locations', async (req: Request, res: Response) => {
  try {
    const { data, error } = await supabase
      .from('tenants')
      .select('city, country')
      .eq('is_listed_in_directory', true)
      .not('city', 'is', null)

    if (error) {
      console.error('Error fetching locations:', error)
      return res.status(500).json({ error: 'Failed to fetch locations' })
    }

    // Count properties per city
    const locationCounts = new Map<string, { city: string; country: string; count: number }>()

    data?.forEach(t => {
      if (t.city) {
        const key = `${t.city}-${t.country}`
        const existing = locationCounts.get(key)
        if (existing) {
          existing.count++
        } else {
          locationCounts.set(key, {
            city: t.city,
            country: t.country || '',
            count: 1
          })
        }
      }
    })

    const locations = Array.from(locationCounts.values())
      .sort((a, b) => b.count - a.count)

    res.json(locations)
  } catch (error) {
    console.error('Error in GET /directory/locations:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * GET /directory/tags
 * Get list of all tags used in directory
 */
router.get('/tags', async (req: Request, res: Response) => {
  try {
    const { data, error } = await supabase
      .from('tenants')
      .select('directory_tags')
      .eq('is_listed_in_directory', true)

    if (error) {
      console.error('Error fetching tags:', error)
      return res.status(500).json({ error: 'Failed to fetch tags' })
    }

    // Collect all unique tags with counts
    const tagCounts = new Map<string, number>()

    data?.forEach(t => {
      (t.directory_tags || []).forEach((tag: string) => {
        tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1)
      })
    })

    const tags = Array.from(tagCounts.entries())
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count)

    res.json(tags)
  } catch (error) {
    console.error('Error in GET /directory/tags:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * GET /directory/featured
 * Get featured/highlighted properties
 */
router.get('/featured', async (req: Request, res: Response) => {
  const limit = parseInt(req.query.limit as string) || 6

  try {
    // For now, just get properties with most reviews as "featured"
    // In the future, this could be curated or based on other criteria
    const { data: tenants, error } = await supabase
      .from('tenants')
      .select(`
        id,
        slug,
        custom_domain,
        domain_verification_status,
        business_name,
        directory_description,
        directory_featured_image_url,
        logo_url,
        city,
        country
      `)
      .eq('is_listed_in_directory', true)
      .not('directory_featured_image_url', 'is', null)
      .limit(limit)

    if (error) {
      console.error('Error fetching featured properties:', error)
      return res.status(500).json({ error: 'Failed to fetch featured properties' })
    }

    const properties = (tenants || []).map(tenant => ({
      id: tenant.id,
      slug: tenant.slug,
      business_name: tenant.business_name || 'Unnamed Property',
      directory_description: tenant.directory_description,
      directory_featured_image_url: tenant.directory_featured_image_url,
      logo_url: tenant.logo_url,
      city: tenant.city,
      country: tenant.country,
      website_url: tenant.custom_domain && tenant.domain_verification_status === 'verified'
        ? `https://${tenant.custom_domain}`
        : `https://${tenant.slug}.vilo.io`
    }))

    res.json(properties)
  } catch (error) {
    console.error('Error in GET /directory/featured:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router

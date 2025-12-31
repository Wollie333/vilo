import { Router, Request, Response } from 'express'
import { supabase } from '../lib/supabase'

const router = Router()

// GET /api/categories - List all categories (grouped by type)
router.get('/', async (req: Request, res: Response) => {
  try {
    const { type } = req.query

    let query = supabase
      .from('property_categories')
      .select('id, name, slug, description, icon, image_url, category_type, display_order')
      .eq('is_active', true)
      .order('display_order', { ascending: true })

    if (type && (type === 'experience' || type === 'trip_type')) {
      query = query.eq('category_type', type)
    }

    const { data: categories, error } = await query

    if (error) throw error

    // Get property counts per category
    const { data: tenantCategories, error: countError } = await supabase
      .from('tenant_categories')
      .select(`
        category_id,
        tenants!inner (
          id,
          discoverable
        )
      `)

    if (countError) throw countError

    const countMap: Record<string, number> = {}
    tenantCategories?.forEach(tc => {
      // @ts-ignore - nested filter
      if (tc.tenants?.discoverable) {
        countMap[tc.category_id] = (countMap[tc.category_id] || 0) + 1
      }
    })

    // Group by category type if no type filter
    if (!type) {
      const grouped = {
        experience: categories?.filter(c => c.category_type === 'experience').map(c => ({
          ...c,
          propertyCount: countMap[c.id] || 0
        })) || [],
        trip_type: categories?.filter(c => c.category_type === 'trip_type').map(c => ({
          ...c,
          propertyCount: countMap[c.id] || 0
        })) || []
      }
      return res.json(grouped)
    }

    const result = categories?.map(c => ({
      ...c,
      propertyCount: countMap[c.id] || 0
    }))

    res.json(result)
  } catch (error) {
    console.error('Error fetching categories:', error)
    res.status(500).json({ error: 'Failed to fetch categories' })
  }
})

// GET /api/categories/:slug - Get category by slug
router.get('/:slug', async (req: Request, res: Response) => {
  try {
    const { slug } = req.params

    const { data: category, error } = await supabase
      .from('property_categories')
      .select('id, name, slug, description, icon, image_url, category_type')
      .eq('slug', slug)
      .eq('is_active', true)
      .single()

    if (error || !category) {
      return res.status(404).json({ error: 'Category not found' })
    }

    // Get property count
    const { data: tenantCategories, error: countError } = await supabase
      .from('tenant_categories')
      .select(`
        tenant_id,
        tenants!inner (
          discoverable
        )
      `)
      .eq('category_id', category.id)

    if (countError) throw countError

    // @ts-ignore
    const count = tenantCategories?.filter(tc => tc.tenants?.discoverable).length || 0

    res.json({
      ...category,
      propertyCount: count
    })
  } catch (error) {
    console.error('Error fetching category:', error)
    res.status(500).json({ error: 'Failed to fetch category' })
  }
})

// GET /api/categories/:slug/properties - Get properties in category
router.get('/:slug/properties', async (req: Request, res: Response) => {
  try {
    const { slug } = req.params
    const { limit = '20', offset = '0', sort = 'popular' } = req.query

    // Get category
    const { data: category, error: catError } = await supabase
      .from('property_categories')
      .select('id, name, slug')
      .eq('slug', slug)
      .eq('is_active', true)
      .single()

    if (catError || !category) {
      return res.status(404).json({ error: 'Category not found' })
    }

    // Get tenant IDs in this category
    const { data: tenantCategories, error: tcError } = await supabase
      .from('tenant_categories')
      .select('tenant_id')
      .eq('category_id', category.id)

    if (tcError) throw tcError

    const tenantIds = tenantCategories?.map(tc => tc.tenant_id) || []

    if (tenantIds.length === 0) {
      return res.json({
        category,
        properties: [],
        total: 0
      })
    }

    // Get properties
    const { data: tenants, error: tenantError } = await supabase
      .from('tenants')
      .select(`
        id,
        slug,
        business_name,
        directory_description,
        city,
        state_province,
        region,
        cover_image,
        gallery_images,
        property_type,
        directory_featured,
        latitude,
        longitude,
        category_slugs,
        rooms (
          id,
          base_price_per_night,
          currency
        )
      `)
      .in('id', tenantIds)
      .eq('discoverable', true)

    if (tenantError) throw tenantError

    // Get reviews for ratings
    const { data: reviews, error: reviewError } = await supabase
      .from('reviews')
      .select('tenant_id, rating')
      .in('tenant_id', tenantIds)
      .eq('status', 'published')

    if (reviewError) throw reviewError

    // Calculate ratings
    const ratingMap: Record<string, { sum: number; count: number }> = {}
    reviews?.forEach(r => {
      if (!ratingMap[r.tenant_id]) {
        ratingMap[r.tenant_id] = { sum: 0, count: 0 }
      }
      ratingMap[r.tenant_id].sum += r.rating
      ratingMap[r.tenant_id].count += 1
    })

    // Build properties array
    let properties = tenants?.map(t => {
      const rooms = t.rooms || []
      const prices = rooms.map((r: any) => r.base_price_per_night).filter(Boolean)
      const priceFrom = prices.length > 0 ? Math.min(...prices) : null
      const currency = rooms[0]?.currency || 'ZAR'

      const ratingData = ratingMap[t.id]
      const rating = ratingData ? ratingData.sum / ratingData.count : null
      const reviewCount = ratingData?.count || 0

      const images = t.gallery_images && Array.isArray(t.gallery_images) && t.gallery_images.length > 0
        ? t.gallery_images
        : t.cover_image
          ? [t.cover_image]
          : []

      return {
        id: t.id,
        slug: t.slug,
        tenantId: t.id,
        name: t.business_name,
        description: t.directory_description,
        location: {
          city: t.city || '',
          region: t.region || t.state_province || ''
        },
        images,
        priceFrom,
        currency,
        rating,
        reviewCount,
        propertyType: t.property_type || 'Accommodation',
        amenities: [],
        featured: t.directory_featured,
        latitude: t.latitude,
        longitude: t.longitude,
        categories: t.category_slugs || []
      }
    }) || []

    // Sort
    if (sort === 'price_asc') {
      properties.sort((a, b) => (a.priceFrom || 0) - (b.priceFrom || 0))
    } else if (sort === 'price_desc') {
      properties.sort((a, b) => (b.priceFrom || 0) - (a.priceFrom || 0))
    } else if (sort === 'rating') {
      properties.sort((a, b) => (b.rating || 0) - (a.rating || 0))
    } else {
      // Popular: featured first, then by review count
      properties.sort((a, b) => {
        if (a.featured && !b.featured) return -1
        if (!a.featured && b.featured) return 1
        return b.reviewCount - a.reviewCount
      })
    }

    const total = properties.length
    const offsetNum = parseInt(offset as string, 10)
    const limitNum = parseInt(limit as string, 10)
    properties = properties.slice(offsetNum, offsetNum + limitNum)

    res.json({
      category,
      properties,
      total
    })
  } catch (error) {
    console.error('Error fetching category properties:', error)
    res.status(500).json({ error: 'Failed to fetch properties' })
  }
})

export default router

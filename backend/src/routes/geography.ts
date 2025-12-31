import { Router, Request, Response } from 'express'
import { supabase } from '../lib/supabase'

const router = Router()

// GET /api/geography/countries - List all active countries
router.get('/countries', async (req: Request, res: Response) => {
  try {
    const { data: countries, error } = await supabase
      .from('countries')
      .select('id, name, code, slug, display_order')
      .eq('is_active', true)
      .order('display_order', { ascending: true })

    if (error) throw error

    // Get property counts per country
    const { data: counts, error: countError } = await supabase
      .from('tenants')
      .select('country_id')
      .eq('discoverable', true)

    if (countError) throw countError

    const countMap: Record<string, number> = {}
    counts?.forEach(t => {
      if (t.country_id) {
        countMap[t.country_id] = (countMap[t.country_id] || 0) + 1
      }
    })

    const result = countries?.map(c => ({
      ...c,
      propertyCount: countMap[c.id] || 0
    }))

    res.json(result)
  } catch (error) {
    console.error('Error fetching countries:', error)
    res.status(500).json({ error: 'Failed to fetch countries' })
  }
})

// GET /api/geography/provinces - List provinces (optionally filtered by country)
router.get('/provinces', async (req: Request, res: Response) => {
  try {
    const { country_id, country_code } = req.query

    let query = supabase
      .from('provinces')
      .select(`
        id,
        name,
        slug,
        abbreviation,
        image_url,
        display_order,
        country_id,
        countries (
          id,
          name,
          code,
          slug
        )
      `)
      .eq('is_active', true)
      .order('display_order', { ascending: true })

    if (country_id) {
      query = query.eq('country_id', country_id)
    } else if (country_code) {
      // Get country ID from code first
      const { data: country } = await supabase
        .from('countries')
        .select('id')
        .eq('code', country_code)
        .single()

      if (country) {
        query = query.eq('country_id', country.id)
      }
    }

    const { data: provinces, error } = await query

    if (error) throw error

    // Get property counts per province
    const { data: counts, error: countError } = await supabase
      .from('tenants')
      .select('province_id')
      .eq('discoverable', true)

    if (countError) throw countError

    const countMap: Record<string, number> = {}
    counts?.forEach(t => {
      if (t.province_id) {
        countMap[t.province_id] = (countMap[t.province_id] || 0) + 1
      }
    })

    const result = provinces?.map(p => ({
      ...p,
      propertyCount: countMap[p.id] || 0
    }))

    res.json(result)
  } catch (error) {
    console.error('Error fetching provinces:', error)
    res.status(500).json({ error: 'Failed to fetch provinces' })
  }
})

// GET /api/geography/provinces/:slug - Get province by slug
router.get('/provinces/:slug', async (req: Request, res: Response) => {
  try {
    const { slug } = req.params

    const { data: province, error } = await supabase
      .from('provinces')
      .select(`
        id,
        name,
        slug,
        abbreviation,
        image_url,
        display_order,
        country_id,
        countries (
          id,
          name,
          code,
          slug
        )
      `)
      .eq('slug', slug)
      .eq('is_active', true)
      .single()

    if (error || !province) {
      return res.status(404).json({ error: 'Province not found' })
    }

    // Get destinations in this province
    const { data: destinations, error: destError } = await supabase
      .from('destinations')
      .select('id, name, slug, description, image_url, is_featured, latitude, longitude')
      .eq('province_id', province.id)
      .eq('is_active', true)
      .order('display_order', { ascending: true })

    if (destError) throw destError

    // Get property count
    const { count, error: countError } = await supabase
      .from('tenants')
      .select('id', { count: 'exact', head: true })
      .eq('province_id', province.id)
      .eq('discoverable', true)

    if (countError) throw countError

    res.json({
      ...province,
      destinations,
      propertyCount: count || 0
    })
  } catch (error) {
    console.error('Error fetching province:', error)
    res.status(500).json({ error: 'Failed to fetch province' })
  }
})

// GET /api/geography/destinations - List destinations (optionally filtered)
router.get('/destinations', async (req: Request, res: Response) => {
  try {
    const { province_id, province_slug, country_id, country_code, featured } = req.query

    let query = supabase
      .from('destinations')
      .select(`
        id,
        name,
        slug,
        description,
        image_url,
        latitude,
        longitude,
        is_featured,
        display_order,
        province_id,
        country_id,
        provinces (
          id,
          name,
          slug
        ),
        countries (
          id,
          name,
          code,
          slug
        )
      `)
      .eq('is_active', true)
      .order('display_order', { ascending: true })

    if (province_id) {
      query = query.eq('province_id', province_id)
    } else if (province_slug) {
      const { data: province } = await supabase
        .from('provinces')
        .select('id')
        .eq('slug', province_slug)
        .single()

      if (province) {
        query = query.eq('province_id', province.id)
      }
    }

    if (country_id) {
      query = query.eq('country_id', country_id)
    } else if (country_code) {
      const { data: country } = await supabase
        .from('countries')
        .select('id')
        .eq('code', country_code)
        .single()

      if (country) {
        query = query.eq('country_id', country.id)
      }
    }

    if (featured === 'true') {
      query = query.eq('is_featured', true)
    }

    const { data: destinations, error } = await query

    if (error) throw error

    // Get property counts per destination
    const { data: counts, error: countError } = await supabase
      .from('tenants')
      .select('destination_id')
      .eq('discoverable', true)

    if (countError) throw countError

    const countMap: Record<string, number> = {}
    counts?.forEach(t => {
      if (t.destination_id) {
        countMap[t.destination_id] = (countMap[t.destination_id] || 0) + 1
      }
    })

    const result = destinations?.map(d => ({
      ...d,
      propertyCount: countMap[d.id] || 0
    }))

    res.json(result)
  } catch (error) {
    console.error('Error fetching destinations:', error)
    res.status(500).json({ error: 'Failed to fetch destinations' })
  }
})

// GET /api/geography/destinations/:slug - Get destination by slug with properties
router.get('/destinations/:slug', async (req: Request, res: Response) => {
  try {
    const { slug } = req.params

    const { data: destination, error } = await supabase
      .from('destinations')
      .select(`
        id,
        name,
        slug,
        description,
        image_url,
        latitude,
        longitude,
        is_featured,
        meta_title,
        meta_description,
        provinces (
          id,
          name,
          slug,
          countries (
            id,
            name,
            code,
            slug
          )
        ),
        countries (
          id,
          name,
          code,
          slug
        )
      `)
      .eq('slug', slug)
      .eq('is_active', true)
      .single()

    if (error || !destination) {
      return res.status(404).json({ error: 'Destination not found' })
    }

    // Get property count
    const { count, error: countError } = await supabase
      .from('tenants')
      .select('id', { count: 'exact', head: true })
      .eq('destination_id', destination.id)
      .eq('discoverable', true)

    if (countError) throw countError

    res.json({
      ...destination,
      propertyCount: count || 0
    })
  } catch (error) {
    console.error('Error fetching destination:', error)
    res.status(500).json({ error: 'Failed to fetch destination' })
  }
})

export default router

import { Router } from 'express'
import { supabase } from '../lib/supabase.js'

const router = Router()

// ============================================
// WEBSITE SETTINGS
// ============================================

// Get website settings for a tenant
router.get('/settings', async (req, res) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string

    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID required' })
    }

    const { data, error } = await supabase
      .from('website_settings')
      .select('*')
      .eq('tenant_id', tenantId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        // No settings exist yet, return defaults
        return res.json({
          tenant_id: tenantId,
          primary_color: '#1f2937',
          secondary_color: '#374151',
          accent_color: '#3b82f6',
          background_color: '#ffffff',
          text_color: '#111827',
          heading_font: 'Inter',
          body_font: 'Inter',
          default_seo_title: null,
          default_seo_description: null,
          default_og_image_url: null,
          social_links: {},
          google_analytics_id: null,
          facebook_pixel_id: null,
          header_config: {
            logo_position: 'left',
            show_cta_button: true,
            cta_text: 'Book Now',
            cta_link: '/book',
            cta_style: 'solid',
            sticky: true,
            transparent_on_hero: false
          },
          footer_config: {
            show_logo: true,
            show_description: true,
            description: '',
            columns: [
              {
                title: 'Quick Links',
                links: [
                  { label: 'Home', url: '/' },
                  { label: 'Rooms', url: '/accommodation' },
                  { label: 'Contact', url: '/contact' }
                ]
              },
              {
                title: 'Legal',
                links: [
                  { label: 'Privacy Policy', url: '/privacy' },
                  { label: 'Terms of Service', url: '/terms' }
                ]
              }
            ],
            show_social_icons: true,
            copyright_text: '',
            show_powered_by: false
          },
          navigation_config: {
            items: [
              { id: 'home', label: 'Home', url: '/', enabled: true, order: 1 },
              { id: 'accommodation', label: 'Accommodation', url: '/accommodation', enabled: true, order: 2 },
              { id: 'reviews', label: 'Reviews', url: '/reviews', enabled: true, order: 3 },
              { id: 'blog', label: 'Blog', url: '/blog', enabled: true, order: 4 },
              { id: 'contact', label: 'Contact', url: '/contact', enabled: true, order: 5 }
            ]
          },
          logo_url: null,
          favicon_url: null,
          theme_preset: 'modern',
          font_pairing_preset: 'modern',
          global_styles: {
            colors: {
              primary: '#2563eb',
              secondary: '#64748b',
              accent: '#10b981',
              headingText: '#1f2937',
              bodyText: '#4b5563',
              mutedText: '#9ca3af',
              background: '#ffffff',
              sectionBg: '#f9fafb',
              cardBg: '#ffffff',
              borderColor: '#e5e7eb'
            },
            typography: {
              headingFont: 'Inter',
              bodyFont: 'Inter',
              baseFontSize: 16,
              lineHeight: 1.6,
              headings: {
                h1: { size: 48, weight: 700, lineHeight: 1.2 },
                h2: { size: 36, weight: 600, lineHeight: 1.3 },
                h3: { size: 28, weight: 600, lineHeight: 1.4 },
                h4: { size: 22, weight: 500, lineHeight: 1.4 },
                h5: { size: 18, weight: 500, lineHeight: 1.5 },
                h6: { size: 16, weight: 500, lineHeight: 1.5 }
              }
            },
            buttons: {
              primary: {
                background: '#2563eb',
                text: '#ffffff',
                border: '#2563eb',
                hoverBg: '#1d4ed8',
                radius: 8,
                paddingY: 12,
                paddingX: 24
              },
              secondary: {
                background: 'transparent',
                text: '#2563eb',
                border: '#2563eb',
                hoverBg: '#eff6ff',
                radius: 8,
                paddingY: 12,
                paddingX: 24
              }
            },
            spacing: {
              sectionPaddingY: 80,
              containerMaxWidth: 1200,
              elementGap: 24,
              cardPadding: 24,
              cardRadius: 12
            }
          },
          menus: [
            { id: 'main-nav', name: 'Main Navigation', location: 'header', items: [] },
            { id: 'footer-nav', name: 'Footer Navigation', location: 'footer', items: [] }
          ]
        })
      }
      console.error('Error fetching website settings:', error)
      return res.status(500).json({ error: 'Failed to fetch settings' })
    }

    res.json(data)
  } catch (error: any) {
    console.error('Unexpected error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Update website settings
router.put('/settings', async (req, res) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string

    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID required' })
    }

    const {
      primary_color,
      secondary_color,
      accent_color,
      background_color,
      text_color,
      heading_font,
      body_font,
      default_seo_title,
      default_seo_description,
      default_og_image_url,
      social_links,
      google_analytics_id,
      facebook_pixel_id,
      header_config,
      footer_config,
      navigation_config,
      logo_url,
      favicon_url,
      theme_preset,
      font_pairing_preset,
      global_styles,
      menus
    } = req.body

    // Upsert settings
    const { data, error } = await supabase
      .from('website_settings')
      .upsert({
        tenant_id: tenantId,
        primary_color,
        secondary_color,
        accent_color,
        background_color,
        text_color,
        heading_font,
        body_font,
        default_seo_title,
        default_seo_description,
        default_og_image_url,
        social_links,
        google_analytics_id,
        facebook_pixel_id,
        header_config,
        footer_config,
        navigation_config,
        logo_url,
        favicon_url,
        theme_preset,
        font_pairing_preset,
        global_styles,
        menus,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'tenant_id'
      })
      .select()
      .single()

    if (error) {
      console.error('Error updating website settings:', error)
      return res.status(500).json({ error: 'Failed to update settings' })
    }

    res.json(data)
  } catch (error: any) {
    console.error('Unexpected error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// ============================================
// WEBSITE PAGES
// ============================================

// Get all pages for a tenant
router.get('/pages', async (req, res) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string

    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID required' })
    }

    const { data, error } = await supabase
      .from('website_pages')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('navigation_order', { ascending: true })

    if (error) {
      console.error('Error fetching pages:', error)
      return res.status(500).json({ error: 'Failed to fetch pages' })
    }

    res.json(data || [])
  } catch (error: any) {
    console.error('Unexpected error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Get single page by page_type
router.get('/pages/:pageType', async (req, res) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string
    const { pageType } = req.params

    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID required' })
    }

    const { data, error } = await supabase
      .from('website_pages')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('page_type', pageType)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: 'Page not found' })
      }
      console.error('Error fetching page:', error)
      return res.status(500).json({ error: 'Failed to fetch page' })
    }

    res.json(data)
  } catch (error: any) {
    console.error('Unexpected error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Update page settings (template, SEO, colors, etc.)
router.put('/pages/:pageType', async (req, res) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string
    const { pageType } = req.params

    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID required' })
    }

    const {
      template_id,
      title,
      is_published,
      is_in_navigation,
      navigation_order,
      seo_title,
      seo_description,
      seo_keywords,
      og_image_url,
      canonical_url,
      no_index,
      override_primary_color,
      override_secondary_color,
      override_accent_color,
      override_heading_font,
      override_body_font,
      hero_title,
      hero_subtitle,
      hero_image_url,
      hero_cta_text,
      hero_cta_link,
      content_sections
    } = req.body

    const { data, error } = await supabase
      .from('website_pages')
      .update({
        template_id,
        title,
        is_published,
        is_in_navigation,
        navigation_order,
        seo_title,
        seo_description,
        seo_keywords,
        og_image_url,
        canonical_url,
        no_index,
        override_primary_color,
        override_secondary_color,
        override_accent_color,
        override_heading_font,
        override_body_font,
        hero_title,
        hero_subtitle,
        hero_image_url,
        hero_cta_text,
        hero_cta_link,
        content_sections,
        updated_at: new Date().toISOString()
      })
      .eq('tenant_id', tenantId)
      .eq('page_type', pageType)
      .select()
      .single()

    if (error) {
      console.error('Error updating page:', error)
      return res.status(500).json({ error: 'Failed to update page' })
    }

    res.json(data)
  } catch (error: any) {
    console.error('Unexpected error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// ============================================
// BLOG CATEGORIES
// ============================================

// Get all categories
router.get('/blog/categories', async (req, res) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string

    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID required' })
    }

    const { data, error } = await supabase
      .from('blog_categories')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('name', { ascending: true })

    if (error) {
      console.error('Error fetching categories:', error)
      return res.status(500).json({ error: 'Failed to fetch categories' })
    }

    res.json(data || [])
  } catch (error: any) {
    console.error('Unexpected error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Create category
router.post('/blog/categories', async (req, res) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string

    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID required' })
    }

    const { name, slug, description, color } = req.body

    if (!name || !slug) {
      return res.status(400).json({ error: 'Name and slug are required' })
    }

    const { data, error } = await supabase
      .from('blog_categories')
      .insert({
        tenant_id: tenantId,
        name,
        slug: slug.toLowerCase().replace(/\s+/g, '-'),
        description,
        color
      })
      .select()
      .single()

    if (error) {
      if (error.code === '23505') {
        return res.status(400).json({ error: 'Category with this slug already exists' })
      }
      console.error('Error creating category:', error)
      return res.status(500).json({ error: 'Failed to create category' })
    }

    res.status(201).json(data)
  } catch (error: any) {
    console.error('Unexpected error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Update category
router.put('/blog/categories/:id', async (req, res) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string
    const { id } = req.params

    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID required' })
    }

    const { name, slug, description, color } = req.body

    const { data, error } = await supabase
      .from('blog_categories')
      .update({
        name,
        slug: slug?.toLowerCase().replace(/\s+/g, '-'),
        description,
        color,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .select()
      .single()

    if (error) {
      console.error('Error updating category:', error)
      return res.status(500).json({ error: 'Failed to update category' })
    }

    res.json(data)
  } catch (error: any) {
    console.error('Unexpected error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Delete category
router.delete('/blog/categories/:id', async (req, res) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string
    const { id } = req.params

    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID required' })
    }

    const { error } = await supabase
      .from('blog_categories')
      .delete()
      .eq('id', id)
      .eq('tenant_id', tenantId)

    if (error) {
      console.error('Error deleting category:', error)
      return res.status(500).json({ error: 'Failed to delete category' })
    }

    res.json({ success: true })
  } catch (error: any) {
    console.error('Unexpected error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// ============================================
// BLOG POSTS
// ============================================

// Get all posts (with filters)
router.get('/blog/posts', async (req, res) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string

    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID required' })
    }

    const { status, category_id, search, sort } = req.query

    let query = supabase
      .from('blog_posts')
      .select(`
        *,
        category:blog_categories(id, name, slug, color)
      `)
      .eq('tenant_id', tenantId)

    if (status && status !== 'all') {
      query = query.eq('status', status)
    }

    if (category_id) {
      query = query.eq('category_id', category_id)
    }

    if (search) {
      query = query.or(`title.ilike.%${search}%,excerpt.ilike.%${search}%`)
    }

    // Sorting
    if (sort === 'oldest') {
      query = query.order('created_at', { ascending: true })
    } else if (sort === 'title') {
      query = query.order('title', { ascending: true })
    } else {
      query = query.order('created_at', { ascending: false })
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching posts:', error)
      return res.status(500).json({ error: 'Failed to fetch posts' })
    }

    res.json(data || [])
  } catch (error: any) {
    console.error('Unexpected error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Get single post by ID
router.get('/blog/posts/:id', async (req, res) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string
    const { id } = req.params

    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID required' })
    }

    const { data, error } = await supabase
      .from('blog_posts')
      .select(`
        *,
        category:blog_categories(id, name, slug, color)
      `)
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: 'Post not found' })
      }
      console.error('Error fetching post:', error)
      return res.status(500).json({ error: 'Failed to fetch post' })
    }

    res.json(data)
  } catch (error: any) {
    console.error('Unexpected error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Create post
router.post('/blog/posts', async (req, res) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string

    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID required' })
    }

    const {
      title,
      slug,
      excerpt,
      content,
      featured_image_url,
      featured_image_alt,
      author_name,
      author_avatar_url,
      category_id,
      tags,
      status,
      published_at,
      seo_title,
      seo_description,
      og_image_url,
      canonical_url,
      no_index
    } = req.body

    if (!title || !content) {
      return res.status(400).json({ error: 'Title and content are required' })
    }

    // Generate slug if not provided
    const postSlug = slug || title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

    const { data, error } = await supabase
      .from('blog_posts')
      .insert({
        tenant_id: tenantId,
        title,
        slug: postSlug,
        excerpt,
        content,
        featured_image_url,
        featured_image_alt,
        author_name,
        author_avatar_url,
        category_id,
        tags: tags || [],
        status: status || 'draft',
        published_at: status === 'published' ? (published_at || new Date().toISOString()) : null,
        seo_title,
        seo_description,
        og_image_url,
        canonical_url,
        no_index: no_index || false
      })
      .select(`
        *,
        category:blog_categories(id, name, slug, color)
      `)
      .single()

    if (error) {
      if (error.code === '23505') {
        return res.status(400).json({ error: 'Post with this slug already exists' })
      }
      console.error('Error creating post:', error)
      return res.status(500).json({ error: 'Failed to create post' })
    }

    res.status(201).json(data)
  } catch (error: any) {
    console.error('Unexpected error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Update post
router.put('/blog/posts/:id', async (req, res) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string
    const { id } = req.params

    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID required' })
    }

    const {
      title,
      slug,
      excerpt,
      content,
      featured_image_url,
      featured_image_alt,
      author_name,
      author_avatar_url,
      category_id,
      tags,
      status,
      published_at,
      seo_title,
      seo_description,
      og_image_url,
      canonical_url,
      no_index
    } = req.body

    // Get current post to check if we're publishing for the first time
    const { data: currentPost } = await supabase
      .from('blog_posts')
      .select('status, published_at')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .single()

    // Set published_at if publishing for the first time
    let finalPublishedAt = published_at
    if (status === 'published' && currentPost?.status !== 'published' && !currentPost?.published_at) {
      finalPublishedAt = new Date().toISOString()
    }

    const { data, error } = await supabase
      .from('blog_posts')
      .update({
        title,
        slug: slug?.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
        excerpt,
        content,
        featured_image_url,
        featured_image_alt,
        author_name,
        author_avatar_url,
        category_id,
        tags,
        status,
        published_at: finalPublishedAt,
        seo_title,
        seo_description,
        og_image_url,
        canonical_url,
        no_index,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .select(`
        *,
        category:blog_categories(id, name, slug, color)
      `)
      .single()

    if (error) {
      console.error('Error updating post:', error)
      return res.status(500).json({ error: 'Failed to update post' })
    }

    res.json(data)
  } catch (error: any) {
    console.error('Unexpected error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Delete post
router.delete('/blog/posts/:id', async (req, res) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string
    const { id } = req.params

    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID required' })
    }

    const { error } = await supabase
      .from('blog_posts')
      .delete()
      .eq('id', id)
      .eq('tenant_id', tenantId)

    if (error) {
      console.error('Error deleting post:', error)
      return res.status(500).json({ error: 'Failed to delete post' })
    }

    res.json({ success: true })
  } catch (error: any) {
    console.error('Unexpected error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router

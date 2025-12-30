const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3002/api'

// Tenant ID is managed locally in this file

// Cache for auth token and tenant ID
let cachedTenantId: string | null = null
let cachedAccessToken: string | null = null

export const setWebsiteTenantId = (id: string | null) => {
  cachedTenantId = id
}

export const setWebsiteAccessToken = (token: string | null) => {
  cachedAccessToken = token
}

const getTenantId = (): string => {
  return cachedTenantId || ''
}

const getHeaders = (): Record<string, string> => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-tenant-id': getTenantId(),
  }

  if (cachedAccessToken) {
    headers['Authorization'] = `Bearer ${cachedAccessToken}`
  }

  return headers
}

// ============================================
// TYPES
// ============================================

// Header configuration interface
export interface HeaderConfig {
  logo_position: 'left' | 'center'
  show_cta_button: boolean
  cta_text: string
  cta_link: string
  cta_style: 'solid' | 'outline' | 'ghost'
  sticky: boolean
  transparent_on_hero: boolean
}

// Footer link interface
export interface FooterLink {
  label: string
  url: string
}

// Footer column interface
export interface FooterColumn {
  title: string
  links: FooterLink[]
}

// Footer configuration interface
export interface FooterConfig {
  show_logo: boolean
  show_description: boolean
  description: string
  columns: FooterColumn[]
  show_social_icons: boolean
  copyright_text: string
  show_powered_by: boolean
}

// Navigation menu item interface
export interface NavigationItem {
  id: string
  label: string
  url: string
  enabled: boolean
  order: number
  children?: NavigationItem[]
}

// Navigation configuration interface
export interface NavigationConfig {
  items: NavigationItem[]
}

// ============================================
// GLOBAL STYLES (Site Kit) TYPES
// ============================================

export interface GlobalColors {
  primary: string
  secondary: string
  accent: string
  headingText: string
  bodyText: string
  mutedText: string
  background: string
  sectionBg: string
  cardBg: string
  borderColor: string
}

export interface HeadingStyle {
  size: number
  weight: number
  lineHeight: number
}

export interface GlobalTypography {
  headingFont: string
  bodyFont: string
  baseFontSize: number
  lineHeight: number
  headings: {
    h1: HeadingStyle
    h2: HeadingStyle
    h3: HeadingStyle
    h4: HeadingStyle
    h5: HeadingStyle
    h6: HeadingStyle
  }
}

export interface ButtonStyle {
  background: string
  text: string
  border: string
  hoverBg: string
  radius: number
  paddingY: number
  paddingX: number
}

export interface GlobalButtons {
  primary: ButtonStyle
  secondary: ButtonStyle
}

export interface GlobalSpacing {
  sectionPaddingY: number
  containerMaxWidth: number
  elementGap: number
  cardPadding: number
  cardRadius: number
}

export interface GlobalStyles {
  colors: GlobalColors
  typography: GlobalTypography
  buttons: GlobalButtons
  spacing: GlobalSpacing
}

// ============================================
// WORDPRESS-STYLE MENU TYPES
// ============================================

export interface MenuItem {
  id: string
  label: string
  url: string
  type: 'page' | 'custom' | 'category'
  pageId?: string
  openInNewTab?: boolean
  titleAttribute?: string
  cssClass?: string
  children: MenuItem[]
}

export interface Menu {
  id: string
  name: string
  location: 'header' | 'footer' | 'mobile'
  items: MenuItem[]
}

// ============================================
// SECTION TYPES (Visual Page Builder)
// ============================================

export type SectionType =
  | 'hero'
  | 'features'
  | 'room_grid'
  | 'room_carousel'
  | 'testimonials'
  | 'review_grid'
  | 'cta'
  | 'faq'
  | 'gallery'
  | 'stats'
  | 'text_block'
  | 'image_text'
  | 'contact_form'
  | 'map'
  | 'booking_widget'
  | 'spacer'
  | 'divider'

// Base section configuration
export interface SectionConfig {
  title?: string
  subtitle?: string
  description?: string
  ctaText?: string
  ctaLink?: string
  backgroundColor?: string
  backgroundImage?: string
  backgroundOverlay?: number
  textColor?: string
  alignment?: 'left' | 'center' | 'right'
  columns?: number
  limit?: number
  showAll?: boolean
  height?: 'small' | 'medium' | 'large' | 'full'
  layout?: 'grid' | 'list' | 'carousel' | 'masonry'
  items?: SectionItem[]
  [key: string]: unknown // Allow additional properties
}

// Items within sections (features, FAQ items, etc.)
export interface SectionItem {
  id: string
  icon?: string
  title?: string
  description?: string
  image?: string
  link?: string
  [key: string]: unknown
}

// Responsive style overrides
export interface ResponsiveStyles {
  desktop?: Record<string, unknown>
  tablet?: Record<string, unknown>
  mobile?: Record<string, unknown>
}

// Section structure
export interface Section {
  id: string
  type: SectionType
  enabled: boolean
  order: number
  config: SectionConfig
  styles?: ResponsiveStyles
}

export interface WebsiteSettings {
  id?: string
  tenant_id?: string
  primary_color: string
  secondary_color: string
  accent_color: string
  background_color: string
  text_color: string
  heading_font: string
  body_font: string
  default_seo_title: string | null
  default_seo_description: string | null
  default_og_image_url: string | null
  social_links: Record<string, string>
  google_analytics_id: string | null
  facebook_pixel_id: string | null
  // New fields for header/footer/navigation
  header_config: HeaderConfig | null
  footer_config: FooterConfig | null
  navigation_config: NavigationConfig | null
  logo_url: string | null
  favicon_url: string | null
  theme_preset: string | null
  font_pairing_preset: string | null
  global_styles: GlobalStyles | null
  menus: Menu[] | null
  created_at?: string
  updated_at?: string
}

export interface WebsitePage {
  id: string
  tenant_id: string
  page_type: 'home' | 'accommodation' | 'reviews' | 'contact' | 'blog' | 'book' | 'room_detail'
  slug: string
  template_id: number
  title: string
  is_published: boolean
  is_in_navigation: boolean
  navigation_order: number
  // SEO Fields
  seo_title: string | null
  seo_description: string | null
  seo_keywords: string | null
  og_image_url: string | null
  canonical_url: string | null
  no_index: boolean
  // Color overrides
  override_primary_color: string | null
  override_secondary_color: string | null
  override_accent_color: string | null
  override_heading_font: string | null
  override_body_font: string | null
  // Hero content
  hero_title: string | null
  hero_subtitle: string | null
  hero_image_url: string | null
  hero_cta_text: string | null
  hero_cta_link: string | null
  content_sections: unknown[]
  // New section system
  sections: Section[]
  style_variant: 'light' | 'dark' | 'colorful'
  created_at: string
  updated_at: string
}

export interface BlogCategory {
  id: string
  tenant_id: string
  name: string
  slug: string
  description: string | null
  color: string
  created_at: string
  updated_at: string
}

export interface BlogPost {
  id: string
  tenant_id: string
  title: string
  slug: string
  excerpt: string | null
  content: string
  featured_image_url: string | null
  featured_image_alt: string | null
  author_name: string | null
  author_avatar_url: string | null
  category_id: string | null
  category?: BlogCategory | null
  tags: string[]
  status: 'draft' | 'published' | 'archived'
  published_at: string | null
  // SEO Fields
  seo_title: string | null
  seo_description: string | null
  og_image_url: string | null
  canonical_url: string | null
  no_index: boolean
  reading_time_minutes: number
  view_count: number
  created_at: string
  updated_at: string
}

// ============================================
// WEBSITE SETTINGS API
// ============================================

export const websiteSettingsApi = {
  get: async (): Promise<WebsiteSettings> => {
    const response = await fetch(`${API_BASE_URL}/website/settings`, {
      headers: getHeaders(),
    })
    if (!response.ok) throw new Error('Failed to fetch website settings')
    return response.json()
  },

  update: async (data: Partial<WebsiteSettings>): Promise<WebsiteSettings> => {
    const response = await fetch(`${API_BASE_URL}/website/settings`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data),
    })
    if (!response.ok) throw new Error('Failed to update website settings')
    return response.json()
  },
}

// ============================================
// WEBSITE PAGES API
// ============================================

export const websitePagesApi = {
  getAll: async (): Promise<WebsitePage[]> => {
    const response = await fetch(`${API_BASE_URL}/website/pages`, {
      headers: getHeaders(),
    })
    if (!response.ok) throw new Error('Failed to fetch pages')
    return response.json()
  },

  get: async (pageType: string): Promise<WebsitePage> => {
    const response = await fetch(`${API_BASE_URL}/website/pages/${pageType}`, {
      headers: getHeaders(),
    })
    if (!response.ok) throw new Error('Failed to fetch page')
    return response.json()
  },

  update: async (pageType: string, data: Partial<WebsitePage>): Promise<WebsitePage> => {
    const response = await fetch(`${API_BASE_URL}/website/pages/${pageType}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data),
    })
    if (!response.ok) throw new Error('Failed to update page')
    return response.json()
  },
}

// ============================================
// BLOG CATEGORIES API
// ============================================

export const blogCategoriesApi = {
  getAll: async (): Promise<BlogCategory[]> => {
    const response = await fetch(`${API_BASE_URL}/website/blog/categories`, {
      headers: getHeaders(),
    })
    if (!response.ok) throw new Error('Failed to fetch categories')
    return response.json()
  },

  create: async (data: { name: string; slug: string; description?: string; color?: string }): Promise<BlogCategory> => {
    const response = await fetch(`${API_BASE_URL}/website/blog/categories`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    })
    if (!response.ok) throw new Error('Failed to create category')
    return response.json()
  },

  update: async (id: string, data: Partial<BlogCategory>): Promise<BlogCategory> => {
    const response = await fetch(`${API_BASE_URL}/website/blog/categories/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data),
    })
    if (!response.ok) throw new Error('Failed to update category')
    return response.json()
  },

  delete: async (id: string): Promise<void> => {
    const response = await fetch(`${API_BASE_URL}/website/blog/categories/${id}`, {
      method: 'DELETE',
      headers: getHeaders(),
    })
    if (!response.ok) throw new Error('Failed to delete category')
  },
}

// ============================================
// BLOG POSTS API
// ============================================

export const blogPostsApi = {
  getAll: async (filters?: { status?: string; category_id?: string; search?: string; sort?: string }): Promise<BlogPost[]> => {
    const params = new URLSearchParams()
    if (filters?.status) params.append('status', filters.status)
    if (filters?.category_id) params.append('category_id', filters.category_id)
    if (filters?.search) params.append('search', filters.search)
    if (filters?.sort) params.append('sort', filters.sort)

    const url = `${API_BASE_URL}/website/blog/posts${params.toString() ? `?${params.toString()}` : ''}`
    const response = await fetch(url, {
      headers: getHeaders(),
    })
    if (!response.ok) throw new Error('Failed to fetch posts')
    return response.json()
  },

  get: async (id: string): Promise<BlogPost> => {
    const response = await fetch(`${API_BASE_URL}/website/blog/posts/${id}`, {
      headers: getHeaders(),
    })
    if (!response.ok) throw new Error('Failed to fetch post')
    return response.json()
  },

  create: async (data: Partial<BlogPost>): Promise<BlogPost> => {
    const response = await fetch(`${API_BASE_URL}/website/blog/posts`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    })
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to create post')
    }
    return response.json()
  },

  update: async (id: string, data: Partial<BlogPost>): Promise<BlogPost> => {
    const response = await fetch(`${API_BASE_URL}/website/blog/posts/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data),
    })
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to update post')
    }
    return response.json()
  },

  delete: async (id: string): Promise<void> => {
    const response = await fetch(`${API_BASE_URL}/website/blog/posts/${id}`, {
      method: 'DELETE',
      headers: getHeaders(),
    })
    if (!response.ok) throw new Error('Failed to delete post')
  },
}

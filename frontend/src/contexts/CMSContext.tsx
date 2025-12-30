import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { useAuth } from './AuthContext'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3002/api'

// Types for CMS data
export interface CMSSettings {
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
}

export interface CMSPage {
  id: string
  tenant_id: string
  page_type: string
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
  // Dynamic sections
  sections: Array<{
    id: string
    type: string
    enabled: boolean
    order: number
    config: Record<string, any>
    styles?: Record<string, any>
  }> | null
}

interface CMSContextType {
  settings: CMSSettings | null
  pages: CMSPage[]
  loading: boolean
  error: string | null
  getPageSettings: (pageType: string) => CMSPage | undefined
  getEffectiveColors: (pageType?: string) => {
    primary: string
    secondary: string
    accent: string
    background: string
    text: string
  }
  getEffectiveFonts: (pageType?: string) => {
    heading: string
    body: string
  }
  getTemplateId: (pageType: string) => number
  refetch: () => Promise<void>
}

const defaultSettings: CMSSettings = {
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
}

const CMSContext = createContext<CMSContextType | undefined>(undefined)

export function CMSProvider({ children }: { children: ReactNode }) {
  const { tenant } = useAuth()
  const [settings, setSettings] = useState<CMSSettings | null>(null)
  const [pages, setPages] = useState<CMSPage[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const tenantId = tenant?.id

  const fetchCMSData = async () => {
    if (!tenantId) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`${API_BASE_URL}/public/${tenantId}/cms-settings`)

      if (!response.ok) {
        throw new Error('Failed to fetch CMS settings')
      }

      const data = await response.json()

      setSettings(data.settings || defaultSettings)
      setPages(data.pages || [])
    } catch (err) {
      console.error('Error fetching CMS data:', err)
      setError(err instanceof Error ? err.message : 'Failed to load CMS data')
      // Use defaults on error
      setSettings(defaultSettings)
      setPages([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCMSData()
  }, [tenantId])

  // Apply CSS variables when settings change
  useEffect(() => {
    if (settings) {
      const root = document.documentElement

      // Set brand colors as CSS variables
      root.style.setProperty('--cms-primary', settings.primary_color)
      root.style.setProperty('--cms-secondary', settings.secondary_color)
      root.style.setProperty('--cms-accent', settings.accent_color)
      root.style.setProperty('--cms-background', settings.background_color)
      root.style.setProperty('--cms-text', settings.text_color)

      // Set fonts
      root.style.setProperty('--cms-heading-font', settings.heading_font)
      root.style.setProperty('--cms-body-font', settings.body_font)
    }
  }, [settings])

  // Get page settings by page type
  const getPageSettings = (pageType: string): CMSPage | undefined => {
    return pages.find(p => p.page_type === pageType)
  }

  // Get effective colors (page override or global)
  const getEffectiveColors = (pageType?: string) => {
    const page = pageType ? getPageSettings(pageType) : undefined
    const s = settings || defaultSettings

    return {
      primary: page?.override_primary_color || s.primary_color,
      secondary: page?.override_secondary_color || s.secondary_color,
      accent: page?.override_accent_color || s.accent_color,
      background: s.background_color,
      text: s.text_color,
    }
  }

  // Get effective fonts (page override or global)
  const getEffectiveFonts = (pageType?: string) => {
    const page = pageType ? getPageSettings(pageType) : undefined
    const s = settings || defaultSettings

    return {
      heading: page?.override_heading_font || s.heading_font,
      body: page?.override_body_font || s.body_font,
    }
  }

  // Get template ID for a page type
  const getTemplateId = (pageType: string): number => {
    const page = getPageSettings(pageType)
    return page?.template_id || 1
  }

  const value: CMSContextType = {
    settings,
    pages,
    loading,
    error,
    getPageSettings,
    getEffectiveColors,
    getEffectiveFonts,
    getTemplateId,
    refetch: fetchCMSData,
  }

  return <CMSContext.Provider value={value}>{children}</CMSContext.Provider>
}

export function useCMS() {
  const context = useContext(CMSContext)
  if (context === undefined) {
    throw new Error('useCMS must be used within a CMSProvider')
  }
  return context
}

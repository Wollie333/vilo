import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { CMSPage, CMSSettings } from '../contexts/CMSContext'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3002/api'

interface SectionConfig {
  id: string
  type: string
  enabled: boolean
  order: number
  config: Record<string, any>
  styles?: Record<string, any>
}

interface UseCMSPageResult {
  page: CMSPage | null
  settings: CMSSettings | null
  loading: boolean
  error: string | null
  templateId: number
  sections: SectionConfig[] | null
  colors: {
    primary: string
    secondary: string
    accent: string
  }
  fonts: {
    heading: string
    body: string
  }
  seo: {
    title: string | null
    description: string | null
    keywords: string | null
    ogImage: string | null
    canonicalUrl: string | null
    noIndex: boolean
  }
  hero: {
    title: string | null
    subtitle: string | null
    imageUrl: string | null
    ctaText: string | null
    ctaLink: string | null
  }
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

export function useCMSPage(pageType: string): UseCMSPageResult {
  const { tenant } = useAuth()
  const [page, setPage] = useState<CMSPage | null>(null)
  const [settings, setSettings] = useState<CMSSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const tenantId = tenant?.id

  useEffect(() => {
    async function fetchPageData() {
      if (!tenantId) {
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        setError(null)

        // Fetch both CMS settings and page data
        const [settingsResponse, pageResponse] = await Promise.all([
          fetch(`${API_BASE_URL}/public/${tenantId}/cms-settings`),
          fetch(`${API_BASE_URL}/public/${tenantId}/cms-page/${pageType}`)
        ])

        if (settingsResponse.ok) {
          const settingsData = await settingsResponse.json()
          setSettings(settingsData.settings || defaultSettings)
        } else {
          setSettings(defaultSettings)
        }

        if (pageResponse.ok) {
          const pageData = await pageResponse.json()
          setPage(pageData)
        } else {
          // Page might not exist yet, use defaults
          setPage(null)
        }
      } catch (err) {
        console.error('Error fetching CMS page data:', err)
        setError(err instanceof Error ? err.message : 'Failed to load page data')
        setSettings(defaultSettings)
        setPage(null)
      } finally {
        setLoading(false)
      }
    }

    fetchPageData()
  }, [tenantId, pageType])

  // Compute effective values
  const s = settings || defaultSettings

  const colors = {
    primary: page?.override_primary_color || s.primary_color,
    secondary: page?.override_secondary_color || s.secondary_color,
    accent: page?.override_accent_color || s.accent_color,
  }

  const fonts = {
    heading: page?.override_heading_font || s.heading_font,
    body: page?.override_body_font || s.body_font,
  }

  const seo = {
    title: page?.seo_title || s.default_seo_title,
    description: page?.seo_description || s.default_seo_description,
    keywords: page?.seo_keywords || null,
    ogImage: page?.og_image_url || s.default_og_image_url,
    canonicalUrl: page?.canonical_url || null,
    noIndex: page?.no_index || false,
  }

  const hero = {
    title: page?.hero_title || null,
    subtitle: page?.hero_subtitle || null,
    imageUrl: page?.hero_image_url || null,
    ctaText: page?.hero_cta_text || null,
    ctaLink: page?.hero_cta_link || null,
  }

  // Parse sections from page data
  const sections = page?.sections || null

  return {
    page,
    settings,
    loading,
    error,
    templateId: page?.template_id || 1,
    sections,
    colors,
    fonts,
    seo,
    hero,
  }
}

// Hook to fetch page data for dashboard preview
export function useCMSPagePreview(pageType: string, tenantId?: string) {
  const [pageData, setPageData] = useState<CMSPage | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    async function fetchPreview() {
      if (!tenantId) return

      try {
        setLoading(true)
        const response = await fetch(`${API_BASE_URL}/public/${tenantId}/cms-page/${pageType}`)
        if (response.ok) {
          const data = await response.json()
          setPageData(data)
        }
      } catch (err) {
        console.error('Error fetching page preview:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchPreview()
  }, [tenantId, pageType])

  return { pageData, loading }
}

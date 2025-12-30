import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  Loader2,
  Save,
  Home,
  BedDouble,
  Star,
  Mail,
  FileText,
  Calendar,
  Eye,
  Layout,
  Palette,
  Type,
  Search,
  Layers
} from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import {
  websitePagesApi,
  websiteSettingsApi,
  WebsitePage,
  WebsiteSettings,
  Section,
  setWebsiteTenantId,
  setWebsiteAccessToken
} from '../../services/websiteApi'
import TemplateSelector from '../../components/website/TemplateSelector'
import SEOFields from '../../components/website/SEOFields'
import ColorPicker from '../../components/website/ColorPicker'
import FontSelector from '../../components/website/FontSelector'
import { SectionList } from '../../components/website/sections'

// Page info mapping
const PAGE_INFO: Record<string, { name: string; icon: any; description: string }> = {
  home: { name: 'Home Page', icon: Home, description: 'Your main landing page' },
  accommodation: { name: 'Accommodation Page', icon: BedDouble, description: 'Room listings and gallery' },
  reviews: { name: 'Reviews Page', icon: Star, description: 'Guest reviews and testimonials' },
  contact: { name: 'Contact Page', icon: Mail, description: 'Contact form and information' },
  blog: { name: 'Blog Page', icon: FileText, description: 'Blog listing page' },
  book: { name: 'Booking Page', icon: Calendar, description: 'Booking wizard flow' },
  room_detail: { name: 'Room Detail Page', icon: Eye, description: 'Individual room page template' },
}

type TabSection = 'sections' | 'template' | 'seo' | 'colors' | 'fonts'

export default function PageSettings() {
  const { pageType } = useParams<{ pageType: string }>()
  const navigate = useNavigate()
  const { tenant, session } = useAuth()
  const [activeSection, setActiveSection] = useState<TabSection>('sections') // Sections is default
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Page data
  const [page, setPage] = useState<WebsitePage | null>(null)
  const [globalSettings, setGlobalSettings] = useState<WebsiteSettings | null>(null)

  // Sections state
  const [sections, setSections] = useState<Section[]>([])

  // Template state
  const [templateId, setTemplateId] = useState(1)

  // SEO state
  const [seoTitle, setSeoTitle] = useState('')
  const [seoDescription, setSeoDescription] = useState('')
  const [seoKeywords, setSeoKeywords] = useState('')
  const [ogImageUrl, setOgImageUrl] = useState('')
  const [canonicalUrl, setCanonicalUrl] = useState('')
  const [noIndex, setNoIndex] = useState(false)

  // Color override state
  const [useGlobalColors, setUseGlobalColors] = useState(true)
  const [overridePrimaryColor, setOverridePrimaryColor] = useState('')
  const [overrideSecondaryColor, setOverrideSecondaryColor] = useState('')
  const [overrideAccentColor, setOverrideAccentColor] = useState('')

  // Font override state
  const [useGlobalFonts, setUseGlobalFonts] = useState(true)
  const [overrideHeadingFont, setOverrideHeadingFont] = useState('Inter')
  const [overrideBodyFont, setOverrideBodyFont] = useState('Inter')

  // Hero content state
  const [heroTitle, setHeroTitle] = useState('')
  const [heroSubtitle, setHeroSubtitle] = useState('')

  // Set tenant ID and access token for API
  useEffect(() => {
    if (tenant?.id) {
      setWebsiteTenantId(tenant.id)
    }
    if (session?.access_token) {
      setWebsiteAccessToken(session.access_token)
    }
  }, [tenant?.id, session?.access_token])

  // Load page data
  useEffect(() => {
    async function loadData() {
      if (!tenant?.id || !pageType) return

      try {
        setLoading(true)
        const [pageData, settingsData] = await Promise.all([
          websitePagesApi.get(pageType),
          websiteSettingsApi.get()
        ])

        setPage(pageData)
        setGlobalSettings(settingsData)

        // Set form state from page data
        setTemplateId(pageData.template_id || 1)
        setSeoTitle(pageData.seo_title || '')
        setSeoDescription(pageData.seo_description || '')
        setSeoKeywords(pageData.seo_keywords || '')
        setOgImageUrl(pageData.og_image_url || '')
        setCanonicalUrl(pageData.canonical_url || '')
        setNoIndex(pageData.no_index || false)
        setHeroTitle(pageData.hero_title || '')
        setHeroSubtitle(pageData.hero_subtitle || '')

        // Sections
        setSections(pageData.sections || [])

        // Color overrides
        const hasColorOverrides = pageData.override_primary_color || pageData.override_secondary_color || pageData.override_accent_color
        setUseGlobalColors(!hasColorOverrides)
        setOverridePrimaryColor(pageData.override_primary_color || settingsData.primary_color || '#1f2937')
        setOverrideSecondaryColor(pageData.override_secondary_color || settingsData.secondary_color || '#374151')
        setOverrideAccentColor(pageData.override_accent_color || settingsData.accent_color || '#3b82f6')

        // Font overrides
        const hasFontOverrides = pageData.override_heading_font || pageData.override_body_font
        setUseGlobalFonts(!hasFontOverrides)
        setOverrideHeadingFont(pageData.override_heading_font || settingsData.heading_font || 'Inter')
        setOverrideBodyFont(pageData.override_body_font || settingsData.body_font || 'Inter')
      } catch (error) {
        console.error('Failed to load page:', error)
        setMessage({ type: 'error', text: 'Failed to load page settings' })
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [tenant?.id, pageType])

  // Save page settings
  const handleSave = async () => {
    if (!pageType) return

    try {
      setSaving(true)
      setMessage(null)

      await websitePagesApi.update(pageType, {
        template_id: templateId,
        seo_title: seoTitle || null,
        seo_description: seoDescription || null,
        seo_keywords: seoKeywords || null,
        og_image_url: ogImageUrl || null,
        canonical_url: canonicalUrl || null,
        no_index: noIndex,
        override_primary_color: useGlobalColors ? null : overridePrimaryColor,
        override_secondary_color: useGlobalColors ? null : overrideSecondaryColor,
        override_accent_color: useGlobalColors ? null : overrideAccentColor,
        override_heading_font: useGlobalFonts ? null : overrideHeadingFont,
        override_body_font: useGlobalFonts ? null : overrideBodyFont,
        hero_title: heroTitle || null,
        hero_subtitle: heroSubtitle || null,
        sections: sections,
      })

      setMessage({ type: 'success', text: 'Page settings saved successfully' })
    } catch (error) {
      console.error('Failed to save page:', error)
      setMessage({ type: 'error', text: 'Failed to save page settings' })
    } finally {
      setSaving(false)
    }
  }

  const pageInfo = pageType ? PAGE_INFO[pageType] : null
  const Icon = pageInfo?.icon || Layout

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--text-muted)' }} />
      </div>
    )
  }

  if (!page || !pageType) {
    return (
      <div className="p-6">
        <p style={{ color: 'var(--text-muted)' }}>Page not found</p>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => navigate('/dashboard/website')}
          style={{ color: 'var(--text-secondary)' }}
          className="p-2 rounded-lg hover:opacity-80 transition-colors"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="flex items-center gap-3">
          <div
            style={{ backgroundColor: 'var(--bg-secondary)' }}
            className="w-10 h-10 rounded-lg flex items-center justify-center"
          >
            <Icon size={20} style={{ color: 'var(--text-primary)' }} />
          </div>
          <div>
            <h1 style={{ color: 'var(--text-primary)' }} className="text-2xl font-bold">
              {pageInfo?.name || page.title}
            </h1>
            <p style={{ color: 'var(--text-muted)' }} className="text-sm">
              {pageInfo?.description}
            </p>
          </div>
        </div>
      </div>

      {/* Message */}
      {message && (
        <div
          className={`mb-6 p-4 rounded-lg ${
            message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="flex gap-6">
        {/* Sidebar Navigation */}
        <div className="w-48 flex-shrink-0">
          <nav className="space-y-1">
            {[
              { id: 'sections', name: 'Sections', icon: Layers },
              { id: 'seo', name: 'SEO Settings', icon: Search },
              { id: 'template', name: 'Template', icon: Layout },
              { id: 'colors', name: 'Colors', icon: Palette },
              { id: 'fonts', name: 'Typography', icon: Type },
            ].map((item) => {
              const isActive = activeSection === item.id
              const ItemIcon = item.icon
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveSection(item.id as TabSection)}
                  style={{
                    backgroundColor: isActive ? 'var(--bg-tertiary)' : 'transparent',
                    color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors hover:opacity-80"
                >
                  <ItemIcon size={18} />
                  {item.name}
                </button>
              )
            })}
          </nav>
        </div>

        {/* Content Area */}
        <div className="flex-1">
          <div
            style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}
            className="rounded-lg border p-6"
          >
            {/* Sections Section (Default) */}
            {activeSection === 'sections' && (
              <div>
                <SectionList
                  sections={sections}
                  onChange={setSections}
                  pageType={pageType}
                />
              </div>
            )}

            {/* SEO Section */}
            {activeSection === 'seo' && (
              <div>
                <h2 style={{ color: 'var(--text-primary)' }} className="text-lg font-semibold mb-2">
                  SEO Settings
                </h2>
                <p style={{ color: 'var(--text-muted)' }} className="text-sm mb-6">
                  Optimize this page for search engines. These settings control how your page appears in search results.
                </p>

                <SEOFields
                  title={seoTitle}
                  setTitle={setSeoTitle}
                  description={seoDescription}
                  setDescription={setSeoDescription}
                  keywords={seoKeywords}
                  setKeywords={setSeoKeywords}
                  ogImage={ogImageUrl}
                  setOgImage={setOgImageUrl}
                  canonicalUrl={canonicalUrl}
                  setCanonicalUrl={setCanonicalUrl}
                  noIndex={noIndex}
                  setNoIndex={setNoIndex}
                  showPreview={true}
                  siteName={tenant?.business_name || 'Your Website'}
                />
              </div>
            )}

            {/* Template Section */}
            {activeSection === 'template' && (
              <div>
                <h2 style={{ color: 'var(--text-primary)' }} className="text-lg font-semibold mb-2">
                  Page Template
                </h2>
                <p style={{ color: 'var(--text-muted)' }} className="text-sm mb-6">
                  Choose a layout template for this page. Each template has a different structure and style.
                </p>

                <TemplateSelector
                  pageType={pageType}
                  selected={templateId}
                  onSelect={setTemplateId}
                  primaryColor={useGlobalColors ? globalSettings?.primary_color : overridePrimaryColor}
                  accentColor={useGlobalColors ? globalSettings?.accent_color : overrideAccentColor}
                />

                {/* Hero Content */}
                <div className="mt-8 pt-6 border-t" style={{ borderColor: 'var(--border-color)' }}>
                  <h3 style={{ color: 'var(--text-primary)' }} className="text-sm font-medium mb-4">
                    Hero Section Content
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <label style={{ color: 'var(--text-primary)' }} className="text-sm font-medium block mb-1">
                        Hero Title
                      </label>
                      <input
                        type="text"
                        value={heroTitle}
                        onChange={(e) => setHeroTitle(e.target.value)}
                        placeholder="Enter hero title..."
                        style={{
                          backgroundColor: 'var(--bg-primary)',
                          borderColor: 'var(--border-color)',
                          color: 'var(--text-primary)',
                        }}
                        className="w-full px-3 py-2 rounded-lg border focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                      />
                    </div>
                    <div>
                      <label style={{ color: 'var(--text-primary)' }} className="text-sm font-medium block mb-1">
                        Hero Subtitle
                      </label>
                      <input
                        type="text"
                        value={heroSubtitle}
                        onChange={(e) => setHeroSubtitle(e.target.value)}
                        placeholder="Enter hero subtitle..."
                        style={{
                          backgroundColor: 'var(--bg-primary)',
                          borderColor: 'var(--border-color)',
                          color: 'var(--text-primary)',
                        }}
                        className="w-full px-3 py-2 rounded-lg border focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Colors Section */}
            {activeSection === 'colors' && (
              <div>
                <h2 style={{ color: 'var(--text-primary)' }} className="text-lg font-semibold mb-2">
                  Color Overrides
                </h2>
                <p style={{ color: 'var(--text-muted)' }} className="text-sm mb-6">
                  Override the global brand colors for this specific page.
                </p>

                {/* Toggle */}
                <div
                  style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }}
                  className="rounded-lg border p-4 mb-6"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span style={{ color: 'var(--text-primary)' }} className="text-sm font-medium">
                        Use Global Brand Colors
                      </span>
                      <p style={{ color: 'var(--text-muted)' }} className="text-xs mt-0.5">
                        When enabled, this page uses the colors from your global branding settings
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setUseGlobalColors(!useGlobalColors)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        useGlobalColors ? 'bg-blue-500' : 'bg-gray-300'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          useGlobalColors ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                </div>

                {/* Color Pickers */}
                <div className={`grid grid-cols-1 md:grid-cols-3 gap-6 ${useGlobalColors ? 'opacity-50 pointer-events-none' : ''}`}>
                  <ColorPicker
                    label="Primary Color"
                    value={overridePrimaryColor}
                    onChange={setOverridePrimaryColor}
                    disabled={useGlobalColors}
                  />
                  <ColorPicker
                    label="Secondary Color"
                    value={overrideSecondaryColor}
                    onChange={setOverrideSecondaryColor}
                    disabled={useGlobalColors}
                  />
                  <ColorPicker
                    label="Accent Color"
                    value={overrideAccentColor}
                    onChange={setOverrideAccentColor}
                    disabled={useGlobalColors}
                  />
                </div>
              </div>
            )}

            {/* Fonts Section */}
            {activeSection === 'fonts' && (
              <div>
                <h2 style={{ color: 'var(--text-primary)' }} className="text-lg font-semibold mb-2">
                  Typography Overrides
                </h2>
                <p style={{ color: 'var(--text-muted)' }} className="text-sm mb-6">
                  Override the global fonts for this specific page.
                </p>

                {/* Toggle */}
                <div
                  style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }}
                  className="rounded-lg border p-4 mb-6"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span style={{ color: 'var(--text-primary)' }} className="text-sm font-medium">
                        Use Global Fonts
                      </span>
                      <p style={{ color: 'var(--text-muted)' }} className="text-xs mt-0.5">
                        When enabled, this page uses the fonts from your global branding settings
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setUseGlobalFonts(!useGlobalFonts)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        useGlobalFonts ? 'bg-blue-500' : 'bg-gray-300'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          useGlobalFonts ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                </div>

                {/* Font Selectors */}
                <div className={`grid grid-cols-1 md:grid-cols-2 gap-6 ${useGlobalFonts ? 'opacity-50 pointer-events-none' : ''}`}>
                  <FontSelector
                    label="Heading Font"
                    value={overrideHeadingFont}
                    onChange={setOverrideHeadingFont}
                    disabled={useGlobalFonts}
                  />
                  <FontSelector
                    label="Body Font"
                    value={overrideBodyFont}
                    onChange={setOverrideBodyFont}
                    disabled={useGlobalFonts}
                  />
                </div>
              </div>
            )}

            {/* Save Button */}
            <div className="flex justify-end pt-6 mt-6 border-t" style={{ borderColor: 'var(--border-color)' }}>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 disabled:opacity-50 transition-colors"
              >
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                Save Changes
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Globe,
  Home,
  BedDouble,
  Star,
  Mail,
  FileText,
  Calendar,
  Eye,
  Palette,
  Search,
  BarChart3,
  Loader2,
  Save,
  ExternalLink,
  Sparkles,
  Menu,
  LayoutTemplate,
  PanelBottom,
  Sliders,
  Image
} from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import {
  websiteSettingsApi,
  websitePagesApi,
  WebsiteSettings as WebsiteSettingsType,
  WebsitePage,
  HeaderConfig,
  FooterConfig,
  NavigationItem,
  setWebsiteTenantId,
  setWebsiteAccessToken
} from '../../services/websiteApi'
import ColorPicker from '../../components/website/ColorPicker'
import FontSelector from '../../components/website/FontSelector'
import SEOFields from '../../components/website/SEOFields'
import PageCard from '../../components/website/PageCard'
import NavigationEditor from '../../components/website/NavigationEditor'
import HeaderEditor from '../../components/website/HeaderEditor'
import FooterEditor from '../../components/website/FooterEditor'
import { ThemeSelector } from '../../components/website/theme'
import { ColorTheme } from '../../data/colorThemes'
import { FontPairing } from '../../data/fontPairings'

// Page definitions
const PAGE_DEFINITIONS = [
  { id: 'home', name: 'Home', icon: Home, description: 'Landing page with hero and features', pageType: 'home' },
  { id: 'accommodation', name: 'Accommodation', icon: BedDouble, description: 'Room listings and details', pageType: 'accommodation' },
  { id: 'reviews', name: 'Reviews', icon: Star, description: 'Guest reviews and testimonials', pageType: 'reviews' },
  { id: 'blog', name: 'Blog', icon: FileText, description: 'Blog posts and articles', pageType: 'blog', isBlog: true },
  { id: 'contact', name: 'Contact', icon: Mail, description: 'Contact form and info', pageType: 'contact' },
  { id: 'book', name: 'Booking', icon: Calendar, description: 'Booking wizard flow', pageType: 'book' },
  { id: 'room_detail', name: 'Room Detail', icon: Eye, description: 'Individual room page', pageType: 'room_detail' },
]

type Section = 'pages' | 'branding' | 'navigation' | 'header' | 'footer' | 'seo' | 'analytics'

export default function WebsiteSettings() {
  const navigate = useNavigate()
  const { tenant, session } = useAuth()
  const [activeSection, setActiveSection] = useState<Section>('pages')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Settings state
  const [_settings, setSettings] = useState<WebsiteSettingsType | null>(null)
  const [pages, setPages] = useState<WebsitePage[]>([])

  // Branding state
  const [primaryColor, setPrimaryColor] = useState('#1f2937')
  const [secondaryColor, setSecondaryColor] = useState('#374151')
  const [accentColor, setAccentColor] = useState('#3b82f6')
  const [headingFont, setHeadingFont] = useState('Inter')
  const [bodyFont, setBodyFont] = useState('Inter')

  // SEO defaults state
  const [defaultSeoTitle, setDefaultSeoTitle] = useState('')
  const [defaultSeoDescription, setDefaultSeoDescription] = useState('')
  const [defaultOgImage, setDefaultOgImage] = useState('')

  // Analytics state
  const [googleAnalyticsId, setGoogleAnalyticsId] = useState('')
  const [facebookPixelId, setFacebookPixelId] = useState('')

  // Theme selector state
  const [showThemeSelector, setShowThemeSelector] = useState(false)
  const [currentThemeId, setCurrentThemeId] = useState<string | undefined>(undefined)
  const [currentFontPairingId, setCurrentFontPairingId] = useState<string | undefined>(undefined)

  // Header/Footer/Navigation state
  const [headerConfig, setHeaderConfig] = useState<HeaderConfig>({
    logo_position: 'left',
    show_cta_button: true,
    cta_text: 'Book Now',
    cta_link: '/book',
    cta_style: 'solid',
    sticky: true,
    transparent_on_hero: false,
  })
  const [footerConfig, setFooterConfig] = useState<FooterConfig>({
    show_logo: true,
    show_description: true,
    description: '',
    columns: [
      {
        title: 'Quick Links',
        links: [
          { label: 'Home', url: '/' },
          { label: 'Rooms', url: '/accommodation' },
          { label: 'Contact', url: '/contact' },
        ],
      },
      {
        title: 'Legal',
        links: [
          { label: 'Privacy Policy', url: '/privacy' },
          { label: 'Terms of Service', url: '/terms' },
        ],
      },
    ],
    show_social_icons: true,
    copyright_text: '',
    show_powered_by: false,
  })
  const [navigationItems, setNavigationItems] = useState<NavigationItem[]>([
    { id: 'home', label: 'Home', url: '/', enabled: true, order: 1 },
    { id: 'accommodation', label: 'Accommodation', url: '/accommodation', enabled: true, order: 2 },
    { id: 'reviews', label: 'Reviews', url: '/reviews', enabled: true, order: 3 },
    { id: 'blog', label: 'Blog', url: '/blog', enabled: true, order: 4 },
    { id: 'contact', label: 'Contact', url: '/contact', enabled: true, order: 5 },
  ])
  const [logoUrl, setLogoUrl] = useState('')
  const [socialLinks, setSocialLinks] = useState<Record<string, string>>({})

  // Set tenant ID and access token for API
  useEffect(() => {
    if (tenant?.id) {
      setWebsiteTenantId(tenant.id)
    }
    if (session?.access_token) {
      setWebsiteAccessToken(session.access_token)
    }
  }, [tenant?.id, session?.access_token])

  // Load data
  useEffect(() => {
    async function loadData() {
      if (!tenant?.id) return

      try {
        setLoading(true)
        const [settingsData, pagesData] = await Promise.all([
          websiteSettingsApi.get(),
          websitePagesApi.getAll()
        ])

        setSettings(settingsData)
        setPages(pagesData)

        // Set form state from settings
        setPrimaryColor(settingsData.primary_color || '#1f2937')
        setSecondaryColor(settingsData.secondary_color || '#374151')
        setAccentColor(settingsData.accent_color || '#3b82f6')
        setHeadingFont(settingsData.heading_font || 'Inter')
        setBodyFont(settingsData.body_font || 'Inter')
        setDefaultSeoTitle(settingsData.default_seo_title || '')
        setDefaultSeoDescription(settingsData.default_seo_description || '')
        setDefaultOgImage(settingsData.default_og_image_url || '')
        setGoogleAnalyticsId(settingsData.google_analytics_id || '')
        setFacebookPixelId(settingsData.facebook_pixel_id || '')

        // Load header/footer/navigation config
        if (settingsData.header_config) {
          setHeaderConfig(settingsData.header_config)
        }
        if (settingsData.footer_config) {
          setFooterConfig(settingsData.footer_config)
        }
        if (settingsData.navigation_config?.items) {
          setNavigationItems(settingsData.navigation_config.items)
        }
        setLogoUrl(settingsData.logo_url || '')
        setSocialLinks(settingsData.social_links || {})

        // Load theme presets
        if (settingsData.theme_preset) {
          setCurrentThemeId(settingsData.theme_preset)
        }
        if (settingsData.font_pairing_preset) {
          setCurrentFontPairingId(settingsData.font_pairing_preset)
        }
      } catch (error) {
        console.error('Failed to load website settings:', error)
        setMessage({ type: 'error', text: 'Failed to load settings' })
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [tenant?.id])

  // Save settings
  const handleSave = async () => {
    try {
      setSaving(true)
      setMessage(null)

      await websiteSettingsApi.update({
        primary_color: primaryColor,
        secondary_color: secondaryColor,
        accent_color: accentColor,
        heading_font: headingFont,
        body_font: bodyFont,
        default_seo_title: defaultSeoTitle || null,
        default_seo_description: defaultSeoDescription || null,
        default_og_image_url: defaultOgImage || null,
        google_analytics_id: googleAnalyticsId || null,
        facebook_pixel_id: facebookPixelId || null,
        // New fields
        header_config: headerConfig,
        footer_config: footerConfig,
        navigation_config: { items: navigationItems },
        logo_url: logoUrl || null,
        social_links: socialLinks,
        theme_preset: currentThemeId || null,
        font_pairing_preset: currentFontPairingId || null,
      })

      setMessage({ type: 'success', text: 'Settings saved successfully' })
    } catch (error) {
      console.error('Failed to save settings:', error)
      setMessage({ type: 'error', text: 'Failed to save settings' })
    } finally {
      setSaving(false)
    }
  }

  // Navigate to page settings
  const handlePageClick = (pageType: string, isBlog?: boolean) => {
    if (isBlog) {
      navigate('/dashboard/website/blog')
    } else {
      navigate(`/dashboard/website/pages/${pageType}`)
    }
  }

  // Get page publish status
  const getPageStatus = (pageType: string) => {
    const page = pages.find(p => p.page_type === pageType)
    return page?.is_published ?? true
  }

  // Theme selector handlers
  const handleApplyTheme = (theme: ColorTheme) => {
    setPrimaryColor(theme.primary)
    setSecondaryColor(theme.secondary)
    setAccentColor(theme.accent)
    setCurrentThemeId(theme.id)
  }

  const handleApplyFontPairing = (pairing: FontPairing) => {
    setHeadingFont(pairing.heading)
    setBodyFont(pairing.body)
    setCurrentFontPairingId(pairing.id)
  }

  const handleApplyCustomColors = (colors: { primary: string; secondary: string; accent: string }) => {
    setPrimaryColor(colors.primary)
    setSecondaryColor(colors.secondary)
    setAccentColor(colors.accent)
    setCurrentThemeId(undefined) // Clear theme selection when using custom colors
  }

  const handleApplyCustomFonts = (fonts: { heading: string; body: string }) => {
    setHeadingFont(fonts.heading)
    setBodyFont(fonts.body)
    setCurrentFontPairingId(undefined) // Clear font pairing selection when using custom fonts
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--text-muted)' }} />
      </div>
    )
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Globe size={24} style={{ color: 'var(--text-primary)' }} />
          <div>
            <h1 style={{ color: 'var(--text-primary)' }} className="text-2xl font-bold">
              Website Settings
            </h1>
            <p style={{ color: 'var(--text-muted)' }} className="text-sm">
              Manage your website pages, branding, and SEO
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/dashboard/website/site-kit')}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors"
          >
            <Sliders size={16} />
            Site Kit
          </button>
          <button
            onClick={() => navigate('/dashboard/website/menus')}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-800 text-white hover:bg-gray-700 transition-colors"
          >
            <Menu size={16} />
            Menus
          </button>
          <button
            onClick={() => navigate('/dashboard/website/media')}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-600 text-white hover:bg-purple-700 transition-colors"
          >
            <Image size={16} />
            Media
          </button>
          <button
            onClick={() => navigate('/dashboard/website/seo')}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 transition-colors"
          >
            <Search size={16} />
            SEO
          </button>
          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: 'var(--text-secondary)', borderColor: 'var(--border-color)' }}
            className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:opacity-80 transition-colors"
          >
            <ExternalLink size={16} />
            View Website
          </a>
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
              { id: 'pages', name: 'Pages', icon: FileText },
              { id: 'branding', name: 'Branding', icon: Palette },
              { id: 'navigation', name: 'Navigation', icon: Menu },
              { id: 'header', name: 'Header', icon: LayoutTemplate },
              { id: 'footer', name: 'Footer', icon: PanelBottom },
              { id: 'seo', name: 'SEO Defaults', icon: Search },
              { id: 'analytics', name: 'Analytics', icon: BarChart3 },
            ].map((item) => {
              const isActive = activeSection === item.id
              const Icon = item.icon
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveSection(item.id as Section)}
                  style={{
                    backgroundColor: isActive ? 'var(--bg-tertiary)' : 'transparent',
                    color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors hover:opacity-80"
                >
                  <Icon size={18} />
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
            {/* Pages Section */}
            {activeSection === 'pages' && (
              <div>
                <h2 style={{ color: 'var(--text-primary)' }} className="text-lg font-semibold mb-4">
                  Website Pages
                </h2>
                <p style={{ color: 'var(--text-muted)' }} className="text-sm mb-6">
                  Click on a page to customize its template, content, and SEO settings.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {PAGE_DEFINITIONS.map((page) => (
                    <PageCard
                      key={page.id}
                      page={page}
                      isPublished={getPageStatus(page.pageType)}
                      onEdit={() => navigate(`/dashboard/website/builder/${page.pageType}`)}
                      onSettings={() => handlePageClick(page.pageType, page.isBlog)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Branding Section */}
            {activeSection === 'branding' && (
              <div>
                <h2 style={{ color: 'var(--text-primary)' }} className="text-lg font-semibold mb-4">
                  Brand Colors & Fonts
                </h2>
                <p style={{ color: 'var(--text-muted)' }} className="text-sm mb-6">
                  Set your default brand colors and fonts. These can be overridden on individual pages.
                </p>

                {/* Theme Selector Button */}
                <div className="mb-6">
                  <button
                    onClick={() => setShowThemeSelector(true)}
                    className="flex items-center gap-3 w-full p-4 rounded-xl border-2 border-dashed transition-all hover:border-blue-400 hover:bg-blue-50/50"
                    style={{ borderColor: 'var(--border-color)' }}
                  >
                    <div className="p-3 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500">
                      <Sparkles size={20} className="text-white" />
                    </div>
                    <div className="text-left">
                      <h3 style={{ color: 'var(--text-primary)' }} className="font-semibold">
                        Choose a Theme
                      </h3>
                      <p style={{ color: 'var(--text-muted)' }} className="text-sm">
                        Select from 12 pre-built color schemes and 6 font pairings
                      </p>
                    </div>
                  </button>
                </div>

                {/* Colors */}
                <div className="mb-8">
                  <h3 style={{ color: 'var(--text-primary)' }} className="text-sm font-medium mb-4">
                    Colors
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <ColorPicker
                      label="Primary Color"
                      value={primaryColor}
                      onChange={setPrimaryColor}
                    />
                    <ColorPicker
                      label="Secondary Color"
                      value={secondaryColor}
                      onChange={setSecondaryColor}
                    />
                    <ColorPicker
                      label="Accent Color"
                      value={accentColor}
                      onChange={setAccentColor}
                    />
                  </div>
                </div>

                {/* Fonts */}
                <div className="mb-8">
                  <h3 style={{ color: 'var(--text-primary)' }} className="text-sm font-medium mb-4">
                    Typography
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FontSelector
                      label="Heading Font"
                      value={headingFont}
                      onChange={setHeadingFont}
                    />
                    <FontSelector
                      label="Body Font"
                      value={bodyFont}
                      onChange={setBodyFont}
                    />
                  </div>
                </div>

                {/* Save Button */}
                <div className="flex justify-end pt-4 border-t" style={{ borderColor: 'var(--border-color)' }}>
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
            )}

            {/* Navigation Section */}
            {activeSection === 'navigation' && (
              <div>
                <h2 style={{ color: 'var(--text-primary)' }} className="text-lg font-semibold mb-4">
                  Navigation Menu
                </h2>
                <p style={{ color: 'var(--text-muted)' }} className="text-sm mb-6">
                  Customize your website navigation menu. Drag to reorder, toggle visibility, or add custom links.
                </p>

                <NavigationEditor
                  items={navigationItems}
                  onChange={setNavigationItems}
                />

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
            )}

            {/* Header Section */}
            {activeSection === 'header' && (
              <div>
                <h2 style={{ color: 'var(--text-primary)' }} className="text-lg font-semibold mb-4">
                  Header Settings
                </h2>
                <p style={{ color: 'var(--text-muted)' }} className="text-sm mb-6">
                  Configure your website header, logo, and call-to-action button.
                </p>

                <HeaderEditor
                  config={headerConfig}
                  logoUrl={logoUrl}
                  onChange={setHeaderConfig}
                  onLogoChange={setLogoUrl}
                />

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
            )}

            {/* Footer Section */}
            {activeSection === 'footer' && (
              <div>
                <h2 style={{ color: 'var(--text-primary)' }} className="text-lg font-semibold mb-4">
                  Footer Settings
                </h2>
                <p style={{ color: 'var(--text-muted)' }} className="text-sm mb-6">
                  Customize your website footer with links, social icons, and copyright information.
                </p>

                <FooterEditor
                  config={footerConfig}
                  socialLinks={socialLinks}
                  onChange={setFooterConfig}
                  onSocialLinksChange={setSocialLinks}
                />

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
            )}

            {/* SEO Defaults Section */}
            {activeSection === 'seo' && (
              <div>
                <h2 style={{ color: 'var(--text-primary)' }} className="text-lg font-semibold mb-4">
                  Default SEO Settings
                </h2>
                <p style={{ color: 'var(--text-muted)' }} className="text-sm mb-6">
                  Set default SEO values that will be used when pages don't have custom SEO settings.
                </p>

                <SEOFields
                  title={defaultSeoTitle}
                  setTitle={setDefaultSeoTitle}
                  description={defaultSeoDescription}
                  setDescription={setDefaultSeoDescription}
                  ogImage={defaultOgImage}
                  setOgImage={setDefaultOgImage}
                  noIndex={false}
                  setNoIndex={() => {}}
                  showPreview={true}
                  siteName={tenant?.business_name || 'Your Website'}
                />

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
            )}

            {/* Analytics Section */}
            {activeSection === 'analytics' && (
              <div>
                <h2 style={{ color: 'var(--text-primary)' }} className="text-lg font-semibold mb-4">
                  Analytics & Tracking
                </h2>
                <p style={{ color: 'var(--text-muted)' }} className="text-sm mb-6">
                  Add tracking codes to monitor your website traffic and conversions.
                </p>

                <div className="space-y-6">
                  {/* Google Analytics */}
                  <div>
                    <label style={{ color: 'var(--text-primary)' }} className="text-sm font-medium block mb-1">
                      Google Analytics ID
                    </label>
                    <input
                      type="text"
                      value={googleAnalyticsId}
                      onChange={(e) => setGoogleAnalyticsId(e.target.value)}
                      placeholder="G-XXXXXXXXXX or UA-XXXXXXXX-X"
                      style={{
                        backgroundColor: 'var(--bg-primary)',
                        borderColor: 'var(--border-color)',
                        color: 'var(--text-primary)',
                      }}
                      className="w-full px-3 py-2 rounded-lg border focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    />
                    <p style={{ color: 'var(--text-muted)' }} className="text-xs mt-1">
                      Find this in your Google Analytics account under Admin &gt; Property Settings
                    </p>
                  </div>

                  {/* Facebook Pixel */}
                  <div>
                    <label style={{ color: 'var(--text-primary)' }} className="text-sm font-medium block mb-1">
                      Facebook Pixel ID
                    </label>
                    <input
                      type="text"
                      value={facebookPixelId}
                      onChange={(e) => setFacebookPixelId(e.target.value)}
                      placeholder="XXXXXXXXXXXXXXX"
                      style={{
                        backgroundColor: 'var(--bg-primary)',
                        borderColor: 'var(--border-color)',
                        color: 'var(--text-primary)',
                      }}
                      className="w-full px-3 py-2 rounded-lg border focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    />
                    <p style={{ color: 'var(--text-muted)' }} className="text-xs mt-1">
                      Find this in your Facebook Events Manager
                    </p>
                  </div>
                </div>

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
            )}
          </div>
        </div>
      </div>

      {/* Theme Selector Modal */}
      <ThemeSelector
        isOpen={showThemeSelector}
        onClose={() => setShowThemeSelector(false)}
        currentThemeId={currentThemeId}
        currentFontPairingId={currentFontPairingId}
        currentColors={{
          primary: primaryColor,
          secondary: secondaryColor,
          accent: accentColor,
        }}
        currentFonts={{
          heading: headingFont,
          body: bodyFont,
        }}
        onApplyTheme={handleApplyTheme}
        onApplyFontPairing={handleApplyFontPairing}
        onApplyCustomColors={handleApplyCustomColors}
        onApplyCustomFonts={handleApplyCustomFonts}
      />
    </div>
  )
}

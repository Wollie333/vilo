import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Save, Menu as MenuIcon } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import {
  websiteSettingsApi,
  websitePagesApi,
  Menu,
  WebsitePage,
  setWebsiteTenantId,
  setWebsiteAccessToken
} from '../../services/websiteApi'
import MenuManager from '../../components/website/MenuManager'

// Default menus
const DEFAULT_MENUS: Menu[] = [
  {
    id: 'main-nav',
    name: 'Main Navigation',
    location: 'header',
    items: [
      { id: 'home', label: 'Home', url: '/', type: 'page', pageId: 'home', children: [] },
      { id: 'accommodation', label: 'Accommodation', url: '/accommodation', type: 'page', pageId: 'accommodation', children: [] },
      { id: 'reviews', label: 'Reviews', url: '/reviews', type: 'page', pageId: 'reviews', children: [] },
      { id: 'blog', label: 'Blog', url: '/blog', type: 'page', pageId: 'blog', children: [] },
      { id: 'contact', label: 'Contact', url: '/contact', type: 'page', pageId: 'contact', children: [] }
    ]
  },
  {
    id: 'footer-nav',
    name: 'Footer Navigation',
    location: 'footer',
    items: []
  }
]

export default function MenuSettings() {
  const navigate = useNavigate()
  const { tenant, session } = useAuth()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)
  const [menus, setMenus] = useState<Menu[]>(DEFAULT_MENUS)
  const [pages, setPages] = useState<WebsitePage[]>([])

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
        const [settingsData, pagesData] = await Promise.all([
          websiteSettingsApi.get(),
          websitePagesApi.getAll()
        ])

        // Load menus from settings or use defaults
        if (settingsData.menus && Array.isArray(settingsData.menus) && settingsData.menus.length > 0) {
          setMenus(settingsData.menus)
        }

        setPages(pagesData)
      } catch (error) {
        console.error('Failed to load data:', error)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [tenant?.id])

  const handleMenusChange = (newMenus: Menu[]) => {
    setMenus(newMenus)
    setHasChanges(true)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await websiteSettingsApi.update({ menus })
      setHasChanges(false)
    } catch (error) {
      console.error('Failed to save menus:', error)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/dashboard/website')}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            style={{ color: 'var(--text-secondary)' }}
          >
            <ArrowLeft size={20} />
          </button>
          <div className="flex items-center gap-3">
            <MenuIcon size={24} style={{ color: 'var(--text-primary)' }} />
            <div>
              <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
                Menu Manager
              </h1>
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                Create and manage navigation menus for your website
              </p>
            </div>
          </div>
        </div>
        <button
          onClick={handleSave}
          disabled={saving || !hasChanges}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <Save size={16} />
          {saving ? 'Saving...' : 'Save Menu'}
        </button>
      </div>

      {/* Menu Manager */}
      <div
        className="bg-white rounded-xl border p-6"
        style={{ borderColor: 'var(--border-color)' }}
      >
        <MenuManager
          menus={menus}
          pages={pages}
          onChange={handleMenusChange}
        />
      </div>
    </div>
  )
}

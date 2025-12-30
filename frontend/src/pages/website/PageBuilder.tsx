import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  Loader2,
  Save,
  Eye,
  EyeOff,
  Home,
  BedDouble,
  Star,
  Mail,
  FileText,
  Calendar,
  Layout,
  Settings,
  Undo2,
  Redo2,
  ExternalLink,
} from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import {
  websitePagesApi,
  websiteSettingsApi,
  WebsitePage,
  WebsiteSettings,
  Section,
  setWebsiteTenantId,
  setWebsiteAccessToken,
} from '../../services/websiteApi'
import { SectionList } from '../../components/website/sections'
import { DeviceToggle, LivePreview, DeviceType } from '../../components/website/preview'

// Page info mapping
const PAGE_INFO: Record<string, { name: string; icon: typeof Home; description: string }> = {
  home: { name: 'Home Page', icon: Home, description: 'Your main landing page' },
  accommodation: { name: 'Accommodation', icon: BedDouble, description: 'Room listings' },
  reviews: { name: 'Reviews', icon: Star, description: 'Guest reviews' },
  contact: { name: 'Contact', icon: Mail, description: 'Contact information' },
  blog: { name: 'Blog', icon: FileText, description: 'Blog listing' },
  book: { name: 'Booking', icon: Calendar, description: 'Booking wizard' },
  room_detail: { name: 'Room Detail', icon: Eye, description: 'Individual room' },
}

export default function PageBuilder() {
  const { pageType } = useParams<{ pageType: string }>()
  const navigate = useNavigate()
  const { tenant, session } = useAuth()

  // UI State
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showPreview, setShowPreview] = useState(true)
  const [device, setDevice] = useState<DeviceType>('desktop')
  const [hasChanges, setHasChanges] = useState(false)

  // Data State
  const [page, setPage] = useState<WebsitePage | null>(null)
  const [globalSettings, setGlobalSettings] = useState<WebsiteSettings | null>(null)
  const [sections, setSections] = useState<Section[]>([])

  // History for undo/redo (simplified)
  const [history, setHistory] = useState<Section[][]>([])
  const [historyIndex, setHistoryIndex] = useState(-1)

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
          websiteSettingsApi.get(),
        ])

        setPage(pageData)
        setGlobalSettings(settingsData)
        setSections(pageData.sections || [])

        // Initialize history
        setHistory([pageData.sections || []])
        setHistoryIndex(0)
      } catch (error) {
        console.error('Failed to load page:', error)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [tenant?.id, pageType])

  // Handle sections change
  const handleSectionsChange = (newSections: Section[]) => {
    setSections(newSections)
    setHasChanges(true)

    // Add to history (simplified - removes redo history)
    const newHistory = history.slice(0, historyIndex + 1)
    newHistory.push(newSections)
    setHistory(newHistory)
    setHistoryIndex(newHistory.length - 1)
  }

  // Undo
  const handleUndo = () => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1)
      setSections(history[historyIndex - 1])
      setHasChanges(true)
    }
  }

  // Redo
  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1)
      setSections(history[historyIndex + 1])
      setHasChanges(true)
    }
  }

  // Save changes
  const handleSave = async () => {
    if (!pageType) return

    try {
      setSaving(true)
      await websitePagesApi.update(pageType, { sections })
      setHasChanges(false)
    } catch (error) {
      console.error('Failed to save:', error)
    } finally {
      setSaving(false)
    }
  }

  const pageInfo = pageType ? PAGE_INFO[pageType] : null
  const Icon = pageInfo?.icon || Layout

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    )
  }

  if (!page || !pageType) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <p className="text-gray-500">Page not found</p>
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col bg-gray-100">
      {/* Top Bar */}
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex-shrink-0">
        <div className="flex items-center justify-between">
          {/* Left: Back + Page Info */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/dashboard/website')}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-500"
            >
              <ArrowLeft size={20} />
            </button>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center">
                <Icon size={18} className="text-gray-600" />
              </div>
              <div>
                <h1 className="font-semibold text-gray-900">{pageInfo?.name}</h1>
                <p className="text-xs text-gray-500">{pageInfo?.description}</p>
              </div>
            </div>
          </div>

          {/* Center: Undo/Redo + Device Toggle */}
          <div className="flex items-center gap-4">
            {/* Undo/Redo */}
            <div className="flex items-center gap-1">
              <button
                onClick={handleUndo}
                disabled={historyIndex <= 0}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                title="Undo"
              >
                <Undo2 size={18} className="text-gray-600" />
              </button>
              <button
                onClick={handleRedo}
                disabled={historyIndex >= history.length - 1}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                title="Redo"
              >
                <Redo2 size={18} className="text-gray-600" />
              </button>
            </div>

            {/* Device Toggle */}
            <DeviceToggle selected={device} onChange={setDevice} />
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-3">
            {/* Toggle Preview */}
            <button
              onClick={() => setShowPreview(!showPreview)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                showPreview ? 'bg-gray-100 text-gray-700' : 'text-gray-500 hover:bg-gray-100'
              }`}
            >
              {showPreview ? <EyeOff size={16} /> : <Eye size={16} />}
              <span className="text-sm">{showPreview ? 'Hide' : 'Show'} Preview</span>
            </button>

            {/* Settings */}
            <button
              onClick={() => navigate(`/dashboard/website/pages/${pageType}`)}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-500"
              title="Page Settings"
            >
              <Settings size={18} />
            </button>

            {/* Preview in new tab */}
            <a
              href={`/${pageType === 'home' ? '' : pageType}`}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-500"
              title="Preview in new tab"
            >
              <ExternalLink size={18} />
            </a>

            {/* Save */}
            <button
              onClick={handleSave}
              disabled={saving || !hasChanges}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                hasChanges
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed'
              }`}
            >
              {saving ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Save size={16} />
              )}
              {saving ? 'Saving...' : hasChanges ? 'Save' : 'Saved'}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - Section Editor */}
        <div
          className={`bg-white border-r border-gray-200 overflow-y-auto transition-all duration-300 ${
            showPreview ? 'w-[400px]' : 'flex-1'
          }`}
        >
          <div className="p-6">
            <SectionList
              sections={sections}
              onChange={handleSectionsChange}
              pageType={pageType}
            />
          </div>
        </div>

        {/* Right Panel - Live Preview */}
        {showPreview && (
          <div className="flex-1 overflow-hidden">
            <LivePreview
              sections={sections}
              device={device}
              primaryColor={globalSettings?.primary_color}
              accentColor={globalSettings?.accent_color}
            />
          </div>
        )}
      </div>

      {/* Unsaved changes indicator */}
      {hasChanges && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-yellow-100 text-yellow-800 px-4 py-2 rounded-full text-sm font-medium shadow-lg">
          You have unsaved changes
        </div>
      )}
    </div>
  )
}

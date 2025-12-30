import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  Search,
  Globe,
  FileText,
  BarChart3,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Plus,
  Trash2,
  Edit2,
  ExternalLink,
  Loader2,
  Save,
  ArrowRight,
  Facebook,
  Twitter,
  Share2
} from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'

interface SEOScore {
  page: string
  pageName: string
  score: number
  issues: string[]
  suggestions: string[]
}

interface Redirect {
  id: string
  from_path: string
  to_path: string
  redirect_type: number
  is_active: boolean
}

export default function SEODashboard() {
  const navigate = useNavigate()
  const { tenant, session } = useAuth()
  const [activeTab, setActiveTab] = useState<'overview' | 'pages' | 'redirects' | 'sitemap'>('overview')
  const [loading, setLoading] = useState(true)
  const [seoScores, setSeoScores] = useState<SEOScore[]>([])
  const [redirects, setRedirects] = useState<Redirect[]>([])
  const [showRedirectModal, setShowRedirectModal] = useState(false)
  const [editingRedirect, setEditingRedirect] = useState<Redirect | null>(null)
  const [redirectForm, setRedirectForm] = useState({
    from_path: '',
    to_path: '',
    redirect_type: 301,
    is_active: true
  })
  const [saving, setSaving] = useState(false)

  // Simulate loading SEO data
  useEffect(() => {
    const timer = setTimeout(() => {
      // Mock SEO scores for each page
      setSeoScores([
        {
          page: 'home',
          pageName: 'Home',
          score: 85,
          issues: ['Meta description is too short'],
          suggestions: ['Add more keywords to the title', 'Add alt text to all images']
        },
        {
          page: 'accommodation',
          pageName: 'Accommodation',
          score: 72,
          issues: ['Missing H1 tag', 'Meta description is missing'],
          suggestions: ['Add structured data for rooms', 'Improve page load speed']
        },
        {
          page: 'reviews',
          pageName: 'Reviews',
          score: 90,
          issues: [],
          suggestions: ['Add schema markup for reviews']
        },
        {
          page: 'contact',
          pageName: 'Contact',
          score: 65,
          issues: ['Missing meta description', 'No local business schema'],
          suggestions: ['Add business hours', 'Include Google Maps embed']
        },
        {
          page: 'book',
          pageName: 'Booking',
          score: 78,
          issues: ['Title too long'],
          suggestions: ['Add booking schema markup']
        }
      ])
      setLoading(false)
    }, 500)

    return () => clearTimeout(timer)
  }, [tenant?.id, session?.access_token])

  // Calculate average score
  const averageScore = seoScores.length > 0
    ? Math.round(seoScores.reduce((sum, s) => sum + s.score, 0) / seoScores.length)
    : 0

  // Get score color
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-500'
    if (score >= 60) return 'text-yellow-500'
    return 'text-red-500'
  }

  const getScoreBgColor = (score: number) => {
    if (score >= 80) return 'bg-green-100'
    if (score >= 60) return 'bg-yellow-100'
    return 'bg-red-100'
  }

  // Redirect handlers
  const handleAddRedirect = () => {
    setEditingRedirect(null)
    setRedirectForm({ from_path: '', to_path: '', redirect_type: 301, is_active: true })
    setShowRedirectModal(true)
  }

  const handleEditRedirect = (redirect: Redirect) => {
    setEditingRedirect(redirect)
    setRedirectForm({
      from_path: redirect.from_path,
      to_path: redirect.to_path,
      redirect_type: redirect.redirect_type,
      is_active: redirect.is_active
    })
    setShowRedirectModal(true)
  }

  const handleSaveRedirect = async () => {
    setSaving(true)
    try {
      if (editingRedirect) {
        // Update existing
        setRedirects(prev => prev.map(r =>
          r.id === editingRedirect.id
            ? { ...r, ...redirectForm }
            : r
        ))
      } else {
        // Add new
        const newRedirect: Redirect = {
          id: `redirect-${Date.now()}`,
          ...redirectForm
        }
        setRedirects(prev => [...prev, newRedirect])
      }
      setShowRedirectModal(false)
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteRedirect = (id: string) => {
    if (confirm('Are you sure you want to delete this redirect?')) {
      setRedirects(prev => prev.filter(r => r.id !== id))
    }
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
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => navigate('/dashboard/website')}
          style={{ color: 'var(--text-secondary)' }}
          className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="flex items-center gap-3">
          <Search size={24} style={{ color: 'var(--text-primary)' }} />
          <div>
            <h1 style={{ color: 'var(--text-primary)' }} className="text-2xl font-bold">
              SEO Dashboard
            </h1>
            <p style={{ color: 'var(--text-muted)' }} className="text-sm">
              Monitor and improve your website's search engine optimization
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b" style={{ borderColor: 'var(--border-color)' }}>
        {[
          { id: 'overview', label: 'Overview', icon: BarChart3 },
          { id: 'pages', label: 'Page SEO', icon: FileText },
          { id: 'redirects', label: 'Redirects', icon: ArrowRight },
          { id: 'sitemap', label: 'Sitemap', icon: Globe },
        ].map((tab) => {
          const Icon = tab.icon
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              style={{
                color: activeTab === tab.id ? 'var(--text-primary)' : 'var(--text-secondary)',
                borderBottomColor: activeTab === tab.id ? 'var(--text-primary)' : 'transparent'
              }}
              className="flex items-center gap-2 px-4 py-3 border-b-2 font-medium transition-colors"
            >
              <Icon size={18} />
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Score Card */}
          <div
            style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}
            className="rounded-lg border p-6"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 style={{ color: 'var(--text-primary)' }} className="text-lg font-semibold">
                Overall SEO Score
              </h2>
              <div className={`text-4xl font-bold ${getScoreColor(averageScore)}`}>
                {averageScore}/100
              </div>
            </div>

            <div className="h-4 bg-gray-200 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-500 ${
                  averageScore >= 80 ? 'bg-green-500' :
                  averageScore >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                }`}
                style={{ width: `${averageScore}%` }}
              />
            </div>

            <div className="mt-4 grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-semibold text-green-500">
                  {seoScores.filter(s => s.score >= 80).length}
                </div>
                <div style={{ color: 'var(--text-muted)' }} className="text-sm">
                  Optimized Pages
                </div>
              </div>
              <div>
                <div className="text-2xl font-semibold text-yellow-500">
                  {seoScores.filter(s => s.score >= 60 && s.score < 80).length}
                </div>
                <div style={{ color: 'var(--text-muted)' }} className="text-sm">
                  Needs Improvement
                </div>
              </div>
              <div>
                <div className="text-2xl font-semibold text-red-500">
                  {seoScores.filter(s => s.score < 60).length}
                </div>
                <div style={{ color: 'var(--text-muted)' }} className="text-sm">
                  Critical Issues
                </div>
              </div>
            </div>
          </div>

          {/* Quick Tips */}
          <div
            style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}
            className="rounded-lg border p-6"
          >
            <h2 style={{ color: 'var(--text-primary)' }} className="text-lg font-semibold mb-4">
              Top Recommendations
            </h2>
            <div className="space-y-3">
              {seoScores
                .flatMap(s => s.suggestions.map(sug => ({ page: s.pageName, suggestion: sug })))
                .slice(0, 5)
                .map((item, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-3 p-3 rounded-lg"
                    style={{ backgroundColor: 'var(--bg-tertiary)' }}
                  >
                    <AlertCircle size={18} className="text-blue-500 mt-0.5" />
                    <div>
                      <span style={{ color: 'var(--text-primary)' }} className="font-medium">
                        {item.page}:
                      </span>
                      <span style={{ color: 'var(--text-secondary)' }} className="ml-1">
                        {item.suggestion}
                      </span>
                    </div>
                  </div>
                ))}
            </div>
          </div>

          {/* Social Preview */}
          <div
            style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}
            className="rounded-lg border p-6"
          >
            <h2 style={{ color: 'var(--text-primary)' }} className="text-lg font-semibold mb-4">
              Social Media Preview
            </h2>
            <div className="grid md:grid-cols-2 gap-6">
              {/* Facebook Preview */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Facebook size={18} className="text-blue-600" />
                  <span style={{ color: 'var(--text-primary)' }} className="font-medium">Facebook</span>
                </div>
                <div className="border rounded-lg overflow-hidden" style={{ borderColor: 'var(--border-color)' }}>
                  <div className="h-32 bg-gray-200 flex items-center justify-center">
                    <span style={{ color: 'var(--text-muted)' }}>OG Image Preview</span>
                  </div>
                  <div className="p-3" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
                    <div style={{ color: 'var(--text-muted)' }} className="text-xs uppercase">
                      {tenant?.business_name?.toLowerCase().replace(/\s+/g, '-') || 'your-site'}.vilo.io
                    </div>
                    <div style={{ color: 'var(--text-primary)' }} className="font-semibold">
                      {tenant?.business_name || 'Your Website Title'}
                    </div>
                    <div style={{ color: 'var(--text-secondary)' }} className="text-sm line-clamp-2">
                      {tenant?.business_description || 'Your website description will appear here.'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Twitter Preview */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Twitter size={18} className="text-sky-500" />
                  <span style={{ color: 'var(--text-primary)' }} className="font-medium">Twitter/X</span>
                </div>
                <div className="border rounded-xl overflow-hidden" style={{ borderColor: 'var(--border-color)' }}>
                  <div className="h-32 bg-gray-200 flex items-center justify-center">
                    <span style={{ color: 'var(--text-muted)' }}>Twitter Card Preview</span>
                  </div>
                  <div className="p-3" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
                    <div style={{ color: 'var(--text-primary)' }} className="font-semibold">
                      {tenant?.business_name || 'Your Website Title'}
                    </div>
                    <div style={{ color: 'var(--text-secondary)' }} className="text-sm line-clamp-2">
                      {tenant?.business_description || 'Your website description will appear here.'}
                    </div>
                    <div style={{ color: 'var(--text-muted)' }} className="text-sm flex items-center gap-1 mt-1">
                      <Share2 size={14} />
                      {tenant?.business_name?.toLowerCase().replace(/\s+/g, '-') || 'your-site'}.vilo.io
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Pages Tab */}
      {activeTab === 'pages' && (
        <div className="space-y-4">
          {seoScores.map((page) => (
            <div
              key={page.page}
              style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}
              className="rounded-lg border p-4"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${getScoreBgColor(page.score)}`}>
                    <span className={`text-lg font-bold ${getScoreColor(page.score)}`}>
                      {page.score}
                    </span>
                  </div>
                  <div>
                    <h3 style={{ color: 'var(--text-primary)' }} className="font-semibold">
                      {page.pageName}
                    </h3>
                    <p style={{ color: 'var(--text-muted)' }} className="text-sm">
                      /{page.page === 'home' ? '' : page.page}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => navigate(`/dashboard/website/pages/${page.page}`)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm bg-gray-100 hover:bg-gray-200 transition-colors"
                  style={{ color: 'var(--text-primary)' }}
                >
                  <Edit2 size={14} />
                  Edit SEO
                </button>
              </div>

              {/* Issues */}
              {page.issues.length > 0 && (
                <div className="mb-3">
                  <div className="text-sm font-medium mb-2 flex items-center gap-1" style={{ color: 'var(--text-primary)' }}>
                    <XCircle size={14} className="text-red-500" />
                    Issues
                  </div>
                  <div className="space-y-1">
                    {page.issues.map((issue, i) => (
                      <div
                        key={i}
                        className="text-sm px-3 py-1.5 rounded bg-red-50 text-red-700"
                      >
                        {issue}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Suggestions */}
              {page.suggestions.length > 0 && (
                <div>
                  <div className="text-sm font-medium mb-2 flex items-center gap-1" style={{ color: 'var(--text-primary)' }}>
                    <CheckCircle2 size={14} className="text-blue-500" />
                    Suggestions
                  </div>
                  <div className="space-y-1">
                    {page.suggestions.map((suggestion, i) => (
                      <div
                        key={i}
                        className="text-sm px-3 py-1.5 rounded bg-blue-50 text-blue-700"
                      >
                        {suggestion}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {page.issues.length === 0 && page.suggestions.length === 0 && (
                <div className="flex items-center gap-2 text-green-600 text-sm">
                  <CheckCircle2 size={16} />
                  This page is fully optimized!
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Redirects Tab */}
      {activeTab === 'redirects' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <p style={{ color: 'var(--text-muted)' }} className="text-sm">
              Manage URL redirects to preserve SEO value when pages move or are deleted.
            </p>
            <button
              onClick={handleAddRedirect}
              className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors"
            >
              <Plus size={16} />
              Add Redirect
            </button>
          </div>

          {redirects.length === 0 ? (
            <div
              style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}
              className="rounded-lg border p-8 text-center"
            >
              <ArrowRight size={40} style={{ color: 'var(--text-muted)' }} className="mx-auto mb-3" />
              <h3 style={{ color: 'var(--text-primary)' }} className="font-semibold mb-2">
                No Redirects Yet
              </h3>
              <p style={{ color: 'var(--text-muted)' }} className="text-sm mb-4">
                Create redirects to maintain SEO value when changing URL structures.
              </p>
              <button
                onClick={handleAddRedirect}
                className="px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                style={{ color: 'var(--text-primary)' }}
              >
                Add Your First Redirect
              </button>
            </div>
          ) : (
            <div
              style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}
              className="rounded-lg border overflow-hidden"
            >
              <table className="w-full">
                <thead>
                  <tr style={{ backgroundColor: 'var(--bg-tertiary)' }}>
                    <th style={{ color: 'var(--text-secondary)' }} className="px-4 py-3 text-left text-sm font-medium">From</th>
                    <th style={{ color: 'var(--text-secondary)' }} className="px-4 py-3 text-left text-sm font-medium">To</th>
                    <th style={{ color: 'var(--text-secondary)' }} className="px-4 py-3 text-left text-sm font-medium">Type</th>
                    <th style={{ color: 'var(--text-secondary)' }} className="px-4 py-3 text-left text-sm font-medium">Status</th>
                    <th style={{ color: 'var(--text-secondary)' }} className="px-4 py-3 text-right text-sm font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {redirects.map((redirect) => (
                    <tr key={redirect.id} className="border-t" style={{ borderColor: 'var(--border-color)' }}>
                      <td className="px-4 py-3">
                        <code style={{ color: 'var(--text-primary)' }} className="text-sm bg-gray-100 px-2 py-1 rounded">
                          {redirect.from_path}
                        </code>
                      </td>
                      <td className="px-4 py-3">
                        <code style={{ color: 'var(--text-primary)' }} className="text-sm bg-gray-100 px-2 py-1 rounded">
                          {redirect.to_path}
                        </code>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm px-2 py-1 rounded bg-purple-100 text-purple-700">
                          {redirect.redirect_type}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {redirect.is_active ? (
                          <span className="text-sm px-2 py-1 rounded bg-green-100 text-green-700">Active</span>
                        ) : (
                          <span className="text-sm px-2 py-1 rounded bg-gray-100 text-gray-700">Inactive</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => handleEditRedirect(redirect)}
                          className="p-1.5 hover:bg-gray-100 rounded transition-colors mr-1"
                          style={{ color: 'var(--text-secondary)' }}
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => handleDeleteRedirect(redirect.id)}
                          className="p-1.5 hover:bg-red-100 rounded transition-colors text-red-500"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Sitemap Tab */}
      {activeTab === 'sitemap' && (
        <div
          style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}
          className="rounded-lg border p-6"
        >
          <h2 style={{ color: 'var(--text-primary)' }} className="text-lg font-semibold mb-4">
            XML Sitemap
          </h2>
          <p style={{ color: 'var(--text-muted)' }} className="text-sm mb-6">
            Your sitemap is automatically generated and updated when you publish pages.
          </p>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-lg" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
              <div className="flex items-center gap-3">
                <FileText size={20} style={{ color: 'var(--text-primary)' }} />
                <div>
                  <div style={{ color: 'var(--text-primary)' }} className="font-medium">sitemap.xml</div>
                  <div style={{ color: 'var(--text-muted)' }} className="text-sm">
                    https://{tenant?.business_name?.toLowerCase().replace(/\s+/g, '-') || 'your-site'}.vilo.io/sitemap.xml
                  </div>
                </div>
              </div>
              <a
                href={`https://${tenant?.business_name?.toLowerCase().replace(/\s+/g, '-') || 'your-site'}.vilo.io/sitemap.xml`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm bg-gray-100 hover:bg-gray-200 transition-colors"
                style={{ color: 'var(--text-primary)' }}
              >
                <ExternalLink size={14} />
                View Sitemap
              </a>
            </div>

            <div className="p-4 rounded-lg border" style={{ borderColor: 'var(--border-color)' }}>
              <h3 style={{ color: 'var(--text-primary)' }} className="font-medium mb-3">Pages in Sitemap</h3>
              <div className="space-y-2">
                {[
                  { url: '/', lastmod: 'Today', priority: '1.0' },
                  { url: '/accommodation', lastmod: 'Today', priority: '0.9' },
                  { url: '/reviews', lastmod: '2 days ago', priority: '0.7' },
                  { url: '/blog', lastmod: '1 week ago', priority: '0.8' },
                  { url: '/contact', lastmod: '1 month ago', priority: '0.6' },
                ].map((page, i) => (
                  <div key={i} className="flex items-center justify-between text-sm py-2 border-b last:border-0" style={{ borderColor: 'var(--border-color)' }}>
                    <code style={{ color: 'var(--text-primary)' }}>{page.url}</code>
                    <div className="flex items-center gap-4">
                      <span style={{ color: 'var(--text-muted)' }}>Modified: {page.lastmod}</span>
                      <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-700">Priority: {page.priority}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-4 rounded-lg bg-blue-50">
              <h3 className="font-medium text-blue-800 mb-2">Submit to Search Engines</h3>
              <p className="text-sm text-blue-700 mb-3">
                Submit your sitemap to search engines to help them discover and index your pages faster.
              </p>
              <div className="flex gap-3">
                <a
                  href={`https://search.google.com/search-console/sitemaps?resource_id=https://${tenant?.business_name?.toLowerCase().replace(/\s+/g, '-') || 'your-site'}.vilo.io`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm bg-white text-blue-700 hover:bg-blue-100 transition-colors"
                >
                  <ExternalLink size={14} />
                  Google Search Console
                </a>
                <a
                  href="https://www.bing.com/webmasters/sitemaps"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm bg-white text-blue-700 hover:bg-blue-100 transition-colors"
                >
                  <ExternalLink size={14} />
                  Bing Webmaster Tools
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Redirect Modal */}
      {showRedirectModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div
            style={{ backgroundColor: 'var(--bg-card)' }}
            className="w-full max-w-md rounded-xl shadow-2xl p-6"
          >
            <h2 style={{ color: 'var(--text-primary)' }} className="text-lg font-semibold mb-4">
              {editingRedirect ? 'Edit Redirect' : 'Add Redirect'}
            </h2>

            <div className="space-y-4">
              <div>
                <label style={{ color: 'var(--text-primary)' }} className="text-sm font-medium block mb-1">
                  From Path
                </label>
                <input
                  type="text"
                  value={redirectForm.from_path}
                  onChange={(e) => setRedirectForm(prev => ({ ...prev, from_path: e.target.value }))}
                  placeholder="/old-page"
                  style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
                  className="w-full px-3 py-2 rounded-lg border focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label style={{ color: 'var(--text-primary)' }} className="text-sm font-medium block mb-1">
                  To Path
                </label>
                <input
                  type="text"
                  value={redirectForm.to_path}
                  onChange={(e) => setRedirectForm(prev => ({ ...prev, to_path: e.target.value }))}
                  placeholder="/new-page"
                  style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
                  className="w-full px-3 py-2 rounded-lg border focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label style={{ color: 'var(--text-primary)' }} className="text-sm font-medium block mb-1">
                  Redirect Type
                </label>
                <select
                  value={redirectForm.redirect_type}
                  onChange={(e) => setRedirectForm(prev => ({ ...prev, redirect_type: parseInt(e.target.value) }))}
                  style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
                  className="w-full px-3 py-2 rounded-lg border focus:ring-2 focus:ring-blue-500"
                >
                  <option value={301}>301 - Permanent Redirect</option>
                  <option value={302}>302 - Temporary Redirect</option>
                  <option value={307}>307 - Temporary Redirect (Strict)</option>
                  <option value={308}>308 - Permanent Redirect (Strict)</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={redirectForm.is_active}
                  onChange={(e) => setRedirectForm(prev => ({ ...prev, is_active: e.target.checked }))}
                  className="rounded"
                />
                <label htmlFor="is_active" style={{ color: 'var(--text-primary)' }} className="text-sm">
                  Active
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowRedirectModal(false)}
                style={{ color: 'var(--text-secondary)', borderColor: 'var(--border-color)' }}
                className="px-4 py-2 border rounded-lg hover:bg-gray-100 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveRedirect}
                disabled={saving || !redirectForm.from_path || !redirectForm.to_path}
                className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 disabled:opacity-50 transition-colors"
              >
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

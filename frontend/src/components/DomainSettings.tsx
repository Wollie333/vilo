import { useState, useEffect } from 'react'
import { Globe, Check, X, Loader2, Copy, ExternalLink, AlertCircle, RefreshCw } from 'lucide-react'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3002/api'

// ============================================
// TYPES
// ============================================

interface DomainSettingsData {
  slug: string | null
  subdomain: string | null
  subdomain_url: string | null
  custom_domain: string | null
  custom_domain_url: string | null
  verification_status: string
  verified_at: string | null
  ssl_status: string
  ssl_expires_at: string | null
  is_listed_in_directory: boolean
  directory_description: string | null
  directory_featured_image_url: string | null
  directory_tags: string[]
  cname_target: string
}

interface Props {
  accessToken: string
}

// ============================================
// COMPONENT
// ============================================

export default function DomainSettings({ accessToken }: Props) {
  const [data, setData] = useState<DomainSettingsData | null>(null)
  const [loading, setLoading] = useState(true)

  // Form states
  const [slug, setSlug] = useState('')
  const [customDomain, setCustomDomain] = useState('')
  const [isListed, setIsListed] = useState(false)
  const [directoryDescription, setDirectoryDescription] = useState('')

  // Loading states
  const [slugSaving, setSlugSaving] = useState(false)
  const [domainSaving, setDomainSaving] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [directorySaving, setDirectorySaving] = useState(false)

  // Slug availability check
  const [slugAvailable, setSlugAvailable] = useState<boolean | null>(null)
  const [slugChecking, setSlugChecking] = useState(false)

  // Messages
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // ============================================
  // DATA FETCHING
  // ============================================

  const fetchDomainSettings = async () => {
    try {
      setLoading(true)
      const response = await fetch(`${API_URL}/domains/settings`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      })

      if (!response.ok) throw new Error('Failed to fetch domain settings')

      const result = await response.json()
      setData(result)
      setSlug(result.slug || '')
      setCustomDomain(result.custom_domain || '')
      setIsListed(result.is_listed_in_directory || false)
      setDirectoryDescription(result.directory_description || '')
    } catch (error) {
      console.error('Error fetching domain settings:', error)
      setMessage({ type: 'error', text: 'Failed to load domain settings' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (accessToken) {
      fetchDomainSettings()
    }
  }, [accessToken])

  // ============================================
  // SLUG HANDLERS
  // ============================================

  const checkSlugAvailability = async (slugToCheck: string) => {
    if (!slugToCheck || slugToCheck.length < 3) {
      setSlugAvailable(null)
      return
    }

    setSlugChecking(true)
    try {
      const response = await fetch(`${API_URL}/domains/slug/check?slug=${slugToCheck}`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      })
      const result = await response.json()
      setSlugAvailable(result.available)
    } catch {
      setSlugAvailable(null)
    } finally {
      setSlugChecking(false)
    }
  }

  // Debounced slug check
  useEffect(() => {
    const normalizedSlug = slug.toLowerCase().replace(/[^a-z0-9-]/g, '')
    if (normalizedSlug !== data?.slug) {
      const timer = setTimeout(() => checkSlugAvailability(normalizedSlug), 500)
      return () => clearTimeout(timer)
    } else {
      setSlugAvailable(null)
    }
  }, [slug, data?.slug])

  const handleSlugChange = (value: string) => {
    // Only allow lowercase letters, numbers, and hyphens
    const normalized = value.toLowerCase().replace(/[^a-z0-9-]/g, '')
    setSlug(normalized)
  }

  const saveSlug = async () => {
    if (!slug || slug.length < 3) {
      setMessage({ type: 'error', text: 'Subdomain must be at least 3 characters' })
      return
    }

    setSlugSaving(true)
    setMessage(null)

    try {
      const response = await fetch(`${API_URL}/domains/slug`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`
        },
        body: JSON.stringify({ slug })
      })

      const result = await response.json()

      if (response.ok) {
        setMessage({ type: 'success', text: 'Subdomain updated successfully!' })
        fetchDomainSettings()
      } else {
        setMessage({ type: 'error', text: result.error || result.message || 'Failed to update' })
      }
    } catch {
      setMessage({ type: 'error', text: 'Failed to update subdomain' })
    } finally {
      setSlugSaving(false)
    }
  }

  // ============================================
  // CUSTOM DOMAIN HANDLERS
  // ============================================

  const addCustomDomain = async () => {
    if (!customDomain) {
      setMessage({ type: 'error', text: 'Please enter a domain' })
      return
    }

    setDomainSaving(true)
    setMessage(null)

    try {
      const response = await fetch(`${API_URL}/domains/custom`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`
        },
        body: JSON.stringify({ domain: customDomain })
      })

      const result = await response.json()

      if (response.ok) {
        setMessage({ type: 'success', text: 'Domain added! Configure your DNS settings below.' })
        fetchDomainSettings()
      } else {
        setMessage({ type: 'error', text: result.error || result.message || 'Failed to add domain' })
      }
    } catch {
      setMessage({ type: 'error', text: 'Failed to add domain' })
    } finally {
      setDomainSaving(false)
    }
  }

  const verifyDomain = async () => {
    setVerifying(true)
    setMessage(null)

    try {
      const response = await fetch(`${API_URL}/domains/verify`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}` }
      })

      const result = await response.json()

      if (result.verified) {
        setMessage({ type: 'success', text: result.message || 'Domain verified!' })
      } else {
        setMessage({ type: 'error', text: result.message || 'Verification failed' })
      }
      fetchDomainSettings()
    } catch {
      setMessage({ type: 'error', text: 'Verification failed' })
    } finally {
      setVerifying(false)
    }
  }

  const removeDomain = async () => {
    if (!confirm('Are you sure you want to remove this custom domain?')) return

    try {
      await fetch(`${API_URL}/domains/custom`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${accessToken}` }
      })
      setCustomDomain('')
      setMessage({ type: 'success', text: 'Domain removed' })
      fetchDomainSettings()
    } catch {
      setMessage({ type: 'error', text: 'Failed to remove domain' })
    }
  }

  // ============================================
  // DIRECTORY HANDLERS
  // ============================================

  const saveDirectorySettings = async () => {
    setDirectorySaving(true)
    setMessage(null)

    try {
      const response = await fetch(`${API_URL}/domains/directory`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          is_listed: isListed,
          description: directoryDescription
        })
      })

      if (response.ok) {
        setMessage({ type: 'success', text: 'Directory settings saved!' })
        fetchDomainSettings()
      } else {
        const result = await response.json()
        setMessage({ type: 'error', text: result.error || 'Failed to save' })
      }
    } catch {
      setMessage({ type: 'error', text: 'Failed to save directory settings' })
    } finally {
      setDirectorySaving(false)
    }
  }

  // ============================================
  // HELPERS
  // ============================================

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    setMessage({ type: 'success', text: 'Copied to clipboard!' })
    setTimeout(() => setMessage(null), 2000)
  }

  const getVerificationStatusBadge = () => {
    if (!data?.custom_domain) return null

    switch (data.verification_status) {
      case 'verified':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <Check size={12} /> Verified
          </span>
        )
      case 'verifying':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
            <Loader2 size={12} className="animate-spin" /> Verifying
          </span>
        )
      case 'failed':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
            <X size={12} /> Failed
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            <AlertCircle size={12} /> Pending
          </span>
        )
    }
  }

  const getSSLStatusBadge = () => {
    if (!data?.custom_domain || data.verification_status !== 'verified') return null

    switch (data.ssl_status) {
      case 'active':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <Check size={12} /> SSL Active
          </span>
        )
      case 'provisioning':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
            <Loader2 size={12} className="animate-spin" /> SSL Provisioning
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            SSL Pending
          </span>
        )
    }
  }

  // ============================================
  // RENDER
  // ============================================

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="animate-spin text-gray-400" size={32} />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Status Message */}
      {message && (
        <div className={`p-4 rounded-lg ${
          message.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          {message.text}
        </div>
      )}

      {/* Subdomain Section */}
      <section className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center gap-2 mb-4">
          <Globe size={20} className="text-gray-600" />
          <h3 className="text-lg font-semibold text-gray-900">Your Vilo Subdomain</h3>
        </div>

        <p className="text-gray-600 text-sm mb-4">
          Your property is accessible at a free vilo.io subdomain. Customize it to match your brand.
        </p>

        <div className="flex items-center gap-2 mb-4">
          <div className="flex-1 relative">
            <input
              type="text"
              value={slug}
              onChange={(e) => handleSlugChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400 pr-10"
              placeholder="your-property"
              maxLength={63}
            />
            {slugChecking && (
              <Loader2 size={16} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-gray-400" />
            )}
            {!slugChecking && slugAvailable === true && slug !== data?.slug && (
              <Check size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-green-500" />
            )}
            {!slugChecking && slugAvailable === false && (
              <X size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-red-500" />
            )}
          </div>
          <span className="text-gray-500 font-medium">.vilo.io</span>
          <button
            onClick={saveSlug}
            disabled={slugSaving || !slug || slug.length < 3 || (slugAvailable === false)}
            className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {slugSaving ? <Loader2 size={16} className="animate-spin" /> : 'Save'}
          </button>
        </div>

        {data?.subdomain_url && (
          <div className="flex items-center gap-2 text-sm">
            <span className="text-gray-500">Your site:</span>
            <a
              href={data.subdomain_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline flex items-center gap-1"
            >
              {data.subdomain} <ExternalLink size={14} />
            </a>
          </div>
        )}

        {slugAvailable === false && (
          <p className="text-red-600 text-sm mt-2">This subdomain is not available</p>
        )}
      </section>

      {/* Custom Domain Section */}
      <section className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center gap-2 mb-4">
          <Globe size={20} className="text-gray-600" />
          <h3 className="text-lg font-semibold text-gray-900">Custom Domain</h3>
        </div>

        <p className="text-gray-600 text-sm mb-4">
          Connect your own domain for a fully branded experience (e.g., book.yourbusiness.com)
        </p>

        {!data?.custom_domain ? (
          // No domain configured yet
          <div className="space-y-4">
            <div className="flex gap-2">
              <input
                type="text"
                value={customDomain}
                onChange={(e) => setCustomDomain(e.target.value.toLowerCase())}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400"
                placeholder="book.yourdomain.com"
              />
              <button
                onClick={addCustomDomain}
                disabled={domainSaving || !customDomain}
                className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {domainSaving ? <Loader2 size={16} className="animate-spin" /> : 'Add Domain'}
              </button>
            </div>
          </div>
        ) : (
          // Domain is configured
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="font-medium text-gray-900">{data.custom_domain}</span>
                {getVerificationStatusBadge()}
                {getSSLStatusBadge()}
              </div>
              <button
                onClick={removeDomain}
                className="text-red-600 hover:text-red-800 text-sm font-medium"
              >
                Remove
              </button>
            </div>

            {data.verification_status !== 'verified' && (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-4">
                <div className="flex items-start gap-2">
                  <AlertCircle size={18} className="text-amber-500 mt-0.5" />
                  <div>
                    <p className="font-medium text-gray-900">DNS Configuration Required</p>
                    <p className="text-sm text-gray-600">Add the following CNAME record to your DNS settings:</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-white border border-gray-200 rounded-lg p-4">
                  <div>
                    <span className="text-xs text-gray-500 uppercase font-medium">Type</span>
                    <p className="font-mono text-sm mt-1">CNAME</p>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500 uppercase font-medium">Name / Host</span>
                    <div className="flex items-center gap-2 mt-1">
                      <p className="font-mono text-sm">{data.custom_domain}</p>
                      <button onClick={() => copyToClipboard(data.custom_domain!)}>
                        <Copy size={14} className="text-gray-400 hover:text-gray-600" />
                      </button>
                    </div>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500 uppercase font-medium">Points to / Value</span>
                    <div className="flex items-center gap-2 mt-1">
                      <p className="font-mono text-sm">{data.cname_target}</p>
                      <button onClick={() => copyToClipboard(data.cname_target)}>
                        <Copy size={14} className="text-gray-400 hover:text-gray-600" />
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={verifyDomain}
                    disabled={verifying}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                  >
                    {verifying ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <RefreshCw size={16} />
                    )}
                    Verify DNS
                  </button>
                  <span className="text-sm text-gray-500">
                    DNS changes can take up to 48 hours to propagate
                  </span>
                </div>
              </div>
            )}

            {data.verification_status === 'verified' && data.custom_domain_url && (
              <div className="flex items-center gap-2 text-sm">
                <span className="text-gray-500">Your custom domain:</span>
                <a
                  href={data.custom_domain_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline flex items-center gap-1"
                >
                  {data.custom_domain} <ExternalLink size={14} />
                </a>
              </div>
            )}
          </div>
        )}
      </section>

      {/* Directory Listing Section */}
      <section className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center gap-2 mb-4">
          <Globe size={20} className="text-gray-600" />
          <h3 className="text-lg font-semibold text-gray-900">Vilo Directory</h3>
        </div>

        <p className="text-gray-600 text-sm mb-4">
          Get discovered by guests browsing the Vilo property directory at vilo.io
        </p>

        <div className="space-y-4">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={isListed}
              onChange={(e) => setIsListed(e.target.checked)}
              className="w-5 h-5 rounded border-gray-300 text-gray-900 focus:ring-gray-400"
            />
            <span className="text-gray-900 font-medium">List my property in the Vilo directory</span>
          </label>

          {isListed && (
            <div className="pl-8 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Directory Description
                </label>
                <textarea
                  value={directoryDescription}
                  onChange={(e) => setDirectoryDescription(e.target.value)}
                  rows={3}
                  maxLength={300}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400"
                  placeholder="A brief description of your property for the directory listing..."
                />
                <p className="text-xs text-gray-500 mt-1">{directoryDescription.length}/300 characters</p>
              </div>
            </div>
          )}

          <button
            onClick={saveDirectorySettings}
            disabled={directorySaving}
            className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 disabled:opacity-50 flex items-center gap-2"
          >
            {directorySaving ? <Loader2 size={16} className="animate-spin" /> : 'Save Directory Settings'}
          </button>
        </div>
      </section>
    </div>
  )
}

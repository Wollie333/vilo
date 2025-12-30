import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3002/api'

// ============================================
// TYPES
// ============================================

export interface PublicTenant {
  id: string
  slug: string | null
  custom_domain: string | null
  business_name: string | null
  business_description: string | null
  logo_url: string | null
  business_email: string | null
  business_phone: string | null
  address_line1: string | null
  city: string | null
  state_province: string | null
  country: string | null
  currency: string
  timezone: string
}

interface TenantContextType {
  tenant: PublicTenant | null
  tenantId: string | null
  loading: boolean
  error: string | null
  isMainSite: boolean
  isSubdomain: boolean
  isCustomDomain: boolean
  getPublicUrl: () => string
  refetch: () => Promise<void>
}

// ============================================
// HOSTNAME DETECTION
// ============================================

interface HostnameInfo {
  hostname: string
  isMainSite: boolean
  isSubdomain: boolean
  isCustomDomain: boolean
  slug: string | null
}

function parseHostname(): HostnameInfo {
  const hostname = window.location.hostname.toLowerCase()

  // Main vilo.io site
  if (hostname === 'vilo.io' || hostname === 'www.vilo.io') {
    return {
      hostname,
      isMainSite: true,
      isSubdomain: false,
      isCustomDomain: false,
      slug: null
    }
  }

  // Localhost - check for query param or subdomain
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    // Check URL params for dev/demo mode
    const params = new URLSearchParams(window.location.search)
    const tenantParam = params.get('tenant') || params.get('property')

    if (tenantParam) {
      return {
        hostname,
        isMainSite: false,
        isSubdomain: false,
        isCustomDomain: false,
        slug: tenantParam
      }
    }

    return {
      hostname,
      isMainSite: true,
      isSubdomain: false,
      isCustomDomain: false,
      slug: null
    }
  }

  // Subdomain pattern: slug.vilo.io
  if (hostname.endsWith('.vilo.io')) {
    const slug = hostname.replace('.vilo.io', '')
    const reserved = ['www', 'api', 'app', 'admin', 'dashboard', 'domains', 'mail']

    if (!reserved.includes(slug)) {
      return {
        hostname,
        isMainSite: false,
        isSubdomain: true,
        isCustomDomain: false,
        slug
      }
    }

    return {
      hostname,
      isMainSite: true,
      isSubdomain: false,
      isCustomDomain: false,
      slug: null
    }
  }

  // Local subdomain pattern: slug.localhost
  if (hostname.endsWith('.localhost')) {
    const slug = hostname.replace('.localhost', '')
    return {
      hostname,
      isMainSite: false,
      isSubdomain: true,
      isCustomDomain: false,
      slug
    }
  }

  // Custom domain
  return {
    hostname,
    isMainSite: false,
    isSubdomain: false,
    isCustomDomain: true,
    slug: null
  }
}

// ============================================
// CONTEXT
// ============================================

const TenantContext = createContext<TenantContextType | undefined>(undefined)

export function TenantProvider({ children }: { children: ReactNode }) {
  const [tenant, setTenant] = useState<PublicTenant | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [hostnameInfo, setHostnameInfo] = useState<HostnameInfo>(() => parseHostname())

  const fetchTenant = async () => {
    const info = parseHostname()
    setHostnameInfo(info)

    // Main site - no tenant to fetch
    if (info.isMainSite) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)

      let response: Response

      if (info.isCustomDomain) {
        // Resolve tenant from hostname via API
        response = await fetch(`${API_BASE_URL}/public/tenant/current`, {
          headers: {
            'X-Forwarded-Host': info.hostname
          }
        })
      } else if (info.slug) {
        // Resolve tenant by slug directly
        response = await fetch(`${API_BASE_URL}/public/tenant/by-slug/${info.slug}`)
      } else {
        throw new Error('Unable to determine tenant')
      }

      if (!response.ok) {
        throw new Error('Property not found')
      }

      const data = await response.json()
      setTenant(data)
    } catch (err) {
      console.error('Error fetching tenant:', err)
      setError(err instanceof Error ? err.message : 'Failed to load property')
      setTenant(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTenant()
  }, [])

  // Listen for URL changes (for SPA navigation)
  useEffect(() => {
    const handlePopState = () => {
      const newInfo = parseHostname()
      if (newInfo.hostname !== hostnameInfo.hostname || newInfo.slug !== hostnameInfo.slug) {
        fetchTenant()
      }
    }

    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [hostnameInfo])

  const getPublicUrl = (): string => {
    if (!tenant) return 'https://vilo.io'

    // Prefer custom domain if set
    if (tenant.custom_domain) {
      return `https://${tenant.custom_domain}`
    }

    // Fall back to subdomain
    if (tenant.slug) {
      return `https://${tenant.slug}.vilo.io`
    }

    // Last resort
    return `https://vilo.io?property=${tenant.id}`
  }

  const value: TenantContextType = {
    tenant,
    tenantId: tenant?.id || null,
    loading,
    error,
    isMainSite: hostnameInfo.isMainSite,
    isSubdomain: hostnameInfo.isSubdomain,
    isCustomDomain: hostnameInfo.isCustomDomain,
    getPublicUrl,
    refetch: fetchTenant
  }

  return <TenantContext.Provider value={value}>{children}</TenantContext.Provider>
}

export function useTenant() {
  const context = useContext(TenantContext)
  if (context === undefined) {
    throw new Error('useTenant must be used within a TenantProvider')
  }
  return context
}

/**
 * Hook that returns tenant ID from either TenantContext (public) or AuthContext (admin)
 * Useful for components that work in both contexts
 */
export function useTenantId(): string | null {
  const tenantContext = useContext(TenantContext)

  // If in TenantProvider context, use that
  if (tenantContext?.tenantId) {
    return tenantContext.tenantId
  }

  return null
}

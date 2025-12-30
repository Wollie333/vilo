/**
 * Domain Management API Service
 *
 * Provides methods for managing tenant domains:
 * - Subdomain (slug.vilo.io)
 * - Custom domain (your-domain.com)
 * - Directory listing
 */

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3002/api'

// ============================================
// TYPES
// ============================================

export interface DomainSettings {
  slug: string | null
  subdomain: string | null
  subdomain_url: string | null
  custom_domain: string | null
  custom_domain_url: string | null
  verification_status: 'pending' | 'verifying' | 'verified' | 'failed'
  verified_at: string | null
  ssl_status: 'pending' | 'provisioning' | 'active' | 'expired' | 'failed'
  ssl_issued_at: string | null
  ssl_expires_at: string | null
  is_listed_in_directory: boolean
  directory_description: string | null
  directory_featured_image_url: string | null
  directory_tags: string[]
  cname_target: string
}

export interface SlugUpdateResponse {
  success: boolean
  slug: string
  subdomain: string
  subdomain_url: string
}

export interface SlugCheckResponse {
  available: boolean
  reason?: string
}

export interface CustomDomainResponse {
  success: boolean
  domain: string
  verification_status: string
  instructions: {
    type: string
    name: string
    target: string
    ttl: number
    message: string
  }
}

export interface DomainVerificationResponse {
  success: boolean
  verified: boolean
  message: string
  domain?: string
  domain_url?: string
  expected?: string
  found?: string[]
  hint?: string
  error_code?: string
}

export interface DirectoryUpdateResponse {
  success: boolean
}

export interface VerificationHistoryItem {
  id: string
  tenant_id: string
  domain: string
  verification_type: string
  expected_value: string
  actual_value: string | null
  status: 'pending' | 'success' | 'failed'
  error_message: string | null
  checked_at: string | null
  created_at: string
}

// ============================================
// API FUNCTIONS
// ============================================

/**
 * Get domain settings for current tenant
 */
export async function getDomainSettings(accessToken: string): Promise<DomainSettings> {
  const response = await fetch(`${API_URL}/domains/settings`, {
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to fetch domain settings' }))
    throw new Error(error.error || 'Failed to fetch domain settings')
  }

  return response.json()
}

/**
 * Update subdomain slug
 */
export async function updateSlug(
  accessToken: string,
  slug: string
): Promise<SlugUpdateResponse> {
  const response = await fetch(`${API_URL}/domains/slug`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`
    },
    body: JSON.stringify({ slug })
  })

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.error || data.message || 'Failed to update subdomain')
  }

  return data
}

/**
 * Check if a slug is available
 */
export async function checkSlugAvailability(
  accessToken: string,
  slug: string
): Promise<SlugCheckResponse> {
  const response = await fetch(`${API_URL}/domains/slug/check?slug=${encodeURIComponent(slug)}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  })

  if (!response.ok) {
    return { available: false, reason: 'Error checking availability' }
  }

  return response.json()
}

/**
 * Add a custom domain
 */
export async function addCustomDomain(
  accessToken: string,
  domain: string
): Promise<CustomDomainResponse> {
  const response = await fetch(`${API_URL}/domains/custom`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`
    },
    body: JSON.stringify({ domain })
  })

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.error || data.message || 'Failed to add custom domain')
  }

  return data
}

/**
 * Verify custom domain DNS
 */
export async function verifyCustomDomain(
  accessToken: string
): Promise<DomainVerificationResponse> {
  const response = await fetch(`${API_URL}/domains/verify`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  })

  return response.json()
}

/**
 * Remove custom domain
 */
export async function removeCustomDomain(accessToken: string): Promise<{ success: boolean }> {
  const response = await fetch(`${API_URL}/domains/custom`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  })

  if (!response.ok) {
    const data = await response.json().catch(() => ({ error: 'Failed to remove domain' }))
    throw new Error(data.error || 'Failed to remove domain')
  }

  return response.json()
}

/**
 * Update directory listing settings
 */
export async function updateDirectorySettings(
  accessToken: string,
  settings: {
    is_listed?: boolean
    description?: string | null
    featured_image_url?: string | null
    tags?: string[]
  }
): Promise<DirectoryUpdateResponse> {
  const response = await fetch(`${API_URL}/domains/directory`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`
    },
    body: JSON.stringify(settings)
  })

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.error || 'Failed to update directory settings')
  }

  return data
}

/**
 * Get domain verification history
 */
export async function getVerificationHistory(
  accessToken: string
): Promise<VerificationHistoryItem[]> {
  const response = await fetch(`${API_URL}/domains/verification-history`, {
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  })

  if (!response.ok) {
    return []
  }

  return response.json()
}

// ============================================
// DIRECTORY API (Public - no auth required)
// ============================================

export interface DirectoryProperty {
  id: string
  slug: string
  custom_domain: string | null
  business_name: string
  business_description: string | null
  directory_description: string | null
  directory_featured_image_url: string | null
  directory_tags: string[]
  logo_url: string | null
  city: string | null
  state_province: string | null
  country: string | null
  currency: string | null
  website_url: string
  room_count?: number
  min_price?: number
  max_price?: number
  average_rating?: number
  review_count?: number
}

export interface DirectoryResponse {
  properties: DirectoryProperty[]
  pagination: {
    total: number
    limit: number
    offset: number
    has_more: boolean
  }
}

export interface DirectoryFilters {
  search?: string
  city?: string
  country?: string
  tags?: string[]
  sort?: 'name' | 'newest'
  limit?: number
  offset?: number
}

/**
 * Get properties from the public directory
 */
export async function getDirectoryProperties(
  filters: DirectoryFilters = {}
): Promise<DirectoryResponse> {
  const params = new URLSearchParams()

  if (filters.search) params.set('search', filters.search)
  if (filters.city) params.set('city', filters.city)
  if (filters.country) params.set('country', filters.country)
  if (filters.tags?.length) params.set('tags', filters.tags.join(','))
  if (filters.sort) params.set('sort', filters.sort)
  if (filters.limit) params.set('limit', filters.limit.toString())
  if (filters.offset) params.set('offset', filters.offset.toString())

  const response = await fetch(`${API_URL}/directory/properties?${params}`)

  if (!response.ok) {
    return { properties: [], pagination: { total: 0, limit: 20, offset: 0, has_more: false } }
  }

  return response.json()
}

/**
 * Get a single property from the directory by slug
 */
export async function getDirectoryProperty(slug: string): Promise<DirectoryProperty | null> {
  const response = await fetch(`${API_URL}/directory/properties/${encodeURIComponent(slug)}`)

  if (!response.ok) {
    return null
  }

  return response.json()
}

/**
 * Search properties (autocomplete)
 */
export async function searchDirectory(query: string, limit = 5): Promise<{
  id: string
  slug: string
  name: string
  location: string
  logo_url: string | null
}[]> {
  if (!query || query.length < 2) return []

  const response = await fetch(
    `${API_URL}/directory/search?q=${encodeURIComponent(query)}&limit=${limit}`
  )

  if (!response.ok) {
    return []
  }

  return response.json()
}

/**
 * Get available locations with property counts
 */
export async function getDirectoryLocations(): Promise<{
  city: string
  country: string
  count: number
}[]> {
  const response = await fetch(`${API_URL}/directory/locations`)

  if (!response.ok) {
    return []
  }

  return response.json()
}

/**
 * Get available tags with property counts
 */
export async function getDirectoryTags(): Promise<{
  tag: string
  count: number
}[]> {
  const response = await fetch(`${API_URL}/directory/tags`)

  if (!response.ok) {
    return []
  }

  return response.json()
}

/**
 * Get featured properties
 */
export async function getFeaturedProperties(limit = 6): Promise<DirectoryProperty[]> {
  const response = await fetch(`${API_URL}/directory/featured?limit=${limit}`)

  if (!response.ok) {
    return []
  }

  return response.json()
}

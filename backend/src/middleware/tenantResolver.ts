import { Request, Response, NextFunction } from 'express'
import { supabase } from '../lib/supabase.js'

// ============================================
// TYPES
// ============================================

export interface TenantContext {
  id: string
  slug: string | null
  customDomain: string | null
  businessName: string | null
  domainVerificationStatus: string | null
}

// Extend Express Request to include tenant context
declare global {
  namespace Express {
    interface Request {
      tenantContext?: TenantContext | null
      resolvedFromHostname?: boolean
    }
  }
}

// ============================================
// CONFIGURATION
// ============================================

// Main domains that should NOT resolve to a tenant
const MAIN_DOMAINS = [
  'vilo.io',
  'www.vilo.io',
  'api.vilo.io',
  'app.vilo.io',
  'localhost'
]

// Subdomains that are reserved for system use
const RESERVED_SUBDOMAINS = [
  'www',
  'api',
  'app',
  'admin',
  'dashboard',
  'domains',
  'mail',
  'smtp',
  'ftp',
  'blog',
  'help',
  'support',
  'status',
  'docs',
  'cdn'
]

// ============================================
// TENANT LOOKUP FUNCTIONS
// ============================================

/**
 * Find tenant by subdomain slug
 */
async function findTenantBySlug(slug: string): Promise<TenantContext | null> {
  const { data, error } = await supabase
    .from('tenants')
    .select('id, slug, custom_domain, business_name, domain_verification_status')
    .eq('slug', slug)
    .single()

  if (error || !data) {
    return null
  }

  return {
    id: data.id,
    slug: data.slug,
    customDomain: data.custom_domain,
    businessName: data.business_name,
    domainVerificationStatus: data.domain_verification_status
  }
}

/**
 * Find tenant by custom domain (only if verified)
 */
async function findTenantByCustomDomain(domain: string): Promise<TenantContext | null> {
  const { data, error } = await supabase
    .from('tenants')
    .select('id, slug, custom_domain, business_name, domain_verification_status')
    .eq('custom_domain', domain)
    .eq('domain_verification_status', 'verified')
    .single()

  if (error || !data) {
    return null
  }

  return {
    id: data.id,
    slug: data.slug,
    customDomain: data.custom_domain,
    businessName: data.business_name,
    domainVerificationStatus: data.domain_verification_status
  }
}

/**
 * Find tenant by ID (fallback for path-based routing)
 */
export async function findTenantById(tenantId: string): Promise<TenantContext | null> {
  const { data, error } = await supabase
    .from('tenants')
    .select('id, slug, custom_domain, business_name, domain_verification_status')
    .eq('id', tenantId)
    .single()

  if (error || !data) {
    return null
  }

  return {
    id: data.id,
    slug: data.slug,
    customDomain: data.custom_domain,
    businessName: data.business_name,
    domainVerificationStatus: data.domain_verification_status
  }
}

// ============================================
// HOSTNAME PARSING
// ============================================

/**
 * Extract hostname from request
 * Handles X-Forwarded-Host for reverse proxies
 */
function getHostname(req: Request): string {
  // Check for forwarded host (from reverse proxy/load balancer)
  const forwardedHost = req.headers['x-forwarded-host'] as string
  if (forwardedHost) {
    // X-Forwarded-Host can contain multiple hosts, take the first
    return forwardedHost.split(',')[0].trim().toLowerCase()
  }

  // Use the Host header
  const host = req.headers.host || req.hostname
  // Remove port if present
  return host.split(':')[0].toLowerCase()
}

/**
 * Check if hostname is a vilo.io subdomain
 */
function isViloSubdomain(hostname: string): { isSubdomain: boolean; slug: string | null } {
  // Check for *.vilo.io pattern
  if (hostname.endsWith('.vilo.io')) {
    const slug = hostname.replace('.vilo.io', '')

    // Ignore reserved subdomains
    if (RESERVED_SUBDOMAINS.includes(slug)) {
      return { isSubdomain: false, slug: null }
    }

    return { isSubdomain: true, slug }
  }

  // Local development pattern: *.localhost or *.local
  if (hostname.endsWith('.localhost') || hostname.endsWith('.local')) {
    const parts = hostname.split('.')
    if (parts.length >= 2) {
      const slug = parts[0]
      if (!RESERVED_SUBDOMAINS.includes(slug)) {
        return { isSubdomain: true, slug }
      }
    }
  }

  return { isSubdomain: false, slug: null }
}

// ============================================
// MIDDLEWARE
// ============================================

/**
 * Middleware to resolve tenant from hostname
 *
 * Resolution order:
 * 1. Skip if main domain (vilo.io, www.vilo.io, etc.)
 * 2. Try subdomain (slug.vilo.io)
 * 3. Try custom domain (verified only)
 *
 * Sets req.tenantContext for downstream routes
 */
export async function resolveTenantFromHostname(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const hostname = getHostname(req)

  // Skip for main Vilo domains
  if (MAIN_DOMAINS.includes(hostname)) {
    req.tenantContext = null
    req.resolvedFromHostname = false
    return next()
  }

  try {
    // Check for subdomain pattern (slug.vilo.io)
    const { isSubdomain, slug } = isViloSubdomain(hostname)

    if (isSubdomain && slug) {
      const tenant = await findTenantBySlug(slug)

      if (tenant) {
        req.tenantContext = tenant
        req.resolvedFromHostname = true
        return next()
      }

      // Subdomain pattern but tenant not found
      // For API requests, return 404; for page requests, let it continue
      if (req.path.startsWith('/api/')) {
        return res.status(404).json({
          error: 'Property not found',
          message: `No property found with subdomain: ${slug}`
        })
      }
    }

    // Check for custom domain
    const tenant = await findTenantByCustomDomain(hostname)

    if (tenant) {
      req.tenantContext = tenant
      req.resolvedFromHostname = true
      return next()
    }

    // No tenant found for this hostname
    req.tenantContext = null
    req.resolvedFromHostname = false
    next()

  } catch (error) {
    console.error('Error resolving tenant from hostname:', error)
    req.tenantContext = null
    req.resolvedFromHostname = false
    next()
  }
}

/**
 * Middleware to require tenant context
 * Use after resolveTenantFromHostname for routes that need a tenant
 */
export function requireTenantContext(req: Request, res: Response, next: NextFunction) {
  if (!req.tenantContext) {
    return res.status(400).json({
      error: 'Tenant context required',
      message: 'This endpoint requires a valid property domain or tenant ID'
    })
  }
  next()
}

/**
 * Helper to get tenant ID from either hostname resolution or path parameter
 * Used in routes that support both routing methods
 */
export function getTenantId(req: Request): string | null {
  // Priority 1: Hostname-resolved tenant
  if (req.tenantContext?.id) {
    return req.tenantContext.id
  }

  // Priority 2: Path parameter
  if (req.params.tenantId) {
    return req.params.tenantId
  }

  // Priority 3: Header (for authenticated API calls)
  const headerTenantId = req.headers['x-tenant-id'] as string
  if (headerTenantId) {
    return headerTenantId
  }

  return null
}

/**
 * Get the tenant's public URL
 */
export function getTenantPublicUrl(tenant: TenantContext): string {
  // Prefer custom domain if verified
  if (tenant.customDomain && tenant.domainVerificationStatus === 'verified') {
    return `https://${tenant.customDomain}`
  }

  // Fall back to subdomain
  if (tenant.slug) {
    return `https://${tenant.slug}.vilo.io`
  }

  // Last resort: main site with tenant param
  return `https://vilo.io?property=${tenant.id}`
}

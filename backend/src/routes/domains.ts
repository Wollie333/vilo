import { Router, Request, Response } from 'express'
import { supabase } from '../lib/supabase.js'
import * as dns from 'dns'
import { promisify } from 'util'

const router = Router()

// Promisify DNS lookups
const resolveCname = promisify(dns.resolveCname)

// CNAME target for custom domains
const CNAME_TARGET = 'domains.vilo.io'

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get tenant from auth token
 */
async function getTenantFromAuth(req: Request): Promise<{ id: string; owner_user_id: string } | null> {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) return null

  const token = authHeader.split(' ')[1]

  try {
    const { data: { user }, error } = await supabase.auth.getUser(token)
    if (error || !user) return null

    // Check if user owns a tenant
    const { data: tenant } = await supabase
      .from('tenants')
      .select('id, owner_user_id')
      .eq('owner_user_id', user.id)
      .single()

    return tenant || null
  } catch (err) {
    console.error('Error in getTenantFromAuth:', err)
    return null
  }
}

/**
 * Validate slug format
 */
function isValidSlug(slug: string): boolean {
  // Lowercase alphanumeric with hyphens, 3-63 chars
  // Must start and end with alphanumeric
  return /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/.test(slug) && slug.length >= 3 && slug.length <= 63
}

/**
 * Validate domain format
 */
function isValidDomain(domain: string): boolean {
  // Basic domain format validation
  return /^[a-z0-9]([a-z0-9-]*\.)+[a-z]{2,}$/i.test(domain)
}

/**
 * Check if slug is reserved
 */
async function isSlugReserved(slug: string): Promise<boolean> {
  const { data } = await supabase
    .from('reserved_slugs')
    .select('slug')
    .eq('slug', slug)
    .single()

  return !!data
}

// ============================================
// ROUTES
// ============================================

/**
 * GET /domains/settings
 * Get domain settings for current tenant
 */
router.get('/settings', async (req: Request, res: Response) => {
  const tenant = await getTenantFromAuth(req)
  if (!tenant) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  try {
    const { data, error } = await supabase
      .from('tenants')
      .select(`
        slug,
        custom_domain,
        domain_verification_status,
        domain_verified_at,
        ssl_status,
        ssl_issued_at,
        ssl_expires_at,
        is_listed_in_directory,
        directory_description,
        directory_featured_image_url,
        directory_tags
      `)
      .eq('id', tenant.id)
      .single()

    if (error) {
      console.error('Error fetching domain settings:', error)
      return res.status(500).json({ error: 'Failed to fetch domain settings' })
    }

    res.json({
      slug: data.slug,
      subdomain: data.slug ? `${data.slug}.vilo.io` : null,
      subdomain_url: data.slug ? `https://${data.slug}.vilo.io` : null,
      custom_domain: data.custom_domain,
      custom_domain_url: data.custom_domain && data.domain_verification_status === 'verified'
        ? `https://${data.custom_domain}`
        : null,
      verification_status: data.domain_verification_status,
      verified_at: data.domain_verified_at,
      ssl_status: data.ssl_status,
      ssl_issued_at: data.ssl_issued_at,
      ssl_expires_at: data.ssl_expires_at,
      is_listed_in_directory: data.is_listed_in_directory,
      directory_description: data.directory_description,
      directory_featured_image_url: data.directory_featured_image_url,
      directory_tags: data.directory_tags || [],
      cname_target: CNAME_TARGET
    })
  } catch (error) {
    console.error('Error in GET /domains/settings:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * PUT /domains/slug
 * Update subdomain slug
 */
router.put('/slug', async (req: Request, res: Response) => {
  const tenant = await getTenantFromAuth(req)
  if (!tenant) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const { slug } = req.body

  if (!slug) {
    return res.status(400).json({ error: 'Slug is required' })
  }

  const normalizedSlug = slug.toLowerCase().trim()

  // Validate format
  if (!isValidSlug(normalizedSlug)) {
    return res.status(400).json({
      error: 'Invalid slug format',
      message: 'Use 3-63 lowercase letters, numbers, and hyphens. Must start and end with alphanumeric.'
    })
  }

  try {
    // Check if reserved
    const reserved = await isSlugReserved(normalizedSlug)
    if (reserved) {
      return res.status(400).json({
        error: 'Subdomain reserved',
        message: 'This subdomain is reserved and cannot be used'
      })
    }

    // Check if available
    const { data: existing } = await supabase
      .from('tenants')
      .select('id')
      .eq('slug', normalizedSlug)
      .neq('id', tenant.id)
      .single()

    if (existing) {
      return res.status(400).json({
        error: 'Subdomain taken',
        message: 'This subdomain is already in use by another property'
      })
    }

    // Update slug
    const { error } = await supabase
      .from('tenants')
      .update({ slug: normalizedSlug })
      .eq('id', tenant.id)

    if (error) {
      console.error('Error updating slug:', error)
      return res.status(500).json({ error: 'Failed to update subdomain' })
    }

    res.json({
      success: true,
      slug: normalizedSlug,
      subdomain: `${normalizedSlug}.vilo.io`,
      subdomain_url: `https://${normalizedSlug}.vilo.io`
    })
  } catch (error) {
    console.error('Error in PUT /domains/slug:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * GET /domains/slug/check
 * Check if a slug is available
 */
router.get('/slug/check', async (req: Request, res: Response) => {
  const tenant = await getTenantFromAuth(req)
  if (!tenant) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const slug = (req.query.slug as string)?.toLowerCase().trim()

  if (!slug) {
    return res.status(400).json({ error: 'Slug parameter required' })
  }

  if (!isValidSlug(slug)) {
    return res.json({ available: false, reason: 'Invalid format' })
  }

  try {
    // Check reserved
    const reserved = await isSlugReserved(slug)
    if (reserved) {
      return res.json({ available: false, reason: 'Reserved' })
    }

    // Check taken
    const { data: existing } = await supabase
      .from('tenants')
      .select('id')
      .eq('slug', slug)
      .neq('id', tenant.id)
      .single()

    if (existing) {
      return res.json({ available: false, reason: 'Already in use' })
    }

    res.json({ available: true })
  } catch (error) {
    console.error('Error checking slug:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * POST /domains/custom
 * Add a custom domain
 */
router.post('/custom', async (req: Request, res: Response) => {
  const tenant = await getTenantFromAuth(req)
  if (!tenant) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const { domain } = req.body

  if (!domain) {
    return res.status(400).json({ error: 'Domain is required' })
  }

  const normalizedDomain = domain.toLowerCase().trim()

  // Validate format
  if (!isValidDomain(normalizedDomain)) {
    return res.status(400).json({
      error: 'Invalid domain format',
      message: 'Please enter a valid domain name (e.g., book.yourdomain.com)'
    })
  }

  // Block vilo.io domains
  if (normalizedDomain.endsWith('.vilo.io') || normalizedDomain === 'vilo.io') {
    return res.status(400).json({
      error: 'Invalid domain',
      message: 'Cannot use vilo.io domains. Use the subdomain feature instead.'
    })
  }

  try {
    // Check if domain already in use
    const { data: existing } = await supabase
      .from('tenants')
      .select('id')
      .eq('custom_domain', normalizedDomain)
      .neq('id', tenant.id)
      .single()

    if (existing) {
      return res.status(400).json({
        error: 'Domain in use',
        message: 'This domain is already connected to another property'
      })
    }

    // Save domain with pending status
    const { error } = await supabase
      .from('tenants')
      .update({
        custom_domain: normalizedDomain,
        domain_verification_status: 'pending',
        domain_verified_at: null,
        ssl_status: 'pending'
      })
      .eq('id', tenant.id)

    if (error) {
      console.error('Error saving domain:', error)
      return res.status(500).json({ error: 'Failed to save domain' })
    }

    res.json({
      success: true,
      domain: normalizedDomain,
      verification_status: 'pending',
      instructions: {
        type: 'CNAME',
        name: normalizedDomain,
        target: CNAME_TARGET,
        ttl: 3600,
        message: `Add a CNAME record pointing ${normalizedDomain} to ${CNAME_TARGET}`
      }
    })
  } catch (error) {
    console.error('Error in POST /domains/custom:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * POST /domains/verify
 * Verify custom domain CNAME record
 */
router.post('/verify', async (req: Request, res: Response) => {
  const tenant = await getTenantFromAuth(req)
  if (!tenant) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  try {
    // Get tenant's custom domain
    const { data: tenantData, error: fetchError } = await supabase
      .from('tenants')
      .select('custom_domain')
      .eq('id', tenant.id)
      .single()

    if (fetchError || !tenantData?.custom_domain) {
      return res.status(400).json({
        error: 'No domain configured',
        message: 'Please add a custom domain first'
      })
    }

    const domain = tenantData.custom_domain

    // Update status to verifying
    await supabase
      .from('tenants')
      .update({ domain_verification_status: 'verifying' })
      .eq('id', tenant.id)

    try {
      // Check CNAME record
      const records = await resolveCname(domain)

      const isValid = records.some(r =>
        r.toLowerCase() === CNAME_TARGET ||
        r.toLowerCase().endsWith(`.${CNAME_TARGET}`)
      )

      // Log verification attempt
      await supabase.from('domain_verifications').insert({
        tenant_id: tenant.id,
        domain,
        verification_type: 'cname',
        expected_value: CNAME_TARGET,
        actual_value: records.join(', '),
        status: isValid ? 'success' : 'failed',
        checked_at: new Date().toISOString()
      })

      if (isValid) {
        // Update tenant with verified status
        await supabase
          .from('tenants')
          .update({
            domain_verification_status: 'verified',
            domain_verified_at: new Date().toISOString(),
            ssl_status: 'provisioning'
          })
          .eq('id', tenant.id)

        return res.json({
          success: true,
          verified: true,
          message: 'Domain verified successfully! SSL certificate is being provisioned.',
          domain,
          domain_url: `https://${domain}`
        })
      }

      // Verification failed
      await supabase
        .from('tenants')
        .update({ domain_verification_status: 'failed' })
        .eq('id', tenant.id)

      res.json({
        success: false,
        verified: false,
        message: 'CNAME record not found or incorrect',
        expected: CNAME_TARGET,
        found: records,
        hint: `Make sure your DNS has a CNAME record: ${domain} -> ${CNAME_TARGET}`
      })

    } catch (dnsError: any) {
      // DNS lookup failed
      await supabase
        .from('tenants')
        .update({ domain_verification_status: 'failed' })
        .eq('id', tenant.id)

      // Log the failed attempt
      await supabase.from('domain_verifications').insert({
        tenant_id: tenant.id,
        domain,
        verification_type: 'cname',
        expected_value: CNAME_TARGET,
        actual_value: null,
        status: 'failed',
        error_message: dnsError.code || dnsError.message,
        checked_at: new Date().toISOString()
      })

      let message = 'Failed to verify domain'
      if (dnsError.code === 'ENODATA' || dnsError.code === 'ENOTFOUND') {
        message = 'No CNAME record found for this domain. Please add the DNS record and try again.'
      } else if (dnsError.code === 'ETIMEOUT') {
        message = 'DNS lookup timed out. Please try again in a few minutes.'
      }

      res.json({
        success: false,
        verified: false,
        message,
        hint: `Add a CNAME record: ${domain} -> ${CNAME_TARGET}`,
        error_code: dnsError.code
      })
    }
  } catch (error) {
    console.error('Error in POST /domains/verify:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * DELETE /domains/custom
 * Remove custom domain
 */
router.delete('/custom', async (req: Request, res: Response) => {
  const tenant = await getTenantFromAuth(req)
  if (!tenant) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  try {
    const { error } = await supabase
      .from('tenants')
      .update({
        custom_domain: null,
        domain_verification_status: 'pending',
        domain_verified_at: null,
        ssl_status: 'pending',
        ssl_issued_at: null,
        ssl_expires_at: null
      })
      .eq('id', tenant.id)

    if (error) {
      console.error('Error removing domain:', error)
      return res.status(500).json({ error: 'Failed to remove domain' })
    }

    res.json({ success: true })
  } catch (error) {
    console.error('Error in DELETE /domains/custom:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * PUT /domains/directory
 * Update directory listing settings
 */
router.put('/directory', async (req: Request, res: Response) => {
  const tenant = await getTenantFromAuth(req)
  if (!tenant) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const {
    is_listed,
    description,
    featured_image_url,
    tags
  } = req.body

  try {
    const updates: Record<string, unknown> = {}

    if (typeof is_listed === 'boolean') {
      updates.is_listed_in_directory = is_listed
    }
    if (description !== undefined) {
      updates.directory_description = description || null
    }
    if (featured_image_url !== undefined) {
      updates.directory_featured_image_url = featured_image_url || null
    }
    if (tags !== undefined) {
      updates.directory_tags = tags || []
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' })
    }

    const { error } = await supabase
      .from('tenants')
      .update(updates)
      .eq('id', tenant.id)

    if (error) {
      console.error('Error updating directory settings:', error)
      return res.status(500).json({ error: 'Failed to update directory settings' })
    }

    res.json({ success: true })
  } catch (error) {
    console.error('Error in PUT /domains/directory:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * GET /domains/verification-history
 * Get domain verification history
 */
router.get('/verification-history', async (req: Request, res: Response) => {
  const tenant = await getTenantFromAuth(req)
  if (!tenant) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  try {
    const { data, error } = await supabase
      .from('domain_verifications')
      .select('*')
      .eq('tenant_id', tenant.id)
      .order('created_at', { ascending: false })
      .limit(10)

    if (error) {
      console.error('Error fetching verification history:', error)
      return res.status(500).json({ error: 'Failed to fetch history' })
    }

    res.json(data || [])
  } catch (error) {
    console.error('Error in GET /domains/verification-history:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * GET /domains/verify-allowed
 * Internal endpoint for Caddy/reverse proxy to check if domain is allowed
 * Used by on-demand TLS
 */
router.get('/verify-allowed', async (req: Request, res: Response) => {
  const domain = req.query.domain as string

  if (!domain) {
    return res.status(400).send('Domain required')
  }

  try {
    // Check if domain is a verified custom domain
    const { data } = await supabase
      .from('tenants')
      .select('id')
      .eq('custom_domain', domain.toLowerCase())
      .eq('domain_verification_status', 'verified')
      .single()

    if (data) {
      return res.status(200).send('OK')
    }

    res.status(404).send('Domain not found')
  } catch (error) {
    console.error('Error in verify-allowed:', error)
    res.status(500).send('Error')
  }
})

export default router

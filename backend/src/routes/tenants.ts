import { Router, Request, Response } from 'express'
import { supabase } from '../lib/supabase.js'

const router = Router()

// Get current user's tenant
// Requires: Authorization header with Supabase JWT
router.get('/me', async (req: Request, res: Response) => {
  const authHeader = req.headers.authorization

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid authorization header' })
  }

  const token = authHeader.split(' ')[1]

  try {
    // Verify the JWT and get user
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      return res.status(401).json({ error: 'Invalid token' })
    }

    // Get tenant for this user
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select('*')
      .eq('owner_user_id', user.id)
      .single()

    if (tenantError && tenantError.code !== 'PGRST116') {
      // PGRST116 = no rows found, which is okay
      console.error('Error fetching tenant:', tenantError)
      return res.status(500).json({ error: 'Failed to fetch tenant' })
    }

    // Return tenant (or null if not found)
    res.json({ tenant: tenant || null })
  } catch (error) {
    console.error('Error in /tenants/me:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Create a new tenant for the authenticated user
router.post('/', async (req: Request, res: Response) => {
  const authHeader = req.headers.authorization

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid authorization header' })
  }

  const token = authHeader.split(' ')[1]
  const { name } = req.body

  try {
    // Verify the JWT and get user
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      return res.status(401).json({ error: 'Invalid token' })
    }

    // Check if tenant already exists
    const { data: existingTenant } = await supabase
      .from('tenants')
      .select('id')
      .eq('owner_user_id', user.id)
      .single()

    if (existingTenant) {
      return res.status(400).json({ error: 'Tenant already exists for this user' })
    }

    // Create new tenant
    const { data: tenant, error: createError } = await supabase
      .from('tenants')
      .insert({
        owner_user_id: user.id,
        name: name || null,
        has_lifetime_access: false,
      })
      .select()
      .single()

    if (createError) {
      console.error('Error creating tenant:', createError)
      return res.status(500).json({ error: 'Failed to create tenant' })
    }

    res.status(201).json({ tenant })
  } catch (error) {
    console.error('Error in POST /tenants:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router

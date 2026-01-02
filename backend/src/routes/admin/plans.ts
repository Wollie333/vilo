import { Router, Response } from 'express'
import { supabase } from '../../lib/supabase.js'
import { SuperAdminRequest, requirePermission, logAdminAction, auditLog } from '../../middleware/superAdmin.js'

const router = Router()

/**
 * GET /api/admin/plans
 * List all subscription plans
 */
router.get('/', requirePermission('plans'), async (req: SuperAdminRequest, res: Response) => {
  try {
    const includeInactive = req.query.include_inactive === 'true'

    let query = supabase
      .from('subscription_plans')
      .select('*')
      .order('display_order', { ascending: true })

    if (!includeInactive) {
      query = query.eq('is_active', true)
    }

    const { data: plans, error } = await query

    if (error) {
      return res.status(500).json({ error: 'Failed to get plans' })
    }

    // Get subscriber counts for each plan
    const { data: subscriptions } = await supabase
      .from('tenant_subscriptions')
      .select('plan_id, status')
      .in('status', ['active', 'trial'])

    const subscriberCounts: Record<string, number> = {}
    subscriptions?.forEach(sub => {
      subscriberCounts[sub.plan_id] = (subscriberCounts[sub.plan_id] || 0) + 1
    })

    const plansWithCounts = plans?.map(plan => ({
      ...plan,
      subscriberCount: subscriberCounts[plan.id] || 0
    })) || []

    res.json(plansWithCounts)
  } catch (error) {
    console.error('Get plans error:', error)
    res.status(500).json({ error: 'Failed to get plans' })
  }
})

/**
 * GET /api/admin/plans/:id
 * Get plan details with subscriber list
 */
router.get('/:id', requirePermission('plans'), async (req: SuperAdminRequest, res: Response) => {
  try {
    const { id } = req.params

    const { data: plan, error } = await supabase
      .from('subscription_plans')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !plan) {
      return res.status(404).json({ error: 'Plan not found' })
    }

    // Get subscribers on this plan
    const { data: subscriptions } = await supabase
      .from('tenant_subscriptions')
      .select(`
        id,
        status,
        billing_cycle,
        current_period_end,
        tenants (id, business_name, business_email)
      `)
      .eq('plan_id', id)
      .in('status', ['active', 'trial'])
      .limit(100)

    const subscribers = subscriptions?.map((sub: any) => ({
      subscriptionId: sub.id,
      tenantId: sub.tenants?.id,
      tenantName: sub.tenants?.business_name,
      tenantEmail: sub.tenants?.business_email,
      status: sub.status,
      billingCycle: sub.billing_cycle,
      periodEnd: sub.current_period_end
    })) || []

    res.json({
      plan,
      subscribers,
      subscriberCount: subscribers.length
    })
  } catch (error) {
    console.error('Get plan error:', error)
    res.status(500).json({ error: 'Failed to get plan' })
  }
})

/**
 * POST /api/admin/plans
 * Create a new subscription plan
 */
router.post('/', requirePermission('plans'), auditLog('plan.create', 'plan'), async (req: SuperAdminRequest, res: Response) => {
  try {
    const {
      name,
      slug,
      description,
      price_monthly,
      price_yearly,
      currency,
      limits,
      features,
      is_public,
      display_order,
      trial_days
    } = req.body

    if (!name || !slug) {
      return res.status(400).json({ error: 'Name and slug are required' })
    }

    // Check if slug is unique
    const { data: existing } = await supabase
      .from('subscription_plans')
      .select('id')
      .eq('slug', slug)
      .single()

    if (existing) {
      return res.status(400).json({ error: 'Plan slug already exists' })
    }

    const { data: plan, error } = await supabase
      .from('subscription_plans')
      .insert({
        name,
        slug,
        description,
        price_monthly: price_monthly || 0,
        price_yearly: price_yearly || 0,
        currency: currency || 'ZAR',
        limits: limits || {},
        features: features || [],
        is_active: true,
        is_public: is_public !== false,
        display_order: display_order || 0,
        trial_days: trial_days || 14
      })
      .select()
      .single()

    if (error) {
      console.error('Create plan error:', error)
      return res.status(500).json({ error: 'Failed to create plan' })
    }

    // Log the action
    if (req.superAdmin) {
      await logAdminAction({
        adminId: req.superAdmin.id,
        adminEmail: req.superAdmin.email,
        action: 'plan.create',
        resourceType: 'plan',
        resourceId: plan.id,
        description: `Created plan: ${name}`,
        metadata: { name, slug, price_monthly, price_yearly },
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      })
    }

    res.status(201).json(plan)
  } catch (error) {
    console.error('Create plan error:', error)
    res.status(500).json({ error: 'Failed to create plan' })
  }
})

/**
 * PUT /api/admin/plans/:id
 * Update a subscription plan
 */
router.put('/:id', requirePermission('plans'), auditLog('plan.update', 'plan'), async (req: SuperAdminRequest, res: Response) => {
  try {
    const { id } = req.params
    const updates = req.body

    // Get current plan for comparison
    const { data: oldPlan } = await supabase
      .from('subscription_plans')
      .select('*')
      .eq('id', id)
      .single()

    if (!oldPlan) {
      return res.status(404).json({ error: 'Plan not found' })
    }

    // Prepare updates
    const allowedFields = [
      'name', 'description', 'price_monthly', 'price_yearly', 'currency',
      'limits', 'features', 'is_active', 'is_public', 'display_order', 'trial_days'
    ]

    const updateData: Record<string, any> = { updated_at: new Date().toISOString() }
    const changes: Record<string, { old: any; new: any }> = {}

    allowedFields.forEach(field => {
      if (updates[field] !== undefined && updates[field] !== oldPlan[field]) {
        updateData[field] = updates[field]
        changes[field] = { old: oldPlan[field], new: updates[field] }
      }
    })

    const { data: plan, error } = await supabase
      .from('subscription_plans')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Update plan error:', error)
      return res.status(500).json({ error: 'Failed to update plan' })
    }

    // Log the action with changes
    if (req.superAdmin && Object.keys(changes).length > 0) {
      await logAdminAction({
        adminId: req.superAdmin.id,
        adminEmail: req.superAdmin.email,
        action: 'plan.update',
        resourceType: 'plan',
        resourceId: id,
        description: `Updated plan: ${plan.name}`,
        changes,
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      })
    }

    res.json(plan)
  } catch (error) {
    console.error('Update plan error:', error)
    res.status(500).json({ error: 'Failed to update plan' })
  }
})

/**
 * DELETE /api/admin/plans/:id
 * Deactivate a subscription plan (soft delete)
 */
router.delete('/:id', requirePermission('plans'), auditLog('plan.delete', 'plan'), async (req: SuperAdminRequest, res: Response) => {
  try {
    const { id } = req.params

    // Check if plan has active subscribers
    const { count } = await supabase
      .from('tenant_subscriptions')
      .select('*', { count: 'exact', head: true })
      .eq('plan_id', id)
      .in('status', ['active', 'trial'])

    if (count && count > 0) {
      return res.status(400).json({
        error: 'Cannot delete plan with active subscribers',
        subscriberCount: count
      })
    }

    // Soft delete - just mark as inactive
    const { error } = await supabase
      .from('subscription_plans')
      .update({
        is_active: false,
        is_public: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)

    if (error) {
      return res.status(500).json({ error: 'Failed to delete plan' })
    }

    // Log the action
    if (req.superAdmin) {
      await logAdminAction({
        adminId: req.superAdmin.id,
        adminEmail: req.superAdmin.email,
        action: 'plan.delete',
        resourceType: 'plan',
        resourceId: id,
        description: 'Deactivated plan',
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      })
    }

    res.json({ success: true, message: 'Plan deactivated successfully' })
  } catch (error) {
    console.error('Delete plan error:', error)
    res.status(500).json({ error: 'Failed to delete plan' })
  }
})

/**
 * GET /api/admin/plans/:id/subscribers
 * Get all subscribers on a plan
 */
router.get('/:id/subscribers', requirePermission('plans'), async (req: SuperAdminRequest, res: Response) => {
  try {
    const { id } = req.params
    const page = parseInt(req.query.page as string) || 1
    const limit = parseInt(req.query.limit as string) || 20
    const offset = (page - 1) * limit

    const { data: subscriptions, count, error } = await supabase
      .from('tenant_subscriptions')
      .select(`
        *,
        tenants (id, business_name, business_email, created_at)
      `, { count: 'exact' })
      .eq('plan_id', id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      return res.status(500).json({ error: 'Failed to get subscribers' })
    }

    const subscribers = subscriptions?.map((sub: any) => ({
      subscriptionId: sub.id,
      tenantId: sub.tenants?.id,
      tenantName: sub.tenants?.business_name,
      tenantEmail: sub.tenants?.business_email,
      status: sub.status,
      billingCycle: sub.billing_cycle,
      periodStart: sub.current_period_start,
      periodEnd: sub.current_period_end,
      trialEnd: sub.trial_end,
      createdAt: sub.created_at
    })) || []

    res.json({
      subscribers,
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit)
    })
  } catch (error) {
    console.error('Get subscribers error:', error)
    res.status(500).json({ error: 'Failed to get subscribers' })
  }
})

export default router

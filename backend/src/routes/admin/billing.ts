import { Router, Response } from 'express'
import { supabase } from '../../lib/supabase.js'
import { SuperAdminRequest } from '../../middleware/superAdmin.js'

const router = Router()

/**
 * GET /api/admin/billing/stats
 * Get billing/revenue statistics
 */
router.get('/stats', async (req: SuperAdminRequest, res: Response) => {
  try {
    // Get subscription data with plan prices
    const { data: subscriptions, error } = await supabase
      .from('tenant_subscriptions')
      .select(`
        id,
        status,
        subscription_plans (
          id,
          name,
          price,
          interval
        )
      `)

    if (error) throw error

    let mrr = 0
    const revenueByPlan: Record<string, number> = {}

    subscriptions?.forEach((sub: any) => {
      if (sub.status === 'active' && sub.subscription_plans) {
        const plan = sub.subscription_plans
        const planName = plan.name || 'Unknown'

        let monthlyValue = 0
        if (plan.interval === 'monthly') {
          monthlyValue = plan.price || 0
        } else if (plan.interval === 'yearly') {
          monthlyValue = (plan.price || 0) / 12
        }

        mrr += monthlyValue
        revenueByPlan[planName] = (revenueByPlan[planName] || 0) + monthlyValue
      }
    })

    const arr = mrr * 12
    const totalRevenue = arr // Simplified - would normally sum all historical payments

    // Calculate MRR growth (simplified - would compare to previous month)
    const mrrGrowth = 0 // Placeholder

    res.json({
      mrr,
      arr,
      mrrGrowth,
      totalRevenue,
      revenueByPlan: Object.entries(revenueByPlan).map(([plan, revenue]) => ({
        plan,
        revenue,
      })),
    })
  } catch (error) {
    console.error('Billing stats error:', error)
    res.status(500).json({ error: 'Failed to fetch billing stats' })
  }
})

/**
 * GET /api/admin/billing/subscriptions
 * Get all subscriptions with pagination and filtering
 */
router.get('/subscriptions', async (req: SuperAdminRequest, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1
    const limit = parseInt(req.query.limit as string) || 20
    const status = req.query.status as string
    const planId = req.query.planId as string
    const offset = (page - 1) * limit

    let query = supabase
      .from('tenant_subscriptions')
      .select(`
        id,
        tenant_id,
        plan_id,
        status,
        auto_renew,
        current_period_start,
        current_period_end,
        cancel_at_period_end,
        created_at,
        tenants (
          id,
          name
        ),
        subscription_plans (
          id,
          name
        )
      `, { count: 'exact' })

    if (status) {
      query = query.eq('status', status)
    }

    if (planId) {
      query = query.eq('plan_id', planId)
    }

    const { data, count, error } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) throw error

    const subscriptions = (data || []).map((sub: any) => ({
      id: sub.id,
      tenantId: sub.tenant_id,
      tenantName: sub.tenants?.name || 'Unknown',
      planId: sub.plan_id,
      planName: sub.subscription_plans?.name || 'Unknown',
      status: sub.status,
      autoRenew: sub.auto_renew,
      currentPeriodStart: sub.current_period_start,
      currentPeriodEnd: sub.current_period_end,
      cancelAtPeriodEnd: sub.cancel_at_period_end,
      createdAt: sub.created_at,
    }))

    res.json({
      subscriptions,
      total: count || 0,
    })
  } catch (error) {
    console.error('List subscriptions error:', error)
    res.status(500).json({ error: 'Failed to fetch subscriptions' })
  }
})

/**
 * GET /api/admin/billing/plans
 * Get all subscription plans
 */
router.get('/plans', async (req: SuperAdminRequest, res: Response) => {
  try {
    const { data: plans, error } = await supabase
      .from('subscription_plans')
      .select('*')
      .order('display_order', { ascending: true })

    if (error) throw error

    const formattedPlans = (plans || []).map(plan => ({
      id: plan.id,
      name: plan.name,
      slug: plan.slug,
      description: plan.description,
      price: plan.price,
      interval: plan.interval,
      trialDays: plan.trial_days || 0,
      features: plan.features || [],
      limits: plan.limits || {},
      isActive: plan.is_active,
      displayOrder: plan.display_order,
    }))

    res.json(formattedPlans)
  } catch (error) {
    console.error('List plans error:', error)
    res.status(500).json({ error: 'Failed to fetch plans' })
  }
})

export default router

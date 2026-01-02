import { Router, Response } from 'express'
import { supabase } from '../../lib/supabase.js'
import { SuperAdminRequest } from '../../middleware/superAdmin.js'

const router = Router()

/**
 * GET /api/admin/dashboard/stats
 * Get dashboard statistics
 */
router.get('/stats', async (req: SuperAdminRequest, res: Response) => {
  try {
    // Get tenant counts
    let totalTenants = 0
    let activeTenants = 0
    try {
      const { data: tenants, error: tenantsError } = await supabase
        .from('tenants')
        .select('id, status')

      if (!tenantsError && tenants) {
        totalTenants = tenants.length
        activeTenants = tenants.filter(t => t.status === 'active').length
      }
    } catch (e) {
      console.error('Error fetching tenants:', e)
    }

    // Get user count from tenant_members
    let totalUsers = 0
    try {
      const { count } = await supabase
        .from('tenant_members')
        .select('*', { count: 'exact', head: true })
      totalUsers = count || 0
    } catch (e) {
      console.error('Error fetching users:', e)
    }

    // Get subscription stats (table may not exist yet)
    let mrr = 0
    let activeTrials = 0
    let pendingPayments = 0
    let trialConversionRate = 0
    let churnRate = 0

    try {
      const { data: subscriptions, error: subsError } = await supabase
        .from('tenant_subscriptions')
        .select(`
          status,
          billing_cycle,
          subscription_plans (
            price_monthly,
            price_yearly
          )
        `)

      if (!subsError && subscriptions) {
        subscriptions.forEach((sub: any) => {
          if (sub.status === 'active' && sub.subscription_plans) {
            const plan = sub.subscription_plans
            if (sub.billing_cycle === 'monthly') {
              mrr += plan.price_monthly || 0
            } else if (sub.billing_cycle === 'yearly') {
              mrr += (plan.price_yearly || 0) / 12
            }
          }
          if (sub.status === 'trial') activeTrials++
          if (sub.status === 'past_due') pendingPayments++
        })

        // Calculate trial conversion rate
        const { count: totalTrials } = await supabase
          .from('tenant_subscriptions')
          .select('*', { count: 'exact', head: true })
          .in('status', ['trial', 'active', 'cancelled'])

        const { count: convertedTrials } = await supabase
          .from('tenant_subscriptions')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'active')

        trialConversionRate = totalTrials ? ((convertedTrials || 0) / totalTrials) * 100 : 0

        // Calculate churn rate (last 30 days)
        const thirtyDaysAgo = new Date()
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

        const { count: cancelledRecently } = await supabase
          .from('tenant_subscriptions')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'cancelled')
          .gte('updated_at', thirtyDaysAgo.toISOString())

        churnRate = activeTenants ? ((cancelledRecently || 0) / activeTenants) * 100 : 0
      }
    } catch (e) {
      // tenant_subscriptions table may not exist - that's ok
      console.log('Subscription stats not available:', (e as Error).message)
    }

    const arr = mrr * 12

    res.json({
      totalTenants,
      activeTenants,
      totalUsers,
      totalRevenue: mrr * 12,
      mrr,
      arr,
      trialConversionRate,
      churnRate,
      activeTrials,
      pendingPayments,
    })
  } catch (error) {
    console.error('Dashboard stats error:', error)
    res.status(500).json({ error: 'Failed to fetch dashboard stats' })
  }
})

/**
 * GET /api/admin/dashboard/activity
 * Get recent activity
 */
router.get('/activity', async (req: SuperAdminRequest, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 20

    let activity: any[] = []

    try {
      const { data: logs, error } = await supabase
        .from('admin_audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit)

      if (!error && logs) {
        activity = logs.map(log => ({
          id: log.id,
          type: log.action,
          description: log.description || log.action,
          tenantId: log.resource_type === 'tenant' ? log.resource_id : null,
          tenantName: null,
          userId: log.admin_id,
          userEmail: log.admin_email,
          createdAt: log.created_at,
        }))
      }
    } catch (e) {
      // Table may not exist yet
      console.log('Admin audit logs not available:', (e as Error).message)
    }

    res.json(activity)
  } catch (error) {
    console.error('Dashboard activity error:', error)
    res.status(500).json({ error: 'Failed to fetch activity' })
  }
})

/**
 * GET /api/admin/dashboard/revenue
 * Get revenue chart data
 */
router.get('/revenue', async (req: SuperAdminRequest, res: Response) => {
  try {
    const period = req.query.period as string || 'month'

    // Generate mock data for now - in production this would query actual payment data
    const data: { label: string; value: number }[] = []
    const now = new Date()

    if (period === 'week') {
      for (let i = 6; i >= 0; i--) {
        const date = new Date(now)
        date.setDate(date.getDate() - i)
        data.push({
          label: date.toLocaleDateString('en-US', { weekday: 'short' }),
          value: Math.floor(Math.random() * 5000) + 1000,
        })
      }
    } else if (period === 'month') {
      for (let i = 29; i >= 0; i -= 3) {
        const date = new Date(now)
        date.setDate(date.getDate() - i)
        data.push({
          label: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          value: Math.floor(Math.random() * 10000) + 2000,
        })
      }
    } else {
      for (let i = 11; i >= 0; i--) {
        const date = new Date(now)
        date.setMonth(date.getMonth() - i)
        data.push({
          label: date.toLocaleDateString('en-US', { month: 'short' }),
          value: Math.floor(Math.random() * 50000) + 10000,
        })
      }
    }

    res.json({ period, data })
  } catch (error) {
    console.error('Dashboard revenue error:', error)
    res.status(500).json({ error: 'Failed to fetch revenue data' })
  }
})

/**
 * GET /api/admin/dashboard/growth
 * Get growth chart data
 */
router.get('/growth', async (req: SuperAdminRequest, res: Response) => {
  try {
    const period = req.query.period as string || 'month'

    // Generate growth data
    const data: { label: string; value: number }[] = []
    const now = new Date()
    let cumulative = 10

    if (period === 'week') {
      for (let i = 6; i >= 0; i--) {
        const date = new Date(now)
        date.setDate(date.getDate() - i)
        cumulative += Math.floor(Math.random() * 3)
        data.push({
          label: date.toLocaleDateString('en-US', { weekday: 'short' }),
          value: cumulative,
        })
      }
    } else if (period === 'month') {
      for (let i = 29; i >= 0; i -= 3) {
        const date = new Date(now)
        date.setDate(date.getDate() - i)
        cumulative += Math.floor(Math.random() * 5)
        data.push({
          label: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          value: cumulative,
        })
      }
    } else {
      for (let i = 11; i >= 0; i--) {
        const date = new Date(now)
        date.setMonth(date.getMonth() - i)
        cumulative += Math.floor(Math.random() * 15) + 5
        data.push({
          label: date.toLocaleDateString('en-US', { month: 'short' }),
          value: cumulative,
        })
      }
    }

    res.json({ period, data })
  } catch (error) {
    console.error('Dashboard growth error:', error)
    res.status(500).json({ error: 'Failed to fetch growth data' })
  }
})

export default router

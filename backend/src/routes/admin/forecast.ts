import { Router, Response } from 'express'
import { supabase } from '../../lib/supabase.js'
import { SuperAdminRequest, requirePermission } from '../../middleware/superAdmin.js'

const router = Router()

/**
 * GET /api/admin/forecast
 * Get revenue and growth forecasts
 */
router.get('/', requirePermission('analytics'), async (req: SuperAdminRequest, res: Response) => {
  try {
    const months = parseInt(req.query.months as string) || 6

    // Get historical data for forecasting
    const historicalMonths = 6
    const startDate = new Date()
    startDate.setMonth(startDate.getMonth() - historicalMonths)

    // Get historical metrics
    const { data: metrics } = await supabase
      .from('platform_metrics_daily')
      .select('metric_date, total_tenants, new_tenants, total_revenue, total_bookings')
      .gte('metric_date', startDate.toISOString().split('T')[0])
      .order('metric_date', { ascending: true })

    // Aggregate by month
    const monthlyData: Record<string, {
      tenants: number
      newTenants: number
      revenue: number
      bookings: number
    }> = {}

    metrics?.forEach(m => {
      const month = m.metric_date.substring(0, 7)
      if (!monthlyData[month]) {
        monthlyData[month] = { tenants: 0, newTenants: 0, revenue: 0, bookings: 0 }
      }
      monthlyData[month].tenants = Math.max(monthlyData[month].tenants, m.total_tenants)
      monthlyData[month].newTenants += m.new_tenants
      monthlyData[month].revenue += Number(m.total_revenue) || 0
      monthlyData[month].bookings += m.total_bookings
    })

    const history = Object.entries(monthlyData).map(([month, data]) => ({
      month,
      ...data
    }))

    // Calculate growth rates
    let tenantGrowthRate = 0.05 // Default 5% monthly growth
    let revenueGrowthRate = 0.07 // Default 7% monthly growth

    if (history.length >= 2) {
      const recentMonths = history.slice(-3)
      if (recentMonths.length >= 2) {
        const first = recentMonths[0]
        const last = recentMonths[recentMonths.length - 1]
        if (first.tenants > 0) {
          tenantGrowthRate = (last.tenants - first.tenants) / first.tenants / recentMonths.length
        }
        if (first.revenue > 0) {
          revenueGrowthRate = (last.revenue - first.revenue) / first.revenue / recentMonths.length
        }
      }
    }

    // Get current state
    const { count: currentTenants } = await supabase
      .from('tenants')
      .select('*', { count: 'exact', head: true })

    const lastMonthRevenue = history.length > 0 ? history[history.length - 1].revenue : 0

    // Generate forecasts
    const forecasts = []
    let projectedTenants = currentTenants || 0
    let projectedRevenue = lastMonthRevenue

    for (let i = 1; i <= months; i++) {
      const forecastDate = new Date()
      forecastDate.setMonth(forecastDate.getMonth() + i)
      const month = forecastDate.toISOString().substring(0, 7)

      projectedTenants = Math.round(projectedTenants * (1 + Math.max(0, tenantGrowthRate)))
      projectedRevenue = projectedRevenue * (1 + Math.max(0, revenueGrowthRate))

      forecasts.push({
        month,
        projectedTenants,
        projectedRevenue: Math.round(projectedRevenue * 100) / 100,
        confidence: Math.max(0.5, 0.95 - (i * 0.08)) // Confidence decreases over time
      })
    }

    res.json({
      history,
      forecasts,
      growthRates: {
        tenants: (tenantGrowthRate * 100).toFixed(1) + '%',
        revenue: (revenueGrowthRate * 100).toFixed(1) + '%'
      },
      currentState: {
        tenants: currentTenants || 0,
        monthlyRevenue: lastMonthRevenue
      }
    })
  } catch (error) {
    console.error('Get forecast error:', error)
    res.status(500).json({ error: 'Failed to get forecast' })
  }
})

/**
 * GET /api/admin/forecast/mrr
 * Get MRR (Monthly Recurring Revenue) forecast
 */
router.get('/mrr', requirePermission('analytics'), async (req: SuperAdminRequest, res: Response) => {
  try {
    // Get active subscriptions with plans
    const { data: subscriptions } = await supabase
      .from('tenant_subscriptions')
      .select(`
        billing_cycle,
        current_period_end,
        subscription_plans (
          price_monthly,
          price_yearly
        )
      `)
      .in('status', ['active', 'trial'])

    // Calculate current MRR
    let currentMRR = 0
    const subscriptionBreakdown: Record<string, { count: number; mrr: number }> = {}

    subscriptions?.forEach(sub => {
      const plan = sub.subscription_plans as any
      if (!plan) return

      let monthlyValue = 0
      if (sub.billing_cycle === 'monthly') {
        monthlyValue = Number(plan.price_monthly) || 0
      } else if (sub.billing_cycle === 'yearly') {
        monthlyValue = (Number(plan.price_yearly) || 0) / 12
      }

      currentMRR += monthlyValue
    })

    // Get plan distribution for MRR
    const { data: planCounts } = await supabase
      .from('tenant_subscriptions')
      .select(`
        subscription_plans (
          name,
          slug,
          price_monthly
        )
      `)
      .in('status', ['active', 'trial'])

    planCounts?.forEach(sub => {
      const plan = sub.subscription_plans as any
      if (!plan) return
      const slug = plan.slug || 'unknown'
      if (!subscriptionBreakdown[slug]) {
        subscriptionBreakdown[slug] = { count: 0, mrr: 0 }
      }
      subscriptionBreakdown[slug].count++
      subscriptionBreakdown[slug].mrr += Number(plan.price_monthly) || 0
    })

    // Calculate ARR
    const currentARR = currentMRR * 12

    // Calculate churn (subscriptions ending soon without renewal)
    const thirtyDaysFromNow = new Date()
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30)

    const { count: atRiskSubscriptions } = await supabase
      .from('tenant_subscriptions')
      .select('*', { count: 'exact', head: true })
      .lt('current_period_end', thirtyDaysFromNow.toISOString())
      .eq('cancel_at_period_end', true)

    // Project MRR for next 6 months
    const projections = []
    let projectedMRR = currentMRR
    const estimatedGrowthRate = 0.05 // 5% monthly growth
    const estimatedChurnRate = 0.03 // 3% monthly churn

    for (let i = 1; i <= 6; i++) {
      const date = new Date()
      date.setMonth(date.getMonth() + i)

      projectedMRR = projectedMRR * (1 + estimatedGrowthRate - estimatedChurnRate)

      projections.push({
        month: date.toISOString().substring(0, 7),
        mrr: Math.round(projectedMRR * 100) / 100,
        arr: Math.round(projectedMRR * 12 * 100) / 100
      })
    }

    res.json({
      current: {
        mrr: Math.round(currentMRR * 100) / 100,
        arr: Math.round(currentARR * 100) / 100,
        atRiskSubscriptions: atRiskSubscriptions || 0
      },
      breakdown: Object.entries(subscriptionBreakdown).map(([plan, data]) => ({
        plan,
        count: data.count,
        mrr: Math.round(data.mrr * 100) / 100
      })),
      projections,
      assumptions: {
        growthRate: '5%',
        churnRate: '3%'
      }
    })
  } catch (error) {
    console.error('Get MRR forecast error:', error)
    res.status(500).json({ error: 'Failed to get MRR forecast' })
  }
})

/**
 * GET /api/admin/forecast/churn
 * Get churn analysis and predictions
 */
router.get('/churn', requirePermission('analytics'), async (req: SuperAdminRequest, res: Response) => {
  try {
    const days = parseInt(req.query.days as string) || 90

    // Get cancelled subscriptions in period
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    const { data: cancelled, count: cancelledCount } = await supabase
      .from('tenant_subscriptions')
      .select('cancelled_at, cancellation_reason, subscription_plans(name, slug)', { count: 'exact' })
      .eq('status', 'cancelled')
      .gte('cancelled_at', startDate.toISOString())

    // Get total active at start of period
    const { count: totalActive } = await supabase
      .from('tenant_subscriptions')
      .select('*', { count: 'exact', head: true })
      .in('status', ['active', 'trial'])

    // Calculate churn rate
    const churnRate = totalActive ? ((cancelledCount || 0) / totalActive) * 100 : 0

    // Analyze cancellation reasons
    const reasons: Record<string, number> = {}
    cancelled?.forEach(sub => {
      const reason = sub.cancellation_reason || 'Not specified'
      reasons[reason] = (reasons[reason] || 0) + 1
    })

    // Churn by plan
    const byPlan: Record<string, number> = {}
    cancelled?.forEach(sub => {
      const plan = (sub.subscription_plans as any)?.slug || 'unknown'
      byPlan[plan] = (byPlan[plan] || 0) + 1
    })

    // Identify at-risk tenants (no login in 14 days, but has active subscription)
    // This is a simplified version - in reality you'd track login activity
    const { data: subscriptions } = await supabase
      .from('tenant_subscriptions')
      .select(`
        tenant_id,
        current_period_end,
        tenants (
          business_name,
          updated_at
        )
      `)
      .in('status', ['active', 'trial'])

    const fourteenDaysAgo = new Date()
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14)

    const atRiskTenants = subscriptions?.filter(sub => {
      const tenant = sub.tenants as any
      if (!tenant?.updated_at) return false
      return new Date(tenant.updated_at) < fourteenDaysAgo
    }).map(sub => ({
      tenantId: sub.tenant_id,
      name: (sub.tenants as any)?.business_name,
      lastActive: (sub.tenants as any)?.updated_at,
      periodEnd: sub.current_period_end
    })) || []

    res.json({
      period: `${days} days`,
      churnRate: churnRate.toFixed(2) + '%',
      cancelled: cancelledCount || 0,
      totalActive: totalActive || 0,
      reasons: Object.entries(reasons).map(([reason, count]) => ({ reason, count })),
      byPlan: Object.entries(byPlan).map(([plan, count]) => ({ plan, count })),
      atRiskTenants: atRiskTenants.slice(0, 10),
      atRiskCount: atRiskTenants.length
    })
  } catch (error) {
    console.error('Get churn analysis error:', error)
    res.status(500).json({ error: 'Failed to get churn analysis' })
  }
})

/**
 * GET /api/admin/forecast/growth
 * Get growth projections
 */
router.get('/growth', requirePermission('analytics'), async (req: SuperAdminRequest, res: Response) => {
  try {
    // Get signups over last 6 months
    const sixMonthsAgo = new Date()
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)

    const { data: metrics } = await supabase
      .from('platform_metrics_daily')
      .select('metric_date, new_tenants, active_tenants, total_tenants')
      .gte('metric_date', sixMonthsAgo.toISOString().split('T')[0])
      .order('metric_date', { ascending: true })

    // Aggregate by month
    const monthlySignups: Record<string, number> = {}
    const monthlyActive: Record<string, number> = {}

    metrics?.forEach(m => {
      const month = m.metric_date.substring(0, 7)
      monthlySignups[month] = (monthlySignups[month] || 0) + m.new_tenants
      monthlyActive[month] = Math.max(monthlyActive[month] || 0, m.active_tenants)
    })

    const history = Object.keys(monthlySignups).sort().map(month => ({
      month,
      signups: monthlySignups[month],
      activeUsers: monthlyActive[month] || 0
    }))

    // Calculate compound monthly growth rate
    let cmgr = 0.05 // Default
    if (history.length >= 2) {
      const first = history[0]
      const last = history[history.length - 1]
      const months = history.length - 1
      if (first.signups > 0 && months > 0) {
        cmgr = Math.pow(last.signups / first.signups, 1 / months) - 1
      }
    }

    // Project next 12 months
    const projections = []
    let lastSignups = history.length > 0 ? history[history.length - 1].signups : 10

    for (let i = 1; i <= 12; i++) {
      const date = new Date()
      date.setMonth(date.getMonth() + i)

      lastSignups = Math.round(lastSignups * (1 + cmgr))

      projections.push({
        month: date.toISOString().substring(0, 7),
        projectedSignups: lastSignups,
        confidence: Math.max(0.4, 0.9 - (i * 0.04))
      })
    }

    res.json({
      history,
      projections,
      growthRate: (cmgr * 100).toFixed(1) + '%',
      insights: [
        cmgr > 0.1 ? 'Strong growth trend detected' : cmgr > 0 ? 'Moderate growth' : 'Growth has stalled',
        history.length < 3 ? 'Need more data for accurate projections' : null
      ].filter(Boolean)
    })
  } catch (error) {
    console.error('Get growth projections error:', error)
    res.status(500).json({ error: 'Failed to get growth projections' })
  }
})

export default router

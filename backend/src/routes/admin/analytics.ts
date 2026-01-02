import { Router, Response } from 'express'
import { supabase } from '../../lib/supabase.js'
import { SuperAdminRequest, requirePermission } from '../../middleware/superAdmin.js'
import platformAnalytics from '../../services/platformAnalyticsService.js'
import growthAnalytics from '../../services/growthAnalyticsService.js'
import { generateAdminAnalyticsReport } from '../../services/analyticsAdminReportGenerator.js'

const router = Router()

// ============== NEW COMPREHENSIVE ANALYTICS ENDPOINTS ==============

/**
 * GET /api/admin/analytics/overview
 * Get comprehensive overview metrics for the platform
 */
router.get('/overview', requirePermission('analytics'), async (req: SuperAdminRequest, res: Response) => {
  try {
    const metrics = await platformAnalytics.getOverviewMetrics()
    res.json(metrics)
  } catch (error) {
    console.error('Overview analytics error:', error)
    res.status(500).json({ error: 'Failed to load overview analytics' })
  }
})

/**
 * GET /api/admin/analytics/revenue-metrics
 * Get detailed revenue analytics (MRR, ARR, ARPU, NRR, etc.)
 */
router.get('/revenue-metrics', requirePermission('analytics'), async (req: SuperAdminRequest, res: Response) => {
  try {
    const range = (req.query.range as string) || '30d'
    const daysMap: Record<string, number> = { '7d': 7, '30d': 30, '90d': 90, '1y': 365 }
    const days = daysMap[range] || 30

    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    const metrics = await platformAnalytics.getRevenueMetrics({ startDate, endDate })
    res.json(metrics)
  } catch (error) {
    console.error('Revenue metrics error:', error)
    res.status(500).json({ error: 'Failed to load revenue metrics' })
  }
})

/**
 * GET /api/admin/analytics/customer-metrics
 * Get customer analytics (churn, retention, cohorts, LTV)
 */
router.get('/customer-metrics', requirePermission('analytics'), async (req: SuperAdminRequest, res: Response) => {
  try {
    const range = (req.query.range as string) || '30d'
    const daysMap: Record<string, number> = { '7d': 7, '30d': 30, '90d': 90, '1y': 365 }
    const days = daysMap[range] || 30

    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    const metrics = await platformAnalytics.getCustomerMetrics({ startDate, endDate })
    res.json(metrics)
  } catch (error) {
    console.error('Customer metrics error:', error)
    res.status(500).json({ error: 'Failed to load customer metrics' })
  }
})

/**
 * GET /api/admin/analytics/growth-metrics
 * Get growth analytics (signups, conversions, activation)
 */
router.get('/growth-metrics', requirePermission('analytics'), async (req: SuperAdminRequest, res: Response) => {
  try {
    const range = (req.query.range as string) || '30d'
    const daysMap: Record<string, number> = { '7d': 7, '30d': 30, '90d': 90, '1y': 365 }
    const days = daysMap[range] || 30

    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    const metrics = await platformAnalytics.getGrowthMetrics({ startDate, endDate })
    res.json(metrics)
  } catch (error) {
    console.error('Growth metrics error:', error)
    res.status(500).json({ error: 'Failed to load growth metrics' })
  }
})

/**
 * GET /api/admin/analytics/growth-comprehensive
 * Get comprehensive growth analytics for marketing decisions
 * Includes: tenant growth, activation funnel, inventory, team, customers,
 *           engagement, GMV, marketing attribution, and churn analysis
 */
router.get('/growth-comprehensive', requirePermission('analytics'), async (req: SuperAdminRequest, res: Response) => {
  try {
    const range = (req.query.range as string) || '30d'
    const daysMap: Record<string, number> = { '7d': 7, '30d': 30, '90d': 90, '1y': 365 }
    const days = daysMap[range] || 30

    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    const metrics = await growthAnalytics.getComprehensiveGrowthMetrics({ startDate, endDate })
    res.json(metrics)
  } catch (error) {
    console.error('Comprehensive growth metrics error:', error)
    res.status(500).json({ error: 'Failed to load comprehensive growth metrics' })
  }
})

/**
 * GET /api/admin/analytics/growth/tenants
 * Get tenant growth metrics only
 */
router.get('/growth/tenants', requirePermission('analytics'), async (req: SuperAdminRequest, res: Response) => {
  try {
    const range = (req.query.range as string) || '30d'
    const daysMap: Record<string, number> = { '7d': 7, '30d': 30, '90d': 90, '1y': 365 }
    const days = daysMap[range] || 30

    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    const metrics = await growthAnalytics.getTenantGrowthMetrics({ startDate, endDate })
    res.json(metrics)
  } catch (error) {
    console.error('Tenant growth metrics error:', error)
    res.status(500).json({ error: 'Failed to load tenant growth metrics' })
  }
})

/**
 * GET /api/admin/analytics/growth/activation-funnel
 * Get activation funnel metrics
 */
router.get('/growth/activation-funnel', requirePermission('analytics'), async (req: SuperAdminRequest, res: Response) => {
  try {
    const range = (req.query.range as string) || '30d'
    const daysMap: Record<string, number> = { '7d': 7, '30d': 30, '90d': 90, '1y': 365 }
    const days = daysMap[range] || 30

    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    const metrics = await growthAnalytics.getActivationFunnelMetrics({ startDate, endDate })
    res.json(metrics)
  } catch (error) {
    console.error('Activation funnel metrics error:', error)
    res.status(500).json({ error: 'Failed to load activation funnel metrics' })
  }
})

/**
 * GET /api/admin/analytics/growth/inventory
 * Get inventory (rooms) growth metrics
 */
router.get('/growth/inventory', requirePermission('analytics'), async (req: SuperAdminRequest, res: Response) => {
  try {
    const range = (req.query.range as string) || '30d'
    const daysMap: Record<string, number> = { '7d': 7, '30d': 30, '90d': 90, '1y': 365 }
    const days = daysMap[range] || 30

    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    const metrics = await growthAnalytics.getInventoryMetrics({ startDate, endDate })
    res.json(metrics)
  } catch (error) {
    console.error('Inventory metrics error:', error)
    res.status(500).json({ error: 'Failed to load inventory metrics' })
  }
})

/**
 * GET /api/admin/analytics/growth/team
 * Get team growth metrics
 */
router.get('/growth/team', requirePermission('analytics'), async (req: SuperAdminRequest, res: Response) => {
  try {
    const range = (req.query.range as string) || '30d'
    const daysMap: Record<string, number> = { '7d': 7, '30d': 30, '90d': 90, '1y': 365 }
    const days = daysMap[range] || 30

    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    const metrics = await growthAnalytics.getTeamMetrics({ startDate, endDate })
    res.json(metrics)
  } catch (error) {
    console.error('Team metrics error:', error)
    res.status(500).json({ error: 'Failed to load team metrics' })
  }
})

/**
 * GET /api/admin/analytics/growth/customers
 * Get customer acquisition metrics
 */
router.get('/growth/customers', requirePermission('analytics'), async (req: SuperAdminRequest, res: Response) => {
  try {
    const range = (req.query.range as string) || '30d'
    const daysMap: Record<string, number> = { '7d': 7, '30d': 30, '90d': 90, '1y': 365 }
    const days = daysMap[range] || 30

    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    const metrics = await growthAnalytics.getCustomerAcquisitionMetrics({ startDate, endDate })
    res.json(metrics)
  } catch (error) {
    console.error('Customer acquisition metrics error:', error)
    res.status(500).json({ error: 'Failed to load customer acquisition metrics' })
  }
})

/**
 * GET /api/admin/analytics/engagement
 * Get engagement metrics
 */
router.get('/engagement', requirePermission('analytics'), async (req: SuperAdminRequest, res: Response) => {
  try {
    const range = (req.query.range as string) || '30d'
    const daysMap: Record<string, number> = { '7d': 7, '30d': 30, '90d': 90, '1y': 365 }
    const days = daysMap[range] || 30

    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    const metrics = await growthAnalytics.getEngagementMetrics({ startDate, endDate })
    res.json(metrics)
  } catch (error) {
    console.error('Engagement metrics error:', error)
    res.status(500).json({ error: 'Failed to load engagement metrics' })
  }
})

/**
 * GET /api/admin/analytics/gmv
 * Get GMV and booking value metrics
 */
router.get('/gmv', requirePermission('analytics'), async (req: SuperAdminRequest, res: Response) => {
  try {
    const range = (req.query.range as string) || '30d'
    const daysMap: Record<string, number> = { '7d': 7, '30d': 30, '90d': 90, '1y': 365 }
    const days = daysMap[range] || 30

    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    const metrics = await growthAnalytics.getGMVMetrics({ startDate, endDate })
    res.json(metrics)
  } catch (error) {
    console.error('GMV metrics error:', error)
    res.status(500).json({ error: 'Failed to load GMV metrics' })
  }
})

/**
 * GET /api/admin/analytics/attribution
 * Get marketing attribution metrics
 */
router.get('/attribution', requirePermission('analytics'), async (req: SuperAdminRequest, res: Response) => {
  try {
    const range = (req.query.range as string) || '30d'
    const daysMap: Record<string, number> = { '7d': 7, '30d': 30, '90d': 90, '1y': 365 }
    const days = daysMap[range] || 30

    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    const metrics = await growthAnalytics.getMarketingAttributionMetrics({ startDate, endDate })
    res.json(metrics)
  } catch (error) {
    console.error('Attribution metrics error:', error)
    res.status(500).json({ error: 'Failed to load attribution metrics' })
  }
})

/**
 * GET /api/admin/analytics/churn
 * Get churn analysis metrics
 */
router.get('/churn', requirePermission('analytics'), async (req: SuperAdminRequest, res: Response) => {
  try {
    const range = (req.query.range as string) || '30d'
    const daysMap: Record<string, number> = { '7d': 7, '30d': 30, '90d': 90, '1y': 365 }
    const days = daysMap[range] || 30

    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    const metrics = await growthAnalytics.getChurnMetrics({ startDate, endDate })
    res.json(metrics)
  } catch (error) {
    console.error('Churn metrics error:', error)
    res.status(500).json({ error: 'Failed to load churn metrics' })
  }
})

/**
 * GET /api/admin/analytics/usage-metrics
 * Get usage analytics (DAU/WAU/MAU, features, API usage)
 */
router.get('/usage-metrics', requirePermission('analytics'), async (req: SuperAdminRequest, res: Response) => {
  try {
    const range = (req.query.range as string) || '30d'
    const daysMap: Record<string, number> = { '7d': 7, '30d': 30, '90d': 90, '1y': 365 }
    const days = daysMap[range] || 30

    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    const metrics = await platformAnalytics.getUsageMetrics({ startDate, endDate })
    res.json(metrics)
  } catch (error) {
    console.error('Usage metrics error:', error)
    res.status(500).json({ error: 'Failed to load usage metrics' })
  }
})

/**
 * GET /api/admin/analytics/trends/:metric
 * Get trend data for sparklines
 */
router.get('/trends/:metric', requirePermission('analytics'), async (req: SuperAdminRequest, res: Response) => {
  try {
    const metric = req.params.metric as 'mrr' | 'customers' | 'churn' | 'bookings'
    const period = (req.query.period as 'week' | 'month' | 'quarter' | 'year') || 'month'

    if (!['mrr', 'customers', 'churn', 'bookings'].includes(metric)) {
      return res.status(400).json({ error: 'Invalid metric' })
    }

    const trend = await platformAnalytics.getTrendData(metric, period)
    res.json(trend)
  } catch (error) {
    console.error('Trend data error:', error)
    res.status(500).json({ error: 'Failed to load trend data' })
  }
})

/**
 * POST /api/admin/analytics/reports/unified
 * Generate and download unified analytics report (PDF or CSV)
 */
router.post('/reports/unified', requirePermission('analytics'), async (req: SuperAdminRequest, res: Response) => {
  try {
    const { sections, dateRange, format = 'pdf' } = req.body

    // Validate inputs
    if (!sections || !Array.isArray(sections) || sections.length === 0) {
      return res.status(400).json({ error: 'At least one section must be selected' })
    }

    if (!dateRange || !dateRange.startDate || !dateRange.endDate) {
      return res.status(400).json({ error: 'Date range is required' })
    }

    const validSections = ['saasMetrics', 'growthAcquisition', 'platformStats', 'customerData', 'teamMetrics', 'engagement']
    const invalidSections = sections.filter((s: string) => !validSections.includes(s))
    if (invalidSections.length > 0) {
      return res.status(400).json({ error: `Invalid sections: ${invalidSections.join(', ')}` })
    }

    if (!['pdf', 'csv'].includes(format)) {
      return res.status(400).json({ error: 'Format must be pdf or csv' })
    }

    // Generate the report
    const startDate = new Date(dateRange.startDate)
    const endDate = new Date(dateRange.endDate)

    const reportBuffer = await generateAdminAnalyticsReport({
      sections,
      startDate,
      endDate,
      currency: 'ZAR'
    })

    // Set appropriate headers and send
    const filename = `analytics-report-${new Date().toISOString().split('T')[0]}.${format}`

    if (format === 'pdf') {
      res.setHeader('Content-Type', 'application/pdf')
    } else {
      res.setHeader('Content-Type', 'text/csv')
    }

    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
    res.send(reportBuffer)
  } catch (error) {
    console.error('Report generation error:', error)
    res.status(500).json({ error: 'Failed to generate report' })
  }
})

// ============== LEGACY ENDPOINTS (kept for backward compatibility) ==============

/**
 * GET /api/admin/analytics/dashboard
 * Get main dashboard KPIs
 */
router.get('/dashboard', requirePermission('analytics'), async (req: SuperAdminRequest, res: Response) => {
  try {
    const range = (req.query.range as string) || '30d'
    const daysMap: Record<string, number> = { '7d': 7, '30d': 30, '90d': 90, '1y': 365 }
    const days = daysMap[range] || 30

    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)
    const startDateStr = startDate.toISOString()

    // Get total and active tenants
    const { count: totalTenants } = await supabase
      .from('tenants')
      .select('*', { count: 'exact', head: true })

    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    // Get new tenants in range
    const { count: newTenants } = await supabase
      .from('tenants')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', startDateStr)

    // Get total users (tenant members)
    const { count: totalUsers } = await supabase
      .from('tenant_members')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active')

    // Get total bookings
    const { count: totalBookings } = await supabase
      .from('bookings')
      .select('*', { count: 'exact', head: true })

    // Get bookings in range
    const { count: rangeBookings } = await supabase
      .from('bookings')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', startDateStr)

    // Get total revenue (sum of all booking totals)
    const { data: revenueData } = await supabase
      .from('bookings')
      .select('total_amount')

    const totalRevenue = revenueData?.reduce((sum, b) => sum + (Number(b.total_amount) || 0), 0) || 0

    // Get revenue in range
    const { data: rangeRevenueData } = await supabase
      .from('bookings')
      .select('total_amount')
      .gte('created_at', startDateStr)

    const rangeRevenue = rangeRevenueData?.reduce((sum, b) => sum + (Number(b.total_amount) || 0), 0) || 0

    // Calculate MRR from active subscriptions
    const { data: subscriptions } = await supabase
      .from('tenant_subscriptions')
      .select('billing_cycle, subscription_plans(price_monthly, price_yearly)')
      .in('status', ['active', 'trial'])

    let mrr = 0
    subscriptions?.forEach((sub: any) => {
      if (sub.subscription_plans) {
        if (sub.billing_cycle === 'yearly') {
          mrr += (Number(sub.subscription_plans.price_yearly) || 0) / 12
        } else {
          mrr += Number(sub.subscription_plans.price_monthly) || 0
        }
      }
    })

    const arr = mrr * 12

    // Calculate growth rate (compare to previous period)
    const previousStart = new Date(startDate)
    previousStart.setDate(previousStart.getDate() - days)

    const { count: previousTenants } = await supabase
      .from('tenants')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', previousStart.toISOString())
      .lt('created_at', startDateStr)

    const growthRate = previousTenants && previousTenants > 0
      ? (((newTenants || 0) - previousTenants) / previousTenants * 100).toFixed(1)
      : (newTenants || 0) > 0 ? '100.0' : '0.0'

    // Get error count in range
    const { count: errorCount } = await supabase
      .from('error_logs')
      .select('*', { count: 'exact', head: true })
      .gte('occurred_at', startDateStr)

    res.json({
      totalTenants: totalTenants || 0,
      activeTenants: totalTenants || 0, // TODO: track active tenants separately
      newTenants: newTenants || 0,
      totalUsers: totalUsers || 0,
      activeUsers: totalUsers || 0, // TODO: track active users separately
      totalBookings: totalBookings || 0,
      monthlyBookings: rangeBookings || 0,
      totalRevenue,
      monthlyRevenue: rangeRevenue,
      mrr: Math.round(mrr * 100) / 100,
      arr: Math.round(arr * 100) / 100,
      growthRate: parseFloat(growthRate as string),
      churnRate: 0, // TODO: calculate churn rate
      errorCount: errorCount || 0
    })
  } catch (error) {
    console.error('Dashboard analytics error:', error)
    res.status(500).json({ error: 'Failed to load dashboard analytics' })
  }
})

/**
 * GET /api/admin/analytics/revenue
 * Get revenue chart data
 */
router.get('/revenue', requirePermission('analytics'), async (req: SuperAdminRequest, res: Response) => {
  try {
    const range = (req.query.range as string) || '30d'
    const daysMap: Record<string, number> = { '7d': 7, '30d': 30, '90d': 90, '1y': 365 }
    const days = daysMap[range] || 30

    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    // Get bookings with created_at and total_amount
    const { data: bookings } = await supabase
      .from('bookings')
      .select('created_at, total_amount')
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: true })

    // Group by date
    const revenueByDate: Record<string, number> = {}
    const bookingsByDate: Record<string, number> = {}

    // Initialize all dates in range
    for (let d = new Date(startDate); d <= new Date(); d.setDate(d.getDate() + 1)) {
      const dateKey = d.toISOString().split('T')[0]
      revenueByDate[dateKey] = 0
      bookingsByDate[dateKey] = 0
    }

    // Fill in actual data
    bookings?.forEach(booking => {
      const dateKey = booking.created_at.split('T')[0]
      revenueByDate[dateKey] = (revenueByDate[dateKey] || 0) + (Number(booking.total_amount) || 0)
      bookingsByDate[dateKey] = (bookingsByDate[dateKey] || 0) + 1
    })

    // Convert to array format for charts
    const chartData = Object.entries(revenueByDate).map(([date, revenue]) => ({
      date,
      revenue,
      bookings: bookingsByDate[date] || 0
    }))

    res.json(chartData)
  } catch (error) {
    console.error('Revenue analytics error:', error)
    res.status(500).json({ error: 'Failed to load revenue analytics' })
  }
})

/**
 * GET /api/admin/analytics/user-growth
 * Get user growth chart data
 */
router.get('/user-growth', requirePermission('analytics'), async (req: SuperAdminRequest, res: Response) => {
  try {
    const range = (req.query.range as string) || '30d'
    const daysMap: Record<string, number> = { '7d': 7, '30d': 30, '90d': 90, '1y': 365 }
    const days = daysMap[range] || 30

    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    // Get tenants created in range
    const { data: tenants } = await supabase
      .from('tenants')
      .select('created_at')
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: true })

    // Get users created in range
    const { data: users } = await supabase
      .from('tenant_members')
      .select('created_at')
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: true })

    // Group by date
    const tenantsByDate: Record<string, number> = {}
    const usersByDate: Record<string, number> = {}

    // Initialize all dates
    for (let d = new Date(startDate); d <= new Date(); d.setDate(d.getDate() + 1)) {
      const dateKey = d.toISOString().split('T')[0]
      tenantsByDate[dateKey] = 0
      usersByDate[dateKey] = 0
    }

    // Fill in tenant data
    tenants?.forEach(tenant => {
      const dateKey = tenant.created_at.split('T')[0]
      tenantsByDate[dateKey] = (tenantsByDate[dateKey] || 0) + 1
    })

    // Fill in user data
    users?.forEach(user => {
      const dateKey = user.created_at.split('T')[0]
      usersByDate[dateKey] = (usersByDate[dateKey] || 0) + 1
    })

    // Calculate cumulative totals
    let cumulativeTenants = 0
    let cumulativeUsers = 0

    // Get base counts before range
    const { count: baseTenants } = await supabase
      .from('tenants')
      .select('*', { count: 'exact', head: true })
      .lt('created_at', startDate.toISOString())

    const { count: baseUsers } = await supabase
      .from('tenant_members')
      .select('*', { count: 'exact', head: true })
      .lt('created_at', startDate.toISOString())

    cumulativeTenants = baseTenants || 0
    cumulativeUsers = baseUsers || 0

    const chartData = Object.entries(tenantsByDate).map(([date, newTenants]) => {
      cumulativeTenants += newTenants
      cumulativeUsers += usersByDate[date] || 0
      return {
        date,
        newTenants,
        newUsers: usersByDate[date] || 0,
        totalTenants: cumulativeTenants,
        totalUsers: cumulativeUsers
      }
    })

    res.json(chartData)
  } catch (error) {
    console.error('User growth analytics error:', error)
    res.status(500).json({ error: 'Failed to load user growth analytics' })
  }
})

/**
 * GET /api/admin/analytics/tenant-growth
 * Get tenant growth chart data
 */
router.get('/tenant-growth', requirePermission('analytics'), async (req: SuperAdminRequest, res: Response) => {
  try {
    const range = (req.query.range as string) || '30d'
    const daysMap: Record<string, number> = { '7d': 7, '30d': 30, '90d': 90, '1y': 365 }
    const days = daysMap[range] || 30

    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    // Get tenants with subscription info
    const { data: tenants } = await supabase
      .from('tenants')
      .select(`
        created_at,
        tenant_subscriptions (
          plan_id,
          status,
          subscription_plans (slug, name)
        )
      `)
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: true })

    // Group by date and plan
    const dataByDate: Record<string, Record<string, number>> = {}

    for (let d = new Date(startDate); d <= new Date(); d.setDate(d.getDate() + 1)) {
      const dateKey = d.toISOString().split('T')[0]
      dataByDate[dateKey] = { free: 0, starter: 0, professional: 0, enterprise: 0, other: 0 }
    }

    tenants?.forEach((tenant: any) => {
      const dateKey = tenant.created_at.split('T')[0]
      const subscription = tenant.tenant_subscriptions?.[0]
      const planSlug = subscription?.subscription_plans?.slug || 'free'

      if (dataByDate[dateKey]) {
        if (dataByDate[dateKey][planSlug] !== undefined) {
          dataByDate[dateKey][planSlug]++
        } else {
          dataByDate[dateKey].other++
        }
      }
    })

    const chartData = Object.entries(dataByDate).map(([date, plans]) => ({
      date,
      ...plans,
      total: Object.values(plans).reduce((sum, count) => sum + count, 0)
    }))

    res.json(chartData)
  } catch (error) {
    console.error('Tenant growth analytics error:', error)
    res.status(500).json({ error: 'Failed to load tenant growth analytics' })
  }
})

/**
 * GET /api/admin/analytics/plan-distribution
 * Get distribution of tenants by plan
 */
router.get('/plan-distribution', requirePermission('analytics'), async (req: SuperAdminRequest, res: Response) => {
  try {
    // Get all plans
    const { data: plans } = await supabase
      .from('subscription_plans')
      .select('id, name, slug')
      .eq('is_active', true)
      .order('display_order', { ascending: true })

    // Get subscription counts by plan
    const { data: subscriptions } = await supabase
      .from('tenant_subscriptions')
      .select('plan_id, status')
      .in('status', ['active', 'trial'])

    // Count subscriptions per plan
    const countByPlan: Record<string, number> = {}
    subscriptions?.forEach(sub => {
      countByPlan[sub.plan_id] = (countByPlan[sub.plan_id] || 0) + 1
    })

    // Get total tenants without subscription (free tier)
    const { count: totalTenants } = await supabase
      .from('tenants')
      .select('*', { count: 'exact', head: true })

    const subscribedTenants = Object.values(countByPlan).reduce((sum, count) => sum + count, 0)
    const freeTenants = (totalTenants || 0) - subscribedTenants

    const distribution = plans?.map(plan => ({
      plan: plan.name,
      slug: plan.slug,
      count: plan.slug === 'free' ? freeTenants : (countByPlan[plan.id] || 0)
    })) || []

    // Add free tier if not in plans
    if (!distribution.some(d => d.slug === 'free')) {
      distribution.unshift({
        plan: 'Free',
        slug: 'free',
        count: freeTenants
      })
    }

    res.json(distribution)
  } catch (error) {
    console.error('Plan distribution error:', error)
    res.status(500).json({ error: 'Failed to load plan distribution' })
  }
})

/**
 * GET /api/admin/analytics/top-tenants
 * Get top performing tenants
 */
router.get('/top-tenants', requirePermission('analytics'), async (req: SuperAdminRequest, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 10
    const sortBy = (req.query.sortBy as string) || 'revenue'

    // Get tenants with booking counts and revenue
    const { data: tenants } = await supabase
      .from('tenants')
      .select(`
        id,
        business_name,
        created_at,
        bookings (total_amount)
      `)
      .limit(100)

    // Calculate metrics for each tenant
    const tenantMetrics = tenants?.map((tenant: any) => {
      const bookingCount = tenant.bookings?.length || 0
      const revenue = tenant.bookings?.reduce(
        (sum: number, b: any) => sum + (Number(b.total_amount) || 0),
        0
      ) || 0

      return {
        id: tenant.id,
        name: tenant.business_name || 'Unnamed',
        createdAt: tenant.created_at,
        bookings: bookingCount,
        revenue
      }
    }) || []

    // Sort by requested metric
    if (sortBy === 'bookings') {
      tenantMetrics.sort((a, b) => b.bookings - a.bookings)
    } else {
      tenantMetrics.sort((a, b) => b.revenue - a.revenue)
    }

    res.json(tenantMetrics.slice(0, limit))
  } catch (error) {
    console.error('Top tenants error:', error)
    res.status(500).json({ error: 'Failed to load top tenants' })
  }
})

/**
 * GET /api/admin/analytics/geographic
 * Get geographic distribution of tenants
 */
router.get('/geographic', requirePermission('analytics'), async (req: SuperAdminRequest, res: Response) => {
  try {
    // Get tenants with country info
    const { data: tenants } = await supabase
      .from('tenants')
      .select('country')

    // Count by country
    const countByCountry: Record<string, number> = {}
    tenants?.forEach(tenant => {
      const country = tenant.country || 'Unknown'
      countByCountry[country] = (countByCountry[country] || 0) + 1
    })

    const distribution = Object.entries(countByCountry)
      .map(([country, count]) => ({ country, count }))
      .sort((a, b) => b.count - a.count)

    res.json(distribution)
  } catch (error) {
    console.error('Geographic analytics error:', error)
    res.status(500).json({ error: 'Failed to load geographic analytics' })
  }
})

export default router

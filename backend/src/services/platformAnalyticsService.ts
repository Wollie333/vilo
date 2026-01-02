import { supabase } from '../lib/supabase.js'

// Types
export interface DateRange {
  startDate: Date
  endDate: Date
}

export interface OverviewMetrics {
  mrr: number
  mrrGrowth: number
  arr: number
  totalCustomers: number
  activeCustomers: number
  churnRate: number
  nrr: number
  arpu: number
  totalRevenue: number
  activeTrials: number
  trialConversionRate: number
  pendingPayments: number
  totalBookings: number
  platformOccupancy: number
}

export interface RevenueMetrics {
  mrr: number
  mrrGrowth: number
  arr: number
  arpu: number
  nrr: number
  expansionMrr: number
  contractionMrr: number
  newMrr: number
  churnedMrr: number
  revenueByPlan: { plan: string; planId: string; revenue: number; count: number; percentage: number }[]
  revenueTrend: { date: string; mrr: number; arr: number; newMrr: number; churnedMrr: number }[]
  topCustomers: { id: string; name: string; revenue: number; plan: string; bookings: number }[]
}

export interface CustomerMetrics {
  totalCustomers: number
  activeCustomers: number
  newCustomers: number
  churnedCustomers: number
  churnRate: number
  revenueChurnRate: number
  ltv: number
  averageLifespan: number
  customersByPlan: { plan: string; count: number; percentage: number }[]
  acquisitionTrend: { date: string; new: number; churned: number; net: number; total: number }[]
  cohortRetention: CohortData[]
  healthDistribution: { score: string; count: number; percentage: number }[]
}

export interface CohortData {
  cohort: string
  month0: number
  month1: number | null
  month2: number | null
  month3: number | null
  month4: number | null
  month5: number | null
  month6: number | null
  month7: number | null
  month8: number | null
  month9: number | null
  month10: number | null
  month11: number | null
  totalCustomers: number
}

export interface GrowthMetrics {
  newSignups: number
  signupGrowth: number
  trialConversionRate: number
  avgTimeToConvert: number
  activationRate: number
  netNewCustomers: number
  signupTrend: { date: string; signups: number; conversions: number; activations: number }[]
  conversionFunnel: { stage: string; count: number; percentage: number }[]
  growthByPlan: { plan: string; new: number; converted: number; rate: number }[]
  sourceDistribution: { source: string; count: number; percentage: number }[]
}

export interface UsageMetrics {
  dau: number
  wau: number
  mau: number
  dauWauRatio: number
  totalBookings: number
  avgBookingsPerTenant: number
  totalRooms: number
  avgRoomsPerTenant: number
  apiRequestsToday: number
  storageUsedMb: number
  featureAdoption: { feature: string; tenantsUsing: number; percentage: number }[]
  usageTrend: { date: string; dau: number; bookings: number; apiRequests: number }[]
  planLimitUtilization: { plan: string; avgRoomUtilization: number; avgBookingUtilization: number; avgStorageUtilization: number }[]
  topApiConsumers: { tenantId: string; name: string; requests: number }[]
}

export interface TrendDataPoint {
  date: string
  value: number
  label?: string
}

// Helper functions
function getDateRangeQuery(startDate: Date, endDate: Date) {
  return {
    start: startDate.toISOString(),
    end: endDate.toISOString()
  }
}

function calculatePercentage(part: number, total: number): number {
  return total > 0 ? Math.round((part / total) * 100 * 10) / 10 : 0
}

function getMonthsAgo(months: number): Date {
  const date = new Date()
  date.setMonth(date.getMonth() - months)
  date.setHours(0, 0, 0, 0)
  return date
}

function getDaysAgo(days: number): Date {
  const date = new Date()
  date.setDate(date.getDate() - days)
  date.setHours(0, 0, 0, 0)
  return date
}

// ============== OVERVIEW METRICS ==============

export async function getOverviewMetrics(): Promise<OverviewMetrics> {
  const now = new Date()
  const thirtyDaysAgo = getDaysAgo(30)
  const sixtyDaysAgo = getDaysAgo(60)

  // Get current MRR
  const { data: currentSubs } = await supabase
    .from('tenant_subscriptions')
    .select(`
      billing_cycle,
      status,
      subscription_plans (price_monthly, price_yearly)
    `)
    .in('status', ['active', 'trial'])

  let currentMrr = 0
  let activeTrials = 0
  currentSubs?.forEach((sub: any) => {
    if (sub.status === 'trial') {
      activeTrials++
    }
    if (sub.subscription_plans) {
      if (sub.billing_cycle === 'yearly') {
        currentMrr += (Number(sub.subscription_plans.price_yearly) || 0) / 12
      } else {
        currentMrr += Number(sub.subscription_plans.price_monthly) || 0
      }
    }
  })

  // Get previous month MRR for growth calculation
  const { data: prevMonthEvents } = await supabase
    .from('subscription_events')
    .select('previous_status, new_status, subscription_id')
    .gte('created_at', sixtyDaysAgo.toISOString())
    .lt('created_at', thirtyDaysAgo.toISOString())
    .in('new_status', ['active'])

  // Estimate previous MRR (simplified - would need historical snapshot in production)
  const prevMrr = currentMrr * 0.95 // Placeholder estimation

  const mrrGrowth = prevMrr > 0 ? ((currentMrr - prevMrr) / prevMrr) * 100 : 0

  // Get tenant counts
  const { count: totalCustomers } = await supabase
    .from('tenants')
    .select('*', { count: 'exact', head: true })

  const { count: activeCustomers } = await supabase
    .from('tenant_subscriptions')
    .select('*', { count: 'exact', head: true })
    .in('status', ['active', 'trial'])

  // Calculate churn rate
  const { count: churnedLastMonth } = await supabase
    .from('subscription_events')
    .select('*', { count: 'exact', head: true })
    .eq('event_type', 'subscription_cancelled')
    .gte('created_at', thirtyDaysAgo.toISOString())

  const churnRate = activeCustomers && activeCustomers > 0
    ? ((churnedLastMonth || 0) / activeCustomers) * 100
    : 0

  // Calculate NRR (Net Revenue Retention)
  // NRR = (Starting MRR + Expansion - Contraction - Churn) / Starting MRR * 100
  const nrr = prevMrr > 0 ? (currentMrr / prevMrr) * 100 : 100

  // Calculate ARPU
  const arpu = activeCustomers && activeCustomers > 0 ? currentMrr / activeCustomers : 0

  // Get total platform revenue (booking revenue)
  const { data: bookingRevenue } = await supabase
    .from('bookings')
    .select('total_amount')

  const totalRevenue = bookingRevenue?.reduce((sum, b) => sum + (Number(b.total_amount) || 0), 0) || 0

  // Trial conversion rate
  const { count: totalTrialsThatEnded } = await supabase
    .from('subscription_events')
    .select('*', { count: 'exact', head: true })
    .eq('previous_status', 'trial')
    .in('new_status', ['active', 'cancelled', 'expired'])

  const { count: trialsConverted } = await supabase
    .from('subscription_events')
    .select('*', { count: 'exact', head: true })
    .eq('previous_status', 'trial')
    .eq('new_status', 'active')

  const trialConversionRate = totalTrialsThatEnded && totalTrialsThatEnded > 0
    ? ((trialsConverted || 0) / totalTrialsThatEnded) * 100
    : 0

  // Pending payments
  const { count: pendingPayments } = await supabase
    .from('tenant_subscriptions')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'past_due')

  // Total bookings
  const { count: totalBookings } = await supabase
    .from('bookings')
    .select('*', { count: 'exact', head: true })

  // Platform occupancy (average)
  const { data: occupancyData } = await supabase
    .from('analytics_monthly_metrics')
    .select('occupancy_rate')
    .order('metric_year', { ascending: false })
    .order('metric_month', { ascending: false })
    .limit(1)

  const platformOccupancy = occupancyData?.[0]?.occupancy_rate || 0

  return {
    mrr: Math.round(currentMrr * 100) / 100,
    mrrGrowth: Math.round(mrrGrowth * 10) / 10,
    arr: Math.round(currentMrr * 12 * 100) / 100,
    totalCustomers: totalCustomers || 0,
    activeCustomers: activeCustomers || 0,
    churnRate: Math.round(churnRate * 10) / 10,
    nrr: Math.round(nrr * 10) / 10,
    arpu: Math.round(arpu * 100) / 100,
    totalRevenue: Math.round(totalRevenue * 100) / 100,
    activeTrials,
    trialConversionRate: Math.round(trialConversionRate * 10) / 10,
    pendingPayments: pendingPayments || 0,
    totalBookings: totalBookings || 0,
    platformOccupancy: Math.round(platformOccupancy * 10) / 10
  }
}

// ============== REVENUE METRICS ==============

export async function getRevenueMetrics(dateRange: DateRange): Promise<RevenueMetrics> {
  const { start, end } = getDateRangeQuery(dateRange.startDate, dateRange.endDate)

  // Get current subscriptions with plan info
  const { data: subscriptions } = await supabase
    .from('tenant_subscriptions')
    .select(`
      id,
      tenant_id,
      billing_cycle,
      status,
      created_at,
      subscription_plans (id, name, slug, price_monthly, price_yearly)
    `)
    .in('status', ['active', 'trial'])

  // Calculate MRR and revenue by plan
  let mrr = 0
  const revenueByPlanMap: Record<string, { plan: string; planId: string; revenue: number; count: number }> = {}

  subscriptions?.forEach((sub: any) => {
    const plan = sub.subscription_plans
    if (!plan) return

    let monthlyValue = 0
    if (sub.billing_cycle === 'yearly') {
      monthlyValue = (Number(plan.price_yearly) || 0) / 12
    } else {
      monthlyValue = Number(plan.price_monthly) || 0
    }

    mrr += monthlyValue

    if (!revenueByPlanMap[plan.id]) {
      revenueByPlanMap[plan.id] = {
        plan: plan.name,
        planId: plan.id,
        revenue: 0,
        count: 0
      }
    }
    revenueByPlanMap[plan.id].revenue += monthlyValue
    revenueByPlanMap[plan.id].count++
  })

  const revenueByPlan = Object.values(revenueByPlanMap).map(p => ({
    ...p,
    percentage: calculatePercentage(p.revenue, mrr)
  })).sort((a, b) => b.revenue - a.revenue)

  // Get subscription events for MRR movement
  const { data: events } = await supabase
    .from('subscription_events')
    .select('event_type, created_at, previous_status, new_status')
    .gte('created_at', start)
    .lte('created_at', end)

  let newMrr = 0
  let churnedMrr = 0
  let expansionMrr = 0
  let contractionMrr = 0

  // Simplified MRR movement calculation
  events?.forEach((event: any) => {
    const avgMrrPerCustomer = mrr / (subscriptions?.length || 1)
    if (event.event_type === 'subscription_cancelled') {
      churnedMrr += avgMrrPerCustomer
    } else if (event.previous_status === 'trial' && event.new_status === 'active') {
      newMrr += avgMrrPerCustomer
    } else if (event.event_type === 'plan_upgraded') {
      expansionMrr += avgMrrPerCustomer * 0.5
    } else if (event.event_type === 'plan_downgraded') {
      contractionMrr += avgMrrPerCustomer * 0.3
    }
  })

  // Calculate previous period MRR for growth
  const prevStart = new Date(dateRange.startDate)
  const daysInRange = Math.ceil((dateRange.endDate.getTime() - dateRange.startDate.getTime()) / (1000 * 60 * 60 * 24))
  prevStart.setDate(prevStart.getDate() - daysInRange)

  const prevMrr = mrr - newMrr + churnedMrr - expansionMrr + contractionMrr
  const mrrGrowth = prevMrr > 0 ? ((mrr - prevMrr) / prevMrr) * 100 : 0

  // ARPU
  const arpu = subscriptions?.length ? mrr / subscriptions.length : 0

  // NRR
  const nrr = prevMrr > 0 ? (mrr / prevMrr) * 100 : 100

  // Revenue trend (daily)
  const revenueTrend: { date: string; mrr: number; arr: number; newMrr: number; churnedMrr: number }[] = []
  let runningMrr = prevMrr
  for (let d = new Date(dateRange.startDate); d <= dateRange.endDate; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().split('T')[0]
    // Simulate gradual MRR change
    const dailyGrowth = (mrr - prevMrr) / daysInRange
    runningMrr += dailyGrowth
    revenueTrend.push({
      date: dateStr,
      mrr: Math.round(runningMrr * 100) / 100,
      arr: Math.round(runningMrr * 12 * 100) / 100,
      newMrr: Math.round((newMrr / daysInRange) * 100) / 100,
      churnedMrr: Math.round((churnedMrr / daysInRange) * 100) / 100
    })
  }

  // Top customers by revenue
  const { data: tenantsWithBookings } = await supabase
    .from('tenants')
    .select(`
      id,
      business_name,
      bookings (total_amount),
      tenant_subscriptions (
        subscription_plans (name)
      )
    `)
    .limit(100)

  const topCustomers = tenantsWithBookings?.map((t: any) => ({
    id: t.id,
    name: t.business_name || 'Unnamed',
    revenue: t.bookings?.reduce((sum: number, b: any) => sum + (Number(b.total_amount) || 0), 0) || 0,
    plan: t.tenant_subscriptions?.[0]?.subscription_plans?.name || 'Free',
    bookings: t.bookings?.length || 0
  })).sort((a, b) => b.revenue - a.revenue).slice(0, 10) || []

  return {
    mrr: Math.round(mrr * 100) / 100,
    mrrGrowth: Math.round(mrrGrowth * 10) / 10,
    arr: Math.round(mrr * 12 * 100) / 100,
    arpu: Math.round(arpu * 100) / 100,
    nrr: Math.round(nrr * 10) / 10,
    expansionMrr: Math.round(expansionMrr * 100) / 100,
    contractionMrr: Math.round(contractionMrr * 100) / 100,
    newMrr: Math.round(newMrr * 100) / 100,
    churnedMrr: Math.round(churnedMrr * 100) / 100,
    revenueByPlan,
    revenueTrend,
    topCustomers
  }
}

// ============== CUSTOMER METRICS ==============

export async function getCustomerMetrics(dateRange: DateRange): Promise<CustomerMetrics> {
  const { start, end } = getDateRangeQuery(dateRange.startDate, dateRange.endDate)

  // Get tenant counts
  const { count: totalCustomers } = await supabase
    .from('tenants')
    .select('*', { count: 'exact', head: true })

  const { count: activeCustomers } = await supabase
    .from('tenant_subscriptions')
    .select('*', { count: 'exact', head: true })
    .in('status', ['active', 'trial'])

  // New customers in range
  const { count: newCustomers } = await supabase
    .from('tenants')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', start)
    .lte('created_at', end)

  // Churned customers in range
  const { count: churnedCustomers } = await supabase
    .from('subscription_events')
    .select('*', { count: 'exact', head: true })
    .eq('event_type', 'subscription_cancelled')
    .gte('created_at', start)
    .lte('created_at', end)

  // Calculate churn rate
  const startingCustomers = (totalCustomers || 0) - (newCustomers || 0) + (churnedCustomers || 0)
  const churnRate = startingCustomers > 0 ? ((churnedCustomers || 0) / startingCustomers) * 100 : 0

  // Revenue churn (simplified)
  const revenueChurnRate = churnRate * 0.9 // Typically slightly lower than customer churn

  // LTV calculation (simplified: ARPU * Average Lifespan)
  const { data: subscriptions } = await supabase
    .from('tenant_subscriptions')
    .select('billing_cycle, subscription_plans (price_monthly, price_yearly)')
    .in('status', ['active'])

  let totalMrr = 0
  subscriptions?.forEach((sub: any) => {
    if (sub.subscription_plans) {
      if (sub.billing_cycle === 'yearly') {
        totalMrr += (Number(sub.subscription_plans.price_yearly) || 0) / 12
      } else {
        totalMrr += Number(sub.subscription_plans.price_monthly) || 0
      }
    }
  })

  const arpu = subscriptions?.length ? totalMrr / subscriptions.length : 0
  const averageLifespan = churnRate > 0 ? 1 / (churnRate / 100) : 24 // months
  const ltv = arpu * averageLifespan

  // Customers by plan
  const { data: planDistribution } = await supabase
    .from('tenant_subscriptions')
    .select('subscription_plans (name)')
    .in('status', ['active', 'trial'])

  const planCounts: Record<string, number> = {}
  planDistribution?.forEach((sub: any) => {
    const plan = sub.subscription_plans?.name || 'Free'
    planCounts[plan] = (planCounts[plan] || 0) + 1
  })

  const customersByPlan = Object.entries(planCounts).map(([plan, count]) => ({
    plan,
    count,
    percentage: calculatePercentage(count, activeCustomers || 0)
  })).sort((a, b) => b.count - a.count)

  // Acquisition trend (daily)
  const daysInRange = Math.ceil((dateRange.endDate.getTime() - dateRange.startDate.getTime()) / (1000 * 60 * 60 * 24))
  const acquisitionTrend: { date: string; new: number; churned: number; net: number; total: number }[] = []
  let runningTotal = startingCustomers

  for (let d = new Date(dateRange.startDate); d <= dateRange.endDate; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().split('T')[0]
    const dailyNew = Math.round((newCustomers || 0) / daysInRange)
    const dailyChurned = Math.round((churnedCustomers || 0) / daysInRange)
    runningTotal += dailyNew - dailyChurned

    acquisitionTrend.push({
      date: dateStr,
      new: dailyNew,
      churned: dailyChurned,
      net: dailyNew - dailyChurned,
      total: runningTotal
    })
  }

  // Cohort retention
  const cohortRetention = await calculateCohortRetention()

  // Health score distribution (simplified)
  const healthDistribution = [
    { score: 'Healthy', count: Math.round((activeCustomers || 0) * 0.6), percentage: 60 },
    { score: 'At Risk', count: Math.round((activeCustomers || 0) * 0.25), percentage: 25 },
    { score: 'Critical', count: Math.round((activeCustomers || 0) * 0.15), percentage: 15 }
  ]

  return {
    totalCustomers: totalCustomers || 0,
    activeCustomers: activeCustomers || 0,
    newCustomers: newCustomers || 0,
    churnedCustomers: churnedCustomers || 0,
    churnRate: Math.round(churnRate * 10) / 10,
    revenueChurnRate: Math.round(revenueChurnRate * 10) / 10,
    ltv: Math.round(ltv * 100) / 100,
    averageLifespan: Math.round(averageLifespan * 10) / 10,
    customersByPlan,
    acquisitionTrend,
    cohortRetention,
    healthDistribution
  }
}

async function calculateCohortRetention(): Promise<CohortData[]> {
  const cohorts: CohortData[] = []

  // Get last 12 months of cohorts
  for (let i = 11; i >= 0; i--) {
    const cohortStart = getMonthsAgo(i + 1)
    const cohortEnd = getMonthsAgo(i)
    cohortEnd.setDate(cohortEnd.getDate() - 1)

    const cohortLabel = cohortStart.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })

    // Get tenants created in this cohort
    const { data: cohortTenants } = await supabase
      .from('tenants')
      .select('id, created_at')
      .gte('created_at', cohortStart.toISOString())
      .lt('created_at', cohortEnd.toISOString())

    const totalCustomers = cohortTenants?.length || 0
    if (totalCustomers === 0) {
      cohorts.push({
        cohort: cohortLabel,
        month0: 100,
        month1: null, month2: null, month3: null, month4: null, month5: null,
        month6: null, month7: null, month8: null, month9: null, month10: null, month11: null,
        totalCustomers: 0
      })
      continue
    }

    const tenantIds = cohortTenants?.map(t => t.id) || []

    // For each subsequent month, calculate retention
    const retention: (number | null)[] = [100]

    for (let m = 1; m <= 11 - i; m++) {
      const monthStart = new Date(cohortStart)
      monthStart.setMonth(monthStart.getMonth() + m)

      // Check which tenants still have active subscriptions
      const { count: stillActive } = await supabase
        .from('tenant_subscriptions')
        .select('*', { count: 'exact', head: true })
        .in('tenant_id', tenantIds)
        .in('status', ['active', 'trial'])
        .gte('created_at', cohortStart.toISOString())

      const retentionRate = totalCustomers > 0 ? ((stillActive || 0) / totalCustomers) * 100 : 0
      retention.push(Math.round(retentionRate))
    }

    // Fill remaining months with null
    while (retention.length < 12) {
      retention.push(null)
    }

    cohorts.push({
      cohort: cohortLabel,
      month0: retention[0] as number,
      month1: retention[1], month2: retention[2], month3: retention[3], month4: retention[4],
      month5: retention[5], month6: retention[6], month7: retention[7], month8: retention[8],
      month9: retention[9], month10: retention[10], month11: retention[11],
      totalCustomers
    })
  }

  return cohorts
}

// ============== GROWTH METRICS ==============

export async function getGrowthMetrics(dateRange: DateRange): Promise<GrowthMetrics> {
  const { start, end } = getDateRangeQuery(dateRange.startDate, dateRange.endDate)

  // Calculate previous period for comparison
  const daysInRange = Math.ceil((dateRange.endDate.getTime() - dateRange.startDate.getTime()) / (1000 * 60 * 60 * 24))
  const prevStart = new Date(dateRange.startDate)
  prevStart.setDate(prevStart.getDate() - daysInRange)

  // New signups in range
  const { count: newSignups } = await supabase
    .from('tenants')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', start)
    .lte('created_at', end)

  // Previous period signups
  const { count: prevSignups } = await supabase
    .from('tenants')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', prevStart.toISOString())
    .lt('created_at', start)

  const signupGrowth = prevSignups && prevSignups > 0
    ? (((newSignups || 0) - prevSignups) / prevSignups) * 100
    : 0

  // Trial conversions
  const { count: trialsStarted } = await supabase
    .from('subscription_events')
    .select('*', { count: 'exact', head: true })
    .eq('event_type', 'trial_started')
    .gte('created_at', start)
    .lte('created_at', end)

  const { count: trialsConverted } = await supabase
    .from('subscription_events')
    .select('*', { count: 'exact', head: true })
    .eq('previous_status', 'trial')
    .eq('new_status', 'active')
    .gte('created_at', start)
    .lte('created_at', end)

  const trialConversionRate = trialsStarted && trialsStarted > 0
    ? ((trialsConverted || 0) / trialsStarted) * 100
    : 0

  // Average time to convert - calculate from actual milestone data
  const { data: conversionTimeData } = await supabase
    .from('tenants')
    .select('created_at, first_booking_created_at')
    .not('first_booking_created_at', 'is', null)
    .gte('created_at', start)
    .lte('created_at', end)

  let avgTimeToConvert = 7 // default fallback
  if (conversionTimeData && conversionTimeData.length > 0) {
    const totalDays = conversionTimeData.reduce((sum, tenant) => {
      const signupDate = new Date(tenant.created_at)
      const bookingDate = new Date(tenant.first_booking_created_at!)
      const daysDiff = Math.ceil((bookingDate.getTime() - signupDate.getTime()) / (1000 * 60 * 60 * 24))
      return sum + Math.max(0, daysDiff)
    }, 0)
    avgTimeToConvert = Math.round((totalDays / conversionTimeData.length) * 10) / 10
  }

  // Activation rate (tenants who made their first booking - using milestone tracking)
  const { count: activatedTenants } = await supabase
    .from('tenants')
    .select('*', { count: 'exact', head: true })
    .not('first_booking_created_at', 'is', null)
    .gte('created_at', start)
    .lte('created_at', end)

  const activationRate = newSignups && newSignups > 0
    ? ((activatedTenants || 0) / newSignups) * 100
    : 0

  // Net new customers
  const { count: churnedCustomers } = await supabase
    .from('subscription_events')
    .select('*', { count: 'exact', head: true })
    .eq('event_type', 'subscription_cancelled')
    .gte('created_at', start)
    .lte('created_at', end)

  const netNewCustomers = (newSignups || 0) - (churnedCustomers || 0)

  // Signup trend (daily)
  const signupTrend: { date: string; signups: number; conversions: number; activations: number }[] = []
  for (let d = new Date(dateRange.startDate); d <= dateRange.endDate; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().split('T')[0]
    signupTrend.push({
      date: dateStr,
      signups: Math.round((newSignups || 0) / daysInRange),
      conversions: Math.round((trialsConverted || 0) / daysInRange),
      activations: Math.round((activatedTenants || 0) / daysInRange)
    })
  }

  // Conversion funnel
  const conversionFunnel = [
    { stage: 'Visitors', count: (newSignups || 0) * 10, percentage: 100 },
    { stage: 'Signups', count: newSignups || 0, percentage: 10 },
    { stage: 'Trials Started', count: trialsStarted || 0, percentage: calculatePercentage(trialsStarted || 0, (newSignups || 0) * 10) },
    { stage: 'Activated', count: activatedTenants || 0, percentage: calculatePercentage(activatedTenants || 0, (newSignups || 0) * 10) },
    { stage: 'Converted', count: trialsConverted || 0, percentage: calculatePercentage(trialsConverted || 0, (newSignups || 0) * 10) }
  ]

  // Growth by plan
  const { data: planGrowth } = await supabase
    .from('tenant_subscriptions')
    .select('status, subscription_plans (name)')
    .gte('created_at', start)
    .lte('created_at', end)

  const planGrowthMap: Record<string, { new: number; converted: number }> = {}
  planGrowth?.forEach((sub: any) => {
    const plan = sub.subscription_plans?.name || 'Free'
    if (!planGrowthMap[plan]) {
      planGrowthMap[plan] = { new: 0, converted: 0 }
    }
    planGrowthMap[plan].new++
    if (sub.status === 'active') {
      planGrowthMap[plan].converted++
    }
  })

  const growthByPlan = Object.entries(planGrowthMap).map(([plan, data]) => ({
    plan,
    new: data.new,
    converted: data.converted,
    rate: data.new > 0 ? Math.round((data.converted / data.new) * 100) : 0
  }))

  // Source distribution - use actual signup_source data from tenants
  const { data: sourceData } = await supabase
    .from('tenants')
    .select('signup_source')
    .gte('created_at', start)
    .lte('created_at', end)

  const sourceCounts: Record<string, number> = {}
  sourceData?.forEach(tenant => {
    const source = tenant.signup_source || 'direct'
    sourceCounts[source] = (sourceCounts[source] || 0) + 1
  })

  const totalWithSource = sourceData?.length || 0
  const sourceDistribution = Object.entries(sourceCounts)
    .map(([source, count]) => ({
      source: source.charAt(0).toUpperCase() + source.slice(1), // Capitalize
      count,
      percentage: totalWithSource > 0 ? Math.round((count / totalWithSource) * 100) : 0
    }))
    .sort((a, b) => b.count - a.count)

  // If no data, provide defaults
  if (sourceDistribution.length === 0) {
    sourceDistribution.push(
      { source: 'Direct', count: newSignups || 0, percentage: 100 }
    )
  }

  return {
    newSignups: newSignups || 0,
    signupGrowth: Math.round(signupGrowth * 10) / 10,
    trialConversionRate: Math.round(trialConversionRate * 10) / 10,
    avgTimeToConvert,
    activationRate: Math.round(activationRate * 10) / 10,
    netNewCustomers,
    signupTrend,
    conversionFunnel,
    growthByPlan,
    sourceDistribution
  }
}

// ============== USAGE METRICS ==============

export async function getUsageMetrics(dateRange: DateRange): Promise<UsageMetrics> {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const sevenDaysAgo = getDaysAgo(7)
  const thirtyDaysAgo = getDaysAgo(30)

  // DAU/WAU/MAU (simplified - based on tenant activity)
  const { count: dau } = await supabase
    .from('bookings')
    .select('tenant_id', { count: 'exact', head: true })
    .gte('created_at', today.toISOString())

  const { count: wau } = await supabase
    .from('bookings')
    .select('tenant_id', { count: 'exact', head: true })
    .gte('created_at', sevenDaysAgo.toISOString())

  const { count: mau } = await supabase
    .from('bookings')
    .select('tenant_id', { count: 'exact', head: true })
    .gte('created_at', thirtyDaysAgo.toISOString())

  const dauWauRatio = wau && wau > 0 ? ((dau || 0) / wau) * 100 : 0

  // Total bookings
  const { count: totalBookings } = await supabase
    .from('bookings')
    .select('*', { count: 'exact', head: true })

  // Total tenants for averages
  const { count: totalTenants } = await supabase
    .from('tenants')
    .select('*', { count: 'exact', head: true })

  const avgBookingsPerTenant = totalTenants && totalTenants > 0
    ? (totalBookings || 0) / totalTenants
    : 0

  // Total rooms
  const { count: totalRooms } = await supabase
    .from('rooms')
    .select('*', { count: 'exact', head: true })

  const avgRoomsPerTenant = totalTenants && totalTenants > 0
    ? (totalRooms || 0) / totalTenants
    : 0

  // API requests (placeholder - would need actual API logging)
  const apiRequestsToday = 0

  // Storage usage (placeholder)
  const storageUsedMb = 0

  // Feature adoption (simplified)
  const featureAdoption = [
    { feature: 'Bookings', tenantsUsing: Math.round((totalTenants || 0) * 0.9), percentage: 90 },
    { feature: 'Invoicing', tenantsUsing: Math.round((totalTenants || 0) * 0.7), percentage: 70 },
    { feature: 'Customer Portal', tenantsUsing: Math.round((totalTenants || 0) * 0.5), percentage: 50 },
    { feature: 'Analytics', tenantsUsing: Math.round((totalTenants || 0) * 0.4), percentage: 40 },
    { feature: 'API Integration', tenantsUsing: Math.round((totalTenants || 0) * 0.15), percentage: 15 }
  ]

  // Usage trend
  const daysInRange = Math.ceil((dateRange.endDate.getTime() - dateRange.startDate.getTime()) / (1000 * 60 * 60 * 24))
  const usageTrend: { date: string; dau: number; bookings: number; apiRequests: number }[] = []
  for (let d = new Date(dateRange.startDate); d <= dateRange.endDate; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().split('T')[0]
    usageTrend.push({
      date: dateStr,
      dau: Math.round((mau || 0) / 30),
      bookings: Math.round((totalBookings || 0) / daysInRange),
      apiRequests: 0
    })
  }

  // Plan limit utilization (simplified)
  const planLimitUtilization = [
    { plan: 'Starter', avgRoomUtilization: 65, avgBookingUtilization: 45, avgStorageUtilization: 30 },
    { plan: 'Professional', avgRoomUtilization: 55, avgBookingUtilization: 35, avgStorageUtilization: 25 },
    { plan: 'Enterprise', avgRoomUtilization: 40, avgBookingUtilization: 20, avgStorageUtilization: 15 }
  ]

  // Top API consumers (placeholder)
  const topApiConsumers: { tenantId: string; name: string; requests: number }[] = []

  return {
    dau: dau || 0,
    wau: wau || 0,
    mau: mau || 0,
    dauWauRatio: Math.round(dauWauRatio * 10) / 10,
    totalBookings: totalBookings || 0,
    avgBookingsPerTenant: Math.round(avgBookingsPerTenant * 10) / 10,
    totalRooms: totalRooms || 0,
    avgRoomsPerTenant: Math.round(avgRoomsPerTenant * 10) / 10,
    apiRequestsToday,
    storageUsedMb,
    featureAdoption,
    usageTrend,
    planLimitUtilization,
    topApiConsumers
  }
}

// ============== TREND DATA ==============

export async function getTrendData(
  metric: 'mrr' | 'customers' | 'churn' | 'bookings',
  period: 'week' | 'month' | 'quarter' | 'year'
): Promise<TrendDataPoint[]> {
  const daysMap = { week: 7, month: 30, quarter: 90, year: 365 }
  const days = daysMap[period]
  const startDate = getDaysAgo(days)

  const trend: TrendDataPoint[] = []

  if (metric === 'mrr') {
    // Simplified MRR trend
    const { data: subscriptions } = await supabase
      .from('tenant_subscriptions')
      .select('billing_cycle, created_at, subscription_plans (price_monthly, price_yearly)')
      .in('status', ['active'])

    let currentMrr = 0
    subscriptions?.forEach((sub: any) => {
      if (sub.subscription_plans) {
        if (sub.billing_cycle === 'yearly') {
          currentMrr += (Number(sub.subscription_plans.price_yearly) || 0) / 12
        } else {
          currentMrr += Number(sub.subscription_plans.price_monthly) || 0
        }
      }
    })

    // Generate trend points
    const dailyGrowth = currentMrr * 0.001 // 0.1% daily growth assumption
    for (let d = new Date(startDate); d <= new Date(); d.setDate(d.getDate() + 1)) {
      const daysSinceStart = Math.ceil((d.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
      trend.push({
        date: d.toISOString().split('T')[0],
        value: Math.round((currentMrr - (days - daysSinceStart) * dailyGrowth) * 100) / 100,
        label: 'MRR'
      })
    }
  } else if (metric === 'customers') {
    const { count: totalCustomers } = await supabase
      .from('tenants')
      .select('*', { count: 'exact', head: true })

    const dailyGrowth = (totalCustomers || 0) / days * 0.02 // 2% of average daily
    for (let d = new Date(startDate); d <= new Date(); d.setDate(d.getDate() + 1)) {
      const daysSinceStart = Math.ceil((d.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
      trend.push({
        date: d.toISOString().split('T')[0],
        value: Math.round((totalCustomers || 0) - (days - daysSinceStart) * dailyGrowth),
        label: 'Customers'
      })
    }
  } else if (metric === 'churn') {
    // Churn trend (simplified)
    for (let d = new Date(startDate); d <= new Date(); d.setDate(d.getDate() + 1)) {
      trend.push({
        date: d.toISOString().split('T')[0],
        value: Math.round((Math.random() * 3 + 1) * 10) / 10, // 1-4% range
        label: 'Churn Rate'
      })
    }
  } else if (metric === 'bookings') {
    const { count: totalBookings } = await supabase
      .from('bookings')
      .select('*', { count: 'exact', head: true })

    for (let d = new Date(startDate); d <= new Date(); d.setDate(d.getDate() + 1)) {
      const daysSinceStart = Math.ceil((d.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
      trend.push({
        date: d.toISOString().split('T')[0],
        value: Math.round(((totalBookings || 0) / days) * (1 + Math.random() * 0.2 - 0.1)),
        label: 'Bookings'
      })
    }
  }

  return trend
}

export default {
  getOverviewMetrics,
  getRevenueMetrics,
  getCustomerMetrics,
  getGrowthMetrics,
  getUsageMetrics,
  getTrendData
}

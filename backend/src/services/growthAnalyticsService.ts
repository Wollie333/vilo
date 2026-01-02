/**
 * Growth Analytics Service
 * Comprehensive metrics for marketing decision support
 */

import { supabase } from '../lib/supabase.js'

// ============================================
// TYPES
// ============================================

export interface DateRange {
  startDate: Date
  endDate: Date
}

export interface TenantGrowthMetrics {
  newSignups: number
  signupGrowth: number // % change from previous period
  totalTenants: number
  signupsBySource: { source: string; count: number; percentage: number }[]
  signupsByCampaign: { campaign: string; count: number; conversions: number }[]
  signupTrend: { date: string; signups: number }[]
}

export interface ActivationFunnelMetrics {
  stages: {
    stage: string
    count: number
    percentage: number
    dropOffRate: number
  }[]
  timeToValue: {
    avgDaysToFirstRoom: number
    avgDaysToFirstBooking: number
    avgDaysToFirstPayment: number
  }
  activationRate: number // % of signups that became fully activated
}

export interface InventoryMetrics {
  totalRooms: number
  newRooms: number
  roomGrowth: number
  activeRooms: number // rooms with booking in last 30 days
  activeRoomRate: number
  avgRoomsPerTenant: number
  roomsTrend: { date: string; total: number; new: number }[]
}

export interface TeamMetrics {
  totalMembers: number
  newMembers: number
  memberGrowth: number
  avgTeamSize: number
  membersByRole: { role: string; count: number; percentage: number }[]
  teamsWithMultipleMembers: number
  teamSizeDistribution: { size: string; count: number }[]
}

export interface CustomerAcquisitionMetrics {
  totalCustomers: number
  newCustomers: number
  customerGrowth: number
  customersWithBookings: number
  conversionRate: number // customers who booked / total customers
  repeatCustomers: number
  repeatRate: number
  customersByTenantTier: { tier: string; customers: number }[]
  customerTrend: { date: string; total: number; new: number }[]
}

export interface EngagementMetrics {
  activeTenants7d: number
  activeTenants30d: number
  activeRate7d: number
  activeRate30d: number
  avgLoginsPerTenant: number
  avgSessionDuration: number // in minutes
  featureAdoption: { feature: string; adoptionRate: number; usage: number }[]
  engagementTrend: { date: string; activeTenants: number; logins: number }[]
}

export interface GMVMetrics {
  totalGMV: number
  gmvGrowth: number
  totalBookings: number
  bookingGrowth: number
  avgBookingValue: number
  avgBookingValueGrowth: number
  revenuePerActiveTenant: number
  gmvTrend: { date: string; gmv: number; bookings: number }[]
}

export interface MarketingAttributionMetrics {
  sourcePerformance: {
    source: string
    signups: number
    activated: number
    activationRate: number
    avgTimeToActivate: number
    estimatedLTV: number
  }[]
  campaignPerformance: {
    campaign: string
    signups: number
    activated: number
    activationRate: number
  }[]
  bestPerformingSource: string
  bestPerformingCampaign: string
}

export interface ChurnMetrics {
  churnedTenants: number
  churnRate: number
  churnReasons: { reason: string; count: number; percentage: number }[]
  avgTenureBeforeChurn: number // days
  churnTrend: { date: string; churned: number }[]
  atRiskTenants: number // no activity in 14+ days
}

export interface ComprehensiveGrowthMetrics {
  tenantGrowth: TenantGrowthMetrics
  activationFunnel: ActivationFunnelMetrics
  inventory: InventoryMetrics
  team: TeamMetrics
  customers: CustomerAcquisitionMetrics
  engagement: EngagementMetrics
  gmv: GMVMetrics
  attribution: MarketingAttributionMetrics
  churn: ChurnMetrics
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function getDaysInRange(range: DateRange): number {
  return Math.ceil((range.endDate.getTime() - range.startDate.getTime()) / (1000 * 60 * 60 * 24))
}

function getPreviousPeriod(range: DateRange): DateRange {
  const days = getDaysInRange(range)
  const previousEnd = new Date(range.startDate)
  previousEnd.setDate(previousEnd.getDate() - 1)
  const previousStart = new Date(previousEnd)
  previousStart.setDate(previousStart.getDate() - days)
  return { startDate: previousStart, endDate: previousEnd }
}

function calculateGrowth(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0
  return Math.round(((current - previous) / previous) * 100 * 10) / 10
}

// ============================================
// TENANT GROWTH METRICS
// ============================================

export async function getTenantGrowthMetrics(range: DateRange): Promise<TenantGrowthMetrics> {
  const previousPeriod = getPreviousPeriod(range)

  // Get new signups in current period
  const { count: newSignups } = await supabase
    .from('tenants')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', range.startDate.toISOString())
    .lte('created_at', range.endDate.toISOString())

  // Get signups in previous period for growth calculation
  const { count: previousSignups } = await supabase
    .from('tenants')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', previousPeriod.startDate.toISOString())
    .lte('created_at', previousPeriod.endDate.toISOString())

  // Get total tenants
  const { count: totalTenants } = await supabase
    .from('tenants')
    .select('*', { count: 'exact', head: true })

  // Get signups by source
  const { data: sourceData } = await supabase
    .from('tenants')
    .select('signup_source')
    .gte('created_at', range.startDate.toISOString())
    .lte('created_at', range.endDate.toISOString())

  const sourceCounts: Record<string, number> = {}
  sourceData?.forEach(t => {
    const source = t.signup_source || 'direct'
    sourceCounts[source] = (sourceCounts[source] || 0) + 1
  })

  const signupsBySource = Object.entries(sourceCounts).map(([source, count]) => ({
    source: source.charAt(0).toUpperCase() + source.slice(1),
    count,
    percentage: Math.round((count / (newSignups || 1)) * 100)
  })).sort((a, b) => b.count - a.count)

  // Get signups by campaign
  const { data: campaignData } = await supabase
    .from('tenants')
    .select('signup_campaign, first_payment_received_at')
    .gte('created_at', range.startDate.toISOString())
    .lte('created_at', range.endDate.toISOString())
    .not('signup_campaign', 'is', null)

  const campaignCounts: Record<string, { signups: number; conversions: number }> = {}
  campaignData?.forEach(t => {
    const campaign = t.signup_campaign || 'unknown'
    if (!campaignCounts[campaign]) {
      campaignCounts[campaign] = { signups: 0, conversions: 0 }
    }
    campaignCounts[campaign].signups++
    if (t.first_payment_received_at) {
      campaignCounts[campaign].conversions++
    }
  })

  const signupsByCampaign = Object.entries(campaignCounts).map(([campaign, data]) => ({
    campaign,
    count: data.signups,
    conversions: data.conversions
  })).sort((a, b) => b.count - a.count)

  // Get signup trend (daily breakdown)
  const { data: trendData } = await supabase
    .from('tenants')
    .select('created_at')
    .gte('created_at', range.startDate.toISOString())
    .lte('created_at', range.endDate.toISOString())
    .order('created_at', { ascending: true })

  const dailyCounts: Record<string, number> = {}
  trendData?.forEach(t => {
    const date = t.created_at.split('T')[0]
    dailyCounts[date] = (dailyCounts[date] || 0) + 1
  })

  const signupTrend = Object.entries(dailyCounts).map(([date, signups]) => ({
    date,
    signups
  }))

  return {
    newSignups: newSignups || 0,
    signupGrowth: calculateGrowth(newSignups || 0, previousSignups || 0),
    totalTenants: totalTenants || 0,
    signupsBySource,
    signupsByCampaign,
    signupTrend
  }
}

// ============================================
// ACTIVATION FUNNEL METRICS
// ============================================

export async function getActivationFunnelMetrics(range: DateRange): Promise<ActivationFunnelMetrics> {
  // Get all tenants created in range with their milestones
  const { data: tenants } = await supabase
    .from('tenants')
    .select('id, created_at, first_room_created_at, first_booking_created_at, first_payment_received_at')
    .gte('created_at', range.startDate.toISOString())
    .lte('created_at', range.endDate.toISOString())

  const total = tenants?.length || 0
  const withRoom = tenants?.filter(t => t.first_room_created_at).length || 0
  const withBooking = tenants?.filter(t => t.first_booking_created_at).length || 0
  const withPayment = tenants?.filter(t => t.first_payment_received_at).length || 0

  // Calculate time-to-value averages
  let totalDaysToRoom = 0
  let roomCount = 0
  let totalDaysToBooking = 0
  let bookingCount = 0
  let totalDaysToPayment = 0
  let paymentCount = 0

  tenants?.forEach(t => {
    const createdAt = new Date(t.created_at)

    if (t.first_room_created_at) {
      const roomAt = new Date(t.first_room_created_at)
      totalDaysToRoom += (roomAt.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24)
      roomCount++
    }

    if (t.first_booking_created_at) {
      const bookingAt = new Date(t.first_booking_created_at)
      totalDaysToBooking += (bookingAt.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24)
      bookingCount++
    }

    if (t.first_payment_received_at) {
      const paymentAt = new Date(t.first_payment_received_at)
      totalDaysToPayment += (paymentAt.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24)
      paymentCount++
    }
  })

  const stages = [
    {
      stage: 'Signup',
      count: total,
      percentage: 100,
      dropOffRate: 0
    },
    {
      stage: 'Created Room',
      count: withRoom,
      percentage: total > 0 ? Math.round((withRoom / total) * 100) : 0,
      dropOffRate: total > 0 ? Math.round(((total - withRoom) / total) * 100) : 0
    },
    {
      stage: 'Received Booking',
      count: withBooking,
      percentage: total > 0 ? Math.round((withBooking / total) * 100) : 0,
      dropOffRate: withRoom > 0 ? Math.round(((withRoom - withBooking) / withRoom) * 100) : 0
    },
    {
      stage: 'Received Payment',
      count: withPayment,
      percentage: total > 0 ? Math.round((withPayment / total) * 100) : 0,
      dropOffRate: withBooking > 0 ? Math.round(((withBooking - withPayment) / withBooking) * 100) : 0
    }
  ]

  return {
    stages,
    timeToValue: {
      avgDaysToFirstRoom: roomCount > 0 ? Math.round(totalDaysToRoom / roomCount * 10) / 10 : 0,
      avgDaysToFirstBooking: bookingCount > 0 ? Math.round(totalDaysToBooking / bookingCount * 10) / 10 : 0,
      avgDaysToFirstPayment: paymentCount > 0 ? Math.round(totalDaysToPayment / paymentCount * 10) / 10 : 0
    },
    activationRate: total > 0 ? Math.round((withPayment / total) * 100) : 0
  }
}

// ============================================
// INVENTORY METRICS
// ============================================

export async function getInventoryMetrics(range: DateRange): Promise<InventoryMetrics> {
  const previousPeriod = getPreviousPeriod(range)

  // Get total rooms
  const { count: totalRooms } = await supabase
    .from('rooms')
    .select('*', { count: 'exact', head: true })
    .eq('is_active', true)

  // Get new rooms in range
  const { count: newRooms } = await supabase
    .from('rooms')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', range.startDate.toISOString())
    .lte('created_at', range.endDate.toISOString())

  // Get previous period rooms
  const { count: previousRooms } = await supabase
    .from('rooms')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', previousPeriod.startDate.toISOString())
    .lte('created_at', previousPeriod.endDate.toISOString())

  // Get active rooms (rooms with bookings in last 30 days)
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const { data: activeRoomIds } = await supabase
    .from('bookings')
    .select('room_id')
    .gte('created_at', thirtyDaysAgo.toISOString())

  const uniqueActiveRooms = new Set(activeRoomIds?.map(b => b.room_id))
  const activeRooms = uniqueActiveRooms.size

  // Get total tenants for avg calculation
  const { count: totalTenants } = await supabase
    .from('tenants')
    .select('*', { count: 'exact', head: true })

  // Get room trend
  const { data: roomTrend } = await supabase
    .from('rooms')
    .select('created_at')
    .gte('created_at', range.startDate.toISOString())
    .lte('created_at', range.endDate.toISOString())
    .order('created_at', { ascending: true })

  const dailyRooms: Record<string, number> = {}
  roomTrend?.forEach(r => {
    const date = r.created_at.split('T')[0]
    dailyRooms[date] = (dailyRooms[date] || 0) + 1
  })

  // Calculate cumulative trend
  let cumulative = (totalRooms || 0) - (newRooms || 0)
  const roomsTrendData = Object.entries(dailyRooms).map(([date, count]) => {
    cumulative += count
    return { date, total: cumulative, new: count }
  })

  return {
    totalRooms: totalRooms || 0,
    newRooms: newRooms || 0,
    roomGrowth: calculateGrowth(newRooms || 0, previousRooms || 0),
    activeRooms,
    activeRoomRate: totalRooms ? Math.round((activeRooms / totalRooms) * 100) : 0,
    avgRoomsPerTenant: totalTenants ? Math.round(((totalRooms || 0) / totalTenants) * 10) / 10 : 0,
    roomsTrend: roomsTrendData
  }
}

// ============================================
// TEAM METRICS
// ============================================

export async function getTeamMetrics(range: DateRange): Promise<TeamMetrics> {
  const previousPeriod = getPreviousPeriod(range)

  // Get total active team members
  const { count: totalMembers } = await supabase
    .from('tenant_members')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'active')

  // Get new members in range
  const { count: newMembers } = await supabase
    .from('tenant_members')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', range.startDate.toISOString())
    .lte('created_at', range.endDate.toISOString())

  // Get previous period members
  const { count: previousMembers } = await supabase
    .from('tenant_members')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', previousPeriod.startDate.toISOString())
    .lte('created_at', previousPeriod.endDate.toISOString())

  // Get members by role
  const { data: roleData } = await supabase
    .from('tenant_members')
    .select('role')
    .eq('status', 'active')

  const roleCounts: Record<string, number> = {}
  roleData?.forEach(m => {
    const role = m.role || 'member'
    roleCounts[role] = (roleCounts[role] || 0) + 1
  })

  const membersByRole = Object.entries(roleCounts).map(([role, count]) => ({
    role: role.charAt(0).toUpperCase() + role.slice(1).replace('_', ' '),
    count,
    percentage: Math.round((count / (totalMembers || 1)) * 100)
  })).sort((a, b) => b.count - a.count)

  // Get total tenants for avg calculation
  const { count: totalTenants } = await supabase
    .from('tenants')
    .select('*', { count: 'exact', head: true })

  // Get team size distribution
  const { data: teamSizes } = await supabase
    .from('tenant_members')
    .select('tenant_id')
    .eq('status', 'active')

  const tenantMemberCounts: Record<string, number> = {}
  teamSizes?.forEach(m => {
    tenantMemberCounts[m.tenant_id] = (tenantMemberCounts[m.tenant_id] || 0) + 1
  })

  const sizeDistribution: Record<string, number> = {
    '1 member': 0,
    '2-3 members': 0,
    '4-5 members': 0,
    '6+ members': 0
  }

  Object.values(tenantMemberCounts).forEach(size => {
    if (size === 1) sizeDistribution['1 member']++
    else if (size <= 3) sizeDistribution['2-3 members']++
    else if (size <= 5) sizeDistribution['4-5 members']++
    else sizeDistribution['6+ members']++
  })

  const teamSizeDistribution = Object.entries(sizeDistribution).map(([size, count]) => ({
    size,
    count
  }))

  const teamsWithMultiple = Object.values(tenantMemberCounts).filter(s => s > 1).length

  return {
    totalMembers: totalMembers || 0,
    newMembers: newMembers || 0,
    memberGrowth: calculateGrowth(newMembers || 0, previousMembers || 0),
    avgTeamSize: totalTenants ? Math.round(((totalMembers || 0) / totalTenants) * 10) / 10 : 0,
    membersByRole,
    teamsWithMultipleMembers: teamsWithMultiple,
    teamSizeDistribution
  }
}

// ============================================
// CUSTOMER ACQUISITION METRICS
// ============================================

export async function getCustomerAcquisitionMetrics(range: DateRange): Promise<CustomerAcquisitionMetrics> {
  const previousPeriod = getPreviousPeriod(range)

  // Get total customers
  const { count: totalCustomers } = await supabase
    .from('customers')
    .select('*', { count: 'exact', head: true })

  // Get new customers in range
  const { count: newCustomers } = await supabase
    .from('customers')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', range.startDate.toISOString())
    .lte('created_at', range.endDate.toISOString())

  // Get previous period customers
  const { count: previousCustomers } = await supabase
    .from('customers')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', previousPeriod.startDate.toISOString())
    .lte('created_at', previousPeriod.endDate.toISOString())

  // Get customers with at least one booking
  const { data: customersWithBookings } = await supabase
    .from('bookings')
    .select('customer_id')

  const uniqueCustomersWithBookings = new Set(customersWithBookings?.map(b => b.customer_id).filter(Boolean))
  const customersWithBookingsCount = uniqueCustomersWithBookings.size

  // Get repeat customers (more than 1 booking)
  const bookingCounts: Record<string, number> = {}
  customersWithBookings?.forEach(b => {
    if (b.customer_id) {
      bookingCounts[b.customer_id] = (bookingCounts[b.customer_id] || 0) + 1
    }
  })
  const repeatCustomers = Object.values(bookingCounts).filter(c => c > 1).length

  // Get customer trend
  const { data: customerTrend } = await supabase
    .from('customers')
    .select('created_at')
    .gte('created_at', range.startDate.toISOString())
    .lte('created_at', range.endDate.toISOString())
    .order('created_at', { ascending: true })

  const dailyCustomers: Record<string, number> = {}
  customerTrend?.forEach(c => {
    const date = c.created_at.split('T')[0]
    dailyCustomers[date] = (dailyCustomers[date] || 0) + 1
  })

  let cumulative = (totalCustomers || 0) - (newCustomers || 0)
  const customerTrendData = Object.entries(dailyCustomers).map(([date, count]) => {
    cumulative += count
    return { date, total: cumulative, new: count }
  })

  return {
    totalCustomers: totalCustomers || 0,
    newCustomers: newCustomers || 0,
    customerGrowth: calculateGrowth(newCustomers || 0, previousCustomers || 0),
    customersWithBookings: customersWithBookingsCount,
    conversionRate: totalCustomers ? Math.round((customersWithBookingsCount / totalCustomers) * 100) : 0,
    repeatCustomers,
    repeatRate: customersWithBookingsCount ? Math.round((repeatCustomers / customersWithBookingsCount) * 100) : 0,
    customersByTenantTier: [], // Would need subscription data join
    customerTrend: customerTrendData
  }
}

// ============================================
// ENGAGEMENT METRICS
// ============================================

export async function getEngagementMetrics(range: DateRange): Promise<EngagementMetrics> {
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  // Get total tenants
  const { count: totalTenants } = await supabase
    .from('tenants')
    .select('*', { count: 'exact', head: true })

  // Active tenants in last 7 days
  const { count: activeTenants7d } = await supabase
    .from('tenants')
    .select('*', { count: 'exact', head: true })
    .gte('last_activity_at', sevenDaysAgo.toISOString())

  // Active tenants in last 30 days
  const { count: activeTenants30d } = await supabase
    .from('tenants')
    .select('*', { count: 'exact', head: true })
    .gte('last_activity_at', thirtyDaysAgo.toISOString())

  // Get login activity from tenant_activity_log
  const { data: loginActivity, count: totalLogins } = await supabase
    .from('tenant_activity_log')
    .select('tenant_id, session_duration_seconds', { count: 'exact' })
    .eq('activity_type', 'login')
    .gte('created_at', range.startDate.toISOString())
    .lte('created_at', range.endDate.toISOString())

  // Calculate average session duration
  let totalDuration = 0
  let sessionCount = 0
  loginActivity?.forEach(l => {
    if (l.session_duration_seconds) {
      totalDuration += l.session_duration_seconds
      sessionCount++
    }
  })
  const avgSessionDuration = sessionCount > 0 ? Math.round(totalDuration / sessionCount / 60) : 0

  // Get unique login tenants
  const uniqueLoginTenants = new Set(loginActivity?.map(l => l.tenant_id))
  const avgLoginsPerTenant = uniqueLoginTenants.size > 0
    ? Math.round(((totalLogins || 0) / uniqueLoginTenants.size) * 10) / 10
    : 0

  // Get feature usage from activity log
  const { data: featureActivity } = await supabase
    .from('tenant_activity_log')
    .select('feature_used, tenant_id')
    .gte('created_at', range.startDate.toISOString())
    .lte('created_at', range.endDate.toISOString())
    .not('feature_used', 'is', null)

  const featureCounts: Record<string, Set<string>> = {}
  featureActivity?.forEach(f => {
    if (f.feature_used) {
      if (!featureCounts[f.feature_used]) {
        featureCounts[f.feature_used] = new Set()
      }
      featureCounts[f.feature_used].add(f.tenant_id)
    }
  })

  const featureAdoption = Object.entries(featureCounts).map(([feature, tenants]) => ({
    feature: feature.charAt(0).toUpperCase() + feature.slice(1),
    adoptionRate: totalTenants ? Math.round((tenants.size / totalTenants) * 100) : 0,
    usage: tenants.size
  })).sort((a, b) => b.adoptionRate - a.adoptionRate)

  // Get engagement trend
  const { data: engagementTrend } = await supabase
    .from('tenant_activity_log')
    .select('created_at, tenant_id')
    .eq('activity_type', 'login')
    .gte('created_at', range.startDate.toISOString())
    .lte('created_at', range.endDate.toISOString())
    .order('created_at', { ascending: true })

  const dailyEngagement: Record<string, { tenants: Set<string>; logins: number }> = {}
  engagementTrend?.forEach(e => {
    const date = e.created_at.split('T')[0]
    if (!dailyEngagement[date]) {
      dailyEngagement[date] = { tenants: new Set(), logins: 0 }
    }
    dailyEngagement[date].tenants.add(e.tenant_id)
    dailyEngagement[date].logins++
  })

  const engagementTrendData = Object.entries(dailyEngagement).map(([date, data]) => ({
    date,
    activeTenants: data.tenants.size,
    logins: data.logins
  }))

  return {
    activeTenants7d: activeTenants7d || 0,
    activeTenants30d: activeTenants30d || 0,
    activeRate7d: totalTenants ? Math.round(((activeTenants7d || 0) / totalTenants) * 100) : 0,
    activeRate30d: totalTenants ? Math.round(((activeTenants30d || 0) / totalTenants) * 100) : 0,
    avgLoginsPerTenant,
    avgSessionDuration,
    featureAdoption,
    engagementTrend: engagementTrendData
  }
}

// ============================================
// GMV METRICS
// ============================================

export async function getGMVMetrics(range: DateRange): Promise<GMVMetrics> {
  const previousPeriod = getPreviousPeriod(range)

  // Get bookings in range
  const { data: currentBookings } = await supabase
    .from('bookings')
    .select('total_amount')
    .gte('created_at', range.startDate.toISOString())
    .lte('created_at', range.endDate.toISOString())
    .in('status', ['confirmed', 'checked_in', 'checked_out', 'completed'])

  const totalGMV = currentBookings?.reduce((sum, b) => sum + (Number(b.total_amount) || 0), 0) || 0
  const totalBookings = currentBookings?.length || 0
  const avgBookingValue = totalBookings > 0 ? Math.round(totalGMV / totalBookings) : 0

  // Get previous period GMV
  const { data: previousBookings } = await supabase
    .from('bookings')
    .select('total_amount')
    .gte('created_at', previousPeriod.startDate.toISOString())
    .lte('created_at', previousPeriod.endDate.toISOString())
    .in('status', ['confirmed', 'checked_in', 'checked_out', 'completed'])

  const previousGMV = previousBookings?.reduce((sum, b) => sum + (Number(b.total_amount) || 0), 0) || 0
  const previousBookingCount = previousBookings?.length || 0
  const previousAvgValue = previousBookingCount > 0 ? Math.round(previousGMV / previousBookingCount) : 0

  // Get active tenants for revenue per tenant calculation
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  const { count: activeTenants } = await supabase
    .from('tenants')
    .select('*', { count: 'exact', head: true })
    .gte('last_activity_at', thirtyDaysAgo.toISOString())

  // Get GMV trend
  const { data: gmvTrend } = await supabase
    .from('bookings')
    .select('created_at, total_amount')
    .gte('created_at', range.startDate.toISOString())
    .lte('created_at', range.endDate.toISOString())
    .in('status', ['confirmed', 'checked_in', 'checked_out', 'completed'])
    .order('created_at', { ascending: true })

  const dailyGMV: Record<string, { gmv: number; bookings: number }> = {}
  gmvTrend?.forEach(b => {
    const date = b.created_at.split('T')[0]
    if (!dailyGMV[date]) {
      dailyGMV[date] = { gmv: 0, bookings: 0 }
    }
    dailyGMV[date].gmv += Number(b.total_amount) || 0
    dailyGMV[date].bookings++
  })

  const gmvTrendData = Object.entries(dailyGMV).map(([date, data]) => ({
    date,
    gmv: Math.round(data.gmv),
    bookings: data.bookings
  }))

  return {
    totalGMV: Math.round(totalGMV),
    gmvGrowth: calculateGrowth(totalGMV, previousGMV),
    totalBookings,
    bookingGrowth: calculateGrowth(totalBookings, previousBookingCount),
    avgBookingValue,
    avgBookingValueGrowth: calculateGrowth(avgBookingValue, previousAvgValue),
    revenuePerActiveTenant: activeTenants ? Math.round(totalGMV / activeTenants) : 0,
    gmvTrend: gmvTrendData
  }
}

// ============================================
// MARKETING ATTRIBUTION METRICS
// ============================================

export async function getMarketingAttributionMetrics(range: DateRange): Promise<MarketingAttributionMetrics> {
  // Get tenants with attribution data
  const { data: tenants } = await supabase
    .from('tenants')
    .select('signup_source, signup_campaign, created_at, first_payment_received_at, activation_score')
    .gte('created_at', range.startDate.toISOString())
    .lte('created_at', range.endDate.toISOString())

  // Source performance
  const sourceStats: Record<string, { signups: number; activated: number; totalDays: number }> = {}
  tenants?.forEach(t => {
    const source = t.signup_source || 'direct'
    if (!sourceStats[source]) {
      sourceStats[source] = { signups: 0, activated: 0, totalDays: 0 }
    }
    sourceStats[source].signups++
    if (t.first_payment_received_at) {
      sourceStats[source].activated++
      const createdAt = new Date(t.created_at)
      const paymentAt = new Date(t.first_payment_received_at)
      sourceStats[source].totalDays += (paymentAt.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24)
    }
  })

  const sourcePerformance = Object.entries(sourceStats).map(([source, stats]) => ({
    source: source.charAt(0).toUpperCase() + source.slice(1),
    signups: stats.signups,
    activated: stats.activated,
    activationRate: stats.signups > 0 ? Math.round((stats.activated / stats.signups) * 100) : 0,
    avgTimeToActivate: stats.activated > 0 ? Math.round(stats.totalDays / stats.activated) : 0,
    estimatedLTV: stats.activated * 500 // Placeholder estimate
  })).sort((a, b) => b.activationRate - a.activationRate)

  // Campaign performance
  const campaignStats: Record<string, { signups: number; activated: number }> = {}
  tenants?.filter(t => t.signup_campaign).forEach(t => {
    const campaign = t.signup_campaign!
    if (!campaignStats[campaign]) {
      campaignStats[campaign] = { signups: 0, activated: 0 }
    }
    campaignStats[campaign].signups++
    if (t.first_payment_received_at) {
      campaignStats[campaign].activated++
    }
  })

  const campaignPerformance = Object.entries(campaignStats).map(([campaign, stats]) => ({
    campaign,
    signups: stats.signups,
    activated: stats.activated,
    activationRate: stats.signups > 0 ? Math.round((stats.activated / stats.signups) * 100) : 0
  })).sort((a, b) => b.activationRate - a.activationRate)

  return {
    sourcePerformance,
    campaignPerformance,
    bestPerformingSource: sourcePerformance[0]?.source || 'N/A',
    bestPerformingCampaign: campaignPerformance[0]?.campaign || 'N/A'
  }
}

// ============================================
// CHURN METRICS
// ============================================

export async function getChurnMetrics(range: DateRange): Promise<ChurnMetrics> {
  const previousPeriod = getPreviousPeriod(range)

  // Get churned tenants in range
  const { data: churnedTenants, count: churnedCount } = await supabase
    .from('tenants')
    .select('churn_reason, created_at, churned_at', { count: 'exact' })
    .gte('churned_at', range.startDate.toISOString())
    .lte('churned_at', range.endDate.toISOString())

  // Get total tenants at start of period for churn rate
  const { count: totalAtStart } = await supabase
    .from('tenants')
    .select('*', { count: 'exact', head: true })
    .lte('created_at', range.startDate.toISOString())

  const churnRate = totalAtStart ? Math.round(((churnedCount || 0) / totalAtStart) * 100 * 10) / 10 : 0

  // Churn reasons
  const reasonCounts: Record<string, number> = {}
  let totalTenure = 0

  churnedTenants?.forEach(t => {
    const reason = t.churn_reason || 'unknown'
    reasonCounts[reason] = (reasonCounts[reason] || 0) + 1

    if (t.created_at && t.churned_at) {
      const created = new Date(t.created_at)
      const churned = new Date(t.churned_at)
      totalTenure += (churned.getTime() - created.getTime()) / (1000 * 60 * 60 * 24)
    }
  })

  const churnReasons = Object.entries(reasonCounts).map(([reason, count]) => ({
    reason: reason.charAt(0).toUpperCase() + reason.slice(1).replace('_', ' '),
    count,
    percentage: churnedCount ? Math.round((count / churnedCount) * 100) : 0
  })).sort((a, b) => b.count - a.count)

  const avgTenure = churnedCount ? Math.round(totalTenure / churnedCount) : 0

  // Churn trend
  const dailyChurn: Record<string, number> = {}
  churnedTenants?.forEach(t => {
    if (t.churned_at) {
      const date = t.churned_at.split('T')[0]
      dailyChurn[date] = (dailyChurn[date] || 0) + 1
    }
  })

  const churnTrend = Object.entries(dailyChurn).map(([date, churned]) => ({
    date,
    churned
  }))

  // At-risk tenants (no activity in 14+ days)
  const fourteenDaysAgo = new Date()
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14)

  const { count: atRiskTenants } = await supabase
    .from('tenants')
    .select('*', { count: 'exact', head: true })
    .lt('last_activity_at', fourteenDaysAgo.toISOString())
    .is('churned_at', null)

  return {
    churnedTenants: churnedCount || 0,
    churnRate,
    churnReasons,
    avgTenureBeforeChurn: avgTenure,
    churnTrend,
    atRiskTenants: atRiskTenants || 0
  }
}

// ============================================
// COMPREHENSIVE GROWTH METRICS
// ============================================

export async function getComprehensiveGrowthMetrics(range: DateRange): Promise<ComprehensiveGrowthMetrics> {
  const [
    tenantGrowth,
    activationFunnel,
    inventory,
    team,
    customers,
    engagement,
    gmv,
    attribution,
    churn
  ] = await Promise.all([
    getTenantGrowthMetrics(range),
    getActivationFunnelMetrics(range),
    getInventoryMetrics(range),
    getTeamMetrics(range),
    getCustomerAcquisitionMetrics(range),
    getEngagementMetrics(range),
    getGMVMetrics(range),
    getMarketingAttributionMetrics(range),
    getChurnMetrics(range)
  ])

  return {
    tenantGrowth,
    activationFunnel,
    inventory,
    team,
    customers,
    engagement,
    gmv,
    attribution,
    churn
  }
}

// ============================================
// ACTIVITY LOGGING HELPERS
// ============================================

export async function logTenantActivity(
  tenantId: string,
  userId: string,
  activityType: string,
  featureUsed?: string,
  sessionDuration?: number,
  metadata?: Record<string, unknown>
): Promise<void> {
  try {
    await supabase.from('tenant_activity_log').insert({
      tenant_id: tenantId,
      user_id: userId,
      activity_type: activityType,
      feature_used: featureUsed,
      session_duration_seconds: sessionDuration,
      metadata: metadata || {}
    })

    // Update last_activity_at on tenant
    await supabase
      .from('tenants')
      .update({ last_activity_at: new Date().toISOString() })
      .eq('id', tenantId)
  } catch (error) {
    console.error('Error logging tenant activity:', error)
  }
}

export async function updateActivationMilestone(
  tenantId: string,
  milestone: 'first_room_created_at' | 'first_booking_created_at' | 'first_payment_received_at'
): Promise<void> {
  try {
    // Only update if not already set
    const { data: tenant } = await supabase
      .from('tenants')
      .select(milestone)
      .eq('id', tenantId)
      .single()

    const tenantRecord = tenant as Record<string, any> | null
    if (tenantRecord && !tenantRecord[milestone]) {
      await supabase
        .from('tenants')
        .update({
          [milestone]: new Date().toISOString(),
          last_activity_at: new Date().toISOString()
        })
        .eq('id', tenantId)

      // Recalculate activation score
      await recalculateActivationScore(tenantId)
    }
  } catch (error) {
    console.error('Error updating activation milestone:', error)
  }
}

async function recalculateActivationScore(tenantId: string): Promise<void> {
  const { data: tenant } = await supabase
    .from('tenants')
    .select('first_room_created_at, first_booking_created_at, first_payment_received_at, owner_user_id')
    .eq('id', tenantId)
    .single()

  if (!tenant) return

  // Check for team members
  const { count: teamMembers } = await supabase
    .from('tenant_members')
    .select('*', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .eq('status', 'active')
    .neq('user_id', tenant.owner_user_id)

  let score = 0
  if (tenant.first_room_created_at) score += 25
  if (tenant.first_booking_created_at) score += 25
  if (tenant.first_payment_received_at) score += 25
  if (teamMembers && teamMembers > 0) score += 25

  await supabase
    .from('tenants')
    .update({ activation_score: score })
    .eq('id', tenantId)
}

export default {
  getTenantGrowthMetrics,
  getActivationFunnelMetrics,
  getInventoryMetrics,
  getTeamMetrics,
  getCustomerAcquisitionMetrics,
  getEngagementMetrics,
  getGMVMetrics,
  getMarketingAttributionMetrics,
  getChurnMetrics,
  getComprehensiveGrowthMetrics,
  logTenantActivity,
  updateActivationMilestone
}

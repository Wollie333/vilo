import { supabase } from '../lib/supabase.js'

// ============================================
// ANALYTICS SERVICE
// Core calculations for hospitality metrics
// ============================================

export interface HospitalityKPIs {
  revpar: number           // Revenue Per Available Room
  adr: number              // Average Daily Rate
  occupancyRate: number    // Percentage
  lengthOfStay: number     // Average nights
  bookingLeadTime: number  // Average days before check-in
  cancellationRate: number // Percentage
  guestSatisfaction: number // Average rating
  repeatGuestRate: number  // Percentage
}

export interface DashboardSummary {
  totalRevenue: number
  totalBookings: number
  occupancyRate: number
  averageRating: number
  revpar: number
  adr: number
  totalSessions: number
  totalPageViews: number
  conversionRate: number
  trends: {
    revenue: number
    bookings: number
    occupancy: number
    rating: number
  }
}

export interface RevenueBreakdown {
  total: number
  byRoom: Array<{ room_id: string; room_name: string; revenue: number; bookings: number }>
  bySource: Array<{ source: string; revenue: number; count: number }>
  byStatus: Array<{ status: string; revenue: number; count: number }>
  trend: Array<{ date: string; revenue: number }>
}

export interface ConversionFunnel {
  views: number
  uniqueVisitors: number
  inquiries: number
  bookingsStarted: number
  bookingsCompleted: number
  conversionRate: number
  viewToInquiryRate: number
  inquiryToBookingRate: number
}

export interface CustomerSegment {
  segment: string
  count: number
  revenue: number
  avgBookingValue: number
}

// Helper: Parse date string as local date
function parseLocalDate(dateStr: string): Date {
  // Handle both YYYY-MM-DD and YYYY-MM-DDTHH:MM:SS formats
  const dateOnly = dateStr.split('T')[0]
  const [year, month, day] = dateOnly.split('-').map(Number)
  return new Date(year, month - 1, day)
}

// Helper: Format date as YYYY-MM-DD
function formatDate(date: Date): string {
  return date.toISOString().split('T')[0]
}

// Helper: Get date range
function getDateRange(startDate: string, endDate: string): { start: Date; end: Date } {
  return {
    start: parseLocalDate(startDate),
    end: parseLocalDate(endDate)
  }
}

// Helper: Calculate percentage change
function percentageChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0
  return ((current - previous) / previous) * 100
}

/**
 * Get dashboard summary with KPIs
 */
export async function getDashboardSummary(
  tenantId: string,
  startDate: string,
  endDate: string
): Promise<DashboardSummary> {
  // Calculate previous period for comparison
  const { start, end } = getDateRange(startDate, endDate)
  const daysDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
  const prevStart = new Date(start)
  prevStart.setDate(prevStart.getDate() - daysDiff)
  const prevStartStr = formatDate(prevStart)
  const prevEndStr = startDate

  // Extract date-only parts for check_in comparisons
  const startDateOnly = startDate.split('T')[0]
  const endDateOnly = endDate.split('T')[0]
  const prevStartDateOnly = prevStartStr.split('T')[0]

  // Fetch current period data in parallel
  // Use check_in dates for booking metrics (shows stays happening in period)
  const [
    bookingsData,
    prevBookingsData,
    reviewsData,
    sessionsData,
    pageViewsData,
    roomsData
  ] = await Promise.all([
    // Current period bookings - by check_in date (stays happening in this period)
    supabase
      .from('bookings')
      .select('id, total_amount, status, check_in, check_out, source')
      .eq('tenant_id', tenantId)
      .gte('check_in', startDateOnly)
      .lte('check_in', endDateOnly),
    // Previous period bookings - by check_in date
    supabase
      .from('bookings')
      .select('id, total_amount, status')
      .eq('tenant_id', tenantId)
      .gte('check_in', prevStartDateOnly)
      .lt('check_in', startDateOnly),
    // Reviews
    supabase
      .from('reviews')
      .select('rating')
      .eq('tenant_id', tenantId)
      .gte('created_at', startDate)
      .lte('created_at', endDate),
    // Sessions (analytics table - may not exist)
    supabase
      .from('analytics_sessions')
      .select('id, converted')
      .eq('tenant_id', tenantId)
      .gte('started_at', startDate)
      .lte('started_at', endDate),
    // Page views (analytics table - may not exist)
    supabase
      .from('analytics_page_views')
      .select('id')
      .eq('tenant_id', tenantId)
      .gte('created_at', startDate)
      .lte('created_at', endDate),
    // Rooms for occupancy
    supabase
      .from('rooms')
      .select('id, total_units')
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
  ])

  const bookings = bookingsData.data || []
  const prevBookings = prevBookingsData.data || []
  const reviews = reviewsData.data || []
  const sessions = sessionsData.data || []
  const pageViews = pageViewsData.data || []
  const rooms = roomsData.data || []

  // Calculate metrics
  const activeBookings = bookings.filter(b => b.status !== 'cancelled')
  const prevActiveBookings = prevBookings.filter(b => b.status !== 'cancelled')

  const totalRevenue = activeBookings.reduce((sum, b) => sum + (b.total_amount || 0), 0)
  const prevRevenue = prevActiveBookings.reduce((sum, b) => sum + (b.total_amount || 0), 0)

  const totalBookings = activeBookings.length
  const prevTotalBookings = prevActiveBookings.length

  // Average rating
  const avgRating = reviews.length > 0
    ? reviews.reduce((sum, r) => sum + (r.rating || 0), 0) / reviews.length
    : 0

  // Occupancy calculation
  const totalUnits = rooms.reduce((sum, r) => sum + (r.total_units || 1), 0)
  const availableNights = totalUnits * daysDiff

  // Count occupied nights in the period
  let occupiedNights = 0
  for (const booking of activeBookings) {
    if (!booking.check_in || !booking.check_out) continue
    const checkIn = parseLocalDate(booking.check_in)
    const checkOut = parseLocalDate(booking.check_out)
    const effectiveStart = checkIn < start ? start : checkIn
    const effectiveEnd = checkOut > end ? end : checkOut
    if (effectiveStart < effectiveEnd) {
      occupiedNights += Math.ceil((effectiveEnd.getTime() - effectiveStart.getTime()) / (1000 * 60 * 60 * 24))
    }
  }
  const occupancyRate = availableNights > 0 ? (occupiedNights / availableNights) * 100 : 0

  // RevPAR and ADR
  const revpar = availableNights > 0 ? totalRevenue / availableNights : 0
  const roomsSold = occupiedNights // Simplified: one booking = one room
  const adr = roomsSold > 0 ? totalRevenue / roomsSold : 0

  // Conversion rate
  const totalSessions = sessions.length
  const convertedSessions = sessions.filter(s => s.converted).length
  const conversionRate = totalSessions > 0 ? (convertedSessions / totalSessions) * 100 : 0

  return {
    totalRevenue,
    totalBookings,
    occupancyRate: Math.round(occupancyRate * 10) / 10,
    averageRating: Math.round(avgRating * 10) / 10,
    revpar: Math.round(revpar * 100) / 100,
    adr: Math.round(adr * 100) / 100,
    totalSessions,
    totalPageViews: pageViews.length,
    conversionRate: Math.round(conversionRate * 100) / 100,
    trends: {
      revenue: Math.round(percentageChange(totalRevenue, prevRevenue) * 10) / 10,
      bookings: Math.round(percentageChange(totalBookings, prevTotalBookings) * 10) / 10,
      occupancy: 0, // Would need previous period occupancy
      rating: 0
    }
  }
}

/**
 * Get trend data for sparklines
 */
export async function getTrendData(
  tenantId: string,
  startDate: string,
  endDate: string,
  metric: 'revenue' | 'bookings' | 'sessions' | 'pageviews'
): Promise<Array<{ date: string; value: number }>> {
  const trends: Array<{ date: string; value: number }> = []
  const { start, end } = getDateRange(startDate, endDate)

  // Generate date range
  const dates: string[] = []
  const current = new Date(start)
  while (current <= end) {
    dates.push(formatDate(current))
    current.setDate(current.getDate() + 1)
  }

  if (metric === 'revenue' || metric === 'bookings') {
    // Use check_in date for revenue/booking trends (shows when stays happen)
    const startDateOnly = startDate.split('T')[0]
    const endDateOnly = endDate.split('T')[0]

    const { data } = await supabase
      .from('bookings')
      .select('check_in, total_amount, status')
      .eq('tenant_id', tenantId)
      .gte('check_in', startDateOnly)
      .lte('check_in', endDateOnly)
      .neq('status', 'cancelled')

    const bookings = data || []
    const byDate: Record<string, { revenue: number; count: number }> = {}

    for (const booking of bookings) {
      const date = booking.check_in.split('T')[0]
      if (!byDate[date]) byDate[date] = { revenue: 0, count: 0 }
      byDate[date].revenue += booking.total_amount || 0
      byDate[date].count += 1
    }

    for (const date of dates) {
      trends.push({
        date,
        value: metric === 'revenue' ? (byDate[date]?.revenue || 0) : (byDate[date]?.count || 0)
      })
    }
  } else if (metric === 'sessions') {
    const { data } = await supabase
      .from('analytics_sessions')
      .select('started_at')
      .eq('tenant_id', tenantId)
      .gte('started_at', startDate)
      .lte('started_at', endDate)

    const sessions = data || []
    const byDate: Record<string, number> = {}

    for (const session of sessions) {
      const date = session.started_at.split('T')[0]
      byDate[date] = (byDate[date] || 0) + 1
    }

    for (const date of dates) {
      trends.push({ date, value: byDate[date] || 0 })
    }
  } else if (metric === 'pageviews') {
    const { data } = await supabase
      .from('analytics_page_views')
      .select('created_at')
      .eq('tenant_id', tenantId)
      .gte('created_at', startDate)
      .lte('created_at', endDate)

    const views = data || []
    const byDate: Record<string, number> = {}

    for (const view of views) {
      const date = view.created_at.split('T')[0]
      byDate[date] = (byDate[date] || 0) + 1
    }

    for (const date of dates) {
      trends.push({ date, value: byDate[date] || 0 })
    }
  }

  return trends
}

/**
 * Get revenue breakdown
 */
export async function getRevenueBreakdown(
  tenantId: string,
  startDate: string,
  endDate: string
): Promise<RevenueBreakdown> {
  // Use check_in date for revenue breakdown (shows revenue from stays in period)
  const startDateOnly = startDate.split('T')[0]
  const endDateOnly = endDate.split('T')[0]

  const { data: bookings } = await supabase
    .from('bookings')
    .select('id, total_amount, room_id, room_name, source, status, check_in')
    .eq('tenant_id', tenantId)
    .gte('check_in', startDateOnly)
    .lte('check_in', endDateOnly)
    .neq('status', 'cancelled')

  const activeBookings = bookings || []

  // Total revenue
  const total = activeBookings.reduce((sum, b) => sum + (b.total_amount || 0), 0)

  // By room
  const byRoomMap: Record<string, { room_name: string; revenue: number; bookings: number }> = {}
  for (const booking of activeBookings) {
    const roomId = booking.room_id || 'unknown'
    if (!byRoomMap[roomId]) {
      byRoomMap[roomId] = { room_name: booking.room_name || 'Unknown', revenue: 0, bookings: 0 }
    }
    byRoomMap[roomId].revenue += booking.total_amount || 0
    byRoomMap[roomId].bookings += 1
  }
  const byRoom = Object.entries(byRoomMap)
    .map(([room_id, data]) => ({ room_id, ...data }))
    .sort((a, b) => b.revenue - a.revenue)

  // By source
  const bySourceMap: Record<string, { revenue: number; count: number }> = {}
  for (const booking of activeBookings) {
    const source = booking.source || 'direct'
    if (!bySourceMap[source]) bySourceMap[source] = { revenue: 0, count: 0 }
    bySourceMap[source].revenue += booking.total_amount || 0
    bySourceMap[source].count += 1
  }
  const bySource = Object.entries(bySourceMap)
    .map(([source, data]) => ({ source, ...data }))
    .sort((a, b) => b.revenue - a.revenue)

  // By status
  const byStatusMap: Record<string, { revenue: number; count: number }> = {}
  for (const booking of activeBookings) {
    const status = booking.status || 'pending'
    if (!byStatusMap[status]) byStatusMap[status] = { revenue: 0, count: 0 }
    byStatusMap[status].revenue += booking.total_amount || 0
    byStatusMap[status].count += 1
  }
  const byStatus = Object.entries(byStatusMap)
    .map(([status, data]) => ({ status, ...data }))

  // Trend by date (using check_in date)
  const trendMap: Record<string, number> = {}
  for (const booking of activeBookings) {
    const date = booking.check_in.split('T')[0]
    trendMap[date] = (trendMap[date] || 0) + (booking.total_amount || 0)
  }
  const trend = Object.entries(trendMap)
    .map(([date, revenue]) => ({ date, revenue }))
    .sort((a, b) => a.date.localeCompare(b.date))

  return { total, byRoom, bySource, byStatus, trend }
}

/**
 * Get conversion funnel data
 */
export async function getConversionFunnel(
  tenantId: string,
  startDate: string,
  endDate: string
): Promise<ConversionFunnel> {
  const startDateOnly = startDate.split('T')[0]
  const endDateOnly = endDate.split('T')[0]

  const [sessionsData, eventsData, bookingsData] = await Promise.all([
    supabase
      .from('analytics_sessions')
      .select('id, converted, conversion_type')
      .eq('tenant_id', tenantId)
      .gte('started_at', startDate)
      .lte('started_at', endDate),
    supabase
      .from('analytics_events')
      .select('event_type, event_category')
      .eq('tenant_id', tenantId)
      .gte('created_at', startDate)
      .lte('created_at', endDate),
    // Use check_in for completed bookings in the period
    supabase
      .from('bookings')
      .select('id')
      .eq('tenant_id', tenantId)
      .gte('check_in', startDateOnly)
      .lte('check_in', endDateOnly)
      .neq('status', 'cancelled')
  ])

  const sessions = sessionsData.data || []
  const events = eventsData.data || []
  const bookings = bookingsData.data || []

  const views = sessions.length
  const uniqueVisitors = sessions.length // Each session is unique visitor

  // Count inquiry events
  const inquiries = events.filter(e =>
    e.event_type === 'inquiry_submit' || e.event_type === 'contact_host'
  ).length

  // Count booking started events
  const bookingsStarted = events.filter(e =>
    e.event_type === 'checkout_started' || e.event_type === 'booking_started'
  ).length

  const bookingsCompleted = bookings.length

  // Calculate rates
  const conversionRate = views > 0 ? (bookingsCompleted / views) * 100 : 0
  const viewToInquiryRate = views > 0 ? (inquiries / views) * 100 : 0
  const inquiryToBookingRate = inquiries > 0 ? (bookingsCompleted / inquiries) * 100 : 0

  return {
    views,
    uniqueVisitors,
    inquiries,
    bookingsStarted,
    bookingsCompleted,
    conversionRate: Math.round(conversionRate * 100) / 100,
    viewToInquiryRate: Math.round(viewToInquiryRate * 100) / 100,
    inquiryToBookingRate: Math.round(inquiryToBookingRate * 100) / 100
  }
}

/**
 * Get room performance data
 */
export async function getRoomPerformance(
  tenantId: string,
  startDate: string,
  endDate: string
): Promise<Array<{
  room_id: string
  room_name: string
  views: number
  bookings: number
  revenue: number
  occupancyRate: number
  conversionRate: number
}>> {
  const startDateOnly = startDate.split('T')[0]
  const endDateOnly = endDate.split('T')[0]

  const [roomsData, viewsData, bookingsData] = await Promise.all([
    supabase
      .from('rooms')
      .select('id, name, total_units')
      .eq('tenant_id', tenantId)
      .eq('is_active', true),
    supabase
      .from('analytics_page_views')
      .select('room_id')
      .eq('tenant_id', tenantId)
      .eq('page_type', 'room')
      .gte('created_at', startDate)
      .lte('created_at', endDate),
    // Use check_in for bookings in the period
    supabase
      .from('bookings')
      .select('room_id, total_amount, check_in, check_out')
      .eq('tenant_id', tenantId)
      .gte('check_in', startDateOnly)
      .lte('check_in', endDateOnly)
      .neq('status', 'cancelled')
  ])

  const rooms = roomsData.data || []
  const views = viewsData.data || []
  const bookings = bookingsData.data || []

  const { start, end } = getDateRange(startDate, endDate)
  const daysDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))

  // Count views per room
  const viewsByRoom: Record<string, number> = {}
  for (const view of views) {
    if (view.room_id) {
      viewsByRoom[view.room_id] = (viewsByRoom[view.room_id] || 0) + 1
    }
  }

  // Calculate metrics per room
  const roomMetrics = rooms.map(room => {
    const roomViews = viewsByRoom[room.id] || 0
    const roomBookings = bookings.filter(b => b.room_id === room.id)
    const roomBookingCount = roomBookings.length
    const roomRevenue = roomBookings.reduce((sum, b) => sum + (b.total_amount || 0), 0)

    // Calculate occupancy
    const totalUnits = room.total_units || 1
    const availableNights = totalUnits * daysDiff
    let occupiedNights = 0
    for (const booking of roomBookings) {
      if (!booking.check_in || !booking.check_out) continue
      const checkIn = parseLocalDate(booking.check_in)
      const checkOut = parseLocalDate(booking.check_out)
      const effectiveStart = checkIn < start ? start : checkIn
      const effectiveEnd = checkOut > end ? end : checkOut
      if (effectiveStart < effectiveEnd) {
        occupiedNights += Math.ceil((effectiveEnd.getTime() - effectiveStart.getTime()) / (1000 * 60 * 60 * 24))
      }
    }
    const occupancyRate = availableNights > 0 ? (occupiedNights / availableNights) * 100 : 0

    // Conversion rate
    const conversionRate = roomViews > 0 ? (roomBookingCount / roomViews) * 100 : 0

    return {
      room_id: room.id,
      room_name: room.name,
      views: roomViews,
      bookings: roomBookingCount,
      revenue: Math.round(roomRevenue * 100) / 100,
      occupancyRate: Math.round(occupancyRate * 10) / 10,
      conversionRate: Math.round(conversionRate * 100) / 100
    }
  })

  return roomMetrics.sort((a, b) => b.revenue - a.revenue)
}

/**
 * Get traffic sources breakdown
 */
export async function getTrafficSources(
  tenantId: string,
  startDate: string,
  endDate: string
): Promise<Array<{ source: string; sessions: number; pageViews: number; conversions: number; conversionRate: number }>> {
  const { data: sessions } = await supabase
    .from('analytics_sessions')
    .select('id, entry_source, converted, page_count')
    .eq('tenant_id', tenantId)
    .gte('started_at', startDate)
    .lte('started_at', endDate)

  const sessionList = sessions || []

  const bySource: Record<string, { sessions: number; pageViews: number; conversions: number }> = {}

  for (const session of sessionList) {
    const source = session.entry_source || 'direct'
    if (!bySource[source]) {
      bySource[source] = { sessions: 0, pageViews: 0, conversions: 0 }
    }
    bySource[source].sessions += 1
    bySource[source].pageViews += session.page_count || 0
    if (session.converted) bySource[source].conversions += 1
  }

  return Object.entries(bySource)
    .map(([source, data]) => ({
      source,
      ...data,
      conversionRate: data.sessions > 0
        ? Math.round((data.conversions / data.sessions) * 10000) / 100
        : 0
    }))
    .sort((a, b) => b.sessions - a.sessions)
}

/**
 * Get customer segments
 */
export async function getCustomerSegments(
  tenantId: string,
  startDate: string,
  endDate: string
): Promise<CustomerSegment[]> {
  const { data: bookings } = await supabase
    .from('bookings')
    .select('guest_email, total_amount, created_at')
    .eq('tenant_id', tenantId)
    .neq('status', 'cancelled')

  const allBookings = bookings || []

  // Group bookings by customer
  const customerBookings: Record<string, { bookings: number; totalRevenue: number; firstBooking: string }> = {}

  for (const booking of allBookings) {
    const email = booking.guest_email || 'unknown'
    if (!customerBookings[email]) {
      customerBookings[email] = { bookings: 0, totalRevenue: 0, firstBooking: booking.created_at }
    }
    customerBookings[email].bookings += 1
    customerBookings[email].totalRevenue += booking.total_amount || 0
    if (booking.created_at < customerBookings[email].firstBooking) {
      customerBookings[email].firstBooking = booking.created_at
    }
  }

  // Segment customers
  const { start } = getDateRange(startDate, endDate)
  const segments: Record<string, { count: number; revenue: number }> = {
    'New': { count: 0, revenue: 0 },
    'Returning': { count: 0, revenue: 0 },
    'VIP': { count: 0, revenue: 0 }
  }

  for (const [, data] of Object.entries(customerBookings)) {
    const firstBookingDate = new Date(data.firstBooking)

    if (data.bookings >= 3 || data.totalRevenue >= 10000) {
      segments['VIP'].count += 1
      segments['VIP'].revenue += data.totalRevenue
    } else if (firstBookingDate >= start) {
      segments['New'].count += 1
      segments['New'].revenue += data.totalRevenue
    } else {
      segments['Returning'].count += 1
      segments['Returning'].revenue += data.totalRevenue
    }
  }

  return Object.entries(segments).map(([segment, data]) => ({
    segment,
    count: data.count,
    revenue: Math.round(data.revenue * 100) / 100,
    avgBookingValue: data.count > 0 ? Math.round((data.revenue / data.count) * 100) / 100 : 0
  }))
}

/**
 * Get review analytics
 */
export async function getReviewAnalytics(
  tenantId: string,
  startDate: string,
  endDate: string
): Promise<{
  totalReviews: number
  averageRating: number
  ratingDistribution: Record<number, number>
  categoryRatings: {
    cleanliness: number
    service: number
    location: number
    value: number
    safety: number
  }
  responseRate: number
}> {
  const { data: reviews } = await supabase
    .from('reviews')
    .select('rating, rating_cleanliness, rating_service, rating_location, rating_value, rating_safety, owner_response')
    .eq('tenant_id', tenantId)
    .gte('created_at', startDate)
    .lte('created_at', endDate)
    .eq('status', 'published')

  const reviewList = reviews || []

  if (reviewList.length === 0) {
    return {
      totalReviews: 0,
      averageRating: 0,
      ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
      categoryRatings: { cleanliness: 0, service: 0, location: 0, value: 0, safety: 0 },
      responseRate: 0
    }
  }

  const totalReviews = reviewList.length
  const averageRating = reviewList.reduce((sum, r) => sum + (r.rating || 0), 0) / totalReviews

  // Rating distribution
  const ratingDistribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
  for (const review of reviewList) {
    const rating = Math.round(review.rating || 0)
    if (rating >= 1 && rating <= 5) {
      ratingDistribution[rating] += 1
    }
  }

  // Category ratings
  const categorySum = { cleanliness: 0, service: 0, location: 0, value: 0, safety: 0 }
  const categoryCount = { cleanliness: 0, service: 0, location: 0, value: 0, safety: 0 }

  for (const review of reviewList) {
    if (review.rating_cleanliness) { categorySum.cleanliness += review.rating_cleanliness; categoryCount.cleanliness += 1 }
    if (review.rating_service) { categorySum.service += review.rating_service; categoryCount.service += 1 }
    if (review.rating_location) { categorySum.location += review.rating_location; categoryCount.location += 1 }
    if (review.rating_value) { categorySum.value += review.rating_value; categoryCount.value += 1 }
    if (review.rating_safety) { categorySum.safety += review.rating_safety; categoryCount.safety += 1 }
  }

  const categoryRatings = {
    cleanliness: categoryCount.cleanliness > 0 ? Math.round((categorySum.cleanliness / categoryCount.cleanliness) * 10) / 10 : 0,
    service: categoryCount.service > 0 ? Math.round((categorySum.service / categoryCount.service) * 10) / 10 : 0,
    location: categoryCount.location > 0 ? Math.round((categorySum.location / categoryCount.location) * 10) / 10 : 0,
    value: categoryCount.value > 0 ? Math.round((categorySum.value / categoryCount.value) * 10) / 10 : 0,
    safety: categoryCount.safety > 0 ? Math.round((categorySum.safety / categoryCount.safety) * 10) / 10 : 0
  }

  // Response rate
  const reviewsWithResponse = reviewList.filter(r => r.owner_response).length
  const responseRate = (reviewsWithResponse / totalReviews) * 100

  return {
    totalReviews,
    averageRating: Math.round(averageRating * 10) / 10,
    ratingDistribution,
    categoryRatings,
    responseRate: Math.round(responseRate * 10) / 10
  }
}

/**
 * Calculate all hospitality KPIs
 */
export async function calculateHospitalityKPIs(
  tenantId: string,
  startDate: string,
  endDate: string
): Promise<HospitalityKPIs> {
  const startDateOnly = startDate.split('T')[0]
  const endDateOnly = endDate.split('T')[0]

  const [bookingsData, roomsData, reviewsData] = await Promise.all([
    // Use check_in for KPIs (shows performance for stays in this period)
    supabase
      .from('bookings')
      .select('id, total_amount, guest_email, check_in, check_out, status, created_at')
      .eq('tenant_id', tenantId)
      .gte('check_in', startDateOnly)
      .lte('check_in', endDateOnly),
    supabase
      .from('rooms')
      .select('id, total_units')
      .eq('tenant_id', tenantId)
      .eq('is_active', true),
    supabase
      .from('reviews')
      .select('rating')
      .eq('tenant_id', tenantId)
      .gte('created_at', startDate)
      .lte('created_at', endDate)
  ])

  const allBookings = bookingsData.data || []
  const activeBookings = allBookings.filter(b => b.status !== 'cancelled')
  const cancelledBookings = allBookings.filter(b => b.status === 'cancelled')
  const rooms = roomsData.data || []
  const reviews = reviewsData.data || []

  const { start, end } = getDateRange(startDate, endDate)
  const daysDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))

  // Total units and available nights
  const totalUnits = rooms.reduce((sum, r) => sum + (r.total_units || 1), 0)
  const availableRoomNights = totalUnits * daysDiff

  // Revenue
  const totalRevenue = activeBookings.reduce((sum, b) => sum + (b.total_amount || 0), 0)

  // Rooms sold (occupied nights)
  let roomNightsSold = 0
  for (const booking of activeBookings) {
    if (!booking.check_in || !booking.check_out) continue
    const checkIn = parseLocalDate(booking.check_in)
    const checkOut = parseLocalDate(booking.check_out)
    const effectiveStart = checkIn < start ? start : checkIn
    const effectiveEnd = checkOut > end ? end : checkOut
    if (effectiveStart < effectiveEnd) {
      roomNightsSold += Math.ceil((effectiveEnd.getTime() - effectiveStart.getTime()) / (1000 * 60 * 60 * 24))
    }
  }

  // RevPAR = Total Revenue / Available Room Nights
  const revpar = availableRoomNights > 0 ? totalRevenue / availableRoomNights : 0

  // ADR = Total Revenue / Rooms Sold
  const adr = roomNightsSold > 0 ? totalRevenue / roomNightsSold : 0

  // Occupancy Rate = Rooms Sold / Available Rooms × 100
  const occupancyRate = availableRoomNights > 0 ? (roomNightsSold / availableRoomNights) * 100 : 0

  // Length of Stay
  let totalNights = 0
  for (const booking of activeBookings) {
    if (!booking.check_in || !booking.check_out) continue
    const checkIn = parseLocalDate(booking.check_in)
    const checkOut = parseLocalDate(booking.check_out)
    totalNights += Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24))
  }
  const lengthOfStay = activeBookings.length > 0 ? totalNights / activeBookings.length : 0

  // Booking Lead Time = Average days between booking date and check-in
  let totalLeadTime = 0
  let leadTimeCount = 0
  for (const booking of activeBookings) {
    if (!booking.check_in || !booking.created_at) continue
    const checkIn = parseLocalDate(booking.check_in)
    const created = new Date(booking.created_at)
    const leadDays = Math.ceil((checkIn.getTime() - created.getTime()) / (1000 * 60 * 60 * 24))
    if (leadDays >= 0) {
      totalLeadTime += leadDays
      leadTimeCount += 1
    }
  }
  const bookingLeadTime = leadTimeCount > 0 ? totalLeadTime / leadTimeCount : 0

  // Cancellation Rate
  const cancellationRate = allBookings.length > 0
    ? (cancelledBookings.length / allBookings.length) * 100
    : 0

  // Guest Satisfaction (average rating)
  const guestSatisfaction = reviews.length > 0
    ? reviews.reduce((sum, r) => sum + (r.rating || 0), 0) / reviews.length
    : 0

  // Repeat Guest Rate
  const guestEmails = activeBookings.map(b => b.guest_email).filter(Boolean)
  const uniqueGuests = new Set(guestEmails).size
  const repeatGuests = guestEmails.length - uniqueGuests
  const repeatGuestRate = guestEmails.length > 0 ? (repeatGuests / guestEmails.length) * 100 : 0

  return {
    revpar: Math.round(revpar * 100) / 100,
    adr: Math.round(adr * 100) / 100,
    occupancyRate: Math.round(occupancyRate * 10) / 10,
    lengthOfStay: Math.round(lengthOfStay * 10) / 10,
    bookingLeadTime: Math.round(bookingLeadTime),
    cancellationRate: Math.round(cancellationRate * 10) / 10,
    guestSatisfaction: Math.round(guestSatisfaction * 10) / 10,
    repeatGuestRate: Math.round(repeatGuestRate * 10) / 10
  }
}

/**
 * Aggregate daily metrics (called by cron job)
 */
export async function aggregateDailyMetrics(
  tenantId: string,
  date: string
): Promise<void> {
  const nextDay = new Date(parseLocalDate(date))
  nextDay.setDate(nextDay.getDate() + 1)
  const endDate = formatDate(nextDay)

  // Gather all metrics for the day
  const [sessionsData, pageViewsData, bookingsData, reviewsData, roomsData] = await Promise.all([
    supabase
      .from('analytics_sessions')
      .select('id, converted, entry_source, device_type')
      .eq('tenant_id', tenantId)
      .gte('started_at', date)
      .lt('started_at', endDate),
    supabase
      .from('analytics_page_views')
      .select('id, room_id')
      .eq('tenant_id', tenantId)
      .gte('created_at', date)
      .lt('created_at', endDate),
    supabase
      .from('bookings')
      .select('id, total_amount, status, check_in, check_out')
      .eq('tenant_id', tenantId)
      .gte('created_at', date)
      .lt('created_at', endDate),
    supabase
      .from('reviews')
      .select('id, rating')
      .eq('tenant_id', tenantId)
      .gte('created_at', date)
      .lt('created_at', endDate),
    supabase
      .from('rooms')
      .select('id, total_units')
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
  ])

  const sessions = sessionsData.data || []
  const pageViews = pageViewsData.data || []
  const bookings = bookingsData.data || []
  const reviews = reviewsData.data || []
  const rooms = roomsData.data || []

  const activeBookings = bookings.filter(b => b.status !== 'cancelled')
  const totalRevenue = activeBookings.reduce((sum, b) => sum + (b.total_amount || 0), 0)

  // Room views
  const roomViews: Record<string, number> = {}
  for (const view of pageViews) {
    if (view.room_id) {
      roomViews[view.room_id] = (roomViews[view.room_id] || 0) + 1
    }
  }

  // Traffic sources
  const trafficSources: Record<string, number> = {}
  for (const session of sessions) {
    const source = session.entry_source || 'direct'
    trafficSources[source] = (trafficSources[source] || 0) + 1
  }

  // Device breakdown
  const deviceBreakdown: Record<string, number> = {}
  for (const session of sessions) {
    const device = session.device_type || 'desktop'
    deviceBreakdown[device] = (deviceBreakdown[device] || 0) + 1
  }

  // Occupancy
  const totalUnits = rooms.reduce((sum, r) => sum + (r.total_units || 1), 0)
  const dateObj = parseLocalDate(date)
  let occupiedRooms = 0
  // Would need to check all bookings for this specific date
  const { data: allBookings } = await supabase
    .from('bookings')
    .select('check_in, check_out, status')
    .eq('tenant_id', tenantId)
    .in('status', ['confirmed', 'checked_in'])
    .lte('check_in', date)
    .gt('check_out', date)

  occupiedRooms = (allBookings || []).length
  const occupancyRate = totalUnits > 0 ? (occupiedRooms / totalUnits) * 100 : 0

  // Average rating
  const avgRating = reviews.length > 0
    ? reviews.reduce((sum, r) => sum + (r.rating || 0), 0) / reviews.length
    : null

  // Conversion rate
  const convertedSessions = sessions.filter(s => s.converted).length
  const conversionRate = sessions.length > 0 ? convertedSessions / sessions.length : 0

  // Upsert daily metrics
  const { error } = await supabase
    .from('analytics_daily_metrics')
    .upsert({
      tenant_id: tenantId,
      metric_date: date,
      total_sessions: sessions.length,
      unique_visitors: sessions.length,
      total_page_views: pageViews.length,
      total_bookings: activeBookings.length,
      booking_conversion_rate: conversionRate,
      total_revenue: totalRevenue,
      average_booking_value: activeBookings.length > 0 ? totalRevenue / activeBookings.length : 0,
      occupied_room_nights: occupiedRooms,
      available_room_nights: totalUnits,
      occupancy_rate: occupancyRate,
      new_reviews: reviews.length,
      average_rating: avgRating,
      room_views: roomViews,
      traffic_sources: trafficSources,
      device_breakdown: deviceBreakdown,
      updated_at: new Date().toISOString()
    }, {
      onConflict: 'tenant_id,metric_date'
    })

  if (error) {
    console.error('Error aggregating daily metrics:', error)
    throw error
  }
}

// ============================================
// REFUND ANALYTICS
// ============================================

export interface RefundAnalytics {
  summary: {
    totalRefunds: number
    totalRefundedAmount: number
    averageRefundAmount: number
    refundRate: number           // % of bookings refunded
    pendingRefundsCount: number
    pendingRefundsAmount: number
  }
  byStatus: Array<{ status: string; count: number; amount: number; percentage: number }>
  processingTime: {
    averageRequestToCompletion: number  // hours
    averageRequestToApproval: number    // hours
    fastestCompletion: number
    slowestCompletion: number
  }
  byPolicy: Array<{ policyLabel: string; refundPercentage: number; count: number; totalAmount: number }>
  cancellationTiming: {
    sameDay: number       // 0 days before check-in
    lastMinute: number    // 1-2 days
    shortNotice: number   // 3-7 days
    standard: number      // 8-14 days
    advance: number       // 15-30 days
    earlyBird: number     // 31+ days
  }
  trend: Array<{ date: string; count: number; amount: number }>
  comparison: {
    currentPeriod: { count: number; amount: number }
    previousPeriod: { count: number; amount: number }
    countChange: number   // percentage change
    amountChange: number  // percentage change
  }
}

/**
 * Get comprehensive refund analytics
 */
export async function getRefundAnalytics(
  tenantId: string,
  startDate: string,
  endDate: string
): Promise<RefundAnalytics> {
  // Calculate previous period for comparison
  const { start, end } = getDateRange(startDate, endDate)
  const daysDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
  const prevStart = new Date(start)
  prevStart.setDate(prevStart.getDate() - daysDiff)
  const prevStartStr = formatDate(prevStart)

  // Fetch refunds and bookings in parallel
  const [refundsData, prevRefundsData, bookingsData] = await Promise.all([
    // Current period refunds
    supabase
      .from('refunds')
      .select('*')
      .eq('tenant_id', tenantId)
      .gte('requested_at', startDate)
      .lte('requested_at', endDate),
    // Previous period refunds
    supabase
      .from('refunds')
      .select('id, processed_amount, status')
      .eq('tenant_id', tenantId)
      .gte('requested_at', prevStartStr)
      .lt('requested_at', startDate),
    // Total bookings in current period for refund rate
    supabase
      .from('bookings')
      .select('id')
      .eq('tenant_id', tenantId)
      .gte('created_at', startDate)
      .lte('created_at', endDate)
  ])

  const refunds = refundsData.data || []
  const prevRefunds = prevRefundsData.data || []
  const bookings = bookingsData.data || []

  // === SUMMARY METRICS ===
  const totalRefunds = refunds.length
  const completedRefunds = refunds.filter(r => r.status === 'completed')
  const totalRefundedAmount = completedRefunds.reduce((sum, r) => sum + (r.processed_amount || 0), 0)
  const averageRefundAmount = completedRefunds.length > 0 ? totalRefundedAmount / completedRefunds.length : 0
  const refundRate = bookings.length > 0 ? (totalRefunds / bookings.length) * 100 : 0

  // Pending refunds (not yet completed or rejected)
  const pendingStatuses = ['requested', 'under_review', 'approved', 'processing']
  const pendingRefunds = refunds.filter(r => pendingStatuses.includes(r.status))
  const pendingRefundsCount = pendingRefunds.length
  const pendingRefundsAmount = pendingRefunds.reduce((sum, r) => sum + (r.eligible_amount || 0), 0)

  // === BY STATUS ===
  const statusMap: Record<string, { count: number; amount: number }> = {}
  for (const refund of refunds) {
    const status = refund.status || 'unknown'
    if (!statusMap[status]) statusMap[status] = { count: 0, amount: 0 }
    statusMap[status].count += 1
    statusMap[status].amount += refund.processed_amount || refund.approved_amount || refund.eligible_amount || 0
  }
  const byStatus = Object.entries(statusMap)
    .map(([status, data]) => ({
      status,
      count: data.count,
      amount: Math.round(data.amount * 100) / 100,
      percentage: totalRefunds > 0 ? Math.round((data.count / totalRefunds) * 1000) / 10 : 0
    }))
    .sort((a, b) => b.count - a.count)

  // === PROCESSING TIME ===
  const completedWithTimes = completedRefunds.filter(r => r.requested_at && r.completed_at)
  const approvedRefunds = refunds.filter(r => r.requested_at && r.approved_at)

  let avgRequestToCompletion = 0
  let avgRequestToApproval = 0
  let fastestCompletion = 0
  let slowestCompletion = 0

  if (completedWithTimes.length > 0) {
    const completionHours = completedWithTimes.map(r => {
      const requested = new Date(r.requested_at).getTime()
      const completed = new Date(r.completed_at).getTime()
      return (completed - requested) / (1000 * 60 * 60) // hours
    })
    avgRequestToCompletion = completionHours.reduce((a, b) => a + b, 0) / completionHours.length
    fastestCompletion = Math.min(...completionHours)
    slowestCompletion = Math.max(...completionHours)
  }

  if (approvedRefunds.length > 0) {
    const approvalHours = approvedRefunds.map(r => {
      const requested = new Date(r.requested_at).getTime()
      const approved = new Date(r.approved_at).getTime()
      return (approved - requested) / (1000 * 60 * 60) // hours
    })
    avgRequestToApproval = approvalHours.reduce((a, b) => a + b, 0) / approvalHours.length
  }

  // === BY POLICY ===
  const policyMap: Record<string, { refundPercentage: number; count: number; totalAmount: number }> = {}
  for (const refund of refunds) {
    const policy = refund.policy_applied as { label?: string; refund_percentage?: number } | null
    const label = policy?.label || 'No Policy'
    const pct = policy?.refund_percentage || refund.refund_percentage || 0
    if (!policyMap[label]) policyMap[label] = { refundPercentage: pct, count: 0, totalAmount: 0 }
    policyMap[label].count += 1
    policyMap[label].totalAmount += refund.processed_amount || refund.eligible_amount || 0
  }
  const byPolicy = Object.entries(policyMap)
    .map(([policyLabel, data]) => ({
      policyLabel,
      refundPercentage: data.refundPercentage,
      count: data.count,
      totalAmount: Math.round(data.totalAmount * 100) / 100
    }))
    .sort((a, b) => b.count - a.count)

  // === CANCELLATION TIMING ===
  const cancellationTiming = {
    sameDay: 0,       // 0 days
    lastMinute: 0,    // 1-2 days
    shortNotice: 0,   // 3-7 days
    standard: 0,      // 8-14 days
    advance: 0,       // 15-30 days
    earlyBird: 0      // 31+ days
  }

  for (const refund of refunds) {
    const days = refund.days_before_checkin
    if (days === null || days === undefined) continue
    if (days === 0) cancellationTiming.sameDay++
    else if (days <= 2) cancellationTiming.lastMinute++
    else if (days <= 7) cancellationTiming.shortNotice++
    else if (days <= 14) cancellationTiming.standard++
    else if (days <= 30) cancellationTiming.advance++
    else cancellationTiming.earlyBird++
  }

  // === TREND (daily) ===
  const trendMap: Record<string, { count: number; amount: number }> = {}

  // Initialize all dates in range
  const currentDate = new Date(start)
  while (currentDate <= end) {
    const dateStr = formatDate(currentDate)
    trendMap[dateStr] = { count: 0, amount: 0 }
    currentDate.setDate(currentDate.getDate() + 1)
  }

  // Populate with actual data
  for (const refund of refunds) {
    if (!refund.requested_at) continue
    const date = refund.requested_at.split('T')[0]
    if (trendMap[date]) {
      trendMap[date].count += 1
      trendMap[date].amount += refund.processed_amount || refund.eligible_amount || 0
    }
  }

  const trend = Object.entries(trendMap)
    .map(([date, data]) => ({
      date,
      count: data.count,
      amount: Math.round(data.amount * 100) / 100
    }))
    .sort((a, b) => a.date.localeCompare(b.date))

  // === COMPARISON ===
  const prevCompletedRefunds = prevRefunds.filter(r => r.status === 'completed')
  const prevTotalAmount = prevCompletedRefunds.reduce((sum, r) => sum + (r.processed_amount || 0), 0)

  const currentPeriod = { count: totalRefunds, amount: totalRefundedAmount }
  const previousPeriod = { count: prevRefunds.length, amount: prevTotalAmount }

  const countChange = percentageChange(currentPeriod.count, previousPeriod.count)
  const amountChange = percentageChange(currentPeriod.amount, previousPeriod.amount)

  return {
    summary: {
      totalRefunds,
      totalRefundedAmount: Math.round(totalRefundedAmount * 100) / 100,
      averageRefundAmount: Math.round(averageRefundAmount * 100) / 100,
      refundRate: Math.round(refundRate * 10) / 10,
      pendingRefundsCount,
      pendingRefundsAmount: Math.round(pendingRefundsAmount * 100) / 100
    },
    byStatus,
    processingTime: {
      averageRequestToCompletion: Math.round(avgRequestToCompletion * 10) / 10,
      averageRequestToApproval: Math.round(avgRequestToApproval * 10) / 10,
      fastestCompletion: Math.round(fastestCompletion * 10) / 10,
      slowestCompletion: Math.round(slowestCompletion * 10) / 10
    },
    byPolicy,
    cancellationTiming,
    trend,
    comparison: {
      currentPeriod,
      previousPeriod,
      countChange: Math.round(countChange * 10) / 10,
      amountChange: Math.round(amountChange * 10) / 10
    }
  }
}

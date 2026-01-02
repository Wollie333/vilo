import { Router, Request, Response } from 'express'
import { supabase } from '../lib/supabase.js'
import {
  getDashboardSummary,
  getTrendData,
  getRevenueBreakdown,
  getConversionFunnel,
  getRoomPerformance,
  getTrafficSources,
  getCustomerSegments,
  getReviewAnalytics,
  calculateHospitalityKPIs,
  getRefundAnalytics
} from '../services/analyticsService.js'
import { generateAnalyticsReportPDF, generateCSVExport } from '../services/analyticsReportGenerator.js'

const router = Router()

// ============================================
// ANALYTICS API
// Dashboard, KPIs, and report generation
// Requires authentication (tenant ID)
// ============================================

// Helper to get tenant ID
function getTenantId(req: Request): string | null {
  return req.headers['x-tenant-id'] as string || null
}

// Helper to get date range from query params
function getDateRange(req: Request): { startDate: string; endDate: string } {
  const now = new Date()
  const defaultEnd = now.toISOString().split('T')[0]
  const defaultStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  const startDate = (req.query.start_date as string) || (req.query.startDate as string) || defaultStart
  const endDate = (req.query.end_date as string) || (req.query.endDate as string) || defaultEnd

  // Add time component to include full day for end date
  return {
    startDate: startDate.includes('T') ? startDate : `${startDate}T00:00:00`,
    endDate: endDate.includes('T') ? endDate : `${endDate}T23:59:59`
  }
}

/**
 * GET /api/analytics/dashboard
 * Get dashboard summary with key KPIs
 */
router.get('/dashboard', async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req)
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID required' })
    }

    const { startDate, endDate } = getDateRange(req)
    const summary = await getDashboardSummary(tenantId, startDate, endDate)

    res.json(summary)
  } catch (error: any) {
    console.error('Error fetching dashboard:', error)
    res.status(500).json({ error: 'Failed to fetch dashboard data', details: error.message })
  }
})

/**
 * GET /api/analytics/dashboard/trends
 * Get trend data for sparklines
 */
router.get('/dashboard/trends', async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req)
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID required' })
    }

    const { startDate, endDate } = getDateRange(req)
    const metric = (req.query.metric as string) || 'revenue'

    if (!['revenue', 'bookings', 'sessions', 'pageviews'].includes(metric)) {
      return res.status(400).json({ error: 'Invalid metric. Use: revenue, bookings, sessions, pageviews' })
    }

    const trends = await getTrendData(tenantId, startDate, endDate, metric as any)
    res.json(trends)
  } catch (error: any) {
    console.error('Error fetching trends:', error)
    res.status(500).json({ error: 'Failed to fetch trend data', details: error.message })
  }
})

/**
 * GET /api/analytics/revenue
 * Get revenue analytics and breakdown
 */
router.get('/revenue', async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req)
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID required' })
    }

    const { startDate, endDate } = getDateRange(req)
    const breakdown = await getRevenueBreakdown(tenantId, startDate, endDate)

    res.json(breakdown)
  } catch (error: any) {
    console.error('Error fetching revenue:', error)
    res.status(500).json({ error: 'Failed to fetch revenue data', details: error.message })
  }
})

/**
 * GET /api/analytics/bookings
 * Get booking analytics
 */
router.get('/bookings', async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req)
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID required' })
    }

    const { startDate, endDate } = getDateRange(req)
    // Extract date-only parts for check_in comparisons
    const startDateOnly = startDate.split('T')[0]
    const endDateOnly = endDate.split('T')[0]

    // Get booking counts by status - use check_in for stays in this period
    const { data: bookings } = await supabase
      .from('bookings')
      .select('id, status, source, check_in, check_out, created_at')
      .eq('tenant_id', tenantId)
      .gte('check_in', startDateOnly)
      .lte('check_in', endDateOnly)

    const allBookings = bookings || []

    const byStatusMap: Record<string, number> = {}
    const bySourceMap: Record<string, number> = {}

    for (const booking of allBookings) {
      byStatusMap[booking.status] = (byStatusMap[booking.status] || 0) + 1
      const source = booking.source || 'direct'
      bySourceMap[source] = (bySourceMap[source] || 0) + 1
    }

    // Convert to arrays for frontend
    const byStatus = Object.entries(byStatusMap).map(([status, count]) => ({ status, count }))
    const bySource = Object.entries(bySourceMap).map(([source, count]) => ({ source, count }))

    // Calculate avg lead time and length of stay
    let totalLeadTime = 0
    let totalNights = 0
    let leadTimeCount = 0
    let nightsCount = 0
    const leadTimeDistribution: Record<string, number> = {
      '0-7 days': 0,
      '8-14 days': 0,
      '15-30 days': 0,
      '31-60 days': 0,
      '60+ days': 0
    }
    const losDistribution: Record<number, number> = {}

    for (const booking of allBookings) {
      if (booking.check_in && booking.created_at) {
        const checkIn = new Date(booking.check_in)
        const created = new Date(booking.created_at)
        const leadDays = Math.ceil((checkIn.getTime() - created.getTime()) / (1000 * 60 * 60 * 24))
        if (leadDays >= 0) {
          totalLeadTime += leadDays
          leadTimeCount += 1
          // Categorize lead time
          if (leadDays <= 7) leadTimeDistribution['0-7 days']++
          else if (leadDays <= 14) leadTimeDistribution['8-14 days']++
          else if (leadDays <= 30) leadTimeDistribution['15-30 days']++
          else if (leadDays <= 60) leadTimeDistribution['31-60 days']++
          else leadTimeDistribution['60+ days']++
        }
      }
      if (booking.check_in && booking.check_out) {
        const checkIn = new Date(booking.check_in)
        const checkOut = new Date(booking.check_out)
        const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24))
        if (nights > 0) {
          totalNights += nights
          nightsCount += 1
          losDistribution[nights] = (losDistribution[nights] || 0) + 1
        }
      }
    }

    // Convert distributions to arrays
    const leadTimeDistArray = Object.entries(leadTimeDistribution)
      .filter(([_, count]) => count > 0)
      .map(([range, count]) => ({ range, count }))

    const losDistArray = Object.entries(losDistribution)
      .map(([nights, count]) => ({ nights: parseInt(nights), count }))
      .sort((a, b) => a.nights - b.nights)
      .slice(0, 10) // Top 10 stay lengths

    // Get room data for occupancy calculation
    const { data: rooms } = await supabase
      .from('rooms')
      .select('id')
      .eq('tenant_id', tenantId)

    const totalRooms = rooms?.length || 1
    const dateRangeMs = new Date(endDate).getTime() - new Date(startDate).getTime()
    const dateRangeDays = Math.max(1, Math.ceil(dateRangeMs / (1000 * 60 * 60 * 24)))
    const totalRoomNights = totalRooms * dateRangeDays
    const occupancyRate = totalRoomNights > 0
      ? Math.round((totalNights / totalRoomNights) * 1000) / 10
      : 0

    res.json({
      totalBookings: allBookings.length,
      byStatus,
      bySource,
      avgLeadTime: leadTimeCount > 0 ? Math.round(totalLeadTime / leadTimeCount) : 0,
      avgLengthOfStay: nightsCount > 0 ? Math.round((totalNights / nightsCount) * 10) / 10 : 0,
      cancellationRate: allBookings.length > 0
        ? Math.round(((byStatusMap['cancelled'] || 0) / allBookings.length) * 1000) / 10
        : 0,
      occupancyRate,
      leadTimeDistribution: leadTimeDistArray,
      losDistribution: losDistArray
    })
  } catch (error: any) {
    console.error('Error fetching bookings analytics:', error)
    res.status(500).json({ error: 'Failed to fetch booking data', details: error.message })
  }
})

/**
 * GET /api/analytics/bookings/funnel
 * Get conversion funnel data
 */
router.get('/bookings/funnel', async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req)
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID required' })
    }

    const { startDate, endDate } = getDateRange(req)
    const funnel = await getConversionFunnel(tenantId, startDate, endDate)

    res.json(funnel)
  } catch (error: any) {
    console.error('Error fetching funnel:', error)
    res.status(500).json({ error: 'Failed to fetch funnel data', details: error.message })
  }
})

/**
 * GET /api/analytics/rooms
 * Get room performance data
 */
router.get('/rooms', async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req)
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID required' })
    }

    const { startDate, endDate } = getDateRange(req)
    const performance = await getRoomPerformance(tenantId, startDate, endDate)

    res.json(performance)
  } catch (error: any) {
    console.error('Error fetching room performance:', error)
    res.status(500).json({ error: 'Failed to fetch room data', details: error.message })
  }
})

/**
 * GET /api/analytics/traffic
 * Get traffic and engagement data
 */
router.get('/traffic', async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req)
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID required' })
    }

    const { startDate, endDate } = getDateRange(req)

    const [sessionsData, pageViewsData] = await Promise.all([
      supabase
        .from('analytics_sessions')
        .select('id, page_count, total_time_seconds, converted, device_type')
        .eq('tenant_id', tenantId)
        .gte('started_at', startDate)
        .lte('started_at', endDate),
      supabase
        .from('analytics_page_views')
        .select('id, page_type')
        .eq('tenant_id', tenantId)
        .gte('created_at', startDate)
        .lte('created_at', endDate)
    ])

    const sessions = sessionsData.data || []
    const pageViews = pageViewsData.data || []

    // Calculate metrics
    const totalSessions = sessions.length
    const totalPageViews = pageViews.length
    const avgPagesPerSession = totalSessions > 0
      ? Math.round((sessions.reduce((sum, s) => sum + (s.page_count || 0), 0) / totalSessions) * 10) / 10
      : 0

    const avgSessionDuration = totalSessions > 0
      ? Math.round(sessions.reduce((sum, s) => sum + (s.total_time_seconds || 0), 0) / totalSessions)
      : 0

    // Bounce rate (sessions with only 1 page view)
    const bouncedSessions = sessions.filter(s => (s.page_count || 0) <= 1).length
    const bounceRate = totalSessions > 0
      ? Math.round((bouncedSessions / totalSessions) * 1000) / 10
      : 0

    // Device breakdown
    const deviceBreakdown: Record<string, number> = {}
    for (const session of sessions) {
      const device = session.device_type || 'desktop'
      deviceBreakdown[device] = (deviceBreakdown[device] || 0) + 1
    }

    // Page type breakdown
    const pageTypeBreakdown: Record<string, number> = {}
    for (const view of pageViews) {
      const type = view.page_type || 'other'
      pageTypeBreakdown[type] = (pageTypeBreakdown[type] || 0) + 1
    }

    // Convert to arrays for frontend
    const byDevice = Object.entries(deviceBreakdown).map(([device, sessions]) => ({ device, sessions }))
    const bySource: Array<{ source: string; sessions: number }> = [] // Would need UTM tracking
    const byPageType = Object.entries(pageTypeBreakdown).map(([page_type, views]) => ({ page_type, views }))

    // Count listing and checkout views
    const listingViews = pageTypeBreakdown['listing'] || pageTypeBreakdown['room'] || 0
    const checkoutViews = pageTypeBreakdown['checkout'] || 0

    res.json({
      totalSessions,
      totalPageViews,
      uniqueVisitors: totalSessions, // Approximation - would need proper unique visitor tracking
      avgPagesPerSession,
      avgSessionDuration,
      bounceRate,
      listingViews,
      checkoutViews,
      byDevice,
      bySource,
      byPageType
    })
  } catch (error: any) {
    console.error('Error fetching traffic:', error)
    res.status(500).json({ error: 'Failed to fetch traffic data', details: error.message })
  }
})

/**
 * GET /api/analytics/traffic/sources
 * Get traffic sources breakdown
 */
router.get('/traffic/sources', async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req)
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID required' })
    }

    const { startDate, endDate } = getDateRange(req)
    const sources = await getTrafficSources(tenantId, startDate, endDate)

    res.json(sources)
  } catch (error: any) {
    console.error('Error fetching traffic sources:', error)
    res.status(500).json({ error: 'Failed to fetch traffic sources', details: error.message })
  }
})

/**
 * GET /api/analytics/customers
 * Get customer analytics
 */
router.get('/customers', async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req)
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID required' })
    }

    const { startDate, endDate } = getDateRange(req)
    const segments = await getCustomerSegments(tenantId, startDate, endDate)

    // Get total unique customers
    const { data: bookings } = await supabase
      .from('bookings')
      .select('guest_email')
      .eq('tenant_id', tenantId)
      .neq('status', 'cancelled')

    const uniqueCustomers = new Set((bookings || []).map(b => b.guest_email).filter(Boolean)).size

    res.json({
      totalCustomers: uniqueCustomers,
      segments
    })
  } catch (error: any) {
    console.error('Error fetching customers:', error)
    res.status(500).json({ error: 'Failed to fetch customer data', details: error.message })
  }
})

/**
 * GET /api/analytics/reviews
 * Get review analytics
 */
router.get('/reviews', async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req)
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID required' })
    }

    const { startDate, endDate } = getDateRange(req)
    const analytics = await getReviewAnalytics(tenantId, startDate, endDate)

    res.json(analytics)
  } catch (error: any) {
    console.error('Error fetching reviews:', error)
    res.status(500).json({ error: 'Failed to fetch review data', details: error.message })
  }
})

/**
 * GET /api/analytics/kpis
 * Get all hospitality KPIs
 */
router.get('/kpis', async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req)
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID required' })
    }

    const { startDate, endDate } = getDateRange(req)
    const kpis = await calculateHospitalityKPIs(tenantId, startDate, endDate)

    res.json(kpis)
  } catch (error: any) {
    console.error('Error fetching KPIs:', error)
    res.status(500).json({ error: 'Failed to fetch KPIs', details: error.message })
  }
})

/**
 * GET /api/analytics/refunds
 * Get refund analytics with comprehensive metrics
 */
router.get('/refunds', async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req)
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID required' })
    }

    const { startDate, endDate } = getDateRange(req)
    const analytics = await getRefundAnalytics(tenantId, startDate, endDate)

    res.json(analytics)
  } catch (error: any) {
    console.error('Error fetching refund analytics:', error)
    res.status(500).json({ error: 'Failed to fetch refund analytics', details: error.message })
  }
})

// Helper to get report type display name
function getReportTypeName(reportType: string): string {
  const names: Record<string, string> = {
    comprehensive: 'Comprehensive Report',
    revenue: 'Revenue Report',
    bookings: 'Bookings Report',
    occupancy: 'Occupancy Report',
    traffic: 'Traffic Report'
  }
  return names[reportType] || `${reportType} Report`
}

/**
 * POST /api/analytics/reports/generate
 * Generate a PDF or CSV report and save to storage
 */
router.post('/reports/generate', async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req)
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID required' })
    }

    const { report_type, start_date, end_date, format = 'pdf' } = req.body

    if (!report_type || !start_date || !end_date) {
      return res.status(400).json({ error: 'Missing required fields: report_type, start_date, end_date' })
    }

    const timestamp = Date.now()
    const fileName = `${report_type}_${start_date}_${end_date}_${timestamp}`

    if (format === 'csv') {
      const csv = await generateCSVExport(tenantId, report_type, start_date, end_date)
      const csvBuffer = Buffer.from(csv, 'utf-8')
      const storagePath = `${tenantId}/${fileName}.csv`

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('reports')
        .upload(storagePath, csvBuffer, {
          contentType: 'text/csv',
          upsert: true
        })

      if (uploadError) {
        console.error('Storage upload error:', uploadError)
        // Continue anyway - still return the file even if storage fails
      }

      // Save metadata to database
      const { error: dbError } = await supabase.from('analytics_reports').insert({
        tenant_id: tenantId,
        report_type,
        report_name: getReportTypeName(report_type),
        date_range_start: start_date,
        date_range_end: end_date,
        csv_path: storagePath,
        generated_at: new Date().toISOString(),
        report_data: { file_size: csvBuffer.length, format: 'csv' },
        is_scheduled: false
      })
      if (dbError) {
        console.error('DB insert error:', dbError)
        // Continue anyway - still return the file
      }

      res.setHeader('Content-Type', 'text/csv')
      res.setHeader('Content-Disposition', `attachment; filename="${report_type}_report_${start_date}_${end_date}.csv"`)
      return res.send(csv)
    } else {
      const pdfBuffer = await generateAnalyticsReportPDF(tenantId, report_type, start_date, end_date)
      const storagePath = `${tenantId}/${fileName}.pdf`

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('reports')
        .upload(storagePath, pdfBuffer, {
          contentType: 'application/pdf',
          upsert: true
        })

      if (uploadError) {
        console.error('Storage upload error:', uploadError)
        // Continue anyway - still return the file even if storage fails
      }

      // Save metadata to database
      const { error: dbError } = await supabase.from('analytics_reports').insert({
        tenant_id: tenantId,
        report_type,
        report_name: getReportTypeName(report_type),
        date_range_start: start_date,
        date_range_end: end_date,
        pdf_path: storagePath,
        generated_at: new Date().toISOString(),
        report_data: { file_size: pdfBuffer.length, format: 'pdf' },
        is_scheduled: false
      })
      if (dbError) {
        console.error('DB insert error:', dbError)
        // Continue anyway - still return the file
      }

      res.setHeader('Content-Type', 'application/pdf')
      res.setHeader('Content-Disposition', `attachment; filename="${report_type}_report_${start_date}_${end_date}.pdf"`)
      return res.send(pdfBuffer)
    }
  } catch (error: any) {
    console.error('Error generating report:', error)
    res.status(500).json({ error: 'Failed to generate report', details: error.message })
  }
})

/**
 * GET /api/analytics/reports
 * List recent generated reports (non-scheduled only)
 */
router.get('/reports', async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req)
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID required' })
    }

    const limit = parseInt(req.query.limit as string) || 5

    const { data, error } = await supabase
      .from('analytics_reports')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('is_scheduled', false)
      .order('generated_at', { ascending: false })
      .limit(limit)

    // If table doesn't exist, return empty array
    if (error && error.code === 'PGRST205') {
      return res.json([])
    }

    if (error) {
      throw error
    }

    res.json(data || [])
  } catch (error: any) {
    console.error('Error fetching reports:', error)
    res.status(500).json({ error: 'Failed to fetch reports', details: error.message })
  }
})

/**
 * GET /api/analytics/reports/:id/download
 * Get a signed URL to download a report
 */
router.get('/reports/:id/download', async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req)
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID required' })
    }

    const { id } = req.params

    // Get report metadata
    const { data: report, error: fetchError } = await supabase
      .from('analytics_reports')
      .select('*')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .single()

    if (fetchError || !report) {
      return res.status(404).json({ error: 'Report not found' })
    }

    const filePath = report.pdf_path || report.csv_path
    if (!filePath) {
      return res.status(404).json({ error: 'Report file not found in storage' })
    }

    // Generate signed URL (valid for 1 hour)
    const { data: signedUrlData, error: signError } = await supabase.storage
      .from('reports')
      .createSignedUrl(filePath, 3600) // 1 hour expiry

    if (signError || !signedUrlData) {
      console.error('Error creating signed URL:', signError)
      return res.status(500).json({ error: 'Failed to generate download URL' })
    }

    res.json({
      download_url: signedUrlData.signedUrl,
      filename: filePath.split('/').pop(),
      report_type: report.report_type,
      format: report.pdf_path ? 'pdf' : 'csv'
    })
  } catch (error: any) {
    console.error('Error generating download URL:', error)
    res.status(500).json({ error: 'Failed to generate download URL', details: error.message })
  }
})

/**
 * GET /api/analytics/reports/scheduled
 * List scheduled reports
 */
router.get('/reports/scheduled', async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req)
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID required' })
    }

    const { data, error } = await supabase
      .from('analytics_reports')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('is_scheduled', true)
      .order('created_at', { ascending: false })

    // If table doesn't exist, return empty array
    if (error && error.code === 'PGRST205') {
      return res.json([])
    }

    if (error) {
      throw error
    }

    res.json(data || [])
  } catch (error: any) {
    console.error('Error fetching scheduled reports:', error)
    res.status(500).json({ error: 'Failed to fetch scheduled reports', details: error.message })
  }
})

/**
 * POST /api/analytics/reports/schedule
 * Schedule a recurring report
 */
router.post('/reports/schedule', async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req)
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID required' })
    }

    const { report_type, report_name, frequency, email_recipients } = req.body

    if (!report_type || !frequency || !email_recipients?.length) {
      return res.status(400).json({ error: 'Missing required fields' })
    }

    // Calculate next run time based on frequency
    const now = new Date()
    let nextRun = new Date(now)

    switch (frequency) {
      case 'daily':
        nextRun.setDate(nextRun.getDate() + 1)
        nextRun.setHours(6, 0, 0, 0) // 6 AM
        break
      case 'weekly':
        nextRun.setDate(nextRun.getDate() + (7 - nextRun.getDay())) // Next Monday
        nextRun.setHours(6, 0, 0, 0)
        break
      case 'monthly':
        nextRun.setMonth(nextRun.getMonth() + 1)
        nextRun.setDate(1)
        nextRun.setHours(6, 0, 0, 0)
        break
      default:
        return res.status(400).json({ error: 'Invalid frequency. Use: daily, weekly, monthly' })
    }

    const { data, error } = await supabase
      .from('analytics_reports')
      .insert({
        tenant_id: tenantId,
        report_type,
        report_name: report_name || `${report_type} Report`,
        date_range_start: now.toISOString().split('T')[0],
        date_range_end: now.toISOString().split('T')[0],
        report_data: {},
        is_scheduled: true,
        schedule_frequency: frequency,
        next_run_at: nextRun.toISOString(),
        email_recipients
      })
      .select()
      .single()

    if (error) {
      throw error
    }

    res.json(data)
  } catch (error: any) {
    console.error('Error scheduling report:', error)
    res.status(500).json({ error: 'Failed to schedule report', details: error.message })
  }
})

/**
 * DELETE /api/analytics/reports/schedule/:id
 * Cancel a scheduled report
 */
router.delete('/reports/schedule/:id', async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req)
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID required' })
    }

    const { id } = req.params

    const { error } = await supabase
      .from('analytics_reports')
      .delete()
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .eq('is_scheduled', true)

    if (error) {
      throw error
    }

    res.json({ success: true })
  } catch (error: any) {
    console.error('Error canceling scheduled report:', error)
    res.status(500).json({ error: 'Failed to cancel scheduled report', details: error.message })
  }
})

/**
 * GET /api/analytics/export/:type
 * Export data as CSV
 */
router.get('/export/:type', async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req)
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID required' })
    }

    const { type } = req.params
    const { startDate, endDate } = getDateRange(req)

    const csv = await generateCSVExport(tenantId, type, startDate, endDate)

    res.setHeader('Content-Type', 'text/csv')
    res.setHeader('Content-Disposition', `attachment; filename="${type}_export_${startDate}_${endDate}.csv"`)
    res.send(csv)
  } catch (error: any) {
    console.error('Error exporting data:', error)
    res.status(500).json({ error: 'Failed to export data', details: error.message })
  }
})

export default router

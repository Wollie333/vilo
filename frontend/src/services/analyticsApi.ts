// ============================================
// ANALYTICS API CLIENT
// Frontend service for analytics endpoints
// ============================================

import { getTenantId as getApiTenantId, getAccessToken } from './api'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3002/api'

// Build headers with tenant ID and auth token
function getHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  }
  const tenantId = getApiTenantId()
  if (tenantId) {
    headers['x-tenant-id'] = tenantId
  }
  const token = getAccessToken()
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }
  return headers
}

// Format date for API
function formatDate(date: Date): string {
  return date.toISOString().split('T')[0]
}

// ============================================
// TYPES
// ============================================

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

export interface TrendDataPoint {
  date: string
  value: number
}

export interface RevenueBreakdown {
  total: number
  byRoom: Array<{ room_id: string; room_name: string; revenue: number; bookings: number }>
  bySource: Array<{ source: string; revenue: number; count: number }>
  byStatus: Array<{ status: string; revenue: number; count: number }>
  trend: Array<{ date: string; revenue: number }>
}

export interface BookingAnalytics {
  totalBookings: number
  byStatus: Array<{ status: string; count: number }>
  bySource: Array<{ source: string; count: number }>
  avgLeadTime: number
  avgLengthOfStay: number
  cancellationRate: number
  occupancyRate: number
  leadTimeDistribution: Array<{ range: string; count: number }>
  losDistribution: Array<{ nights: number; count: number }>
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

export interface RoomPerformance {
  room_id: string
  room_name: string
  views: number
  bookings: number
  revenue: number
  occupancyRate: number
  conversionRate: number
  nightsSold: number
  uniqueVisitors?: number
}

export interface TrafficData {
  totalSessions: number
  totalPageViews: number
  uniqueVisitors: number
  avgPagesPerSession: number
  avgSessionDuration: number
  bounceRate: number
  listingViews: number
  checkoutViews: number
  byDevice: Array<{ device: string; sessions: number }>
  bySource: Array<{ source: string; sessions: number }>
  byPageType: Array<{ page_type: string; views: number }>
}

export interface TrafficSource {
  source: string
  sessions: number
  pageViews: number
  conversions: number
  conversionRate: number
}

export interface CustomerData {
  totalCustomers: number
  segments: Array<{
    segment: string
    count: number
    revenue: number
    avgBookingValue: number
  }>
}

export interface ReviewAnalytics {
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
}

export interface HospitalityKPIs {
  revpar: number
  adr: number
  occupancyRate: number
  lengthOfStay: number
  bookingLeadTime: number
  cancellationRate: number
  guestSatisfaction: number
  repeatGuestRate: number
}

export interface DateRange {
  startDate: Date
  endDate: Date
}

export interface RefundAnalytics {
  summary: {
    totalRefunds: number
    totalRefundedAmount: number
    averageRefundAmount: number
    refundRate: number
    pendingRefundsCount: number
    pendingRefundsAmount: number
  }
  byStatus: Array<{ status: string; count: number; amount: number; percentage: number }>
  processingTime: {
    averageRequestToCompletion: number
    averageRequestToApproval: number
    fastestCompletion: number
    slowestCompletion: number
  }
  byPolicy: Array<{ policyLabel: string; refundPercentage: number; count: number; totalAmount: number }>
  cancellationTiming: {
    sameDay: number
    lastMinute: number
    shortNotice: number
    standard: number
    advance: number
    earlyBird: number
  }
  trend: Array<{ date: string; count: number; amount: number }>
  comparison: {
    currentPeriod: { count: number; amount: number }
    previousPeriod: { count: number; amount: number }
    countChange: number
    amountChange: number
  }
}

export interface Report {
  id: string
  tenant_id: string
  report_type: string
  report_name: string
  date_range_start: string
  date_range_end: string
  generated_at: string
  pdf_url?: string
  pdf_path?: string
  csv_url?: string
  csv_path?: string
  is_scheduled: boolean
  schedule_frequency?: string
  email_recipients?: string[]
  report_data?: {
    file_size?: number
    format?: 'pdf' | 'csv'
  }
}

export interface DownloadResponse {
  download_url: string
  filename: string
  report_type: string
  format: 'pdf' | 'csv'
}

export interface ScheduledReport {
  id: string
  tenant_id: string
  report_type: string
  report_name: string
  frequency: string
  email_recipients: string[]
  is_active: boolean
  next_run_at?: string
  created_at: string
}

export interface ScheduleReportParams {
  reportType: string
  reportName: string
  frequency: 'daily' | 'weekly' | 'monthly'
  emailRecipients: string[]
}

// ============================================
// API FUNCTIONS
// ============================================

export const analyticsApi = {
  /**
   * Get dashboard summary
   */
  async getDashboard(dateRange?: DateRange): Promise<DashboardSummary> {
    const params = new URLSearchParams()
    if (dateRange) {
      params.set('start_date', formatDate(dateRange.startDate))
      params.set('end_date', formatDate(dateRange.endDate))
    }

    const response = await fetch(`${API_URL}/analytics/dashboard?${params}`, {
      headers: getHeaders()
    })

    if (!response.ok) {
      throw new Error('Failed to fetch dashboard data')
    }

    return response.json()
  },

  /**
   * Get trend data for a specific metric
   */
  async getTrends(metric: 'revenue' | 'bookings' | 'sessions' | 'pageviews', dateRange?: DateRange): Promise<TrendDataPoint[]> {
    const params = new URLSearchParams({ metric })
    if (dateRange) {
      params.set('start_date', formatDate(dateRange.startDate))
      params.set('end_date', formatDate(dateRange.endDate))
    }

    const response = await fetch(`${API_URL}/analytics/dashboard/trends?${params}`, {
      headers: getHeaders()
    })

    if (!response.ok) {
      throw new Error('Failed to fetch trend data')
    }

    return response.json()
  },

  /**
   * Get revenue breakdown
   */
  async getRevenue(dateRange?: DateRange): Promise<RevenueBreakdown> {
    const params = new URLSearchParams()
    if (dateRange) {
      params.set('start_date', formatDate(dateRange.startDate))
      params.set('end_date', formatDate(dateRange.endDate))
    }

    const response = await fetch(`${API_URL}/analytics/revenue?${params}`, {
      headers: getHeaders()
    })

    if (!response.ok) {
      throw new Error('Failed to fetch revenue data')
    }

    return response.json()
  },

  /**
   * Get booking analytics
   */
  async getBookings(dateRange?: DateRange): Promise<BookingAnalytics> {
    const params = new URLSearchParams()
    if (dateRange) {
      params.set('start_date', formatDate(dateRange.startDate))
      params.set('end_date', formatDate(dateRange.endDate))
    }

    const response = await fetch(`${API_URL}/analytics/bookings?${params}`, {
      headers: getHeaders()
    })

    if (!response.ok) {
      throw new Error('Failed to fetch booking data')
    }

    return response.json()
  },

  /**
   * Get conversion funnel
   */
  async getFunnel(dateRange?: DateRange): Promise<ConversionFunnel> {
    const params = new URLSearchParams()
    if (dateRange) {
      params.set('start_date', formatDate(dateRange.startDate))
      params.set('end_date', formatDate(dateRange.endDate))
    }

    const response = await fetch(`${API_URL}/analytics/bookings/funnel?${params}`, {
      headers: getHeaders()
    })

    if (!response.ok) {
      throw new Error('Failed to fetch funnel data')
    }

    return response.json()
  },

  /**
   * Get room performance
   */
  async getRoomPerformance(dateRange?: DateRange): Promise<RoomPerformance[]> {
    const params = new URLSearchParams()
    if (dateRange) {
      params.set('start_date', formatDate(dateRange.startDate))
      params.set('end_date', formatDate(dateRange.endDate))
    }

    const response = await fetch(`${API_URL}/analytics/rooms?${params}`, {
      headers: getHeaders()
    })

    if (!response.ok) {
      throw new Error('Failed to fetch room performance')
    }

    return response.json()
  },

  /**
   * Get traffic data
   */
  async getTraffic(dateRange?: DateRange): Promise<TrafficData> {
    const params = new URLSearchParams()
    if (dateRange) {
      params.set('start_date', formatDate(dateRange.startDate))
      params.set('end_date', formatDate(dateRange.endDate))
    }

    const response = await fetch(`${API_URL}/analytics/traffic?${params}`, {
      headers: getHeaders()
    })

    if (!response.ok) {
      throw new Error('Failed to fetch traffic data')
    }

    return response.json()
  },

  /**
   * Get traffic sources
   */
  async getTrafficSources(dateRange?: DateRange): Promise<TrafficSource[]> {
    const params = new URLSearchParams()
    if (dateRange) {
      params.set('start_date', formatDate(dateRange.startDate))
      params.set('end_date', formatDate(dateRange.endDate))
    }

    const response = await fetch(`${API_URL}/analytics/traffic/sources?${params}`, {
      headers: getHeaders()
    })

    if (!response.ok) {
      throw new Error('Failed to fetch traffic sources')
    }

    return response.json()
  },

  /**
   * Get customer data
   */
  async getCustomers(dateRange?: DateRange): Promise<CustomerData> {
    const params = new URLSearchParams()
    if (dateRange) {
      params.set('start_date', formatDate(dateRange.startDate))
      params.set('end_date', formatDate(dateRange.endDate))
    }

    const response = await fetch(`${API_URL}/analytics/customers?${params}`, {
      headers: getHeaders()
    })

    if (!response.ok) {
      throw new Error('Failed to fetch customer data')
    }

    return response.json()
  },

  /**
   * Get review analytics
   */
  async getReviews(dateRange?: DateRange): Promise<ReviewAnalytics> {
    const params = new URLSearchParams()
    if (dateRange) {
      params.set('start_date', formatDate(dateRange.startDate))
      params.set('end_date', formatDate(dateRange.endDate))
    }

    const response = await fetch(`${API_URL}/analytics/reviews?${params}`, {
      headers: getHeaders()
    })

    if (!response.ok) {
      throw new Error('Failed to fetch review data')
    }

    return response.json()
  },

  /**
   * Get hospitality KPIs
   */
  async getKPIs(dateRange?: DateRange): Promise<HospitalityKPIs> {
    const params = new URLSearchParams()
    if (dateRange) {
      params.set('start_date', formatDate(dateRange.startDate))
      params.set('end_date', formatDate(dateRange.endDate))
    }

    const response = await fetch(`${API_URL}/analytics/kpis?${params}`, {
      headers: getHeaders()
    })

    if (!response.ok) {
      throw new Error('Failed to fetch KPIs')
    }

    return response.json()
  },

  /**
   * Get refund analytics
   */
  async getRefundAnalytics(dateRange?: DateRange): Promise<RefundAnalytics> {
    const params = new URLSearchParams()
    if (dateRange) {
      params.set('start_date', formatDate(dateRange.startDate))
      params.set('end_date', formatDate(dateRange.endDate))
    }

    const response = await fetch(`${API_URL}/analytics/refunds?${params}`, {
      headers: getHeaders()
    })

    if (!response.ok) {
      throw new Error('Failed to fetch refund analytics')
    }

    return response.json()
  },

  /**
   * Generate a report (PDF or CSV)
   */
  async generateReport(
    reportType: string,
    dateRange: DateRange,
    format: 'pdf' | 'csv' = 'pdf'
  ): Promise<Blob> {
    const response = await fetch(`${API_URL}/analytics/reports/generate`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({
        report_type: reportType,
        start_date: formatDate(dateRange.startDate),
        end_date: formatDate(dateRange.endDate),
        format
      })
    })

    if (!response.ok) {
      throw new Error('Failed to generate report')
    }

    return response.blob()
  },

  /**
   * Get list of generated reports
   */
  async getReports(): Promise<Report[]> {
    const response = await fetch(`${API_URL}/analytics/reports`, {
      headers: getHeaders()
    })

    if (!response.ok) {
      throw new Error('Failed to fetch reports')
    }

    return response.json()
  },

  /**
   * Get recent generated reports (for Recent Reports card)
   */
  async getRecentReports(limit: number = 5): Promise<Report[]> {
    const response = await fetch(`${API_URL}/analytics/reports?limit=${limit}`, {
      headers: getHeaders()
    })

    if (!response.ok) {
      throw new Error('Failed to fetch recent reports')
    }

    return response.json()
  },

  /**
   * Get download URL for a report
   */
  async downloadReport(reportId: string): Promise<DownloadResponse> {
    const response = await fetch(`${API_URL}/analytics/reports/${reportId}/download`, {
      headers: getHeaders()
    })

    if (!response.ok) {
      throw new Error('Failed to get download URL')
    }

    return response.json()
  },

  /**
   * Get scheduled reports
   */
  async getScheduledReports(): Promise<ScheduledReport[]> {
    const response = await fetch(`${API_URL}/analytics/reports/scheduled`, {
      headers: getHeaders()
    })

    if (!response.ok) {
      throw new Error('Failed to fetch scheduled reports')
    }

    return response.json()
  },

  /**
   * Schedule a recurring report
   */
  async scheduleReport(params: ScheduleReportParams): Promise<ScheduledReport> {
    const response = await fetch(`${API_URL}/analytics/reports/schedule`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({
        report_type: params.reportType,
        report_name: params.reportName,
        frequency: params.frequency,
        email_recipients: params.emailRecipients
      })
    })

    if (!response.ok) {
      throw new Error('Failed to schedule report')
    }

    return response.json()
  },

  /**
   * Delete a scheduled report
   */
  async deleteScheduledReport(reportId: string): Promise<void> {
    const response = await fetch(`${API_URL}/analytics/reports/schedule/${reportId}`, {
      method: 'DELETE',
      headers: getHeaders()
    })

    if (!response.ok) {
      throw new Error('Failed to delete scheduled report')
    }
  },

  /**
   * Toggle scheduled report active status
   */
  async toggleScheduledReport(reportId: string, isActive: boolean): Promise<void> {
    const response = await fetch(`${API_URL}/analytics/reports/schedule/${reportId}/toggle`, {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify({ is_active: isActive })
    })

    if (!response.ok) {
      throw new Error('Failed to toggle scheduled report')
    }
  },

  /**
   * Export data as CSV
   */
  async exportCSV(dataType: string, dateRange: DateRange): Promise<Blob> {
    const params = new URLSearchParams({
      start_date: formatDate(dateRange.startDate),
      end_date: formatDate(dateRange.endDate)
    })

    const response = await fetch(`${API_URL}/analytics/export/${dataType}?${params}`, {
      headers: getHeaders()
    })

    if (!response.ok) {
      throw new Error('Failed to export data')
    }

    return response.blob()
  }
}

// Helper to download a blob
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

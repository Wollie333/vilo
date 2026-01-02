import { useState, useEffect, useCallback, useMemo } from 'react'
import { BarChart3, RefreshCw, Download, Loader2 } from 'lucide-react'
import { useAnalyticsSectionPreferences } from '../hooks/useAnalyticsSectionPreferences'
import {
  AnalyticsSectionToggle,
  ExecutiveSummarySection,
  RevenueSection,
  BookingSection,
  TrafficSection,
  RoomPerformanceSection,
  RefundsSection,
  ReportsSection
} from '../components/analytics/sections'
import {
  analyticsApi,
  DashboardSummary,
  RevenueBreakdown,
  BookingAnalytics,
  ConversionFunnel,
  TrafficData,
  RoomPerformance,
  HospitalityKPIs,
  TrendDataPoint,
  Report,
  DateRange,
  RefundAnalytics,
  downloadBlob
} from '../services/analyticsApi'

type DateRangeOption = '7d' | '30d' | '90d' | '1y'

function getDateRange(option: DateRangeOption): DateRange {
  const endDate = new Date()
  const startDate = new Date()

  switch (option) {
    case '7d':
      startDate.setDate(endDate.getDate() - 7)
      break
    case '30d':
      startDate.setDate(endDate.getDate() - 30)
      break
    case '90d':
      startDate.setDate(endDate.getDate() - 90)
      break
    case '1y':
      startDate.setFullYear(endDate.getFullYear() - 1)
      break
  }

  return { startDate, endDate }
}

export default function UnifiedAnalytics() {
  const {
    sections,
    toggleSection,
    resetToDefaults,
    showAllSections,
    hideAllSections,
    enabledCount,
    totalCount
  } = useAnalyticsSectionPreferences()

  const [dateRangeOption, setDateRangeOption] = useState<DateRangeOption>('30d')
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [exporting, setExporting] = useState(false)

  // Data states
  const [dashboard, setDashboard] = useState<DashboardSummary | null>(null)
  const [kpis, setKPIs] = useState<HospitalityKPIs | null>(null)
  const [revenueTrend, setRevenueTrend] = useState<TrendDataPoint[]>([])
  const [revenue, setRevenue] = useState<RevenueBreakdown | null>(null)
  const [bookings, setBookings] = useState<BookingAnalytics | null>(null)
  const [funnel, setFunnel] = useState<ConversionFunnel | null>(null)
  const [traffic, setTraffic] = useState<TrafficData | null>(null)
  const [rooms, setRooms] = useState<RoomPerformance[] | null>(null)
  const [refundAnalytics, setRefundAnalytics] = useState<RefundAnalytics | null>(null)
  const [recentReports, setRecentReports] = useState<Report[] | null>(null)

  // Memoize dateRange for passing to sections (avoids re-creation on each render)
  const dateRange = useMemo(() => getDateRange(dateRangeOption), [dateRangeOption])

  const fetchData = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true)
    else setRefreshing(true)

    try {
      // Fetch all data in parallel
      const [
        dashboardData,
        kpisData,
        revenueTrendData,
        revenueData,
        bookingsData,
        funnelData,
        trafficData,
        roomsData,
        refundAnalyticsData,
        reportsData
      ] = await Promise.all([
        analyticsApi.getDashboard(dateRange).catch(() => null),
        analyticsApi.getKPIs(dateRange).catch(() => null),
        analyticsApi.getTrends('revenue', dateRange).catch(() => []),
        analyticsApi.getRevenue(dateRange).catch(() => null),
        analyticsApi.getBookings(dateRange).catch(() => null),
        analyticsApi.getFunnel(dateRange).catch(() => null),
        analyticsApi.getTraffic(dateRange).catch(() => null),
        analyticsApi.getRoomPerformance(dateRange).catch(() => null),
        analyticsApi.getRefundAnalytics(dateRange).catch(() => null),
        analyticsApi.getRecentReports(5).catch(() => null)
      ])

      setDashboard(dashboardData)
      setKPIs(kpisData)
      setRevenueTrend(revenueTrendData)
      setRevenue(revenueData)
      setBookings(bookingsData)
      setFunnel(funnelData)
      setTraffic(trafficData)
      setRooms(roomsData)
      setRefundAnalytics(refundAnalyticsData)
      setRecentReports(reportsData)
    } catch (error) {
      console.error('Failed to fetch analytics data:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [dateRange])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleRefresh = () => {
    fetchData(false)
  }

  const handleExport = async () => {
    setExporting(true)
    try {
      const blob = await analyticsApi.generateReport('summary', dateRange, 'pdf')
      const filename = `analytics_summary_${new Date().toISOString().split('T')[0]}.pdf`
      downloadBlob(blob, filename)
    } catch (error) {
      console.error('Export failed:', error)
    } finally {
      setExporting(false)
    }
  }

  const dateRangeOptions: { value: DateRangeOption; label: string }[] = [
    { value: '7d', label: '7 days' },
    { value: '30d', label: '30 days' },
    { value: '90d', label: '90 days' },
    { value: '1y', label: '1 year' }
  ]

  return (
    <div className="bg-gray-50 p-8 min-h-full">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-xl bg-accent-100">
            <BarChart3 className="text-accent-600" size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
            <p className="text-sm text-gray-500">Performance insights and business intelligence</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Date Range Selector */}
          <div className="flex items-center bg-white border border-gray-200 rounded-lg p-1">
            {dateRangeOptions.map(option => (
              <button
                key={option.value}
                onClick={() => setDateRangeOption(option.value)}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  dateRangeOption === option.value
                    ? 'bg-accent-500 text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>

          {/* Refresh Button */}
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
          </button>

          {/* Customize Button */}
          <AnalyticsSectionToggle
            sections={sections}
            onToggle={toggleSection}
            onReset={resetToDefaults}
            onShowAll={showAllSections}
            onHideAll={hideAllSections}
            enabledCount={enabledCount}
            totalCount={totalCount}
          />

          {/* Export Button */}
          <button
            onClick={handleExport}
            disabled={exporting}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-accent-500 rounded-lg hover:bg-accent-600 transition-colors disabled:opacity-50"
          >
            {exporting ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Download size={16} />
            )}
            Export
          </button>
        </div>
      </div>

      {/* Sections */}
      <div className="space-y-8">
        {sections.executiveSummary && (
          <ExecutiveSummarySection
            dashboard={dashboard}
            kpis={kpis}
            revenueTrend={revenueTrend}
            loading={loading}
            currency="ZAR"
          />
        )}

        {sections.revenueIntelligence && (
          <RevenueSection
            revenue={revenue}
            loading={loading}
            currency="ZAR"
          />
        )}

        {sections.bookingAnalytics && (
          <BookingSection
            bookings={bookings}
            funnel={funnel}
            loading={loading}
          />
        )}

        {sections.trafficEngagement && (
          <TrafficSection
            traffic={traffic}
            loading={loading}
          />
        )}

        {sections.roomPerformance && (
          <RoomPerformanceSection
            rooms={rooms}
            loading={loading}
            currency="ZAR"
          />
        )}

        {sections.refundAnalytics && (
          <RefundsSection
            refundAnalytics={refundAnalytics}
            loading={loading}
            currency="ZAR"
          />
        )}

        {sections.reports && (
          <ReportsSection
            recentReports={recentReports}
            dateRange={dateRange}
            loading={loading}
          />
        )}
      </div>

      {/* Empty State */}
      {enabledCount === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <BarChart3 size={48} className="text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No sections visible</h3>
          <p className="text-sm text-gray-500 mb-4">
            Click "Customize" to enable analytics sections
          </p>
          <button
            onClick={showAllSections}
            className="px-4 py-2 text-sm font-medium text-white bg-accent-500 rounded-lg hover:bg-accent-600 transition-colors"
          >
            Show All Sections
          </button>
        </div>
      )}
    </div>
  )
}

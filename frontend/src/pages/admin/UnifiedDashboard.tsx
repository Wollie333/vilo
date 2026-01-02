import { useState, useEffect } from 'react'
import {
  Loader2,
  Download,
  RefreshCw,
  LayoutDashboard,
} from 'lucide-react'
import {
  adminDashboard,
  adminAnalytics,
  DashboardStats,
  RevenueMetrics,
  CustomerMetrics,
  ComprehensiveGrowthMetrics,
  UsageMetrics,
  AnalyticsRange,
} from '../../services/adminApi'
import { useDashboardSectionPreferences } from '../../hooks/useDashboardSectionPreferences'
import {
  DashboardSectionToggle,
  ExecutiveSummarySection,
  RevenueIntelligenceSection,
  CustomerLifecycleSection,
  GrowthEngineSection,
  ChurnRiskSection,
  PlatformHealthSection,
} from '../../components/admin/dashboard'

interface TrendData {
  value: number
  date: string
}

export default function UnifiedDashboard() {
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [range, setRange] = useState<AnalyticsRange>('30d')
  const [exporting, setExporting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Section preferences
  const {
    sections,
    toggleSection,
    resetToDefaults,
    showAllSections,
    hideAllSections,
    enabledCount,
    totalCount,
  } = useDashboardSectionPreferences()

  // Data states
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null)
  const [revenueMetrics, setRevenueMetrics] = useState<RevenueMetrics | null>(null)
  const [customerMetrics, setCustomerMetrics] = useState<CustomerMetrics | null>(null)
  const [growthMetrics, setGrowthMetrics] = useState<ComprehensiveGrowthMetrics | null>(null)
  const [usageMetrics, setUsageMetrics] = useState<UsageMetrics | null>(null)
  const [mrrTrend, setMrrTrend] = useState<TrendData[]>([])
  const [churnTrend, setChurnTrend] = useState<TrendData[]>([])

  useEffect(() => {
    loadData()
  }, [range])

  const loadData = async (showRefresh = false) => {
    try {
      if (showRefresh) setRefreshing(true)
      else setLoading(true)
      setError(null)

      // Fetch all data in parallel
      const [stats, revenue, customers, growth, usage, mrrTrendData, churnTrendData] = await Promise.all([
        adminDashboard.getStats(),
        adminAnalytics.getRevenue(range),
        adminAnalytics.getCustomers(range),
        adminAnalytics.getGrowthComprehensive(range),
        adminAnalytics.getUsage(range),
        adminAnalytics.getTrend('mrr', 'month').catch(() => []),
        adminAnalytics.getTrend('churn', 'month').catch(() => []),
      ])

      console.log('Dashboard data loaded:', { stats, revenue, customers, growth, usage })

      setDashboardStats(stats)
      setRevenueMetrics(revenue)
      setCustomerMetrics(customers)
      setGrowthMetrics(growth)
      setUsageMetrics(usage)
      setMrrTrend(mrrTrendData)
      setChurnTrend(churnTrendData)
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err)
      setError(err instanceof Error ? err.message : 'Failed to load dashboard data')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const handleExport = async () => {
    try {
      setExporting(true)
      // Get visible sections
      const visibleSections = Object.entries(sections)
        .filter(([_, visible]) => visible)
        .map(([key]) => key)

      if (visibleSections.length === 0) {
        alert('Please select at least one section to export.')
        return
      }

      // Generate the report with visible sections
      const blob = await adminAnalytics.generateUnifiedReport(
        visibleSections,
        {
          startDate: getStartDate(range),
          endDate: new Date().toISOString().split('T')[0],
        },
        'pdf'
      )

      // Trigger download
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `dashboard-report-${new Date().toISOString().split('T')[0]}.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Failed to export report:', err)
      alert('Failed to export report. Please try again.')
    } finally {
      setExporting(false)
    }
  }

  // Calculate start date based on range
  const getStartDate = (range: AnalyticsRange): string => {
    const now = new Date()
    switch (range) {
      case '7d':
        now.setDate(now.getDate() - 7)
        break
      case '30d':
        now.setDate(now.getDate() - 30)
        break
      case '90d':
        now.setDate(now.getDate() - 90)
        break
      case '1y':
        now.setFullYear(now.getFullYear() - 1)
        break
    }
    return now.toISOString().split('T')[0]
  }

  // Check if any section is visible
  const anySectionVisible = Object.values(sections).some(Boolean)

  if (loading) {
    return (
      <div className="bg-gray-50 p-8 min-h-full flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-accent-500" />
          <p className="text-gray-500">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-gray-50 p-8 min-h-full flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <LayoutDashboard className="w-8 h-8 text-red-500" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Failed to Load Dashboard</h2>
          <p className="text-gray-500 mb-4">{error}</p>
          <button
            onClick={() => loadData()}
            className="px-4 py-2 bg-accent-500 text-white rounded-lg hover:bg-accent-600 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-gray-50 p-8 min-h-full">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-xl bg-accent-100">
            <LayoutDashboard size={24} className="text-accent-600" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-gray-500">Platform analytics and business intelligence</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Date Range Selector */}
          <div className="flex gap-1 bg-white border border-gray-200 p-1 rounded-lg">
            {(['7d', '30d', '90d', '1y'] as AnalyticsRange[]).map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  range === r
                    ? 'bg-accent-500 text-white'
                    : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                {r}
              </button>
            ))}
          </div>

          {/* Refresh Button */}
          <button
            onClick={() => loadData(true)}
            disabled={refreshing}
            className="p-2 text-gray-500 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 hover:text-gray-900 transition-colors disabled:opacity-50"
            title="Refresh data"
          >
            <RefreshCw size={18} className={refreshing ? 'animate-spin' : ''} />
          </button>

          {/* Section Toggle */}
          <DashboardSectionToggle
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
            className="flex items-center gap-2 px-4 py-2 bg-accent-500 text-white rounded-lg hover:bg-accent-600 transition-colors text-sm font-medium disabled:opacity-50"
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

      {/* Dashboard Content */}
      <div className="space-y-10">
        {/* Executive Summary Section */}
        {sections.executiveSummary && (
          <ExecutiveSummarySection
            stats={dashboardStats}
            mrrTrend={mrrTrend}
            churnTrend={churnTrend}
            loading={refreshing}
            currency="ZAR"
          />
        )}

        {/* Revenue Intelligence Section */}
        {sections.revenueIntelligence && (
          <RevenueIntelligenceSection
            metrics={revenueMetrics}
            loading={refreshing}
            currency="ZAR"
          />
        )}

        {/* Customer Lifecycle Section */}
        {sections.customerLifecycle && (
          <CustomerLifecycleSection
            metrics={customerMetrics}
            loading={refreshing}
            currency="ZAR"
          />
        )}

        {/* Growth Engine Section */}
        {sections.growthEngine && (
          <GrowthEngineSection
            metrics={growthMetrics}
            loading={refreshing}
          />
        )}

        {/* Churn & Risk Section */}
        {sections.churnRisk && (
          <ChurnRiskSection
            metrics={growthMetrics}
            loading={refreshing}
            currency="ZAR"
          />
        )}

        {/* Platform Health Section */}
        {sections.platformHealth && (
          <PlatformHealthSection
            usageMetrics={usageMetrics}
            growthMetrics={growthMetrics}
            loading={refreshing}
            currency="ZAR"
          />
        )}

        {/* Empty state when no sections visible */}
        {!anySectionVisible && (
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <LayoutDashboard className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No sections selected</h3>
            <p className="text-gray-500 mb-4">Use the Customize button to show dashboard sections</p>
            <button
              onClick={resetToDefaults}
              className="px-4 py-2 bg-accent-500 text-white rounded-lg hover:bg-accent-600 transition-colors"
            >
              Show All Sections
            </button>
          </div>
        )}
      </div>

      {/* Info Footer */}
      <div className="mt-12 pt-6 border-t border-gray-200">
        <p className="text-xs text-gray-400 text-center">
          Data refreshed at {new Date().toLocaleTimeString()} •
          {enabledCount} of {totalCount} sections visible
        </p>
      </div>
    </div>
  )
}

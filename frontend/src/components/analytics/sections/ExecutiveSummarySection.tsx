import { LayoutDashboard, DollarSign, Percent, TrendingUp, TrendingDown, Star, Home } from 'lucide-react'
import { DashboardSummary, HospitalityKPIs, TrendDataPoint } from '../../../services/analyticsApi'

interface Props {
  dashboard: DashboardSummary | null
  kpis: HospitalityKPIs | null
  revenueTrend?: TrendDataPoint[]
  loading?: boolean
  currency?: string
}

function formatCurrency(amount: number, currency = 'ZAR'): string {
  return new Intl.NumberFormat('en-ZA', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

function MiniSparkline({ data, color = 'accent' }: { data: TrendDataPoint[], color?: string }) {
  if (!data || data.length < 2) return null

  const values = data.map(d => d.value)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1

  const points = values.map((v, i) => {
    const x = (i / (values.length - 1)) * 60
    const y = 20 - ((v - min) / range) * 16
    return `${x},${y}`
  }).join(' ')

  const colorClasses: Record<string, string> = {
    accent: 'stroke-accent-500',
    green: 'stroke-green-500',
    red: 'stroke-red-500',
    amber: 'stroke-amber-500',
    blue: 'stroke-blue-500',
  }

  return (
    <svg className="w-15 h-5" viewBox="0 0 60 20">
      <polyline
        points={points}
        fill="none"
        className={colorClasses[color] || colorClasses.accent}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function KPICard({
  icon: Icon,
  iconBg,
  iconColor,
  label,
  value,
  subtitle,
  trend,
  sparklineData,
  sparklineColor,
}: {
  icon: React.ElementType
  iconBg: string
  iconColor: string
  label: string
  value: string
  subtitle?: string
  trend?: { value: number; isPositive: boolean }
  sparklineData?: TrendDataPoint[]
  sparklineColor?: string
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className={`p-2.5 rounded-lg ${iconBg}`}>
          <Icon className={iconColor} size={20} />
        </div>
        {trend && (
          <div className={`flex items-center gap-1 text-sm font-medium ${
            trend.isPositive ? 'text-green-600' : 'text-red-600'
          }`}>
            {trend.isPositive ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
            {Math.abs(trend.value).toFixed(1)}%
          </div>
        )}
      </div>
      <p className="text-sm font-medium text-gray-500 mb-1">{label}</p>
      <p className="text-2xl font-bold text-gray-900 mb-1">{value}</p>
      {subtitle && (
        <p className="text-xs text-gray-500">{subtitle}</p>
      )}
      {sparklineData && sparklineData.length > 1 && (
        <div className="mt-3">
          <MiniSparkline data={sparklineData} color={sparklineColor} />
        </div>
      )}
    </div>
  )
}

export function ExecutiveSummarySection({ dashboard, kpis, revenueTrend, loading, currency = 'ZAR' }: Props) {
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-accent-100">
            <LayoutDashboard className="text-accent-600" size={20} />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Executive Summary</h2>
            <p className="text-sm text-gray-500">At-a-glance property performance</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 p-6 animate-pulse">
              <div className="w-10 h-10 bg-gray-200 rounded-lg mb-4" />
              <div className="w-20 h-4 bg-gray-200 rounded mb-2" />
              <div className="w-24 h-8 bg-gray-200 rounded" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  const totalRevenue = dashboard?.totalRevenue || 0
  const occupancyRate = dashboard?.occupancyRate || kpis?.occupancyRate || 0
  const revpar = dashboard?.revpar || kpis?.revpar || 0
  const adr = dashboard?.adr || kpis?.adr || 0
  const avgRating = dashboard?.averageRating || kpis?.guestSatisfaction || 0

  const occupancyHealth = occupancyRate >= 70 ? 'Excellent' : occupancyRate >= 50 ? 'Good' : occupancyRate >= 30 ? 'Fair' : 'Low'

  return (
    <div className="space-y-6">
      {/* Section Header */}
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-lg bg-accent-100">
          <LayoutDashboard className="text-accent-600" size={20} />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Executive Summary</h2>
          <p className="text-sm text-gray-500">At-a-glance property performance</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <KPICard
          icon={DollarSign}
          iconBg="bg-green-100"
          iconColor="text-green-600"
          label="Total Revenue"
          value={formatCurrency(totalRevenue, currency)}
          trend={dashboard?.trends?.revenue ? {
            value: dashboard.trends.revenue,
            isPositive: dashboard.trends.revenue >= 0
          } : undefined}
          sparklineData={revenueTrend}
          sparklineColor="green"
        />

        <KPICard
          icon={Percent}
          iconBg={occupancyRate >= 70 ? 'bg-green-100' : occupancyRate >= 50 ? 'bg-blue-100' : 'bg-amber-100'}
          iconColor={occupancyRate >= 70 ? 'text-green-600' : occupancyRate >= 50 ? 'text-blue-600' : 'text-amber-600'}
          label="Occupancy Rate"
          value={`${occupancyRate.toFixed(0)}%`}
          subtitle={occupancyHealth}
          trend={dashboard?.trends?.occupancy ? {
            value: dashboard.trends.occupancy,
            isPositive: dashboard.trends.occupancy >= 0
          } : undefined}
        />

        <KPICard
          icon={Home}
          iconBg="bg-blue-100"
          iconColor="text-blue-600"
          label="RevPAR"
          value={formatCurrency(revpar, currency)}
          subtitle="Revenue per available room"
        />

        <KPICard
          icon={DollarSign}
          iconBg="bg-purple-100"
          iconColor="text-purple-600"
          label="ADR"
          value={formatCurrency(adr, currency)}
          subtitle="Average daily rate"
        />

        <KPICard
          icon={Star}
          iconBg="bg-amber-100"
          iconColor="text-amber-600"
          label="Guest Rating"
          value={avgRating > 0 ? avgRating.toFixed(1) : 'N/A'}
          subtitle={avgRating >= 4.5 ? 'Exceptional' : avgRating >= 4.0 ? 'Great' : avgRating >= 3.5 ? 'Good' : avgRating > 0 ? 'Fair' : 'No reviews'}
          trend={dashboard?.trends?.rating ? {
            value: dashboard.trends.rating,
            isPositive: dashboard.trends.rating >= 0
          } : undefined}
        />
      </div>

      {/* Secondary Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Total Bookings</p>
              <p className="text-xl font-bold text-gray-900">{dashboard?.totalBookings || 0}</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium text-gray-500">Conversion</p>
              <p className="text-xl font-bold text-green-600">{((dashboard?.conversionRate || 0) * 100).toFixed(1)}%</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Sessions</p>
              <p className="text-xl font-bold text-gray-900">{dashboard?.totalSessions || 0}</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium text-gray-500">Page Views</p>
              <p className="text-xl font-bold text-blue-600">{dashboard?.totalPageViews || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-accent-500 to-accent-600 rounded-xl p-5 text-white">
          <p className="text-sm font-medium text-accent-100">Avg Lead Time</p>
          <p className="text-2xl font-bold">{kpis?.bookingLeadTime?.toFixed(0) || 0} days</p>
          <p className="text-xs text-accent-200 mt-1">Time between booking and check-in</p>
        </div>
      </div>
    </div>
  )
}

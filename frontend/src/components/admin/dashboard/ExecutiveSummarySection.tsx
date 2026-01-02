import { LayoutDashboard, TrendingUp, TrendingDown, Building2, Users, DollarSign, AlertTriangle } from 'lucide-react'
import { DashboardStats } from '../../../services/adminApi'

interface TrendData {
  value: number
  date: string
}

interface Props {
  stats: DashboardStats | null
  mrrTrend?: TrendData[]
  churnTrend?: TrendData[]
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

function formatNumber(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
  return num.toString()
}

function MiniSparkline({ data, color = 'accent' }: { data: TrendData[], color?: string }) {
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
  trendColor: _trendColor,
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
  trendColor?: string
  sparklineData?: TrendData[]
  sparklineColor?: string
}) {
  // _trendColor is available for future use but currently trend color is derived from isPositive
  void _trendColor
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

export function ExecutiveSummarySection({ stats, mrrTrend, churnTrend, loading, currency = 'ZAR' }: Props) {
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-accent-100">
            <LayoutDashboard className="text-accent-600" size={20} />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Executive Summary</h2>
            <p className="text-sm text-gray-500">At-a-glance platform health</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map(i => (
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

  if (!stats) return null

  const activeRate = stats.totalTenants > 0
    ? ((stats.activeTenants / stats.totalTenants) * 100).toFixed(0)
    : '0'

  const churnHealth = stats.churnRate < 3 ? 'Healthy' : stats.churnRate < 5 ? 'Moderate' : 'High'

  return (
    <div className="space-y-6">
      {/* Section Header */}
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-lg bg-accent-100">
          <LayoutDashboard className="text-accent-600" size={20} />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Executive Summary</h2>
          <p className="text-sm text-gray-500">At-a-glance platform health</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPICard
          icon={DollarSign}
          iconBg="bg-green-100"
          iconColor="text-green-600"
          label="Monthly Recurring Revenue"
          value={formatCurrency(stats.mrr, currency)}
          subtitle={`ARR: ${formatCurrency(stats.arr, currency)}`}
          sparklineData={mrrTrend}
          sparklineColor="green"
        />

        <KPICard
          icon={Building2}
          iconBg="bg-blue-100"
          iconColor="text-blue-600"
          label="Active Tenants"
          value={formatNumber(stats.activeTenants)}
          subtitle={`${activeRate}% of ${formatNumber(stats.totalTenants)} total`}
        />

        <KPICard
          icon={Users}
          iconBg="bg-purple-100"
          iconColor="text-purple-600"
          label="Total Users"
          value={formatNumber(stats.totalUsers)}
          subtitle={`Across all tenants`}
        />

        <KPICard
          icon={AlertTriangle}
          iconBg={stats.churnRate < 3 ? 'bg-green-100' : stats.churnRate < 5 ? 'bg-amber-100' : 'bg-red-100'}
          iconColor={stats.churnRate < 3 ? 'text-green-600' : stats.churnRate < 5 ? 'text-amber-600' : 'text-red-600'}
          label="Churn Rate"
          value={`${stats.churnRate.toFixed(1)}%`}
          subtitle={churnHealth}
          sparklineData={churnTrend}
          sparklineColor={stats.churnRate < 3 ? 'green' : stats.churnRate < 5 ? 'amber' : 'red'}
        />
      </div>

      {/* Secondary Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Active Trials</p>
              <p className="text-xl font-bold text-gray-900">{stats.activeTrials}</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium text-gray-500">Conversion</p>
              <p className="text-xl font-bold text-green-600">{stats.trialConversionRate.toFixed(0)}%</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Pending Payments</p>
              <p className="text-xl font-bold text-gray-900">{stats.pendingPayments}</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium text-gray-500">Total Revenue</p>
              <p className="text-xl font-bold text-blue-600">{formatCurrency(stats.totalRevenue, currency)}</p>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-accent-500 to-accent-600 rounded-xl p-5 text-white">
          <p className="text-sm font-medium text-accent-100">Annual Recurring Revenue</p>
          <p className="text-2xl font-bold">{formatCurrency(stats.arr, currency)}</p>
          <p className="text-xs text-accent-200 mt-1">Projected from current MRR</p>
        </div>
      </div>
    </div>
  )
}

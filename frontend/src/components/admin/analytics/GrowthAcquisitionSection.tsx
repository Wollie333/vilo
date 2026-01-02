import {
  Users,
  TrendingUp,
  TrendingDown,
  Zap,
  CheckCircle,
  Clock,
  Target,
  AlertTriangle,
  Activity,
  Rocket,
} from 'lucide-react'
import Card from '../../Card'
import { DonutChart, AreaChart } from '../../analytics'
import {
  ComprehensiveGrowthMetrics,
  CustomerMetrics,
} from '../../../services/adminApi'

function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-US').format(value)
}

function formatCurrency(value: number, currency: string = 'ZAR'): string {
  if (currency === 'ZAR') {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

function formatPercent(value: number, showPlus = true): string {
  if (showPlus && value >= 0) {
    return `+${value.toFixed(1)}%`
  }
  return `${value.toFixed(1)}%`
}

// KPI Card Component
function KPICard({
  title,
  value,
  subtitle,
  trend,
  trendLabel,
  icon,
  color = 'default',
}: {
  title: string
  value: string | number
  subtitle?: string
  trend?: number
  trendLabel?: string
  icon: React.ReactNode
  color?: 'default' | 'success' | 'warning' | 'danger'
}) {
  const bgColors = {
    default: 'bg-gray-50',
    success: 'bg-green-50',
    warning: 'bg-amber-50',
    danger: 'bg-red-50',
  }
  const iconColors = {
    default: 'text-gray-600',
    success: 'text-green-600',
    warning: 'text-amber-600',
    danger: 'text-red-600',
  }

  return (
    <div className="p-5 rounded-xl border border-gray-200 bg-white">
      <div className="flex items-start justify-between mb-3">
        <div className={`p-2 rounded-lg ${bgColors[color]}`}>
          <div className={iconColors[color]}>{icon}</div>
        </div>
        {trend !== undefined && (
          <div className={`flex items-center gap-1 text-sm ${trend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {trend >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
            <span>{formatPercent(trend)}</span>
          </div>
        )}
      </div>
      <p className="text-sm text-gray-500 font-medium mb-1">{title}</p>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      {(subtitle || trendLabel) && (
        <p className="text-xs text-gray-500 mt-1">{subtitle || trendLabel}</p>
      )}
    </div>
  )
}

// Activation Funnel Component
function ActivationFunnel({ stages, timeToValue }: {
  stages: { stage: string; count: number; percentage: number; dropOffRate: number }[]
  timeToValue: { avgDaysToFirstRoom: number; avgDaysToFirstBooking: number; avgDaysToFirstPayment: number }
}) {
  const colors = ['bg-accent-500', 'bg-blue-500', 'bg-purple-500', 'bg-green-500']

  return (
    <div className="space-y-4">
      {/* Funnel visualization */}
      <div className="space-y-2">
        {stages.map((stage, idx) => (
          <div key={stage.stage} className="relative">
            <div className="flex items-center gap-4">
              <div className="w-28 text-sm text-gray-600 text-right truncate">{stage.stage}</div>
              <div className="flex-1 relative">
                <div
                  className={`h-9 ${colors[idx % colors.length]} rounded-lg transition-all flex items-center justify-end pr-3`}
                  style={{ width: `${Math.max(stage.percentage, 5)}%` }}
                >
                  <span className="text-white text-sm font-medium whitespace-nowrap">
                    {formatNumber(stage.count)} ({stage.percentage}%)
                  </span>
                </div>
              </div>
              {idx < stages.length - 1 && stage.dropOffRate > 0 && (
                <div className="w-16 text-xs text-red-500 text-right">
                  -{stage.dropOffRate}%
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Time to Value */}
      <div className="grid grid-cols-3 gap-3 pt-4 border-t border-gray-100">
        <div className="text-center p-2 rounded-lg bg-gray-50">
          <p className="text-xs text-gray-500 mb-1">To First Room</p>
          <p className="text-base font-bold text-gray-900">{timeToValue.avgDaysToFirstRoom}d</p>
        </div>
        <div className="text-center p-2 rounded-lg bg-gray-50">
          <p className="text-xs text-gray-500 mb-1">To First Booking</p>
          <p className="text-base font-bold text-gray-900">{timeToValue.avgDaysToFirstBooking}d</p>
        </div>
        <div className="text-center p-2 rounded-lg bg-gray-50">
          <p className="text-xs text-gray-500 mb-1">To First Payment</p>
          <p className="text-base font-bold text-gray-900">{timeToValue.avgDaysToFirstPayment}d</p>
        </div>
      </div>
    </div>
  )
}

// Churn Reasons Chart
function ChurnReasons({ reasons }: { reasons: { reason: string; count: number; percentage: number }[] }) {
  return (
    <div className="space-y-3">
      {reasons.slice(0, 4).map((reason, idx) => (
        <div key={reason.reason}>
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm text-gray-600 truncate">{reason.reason}</span>
            <span className="text-sm font-medium text-gray-900">{reason.percentage}%</span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full ${
                idx === 0 ? 'bg-red-500' :
                idx === 1 ? 'bg-orange-500' :
                idx === 2 ? 'bg-amber-500' : 'bg-gray-400'
              }`}
              style={{ width: `${reason.percentage}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}

interface Props {
  growthMetrics: ComprehensiveGrowthMetrics | null
  customerMetrics?: CustomerMetrics | null
  loading?: boolean
  currency?: string
}

export function GrowthAcquisitionSection({ growthMetrics, customerMetrics, loading, currency = 'ZAR' }: Props) {
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="p-5 rounded-xl border border-gray-200 bg-white animate-pulse">
              <div className="w-10 h-10 bg-gray-200 rounded-lg mb-3" />
              <div className="h-4 bg-gray-200 rounded w-16 mb-2" />
              <div className="h-8 bg-gray-200 rounded w-20" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  // Prepare chart data
  const sourceChartData = growthMetrics?.attribution.sourcePerformance?.map(s => ({
    name: s.source,
    value: s.signups
  })) || []

  const signupTrendData = growthMetrics?.tenantGrowth.signupTrend.map(t => ({
    date: t.date,
    value: t.signups
  })) || []

  return (
    <div className="space-y-6">
      {/* Section Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-blue-100">
          <Rocket size={20} className="text-blue-600" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Growth & Acquisition</h2>
          <p className="text-sm text-gray-500">Signups, activation, and retention</p>
        </div>
      </div>

      {/* Primary KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPICard
          title="New Signups"
          value={formatNumber(growthMetrics?.tenantGrowth.newSignups || 0)}
          icon={<Users size={20} />}
          color="success"
          trend={growthMetrics?.tenantGrowth.signupGrowth}
          trendLabel="vs last period"
        />
        <KPICard
          title="Activation Rate"
          value={`${growthMetrics?.activationFunnel.activationRate || 0}%`}
          icon={<Zap size={20} />}
          color={
            (growthMetrics?.activationFunnel.activationRate || 0) >= 50
              ? 'success'
              : 'warning'
          }
          subtitle="Signup to payment"
        />
        <KPICard
          title="Total Tenants"
          value={formatNumber(growthMetrics?.tenantGrowth.totalTenants || 0)}
          icon={<CheckCircle size={20} />}
          color="default"
          subtitle="All time"
        />
        <KPICard
          title="Churn Rate"
          value={`${growthMetrics?.churn.churnRate || 0}%`}
          icon={<AlertTriangle size={20} />}
          color={(growthMetrics?.churn.churnRate || 0) > 5 ? 'danger' : 'default'}
          subtitle={`${growthMetrics?.churn.atRiskTenants || 0} at risk`}
        />
      </div>

      {/* Activation Funnel & Source Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Activation Funnel */}
        <Card title="Activation Funnel">
          <div className="mt-4">
            {growthMetrics?.activationFunnel.stages && growthMetrics.activationFunnel.stages.length > 0 ? (
              <ActivationFunnel
                stages={growthMetrics.activationFunnel.stages}
                timeToValue={growthMetrics.activationFunnel.timeToValue}
              />
            ) : (
              <div className="h-[200px] flex items-center justify-center text-gray-400">
                <div className="text-center">
                  <Target size={32} className="mx-auto mb-2 opacity-50" />
                  <p>No funnel data available</p>
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* Acquisition Source */}
        <Card title="Acquisition Source">
          <div className="mt-4">
            {sourceChartData.length > 0 ? (
              <>
                <DonutChart
                  data={sourceChartData}
                  height={180}
                  centerValue={formatNumber(growthMetrics?.tenantGrowth.newSignups || 0)}
                  centerLabel="Signups"
                />
                <div className="mt-4 pt-4 border-t border-gray-100 space-y-2">
                  {growthMetrics?.attribution.sourcePerformance?.slice(0, 4).map((source, idx) => (
                    <div key={source.source} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${
                          idx === 0 ? 'bg-accent-500' :
                          idx === 1 ? 'bg-blue-500' :
                          idx === 2 ? 'bg-purple-500' : 'bg-gray-400'
                        }`} />
                        <span className="text-gray-600">{source.source}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-gray-900 font-medium">{source.signups}</span>
                        <span className="text-gray-400">{source.activationRate}% activ.</span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="h-[180px] flex items-center justify-center text-gray-400">
                <div className="text-center">
                  <Target size={32} className="mx-auto mb-2 opacity-50" />
                  <p>No source data available</p>
                </div>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Churn Analysis & LTV */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Churn Analysis */}
        <Card title="Churn Analysis">
          <div className="mt-4">
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="p-3 rounded-lg bg-red-50 border border-red-100">
                <p className="text-xs text-red-700 mb-1">Churned</p>
                <p className="text-xl font-bold text-red-700">
                  {growthMetrics?.churn.churnedTenants || 0}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-amber-50 border border-amber-100">
                <p className="text-xs text-amber-700 mb-1">At Risk</p>
                <p className="text-xl font-bold text-amber-700">
                  {growthMetrics?.churn.atRiskTenants || 0}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-gray-50 border border-gray-100">
                <p className="text-xs text-gray-600 mb-1">Avg Tenure</p>
                <p className="text-xl font-bold text-gray-900">
                  {growthMetrics?.churn.avgTenureBeforeChurn || 0}mo
                </p>
              </div>
            </div>
            {growthMetrics?.churn.churnReasons && growthMetrics.churn.churnReasons.length > 0 ? (
              <ChurnReasons reasons={growthMetrics.churn.churnReasons} />
            ) : (
              <div className="py-6 text-center text-gray-400">
                <AlertTriangle size={24} className="mx-auto mb-2 opacity-50" />
                <p className="text-sm">No churn data available</p>
              </div>
            )}
          </div>
        </Card>

        {/* Customer LTV */}
        <Card title="Customer Lifetime Value">
          <div className="mt-4">
            <div className="text-center p-6 rounded-xl bg-gradient-to-br from-accent-50 to-blue-50 border border-accent-100 mb-4">
              <p className="text-sm text-gray-600 mb-2">Average LTV</p>
              <p className="text-4xl font-bold text-accent-700">
                {formatCurrency(customerMetrics?.ltv || 0, currency)}
              </p>
              <p className="text-sm text-gray-500 mt-2">
                ~{customerMetrics?.averageLifespan || 0} month average lifespan
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 rounded-lg bg-gray-50">
                <p className="text-xs text-gray-500 mb-1">Active Customers</p>
                <p className="text-lg font-bold text-gray-900">
                  {formatNumber(customerMetrics?.activeCustomers || 0)}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-gray-50">
                <p className="text-xs text-gray-500 mb-1">Net New</p>
                <p className={`text-lg font-bold ${
                  ((customerMetrics?.newCustomers || 0) - (customerMetrics?.churnedCustomers || 0)) >= 0
                    ? 'text-green-600'
                    : 'text-red-600'
                }`}>
                  {(customerMetrics?.newCustomers || 0) - (customerMetrics?.churnedCustomers || 0) >= 0 ? '+' : ''}
                  {(customerMetrics?.newCustomers || 0) - (customerMetrics?.churnedCustomers || 0)}
                </p>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Signup Trend */}
      {signupTrendData.length > 0 && (
        <Card title="Signup Trend">
          <div className="mt-4">
            <AreaChart
              data={signupTrendData}
              height={200}
              color="#6366f1"
            />
          </div>
        </Card>
      )}
    </div>
  )
}

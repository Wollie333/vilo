import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Users,
  BarChart3,
} from 'lucide-react'
import Card from '../../Card'
import { DonutChart } from '../../analytics'
import { RevenueMetrics } from '../../../services/adminApi'

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

function formatPercent(value: number): string {
  return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`
}

interface KPICardProps {
  label: string
  value: string
  icon: React.ReactNode
  iconBg: string
  change?: {
    value: number
    label: string
  }
  subtitle?: string
  valueColor?: string
}

function KPICard({ label, value, icon, iconBg, change, subtitle, valueColor = 'text-gray-900' }: KPICardProps) {
  return (
    <div className="p-6 rounded-xl border border-gray-200 bg-white">
      <div className="flex items-start justify-between mb-4">
        <div className={`p-2 rounded-lg ${iconBg}`}>
          {icon}
        </div>
      </div>
      <p className="text-sm text-gray-500 font-medium mb-1">{label}</p>
      <p className={`text-3xl font-bold ${valueColor}`}>{value}</p>
      {change && (
        <div className="flex items-center gap-1 mt-2 text-sm">
          {change.value >= 0 ? (
            <TrendingUp size={14} className="text-green-600" />
          ) : (
            <TrendingDown size={14} className="text-red-600" />
          )}
          <span className={change.value >= 0 ? 'text-green-600' : 'text-red-600'}>
            {formatPercent(change.value)}
          </span>
          <span className="text-gray-500">{change.label}</span>
        </div>
      )}
      {subtitle && (
        <p className="text-sm text-gray-500 mt-2">{subtitle}</p>
      )}
    </div>
  )
}

interface Props {
  metrics: RevenueMetrics | null
  loading?: boolean
  currency?: string
}

export function SaaSMetricsSection({ metrics, loading, currency = 'ZAR' }: Props) {
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="p-6 rounded-xl border border-gray-200 bg-white animate-pulse">
              <div className="w-10 h-10 bg-gray-200 rounded-lg mb-4" />
              <div className="h-4 bg-gray-200 rounded w-16 mb-2" />
              <div className="h-8 bg-gray-200 rounded w-24" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  // Prepare chart data
  const planChartData = metrics?.revenueByPlan.map(p => ({
    name: p.plan,
    value: p.revenue
  })) || []

  return (
    <div className="space-y-6">
      {/* Section Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-green-100">
          <DollarSign size={20} className="text-green-600" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-gray-900">SaaS Metrics</h2>
          <p className="text-sm text-gray-500">Revenue and subscription health</p>
        </div>
      </div>

      {/* Primary KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPICard
          label="MRR"
          value={formatCurrency(metrics?.mrr || 0, currency)}
          icon={<DollarSign size={20} className="text-green-600" />}
          iconBg="bg-green-50"
          change={{
            value: metrics?.mrrGrowth || 0,
            label: 'vs last period'
          }}
        />
        <KPICard
          label="ARR"
          value={formatCurrency(metrics?.arr || 0, currency)}
          icon={<TrendingUp size={20} className="text-blue-600" />}
          iconBg="bg-blue-50"
          subtitle="MRR x 12"
        />
        <KPICard
          label="ARPU"
          value={formatCurrency(metrics?.arpu || 0, currency)}
          icon={<Users size={20} className="text-purple-600" />}
          iconBg="bg-purple-50"
          subtitle="Avg revenue per user"
        />
        <KPICard
          label="NRR"
          value={`${metrics?.nrr || 100}%`}
          icon={<BarChart3 size={20} className="text-amber-600" />}
          iconBg="bg-amber-50"
          subtitle="Net Revenue Retention"
          valueColor={(metrics?.nrr || 0) >= 100 ? 'text-green-600' : 'text-amber-600'}
        />
      </div>

      {/* MRR Movement & Revenue by Plan */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* MRR Movement */}
        <Card title="MRR Movement">
          <div className="mt-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-lg bg-green-50 border border-green-100">
                <p className="text-sm text-green-700 mb-1">New MRR</p>
                <p className="text-xl font-bold text-green-700">
                  +{formatCurrency(metrics?.newMrr || 0, currency)}
                </p>
              </div>
              <div className="p-4 rounded-lg bg-blue-50 border border-blue-100">
                <p className="text-sm text-blue-700 mb-1">Expansion</p>
                <p className="text-xl font-bold text-blue-700">
                  +{formatCurrency(metrics?.expansionMrr || 0, currency)}
                </p>
              </div>
              <div className="p-4 rounded-lg bg-amber-50 border border-amber-100">
                <p className="text-sm text-amber-700 mb-1">Contraction</p>
                <p className="text-xl font-bold text-amber-700">
                  -{formatCurrency(metrics?.contractionMrr || 0, currency)}
                </p>
              </div>
              <div className="p-4 rounded-lg bg-red-50 border border-red-100">
                <p className="text-sm text-red-700 mb-1">Churned</p>
                <p className="text-xl font-bold text-red-700">
                  -{formatCurrency(metrics?.churnedMrr || 0, currency)}
                </p>
              </div>
            </div>
            <div className="pt-4 border-t border-gray-100">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Net MRR Change</span>
                <span className={`font-semibold ${
                  ((metrics?.newMrr || 0) + (metrics?.expansionMrr || 0) - (metrics?.contractionMrr || 0) - (metrics?.churnedMrr || 0)) >= 0
                    ? 'text-green-600'
                    : 'text-red-600'
                }`}>
                  {formatCurrency(
                    (metrics?.newMrr || 0) +
                    (metrics?.expansionMrr || 0) -
                    (metrics?.contractionMrr || 0) -
                    (metrics?.churnedMrr || 0),
                    currency
                  )}
                </span>
              </div>
            </div>
          </div>
        </Card>

        {/* Revenue by Plan */}
        <Card title="Revenue by Plan">
          <div className="mt-4">
            {planChartData.length > 0 ? (
              <>
                <DonutChart
                  data={planChartData}
                  height={200}
                  centerValue={formatCurrency(metrics?.mrr || 0, currency)}
                  centerLabel="MRR"
                />
                <div className="mt-4 pt-4 border-t border-gray-100 space-y-2">
                  {metrics?.revenueByPlan.map((plan, idx) => (
                    <div key={plan.planId} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${
                          idx === 0 ? 'bg-accent-500' :
                          idx === 1 ? 'bg-blue-500' :
                          idx === 2 ? 'bg-amber-500' : 'bg-gray-400'
                        }`} />
                        <span className="text-gray-600">{plan.plan}</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-gray-500">{plan.count}</span>
                        <span className="font-medium text-gray-900 w-20 text-right">
                          {formatCurrency(plan.revenue, currency)}
                        </span>
                        <span className="text-gray-400 w-10 text-right">{plan.percentage}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-gray-400">
                <div className="text-center">
                  <DollarSign size={32} className="mx-auto mb-2 opacity-50" />
                  <p>No plan data available</p>
                </div>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  )
}

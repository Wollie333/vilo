import { Users, TrendingUp, TrendingDown, Heart, AlertCircle, UserMinus } from 'lucide-react'
import { CustomerMetrics } from '../../../services/adminApi'

interface Props {
  metrics: CustomerMetrics | null
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

function CohortHeatmap({ cohorts }: { cohorts: CustomerMetrics['cohortRetention'] }) {
  if (!cohorts || cohorts.length === 0) {
    return (
      <div style={{ color: 'var(--text-muted)' }} className="flex items-center justify-center h-32 text-sm">
        No cohort data available
      </div>
    )
  }

  const getColorClass = (value: number | null) => {
    if (value === null) return 'bg-gray-100 text-gray-400'
    if (value >= 80) return 'bg-green-500 text-white'
    if (value >= 60) return 'bg-green-400 text-white'
    if (value >= 40) return 'bg-amber-400 text-white'
    if (value >= 20) return 'bg-amber-300 text-gray-900'
    return 'bg-red-300 text-gray-900'
  }

  const months = ['M0', 'M1', 'M2', 'M3', 'M4', 'M5', 'M6']

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr>
            <th style={{ color: 'var(--text-muted)' }} className="px-2 py-1 text-left font-medium">Cohort</th>
            {months.map((m, i) => (
              <th key={i} style={{ color: 'var(--text-muted)' }} className="px-2 py-1 text-center font-medium">
                {m}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {cohorts.slice(0, 6).map((cohort, rowIndex) => {
            const values = [
              cohort.month0, cohort.month1, cohort.month2, cohort.month3,
              cohort.month4, cohort.month5, cohort.month6
            ]
            return (
              <tr key={rowIndex}>
                <td style={{ color: 'var(--text-primary)' }} className="px-2 py-1 font-medium">{cohort.cohort}</td>
                {values.map((value, colIndex) => (
                  <td key={colIndex} className="px-1 py-1">
                    <div className={`w-10 h-8 flex items-center justify-center rounded text-xs font-medium ${getColorClass(value)}`}>
                      {value !== null ? `${value}%` : '-'}
                    </div>
                  </td>
                ))}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function HealthDistribution({ healthy, atRisk, churned }: { healthy: number, atRisk: number, churned: number }) {
  const total = healthy + atRisk + churned
  if (total === 0) return null

  const healthyPct = (healthy / total) * 100
  const atRiskPct = (atRisk / total) * 100
  const churnedPct = (churned / total) * 100

  return (
    <div className="space-y-3">
      <div style={{ backgroundColor: 'var(--bg-secondary)' }} className="flex h-3 rounded-full overflow-hidden">
        <div className="bg-green-500" style={{ width: `${healthyPct}%` }} />
        <div className="bg-amber-500" style={{ width: `${atRiskPct}%` }} />
        <div className="bg-red-500" style={{ width: `${churnedPct}%` }} />
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <Heart className="w-4 h-4 text-green-500" />
            <span style={{ color: 'var(--text-muted)' }} className="text-xs">Healthy</span>
          </div>
          <p style={{ color: 'var(--text-primary)' }} className="text-lg font-bold">{healthy}</p>
          <p className="text-xs text-green-600">{healthyPct.toFixed(0)}%</p>
        </div>
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <AlertCircle className="w-4 h-4 text-amber-500" />
            <span style={{ color: 'var(--text-muted)' }} className="text-xs">At Risk</span>
          </div>
          <p style={{ color: 'var(--text-primary)' }} className="text-lg font-bold">{atRisk}</p>
          <p className="text-xs text-amber-600">{atRiskPct.toFixed(0)}%</p>
        </div>
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <UserMinus className="w-4 h-4 text-red-500" />
            <span style={{ color: 'var(--text-muted)' }} className="text-xs">Churned</span>
          </div>
          <p style={{ color: 'var(--text-primary)' }} className="text-lg font-bold">{churned}</p>
          <p className="text-xs text-red-600">{churnedPct.toFixed(0)}%</p>
        </div>
      </div>
    </div>
  )
}

export function CustomerLifecycleSection({ metrics, loading, currency = 'ZAR' }: Props) {
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-cyan-100">
            <Users className="text-cyan-600" size={20} />
          </div>
          <div>
            <h2 style={{ color: 'var(--text-primary)' }} className="text-lg font-semibold">Customer Lifecycle</h2>
            <p style={{ color: 'var(--text-muted)' }} className="text-sm">From acquisition to retention</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map(i => (
            <div key={i} style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }} className="rounded-xl border p-6 animate-pulse">
              <div style={{ backgroundColor: 'var(--bg-secondary)' }} className="w-16 h-4 rounded mb-2" />
              <div style={{ backgroundColor: 'var(--bg-secondary)' }} className="w-24 h-8 rounded" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (!metrics) return null

  return (
    <div className="space-y-6">
      {/* Section Header */}
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-lg bg-cyan-100">
          <Users className="text-cyan-600" size={20} />
        </div>
        <div>
          <h2 style={{ color: 'var(--text-primary)' }} className="text-lg font-semibold">Customer Lifecycle</h2>
          <p style={{ color: 'var(--text-muted)' }} className="text-sm">From acquisition to retention</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }} className="rounded-xl border p-6">
          <p style={{ color: 'var(--text-muted)' }} className="text-sm font-medium mb-1">Active Customers</p>
          <p style={{ color: 'var(--text-primary)' }} className="text-2xl font-bold">{metrics.activeCustomers.toLocaleString()}</p>
          <p style={{ color: 'var(--text-muted)' }} className="text-xs mt-2">of {metrics.totalCustomers.toLocaleString()} total</p>
        </div>

        <div style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }} className="rounded-xl border p-6">
          <p style={{ color: 'var(--text-muted)' }} className="text-sm font-medium mb-1">Customer LTV</p>
          <p style={{ color: 'var(--text-primary)' }} className="text-2xl font-bold">{formatCurrency(metrics.ltv, currency)}</p>
          <p style={{ color: 'var(--text-muted)' }} className="text-xs mt-2">Lifetime value</p>
        </div>

        <div style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }} className="rounded-xl border p-6">
          <p style={{ color: 'var(--text-muted)' }} className="text-sm font-medium mb-1">Avg Lifespan</p>
          <p style={{ color: 'var(--text-primary)' }} className="text-2xl font-bold">{metrics.averageLifespan} mo</p>
          <p style={{ color: 'var(--text-muted)' }} className="text-xs mt-2">Customer tenure</p>
        </div>

        <div style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }} className="rounded-xl border p-6">
          <p style={{ color: 'var(--text-muted)' }} className="text-sm font-medium mb-1">Net New</p>
          {(() => {
            const netNew = metrics.newCustomers - metrics.churnedCustomers
            return (
              <>
                <div className="flex items-center gap-2">
                  <p className={`text-2xl font-bold ${netNew >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {netNew >= 0 ? '+' : ''}{netNew}
                  </p>
                  {netNew >= 0 ? (
                    <TrendingUp className="text-green-500" size={20} />
                  ) : (
                    <TrendingDown className="text-red-500" size={20} />
                  )}
                </div>
                <p style={{ color: 'var(--text-muted)' }} className="text-xs mt-2">
                  +{metrics.newCustomers} new, -{metrics.churnedCustomers} churned
                </p>
              </>
            )
          })()}
        </div>
      </div>

      {/* Cohort & Health */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Cohort Retention Heatmap */}
        <div style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }} className="rounded-xl border p-6">
          <h3 style={{ color: 'var(--text-primary)' }} className="text-sm font-semibold mb-4">Cohort Retention</h3>
          <CohortHeatmap cohorts={metrics.cohortRetention} />
        </div>

        {/* Customer Health Distribution */}
        <div style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }} className="rounded-xl border p-6">
          <h3 style={{ color: 'var(--text-primary)' }} className="text-sm font-semibold mb-4">Customer Health</h3>
          {(() => {
            // healthDistribution is an array of { score, count, percentage }
            const healthyItem = metrics.healthDistribution?.find(h => h.score === 'healthy')
            const atRiskItem = metrics.healthDistribution?.find(h => h.score === 'at_risk' || h.score === 'atRisk')
            const churnedItem = metrics.healthDistribution?.find(h => h.score === 'churned')
            return (
              <HealthDistribution
                healthy={healthyItem?.count || metrics.activeCustomers}
                atRisk={atRiskItem?.count || 0}
                churned={churnedItem?.count || metrics.churnedCustomers}
              />
            )
          })()}
        </div>
      </div>

      {/* Customer Growth by Plan */}
      {metrics.customersByPlan && metrics.customersByPlan.length > 0 && (
        <div style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }} className="rounded-xl border p-6">
          <h3 style={{ color: 'var(--text-primary)' }} className="text-sm font-semibold mb-4">Customers by Plan</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {metrics.customersByPlan.map((planItem, index) => (
              <div key={index} style={{ backgroundColor: 'var(--bg-secondary)' }} className="text-center p-4 rounded-lg">
                <p style={{ color: 'var(--text-primary)' }} className="text-lg font-bold">{planItem.count}</p>
                <p style={{ color: 'var(--text-muted)' }} className="text-sm">{planItem.plan}</p>
                <p style={{ color: 'var(--text-muted)' }} className="text-xs">{planItem.percentage}%</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

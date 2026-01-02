import { AlertTriangle, TrendingDown, Clock, DollarSign, AlertCircle, ChevronRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { ComprehensiveGrowthMetrics } from '../../../services/adminApi'

interface Props {
  metrics: ComprehensiveGrowthMetrics | null
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

function ChurnReasons({ reasons }: { reasons?: { reason: string; count: number; percentage: number }[] }) {
  if (!reasons || reasons.length === 0) {
    return (
      <div className="flex items-center justify-center h-24 text-gray-500 text-sm">
        No churn reason data available
      </div>
    )
  }

  const colors = ['bg-red-500', 'bg-red-400', 'bg-amber-500', 'bg-amber-400', 'bg-gray-400']

  return (
    <div className="space-y-3">
      {reasons.slice(0, 5).map((item, index) => (
        <div key={index}>
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm text-gray-700">{item.reason}</span>
            <span className="text-sm font-medium text-gray-900">{item.count}</span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full ${colors[index] || colors[colors.length - 1]}`}
              style={{ width: `${item.percentage}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}

function AtRiskList({ tenants }: { tenants?: { id: string; name: string; riskScore: number; lastActive: string; mrr: number }[] }) {
  if (!tenants || tenants.length === 0) {
    return (
      <div className="flex items-center justify-center h-24 text-gray-500 text-sm">
        No at-risk tenants identified
      </div>
    )
  }

  const getRiskColor = (score: number) => {
    if (score >= 80) return 'bg-red-100 text-red-700'
    if (score >= 60) return 'bg-amber-100 text-amber-700'
    return 'bg-yellow-100 text-yellow-700'
  }

  return (
    <div className="space-y-2">
      {tenants.slice(0, 5).map((tenant) => (
        <Link
          key={tenant.id}
          to={`/admin/tenants/${tenant.id}`}
          className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors group"
        >
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">{tenant.name}</p>
            <p className="text-xs text-gray-500">Last active: {tenant.lastActive}</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded-full ${getRiskColor(tenant.riskScore)}`}>
                {tenant.riskScore}% risk
              </span>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-gray-600" />
          </div>
        </Link>
      ))}
    </div>
  )
}

export function ChurnRiskSection({ metrics, loading, currency = 'ZAR' }: Props) {
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-red-100">
            <AlertTriangle className="text-red-600" size={20} />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Churn & Risk</h2>
            <p className="text-sm text-gray-500">Proactive churn management</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 p-6 animate-pulse">
              <div className="w-16 h-4 bg-gray-200 rounded mb-2" />
              <div className="w-24 h-8 bg-gray-200 rounded" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (!metrics) return null

  const churnData = metrics.churn || {
    churnedTenants: 0,
    churnRate: 0,
    churnReasons: [],
    avgTenureBeforeChurn: 0,
    churnTrend: [],
    atRiskTenants: 0
  }

  // Map to the format expected by the component
  const churn = {
    churnedCount: churnData.churnedTenants,
    atRiskCount: churnData.atRiskTenants,
    avgTenure: churnData.avgTenureBeforeChurn,
    revenueChurn: 0, // Not available in current type
    churnReasons: churnData.churnReasons,
    atRiskTenants: [] as { id: string; name: string; riskScore: number; lastActive: string; mrr: number }[]
  }

  const churnRate = churnData.churnRate || 0
  const churnHealth = churnRate < 3 ? 'Low' : churnRate < 5 ? 'Moderate' : 'High'
  const churnHealthColor = churnRate < 3 ? 'text-green-600' : churnRate < 5 ? 'text-amber-600' : 'text-red-600'

  return (
    <div className="space-y-6">
      {/* Section Header */}
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-lg bg-red-100">
          <AlertTriangle className="text-red-600" size={20} />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Churn & Risk</h2>
          <p className="text-sm text-gray-500">Proactive churn management</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-3">
            <TrendingDown className="text-red-500" size={18} />
            <p className="text-sm font-medium text-gray-500">Churn Rate</p>
          </div>
          <p className={`text-2xl font-bold ${churnHealthColor}`}>
            {churnRate.toFixed(1)}%
          </p>
          <p className={`text-xs mt-2 ${churnHealthColor}`}>{churnHealth} churn</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-3">
            <AlertCircle className="text-amber-500" size={18} />
            <p className="text-sm font-medium text-gray-500">At-Risk Tenants</p>
          </div>
          <p className="text-2xl font-bold text-amber-600">{churn.atRiskCount}</p>
          <p className="text-xs text-gray-500 mt-2">Need attention</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-3">
            <Clock className="text-gray-500" size={18} />
            <p className="text-sm font-medium text-gray-500">Avg Tenure</p>
          </div>
          <p className="text-2xl font-bold text-gray-900">{churn.avgTenure} mo</p>
          <p className="text-xs text-gray-500 mt-2">Before churn</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-3">
            <DollarSign className="text-red-500" size={18} />
            <p className="text-sm font-medium text-gray-500">Revenue Churn</p>
          </div>
          <p className="text-2xl font-bold text-red-600">
            {formatCurrency(churn.revenueChurn, currency)}
          </p>
          <p className="text-xs text-gray-500 mt-2">Lost this period</p>
        </div>
      </div>

      {/* Churn Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Churn Reasons */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Top Churn Reasons</h3>
          <ChurnReasons reasons={churn.churnReasons} />
        </div>

        {/* At-Risk Tenants */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-900">At-Risk Tenants</h3>
            {churn.atRiskCount > 5 && (
              <Link
                to="/admin/tenants?filter=at-risk"
                className="text-xs text-accent-600 hover:text-accent-700"
              >
                View all {churn.atRiskCount}
              </Link>
            )}
          </div>
          <AtRiskList tenants={churn.atRiskTenants} />
        </div>
      </div>

      {/* Churned Summary */}
      {churn.churnedCount > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-5">
          <div className="flex items-start gap-4">
            <div className="p-2 bg-red-100 rounded-lg">
              <AlertTriangle className="text-red-600" size={20} />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-red-900">
                {churn.churnedCount} tenants churned this period
              </h4>
              <p className="text-sm text-red-700 mt-1">
                Representing {formatCurrency(churn.revenueChurn, currency)} in lost MRR.
                Review churn reasons and at-risk tenants to reduce future churn.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

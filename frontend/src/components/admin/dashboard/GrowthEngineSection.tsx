import { TrendingUp, Users, Target, Zap, ArrowRight } from 'lucide-react'
import { ComprehensiveGrowthMetrics } from '../../../services/adminApi'

interface Props {
  metrics: ComprehensiveGrowthMetrics | null
  loading?: boolean
}

function FunnelVisualization({ funnel }: { funnel: ComprehensiveGrowthMetrics['activationFunnel'] }) {
  if (!funnel || !funnel.stages || funnel.stages.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-gray-500 text-sm">
        No funnel data available
      </div>
    )
  }

  const maxCount = Math.max(...funnel.stages.map(s => s.count))

  return (
    <div className="space-y-3">
      {funnel.stages.map((stage, index) => {
        const width = maxCount > 0 ? (stage.count / maxCount) * 100 : 0
        const dropoff = index > 0 ? funnel.stages[index - 1].count - stage.count : 0
        const dropoffPct = index > 0 && funnel.stages[index - 1].count > 0
          ? ((dropoff / funnel.stages[index - 1].count) * 100).toFixed(0)
          : 0

        return (
          <div key={index}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm text-gray-700">{stage.stage}</span>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-900">{stage.count.toLocaleString()}</span>
                <span className="text-xs text-gray-500">({stage.percentage}%)</span>
              </div>
            </div>
            <div className="relative">
              <div className="h-6 bg-gray-100 rounded-lg overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-purple-500 to-purple-400 rounded-lg transition-all duration-500"
                  style={{ width: `${width}%` }}
                />
              </div>
              {index > 0 && dropoff > 0 && (
                <div className="absolute -right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 text-xs text-red-500">
                  <span>-{dropoffPct}%</span>
                </div>
              )}
            </div>
          </div>
        )
      })}

      {/* Time to Value Metrics */}
      {funnel.timeToValue && (
        <div className="grid grid-cols-3 gap-4 pt-4 border-t border-gray-100 mt-4">
          <div className="text-center">
            <p className="text-xs text-gray-500">Time to First Room</p>
            <p className="text-sm font-bold text-gray-900">{funnel.timeToValue.avgDaysToFirstRoom}d</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-500">Time to First Booking</p>
            <p className="text-sm font-bold text-gray-900">{funnel.timeToValue.avgDaysToFirstBooking}d</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-500">Time to Payment</p>
            <p className="text-sm font-bold text-gray-900">{funnel.timeToValue.avgDaysToFirstPayment}d</p>
          </div>
        </div>
      )}
    </div>
  )
}

function AcquisitionSources({ sources }: { sources: ComprehensiveGrowthMetrics['attribution']['sourcePerformance'] }) {
  if (!sources || sources.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-gray-500 text-sm">
        No acquisition data available
      </div>
    )
  }

  const colors = ['#8B5CF6', '#3B82F6', '#10B981', '#F59E0B', '#EF4444']
  const total = sources.reduce((sum: number, s: { signups: number }) => sum + s.signups, 0)

  return (
    <div className="space-y-3">
      {sources.map((source: { source: string; signups: number; activationRate: number }, index: number) => {
        const percentage = total > 0 ? (source.signups / total) * 100 : 0

        return (
          <div key={index} className="flex items-center gap-3">
            <div
              className="w-3 h-3 rounded-full flex-shrink-0"
              style={{ backgroundColor: colors[index % colors.length] }}
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-gray-700 truncate">{source.source}</span>
                <span className="text-sm font-medium text-gray-900">{source.signups}</span>
              </div>
              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${percentage}%`,
                    backgroundColor: colors[index % colors.length]
                  }}
                />
              </div>
            </div>
            <div className="text-right w-16 flex-shrink-0">
              <span className="text-xs text-gray-500">{percentage.toFixed(0)}%</span>
              {source.activationRate !== undefined && (
                <p className="text-xs text-green-600">{source.activationRate}% conv</p>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

export function GrowthEngineSection({ metrics, loading }: Props) {
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-purple-100">
            <TrendingUp className="text-purple-600" size={20} />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Growth Engine</h2>
            <p className="text-sm text-gray-500">Acquisition funnel and growth levers</p>
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

  const tenantGrowth = metrics.tenantGrowth || { newSignups: 0, signupGrowth: 0, totalTenants: 0, signupsBySource: [], signupsByCampaign: [], signupTrend: [] }
  const activationFunnel = metrics.activationFunnel || { stages: [], timeToValue: { avgDaysToFirstRoom: 0, avgDaysToFirstBooking: 0, avgDaysToFirstPayment: 0 }, activationRate: 0 }
  const attribution = metrics.attribution || { sourcePerformance: [], campaignPerformance: [], bestPerformingSource: '', bestPerformingCampaign: '' }

  return (
    <div className="space-y-6">
      {/* Section Header */}
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-lg bg-purple-100">
          <TrendingUp className="text-purple-600" size={20} />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Growth Engine</h2>
          <p className="text-sm text-gray-500">Acquisition funnel and growth levers</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-3">
            <Users className="text-purple-500" size={18} />
            <p className="text-sm font-medium text-gray-500">New Signups</p>
          </div>
          <p className="text-2xl font-bold text-gray-900">{tenantGrowth.newSignups}</p>
          {tenantGrowth.signupGrowth !== 0 && (
            <p className={`text-xs mt-2 ${tenantGrowth.signupGrowth > 0 ? 'text-green-600' : 'text-red-600'}`}>
              {tenantGrowth.signupGrowth > 0 ? '+' : ''}{tenantGrowth.signupGrowth.toFixed(1)}% vs last period
            </p>
          )}
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-3">
            <Zap className="text-amber-500" size={18} />
            <p className="text-sm font-medium text-gray-500">Activation Rate</p>
          </div>
          <p className={`text-2xl font-bold ${activationFunnel.activationRate >= 50 ? 'text-green-600' : activationFunnel.activationRate >= 30 ? 'text-amber-600' : 'text-red-600'}`}>
            {activationFunnel.activationRate.toFixed(0)}%
          </p>
          <p className="text-xs text-gray-500 mt-2">Signup to payment</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-3">
            <Target className="text-blue-500" size={18} />
            <p className="text-sm font-medium text-gray-500">Trial Conversion</p>
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {(activationFunnel.activationRate || 0).toFixed(0)}%
          </p>
          <p className="text-xs text-gray-500 mt-2">Trial to paid</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-3">
            <ArrowRight className="text-green-500" size={18} />
            <p className="text-sm font-medium text-gray-500">Total Tenants</p>
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {tenantGrowth.totalTenants}
          </p>
          <p className="text-xs text-gray-500 mt-2">All time</p>
        </div>
      </div>

      {/* Funnel & Sources */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Activation Funnel */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Activation Funnel</h3>
          <FunnelVisualization funnel={activationFunnel} />
        </div>

        {/* Acquisition Sources */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Acquisition Sources</h3>
          <AcquisitionSources sources={attribution.sourcePerformance} />
        </div>
      </div>
    </div>
  )
}

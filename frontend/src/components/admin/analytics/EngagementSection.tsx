import {
  Activity,
  Clock,
  LogIn,
  Zap,
  Calendar,
  FileText,
  Settings,
  BarChart3,
  Users,
} from 'lucide-react'
import Card from '../../Card'
import { ComprehensiveGrowthMetrics } from '../../../services/adminApi'

function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-US').format(value)
}

interface Props {
  metrics: ComprehensiveGrowthMetrics | null
  loading?: boolean
}

// Feature icon mapping
const featureIcons: Record<string, React.ReactNode> = {
  bookings: <Calendar size={16} className="text-blue-600" />,
  calendar: <Calendar size={16} className="text-green-600" />,
  invoicing: <FileText size={16} className="text-purple-600" />,
  analytics: <BarChart3 size={16} className="text-amber-600" />,
  customers: <Users size={16} className="text-cyan-600" />,
  settings: <Settings size={16} className="text-gray-600" />,
}

export function EngagementSection({ metrics, loading }: Props) {
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

  const engagement = metrics?.engagement

  // Format session duration
  const formatDuration = (seconds: number): string => {
    if (seconds < 60) return `${seconds}s`
    const minutes = Math.floor(seconds / 60)
    if (minutes < 60) return `${minutes}m`
    const hours = Math.floor(minutes / 60)
    const remainingMinutes = minutes % 60
    return `${hours}h ${remainingMinutes}m`
  }

  return (
    <div className="space-y-6">
      {/* Section Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-orange-100">
          <Activity size={20} className="text-orange-600" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Engagement</h2>
          <p className="text-sm text-gray-500">Platform activity and feature adoption</p>
        </div>
      </div>

      {/* Primary KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="p-5 rounded-xl border border-gray-200 bg-white">
          <div className="flex items-start justify-between mb-3">
            <div className="p-2 rounded-lg bg-green-50">
              <Activity size={20} className="text-green-600" />
            </div>
          </div>
          <p className="text-sm text-gray-500 font-medium mb-1">Active (30d)</p>
          <p className="text-2xl font-bold text-gray-900">
            {engagement?.activeTenants30d || 0}
            <span className="text-lg text-gray-500 font-normal ml-1">
              ({engagement?.activeRate30d || 0}%)
            </span>
          </p>
          <p className="text-xs text-gray-500 mt-1">Active tenants</p>
        </div>

        <div className="p-5 rounded-xl border border-gray-200 bg-white">
          <div className="flex items-start justify-between mb-3">
            <div className="p-2 rounded-lg bg-blue-50">
              <LogIn size={20} className="text-blue-600" />
            </div>
          </div>
          <p className="text-sm text-gray-500 font-medium mb-1">Avg Logins</p>
          <p className="text-2xl font-bold text-gray-900">
            {(engagement?.avgLoginsPerTenant || 0).toFixed(1)}
          </p>
          <p className="text-xs text-gray-500 mt-1">Per tenant, per week</p>
        </div>

        <div className="p-5 rounded-xl border border-gray-200 bg-white">
          <div className="flex items-start justify-between mb-3">
            <div className="p-2 rounded-lg bg-purple-50">
              <Clock size={20} className="text-purple-600" />
            </div>
          </div>
          <p className="text-sm text-gray-500 font-medium mb-1">Avg Session</p>
          <p className="text-2xl font-bold text-gray-900">
            {formatDuration(engagement?.avgSessionDuration || 0)}
          </p>
          <p className="text-xs text-gray-500 mt-1">Time per session</p>
        </div>

        <div className="p-5 rounded-xl border border-gray-200 bg-white">
          <div className="flex items-start justify-between mb-3">
            <div className="p-2 rounded-lg bg-amber-50">
              <Zap size={20} className="text-amber-600" />
            </div>
          </div>
          <p className="text-sm text-gray-500 font-medium mb-1">Active (7d)</p>
          <p className="text-2xl font-bold text-gray-900">
            {engagement?.activeTenants7d || 0}
            <span className="text-lg text-gray-500 font-normal ml-1">
              ({engagement?.activeRate7d || 0}%)
            </span>
          </p>
          <p className="text-xs text-gray-500 mt-1">Recent activity</p>
        </div>
      </div>

      {/* Feature Adoption */}
      <Card title="Feature Adoption">
        <div className="mt-4">
          {engagement?.featureAdoption && engagement.featureAdoption.length > 0 ? (
            <div className="space-y-4">
              {engagement.featureAdoption.map((feature) => (
                <div key={feature.feature}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {featureIcons[feature.feature.toLowerCase()] || <Zap size={16} className="text-gray-400" />}
                      <span className="text-sm font-medium text-gray-700 capitalize">{feature.feature}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-gray-500">{formatNumber(feature.usage)} uses</span>
                      <span className="text-sm font-bold text-gray-900">{feature.adoptionRate}%</span>
                    </div>
                  </div>
                  <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        feature.adoptionRate >= 80 ? 'bg-green-500' :
                        feature.adoptionRate >= 50 ? 'bg-blue-500' :
                        feature.adoptionRate >= 30 ? 'bg-amber-500' : 'bg-gray-400'
                      }`}
                      style={{ width: `${feature.adoptionRate}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-gray-400">
              <Zap size={32} className="mx-auto mb-2 opacity-50" />
              <p>No feature adoption data available</p>
            </div>
          )}

          {/* Activity Summary */}
          <div className="mt-6 pt-4 border-t border-gray-100">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 rounded-lg bg-gray-50">
                <p className="text-xs text-gray-500 mb-1">Active (7d)</p>
                <p className="text-lg font-bold text-gray-900">
                  {engagement?.activeTenants7d || 0}
                  <span className="text-sm text-gray-500 font-normal ml-1">tenants</span>
                </p>
              </div>
              <div className="p-3 rounded-lg bg-gray-50">
                <p className="text-xs text-gray-500 mb-1">Avg Logins/Tenant</p>
                <p className="text-lg font-bold text-gray-900">
                  {(engagement?.avgLoginsPerTenant || 0).toFixed(1)}
                </p>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
}

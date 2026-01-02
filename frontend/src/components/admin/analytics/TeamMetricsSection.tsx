import {
  Users,
  UserPlus,
  UserCog,
  Shield,
  Crown,
  Eye,
} from 'lucide-react'
import Card from '../../Card'
import { DonutChart } from '../../analytics'
import { ComprehensiveGrowthMetrics } from '../../../services/adminApi'

function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-US').format(value)
}

interface Props {
  metrics: ComprehensiveGrowthMetrics | null
  loading?: boolean
}

export function TeamMetricsSection({ metrics, loading }: Props) {
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

  const team = metrics?.team

  // Prepare chart data for role distribution
  const roleChartData = team?.membersByRole?.map(r => ({
    name: r.role,
    value: r.count
  })) || []

  // Role icons mapping
  const roleIcons: Record<string, React.ReactNode> = {
    owner: <Crown size={16} className="text-amber-600" />,
    admin: <Shield size={16} className="text-blue-600" />,
    manager: <UserCog size={16} className="text-purple-600" />,
    staff: <Users size={16} className="text-gray-600" />,
    viewer: <Eye size={16} className="text-gray-400" />,
  }

  return (
    <div className="space-y-6">
      {/* Section Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-indigo-100">
          <Users size={20} className="text-indigo-600" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Team Metrics</h2>
          <p className="text-sm text-gray-500">Team member distribution across tenants</p>
        </div>
      </div>

      {/* Primary KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="p-5 rounded-xl border border-gray-200 bg-white">
          <div className="flex items-start justify-between mb-3">
            <div className="p-2 rounded-lg bg-indigo-50">
              <Users size={20} className="text-indigo-600" />
            </div>
          </div>
          <p className="text-sm text-gray-500 font-medium mb-1">Total Members</p>
          <p className="text-2xl font-bold text-gray-900">{formatNumber(team?.totalMembers || 0)}</p>
          <p className="text-xs text-gray-500 mt-1">Across all tenants</p>
        </div>

        <div className="p-5 rounded-xl border border-gray-200 bg-white">
          <div className="flex items-start justify-between mb-3">
            <div className="p-2 rounded-lg bg-green-50">
              <UserPlus size={20} className="text-green-600" />
            </div>
          </div>
          <p className="text-sm text-gray-500 font-medium mb-1">New Members</p>
          <p className="text-2xl font-bold text-green-600">+{formatNumber(team?.newMembers || 0)}</p>
          <p className="text-xs text-gray-500 mt-1">This period</p>
        </div>

        <div className="p-5 rounded-xl border border-gray-200 bg-white">
          <div className="flex items-start justify-between mb-3">
            <div className="p-2 rounded-lg bg-purple-50">
              <UserCog size={20} className="text-purple-600" />
            </div>
          </div>
          <p className="text-sm text-gray-500 font-medium mb-1">Avg Team Size</p>
          <p className="text-2xl font-bold text-gray-900">{(team?.avgTeamSize || 0).toFixed(1)}</p>
          <p className="text-xs text-gray-500 mt-1">Members per tenant</p>
        </div>

        <div className="p-5 rounded-xl border border-gray-200 bg-white">
          <div className="flex items-start justify-between mb-3">
            <div className="p-2 rounded-lg bg-amber-50">
              <Users size={20} className="text-amber-600" />
            </div>
          </div>
          <p className="text-sm text-gray-500 font-medium mb-1">Multi-Member Teams</p>
          <p className="text-2xl font-bold text-gray-900">{team?.teamsWithMultipleMembers || 0}%</p>
          <p className="text-xs text-gray-500 mt-1">Teams with 2+ members</p>
        </div>
      </div>

      {/* Role Distribution */}
      <Card title="Role Distribution">
        <div className="mt-4">
          {roleChartData.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <DonutChart
                data={roleChartData}
                height={180}
                centerValue={formatNumber(team?.totalMembers || 0)}
                centerLabel="Members"
              />
              <div className="space-y-3">
                {team?.membersByRole?.map((role, idx) => (
                  <div key={role.role} className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${
                        idx === 0 ? 'bg-amber-500' :
                        idx === 1 ? 'bg-blue-500' :
                        idx === 2 ? 'bg-purple-500' :
                        idx === 3 ? 'bg-gray-500' : 'bg-gray-300'
                      }`} />
                      <div className="flex items-center gap-2">
                        {roleIcons[role.role.toLowerCase()] || <Users size={16} className="text-gray-400" />}
                        <span className="text-sm font-medium text-gray-700 capitalize">{role.role}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-bold text-gray-900">{formatNumber(role.count)}</span>
                      <span className="text-xs text-gray-500 w-12 text-right">{role.percentage}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="h-[180px] flex items-center justify-center text-gray-400">
              <div className="text-center">
                <Users size={32} className="mx-auto mb-2 opacity-50" />
                <p>No role data available</p>
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}

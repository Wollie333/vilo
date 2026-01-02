import { TrendingUp, Eye, Users, Clock, MousePointerClick, Monitor, Smartphone, Tablet } from 'lucide-react'
import { TrafficData } from '../../../services/analyticsApi'

interface Props {
  traffic: TrafficData | null
  loading?: boolean
}

function DonutChart({ data, colors }: { data: Array<{ name: string; value: number }>, colors: string[] }) {
  const total = data.reduce((sum, item) => sum + item.value, 0)
  if (total === 0) return null

  let currentAngle = 0
  const segments = data.map((item, i) => {
    const percentage = item.value / total
    const startAngle = currentAngle
    const endAngle = currentAngle + percentage * 360
    currentAngle = endAngle

    const startRad = (startAngle - 90) * (Math.PI / 180)
    const endRad = (endAngle - 90) * (Math.PI / 180)

    const largeArc = percentage > 0.5 ? 1 : 0
    const x1 = 50 + 40 * Math.cos(startRad)
    const y1 = 50 + 40 * Math.sin(startRad)
    const x2 = 50 + 40 * Math.cos(endRad)
    const y2 = 50 + 40 * Math.sin(endRad)

    return {
      path: `M 50 50 L ${x1} ${y1} A 40 40 0 ${largeArc} 1 ${x2} ${y2} Z`,
      color: colors[i % colors.length],
      percentage: (percentage * 100).toFixed(1),
      ...item,
    }
  })

  return (
    <div className="flex items-center gap-4">
      <svg viewBox="0 0 100 100" className="w-24 h-24 flex-shrink-0">
        {segments.map((seg, i) => (
          <path key={i} d={seg.path} fill={seg.color} className="hover:opacity-80 transition-opacity" />
        ))}
        <circle cx="50" cy="50" r="25" fill="white" />
      </svg>
      <div className="flex-1 space-y-1.5">
        {segments.map((seg, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: seg.color }} />
            <span className="text-xs text-gray-700 flex-1 truncate capitalize">{seg.name}</span>
            <span className="text-xs font-medium text-gray-900">{seg.percentage}%</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function DeviceBreakdown({ data }: { data: Array<{ device: string; sessions: number }> }) {
  const total = data.reduce((sum, d) => sum + d.sessions, 0)
  if (total === 0) return null

  const getDeviceIcon = (device: string) => {
    const lower = device.toLowerCase()
    if (lower.includes('mobile') || lower.includes('phone')) return Smartphone
    if (lower.includes('tablet')) return Tablet
    return Monitor
  }

  const getDeviceColor = (device: string) => {
    const lower = device.toLowerCase()
    if (lower.includes('mobile') || lower.includes('phone')) return 'bg-purple-500'
    if (lower.includes('tablet')) return 'bg-amber-500'
    return 'bg-blue-500'
  }

  return (
    <div className="space-y-3">
      {data.map((item) => {
        const Icon = getDeviceIcon(item.device)
        const percentage = (item.sessions / total) * 100

        return (
          <div key={item.device} className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${getDeviceColor(item.device).replace('bg-', 'bg-opacity-20 bg-')}`}>
              <Icon size={18} className={getDeviceColor(item.device).replace('bg-', 'text-')} />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="text-gray-700 capitalize">{item.device}</span>
                <span className="font-medium text-gray-900">{item.sessions.toLocaleString()}</span>
              </div>
              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full ${getDeviceColor(item.device)} rounded-full`}
                  style={{ width: `${percentage}%` }}
                />
              </div>
            </div>
            <span className="text-sm text-gray-500 w-12 text-right">{percentage.toFixed(0)}%</span>
          </div>
        )
      })}
    </div>
  )
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds.toFixed(0)}s`
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = Math.round(seconds % 60)
  return `${minutes}m ${remainingSeconds}s`
}

export function TrafficSection({ traffic, loading }: Props) {
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-purple-100">
            <TrendingUp className="text-purple-600" size={20} />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Traffic & Engagement</h2>
            <p className="text-sm text-gray-500">Website traffic and visitor behavior</p>
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

  if (!traffic) return null

  const sourceColors = ['#8B5CF6', '#EC4899', '#F59E0B', '#10B981', '#3B82F6']

  return (
    <div className="space-y-6">
      {/* Section Header */}
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-lg bg-purple-100">
          <TrendingUp className="text-purple-600" size={20} />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Traffic & Engagement</h2>
          <p className="text-sm text-gray-500">Website traffic and visitor behavior</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-3">
            <Eye className="text-purple-500" size={18} />
            <p className="text-sm font-medium text-gray-500">Sessions</p>
          </div>
          <p className="text-2xl font-bold text-gray-900">{traffic.totalSessions?.toLocaleString() || 0}</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-3">
            <Users className="text-blue-500" size={18} />
            <p className="text-sm font-medium text-gray-500">Unique Visitors</p>
          </div>
          <p className="text-2xl font-bold text-gray-900">{traffic.uniqueVisitors?.toLocaleString() || 0}</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-3">
            <MousePointerClick className="text-green-500" size={18} />
            <p className="text-sm font-medium text-gray-500">Page Views</p>
          </div>
          <p className="text-2xl font-bold text-gray-900">{traffic.totalPageViews?.toLocaleString() || 0}</p>
          <p className="text-xs text-gray-500 mt-1">
            {traffic.avgPagesPerSession?.toFixed(1) || 0} pages/session
          </p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-3">
            <Clock className="text-amber-500" size={18} />
            <p className="text-sm font-medium text-gray-500">Bounce Rate</p>
          </div>
          <p className={`text-2xl font-bold ${
            (traffic.bounceRate || 0) < 40 ? 'text-green-600' :
            (traffic.bounceRate || 0) < 60 ? 'text-amber-600' : 'text-red-600'
          }`}>
            {(traffic.bounceRate || 0).toFixed(1)}%
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Avg session: {formatDuration(traffic.avgSessionDuration || 0)}
          </p>
        </div>
      </div>

      {/* Traffic Sources & Device Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Traffic Sources */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Traffic Sources</h3>
          {traffic.bySource && traffic.bySource.length > 0 ? (
            <DonutChart
              data={traffic.bySource.map(s => ({ name: s.source || 'Direct', value: s.sessions }))}
              colors={sourceColors}
            />
          ) : (
            <div className="flex items-center justify-center h-32 text-gray-500 text-sm">
              No source data available
            </div>
          )}
        </div>

        {/* Device Breakdown */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Device Breakdown</h3>
          {traffic.byDevice && traffic.byDevice.length > 0 ? (
            <DeviceBreakdown data={traffic.byDevice} />
          ) : (
            <div className="flex items-center justify-center h-32 text-gray-500 text-sm">
              No device data available
            </div>
          )}
        </div>
      </div>

      {/* Page Type Views */}
      {traffic.byPageType && traffic.byPageType.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Views by Page Type</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {traffic.byPageType.map((page) => (
              <div key={page.page_type} className="text-center p-4 bg-gray-50 rounded-lg">
                <p className="text-xl font-bold text-gray-900">{page.views.toLocaleString()}</p>
                <p className="text-xs text-gray-500 capitalize">{page.page_type.replace(/_/g, ' ')}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

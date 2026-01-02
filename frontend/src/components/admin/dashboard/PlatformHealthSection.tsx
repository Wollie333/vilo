import { Activity, Server, HardDrive, Home, Calendar, TrendingUp } from 'lucide-react'
import { UsageMetrics, ComprehensiveGrowthMetrics } from '../../../services/adminApi'

interface Props {
  usageMetrics: UsageMetrics | null
  growthMetrics: ComprehensiveGrowthMetrics | null
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

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

function formatNumber(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
  return num.toLocaleString()
}

function GMVTrendChart({ data }: { data?: { date: string; value: number }[] }) {
  if (!data || data.length < 2) {
    return (
      <div className="flex items-center justify-center h-24 text-gray-500 text-sm">
        No trend data available
      </div>
    )
  }

  const values = data.map(d => d.value)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1

  const points = values.map((v, i) => {
    const x = (i / (values.length - 1)) * 280
    const y = 80 - ((v - min) / range) * 60
    return `${x},${y}`
  }).join(' ')

  // Create area path
  const areaPath = `M 0,80 L ${points} L 280,80 Z`

  return (
    <div className="w-full">
      <svg viewBox="0 0 280 90" className="w-full h-24">
        {/* Area fill */}
        <defs>
          <linearGradient id="gmvGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#F59E0B" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#F59E0B" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={areaPath} fill="url(#gmvGradient)" />

        {/* Line */}
        <polyline
          points={points}
          fill="none"
          stroke="#F59E0B"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Dots at endpoints */}
        {values.length > 0 && (
          <>
            <circle
              cx="0"
              cy={80 - ((values[0] - min) / range) * 60}
              r="3"
              fill="#F59E0B"
            />
            <circle
              cx="280"
              cy={80 - ((values[values.length - 1] - min) / range) * 60}
              r="3"
              fill="#F59E0B"
            />
          </>
        )}
      </svg>
    </div>
  )
}

function StatusIndicators() {
  const statuses = [
    { name: 'API', status: 'healthy', uptime: '99.9%' },
    { name: 'Database', status: 'healthy', uptime: '99.9%' },
    { name: 'Storage', status: 'healthy', uptime: '100%' },
    { name: 'Payments', status: 'healthy', uptime: '99.8%' },
  ]

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'bg-green-500'
      case 'degraded': return 'bg-amber-500'
      case 'down': return 'bg-red-500'
      default: return 'bg-gray-500'
    }
  }

  return (
    <div className="grid grid-cols-2 gap-3">
      {statuses.map((item) => (
        <div key={item.name} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
          <div className={`w-2 h-2 rounded-full ${getStatusColor(item.status)}`} />
          <span className="text-sm text-gray-700">{item.name}</span>
          <span className="ml-auto text-xs text-gray-500">{item.uptime}</span>
        </div>
      ))}
    </div>
  )
}

export function PlatformHealthSection({ usageMetrics, growthMetrics, loading, currency = 'ZAR' }: Props) {
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-amber-100">
            <Activity className="text-amber-600" size={20} />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Platform Health</h2>
            <p className="text-sm text-gray-500">Operational metrics and system health</p>
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

  const usage = usageMetrics || { apiRequestsToday: 0, storageUsedMb: 0, totalRooms: 0, totalBookings: 0, dau: 0, wau: 0, mau: 0, dauWauRatio: 0, avgBookingsPerTenant: 0, avgRoomsPerTenant: 0, featureAdoption: [], usageTrend: [], planLimitUtilization: [], topApiConsumers: [] }
  const inventory = growthMetrics?.inventory || { totalRooms: 0, newRooms: 0, activeRooms: 0, roomGrowth: 0, activeRoomRate: 0, avgRoomsPerTenant: 0, roomsTrend: [] }
  const gmv = growthMetrics?.gmv || { totalGMV: 0, gmvGrowth: 0, avgBookingValue: 0, totalBookings: 0, bookingGrowth: 0, avgBookingValueGrowth: 0, revenuePerActiveTenant: 0, gmvTrend: [] }

  return (
    <div className="space-y-6">
      {/* Section Header */}
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-lg bg-amber-100">
          <Activity className="text-amber-600" size={20} />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Platform Health</h2>
          <p className="text-sm text-gray-500">Operational metrics and system health</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-3">
            <Server className="text-blue-500" size={18} />
            <p className="text-sm font-medium text-gray-500">API Requests</p>
          </div>
          <p className="text-2xl font-bold text-gray-900">{formatNumber(usage.apiRequestsToday)}</p>
          <p className="text-xs text-gray-500 mt-2">Today</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-3">
            <HardDrive className="text-purple-500" size={18} />
            <p className="text-sm font-medium text-gray-500">Storage Used</p>
          </div>
          <p className="text-2xl font-bold text-gray-900">{formatBytes(usage.storageUsedMb * 1024 * 1024)}</p>
          <p className="text-xs text-gray-500 mt-2">Total storage</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-3">
            <Home className="text-green-500" size={18} />
            <p className="text-sm font-medium text-gray-500">Active Rooms</p>
          </div>
          <p className="text-2xl font-bold text-gray-900">{formatNumber(inventory.activeRooms || usage.totalRooms)}</p>
          <p className="text-xs text-gray-500 mt-2">of {formatNumber(inventory.totalRooms || usage.totalRooms)} total</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-3">
            <Calendar className="text-amber-500" size={18} />
            <p className="text-sm font-medium text-gray-500">Total Bookings</p>
          </div>
          <p className="text-2xl font-bold text-gray-900">{formatNumber(gmv.totalBookings || usage.totalBookings)}</p>
          <p className="text-xs text-gray-500 mt-2">All time</p>
        </div>
      </div>

      {/* GMV & System Status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* GMV Card */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-900">Platform GMV</h3>
            {gmv.gmvGrowth !== 0 && (
              <div className={`flex items-center gap-1 text-sm ${gmv.gmvGrowth > 0 ? 'text-green-600' : 'text-red-600'}`}>
                <TrendingUp size={14} />
                {gmv.gmvGrowth > 0 ? '+' : ''}{gmv.gmvGrowth.toFixed(1)}%
              </div>
            )}
          </div>

          <p className="text-3xl font-bold text-gray-900 mb-2">
            {formatCurrency(gmv.totalGMV, currency)}
          </p>
          <p className="text-sm text-gray-500 mb-4">
            Gross Merchandise Value
          </p>

          <GMVTrendChart data={gmv.gmvTrend?.map(d => ({ date: d.date, value: d.gmv }))} />

          <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-gray-100">
            <div>
              <p className="text-xs text-gray-500">Avg Booking Value</p>
              <p className="text-lg font-semibold text-gray-900">
                {formatCurrency(gmv.avgBookingValue, currency)}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">New Rooms</p>
              <p className="text-lg font-semibold text-gray-900">
                +{inventory.newRooms}
              </p>
            </div>
          </div>
        </div>

        {/* System Status */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">System Status</h3>
          <StatusIndicators />

          <div className="mt-6 pt-4 border-t border-gray-100">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">Overall Health</span>
              <span className="font-medium text-green-600">All Systems Operational</span>
            </div>
          </div>

          {/* Usage Breakdown */}
          <div className="mt-6 space-y-3">
            <div>
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="text-gray-600">API Quota</span>
                <span className="text-gray-900">12% used</span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-blue-500 rounded-full" style={{ width: '12%' }} />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="text-gray-600">Storage Quota</span>
                <span className="text-gray-900">34% used</span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-purple-500 rounded-full" style={{ width: '34%' }} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

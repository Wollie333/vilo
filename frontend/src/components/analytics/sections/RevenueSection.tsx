import { DollarSign, TrendingUp, TrendingDown } from 'lucide-react'
import { RevenueBreakdown } from '../../../services/analyticsApi'

interface Props {
  revenue: RevenueBreakdown | null
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

function RevenueTrendChart({ data }: { data?: Array<{ date: string; revenue: number }> }) {
  if (!data || data.length < 2) {
    return (
      <div className="flex items-center justify-center h-32 text-gray-500 text-sm">
        No trend data available
      </div>
    )
  }

  const values = data.map(d => d.revenue)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1

  const points = values.map((v, i) => {
    const x = (i / (values.length - 1)) * 280
    const y = 100 - ((v - min) / range) * 80
    return `${x},${y}`
  }).join(' ')

  const areaPath = `M 0,100 L ${points} L 280,100 Z`

  return (
    <div className="w-full">
      <svg viewBox="0 0 280 110" className="w-full h-32">
        <defs>
          <linearGradient id="revenueGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#10B981" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#10B981" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={areaPath} fill="url(#revenueGradient)" />
        <polyline
          points={points}
          fill="none"
          stroke="#10B981"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {values.length > 0 && (
          <>
            <circle cx="0" cy={100 - ((values[0] - min) / range) * 80} r="3" fill="#10B981" />
            <circle cx="280" cy={100 - ((values[values.length - 1] - min) / range) * 80} r="3" fill="#10B981" />
          </>
        )}
      </svg>
    </div>
  )
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
    <div className="flex items-center gap-6">
      <svg viewBox="0 0 100 100" className="w-28 h-28 flex-shrink-0">
        {segments.map((seg, i) => (
          <path key={i} d={seg.path} fill={seg.color} className="hover:opacity-80 transition-opacity" />
        ))}
        <circle cx="50" cy="50" r="25" fill="white" />
      </svg>
      <div className="flex-1 space-y-2">
        {segments.map((seg, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: seg.color }} />
            <span className="text-sm text-gray-700 flex-1 truncate">{seg.name}</span>
            <span className="text-sm font-medium text-gray-900">{seg.percentage}%</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function HorizontalBarChart({ data, colors }: { data: Array<{ name: string; value: number }>, colors: string[], currency?: string }) {
  const maxValue = Math.max(...data.map(d => d.value), 1)

  return (
    <div className="space-y-3">
      {data.slice(0, 5).map((item, i) => (
        <div key={item.name}>
          <div className="flex items-center justify-between text-sm mb-1">
            <span className="text-gray-700 truncate flex-1 mr-2">{item.name}</span>
            <span className="font-medium text-gray-900">{formatCurrency(item.value)}</span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${(item.value / maxValue) * 100}%`,
                backgroundColor: colors[i % colors.length]
              }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}

export function RevenueSection({ revenue, loading, currency = 'ZAR' }: Props) {
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-green-100">
            <DollarSign className="text-green-600" size={20} />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Revenue Intelligence</h2>
            <p className="text-sm text-gray-500">Revenue breakdown and trends</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 p-6 animate-pulse">
              <div className="w-16 h-4 bg-gray-200 rounded mb-4" />
              <div className="w-24 h-8 bg-gray-200 rounded" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (!revenue) return null

  const sourceColors = ['#10B981', '#3B82F6', '#8B5CF6', '#F59E0B', '#EF4444']
  const roomColors = ['#06B6D4', '#8B5CF6', '#EC4899', '#F97316', '#84CC16']

  const confirmedRevenue = revenue.byStatus?.find(s => s.status === 'confirmed')?.revenue || 0
  const pendingRevenue = revenue.byStatus?.find(s => s.status === 'pending')?.revenue || 0
  const totalBookings = revenue.byRoom?.reduce((sum, r) => sum + r.bookings, 0) || 0
  const avgBookingValue = totalBookings > 0 ? revenue.total / totalBookings : 0

  return (
    <div className="space-y-6">
      {/* Section Header */}
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-lg bg-green-100">
          <DollarSign className="text-green-600" size={20} />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Revenue Intelligence</h2>
          <p className="text-sm text-gray-500">Revenue breakdown and trends</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <p className="text-sm font-medium text-gray-500 mb-1">Total Revenue</p>
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(revenue.total, currency)}</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <p className="text-sm font-medium text-gray-500 mb-1">Confirmed Revenue</p>
          <p className="text-2xl font-bold text-green-600">{formatCurrency(confirmedRevenue, currency)}</p>
          <p className="text-xs text-gray-500 mt-1">
            {revenue.total > 0 ? ((confirmedRevenue / revenue.total) * 100).toFixed(0) : 0}% of total
          </p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <p className="text-sm font-medium text-gray-500 mb-1">Pending Revenue</p>
          <p className="text-2xl font-bold text-amber-600">{formatCurrency(pendingRevenue, currency)}</p>
          <p className="text-xs text-gray-500 mt-1">Awaiting confirmation</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <p className="text-sm font-medium text-gray-500 mb-1">Avg Booking Value</p>
          <p className="text-2xl font-bold text-blue-600">{formatCurrency(avgBookingValue, currency)}</p>
          <p className="text-xs text-gray-500 mt-1">Per booking</p>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Trend */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Revenue Trend</h3>
          <RevenueTrendChart data={revenue.trend} />
        </div>

        {/* Revenue by Source */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Revenue by Source</h3>
          {revenue.bySource && revenue.bySource.length > 0 ? (
            <DonutChart
              data={revenue.bySource.map(s => ({ name: s.source || 'Direct', value: s.revenue }))}
              colors={sourceColors}
            />
          ) : (
            <div className="flex items-center justify-center h-32 text-gray-500 text-sm">
              No source data available
            </div>
          )}
        </div>
      </div>

      {/* Revenue by Room */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">Revenue by Room</h3>
        {revenue.byRoom && revenue.byRoom.length > 0 ? (
          <HorizontalBarChart
            data={revenue.byRoom.map(r => ({ name: r.room_name, value: r.revenue }))}
            colors={roomColors}
            currency={currency}
          />
        ) : (
          <div className="flex items-center justify-center h-32 text-gray-500 text-sm">
            No room data available
          </div>
        )}
      </div>
    </div>
  )
}

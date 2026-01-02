import { Calendar, Clock, TrendingDown, Users, ArrowRight } from 'lucide-react'
import { BookingAnalytics, ConversionFunnel } from '../../../services/analyticsApi'

interface Props {
  bookings: BookingAnalytics | null
  funnel: ConversionFunnel | null
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
        <text x="50" y="52" textAnchor="middle" className="text-sm font-bold fill-gray-900">
          {total}
        </text>
      </svg>
      <div className="flex-1 space-y-1.5">
        {segments.map((seg, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: seg.color }} />
            <span className="text-xs text-gray-700 flex-1 truncate capitalize">{seg.name}</span>
            <span className="text-xs font-medium text-gray-900">{seg.value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function FunnelChart({ funnel }: { funnel: ConversionFunnel }) {
  const steps = [
    { name: 'Views', value: funnel.views, color: 'bg-blue-500' },
    { name: 'Unique Visitors', value: funnel.uniqueVisitors, color: 'bg-purple-500' },
    { name: 'Inquiries', value: funnel.inquiries, color: 'bg-amber-500' },
    { name: 'Checkout Started', value: funnel.bookingsStarted, color: 'bg-orange-500' },
    { name: 'Bookings', value: funnel.bookingsCompleted, color: 'bg-green-500' },
  ].filter(s => s.value > 0)

  if (steps.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-gray-500 text-sm">
        No funnel data available
      </div>
    )
  }

  const maxValue = Math.max(...steps.map(s => s.value))

  return (
    <div className="space-y-3">
      {steps.map((step, i) => {
        const width = maxValue > 0 ? (step.value / maxValue) * 100 : 0
        const conversionRate = i > 0 && steps[i - 1].value > 0
          ? ((step.value / steps[i - 1].value) * 100).toFixed(1)
          : null

        return (
          <div key={step.name}>
            <div className="flex items-center justify-between text-sm mb-1">
              <div className="flex items-center gap-2">
                <span className="text-gray-700">{step.name}</span>
                {conversionRate && (
                  <span className="text-xs text-gray-400">({conversionRate}%)</span>
                )}
              </div>
              <span className="font-medium text-gray-900">{step.value.toLocaleString()}</span>
            </div>
            <div className="h-6 bg-gray-100 rounded-lg overflow-hidden relative">
              <div
                className={`h-full ${step.color} rounded-lg transition-all flex items-center justify-end pr-2`}
                style={{ width: `${Math.max(width, 5)}%` }}
              >
                {width > 20 && (
                  <span className="text-xs text-white font-medium">{width.toFixed(0)}%</span>
                )}
              </div>
            </div>
          </div>
        )
      })}

      {/* Overall Conversion Rate */}
      <div className="pt-3 mt-3 border-t border-gray-100">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Overall Conversion Rate</span>
          <span className="text-lg font-bold text-green-600">
            {((funnel.conversionRate || 0) * 100).toFixed(2)}%
          </span>
        </div>
      </div>
    </div>
  )
}

export function BookingSection({ bookings, funnel, loading }: Props) {
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-blue-100">
            <Calendar className="text-blue-600" size={20} />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Booking Analytics</h2>
            <p className="text-sm text-gray-500">Booking patterns and conversion funnel</p>
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

  if (!bookings) return null

  const statusColors = ['#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#6B7280']
  const sourceColors = ['#06B6D4', '#8B5CF6', '#EC4899', '#F97316', '#84CC16']

  return (
    <div className="space-y-6">
      {/* Section Header */}
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-lg bg-blue-100">
          <Calendar className="text-blue-600" size={20} />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Booking Analytics</h2>
          <p className="text-sm text-gray-500">Booking patterns and conversion funnel</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-3">
            <Calendar className="text-blue-500" size={18} />
            <p className="text-sm font-medium text-gray-500">Total Bookings</p>
          </div>
          <p className="text-2xl font-bold text-gray-900">{bookings.totalBookings}</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-3">
            <Clock className="text-purple-500" size={18} />
            <p className="text-sm font-medium text-gray-500">Avg Lead Time</p>
          </div>
          <p className="text-2xl font-bold text-gray-900">{bookings.avgLeadTime?.toFixed(0) || 0} days</p>
          <p className="text-xs text-gray-500 mt-1">Booking to check-in</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-3">
            <Users className="text-green-500" size={18} />
            <p className="text-sm font-medium text-gray-500">Avg Stay Length</p>
          </div>
          <p className="text-2xl font-bold text-gray-900">{bookings.avgLengthOfStay?.toFixed(1) || 0} nights</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-3">
            <TrendingDown className="text-red-500" size={18} />
            <p className="text-sm font-medium text-gray-500">Cancellation Rate</p>
          </div>
          <p className={`text-2xl font-bold ${
            (bookings.cancellationRate || 0) < 10 ? 'text-green-600' :
            (bookings.cancellationRate || 0) < 20 ? 'text-amber-600' : 'text-red-600'
          }`}>
            {((bookings.cancellationRate || 0)).toFixed(1)}%
          </p>
        </div>
      </div>

      {/* Funnel & Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Conversion Funnel */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Conversion Funnel</h3>
          {funnel ? (
            <FunnelChart funnel={funnel} />
          ) : (
            <div className="flex items-center justify-center h-32 text-gray-500 text-sm">
              No funnel data available
            </div>
          )}
        </div>

        {/* Bookings by Status */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Bookings by Status</h3>
          {bookings.byStatus && bookings.byStatus.length > 0 ? (
            <DonutChart
              data={bookings.byStatus.map(s => ({ name: s.status, value: s.count }))}
              colors={statusColors}
            />
          ) : (
            <div className="flex items-center justify-center h-32 text-gray-500 text-sm">
              No status data available
            </div>
          )}
        </div>
      </div>

      {/* Bookings by Source */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">Bookings by Source</h3>
        {bookings.bySource && bookings.bySource.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {bookings.bySource.map((source, i) => (
              <div key={source.source} className="text-center p-4 bg-gray-50 rounded-lg">
                <div
                  className="w-3 h-3 rounded-full mx-auto mb-2"
                  style={{ backgroundColor: sourceColors[i % sourceColors.length] }}
                />
                <p className="text-sm font-medium text-gray-900">{source.count}</p>
                <p className="text-xs text-gray-500 capitalize">{source.source || 'Direct'}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex items-center justify-center h-24 text-gray-500 text-sm">
            No source data available
          </div>
        )}
      </div>
    </div>
  )
}

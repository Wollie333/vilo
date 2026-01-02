import { RotateCcw, Clock, AlertTriangle, TrendingDown, TrendingUp, Zap } from 'lucide-react'
import { RefundAnalytics } from '../../../services/analyticsApi'

interface Props {
  refundAnalytics: RefundAnalytics | null
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

function formatHours(hours: number): string {
  if (hours === 0) return '0 hrs'
  if (hours < 1) return `${Math.round(hours * 60)} min`
  if (hours < 24) return `${hours.toFixed(1)} hrs`
  const days = hours / 24
  return `${days.toFixed(1)} days`
}

function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    requested: '#F59E0B',
    under_review: '#3B82F6',
    approved: '#10B981',
    rejected: '#EF4444',
    processing: '#8B5CF6',
    completed: '#059669',
    failed: '#DC2626'
  }
  return colors[status] || '#6B7280'
}

function formatStatus(status: string): string {
  return status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

function RefundTrendChart({ data }: { data?: Array<{ date: string; count: number; amount: number }> }) {
  if (!data || data.length < 2) {
    return (
      <div className="flex items-center justify-center h-32 text-gray-500 text-sm">
        No trend data available
      </div>
    )
  }

  const values = data.map(d => d.amount)
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
          <linearGradient id="refundGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#F97316" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#F97316" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={areaPath} fill="url(#refundGradient)" />
        <polyline
          points={points}
          fill="none"
          stroke="#F97316"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {values.length > 0 && (
          <>
            <circle cx="0" cy={100 - ((values[0] - min) / range) * 80} r="3" fill="#F97316" />
            <circle cx="280" cy={100 - ((values[values.length - 1] - min) / range) * 80} r="3" fill="#F97316" />
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

function CancellationTimingChart({ data }: { data: RefundAnalytics['cancellationTiming'] }) {
  const items = [
    { label: 'Same Day (0 days)', value: data.sameDay, color: '#EF4444' },
    { label: 'Last Minute (1-2 days)', value: data.lastMinute, color: '#F97316' },
    { label: 'Short Notice (3-7 days)', value: data.shortNotice, color: '#F59E0B' },
    { label: 'Standard (8-14 days)', value: data.standard, color: '#84CC16' },
    { label: 'Advance (15-30 days)', value: data.advance, color: '#22C55E' },
    { label: 'Early Bird (31+ days)', value: data.earlyBird, color: '#10B981' }
  ]

  const maxValue = Math.max(...items.map(i => i.value), 1)
  const hasData = items.some(i => i.value > 0)

  if (!hasData) {
    return (
      <div className="flex items-center justify-center h-32 text-gray-500 text-sm">
        No cancellation timing data available
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {items.map((item, i) => (
        <div key={i}>
          <div className="flex items-center justify-between text-sm mb-1">
            <span className="text-gray-700">{item.label}</span>
            <span className="font-medium text-gray-900">{item.value}</span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${(item.value / maxValue) * 100}%`,
                backgroundColor: item.color
              }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}

export function RefundsSection({ refundAnalytics, loading, currency = 'ZAR' }: Props) {
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-orange-100">
            <RotateCcw className="text-orange-600" size={20} />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Refund Analytics</h2>
            <p className="text-sm text-gray-500">Refund patterns and cancellation insights</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 p-6 animate-pulse">
              <div className="w-16 h-4 bg-gray-200 rounded mb-4" />
              <div className="w-24 h-8 bg-gray-200 rounded" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (!refundAnalytics) return null

  const { summary, byStatus, processingTime, byPolicy, cancellationTiming, trend, comparison } = refundAnalytics

  const statusColors = byStatus.map(s => getStatusColor(s.status))

  return (
    <div className="space-y-6">
      {/* Section Header */}
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-lg bg-orange-100">
          <RotateCcw className="text-orange-600" size={20} />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Refund Analytics</h2>
          <p className="text-sm text-gray-500">Refund patterns and cancellation insights</p>
        </div>
      </div>

      {/* KPI Cards Row 1 - Main Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <p className="text-sm font-medium text-gray-500 mb-1">Total Refunds</p>
          <p className="text-2xl font-bold text-gray-900">{summary.totalRefunds}</p>
          {comparison.countChange !== 0 && (
            <div className={`flex items-center gap-1 mt-2 text-xs ${comparison.countChange > 0 ? 'text-red-600' : 'text-green-600'}`}>
              {comparison.countChange > 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
              <span>{Math.abs(comparison.countChange).toFixed(1)}% vs prev period</span>
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <p className="text-sm font-medium text-gray-500 mb-1">Total Refunded</p>
          <p className="text-2xl font-bold text-orange-600">{formatCurrency(summary.totalRefundedAmount, currency)}</p>
          {comparison.amountChange !== 0 && (
            <div className={`flex items-center gap-1 mt-2 text-xs ${comparison.amountChange > 0 ? 'text-red-600' : 'text-green-600'}`}>
              {comparison.amountChange > 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
              <span>{Math.abs(comparison.amountChange).toFixed(1)}% vs prev period</span>
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <p className="text-sm font-medium text-gray-500 mb-1">Refund Rate</p>
          <p className={`text-2xl font-bold ${summary.refundRate < 10 ? 'text-green-600' : summary.refundRate < 20 ? 'text-amber-600' : 'text-red-600'}`}>
            {summary.refundRate.toFixed(1)}%
          </p>
          <p className="text-xs text-gray-500 mt-1">of all bookings</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <p className="text-sm font-medium text-gray-500 mb-1">Avg Refund Amount</p>
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(summary.averageRefundAmount, currency)}</p>
        </div>
      </div>

      {/* KPI Cards Row 2 - Processing & Pending */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-3">
            <Clock className="text-blue-500" size={18} />
            <p className="text-sm font-medium text-gray-500">Avg Processing Time</p>
          </div>
          <p className="text-2xl font-bold text-gray-900">{formatHours(processingTime.averageRequestToCompletion)}</p>
          <p className="text-xs text-gray-500 mt-1">Request to completion</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-3">
            <Clock className="text-purple-500" size={18} />
            <p className="text-sm font-medium text-gray-500">Avg Approval Time</p>
          </div>
          <p className="text-2xl font-bold text-gray-900">{formatHours(processingTime.averageRequestToApproval)}</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6 bg-amber-50 border-amber-200">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="text-amber-500" size={18} />
            <p className="text-sm font-medium text-amber-700">Pending Refunds</p>
          </div>
          <p className="text-2xl font-bold text-amber-700">{summary.pendingRefundsCount}</p>
          <p className="text-xs text-amber-600 mt-1">{formatCurrency(summary.pendingRefundsAmount, currency)} awaiting</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-3">
            <Zap className="text-green-500" size={18} />
            <p className="text-sm font-medium text-gray-500">Fastest Processing</p>
          </div>
          <p className="text-2xl font-bold text-green-600">{formatHours(processingTime.fastestCompletion)}</p>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Refund Trend */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Refund Trend</h3>
          <RefundTrendChart data={trend} />
        </div>

        {/* Refunds by Status */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Refunds by Status</h3>
          {byStatus.length > 0 ? (
            <DonutChart
              data={byStatus.map(s => ({ name: formatStatus(s.status), value: s.count }))}
              colors={statusColors}
            />
          ) : (
            <div className="flex items-center justify-center h-32 text-gray-500 text-sm">
              No status data available
            </div>
          )}
        </div>
      </div>

      {/* Cancellation Timing Analysis */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-sm font-semibold text-gray-900 mb-2">Cancellation Timing Analysis</h3>
        <p className="text-xs text-gray-500 mb-4">How far in advance guests cancel before check-in</p>
        <CancellationTimingChart data={cancellationTiming} />
      </div>

      {/* Policy Breakdown */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">Refunds by Cancellation Policy</h3>
        {byPolicy.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {byPolicy.map((policy, i) => (
              <div key={i} className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm font-medium text-gray-900 mb-1">{policy.policyLabel}</p>
                <p className="text-xs text-gray-500 mb-2">{policy.refundPercentage}% refund</p>
                <div className="flex items-center justify-between">
                  <span className="text-lg font-bold text-gray-900">{policy.count}</span>
                  <span className="text-sm text-gray-600">{formatCurrency(policy.totalAmount, currency)}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex items-center justify-center h-24 text-gray-500 text-sm">
            No policy data available
          </div>
        )}
      </div>
    </div>
  )
}

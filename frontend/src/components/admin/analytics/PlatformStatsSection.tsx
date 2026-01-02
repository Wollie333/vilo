import {
  Building2,
  BedDouble,
  ShoppingCart,
  DollarSign,
  TrendingUp,
  TrendingDown,
} from 'lucide-react'
import Card from '../../Card'
import { AreaChart } from '../../analytics'
import { ComprehensiveGrowthMetrics } from '../../../services/adminApi'

function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-US').format(value)
}

function formatCurrency(value: number, currency: string = 'ZAR'): string {
  if (currency === 'ZAR') {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

function formatPercent(value: number, showPlus = true): string {
  if (showPlus && value >= 0) {
    return `+${value.toFixed(1)}%`
  }
  return `${value.toFixed(1)}%`
}

interface Props {
  metrics: ComprehensiveGrowthMetrics | null
  loading?: boolean
  currency?: string
}

export function PlatformStatsSection({ metrics, loading, currency = 'ZAR' }: Props) {
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

  const inventory = metrics?.inventory
  const gmv = metrics?.gmv

  // Prepare trend data
  const gmvTrendData = gmv?.gmvTrend?.map(t => ({
    date: t.date,
    value: t.gmv
  })) || []

  return (
    <div className="space-y-6">
      {/* Section Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-purple-100">
          <Building2 size={20} className="text-purple-600" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Platform Stats</h2>
          <p className="text-sm text-gray-500">Inventory and transaction metrics</p>
        </div>
      </div>

      {/* Primary KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="p-5 rounded-xl border border-gray-200 bg-white">
          <div className="flex items-start justify-between mb-3">
            <div className="p-2 rounded-lg bg-purple-50">
              <BedDouble size={20} className="text-purple-600" />
            </div>
          </div>
          <p className="text-sm text-gray-500 font-medium mb-1">Total Rooms</p>
          <p className="text-2xl font-bold text-gray-900">{formatNumber(inventory?.totalRooms || 0)}</p>
          <p className="text-xs text-gray-500 mt-1">
            {formatNumber(inventory?.newRooms || 0)} new this period
          </p>
        </div>

        <div className="p-5 rounded-xl border border-gray-200 bg-white">
          <div className="flex items-start justify-between mb-3">
            <div className="p-2 rounded-lg bg-green-50">
              <ShoppingCart size={20} className="text-green-600" />
            </div>
            {gmv?.bookingGrowth !== undefined && (
              <div className={`flex items-center gap-1 text-sm ${gmv.bookingGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {gmv.bookingGrowth >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                <span>{formatPercent(gmv.bookingGrowth)}</span>
              </div>
            )}
          </div>
          <p className="text-sm text-gray-500 font-medium mb-1">Total Bookings</p>
          <p className="text-2xl font-bold text-gray-900">{formatNumber(gmv?.totalBookings || 0)}</p>
          <p className="text-xs text-gray-500 mt-1">
            Booking growth: {formatPercent(gmv?.bookingGrowth || 0)}
          </p>
        </div>

        <div className="p-5 rounded-xl border border-gray-200 bg-white">
          <div className="flex items-start justify-between mb-3">
            <div className="p-2 rounded-lg bg-amber-50">
              <DollarSign size={20} className="text-amber-600" />
            </div>
            {gmv?.gmvGrowth !== undefined && (
              <div className={`flex items-center gap-1 text-sm ${gmv.gmvGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {gmv.gmvGrowth >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                <span>{formatPercent(gmv.gmvGrowth)}</span>
              </div>
            )}
          </div>
          <p className="text-sm text-gray-500 font-medium mb-1">Platform GMV</p>
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(gmv?.totalGMV || 0, currency)}</p>
          <p className="text-xs text-gray-500 mt-1">Gross merchandise value</p>
        </div>

        <div className="p-5 rounded-xl border border-gray-200 bg-white">
          <div className="flex items-start justify-between mb-3">
            <div className="p-2 rounded-lg bg-blue-50">
              <DollarSign size={20} className="text-blue-600" />
            </div>
          </div>
          <p className="text-sm text-gray-500 font-medium mb-1">Avg Booking Value</p>
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(gmv?.avgBookingValue || 0, currency)}</p>
          <p className="text-xs text-gray-500 mt-1">Per transaction</p>
        </div>
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Room Stats */}
        <Card title="Inventory Health">
          <div className="mt-4 space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="p-3 rounded-lg bg-gray-50">
                <p className="text-xs text-gray-500 mb-1">Active Rooms</p>
                <p className="text-lg font-bold text-gray-900">{formatNumber(inventory?.activeRooms || 0)}</p>
                <p className="text-xs text-green-600">{inventory?.activeRoomRate || 0}% active</p>
              </div>
              <div className="p-3 rounded-lg bg-gray-50">
                <p className="text-xs text-gray-500 mb-1">Avg/Tenant</p>
                <p className="text-lg font-bold text-gray-900">{(inventory?.avgRoomsPerTenant || 0).toFixed(1)}</p>
              </div>
              <div className="p-3 rounded-lg bg-gray-50">
                <p className="text-xs text-gray-500 mb-1">New This Period</p>
                <p className="text-lg font-bold text-green-600">+{formatNumber(inventory?.newRooms || 0)}</p>
              </div>
            </div>

            {/* Room Growth */}
            <div className="pt-4 border-t border-gray-100">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Room Growth</span>
                <span className={`text-sm font-medium ${(inventory?.roomGrowth || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatPercent(inventory?.roomGrowth || 0)}
                </span>
              </div>
            </div>
          </div>
        </Card>

        {/* GMV Trend */}
        <Card title="GMV Trend">
          <div className="mt-4">
            {gmvTrendData.length > 0 ? (
              <AreaChart
                data={gmvTrendData}
                height={200}
                color="#f59e0b"
                formatValue={(v) => formatCurrency(v, currency)}
              />
            ) : (
              <div className="h-[200px] flex items-center justify-center text-gray-400">
                <div className="text-center">
                  <DollarSign size={32} className="mx-auto mb-2 opacity-50" />
                  <p>No GMV data available</p>
                </div>
              </div>
            )}
            <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-500 mb-1">Revenue/Active Tenant</p>
                <p className="text-lg font-bold text-gray-900">
                  {formatCurrency(gmv?.revenuePerActiveTenant || 0, currency)}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Avg Booking Value</p>
                <p className="text-lg font-bold text-gray-900">
                  {formatCurrency(gmv?.avgBookingValue || 0, currency)}
                </p>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}

import {
  Users,
  UserPlus,
  Repeat,
  TrendingUp,
  TrendingDown,
  ShoppingBag,
} from 'lucide-react'
import Card from '../../Card'
import { AreaChart } from '../../analytics'
import { ComprehensiveGrowthMetrics } from '../../../services/adminApi'

function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-US').format(value)
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
}

export function CustomerDataSection({ metrics, loading }: Props) {
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

  const customers = metrics?.customers

  // Prepare trend data
  const customerTrendData = customers?.customerTrend?.map(t => ({
    date: t.date,
    value: t.total
  })) || []

  return (
    <div className="space-y-6">
      {/* Section Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-cyan-100">
          <Users size={20} className="text-cyan-600" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Customer Data</h2>
          <p className="text-sm text-gray-500">End-customer metrics across all tenants</p>
        </div>
      </div>

      {/* Primary KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="p-5 rounded-xl border border-gray-200 bg-white">
          <div className="flex items-start justify-between mb-3">
            <div className="p-2 rounded-lg bg-cyan-50">
              <Users size={20} className="text-cyan-600" />
            </div>
            {customers?.customerGrowth !== undefined && (
              <div className={`flex items-center gap-1 text-sm ${customers.customerGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {customers.customerGrowth >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                <span>{formatPercent(customers.customerGrowth)}</span>
              </div>
            )}
          </div>
          <p className="text-sm text-gray-500 font-medium mb-1">Total Customers</p>
          <p className="text-2xl font-bold text-gray-900">{formatNumber(customers?.totalCustomers || 0)}</p>
          <p className="text-xs text-gray-500 mt-1">Across all tenants</p>
        </div>

        <div className="p-5 rounded-xl border border-gray-200 bg-white">
          <div className="flex items-start justify-between mb-3">
            <div className="p-2 rounded-lg bg-green-50">
              <UserPlus size={20} className="text-green-600" />
            </div>
          </div>
          <p className="text-sm text-gray-500 font-medium mb-1">New Customers</p>
          <p className="text-2xl font-bold text-green-600">+{formatNumber(customers?.newCustomers || 0)}</p>
          <p className="text-xs text-gray-500 mt-1">This period</p>
        </div>

        <div className="p-5 rounded-xl border border-gray-200 bg-white">
          <div className="flex items-start justify-between mb-3">
            <div className="p-2 rounded-lg bg-purple-50">
              <Repeat size={20} className="text-purple-600" />
            </div>
          </div>
          <p className="text-sm text-gray-500 font-medium mb-1">Repeat Rate</p>
          <p className="text-2xl font-bold text-gray-900">{customers?.repeatRate || 0}%</p>
          <p className="text-xs text-gray-500 mt-1">2+ bookings</p>
        </div>

        <div className="p-5 rounded-xl border border-gray-200 bg-white">
          <div className="flex items-start justify-between mb-3">
            <div className="p-2 rounded-lg bg-amber-50">
              <ShoppingBag size={20} className="text-amber-600" />
            </div>
          </div>
          <p className="text-sm text-gray-500 font-medium mb-1">Conversion Rate</p>
          <p className="text-2xl font-bold text-gray-900">{customers?.conversionRate || 0}%</p>
          <p className="text-xs text-gray-500 mt-1">Visitors to customers</p>
        </div>
      </div>

      {/* Customer Trend */}
      <Card title="Customer Growth Trend">
        <div className="mt-4">
          {customerTrendData.length > 0 ? (
            <AreaChart
              data={customerTrendData}
              height={200}
              color="#06b6d4"
            />
          ) : (
            <div className="h-[200px] flex items-center justify-center text-gray-400">
              <div className="text-center">
                <Users size={32} className="mx-auto mb-2 opacity-50" />
                <p>No customer trend data available</p>
              </div>
            </div>
          )}
          <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-3 gap-4">
            <div className="text-center">
              <p className="text-xs text-gray-500 mb-1">Customers with Bookings</p>
              <p className="text-lg font-bold text-gray-900">
                {formatNumber(customers?.customersWithBookings || 0)}
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs text-gray-500 mb-1">Repeat Customers</p>
              <p className="text-lg font-bold text-purple-600">
                {formatNumber(customers?.repeatCustomers || 0)}
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs text-gray-500 mb-1">Conversion</p>
              <p className="text-lg font-bold text-gray-900">
                {customers?.conversionRate || 0}%
              </p>
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
}

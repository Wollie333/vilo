import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Loader2, CreditCard, TrendingUp, Users, ArrowUpRight, ArrowDownRight, Receipt, Layers, Clock } from 'lucide-react'
import Card from '../../components/Card'
import { adminBilling } from '../../services/adminApi'

function formatCurrency(value: number, currency = 'ZAR'): string {
  return new Intl.NumberFormat('en-ZA', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

export function RevenueOverview() {
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true)
        const statsData = await adminBilling.getRevenueStats()
        setStats(statsData)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load revenue data')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  if (loading) {
    return (
      <div className="bg-gray-50 p-8 min-h-full flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-accent-500" />
          <p className="text-gray-500">Loading revenue data...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-gray-50 p-8 min-h-full">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <p className="text-red-600">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-gray-50 p-8 min-h-full">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Revenue Overview</h1>
        <p className="text-gray-500">Platform revenue and subscription metrics</p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card
          title="Monthly Recurring Revenue"
          value={formatCurrency(stats?.mrr || 0)}
          icon={<CreditCard size={20} />}
          trend={stats?.mrrGrowth ? {
            value: `${stats.mrrGrowth > 0 ? '+' : ''}${stats.mrrGrowth.toFixed(1)}%`,
            isPositive: stats.mrrGrowth > 0
          } : undefined}
        />
        <Card
          title="Annual Recurring Revenue"
          value={formatCurrency(stats?.arr || 0)}
          icon={<TrendingUp size={20} />}
        />
        <Card
          title="Average Revenue Per User"
          value={formatCurrency(stats?.arpu || 0)}
          icon={<Users size={20} />}
        />
        <Card
          title="Net Revenue Retention"
          value={`${stats?.nrr || 100}%`}
          icon={<TrendingUp size={20} />}
          trend={stats?.nrr > 100 ? {
            value: 'Healthy',
            isPositive: true
          } : undefined}
        />
      </div>

      {/* Subscription Status Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Revenue by Plan */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Revenue by Plan</h2>
          <div className="space-y-4">
            {stats?.revenueByPlan?.map((plan: any) => (
              <div key={plan.planName} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-accent-500"></div>
                  <span className="text-gray-700">{plan.planName}</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-gray-500 text-sm">{plan.subscribers} subscribers</span>
                  <span className="font-medium text-gray-900">{formatCurrency(plan.revenue)}</span>
                </div>
              </div>
            )) || (
              <p className="text-gray-500 text-sm">No revenue data available</p>
            )}
          </div>
        </div>

        {/* Subscription Status */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Subscription Status</h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                <span className="text-gray-700">Active</span>
              </div>
              <span className="font-medium text-green-700">{stats?.subscriptionsByStatus?.active || 0}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                <span className="text-gray-700">Trial</span>
              </div>
              <span className="font-medium text-blue-700">{stats?.subscriptionsByStatus?.trial || 0}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                <span className="text-gray-700">Past Due</span>
              </div>
              <span className="font-medium text-yellow-700">{stats?.subscriptionsByStatus?.past_due || 0}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-gray-400"></div>
                <span className="text-gray-700">Cancelled</span>
              </div>
              <span className="font-medium text-gray-600">{stats?.subscriptionsByStatus?.cancelled || 0}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Link
            to="/admin/subscriptions"
            className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <Receipt className="w-5 h-5 text-accent-600" />
            <span className="text-gray-700">View Subscriptions</span>
          </Link>
          <Link
            to="/admin/plans"
            className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <Layers className="w-5 h-5 text-accent-600" />
            <span className="text-gray-700">Manage Plans</span>
          </Link>
          <Link
            to="/admin/grace-periods"
            className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <Clock className="w-5 h-5 text-accent-600" />
            <span className="text-gray-700">Grace Periods</span>
          </Link>
          <Link
            to="/admin/analytics/revenue"
            className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <TrendingUp className="w-5 h-5 text-accent-600" />
            <span className="text-gray-700">Revenue Analytics</span>
          </Link>
        </div>
      </div>
    </div>
  )
}

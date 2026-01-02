import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Loader2, CreditCard, TrendingUp, Check } from 'lucide-react'
import Card from '../../components/Card'
import Table from '../../components/Table'
import { adminBilling, Subscription, Plan } from '../../services/adminApi'

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

const statusColors: Record<string, string> = {
  active: 'bg-green-100 text-green-700',
  trial: 'bg-blue-100 text-blue-700',
  past_due: 'bg-yellow-100 text-yellow-700',
  cancelled: 'bg-gray-100 text-gray-600',
  expired: 'bg-red-100 text-red-700',
}

export function BillingDashboard() {
  const [stats, setStats] = useState<any>(null)
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const [plans, setPlans] = useState<Plan[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'overview' | 'subscriptions' | 'plans'>('overview')
  const [subPage, setSubPage] = useState(1)
  const [subTotal, setSubTotal] = useState(0)
  const [statusFilter, setStatusFilter] = useState('')

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true)
        const [statsData, plansData] = await Promise.all([
          adminBilling.getRevenueStats(),
          adminBilling.getPlans(),
        ])
        setStats(statsData)
        setPlans(plansData)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load billing data')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  useEffect(() => {
    if (activeTab === 'subscriptions') {
      fetchSubscriptions()
    }
  }, [activeTab, subPage, statusFilter])

  const fetchSubscriptions = async () => {
    try {
      const { subscriptions, total } = await adminBilling.getSubscriptions({
        page: subPage,
        limit: 20,
        status: statusFilter || undefined,
      })
      setSubscriptions(subscriptions)
      setSubTotal(total)
    } catch (err) {
      console.error('Failed to fetch subscriptions:', err)
    }
  }

  if (loading) {
    return (
      <div style={{ backgroundColor: 'var(--bg-card)' }} className="p-8 min-h-full flex items-center justify-center transition-colors">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-accent-500" />
          <p style={{ color: 'var(--text-muted)' }}>Loading billing data...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ backgroundColor: 'var(--bg-card)' }} className="p-8 min-h-full transition-colors">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <p className="text-red-600">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div style={{ backgroundColor: 'var(--bg-card)' }} className="p-8 min-h-full transition-colors">
      {/* Header */}
      <div className="mb-8">
        <h1 style={{ color: 'var(--text-primary)' }} className="text-3xl font-bold mb-2">Billing</h1>
        <p style={{ color: 'var(--text-muted)' }}>Revenue, subscriptions, and pricing plans</p>
      </div>

      {/* Tabs */}
      <div style={{ backgroundColor: 'var(--bg-secondary)' }} className="flex gap-1 p-1 rounded-lg w-fit mb-6">
        {(['overview', 'subscriptions', 'plans'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={activeTab === tab ? { backgroundColor: 'var(--bg-card)', color: 'var(--text-primary)' } : { color: 'var(--text-muted)' }}
            className={`px-4 py-2 text-sm font-medium rounded-md capitalize transition-colors ${
              activeTab === tab ? 'shadow-sm' : 'hover:opacity-70'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && stats && (
        <div className="space-y-6">
          {/* Revenue Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card
              title="Monthly Recurring Revenue"
              value={formatCurrency(stats.mrr)}
              icon={<CreditCard size={20} />}
              trend={stats.mrrGrowth !== 0 ? {
                value: `${stats.mrrGrowth > 0 ? '+' : ''}${stats.mrrGrowth.toFixed(1)}% from last month`,
                isPositive: stats.mrrGrowth > 0
              } : undefined}
            />
            <Card
              title="Annual Recurring Revenue"
              value={formatCurrency(stats.arr)}
              icon={<TrendingUp size={20} />}
            />
            <Card
              title="Total Revenue"
              value={formatCurrency(stats.totalRevenue)}
              icon={<CreditCard size={20} />}
            />
            <Card
              title="Active Plans"
              value={String(plans.filter(p => p.isActive).length)}
              icon={<CreditCard size={20} />}
            />
          </div>

          {/* Revenue by Plan */}
          <Card title="Revenue by Plan">
            <div className="mt-4">
              {stats.revenueByPlan && stats.revenueByPlan.length > 0 ? (
                <div className="space-y-4">
                  {stats.revenueByPlan.map((item: any, i: number) => (
                    <div key={i} className="flex items-center gap-4">
                      <div className="flex-1">
                        <div className="flex justify-between mb-1">
                          <span style={{ color: 'var(--text-primary)' }} className="font-medium">{item.plan}</span>
                          <span style={{ color: 'var(--text-muted)' }}>{formatCurrency(item.revenue)}</span>
                        </div>
                        <div style={{ backgroundColor: 'var(--bg-secondary)' }} className="h-2 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-accent-500 rounded-full"
                            style={{ width: `${(item.revenue / stats.totalRevenue) * 100}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ color: 'var(--text-muted)' }}>No revenue data available</p>
              )}
            </div>
          </Card>
        </div>
      )}

      {/* Subscriptions Tab */}
      {activeTab === 'subscriptions' && (
        <div className="space-y-4">
          {/* Filter */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value)
                setSubPage(1)
              }}
              style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
              className="border rounded-lg px-4 py-2 focus:outline-none focus:border-accent-500"
            >
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="trial">Trial</option>
              <option value="past_due">Past Due</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          {/* Subscriptions Table */}
          <Table>
            <Table.Header>
              <tr>
                <Table.HeaderCell>Tenant</Table.HeaderCell>
                <Table.HeaderCell>Plan</Table.HeaderCell>
                <Table.HeaderCell>Status</Table.HeaderCell>
                <Table.HeaderCell>Period End</Table.HeaderCell>
                <Table.HeaderCell>Auto Renew</Table.HeaderCell>
                <Table.HeaderCell align="right">Actions</Table.HeaderCell>
              </tr>
            </Table.Header>
            <Table.Body>
              {subscriptions.length === 0 ? (
                <Table.Empty colSpan={6}>
                  No subscriptions found
                </Table.Empty>
              ) : (
                subscriptions.map((sub) => (
                  <Table.Row key={sub.id}>
                    <Table.Cell>
                      <Link to={`/admin/tenants/${sub.tenantId}`} style={{ color: 'var(--text-primary)' }} className="hover:text-accent-600">
                        {sub.tenantName}
                      </Link>
                    </Table.Cell>
                    <Table.Cell>
                      <span style={{ color: 'var(--text-muted)' }}>{sub.planName}</span>
                    </Table.Cell>
                    <Table.Cell>
                      <span className={`px-2 py-1 text-xs rounded-full capitalize ${statusColors[sub.status]}`}>
                        {sub.status.replace('_', ' ')}
                      </span>
                    </Table.Cell>
                    <Table.Cell>
                      <span style={{ color: 'var(--text-muted)' }} className="text-sm">
                        {new Date(sub.currentPeriodEnd).toLocaleDateString()}
                      </span>
                    </Table.Cell>
                    <Table.Cell>
                      {sub.cancelAtPeriodEnd ? (
                        <span className="text-yellow-600 text-sm">Cancelling</span>
                      ) : sub.autoRenew ? (
                        <span className="text-green-600 text-sm">Yes</span>
                      ) : (
                        <span style={{ color: 'var(--text-muted)' }} className="text-sm">No</span>
                      )}
                    </Table.Cell>
                    <Table.Cell align="right">
                      <Link
                        to={`/admin/tenants/${sub.tenantId}`}
                        className="text-accent-600 hover:text-accent-700 text-sm"
                      >
                        Manage
                      </Link>
                    </Table.Cell>
                  </Table.Row>
                ))
              )}
            </Table.Body>
          </Table>
        </div>
      )}

      {/* Plans Tab */}
      {activeTab === 'plans' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {plans.map((plan) => (
            <Card
              key={plan.id}
              className={!plan.isActive ? 'opacity-60' : ''}
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 style={{ color: 'var(--text-primary)' }} className="text-lg font-semibold">{plan.name}</h3>
                  <p style={{ color: 'var(--text-muted)' }} className="text-sm">{plan.slug}</p>
                </div>
                {!plan.isActive && (
                  <span style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-muted)' }} className="px-2 py-1 text-xs rounded">Inactive</span>
                )}
              </div>
              <p style={{ color: 'var(--text-primary)' }} className="text-3xl font-bold mb-1">
                {formatCurrency(plan.price)}
                <span style={{ color: 'var(--text-muted)' }} className="text-sm font-normal">/{plan.interval}</span>
              </p>
              {plan.trialDays > 0 && (
                <p style={{ color: 'var(--text-muted)' }} className="text-sm mb-4">{plan.trialDays} day trial</p>
              )}
              {plan.description && (
                <p style={{ color: 'var(--text-muted)' }} className="text-sm mb-4">{plan.description}</p>
              )}
              <div style={{ borderColor: 'var(--border-color)' }} className="border-t pt-4">
                <p style={{ color: 'var(--text-muted)' }} className="text-sm font-medium mb-2">Features:</p>
                <ul className="space-y-1">
                  {plan.features.slice(0, 5).map((feature, i) => (
                    <li key={i} style={{ color: 'var(--text-muted)' }} className="text-sm flex items-center gap-2">
                      <Check className="w-4 h-4 text-green-500" />
                      {feature}
                    </li>
                  ))}
                  {plan.features.length > 5 && (
                    <li style={{ color: 'var(--text-muted)' }} className="text-sm">+{plan.features.length - 5} more</li>
                  )}
                </ul>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

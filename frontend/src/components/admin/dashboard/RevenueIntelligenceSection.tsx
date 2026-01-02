import { DollarSign, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight } from 'lucide-react'
import Table from '../../../components/Table'
import { RevenueMetrics } from '../../../services/adminApi'

interface Props {
  metrics: RevenueMetrics | null
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

function DonutChart({ data, colors }: { data: { name: string; value: number; count: number }[], colors: string[] }) {
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
      <svg viewBox="0 0 100 100" className="w-32 h-32">
        {segments.map((seg, i) => (
          <path key={i} d={seg.path} fill={seg.color} className="hover:opacity-80 transition-opacity" />
        ))}
        <circle cx="50" cy="50" r="25" style={{ fill: 'var(--bg-card)' }} />
        <text x="50" y="48" textAnchor="middle" className="text-xs font-bold" style={{ fill: 'var(--text-primary)' }}>
          {formatCurrency(total, 'ZAR').replace('ZAR', 'R')}
        </text>
        <text x="50" y="58" textAnchor="middle" className="text-[8px]" style={{ fill: 'var(--text-muted)' }}>
          Total MRR
        </text>
      </svg>
      <div className="flex-1 space-y-2">
        {segments.map((seg, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: seg.color }} />
            <span style={{ color: 'var(--text-muted)' }} className="text-sm flex-1">{seg.name}</span>
            <span style={{ color: 'var(--text-primary)' }} className="text-sm font-medium">{seg.percentage}%</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export function RevenueIntelligenceSection({ metrics, loading, currency = 'ZAR' }: Props) {
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-green-100">
            <DollarSign className="text-green-600" size={20} />
          </div>
          <div>
            <h2 style={{ color: 'var(--text-primary)' }} className="text-lg font-semibold">Revenue Intelligence</h2>
            <p style={{ color: 'var(--text-muted)' }} className="text-sm">Financial performance deep-dive</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map(i => (
            <div key={i} style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }} className="rounded-xl border p-6 animate-pulse">
              <div style={{ backgroundColor: 'var(--bg-secondary)' }} className="w-16 h-4 rounded mb-2" />
              <div style={{ backgroundColor: 'var(--bg-secondary)' }} className="w-24 h-8 rounded" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (!metrics) return null

  const planColors = ['#10B981', '#3B82F6', '#8B5CF6', '#F59E0B', '#EF4444']
  const revenueByPlan = metrics.revenueByPlan || []

  return (
    <div className="space-y-6">
      {/* Section Header */}
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-lg bg-green-100">
          <DollarSign className="text-green-600" size={20} />
        </div>
        <div>
          <h2 style={{ color: 'var(--text-primary)' }} className="text-lg font-semibold">Revenue Intelligence</h2>
          <p style={{ color: 'var(--text-muted)' }} className="text-sm">Financial performance deep-dive</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }} className="rounded-xl border p-6">
          <p style={{ color: 'var(--text-muted)' }} className="text-sm font-medium mb-1">MRR</p>
          <p style={{ color: 'var(--text-primary)' }} className="text-2xl font-bold">{formatCurrency(metrics.mrr, currency)}</p>
          {metrics.mrrGrowth !== undefined && (
            <div className={`flex items-center gap-1 mt-2 text-sm ${metrics.mrrGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {metrics.mrrGrowth >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
              {metrics.mrrGrowth >= 0 ? '+' : ''}{metrics.mrrGrowth.toFixed(1)}% vs last period
            </div>
          )}
        </div>

        <div style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }} className="rounded-xl border p-6">
          <p style={{ color: 'var(--text-muted)' }} className="text-sm font-medium mb-1">ARR</p>
          <p style={{ color: 'var(--text-primary)' }} className="text-2xl font-bold">{formatCurrency(metrics.arr, currency)}</p>
          <p style={{ color: 'var(--text-muted)' }} className="text-xs mt-2">Annualized from MRR</p>
        </div>

        <div style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }} className="rounded-xl border p-6">
          <p style={{ color: 'var(--text-muted)' }} className="text-sm font-medium mb-1">ARPU</p>
          <p style={{ color: 'var(--text-primary)' }} className="text-2xl font-bold">{formatCurrency(metrics.arpu, currency)}</p>
          <p style={{ color: 'var(--text-muted)' }} className="text-xs mt-2">Avg revenue per user</p>
        </div>

        <div style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }} className="rounded-xl border p-6">
          <p style={{ color: 'var(--text-muted)' }} className="text-sm font-medium mb-1">NRR</p>
          <p className={`text-2xl font-bold ${metrics.nrr >= 100 ? 'text-green-600' : 'text-amber-600'}`}>
            {metrics.nrr.toFixed(0)}%
          </p>
          <p style={{ color: 'var(--text-muted)' }} className="text-xs mt-2">Net revenue retention</p>
        </div>
      </div>

      {/* MRR Movement & Revenue by Plan */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* MRR Waterfall */}
        <div style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }} className="rounded-xl border p-6">
          <h3 style={{ color: 'var(--text-primary)' }} className="text-sm font-semibold mb-4">MRR Movement</h3>
          {(() => {
            const netChange = (metrics.newMrr || 0) + (metrics.expansionMrr || 0) - (metrics.contractionMrr || 0) - (metrics.churnedMrr || 0)
            return (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500" />
                    <span style={{ color: 'var(--text-muted)' }} className="text-sm">New MRR</span>
                  </div>
                  <div className="flex items-center gap-1 text-green-600 font-medium">
                    <ArrowUpRight size={14} />
                    {formatCurrency(metrics.newMrr || 0, currency)}
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-blue-500" />
                    <span style={{ color: 'var(--text-muted)' }} className="text-sm">Expansion</span>
                  </div>
                  <div className="flex items-center gap-1 text-blue-600 font-medium">
                    <ArrowUpRight size={14} />
                    {formatCurrency(metrics.expansionMrr || 0, currency)}
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-amber-500" />
                    <span style={{ color: 'var(--text-muted)' }} className="text-sm">Contraction</span>
                  </div>
                  <div className="flex items-center gap-1 text-amber-600 font-medium">
                    <ArrowDownRight size={14} />
                    {formatCurrency(metrics.contractionMrr || 0, currency)}
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-red-500" />
                    <span style={{ color: 'var(--text-muted)' }} className="text-sm">Churned</span>
                  </div>
                  <div className="flex items-center gap-1 text-red-600 font-medium">
                    <ArrowDownRight size={14} />
                    {formatCurrency(metrics.churnedMrr || 0, currency)}
                  </div>
                </div>
                <div style={{ borderColor: 'var(--border-color)' }} className="border-t pt-3 mt-3">
                  <div className="flex items-center justify-between">
                    <span style={{ color: 'var(--text-primary)' }} className="text-sm font-medium">Net Change</span>
                    <span className={`font-bold ${netChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {netChange >= 0 ? '+' : ''}{formatCurrency(netChange, currency)}
                    </span>
                  </div>
                </div>
              </div>
            )
          })()}
        </div>

        {/* Revenue by Plan */}
        <div style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }} className="rounded-xl border p-6">
          <h3 style={{ color: 'var(--text-primary)' }} className="text-sm font-semibold mb-4">Revenue by Plan</h3>
          {revenueByPlan.length > 0 ? (
            <DonutChart data={revenueByPlan.map(p => ({ name: p.plan, value: p.revenue, count: p.count }))} colors={planColors} />
          ) : (
            <div style={{ color: 'var(--text-muted)' }} className="flex items-center justify-center h-32 text-sm">
              No revenue data available
            </div>
          )}
        </div>
      </div>

      {/* Top Customers */}
      {metrics.topCustomers && metrics.topCustomers.length > 0 && (
        <div>
          <div style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }} className="px-6 py-4 border rounded-t-xl">
            <h3 style={{ color: 'var(--text-primary)' }} className="text-sm font-semibold">Top Customers by Revenue</h3>
          </div>
          <Table className="rounded-t-none">
            <Table.Header>
              <tr>
                <Table.HeaderCell>Rank</Table.HeaderCell>
                <Table.HeaderCell>Customer</Table.HeaderCell>
                <Table.HeaderCell>Plan</Table.HeaderCell>
                <Table.HeaderCell align="right">Revenue</Table.HeaderCell>
              </tr>
            </Table.Header>
            <Table.Body>
              {metrics.topCustomers.slice(0, 5).map((customer, index) => (
                <Table.Row key={customer.id}>
                  <Table.Cell>
                    <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
                      index === 0 ? 'bg-amber-100 text-amber-700' :
                      index === 1 ? 'bg-gray-100 text-gray-700' :
                      index === 2 ? 'bg-orange-100 text-orange-700' :
                      'bg-gray-50 text-gray-500'
                    }`}>
                      {index + 1}
                    </span>
                  </Table.Cell>
                  <Table.Cell>
                    <span style={{ color: 'var(--text-primary)' }} className="font-medium">{customer.name}</span>
                  </Table.Cell>
                  <Table.Cell>
                    <span style={{ color: 'var(--text-muted)' }} className="text-sm">{customer.plan || 'N/A'}</span>
                  </Table.Cell>
                  <Table.Cell align="right">
                    <span style={{ color: 'var(--text-primary)' }} className="font-medium">{formatCurrency(customer.revenue, currency)}</span>
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table>
        </div>
      )}
    </div>
  )
}

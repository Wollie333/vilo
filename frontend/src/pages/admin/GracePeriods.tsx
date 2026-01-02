import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Loader2, AlertTriangle, Clock, RefreshCw, Calendar, ChevronRight } from 'lucide-react'
import Card from '../../components/Card'
import Table from '../../components/Table'
import { adminGracePeriods, GracePeriod, GracePeriodStats } from '../../services/adminApi'

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-ZA', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

function getDaysUntil(dateString: string): number {
  const target = new Date(dateString)
  const now = new Date()
  const diff = target.getTime() - now.getTime()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

export function GracePeriods() {
  const [gracePeriods, setGracePeriods] = useState<GracePeriod[]>([])
  const [stats, setStats] = useState<GracePeriodStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [retrying, setRetrying] = useState<string | null>(null)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)

      const [periodsData, statsData] = await Promise.all([
        adminGracePeriods.list({ status: 'active' }),
        adminGracePeriods.getStats()
      ])

      setGracePeriods(periodsData.gracePeriods || [])
      setStats(statsData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load grace periods')
    } finally {
      setLoading(false)
    }
  }

  const handleRetry = async (id: string) => {
    try {
      setRetrying(id)
      await adminGracePeriods.retry(id)
      // Refresh data
      await fetchData()
    } catch (err) {
      console.error('Retry error:', err)
    } finally {
      setRetrying(null)
    }
  }

  if (loading) {
    return (
      <div style={{ backgroundColor: 'var(--bg-card)' }} className="p-8 min-h-full flex items-center justify-center transition-colors">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-accent-500" />
          <p style={{ color: 'var(--text-muted)' }}>Loading grace periods...</p>
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
        <div className="flex items-center gap-2 mb-2">
          <h1 style={{ color: 'var(--text-primary)' }} className="text-3xl font-bold">Grace Periods</h1>
          {stats && stats.counts.active > 0 && (
            <span className="bg-yellow-100 text-yellow-700 text-sm font-medium px-2.5 py-0.5 rounded-full">
              {stats.counts.active} Active
            </span>
          )}
        </div>
        <p style={{ color: 'var(--text-muted)' }}>Failed payments awaiting resolution</p>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card
            title="Active Grace Periods"
            value={String(stats.counts.active)}
            icon={<Clock size={20} />}
            trend={stats.counts.active > 0 ? {
              value: 'Requires attention',
              isPositive: false
            } : undefined}
          />
          <Card
            title="Expiring Today"
            value={String(stats.expiringToday)}
            icon={<AlertTriangle size={20} />}
            trend={stats.expiringToday > 0 ? {
              value: 'Urgent',
              isPositive: false
            } : undefined}
          />
          <Card
            title="Avg Days in Grace"
            value={`${stats.avgDaysInGrace} days`}
            icon={<Calendar size={20} />}
          />
          <Card
            title="Resolution Rate"
            value={`${stats.resolutionRate}%`}
            icon={<RefreshCw size={20} />}
            trend={stats.resolutionRate >= 70 ? {
              value: 'Healthy',
              isPositive: true
            } : undefined}
          />
        </div>
      )}

      {/* Grace Periods Table */}
      {gracePeriods.length === 0 ? (
        <div style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }} className="rounded-xl border p-8 text-center">
          <Clock className="w-12 h-12 mx-auto mb-4" style={{ color: 'var(--text-muted)' }} />
          <h3 style={{ color: 'var(--text-primary)' }} className="text-lg font-medium mb-2">No Active Grace Periods</h3>
          <p style={{ color: 'var(--text-muted)' }}>All payments are up to date. Great job!</p>
        </div>
      ) : (
        <Table>
          <Table.Header>
            <tr>
              <Table.HeaderCell>Tenant</Table.HeaderCell>
              <Table.HeaderCell>Plan</Table.HeaderCell>
              <Table.HeaderCell>Failed On</Table.HeaderCell>
              <Table.HeaderCell>Grace Ends</Table.HeaderCell>
              <Table.HeaderCell>Retries</Table.HeaderCell>
              <Table.HeaderCell align="right">Actions</Table.HeaderCell>
            </tr>
          </Table.Header>
          <Table.Body>
            {gracePeriods.map((gp) => {
              const daysUntil = getDaysUntil(gp.endsAt)
              const isUrgent = daysUntil <= 1

              return (
                <Table.Row key={gp.id}>
                  <Table.Cell>
                    <div>
                      <Link
                        to={`/admin/tenants/${gp.tenantId}`}
                        style={{ color: 'var(--text-primary)' }}
                        className="font-medium hover:text-accent-600"
                      >
                        {gp.tenantName}
                      </Link>
                      <p style={{ color: 'var(--text-muted)' }} className="text-sm">{gp.tenantEmail}</p>
                    </div>
                  </Table.Cell>
                  <Table.Cell>
                    <span style={{ color: 'var(--text-primary)' }} className="font-medium">{gp.planName}</span>
                    <p style={{ color: 'var(--text-muted)' }} className="text-sm capitalize">{gp.billingCycle}</p>
                  </Table.Cell>
                  <Table.Cell>
                    <span style={{ color: 'var(--text-primary)' }}>
                      {formatDate(gp.originalFailureAt || gp.startedAt)}
                    </span>
                    <p style={{ color: 'var(--text-muted)' }} className="text-xs truncate max-w-[150px]" title={gp.originalFailureReason}>
                      {gp.originalFailureReason || 'Payment failed'}
                    </p>
                  </Table.Cell>
                  <Table.Cell>
                    <div className="flex items-center gap-2">
                      <span className={`font-medium ${isUrgent ? 'text-red-600' : ''}`} style={!isUrgent ? { color: 'var(--text-primary)' } : undefined}>
                        {formatDate(gp.endsAt)}
                      </span>
                      {isUrgent && (
                        <AlertTriangle className="w-4 h-4 text-red-500" />
                      )}
                    </div>
                    <p style={{ color: 'var(--text-muted)' }} className="text-xs">
                      {daysUntil <= 0 ? 'Expired' : `${daysUntil} day${daysUntil !== 1 ? 's' : ''} left`}
                    </p>
                  </Table.Cell>
                  <Table.Cell>
                    <span style={{ color: 'var(--text-primary)' }}>
                      {gp.retryCount}/{gp.maxRetries}
                    </span>
                  </Table.Cell>
                  <Table.Cell align="right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleRetry(gp.id)}
                        disabled={retrying === gp.id || gp.retryCount >= gp.maxRetries}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-accent-600 bg-accent-50 rounded-lg hover:bg-accent-100 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {retrying === gp.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <RefreshCw className="w-4 h-4" />
                        )}
                        Retry
                      </button>
                      <Link
                        to={`/admin/subscriptions/${gp.subscriptionId}`}
                        style={{ color: 'var(--text-muted)' }}
                        className="p-1.5 hover:opacity-70 rounded"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </Link>
                    </div>
                  </Table.Cell>
                </Table.Row>
              )
            })}
          </Table.Body>
        </Table>
      )}
    </div>
  )
}

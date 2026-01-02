import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Loader2, Search, ChevronLeft, ChevronRight, MoreVertical, Eye, ArrowUpDown, XCircle, Play } from 'lucide-react'
import Table from '../../components/Table'
import { adminBilling, Subscription } from '../../services/adminApi'

const statusColors: Record<string, string> = {
  active: 'bg-green-100 text-green-700',
  trial: 'bg-blue-100 text-blue-700',
  past_due: 'bg-yellow-100 text-yellow-700',
  cancelled: 'bg-gray-100 text-gray-600',
  expired: 'bg-red-100 text-red-700',
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-ZA', {
    style: 'currency',
    currency: 'ZAR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-ZA', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export function SubscriptionList() {
  const navigate = useNavigate()
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [statusFilter, setStatusFilter] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [actionMenuOpen, setActionMenuOpen] = useState<string | null>(null)

  const limit = 20

  useEffect(() => {
    fetchSubscriptions()
  }, [page, statusFilter])

  const fetchSubscriptions = async () => {
    try {
      setLoading(true)
      const result = await adminBilling.getSubscriptions({
        page,
        limit,
        status: statusFilter || undefined,
      })
      setSubscriptions(result.subscriptions)
      setTotal(result.total)
      setTotalPages(result.totalPages)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load subscriptions')
    } finally {
      setLoading(false)
    }
  }

  const filteredSubscriptions = subscriptions.filter(sub => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      sub.tenantName?.toLowerCase().includes(query) ||
      sub.tenantEmail?.toLowerCase().includes(query) ||
      sub.planName?.toLowerCase().includes(query)
    )
  })

  const handleViewDetails = (id: string) => {
    navigate(`/admin/subscriptions/${id}`)
    setActionMenuOpen(null)
  }

  return (
    <div style={{ backgroundColor: 'var(--bg-card)' }} className="p-8 min-h-full transition-colors">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 style={{ color: 'var(--text-primary)' }} className="text-3xl font-bold mb-2">Subscriptions</h1>
          <p style={{ color: 'var(--text-muted)' }}>Manage all tenant subscriptions</p>
        </div>
      </div>

      {/* Filters */}
      <div style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }} className="rounded-xl border p-4 mb-6">
        <div className="flex items-center gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Search by tenant name, email, or plan..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                backgroundColor: 'var(--bg-tertiary)',
                borderColor: 'var(--border-color)',
                color: 'var(--text-primary)'
              }}
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-500"
            />
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value)
              setPage(1)
            }}
            style={{
              backgroundColor: 'var(--bg-tertiary)',
              borderColor: 'var(--border-color)',
              color: 'var(--text-primary)'
            }}
            className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-500"
          >
            <option value="">All Statuses</option>
            <option value="active">Active</option>
            <option value="trial">Trial</option>
            <option value="past_due">Past Due</option>
            <option value="cancelled">Cancelled</option>
            <option value="expired">Expired</option>
          </select>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }} className="rounded-xl border p-8 text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-accent-500" />
          <p style={{ color: 'var(--text-muted)' }}>Loading subscriptions...</p>
        </div>
      ) : error ? (
        <div style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }} className="rounded-xl border p-8 text-center">
          <p className="text-red-600">{error}</p>
        </div>
      ) : (
        <>
          <Table>
            <Table.Header>
              <tr>
                <Table.HeaderCell>Status</Table.HeaderCell>
                <Table.HeaderCell>Tenant</Table.HeaderCell>
                <Table.HeaderCell>Plan</Table.HeaderCell>
                <Table.HeaderCell>Billing</Table.HeaderCell>
                <Table.HeaderCell>Period End</Table.HeaderCell>
                <Table.HeaderCell align="right">Actions</Table.HeaderCell>
              </tr>
            </Table.Header>
            <Table.Body>
              {filteredSubscriptions.map((sub) => (
                <Table.Row key={sub.id}>
                  <Table.Cell>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${statusColors[sub.status] || 'bg-gray-100 text-gray-700'}`}>
                      {sub.status.replace('_', ' ')}
                    </span>
                  </Table.Cell>
                  <Table.Cell>
                    <div>
                      <Link
                        to={`/admin/tenants/${sub.tenantId}`}
                        style={{ color: 'var(--text-primary)' }}
                        className="font-medium hover:text-accent-600"
                      >
                        {sub.tenantName}
                      </Link>
                      <p style={{ color: 'var(--text-muted)' }} className="text-sm">{sub.tenantEmail}</p>
                    </div>
                  </Table.Cell>
                  <Table.Cell>
                    <span style={{ color: 'var(--text-primary)' }} className="font-medium">{sub.planName}</span>
                  </Table.Cell>
                  <Table.Cell>
                    <span style={{ color: 'var(--text-primary)' }} className="capitalize">{sub.billingCycle}</span>
                    <p style={{ color: 'var(--text-muted)' }} className="text-sm">
                      {sub.billingCycle === 'monthly'
                        ? formatCurrency(sub.priceMonthly || 0)
                        : formatCurrency(sub.priceYearly || 0)}
                      /{sub.billingCycle === 'monthly' ? 'mo' : 'yr'}
                    </p>
                  </Table.Cell>
                  <Table.Cell>
                    <span style={{ color: 'var(--text-primary)' }}>
                      {sub.currentPeriodEnd ? formatDate(sub.currentPeriodEnd) : '-'}
                    </span>
                  </Table.Cell>
                  <Table.Cell align="right">
                    <div className="relative">
                      <button
                        onClick={() => setActionMenuOpen(actionMenuOpen === sub.id ? null : sub.id)}
                        style={{ color: 'var(--text-muted)' }}
                        className="p-1 hover:opacity-70 rounded"
                      >
                        <MoreVertical size={16} />
                      </button>
                      {actionMenuOpen === sub.id && (
                        <div style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }} className="absolute right-0 mt-1 w-48 rounded-lg shadow-lg border py-1 z-10">
                          <button
                            onClick={() => handleViewDetails(sub.id)}
                            style={{ color: 'var(--text-primary)' }}
                            className="w-full px-4 py-2 text-left text-sm hover:opacity-70 flex items-center gap-2"
                          >
                            <Eye size={14} />
                            View Details
                          </button>
                          <button
                            onClick={() => {
                              // TODO: Implement change plan modal
                              setActionMenuOpen(null)
                            }}
                            style={{ color: 'var(--text-primary)' }}
                            className="w-full px-4 py-2 text-left text-sm hover:opacity-70 flex items-center gap-2"
                          >
                            <ArrowUpDown size={14} />
                            Change Plan
                          </button>
                          {sub.status === 'cancelled' ? (
                            <button
                              onClick={() => {
                                // TODO: Implement resume
                                setActionMenuOpen(null)
                              }}
                              className="w-full px-4 py-2 text-left text-sm text-green-600 hover:bg-green-50 flex items-center gap-2"
                            >
                              <Play size={14} />
                              Resume
                            </button>
                          ) : (
                            <button
                              onClick={() => {
                                // TODO: Implement cancel modal
                                setActionMenuOpen(null)
                              }}
                              className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                            >
                              <XCircle size={14} />
                              Cancel
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table>

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{ borderColor: 'var(--border-color)' }} className="mt-4 px-6 py-4 border-t flex items-center justify-between">
              <p style={{ color: 'var(--text-muted)' }} className="text-sm">
                Showing {(page - 1) * limit + 1} to {Math.min(page * limit, total)} of {total} subscriptions
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }}
                  className="p-2 rounded-lg border hover:opacity-80 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft size={16} style={{ color: 'var(--text-primary)' }} />
                </button>
                <span style={{ color: 'var(--text-primary)' }} className="text-sm">
                  Page {page} of {totalPages}
                </span>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }}
                  className="p-2 rounded-lg border hover:opacity-80 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronRight size={16} style={{ color: 'var(--text-primary)' }} />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

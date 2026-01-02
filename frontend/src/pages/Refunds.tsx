import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Eye, Clock, CheckCircle, XCircle, RefreshCw, AlertCircle, ArrowUpRight } from 'lucide-react'
import Table from '../components/Table'
import { refundsApi, Refund, RefundStatus, RefundStats } from '../services/api'
import { useNotification } from '../contexts/NotificationContext'
import { useAuth } from '../contexts/AuthContext'

// Refund status colors
const refundStatusColors: Record<RefundStatus, string> = {
  requested: 'bg-yellow-100 text-yellow-700',
  under_review: 'bg-blue-100 text-blue-700',
  approved: 'bg-accent-100 text-accent-700',
  rejected: 'bg-red-100 text-red-700',
  processing: 'bg-purple-100 text-purple-700',
  completed: 'bg-green-100 text-green-700',
  failed: 'bg-red-100 text-red-700',
}

const refundStatusLabels: Record<RefundStatus, string> = {
  requested: 'Requested',
  under_review: 'Under Review',
  approved: 'Approved',
  rejected: 'Rejected',
  processing: 'Processing',
  completed: 'Completed',
  failed: 'Failed',
}

const refundStatusIcons: Record<RefundStatus, React.ReactNode> = {
  requested: <Clock size={14} />,
  under_review: <Eye size={14} />,
  approved: <CheckCircle size={14} />,
  rejected: <XCircle size={14} />,
  processing: <RefreshCw size={14} className="animate-spin" />,
  completed: <CheckCircle size={14} />,
  failed: <AlertCircle size={14} />,
}

export default function Refunds() {
  const navigate = useNavigate()
  const { tenant, tenantLoading } = useAuth()
  const [refunds, setRefunds] = useState<Refund[]>([])
  const [stats, setStats] = useState<RefundStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [dateFilter, setDateFilter] = useState<string>('all')
  const { showError } = useNotification()

  useEffect(() => {
    if (!tenantLoading && tenant) {
      loadData()
    } else if (!tenantLoading && !tenant) {
      setLoading(false)
    }
  }, [tenant, tenantLoading])

  const loadData = async () => {
    try {
      setLoading(true)
      const [refundsResult, statsData] = await Promise.all([
        refundsApi.getAll(),
        refundsApi.getStats()
      ])
      setRefunds(refundsResult.data)
      setStats(statsData)
    } catch (error) {
      console.error('Failed to load refunds:', error)
      showError('Failed to load refunds', 'Please try again later.')
      setRefunds([])
    } finally {
      setLoading(false)
    }
  }

  const handleViewRefund = (refund: Refund) => {
    navigate(`/dashboard/refunds/${refund.id}`)
  }

  const handleViewBooking = (bookingId: string) => {
    navigate(`/dashboard/bookings/${bookingId}`)
  }

  // Filter by date
  const getDateFilteredRefunds = (refunds: Refund[]) => {
    if (dateFilter === 'all') return refunds

    const now = new Date()
    const filterDate = new Date()

    switch (dateFilter) {
      case 'today':
        filterDate.setHours(0, 0, 0, 0)
        return refunds.filter(r => new Date(r.requested_at) >= filterDate)
      case 'week':
        filterDate.setDate(filterDate.getDate() - 7)
        return refunds.filter(r => new Date(r.requested_at) >= filterDate)
      case 'month':
        filterDate.setMonth(filterDate.getMonth() - 1)
        return refunds.filter(r => new Date(r.requested_at) >= filterDate)
      default:
        return refunds
    }
  }

  const filteredRefunds = getDateFilteredRefunds(refunds).filter(refund => {
    const matchesSearch =
      refund.guest_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      refund.booking_reference?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      refund.id.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === 'all' || refund.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const formatDate = (dateString: string) => {
    if (!dateString) return '-'
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatCurrency = (amount: number | null | undefined, currency: string = 'ZAR') => {
    if (amount === null || amount === undefined) return '-'
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(amount)
  }

  const getShortId = (id: string) => {
    return id.substring(0, 8).toUpperCase()
  }

  return (
    <div style={{ backgroundColor: 'var(--bg-card)' }} className="p-8 min-h-full transition-colors">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 style={{ color: 'var(--text-primary)' }} className="text-3xl font-bold mb-2">Refunds</h1>
          <p style={{ color: 'var(--text-muted)' }}>Manage and process customer refund requests</p>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
          <div style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }} className="rounded-xl border p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p style={{ color: 'var(--text-muted)' }} className="text-sm">Pending</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
              </div>
              <div className="bg-yellow-100 p-2 rounded-lg">
                <Clock className="text-yellow-600" size={20} />
              </div>
            </div>
          </div>

          <div style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }} className="rounded-xl border p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p style={{ color: 'var(--text-muted)' }} className="text-sm">Under Review</p>
                <p className="text-2xl font-bold text-blue-600">{stats.under_review}</p>
              </div>
              <div className="bg-blue-100 p-2 rounded-lg">
                <Eye className="text-blue-600" size={20} />
              </div>
            </div>
          </div>

          <div style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }} className="rounded-xl border p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p style={{ color: 'var(--text-muted)' }} className="text-sm">Approved</p>
                <p className="text-2xl font-bold text-accent-600">{stats.approved}</p>
              </div>
              <div className="bg-accent-100 p-2 rounded-lg">
                <CheckCircle className="text-accent-600" size={20} />
              </div>
            </div>
          </div>

          <div style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }} className="rounded-xl border p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p style={{ color: 'var(--text-muted)' }} className="text-sm">Processing</p>
                <p className="text-2xl font-bold text-purple-600">{stats.processing}</p>
              </div>
              <div className="bg-purple-100 p-2 rounded-lg">
                <RefreshCw className="text-purple-600" size={20} />
              </div>
            </div>
          </div>

          <div style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }} className="rounded-xl border p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p style={{ color: 'var(--text-muted)' }} className="text-sm">Completed (This Month)</p>
                <p className="text-2xl font-bold text-green-600">{stats.completed_this_month}</p>
              </div>
              <div className="bg-green-100 p-2 rounded-lg">
                <CheckCircle className="text-green-600" size={20} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Total Amounts Summary */}
      {stats && (
        <div style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }} className="rounded-xl border p-4 shadow-sm mb-6">
          <div className="flex flex-wrap gap-6">
            <div>
              <p style={{ color: 'var(--text-muted)' }} className="text-sm">Total Requested</p>
              <p style={{ color: 'var(--text-primary)' }} className="text-lg font-semibold">{formatCurrency(stats.total_requested_amount)}</p>
            </div>
            <div style={{ borderColor: 'var(--border-color)' }} className="border-l pl-6">
              <p style={{ color: 'var(--text-muted)' }} className="text-sm">Total Approved</p>
              <p className="text-lg font-semibold text-accent-600">{formatCurrency(stats.total_approved_amount)}</p>
            </div>
            <div style={{ borderColor: 'var(--border-color)' }} className="border-l pl-6">
              <p style={{ color: 'var(--text-muted)' }} className="text-sm">Total Processed</p>
              <p className="text-lg font-semibold text-green-600">{formatCurrency(stats.total_processed_amount)}</p>
            </div>
          </div>
        </div>
      )}

      {/* Filters and Search */}
      <div className="mb-6 flex flex-wrap items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2" style={{ color: 'var(--text-muted)' }} size={18} />
          <input
            type="text"
            placeholder="Search by guest name or booking reference..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              backgroundColor: 'var(--bg-secondary)',
              borderColor: 'var(--border-color)',
              color: 'var(--text-primary)'
            }}
            className="w-full pl-10 pr-4 py-2.5 border rounded-xl focus:outline-none focus:ring-2 focus:ring-accent-500 shadow-sm"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={{
            backgroundColor: 'var(--bg-secondary)',
            borderColor: 'var(--border-color)',
            color: 'var(--text-primary)'
          }}
          className="px-4 py-2.5 border rounded-xl focus:outline-none focus:ring-2 focus:ring-accent-500 shadow-sm"
        >
          <option value="all">All Status</option>
          <option value="requested">Requested</option>
          <option value="under_review">Under Review</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="processing">Processing</option>
          <option value="completed">Completed</option>
          <option value="failed">Failed</option>
        </select>
        <select
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value)}
          style={{
            backgroundColor: 'var(--bg-secondary)',
            borderColor: 'var(--border-color)',
            color: 'var(--text-primary)'
          }}
          className="px-4 py-2.5 border rounded-xl focus:outline-none focus:ring-2 focus:ring-accent-500 shadow-sm"
        >
          <option value="all">All Time</option>
          <option value="today">Today</option>
          <option value="week">Last 7 Days</option>
          <option value="month">Last 30 Days</option>
        </select>
      </div>

      {/* Refunds Table */}
      <Table>
        <Table.Header>
          <tr>
            <Table.HeaderCell>Refund ID</Table.HeaderCell>
            <Table.HeaderCell>Guest</Table.HeaderCell>
            <Table.HeaderCell>Booking Ref</Table.HeaderCell>
            <Table.HeaderCell>Original Amount</Table.HeaderCell>
            <Table.HeaderCell>Eligible Amount</Table.HeaderCell>
            <Table.HeaderCell>Status</Table.HeaderCell>
            <Table.HeaderCell>Requested</Table.HeaderCell>
            <Table.HeaderCell align="right">Actions</Table.HeaderCell>
          </tr>
        </Table.Header>
        <Table.Body>
          {loading ? (
            <Table.Empty colSpan={8}>Loading refunds...</Table.Empty>
          ) : filteredRefunds.length === 0 ? (
            <Table.Empty colSpan={8}>
              {searchQuery || statusFilter !== 'all' || dateFilter !== 'all'
                ? 'No refunds match your filters'
                : 'No refund requests yet'}
            </Table.Empty>
          ) : (
            filteredRefunds.map((refund) => (
              <Table.Row key={refund.id}>
                <Table.Cell className="whitespace-nowrap">
                  <span style={{ color: 'var(--text-muted)' }} className="text-sm font-mono">
                    #{getShortId(refund.id)}
                  </span>
                </Table.Cell>
                <Table.Cell className="whitespace-nowrap">
                  <div style={{ color: 'var(--text-primary)' }} className="text-sm font-medium">
                    {refund.guest_name || 'Guest'}
                  </div>
                </Table.Cell>
                <Table.Cell className="whitespace-nowrap">
                  <button
                    onClick={() => refund.booking_id && handleViewBooking(refund.booking_id)}
                    className="text-sm text-accent-600 hover:text-accent-700 flex items-center gap-1"
                  >
                    {refund.booking_reference || getShortId(refund.booking_id)}
                    <ArrowUpRight size={12} />
                  </button>
                </Table.Cell>
                <Table.Cell className="whitespace-nowrap">
                  <div style={{ color: 'var(--text-primary)' }} className="text-sm">
                    {formatCurrency(refund.original_amount, refund.currency)}
                  </div>
                </Table.Cell>
                <Table.Cell className="whitespace-nowrap">
                  <div style={{ color: 'var(--text-primary)' }} className="text-sm font-medium">
                    {formatCurrency(refund.eligible_amount, refund.currency)}
                  </div>
                  {refund.refund_percentage !== undefined && (
                    <div style={{ color: 'var(--text-muted)' }} className="text-xs">
                      {refund.refund_percentage}% of original
                    </div>
                  )}
                </Table.Cell>
                <Table.Cell className="whitespace-nowrap">
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full ${refundStatusColors[refund.status]}`}>
                    {refundStatusIcons[refund.status]}
                    {refundStatusLabels[refund.status]}
                  </span>
                </Table.Cell>
                <Table.Cell className="whitespace-nowrap">
                  <div style={{ color: 'var(--text-primary)' }} className="text-sm">
                    {formatDate(refund.requested_at)}
                  </div>
                </Table.Cell>
                <Table.Cell align="right" className="whitespace-nowrap text-sm font-medium">
                  <button
                    onClick={() => handleViewRefund(refund)}
                    className="text-accent-600 hover:text-accent-700 p-1 rounded-lg hover:bg-accent-50"
                    title="View & Manage Refund"
                  >
                    <Eye size={18} />
                  </button>
                </Table.Cell>
              </Table.Row>
            ))
          )}
        </Table.Body>
      </Table>

      {/* Pagination placeholder - can be added later */}
      {filteredRefunds.length > 0 && (
        <div style={{ color: 'var(--text-muted)' }} className="mt-4 text-sm text-center">
          Showing {filteredRefunds.length} refund{filteredRefunds.length !== 1 ? 's' : ''}
        </div>
      )}
    </div>
  )
}

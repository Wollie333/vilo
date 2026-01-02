import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, Edit, Trash2, Eye, RotateCcw } from 'lucide-react'
import Button from '../components/Button'
import ConfirmModal from '../components/ConfirmModal'
import SourceBadge from '../components/SourceBadge'
import Table from '../components/Table'
import { bookingsApi, Booking, BookingSource, BOOKING_SOURCE_DISPLAY, RefundStatus } from '../services/api'
import { useNotification } from '../contexts/NotificationContext'
import { useAuth } from '../contexts/AuthContext'
import { statusColors as themeStatusColors, paymentStatusColors as themePaymentColors } from '../theme/colors'

// Use centralized theme colors
const statusColors: Record<string, string> = {
  pending: themeStatusColors.pending.combined,
  confirmed: themeStatusColors.confirmed.combined,
  checked_in: themeStatusColors.checked_in.combined,
  checked_out: themeStatusColors.checked_out.combined,
  cancelled: themeStatusColors.cancelled.combined,
  completed: themeStatusColors.completed.combined,
}

const paymentStatusColors = {
  pending: themePaymentColors.pending.combined,
  paid: themePaymentColors.paid.combined,
  partial: themePaymentColors.partial.combined,
  refunded: themePaymentColors.refunded.combined,
}

// Refund status colors and labels
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
  requested: 'Pending',
  under_review: 'Review',
  approved: 'Approved',
  rejected: 'Rejected',
  processing: 'Processing',
  completed: 'Refunded',
  failed: 'Failed',
}

export default function Bookings() {
  const navigate = useNavigate()
  const { tenant, tenantLoading } = useAuth()
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [sourceFilter, setSourceFilter] = useState<string>('all')
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<{ isOpen: boolean; bookingId: string | null }>({
    isOpen: false,
    bookingId: null,
  })
  const { showSuccess, showError } = useNotification()

  useEffect(() => {
    // Wait for tenant to be loaded before fetching bookings
    if (!tenantLoading && tenant) {
      loadBookings()
    } else if (!tenantLoading && !tenant) {
      setLoading(false)
    }
  }, [tenant, tenantLoading])

  const loadBookings = async () => {
    try {
      setLoading(true)
      const data = await bookingsApi.getAll()
      setBookings(data)
    } catch (error) {
      console.error('Failed to load bookings:', error)
      setBookings([])
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = () => {
    navigate('/dashboard/bookings/new')
  }

  const handleView = (booking: Booking) => {
    navigate(`/dashboard/bookings/${booking.id}`)
  }

  const handleEdit = (booking: Booking) => {
    navigate(`/dashboard/bookings/${booking.id}/edit`)
  }

  const handleDeleteClick = (id: string) => {
    setConfirmDelete({ isOpen: true, bookingId: id })
  }

  const handleDeleteConfirm = async () => {
    if (!confirmDelete.bookingId) return

    try {
      setDeletingId(confirmDelete.bookingId)
      await bookingsApi.delete(confirmDelete.bookingId)
      setConfirmDelete({ isOpen: false, bookingId: null })
      showSuccess('Booking Deleted', 'The booking has been successfully deleted.')
      await loadBookings()
    } catch (error) {
      console.error('Error deleting booking:', error)
      showError('Failed to Delete', 'Could not delete the booking. Please try again.')
    } finally {
      setDeletingId(null)
    }
  }

  const handleDeleteCancel = () => {
    setConfirmDelete({ isOpen: false, bookingId: null })
  }

  const filteredBookings = bookings.filter(booking => {
    const matchesSearch = booking.guest_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      booking.room_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      booking.room_id?.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === 'all' || booking.status === statusFilter
    const matchesSource = sourceFilter === 'all' || (booking.source || 'manual') === sourceFilter
    return matchesSearch && matchesStatus && matchesSource
  })

  const formatDate = (dateString: string) => {
    if (!dateString) return ''
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(amount)
  }

  return (
    <div style={{ backgroundColor: 'var(--bg-card)' }} className="p-8 min-h-full transition-colors">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 style={{ color: 'var(--text-primary)' }} className="text-3xl font-bold mb-2">Bookings</h1>
          <p style={{ color: 'var(--text-muted)' }}>Manage all your accommodation bookings</p>
        </div>
        <Button onClick={handleCreate}>
          <Plus size={18} className="mr-2" />
          New Booking
        </Button>
      </div>

      {/* Filters and Search */}
      <div className="mb-6 flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2" style={{ color: 'var(--text-muted)' }} size={18} />
          <input
            type="text"
            placeholder="Search bookings..."
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
          <option value="pending">Pending</option>
          <option value="confirmed">Confirmed</option>
          <option value="checked_in">Checked In</option>
          <option value="checked_out">Checked Out</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <select
          value={sourceFilter}
          onChange={(e) => setSourceFilter(e.target.value)}
          style={{
            backgroundColor: 'var(--bg-secondary)',
            borderColor: 'var(--border-color)',
            color: 'var(--text-primary)'
          }}
          className="px-4 py-2.5 border rounded-xl focus:outline-none focus:ring-2 focus:ring-accent-500 shadow-sm"
        >
          <option value="all">All Sources</option>
          {Object.entries(BOOKING_SOURCE_DISPLAY).map(([key, info]) => (
            <option key={key} value={key}>{info.label}</option>
          ))}
        </select>
      </div>

      {/* Bookings Table */}
      <Table>
        <Table.Header>
          <tr>
            <Table.HeaderCell>Guest</Table.HeaderCell>
            <Table.HeaderCell>Source</Table.HeaderCell>
            <Table.HeaderCell>Room</Table.HeaderCell>
            <Table.HeaderCell>Check-in</Table.HeaderCell>
            <Table.HeaderCell>Check-out</Table.HeaderCell>
            <Table.HeaderCell>Amount</Table.HeaderCell>
            <Table.HeaderCell>Status</Table.HeaderCell>
            <Table.HeaderCell>Payment</Table.HeaderCell>
            <Table.HeaderCell align="right">Actions</Table.HeaderCell>
          </tr>
        </Table.Header>
        <Table.Body>
          {loading ? (
            <Table.Empty colSpan={9}>Loading bookings...</Table.Empty>
          ) : filteredBookings.length === 0 ? (
            <Table.Empty colSpan={9}>No bookings found</Table.Empty>
          ) : (
            filteredBookings.map((booking) => (
              <Table.Row key={booking.id}>
                <Table.Cell className="whitespace-nowrap">
                  <div style={{ color: 'var(--text-primary)' }} className="text-sm font-medium">{booking.guest_name}</div>
                </Table.Cell>
                <Table.Cell className="whitespace-nowrap">
                  <SourceBadge
                    source={(booking.source || 'manual') as BookingSource}
                    type="booking"
                    externalUrl={booking.external_url}
                    size="sm"
                  />
                </Table.Cell>
                <Table.Cell className="whitespace-nowrap">
                  <div style={{ color: 'var(--text-primary)' }} className="text-sm">{booking.room_name || booking.room_id}</div>
                </Table.Cell>
                <Table.Cell className="whitespace-nowrap">
                  <div style={{ color: 'var(--text-primary)' }} className="text-sm">{formatDate(booking.check_in)}</div>
                </Table.Cell>
                <Table.Cell className="whitespace-nowrap">
                  <div style={{ color: 'var(--text-primary)' }} className="text-sm">{formatDate(booking.check_out)}</div>
                </Table.Cell>
                <Table.Cell className="whitespace-nowrap">
                  <div style={{ color: 'var(--text-primary)' }} className="text-sm font-medium">
                    {formatCurrency(booking.total_amount, booking.currency)}
                  </div>
                </Table.Cell>
                <Table.Cell className="whitespace-nowrap">
                  <div className="flex flex-col gap-1">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusColors[booking.status]}`}>
                      {booking.status}
                    </span>
                    {booking.status === 'cancelled' && booking.refund_requested && (
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full ${
                        booking.refund_status ? refundStatusColors[booking.refund_status] : 'bg-yellow-100 text-yellow-700'
                      }`}>
                        <RotateCcw size={10} />
                        {booking.refund_status ? refundStatusLabels[booking.refund_status] : 'Refund'}
                      </span>
                    )}
                  </div>
                </Table.Cell>
                <Table.Cell className="whitespace-nowrap">
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${paymentStatusColors[booking.payment_status]}`}>
                    {booking.payment_status}
                  </span>
                </Table.Cell>
                <Table.Cell align="right" className="whitespace-nowrap text-sm font-medium">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => handleView(booking)}
                      style={{ color: 'var(--text-muted)' }}
                      className="hover:opacity-70 p-1"
                      title="View Details"
                    >
                      <Eye size={16} />
                    </button>
                    <button
                      onClick={() => handleEdit(booking)}
                      style={{ color: 'var(--text-muted)' }}
                      className="hover:opacity-70 p-1"
                    >
                      <Edit size={16} />
                    </button>
                    <button
                      onClick={() => booking.id && handleDeleteClick(booking.id)}
                      disabled={deletingId === booking.id}
                      className="text-red-500 hover:opacity-70 p-1 disabled:opacity-50"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </Table.Cell>
              </Table.Row>
            ))
          )}
        </Table.Body>
      </Table>

      <ConfirmModal
        isOpen={confirmDelete.isOpen}
        title="Delete Booking"
        message="Are you sure you want to delete this booking? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        onConfirm={handleDeleteConfirm}
        onCancel={handleDeleteCancel}
        isLoading={deletingId !== null}
      />
    </div>
  )
}


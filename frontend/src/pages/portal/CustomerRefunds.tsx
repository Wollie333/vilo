import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  RotateCcw,
  Clock,
  Eye,
  CheckCircle,
  XCircle,
  RefreshCw,
  AlertCircle,
  Calendar,
  BedDouble,
  Building2,
  Search,
  ChevronRight,
  Loader2,
  DollarSign
} from 'lucide-react'
import { portalApi, CustomerRefundWithBooking, CustomerRefundStatus } from '../../services/portalApi'

// Status colors and labels
const refundStatusColors: Record<CustomerRefundStatus, string> = {
  requested: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  under_review: 'bg-blue-100 text-blue-700 border-blue-200',
  approved: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  rejected: 'bg-red-100 text-red-700 border-red-200',
  processing: 'bg-purple-100 text-purple-700 border-purple-200',
  completed: 'bg-green-100 text-green-700 border-green-200',
  failed: 'bg-red-100 text-red-700 border-red-200',
}

const refundStatusLabels: Record<CustomerRefundStatus, string> = {
  requested: 'Requested',
  under_review: 'Under Review',
  approved: 'Approved',
  rejected: 'Rejected',
  processing: 'Processing',
  completed: 'Refunded',
  failed: 'Failed',
}

const refundStatusIcons: Record<CustomerRefundStatus, React.ReactNode> = {
  requested: <Clock size={14} />,
  under_review: <Eye size={14} />,
  approved: <CheckCircle size={14} />,
  rejected: <XCircle size={14} />,
  processing: <RefreshCw size={14} className="animate-spin" />,
  completed: <CheckCircle size={14} />,
  failed: <AlertCircle size={14} />,
}

// Filter tabs
type FilterType = 'all' | 'pending' | 'completed' | 'declined'

const FILTERS: { id: FilterType; label: string }[] = [
  { id: 'all', label: 'All Refunds' },
  { id: 'pending', label: 'Pending' },
  { id: 'completed', label: 'Completed' },
  { id: 'declined', label: 'Declined' },
]

export default function CustomerRefunds() {
  const navigate = useNavigate()
  const [refunds, setRefunds] = useState<CustomerRefundWithBooking[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<FilterType>('all')
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    loadRefunds()
  }, [])

  const loadRefunds = async () => {
    try {
      setLoading(true)
      console.log('[CustomerRefunds] Loading refunds...')
      const data = await portalApi.getRefunds()
      console.log('[CustomerRefunds] Loaded refunds:', data?.length || 0, data)
      setRefunds(data || [])
    } catch (error) {
      console.error('[CustomerRefunds] Failed to load refunds:', error)
      setRefunds([])
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return '-'
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const formatCurrency = (amount: number, currency: string = 'ZAR') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(amount)
  }

  // Filter refunds based on filter and search
  const filteredRefunds = refunds.filter(refund => {
    // Filter by status category
    if (filter === 'pending') {
      if (!['requested', 'under_review', 'approved', 'processing'].includes(refund.status)) {
        return false
      }
    } else if (filter === 'completed') {
      // Only successfully completed refunds
      if (refund.status !== 'completed') {
        return false
      }
    } else if (filter === 'declined') {
      // Both rejected and failed
      if (!['rejected', 'failed'].includes(refund.status)) {
        return false
      }
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      const matchesRoom = refund.booking.room_name?.toLowerCase().includes(query)
      const matchesProperty = refund.booking.property?.name?.toLowerCase().includes(query)
      const matchesId = refund.id.toLowerCase().includes(query)
      return matchesRoom || matchesProperty || matchesId
    }

    return true
  })

  // Count refunds by status category
  const pendingCount = refunds.filter(r => ['requested', 'under_review', 'approved', 'processing'].includes(r.status)).length
  const completedCount = refunds.filter(r => r.status === 'completed').length
  const declinedCount = refunds.filter(r => ['rejected', 'failed'].includes(r.status)).length

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <Loader2 className="animate-spin text-gray-400" size={32} />
      </div>
    )
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">My Refunds</h1>
        <p className="text-gray-500 mt-1">Track the status of your refund requests</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
              <RotateCcw className="text-gray-600" size={20} />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{refunds.length}</p>
              <p className="text-sm text-gray-500">Total</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
              <Clock className="text-yellow-600" size={20} />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{pendingCount}</p>
              <p className="text-sm text-gray-500">Pending</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <CheckCircle className="text-green-600" size={20} />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{completedCount}</p>
              <p className="text-sm text-gray-500">Completed</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
              <XCircle className="text-red-600" size={20} />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{declinedCount}</p>
              <p className="text-sm text-gray-500">Declined</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filter & Search */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        {/* Filter Tabs */}
        <div className="flex gap-2 flex-wrap">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === f.id
                  ? f.id === 'declined' ? 'bg-red-600 text-white' : 'bg-emerald-600 text-white'
                  : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {f.label}
              {f.id === 'pending' && pendingCount > 0 && (
                <span className={`ml-2 px-1.5 py-0.5 rounded-full text-xs ${
                  filter === f.id ? 'bg-white/20' : 'bg-yellow-100 text-yellow-700'
                }`}>
                  {pendingCount}
                </span>
              )}
              {f.id === 'declined' && declinedCount > 0 && (
                <span className={`ml-2 px-1.5 py-0.5 rounded-full text-xs ${
                  filter === f.id ? 'bg-white/20' : 'bg-red-100 text-red-700'
                }`}>
                  {declinedCount}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by property, room..."
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
          />
        </div>
      </div>

      {/* Refunds List */}
      {filteredRefunds.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
          <RotateCcw className="mx-auto text-gray-300 mb-4" size={48} />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {refunds.length === 0 ? 'No refunds yet' : 'No refunds match your filters'}
          </h3>
          <p className="text-gray-500">
            {refunds.length === 0
              ? 'When you request a refund for a cancelled booking, it will appear here.'
              : 'Try adjusting your search or filter criteria.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredRefunds.map((refund) => (
            <div
              key={refund.id}
              className="bg-white rounded-xl border border-gray-100 p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                {/* Property/Room Info */}
                <div className="flex items-start gap-4 flex-1">
                  {refund.booking.property?.logo_url ? (
                    <img
                      src={refund.booking.property.logo_url}
                      alt={refund.booking.property.name}
                      className="w-14 h-14 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="w-14 h-14 bg-gray-100 rounded-lg flex items-center justify-center">
                      <Building2 className="text-gray-400" size={24} />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 truncate">
                      {refund.booking.property?.name || 'Property'}
                    </h3>
                    <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
                      <BedDouble size={14} />
                      <span className="truncate">{refund.booking.room_name}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
                      <Calendar size={14} />
                      <span>
                        {formatDate(refund.booking.check_in)} - {formatDate(refund.booking.check_out)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Amount Info */}
                <div className="lg:text-right">
                  <div className="text-sm text-gray-500">
                    {refund.status === 'completed' ? 'Refunded' : 'Eligible'}
                  </div>
                  <div className="text-lg font-bold text-gray-900">
                    {refund.status === 'completed'
                      ? formatCurrency(refund.processed_amount || refund.approved_amount || 0, refund.currency)
                      : formatCurrency(refund.eligible_amount, refund.currency)}
                  </div>
                  {refund.refund_percentage && (
                    <div className="text-xs text-gray-400">
                      {refund.refund_percentage}% of original
                    </div>
                  )}
                </div>

                {/* Status & Action */}
                <div className="flex items-center gap-3">
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border ${refundStatusColors[refund.status]}`}>
                    {refundStatusIcons[refund.status]}
                    {refundStatusLabels[refund.status]}
                  </span>
                  <Link
                    to={`/portal/bookings/${refund.booking_id}`}
                    className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                    title="View Booking"
                  >
                    <ChevronRight className="text-gray-400" size={20} />
                  </Link>
                </div>
              </div>

              {/* Prominent Decline Banner */}
              {['rejected', 'failed'].includes(refund.status) && (
                <div className="mt-3 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-center gap-2 text-red-700 font-medium mb-2">
                    <XCircle size={18} />
                    {refund.status === 'rejected' ? 'Refund Declined' : 'Refund Failed'}
                  </div>
                  {(refund.rejection_reason || refund.failure_reason) && (
                    <p className="text-sm text-red-600">
                      <span className="font-medium">Reason: </span>
                      {refund.rejection_reason || refund.failure_reason}
                    </p>
                  )}
                  {(refund.rejected_at || refund.failed_at) && (
                    <p className="text-xs text-red-500 mt-2">
                      {refund.status === 'rejected' ? 'Declined' : 'Failed'} on {formatDate(refund.rejected_at || refund.failed_at)}
                    </p>
                  )}
                </div>
              )}

              {/* Completed Info */}
              {refund.status === 'completed' && refund.payment_method && (
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <div className="text-sm text-gray-500">
                    Refunded via <span className="font-medium capitalize">{refund.payment_method}</span>
                    {refund.completed_at && (
                      <span> on {formatDate(refund.completed_at)}</span>
                    )}
                  </div>
                </div>
              )}

              {/* Timeline for pending refunds */}
              {['requested', 'under_review', 'approved', 'processing'].includes(refund.status) && (
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <div className="text-xs text-gray-400">
                    Requested on {formatDate(refund.requested_at)}
                    {refund.approved_at && (
                      <span> • Approved on {formatDate(refund.approved_at)}</span>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

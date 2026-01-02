import { useState, useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Calendar, Building2, Search, Eye, MessageCircle, BedDouble, Star, AlertTriangle, RefreshCw, Trash2, CreditCard, ShoppingCart, Clock, CheckCircle, RotateCcw } from 'lucide-react'
import { portalApi, CustomerBooking, BookingStatus, CustomerRefundStatus } from '../../services/portalApi'

// Tab types
type TabType = 'pending' | 'confirmed' | 'cart_abandoned' | 'payment_failed' | 'refund_requests'

// Status groupings for each tab (refund_requests handled separately with refund_requested flag)
const STATUS_GROUPS: Record<TabType, BookingStatus[]> = {
  pending: ['pending'],
  confirmed: ['confirmed', 'checked_in', 'checked_out', 'completed'],
  cart_abandoned: ['cart_abandoned'],
  payment_failed: ['payment_failed'],
  refund_requests: ['cancelled'] // Cancelled bookings with refund_requested = true
}

// Tab configuration
const TABS: { id: TabType; label: string; icon: React.ElementType; color: string; activeColor: string }[] = [
  { id: 'pending', label: 'Pending', icon: Clock, color: 'text-yellow-600 border-yellow-200 hover:bg-yellow-50', activeColor: 'bg-yellow-600 text-white' },
  { id: 'confirmed', label: 'Confirmed', icon: CheckCircle, color: 'text-accent-600 border-accent-200 hover:bg-accent-50', activeColor: 'bg-accent-600 text-white' },
  { id: 'cart_abandoned', label: 'Cart Abandoned', icon: ShoppingCart, color: 'text-orange-600 border-orange-200 hover:bg-orange-50', activeColor: 'bg-orange-600 text-white' },
  { id: 'payment_failed', label: 'Payment Failed', icon: CreditCard, color: 'text-red-600 border-red-200 hover:bg-red-50', activeColor: 'bg-red-600 text-white' },
  { id: 'refund_requests', label: 'Refund Requests', icon: RotateCcw, color: 'text-purple-600 border-purple-200 hover:bg-purple-50', activeColor: 'bg-purple-600 text-white' }
]

// Check if booking is eligible for review
const canLeaveReview = (booking: CustomerBooking): boolean => {
  const isCompletedStay = booking.status === 'checked_out' || booking.status === 'completed'
  const isPaid = booking.payment_status === 'paid'
  const hasNoReview = !booking.reviews || booking.reviews.length === 0
  return isCompletedStay && isPaid && hasNoReview
}

// Status colors and labels
const statusColors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  confirmed: 'bg-accent-100 text-accent-700 border-accent-200',
  checked_in: 'bg-blue-100 text-blue-700 border-blue-200',
  checked_out: 'bg-purple-100 text-purple-700 border-purple-200',
  cancelled: 'bg-gray-100 text-gray-700 border-gray-200',
  completed: 'bg-gray-100 text-gray-700 border-gray-200',
  payment_failed: 'bg-red-100 text-red-700 border-red-200',
  cart_abandoned: 'bg-orange-100 text-orange-700 border-orange-200',
}

const statusLabels: Record<string, string> = {
  pending: 'Pending Payment',
  confirmed: 'Confirmed',
  checked_in: 'Checked In',
  checked_out: 'Checked Out',
  cancelled: 'Cancelled',
  completed: 'Completed',
  payment_failed: 'Payment Failed',
  cart_abandoned: 'Cart Abandoned',
}

const paymentStatusColors: Record<string, string> = {
  pending: 'bg-yellow-50 text-yellow-700',
  paid: 'bg-accent-50 text-accent-700',
  partial: 'bg-blue-50 text-blue-700',
  refunded: 'bg-red-50 text-red-700',
}

const paymentStatusLabels: Record<string, string> = {
  pending: 'Payment Pending',
  paid: 'Paid',
  partial: 'Partial Payment',
  refunded: 'Refunded',
}

// Refund status colors and labels
const refundStatusColors: Record<CustomerRefundStatus, string> = {
  requested: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  under_review: 'bg-blue-100 text-blue-700 border-blue-200',
  approved: 'bg-accent-100 text-accent-700 border-accent-200',
  rejected: 'bg-red-100 text-red-700 border-red-200',
  processing: 'bg-purple-100 text-purple-700 border-purple-200',
  completed: 'bg-green-100 text-green-700 border-green-200',
  failed: 'bg-red-100 text-red-700 border-red-200',
}

const refundStatusLabels: Record<CustomerRefundStatus, string> = {
  requested: 'Refund Requested',
  under_review: 'Under Review',
  approved: 'Approved',
  rejected: 'Rejected',
  processing: 'Processing',
  completed: 'Refunded',
  failed: 'Failed',
}

export default function CustomerBookings() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [bookings, setBookings] = useState<CustomerBooking[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<TabType>('pending')
  const [searchQuery, setSearchQuery] = useState('')
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // Check URL param on mount to set initial tab
  useEffect(() => {
    const tabParam = searchParams.get('tab') as TabType | null
    if (tabParam && TABS.some(t => t.id === tabParam)) {
      setActiveTab(tabParam)
      // Clear the URL param after reading it
      setSearchParams({}, { replace: true })
    }
  }, [])

  useEffect(() => {
    loadBookings()
  }, [])

  const loadBookings = async () => {
    try {
      setLoading(true)
      const data = await portalApi.getBookings()
      setBookings(data)
    } catch (error) {
      console.error('Failed to load bookings:', error)
    } finally {
      setLoading(false)
    }
  }

  // Handle tab change (client-side only, no reload)
  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab)
  }

  // Get property slug from booking
  const getPropertySlug = (booking: CustomerBooking): string | null => {
    return booking.tenants?.slug || null
  }

  const handleRetryBooking = (booking: CustomerBooking) => {
    const propertySlug = getPropertySlug(booking)
    if (propertySlug) {
      navigate(`/accommodation/${propertySlug}/book?retry=${booking.id}`)
    }
  }

  const handleDeleteBooking = async (bookingId: string) => {
    if (!confirm('Are you sure you want to remove this booking?')) return

    try {
      setDeletingId(bookingId)
      await portalApi.deleteFailedBooking(bookingId)
      setBookings(prev => prev.filter(b => b.id !== bookingId))
    } catch (error) {
      console.error('Failed to delete booking:', error)
    } finally {
      setDeletingId(null)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    })
  }

  const formatDateRange = (checkIn: string, checkOut: string) => {
    const inDate = new Date(checkIn)
    const outDate = new Date(checkOut)
    const nights = Math.ceil((outDate.getTime() - inDate.getTime()) / (1000 * 60 * 60 * 24))
    return `${nights} night${nights !== 1 ? 's' : ''}`
  }

  const formatCurrency = (amount: number | string | null | undefined, currency: string = 'ZAR') => {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : (amount ?? 0)
    if (isNaN(numAmount)) return 'R0'
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'ZAR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(numAmount)
  }

  const getRoomImage = (booking: CustomerBooking): string | null => {
    if (booking.room?.images?.featured?.url) {
      return booking.room.images.featured.url
    }
    if (booking.room?.images?.gallery?.[0]?.url) {
      return booking.room.images.gallery[0].url
    }
    return null
  }

  // Filter bookings by current tab
  const filteredBookings = bookings.filter(booking => {
    // Special handling for refund_requests tab
    if (activeTab === 'refund_requests') {
      // Only show cancelled bookings with refund_requested = true
      if (booking.status !== 'cancelled' || !booking.refund_requested) return false
    } else {
      // Standard status group filtering for other tabs
      const statusGroup = STATUS_GROUPS[activeTab]
      if (!statusGroup.includes(booking.status)) return false
    }

    // Then filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      return (
        booking.room_name?.toLowerCase().includes(query) ||
        booking.tenants?.business_name?.toLowerCase().includes(query)
      )
    }

    return true
  })

  // Get count for each tab
  const getTabCount = (tab: TabType): number => {
    if (tab === 'refund_requests') {
      return bookings.filter(b => b.status === 'cancelled' && b.refund_requested).length
    }
    const statusGroup = STATUS_GROUPS[tab]
    return bookings.filter(b => statusGroup.includes(b.status)).length
  }

  // Check if this is a failed booking (payment_failed or cart_abandoned)
  const isFailedBooking = (status: BookingStatus): boolean => {
    return status === 'payment_failed' || status === 'cart_abandoned'
  }

  if (loading) {
    return (
      <div className="p-8 bg-gray-50 min-h-full">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-accent-200 border-t-accent-600 rounded-full animate-spin mx-auto mb-4" />
            <p className="text-gray-500">Loading bookings...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 md:p-8 bg-gray-50 min-h-full">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">My Bookings</h1>
          <p className="text-gray-600">View and manage your reservations</p>
        </div>

        {/* Search */}
        <div className="mb-6">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Search bookings..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
            />
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-6">
          <div className="flex flex-wrap gap-2">
            {TABS.map((tab) => {
              const count = getTabCount(tab.id)
              const Icon = tab.icon
              const isActive = activeTab === tab.id

              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id)}
                  className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-1.5 border ${
                    isActive ? tab.activeColor : `bg-white ${tab.color}`
                  }`}
                >
                  <Icon size={16} />
                  {tab.label}
                  {count > 0 && (
                    <span className={`ml-1 px-1.5 py-0.5 text-xs rounded-full ${
                      isActive ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-700'
                    }`}>
                      {count}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* Notice for failed bookings tabs */}
        {(activeTab === 'payment_failed' || activeTab === 'cart_abandoned') && filteredBookings.length > 0 && (
          <div className={`mb-6 ${activeTab === 'payment_failed' ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200'} border rounded-lg p-4 flex items-start gap-3`}>
            <AlertTriangle className={`w-5 h-5 ${activeTab === 'payment_failed' ? 'text-red-600' : 'text-amber-600'} flex-shrink-0 mt-0.5`} />
            <div>
              <p className={`font-medium ${activeTab === 'payment_failed' ? 'text-red-800' : 'text-amber-800'}`}>
                {activeTab === 'payment_failed' ? 'Payment failed for these bookings' : 'Complete your bookings'}
              </p>
              <p className={`text-sm ${activeTab === 'payment_failed' ? 'text-red-700' : 'text-amber-700'} mt-1`}>
                {activeTab === 'payment_failed'
                  ? 'Your payment could not be processed. Click "Retry" to try again with a different payment method.'
                  : 'These bookings need payment to be confirmed. Click "Retry" to complete your reservation.'}
              </p>
            </div>
          </div>
        )}

        {/* Notice for refund requests tab */}
        {activeTab === 'refund_requests' && filteredBookings.length > 0 && (
          <div className="mb-6 bg-purple-50 border border-purple-200 rounded-lg p-4 flex items-start gap-3">
            <RotateCcw className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-purple-800">Refund Requests</p>
              <p className="text-sm text-purple-700 mt-1">
                Track the status of your refund requests. Refunds are processed according to the property's cancellation policy.
              </p>
            </div>
          </div>
        )}

        {/* Bookings List */}
        {filteredBookings.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            {activeTab === 'payment_failed' ? (
              <>
                <CreditCard className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No failed payments</h3>
                <p className="text-gray-500">You don't have any bookings with failed payments.</p>
              </>
            ) : activeTab === 'cart_abandoned' ? (
              <>
                <ShoppingCart className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No abandoned carts</h3>
                <p className="text-gray-500">You don't have any incomplete bookings.</p>
              </>
            ) : activeTab === 'pending' ? (
              <>
                <Clock className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No pending bookings</h3>
                <p className="text-gray-500">You don't have any bookings awaiting payment.</p>
              </>
            ) : activeTab === 'refund_requests' ? (
              <>
                <RotateCcw className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No refund requests</h3>
                <p className="text-gray-500">
                  {searchQuery ? 'No refund requests match your search.' : 'When you cancel a booking and request a refund, it will appear here.'}
                </p>
              </>
            ) : (
              <>
                <CheckCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No confirmed bookings</h3>
                <p className="text-gray-500">
                  {searchQuery ? 'No bookings match your search.' : "You don't have any confirmed bookings yet."}
                </p>
              </>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredBookings.map((booking) => {
              const roomImage = getRoomImage(booking)
              const isFailed = isFailedBooking(booking.status)
              const isRefundRequest = activeTab === 'refund_requests'

              return (
                <div
                  key={booking.id}
                  className={`bg-white rounded-xl border overflow-hidden hover:shadow-md transition-shadow ${
                    isFailed ? 'border-red-200' : isRefundRequest ? 'border-purple-200' : 'border-gray-200'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row">
                    {/* Room Image */}
                    <div className="sm:w-48 h-40 sm:h-auto flex-shrink-0">
                      {roomImage ? (
                        <img
                          src={roomImage}
                          alt={booking.room_name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                          <BedDouble className="w-10 h-10 text-gray-300" />
                        </div>
                      )}
                    </div>

                    {/* Booking Details */}
                    <div className="flex-1 p-5">
                      <div className="flex flex-col h-full">
                        {/* Top: Room name and status */}
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <div>
                            <h3 className="font-semibold text-gray-900 text-lg leading-tight">
                              {booking.room_name}
                            </h3>
                            <p className="text-sm text-gray-500 flex items-center gap-1 mt-0.5">
                              <Building2 size={14} />
                              {booking.tenants?.business_name || 'Property'}
                            </p>
                          </div>
                          {isRefundRequest && booking.refund_status ? (
                            <span className={`px-2.5 py-1 text-xs font-medium rounded-full border flex items-center gap-1 ${refundStatusColors[booking.refund_status] || 'bg-gray-100 text-gray-700 border-gray-200'}`}>
                              <RotateCcw size={12} />
                              {refundStatusLabels[booking.refund_status] || booking.refund_status}
                            </span>
                          ) : (
                            <span className={`px-2.5 py-1 text-xs font-medium rounded-full border flex items-center gap-1 ${statusColors[booking.status] || 'bg-gray-100 text-gray-700 border-gray-200'}`}>
                              {isFailed && <AlertTriangle size={12} />}
                              {statusLabels[booking.status] || booking.status}
                            </span>
                          )}
                        </div>

                        {/* Middle: Dates and summary */}
                        <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 mb-4">
                          <div className="flex items-center gap-1.5">
                            <Calendar size={15} className="text-gray-400" />
                            <span>{formatDate(booking.check_in)} - {formatDate(booking.check_out)}</span>
                          </div>
                          <span className="text-gray-300">|</span>
                          <span>{formatDateRange(booking.check_in, booking.check_out)}</span>
                        </div>

                        {/* Failed booking info */}
                        {isFailed && booking.failed_at && (
                          <p className="text-xs text-gray-500 mb-3">
                            Failed on {new Date(booking.failed_at).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                              hour: 'numeric',
                              minute: '2-digit'
                            })}
                            {booking.retry_count && booking.retry_count > 0 && (
                              <span className="ml-2">({booking.retry_count} retry attempt{booking.retry_count > 1 ? 's' : ''})</span>
                            )}
                          </p>
                        )}

                        {/* Bottom: Price, payment status, and actions */}
                        <div className="flex items-center justify-between mt-auto pt-3 border-t border-gray-100">
                          <div className="flex items-center gap-3">
                            <span className="text-lg font-semibold text-gray-900">
                              {formatCurrency(booking.total_amount, booking.currency)}
                            </span>
                            {!isFailed && (
                              <span className={`px-2 py-0.5 text-xs font-medium rounded ${paymentStatusColors[booking.payment_status] || 'bg-gray-50 text-gray-600'}`}>
                                {paymentStatusLabels[booking.payment_status] || booking.payment_status}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            {/* Failed booking actions */}
                            {isFailed ? (
                              <>
                                <button
                                  onClick={() => handleDeleteBooking(booking.id)}
                                  disabled={deletingId === booking.id}
                                  className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                                  title="Remove"
                                >
                                  {deletingId === booking.id ? (
                                    <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
                                  ) : (
                                    <Trash2 size={18} />
                                  )}
                                </button>
                                <button
                                  onClick={() => handleRetryBooking(booking)}
                                  className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 transition-colors"
                                >
                                  <RefreshCw size={16} />
                                  Retry
                                </button>
                              </>
                            ) : isRefundRequest ? (
                              <>
                                <Link
                                  to={`/portal/support?booking=${booking.id}`}
                                  className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                                  title="Contact Support"
                                >
                                  <MessageCircle size={18} />
                                </Link>
                                <Link
                                  to={`/portal/bookings/${booking.id}`}
                                  className="flex items-center gap-1.5 px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 transition-colors"
                                >
                                  <Eye size={16} />
                                  View Refund
                                </Link>
                              </>
                            ) : (
                              <>
                                {canLeaveReview(booking) && (
                                  <Link
                                    to={`/portal/bookings/${booking.id}#review`}
                                    className="flex items-center gap-1.5 px-3 py-2 bg-yellow-50 text-yellow-700 border border-yellow-200 text-sm font-medium rounded-lg hover:bg-yellow-100 transition-colors"
                                  >
                                    <Star size={16} className="fill-yellow-400 text-yellow-400" />
                                    Leave Review
                                  </Link>
                                )}
                                <Link
                                  to={`/portal/support?booking=${booking.id}`}
                                  className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                                  title="Contact Support"
                                >
                                  <MessageCircle size={18} />
                                </Link>
                                <Link
                                  to={`/portal/bookings/${booking.id}`}
                                  className="flex items-center gap-1.5 px-4 py-2 bg-accent-600 text-white text-sm font-medium rounded-lg hover:bg-accent-700 transition-colors"
                                >
                                  <Eye size={16} />
                                  View Details
                                </Link>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

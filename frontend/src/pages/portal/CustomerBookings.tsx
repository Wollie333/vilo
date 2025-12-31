import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Calendar, Building2, Search, Eye, MessageCircle, BedDouble } from 'lucide-react'
import { portalApi, CustomerBooking } from '../../services/portalApi'

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  confirmed: 'bg-accent-100 text-accent-700 border-accent-200',
  checked_in: 'bg-blue-100 text-blue-700 border-blue-200',
  checked_out: 'bg-purple-100 text-purple-700 border-purple-200',
  cancelled: 'bg-red-100 text-red-700 border-red-200',
  completed: 'bg-gray-100 text-gray-700 border-gray-200',
}

const statusLabels: Record<string, string> = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  checked_in: 'Checked In',
  checked_out: 'Checked Out',
  cancelled: 'Cancelled',
  completed: 'Completed',
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

export default function CustomerBookings() {
  const [bookings, setBookings] = useState<CustomerBooking[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'past'>('all')
  const [searchQuery, setSearchQuery] = useState('')

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

  const now = new Date()
  const filteredBookings = bookings.filter(booking => {
    const checkIn = new Date(booking.check_in)
    const checkOut = new Date(booking.check_out)

    if (filter === 'upcoming' && checkIn < now) return false
    if (filter === 'past' && checkOut >= now) return false

    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      return (
        booking.room_name?.toLowerCase().includes(query) ||
        booking.tenants?.business_name?.toLowerCase().includes(query)
      )
    }

    return true
  })

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

        {/* Filters */}
        <div className="mb-6 flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="relative flex-1 w-full sm:max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Search bookings..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
            />
          </div>
          <div className="flex gap-2">
            {(['all', 'upcoming', 'past'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                  filter === f
                    ? 'bg-accent-600 text-white'
                    : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
                }`}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Bookings List */}
        {filteredBookings.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No bookings found</h3>
            <p className="text-gray-500">
              {filter === 'upcoming' ? 'You have no upcoming bookings.' :
               filter === 'past' ? 'You have no past bookings.' :
               searchQuery ? 'No bookings match your search.' :
               'You haven\'t made any bookings yet.'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredBookings.map((booking) => {
              const roomImage = getRoomImage(booking)

              return (
                <div
                  key={booking.id}
                  className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-md transition-shadow"
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
                          <span className={`px-2.5 py-1 text-xs font-medium rounded-full border ${statusColors[booking.status] || 'bg-gray-100 text-gray-700 border-gray-200'}`}>
                            {statusLabels[booking.status] || booking.status}
                          </span>
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

                        {/* Bottom: Price, payment status, and actions */}
                        <div className="flex items-center justify-between mt-auto pt-3 border-t border-gray-100">
                          <div className="flex items-center gap-3">
                            <span className="text-lg font-semibold text-gray-900">
                              {formatCurrency(booking.total_amount, booking.currency)}
                            </span>
                            <span className={`px-2 py-0.5 text-xs font-medium rounded ${paymentStatusColors[booking.payment_status] || 'bg-gray-50 text-gray-600'}`}>
                              {paymentStatusLabels[booking.payment_status] || booking.payment_status}
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
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

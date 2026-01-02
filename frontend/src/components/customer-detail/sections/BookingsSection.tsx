import { useState } from 'react'
import { Calendar, ExternalLink, Star, Search, Filter, ChevronDown, BedDouble, Eye, CreditCard } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

interface Review {
  rating: number
  title?: string
  content?: string
}

interface RoomImages {
  featured?: { url: string }
  gallery?: { url: string }[]
}

interface Booking {
  id?: string
  room_id?: string
  room_name?: string
  room?: {
    images?: RoomImages
  }
  check_in: string
  check_out: string
  status: 'pending' | 'confirmed' | 'checked_in' | 'checked_out' | 'cancelled' | 'completed' | 'occupied' | string
  payment_status?: 'pending' | 'paid' | 'partial' | 'refunded' | string
  total_amount: number
  currency: string
  reviews?: Review[]
}

interface BookingsSectionProps {
  bookings: Booking[]
}

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  confirmed: 'bg-accent-100 text-accent-700 border-accent-200',
  checked_in: 'bg-blue-100 text-blue-700 border-blue-200',
  checked_out: 'bg-purple-100 text-purple-700 border-purple-200',
  cancelled: 'bg-red-100 text-red-700 border-red-200',
  completed: 'bg-gray-100 text-gray-700 border-gray-200',
  occupied: 'bg-blue-100 text-blue-700 border-blue-200',
}

const statusLabels: Record<string, string> = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  checked_in: 'Checked In',
  checked_out: 'Checked Out',
  cancelled: 'Cancelled',
  completed: 'Completed',
  occupied: 'Occupied',
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
  partial: 'Partial',
  refunded: 'Refunded',
}

export default function BookingsSection({ bookings }: BookingsSectionProps) {
  const navigate = useNavigate()
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [showFilters, setShowFilters] = useState(false)

  const formatDate = (dateString: string) => {
    if (!dateString) return '-'
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

  const formatCurrency = (amount: number, currency: string = 'ZAR') => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            size={12}
            className={star <= rating ? 'text-amber-400 fill-amber-400' : 'text-gray-300'}
          />
        ))}
      </div>
    )
  }

  const getRoomImage = (booking: Booking): string | null => {
    if (booking.room?.images?.featured?.url) {
      return booking.room.images.featured.url
    }
    if (booking.room?.images?.gallery?.[0]?.url) {
      return booking.room.images.gallery[0].url
    }
    return null
  }

  // Get unique statuses for filter
  const availableStatuses = Array.from(new Set(bookings.map(b => b.status)))

  // Filter bookings
  const filteredBookings = bookings.filter(booking => {
    const matchesSearch = searchQuery === '' ||
      (booking.room_name || '').toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === 'all' || booking.status === statusFilter
    return matchesSearch && matchesStatus
  })

  // Sort by check_in date (most recent first)
  const sortedBookings = [...filteredBookings].sort((a, b) =>
    new Date(b.check_in).getTime() - new Date(a.check_in).getTime()
  )

  return (
    <div className="space-y-4">
      {/* Header with Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by room name..."
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-500/20 focus:border-accent-500"
          />
        </div>
        <div className="relative">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border rounded-lg transition-colors ${
              statusFilter !== 'all'
                ? 'bg-accent-50 border-accent-200 text-accent-700'
                : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
            }`}
          >
            <Filter size={16} />
            {statusFilter !== 'all' ? statusLabels[statusFilter] : 'Status'}
            <ChevronDown size={14} className={`transition-transform ${showFilters ? 'rotate-180' : ''}`} />
          </button>
          {showFilters && (
            <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
              <button
                onClick={() => { setStatusFilter('all'); setShowFilters(false) }}
                className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 first:rounded-t-lg ${statusFilter === 'all' ? 'text-accent-600 font-medium' : 'text-gray-700'}`}
              >
                All Statuses
              </button>
              {availableStatuses.map(status => (
                <button
                  key={status}
                  onClick={() => { setStatusFilter(status); setShowFilters(false) }}
                  className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 last:rounded-b-lg ${statusFilter === status ? 'text-accent-600 font-medium' : 'text-gray-700'}`}
                >
                  {statusLabels[status] || status}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Results count */}
      <div className="text-sm text-gray-500">
        {sortedBookings.length} booking{sortedBookings.length !== 1 ? 's' : ''} found
      </div>

      {/* Bookings List */}
      {sortedBookings.length === 0 ? (
        <div className="py-16 text-center">
          <Calendar size={40} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500">
            {bookings.length === 0 ? 'No bookings found' : 'No bookings match your filters'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {sortedBookings.map((booking, index) => {
            const roomImage = getRoomImage(booking)

            return (
              <div
                key={booking.id || index}
                className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-md transition-shadow"
              >
                <div className="flex flex-col sm:flex-row">
                  {/* Room Image */}
                  <div className="sm:w-40 h-32 sm:h-auto flex-shrink-0">
                    {roomImage ? (
                      <img
                        src={roomImage}
                        alt={booking.room_name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                        <BedDouble className="w-8 h-8 text-gray-300" />
                      </div>
                    )}
                  </div>

                  {/* Booking Details */}
                  <div className="flex-1 p-4">
                    <div className="flex flex-col h-full">
                      {/* Top: Room name and status */}
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <h3 className="font-semibold text-gray-900 text-base leading-tight">
                          {booking.room_name || 'Unnamed Room'}
                        </h3>
                        <span className={`px-2 py-0.5 text-xs font-medium rounded-full border shrink-0 ${statusColors[booking.status] || 'bg-gray-100 text-gray-700 border-gray-200'}`}>
                          {statusLabels[booking.status] || booking.status}
                        </span>
                      </div>

                      {/* Middle: Dates and summary */}
                      <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600 mb-3">
                        <div className="flex items-center gap-1.5">
                          <Calendar size={14} className="text-gray-400" />
                          <span>{formatDate(booking.check_in)} - {formatDate(booking.check_out)}</span>
                        </div>
                        <span className="text-gray-300">|</span>
                        <span>{formatDateRange(booking.check_in, booking.check_out)}</span>
                      </div>

                      {/* Review if exists */}
                      {booking.reviews && booking.reviews.length > 0 && (
                        <div className="flex items-center gap-2 mb-3">
                          {renderStars(booking.reviews[0].rating)}
                          {booking.reviews[0].title && (
                            <span className="text-sm text-gray-600 truncate">- {booking.reviews[0].title}</span>
                          )}
                        </div>
                      )}

                      {/* Bottom: Price, payment status, and actions */}
                      <div className="flex items-center justify-between mt-auto pt-3 border-t border-gray-100">
                        <div className="flex items-center gap-3">
                          <span className="text-base font-semibold text-gray-900">
                            {formatCurrency(booking.total_amount, booking.currency)}
                          </span>
                          {booking.payment_status && (
                            <span className={`px-2 py-0.5 text-xs font-medium rounded ${paymentStatusColors[booking.payment_status] || 'bg-gray-50 text-gray-600'}`}>
                              {paymentStatusLabels[booking.payment_status] || booking.payment_status}
                            </span>
                          )}
                        </div>

                        {booking.id && (
                          <button
                            onClick={() => navigate(`/dashboard/bookings/${booking.id}`)}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-accent-600 text-white text-sm font-medium rounded-lg hover:bg-accent-700 transition-colors"
                          >
                            <Eye size={14} />
                            View
                          </button>
                        )}
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
  )
}

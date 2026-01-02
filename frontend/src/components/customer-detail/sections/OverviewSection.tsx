import { Calendar, Star, MessageSquare, DollarSign, ExternalLink, TrendingUp } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

interface Booking {
  id?: string
  room_name?: string
  check_in: string
  check_out: string
  status: 'pending' | 'confirmed' | 'checked_in' | 'checked_out' | 'cancelled' | 'completed' | 'occupied' | string
  total_amount: number
  currency: string
}

interface Review {
  id: string
  rating: number
  title?: string
  content?: string
  room_name: string
  created_at: string
}

interface SupportTicket {
  id: string
  subject: string
  status: string
  created_at: string
}

interface CustomerStats {
  totalBookings: number
  totalSpent: number
  currency: string
  averageRating: number | null
  totalReviews: number
  firstStay: string
}

interface OverviewSectionProps {
  stats: CustomerStats
  recentBookings: Booking[]
  recentReviews: Review[]
  recentTickets: SupportTicket[]
  onNavigateToSection: (sectionId: string) => void
}

const statusColors: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700',
  confirmed: 'bg-accent-100 text-accent-700',
  checked_in: 'bg-blue-100 text-blue-700',
  checked_out: 'bg-purple-100 text-purple-700',
  cancelled: 'bg-red-100 text-red-700',
  completed: 'bg-gray-100 text-gray-700',
}

const ticketStatusColors: Record<string, string> = {
  new: 'bg-blue-100 text-blue-700',
  open: 'bg-amber-100 text-amber-700',
  pending: 'bg-orange-100 text-orange-700',
  resolved: 'bg-accent-100 text-accent-700',
  closed: 'bg-gray-100 text-gray-700',
}

export default function OverviewSection({
  stats,
  recentBookings,
  recentReviews,
  recentTickets,
  onNavigateToSection
}: OverviewSectionProps) {
  const navigate = useNavigate()

  const formatDate = (dateString: string) => {
    if (!dateString) return '-'
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    })
  }

  const formatCurrency = (amount: number, currency: string = 'ZAR') => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: currency,
      maximumFractionDigits: 0
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

  // Get up to 3 most recent items
  const displayBookings = recentBookings.slice(0, 3)
  const displayReviews = recentReviews.slice(0, 2)
  const displayTickets = recentTickets.slice(0, 2)

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 bg-blue-50 rounded-xl">
          <div className="flex items-center gap-2 mb-1">
            <Calendar size={16} className="text-blue-600" />
            <span className="text-xs font-medium text-blue-600">Bookings</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{stats.totalBookings}</p>
        </div>
        <div className="p-4 bg-accent-50 rounded-xl">
          <div className="flex items-center gap-2 mb-1">
            <DollarSign size={16} className="text-accent-600" />
            <span className="text-xs font-medium text-accent-600">Lifetime Value</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {formatCurrency(stats.totalSpent, stats.currency)}
          </p>
        </div>
        <div className="p-4 bg-amber-50 rounded-xl">
          <div className="flex items-center gap-2 mb-1">
            <Star size={16} className="text-amber-600" />
            <span className="text-xs font-medium text-amber-600">Avg Rating</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {stats.averageRating ? stats.averageRating.toFixed(1) : '-'}
          </p>
        </div>
        <div className="p-4 bg-purple-50 rounded-xl">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp size={16} className="text-purple-600" />
            <span className="text-xs font-medium text-purple-600">Reviews</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{stats.totalReviews || 0}</p>
        </div>
      </div>

      {/* Recent Bookings */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-900">Recent Bookings</h3>
          {recentBookings.length > 3 && (
            <button
              onClick={() => onNavigateToSection('bookings')}
              className="text-xs font-medium text-accent-600 hover:text-accent-700"
            >
              View all ({recentBookings.length})
            </button>
          )}
        </div>
        {displayBookings.length === 0 ? (
          <div className="py-8 text-center bg-gray-50 rounded-lg">
            <Calendar size={24} className="mx-auto text-gray-300 mb-2" />
            <p className="text-sm text-gray-500">No bookings yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {displayBookings.map((booking, index) => (
              <div
                key={booking.id || index}
                onClick={() => booking.id && navigate(`/dashboard/bookings/${booking.id}`)}
                className={`flex items-center justify-between p-3 bg-gray-50 rounded-lg ${booking.id ? 'hover:bg-gray-100 cursor-pointer' : ''} transition-colors group`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{booking.room_name || 'Unnamed Room'}</p>
                    <p className="text-xs text-gray-500">
                      {formatDate(booking.check_in)} - {formatDate(booking.check_out)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${statusColors[booking.status]}`}>
                    {booking.status.replace('_', ' ')}
                  </span>
                  <ExternalLink size={14} className="text-gray-300 group-hover:text-gray-500 transition-colors" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent Reviews */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-900">Recent Reviews</h3>
          {recentReviews.length > 2 && (
            <button
              onClick={() => onNavigateToSection('reviews')}
              className="text-xs font-medium text-accent-600 hover:text-accent-700"
            >
              View all ({recentReviews.length})
            </button>
          )}
        </div>
        {displayReviews.length === 0 ? (
          <div className="py-8 text-center bg-gray-50 rounded-lg">
            <Star size={24} className="mx-auto text-gray-300 mb-2" />
            <p className="text-sm text-gray-500">No reviews yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {displayReviews.map((review) => (
              <div
                key={review.id}
                className="p-3 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center gap-2 mb-1">
                  {renderStars(review.rating)}
                  <span className="text-xs text-gray-400">{formatDate(review.created_at)}</span>
                </div>
                <p className="text-sm text-gray-600 truncate">
                  {review.title || review.content || 'No comment'}
                </p>
                <p className="text-xs text-gray-400 mt-1">{review.room_name}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent Support Tickets */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-900">Support History</h3>
          {recentTickets.length > 2 && (
            <button
              onClick={() => onNavigateToSection('support')}
              className="text-xs font-medium text-accent-600 hover:text-accent-700"
            >
              View all ({recentTickets.length})
            </button>
          )}
        </div>
        {displayTickets.length === 0 ? (
          <div className="py-8 text-center bg-gray-50 rounded-lg">
            <MessageSquare size={24} className="mx-auto text-gray-300 mb-2" />
            <p className="text-sm text-gray-500">No support tickets</p>
          </div>
        ) : (
          <div className="space-y-2">
            {displayTickets.map((ticket) => (
              <div
                key={ticket.id}
                onClick={() => navigate(`/dashboard/support/${ticket.id}`)}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer group"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{ticket.subject}</p>
                  <p className="text-xs text-gray-500">{formatDate(ticket.created_at)}</p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${ticketStatusColors[ticket.status]}`}>
                    {ticket.status}
                  </span>
                  <ExternalLink size={14} className="text-gray-300 group-hover:text-gray-500 transition-colors" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

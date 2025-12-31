import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Mail, Phone, Calendar, DollarSign, Star, MessageSquare, ExternalLink, User, Clock } from 'lucide-react'
import Button from '../components/Button'
import Card from '../components/Card'
import { useNotification } from '../contexts/NotificationContext'
import { customersApi, CustomerDetail as CustomerDetailType, CustomerReview } from '../services/api'

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

const reviewStatusColors: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700',
  published: 'bg-accent-100 text-accent-700',
  hidden: 'bg-gray-100 text-gray-700',
}

export default function CustomerDetail() {
  const { email } = useParams<{ email: string }>()
  const navigate = useNavigate()
  const [customerData, setCustomerData] = useState<CustomerDetailType | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'bookings' | 'reviews' | 'support'>('bookings')
  const { showError } = useNotification()

  useEffect(() => {
    if (email) {
      loadCustomer()
    }
  }, [email])

  const loadCustomer = async () => {
    if (!email) return

    try {
      setLoading(true)
      const data = await customersApi.getByEmail(decodeURIComponent(email))
      setCustomerData(data)
    } catch (error) {
      console.error('Failed to load customer:', error)
      showError('Error', 'Failed to load customer details')
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return '-'
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const formatCurrency = (amount: number, currency: string = 'ZAR') => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: currency
    }).format(amount)
  }

  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            size={14}
            className={star <= rating ? 'text-amber-400 fill-amber-400' : 'text-gray-300'}
          />
        ))}
      </div>
    )
  }

  if (loading) {
    return (
      <div className="p-8 bg-gray-50 min-h-full">
        <div className="flex items-center justify-center h-64">
          <div className="flex items-center gap-3 text-gray-500">
            <div className="w-5 h-5 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
            Loading customer details...
          </div>
        </div>
      </div>
    )
  }

  if (!customerData) {
    return (
      <div className="p-8 bg-gray-50 min-h-full">
        <div className="flex flex-col items-center justify-center h-64">
          <User size={48} className="text-gray-300 mb-3" />
          <p className="text-gray-500">Customer not found</p>
        </div>
      </div>
    )
  }

  const { customer, stats, bookings, reviews, supportTickets } = customerData

  return (
    <div className="p-8 bg-gray-50 min-h-full">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => navigate('/dashboard/customers')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4 transition-colors"
        >
          <ArrowLeft size={18} />
          Back to Customers
        </button>

        <Card className="p-6">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 bg-gradient-to-br from-accent-400 to-accent-600 rounded-full flex items-center justify-center text-white text-2xl font-bold">
                {(customer.name || customer.email).charAt(0).toUpperCase()}
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 mb-1">
                  {customer.name || 'Unnamed Customer'}
                </h1>
                <div className="flex flex-wrap items-center gap-4 text-gray-600">
                  <span className="flex items-center gap-1.5">
                    <Mail size={15} className="text-gray-400" />
                    {customer.email}
                  </span>
                  {customer.phone && (
                    <span className="flex items-center gap-1.5">
                      <Phone size={15} className="text-gray-400" />
                      {customer.phone}
                    </span>
                  )}
                </div>
              </div>
            </div>
            {customer.hasPortalAccess && (
              <span className="px-3 py-1.5 text-sm font-medium rounded-full bg-accent-100 text-accent-700">
                Portal Active
              </span>
            )}
          </div>
        </Card>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-50 rounded-xl">
              <Calendar size={20} className="text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Bookings</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalBookings}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-accent-50 rounded-xl">
              <DollarSign size={20} className="text-accent-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Spent</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(stats.totalSpent, stats.currency)}
              </p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-50 rounded-xl">
              <Star size={20} className="text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Avg Rating</p>
              <p className="text-2xl font-bold text-gray-900">
                {stats.averageRating ? stats.averageRating.toFixed(1) : '-'}
              </p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-purple-50 rounded-xl">
              <MessageSquare size={20} className="text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Reviews</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalReviews || 0}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gray-100 rounded-xl">
              <Clock size={20} className="text-gray-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">First Stay</p>
              <p className="text-lg font-semibold text-gray-900">{formatDate(stats.firstStay)}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Tabs */}
      <Card className="overflow-hidden">
        <div className="border-b border-gray-200 px-6">
          <nav className="flex gap-8">
            <button
              onClick={() => setActiveTab('bookings')}
              className={`py-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'bookings'
                  ? 'border-accent-500 text-accent-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Bookings ({bookings.length})
            </button>
            <button
              onClick={() => setActiveTab('reviews')}
              className={`py-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'reviews'
                  ? 'border-accent-500 text-accent-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Reviews ({reviews?.length || 0})
            </button>
            <button
              onClick={() => setActiveTab('support')}
              className={`py-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'support'
                  ? 'border-accent-500 text-accent-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Support ({supportTickets.length})
            </button>
          </nav>
        </div>

        <div className="p-6">
          {/* Bookings Tab */}
          {activeTab === 'bookings' && (
            <div className="space-y-4">
              {bookings.length === 0 ? (
                <div className="py-12 text-center">
                  <Calendar size={40} className="mx-auto text-gray-300 mb-3" />
                  <p className="text-gray-500">No bookings found</p>
                </div>
              ) : (
                bookings.map((booking: any) => (
                  <div key={booking.id} className="p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold text-gray-900">{booking.room_name}</h3>
                          <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${statusColors[booking.status]}`}>
                            {booking.status}
                          </span>
                        </div>
                        <div className="flex items-center gap-6 text-sm text-gray-500">
                          <span className="flex items-center gap-1">
                            <Calendar size={14} />
                            {formatDate(booking.check_in)} → {formatDate(booking.check_out)}
                          </span>
                          <span className="font-medium text-gray-900">
                            {formatCurrency(booking.total_amount, booking.currency)}
                          </span>
                        </div>
                        {booking.reviews && booking.reviews.length > 0 && (
                          <div className="mt-3 p-3 bg-white rounded-lg border border-gray-200">
                            <div className="flex items-center gap-2 mb-1">
                              {renderStars(booking.reviews[0].rating)}
                              {booking.reviews[0].title && (
                                <span className="text-sm font-medium text-gray-700">- {booking.reviews[0].title}</span>
                              )}
                            </div>
                            {booking.reviews[0].content && (
                              <p className="text-sm text-gray-600 line-clamp-2">{booking.reviews[0].content}</p>
                            )}
                          </div>
                        )}
                      </div>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => navigate(`/dashboard/bookings/${booking.id}`)}
                      >
                        <ExternalLink size={14} className="mr-1" />
                        View
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Reviews Tab */}
          {activeTab === 'reviews' && (
            <div className="space-y-4">
              {!reviews || reviews.length === 0 ? (
                <div className="py-12 text-center">
                  <Star size={40} className="mx-auto text-gray-300 mb-3" />
                  <p className="text-gray-500">No reviews from this customer</p>
                </div>
              ) : (
                reviews.map((review: CustomerReview) => (
                  <div key={review.id} className="p-4 bg-gray-50 rounded-xl">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="flex items-center gap-3 mb-1">
                          {renderStars(review.rating)}
                          <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${reviewStatusColors[review.status] || 'bg-gray-100 text-gray-700'}`}>
                            {review.status}
                          </span>
                        </div>
                        <p className="text-sm text-gray-500">
                          {review.room_name} • {formatDate(review.check_in)} - {formatDate(review.check_out)}
                        </p>
                      </div>
                      <span className="text-xs text-gray-400">{formatDate(review.created_at)}</span>
                    </div>

                    {review.title && (
                      <h4 className="font-medium text-gray-900 mb-1">{review.title}</h4>
                    )}
                    {review.content && (
                      <p className="text-gray-600 mb-3">{review.content}</p>
                    )}

                    {review.owner_response && (
                      <div className="mt-3 p-3 bg-accent-50 rounded-lg border-l-4 border-accent-400">
                        <p className="text-xs font-medium text-accent-700 mb-1">Your Response</p>
                        <p className="text-sm text-gray-700">{review.owner_response}</p>
                      </div>
                    )}

                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => navigate(`/dashboard/bookings/${review.booking_id}`)}
                      >
                        <ExternalLink size={14} className="mr-1" />
                        View Booking
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Support Tab */}
          {activeTab === 'support' && (
            <div className="space-y-4">
              {supportTickets.length === 0 ? (
                <div className="py-12 text-center">
                  <MessageSquare size={40} className="mx-auto text-gray-300 mb-3" />
                  <p className="text-gray-500">No support tickets</p>
                </div>
              ) : (
                supportTickets.map((ticket: any) => (
                  <div key={ticket.id} className="p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <MessageSquare size={16} className="text-gray-400" />
                          <h3 className="font-semibold text-gray-900">{ticket.subject}</h3>
                          <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${ticketStatusColors[ticket.status]}`}>
                            {ticket.status}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 line-clamp-2 mb-2">{ticket.message}</p>
                        <p className="text-xs text-gray-400">{formatDate(ticket.created_at)}</p>
                      </div>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => navigate(`/dashboard/support/${ticket.id}`)}
                      >
                        <ExternalLink size={14} className="mr-1" />
                        View
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}

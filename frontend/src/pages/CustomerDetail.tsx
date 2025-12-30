import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Mail, Phone, Calendar, DollarSign, Star, MessageSquare, ExternalLink } from 'lucide-react'
import Button from '../components/Button'
import Card from '../components/Card'
import { useNotification } from '../contexts/NotificationContext'
import { customersApi, CustomerDetail as CustomerDetailType } from '../services/api'

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  confirmed: 'bg-green-100 text-green-700',
  checked_in: 'bg-blue-100 text-blue-700',
  checked_out: 'bg-purple-100 text-purple-700',
  cancelled: 'bg-red-100 text-red-700',
  completed: 'bg-gray-100 text-gray-700',
}

const ticketStatusColors: Record<string, string> = {
  new: 'bg-blue-100 text-blue-700',
  open: 'bg-yellow-100 text-yellow-700',
  pending: 'bg-orange-100 text-orange-700',
  resolved: 'bg-green-100 text-green-700',
  closed: 'bg-gray-100 text-gray-700',
}

export default function CustomerDetail() {
  const { email } = useParams<{ email: string }>()
  const navigate = useNavigate()
  const [customerData, setCustomerData] = useState<CustomerDetailType | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'bookings' | 'support'>('bookings')
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
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(amount)
  }

  if (loading) {
    return (
      <div className="p-8 bg-white min-h-full">
        <div className="flex items-center justify-center h-64">
          <p className="text-gray-500">Loading customer details...</p>
        </div>
      </div>
    )
  }

  if (!customerData) {
    return (
      <div className="p-8 bg-white min-h-full">
        <div className="flex items-center justify-center h-64">
          <p className="text-gray-500">Customer not found</p>
        </div>
      </div>
    )
  }

  const { customer, stats, bookings, supportTickets } = customerData

  return (
    <div className="p-8 bg-white min-h-full">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => navigate('/dashboard/customers')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft size={18} />
          Back to Customers
        </button>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {customer.name || 'Unnamed Customer'}
            </h1>
            <div className="flex items-center gap-4 text-gray-600">
              <span className="flex items-center gap-1">
                <Mail size={16} />
                {customer.email}
              </span>
              {customer.phone && (
                <span className="flex items-center gap-1">
                  <Phone size={16} />
                  {customer.phone}
                </span>
              )}
            </div>
          </div>
          {customer.hasPortalAccess && (
            <span className="px-3 py-1 text-sm font-medium rounded-full bg-green-100 text-green-700">
              Portal Active
            </span>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
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
            <div className="p-2 bg-green-100 rounded-lg">
              <DollarSign size={20} className="text-green-600" />
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
            <div className="p-2 bg-purple-100 rounded-lg">
              <Calendar size={20} className="text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">First Stay</p>
              <p className="text-lg font-semibold text-gray-900">{formatDate(stats.firstStay)}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 rounded-lg">
              <Star size={20} className="text-orange-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Avg Rating Given</p>
              <p className="text-2xl font-bold text-gray-900">
                {stats.averageRating ? stats.averageRating.toFixed(1) : '-'}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex gap-8">
          <button
            onClick={() => setActiveTab('bookings')}
            className={`pb-4 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'bookings'
                ? 'border-gray-900 text-gray-900'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Bookings ({bookings.length})
          </button>
          <button
            onClick={() => setActiveTab('support')}
            className={`pb-4 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'support'
                ? 'border-gray-900 text-gray-900'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Support Tickets ({supportTickets.length})
          </button>
        </nav>
      </div>

      {/* Bookings Tab */}
      {activeTab === 'bookings' && (
        <div className="space-y-4">
          {bookings.length === 0 ? (
            <Card className="p-8 text-center">
              <p className="text-gray-500">No bookings found</p>
            </Card>
          ) : (
            bookings.map((booking: any) => (
              <Card key={booking.id} className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-gray-900">{booking.room_name}</h3>
                      <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${statusColors[booking.status]}`}>
                        {booking.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-6 text-sm text-gray-500">
                      <span>
                        {formatDate(booking.check_in)} → {formatDate(booking.check_out)}
                      </span>
                      <span className="font-medium text-gray-900">
                        {formatCurrency(booking.total_amount, booking.currency)}
                      </span>
                    </div>
                    {booking.reviews && booking.reviews.length > 0 && (
                      <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-2 mb-1">
                          <Star size={14} className="text-yellow-500 fill-yellow-500" />
                          <span className="text-sm font-medium">{booking.reviews[0].rating}/5</span>
                          {booking.reviews[0].title && (
                            <span className="text-sm text-gray-600">- {booking.reviews[0].title}</span>
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
              </Card>
            ))
          )}
        </div>
      )}

      {/* Support Tab */}
      {activeTab === 'support' && (
        <div className="space-y-4">
          {supportTickets.length === 0 ? (
            <Card className="p-8 text-center">
              <p className="text-gray-500">No support tickets</p>
            </Card>
          ) : (
            supportTickets.map((ticket: any) => (
              <Card key={ticket.id} className="p-4">
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
              </Card>
            ))
          )}
        </div>
      )}
    </div>
  )
}

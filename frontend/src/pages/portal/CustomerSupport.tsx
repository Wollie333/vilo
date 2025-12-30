import { useState, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { MessageCircle, Plus, Building2 } from 'lucide-react'
import Button from '../../components/Button'
import { portalApi, SupportTicket, Property, CustomerBooking } from '../../services/portalApi'
import { useNotification } from '../../contexts/NotificationContext'

const statusColors: Record<string, string> = {
  new: 'bg-blue-100 text-blue-700',
  open: 'bg-yellow-100 text-yellow-700',
  pending: 'bg-orange-100 text-orange-700',
  resolved: 'bg-green-100 text-green-700',
  closed: 'bg-gray-100 text-gray-700',
}

export default function CustomerSupport() {
  const [searchParams] = useSearchParams()
  const { showSuccess, showError } = useNotification()
  const [tickets, setTickets] = useState<SupportTicket[]>([])
  const [properties, setProperties] = useState<Property[]>([])
  const [bookings, setBookings] = useState<CustomerBooking[]>([])
  const [loading, setLoading] = useState(true)
  const [showNewForm, setShowNewForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // Form state
  const [selectedProperty, setSelectedProperty] = useState(searchParams.get('tenant') || '')
  const [selectedBooking, setSelectedBooking] = useState(searchParams.get('booking') || '')
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    // Auto-open form if tenant param is provided
    if (searchParams.get('tenant')) {
      setShowNewForm(true)
    }
  }, [searchParams])

  const loadData = async () => {
    try {
      setLoading(true)
      const [ticketsData, propertiesData, bookingsData] = await Promise.all([
        portalApi.getTickets(),
        portalApi.getProperties(),
        portalApi.getBookings()
      ])
      setTickets(ticketsData)
      setProperties(propertiesData)
      setBookings(bookingsData)
    } catch (error) {
      console.error('Failed to load data:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedProperty || !subject || !message) {
      showError('Error', 'Please fill in all required fields')
      return
    }

    try {
      setSubmitting(true)
      await portalApi.createTicket({
        tenantId: selectedProperty,
        bookingId: selectedBooking || undefined,
        subject,
        message
      })
      showSuccess('Ticket Created', 'Your support request has been submitted')
      setShowNewForm(false)
      setSubject('')
      setMessage('')
      setSelectedBooking('')
      await loadData()
    } catch (error: any) {
      showError('Error', error.message || 'Failed to create ticket')
    } finally {
      setSubmitting(false)
    }
  }

  const propertyBookings = selectedProperty
    ? bookings.filter(b => b.tenants?.id === selectedProperty)
    : []

  if (loading) {
    return (
      <div className="p-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-gray-300 border-t-gray-900 rounded-full animate-spin mx-auto mb-4" />
            <p className="text-gray-500">Loading support tickets...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8 bg-white min-h-full">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Support</h1>
          <p className="text-gray-600">Get help with your bookings</p>
        </div>
        {!showNewForm && (
          <Button onClick={() => setShowNewForm(true)}>
            <Plus size={18} className="mr-2" />
            New Request
          </Button>
        )}
      </div>

      {/* New Ticket Form */}
      {showNewForm && (
        <div className="bg-white border border-gray-200 rounded-lg p-6 mb-8">
          <h2 className="font-semibold text-gray-900 mb-4">New Support Request</h2>
          <form onSubmit={handleSubmit}>
            {/* Property Selection */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Property *
              </label>
              <select
                value={selectedProperty}
                onChange={(e) => {
                  setSelectedProperty(e.target.value)
                  setSelectedBooking('')
                }}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-400"
                required
              >
                <option value="">Select a property</option>
                {properties.map((property) => (
                  <option key={property.id} value={property.id}>
                    {property.business_name}
                  </option>
                ))}
              </select>
            </div>

            {/* Related Booking (Optional) */}
            {selectedProperty && propertyBookings.length > 0 && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Related Booking (optional)
                </label>
                <select
                  value={selectedBooking}
                  onChange={(e) => setSelectedBooking(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-400"
                >
                  <option value="">No specific booking</option>
                  {propertyBookings.map((booking) => (
                    <option key={booking.id} value={booking.id}>
                      {booking.room_name} - {formatDate(booking.check_in)}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Subject */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Subject *
              </label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Brief description of your request"
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-400"
                required
              />
            </div>

            {/* Message */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Message *
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Provide details about your request..."
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-400"
                required
              />
            </div>

            <div className="flex gap-3">
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Submitting...' : 'Submit Request'}
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setShowNewForm(false)
                  setSubject('')
                  setMessage('')
                  setSelectedBooking('')
                  if (!searchParams.get('tenant')) {
                    setSelectedProperty('')
                  }
                }}
              >
                Cancel
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Tickets List */}
      {tickets.length === 0 && !showNewForm ? (
        <div className="bg-gray-50 rounded-lg p-8 text-center">
          <MessageCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No support tickets</h3>
          <p className="text-gray-500 mb-4">
            You haven't submitted any support requests yet.
          </p>
          <Button onClick={() => setShowNewForm(true)}>
            <Plus size={18} className="mr-2" />
            Create Support Request
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {tickets.map((ticket) => (
            <Link
              key={ticket.id}
              to={`/portal/support/${ticket.id}`}
              className="block bg-white border border-gray-200 rounded-lg p-4 hover:border-gray-300 hover:shadow-sm transition-all"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-semibold text-gray-900">{ticket.subject}</h3>
                    <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${statusColors[ticket.status]}`}>
                      {ticket.status}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 line-clamp-2 mb-2">{ticket.message}</p>
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <Building2 size={12} />
                      {ticket.tenants?.business_name}
                    </span>
                    <span>Created {formatDate(ticket.created_at)}</span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

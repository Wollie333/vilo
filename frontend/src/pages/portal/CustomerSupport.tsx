import { useState, useEffect, useRef } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { MessageCircle, Plus, Building2, Sparkles, Clock, CheckCircle2, AlertCircle, ChevronRight, Send, X, HelpCircle } from 'lucide-react'
import TermsAcceptance from '../../components/TermsAcceptance'
import { portalApi, SupportTicket, Property, CustomerBooking } from '../../services/portalApi'
import { useNotification } from '../../contexts/NotificationContext'

const statusConfig: Record<string, { bg: string; text: string; icon: React.ReactNode; label: string }> = {
  new: { bg: 'bg-blue-50', text: 'text-blue-700', icon: <AlertCircle className="w-3.5 h-3.5" />, label: 'New' },
  open: { bg: 'bg-amber-50', text: 'text-amber-700', icon: <Clock className="w-3.5 h-3.5" />, label: 'In Progress' },
  pending: { bg: 'bg-orange-50', text: 'text-orange-700', icon: <Clock className="w-3.5 h-3.5" />, label: 'Pending' },
  resolved: { bg: 'bg-emerald-50', text: 'text-emerald-700', icon: <CheckCircle2 className="w-3.5 h-3.5" />, label: 'Resolved' },
  closed: { bg: 'bg-gray-100', text: 'text-gray-600', icon: <CheckCircle2 className="w-3.5 h-3.5" />, label: 'Closed' },
}

// Parse structured messages like coupon claims into a cleaner format
const parseMessagePreview = (message: string, subject: string) => {
  // Check if this is a coupon claim request
  if (subject.toLowerCase().includes('coupon claim') && message.includes('Coupon Details:')) {
    // Extract key info
    const codeMatch = message.match(/Code:\s*([^\s-]+)/)
    const discountMatch = message.match(/Discount:\s*([^-]+)/)
    const nameMatch = message.match(/Contact Information:[\s\S]*?Name:\s*([^-]+)/)

    const code = codeMatch?.[1]?.trim()
    const discount = discountMatch?.[1]?.trim()
    const customerName = nameMatch?.[1]?.trim()

    return {
      type: 'coupon_claim',
      code,
      discount,
      customerName
    }
  }

  return { type: 'text', message }
}

// Component to render formatted message preview
const MessagePreview = ({ message, subject }: { message: string; subject: string }) => {
  const parsed = parseMessagePreview(message, subject)

  if (parsed.type === 'coupon_claim') {
    return (
      <div className="flex flex-wrap items-center gap-2 text-sm">
        {parsed.code && (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-md font-medium text-xs">
            <span className="text-emerald-500">Code:</span> {parsed.code}
          </span>
        )}
        {parsed.discount && (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-amber-50 text-amber-700 rounded-md text-xs">
            {parsed.discount}
          </span>
        )}
        {parsed.customerName && (
          <span className="text-gray-500 text-xs">
            from {parsed.customerName}
          </span>
        )}
      </div>
    )
  }

  return (
    <p className="text-sm text-gray-600 line-clamp-2">{message}</p>
  )
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
  const [termsAccepted, setTermsAccepted] = useState(false)

  // Welcome banner state
  const [showWelcome, setShowWelcome] = useState(false)
  const [welcomeBusinessName, setWelcomeBusinessName] = useState('')
  const welcomeShownRef = useRef(false)

  useEffect(() => {
    loadData()
  }, [])

  // Show welcome notification for new users from coupon claim
  useEffect(() => {
    if (searchParams.get('welcome') === 'true' && !welcomeShownRef.current) {
      welcomeShownRef.current = true
      const businessName = searchParams.get('business') || 'the property'
      setWelcomeBusinessName(decodeURIComponent(businessName))
      setShowWelcome(true)

      // Auto-dismiss after 8 seconds
      const timer = setTimeout(() => {
        setShowWelcome(false)
      }, 8000)

      return () => clearTimeout(timer)
    }
  }, [searchParams])

  useEffect(() => {
    // Auto-open form if tenant param is provided
    if (searchParams.get('tenant')) {
      setShowNewForm(true)
    }
  }, [searchParams])

  // Auto-populate booking context when coming from booking details page
  useEffect(() => {
    const bookingId = searchParams.get('booking')
    if (bookingId && bookings.length > 0 && !message) {
      const booking = bookings.find(b => b.id === bookingId)
      if (booking) {
        // Set a helpful subject if not already set
        if (!subject) {
          setSubject(`Question about my booking - ${booking.room_name}`)
        }
        // Prepend booking context to message
        const checkIn = new Date(booking.check_in).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })
        const checkOut = new Date(booking.check_out).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })
        const bookingContext = `Booking Reference: ${booking.id.slice(0, 8).toUpperCase()}\nRoom: ${booking.room_name}\nDates: ${checkIn} - ${checkOut}\n\n`
        setMessage(bookingContext)
      }
    }
  }, [searchParams, bookings])

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
      setTermsAccepted(false)
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
      <div className="p-6 lg:p-8 bg-gray-50 min-h-full">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="w-10 h-10 border-2 border-emerald-200 border-t-emerald-600 rounded-full animate-spin mx-auto mb-4" />
            <p className="text-gray-500">Loading support tickets...</p>
          </div>
        </div>
      </div>
    )
  }

  const getStatusConfig = (status: string) => statusConfig[status] || statusConfig.new

  return (
    <div className="p-6 lg:p-8 bg-gray-50 min-h-full">
      <div className="max-w-4xl mx-auto">
        {/* Welcome Banner */}
        {showWelcome && (
          <div className="mb-6 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-xl p-4 text-white shadow-lg">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-white/20 rounded-lg">
                <Sparkles className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-lg">Welcome to Your Customer Portal!</h3>
                <p className="text-white/90 mt-1">
                  You can chat directly with {welcomeBusinessName} here. Start a new support request below to send them a message.
                </p>
              </div>
              <button
                onClick={() => setShowWelcome(false)}
                className="p-1 hover:bg-white/20 rounded transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Support</h1>
            <p className="text-gray-500 mt-1">Get help with your bookings and inquiries</p>
          </div>
          {!showNewForm && tickets.length > 0 && (
            <button
              onClick={() => setShowNewForm(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors font-medium text-sm"
            >
              <Plus size={18} />
              New Request
            </button>
          )}
        </div>

        {/* New Ticket Form */}
        {showNewForm && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden mb-8">
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-100 rounded-lg">
                  <Send className="w-4 h-4 text-emerald-600" />
                </div>
                <div>
                  <h2 className="font-semibold text-gray-900">New Support Request</h2>
                  <p className="text-sm text-gray-500">We'll get back to you as soon as possible</p>
                </div>
              </div>
            </div>
            <form onSubmit={handleSubmit} className="p-6">
              <div className="grid gap-5">
                {/* Property Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Property <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={selectedProperty}
                    onChange={(e) => {
                      setSelectedProperty(e.target.value)
                      setSelectedBooking('')
                    }}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-colors bg-white"
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
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Related Booking <span className="text-gray-400">(optional)</span>
                    </label>
                    <select
                      value={selectedBooking}
                      onChange={(e) => setSelectedBooking(e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-colors bg-white"
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
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Subject <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="Brief description of your request"
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-colors"
                    required
                  />
                </div>

                {/* Message */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Message <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Provide details about your request..."
                    rows={4}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-colors resize-none"
                    required
                  />
                </div>

                {/* Terms Acceptance */}
                <div className="pt-2">
                  <TermsAcceptance
                    accepted={termsAccepted}
                    onChange={setTermsAccepted}
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 mt-6 pt-6 border-t border-gray-100">
                <button
                  type="submit"
                  disabled={submitting || !termsAccepted}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send size={16} />
                  {submitting ? 'Submitting...' : 'Submit Request'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowNewForm(false)
                    setSubject('')
                    setMessage('')
                    setSelectedBooking('')
                    if (!searchParams.get('tenant')) {
                      setSelectedProperty('')
                    }
                  }}
                  className="px-5 py-2.5 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors font-medium text-sm"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Empty State */}
        {tickets.length === 0 && !showNewForm ? (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-12 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-5">
              <HelpCircle className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No support requests yet</h3>
            <p className="text-gray-500 mb-6 max-w-sm mx-auto">
              Have a question or need help with a booking? We're here to assist you.
            </p>
            <button
              onClick={() => setShowNewForm(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors font-medium text-sm"
            >
              <Plus size={18} />
              Create Support Request
            </button>
          </div>
        ) : tickets.length > 0 && (
          <div className="space-y-3">
            {tickets.map((ticket) => {
              const status = getStatusConfig(ticket.status)
              return (
                <Link
                  key={ticket.id}
                  to={`/portal/support/${ticket.id}`}
                  className="block bg-white rounded-xl border border-gray-200 hover:border-gray-300 hover:shadow-md transition-all duration-200 group"
                >
                  <div className="p-5">
                    <div className="flex items-start gap-4">
                      {/* Status Icon */}
                      <div className={`p-2.5 rounded-lg ${status.bg} flex-shrink-0`}>
                        <MessageCircle className={`w-5 h-5 ${status.text}`} />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-4 mb-2">
                          <h3 className="font-semibold text-gray-900 group-hover:text-emerald-600 transition-colors">
                            {ticket.subject}
                          </h3>
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full ${status.bg} ${status.text} flex-shrink-0`}>
                            {status.icon}
                            {status.label}
                          </span>
                        </div>
                        <div className="mb-3">
                          <MessagePreview message={ticket.message} subject={ticket.subject} />
                        </div>
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <span className="inline-flex items-center gap-1.5">
                            <Building2 size={14} className="text-gray-400" />
                            {ticket.tenants?.business_name}
                          </span>
                          <span className="inline-flex items-center gap-1.5">
                            <Clock size={14} className="text-gray-400" />
                            {formatDate(ticket.created_at)}
                          </span>
                        </div>
                      </div>

                      {/* Arrow */}
                      <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-gray-400 group-hover:translate-x-0.5 transition-all flex-shrink-0 mt-1" />
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { X, HelpCircle, Loader2, Send, CheckCircle, ArrowRight, Calendar, CreditCard, Building2, User, AlertCircle, MessageSquare } from 'lucide-react'
import { createPortal } from 'react-dom'
import { useAuth } from '../contexts/AuthContext'
import { useCustomerAuth } from '../contexts/CustomerAuthContext'
import { portalApi } from '../services/portalApi'
import PhoneInput from './PhoneInput'

interface SupportModalProps {
  isOpen: boolean
  onClose: () => void
  context: 'dashboard' | 'portal'
}

interface IssueCategory {
  value: string
  label: string
  icon: React.ElementType
}

const issueCategories: IssueCategory[] = [
  { value: 'booking', label: 'Booking Issue', icon: Calendar },
  { value: 'payment', label: 'Payment & Billing', icon: CreditCard },
  { value: 'property', label: 'Property Question', icon: Building2 },
  { value: 'account', label: 'Account Help', icon: User },
  { value: 'technical', label: 'Technical Issue', icon: AlertCircle },
  { value: 'other', label: 'Other', icon: MessageSquare },
]

interface Property {
  id: string
  business_name: string
}

interface Booking {
  id: string
  room_name: string
  check_in: string
  tenants: {
    id: string
    business_name: string
  }
}

export default function SupportModal({ isOpen, onClose, context }: SupportModalProps) {
  const navigate = useNavigate()

  // Auth contexts
  const dashboardAuth = useAuth()
  const portalAuth = useCustomerAuth()

  // Form state
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [category, setCategory] = useState('')
  const [message, setMessage] = useState('')

  // Portal-specific state
  const [selectedPropertyId, setSelectedPropertyId] = useState('')
  const [selectedBookingId, setSelectedBookingId] = useState('')
  const [properties, setProperties] = useState<Property[]>([])
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loadingData, setLoadingData] = useState(false)

  // UI state
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [ticketId, setTicketId] = useState<string | null>(null)
  const [redirecting, setRedirecting] = useState(false)

  // Pre-fill form when modal opens
  useEffect(() => {
    if (!isOpen) return

    if (context === 'dashboard') {
      const { user, tenant } = dashboardAuth
      const firstName = user?.user_metadata?.first_name || ''
      const lastName = user?.user_metadata?.last_name || ''
      setName(`${firstName} ${lastName}`.trim())
      setEmail(user?.email || '')
      setPhone(tenant?.business_phone || '')

      // For dashboard, use current tenant
      if (tenant?.id) {
        setSelectedPropertyId(tenant.id)
      }
    } else {
      const { customer } = portalAuth
      setName(customer?.name || '')
      setEmail(customer?.email || '')
      setPhone(customer?.phone || '')

      // Load properties and bookings for portal users
      loadPortalData()
    }
  }, [isOpen, context])

  const loadPortalData = async () => {
    try {
      setLoadingData(true)

      // Get customer's bookings which include property info
      const bookingsData = await portalApi.getBookings()
      setBookings(bookingsData)

      // Extract unique properties from bookings
      const uniqueProperties = new Map<string, Property>()
      bookingsData.forEach((booking: Booking) => {
        if (booking.tenants && !uniqueProperties.has(booking.tenants.id)) {
          uniqueProperties.set(booking.tenants.id, {
            id: booking.tenants.id,
            business_name: booking.tenants.business_name
          })
        }
      })
      setProperties(Array.from(uniqueProperties.values()))
    } catch (err) {
      console.error('Failed to load portal data:', err)
    } finally {
      setLoadingData(false)
    }
  }

  // Filter bookings by selected property
  const propertyBookings = useMemo(() => {
    if (!selectedPropertyId) return []
    return bookings.filter(b => b.tenants?.id === selectedPropertyId)
  }, [selectedPropertyId, bookings])

  // Form validation
  const isValid = useMemo(() => {
    const baseValid = name.trim() && email.trim() && category && message.trim()
    if (context === 'portal') {
      return baseValid && selectedPropertyId
    }
    return baseValid && selectedPropertyId
  }, [name, email, category, message, context, selectedPropertyId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!name.trim()) {
      setError('Please enter your name')
      return
    }
    if (!email.trim()) {
      setError('Please enter your email')
      return
    }
    if (!category) {
      setError('Please select an issue category')
      return
    }
    if (!message.trim()) {
      setError('Please describe your issue')
      return
    }
    if (!selectedPropertyId) {
      setError('Please select a property')
      return
    }

    try {
      setSubmitting(true)

      // Format subject with category
      const categoryLabel = issueCategories.find(c => c.value === category)?.label || category
      const subject = `${categoryLabel}: Support Request`

      // Format message with contact info (matches SystemMessageCard parsing)
      const formattedMessage = [
        'Contact Information:',
        `- Name: ${name}`,
        `- Email: ${email}`,
        `- Phone: ${phone || 'Not provided'}`,
        '',
        `Issue Category: ${categoryLabel}`,
        '',
        'Message:',
        message
      ].join('\n')

      const result = await portalApi.createTicket({
        tenantId: selectedPropertyId,
        bookingId: selectedBookingId || undefined,
        subject,
        message: formattedMessage
      })

      setTicketId(result.ticket.id)
      setSubmitted(true)
    } catch (err: any) {
      setError(err.message || 'Failed to submit support request')
    } finally {
      setSubmitting(false)
    }
  }

  const handleClose = () => {
    setName('')
    setEmail('')
    setPhone('')
    setCategory('')
    setMessage('')
    setSelectedPropertyId('')
    setSelectedBookingId('')
    setSubmitted(false)
    setError(null)
    setTicketId(null)
    onClose()
  }

  const handleGoToChat = async () => {
    if (!ticketId) return

    setRedirecting(true)
    try {
      navigate(`/portal/support/${ticketId}`)
      handleClose()
    } catch (err) {
      console.error('Navigation failed:', err)
      setRedirecting(false)
    }
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-ZA', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    })
  }

  if (!isOpen) return null

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-accent-600 to-accent-500 text-white p-5 rounded-t-2xl z-10">
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 p-1.5 hover:bg-white/20 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-white/20 flex items-center justify-center">
              <HelpCircle className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Get Support</h2>
              <p className="text-sm text-white/80">We're here to help you</p>
            </div>
          </div>
        </div>

        {submitted ? (
          /* Success State */
          <div className="p-6 text-center">
            <div className="w-16 h-16 bg-accent-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-accent-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Request Submitted!</h3>
            <p className="text-gray-600 mb-6">
              Your support request has been received. Our team will get back to you shortly.
            </p>

            {ticketId && (
              <div className="bg-gray-50 rounded-xl p-4 mb-4">
                <p className="text-sm text-gray-600 mb-3">
                  Continue the conversation in your support chat
                </p>
                <button
                  onClick={handleGoToChat}
                  disabled={redirecting}
                  className="w-full px-6 py-3 bg-accent-600 text-white rounded-lg font-medium hover:bg-accent-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {redirecting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Opening Chat...
                    </>
                  ) : (
                    <>
                      Go to Chat
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            )}

            <button
              onClick={handleClose}
              className="px-6 py-2.5 text-gray-600 hover:text-gray-800 font-medium transition-colors"
            >
              Close
            </button>
          </div>
        ) : (
          /* Form */
          <form onSubmit={handleSubmit} className="p-6">
            {/* Intro Text */}
            <p className="text-sm text-gray-600 mb-5">
              Fill out the form below and we'll get back to you as soon as possible.
            </p>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-start gap-2">
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                {error}
              </div>
            )}

            <div className="space-y-4">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your full name"
                  className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent transition-shadow"
                  required
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Email Address <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email address"
                  className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent transition-shadow"
                  required
                />
              </div>

              {/* Phone */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Phone Number
                </label>
                <PhoneInput
                  value={phone}
                  onChange={setPhone}
                  placeholder="Phone number"
                />
              </div>

              {/* Issue Category */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Issue Category <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {issueCategories.map((cat) => {
                    const Icon = cat.icon
                    const isSelected = category === cat.value
                    return (
                      <button
                        key={cat.value}
                        type="button"
                        onClick={() => setCategory(cat.value)}
                        className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border text-sm font-medium transition-all ${
                          isSelected
                            ? 'border-accent-500 bg-accent-50 text-accent-700'
                            : 'border-gray-200 hover:border-gray-300 text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        <Icon className={`w-4 h-4 ${isSelected ? 'text-accent-600' : 'text-gray-400'}`} />
                        <span className="truncate">{cat.label}</span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Property Selection */}
              {context === 'portal' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Property <span className="text-red-500">*</span>
                  </label>
                  {loadingData ? (
                    <div className="flex items-center gap-2 text-sm text-gray-500 py-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Loading properties...
                    </div>
                  ) : properties.length === 0 ? (
                    <p className="text-sm text-gray-500 py-2">
                      No properties found. Please make a booking first.
                    </p>
                  ) : (
                    <select
                      value={selectedPropertyId}
                      onChange={(e) => {
                        setSelectedPropertyId(e.target.value)
                        setSelectedBookingId('')
                      }}
                      className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent transition-shadow bg-white"
                      required
                    >
                      <option value="">Select a property</option>
                      {properties.map((prop) => (
                        <option key={prop.id} value={prop.id}>
                          {prop.business_name}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              )}

              {/* Dashboard: Show current tenant */}
              {context === 'dashboard' && dashboardAuth.tenant && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Property
                  </label>
                  <div className="px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-gray-700 text-sm">
                    {dashboardAuth.tenant.business_name}
                  </div>
                </div>
              )}

              {/* Related Booking (Optional) */}
              {context === 'portal' && propertyBookings.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Related Booking <span className="text-gray-400 font-normal">(optional)</span>
                  </label>
                  <select
                    value={selectedBookingId}
                    onChange={(e) => setSelectedBookingId(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent transition-shadow bg-white"
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

              {/* Message */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  How can we help? <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Please describe your issue or question in detail..."
                  rows={4}
                  className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent resize-none transition-shadow"
                  required
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={submitting || !isValid}
              className="w-full mt-6 px-6 py-3 bg-gray-900 hover:bg-gray-800 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Send className="w-5 h-5" />
                  Submit Request
                </>
              )}
            </button>

            <p className="text-xs text-gray-500 text-center mt-3">
              We typically respond within a few hours.
            </p>
          </form>
        )}
      </div>
    </div>,
    document.body
  )
}

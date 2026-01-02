import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { X, MessageCircle, Loader2, CheckCircle, Calendar, ArrowRight, Users } from 'lucide-react'
import { createPortal } from 'react-dom'
import { discoveryApi, ContactHostRequest } from '../../services/discoveryApi'
import { useCustomerAuth } from '../../contexts/CustomerAuthContext'
import PhoneInput from '../PhoneInput'

interface ContactHostModalProps {
  isOpen: boolean
  onClose: () => void
  propertySlug: string
  propertyName: string
  propertyLogo?: string
}

export default function ContactHostModal({
  isOpen,
  onClose,
  propertySlug,
  propertyName,
  propertyLogo: _propertyLogo
}: ContactHostModalProps) {
  const navigate = useNavigate()
  const { customer, isAuthenticated, loginWithToken } = useCustomerAuth()
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    check_in: '',
    check_out: '',
    guests: '',
    message: ''
  })

  // Pre-populate form with customer data when modal opens and customer is logged in
  useEffect(() => {
    if (isOpen && isAuthenticated && customer) {
      setFormData(prev => ({
        ...prev,
        name: prev.name || customer.name || '',
        email: prev.email || customer.email || '',
        phone: prev.phone || customer.phone || ''
      }))
    }
  }, [isOpen, isAuthenticated, customer])
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [tenantInfo, setTenantInfo] = useState<{ id: string; name: string } | null>(null)
  const [customerToken, setCustomerTokenState] = useState<string | null>(null)
  const [ticketId, setTicketId] = useState<string | null>(null)
  const [redirecting, setRedirecting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // Validation
    if (!formData.name.trim()) {
      setError('Please enter your name')
      return
    }
    if (!formData.email.trim()) {
      setError('Please enter your email')
      return
    }
    if (!formData.phone.trim()) {
      setError('Please enter your phone number')
      return
    }
    if (!formData.message.trim()) {
      setError('Please enter a message')
      return
    }

    try {
      setSubmitting(true)
      const requestData: ContactHostRequest = {
        name: formData.name.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        message: formData.message.trim(),
        check_in: formData.check_in || undefined,
        check_out: formData.check_out || undefined,
        guests: formData.guests ? parseInt(formData.guests) : undefined
      }

      const result = await discoveryApi.contactHost(propertySlug, requestData)

      // Store customer token for portal access
      if (result.customer_token) {
        setCustomerTokenState(result.customer_token)
      }

      // Store tenant info for redirect
      if (result.tenant_id && result.tenant_name) {
        setTenantInfo({ id: result.tenant_id, name: result.tenant_name })
      }

      // Store ticket ID for direct chat navigation
      if (result.ticket_id) {
        setTicketId(result.ticket_id)
      }

      setSubmitted(true)
    } catch (err: any) {
      setError(err.message || 'Failed to submit inquiry')
    } finally {
      setSubmitting(false)
    }
  }

  const handleClose = () => {
    setFormData({ name: '', email: '', phone: '', check_in: '', check_out: '', guests: '', message: '' })
    setSubmitted(false)
    setError(null)
    onClose()
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
        <div className="sticky top-0 bg-gradient-to-r from-accent-600 to-accent-500 text-white p-4 rounded-t-2xl">
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 p-1 hover:bg-white/20 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
              <MessageCircle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Message Host</h2>
              <p className="text-sm text-white/80">{propertyName}</p>
            </div>
          </div>
        </div>

        {submitted ? (
          /* Success State */
          <div className="p-6 text-center">
            <div className="w-16 h-16 bg-accent-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-accent-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Message Sent!</h3>
            <p className="text-gray-600 mb-4">
              Your inquiry has been sent to {propertyName}. They will get back to you soon.
            </p>

            {/* Portal redirect button */}
            {tenantInfo && customerToken && ticketId && (
              <div className="bg-gray-50 rounded-xl p-4 mb-4">
                <p className="text-sm text-gray-600 mb-3">
                  Continue the conversation in your customer portal
                </p>
                <button
                  onClick={async () => {
                    setRedirecting(true)
                    try {
                      // Log in with the token to establish session
                      await loginWithToken(customerToken)
                      // Navigate directly to the chat thread
                      navigate(`/portal/support/${ticketId}?welcome=true&business=${encodeURIComponent(tenantInfo.name)}`)
                      handleClose()
                    } catch (err) {
                      console.error('Failed to login:', err)
                      setRedirecting(false)
                    }
                  }}
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
              Back to Listing
            </button>
          </div>
        ) : (
          /* Form */
          <form onSubmit={handleSubmit} className="p-6">
            {/* Intro Text */}
            <p className="text-sm text-gray-600 mb-4">
              Have questions about your stay? Send a message and the host will get back to you.
            </p>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {error}
              </div>
            )}

            {/* Form Fields */}
            <div className="space-y-4">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter your full name"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent"
                  required
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="Enter your email address"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent"
                  required
                />
              </div>

              {/* Phone */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone Number <span className="text-red-500">*</span>
                </label>
                <PhoneInput
                  value={formData.phone}
                  onChange={(phone) => setFormData(prev => ({ ...prev, phone }))}
                  placeholder="Phone number"
                />
              </div>

              {/* Date Range */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <Calendar className="w-4 h-4 inline mr-1" />
                  Intended Stay (Optional)
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Check-in</label>
                    <input
                      type="date"
                      value={formData.check_in}
                      onChange={(e) => {
                        const newCheckIn = e.target.value
                        setFormData(prev => ({
                          ...prev,
                          check_in: newCheckIn,
                          check_out: prev.check_out && prev.check_out < newCheckIn ? '' : prev.check_out
                        }))
                      }}
                      min={new Date().toISOString().split('T')[0]}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Check-out</label>
                    <input
                      type="date"
                      value={formData.check_out}
                      onChange={(e) => setFormData(prev => ({ ...prev, check_out: e.target.value }))}
                      min={formData.check_in || new Date().toISOString().split('T')[0]}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent text-sm"
                    />
                  </div>
                </div>
                {formData.check_in && formData.check_out && (
                  <p className="text-xs text-accent-600 mt-1">
                    {Math.ceil((new Date(formData.check_out).getTime() - new Date(formData.check_in).getTime()) / (1000 * 60 * 60 * 24))} night(s) selected
                  </p>
                )}
              </div>

              {/* Guests */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <Users className="w-4 h-4 inline mr-1" />
                  Number of Guests (Optional)
                </label>
                <select
                  value={formData.guests}
                  onChange={(e) => setFormData(prev => ({ ...prev, guests: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent text-sm"
                >
                  <option value="">Select guests</option>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                    <option key={n} value={n}>{n} guest{n > 1 ? 's' : ''}</option>
                  ))}
                  <option value="11">10+ guests</option>
                </select>
              </div>

              {/* Message */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Message <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={formData.message}
                  onChange={(e) => setFormData(prev => ({ ...prev, message: e.target.value }))}
                  placeholder="Hi! I'm interested in booking your property. I have a few questions..."
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent resize-none"
                  required
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={submitting}
              className="w-full mt-6 px-6 py-3 bg-gray-900 hover:bg-gray-800 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <MessageCircle className="w-5 h-5" />
                  Send Message
                </>
              )}
            </button>

            <p className="text-xs text-gray-500 text-center mt-3">
              The host typically responds within a few hours.
            </p>
          </form>
        )}
      </div>
    </div>,
    document.body
  )
}

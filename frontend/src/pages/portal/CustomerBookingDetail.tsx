import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  ArrowLeft,
  Calendar,
  User,
  Mail,
  Phone,
  BedDouble,
  CreditCard,
  Clock,
  Star,
  MessageCircle,
  Package,
  FileText,
  Users,
  Plus,
  Minus,
  Loader2,
  AlertCircle,
  X,
  Download
} from 'lucide-react'
import Button from '../../components/Button'
import { portalApi, CustomerBooking, Invoice } from '../../services/portalApi'
import { useNotification } from '../../contexts/NotificationContext'

const statusOptions = [
  { value: 'pending', label: 'Pending', color: 'bg-yellow-100 text-yellow-700' },
  { value: 'confirmed', label: 'Confirmed', color: 'bg-accent-100 text-accent-700' },
  { value: 'checked_in', label: 'Checked In', color: 'bg-blue-100 text-blue-700' },
  { value: 'checked_out', label: 'Checked Out', color: 'bg-purple-100 text-purple-700' },
  { value: 'cancelled', label: 'Cancelled', color: 'bg-red-100 text-red-700' },
  { value: 'completed', label: 'Completed', color: 'bg-gray-100 text-gray-700' },
]

const paymentStatusOptions = [
  { value: 'pending', label: 'Pending', color: 'bg-gray-100 text-gray-700' },
  { value: 'paid', label: 'Paid', color: 'bg-accent-100 text-accent-700' },
  { value: 'partial', label: 'Partial', color: 'bg-blue-100 text-blue-700' },
  { value: 'refunded', label: 'Refunded', color: 'bg-red-100 text-red-700' },
]

interface BookingNotes {
  guests?: number
  adults?: number
  children?: number
  children_ages?: number[]
  addons?: Array<{
    id: string
    name: string
    quantity: number
    price: number
    total: number
  }>
  special_requests?: string
  booking_reference?: string
}

export default function CustomerBookingDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { showSuccess, showError } = useNotification()

  const [booking, setBooking] = useState<CustomerBooking | null>(null)
  const [loading, setLoading] = useState(true)
  const [bookingNotes, setBookingNotes] = useState<BookingNotes>({})

  // Addons management
  const [selectedAddons, setSelectedAddons] = useState<any[]>([])
  const [saving, setSaving] = useState(false)

  // Review form
  const [showReviewForm, setShowReviewForm] = useState(false)
  const [reviewRating, setReviewRating] = useState(5)
  const [reviewTitle, setReviewTitle] = useState('')
  const [reviewContent, setReviewContent] = useState('')
  const [submittingReview, setSubmittingReview] = useState(false)

  // Cancel booking
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [cancelling, setCancelling] = useState(false)

  // Invoice
  const [invoice, setInvoice] = useState<Invoice | null>(null)
  const [loadingInvoice, setLoadingInvoice] = useState(false)
  const [downloadingInvoice, setDownloadingInvoice] = useState(false)

  useEffect(() => {
    if (id) {
      loadBooking()
    }
  }, [id])

  // Load invoice when booking is loaded and paid
  useEffect(() => {
    if (booking?.id && booking.payment_status === 'paid') {
      loadInvoice(booking.id)
    }
  }, [booking?.id, booking?.payment_status])

  const loadInvoice = async (bookingId: string) => {
    try {
      setLoadingInvoice(true)
      const data = await portalApi.getInvoice(bookingId)
      setInvoice(data)
    } catch (error) {
      // Invoice not found is expected if it hasn't been generated yet
      console.log('Invoice not available for this booking')
      setInvoice(null)
    } finally {
      setLoadingInvoice(false)
    }
  }

  const handleDownloadInvoice = async () => {
    if (!booking?.id) return

    try {
      setDownloadingInvoice(true)
      const blob = await portalApi.downloadInvoice(booking.id)

      // Create download link
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = invoice?.invoice_number ? `${invoice.invoice_number}.pdf` : 'invoice.pdf'
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      showSuccess('Invoice Downloaded', 'Your invoice has been downloaded.')
    } catch (error) {
      console.error('Failed to download invoice:', error)
      showError('Error', 'Failed to download invoice. Please try again.')
    } finally {
      setDownloadingInvoice(false)
    }
  }

  const loadBooking = async () => {
    if (!id) return

    try {
      setLoading(true)
      const data = await portalApi.getBooking(id)
      setBooking(data)

      // Parse notes if JSON
      try {
        const notes = data.notes ? JSON.parse(data.notes) : {}
        setBookingNotes(notes)
        if (notes.addons) {
          setSelectedAddons(notes.addons)
        }
      } catch {
        setBookingNotes({ special_requests: data.notes || '' })
      }
    } catch (error) {
      console.error('Failed to load booking:', error)
      showError('Error', 'Failed to load booking details')
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleDateString('en-ZA', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
  }

  const formatCurrency = (amount: number | string | null | undefined, currency: string = 'ZAR') => {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : (amount ?? 0)
    if (isNaN(numAmount)) return 'R0'
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: currency || 'ZAR',
    }).format(numAmount)
  }

  const calculateNights = () => {
    if (!booking?.check_in || !booking?.check_out) return 0
    const checkIn = new Date(booking.check_in)
    const checkOut = new Date(booking.check_out)
    return Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24))
  }

  const getStatusColor = (status: string) => {
    return statusOptions.find((s) => s.value === status)?.color || 'bg-gray-100 text-gray-700'
  }

  const getStatusLabel = (status: string) => {
    return statusOptions.find((s) => s.value === status)?.label || status
  }

  const getPaymentStatusColor = (status: string) => {
    return paymentStatusOptions.find((s) => s.value === status)?.color || 'bg-gray-100 text-gray-700'
  }

  const getPaymentStatusLabel = (status: string) => {
    return paymentStatusOptions.find((s) => s.value === status)?.label || status
  }

  // Addon handlers
  const handleAddonChange = (addon: any, quantity: number) => {
    const existingIndex = selectedAddons.findIndex(a => a.id === addon.id)
    let newAddons = [...selectedAddons]

    if (quantity === 0) {
      newAddons = newAddons.filter(a => a.id !== addon.id)
    } else if (existingIndex >= 0) {
      newAddons[existingIndex] = {
        ...newAddons[existingIndex],
        quantity,
        total: addon.price * quantity
      }
    } else {
      newAddons.push({
        id: addon.id,
        name: addon.name,
        quantity,
        price: addon.price,
        total: addon.price * quantity
      })
    }

    setSelectedAddons(newAddons)
  }

  const getAddonQuantity = (addonId: string) => {
    const addon = selectedAddons.find(a => a.id === addonId)
    return addon?.quantity || 0
  }

  const handleSaveAddons = async () => {
    if (!id || !booking) return

    try {
      setSaving(true)
      await portalApi.updateBookingAddons(id, selectedAddons)
      showSuccess('Add-ons Updated', 'Your booking add-ons have been updated')
      await loadBooking()
    } catch (error: any) {
      showError('Error', error.message || 'Failed to update add-ons')
    } finally {
      setSaving(false)
    }
  }

  const addonsChanged = booking && JSON.stringify(selectedAddons) !== JSON.stringify(bookingNotes.addons || [])

  // Review handlers
  const canReview = booking &&
    ['checked_out', 'completed'].includes(booking.status) &&
    booking.payment_status === 'paid' &&
    (!booking.reviews || booking.reviews.length === 0)

  const handleSubmitReview = async () => {
    if (!id || !booking) return

    try {
      setSubmittingReview(true)
      await portalApi.submitReview(id, {
        rating: reviewRating,
        title: reviewTitle || undefined,
        content: reviewContent || undefined
      })
      showSuccess('Review Submitted', 'Thank you for your review!')
      setShowReviewForm(false)
      await loadBooking()
    } catch (error: any) {
      showError('Error', error.message || 'Failed to submit review')
    } finally {
      setSubmittingReview(false)
    }
  }

  // Cancel booking handlers
  const canCancelBooking = () => {
    if (!booking) return false
    // Can only cancel pending or confirmed bookings before check-in
    if (!['pending', 'confirmed'].includes(booking.status)) return false
    const checkInDate = new Date(booking.check_in)
    const now = new Date()
    return checkInDate > now
  }

  const handleCancelBooking = async () => {
    if (!id || !booking) return

    setCancelling(true)
    try {
      await portalApi.cancelBooking(id)
      showSuccess('Booking Cancelled', 'Your reservation has been cancelled.')
      setShowCancelModal(false)
      await loadBooking()
    } catch (error: any) {
      showError('Error', error.message || 'Failed to cancel booking')
    } finally {
      setCancelling(false)
    }
  }

  if (loading) {
    return (
      <div className="p-8 bg-gray-50 min-h-full flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-accent-500" />
          <p className="text-gray-500">Loading booking details...</p>
        </div>
      </div>
    )
  }

  if (!booking) {
    return (
      <div className="p-8 bg-gray-50 min-h-full flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 mx-auto mb-4 text-red-500" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Booking Not Found</h2>
          <p className="text-gray-500 mb-4">The booking you're looking for doesn't exist.</p>
          <Button onClick={() => navigate('/portal')}>
            <ArrowLeft size={16} className="mr-2" />
            Back to Bookings
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8 bg-gray-50 min-h-full">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => navigate('/portal')}
          className="flex items-center text-gray-600 hover:text-gray-900 mb-4 transition-colors"
        >
          <ArrowLeft size={18} className="mr-2" />
          Back to Bookings
        </button>

        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-1">
              Booking Details
            </h1>
            {bookingNotes.booking_reference && (
              <p className="text-gray-500">
                Reference: <span className="font-mono font-medium">{bookingNotes.booking_reference}</span>
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Guest Information */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <User size={20} />
              Guest Information
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Full Name</label>
                <p className="text-gray-900 font-medium">{booking.guest_name}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Email</label>
                <div className="flex items-center gap-2">
                  <Mail size={16} className="text-gray-400" />
                  <span className="text-gray-900">{booking.guest_email || 'Not provided'}</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Phone</label>
                <div className="flex items-center gap-2">
                  <Phone size={16} className="text-gray-400" />
                  <span className="text-gray-900">{booking.guest_phone || 'Not provided'}</span>
                </div>
              </div>

              {(bookingNotes.guests || bookingNotes.adults) && (
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Guests</label>
                  <div className="flex items-center gap-2">
                    <Users size={16} className="text-gray-400" />
                    <div>
                      <span className="text-gray-900">
                        {bookingNotes.adults ?? bookingNotes.guests ?? 1} {(bookingNotes.adults ?? bookingNotes.guests ?? 1) === 1 ? 'Adult' : 'Adults'}
                      </span>
                      {bookingNotes.children && bookingNotes.children > 0 && (
                        <span className="text-gray-600">
                          {', '}{bookingNotes.children} {bookingNotes.children === 1 ? 'Child' : 'Children'}
                        </span>
                      )}
                    </div>
                  </div>
                  {bookingNotes.children_ages && bookingNotes.children_ages.length > 0 && (
                    <p className="text-xs text-gray-500 mt-1">
                      Children ages: {bookingNotes.children_ages.join(', ')} years
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Stay Details */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Calendar size={20} />
              Stay Details
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Check-in</label>
                <div>
                  <p className="text-gray-900 font-medium">{formatDate(booking.check_in)}</p>
                  <p className="text-sm text-gray-500">From 14:00</p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Check-out</label>
                <div>
                  <p className="text-gray-900 font-medium">{formatDate(booking.check_out)}</p>
                  <p className="text-sm text-gray-500">Until 10:00</p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Duration</label>
                <div className="flex items-center gap-2">
                  <Clock size={16} className="text-gray-400" />
                  <span className="text-gray-900 font-medium">
                    {calculateNights()} {calculateNights() === 1 ? 'night' : 'nights'}
                  </span>
                </div>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-500 mb-2">Room</label>
                <div className="flex items-start gap-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
                  {booking.room?.images?.featured?.url ? (
                    <img
                      src={booking.room.images.featured.url}
                      alt={booking.room_name || 'Room'}
                      className="w-20 h-20 object-cover rounded-lg flex-shrink-0"
                    />
                  ) : (
                    <div className="w-20 h-20 bg-gray-200 rounded-lg flex items-center justify-center flex-shrink-0">
                      <BedDouble size={24} className="text-gray-400" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-gray-900">
                      {booking.room_name || 'Unknown Room'}
                    </h4>
                    <p className="text-sm text-gray-600 mt-1">
                      {booking.tenants?.business_name}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Add-ons Card */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Package size={20} />
                Add-ons & Extras
              </h2>
              {booking.canModifyAddons === false && bookingNotes.addons && bookingNotes.addons.length > 0 && (
                <span className="text-xs text-gray-500">Modifications locked after check-in</span>
              )}
            </div>

            {bookingNotes.addons && bookingNotes.addons.length > 0 ? (
              <div className="space-y-3">
                {bookingNotes.addons.map((addon, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0"
                  >
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{addon.name}</p>
                      <p className="text-sm text-gray-500">
                        Qty: {addon.quantity} x {formatCurrency(addon.price, booking.currency)}
                      </p>
                    </div>
                    <p className="font-medium text-gray-900">
                      {formatCurrency(parseFloat(String(addon.total)) || 0, booking.currency)}
                    </p>
                  </div>
                ))}
                <div className="pt-2 border-t border-gray-200">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Add-ons Total</span>
                    <span className="font-semibold text-gray-900">
                      {formatCurrency(
                        bookingNotes.addons.reduce((sum, a) => sum + (parseFloat(String(a.total)) || 0), 0),
                        booking.currency
                      )}
                    </span>
                  </div>
                </div>
              </div>
            ) : booking.availableAddons && booking.availableAddons.length > 0 && booking.canModifyAddons ? (
              <div className="space-y-3">
                {booking.availableAddons.map((addon: any) => (
                  <div key={addon.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">{addon.name}</p>
                      <p className="text-sm text-gray-500">
                        {formatCurrency(addon.price, booking.currency)}
                        <span className="text-xs ml-1">
                          {addon.pricing_type === 'per_night' && '/ night'}
                          {addon.pricing_type === 'per_guest' && '/ guest'}
                          {addon.pricing_type === 'per_guest_per_night' && '/ guest / night'}
                        </span>
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleAddonChange(addon, Math.max(0, getAddonQuantity(addon.id) - 1))}
                        className="p-1 border border-gray-300 rounded hover:bg-gray-100"
                        disabled={getAddonQuantity(addon.id) === 0}
                      >
                        <Minus size={16} />
                      </button>
                      <span className="w-8 text-center font-medium">
                        {getAddonQuantity(addon.id)}
                      </span>
                      <button
                        onClick={() => handleAddonChange(addon, Math.min(addon.max_quantity || 10, getAddonQuantity(addon.id) + 1))}
                        className="p-1 border border-gray-300 rounded hover:bg-gray-100"
                        disabled={getAddonQuantity(addon.id) >= (addon.max_quantity || 10)}
                      >
                        <Plus size={16} />
                      </button>
                    </div>
                  </div>
                ))}
                {addonsChanged && (
                  <div className="mt-4 flex justify-end">
                    <Button onClick={handleSaveAddons} disabled={saving}>
                      {saving ? 'Saving...' : 'Save Changes'}
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-6 text-gray-500">
                <Package size={32} className="mx-auto mb-2 opacity-50" />
                <p className="text-sm">No add-ons on this booking</p>
              </div>
            )}
          </div>

          {/* Special Requests */}
          {bookingNotes.special_requests && (
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <FileText size={20} />
                Special Requests
              </h2>
              <p className="text-gray-700 whitespace-pre-wrap">{bookingNotes.special_requests}</p>
            </div>
          )}

          {/* Review Section */}
          {canReview && !showReviewForm && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
              <h2 className="font-semibold text-gray-900 mb-2">Share Your Experience</h2>
              <p className="text-gray-600 mb-4">How was your stay? Leave a review to help other guests.</p>
              <Button onClick={() => setShowReviewForm(true)}>
                <Star size={16} className="mr-2" />
                Write a Review
              </Button>
            </div>
          )}

          {showReviewForm && (
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h2 className="font-semibold text-gray-900 mb-4">Write Your Review</h2>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Rating</label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={() => setReviewRating(star)}
                      className="p-1"
                    >
                      <Star
                        size={32}
                        className={star <= reviewRating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}
                      />
                    </button>
                  ))}
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Title (optional)</label>
                <input
                  type="text"
                  value={reviewTitle}
                  onChange={(e) => setReviewTitle(e.target.value)}
                  placeholder="Summarize your experience"
                  maxLength={100}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Review (optional)</label>
                <textarea
                  value={reviewContent}
                  onChange={(e) => setReviewContent(e.target.value)}
                  placeholder="Tell others about your stay..."
                  rows={4}
                  maxLength={2000}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                />
              </div>

              <div className="flex gap-3">
                <Button onClick={handleSubmitReview} disabled={submittingReview}>
                  {submittingReview ? 'Submitting...' : 'Submit Review'}
                </Button>
                <Button variant="secondary" onClick={() => setShowReviewForm(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {/* Existing Review */}
          {booking.reviews && booking.reviews.length > 0 && (
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Star size={20} />
                Your Review
              </h2>
              {booking.reviews.map((review: any) => (
                <div key={review.id}>
                  <div className="flex items-center gap-2 mb-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        size={18}
                        className={star <= review.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}
                      />
                    ))}
                    <span className="text-sm font-medium text-gray-900 ml-1">{review.rating}/5</span>
                  </div>
                  {review.title && (
                    <p className="font-medium text-gray-900 mb-1">"{review.title}"</p>
                  )}
                  {review.content && (
                    <p className="text-gray-600 mb-3">{review.content}</p>
                  )}
                  <p className="text-xs text-gray-500">
                    Submitted {review.created_at && new Date(review.created_at).toLocaleDateString('en-ZA', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric'
                    })}
                  </p>

                  {review.owner_response && (
                    <div className="mt-4 p-4 bg-blue-50 rounded-lg border-l-4 border-blue-500">
                      <div className="flex items-center gap-1 mb-1">
                        <MessageCircle size={12} className="text-blue-600" />
                        <span className="text-xs font-medium text-blue-700">Response from property</span>
                      </div>
                      <p className="text-sm text-gray-700">{review.owner_response}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Status Card */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Status</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-2">Booking Status</label>
                <span className={`inline-flex px-3 py-1 text-sm font-medium rounded-full ${getStatusColor(booking.status)}`}>
                  {getStatusLabel(booking.status)}
                </span>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-500 mb-2">Payment Status</label>
                <span className={`inline-flex px-3 py-1 text-sm font-medium rounded-full ${getPaymentStatusColor(booking.payment_status)}`}>
                  {getPaymentStatusLabel(booking.payment_status)}
                </span>
              </div>
            </div>
          </div>

          {/* Payment Summary */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <CreditCard size={20} />
              Payment
            </h2>

            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">
                  Room ({calculateNights()} nights)
                </span>
                <span className="text-gray-900">
                  {formatCurrency(
                    (parseFloat(String(booking.total_amount)) || 0) - (bookingNotes.addons?.reduce((s, a) => s + (parseFloat(String(a.total)) || 0), 0) || 0),
                    booking.currency
                  )}
                </span>
              </div>

              {bookingNotes.addons && bookingNotes.addons.length > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Add-ons</span>
                  <span className="text-gray-900">
                    {formatCurrency(
                      bookingNotes.addons.reduce((sum, a) => sum + (parseFloat(String(a.total)) || 0), 0),
                      booking.currency
                    )}
                  </span>
                </div>
              )}

              <div className="border-t pt-3 mt-3">
                <div className="flex justify-between">
                  <span className="font-semibold text-gray-900">Total</span>
                  <span className="text-xl font-bold text-gray-900">
                    {formatCurrency(booking.total_amount, booking.currency)}
                  </span>
                </div>
              </div>

              {/* Invoice Download */}
              {booking.payment_status === 'paid' && (
                <div className="border-t pt-4 mt-4">
                  {loadingInvoice ? (
                    <div className="flex items-center justify-center py-2">
                      <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                      <span className="ml-2 text-sm text-gray-500">Loading invoice...</span>
                    </div>
                  ) : invoice ? (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-500">Invoice</span>
                        <span className="font-mono text-gray-900">{invoice.invoice_number}</span>
                      </div>
                      <button
                        onClick={handleDownloadInvoice}
                        disabled={downloadingInvoice}
                        className="w-full flex items-center justify-center gap-2 border border-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-50 transition-colors disabled:opacity-50"
                      >
                        {downloadingInvoice ? (
                          <>
                            <Loader2 size={16} className="animate-spin" />
                            Downloading...
                          </>
                        ) : (
                          <>
                            <Download size={16} />
                            Download Invoice
                          </>
                        )}
                      </button>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500 text-center">
                      Invoice will be available once generated by the property.
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Contact Support */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Need Help?</h2>
            <p className="text-gray-600 text-sm mb-4">
              Have questions about your booking? Contact the property.
            </p>
            <Link
              to={`/portal/support?tenant=${booking.tenants?.id}&booking=${booking.id}`}
              className="w-full flex items-center justify-center gap-2 bg-gray-900 text-white py-2 px-4 rounded-md hover:bg-gray-800 transition-colors"
            >
              <MessageCircle size={16} />
              Contact Support
            </Link>
          </div>

          {/* Cancel Booking */}
          {canCancelBooking() && (
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Cancel Booking</h2>
              <p className="text-gray-600 text-sm mb-4">
                Need to cancel your reservation? You can cancel before your check-in date.
              </p>
              <button
                onClick={() => setShowCancelModal(true)}
                className="w-full flex items-center justify-center gap-2 border border-red-600 text-red-600 py-2 px-4 rounded-md hover:bg-red-50 transition-colors"
              >
                <X size={16} />
                Cancel Reservation
              </button>
            </div>
          )}

          {/* Booking Meta */}
          <div className="bg-gray-100 rounded-lg p-4 text-sm text-gray-600">
            <p>
              <strong>Booking ID:</strong> {booking.id?.slice(0, 8)}...
            </p>
            <p className="mt-1">
              <strong>Property:</strong> {booking.tenants?.business_name}
            </p>
          </div>
        </div>
      </div>

      {/* Cancel Booking Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full overflow-hidden">
            <div className="bg-red-600 px-6 py-4">
              <h3 className="text-lg font-semibold text-white">Cancel Reservation</h3>
            </div>
            <div className="p-6">
              <div className="flex items-start gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                  <AlertCircle className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <p className="text-gray-900 font-medium">Are you sure you want to cancel this reservation?</p>
                  <p className="text-sm text-gray-500 mt-1">
                    <strong>{booking.room_name}</strong> at {booking.tenants?.business_name}
                  </p>
                  <p className="text-sm text-gray-500">
                    {formatDate(booking.check_in)} - {formatDate(booking.check_out)}
                  </p>
                </div>
              </div>
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <p className="text-sm text-yellow-800">
                  <strong>Note:</strong> This action cannot be undone. You will need to make a new booking if you change your mind.
                </p>
              </div>
            </div>
            <div className="px-6 py-4 bg-gray-50 flex gap-3 justify-end">
              <button
                onClick={() => setShowCancelModal(false)}
                disabled={cancelling}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-100 transition-colors disabled:opacity-50"
              >
                Keep Reservation
              </button>
              <button
                onClick={handleCancelBooking}
                disabled={cancelling}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {cancelling ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Cancelling...
                  </>
                ) : (
                  <>
                    <X size={16} />
                    Cancel Reservation
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

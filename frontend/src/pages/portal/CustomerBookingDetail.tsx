import { useState, useEffect } from 'react'
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom'
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
  Download,
  Image as ImageIcon,
  RotateCcw,
  CheckCircle,
  XCircle,
  Eye,
  RefreshCw
} from 'lucide-react'
import Button from '../../components/Button'
import ReviewImageUpload from '../../components/ReviewImageUpload'
import QuickActionCard from '../../components/QuickActionCard'
import PaymentProofCard from '../../components/PaymentProofCard'
import { portalApi, CustomerBooking, Invoice, CustomerRefund } from '../../services/portalApi'
import { useNotification } from '../../contexts/NotificationContext'
import type { ReviewImage } from '../../services/api'

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

// Refund status labels for display
const refundStatusLabels: Record<string, string> = {
  requested: 'Pending Review',
  under_review: 'Under Review',
  approved: 'Approved',
  rejected: 'Declined',
  processing: 'Processing',
  completed: 'Refunded',
  failed: 'Failed',
}

// Header background styles based on booking status
const getStatusHeaderStyles = (status: string) => {
  const styles: Record<string, string> = {
    pending: 'bg-yellow-50 border-yellow-200',
    confirmed: 'bg-emerald-50 border-emerald-200',
    checked_in: 'bg-blue-50 border-blue-200',
    checked_out: 'bg-purple-50 border-purple-200',
    cancelled: 'bg-red-50 border-red-200',
    completed: 'bg-gray-50 border-gray-200',
  }
  return styles[status] || 'bg-white border-gray-200'
}

// Standard cancellation reason codes
const CANCELLATION_REASONS = [
  { value: 'change_of_plans', label: 'Change of plans / dates no longer work' },
  { value: 'alternative_accommodation', label: 'Found alternative accommodation' },
  { value: 'health_emergency', label: 'Health or family emergency' },
  { value: 'travel_restrictions', label: 'Travel restrictions' },
  { value: 'financial_reasons', label: 'Financial reasons' },
  { value: 'duplicate_booking', label: 'Accidental/duplicate booking' },
  { value: 'property_expectations', label: "Property doesn't meet expectations" },
  { value: 'other', label: 'Other' }
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
  const location = useLocation()
  const { showSuccess, showError } = useNotification()

  const [booking, setBooking] = useState<CustomerBooking | null>(null)
  const [loading, setLoading] = useState(true)
  const [bookingNotes, setBookingNotes] = useState<BookingNotes>({})

  // Addons management
  const [selectedAddons, setSelectedAddons] = useState<any[]>([])
  const [saving, setSaving] = useState(false)

  // Review form
  const [showReviewForm, setShowReviewForm] = useState(false)
  const [categoryRatings, setCategoryRatings] = useState({
    cleanliness: 5,
    service: 5,
    location: 5,
    value: 5,
    safety: 5
  })
  const [reviewTitle, setReviewTitle] = useState('')
  const [reviewContent, setReviewContent] = useState('')
  const [reviewImages, setReviewImages] = useState<ReviewImage[]>([])
  const [submittingReview, setSubmittingReview] = useState(false)

  // Cancel booking
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const [cancellationReason, setCancellationReason] = useState('')
  const [cancellationDetails, setCancellationDetails] = useState('')
  const [refundRequested, setRefundRequested] = useState(false)
  const [cancellationError, setCancellationError] = useState('')

  // Invoice
  const [invoice, setInvoice] = useState<Invoice | null>(null)
  const [_loadingInvoice, setLoadingInvoice] = useState(false)
  const [downloadingInvoice, setDownloadingInvoice] = useState(false)

  // Proof of payment upload
  const [uploadingProof, setUploadingProof] = useState(false)

  // Lightbox for review images
  const [lightboxImages, _setLightboxImages] = useState<string[]>([])
  const [lightboxIndex, setLightboxIndex] = useState(0)
  const [showLightbox, setShowLightbox] = useState(false)

  // Refund status
  const [refund, setRefund] = useState<CustomerRefund | null>(null)
  const [loadingRefund, setLoadingRefund] = useState(false)

  useEffect(() => {
    if (id) {
      loadBooking()
    }
  }, [id])

  // Handle #review hash in URL - automatically show review form
  useEffect(() => {
    if (location.hash === '#review' && booking && !loading) {
      // Check if user can review this booking
      const canWriteReview =
        ['checked_out', 'completed'].includes(booking.status) &&
        booking.payment_status === 'paid' &&
        (!booking.reviews || booking.reviews.length === 0)

      if (canWriteReview) {
        setShowReviewForm(true)
        // Clear the hash from URL without triggering navigation
        window.history.replaceState(null, '', location.pathname)
      }
    }
  }, [location.hash, booking, loading])

  // Load invoice when booking is loaded and paid
  useEffect(() => {
    if (booking?.id && booking.payment_status === 'paid') {
      loadInvoice(booking.id)
    }
  }, [booking?.id, booking?.payment_status])

  // Load refund status for cancelled bookings
  useEffect(() => {
    if (booking?.id && booking.status === 'cancelled' && booking.refund_requested) {
      loadRefund(booking.id)
    }
  }, [booking?.id, booking?.status, booking?.refund_requested])

  const loadRefund = async (bookingId: string) => {
    try {
      setLoadingRefund(true)
      const data = await portalApi.getRefundForBooking(bookingId)
      setRefund(data)
    } catch (error) {
      console.log('Refund not available for this booking')
      setRefund(null)
    } finally {
      setLoadingRefund(false)
    }
  }

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
        rating_cleanliness: categoryRatings.cleanliness,
        rating_service: categoryRatings.service,
        rating_location: categoryRatings.location,
        rating_value: categoryRatings.value,
        rating_safety: categoryRatings.safety,
        title: reviewTitle || undefined,
        content: reviewContent || undefined,
        images: reviewImages.length > 0 ? reviewImages : undefined
      })
      showSuccess('Review Submitted', 'Thank you for your review!')
      setShowReviewForm(false)
      setReviewImages([]) // Clear images after successful submission
      // Dispatch event to notify other components (like CustomerReviews page)
      window.dispatchEvent(new CustomEvent('review-submitted'))
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

    // Validate
    setCancellationError('')
    if (!cancellationReason) {
      setCancellationError('Please select a reason for cancellation')
      return
    }
    if (cancellationReason === 'other' && !cancellationDetails.trim()) {
      setCancellationError('Please provide details for your cancellation')
      return
    }

    setCancelling(true)
    try {
      const result = await portalApi.cancelBooking(id, {
        reason: cancellationReason,
        details: cancellationDetails || undefined,
        refund_requested: refundRequested
      })
      showSuccess('Booking Cancelled', result.message || 'Your reservation has been cancelled.')

      // Reset form state
      handleCloseCancelModal()
      await loadBooking()
    } catch (error: any) {
      showError('Error', error.message || 'Failed to cancel booking')
    } finally {
      setCancelling(false)
    }
  }

  // Reset form when modal closes
  const handleCloseCancelModal = () => {
    setShowCancelModal(false)
    setCancellationReason('')
    setCancellationDetails('')
    setRefundRequested(false)
    setCancellationError('')
  }

  // Proof of payment upload handler
  const handleProofUpload = async (file: File) => {
    if (!id || !booking) return

    setUploadingProof(true)
    try {
      await portalApi.uploadProofOfPayment(id, file)
      showSuccess('Proof Uploaded', 'Your proof of payment has been uploaded.')
      await loadBooking()
    } catch (error: any) {
      showError('Error', error.message || 'Failed to upload proof of payment')
    } finally {
      setUploadingProof(false)
    }
  }

  // Check if customer can upload proof (for EFT/manual payments only)
  const canUploadProof = booking &&
    booking.payment_status !== 'paid' &&
    (!booking.payment_method || booking.payment_method === 'eft' || booking.payment_method === 'manual')

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
    <div className="bg-gray-50 min-h-full">
      {/* Hero Header */}
      <div className={`border-b ${getStatusHeaderStyles(booking.status)}`}>
        <div className="max-w-6xl mx-auto px-6 py-6">
          <button
            onClick={() => navigate('/portal')}
            className="flex items-center text-gray-500 hover:text-gray-900 mb-4 transition-colors text-sm"
          >
            <ArrowLeft size={16} className="mr-1.5" />
            Back to Bookings
          </button>

          <div className="flex flex-col lg:flex-row lg:items-start gap-6">
            {/* Room Image */}
            <div className="flex-shrink-0">
              {booking.room?.images?.featured?.url ? (
                <img
                  src={booking.room.images.featured.url}
                  alt={booking.room_name || 'Room'}
                  className="w-full lg:w-48 h-32 lg:h-32 object-cover rounded-xl"
                />
              ) : (
                <div className="w-full lg:w-48 h-32 bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl flex items-center justify-center">
                  <BedDouble size={32} className="text-gray-400" />
                </div>
              )}
            </div>

            {/* Booking Summary */}
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className={`inline-flex px-2.5 py-0.5 text-xs font-medium rounded-full ${getStatusColor(booking.status)}`}>
                  {getStatusLabel(booking.status)}
                </span>
                <span className={`inline-flex px-2.5 py-0.5 text-xs font-medium rounded-full ${getPaymentStatusColor(booking.payment_status)}`}>
                  {getPaymentStatusLabel(booking.payment_status)}
                </span>
              </div>

              {/* Refund Requested Banner for cancelled bookings */}
              {booking.status === 'cancelled' && booking.refund_requested && (
                <div className="flex items-center gap-2 mb-2 text-red-600">
                  <RotateCcw size={16} />
                  <span className="text-sm font-medium">
                    Refund Requested
                    {refund && refund.status !== 'requested' && (
                      <span className="ml-1 text-red-500">
                        • {refundStatusLabels[refund.status] || refund.status}
                      </span>
                    )}
                  </span>
                </div>
              )}

              <h1 className="text-2xl font-bold text-gray-900 mb-1">
                {booking.room_name || 'Room'}
              </h1>
              <p className="text-gray-600 mb-4">
                {booking.tenants?.business_name}
              </p>

              <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
                <div className="flex items-center gap-2 text-gray-600">
                  <Calendar size={16} className="text-gray-400" />
                  <span>{new Date(booking.check_in).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' })} - {new Date(booking.check_out).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-600">
                  <Clock size={16} className="text-gray-400" />
                  <span>{calculateNights()} {calculateNights() === 1 ? 'night' : 'nights'}</span>
                </div>
                {(bookingNotes.guests || bookingNotes.adults) && (
                  <div className="flex items-center gap-2 text-gray-600">
                    <Users size={16} className="text-gray-400" />
                    <span>
                      {bookingNotes.adults ?? bookingNotes.guests ?? 1} {(bookingNotes.adults ?? bookingNotes.guests ?? 1) === 1 ? 'guest' : 'guests'}
                      {bookingNotes.children && bookingNotes.children > 0 && `, ${bookingNotes.children} children`}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Price Summary */}
            <div className="flex-shrink-0 lg:text-right">
              <p className="text-sm text-gray-500 mb-1">Total</p>
              <p className="text-3xl font-bold text-accent-600">
                {formatCurrency(booking.total_amount, booking.currency)}
              </p>
              <p className="text-xs text-gray-500 mt-2">Booking ref #:</p>
              <p className="text-sm font-mono text-gray-700">
                {bookingNotes.booking_reference || booking.id?.slice(0, 8).toUpperCase()}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Review Card - Shows for eligible bookings */}
            {canReview && (
              showReviewForm ? (
                // Expanded Form
                <div className="bg-white border border-accent-200 rounded-xl p-5 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide flex items-center gap-2">
                      <Star size={16} className="text-accent-500" />
                      Write Your Review
                    </h2>
                    <button
                      onClick={() => setShowReviewForm(false)}
                      className="text-gray-400 hover:text-gray-600 transition-colors"
                      title="Minimize"
                    >
                      <Minus size={18} />
                    </button>
                  </div>

                  <div className="mb-4 space-y-3">
                    <label className="block text-xs text-gray-500 uppercase tracking-wide mb-2">Rate your experience</label>
                    {(['cleanliness', 'service', 'location', 'value', 'safety'] as const).map((category) => (
                      <div key={category} className="flex items-center justify-between">
                        <span className="text-sm text-gray-600 capitalize">{category}</span>
                        <div className="flex gap-1">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <button
                              key={star}
                              onClick={() => setCategoryRatings(prev => ({ ...prev, [category]: star }))}
                              className="p-0.5"
                            >
                              <Star
                                size={20}
                                className={star <= categoryRatings[category] ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}
                              />
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Title (optional)</label>
                    <input
                      type="text"
                      value={reviewTitle}
                      onChange={(e) => setReviewTitle(e.target.value)}
                      placeholder="Summarize your experience"
                      maxLength={100}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent"
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
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent"
                    />
                  </div>

                  {/* Photo Upload */}
                  {booking.tenants?.id && (
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                        <ImageIcon size={16} />
                        Add Photos (optional)
                      </label>
                      <ReviewImageUpload
                        value={reviewImages}
                        onChange={setReviewImages}
                        tenantId={booking.tenants.id}
                        maxImages={4}
                        disabled={submittingReview}
                      />
                    </div>
                  )}

                  <div className="flex gap-3">
                    <Button onClick={handleSubmitReview} disabled={submittingReview}>
                      {submittingReview ? 'Submitting...' : 'Submit Review'}
                    </Button>
                    <Button variant="secondary" onClick={() => setShowReviewForm(false)}>
                      Minimize
                    </Button>
                  </div>
                </div>
              ) : (
                // Collapsed Card
                <button
                  onClick={() => setShowReviewForm(true)}
                  className="w-full bg-gradient-to-r from-accent-500 to-accent-600 rounded-xl p-4 text-left hover:from-accent-600 hover:to-accent-700 transition-all shadow-sm"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                        <Star size={20} className="text-white" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-white">Share your experience</h3>
                        <p className="text-white/80 text-sm">Click to write a review</p>
                      </div>
                    </div>
                    <Plus size={20} className="text-white/80" />
                  </div>
                </button>
              )
            )}

            {/* Your Review - Displayed prominently at top */}
            {booking.reviews && booking.reviews.length > 0 && (
              <div className="bg-gradient-to-br from-amber-50 to-yellow-50 rounded-xl border border-amber-200 p-5 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-semibold text-amber-800 uppercase tracking-wide flex items-center gap-2">
                    <Star size={16} className="fill-amber-500 text-amber-500" />
                    Your Review
                  </h2>
                  <Link
                    to="/portal/reviews"
                    className="text-xs text-amber-700 hover:text-amber-900 font-medium"
                  >
                    Edit Review
                  </Link>
                </div>
                {booking.reviews.map((review: any) => (
                  <div key={review.id}>
                    {/* Rating Display */}
                    <div className="flex items-center gap-2 mb-3">
                      <div className="flex items-center gap-0.5">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            size={18}
                            className={star <= Math.round(review.rating) ? 'fill-amber-400 text-amber-400' : 'text-gray-300'}
                          />
                        ))}
                      </div>
                      <span className="font-semibold text-gray-900">{review.rating?.toFixed(1) || review.rating}</span>
                      <span className="text-xs text-gray-500">
                        {review.created_at && new Date(review.created_at).toLocaleDateString('en-ZA', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </span>
                    </div>

                    {/* Review Title & Content */}
                    {review.title && (
                      <h3 className="font-medium text-gray-900 mb-2">"{review.title}"</h3>
                    )}
                    {review.content && (
                      <p className="text-gray-700 text-sm mb-4">{review.content}</p>
                    )}

                    {/* Review Images */}
                    {review.images && review.images.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-4">
                        {review.images.filter((img: any) => !img.hidden).slice(0, 4).map((img: any, idx: number) => (
                          <a
                            key={idx}
                            href={img.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-16 h-16 rounded-lg overflow-hidden bg-gray-100 hover:opacity-90 transition-opacity ring-1 ring-amber-200"
                          >
                            <img src={img.url} alt={`Review photo ${idx + 1}`} className="w-full h-full object-cover" />
                          </a>
                        ))}
                        {review.images.filter((img: any) => !img.hidden).length > 4 && (
                          <span className="text-xs text-amber-600 self-center">+{review.images.filter((img: any) => !img.hidden).length - 4} more</span>
                        )}
                      </div>
                    )}

                    {/* Owner Response */}
                    {review.owner_response && (
                      <div className="bg-white/60 rounded-lg p-3 border border-amber-100">
                        <p className="text-xs text-gray-500 mb-1 flex items-center gap-1">
                          <MessageCircle size={12} />
                          Response from property
                          {review.owner_response_at && (
                            <span className="ml-1">
                              ({new Date(review.owner_response_at).toLocaleDateString('en-ZA', {
                                day: 'numeric',
                                month: 'short'
                              })})
                            </span>
                          )}
                        </p>
                        <p className="text-sm text-gray-700">{review.owner_response}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Check-in / Check-out Details */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="grid grid-cols-2 divide-x divide-gray-200">
                <div className="p-5">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Check-in</p>
                  <p className="text-lg font-semibold text-gray-900">{formatDate(booking.check_in)}</p>
                  <p className="text-sm text-accent-600 mt-1">From 14:00</p>
                </div>
                <div className="p-5">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Check-out</p>
                  <p className="text-lg font-semibold text-gray-900">{formatDate(booking.check_out)}</p>
                  <p className="text-sm text-accent-600 mt-1">Until 10:00</p>
                </div>
              </div>
            </div>

            {/* Guest Details */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-4">Guest Details</h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center">
                    <User size={16} className="text-gray-500" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Name</p>
                    <p className="text-sm font-medium text-gray-900">{booking.guest_name}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center">
                    <Mail size={16} className="text-gray-500" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-gray-500">Email</p>
                    <p className="text-sm font-medium text-gray-900 truncate">{booking.guest_email || '-'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center">
                    <Phone size={16} className="text-gray-500" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Phone</p>
                    <p className="text-sm font-medium text-gray-900">{booking.guest_phone || '-'}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Add-ons Card */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide flex items-center gap-2">
                  <Package size={16} />
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
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-4 flex items-center gap-2">
                <FileText size={16} />
                Special Requests
              </h2>
              <p className="text-gray-700 text-sm whitespace-pre-wrap">{bookingNotes.special_requests}</p>
            </div>
          )}


        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Payment Summary */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-4 flex items-center gap-2">
              <CreditCard size={16} />
              Payment Summary
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
                  <span className="text-xl font-bold text-accent-600">
                    {formatCurrency(booking.total_amount, booking.currency)}
                  </span>
                </div>
              </div>

            </div>
          </div>

          {/* Payment Proof */}
          <PaymentProofCard
            paymentMethod={booking.payment_method || null}
            paymentReference={booking.payment_reference || null}
            paymentCompletedAt={booking.payment_completed_at || null}
            proofOfPayment={booking.proof_of_payment || null}
            onUploadProof={canUploadProof ? handleProofUpload : undefined}
            uploading={uploadingProof}
            canUpload={!!canUploadProof}
          />

          {/* Refund Status - Shows for cancelled bookings with refund requested */}
          {booking.status === 'cancelled' && booking.refund_requested && (
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-4 flex items-center gap-2">
                <RotateCcw size={16} />
                Refund Status
              </h2>
              {loadingRefund ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="animate-spin text-gray-400" size={20} />
                </div>
              ) : refund ? (
                <div className="space-y-4">
                  {/* Status Badge */}
                  <div className="flex items-center gap-2">
                    {refund.status === 'completed' && <CheckCircle className="text-green-500" size={20} />}
                    {refund.status === 'approved' && <CheckCircle className="text-accent-500" size={20} />}
                    {refund.status === 'processing' && <RefreshCw className="text-purple-500 animate-spin" size={20} />}
                    {refund.status === 'rejected' && <XCircle className="text-red-500" size={20} />}
                    {refund.status === 'failed' && <AlertCircle className="text-red-500" size={20} />}
                    {(refund.status === 'requested' || refund.status === 'under_review') && <Eye className="text-yellow-500" size={20} />}
                    <span className={`font-medium ${
                      refund.status === 'completed' ? 'text-green-700' :
                      refund.status === 'approved' ? 'text-accent-700' :
                      refund.status === 'processing' ? 'text-purple-700' :
                      refund.status === 'rejected' ? 'text-red-700' :
                      refund.status === 'failed' ? 'text-red-700' :
                      'text-yellow-700'
                    }`}>
                      {refund.status === 'requested' ? 'Pending Review' :
                       refund.status === 'under_review' ? 'Under Review' :
                       refund.status.charAt(0).toUpperCase() + refund.status.slice(1)}
                    </span>
                  </div>

                  {/* Status Message */}
                  <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-600">
                    {refund.status === 'requested' && (
                      <p>Your refund request is being reviewed by the property. We'll notify you once a decision is made.</p>
                    )}
                    {refund.status === 'under_review' && (
                      <p>Your refund request is currently being reviewed. We'll update you soon.</p>
                    )}
                    {refund.status === 'approved' && (
                      <p>Your refund has been approved! The property will process it shortly.</p>
                    )}
                    {refund.status === 'processing' && (
                      <p>Your refund is being processed. The funds should appear in your account within a few business days.</p>
                    )}
                    {refund.status === 'completed' && (
                      <p>Your refund has been processed successfully. Please check your account.</p>
                    )}
                    {refund.status === 'rejected' && (
                      <>
                        <p>Unfortunately, your refund request was not approved.</p>
                        {refund.rejection_reason && (
                          <p className="mt-2"><strong>Reason:</strong> {refund.rejection_reason}</p>
                        )}
                      </>
                    )}
                    {refund.status === 'failed' && (
                      <p>There was an issue processing your refund. Please contact support for assistance.</p>
                    )}
                  </div>

                  {/* Amount Details */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Original Amount</span>
                      <span className="text-gray-900">{formatCurrency(refund.original_amount, refund.currency)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Eligible Refund</span>
                      <span className="text-gray-900">
                        {formatCurrency(refund.eligible_amount, refund.currency)}
                        {refund.refund_percentage !== null && (
                          <span className="text-gray-500 ml-1">({refund.refund_percentage}%)</span>
                        )}
                      </span>
                    </div>
                    {refund.approved_amount !== null && (
                      <div className="flex justify-between text-sm font-medium">
                        <span className="text-accent-600">Approved Amount</span>
                        <span className="text-accent-600">{formatCurrency(refund.approved_amount, refund.currency)}</span>
                      </div>
                    )}
                    {refund.processed_amount !== null && refund.status === 'completed' && (
                      <div className="flex justify-between text-sm font-medium pt-2 border-t border-gray-200">
                        <span className="text-green-600">Refunded</span>
                        <span className="text-green-600">{formatCurrency(refund.processed_amount, refund.currency)}</span>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-500">Your refund request is being processed. Check back soon for updates.</p>
              )}
            </div>
          )}

          {/* Quick Actions */}
          <QuickActionCard
            title="Quick Actions"
            actions={[
              {
                icon: Download,
                iconColor: 'blue',
                label: 'Download Invoice',
                description: invoice ? invoice.invoice_number : booking.payment_status !== 'paid' ? 'Available after payment' : 'Generating...',
                onClick: handleDownloadInvoice,
                disabled: !invoice || booking.payment_status !== 'paid',
                loading: downloadingInvoice
              },
              {
                icon: MessageCircle,
                iconColor: 'accent',
                label: 'Contact Support',
                description: 'Get help with your booking',
                href: `/portal/support?tenant=${booking.tenants?.id}&booking=${booking.id}`
              },
              ...(canCancelBooking() ? [{
                icon: X,
                iconColor: 'red' as const,
                label: 'Cancel Reservation',
                description: 'Cancel before check-in',
                onClick: () => setShowCancelModal(true)
              }] : [])
            ]}
          />

        </div>
        </div>
      </div>

      {/* Cancel Booking Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-red-600 to-red-700 px-6 py-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-white">Cancel Reservation</h3>
                <button
                  onClick={handleCloseCancelModal}
                  className="text-white/80 hover:text-white transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="p-6 max-h-[70vh] overflow-y-auto">
              {/* Booking Summary */}
              <div className="flex items-start gap-3 mb-5 pb-5 border-b border-gray-100">
                <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                  <AlertCircle className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <p className="text-gray-900 font-medium">Are you sure you want to cancel?</p>
                  <p className="text-sm text-gray-600 mt-1">
                    <strong>{booking.room_name}</strong> at {booking.tenants?.business_name}
                  </p>
                  <p className="text-sm text-gray-500">
                    {new Date(booking.check_in).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' })} - {new Date(booking.check_out).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </p>
                </div>
              </div>

              {/* Cancellation Form */}
              <div className="space-y-4">
                {/* Reason Dropdown */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Reason for cancellation <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={cancellationReason}
                    onChange={(e) => {
                      setCancellationReason(e.target.value)
                      setCancellationError('')
                    }}
                    className={`w-full px-4 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-colors ${
                      cancellationError && !cancellationReason ? 'border-red-300 bg-red-50' : 'border-gray-300'
                    }`}
                  >
                    <option value="">Select a reason...</option>
                    {CANCELLATION_REASONS.map((reason) => (
                      <option key={reason.value} value={reason.value}>
                        {reason.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Details Textarea */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Additional details {cancellationReason === 'other' && <span className="text-red-500">*</span>}
                  </label>
                  <textarea
                    value={cancellationDetails}
                    onChange={(e) => {
                      setCancellationDetails(e.target.value)
                      setCancellationError('')
                    }}
                    placeholder={cancellationReason === 'other' ? 'Please provide details about your cancellation...' : 'Optional: Any additional information you\'d like to share...'}
                    rows={3}
                    className={`w-full px-4 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none transition-colors ${
                      cancellationError && cancellationReason === 'other' && !cancellationDetails.trim() ? 'border-red-300 bg-red-50' : 'border-gray-300'
                    }`}
                  />
                </div>

                {/* Refund Request Checkbox */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={refundRequested}
                      onChange={(e) => setRefundRequested(e.target.checked)}
                      className="mt-0.5 w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
                    />
                    <div>
                      <span className="text-sm font-medium text-gray-900">Request a refund</span>
                      <p className="text-xs text-gray-500 mt-0.5">
                        If applicable based on the cancellation policy, you may be eligible for a full or partial refund.
                      </p>
                    </div>
                  </label>
                </div>

                {/* Error Message */}
                {cancellationError && (
                  <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 px-3 py-2 rounded-lg">
                    <AlertCircle size={16} />
                    {cancellationError}
                  </div>
                )}

                {/* Warning Note */}
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                  <p className="text-sm text-amber-800">
                    <strong>Please note:</strong> This action cannot be undone. You will need to make a new booking if you change your mind.
                  </p>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex gap-3 justify-end">
              <button
                onClick={handleCloseCancelModal}
                disabled={cancelling}
                className="px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50 font-medium text-sm"
              >
                Keep Reservation
              </button>
              <button
                onClick={handleCancelBooking}
                disabled={cancelling}
                className="px-5 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center gap-2 font-medium text-sm"
              >
                {cancelling ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Cancelling...
                  </>
                ) : (
                  <>
                    <X size={16} />
                    Confirm Cancellation
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Image Lightbox */}
      {showLightbox && lightboxImages.length > 0 && (
        <div
          className="fixed inset-0 bg-black/90 flex items-center justify-center z-50"
          onClick={() => setShowLightbox(false)}
        >
          {/* Close button */}
          <button
            onClick={() => setShowLightbox(false)}
            className="absolute top-4 right-4 p-2 text-white/80 hover:text-white transition-colors"
          >
            <X size={28} />
          </button>

          {/* Image counter */}
          {lightboxImages.length > 1 && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 text-white/80 text-sm">
              {lightboxIndex + 1} / {lightboxImages.length}
            </div>
          )}

          {/* Previous button */}
          {lightboxImages.length > 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                setLightboxIndex((prev) => (prev === 0 ? lightboxImages.length - 1 : prev - 1))
              }}
              className="absolute left-4 p-2 text-white/80 hover:text-white transition-colors"
            >
              <ArrowLeft size={28} />
            </button>
          )}

          {/* Image */}
          <img
            src={lightboxImages[lightboxIndex]}
            alt={`Photo ${lightboxIndex + 1}`}
            className="max-w-[90vw] max-h-[85vh] object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />

          {/* Next button */}
          {lightboxImages.length > 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                setLightboxIndex((prev) => (prev === lightboxImages.length - 1 ? 0 : prev + 1))
              }}
              className="absolute right-4 p-2 text-white/80 hover:text-white transition-colors rotate-180"
            >
              <ArrowLeft size={28} />
            </button>
          )}
        </div>
      )}
    </div>
  )
}

import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  Mail,
  Phone,
  MessageCircle,
  BedDouble,
  CreditCard,
  Clock,
  Calendar,
  Edit,
  Save,
  X,
  Send,
  CheckCircle,
  AlertCircle,
  Loader2,
  FileText,
  Users,
  User,
  Package,
  Download,
  Plus,
  Minus,
  MessageSquare,
  LogIn,
  LogOut,
  Star,
  RotateCcw,
  Eye,
  ExternalLink,
  RefreshCw,
  XCircle,
} from 'lucide-react'
import Button from '../components/Button'
import PaymentProofCard from '../components/PaymentProofCard'
import {
  ActivityTimeline,
  generateBookingTimeline,
} from '../components/booking-detail'
import type { TimelineEvent } from '../components/booking-detail'
import { bookingsApi, Booking, roomsApi, Room, ProofOfPayment, addonsApi, AddOn, reviewsApi, Review, invoicesApi, Invoice, refundsApi, Refund, RefundStatus } from '../services/api'
import { useNotification } from '../contexts/NotificationContext'
import { useAuth } from '../contexts/AuthContext'

const statusOptions = [
  { value: 'pending', label: 'Pending', color: 'bg-yellow-100 text-yellow-700' },
  { value: 'confirmed', label: 'Confirmed', color: 'bg-emerald-100 text-emerald-700' },
  { value: 'checked_in', label: 'Checked In', color: 'bg-blue-100 text-blue-700' },
  { value: 'checked_out', label: 'Checked Out', color: 'bg-purple-100 text-purple-700' },
  { value: 'cancelled', label: 'Cancelled', color: 'bg-red-100 text-red-700' },
  { value: 'completed', label: 'Completed', color: 'bg-gray-100 text-gray-700' },
]

const paymentStatusOptions = [
  { value: 'pending', label: 'Pending', color: 'bg-gray-100 text-gray-700' },
  { value: 'paid', label: 'Paid', color: 'bg-emerald-100 text-emerald-700' },
  { value: 'partial', label: 'Partial', color: 'bg-blue-100 text-blue-700' },
  { value: 'refunded', label: 'Refunded', color: 'bg-red-100 text-red-700' },
]

interface NightlyRate {
  date: string
  base_price: number
  effective_price: number
  override_price?: number
  seasonal_rate?: {
    id: string
    name: string
    price_per_night: number
  } | null
}

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
  nightly_rates?: NightlyRate[]
  special_requests?: string
  booking_reference?: string
  booked_online?: boolean
}

export default function BookingDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { showSuccess, showError } = useNotification()
  const { tenant, tenantLoading } = useAuth()

  const [booking, setBooking] = useState<Booking | null>(null)
  const [room, setRoom] = useState<Room | null>(null)
  const [_rooms, setRooms] = useState<Room[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [_sendingEmail, setSendingEmail] = useState(false)

  // Editable fields
  const [editForm, setEditForm] = useState({
    guest_name: '',
    guest_email: '',
    guest_phone: '',
    room_id: '',
    room_name: '',
    check_in: '',
    check_out: '',
    status: 'pending' as Booking['status'],
    payment_status: 'pending' as Booking['payment_status'],
    total_amount: 0,
    notes: '',
    internal_notes: '',
  })

  // Proof of payment
  const [proofOfPayment, setProofOfPayment] = useState<ProofOfPayment | null>(null)
  const [uploadingProof, setUploadingProof] = useState(false)

  // Parsed notes
  const [bookingNotes, setBookingNotes] = useState<BookingNotes>({})

  // Addons management
  const [availableAddons, setAvailableAddons] = useState<AddOn[]>([])
  const [loadingAddons, setLoadingAddons] = useState(false)
  const [showAddonSelector, setShowAddonSelector] = useState(false)
  const [selectedAddons, setSelectedAddons] = useState<Map<string, { addon: AddOn; quantity: number }>>(new Map())
  const [savingAddons, setSavingAddons] = useState(false)

  // Nightly rates management
  const [nightlyRates, setNightlyRates] = useState<NightlyRate[]>([])
  const [_loadingRates, setLoadingRates] = useState(false)
  const [_editingRates, setEditingRates] = useState(false)
  const [_savingRates, setSavingRates] = useState(false)

  // Review management
  const [review, setReview] = useState<Review | null>(null)
  const [loadingReview, setLoadingReview] = useState(false)
  const [sendingReviewRequest, setSendingReviewRequest] = useState(false)

  // Lightbox for review images
  const [lightboxImages, setLightboxImages] = useState<string[]>([])
  const [lightboxIndex, setLightboxIndex] = useState(0)
  const [showLightbox, setShowLightbox] = useState(false)

  // Invoice management
  const [invoice, setInvoice] = useState<Invoice | null>(null)
  const [_loadingInvoice, setLoadingInvoice] = useState(false)
  const [generatingInvoice, setGeneratingInvoice] = useState(false)
  const [sendingInvoiceEmail, setSendingInvoiceEmail] = useState(false)

  // Cancel booking
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [cancelling, setCancelling] = useState(false)

  // Refund management
  const [refund, setRefund] = useState<Refund | null>(null)
  const [loadingRefund, setLoadingRefund] = useState(false)

  // CRM: Guest stats
  const [_guestStats, setGuestStats] = useState<{
    totalBookings: number
    totalSpent: number
    firstBooking: string | null
    isReturning: boolean
  } | null>(null)

  // CRM: Activity timeline
  const [timelineEvents, setTimelineEvents] = useState<TimelineEvent[]>([])

  useEffect(() => {
    if (id && tenant && !tenantLoading) {
      loadBooking(id)
    }
  }, [id, tenant, tenantLoading])

  const loadBooking = async (bookingId: string) => {
    try {
      setLoading(true)
      const data = await bookingsApi.getById(bookingId)
      setBooking(data)

      try {
        const notes = data.notes ? JSON.parse(data.notes) : {}
        setBookingNotes(notes)
      } catch {
        setBookingNotes({ special_requests: data.notes || '' })
      }

      setEditForm({
        guest_name: data.guest_name || '',
        guest_email: data.guest_email || '',
        guest_phone: data.guest_phone || '',
        room_id: data.room_id || '',
        room_name: data.room_name || '',
        check_in: data.check_in || '',
        check_out: data.check_out || '',
        status: data.status,
        payment_status: data.payment_status,
        total_amount: data.total_amount,
        notes: data.notes || '',
        internal_notes: data.internal_notes || '',
      })

      setProofOfPayment(data.proof_of_payment || null)

      try {
        const roomsData = await roomsApi.getAll({ is_active: true })
        setRooms(roomsData)
      } catch {
        // Failed to load rooms list
      }

      if (data.room_id) {
        try {
          const roomData = await roomsApi.getById(data.room_id)
          setRoom(roomData)
        } catch {
          // Room might not exist or be accessible
        }
      }

      // Load guest stats (would come from API in production)
      // For now, simulate based on current booking
      setGuestStats({
        totalBookings: 1,
        totalSpent: data.total_amount,
        firstBooking: data.synced_at || null, // Use synced_at as proxy for created date
        isReturning: false, // Would check guest history
      })

      // Generate timeline events
      if (data.id) {
        const events = generateBookingTimeline({
          id: data.id,
          status: data.status,
          payment_status: data.payment_status,
          check_in: data.check_in,
          check_out: data.check_out,
          guest_name: data.guest_name,
          created_at: data.synced_at, // Use synced_at as proxy
        })
        setTimelineEvents(events)
      }

      // Load refund data if booking is cancelled
      if (data.status === 'cancelled' && data.refund_id) {
        try {
          setLoadingRefund(true)
          const refundData = await refundsApi.getById(data.refund_id)
          setRefund(refundData)
        } catch (error) {
          console.error('Failed to load refund:', error)
        } finally {
          setLoadingRefund(false)
        }
      } else {
        setRefund(null)
      }
    } catch (error) {
      console.error('Failed to load booking:', error)
      showError('Error', 'Failed to load booking details')
      navigate('/dashboard/bookings')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!booking?.id) return

    try {
      setSaving(true)
      await bookingsApi.update(booking.id, {
        guest_name: editForm.guest_name,
        guest_email: editForm.guest_email,
        guest_phone: editForm.guest_phone,
        room_id: editForm.room_id,
        room_name: editForm.room_name,
        check_in: editForm.check_in,
        check_out: editForm.check_out,
        status: editForm.status,
        payment_status: editForm.payment_status,
        total_amount: editForm.total_amount,
        internal_notes: editForm.internal_notes,
      })

      showSuccess('Booking Updated', 'The booking has been successfully updated.')
      setIsEditing(false)
      await loadBooking(booking.id)
    } catch (error) {
      console.error('Failed to update booking:', error)
      showError('Update Failed', 'Could not update the booking. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  // All the helper functions (keeping them the same)
  const handleProofUpload = async (file: File) => {
    if (!booking?.id) return

    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'application/pdf']
    if (!allowedTypes.includes(file.type)) {
      showError('Invalid File', 'Please upload a PNG, JPEG, or PDF file.')
      return
    }

    if (file.size > 10 * 1024 * 1024) {
      showError('File Too Large', 'File size must be less than 10MB.')
      return
    }

    setUploadingProof(true)

    try {
      const reader = new FileReader()
      reader.onload = async () => {
        const proof: ProofOfPayment = {
          url: reader.result as string,
          path: `proof/${Date.now()}-${file.name}`,
          filename: file.name,
          uploaded_at: new Date().toISOString(),
        }

        await bookingsApi.update(booking.id!, { proof_of_payment: proof } as any)
        setProofOfPayment(proof)
        showSuccess('Proof Uploaded', 'Proof of payment has been uploaded successfully.')
        setUploadingProof(false)
      }
      reader.readAsDataURL(file)
    } catch (error) {
      console.error('Failed to upload proof:', error)
      showError('Upload Failed', 'Could not upload proof of payment.')
      setUploadingProof(false)
    }
  }

  const handleRemoveProof = async () => {
    if (!booking?.id) return

    try {
      await bookingsApi.update(booking.id, { proof_of_payment: null } as any)
      setProofOfPayment(null)
      showSuccess('Proof Removed', 'Proof of payment has been removed.')
    } catch (error) {
      console.error('Failed to remove proof:', error)
      showError('Error', 'Could not remove proof of payment.')
    }
  }

  const _handleSaveInternalNotes = async () => {
    if (!booking?.id) return

    try {
      await bookingsApi.update(booking.id, { internal_notes: editForm.internal_notes })
      showSuccess('Notes Saved', 'Internal notes have been saved.')
    } catch (error) {
      console.error('Failed to save notes:', error)
      showError('Error', 'Could not save internal notes.')
    }
  }

  const _handleSendConfirmation = async () => {
    if (!booking?.guest_email) {
      showError('No Email', 'This booking does not have an email address.')
      return
    }

    setSendingEmail(true)
    await new Promise((resolve) => setTimeout(resolve, 1500))
    showSuccess('Email Sent', `Booking confirmation sent to ${booking.guest_email}`)
    setSendingEmail(false)
  }

  const _handleSendUpdate = async () => {
    if (!booking?.guest_email) {
      showError('No Email', 'This booking does not have an email address.')
      return
    }

    setSendingEmail(true)
    await new Promise((resolve) => setTimeout(resolve, 1500))
    showSuccess('Update Sent', `Booking update notification sent to ${booking.guest_email}`)
    setSendingEmail(false)
  }

  // Load available addons
  const loadAvailableAddons = async () => {
    setLoadingAddons(true)
    try {
      const addons = await addonsApi.getAll({ is_active: true })
      const filteredAddons = addons.filter(addon =>
        addon.available_for_rooms.length === 0 ||
        (booking?.room_id && addon.available_for_rooms.includes(booking.room_id))
      )
      setAvailableAddons(filteredAddons)
    } catch (error) {
      console.error('Failed to load addons:', error)
      showError('Error', 'Failed to load available add-ons')
    } finally {
      setLoadingAddons(false)
    }
  }

  const _handleOpenAddonSelector = () => {
    loadAvailableAddons()
    const initialSelected = new Map<string, { addon: AddOn; quantity: number }>()
    if (bookingNotes.addons) {
      bookingNotes.addons.forEach(existingAddon => {
        initialSelected.set(existingAddon.id, {
          addon: {
            id: existingAddon.id,
            name: existingAddon.name,
            price: existingAddon.price,
            pricing_type: 'per_booking',
            addon_type: 'service',
            currency: booking?.currency || 'ZAR',
            max_quantity: 10,
            image: null,
            available_for_rooms: [],
            is_active: true,
          },
          quantity: existingAddon.quantity,
        })
      })
    }
    setSelectedAddons(initialSelected)
    setShowAddonSelector(true)
  }

  const updateAddonQuantity = (addon: AddOn, delta: number) => {
    const newSelected = new Map(selectedAddons)
    const current = newSelected.get(addon.id!)

    if (current) {
      const newQty = current.quantity + delta
      if (newQty <= 0) {
        newSelected.delete(addon.id!)
      } else if (newQty <= addon.max_quantity) {
        newSelected.set(addon.id!, { addon, quantity: newQty })
      }
    } else if (delta > 0) {
      newSelected.set(addon.id!, { addon, quantity: 1 })
    }

    setSelectedAddons(newSelected)
  }

  const calculateAddonTotal = (addon: AddOn, quantity: number): number => {
    const nights = calculateNights()
    const guests = bookingNotes.guests || 1

    switch (addon.pricing_type) {
      case 'per_night':
        return addon.price * quantity * nights
      case 'per_guest':
        return addon.price * quantity * guests
      case 'per_guest_per_night':
        return addon.price * quantity * guests * nights
      case 'per_booking':
      default:
        return addon.price * quantity
    }
  }

  const handleSaveAddons = async () => {
    if (!booking?.id) return

    setSavingAddons(true)
    try {
      const addonsList = Array.from(selectedAddons.values()).map(({ addon, quantity }) => ({
        id: addon.id!,
        name: addon.name,
        quantity,
        price: addon.price,
        total: calculateAddonTotal(addon, quantity),
      }))

      const addonsTotal = addonsList.reduce((sum, a) => sum + a.total, 0)
      const roomTotal = room ? room.base_price_per_night * calculateNights() : (booking.total_amount - (bookingNotes.addons?.reduce((s, a) => s + a.total, 0) || 0))
      const newTotal = roomTotal + addonsTotal

      const updatedNotes: BookingNotes = {
        ...bookingNotes,
        addons: addonsList.length > 0 ? addonsList : undefined,
      }

      await bookingsApi.update(booking.id, {
        notes: JSON.stringify(updatedNotes),
        total_amount: newTotal,
      })

      showSuccess('Add-ons Updated', 'The booking add-ons have been updated successfully.')
      setShowAddonSelector(false)
      await loadBooking(booking.id)
    } catch (error) {
      console.error('Failed to save addons:', error)
      showError('Error', 'Failed to update add-ons')
    } finally {
      setSavingAddons(false)
    }
  }

  const _handleRemoveAddon = async (addonId: string) => {
    if (!booking?.id) return

    try {
      const updatedAddons = bookingNotes.addons?.filter(a => a.id !== addonId) || []
      const removedAddon = bookingNotes.addons?.find(a => a.id === addonId)

      const updatedNotes: BookingNotes = {
        ...bookingNotes,
        addons: updatedAddons.length > 0 ? updatedAddons : undefined,
      }

      const newTotal = booking.total_amount - (removedAddon?.total || 0)

      await bookingsApi.update(booking.id, {
        notes: JSON.stringify(updatedNotes),
        total_amount: newTotal,
      })

      showSuccess('Add-on Removed', 'The add-on has been removed from this booking.')
      await loadBooking(booking.id)
    } catch (error) {
      console.error('Failed to remove addon:', error)
      showError('Error', 'Failed to remove add-on')
    }
  }

  // Load nightly rates
  const loadNightlyRates = async () => {
    if (!booking?.room_id || !booking?.check_in || !booking?.check_out) return

    setLoadingRates(true)
    try {
      const batchPricing = await roomsApi.getBatchPrices(
        booking.room_id,
        booking.check_in,
        booking.check_out
      )

      const savedRates = bookingNotes.nightly_rates || []
      const mergedRates: NightlyRate[] = batchPricing.nights.map(night => {
        const savedRate = savedRates.find(r => r.date === night.date)
        return {
          date: night.date,
          base_price: night.base_price,
          effective_price: night.effective_price,
          override_price: savedRate?.override_price,
          seasonal_rate: night.seasonal_rate,
        }
      })

      setNightlyRates(mergedRates)
    } catch (error) {
      console.error('Failed to load nightly rates:', error)
    } finally {
      setLoadingRates(false)
    }
  }

  const _handleRateChange = (date: string, newPrice: number) => {
    setNightlyRates(prev =>
      prev.map(rate =>
        rate.date === date
          ? { ...rate, override_price: newPrice }
          : rate
      )
    )
  }

  const _handleResetRate = (date: string) => {
    setNightlyRates(prev =>
      prev.map(rate =>
        rate.date === date
          ? { ...rate, override_price: undefined }
          : rate
      )
    )
  }

  const calculateRatesTotal = (): number => {
    return nightlyRates.reduce((sum, rate) => {
      const price = rate.override_price ?? rate.effective_price
      return sum + price
    }, 0)
  }

  const _handleSaveRates = async () => {
    if (!booking?.id) return

    setSavingRates(true)
    try {
      const ratesToSave = nightlyRates.filter(r => r.override_price !== undefined)

      const updatedNotes: BookingNotes = {
        ...bookingNotes,
        nightly_rates: ratesToSave.length > 0 ? nightlyRates : undefined,
      }

      const roomTotal = calculateRatesTotal()
      const addonsTotal = bookingNotes.addons?.reduce((sum, a) => sum + a.total, 0) || 0
      const newTotal = roomTotal + addonsTotal

      await bookingsApi.update(booking.id, {
        notes: JSON.stringify(updatedNotes),
        total_amount: newTotal,
      })

      showSuccess('Rates Updated', 'Nightly rates have been updated successfully.')
      setEditingRates(false)
      await loadBooking(booking.id)
    } catch (error) {
      console.error('Failed to save rates:', error)
      showError('Error', 'Failed to update nightly rates')
    } finally {
      setSavingRates(false)
    }
  }

  useEffect(() => {
    if (booking?.room_id && booking?.check_in && booking?.check_out) {
      loadNightlyRates()
    }
  }, [booking?.room_id, booking?.check_in, booking?.check_out, bookingNotes.nightly_rates])

  // Load review when booking loads
  useEffect(() => {
    if (booking?.id && tenant) {
      loadReview(booking.id)
    }
  }, [booking?.id, tenant])

  // Load invoice when booking loads
  useEffect(() => {
    if (booking?.id && tenant) {
      loadInvoice(booking.id)
    }
  }, [booking?.id, tenant])

  const loadReview = async (bookingId: string) => {
    setLoadingReview(true)
    try {
      const result = await reviewsApi.getByBookingId(bookingId)
      if (result.hasReview) {
        setReview(result as Review)
      } else {
        setReview(null)
      }
    } catch {
      setReview(null)
    } finally {
      setLoadingReview(false)
    }
  }

  const loadInvoice = async (bookingId: string) => {
    setLoadingInvoice(true)
    try {
      const result = await invoicesApi.getByBookingId(bookingId)
      setInvoice(result)
    } catch {
      setInvoice(null)
    } finally {
      setLoadingInvoice(false)
    }
  }

  const handleGenerateInvoice = async () => {
    if (!booking?.id) return

    setGeneratingInvoice(true)
    try {
      const result = await invoicesApi.generate(booking.id)
      setInvoice(result)
      showSuccess('Invoice Generated', `Invoice ${result.invoice_number} has been created.`)
    } catch (error: any) {
      showError('Error', error.message || 'Failed to generate invoice')
    } finally {
      setGeneratingInvoice(false)
    }
  }

  const _handleDownloadInvoice = async () => {
    if (!invoice) return

    try {
      await invoicesApi.download(invoice.id, invoice.invoice_number)
    } catch (error: any) {
      showError('Error', error.message || 'Failed to download invoice')
    }
  }

  const handleSendInvoiceEmail = async () => {
    if (!invoice || !booking?.guest_email) return

    setSendingInvoiceEmail(true)
    try {
      await invoicesApi.sendEmail(invoice.id)
      showSuccess('Invoice Sent', `Invoice sent to ${booking.guest_email}`)
      await loadInvoice(booking.id!)
    } catch (error: any) {
      showError('Error', error.message || 'Failed to send invoice')
    } finally {
      setSendingInvoiceEmail(false)
    }
  }

  const _handleSendInvoiceWhatsApp = async () => {
    if (!invoice || !booking?.guest_phone) return

    try {
      const result = await invoicesApi.getWhatsAppLink(invoice.id)
      window.open(result.url, '_blank')
      await loadInvoice(booking.id!)
    } catch (error: any) {
      showError('Error', error.message || 'Failed to open WhatsApp')
    }
  }

  const handleSendReviewRequest = async () => {
    if (!booking?.id) return

    setSendingReviewRequest(true)
    try {
      const result = await reviewsApi.sendRequest(booking.id)
      showSuccess('Review Request Sent', result.message)
      // Reload booking to update the review_request_sent_at field
      await loadBooking(booking.id)
    } catch (error: any) {
      showError('Error', error.message || 'Failed to send review request')
    } finally {
      setSendingReviewRequest(false)
    }
  }

  const isReviewEligible = () => {
    if (!booking) return false
    return (
      ['checked_out', 'completed'].includes(booking.status) &&
      booking.payment_status === 'paid'
    )
  }

  const handleCancelBooking = async () => {
    if (!booking?.id) return

    setCancelling(true)
    try {
      await bookingsApi.update(booking.id, { status: 'cancelled' })
      showSuccess('Booking Cancelled', 'The reservation has been cancelled.')
      setShowCancelModal(false)
      await loadBooking(booking.id)
    } catch (error) {
      console.error('Failed to cancel booking:', error)
      showError('Error', 'Failed to cancel the booking. Please try again.')
    } finally {
      setCancelling(false)
    }
  }

  const canCancelBooking = () => {
    if (!booking) return false
    return !['cancelled', 'checked_out', 'completed'].includes(booking.status)
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

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: currency || 'ZAR',
    }).format(amount)
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

  // Legacy _renderSectionContent function removed - using new portal-style layout


  if (loading || tenantLoading || (!tenant && !loading)) {
    return (
      <div className="min-h-full bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-emerald-500" />
          <p className="text-gray-500">Loading booking details...</p>
        </div>
      </div>
    )
  }

  if (!booking) {
    return (
      <div className="min-h-full bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 mx-auto mb-4 text-red-500" />
          <h2 className="text-xl font-semibold mb-2">Booking Not Found</h2>
          <p className="text-gray-500 mb-4">The booking you're looking for doesn't exist.</p>
          <Button onClick={() => navigate('/dashboard/bookings')}>
            Back to Bookings
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-gray-50 min-h-full">
      {/* Hero Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-6 py-6">
          <button
            onClick={() => navigate('/dashboard/bookings')}
            className="flex items-center text-gray-500 hover:text-gray-900 mb-4 transition-colors text-sm"
          >
            <ArrowLeft size={16} className="mr-1.5" />
            Back to Bookings
          </button>

          <div className="flex flex-col lg:flex-row lg:items-start gap-6">
            {/* Room Image */}
            <div className="flex-shrink-0">
              {room?.images?.featured?.url ? (
                <img
                  src={room.images.featured.url}
                  alt={room?.name || 'Room'}
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
                {isEditing ? (
                  <select
                    value={editForm.status}
                    onChange={(e) => setEditForm({ ...editForm, status: e.target.value as Booking['status'] })}
                    className={`px-2.5 py-0.5 text-xs font-medium rounded-full border-0 ${getStatusColor(editForm.status)}`}
                  >
                    {statusOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                ) : (
                  <span className={`inline-flex px-2.5 py-0.5 text-xs font-medium rounded-full ${getStatusColor(booking.status)}`}>
                    {getStatusLabel(booking.status)}
                  </span>
                )}
                {isEditing ? (
                  <select
                    value={editForm.payment_status}
                    onChange={(e) => setEditForm({ ...editForm, payment_status: e.target.value as Booking['payment_status'] })}
                    className={`px-2.5 py-0.5 text-xs font-medium rounded-full border-0 ${getPaymentStatusColor(editForm.payment_status)}`}
                  >
                    {paymentStatusOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                ) : (
                  <span className={`inline-flex px-2.5 py-0.5 text-xs font-medium rounded-full ${getPaymentStatusColor(booking.payment_status)}`}>
                    {getPaymentStatusLabel(booking.payment_status)}
                  </span>
                )}
                {bookingNotes.booking_reference && (
                  <span className="text-xs text-gray-500 font-mono">
                    #{bookingNotes.booking_reference}
                  </span>
                )}
              </div>

              <h1 className="text-2xl font-bold text-gray-900 mb-1">
                {booking.room_name || 'Room'}
              </h1>
              <p className="text-gray-600 mb-4">
                {booking.guest_name}
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

            {/* Price & Quick Actions */}
            <div className="flex-shrink-0 lg:text-right space-y-3">
              <div>
                <p className="text-sm text-gray-500 mb-1">Total</p>
                <p className="text-3xl font-bold text-emerald-600">
                  {formatCurrency(booking.total_amount, booking.currency)}
                </p>
              </div>

              {/* Quick Contact */}
              <div className="flex gap-1 lg:justify-end">
                <button
                  onClick={() => booking.guest_phone && window.open(`tel:${booking.guest_phone}`)}
                  disabled={!booking.guest_phone}
                  title={booking.guest_phone ? `Call ${booking.guest_phone}` : 'No phone number'}
                  className="w-9 h-9 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center hover:bg-blue-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <Phone size={16} />
                </button>
                <button
                  onClick={() => booking.guest_email && window.open(`mailto:${booking.guest_email}`)}
                  disabled={!booking.guest_email}
                  title={booking.guest_email ? `Email ${booking.guest_email}` : 'No email'}
                  className="w-9 h-9 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center hover:bg-emerald-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <Mail size={16} />
                </button>
                <button
                  onClick={() => booking.guest_phone && window.open(`https://wa.me/${booking.guest_phone.replace(/[^0-9]/g, '')}`)}
                  disabled={!booking.guest_phone}
                  title={booking.guest_phone ? `WhatsApp ${booking.guest_phone}` : 'No phone number'}
                  className="w-9 h-9 rounded-full bg-green-100 text-green-600 flex items-center justify-center hover:bg-green-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <MessageCircle size={16} />
                </button>
              </div>

              {/* Edit/Save Buttons */}
              <div className="flex gap-2 lg:justify-end">
                {isEditing ? (
                  <>
                    <button
                      onClick={() => setIsEditing(false)}
                      className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSave}
                      disabled={saving}
                      className="px-3 py-1.5 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50 flex items-center gap-1.5"
                    >
                      {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                      Save
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="px-3 py-1.5 text-sm bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors flex items-center gap-1.5"
                  >
                    <Edit size={14} />
                    Edit
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Guest Review - Prominently displayed at top */}
            {loadingReview ? (
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <div className="flex items-center justify-center py-4">
                  <Loader2 size={20} className="animate-spin text-gray-400" />
                </div>
              </div>
            ) : review ? (
              <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl border border-amber-200 p-5">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-semibold text-amber-800 uppercase tracking-wide flex items-center gap-2">
                    <Star size={16} className="fill-amber-500 text-amber-500" />
                    Guest Review
                  </h2>
                  <button
                    onClick={() => navigate('/dashboard/reviews')}
                    className="text-xs text-amber-700 hover:text-amber-900 font-medium"
                  >
                    Manage Review
                  </button>
                </div>

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
                  <span className="font-semibold text-gray-900">{review.rating.toFixed(1)}</span>
                  <span className="text-xs text-gray-500">
                    {review.created_at && new Date(review.created_at).toLocaleDateString('en-ZA', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric'
                    })}
                  </span>
                </div>

                {/* Category Ratings */}
                {(review.rating_cleanliness || review.rating_service || review.rating_location || review.rating_value || review.rating_safety) && (
                  <div className="grid grid-cols-5 gap-2 mb-4">
                    {review.rating_cleanliness && (
                      <div className="text-center">
                        <p className="text-xs text-gray-500">Clean</p>
                        <p className="text-sm font-semibold text-gray-900">{review.rating_cleanliness}</p>
                      </div>
                    )}
                    {review.rating_service && (
                      <div className="text-center">
                        <p className="text-xs text-gray-500">Service</p>
                        <p className="text-sm font-semibold text-gray-900">{review.rating_service}</p>
                      </div>
                    )}
                    {review.rating_location && (
                      <div className="text-center">
                        <p className="text-xs text-gray-500">Location</p>
                        <p className="text-sm font-semibold text-gray-900">{review.rating_location}</p>
                      </div>
                    )}
                    {review.rating_value && (
                      <div className="text-center">
                        <p className="text-xs text-gray-500">Value</p>
                        <p className="text-sm font-semibold text-gray-900">{review.rating_value}</p>
                      </div>
                    )}
                    {review.rating_safety && (
                      <div className="text-center">
                        <p className="text-xs text-gray-500">Safety</p>
                        <p className="text-sm font-semibold text-gray-900">{review.rating_safety}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Review Title & Content */}
                {review.title && (
                  <h3 className="font-medium text-gray-900 mb-2">"{review.title}"</h3>
                )}
                {review.content && (
                  <p className="text-gray-700 text-sm mb-4">{review.content}</p>
                )}

                {/* Review Images */}
                {review.images && review.images.length > 0 && (
                  <div className="flex gap-2 mb-4">
                    {review.images.filter(img => !img.hidden).slice(0, 4).map((img, idx) => (
                      <button
                        key={idx}
                        onClick={() => {
                          const visibleImages = review.images!.filter(i => !i.hidden).map(i => i.url)
                          setLightboxImages(visibleImages)
                          setLightboxIndex(idx)
                          setShowLightbox(true)
                        }}
                        className="w-16 h-16 rounded-lg overflow-hidden bg-gray-100 hover:opacity-90 transition-opacity"
                      >
                        <img src={img.url} alt={`Review ${idx + 1}`} className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}

                {/* Owner Response */}
                {review.owner_response ? (
                  <div className="bg-white/60 rounded-lg p-3 border border-amber-100">
                    <p className="text-xs text-gray-500 mb-1 flex items-center gap-1">
                      <MessageSquare size={12} />
                      Your Response
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
                ) : (
                  <button
                    onClick={() => navigate('/dashboard/reviews')}
                    className="text-sm text-amber-700 hover:text-amber-900 font-medium flex items-center gap-1"
                  >
                    <MessageSquare size={14} />
                    Add a response
                  </button>
                )}
              </div>
            ) : null}

            {/* Check-in / Check-out Details */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="grid grid-cols-2 divide-x divide-gray-200">
                <div className="p-5">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Check-in</p>
                  {isEditing ? (
                    <input
                      type="date"
                      value={editForm.check_in}
                      onChange={(e) => setEditForm({ ...editForm, check_in: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                    />
                  ) : (
                    <>
                      <p className="text-lg font-semibold text-gray-900">{formatDate(booking.check_in)}</p>
                      <p className="text-sm text-emerald-600 mt-1">From 14:00</p>
                    </>
                  )}
                </div>
                <div className="p-5">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Check-out</p>
                  {isEditing ? (
                    <input
                      type="date"
                      value={editForm.check_out}
                      onChange={(e) => setEditForm({ ...editForm, check_out: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                    />
                  ) : (
                    <>
                      <p className="text-lg font-semibold text-gray-900">{formatDate(booking.check_out)}</p>
                      <p className="text-sm text-emerald-600 mt-1">Until 10:00</p>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Guest Details */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-4">Guest Details</h2>
              {isEditing ? (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Name</label>
                    <input
                      type="text"
                      value={editForm.guest_name}
                      onChange={(e) => setEditForm({ ...editForm, guest_name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Email</label>
                    <input
                      type="email"
                      value={editForm.guest_email}
                      onChange={(e) => setEditForm({ ...editForm, guest_email: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Phone</label>
                    <input
                      type="tel"
                      value={editForm.guest_phone}
                      onChange={(e) => setEditForm({ ...editForm, guest_phone: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                    />
                  </div>
                </div>
              ) : (
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
              )}
            </div>

            {/* Add-ons & Extras */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide flex items-center gap-2">
                  <Package size={16} />
                  Add-ons & Extras
                </h2>
                <button
                  onClick={() => {
                    setShowAddonSelector(true)
                    loadAvailableAddons()
                  }}
                  className="text-sm text-emerald-600 hover:text-emerald-700 font-medium flex items-center gap-1"
                >
                  <Plus size={14} />
                  Manage
                </button>
              </div>

              {bookingNotes.addons && bookingNotes.addons.length > 0 ? (
                <div className="space-y-3">
                  {bookingNotes.addons.map((addon, index) => (
                    <div key={index} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                          <Package size={14} className="text-emerald-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{addon.name}</p>
                          <p className="text-xs text-gray-500">Qty: {addon.quantity}</p>
                        </div>
                      </div>
                      <p className="text-sm font-semibold text-gray-900">
                        {formatCurrency(addon.total, booking.currency)}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500 text-center py-4">No add-ons for this booking</p>
              )}
            </div>

            {/* Special Requests */}
            {bookingNotes.special_requests && (
              <div className="bg-amber-50 rounded-xl border border-amber-200 p-5">
                <h2 className="text-sm font-semibold text-amber-800 uppercase tracking-wide mb-2 flex items-center gap-2">
                  <MessageSquare size={16} />
                  Special Requests
                </h2>
                <p className="text-gray-700 whitespace-pre-wrap">{bookingNotes.special_requests}</p>
              </div>
            )}

            {/* Internal Notes */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-4 flex items-center gap-2">
                <FileText size={16} />
                Internal Notes
              </h2>
              <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl">
                <textarea
                  value={editForm.internal_notes}
                  onChange={(e) => setEditForm({ ...editForm, internal_notes: e.target.value })}
                  placeholder="Add private notes about this booking (only visible to staff)..."
                  rows={4}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-500/20 focus:border-accent-500 resize-none bg-white"
                />
                {editForm.internal_notes !== (booking.internal_notes || '') && (
                  <div className="flex justify-end gap-2 mt-3">
                    <button
                      onClick={() => setEditForm({ ...editForm, internal_notes: booking.internal_notes || '' })}
                      className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800 font-medium rounded-lg hover:bg-white"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={async () => {
                        try {
                          await bookingsApi.update(booking.id!, { internal_notes: editForm.internal_notes })
                          showSuccess('Notes Saved', 'Internal notes have been saved.')
                          await loadBooking(booking.id!)
                        } catch (error) {
                          console.error('Failed to save notes:', error)
                          showError('Error', 'Could not save internal notes.')
                        }
                      }}
                      className="flex items-center gap-1 px-3 py-1.5 text-sm text-white bg-accent-600 hover:bg-accent-700 font-medium rounded-lg"
                    >
                      <Save size={14} />
                      Save Notes
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column - Sidebar */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-4">Quick Actions</h2>
              <div className="space-y-2">
                {booking.status === 'pending' && (
                  <button
                    onClick={async () => {
                      await bookingsApi.update(booking.id!, { status: 'confirmed' })
                      showSuccess('Booking Confirmed', 'The booking has been confirmed.')
                      loadBooking(booking.id!)
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 bg-emerald-50 text-emerald-700 rounded-lg hover:bg-emerald-100 transition-colors"
                  >
                    <CheckCircle size={18} />
                    <span className="font-medium">Confirm Booking</span>
                  </button>
                )}
                {booking.status === 'confirmed' && (
                  <button
                    onClick={async () => {
                      await bookingsApi.update(booking.id!, { status: 'checked_in' })
                      showSuccess('Guest Checked In', 'The guest has been checked in.')
                      loadBooking(booking.id!)
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors"
                  >
                    <LogIn size={18} />
                    <span className="font-medium">Check In Guest</span>
                  </button>
                )}
                {booking.status === 'checked_in' && (
                  <button
                    onClick={async () => {
                      await bookingsApi.update(booking.id!, { status: 'checked_out' })
                      showSuccess('Guest Checked Out', 'The guest has been checked out.')
                      loadBooking(booking.id!)
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100 transition-colors"
                  >
                    <LogOut size={18} />
                    <span className="font-medium">Check Out Guest</span>
                  </button>
                )}
                {booking.payment_status !== 'paid' && (
                  <button
                    onClick={async () => {
                      await bookingsApi.update(booking.id!, { payment_status: 'paid' })
                      showSuccess('Payment Recorded', 'The payment has been marked as paid.')
                      loadBooking(booking.id!)
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 bg-teal-50 text-teal-700 rounded-lg hover:bg-teal-100 transition-colors"
                  >
                    <CreditCard size={18} />
                    <span className="font-medium">Mark as Paid</span>
                  </button>
                )}
                {/* Review Button - shows different states */}
                {review ? (
                  // Review exists - Go to Review button
                  <button
                    onClick={() => navigate('/dashboard/reviews')}
                    className="w-full flex items-center gap-3 px-4 py-3 bg-emerald-50 text-emerald-700 rounded-lg hover:bg-emerald-100 transition-colors"
                  >
                    <Star size={18} className="fill-emerald-500" />
                    <div className="text-left">
                      <span className="font-medium block">Go to Review</span>
                      <span className="text-xs text-emerald-600">View and manage guest review</span>
                    </div>
                  </button>
                ) : booking?.review_request_sent_at ? (
                  // Request sent but no review yet - disabled with date
                  <div className="w-full flex items-center gap-3 px-4 py-3 bg-gray-50 text-gray-500 rounded-lg cursor-not-allowed">
                    <Star size={18} />
                    <div className="text-left">
                      <span className="font-medium block">Review Request Sent</span>
                      <span className="text-xs text-gray-400">
                        Sent on {new Date(booking.review_request_sent_at).toLocaleDateString('en-ZA', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </span>
                    </div>
                  </div>
                ) : isReviewEligible() ? (
                  // Eligible but no request sent - Request Review button
                  <button
                    onClick={handleSendReviewRequest}
                    disabled={sendingReviewRequest}
                    className="w-full flex items-center gap-3 px-4 py-3 bg-amber-50 text-amber-700 rounded-lg hover:bg-amber-100 transition-colors disabled:opacity-50"
                  >
                    {sendingReviewRequest ? (
                      <Loader2 size={18} className="animate-spin" />
                    ) : (
                      <Star size={18} />
                    )}
                    <div className="text-left">
                      <span className="font-medium block">Request Review</span>
                      <span className="text-xs text-amber-600">Send guest a review request</span>
                    </div>
                  </button>
                ) : null}
                {!['cancelled', 'checked_out', 'completed'].includes(booking.status) && (
                  <button
                    onClick={() => setShowCancelModal(true)}
                    className="w-full flex items-center gap-3 px-4 py-3 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition-colors"
                  >
                    <X size={18} />
                    <span className="font-medium">Cancel Booking</span>
                  </button>
                )}
              </div>
            </div>

            {/* Payment & Invoice */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-4 flex items-center gap-2">
                <CreditCard size={16} />
                Payment
              </h2>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Status</span>
                  <span className={`font-medium px-2 py-0.5 rounded-full text-xs ${getPaymentStatusColor(booking.payment_status)}`}>
                    {getPaymentStatusLabel(booking.payment_status)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Total</span>
                  <span className="font-semibold text-gray-900">{formatCurrency(booking.total_amount, booking.currency)}</span>
                </div>

                {/* Invoice Actions */}
                <div className="pt-3 border-t border-gray-100 space-y-2">
                  {invoice ? (
                    <>
                      <a
                        href={invoice.pdf_url || '#'}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
                      >
                        <Download size={14} />
                        Download Invoice
                      </a>
                      <button
                        onClick={handleSendInvoiceEmail}
                        disabled={sendingInvoiceEmail}
                        className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-emerald-100 text-emerald-700 rounded-lg hover:bg-emerald-200 transition-colors text-sm font-medium disabled:opacity-50"
                      >
                        {sendingInvoiceEmail ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                        Email Invoice
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={handleGenerateInvoice}
                      disabled={generatingInvoice}
                      className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium disabled:opacity-50"
                    >
                      {generatingInvoice ? <Loader2 size={14} className="animate-spin" /> : <FileText size={14} />}
                      Generate Invoice
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Proof of Payment */}
            <PaymentProofCard
              paymentMethod={booking.payment_method || null}
              paymentReference={booking.payment_reference || null}
              paymentCompletedAt={booking.payment_completed_at || null}
              proofOfPayment={proofOfPayment}
              onUploadProof={handleProofUpload}
              onRemoveProof={handleRemoveProof}
              uploading={uploadingProof}
              canEdit={true}
            />

            {/* Refund Section - Shows for cancelled bookings */}
            {booking.status === 'cancelled' && (
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
                    {/* Status Badge with Icon */}
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
                        <p>Refund request submitted, pending review.</p>
                      )}
                      {refund.status === 'under_review' && (
                        <p>Refund request is currently being reviewed.</p>
                      )}
                      {refund.status === 'approved' && (
                        <p>Refund approved! Ready for processing.</p>
                      )}
                      {refund.status === 'processing' && (
                        <p>Refund is being processed. Funds should appear in the customer's account within a few business days.</p>
                      )}
                      {refund.status === 'completed' && (
                        <p>Refund has been processed successfully.</p>
                      )}
                      {refund.status === 'rejected' && (
                        <>
                          <p>Refund request was rejected.</p>
                          {refund.rejection_reason && (
                            <p className="mt-2"><strong>Reason:</strong> {refund.rejection_reason}</p>
                          )}
                        </>
                      )}
                      {refund.status === 'failed' && (
                        <p>There was an issue processing this refund. Please check the refund details.</p>
                      )}
                    </div>

                    {/* Amount Details */}
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Original Amount</span>
                        <span className="text-gray-900">{formatCurrency(refund.original_amount || booking.total_amount, booking.currency)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Eligible Refund</span>
                        <span className="text-gray-900">
                          {formatCurrency(refund.eligible_amount || 0, booking.currency)}
                          {refund.refund_percentage && (
                            <span className="text-gray-500 ml-1">({refund.refund_percentage}%)</span>
                          )}
                        </span>
                      </div>
                      {refund.approved_amount !== null && refund.approved_amount !== undefined && (
                        <div className="flex justify-between text-sm font-medium">
                          <span className="text-accent-600">Approved Amount</span>
                          <span className="text-accent-600">{formatCurrency(refund.approved_amount, booking.currency)}</span>
                        </div>
                      )}
                      {refund.processed_amount !== null && refund.processed_amount !== undefined && refund.status === 'completed' && (
                        <div className="flex justify-between text-sm font-medium pt-2 border-t border-gray-200">
                          <span className="text-green-600">Refunded</span>
                          <span className="text-green-600">{formatCurrency(refund.processed_amount, booking.currency)}</span>
                        </div>
                      )}
                    </div>

                    {/* Manage Refund Button */}
                    <div className="pt-3 border-t border-gray-100">
                      <button
                        onClick={() => navigate(`/dashboard/refunds/${refund.id}`)}
                        className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-accent-500 text-white rounded-lg hover:bg-accent-600 transition-colors text-sm font-medium"
                      >
                        <Eye size={14} />
                        Manage Refund
                      </button>
                    </div>
                  </div>
                ) : booking.refund_requested ? (
                  <div className="text-center py-4">
                    <p className="text-sm text-gray-500">Refund requested but not yet created.</p>
                    <button
                      onClick={() => navigate('/dashboard/refunds')}
                      className="mt-2 text-sm text-accent-600 hover:text-accent-700 font-medium"
                    >
                      Go to Refunds
                    </button>
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <p className="text-sm text-gray-500">No refund was requested for this booking.</p>
                  </div>
                )}
              </div>
            )}

            {/* Activity Timeline */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-4">Activity</h2>
              <ActivityTimeline events={timelineEvents} maxEvents={5} />
            </div>

            {/* Booking Reference */}
            <div className="bg-gray-50 rounded-xl p-4 text-center">
              <p className="text-xs text-gray-500 mb-1">Booking Reference</p>
              <p className="font-mono text-sm font-medium text-gray-900">
                {bookingNotes.booking_reference || booking.id?.slice(0, 8).toUpperCase()}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Add-on Selector Modal */}
      {showAddonSelector && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[80vh] overflow-hidden">
            <div className="bg-gradient-to-r from-emerald-600 to-emerald-500 px-6 py-5">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-white">Manage Add-ons</h3>
                <button
                  onClick={() => setShowAddonSelector(false)}
                  className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            <div className="p-4 overflow-y-auto max-h-[50vh]">
              {loadingAddons ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                </div>
              ) : availableAddons.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Package size={32} className="mx-auto mb-2 opacity-50" />
                  <p>No add-ons available</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {availableAddons.map((addon) => {
                    const selected = selectedAddons.get(addon.id!)
                    const quantity = selected?.quantity || 0
                    const total = calculateAddonTotal(addon, quantity)

                    return (
                      <div
                        key={addon.id}
                        className={`p-4 border rounded-xl transition-colors ${
                          quantity > 0 ? 'border-emerald-400 bg-emerald-50' : 'border-gray-200'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1">
                            <p className="font-medium text-gray-900">{addon.name}</p>
                            <p className="text-sm text-gray-600 mt-1">
                              {formatCurrency(addon.price, addon.currency)}
                              <span className="text-gray-400 ml-1">/ {addon.pricing_type.replace(/_/g, ' ')}</span>
                            </p>
                          </div>
                          <div className="flex items-center gap-3">
                            {quantity > 0 && (
                              <span className="text-sm font-medium text-emerald-600">
                                {formatCurrency(total, addon.currency)}
                              </span>
                            )}
                            <div className="flex items-center border border-gray-300 rounded-lg">
                              <button
                                onClick={() => updateAddonQuantity(addon, -1)}
                                disabled={quantity === 0}
                                className="p-2 text-gray-500 hover:bg-gray-100 disabled:opacity-30 rounded-l-lg"
                              >
                                <Minus size={16} />
                              </button>
                              <span className="w-10 text-center font-medium">{quantity}</span>
                              <button
                                onClick={() => updateAddonQuantity(addon, 1)}
                                disabled={quantity >= addon.max_quantity}
                                className="p-2 text-gray-500 hover:bg-gray-100 disabled:opacity-30 rounded-r-lg"
                              >
                                <Plus size={16} />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            <div className="p-4 border-t border-gray-200 bg-gray-50">
              {selectedAddons.size > 0 && (
                <div className="mb-4 pb-4 border-b border-gray-200">
                  <div className="flex justify-between">
                    <span className="font-medium text-gray-700">Add-ons Total</span>
                    <span className="font-bold text-gray-900">
                      {formatCurrency(
                        Array.from(selectedAddons.values()).reduce(
                          (sum, { addon, quantity }) => sum + calculateAddonTotal(addon, quantity),
                          0
                        ),
                        booking.currency
                      )}
                    </span>
                  </div>
                </div>
              )}
              <div className="flex gap-3">
                <button
                  onClick={() => setShowAddonSelector(false)}
                  className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveAddons}
                  disabled={savingAddons}
                  className="flex-1 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2 font-medium"
                >
                  {savingAddons ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Booking Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden">
            <div className="bg-red-600 px-6 py-4">
              <h3 className="text-lg font-semibold text-white">Cancel Reservation</h3>
            </div>
            <div className="p-6">
              <div className="flex items-start gap-4 mb-4">
                <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                  <AlertCircle className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <p className="text-gray-900 font-medium">Are you sure you want to cancel this reservation?</p>
                  <p className="text-sm text-gray-500 mt-1">
                    This will cancel the booking for <strong>{booking.guest_name}</strong>.
                  </p>
                </div>
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                <p className="text-sm text-amber-800">
                  <strong>Note:</strong> This action cannot be undone.
                </p>
              </div>
            </div>
            <div className="px-6 py-4 bg-gray-50 flex gap-3 justify-end">
              <button
                onClick={() => setShowCancelModal(false)}
                disabled={cancelling}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-100 transition-colors disabled:opacity-50"
              >
                Keep Reservation
              </button>
              <button
                onClick={handleCancelBooking}
                disabled={cancelling}
                className="px-4 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center gap-2"
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

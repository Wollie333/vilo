import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  Calendar,
  User,
  Mail,
  Phone,
  BedDouble,
  CreditCard,
  Clock,
  Edit,
  Save,
  X,
  Send,
  CheckCircle,
  AlertCircle,
  Loader2,
  FileText,
  Users,
  Package,
  StickyNote,
  Upload,
  File,
  Trash2,
  Download,
  Plus,
  Minus,
  RotateCcw,
  DollarSign,
  Star,
  MessageSquare,
} from 'lucide-react'
import Button from '../components/Button'
import StarRating from '../components/StarRating'
import SourceBadge from '../components/SourceBadge'
import DateRangePicker from '../components/DateRangePicker'
import { bookingsApi, Booking, roomsApi, Room, ProofOfPayment, addonsApi, AddOn, reviewsApi, Review, invoicesApi, Invoice, BookingSource } from '../services/api'
import { useNotification } from '../contexts/NotificationContext'
import { useAuth } from '../contexts/AuthContext'

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

interface NightlyRate {
  date: string
  base_price: number
  effective_price: number
  override_price?: number // Manual override by user
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
  nightly_rates?: NightlyRate[] // Store manual rate overrides
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
  const [rooms, setRooms] = useState<Room[]>([]) // All available rooms for switching
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [sendingEmail, setSendingEmail] = useState(false)

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
  const proofInputRef = useRef<HTMLInputElement>(null)

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
  const [loadingRates, setLoadingRates] = useState(false)
  const [editingRates, setEditingRates] = useState(false)
  const [savingRates, setSavingRates] = useState(false)

  // Review management
  const [review, setReview] = useState<Review | null>(null)
  const [loadingReview, setLoadingReview] = useState(false)
  const [sendingReviewRequest, setSendingReviewRequest] = useState(false)

  // Invoice management
  const [invoice, setInvoice] = useState<Invoice | null>(null)
  const [loadingInvoice, setLoadingInvoice] = useState(false)
  const [generatingInvoice, setGeneratingInvoice] = useState(false)
  const [sendingInvoiceEmail, setSendingInvoiceEmail] = useState(false)

  // Cancel booking
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [cancelling, setCancelling] = useState(false)

  useEffect(() => {
    // Wait for tenant to be loaded before fetching booking
    if (id && tenant && !tenantLoading) {
      loadBooking(id)
    }
  }, [id, tenant, tenantLoading])

  const loadBooking = async (bookingId: string) => {
    try {
      setLoading(true)
      const data = await bookingsApi.getById(bookingId)
      setBooking(data)

      // Parse notes if JSON
      try {
        const notes = data.notes ? JSON.parse(data.notes) : {}
        setBookingNotes(notes)
      } catch {
        setBookingNotes({ special_requests: data.notes || '' })
      }

      // Initialize edit form
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

      // Set proof of payment
      setProofOfPayment(data.proof_of_payment || null)

      // Load all available rooms for room switching
      try {
        const roomsData = await roomsApi.getAll({ is_active: true })
        setRooms(roomsData)
      } catch {
        // Failed to load rooms list
      }

      // Load room details if available
      if (data.room_id) {
        try {
          const roomData = await roomsApi.getById(data.room_id)
          setRoom(roomData)
        } catch {
          // Room might not exist or be accessible
        }
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

  const handleProofUpload = async (file: File) => {
    if (!booking?.id) return

    // Validate file type
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'application/pdf']
    if (!allowedTypes.includes(file.type)) {
      showError('Invalid File', 'Please upload a PNG, JPEG, or PDF file.')
      return
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      showError('File Too Large', 'File size must be less than 10MB.')
      return
    }

    setUploadingProof(true)

    try {
      // Convert file to base64
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

  const handleSaveInternalNotes = async () => {
    if (!booking?.id) return

    try {
      await bookingsApi.update(booking.id, { internal_notes: editForm.internal_notes })
      showSuccess('Notes Saved', 'Internal notes have been saved.')
    } catch (error) {
      console.error('Failed to save notes:', error)
      showError('Error', 'Could not save internal notes.')
    }
  }

  const handleSendConfirmation = async () => {
    if (!booking?.guest_email) {
      showError('No Email', 'This booking does not have an email address.')
      return
    }

    setSendingEmail(true)

    // Simulate sending email (in production, this would call an API endpoint)
    await new Promise((resolve) => setTimeout(resolve, 1500))

    showSuccess(
      'Email Sent',
      `Booking confirmation sent to ${booking.guest_email}`
    )
    setSendingEmail(false)
  }

  const handleSendUpdate = async () => {
    if (!booking?.guest_email) {
      showError('No Email', 'This booking does not have an email address.')
      return
    }

    setSendingEmail(true)

    // Simulate sending email
    await new Promise((resolve) => setTimeout(resolve, 1500))

    showSuccess(
      'Update Sent',
      `Booking update notification sent to ${booking.guest_email}`
    )
    setSendingEmail(false)
  }

  // Load available addons
  const loadAvailableAddons = async () => {
    setLoadingAddons(true)
    try {
      const addons = await addonsApi.getAll({ is_active: true })
      // Filter addons that are available for this room (or available for all rooms)
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

  // Open addon selector
  const handleOpenAddonSelector = () => {
    loadAvailableAddons()
    // Initialize selected addons from existing booking addons
    const initialSelected = new Map<string, { addon: AddOn; quantity: number }>()
    if (bookingNotes.addons) {
      bookingNotes.addons.forEach(existingAddon => {
        // Find the full addon data from available addons or create a minimal one
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

  // Update addon quantity
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

  // Calculate addon total based on pricing type
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

  // Save addons to booking
  const handleSaveAddons = async () => {
    if (!booking?.id) return

    setSavingAddons(true)
    try {
      // Build addon list for notes
      const addonsList = Array.from(selectedAddons.values()).map(({ addon, quantity }) => ({
        id: addon.id!,
        name: addon.name,
        quantity,
        price: addon.price,
        total: calculateAddonTotal(addon, quantity),
      }))

      // Calculate new total
      const addonsTotal = addonsList.reduce((sum, a) => sum + a.total, 0)
      const roomTotal = room ? room.base_price_per_night * calculateNights() : (booking.total_amount - (bookingNotes.addons?.reduce((s, a) => s + a.total, 0) || 0))
      const newTotal = roomTotal + addonsTotal

      // Update booking notes
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

  // Remove a single addon from the booking
  const handleRemoveAddon = async (addonId: string) => {
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

  // Load nightly rates for the booking period
  const loadNightlyRates = async () => {
    if (!booking?.room_id || !booking?.check_in || !booking?.check_out) return

    setLoadingRates(true)
    try {
      const batchPricing = await roomsApi.getBatchPrices(
        booking.room_id,
        booking.check_in,
        booking.check_out
      )

      // Merge with any saved override rates from booking notes
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

  // Update a single night's rate
  const handleRateChange = (date: string, newPrice: number) => {
    setNightlyRates(prev =>
      prev.map(rate =>
        rate.date === date
          ? { ...rate, override_price: newPrice }
          : rate
      )
    )
  }

  // Reset a single night's rate to default
  const handleResetRate = (date: string) => {
    setNightlyRates(prev =>
      prev.map(rate =>
        rate.date === date
          ? { ...rate, override_price: undefined }
          : rate
      )
    )
  }

  // Calculate total from nightly rates
  const calculateRatesTotal = (): number => {
    return nightlyRates.reduce((sum, rate) => {
      const price = rate.override_price ?? rate.effective_price
      return sum + price
    }, 0)
  }

  // Save nightly rate overrides
  const handleSaveRates = async () => {
    if (!booking?.id) return

    setSavingRates(true)
    try {
      // Only save rates that have overrides
      const ratesToSave = nightlyRates.filter(r => r.override_price !== undefined)

      const updatedNotes: BookingNotes = {
        ...bookingNotes,
        nightly_rates: ratesToSave.length > 0 ? nightlyRates : undefined,
      }

      // Calculate new total: room rates + addons
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

  // Load nightly rates when booking or notes change
  useEffect(() => {
    if (booking?.room_id && booking?.check_in && booking?.check_out) {
      loadNightlyRates()
    }
  }, [booking?.room_id, booking?.check_in, booking?.check_out, bookingNotes.nightly_rates])

  // Load review when booking loads (only if tenant is available)
  useEffect(() => {
    if (booking?.id && tenant) {
      loadReview(booking.id)
    }
  }, [booking?.id, tenant])

  // Load invoice when booking loads (only if tenant is available)
  useEffect(() => {
    if (booking?.id && tenant) {
      loadInvoice(booking.id)
    }
  }, [booking?.id, tenant])

  // Load review for booking
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

  // Load invoice for booking
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

  // Generate invoice for booking
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

  // Download invoice PDF
  const handleDownloadInvoice = async () => {
    if (!invoice) return

    try {
      await invoicesApi.download(invoice.id, invoice.invoice_number)
    } catch (error: any) {
      showError('Error', error.message || 'Failed to download invoice')
    }
  }

  // Send invoice via email
  const handleSendInvoiceEmail = async () => {
    if (!invoice || !booking?.guest_email) return

    setSendingInvoiceEmail(true)
    try {
      await invoicesApi.sendEmail(invoice.id)
      showSuccess('Invoice Sent', `Invoice sent to ${booking.guest_email}`)
      // Reload invoice to update sent_via_email_at
      await loadInvoice(booking.id!)
    } catch (error: any) {
      showError('Error', error.message || 'Failed to send invoice')
    } finally {
      setSendingInvoiceEmail(false)
    }
  }

  // Send invoice via WhatsApp
  const handleSendInvoiceWhatsApp = async () => {
    if (!invoice || !booking?.guest_phone) return

    try {
      const result = await invoicesApi.getWhatsAppLink(invoice.id)
      window.open(result.url, '_blank')
      // Reload invoice to update sent_via_whatsapp_at
      await loadInvoice(booking.id!)
    } catch (error: any) {
      showError('Error', error.message || 'Failed to open WhatsApp')
    }
  }

  // Send review request to guest
  const handleSendReviewRequest = async () => {
    if (!booking?.id) return

    setSendingReviewRequest(true)
    try {
      const result = await reviewsApi.sendRequest(booking.id)
      showSuccess('Review Request Sent', result.message)
    } catch (error: any) {
      showError('Error', error.message || 'Failed to send review request')
    } finally {
      setSendingReviewRequest(false)
    }
  }

  // Check if booking is eligible for review
  const isReviewEligible = () => {
    if (!booking) return false
    return (
      ['checked_out', 'completed'].includes(booking.status) &&
      booking.payment_status === 'paid'
    )
  }

  // Cancel booking
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

  // Check if booking can be cancelled
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

  const getPaymentStatusColor = (status: string) => {
    return paymentStatusOptions.find((s) => s.value === status)?.color || 'bg-gray-100 text-gray-700'
  }

  if (loading || tenantLoading || (!tenant && !loading)) {
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
          <h2 className="text-xl font-semibold mb-2">Booking Not Found</h2>
          <p className="text-gray-500 mb-4">The booking you're looking for doesn't exist.</p>
          <Button onClick={() => navigate('/dashboard/bookings')}>
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
          onClick={() => navigate('/dashboard/bookings')}
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
          <div className="flex items-center gap-3">
            {!isEditing ? (
              <>
                <Button variant="outline" onClick={() => setIsEditing(true)}>
                  <Edit size={16} className="mr-2" />
                  Edit Booking
                </Button>
                <Button
                  variant="outline"
                  onClick={handleSendConfirmation}
                  disabled={sendingEmail}
                >
                  {sendingEmail ? (
                    <Loader2 size={16} className="mr-2 animate-spin" />
                  ) : (
                    <Send size={16} className="mr-2" />
                  )}
                  Send Confirmation
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" onClick={() => setIsEditing(false)}>
                  <X size={16} className="mr-2" />
                  Cancel
                </Button>
                <Button onClick={handleSave} disabled={saving}>
                  {saving ? (
                    <Loader2 size={16} className="mr-2 animate-spin" />
                  ) : (
                    <Save size={16} className="mr-2" />
                  )}
                  Save Changes
                </Button>
              </>
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
                {isEditing ? (
                  <input
                    type="text"
                    value={editForm.guest_name}
                    onChange={(e) => setEditForm({ ...editForm, guest_name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-black focus:border-transparent"
                  />
                ) : (
                  <p className="text-gray-900 font-medium">{booking.guest_name}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Email</label>
                {isEditing ? (
                  <input
                    type="email"
                    value={editForm.guest_email}
                    onChange={(e) => setEditForm({ ...editForm, guest_email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-black focus:border-transparent"
                  />
                ) : (
                  <div className="flex items-center gap-2">
                    <Mail size={16} className="text-gray-400" />
                    <a href={`mailto:${booking.guest_email}`} className="text-blue-600 hover:underline">
                      {booking.guest_email || 'Not provided'}
                    </a>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Phone</label>
                {isEditing ? (
                  <input
                    type="tel"
                    value={editForm.guest_phone}
                    onChange={(e) => setEditForm({ ...editForm, guest_phone: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-black focus:border-transparent"
                  />
                ) : (
                  <div className="flex items-center gap-2">
                    <Phone size={16} className="text-gray-400" />
                    {booking.guest_phone ? (
                      <a href={`tel:${booking.guest_phone}`} className="text-blue-600 hover:underline">
                        {booking.guest_phone}
                      </a>
                    ) : (
                      <span className="text-gray-500">Not provided</span>
                    )}
                  </div>
                )}
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
              {isEditing ? (
                <div className="md:col-span-2">
                  <DateRangePicker
                    startDate={editForm.check_in}
                    endDate={editForm.check_out}
                    onStartDateChange={(date) => setEditForm({ ...editForm, check_in: date })}
                    onEndDateChange={(date) => setEditForm({ ...editForm, check_out: date })}
                    startLabel="Check-in"
                    endLabel="Check-out"
                  />
                </div>
              ) : (
                <>
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
                </>
              )}

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
                {isEditing ? (
                  <select
                    value={editForm.room_id}
                    onChange={(e) => {
                      const selectedRoom = rooms.find(r => r.id === e.target.value)
                      setEditForm({
                        ...editForm,
                        room_id: e.target.value,
                        room_name: selectedRoom?.name || '',
                      })
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-black focus:border-transparent"
                  >
                    <option value="">Select a room...</option>
                    {rooms.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name} - {new Intl.NumberFormat('en-ZA', {
                          style: 'currency',
                          currency: r.currency,
                        }).format(r.base_price_per_night)}/night
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="flex items-start gap-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
                    {/* Room Thumbnail */}
                    {room?.images?.featured ? (
                      <img
                        src={room.images.featured.url}
                        alt={room.name}
                        className="w-20 h-20 object-cover rounded-lg flex-shrink-0"
                      />
                    ) : (
                      <div className="w-20 h-20 bg-gray-200 rounded-lg flex items-center justify-center flex-shrink-0">
                        <BedDouble size={24} className="text-gray-400" />
                      </div>
                    )}
                    {/* Room Details */}
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-gray-900">
                        {booking.room_name || 'Unknown Room'}
                      </h4>
                      <p className="text-xs text-gray-400 font-mono mt-0.5">
                        {room?.room_code || booking.room_id}
                      </p>
                      {room && (
                        <>
                          <p className="text-sm text-gray-600 mt-1">
                            {room.bed_count}x {room.bed_type} · Max {room.max_guests} guests
                          </p>
                          <p className="text-sm font-medium text-gray-900 mt-1">
                            {new Intl.NumberFormat('en-ZA', {
                              style: 'currency',
                              currency: room.currency,
                            }).format(room.base_price_per_night)}/night
                          </p>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Nightly Rates Card */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <DollarSign size={20} />
                Nightly Rates
              </h2>
              {!editingRates ? (
                <button
                  onClick={() => setEditingRates(true)}
                  className="flex items-center gap-1 px-3 py-1.5 text-sm bg-gray-900 text-white rounded-md hover:bg-gray-800 transition-colors"
                >
                  <Edit size={14} />
                  Edit Rates
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setEditingRates(false)
                      loadNightlyRates() // Reset to saved values
                    }}
                    className="px-3 py-1.5 text-sm border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveRates}
                    disabled={savingRates}
                    className="flex items-center gap-1 px-3 py-1.5 text-sm bg-gray-900 text-white rounded-md hover:bg-gray-800 transition-colors disabled:opacity-50"
                  >
                    {savingRates ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <Save size={14} />
                    )}
                    Save
                  </button>
                </div>
              )}
            </div>

            {loadingRates ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                <span className="ml-2 text-gray-500">Loading rates...</span>
              </div>
            ) : nightlyRates.length === 0 ? (
              <div className="text-center py-6 text-gray-500">
                <DollarSign size={32} className="mx-auto mb-2 opacity-50" />
                <p className="text-sm">No nightly rate data available</p>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Table Header */}
                <div className="grid grid-cols-12 gap-2 text-xs font-medium text-gray-500 uppercase tracking-wider pb-2 border-b">
                  <div className="col-span-4">Date</div>
                  <div className="col-span-3 text-right">Base Rate</div>
                  <div className="col-span-4 text-right">
                    {editingRates ? 'Override Rate' : 'Final Rate'}
                  </div>
                  {editingRates && <div className="col-span-1"></div>}
                </div>

                {/* Table Rows */}
                {nightlyRates.map((rate) => {
                  const finalPrice = rate.override_price ?? rate.effective_price
                  const hasOverride = rate.override_price !== undefined
                  const hasSeasonal = rate.seasonal_rate !== null

                  return (
                    <div
                      key={rate.date}
                      className={`grid grid-cols-12 gap-2 py-2 items-center border-b border-gray-100 last:border-0 ${
                        hasOverride ? 'bg-blue-50 -mx-2 px-2 rounded' : ''
                      }`}
                    >
                      <div className="col-span-4">
                        <p className="text-sm font-medium text-gray-900">
                          {new Date(rate.date).toLocaleDateString('en-ZA', {
                            weekday: 'short',
                            day: 'numeric',
                            month: 'short',
                          })}
                        </p>
                        {hasSeasonal && !editingRates && (
                          <p className="text-xs text-gray-500">{rate.seasonal_rate?.name}</p>
                        )}
                      </div>
                      <div className="col-span-3 text-right">
                        <span className="text-sm text-gray-500">
                          {formatCurrency(rate.base_price, booking.currency)}
                        </span>
                        {hasSeasonal && (
                          <p className="text-xs text-accent-600">
                            Season: {formatCurrency(rate.effective_price, booking.currency)}
                          </p>
                        )}
                      </div>
                      <div className="col-span-4 text-right">
                        {editingRates ? (
                          <input
                            type="number"
                            value={rate.override_price ?? rate.effective_price}
                            onChange={(e) => handleRateChange(rate.date, parseFloat(e.target.value) || 0)}
                            className={`w-full px-2 py-1 text-sm text-right border rounded-md focus:ring-2 focus:ring-black focus:border-transparent ${
                              hasOverride ? 'border-blue-400 bg-white' : 'border-gray-300'
                            }`}
                          />
                        ) : (
                          <span className={`text-sm font-medium ${hasOverride ? 'text-blue-600' : 'text-gray-900'}`}>
                            {formatCurrency(finalPrice, booking.currency)}
                            {hasOverride && (
                              <span className="ml-1 text-xs text-blue-500">(custom)</span>
                            )}
                          </span>
                        )}
                      </div>
                      {editingRates && (
                        <div className="col-span-1 text-right">
                          {hasOverride && (
                            <button
                              onClick={() => handleResetRate(rate.date)}
                              className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
                              title="Reset to default"
                            >
                              <RotateCcw size={14} />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}

                {/* Total Row */}
                <div className="pt-3 border-t border-gray-200">
                  <div className="flex justify-between">
                    <span className="font-medium text-gray-700">Room Total ({calculateNights()} nights)</span>
                    <span className="text-lg font-bold text-gray-900">
                      {formatCurrency(
                        editingRates ? calculateRatesTotal() : nightlyRates.reduce((sum, r) => sum + (r.override_price ?? r.effective_price), 0),
                        booking.currency
                      )}
                    </span>
                  </div>
                  {nightlyRates.some(r => r.override_price !== undefined) && !editingRates && (
                    <p className="text-xs text-blue-600 mt-1">
                      * Some rates have been manually adjusted
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Add-ons Card */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Package size={20} />
                Add-ons & Extras
              </h2>
              <button
                onClick={handleOpenAddonSelector}
                className="flex items-center gap-1 px-3 py-1.5 text-sm bg-gray-900 text-white rounded-md hover:bg-gray-800 transition-colors"
              >
                <Plus size={14} />
                {bookingNotes.addons && bookingNotes.addons.length > 0 ? 'Manage' : 'Add'}
              </button>
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
                    <div className="flex items-center gap-3">
                      <p className="font-medium text-gray-900">
                        {formatCurrency(addon.total, booking.currency)}
                      </p>
                      <button
                        onClick={() => handleRemoveAddon(addon.id)}
                        className="p-1 text-red-500 hover:bg-red-50 rounded transition-colors"
                        title="Remove add-on"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
                <div className="pt-2 border-t border-gray-200">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Add-ons Total</span>
                    <span className="font-semibold text-gray-900">
                      {formatCurrency(
                        bookingNotes.addons.reduce((sum, a) => sum + a.total, 0),
                        booking.currency
                      )}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-6 text-gray-500">
                <Package size={32} className="mx-auto mb-2 opacity-50" />
                <p className="text-sm">No add-ons added yet</p>
                <p className="text-xs text-gray-400 mt-1">Click "Add" to include extras</p>
              </div>
            )}
          </div>

          {/* Add-on Selector Modal */}
          {showAddonSelector && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[80vh] overflow-hidden">
                <div className="bg-gradient-to-r from-accent-600 to-accent-500 px-6 py-5 rounded-t-lg">
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
                      <span className="ml-2 text-gray-500">Loading add-ons...</span>
                    </div>
                  ) : availableAddons.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <Package size={32} className="mx-auto mb-2 opacity-50" />
                      <p>No add-ons available</p>
                      <p className="text-xs text-gray-400 mt-1">Create add-ons in Settings first</p>
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
                            className={`p-3 border rounded-lg transition-colors ${
                              quantity > 0 ? 'border-gray-900 bg-gray-50' : 'border-gray-200'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1">
                                <p className="font-medium text-gray-900">{addon.name}</p>
                                {addon.description && (
                                  <p className="text-sm text-gray-500 mt-0.5">{addon.description}</p>
                                )}
                                <p className="text-sm text-gray-600 mt-1">
                                  {formatCurrency(addon.price, addon.currency)}
                                  <span className="text-gray-400 ml-1">
                                    / {addon.pricing_type.replace(/_/g, ' ')}
                                  </span>
                                </p>
                              </div>

                              <div className="flex items-center gap-2">
                                {quantity > 0 && (
                                  <span className="text-sm font-medium text-gray-700">
                                    {formatCurrency(total, addon.currency)}
                                  </span>
                                )}
                                <div className="flex items-center border border-gray-300 rounded-md">
                                  <button
                                    onClick={() => updateAddonQuantity(addon, -1)}
                                    disabled={quantity === 0}
                                    className="p-1.5 text-gray-500 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
                                  >
                                    <Minus size={14} />
                                  </button>
                                  <span className="w-8 text-center text-sm font-medium">
                                    {quantity}
                                  </span>
                                  <button
                                    onClick={() => updateAddonQuantity(addon, 1)}
                                    disabled={quantity >= addon.max_quantity}
                                    className="p-1.5 text-gray-500 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
                                  >
                                    <Plus size={14} />
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

                {/* Footer with totals and save button */}
                <div className="p-4 border-t border-gray-200 bg-gray-50">
                  {selectedAddons.size > 0 && (
                    <div className="mb-3 pb-3 border-b border-gray-200">
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-500">Selected add-ons</span>
                        <span className="font-medium">{selectedAddons.size}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-medium text-gray-700">Add-ons Total</span>
                        <span className="font-semibold text-gray-900">
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
                      className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-100 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveAddons}
                      disabled={savingAddons}
                      className="flex-1 px-4 py-2.5 bg-accent-500 hover:bg-accent-600 text-white rounded-md transition-colors disabled:opacity-50 flex items-center justify-center gap-2 font-medium"
                    >
                      {savingAddons ? (
                        <>
                          <Loader2 size={16} className="animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save size={16} />
                          Save Changes
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

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

          {/* Internal Notes */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <StickyNote size={20} />
              Internal Notes
            </h2>
            <p className="text-sm text-gray-500 mb-3">
              Private notes for staff only. Not visible to guests.
            </p>
            <textarea
              value={editForm.internal_notes}
              onChange={(e) => setEditForm({ ...editForm, internal_notes: e.target.value })}
              placeholder="Add internal notes about this booking..."
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-black focus:border-transparent resize-none"
            />
            <div className="mt-3 flex justify-end">
              <button
                onClick={handleSaveInternalNotes}
                className="px-4 py-2 bg-gray-900 text-white text-sm rounded-md hover:bg-gray-800 transition-colors"
              >
                Save Notes
              </button>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Status Card */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Status</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-2">Booking Status</label>
                {isEditing ? (
                  <select
                    value={editForm.status}
                    onChange={(e) =>
                      setEditForm({ ...editForm, status: e.target.value as Booking['status'] })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-black focus:border-transparent"
                  >
                    {statusOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                ) : (
                  <span className={`inline-flex px-3 py-1 text-sm font-medium rounded-full ${getStatusColor(booking.status)}`}>
                    {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                  </span>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-500 mb-2">Payment Status</label>
                {isEditing ? (
                  <select
                    value={editForm.payment_status}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        payment_status: e.target.value as Booking['payment_status'],
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-black focus:border-transparent"
                  >
                    {paymentStatusOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                ) : (
                  <span className={`inline-flex px-3 py-1 text-sm font-medium rounded-full ${getPaymentStatusColor(booking.payment_status)}`}>
                    {booking.payment_status.charAt(0).toUpperCase() + booking.payment_status.slice(1)}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Proof of Payment */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Upload size={20} />
              Proof of Payment
            </h2>

            {proofOfPayment ? (
              <div className="border border-gray-200 rounded-lg p-3">
                <div className="flex items-start gap-3">
                  {proofOfPayment.url.startsWith('data:image') ? (
                    <img
                      src={proofOfPayment.url}
                      alt="Proof of payment"
                      className="w-12 h-12 object-cover rounded-lg border"
                    />
                  ) : (
                    <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <File className="w-6 h-6 text-red-600" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 text-sm truncate">{proofOfPayment.filename}</p>
                    <p className="text-xs text-gray-500">
                      {new Date(proofOfPayment.uploaded_at).toLocaleDateString('en-ZA', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-3">
                  <a
                    href={proofOfPayment.url}
                    download={proofOfPayment.filename}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
                  >
                    <Download size={14} />
                    Download
                  </a>
                  <button
                    onClick={handleRemoveProof}
                    className="px-3 py-2 text-sm text-red-600 border border-red-200 rounded-md hover:bg-red-50 transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ) : (
              <div
                onClick={() => proofInputRef.current?.click()}
                className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors ${
                  uploadingProof ? 'bg-gray-50 border-gray-300' : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                {uploadingProof ? (
                  <div className="flex flex-col items-center">
                    <Loader2 className="w-6 h-6 animate-spin text-gray-400 mb-2" />
                    <p className="text-sm text-gray-600">Uploading...</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center">
                    <Upload className="w-6 h-6 text-gray-400 mb-2" />
                    <p className="text-sm text-gray-600 font-medium">Upload proof</p>
                    <p className="text-xs text-gray-500 mt-1">PDF, PNG, JPEG</p>
                  </div>
                )}
              </div>
            )}
            <input
              ref={proofInputRef}
              type="file"
              accept=".pdf,.png,.jpg,.jpeg,image/png,image/jpeg,application/pdf"
              className="hidden"
              onChange={(e) => {
                if (e.target.files?.[0]) {
                  handleProofUpload(e.target.files[0])
                }
              }}
            />
          </div>

          {/* Payment Summary */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <CreditCard size={20} />
              Payment
            </h2>

            <div className="space-y-3">
              {room && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">
                    Room ({calculateNights()} nights)
                  </span>
                  <span className="text-gray-900">
                    {formatCurrency(room.base_price_per_night * calculateNights(), booking.currency)}
                  </span>
                </div>
              )}

              {bookingNotes.addons && bookingNotes.addons.length > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Add-ons</span>
                  <span className="text-gray-900">
                    {formatCurrency(
                      bookingNotes.addons.reduce((sum, a) => sum + a.total, 0),
                      booking.currency
                    )}
                  </span>
                </div>
              )}

              <div className="border-t pt-3 mt-3">
                <div className="flex justify-between">
                  <span className="font-semibold text-gray-900">Total</span>
                  {isEditing ? (
                    <input
                      type="number"
                      value={editForm.total_amount}
                      onChange={(e) =>
                        setEditForm({ ...editForm, total_amount: parseFloat(e.target.value) || 0 })
                      }
                      className="w-32 px-2 py-1 text-right border border-gray-300 rounded-md focus:ring-2 focus:ring-black focus:border-transparent"
                    />
                  ) : (
                    <span className="text-xl font-bold text-gray-900">
                      {formatCurrency(booking.total_amount, booking.currency)}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Invoice */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <FileText size={20} />
              Invoice
            </h2>

            {loadingInvoice ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
              </div>
            ) : invoice ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Invoice Number</span>
                    <span className="font-mono font-medium text-gray-900">{invoice.invoice_number}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Generated</span>
                    <span className="text-gray-900">
                      {new Date(invoice.generated_at).toLocaleDateString('en-ZA', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </span>
                  </div>
                </div>

                <div className="space-y-2 pt-2">
                  <button
                    onClick={handleDownloadInvoice}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-md hover:bg-gray-800 transition-colors"
                  >
                    <Download size={16} />
                    Download PDF
                  </button>

                  <button
                    onClick={handleSendInvoiceEmail}
                    disabled={sendingInvoiceEmail || !booking.guest_email}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {sendingInvoiceEmail ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <Mail size={16} />
                    )}
                    Send via Email
                  </button>

                  <button
                    onClick={handleSendInvoiceWhatsApp}
                    disabled={!booking.guest_phone}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-green-500 text-green-600 rounded-md hover:bg-green-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <MessageSquare size={16} />
                    Send via WhatsApp
                  </button>
                </div>

                {(invoice.sent_via_email_at || invoice.sent_via_whatsapp_at) && (
                  <div className="pt-2 border-t space-y-1">
                    {invoice.sent_via_email_at && (
                      <p className="text-xs text-gray-500">
                        Emailed on {new Date(invoice.sent_via_email_at).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' })}
                      </p>
                    )}
                    {invoice.sent_via_whatsapp_at && (
                      <p className="text-xs text-gray-500">
                        WhatsApp on {new Date(invoice.sent_via_whatsapp_at).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' })}
                      </p>
                    )}
                  </div>
                )}
              </div>
            ) : booking.payment_status === 'paid' ? (
              <div className="text-center py-2">
                <p className="text-sm text-gray-500 mb-3">Invoice ready to generate</p>
                <button
                  onClick={handleGenerateInvoice}
                  disabled={generatingInvoice}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-accent-600 text-white rounded-md hover:bg-accent-700 transition-colors disabled:opacity-50"
                >
                  {generatingInvoice ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <FileText size={16} />
                  )}
                  Generate Invoice
                </button>
              </div>
            ) : (
              <div className="text-center py-4 text-gray-500">
                <FileText size={32} className="mx-auto mb-2 opacity-40" />
                <p className="text-sm">Invoice will be available after payment</p>
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>

            <div className="space-y-3">
              <button
                onClick={handleSendConfirmation}
                disabled={sendingEmail || !booking.guest_email}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-accent-600 text-white rounded-md hover:bg-accent-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {sendingEmail ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <CheckCircle size={16} />
                )}
                Send Confirmation
              </button>

              <button
                onClick={handleSendUpdate}
                disabled={sendingEmail || !booking.guest_email}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {sendingEmail ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Send size={16} />
                )}
                Send Update Notification
              </button>

              {booking.status === 'pending' && (
                <button
                  onClick={async () => {
                    try {
                      await bookingsApi.update(booking.id!, { status: 'confirmed' })
                      showSuccess('Booking Confirmed', 'The booking has been confirmed.')
                      loadBooking(booking.id!)
                    } catch {
                      showError('Error', 'Failed to confirm booking')
                    }
                  }}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-accent-600 text-accent-600 rounded-md hover:bg-accent-50 transition-colors"
                >
                  <CheckCircle size={16} />
                  Mark as Confirmed
                </button>
              )}

              {booking.status === 'confirmed' && (
                <button
                  onClick={async () => {
                    try {
                      await bookingsApi.update(booking.id!, { status: 'checked_in' })
                      showSuccess('Guest Checked In', 'The guest has been checked in.')
                      loadBooking(booking.id!)
                    } catch {
                      showError('Error', 'Failed to check in guest')
                    }
                  }}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  <CheckCircle size={16} />
                  Check In Guest
                </button>
              )}

              {booking.status === 'checked_in' && (
                <button
                  onClick={async () => {
                    try {
                      await bookingsApi.update(booking.id!, { status: 'checked_out' })
                      showSuccess('Guest Checked Out', 'The guest has been checked out.')
                      loadBooking(booking.id!)
                    } catch {
                      showError('Error', 'Failed to check out guest')
                    }
                  }}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors"
                >
                  <CheckCircle size={16} />
                  Check Out Guest
                </button>
              )}

              {booking.payment_status === 'pending' && (
                <button
                  onClick={async () => {
                    try {
                      await bookingsApi.update(booking.id!, { payment_status: 'paid' })
                      showSuccess('Payment Recorded', 'The payment has been marked as paid.')
                      loadBooking(booking.id!)
                    } catch {
                      showError('Error', 'Failed to update payment status')
                    }
                  }}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-blue-600 text-blue-600 rounded-md hover:bg-blue-50 transition-colors"
                >
                  <CreditCard size={16} />
                  Mark as Paid
                </button>
              )}

              {canCancelBooking() && (
                <button
                  onClick={() => setShowCancelModal(true)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-red-600 text-red-600 rounded-md hover:bg-red-50 transition-colors"
                >
                  <X size={16} />
                  Cancel Reservation
                </button>
              )}
            </div>
          </div>

          {/* Guest Review */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Star size={20} />
              Guest Review
            </h2>

            {loadingReview ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 size={20} className="animate-spin text-gray-400" />
              </div>
            ) : review ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <StarRating rating={review.rating} size="sm" />
                  <span className="text-sm font-medium text-gray-900">{review.rating}/5</span>
                </div>
                {review.title && (
                  <p className="font-medium text-gray-900">"{review.title}"</p>
                )}
                {review.content && (
                  <p className="text-sm text-gray-600">{review.content}</p>
                )}
                <p className="text-xs text-gray-500">
                  Submitted {review.created_at && new Date(review.created_at).toLocaleDateString('en-ZA', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric'
                  })}
                </p>
                {review.owner_response && (
                  <div className="mt-3 p-3 bg-blue-50 rounded-lg border-l-4 border-blue-500">
                    <div className="flex items-center gap-1 mb-1">
                      <MessageSquare size={12} className="text-blue-600" />
                      <span className="text-xs font-medium text-blue-700">Your Response</span>
                    </div>
                    <p className="text-sm text-gray-700">{review.owner_response}</p>
                  </div>
                )}
              </div>
            ) : isReviewEligible() ? (
              <div className="text-center py-2">
                <p className="text-sm text-gray-500 mb-3">
                  No review yet. Send a request to the guest.
                </p>
                <button
                  onClick={handleSendReviewRequest}
                  disabled={sendingReviewRequest || !booking.guest_email}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-yellow-500 text-white rounded-md hover:bg-yellow-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {sendingReviewRequest ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Star size={16} />
                  )}
                  Request Review
                </button>
                {!booking.guest_email && (
                  <p className="text-xs text-gray-400 mt-2">No email address on file</p>
                )}
              </div>
            ) : (
              <div className="text-center py-2">
                <p className="text-sm text-gray-500">
                  Reviews can be requested after the guest has checked out and payment is complete.
                </p>
              </div>
            )}
          </div>

          {/* Booking Meta */}
          <div className="bg-gray-100 rounded-lg p-4 text-sm text-gray-600 space-y-2">
            <p>
              <strong>Booking ID:</strong> {booking.id}
            </p>
            <div className="flex items-center gap-2">
              <strong>Source:</strong>
              <SourceBadge
                source={(booking.source || 'manual') as BookingSource}
                type="booking"
                externalUrl={booking.external_url}
                size="sm"
              />
            </div>
            {booking.external_id && (
              <p>
                <strong>External ID:</strong> <span className="font-mono">{booking.external_id}</span>
              </p>
            )}
            {booking.synced_at && (
              <p>
                <strong>Last Synced:</strong> {new Date(booking.synced_at).toLocaleString('en-ZA')}
              </p>
            )}
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
                    This will cancel the booking for <strong>{booking.guest_name}</strong> ({formatDate(booking.check_in)} - {formatDate(booking.check_out)}).
                  </p>
                </div>
              </div>
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
                <p className="text-sm text-yellow-800">
                  <strong>Note:</strong> This action cannot be undone. The guest will need to make a new booking if they wish to rebook.
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

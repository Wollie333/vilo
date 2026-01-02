import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Home, Calendar, User, Users, FileText, DollarSign, Package, CheckCircle, AlertTriangle, Mail, Tag, Loader2 } from 'lucide-react'
import { FormLayout, FormSidebar, FormPreviewPanel, SectionHeader } from '../../components/form-layout'
import type { SectionGroup } from '../../components/form-layout/types'
import { BookingPreviewCard } from '../../components/booking-form'
import GuestSelector from '../../components/GuestSelector'
import PhoneInput from '../../components/PhoneInput'
import DateRangePicker from '../../components/DateRangePicker'
import CouponInput, { AppliedCoupon } from '../../components/CouponInput'
import { adminTenants, AdminRoomFull, AdminAddOn } from '../../services/adminApi'
import { useNotification } from '../../contexts/NotificationContext'

// Section groups for the sidebar - same as original BookingWizard
const sectionGroups: SectionGroup[] = [
  {
    id: 'reservation',
    name: 'Reservation',
    items: [
      { id: 'room-selection', name: 'Room Selection', icon: Home },
      { id: 'dates', name: 'Check-in/out Dates', icon: Calendar },
    ]
  },
  {
    id: 'guest',
    name: 'Guest Details',
    items: [
      { id: 'contact', name: 'Contact Info', icon: User },
      { id: 'guests-count', name: 'Number of Guests', icon: Users },
      { id: 'requests', name: 'Special Requests', icon: FileText },
    ]
  },
  {
    id: 'payment',
    name: 'Payment & Status',
    items: [
      { id: 'pricing', name: 'Pricing', icon: DollarSign },
      { id: 'addons', name: 'Add-ons', icon: Package },
      { id: 'status', name: 'Booking Status', icon: CheckCircle },
    ]
  }
]

interface ValidationWarning {
  type: 'min_stay' | 'max_stay'
  message: string
  roomRule: number
  actualNights: number
}

interface SelectedAddon {
  id: string
  name: string
  quantity: number
  price: number
  pricing_type: string
  total: number
}

interface BookingFormData {
  guest_name: string
  guest_email: string
  guest_phone: string
  adults: number
  children: number
  children_ages: number[]
  room_id: string
  room_name: string
  check_in: string
  check_out: string
  status: string
  payment_status: string
  total_amount: number
  currency: string
  notes: string
  override_rules: boolean
}

const CURRENCIES = [
  { code: 'ZAR', name: 'South African Rand' },
  { code: 'USD', name: 'US Dollar' },
  { code: 'EUR', name: 'Euro' },
  { code: 'GBP', name: 'British Pound' },
  { code: 'NGN', name: 'Nigerian Naira' },
]

const BOOKING_STATUSES = [
  { value: 'pending', label: 'Pending' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'checked_in', label: 'Checked In' },
  { value: 'checked_out', label: 'Checked Out' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'completed', label: 'Completed' },
]

const PAYMENT_STATUSES = [
  { value: 'pending', label: 'Pending' },
  { value: 'partial', label: 'Partial' },
  { value: 'paid', label: 'Paid' },
  { value: 'refunded', label: 'Refunded' },
]

type SectionStatus = 'complete' | 'partial' | 'empty'

export default function AdminBookingWizard() {
  const navigate = useNavigate()
  const { tenantId, bookingId } = useParams()
  const isEditing = Boolean(bookingId)
  const { showNotification } = useNotification()

  const [activeSection, setActiveSection] = useState('room-selection')
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [rooms, setRooms] = useState<AdminRoomFull[]>([])
  const [tenantName, setTenantName] = useState('')
  const [selectedRoom, setSelectedRoom] = useState<AdminRoomFull | null>(null)
  const [validationWarnings, setValidationWarnings] = useState<ValidationWarning[]>([])
  const [availableAddons, setAvailableAddons] = useState<AdminAddOn[]>([])
  const [selectedAddons, setSelectedAddons] = useState<SelectedAddon[]>([])
  const [pricingBreakdown, setPricingBreakdown] = useState<{ date: string; price: number; overridePrice: number | null; seasonalRate: any }[]>([])
  const [calculatedTotal, setCalculatedTotal] = useState(0)
  const [manualOverride, setManualOverride] = useState(false)
  const [editingNightIndex, setEditingNightIndex] = useState<number | null>(null)
  const [appliedCoupon, setAppliedCoupon] = useState<AppliedCoupon | null>(null)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)

  // Section refs for scrolling
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({})

  const [formData, setFormData] = useState<BookingFormData>({
    guest_name: '',
    guest_email: '',
    guest_phone: '',
    adults: 2,
    children: 0,
    children_ages: [],
    room_id: '',
    room_name: '',
    check_in: '',
    check_out: '',
    status: 'pending',
    payment_status: 'pending',
    total_amount: 0,
    currency: 'ZAR',
    notes: '',
    override_rules: false,
  })

  // Load data on mount
  useEffect(() => {
    if (tenantId) {
      loadData()
    }
  }, [tenantId, bookingId])

  // Load room details when room changes
  useEffect(() => {
    if (formData.room_id && rooms.length > 0) {
      const room = rooms.find(r => r.id === formData.room_id)
      setSelectedRoom(room || null)
      if (room && tenantId) {
        loadAddons()
      }
    }
  }, [formData.room_id, rooms])

  // Validate dates when they change
  useEffect(() => {
    validateDates()
  }, [selectedRoom, formData.check_in, formData.check_out])

  // Calculate pricing when room or dates change
  useEffect(() => {
    if (formData.room_id && formData.check_in && formData.check_out && tenantId) {
      calculatePricing()
    }
  }, [formData.room_id, formData.check_in, formData.check_out])

  // Update total when addons or coupon change
  useEffect(() => {
    if (!manualOverride) {
      const addonsTotal = selectedAddons.reduce((sum, a) => sum + a.total, 0)
      const discount = appliedCoupon?.discount_amount || 0
      updateFormData({ total_amount: Math.max(0, calculatedTotal + addonsTotal - discount) })
    }
  }, [calculatedTotal, selectedAddons, appliedCoupon, manualOverride])

  const loadData = async () => {
    try {
      setIsLoading(true)

      // Fetch tenant details for name
      const tenantData = await adminTenants.get(tenantId!)
      setTenantName(tenantData.businessName || 'Unknown Tenant')

      // Fetch full room details
      const roomsData = await adminTenants.getRoomsFull(tenantId!)
      setRooms(roomsData)

      // Fetch addons
      const addonsData = await adminTenants.getAddons(tenantId!)
      setAvailableAddons(addonsData)

      // If editing, fetch the booking
      if (bookingId) {
        const booking = await adminTenants.getBooking(tenantId!, bookingId)

        let parsedNotes: any = {}
        let notesText = booking.notes || ''
        try {
          parsedNotes = booking.notes ? JSON.parse(booking.notes) : {}
          notesText = parsedNotes.special_requests || ''
        } catch {
          // Notes is plain text
        }

        setFormData({
          guest_name: booking.guest_name || '',
          guest_email: booking.guest_email || '',
          guest_phone: booking.guest_phone || '',
          adults: parsedNotes.adults || booking.adults || 2,
          children: parsedNotes.children || booking.children || 0,
          children_ages: parsedNotes.children_ages || [],
          room_id: booking.room_id || '',
          room_name: booking.room_name || '',
          check_in: booking.check_in || '',
          check_out: booking.check_out || '',
          status: booking.status || 'pending',
          payment_status: booking.payment_status || 'pending',
          total_amount: booking.total_amount || 0,
          currency: booking.currency || 'ZAR',
          notes: notesText,
          override_rules: false,
        })

        // Load addons if present
        if (parsedNotes.addons) {
          setSelectedAddons(parsedNotes.addons)
        }

        // Load applied coupon if present
        if (parsedNotes.coupon) {
          setAppliedCoupon({
            id: parsedNotes.coupon.id,
            code: parsedNotes.coupon.code,
            name: parsedNotes.coupon.name,
            discount_type: parsedNotes.coupon.discount_type,
            discount_value: parsedNotes.coupon.discount_value,
            discount_amount: parsedNotes.coupon.discount_amount,
          })
        }

        // Load custom pricing breakdown if present
        if (parsedNotes.pricing_breakdown && Array.isArray(parsedNotes.pricing_breakdown)) {
          const savedBreakdown = parsedNotes.pricing_breakdown.map((n: any) => ({
            date: n.date,
            price: n.base_price,
            overridePrice: n.is_custom ? n.effective_price : null,
            seasonalRate: n.seasonal_rate ? { name: n.seasonal_rate } : null,
          }))
          setPricingBreakdown(savedBreakdown)
        }
      }
    } catch (error) {
      console.error('Failed to load data:', error)
      showNotification('error', 'Failed to load data')
    } finally {
      setIsLoading(false)
    }
  }

  const loadAddons = async () => {
    if (!tenantId) return
    try {
      const addonsData = await adminTenants.getAddons(tenantId)
      // Filter addons based on room if applicable
      const roomAddons = addonsData.filter(addon => {
        if (!addon.is_active) return false
        return true // For now, show all active addons
      })
      setAvailableAddons(roomAddons)
    } catch (error) {
      console.error('Failed to load add-ons:', error)
    }
  }

  const validateDates = () => {
    const newWarnings: ValidationWarning[] = []
    const nights = calculateNights()

    if (selectedRoom && nights > 0) {
      if (nights < selectedRoom.min_stay_nights) {
        newWarnings.push({
          type: 'min_stay',
          message: `Minimum stay is ${selectedRoom.min_stay_nights} nights. You selected ${nights}.`,
          roomRule: selectedRoom.min_stay_nights,
          actualNights: nights,
        })
      }
      if (selectedRoom.max_stay_nights && nights > selectedRoom.max_stay_nights) {
        newWarnings.push({
          type: 'max_stay',
          message: `Maximum stay is ${selectedRoom.max_stay_nights} nights. You selected ${nights}.`,
          roomRule: selectedRoom.max_stay_nights,
          actualNights: nights,
        })
      }
    }
    setValidationWarnings(newWarnings)
  }

  const calculatePricing = async () => {
    if (!formData.room_id || !formData.check_in || !formData.check_out || !tenantId) return

    try {
      const result = await adminTenants.getRoomPrices(tenantId, formData.room_id, formData.check_in, formData.check_out)
      const breakdown = result.nights.map((p) => ({
        date: p.date,
        price: p.effective_price,
        overridePrice: null as number | null,
        seasonalRate: p.seasonal_rate
      }))
      setPricingBreakdown(breakdown)
      const total = result.total_amount
      setCalculatedTotal(total)
      if (!manualOverride) {
        updateFormData({ total_amount: total })
      }
    } catch (error) {
      console.error('Failed to calculate pricing:', error)
    }
  }

  // Update individual night price
  const handleNightPriceChange = (index: number, newPrice: number) => {
    setPricingBreakdown(prev => {
      const updated = [...prev]
      updated[index] = { ...updated[index], overridePrice: newPrice }
      return updated
    })
  }

  // Clear override for a night (revert to calculated)
  const handleClearNightOverride = (index: number) => {
    setPricingBreakdown(prev => {
      const updated = [...prev]
      updated[index] = { ...updated[index], overridePrice: null }
      return updated
    })
  }

  // Calculate total from pricing breakdown (respecting overrides)
  const getEffectiveTotal = () => {
    return pricingBreakdown.reduce((sum, night) => {
      return sum + (night.overridePrice !== null ? night.overridePrice : night.price)
    }, 0)
  }

  // Update total when pricing breakdown changes (including overrides)
  useEffect(() => {
    if (pricingBreakdown.length > 0 && !manualOverride) {
      const effectiveTotal = getEffectiveTotal()
      const addonsTotal = selectedAddons.reduce((sum, a) => sum + a.total, 0)
      const discount = appliedCoupon?.discount_amount || 0
      updateFormData({ total_amount: Math.max(0, effectiveTotal + addonsTotal - discount) })
    }
  }, [pricingBreakdown])

  const calculateNights = (): number => {
    if (!formData.check_in || !formData.check_out) return 0
    const start = new Date(formData.check_in)
    const end = new Date(formData.check_out)
    const diffTime = end.getTime() - start.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays > 0 ? diffDays : 0
  }

  const updateFormData = (updates: Partial<BookingFormData>) => {
    setFormData((prev) => ({ ...prev, ...updates }))
  }

  // Add-on handlers
  const handleAddAddon = (addon: AdminAddOn) => {
    if (!addon.id) return
    const existing = selectedAddons.find(a => a.id === addon.id)
    if (existing) {
      handleUpdateAddonQuantity(addon.id, existing.quantity + 1)
    } else {
      const nights = calculateNights() || 1
      const guests = formData.adults + formData.children
      let total = addon.price
      if (addon.pricing_type === 'per_night') total = addon.price * nights
      else if (addon.pricing_type === 'per_guest') total = addon.price * guests
      else if (addon.pricing_type === 'per_guest_per_night') total = addon.price * guests * nights

      setSelectedAddons([...selectedAddons, {
        id: addon.id,
        name: addon.name,
        quantity: 1,
        price: addon.price,
        pricing_type: addon.pricing_type || 'per_booking',
        total,
      }])
    }
  }

  const handleUpdateAddonQuantity = (addonId: string, quantity: number) => {
    if (quantity <= 0) {
      setSelectedAddons(selectedAddons.filter(a => a.id !== addonId))
    } else {
      const nights = calculateNights() || 1
      const guests = formData.adults + formData.children
      setSelectedAddons(selectedAddons.map(a => {
        if (a.id !== addonId) return a
        let total = a.price * quantity
        if (a.pricing_type === 'per_night') total = a.price * nights * quantity
        else if (a.pricing_type === 'per_guest') total = a.price * guests * quantity
        else if (a.pricing_type === 'per_guest_per_night') total = a.price * guests * nights * quantity
        return { ...a, quantity, total }
      }))
    }
  }

  // Save handler
  const handleSave = useCallback(async () => {
    if (!formData.room_id) {
      showNotification('error', 'Please select a room')
      return
    }
    if (!formData.guest_name) {
      showNotification('error', 'Please enter guest name')
      return
    }
    if (!formData.check_in || !formData.check_out) {
      showNotification('error', 'Please select check-in and check-out dates')
      return
    }

    try {
      setIsSaving(true)

      const notesData: any = {
        guests: formData.adults + formData.children,
        adults: formData.adults,
        children: formData.children,
        children_ages: formData.children_ages,
      }
      if (formData.notes) {
        notesData.special_requests = formData.notes
      }
      if (selectedAddons.length > 0) {
        notesData.addons = selectedAddons.map(a => ({
          id: a.id,
          name: a.name,
          quantity: a.quantity,
          price: a.price,
          total: a.total,
        }))
      }
      if (appliedCoupon) {
        notesData.coupon = {
          id: appliedCoupon.id,
          code: appliedCoupon.code,
          name: appliedCoupon.name,
          discount_type: appliedCoupon.discount_type,
          discount_value: appliedCoupon.discount_value,
          discount_amount: appliedCoupon.discount_amount,
        }
      }
      // Save pricing breakdown with any custom overrides
      if (pricingBreakdown.length > 0) {
        const hasOverrides = pricingBreakdown.some(n => n.overridePrice !== null)
        if (hasOverrides) {
          notesData.pricing_breakdown = pricingBreakdown.map(n => ({
            date: n.date,
            base_price: n.price,
            effective_price: n.overridePrice !== null ? n.overridePrice : n.price,
            is_custom: n.overridePrice !== null,
            seasonal_rate: n.seasonalRate?.name || null,
          }))
        }
      }

      const bookingData = {
        room_id: formData.room_id,
        guest_name: formData.guest_name,
        guest_email: formData.guest_email || undefined,
        guest_phone: formData.guest_phone || undefined,
        check_in: formData.check_in,
        check_out: formData.check_out,
        adults: formData.adults,
        children: formData.children,
        total_amount: formData.total_amount,
        status: formData.status,
        notes: JSON.stringify(notesData),
        coupon_id: appliedCoupon?.id || null,
        discount_amount: appliedCoupon?.discount_amount || 0,
      }

      if (isEditing && bookingId) {
        await adminTenants.updateBooking(tenantId!, bookingId, bookingData)
        showNotification('success', `Booking for ${formData.guest_name} has been updated.`)
      } else {
        await adminTenants.createBooking(tenantId!, bookingData)
        showNotification('success', `Booking for ${formData.guest_name} has been created.`)
      }

      setLastSaved(new Date())
      navigate(`/admin/tenants/${tenantId}?section=bookings`)
    } catch (error) {
      console.error('Failed to save booking:', error)
      showNotification('error', `Failed to ${isEditing ? 'update' : 'create'} booking`)
    } finally {
      setIsSaving(false)
    }
  }, [formData, selectedAddons, appliedCoupon, isEditing, bookingId, tenantId, navigate, showNotification])

  // Section navigation
  const handleSectionChange = (sectionId: string) => {
    setActiveSection(sectionId)
    const ref = sectionRefs.current[sectionId]
    if (ref) {
      ref.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  // Room change handler
  const handleRoomChange = (roomId: string) => {
    const room = rooms.find(r => r.id === roomId)
    updateFormData({
      room_id: roomId,
      room_name: room?.name || '',
      currency: room?.currency || 'ZAR',
    })
    setSelectedRoom(room || null)
    // Reset pricing when room changes
    setPricingBreakdown([])
    setCalculatedTotal(0)
    setAppliedCoupon(null)
  }

  // Guest data change handler
  const handleGuestDataChange = (data: { adults: number; children: number; childrenAges: number[] }) => {
    updateFormData({
      adults: data.adults,
      children: data.children,
      children_ages: data.childrenAges,
    })
  }

  // Format helpers
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-ZA', { style: 'currency', currency: formData.currency }).format(amount)
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return ''
    return new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  // Get section status for completeness tracking
  const getSectionStatus = (sectionId: string): SectionStatus => {
    switch (sectionId) {
      case 'room-selection':
        return formData.room_id ? 'complete' : 'empty'
      case 'dates':
        return formData.check_in && formData.check_out ? 'complete' : 'empty'
      case 'contact':
        return formData.guest_name ? 'complete' : 'empty'
      case 'guests-count':
        return formData.adults > 0 ? 'complete' : 'empty'
      case 'requests':
        return 'complete' // Optional
      case 'pricing':
        return formData.total_amount > 0 ? 'complete' : 'empty'
      case 'addons':
        return 'complete' // Optional
      case 'status':
        return 'complete' // Has defaults
      default:
        return 'empty'
    }
  }

  // Calculate completeness percentage
  const calculateCompleteness = () => {
    const required = ['room-selection', 'dates', 'contact', 'guests-count', 'pricing', 'status']
    const completed = required.filter(id => getSectionStatus(id) === 'complete').length
    return Math.round((completed / required.length) * 100)
  }

  // Get incomplete items for the preview panel
  const getIncompleteItems = () => {
    const items: { id: string; label: string; section: string }[] = []
    if (!formData.room_id) items.push({ id: 'room', label: 'Select a room', section: 'room-selection' })
    if (!formData.check_in || !formData.check_out) items.push({ id: 'dates', label: 'Set booking dates', section: 'dates' })
    if (!formData.guest_name) items.push({ id: 'name', label: 'Add guest name', section: 'contact' })
    if (formData.total_amount <= 0) items.push({ id: 'price', label: 'Set booking price', section: 'pricing' })
    return items
  }

  const nights = calculateNights()
  const totalPercentage = calculateCompleteness()
  const incompleteItems = getIncompleteItems()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-accent-500" />
      </div>
    )
  }

  // Preview card content
  const previewContent = (
    <BookingPreviewCard
      guestName={formData.guest_name}
      guestEmail={formData.guest_email}
      roomName={formData.room_name}
      checkIn={formData.check_in}
      checkOut={formData.check_out}
      adults={formData.adults}
      children={formData.children}
      totalAmount={formData.total_amount}
      currency={formData.currency}
      status={formData.status}
      paymentStatus={formData.payment_status}
    />
  )

  // Sidebar component
  const sidebar = (
    <FormSidebar
      sectionGroups={sectionGroups}
      activeSection={activeSection}
      onSectionChange={handleSectionChange}
      getSectionStatus={getSectionStatus}
      completenessPercentage={totalPercentage}
      progressLabel="Complete booking"
    />
  )

  // Preview panel component
  const preview = (
    <FormPreviewPanel
      previewTitle="Booking Preview"
      previewContent={previewContent}
      previewDescription="Live preview of the booking"
      boostTitle="Complete your booking"
      incompleteItems={incompleteItems}
      onNavigateToSection={handleSectionChange}
      allCompleteTitle="Ready to save!"
      allCompleteMessage="All required fields are complete."
    />
  )

  return (
    <FormLayout
      title={isEditing ? 'Edit Booking' : 'Create New Booking'}
      subtitle={`${tenantName}${formData.guest_name ? ` - ${formData.guest_name}` : ''}`}
      sidebar={sidebar}
      preview={preview}
      activeSection={activeSection}
      onSectionChange={handleSectionChange}
      sectionGroups={sectionGroups}
      getSectionStatus={getSectionStatus}
      completenessPercentage={totalPercentage}
      isSaving={isSaving}
      lastSaved={lastSaved}
      hasUnsavedChanges={false}
      onSave={handleSave}
      onBack={() => navigate(`/admin/tenants/${tenantId}?section=bookings`)}
      mobilePreviewContent={previewContent}
      saveButtonLabel={isEditing ? 'Update' : 'Create'}
    >
      <div className="space-y-12">
        {/* Room Selection Section */}
        <div ref={(el) => (sectionRefs.current['room-selection'] = el)} id="room-selection">
          <SectionHeader icon={Home} title="Room Selection" description="Select the room for this booking" />
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Room *</label>
              <select
                value={formData.room_id}
                onChange={(e) => handleRoomChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-400"
              >
                <option value="">Select a room...</option>
                {rooms.filter(r => r.is_active).map((room) => (
                  <option key={room.id} value={room.id}>
                    {room.name} - {formatCurrency(room.base_price_per_night)}/night ({room.max_guests} guests)
                  </option>
                ))}
              </select>
            </div>

            {/* Room Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {rooms.filter(r => r.is_active).map((room) => (
                <button
                  key={room.id}
                  type="button"
                  onClick={() => handleRoomChange(room.id)}
                  className={`p-4 border-2 rounded-xl text-left transition-all ${
                    formData.room_id === room.id
                      ? 'border-accent-500 bg-accent-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="w-full h-24 bg-gray-100 rounded-lg mb-3 overflow-hidden">
                    {room.primary_image_url ? (
                      <img src={room.primary_image_url} alt={room.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Home size={32} className="text-gray-300" />
                      </div>
                    )}
                  </div>
                  <p className="font-medium text-gray-900">{room.name}</p>
                  <p className="text-sm text-gray-500">{formatCurrency(room.base_price_per_night)}/night</p>
                </button>
              ))}
            </div>

            {selectedRoom && (
              <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                <h4 className="font-medium text-gray-900 mb-2">Room Details</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Base Price:</span>
                    <span className="ml-2 font-medium">{formatCurrency(selectedRoom.base_price_per_night)}/night</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Max Guests:</span>
                    <span className="ml-2 font-medium">{selectedRoom.max_guests}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Min Stay:</span>
                    <span className="ml-2 font-medium">{selectedRoom.min_stay_nights} night{selectedRoom.min_stay_nights !== 1 ? 's' : ''}</span>
                  </div>
                  {selectedRoom.max_stay_nights && (
                    <div>
                      <span className="text-gray-500">Max Stay:</span>
                      <span className="ml-2 font-medium">{selectedRoom.max_stay_nights} nights</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Dates Section */}
        <div ref={(el) => (sectionRefs.current['dates'] = el)} id="dates">
          <SectionHeader icon={Calendar} title="Check-in/out Dates" description="Select the booking dates" />
          <div className="space-y-4">
            <DateRangePicker
              startDate={formData.check_in}
              endDate={formData.check_out}
              onStartDateChange={(date: string) => updateFormData({ check_in: date })}
              onEndDateChange={(date: string) => updateFormData({ check_out: date })}
              minStayNights={selectedRoom?.min_stay_nights}
              maxStayNights={selectedRoom?.max_stay_nights}
            />

            {nights > 0 && (
              <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>{nights}</strong> night{nights !== 1 ? 's' : ''} • {formatDate(formData.check_in)} to {formatDate(formData.check_out)}
                </p>
              </div>
            )}

            {validationWarnings.length > 0 && (
              <div className="space-y-2">
                {validationWarnings.map((warning, i) => (
                  <div key={i} className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <AlertTriangle size={18} className="text-amber-600 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm text-amber-800">{warning.message}</p>
                      <label className="flex items-center gap-2 mt-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.override_rules}
                          onChange={(e) => updateFormData({ override_rules: e.target.checked })}
                          className="w-4 h-4 rounded border-gray-300"
                        />
                        <span className="text-sm text-amber-700">Override this rule</span>
                      </label>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Contact Info Section */}
        <div ref={(el) => (sectionRefs.current['contact'] = el)} id="contact">
          <SectionHeader icon={User} title="Contact Info" description="Primary guest's contact information" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <div className="flex items-center gap-2">
                  <User size={16} />
                  Guest Name *
                </div>
              </label>
              <input
                type="text"
                value={formData.guest_name}
                onChange={(e) => updateFormData({ guest_name: e.target.value })}
                placeholder="Enter guest's full name"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <div className="flex items-center gap-2">
                  <Mail size={16} />
                  Email Address
                </div>
              </label>
              <input
                type="email"
                value={formData.guest_email}
                onChange={(e) => updateFormData({ guest_email: e.target.value })}
                placeholder="guest@example.com"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
              <PhoneInput
                value={formData.guest_phone}
                onChange={(phone) => updateFormData({ guest_phone: phone })}
              />
            </div>
          </div>
        </div>

        {/* Number of Guests Section */}
        <div ref={(el) => (sectionRefs.current['guests-count'] = el)} id="guests-count">
          <SectionHeader icon={Users} title="Number of Guests" description="Adults and children for this booking" />
          <GuestSelector
            value={{
              adults: formData.adults,
              children: formData.children,
              childrenAges: formData.children_ages
            }}
            onChange={handleGuestDataChange}
            mode="full"
            showLabels={true}
          />
        </div>

        {/* Special Requests Section */}
        <div ref={(el) => (sectionRefs.current['requests'] = el)} id="requests">
          <SectionHeader icon={FileText} title="Special Requests" description="Any additional notes or requests" />
          <textarea
            value={formData.notes}
            onChange={(e) => updateFormData({ notes: e.target.value })}
            rows={4}
            placeholder="Enter any special requests, dietary requirements, arrival time, etc."
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-400 resize-none"
          />
        </div>

        {/* Pricing Section */}
        <div ref={(el) => (sectionRefs.current['pricing'] = el)} id="pricing">
          <SectionHeader icon={DollarSign} title="Pricing" description="Booking cost breakdown" />
          <div className="space-y-4">
            {pricingBreakdown.length > 0 && (
              <div style={{ borderColor: 'var(--border-color)' }} className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }} className="border-b">
                    <tr>
                      <th style={{ color: 'var(--text-muted)' }} className="px-4 py-2 text-left text-xs font-medium">Date</th>
                      <th style={{ color: 'var(--text-muted)' }} className="px-4 py-2 text-right text-xs font-medium">Rate</th>
                    </tr>
                  </thead>
                  <tbody style={{ borderColor: 'var(--border-color)' }} className="divide-y">
                    {pricingBreakdown.map((night, i) => {
                      const effectivePrice = night.overridePrice !== null ? night.overridePrice : night.price
                      const isOverridden = night.overridePrice !== null
                      const isEditing = editingNightIndex === i

                      return (
                        <tr key={i} className="hover:bg-gray-50 transition-colors group">
                          <td style={{ color: 'var(--text-primary)' }} className="px-4 py-2">
                            {formatDate(night.date)}
                            {night.seasonalRate && !isOverridden && (
                              <span className="ml-2 px-1.5 py-0.5 bg-blue-100 text-blue-700 text-xs rounded">
                                {night.seasonalRate.name}
                              </span>
                            )}
                            {isOverridden && (
                              <span className="ml-2 px-1.5 py-0.5 bg-amber-100 text-amber-700 text-xs rounded">
                                Custom
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-2 text-right">
                            {isEditing ? (
                              <div className="flex items-center justify-end gap-2">
                                <input
                                  type="number"
                                  defaultValue={effectivePrice}
                                  autoFocus
                                  className="w-24 px-2 py-1 text-right border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-accent-500"
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      const value = parseFloat((e.target as HTMLInputElement).value)
                                      if (!isNaN(value) && value >= 0) {
                                        handleNightPriceChange(i, value)
                                      }
                                      setEditingNightIndex(null)
                                    } else if (e.key === 'Escape') {
                                      setEditingNightIndex(null)
                                    }
                                  }}
                                  onBlur={(e) => {
                                    const value = parseFloat(e.target.value)
                                    if (!isNaN(value) && value >= 0) {
                                      handleNightPriceChange(i, value)
                                    }
                                    setEditingNightIndex(null)
                                  }}
                                />
                              </div>
                            ) : (
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  onClick={() => setEditingNightIndex(i)}
                                  className={`font-medium hover:text-accent-600 cursor-pointer ${isOverridden ? 'text-amber-700' : ''}`}
                                  title="Click to edit price"
                                >
                                  {formatCurrency(effectivePrice)}
                                </button>
                                {isOverridden && (
                                  <button
                                    onClick={() => handleClearNightOverride(i)}
                                    className="opacity-0 group-hover:opacity-100 text-xs text-gray-400 hover:text-red-500 transition-opacity"
                                    title={`Reset to ${formatCurrency(night.price)}`}
                                  >
                                    ✕
                                  </button>
                                )}
                              </div>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                  <tfoot style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }} className="border-t">
                    <tr>
                      <td style={{ color: 'var(--text-primary)' }} className="px-4 py-2 font-medium">
                        Subtotal ({nights} nights)
                        {pricingBreakdown.some(n => n.overridePrice !== null) && (
                          <button
                            onClick={() => setPricingBreakdown(prev => prev.map(n => ({ ...n, overridePrice: null })))}
                            className="ml-2 text-xs text-gray-400 hover:text-red-500"
                          >
                            Reset all
                          </button>
                        )}
                      </td>
                      <td style={{ color: 'var(--text-primary)' }} className="px-4 py-2 text-right font-bold">{formatCurrency(getEffectiveTotal())}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}

            {/* Promotional Code */}
            <div className="mt-4">
              <div className="flex items-center gap-2 mb-3">
                <Tag size={18} className="text-gray-500" />
                <span className="text-sm font-medium text-gray-700">Promotional Code</span>
              </div>
              <CouponInput
                onApply={async (code) => {
                  if (!tenantId) return { valid: false, errors: ['Missing tenant'] }
                  const addonsTotal = selectedAddons.reduce((sum, a) => sum + a.total, 0)
                  const result = await adminTenants.validateCoupon(tenantId, {
                    code,
                    room_id: formData.room_id,
                    subtotal: calculatedTotal + addonsTotal,
                    nights: calculateNights(),
                    check_in: formData.check_in,
                    customer_email: formData.guest_email,
                  })
                  if (result.valid && result.coupon && result.discount_amount !== undefined) {
                    setAppliedCoupon({
                      ...result.coupon,
                      discount_amount: result.discount_amount,
                    })
                  }
                  return result
                }}
                onRemove={() => setAppliedCoupon(null)}
                appliedCoupon={appliedCoupon}
                currency={formData.currency}
                disabled={!formData.room_id || !formData.check_in || !formData.check_out}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Final Amount</label>
                <input
                  type="number"
                  value={formData.total_amount}
                  onChange={(e) => {
                    setManualOverride(true)
                    updateFormData({ total_amount: parseFloat(e.target.value) || 0 })
                  }}
                  min="0"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-400"
                />
                {manualOverride && (
                  <button
                    onClick={() => {
                      setManualOverride(false)
                      const addonsTotal = selectedAddons.reduce((sum, a) => sum + a.total, 0)
                      const discount = appliedCoupon?.discount_amount || 0
                      updateFormData({ total_amount: Math.max(0, calculatedTotal + addonsTotal - discount) })
                    }}
                    className="text-xs text-blue-600 hover:underline mt-1"
                  >
                    Reset to calculated: {formatCurrency(calculatedTotal)}
                  </button>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Currency</label>
                <select
                  value={formData.currency}
                  onChange={(e) => updateFormData({ currency: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-400"
                >
                  {CURRENCIES.map(c => (
                    <option key={c.code} value={c.code}>{c.code} - {c.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Add-ons Section */}
        <div ref={(el) => (sectionRefs.current['addons'] = el)} id="addons">
          <SectionHeader icon={Package} title="Add-ons" description="Optional extras for this booking" />
          <div className="space-y-4">
            {availableAddons.length === 0 ? (
              <p className="text-sm text-gray-500">No add-ons available for this tenant.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {availableAddons.map(addon => {
                  const selected = selectedAddons.find(a => a.id === addon.id)
                  return (
                    <div key={addon.id} className={`p-3 rounded-lg border ${selected ? 'border-emerald-300 bg-emerald-50' : 'border-gray-200'}`}>
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium text-gray-900">{addon.name}</h4>
                          <p className="text-sm text-gray-500">{formatCurrency(addon.price)} / {(addon.pricing_type || 'per booking').replace(/_/g, ' ')}</p>
                        </div>
                        {selected ? (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleUpdateAddonQuantity(addon.id, selected.quantity - 1)}
                              className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-200 hover:bg-gray-300"
                            >
                              -
                            </button>
                            <span className="w-8 text-center font-medium">{selected.quantity}</span>
                            <button
                              onClick={() => handleUpdateAddonQuantity(addon.id, selected.quantity + 1)}
                              className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-200 hover:bg-gray-300"
                            >
                              +
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleAddAddon(addon)}
                            className="px-3 py-1.5 text-sm font-medium text-emerald-700 bg-emerald-100 rounded-lg hover:bg-emerald-200"
                          >
                            Add
                          </button>
                        )}
                      </div>
                      {selected && (
                        <p className="text-sm text-emerald-700 mt-2">Total: {formatCurrency(selected.total)}</p>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Booking Status Section */}
        <div ref={(el) => (sectionRefs.current['status'] = el)} id="status">
          <SectionHeader icon={CheckCircle} title="Booking Status" description="Set booking and payment status" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Booking Status</label>
              <select
                value={formData.status}
                onChange={(e) => updateFormData({ status: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-400"
              >
                {BOOKING_STATUSES.map(s => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Payment Status</label>
              <select
                value={formData.payment_status}
                onChange={(e) => updateFormData({ payment_status: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-400"
              >
                {PAYMENT_STATUSES.map(s => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>
    </FormLayout>
  )
}

import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { scrollToTop } from '../../components/ScrollToTop'
import {
  Calendar,
  Users,
  BedDouble,
  Check,
  ChevronRight,
  ChevronLeft,
  Loader2,
  Coffee,
  Wifi,
  Car,
  Tv,
  Wind,
  Bath,
  Mountain,
  UtensilsCrossed,
  Plus,
  Minus,
  AlertCircle,
  CheckCircle,
  X,
  ArrowLeft,
  Maximize,
} from 'lucide-react'
import {
  publicBookingApi,
  PublicRoom,
  PublicAddOn,
  PricingResponse,
} from '../../services/api'
import { setCustomerToken } from '../../services/portalApi'
import { useAuth } from '../../contexts/AuthContext'
import BookingCalendar from '../../components/BookingCalendar'
import TermsAcceptance from '../../components/TermsAcceptance'
import DateRangePicker from '../../components/DateRangePicker'

const STEPS = [
  { id: 1, name: 'Select Dates', short: 'Dates' },
  { id: 2, name: 'Extras', short: 'Extras' },
  { id: 3, name: 'Your Details', short: 'Details' },
  { id: 4, name: 'Confirm', short: 'Confirm' },
]

const amenityIcons: Record<string, React.ReactNode> = {
  wifi: <Wifi size={16} />,
  'free wifi': <Wifi size={16} />,
  parking: <Car size={16} />,
  'free parking': <Car size={16} />,
  tv: <Tv size={16} />,
  'air conditioning': <Wind size={16} />,
  'air-conditioning': <Wind size={16} />,
  bathroom: <Bath size={16} />,
  'private bathroom': <Bath size={16} />,
  'mountain view': <Mountain size={16} />,
  view: <Mountain size={16} />,
  breakfast: <UtensilsCrossed size={16} />,
  coffee: <Coffee size={16} />,
}

interface SelectedAddon {
  id: string
  name: string
  quantity: number
  price: number
  pricing_type: string
  total: number
}

export default function Book() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { tenant } = useAuth()

  // Get tenant ID from URL or auth context
  const tenantId = searchParams.get('property') || tenant?.id || ''

  // Get pre-selected room ID from URL (when coming from room detail page)
  const preSelectedRoomId = searchParams.get('room') || ''

  // Get pre-filled guest count from URL
  const preFilledGuests = searchParams.get('guests')

  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Property data
  const [propertyName, setPropertyName] = useState<string>('')
  const [_rooms, setRooms] = useState<PublicRoom[]>([])

  // Step 1: Dates & Room Selection
  const [checkIn, setCheckIn] = useState<string>('')
  const [checkOut, setCheckOut] = useState<string>('')
  const [adults, setAdults] = useState(2)
  const [children, setChildren] = useState(0)
  const [selectedRoom, setSelectedRoom] = useState<PublicRoom | null>(null)
  const [unavailableDates, setUnavailableDates] = useState<string[]>([])
  const [seasonalDates, setSeasonalDates] = useState<string[]>([])
  const [navigateToMonth, setNavigateToMonth] = useState<Date | null>(null)
  const [pricing, setPricing] = useState<PricingResponse | null>(null)

  // Total guests (computed)
  const guests = adults + children

  // Step 2: Add-ons
  const [addons, setAddons] = useState<PublicAddOn[]>([])
  const [selectedAddons, setSelectedAddons] = useState<SelectedAddon[]>([])

  // Step 3: Guest Details
  const [guestName, setGuestName] = useState('')
  const [guestEmail, setGuestEmail] = useState('')
  const [guestPhone, setGuestPhone] = useState('')
  const [specialRequests, setSpecialRequests] = useState('')

  // Step 4: Confirmation
  const [bookingConfirmed, setBookingConfirmed] = useState(false)
  const [bookingReference, setBookingReference] = useState('')
  const [termsAccepted, setTermsAccepted] = useState(false)

  // Set default dates (today + 1 to today + 3) and pre-fill guests if provided
  useEffect(() => {
    const today = new Date()
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)
    const dayAfterTomorrow = new Date(today)
    dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 3)

    setCheckIn(tomorrow.toISOString().split('T')[0])
    setCheckOut(dayAfterTomorrow.toISOString().split('T')[0])

    // Pre-fill guest count if provided in URL
    if (preFilledGuests) {
      const guestCount = parseInt(preFilledGuests, 10)
      if (!isNaN(guestCount) && guestCount > 0) {
        setAdults(Math.min(guestCount, 8)) // Cap at 8 adults
      }
    }
  }, [preFilledGuests])

  // Load property and rooms
  useEffect(() => {
    if (!tenantId) {
      setError('No property selected')
      setLoading(false)
      return
    }

    const loadData = async () => {
      try {
        setLoading(true)
        const [property, roomsData] = await Promise.all([
          publicBookingApi.getProperty(tenantId),
          publicBookingApi.getRooms(tenantId),
        ])
        setPropertyName(property.name)
        setRooms(roomsData)

        // Auto-select room if pre-selected from URL (e.g., coming from room detail page)
        if (preSelectedRoomId && roomsData.length > 0) {
          // Match by ID or room_code
          const roomToSelect = roomsData.find(
            (r: PublicRoom) => r.id === preSelectedRoomId || r.room_code === preSelectedRoomId
          )
          if (roomToSelect) {
            setSelectedRoom(roomToSelect)
          }
        }
      } catch (err) {
        setError('Failed to load property information')
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [tenantId, preSelectedRoomId])

  // Fetch booked/unavailable dates for the selected room
  useEffect(() => {
    if (!selectedRoom || !tenantId) return

    const loadBookedDates = async () => {
      try {
        const data = await publicBookingApi.getBookedDates(tenantId, selectedRoom.id)
        setUnavailableDates(data.unavailable_dates)
      } catch (err) {
        console.error('Failed to load booked dates:', err)
        setUnavailableDates([])
      }
    }

    loadBookedDates()
  }, [selectedRoom, tenantId])

  // Fetch seasonal rate periods for the selected room
  useEffect(() => {
    if (!selectedRoom || !tenantId) return

    const loadSeasonalRates = async () => {
      try {
        const data = await publicBookingApi.getSeasonalRates(tenantId, selectedRoom.id)
        // Convert rate periods to array of individual dates
        const dates: string[] = []
        for (const rate of data.rates) {
          const start = new Date(rate.start_date)
          const end = new Date(rate.end_date)
          const current = new Date(start)
          while (current <= end) {
            dates.push(current.toISOString().split('T')[0])
            current.setDate(current.getDate() + 1)
          }
        }
        setSeasonalDates(dates)
      } catch (err) {
        console.error('Failed to load seasonal rates:', err)
        setSeasonalDates([])
      }
    }

    loadSeasonalRates()
  }, [selectedRoom, tenantId])

  // Load pricing when room is selected
  useEffect(() => {
    if (!selectedRoom || !checkIn || !checkOut) return

    const loadPricing = async () => {
      try {
        const pricingData = await publicBookingApi.getPricing(
          tenantId,
          selectedRoom.id,
          checkIn,
          checkOut
        )
        setPricing(pricingData)
      } catch {
        setPricing(null)
      }
    }

    loadPricing()
  }, [selectedRoom, checkIn, checkOut, tenantId])

  // Load add-ons when room is selected
  useEffect(() => {
    if (!selectedRoom) return

    const loadAddons = async () => {
      try {
        const addonsData = await publicBookingApi.getAddons(tenantId, selectedRoom.id)
        setAddons(addonsData)
      } catch {
        setAddons([])
      }
    }

    loadAddons()
  }, [selectedRoom, tenantId])

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-ZA', { style: 'currency', currency }).format(amount)
  }

  // Handle date input changes and navigate calendar
  const handleCheckInInputChange = (dateStr: string) => {
    setCheckIn(dateStr)
    setCheckOut('') // Reset check-out when check-in changes
    if (dateStr) {
      const date = new Date(dateStr)
      setNavigateToMonth(date)
    }
  }

  const handleCheckOutInputChange = (dateStr: string) => {
    setCheckOut(dateStr)
    if (dateStr) {
      const date = new Date(dateStr)
      setNavigateToMonth(date)
    }
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-ZA', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  }

  const calculateNights = () => {
    if (!checkIn || !checkOut) return 0
    const start = new Date(checkIn)
    const end = new Date(checkOut)
    return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
  }

  const calculateAddonTotal = (addon: PublicAddOn, quantity: number) => {
    const nights = calculateNights()
    switch (addon.pricing_type) {
      case 'per_night':
        return addon.price * nights * quantity
      case 'per_guest':
        return addon.price * guests * quantity
      case 'per_guest_per_night':
        return addon.price * guests * nights * quantity
      case 'per_booking':
      default:
        return addon.price * quantity
    }
  }

  const handleAddonToggle = (addon: PublicAddOn, quantity: number) => {
    if (quantity === 0) {
      setSelectedAddons((prev) => prev.filter((a) => a.id !== addon.id))
    } else {
      const total = calculateAddonTotal(addon, quantity)
      const existing = selectedAddons.find((a) => a.id === addon.id)
      if (existing) {
        setSelectedAddons((prev) =>
          prev.map((a) => (a.id === addon.id ? { ...a, quantity, total } : a))
        )
      } else {
        setSelectedAddons((prev) => [
          ...prev,
          {
            id: addon.id,
            name: addon.name,
            quantity,
            price: addon.price,
            pricing_type: addon.pricing_type,
            total,
          },
        ])
      }
    }
  }

  const getAddonsTotal = () => {
    return selectedAddons.reduce((sum, a) => sum + a.total, 0)
  }

  const getChildrenTotal = () => {
    if (!selectedRoom || children === 0) return 0
    const nights = calculateNights()
    // If child_price_per_night is undefined/null, children pay same as adults (already in pricing)
    // If child_price_per_night is 0, children are free
    // If child_price_per_night is > 0, use that rate
    if (selectedRoom.child_price_per_night === undefined || selectedRoom.child_price_per_night === null) {
      return 0 // Children pricing not defined, assume included in room pricing
    }
    return selectedRoom.child_price_per_night * children * nights
  }

  const getTotalAmount = () => {
    return (pricing?.subtotal || 0) + getChildrenTotal() + getAddonsTotal()
  }

  const handleNext = () => {
    if (step === 1) {
      if (!selectedRoom) {
        setError('Please select a room first')
        return
      }
      if (!checkIn || !checkOut) {
        setError('Please select your check-in and check-out dates')
        return
      }
      if (guests > selectedRoom.max_guests) {
        setError(`This room allows maximum ${selectedRoom.max_guests} guests`)
        return
      }
      const nights = calculateNights()
      if (nights < selectedRoom.min_stay_nights) {
        setError(`Minimum stay is ${selectedRoom.min_stay_nights} nights`)
        return
      }
      if (selectedRoom.max_stay_nights && nights > selectedRoom.max_stay_nights) {
        setError(`Maximum stay is ${selectedRoom.max_stay_nights} nights`)
        return
      }
    }
    if (step === 3) {
      if (!guestName.trim()) {
        setError('Please enter your name')
        return
      }
      if (!guestEmail.trim() || !guestEmail.includes('@')) {
        setError('Please enter a valid email')
        return
      }
    }
    setError(null)
    setStep((prev) => Math.min(prev + 1, 4))
    scrollToTop()
  }

  const handleBack = () => {
    setError(null)
    setStep((prev) => Math.max(prev - 1, 1))
    scrollToTop()
  }

  const handleSubmit = async () => {
    if (!selectedRoom || !pricing) return

    setSubmitting(true)
    setError(null)

    try {
      const result = await publicBookingApi.createBooking(tenantId, {
        guest_name: guestName,
        guest_email: guestEmail,
        guest_phone: guestPhone || undefined,
        room_id: selectedRoom.id,
        check_in: checkIn,
        check_out: checkOut,
        guests,
        adults,
        children,
        addons: selectedAddons.map((a) => ({
          id: a.id,
          name: a.name,
          quantity: a.quantity,
          price: a.price,
          total: a.total,
        })),
        special_requests: specialRequests || undefined,
        total_amount: getTotalAmount(),
        currency: pricing.currency,
      })

      setBookingReference(result.booking.reference)

      // If we got a token back, auto-login and redirect to customer portal
      if (result.token) {
        setCustomerToken(result.token)
        // Redirect to customer portal with the new booking
        navigate('/portal/bookings')
        return
      }

      // Fallback to showing confirmation if no token
      setBookingConfirmed(true)
    } catch (err: any) {
      setError(err.message || 'Failed to complete booking')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-gray-400" />
          <p className="text-gray-600">Loading booking information...</p>
        </div>
      </div>
    )
  }

  if (!tenantId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 mx-auto mb-4 text-red-500" />
          <h2 className="text-xl font-semibold mb-2">No Property Selected</h2>
          <p className="text-gray-600">Please access this page from a valid property link.</p>
        </div>
      </div>
    )
  }

  // Confirmation Screen
  if (bookingConfirmed) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-2xl mx-auto px-4">
          <div className="bg-white rounded-xl shadow-lg p-8 text-center">
            <div className="w-16 h-16 bg-accent-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-8 h-8 text-accent-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Booking Confirmed!</h1>
            <p className="text-gray-600 mb-6">
              Thank you for your reservation. We've sent a confirmation email to{' '}
              <strong>{guestEmail}</strong>
            </p>

            <div className="bg-gray-50 rounded-lg p-6 mb-6 text-left">
              <div className="text-center mb-4">
                <p className="text-sm text-gray-500">Booking Reference</p>
                <p className="text-2xl font-bold text-gray-900">{bookingReference}</p>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-500">Property</p>
                  <p className="font-medium">{propertyName}</p>
                </div>
                <div>
                  <p className="text-gray-500">Room</p>
                  <p className="font-medium">{selectedRoom?.name}</p>
                </div>
                <div>
                  <p className="text-gray-500">Check-in</p>
                  <p className="font-medium">{formatDate(checkIn)}</p>
                </div>
                <div>
                  <p className="text-gray-500">Check-out</p>
                  <p className="font-medium">{formatDate(checkOut)}</p>
                </div>
                <div>
                  <p className="text-gray-500">Guests</p>
                  <p className="font-medium">
                    {adults} {adults === 1 ? 'Adult' : 'Adults'}
                    {children > 0 && `, ${children} ${children === 1 ? 'Child' : 'Children'}`}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500">Total</p>
                  <p className="font-medium text-lg">
                    {formatCurrency(getTotalAmount(), pricing?.currency || 'ZAR')}
                  </p>
                </div>
              </div>
            </div>

            <p className="text-sm text-gray-500 mb-6">
              The property will contact you shortly to confirm your booking and arrange payment.
            </p>

            <button
              onClick={() => navigate('/')}
              className="px-6 py-3 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors"
            >
              Back to Home
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-900">{propertyName}</h1>
              <p className="text-sm text-gray-500">Book your stay</p>
            </div>
            <button
              onClick={() => navigate('/')}
              className="p-2 text-gray-500 hover:text-gray-700"
            >
              <X size={24} />
            </button>
          </div>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="bg-white border-b">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            {STEPS.map((s, index) => (
              <div key={s.id} className="flex items-center flex-1">
                <div className="flex items-center">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                      step > s.id
                        ? 'bg-accent-600 text-white'
                        : step === s.id
                        ? 'bg-black text-white'
                        : 'bg-gray-200 text-gray-500'
                    }`}
                  >
                    {step > s.id ? <Check size={16} /> : s.id}
                  </div>
                  <span
                    className={`ml-2 text-sm hidden sm:inline ${
                      step >= s.id ? 'text-gray-900' : 'text-gray-400'
                    }`}
                  >
                    {s.name}
                  </span>
                  <span
                    className={`ml-2 text-sm sm:hidden ${
                      step >= s.id ? 'text-gray-900' : 'text-gray-400'
                    }`}
                  >
                    {s.short}
                  </span>
                </div>
                {index < STEPS.length - 1 && (
                  <div
                    className={`flex-1 h-1 mx-4 rounded ${
                      step > s.id ? 'bg-accent-600' : 'bg-gray-200'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="max-w-6xl mx-auto px-4 pt-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
            <p className="text-red-700">{error}</p>
            <button onClick={() => setError(null)} className="ml-auto text-red-500">
              <X size={18} />
            </button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Main Content */}
          <div className="lg:col-span-2">
            {/* Step 1: Select Dates */}
            {step === 1 && (
              <div className="space-y-6">
                {/* No room selected - show message */}
                {!selectedRoom && (
                  <div className="bg-white rounded-xl shadow-sm border p-8 text-center">
                    <BedDouble className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                    <h2 className="text-lg font-semibold text-gray-900 mb-2">No Room Selected</h2>
                    <p className="text-gray-500 mb-4">Please select a room from our accommodation page first.</p>
                    <button
                      onClick={() => navigate('/accommodation')}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors"
                    >
                      <ArrowLeft size={18} />
                      View Rooms
                    </button>
                  </div>
                )}

                {/* Room selected - show room info, calendar, and guest selection */}
                {selectedRoom && (
                  <>
                    {/* Selected Room Info */}
                    <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                      <div className="flex flex-col sm:flex-row">
                        {/* Room Image */}
                        <div className="sm:w-48 h-48 sm:h-auto flex-shrink-0">
                          {selectedRoom.images?.featured ? (
                            <img
                              src={selectedRoom.images.featured.url}
                              alt={selectedRoom.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                              <BedDouble className="w-12 h-12 text-gray-300" />
                            </div>
                          )}
                        </div>

                        {/* Room Details */}
                        <div className="flex-1 p-4">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <h3 className="font-semibold text-gray-900 text-lg">{selectedRoom.name}</h3>
                              <div className="flex flex-wrap gap-3 text-sm text-gray-500 mt-1">
                                {(selectedRoom.bed_count || selectedRoom.bed_type) && (
                                  <span className="flex items-center gap-1">
                                    <BedDouble size={14} />
                                    {selectedRoom.bed_count || 1}x {selectedRoom.bed_type || 'Bed'}
                                  </span>
                                )}
                                <span className="flex items-center gap-1">
                                  <Users size={14} />
                                  Max {selectedRoom.max_guests} guests
                                </span>
                                {selectedRoom.room_size_sqm && (
                                  <span className="flex items-center gap-1">
                                    <Maximize size={14} />
                                    {selectedRoom.room_size_sqm} m²
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-lg font-bold text-gray-900">
                                {formatCurrency(selectedRoom.base_price_per_night, selectedRoom.currency)}
                              </p>
                              <p className="text-xs text-gray-500">per night</p>
                            </div>
                          </div>

                          {selectedRoom.description && (
                            <p className="text-sm text-gray-600 mt-2 line-clamp-2">
                              {selectedRoom.description}
                            </p>
                          )}

                          {/* Amenities */}
                          {selectedRoom.amenities && selectedRoom.amenities.length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-3">
                              {selectedRoom.amenities.slice(0, 6).map((amenity, i) => (
                                <span
                                  key={i}
                                  className="inline-flex items-center gap-1 text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded"
                                >
                                  {amenityIcons[amenity.toLowerCase()] || <Check size={12} />}
                                  {amenity}
                                </span>
                              ))}
                              {selectedRoom.amenities.length > 6 && (
                                <span className="text-xs text-gray-500 self-center">
                                  +{selectedRoom.amenities.length - 6} more
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Guest Selection */}
                    <div className="bg-white rounded-xl shadow-sm border p-4">
                      <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                        <Users size={16} />
                        Number of Guests
                      </h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">Adults</label>
                          <select
                            value={adults}
                            onChange={(e) => setAdults(parseInt(e.target.value))}
                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
                          >
                            {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                              <option key={n} value={n} disabled={n > selectedRoom.max_guests}>
                                {n} {n === 1 ? 'Adult' : 'Adults'}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">Children</label>
                          <select
                            value={children}
                            onChange={(e) => setChildren(parseInt(e.target.value))}
                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
                          >
                            {[0, 1, 2, 3, 4, 5, 6].map((n) => (
                              <option key={n} value={n} disabled={adults + n > selectedRoom.max_guests}>
                                {n} {n === 1 ? 'Child' : 'Children'}
                              </option>
                            ))}
                          </select>
                          {selectedRoom.child_price_per_night !== undefined && selectedRoom.child_price_per_night !== null && (
                            <p className="text-xs text-gray-500 mt-1">
                              {selectedRoom.child_price_per_night === 0
                                ? 'Children stay free'
                                : `${formatCurrency(selectedRoom.child_price_per_night, selectedRoom.currency)}/night per child`}
                            </p>
                          )}
                        </div>
                      </div>
                      {guests > selectedRoom.max_guests && (
                        <p className="text-sm text-red-500 mt-2">
                          This room allows maximum {selectedRoom.max_guests} guests
                        </p>
                      )}
                    </div>

                    {/* Availability Calendar */}
                    <div className="bg-white rounded-xl shadow-sm border p-4">
                      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <Calendar size={20} />
                        Select Your Dates
                      </h3>

                      {/* Date Picker Fields */}
                      <div className="mb-4">
                        <DateRangePicker
                          startDate={checkIn}
                          endDate={checkOut}
                          onStartDateChange={(date) => handleCheckInInputChange(date)}
                          onEndDateChange={(date) => handleCheckOutInputChange(date)}
                          minDate={new Date().toISOString().split('T')[0]}
                          startLabel="Check-in"
                          endLabel="Check-out"
                          unavailableDates={unavailableDates}
                          seasonalDates={seasonalDates}
                          minStayNights={selectedRoom.min_stay_nights}
                          maxStayNights={selectedRoom.max_stay_nights}
                        />
                      </div>

                      {/* Calendar View */}
                      <BookingCalendar
                        checkIn={checkIn}
                        checkOut={checkOut}
                        onCheckInChange={setCheckIn}
                        onCheckOutChange={setCheckOut}
                        unavailableDates={unavailableDates}
                        seasonalDates={seasonalDates}
                        minStayNights={selectedRoom.min_stay_nights}
                        maxStayNights={selectedRoom.max_stay_nights}
                        navigateToMonth={navigateToMonth}
                      />
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Step 2: Add-ons */}
            {step === 2 && (
              <div className="space-y-6">
                <div className="bg-white rounded-xl shadow-sm border p-6">
                  <h2 className="text-lg font-semibold mb-4">Enhance your stay</h2>
                  <p className="text-gray-600 mb-6">
                    Add extras to make your stay even more comfortable
                  </p>

                  {addons.length === 0 ? (
                    <div className="text-center py-8">
                      <Coffee className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                      <p className="text-gray-500">No extras available for this room</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {addons.map((addon) => {
                        const selected = selectedAddons.find((a) => a.id === addon.id)
                        const quantity = selected?.quantity || 0

                        return (
                          <div
                            key={addon.id}
                            className={`border rounded-lg p-4 transition-all ${
                              quantity > 0 ? 'border-black bg-gray-50' : 'hover:border-gray-300'
                            }`}
                          >
                            <div className="flex items-start gap-4">
                              {/* Add-on Image */}
                              {addon.image ? (
                                <img
                                  src={addon.image.url}
                                  alt={addon.name}
                                  className="w-16 h-16 object-cover rounded-lg flex-shrink-0"
                                />
                              ) : (
                                <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                  <Coffee className="w-6 h-6 text-gray-300" />
                                </div>
                              )}

                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <h3 className="font-medium text-gray-900">{addon.name}</h3>
                                  <span
                                    className={`px-2 py-0.5 text-xs rounded-full ${
                                      addon.addon_type === 'service'
                                        ? 'bg-blue-100 text-blue-700'
                                        : addon.addon_type === 'product'
                                        ? 'bg-purple-100 text-purple-700'
                                        : 'bg-orange-100 text-orange-700'
                                    }`}
                                  >
                                    {addon.addon_type}
                                  </span>
                                </div>
                                {addon.description && (
                                  <p className="text-sm text-gray-500 mt-1">{addon.description}</p>
                                )}
                                <p className="text-sm text-gray-900 mt-2">
                                  <span className="font-medium">
                                    {formatCurrency(addon.price, addon.currency)}
                                  </span>
                                  <span className="text-gray-500">
                                    {' '}
                                    /{' '}
                                    {addon.pricing_type
                                      .replace('per_', '')
                                      .replace('_', ' ')
                                      .replace('guest night', 'guest/night')}
                                  </span>
                                </p>
                              </div>

                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => handleAddonToggle(addon, Math.max(0, quantity - 1))}
                                  disabled={quantity === 0}
                                  className="w-8 h-8 rounded-full border flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
                                >
                                  <Minus size={16} />
                                </button>
                                <span className="w-8 text-center font-medium">{quantity}</span>
                                <button
                                  onClick={() =>
                                    handleAddonToggle(
                                      addon,
                                      Math.min(addon.max_quantity, quantity + 1)
                                    )
                                  }
                                  disabled={quantity >= addon.max_quantity}
                                  className="w-8 h-8 rounded-full border flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
                                >
                                  <Plus size={16} />
                                </button>
                              </div>
                            </div>

                            {quantity > 0 && (
                              <div className="mt-3 pt-3 border-t text-right">
                                <span className="text-sm text-gray-500">Subtotal: </span>
                                <span className="font-medium">
                                  {formatCurrency(selected?.total || 0, addon.currency)}
                                </span>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Step 3: Guest Details */}
            {step === 3 && (
              <div className="space-y-6">
                <div className="bg-white rounded-xl shadow-sm border p-6">
                  <h2 className="text-lg font-semibold mb-4">Your details</h2>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Full Name *
                      </label>
                      <input
                        type="text"
                        value={guestName}
                        onChange={(e) => setGuestName(e.target.value)}
                        placeholder="John Doe"
                        className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Email Address *
                      </label>
                      <input
                        type="email"
                        value={guestEmail}
                        onChange={(e) => setGuestEmail(e.target.value)}
                        placeholder="john@example.com"
                        className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
                      />
                      <p className="mt-1 text-xs text-gray-500">
                        Confirmation will be sent to this email
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Phone Number
                      </label>
                      <input
                        type="tel"
                        value={guestPhone}
                        onChange={(e) => setGuestPhone(e.target.value)}
                        placeholder="+27 12 345 6789"
                        className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Special Requests
                      </label>
                      <textarea
                        value={specialRequests}
                        onChange={(e) => setSpecialRequests(e.target.value)}
                        placeholder="Any special requests or requirements..."
                        rows={4}
                        className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-black focus:border-transparent resize-none"
                      />
                      <p className="mt-1 text-xs text-gray-500">
                        Special requests are subject to availability
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 4: Confirmation */}
            {step === 4 && (
              <div className="space-y-6">
                <div className="bg-white rounded-xl shadow-sm border p-6">
                  <h2 className="text-lg font-semibold mb-4">Review your booking</h2>

                  {/* Booking Summary */}
                  <div className="space-y-4">
                    {/* Room */}
                    <div className="flex gap-4 pb-4 border-b">
                      {selectedRoom?.images?.featured ? (
                        <img
                          src={selectedRoom.images.featured.url}
                          alt={selectedRoom.name}
                          className="w-24 h-24 object-cover rounded-lg"
                        />
                      ) : (
                        <div className="w-24 h-24 bg-gray-100 rounded-lg flex items-center justify-center">
                          <BedDouble className="w-8 h-8 text-gray-300" />
                        </div>
                      )}
                      <div>
                        <h3 className="font-semibold text-gray-900">{selectedRoom?.name}</h3>
                        <p className="text-sm text-gray-500">
                          {selectedRoom?.bed_count}x {selectedRoom?.bed_type}
                        </p>
                        <p className="text-sm text-gray-500">
                          {adults} {adults === 1 ? 'Adult' : 'Adults'}
                          {children > 0 && `, ${children} ${children === 1 ? 'Child' : 'Children'}`}
                        </p>
                      </div>
                    </div>

                    {/* Dates */}
                    <div className="grid grid-cols-2 gap-4 pb-4 border-b">
                      <div>
                        <p className="text-sm text-gray-500">Check-in</p>
                        <p className="font-medium">{formatDate(checkIn)}</p>
                        <p className="text-xs text-gray-500">From 14:00</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Check-out</p>
                        <p className="font-medium">{formatDate(checkOut)}</p>
                        <p className="text-xs text-gray-500">Until 10:00</p>
                      </div>
                    </div>

                    {/* Guest Details */}
                    <div className="pb-4 border-b">
                      <h4 className="font-medium mb-2">Guest Details</h4>
                      <p className="text-sm text-gray-600">{guestName}</p>
                      <p className="text-sm text-gray-600">{guestEmail}</p>
                      {guestPhone && <p className="text-sm text-gray-600">{guestPhone}</p>}
                      {specialRequests && (
                        <div className="mt-2">
                          <p className="text-xs text-gray-500">Special Requests:</p>
                          <p className="text-sm text-gray-600">{specialRequests}</p>
                        </div>
                      )}
                    </div>

                    {/* Add-ons */}
                    {selectedAddons.length > 0 && (
                      <div className="pb-4 border-b">
                        <h4 className="font-medium mb-2">Extras</h4>
                        {selectedAddons.map((addon) => (
                          <div key={addon.id} className="flex justify-between text-sm py-1">
                            <span className="text-gray-600">
                              {addon.name} x{addon.quantity}
                            </span>
                            <span className="font-medium">
                              {formatCurrency(addon.total, pricing?.currency || 'ZAR')}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Terms Acceptance */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <TermsAcceptance
                    accepted={termsAccepted}
                    onChange={setTermsAccepted}
                  />
                  <p className="text-sm text-gray-500 mt-3">
                    Your booking is subject to confirmation by the property.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Right Column - Price Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-sm border p-6 sticky top-4">
              <h3 className="font-semibold text-gray-900 mb-4">Price Summary</h3>

              {selectedRoom && pricing ? (
                <>
                  <div className="space-y-3 pb-4 border-b">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">
                        {selectedRoom.name} ({adults} {adults === 1 ? 'adult' : 'adults'}) x {pricing.night_count}{' '}
                        {pricing.night_count === 1 ? 'night' : 'nights'}
                      </span>
                      <span>{formatCurrency(pricing.subtotal, pricing.currency)}</span>
                    </div>

                    {children > 0 && getChildrenTotal() > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">
                          {children} {children === 1 ? 'child' : 'children'} x {pricing.night_count}{' '}
                          {pricing.night_count === 1 ? 'night' : 'nights'}
                        </span>
                        <span>{formatCurrency(getChildrenTotal(), pricing.currency)}</span>
                      </div>
                    )}

                    {children > 0 && selectedRoom.child_price_per_night === 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600 italic">
                          {children} {children === 1 ? 'child' : 'children'} (free)
                        </span>
                        <span className="text-accent-600">Free</span>
                      </div>
                    )}

                    {selectedAddons.map((addon) => (
                      <div key={addon.id} className="flex justify-between text-sm">
                        <span className="text-gray-600">
                          {addon.name} x{addon.quantity}
                        </span>
                        <span>{formatCurrency(addon.total, pricing.currency)}</span>
                      </div>
                    ))}
                  </div>

                  <div className="flex justify-between pt-4">
                    <span className="font-semibold">Total</span>
                    <span className="text-xl font-bold">
                      {formatCurrency(getTotalAmount(), pricing.currency)}
                    </span>
                  </div>

                  <p className="text-xs text-gray-500 mt-2">Taxes and fees may apply</p>
                </>
              ) : selectedRoom ? (
                <div className="text-center py-8">
                  <Calendar className="w-10 h-10 mx-auto mb-3 text-gray-300" />
                  <p className="text-gray-500 text-sm">Select your check-in and check-out dates to see the total cost</p>
                </div>
              ) : (
                <div className="text-center py-8">
                  <BedDouble className="w-10 h-10 mx-auto mb-3 text-gray-300" />
                  <p className="text-gray-500 text-sm">Select a room to see pricing</p>
                </div>
              )}

              {/* Navigation Buttons */}
              <div className="mt-6 space-y-3">
                {step < 4 ? (
                  <button
                    onClick={handleNext}
                    disabled={step === 1 && (!selectedRoom || !checkIn || !checkOut)}
                    className="w-full py-3 bg-black text-white rounded-lg font-medium hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    Continue
                    <ChevronRight size={18} />
                  </button>
                ) : (
                  <button
                    onClick={handleSubmit}
                    disabled={submitting || !termsAccepted}
                    className="w-full py-3 bg-black text-white rounded-lg font-medium hover:bg-gray-800 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        Confirm Booking
                        <Check size={18} />
                      </>
                    )}
                  </button>
                )}

                {step > 1 && (
                  <button
                    onClick={handleBack}
                    className="w-full py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
                  >
                    <ChevronLeft size={18} />
                    Back
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

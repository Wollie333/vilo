import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import {
  Calendar,
  Users,
  BedDouble,
  Check,
  ChevronRight,
  ChevronLeft,
  Loader2,
  MapPin,
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
} from 'lucide-react'
import {
  publicBookingApi,
  PublicRoom,
  PublicAddOn,
  PricingResponse,
  AvailabilityResponse,
} from '../../services/api'
import { useAuth } from '../../contexts/AuthContext'

const STEPS = [
  { id: 1, name: 'Dates & Room', short: 'Room' },
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

  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Property data
  const [propertyName, setPropertyName] = useState<string>('')
  const [rooms, setRooms] = useState<PublicRoom[]>([])

  // Step 1: Dates & Room Selection
  const [checkIn, setCheckIn] = useState<string>('')
  const [checkOut, setCheckOut] = useState<string>('')
  const [guests, setGuests] = useState(2)
  const [selectedRoom, setSelectedRoom] = useState<PublicRoom | null>(null)
  const [availability, setAvailability] = useState<Record<string, AvailabilityResponse>>({})
  const [pricing, setPricing] = useState<PricingResponse | null>(null)

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

  // Set default dates (today + 1 to today + 3)
  useEffect(() => {
    const today = new Date()
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)
    const dayAfterTomorrow = new Date(today)
    dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 3)

    setCheckIn(tomorrow.toISOString().split('T')[0])
    setCheckOut(dayAfterTomorrow.toISOString().split('T')[0])
  }, [])

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
      } catch (err) {
        setError('Failed to load property information')
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [tenantId])

  // Check availability when dates change
  useEffect(() => {
    if (!checkIn || !checkOut || rooms.length === 0) return

    const checkAllAvailability = async () => {
      const results: Record<string, AvailabilityResponse> = {}
      for (const room of rooms) {
        try {
          const avail = await publicBookingApi.checkAvailability(
            tenantId,
            room.id,
            checkIn,
            checkOut
          )
          results[room.id] = avail
        } catch {
          results[room.id] = {
            available: false,
            available_units: 0,
            total_units: room.total_units,
            nights: 0,
            min_stay_nights: room.min_stay_nights,
            max_stay_nights: room.max_stay_nights || null,
            meets_min_stay: false,
            meets_max_stay: false,
          }
        }
      }
      setAvailability(results)
    }

    checkAllAvailability()
  }, [checkIn, checkOut, rooms, tenantId])

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

  const getTotalAmount = () => {
    return (pricing?.subtotal || 0) + getAddonsTotal()
  }

  const handleSelectRoom = (room: PublicRoom) => {
    const avail = availability[room.id]
    if (!avail?.available) return

    if (guests > room.max_guests) {
      setError(`This room allows maximum ${room.max_guests} guests`)
      return
    }

    setSelectedRoom(room)
    setError(null)
  }

  const handleNext = () => {
    if (step === 1 && !selectedRoom) {
      setError('Please select a room')
      return
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
  }

  const handleBack = () => {
    setError(null)
    setStep((prev) => Math.max(prev - 1, 1))
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
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-8 h-8 text-green-600" />
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
                  <p className="font-medium">{guests}</p>
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
                        ? 'bg-green-600 text-white'
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
                      step > s.id ? 'bg-green-600' : 'bg-gray-200'
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
            {/* Step 1: Dates & Room Selection */}
            {step === 1 && (
              <div className="space-y-6">
                {/* Date & Guest Selection */}
                <div className="bg-white rounded-xl shadow-sm border p-6">
                  <h2 className="text-lg font-semibold mb-4">When are you staying?</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        <Calendar size={14} className="inline mr-1" />
                        Check-in
                      </label>
                      <input
                        type="date"
                        value={checkIn}
                        min={new Date().toISOString().split('T')[0]}
                        onChange={(e) => setCheckIn(e.target.value)}
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        <Calendar size={14} className="inline mr-1" />
                        Check-out
                      </label>
                      <input
                        type="date"
                        value={checkOut}
                        min={checkIn || new Date().toISOString().split('T')[0]}
                        onChange={(e) => setCheckOut(e.target.value)}
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        <Users size={14} className="inline mr-1" />
                        Guests
                      </label>
                      <select
                        value={guests}
                        onChange={(e) => setGuests(parseInt(e.target.value))}
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
                      >
                        {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                          <option key={n} value={n}>
                            {n} {n === 1 ? 'Guest' : 'Guests'}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  {calculateNights() > 0 && (
                    <p className="mt-3 text-sm text-gray-500">
                      {calculateNights()} {calculateNights() === 1 ? 'night' : 'nights'} ·{' '}
                      {formatDate(checkIn)} to {formatDate(checkOut)}
                    </p>
                  )}
                </div>

                {/* Room Selection */}
                <div>
                  <h2 className="text-lg font-semibold mb-4">Select your room</h2>
                  <div className="space-y-4">
                    {rooms.length === 0 ? (
                      <div className="bg-white rounded-xl shadow-sm border p-8 text-center">
                        <BedDouble className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                        <p className="text-gray-500">No rooms available</p>
                      </div>
                    ) : (
                      rooms.map((room) => {
                        const avail = availability[room.id]
                        const isAvailable = avail?.available
                        const isSelected = selectedRoom?.id === room.id

                        return (
                          <div
                            key={room.id}
                            onClick={() => handleSelectRoom(room)}
                            className={`bg-white rounded-xl shadow-sm border overflow-hidden cursor-pointer transition-all ${
                              isSelected
                                ? 'ring-2 ring-black border-transparent'
                                : isAvailable
                                ? 'hover:shadow-md'
                                : 'opacity-60 cursor-not-allowed'
                            }`}
                          >
                            <div className="flex flex-col sm:flex-row">
                              {/* Room Image */}
                              <div className="sm:w-48 h-48 sm:h-auto flex-shrink-0">
                                {room.images?.featured ? (
                                  <img
                                    src={room.images.featured.url}
                                    alt={room.name}
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
                                    <h3 className="font-semibold text-gray-900">{room.name}</h3>
                                    <p className="text-sm text-gray-500">
                                      {room.bed_count}x {room.bed_type} · Max {room.max_guests}{' '}
                                      guests
                                      {room.room_size_sqm && ` · ${room.room_size_sqm} m²`}
                                    </p>
                                  </div>
                                  {isSelected && (
                                    <div className="w-6 h-6 bg-black rounded-full flex items-center justify-center">
                                      <Check size={14} className="text-white" />
                                    </div>
                                  )}
                                </div>

                                {room.description && (
                                  <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                                    {room.description}
                                  </p>
                                )}

                                {/* Amenities */}
                                {room.amenities.length > 0 && (
                                  <div className="flex flex-wrap gap-2 mb-3">
                                    {room.amenities.slice(0, 5).map((amenity, i) => (
                                      <span
                                        key={i}
                                        className="inline-flex items-center gap-1 text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded"
                                      >
                                        {amenityIcons[amenity.toLowerCase()] || <Check size={12} />}
                                        {amenity}
                                      </span>
                                    ))}
                                    {room.amenities.length > 5 && (
                                      <span className="text-xs text-gray-500">
                                        +{room.amenities.length - 5} more
                                      </span>
                                    )}
                                  </div>
                                )}

                                {/* Price & Availability */}
                                <div className="flex items-center justify-between mt-2 pt-2 border-t">
                                  <div>
                                    {avail && !isAvailable && (
                                      <span className="text-sm text-red-600">
                                        {!avail.meets_min_stay
                                          ? `Min ${avail.min_stay_nights} nights`
                                          : !avail.meets_max_stay
                                          ? `Max ${avail.max_stay_nights} nights`
                                          : avail.available_units === 0
                                          ? 'Not available'
                                          : 'Not available'}
                                      </span>
                                    )}
                                    {isAvailable && guests > room.max_guests && (
                                      <span className="text-sm text-orange-600">
                                        Max {room.max_guests} guests
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-right">
                                    <p className="text-lg font-bold text-gray-900">
                                      {formatCurrency(room.base_price_per_night, room.currency)}
                                    </p>
                                    <p className="text-xs text-gray-500">per night</p>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        )
                      })
                    )}
                  </div>
                </div>
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
                        <p className="text-sm text-gray-500">{guests} guests</p>
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

                {/* Terms */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600">
                    By completing this booking, you agree to the property's terms and conditions.
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
                        {selectedRoom.name} x {pricing.night_count}{' '}
                        {pricing.night_count === 1 ? 'night' : 'nights'}
                      </span>
                      <span>{formatCurrency(pricing.subtotal, pricing.currency)}</span>
                    </div>

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
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-500 text-sm">Select a room to see pricing</p>
                </div>
              )}

              {/* Navigation Buttons */}
              <div className="mt-6 space-y-3">
                {step < 4 ? (
                  <button
                    onClick={handleNext}
                    disabled={step === 1 && !selectedRoom}
                    className="w-full py-3 bg-black text-white rounded-lg font-medium hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    Continue
                    <ChevronRight size={18} />
                  </button>
                ) : (
                  <button
                    onClick={handleSubmit}
                    disabled={submitting}
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

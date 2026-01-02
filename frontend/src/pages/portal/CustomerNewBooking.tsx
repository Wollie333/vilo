import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  ArrowLeft,
  Users,
  Plus,
  Minus,
  Check,
  Building2,
  BedDouble,
  Calendar,
  Package,
  Loader2,
  ChevronDown,
  ChevronUp
} from 'lucide-react'
import TermsAcceptance from '../../components/TermsAcceptance'
import { scrollToTop } from '../../components/ScrollToTop'
import DateRangePicker from '../../components/DateRangePicker'
import { portalApi, Property, Room, AddOn } from '../../services/portalApi'
import { useNotification } from '../../contexts/NotificationContext'
import { useCustomerAuth } from '../../contexts/CustomerAuthContext'

interface SelectedAddon {
  id: string
  name: string
  price: number
  quantity: number
}

const steps = [
  { number: 1, label: 'Dates & Property', shortLabel: 'Dates' },
  { number: 2, label: 'Select Room', shortLabel: 'Room' },
  { number: 3, label: 'Extras & Confirm', shortLabel: 'Confirm' }
]

export default function CustomerNewBooking() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { showSuccess, showError } = useNotification()
  const { customer: _customer } = useCustomerAuth()

  // Step tracking
  const [step, setStep] = useState(1)
  const goToStep = (newStep: number) => {
    setStep(newStep)
    scrollToTop()
  }

  // Data
  const [properties, setProperties] = useState<Property[]>([])
  const [rooms, setRooms] = useState<Room[]>([])
  const [addons, setAddons] = useState<AddOn[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  // Form state
  const [selectedProperty, setSelectedProperty] = useState(searchParams.get('property') || '')
  const [selectedRoom, setSelectedRoom] = useState('')
  const [checkIn, setCheckIn] = useState('')
  const [checkOut, setCheckOut] = useState('')
  const [adults, setAdults] = useState(2)
  const [children, setChildren] = useState(0)
  const [specialRequests, setSpecialRequests] = useState('')
  const [selectedAddons, setSelectedAddons] = useState<SelectedAddon[]>([])
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [showRoomDetails, setShowRoomDetails] = useState(true)
  const [showAddonDetails, setShowAddonDetails] = useState(true)

  // Calculated values
  const [nights, setNights] = useState(0)
  const [roomPrice, setRoomPrice] = useState(0)
  const [addonsTotal, setAddonsTotal] = useState(0)
  const [pricingBreakdown, setPricingBreakdown] = useState<Array<{ date: string; price: number; rate_name: string | null }>>([])
  const [loadingPricing, setLoadingPricing] = useState(false)

  useEffect(() => {
    loadProperties()
  }, [])

  useEffect(() => {
    if (selectedProperty && checkIn && checkOut) {
      loadRooms()
      loadAddons()
    }
  }, [selectedProperty, checkIn, checkOut])

  useEffect(() => {
    // Calculate nights
    if (checkIn && checkOut) {
      const start = new Date(checkIn)
      const end = new Date(checkOut)
      const diff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
      setNights(diff > 0 ? diff : 0)
    } else {
      setNights(0)
    }
  }, [checkIn, checkOut])

  useEffect(() => {
    // Fetch room pricing with seasonal rates from API
    const fetchPricing = async () => {
      if (selectedRoom && selectedProperty && checkIn && checkOut && nights > 0) {
        setLoadingPricing(true)
        try {
          const pricing = await portalApi.getRoomPricing(selectedProperty, selectedRoom, checkIn, checkOut)
          setRoomPrice(pricing.subtotal)
          setPricingBreakdown(pricing.nights)
        } catch (error) {
          console.error('Failed to fetch pricing:', error)
          // Fallback to base price if pricing API fails
          const room = rooms.find(r => r.id === selectedRoom)
          if (room) {
            const price = room.pricing?.basePrice || room.base_price || 0
            setRoomPrice(price * nights)
          }
          setPricingBreakdown([])
        } finally {
          setLoadingPricing(false)
        }
      } else {
        setRoomPrice(0)
        setPricingBreakdown([])
      }
    }
    fetchPricing()
  }, [selectedRoom, selectedProperty, checkIn, checkOut, nights, rooms])

  useEffect(() => {
    // Calculate addons total
    const total = selectedAddons.reduce((sum, addon) => sum + (addon.price * addon.quantity), 0)
    setAddonsTotal(total)
  }, [selectedAddons])

  const loadProperties = async () => {
    try {
      setLoading(true)
      const data = await portalApi.getProperties()
      setProperties(data)

      // If property was passed in URL, select it
      if (searchParams.get('property') && data.find(p => p.id === searchParams.get('property'))) {
        setSelectedProperty(searchParams.get('property')!)
      }
    } catch (error) {
      console.error('Failed to load properties:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadRooms = async () => {
    if (!selectedProperty || !checkIn || !checkOut) return

    try {
      const data = await portalApi.getPropertyRooms(selectedProperty, checkIn, checkOut)
      setRooms(data)
    } catch (error) {
      console.error('Failed to load rooms:', error)
    }
  }

  const loadAddons = async () => {
    if (!selectedProperty) return

    try {
      const data = await portalApi.getPropertyAddons(selectedProperty)
      setAddons(data)
    } catch (error) {
      console.error('Failed to load addons:', error)
    }
  }

  const handleAddonToggle = (addon: AddOn) => {
    const existing = selectedAddons.find(a => a.id === addon.id)
    if (existing) {
      setSelectedAddons(selectedAddons.filter(a => a.id !== addon.id))
    } else {
      setSelectedAddons([...selectedAddons, {
        id: addon.id,
        name: addon.name,
        price: addon.price,
        quantity: 1
      }])
    }
  }

  const updateAddonQuantity = (addonId: string, delta: number) => {
    setSelectedAddons(selectedAddons.map(addon => {
      if (addon.id === addonId) {
        const newQty = Math.max(1, addon.quantity + delta)
        return { ...addon, quantity: newQty }
      }
      return addon
    }))
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const formatDate = (date: string) => {
    if (!date) return ''
    return new Date(date).toLocaleDateString('en-ZA', {
      weekday: 'short',
      day: 'numeric',
      month: 'short'
    })
  }

  const getTomorrow = () => {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    return tomorrow.toISOString().split('T')[0]
  }


  const canProceedToStep2 = selectedProperty && checkIn && checkOut && nights > 0
  const canProceedToStep3 = canProceedToStep2 && selectedRoom

  const handleSubmit = async () => {
    if (!selectedProperty || !selectedRoom || !checkIn || !checkOut) {
      showError('Error', 'Please fill in all required fields')
      return
    }

    try {
      setSubmitting(true)

      await portalApi.createBooking({
        tenantId: selectedProperty,
        roomId: selectedRoom,
        checkIn,
        checkOut,
        guests: adults + children,
        adults,
        children,
        specialRequests,
        addons: selectedAddons
      })

      showSuccess('Booking Created!', 'Your booking request has been submitted')
      navigate('/portal/bookings')
    } catch (error: any) {
      showError('Error', error.message || 'Failed to create booking')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-600 mx-auto mb-3" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (properties.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="sticky top-0 z-40 bg-white border-b border-gray-200 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 lg:px-6 py-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate('/portal')}
                className="p-2 -ml-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <h1 className="text-lg font-semibold text-gray-900">Book Again</h1>
            </div>
          </div>
        </header>
        <div className="max-w-4xl mx-auto px-4 lg:px-6 py-12 text-center">
          <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
            <Building2 className="w-8 h-8 text-gray-400" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">No Properties Available</h2>
          <p className="text-gray-500">
            You can only book again with properties you've previously stayed at.
          </p>
        </div>
      </div>
    )
  }

  const selectedRoomData = rooms.find(r => r.id === selectedRoom)
  const selectedPropertyData = properties.find(p => p.id === selectedProperty)
  const grandTotal = roomPrice + addonsTotal

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sticky Header */}
      <header className="sticky top-0 z-40 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 lg:px-6">
          {/* Top row: Back, Title, Progress (desktop) */}
          <div className="flex items-center justify-between py-4">
            {/* Left: Back button & Title */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => step === 1 ? navigate('/portal') : goToStep(step - 1)}
                className="p-2 -ml-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div className="min-w-0">
                <h1 className="text-lg font-semibold text-gray-900 truncate">
                  {step === 1 ? 'Select dates & property' :
                   step === 2 ? 'Select room' : 'Confirm booking'}
                </h1>
                <p className="text-sm text-gray-500 truncate hidden sm:block">Book Again</p>
              </div>
            </div>

            {/* Right: Progress indicator (desktop) */}
            <div className="hidden lg:flex items-center gap-1">
              {steps.map((s, index) => {
                const isActive = s.number === step
                const isCompleted = s.number < step
                const canClick = isCompleted

                return (
                  <div key={s.number} className="flex items-center">
                    <button
                      onClick={() => canClick && goToStep(s.number)}
                      disabled={!canClick}
                      className={`
                        flex items-center gap-2 px-3 py-2 rounded-lg transition-all
                        ${canClick ? 'cursor-pointer hover:bg-gray-100' : 'cursor-default'}
                        ${isActive ? 'bg-gray-100' : ''}
                      `}
                    >
                      <div
                        className={`
                          w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-all
                          ${isCompleted
                            ? 'bg-emerald-600 text-white'
                            : isActive
                              ? 'bg-black text-white ring-2 ring-gray-200'
                              : 'bg-gray-200 text-gray-400'
                          }
                        `}
                      >
                        {isCompleted ? <Check className="w-3.5 h-3.5" /> : s.number}
                      </div>
                      <span
                        className={`
                          text-sm whitespace-nowrap hidden xl:block
                          ${isActive ? 'text-gray-900 font-medium' : isCompleted ? 'text-gray-700' : 'text-gray-400'}
                        `}
                      >
                        {s.label}
                      </span>
                    </button>
                    {index < steps.length - 1 && (
                      <div className={`w-6 h-0.5 mx-1 ${isCompleted ? 'bg-emerald-600' : 'bg-gray-200'}`} />
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Mobile progress bar */}
          <div className="lg:hidden pb-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                {steps.map((s, index) => {
                  const isActive = s.number === step
                  const isCompleted = s.number < step
                  const canClick = isCompleted

                  return (
                    <div key={s.number} className="flex items-center">
                      <button
                        onClick={() => canClick && goToStep(s.number)}
                        disabled={!canClick}
                        className={`
                          w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold transition-all
                          ${canClick ? 'cursor-pointer' : 'cursor-default'}
                          ${isCompleted
                            ? 'bg-emerald-600 text-white'
                            : isActive
                              ? 'bg-black text-white'
                              : 'bg-gray-200 text-gray-400'
                          }
                        `}
                      >
                        {isCompleted ? <Check className="w-4 h-4" /> : s.number}
                      </button>
                      {index < steps.length - 1 && (
                        <div className={`w-4 h-0.5 mx-1 ${isCompleted ? 'bg-emerald-600' : 'bg-gray-200'}`} />
                      )}
                    </div>
                  )
                })}
              </div>
              <span className="text-xs font-medium text-gray-500 whitespace-nowrap">
                {steps.find(s => s.number === step)?.shortLabel}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 lg:px-6 py-6">
        <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
          {/* Main Form Panel */}
          <div className="flex-1 min-w-0 pb-24 lg:pb-0">
            {/* Step 1: Property & Dates */}
            {step === 1 && (
              <div className="animate-fade-in space-y-6">
                <div className="mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center">
                      <Calendar className="w-5 h-5 text-gray-600" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-gray-900">Select Property & Dates</h2>
                      <p className="text-gray-500 mt-0.5">Choose where and when you'd like to stay</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-6">
                  {/* Property Selection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Property</label>
                    <select
                      value={selectedProperty}
                      onChange={(e) => {
                        setSelectedProperty(e.target.value)
                        setSelectedRoom('')
                      }}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                    >
                      <option value="">Select a property</option>
                      {properties.map((property) => (
                        <option key={property.id} value={property.id}>
                          {property.business_name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Date Selection */}
                  <DateRangePicker
                    startDate={checkIn}
                    endDate={checkOut}
                    onStartDateChange={(date) => {
                      setCheckIn(date)
                      setSelectedRoom('')
                      if (checkOut && new Date(checkOut) <= new Date(date)) {
                        setCheckOut('')
                      }
                    }}
                    onEndDateChange={(date) => {
                      setCheckOut(date)
                      setSelectedRoom('')
                    }}
                    minDate={getTomorrow()}
                    startLabel="Check-in"
                    endLabel="Check-out"
                  />

                  {/* Guests */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Adults</label>
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => setAdults(Math.max(1, adults - 1))}
                          className="w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-colors"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                        <span className="w-8 text-center font-medium">{adults}</span>
                        <button
                          type="button"
                          onClick={() => setAdults(adults + 1)}
                          className="w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-colors"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Children</label>
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => setChildren(Math.max(0, children - 1))}
                          className="w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-colors"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                        <span className="w-8 text-center font-medium">{children}</span>
                        <button
                          type="button"
                          onClick={() => setChildren(children + 1)}
                          className="w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-colors"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Desktop Continue Button */}
                <div className="hidden lg:flex justify-end">
                  <button
                    onClick={() => goToStep(2)}
                    disabled={!canProceedToStep2}
                    className={`
                      px-8 py-3 rounded-xl font-medium transition-all
                      ${canProceedToStep2
                        ? 'bg-black text-white hover:bg-gray-800'
                        : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                      }
                    `}
                  >
                    Continue
                  </button>
                </div>
              </div>
            )}

            {/* Step 2: Room Selection */}
            {step === 2 && (
              <div className="animate-fade-in space-y-6">
                <div className="mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center">
                      <BedDouble className="w-5 h-5 text-gray-600" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-gray-900">Select Room</h2>
                      <p className="text-gray-500 mt-0.5">Choose your accommodation</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
                  {rooms.length === 0 ? (
                    <div className="text-center py-8">
                      <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
                        <BedDouble className="w-6 h-6 text-gray-400" />
                      </div>
                      <p className="text-gray-500">No rooms available for selected dates</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {rooms.map((room) => {
                        const price = room.pricing?.basePrice || room.base_price || 0
                        const isAvailable = room.isAvailable !== false
                        const isSelected = selectedRoom === room.id

                        return (
                          <div
                            key={room.id}
                            onClick={() => isAvailable && setSelectedRoom(room.id)}
                            className={`
                              group p-4 rounded-xl border-2 transition-all cursor-pointer
                              ${isSelected
                                ? 'border-emerald-600 bg-emerald-50 shadow-sm'
                                : isAvailable
                                  ? 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
                                  : 'border-gray-200 bg-gray-50 cursor-not-allowed opacity-60'
                              }
                            `}
                          >
                            <div className="flex gap-4">
                              {/* Room Image */}
                              <div className="w-24 h-24 flex-shrink-0 rounded-lg overflow-hidden bg-gray-100">
                                {room.images?.featured ? (
                                  <img
                                    src={room.images.featured.url}
                                    alt={room.name}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center">
                                    <BedDouble className="w-8 h-8 text-gray-300" />
                                  </div>
                                )}
                              </div>

                              {/* Room Details */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between">
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <h3 className="font-semibold text-gray-900">{room.name}</h3>
                                      {!isAvailable && (
                                        <span className="px-2 py-0.5 text-xs bg-red-100 text-red-700 rounded-full">
                                          Not Available
                                        </span>
                                      )}
                                    </div>
                                    <p className="text-sm text-gray-500 mt-0.5">{room.room_type}</p>
                                    <div className="flex items-center gap-1 mt-2 text-sm text-gray-500">
                                      <Users className="w-4 h-4" />
                                      <span>Up to {room.max_occupancy} guests</span>
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <p className="font-semibold text-gray-900">{formatCurrency(price)}</p>
                                    <p className="text-xs text-gray-500">per night</p>
                                  </div>
                                </div>
                                {room.amenities && room.amenities.length > 0 && (
                                  <div className="flex flex-wrap gap-1.5 mt-3">
                                    {room.amenities.slice(0, 4).map((amenity, i) => (
                                      <span key={i} className="px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded-full">
                                        {amenity}
                                      </span>
                                    ))}
                                    {room.amenities.length > 4 && (
                                      <span className="text-xs text-gray-500">+{room.amenities.length - 4} more</span>
                                    )}
                                  </div>
                                )}
                              </div>

                              {/* Selection indicator */}
                              <div className={`
                                w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-1 transition-all
                                ${isSelected
                                  ? 'border-emerald-600 bg-emerald-600'
                                  : 'border-gray-300 group-hover:border-gray-400'
                                }
                              `}>
                                {isSelected && <Check className="w-4 h-4 text-white" />}
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>

                {/* Desktop Navigation */}
                <div className="hidden lg:flex justify-between">
                  <button
                    onClick={() => goToStep(1)}
                    className="px-6 py-3 rounded-xl font-medium border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Back
                  </button>
                  <button
                    onClick={() => goToStep(3)}
                    disabled={!canProceedToStep3}
                    className={`
                      px-8 py-3 rounded-xl font-medium transition-all
                      ${canProceedToStep3
                        ? 'bg-black text-white hover:bg-gray-800'
                        : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                      }
                    `}
                  >
                    Continue
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Add-ons & Review */}
            {step === 3 && (
              <div className="animate-fade-in space-y-6">
                <div className="mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center">
                      <Package className="w-5 h-5 text-gray-600" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-gray-900">Extras & Confirm</h2>
                      <p className="text-gray-500 mt-0.5">Add extras and complete your booking</p>
                    </div>
                  </div>
                </div>

                {/* Add-ons Card */}
                {addons.length > 0 && (
                  <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Optional Extras</h3>
                    <div className="space-y-3">
                      {addons.map((addon) => {
                        const selected = selectedAddons.find(a => a.id === addon.id)
                        const isSelected = !!selected

                        return (
                          <div
                            key={addon.id}
                            className={`
                              group p-4 rounded-xl border-2 transition-all cursor-pointer
                              ${isSelected
                                ? 'border-emerald-600 bg-emerald-50 shadow-sm'
                                : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
                              }
                            `}
                            onClick={() => handleAddonToggle(addon)}
                          >
                            <div className="flex items-start gap-4">
                              <button
                                className={`
                                  w-6 h-6 rounded-lg border-2 flex-shrink-0 flex items-center justify-center transition-all
                                  ${isSelected
                                    ? 'bg-emerald-600 border-emerald-600'
                                    : 'border-gray-300 group-hover:border-gray-400'
                                  }
                                `}
                              >
                                {isSelected && <Check className="w-4 h-4 text-white" />}
                              </button>
                              <div className="flex-1 min-w-0">
                                <h4 className="font-medium text-gray-900">{addon.name}</h4>
                                {addon.description && (
                                  <p className="text-sm text-gray-500 mt-0.5">{addon.description}</p>
                                )}
                                <div className="flex items-center gap-2 mt-2">
                                  <span className="text-sm font-semibold text-emerald-700">{formatCurrency(addon.price)}</span>
                                  <span className="text-xs text-gray-400">{addon.price_type}</span>
                                </div>
                              </div>
                              {isSelected && (
                                <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                                  <button
                                    onClick={() => updateAddonQuantity(addon.id, -1)}
                                    className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-100 transition-colors"
                                  >
                                    <Minus className="w-4 h-4" />
                                  </button>
                                  <span className="w-6 text-center font-medium">{selected.quantity}</span>
                                  <button
                                    onClick={() => updateAddonQuantity(addon.id, 1)}
                                    className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-100 transition-colors"
                                  >
                                    <Plus className="w-4 h-4" />
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* Special Requests Card */}
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Special Requests</h3>
                  <textarea
                    value={specialRequests}
                    onChange={(e) => setSpecialRequests(e.target.value)}
                    placeholder="Any special requests or notes for the property..."
                    rows={3}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm shadow-sm resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                  />
                </div>

                {/* Terms Card */}
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
                  <TermsAcceptance
                    accepted={termsAccepted}
                    onChange={setTermsAccepted}
                  />
                </div>

                {/* Desktop Navigation */}
                <div className="hidden lg:flex justify-between">
                  <button
                    onClick={() => goToStep(2)}
                    className="px-6 py-3 rounded-xl font-medium border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Back
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={submitting || !termsAccepted}
                    className={`
                      px-8 py-3 rounded-xl font-medium transition-all flex items-center gap-2
                      ${termsAccepted && !submitting
                        ? 'bg-black text-white hover:bg-gray-800'
                        : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                      }
                    `}
                  >
                    {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                    {submitting ? 'Creating Booking...' : `Confirm Booking ${formatCurrency(grandTotal)}`}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Sticky Sidebar - Desktop Only */}
          <div className="hidden lg:block w-[380px] flex-shrink-0">
            <div className="sticky top-28 space-y-4">
              {/* Property Card */}
              {selectedPropertyData && (
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                  <h3 className="font-semibold text-gray-900">{selectedPropertyData.business_name}</h3>
                </div>
              )}

              {/* Booking Summary Card */}
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                <h3 className="font-semibold text-gray-900 mb-4">Your booking</h3>

                {/* Dates */}
                {checkIn && checkOut ? (
                  <div className="flex items-start gap-3 pb-4 border-b border-gray-100">
                    <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                      <Calendar className="w-5 h-5 text-gray-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-900">
                        {formatDate(checkIn)} — {formatDate(checkOut)}
                      </div>
                      <div className="text-sm text-gray-500">
                        {nights} night{nights !== 1 ? 's' : ''}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3 pb-4 border-b border-gray-100 text-gray-400">
                    <div className="w-10 h-10 rounded-lg bg-gray-50 flex items-center justify-center flex-shrink-0">
                      <Calendar className="w-5 h-5" />
                    </div>
                    <span className="text-sm">Select your dates</span>
                  </div>
                )}

                {/* Guests */}
                <div className="flex items-center gap-3 py-4 border-b border-gray-100">
                  <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                    <Users className="w-5 h-5 text-gray-600" />
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">
                      {adults + children} guest{(adults + children) !== 1 ? 's' : ''}
                    </div>
                    <div className="text-sm text-gray-500">
                      {adults} adult{adults !== 1 ? 's' : ''}{children > 0 ? `, ${children} child${children !== 1 ? 'ren' : ''}` : ''}
                    </div>
                  </div>
                </div>

                {/* Selected Room */}
                {selectedRoomData ? (
                  <div className="py-4 border-b border-gray-100">
                    <button
                      onClick={() => setShowRoomDetails(!showRoomDetails)}
                      className="w-full flex items-center justify-between text-left"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                          <BedDouble className="w-5 h-5 text-gray-600" />
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">{selectedRoomData.name}</div>
                          <div className="text-sm text-gray-500">
                            {loadingPricing ? 'Calculating...' : formatCurrency(roomPrice)}
                          </div>
                        </div>
                      </div>
                      {showRoomDetails ? (
                        <ChevronUp className="w-5 h-5 text-gray-400" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-gray-400" />
                      )}
                    </button>

                    {showRoomDetails && pricingBreakdown.length > 0 && pricingBreakdown.some(n => n.rate_name) && (
                      <div className="mt-3 space-y-1 pl-[52px] animate-fade-in">
                        {pricingBreakdown.map((night, idx) => (
                          <div key={idx} className="flex justify-between text-xs">
                            <span className="text-gray-500">
                              {new Date(night.date).toLocaleDateString('en-ZA', { weekday: 'short', day: 'numeric', month: 'short' })}
                              {night.rate_name && <span className="ml-1 text-emerald-600">({night.rate_name})</span>}
                            </span>
                            <span className="text-gray-700">{formatCurrency(night.price)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-3 py-4 border-b border-gray-100 text-gray-400">
                    <div className="w-10 h-10 rounded-lg bg-gray-50 flex items-center justify-center flex-shrink-0">
                      <BedDouble className="w-5 h-5" />
                    </div>
                    <span className="text-sm">Select a room</span>
                  </div>
                )}

                {/* Add-ons */}
                {selectedAddons.length > 0 && (
                  <div className="py-4 border-b border-gray-100">
                    <button
                      onClick={() => setShowAddonDetails(!showAddonDetails)}
                      className="w-full flex items-center justify-between text-left"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                          <Package className="w-5 h-5 text-gray-600" />
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">
                            {selectedAddons.length} extra{selectedAddons.length !== 1 ? 's' : ''}
                          </div>
                          <div className="text-sm text-gray-500">{formatCurrency(addonsTotal)}</div>
                        </div>
                      </div>
                      {showAddonDetails ? (
                        <ChevronUp className="w-5 h-5 text-gray-400" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-gray-400" />
                      )}
                    </button>

                    {showAddonDetails && (
                      <div className="mt-3 space-y-2 pl-[52px] animate-fade-in">
                        {selectedAddons.map((addon) => (
                          <div key={addon.id} className="flex justify-between text-sm">
                            <span className="text-gray-600">
                              {addon.name}
                              {addon.quantity > 1 && <span className="text-gray-400 ml-1">×{addon.quantity}</span>}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Price Breakdown */}
                <div className="pt-4 space-y-2">
                  {roomPrice > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Accommodation</span>
                      <span className="text-gray-900">{formatCurrency(roomPrice)}</span>
                    </div>
                  )}
                  {addonsTotal > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Extras</span>
                      <span className="text-gray-900">{formatCurrency(addonsTotal)}</span>
                    </div>
                  )}

                  {/* Grand Total */}
                  <div className="flex justify-between pt-3 border-t border-gray-200 mt-3">
                    <span className="font-semibold text-gray-900">Total</span>
                    <span className="text-xl font-bold text-gray-900">{formatCurrency(grandTotal)}</span>
                  </div>
                </div>
              </div>

              {/* Continue Button - Steps 1 & 2 */}
              {step < 3 && (
                <button
                  onClick={() => goToStep(step + 1)}
                  disabled={step === 1 ? !canProceedToStep2 : !canProceedToStep3}
                  className={`
                    w-full py-3.5 rounded-xl font-semibold text-center transition-all
                    ${(step === 1 ? canProceedToStep2 : canProceedToStep3)
                      ? 'bg-black text-white hover:bg-gray-800 shadow-lg shadow-black/10'
                      : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    }
                  `}
                >
                  Continue
                </button>
              )}

              {/* Trust indicators */}
              <div className="flex items-center justify-center gap-4 text-xs text-gray-400 pt-2">
                <span>Secure booking</span>
                <span>•</span>
                <span>Instant confirmation</span>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Mobile Bottom Bar */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 shadow-lg">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between mb-3">
            <div>
              <span className="text-sm text-gray-500">Total</span>
              <div className="text-lg font-bold text-gray-900">{formatCurrency(grandTotal)}</div>
            </div>
          </div>
          {step === 3 ? (
            <button
              onClick={handleSubmit}
              disabled={submitting || !termsAccepted}
              className={`
                w-full py-3.5 rounded-xl font-semibold text-center transition-all flex items-center justify-center gap-2
                ${termsAccepted && !submitting
                  ? 'bg-black text-white hover:bg-gray-800'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }
              `}
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {submitting ? 'Creating...' : 'Confirm Booking'}
            </button>
          ) : (
            <button
              onClick={() => goToStep(step + 1)}
              disabled={step === 1 ? !canProceedToStep2 : !canProceedToStep3}
              className={`
                w-full py-3.5 rounded-xl font-semibold text-center transition-all
                ${(step === 1 ? canProceedToStep2 : canProceedToStep3)
                  ? 'bg-black text-white hover:bg-gray-800'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }
              `}
            >
              Continue
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

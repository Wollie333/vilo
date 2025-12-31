import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Users, Plus, Minus, Check, Building2, BedDouble } from 'lucide-react'
import Button from '../../components/Button'
import TermsAcceptance from '../../components/TermsAcceptance'
import { scrollToTop } from '../../components/ScrollToTop'
import Card from '../../components/Card'
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
    return `R ${amount.toLocaleString()}`
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
      <div className="p-8 bg-gray-50 min-h-full">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-accent-200 border-t-accent-600 rounded-full animate-spin mx-auto mb-4" />
            <p className="text-gray-500">Loading...</p>
          </div>
        </div>
      </div>
    )
  }

  if (properties.length === 0) {
    return (
      <div className="p-8 bg-gray-50 min-h-full">
        <button
          onClick={() => navigate('/portal')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-8"
        >
          <ArrowLeft size={18} />
          Back to Dashboard
        </button>

        <div className="text-center py-12">
          <Building2 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
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

  return (
    <div className="p-8 bg-gray-50 min-h-full">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => navigate('/portal')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft size={18} />
          Back to Dashboard
        </button>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Book Again</h1>
        <p className="text-gray-600">Make a new reservation at a property you've stayed with before</p>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center gap-4 mb-8">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex items-center">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
              step >= s ? 'bg-gray-900 text-white' : 'bg-gray-200 text-gray-500'
            }`}>
              {step > s ? <Check size={16} /> : s}
            </div>
            <span className={`ml-2 text-sm ${step >= s ? 'text-gray-900' : 'text-gray-500'}`}>
              {s === 1 ? 'Dates' : s === 2 ? 'Room' : 'Add-ons'}
            </span>
            {s < 3 && <div className={`w-12 h-0.5 mx-4 ${step > s ? 'bg-gray-900' : 'bg-gray-200'}`} />}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2">
          {/* Step 1: Property & Dates */}
          {step === 1 && (
            <Card className="p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">Select Property & Dates</h2>

              {/* Property Selection */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">Property</label>
                <select
                  value={selectedProperty}
                  onChange={(e) => {
                    setSelectedProperty(e.target.value)
                    setSelectedRoom('')
                  }}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-400"
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
              <div className="mb-6">
                <DateRangePicker
                  startDate={checkIn}
                  endDate={checkOut}
                  onStartDateChange={(date) => {
                    setCheckIn(date)
                    setSelectedRoom('')
                    // Reset checkout if it's before new check-in
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
              </div>

              {/* Guests */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Adults</label>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setAdults(Math.max(1, adults - 1))}
                      className="w-10 h-10 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-100"
                    >
                      <Minus size={16} />
                    </button>
                    <span className="w-8 text-center font-medium">{adults}</span>
                    <button
                      type="button"
                      onClick={() => setAdults(adults + 1)}
                      className="w-10 h-10 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-100"
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Children</label>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setChildren(Math.max(0, children - 1))}
                      className="w-10 h-10 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-100"
                    >
                      <Minus size={16} />
                    </button>
                    <span className="w-8 text-center font-medium">{children}</span>
                    <button
                      type="button"
                      onClick={() => setChildren(children + 1)}
                      className="w-10 h-10 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-100"
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <Button
                  onClick={() => goToStep(2)}
                  disabled={!canProceedToStep2}
                >
                  Continue to Room Selection
                </Button>
              </div>
            </Card>
          )}

          {/* Step 2: Room Selection */}
          {step === 2 && (
            <Card className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900">Select Room</h2>
                <button
                  onClick={() => goToStep(1)}
                  className="text-sm text-gray-500 hover:text-gray-700"
                >
                  Change dates
                </button>
              </div>

              {rooms.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500">No rooms available for selected dates</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {rooms.map((room) => {
                    const price = room.pricing?.basePrice || room.base_price || 0
                    const isAvailable = room.isAvailable !== false

                    return (
                      <div
                        key={room.id}
                        onClick={() => isAvailable && setSelectedRoom(room.id)}
                        className={`border rounded-lg cursor-pointer transition-all overflow-hidden ${
                          selectedRoom === room.id
                            ? 'border-gray-900 bg-gray-50'
                            : isAvailable
                              ? 'border-gray-200 hover:border-gray-300'
                              : 'border-gray-200 bg-gray-100 cursor-not-allowed opacity-60'
                        }`}
                      >
                        <div className="flex">
                          {/* Room Image */}
                          <div className="w-32 h-32 flex-shrink-0">
                            {room.images?.featured ? (
                              <img
                                src={room.images.featured.url}
                                alt={room.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                                <BedDouble className="w-8 h-8 text-gray-300" />
                              </div>
                            )}
                          </div>

                          {/* Room Details */}
                          <div className="flex-1 p-4">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <h3 className="font-semibold text-gray-900">{room.name}</h3>
                                  {!isAvailable && (
                                    <span className="px-2 py-0.5 text-xs bg-red-100 text-red-700 rounded">
                                      Not Available
                                    </span>
                                  )}
                                </div>
                                <p className="text-sm text-gray-500 mt-1">{room.room_type}</p>
                                <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                                  <span className="flex items-center gap-1">
                                    <Users size={14} />
                                    Up to {room.max_occupancy} guests
                                  </span>
                                </div>
                                {room.amenities && room.amenities.length > 0 && (
                                  <div className="flex flex-wrap gap-2 mt-2">
                                    {room.amenities.slice(0, 4).map((amenity, i) => (
                                      <span key={i} className="px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded">
                                        {amenity}
                                      </span>
                                    ))}
                                    {room.amenities.length > 4 && (
                                      <span className="text-xs text-gray-500">+{room.amenities.length - 4} more</span>
                                    )}
                                  </div>
                                )}
                              </div>
                              <div className="text-right">
                                <p className="font-semibold text-gray-900">{formatCurrency(price)}</p>
                                <p className="text-xs text-gray-500">per night</p>
                              </div>
                            </div>
                            {selectedRoom === room.id && (
                              <div className="mt-3 pt-3 border-t border-gray-200">
                                <div className="flex items-center gap-2 text-accent-600">
                                  <Check size={16} />
                                  <span className="text-sm font-medium">Selected</span>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              <div className="flex justify-between mt-6">
                <Button variant="secondary" onClick={() => goToStep(1)}>
                  Back
                </Button>
                <Button
                  onClick={() => goToStep(3)}
                  disabled={!canProceedToStep3}
                >
                  Continue to Add-ons
                </Button>
              </div>
            </Card>
          )}

          {/* Step 3: Add-ons & Review */}
          {step === 3 && (
            <Card className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900">Add-ons & Review</h2>
                <button
                  onClick={() => goToStep(2)}
                  className="text-sm text-gray-500 hover:text-gray-700"
                >
                  Change room
                </button>
              </div>

              {/* Add-ons */}
              {addons.length > 0 && (
                <div className="mb-6">
                  <h3 className="font-medium text-gray-900 mb-3">Optional Add-ons</h3>
                  <div className="space-y-3">
                    {addons.map((addon) => {
                      const selected = selectedAddons.find(a => a.id === addon.id)

                      return (
                        <div
                          key={addon.id}
                          className={`p-3 border rounded-lg transition-all ${
                            selected ? 'border-gray-900 bg-gray-50' : 'border-gray-200'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <input
                                type="checkbox"
                                checked={!!selected}
                                onChange={() => handleAddonToggle(addon)}
                                className="w-4 h-4"
                              />
                              <div>
                                <p className="font-medium text-gray-900">{addon.name}</p>
                                {addon.description && (
                                  <p className="text-sm text-gray-500">{addon.description}</p>
                                )}
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="font-medium text-gray-900">{formatCurrency(addon.price)}</p>
                              <p className="text-xs text-gray-500">{addon.price_type}</p>
                            </div>
                          </div>
                          {selected && (
                            <div className="mt-3 pt-3 border-t border-gray-200 flex items-center justify-between">
                              <span className="text-sm text-gray-500">Quantity</span>
                              <div className="flex items-center gap-3">
                                <button
                                  type="button"
                                  onClick={() => updateAddonQuantity(addon.id, -1)}
                                  className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-100"
                                >
                                  <Minus size={14} />
                                </button>
                                <span className="w-6 text-center font-medium">{selected.quantity}</span>
                                <button
                                  type="button"
                                  onClick={() => updateAddonQuantity(addon.id, 1)}
                                  className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-100"
                                >
                                  <Plus size={14} />
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Special Requests */}
              <div className="mb-6">
                <h3 className="font-medium text-gray-900 mb-3">Special Requests</h3>
                <textarea
                  value={specialRequests}
                  onChange={(e) => setSpecialRequests(e.target.value)}
                  placeholder="Any special requests or notes for the property..."
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-400"
                />
              </div>

              {/* Terms Acceptance */}
              <div className="mb-6">
                <TermsAcceptance
                  accepted={termsAccepted}
                  onChange={setTermsAccepted}
                />
              </div>

              <div className="flex justify-between">
                <Button variant="secondary" onClick={() => goToStep(2)}>
                  Back
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={submitting || !termsAccepted}
                >
                  {submitting ? 'Creating Booking...' : 'Confirm Booking'}
                </Button>
              </div>
            </Card>
          )}
        </div>

        {/* Booking Summary Sidebar */}
        <div>
          <Card className="p-6 sticky top-8">
            <h3 className="font-semibold text-gray-900 mb-4">Booking Summary</h3>

            {selectedPropertyData && (
              <div className="mb-4 pb-4 border-b border-gray-200">
                <p className="text-sm text-gray-500">Property</p>
                <p className="font-medium">{selectedPropertyData.business_name}</p>
              </div>
            )}

            {checkIn && checkOut && (
              <div className="mb-4 pb-4 border-b border-gray-200">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Check-in</p>
                    <p className="font-medium">{new Date(checkIn).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Check-out</p>
                    <p className="font-medium">{new Date(checkOut).toLocaleDateString()}</p>
                  </div>
                </div>
                <p className="text-sm text-gray-500 mt-2">{nights} night{nights !== 1 ? 's' : ''}</p>
              </div>
            )}

            <div className="mb-4 pb-4 border-b border-gray-200">
              <p className="text-sm text-gray-500">Guests</p>
              <p className="font-medium">{adults} adult{adults !== 1 ? 's' : ''}{children > 0 ? `, ${children} child${children !== 1 ? 'ren' : ''}` : ''}</p>
            </div>

            {selectedRoomData && (
              <div className="mb-4 pb-4 border-b border-gray-200">
                <p className="text-sm text-gray-500">Room</p>
                <p className="font-medium">{selectedRoomData.name}</p>
                {loadingPricing ? (
                  <p className="text-sm text-gray-400">Calculating price...</p>
                ) : pricingBreakdown.length > 0 ? (
                  <div className="mt-2 space-y-1">
                    {pricingBreakdown.some(n => n.rate_name) ? (
                      // Show breakdown when seasonal rates apply
                      pricingBreakdown.map((night, idx) => (
                        <div key={idx} className="flex justify-between text-xs">
                          <span className="text-gray-500">
                            {new Date(night.date).toLocaleDateString('en-ZA', { weekday: 'short', day: 'numeric', month: 'short' })}
                            {night.rate_name && <span className="ml-1 text-accent-600">({night.rate_name})</span>}
                          </span>
                          <span className="text-gray-700">{formatCurrency(night.price)}</span>
                        </div>
                      ))
                    ) : (
                      // Simple display when no seasonal rates
                      <p className="text-sm text-gray-500">{formatCurrency(pricingBreakdown[0]?.price || 0)} x {nights} nights</p>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">{formatCurrency(selectedRoomData.pricing?.basePrice || selectedRoomData.base_price || 0)} x {nights} nights</p>
                )}
              </div>
            )}

            {selectedAddons.length > 0 && (
              <div className="mb-4 pb-4 border-b border-gray-200">
                <p className="text-sm text-gray-500 mb-2">Add-ons</p>
                {selectedAddons.map((addon) => (
                  <div key={addon.id} className="flex justify-between text-sm">
                    <span>{addon.name} x{addon.quantity}</span>
                    <span>{formatCurrency(addon.price * addon.quantity)}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="space-y-2">
              {roomPrice > 0 && (
                <div className="flex justify-between text-sm">
                  <span>Accommodation</span>
                  <span>{formatCurrency(roomPrice)}</span>
                </div>
              )}
              {addonsTotal > 0 && (
                <div className="flex justify-between text-sm">
                  <span>Add-ons</span>
                  <span>{formatCurrency(addonsTotal)}</span>
                </div>
              )}
              <div className="flex justify-between font-semibold text-lg pt-2 border-t border-gray-200">
                <span>Total</span>
                <span>{formatCurrency(roomPrice + addonsTotal)}</span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}

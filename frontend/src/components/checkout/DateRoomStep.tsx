import { useState, useEffect, useCallback } from 'react'
import { Check, BedDouble, Bath, Loader2, Users, Info, AlertCircle, Plus, Minus, Tag, Calendar } from 'lucide-react'
import { discoveryApi } from '../../services/discoveryApi'
import type { PropertyDetail, Room } from '../../services/discoveryApi'
import type { CheckoutState, SelectedRoomWithPricing } from '../../pages/discovery/Checkout'
import DateRangePicker from '../DateRangePicker'
import StepContainer from './StepContainer'

interface DateRoomStepProps {
  property: PropertyDetail
  state: CheckoutState
  updateState: (updates: Partial<CheckoutState>) => void
}

export default function DateRoomStep({
  property,
  state,
  updateState
}: DateRoomStepProps) {
  const [loadingPricing, setLoadingPricing] = useState(false)
  const [availabilityStatus, setAvailabilityStatus] = useState<Map<string, {
    available: boolean
    availableUnits: number
    minStay: number
    meetsMinStay: boolean
    isBookedOut: boolean
  }>>(new Map())
  const [roomPrices, setRoomPrices] = useState<Map<string, number>>(new Map()) // Per-night price for each room
  const [pricingError, setPricingError] = useState<string | null>(null)

  // Per-room guest configuration (for rooms not yet added to selection)
  const [roomGuestConfigs, setRoomGuestConfigs] = useState<Map<string, {
    adults: number
    children: number
    childrenAges: number[]
  }>>(new Map())

  // Get guest config for a room (from selectedRooms if selected, otherwise from local config)
  const getRoomGuestConfig = useCallback((roomId: string) => {
    const selectedRoom = state.selectedRooms.find(r => r.room.id === roomId)
    if (selectedRoom) {
      return {
        adults: selectedRoom.adults,
        children: selectedRoom.children,
        childrenAges: selectedRoom.childrenAges
      }
    }
    return roomGuestConfigs.get(roomId) || { adults: 1, children: 0, childrenAges: [] }
  }, [state.selectedRooms, roomGuestConfigs])

  // Update guest config for a room
  const updateRoomGuestConfig = useCallback((roomId: string, config: { adults: number; children: number; childrenAges: number[] }) => {
    const isSelected = state.selectedRooms.some(r => r.room.id === roomId)

    if (isSelected) {
      // Update in selectedRooms
      const updatedRooms = state.selectedRooms.map(r => {
        if (r.room.id === roomId) {
          return { ...r, adults: config.adults, children: config.children, childrenAges: config.childrenAges }
        }
        return r
      })
      updateState({ selectedRooms: updatedRooms })
    } else {
      // Update in local config
      setRoomGuestConfigs(prev => {
        const newMap = new Map(prev)
        newMap.set(roomId, config)
        return newMap
      })
    }
  }, [state.selectedRooms, updateState])

  const formatDate = (date: string) => {
    if (!date) return ''
    return new Date(date).toLocaleDateString('en-ZA', {
      weekday: 'short',
      day: 'numeric',
      month: 'short'
    })
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: property.currency || 'ZAR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price)
  }

  const calculateNights = useCallback((checkIn: string, checkOut: string): number => {
    if (!checkIn || !checkOut) return 0
    const start = new Date(checkIn)
    const end = new Date(checkOut)
    return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
  }, [])

  // Calculate room total based on pricing mode and guest configuration
  const calculateRoomTotal = useCallback((
    room: Room,
    avgNightlyRate: number,
    nights: number,
    adults: number,
    childrenAges: number[]
  ): number => {
    const pricingMode = room.pricingMode || 'per_unit'
    const childFreeUntilAge = room.childFreeUntilAge || 0
    const childAgeLimit = room.childAgeLimit || 12
    const childPrice = room.childPricePerNight
    const additionalRate = room.additionalPersonRate || avgNightlyRate

    // Categorize children
    const payingChildren = childrenAges.filter(age => age >= childFreeUntilAge && age < childAgeLimit).length
    const childrenAsAdults = childrenAges.filter(age => age >= childAgeLimit).length
    const totalAdults = adults + childrenAsAdults

    if (pricingMode === 'per_unit') {
      // Fixed room price - guest count doesn't affect price
      return avgNightlyRate * nights
    }

    if (pricingMode === 'per_person') {
      // Each person pays full rate
      const adultTotal = totalAdults * avgNightlyRate
      const childRate = childPrice !== undefined && childPrice !== null ? childPrice : avgNightlyRate
      const childTotal = payingChildren * childRate
      return (adultTotal + childTotal) * nights
    }

    if (pricingMode === 'per_person_sharing') {
      // First person pays base, others pay additional rate
      const firstPerson = totalAdults > 0 ? avgNightlyRate : 0
      const additionalAdults = Math.max(0, totalAdults - 1) * additionalRate
      const childRate = childPrice !== undefined && childPrice !== null
        ? Math.min(childPrice, additionalRate)
        : additionalRate
      const childTotal = payingChildren * childRate
      return (firstPerson + additionalAdults + childTotal) * nights
    }

    return avgNightlyRate * nights
  }, [])


  // Check availability for all rooms when dates change
  useEffect(() => {
    if (!state.checkIn || !state.checkOut || !property.slug) return

    const checkAllAvailability = async () => {
      const newStatus = new Map<string, {
        available: boolean
        availableUnits: number
        minStay: number
        meetsMinStay: boolean
        isBookedOut: boolean
      }>()

      await Promise.all(property.rooms.map(async (room) => {
        try {
          const result = await discoveryApi.checkAvailability(
            property.slug!,
            room.id,
            state.checkIn,
            state.checkOut
          )
          newStatus.set(room.id, {
            available: result.available,
            availableUnits: result.available_units,
            minStay: result.min_stay_nights,
            meetsMinStay: result.meets_min_stay,
            isBookedOut: result.available_units === 0
          })
        } catch {
          newStatus.set(room.id, {
            available: true,
            availableUnits: 1,
            minStay: 1,
            meetsMinStay: true,
            isBookedOut: false
          })
        }
      }))

      setAvailabilityStatus(newStatus)
    }

    checkAllAvailability()
  }, [state.checkIn, state.checkOut, property.slug, property.rooms])

  // Fetch pricing for all rooms when dates change (to show seasonal prices)
  useEffect(() => {
    if (!state.checkIn || !state.checkOut || !property.slug) return

    const fetchAllPrices = async () => {
      const newPrices = new Map<string, number>()

      await Promise.all(property.rooms.map(async (room) => {
        try {
          const pricing = await discoveryApi.getPricing(
            property.slug!,
            room.id,
            state.checkIn,
            state.checkOut
          )
          // Calculate average price per night (in case of mixed rates)
          const avgPrice = pricing.night_count > 0
            ? pricing.subtotal / pricing.night_count
            : room.basePrice
          newPrices.set(room.id, avgPrice)
        } catch {
          newPrices.set(room.id, room.basePrice)
        }
      }))

      setRoomPrices(newPrices)
    }

    fetchAllPrices()
  }, [state.checkIn, state.checkOut, property.slug, property.rooms])

  // Fetch pricing for all selected rooms
  useEffect(() => {
    if (state.selectedRooms.length === 0 || !state.checkIn || !state.checkOut || !property.slug) {
      return
    }

    const fetchAllPricings = async () => {
      setLoadingPricing(true)
      setPricingError(null)

      try {
        // First fetch all pricing from backend
        const roomsWithPricing = await Promise.all(
          state.selectedRooms.map(async (selectedRoom) => {
            try {
              const pricing = await discoveryApi.getPricing(
                property.slug!,
                selectedRoom.room.id,
                state.checkIn,
                state.checkOut
              )
              return { ...selectedRoom, pricing }
            } catch {
              return { ...selectedRoom, pricing: null }
            }
          })
        )

        // Calculate adjusted totals using each room's own guest config
        const updatedRooms: SelectedRoomWithPricing[] = roomsWithPricing.map((selectedRoom) => {
          const { room, pricing, adults, childrenAges } = selectedRoom
          const nights = pricing?.night_count || 0
          const avgRate = nights > 0 ? (pricing?.subtotal || 0) / nights : room.basePrice

          // Calculate adjusted total based on pricing mode and this room's guests
          let adjustedTotal: number
          if (room.pricingMode === 'per_unit' || !room.pricingMode) {
            // Per-unit: use backend subtotal directly
            adjustedTotal = pricing?.subtotal || avgRate * nights
          } else {
            // Per-person room: calculate with this room's own guest config
            adjustedTotal = calculateRoomTotal(room, avgRate, nights, adults, childrenAges)
          }

          return { ...selectedRoom, pricing, adjustedTotal }
        })

        updateState({ selectedRooms: updatedRooms })
      } catch (err) {
        console.error('Error fetching pricing:', err)
        setPricingError('Unable to load pricing')
      } finally {
        setLoadingPricing(false)
      }
    }

    // Only fetch if any room is missing pricing
    const needsPricing = state.selectedRooms.some(r => r.pricing === null)
    if (needsPricing) {
      fetchAllPricings()
    }
  }, [state.selectedRooms.length, state.checkIn, state.checkOut, property.slug, calculateRoomTotal])

  // Recalculate adjusted totals when per-room guests change (pricing already fetched)
  useEffect(() => {
    if (state.selectedRooms.length === 0) return

    // Only recalculate if all rooms have pricing
    const allHavePricing = state.selectedRooms.every(r => r.pricing !== null)
    if (!allHavePricing) return

    // Calculate using each room's own guest config
    const updatedRooms: SelectedRoomWithPricing[] = state.selectedRooms.map((selectedRoom) => {
      const { room, pricing, adults, childrenAges } = selectedRoom
      const nights = pricing?.night_count || 0
      const avgRate = nights > 0 ? (pricing?.subtotal || 0) / nights : room.basePrice

      // Calculate adjusted total based on pricing mode and this room's guests
      let adjustedTotal: number
      if (room.pricingMode === 'per_unit' || !room.pricingMode) {
        // Per-unit: use backend subtotal directly
        adjustedTotal = pricing?.subtotal || avgRate * nights
      } else {
        // Per-person room: calculate with this room's own guest config
        adjustedTotal = calculateRoomTotal(room, avgRate, nights, adults, childrenAges)
      }

      return { ...selectedRoom, adjustedTotal }
    })

    // Only update if totals actually changed
    const totalsChanged = updatedRooms.some((updated, i) =>
      updated.adjustedTotal !== state.selectedRooms[i]?.adjustedTotal
    )

    if (totalsChanged) {
      updateState({ selectedRooms: updatedRooms })
    }
  }, [state.selectedRooms, calculateRoomTotal])

  // Auto-deselect rooms if dates change and room no longer meets min stay
  useEffect(() => {
    if (state.selectedRooms.length === 0) return

    const validRooms = state.selectedRooms.filter(({ room }) => {
      const status = availabilityStatus.get(room.id)
      if (!status) return true // Keep if no status yet
      return !status.isBookedOut && status.meetsMinStay
    })

    if (validRooms.length !== state.selectedRooms.length) {
      updateState({ selectedRooms: validRooms })
    }
  }, [availabilityStatus])

  // Toggle room selection
  const handleToggleRoom = (room: Room) => {
    const isSelected = state.selectedRooms.some(r => r.room.id === room.id)

    if (isSelected) {
      // Remove room
      const updatedRooms = state.selectedRooms.filter(r => r.room.id !== room.id)
      updateState({ selectedRooms: updatedRooms })
    } else {
      // Add room with guest config (pricing will be fetched by effect)
      const guestConfig = getRoomGuestConfig(room.id)
      updateState({
        selectedRooms: [...state.selectedRooms, {
          room,
          pricing: null,
          adults: guestConfig.adults,
          children: guestConfig.children,
          childrenAges: guestConfig.childrenAges
        }]
      })
    }
  }

  // Check if all selected rooms have pricing loaded
  const allPricingsLoaded = state.selectedRooms.every(r => r.pricing !== null)

  // Can continue if we have rooms selected with dates and pricing
  const canContinue = state.selectedRooms.length > 0 && state.checkIn && state.checkOut && allPricingsLoaded

  // Get today's date in YYYY-MM-DD format for min date
  const today = new Date().toISOString().split('T')[0]

  return (
    <StepContainer
      title="Select Your Dates & Room"
      subtitle="When are you traveling?"
      icon={Calendar}
    >
      {/* Date Selection Card */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Travel Dates</h3>
        <DateRangePicker
          startDate={state.checkIn}
          endDate={state.checkOut}
          onStartDateChange={(date) => updateState({ checkIn: date })}
          onEndDateChange={(date) => updateState({ checkOut: date })}
          minDate={today}
          startLabel="Check-in"
          endLabel="Check-out"
        />

        {state.checkIn && state.checkOut && (
          <p className="mt-4 text-sm text-gray-500 flex items-center gap-2">
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
              {calculateNights(state.checkIn, state.checkOut)} night{calculateNights(state.checkIn, state.checkOut) !== 1 ? 's' : ''}
            </span>
            <span>{formatDate(state.checkIn)} — {formatDate(state.checkOut)}</span>
          </p>
        )}
      </div>

      {/* Room Selection Card */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Choose Your Room</h3>

        {!state.checkIn || !state.checkOut ? (
          <p className="text-gray-500 text-sm">Please select your dates first</p>
        ) : (
          <div className="space-y-3">
            {/* Info alerts for availability */}
            {(() => {
              const nights = calculateNights(state.checkIn, state.checkOut)
              const hasMinStayIssues = property.rooms.some(room => {
                const status = availabilityStatus.get(room.id)
                return status && !status.meetsMinStay && !status.isBookedOut && status.minStay > nights
              })
              const hasBookedOutRooms = property.rooms.some(room => {
                const status = availabilityStatus.get(room.id)
                return status?.isBookedOut
              })
              const hasSeasonalPricing = property.rooms.some(room => {
                const displayPrice = roomPrices.get(room.id)
                return displayPrice && displayPrice !== room.basePrice
              })

              return (
                <>
                  {hasMinStayIssues && (
                    <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
                      <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-amber-800">Minimum stay requirements</p>
                        <p className="text-sm text-amber-700 mt-0.5">
                          Some rooms have minimum night stay requirements for your selected dates.
                          Rooms that don't meet the minimum stay are shown but cannot be selected.
                          Try selecting a longer stay period to unlock more options.
                        </p>
                      </div>
                    </div>
                  )}
                  {hasBookedOutRooms && (
                    <div className="flex items-start gap-3 p-4 bg-gray-50 border border-gray-200 rounded-xl">
                      <Info className="w-5 h-5 text-gray-500 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm text-gray-600">
                          Some rooms are fully booked for your selected dates.
                          Consider adjusting your dates if your preferred room isn't available.
                        </p>
                      </div>
                    </div>
                  )}
                  {hasSeasonalPricing && (
                    <div className="flex items-start gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
                      <Info className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm text-emerald-700">
                          <span className="font-medium">Seasonal rates apply</span> — Prices shown reflect special rates for your selected dates.
                        </p>
                      </div>
                    </div>
                  )}
                </>
              )
            })()}

            {property.rooms.map((room) => {
              const isSelected = state.selectedRooms.some(r => r.room.id === room.id)
              const status = availabilityStatus.get(room.id)
              const isBookedOut = status?.isBookedOut ?? false
              const meetsMinStay = status?.meetsMinStay ?? true
              const minStay = status?.minStay ?? 1
              const canSelect = !isBookedOut && meetsMinStay // Can only select if not booked out AND meets min stay
              const displayPrice = roomPrices.get(room.id) ?? room.basePrice
              const isSeasonalRate = displayPrice !== room.basePrice

              return (
                <div
                  key={room.id}
                  className={`
                    w-full text-left p-4 rounded-xl border-2 transition-all
                    ${isSelected
                      ? 'border-emerald-600 bg-emerald-50'
                      : canSelect
                        ? 'border-gray-200 bg-white'
                        : 'border-gray-200 bg-gray-50 opacity-60'
                    }
                  `}
                >
                  <div className="flex items-start gap-4">
                    {/* Room Image Thumbnail */}
                    <div className="w-20 h-20 flex-shrink-0 rounded-lg overflow-hidden bg-gray-100">
                      {room.images && room.images.length > 0 ? (
                        <img
                          src={room.images[0]}
                          alt={room.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <BedDouble className="w-8 h-8 text-gray-300" />
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-gray-900">{room.name}</h3>
                        {isSelected && (
                          <span className="flex items-center justify-center w-5 h-5 bg-emerald-600 rounded-full">
                            <Check className="w-3 h-3 text-white" />
                          </span>
                        )}
                        {/* Coupon applicable badge */}
                        {state.initialCouponCode && (
                          state.couponApplicableRoomIds.length === 0 ||
                          state.couponApplicableRoomIds.includes(room.id)
                        ) && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full text-xs font-medium">
                            <Tag className="w-3 h-3" />
                            {state.initialCouponCode} applies
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                        <span className="flex items-center gap-1">
                          <Users className="w-3.5 h-3.5" />
                          Sleeps {room.maxGuests}
                        </span>
                        {room.bedrooms && (
                          <span className="flex items-center gap-1">
                            <BedDouble className="w-3.5 h-3.5" />
                            {room.bedrooms} bedroom{room.bedrooms !== 1 ? 's' : ''}
                          </span>
                        )}
                        {room.bathrooms && (
                          <span className="flex items-center gap-1">
                            <Bath className="w-3.5 h-3.5" />
                            {room.bathrooms} bath{room.bathrooms !== 1 ? 's' : ''}
                          </span>
                        )}
                      </div>

                      {room.description && (
                        <p className="mt-2 text-sm text-gray-600 line-clamp-2">{room.description}</p>
                      )}

                      {/* Minimum stay warning */}
                      {!isBookedOut && !meetsMinStay && minStay > 1 && (
                        <p className="mt-2 text-sm text-amber-600 font-medium">
                          Minimum stay: {minStay} nights
                        </p>
                      )}

                      {/* Per-room guest selector */}
                      {!isBookedOut && meetsMinStay && (
                        <div className="mt-3 pt-3 border-t border-gray-100">
                          {(() => {
                            const config = getRoomGuestConfig(room.id)
                            const totalGuests = config.adults + config.children
                            const maxGuests = room.maxGuests

                            return (
                              <div className="space-y-2">
                                <div className="flex items-center gap-4 flex-wrap">
                                  {/* Adults counter */}
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm text-gray-600">Adults:</span>
                                    <div className="flex items-center gap-1">
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          if (config.adults > 1) {
                                            updateRoomGuestConfig(room.id, {
                                              ...config,
                                              adults: config.adults - 1
                                            })
                                          }
                                        }}
                                        disabled={config.adults <= 1}
                                        className="w-7 h-7 flex items-center justify-center rounded-full border border-gray-300 text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
                                      >
                                        <Minus className="w-3.5 h-3.5" />
                                      </button>
                                      <span className="w-6 text-center text-sm font-medium">{config.adults}</span>
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          if (totalGuests < maxGuests) {
                                            updateRoomGuestConfig(room.id, {
                                              ...config,
                                              adults: config.adults + 1
                                            })
                                          }
                                        }}
                                        disabled={totalGuests >= maxGuests}
                                        className="w-7 h-7 flex items-center justify-center rounded-full border border-gray-300 text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
                                      >
                                        <Plus className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  </div>

                                  {/* Children counter */}
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm text-gray-600">Children:</span>
                                    <div className="flex items-center gap-1">
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          if (config.children > 0) {
                                            updateRoomGuestConfig(room.id, {
                                              ...config,
                                              children: config.children - 1,
                                              childrenAges: config.childrenAges.slice(0, -1)
                                            })
                                          }
                                        }}
                                        disabled={config.children <= 0}
                                        className="w-7 h-7 flex items-center justify-center rounded-full border border-gray-300 text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
                                      >
                                        <Minus className="w-3.5 h-3.5" />
                                      </button>
                                      <span className="w-6 text-center text-sm font-medium">{config.children}</span>
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          if (totalGuests < maxGuests) {
                                            updateRoomGuestConfig(room.id, {
                                              ...config,
                                              children: config.children + 1,
                                              childrenAges: [...config.childrenAges, 5] // Default age
                                            })
                                          }
                                        }}
                                        disabled={totalGuests >= maxGuests}
                                        className="w-7 h-7 flex items-center justify-center rounded-full border border-gray-300 text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
                                      >
                                        <Plus className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  </div>

                                  {/* Capacity indicator */}
                                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                                    totalGuests >= maxGuests
                                      ? 'bg-amber-100 text-amber-700'
                                      : 'bg-gray-100 text-gray-500'
                                  }`}>
                                    {totalGuests}/{maxGuests} guests
                                  </span>
                                </div>

                                {/* Children ages */}
                                {config.children > 0 && (
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-xs text-gray-500">Child ages:</span>
                                    {config.childrenAges.map((age, index) => (
                                      <select
                                        key={index}
                                        value={age}
                                        onChange={(e) => {
                                          e.stopPropagation()
                                          const newAges = [...config.childrenAges]
                                          newAges[index] = parseInt(e.target.value)
                                          updateRoomGuestConfig(room.id, {
                                            ...config,
                                            childrenAges: newAges
                                          })
                                        }}
                                        onClick={(e) => e.stopPropagation()}
                                        className="text-xs border border-gray-200 rounded px-1.5 py-0.5 bg-white"
                                      >
                                        {Array.from({ length: 18 }, (_, i) => (
                                          <option key={i} value={i}>{i} years</option>
                                        ))}
                                      </select>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )
                          })()}
                        </div>
                      )}
                    </div>

                    <div className="text-right flex-shrink-0 flex flex-col items-end gap-2">
                      {isBookedOut ? (
                        <span className="text-sm font-medium text-red-600">Fully booked</span>
                      ) : (
                        <>
                          <div>
                            <div className="font-semibold text-gray-900">{formatPrice(displayPrice)}</div>
                            <div className="text-xs text-gray-500">per night</div>
                            {isSeasonalRate && (
                              <div className="text-xs text-emerald-600 font-medium">Seasonal rate</div>
                            )}
                          </div>
                          {/* Add/Remove button */}
                          <button
                            onClick={() => handleToggleRoom(room)}
                            disabled={!canSelect && !isSelected}
                            className={`
                              flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors
                              ${isSelected
                                ? 'bg-red-100 text-red-700 hover:bg-red-200'
                                : canSelect
                                  ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                              }
                            `}
                          >
                            {isSelected ? (
                              <>
                                <Minus className="w-4 h-4" />
                                Remove
                              </>
                            ) : (
                              <>
                                <Plus className="w-4 h-4" />
                                Add
                              </>
                            )}
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}

          </div>
        )}
      </div>

      {/* Loading indicator for pricing */}
      {loadingPricing && state.selectedRooms.length > 0 && (
        <div className="flex items-center justify-center py-4">
          <Loader2 className="w-5 h-5 animate-spin text-emerald-600 mr-2" />
          <span className="text-sm text-gray-500">Loading prices...</span>
        </div>
      )}

      {/* Error message for pricing */}
      {pricingError && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
          <p className="text-red-600 text-sm">{pricingError}</p>
        </div>
      )}
    </StepContainer>
  )
}

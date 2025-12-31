import { useState, useRef, useEffect } from 'react'
import { User, Mail, MessageSquare, AlertCircle, Calendar, Moon, ChevronDown } from 'lucide-react'
import type { CheckoutState } from '../../pages/discovery/Checkout'
import FlagIcon from '../FlagIcon'

// Phone country codes
const PHONE_CODES = [
  { code: '+27', country: 'ZA', name: 'South Africa', format: '## ### ####' },
  { code: '+1', country: 'US', name: 'United States', format: '(###) ###-####' },
  { code: '+44', country: 'GB', name: 'United Kingdom', format: '#### ######' },
  { code: '+267', country: 'BW', name: 'Botswana', format: '## ### ###' },
  { code: '+264', country: 'NA', name: 'Namibia', format: '## ### ####' },
  { code: '+263', country: 'ZW', name: 'Zimbabwe', format: '## ### ####' },
  { code: '+258', country: 'MZ', name: 'Mozambique', format: '## ### ####' },
  { code: '+260', country: 'ZM', name: 'Zambia', format: '## ### ####' },
  { code: '+254', country: 'KE', name: 'Kenya', format: '### ### ###' },
  { code: '+255', country: 'TZ', name: 'Tanzania', format: '### ### ###' },
  { code: '+234', country: 'NG', name: 'Nigeria', format: '### ### ####' },
  { code: '+233', country: 'GH', name: 'Ghana', format: '## ### ####' },
  { code: '+49', country: 'DE', name: 'Germany', format: '### #######' },
  { code: '+33', country: 'FR', name: 'France', format: '# ## ## ## ##' },
  { code: '+31', country: 'NL', name: 'Netherlands', format: '# ########' },
  { code: '+61', country: 'AU', name: 'Australia', format: '### ### ###' },
  { code: '+351', country: 'PT', name: 'Portugal', format: '### ### ###' },
  { code: '+34', country: 'ES', name: 'Spain', format: '### ### ###' },
  { code: '+971', country: 'AE', name: 'UAE', format: '## ### ####' },
]

// Format phone number according to mask
function formatPhoneNumber(value: string, format: string): string {
  // Remove all non-digits
  const digits = value.replace(/\D/g, '')

  let result = ''
  let digitIndex = 0

  for (let i = 0; i < format.length && digitIndex < digits.length; i++) {
    if (format[i] === '#') {
      result += digits[digitIndex]
      digitIndex++
    } else {
      result += format[i]
    }
  }

  return result
}

// Get placeholder from format
function getPlaceholder(format: string): string {
  return format.replace(/#/g, '0')
}

interface GuestDetailsStepProps {
  state: CheckoutState
  updateState: (updates: Partial<CheckoutState>) => void
  onNext: () => void
  onBack: () => void
}

export default function GuestDetailsStep({
  state,
  updateState,
  onNext,
  onBack
}: GuestDetailsStepProps) {
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [phoneCode, setPhoneCode] = useState('+27')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [isPhoneDropdownOpen, setIsPhoneDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Get current country's format
  const currentCountry = PHONE_CODES.find(pc => pc.code === phoneCode) || PHONE_CODES[0]

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsPhoneDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Sync phone state with parent when it changes
  useEffect(() => {
    // Parse existing phone if it has a country code
    if (state.guestPhone && !phoneNumber) {
      const matchedCode = PHONE_CODES.find(pc => state.guestPhone.startsWith(pc.code))
      if (matchedCode) {
        setPhoneCode(matchedCode.code)
        const rawNumber = state.guestPhone.replace(matchedCode.code, '').trim()
        setPhoneNumber(formatPhoneNumber(rawNumber, matchedCode.format))
      } else {
        setPhoneNumber(state.guestPhone)
      }
    }
  }, [])

  // Update parent state when phone changes
  useEffect(() => {
    const rawDigits = phoneNumber.replace(/\D/g, '')
    if (rawDigits) {
      // Remove leading zero if present
      const normalizedNumber = rawDigits.replace(/^0+/, '')
      updateState({ guestPhone: `${phoneCode}${normalizedNumber}` })
    } else {
      updateState({ guestPhone: '' })
    }
  }, [phoneCode, phoneNumber])

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  const validatePhone = (phone: string): boolean => {
    // Phone is required - check for minimum digits
    const digits = phone.replace(/\D/g, '')
    return digits.length >= 8
  }

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!state.guestName.trim()) {
      newErrors.guestName = 'Full name is required'
    }

    if (!state.guestEmail.trim()) {
      newErrors.guestEmail = 'Email address is required'
    } else if (!validateEmail(state.guestEmail)) {
      newErrors.guestEmail = 'Please enter a valid email address'
    }

    // Phone is now required
    if (!phoneNumber.trim()) {
      newErrors.guestPhone = 'Phone number is required'
    } else if (!validatePhone(phoneNumber)) {
      newErrors.guestPhone = 'Please enter a valid phone number'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = () => {
    if (validate()) {
      onNext()
    }
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: state.selectedRooms[0]?.pricing?.currency || 'ZAR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price)
  }

  return (
    <div className="space-y-6">
      {/* Guest details form */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="font-semibold text-gray-900 mb-4">Your details</h2>

        <div className="space-y-4">
          {/* Full Name */}
          <div>
            <label htmlFor="guestName" className="block text-sm font-medium text-gray-700 mb-1">
              Full name *
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                id="guestName"
                value={state.guestName}
                onChange={(e) => {
                  updateState({ guestName: e.target.value })
                  if (errors.guestName) setErrors(prev => ({ ...prev, guestName: '' }))
                }}
                placeholder="John Smith"
                className={`
                  w-full pl-10 pr-4 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500
                  ${errors.guestName ? 'border-red-300 bg-red-50' : 'border-gray-200'}
                `}
              />
            </div>
            {errors.guestName && (
              <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" />
                {errors.guestName}
              </p>
            )}
          </div>

          {/* Email */}
          <div>
            <label htmlFor="guestEmail" className="block text-sm font-medium text-gray-700 mb-1">
              Email address *
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="email"
                id="guestEmail"
                value={state.guestEmail}
                onChange={(e) => {
                  updateState({ guestEmail: e.target.value })
                  if (errors.guestEmail) setErrors(prev => ({ ...prev, guestEmail: '' }))
                }}
                placeholder="john@example.com"
                className={`
                  w-full pl-10 pr-4 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500
                  ${errors.guestEmail ? 'border-red-300 bg-red-50' : 'border-gray-200'}
                `}
              />
            </div>
            {errors.guestEmail && (
              <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" />
                {errors.guestEmail}
              </p>
            )}
            <p className="mt-1 text-xs text-gray-500">Booking confirmation will be sent to this email</p>
          </div>

          {/* Phone */}
          <div>
            <label htmlFor="guestPhone" className="block text-sm font-medium text-gray-700 mb-1">
              Phone number *
            </label>
            <div className="flex">
              {/* Country code dropdown */}
              <div className="relative" ref={dropdownRef}>
                <button
                  type="button"
                  onClick={() => setIsPhoneDropdownOpen(!isPhoneDropdownOpen)}
                  className={`
                    flex items-center gap-2 h-full px-3 py-2.5 border border-r-0 rounded-l-lg bg-gray-50 hover:bg-gray-100
                    focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-colors
                    ${errors.guestPhone ? 'border-red-300' : 'border-gray-200'}
                  `}
                >
                  <FlagIcon country={currentCountry.country} className="w-6 h-4 rounded-sm shadow-sm" />
                  <span className="text-sm font-medium text-gray-700">{currentCountry.code}</span>
                  <ChevronDown size={14} className={`text-gray-500 transition-transform ${isPhoneDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {isPhoneDropdownOpen && (
                  <div className="absolute z-50 top-full left-0 mt-1 w-64 max-h-64 overflow-y-auto bg-white border border-gray-200 rounded-lg shadow-lg">
                    {PHONE_CODES.map((pc) => (
                      <button
                        key={pc.code}
                        type="button"
                        onClick={() => {
                          setPhoneCode(pc.code)
                          // Reformat existing number with new country format
                          const digits = phoneNumber.replace(/\D/g, '')
                          setPhoneNumber(formatPhoneNumber(digits, pc.format))
                          setIsPhoneDropdownOpen(false)
                          if (errors.guestPhone) setErrors(prev => ({ ...prev, guestPhone: '' }))
                        }}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 transition-colors ${
                          pc.code === phoneCode ? 'bg-emerald-50' : ''
                        }`}
                      >
                        <FlagIcon country={pc.country} className="w-6 h-4 rounded-sm shadow-sm" />
                        <span className="text-sm text-gray-900">{pc.name}</span>
                        <span className="text-sm text-gray-500 ml-auto">{pc.code}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Phone number input with mask */}
              <input
                type="tel"
                id="guestPhone"
                value={phoneNumber}
                onChange={(e) => {
                  const formatted = formatPhoneNumber(e.target.value, currentCountry.format)
                  setPhoneNumber(formatted)
                  if (errors.guestPhone) setErrors(prev => ({ ...prev, guestPhone: '' }))
                }}
                placeholder={getPlaceholder(currentCountry.format)}
                className={`
                  flex-1 px-3 py-2.5 border rounded-r-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500
                  ${errors.guestPhone ? 'border-red-300 bg-red-50' : 'border-gray-200'}
                `}
              />
            </div>
            {errors.guestPhone && (
              <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" />
                {errors.guestPhone}
              </p>
            )}
            <p className="mt-1 text-xs text-gray-500">Enter your number without the leading zero</p>
          </div>

          {/* Special Requests */}
          <div>
            <label htmlFor="specialRequests" className="block text-sm font-medium text-gray-700 mb-1">
              Special requests <span className="text-gray-400">(optional)</span>
            </label>
            <div className="relative">
              <MessageSquare className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
              <textarea
                id="specialRequests"
                value={state.specialRequests}
                onChange={(e) => updateState({ specialRequests: e.target.value })}
                placeholder="Any special requests or preferences..."
                rows={3}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
              />
            </div>
            <p className="mt-1 text-xs text-gray-500">
              Special requests cannot be guaranteed but the property will do their best to accommodate
            </p>
          </div>
        </div>
      </div>

      {/* Booking Summary */}
      <div className="bg-gray-50 rounded-xl border border-gray-200 p-5">
        <h3 className="font-medium text-gray-900 mb-4">Booking summary</h3>

        <div className="space-y-4">
          {/* Dates */}
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center flex-shrink-0">
              <Calendar className="w-4 h-4 text-gray-600" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-gray-900">
                {new Date(state.checkIn).toLocaleDateString('en-ZA', { weekday: 'short', day: 'numeric', month: 'short' })} — {new Date(state.checkOut).toLocaleDateString('en-ZA', { weekday: 'short', day: 'numeric', month: 'short' })}
              </p>
              <p className="text-sm text-gray-500">{state.selectedRooms[0]?.pricing?.night_count || 0} night{(state.selectedRooms[0]?.pricing?.night_count || 0) !== 1 ? 's' : ''}</p>
            </div>
          </div>

          {/* Rooms with detailed breakdown */}
          <div className="border-t border-gray-200 pt-4">
            <div className="flex items-center gap-2 mb-3">
              <Moon className="w-4 h-4 text-gray-600" />
              <span className="font-medium text-gray-900">Rooms</span>
              <span className="text-sm text-gray-500">
                ({state.selectedRooms.reduce((sum, r) => sum + (r.adults || 1) + (r.children || 0), 0)} guests total)
              </span>
            </div>

            <div className="space-y-3 pl-6">
              {state.selectedRooms.map(({ room, pricing, adjustedTotal, adults, children, childrenAges }) => {
                const nights = pricing?.night_count || 0
                const avgNightlyRate = pricing && nights > 0 ? pricing.subtotal / nights : room.basePrice
                const hasSeasonalRate = pricing?.nights?.some(n => n.rate_name)
                const pricingMode = room.pricingMode || 'per_unit'
                const childAgeLimit = room.childAgeLimit || 12
                const childFreeUntilAge = room.childFreeUntilAge || 0
                const childPrice = room.childPricePerNight

                // Calculate guest breakdown using THIS ROOM's guests
                const roomAdults = adults || 1
                const roomChildren = children || 0
                const roomChildrenAges = childrenAges || []
                const freeChildren = roomChildrenAges.filter(age => age < childFreeUntilAge).length
                const payingChildren = roomChildrenAges.filter(age => age >= childFreeUntilAge && age < childAgeLimit).length
                const childrenAsAdults = roomChildrenAges.filter(age => age >= childAgeLimit).length
                const totalAdults = roomAdults + childrenAsAdults
                const roomTotalGuests = roomAdults + roomChildren

                // Use adjustedTotal if available, otherwise fall back to backend subtotal
                const displayTotal = adjustedTotal !== undefined ? adjustedTotal : (pricing?.subtotal || 0)

                return (
                  <div key={room.id} className="border-l-2 border-gray-200 pl-3 pb-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="font-medium text-gray-900">{room.name}</span>
                        <span className="ml-2 text-xs text-gray-500">
                          ({roomTotalGuests} guest{roomTotalGuests !== 1 ? 's' : ''})
                        </span>
                        {hasSeasonalRate && (
                          <span className="ml-2 text-xs bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded">
                            Seasonal rate
                          </span>
                        )}
                      </div>
                      <span className="font-semibold text-gray-900">{formatPrice(displayTotal)}</span>
                    </div>

                    {/* Detailed breakdown */}
                    <div className="text-sm text-gray-500 space-y-0.5 mt-1">
                      <div>{nights} night{nights !== 1 ? 's' : ''} × {formatPrice(avgNightlyRate)}/night</div>

                      {/* Guest breakdown for per_person modes */}
                      {pricingMode !== 'per_unit' && (
                        <>
                          {totalAdults > 0 && (
                            <div className="text-xs text-gray-400">
                              {totalAdults} adult{totalAdults !== 1 ? 's' : ''}
                              {childrenAsAdults > 0 && ` (incl. ${childrenAsAdults} child${childrenAsAdults !== 1 ? 'ren' : ''} ${childAgeLimit}+)`}
                            </div>
                          )}
                          {payingChildren > 0 && (
                            <div className="text-xs text-gray-400">
                              {payingChildren} child{payingChildren !== 1 ? 'ren' : ''}
                              {childPrice !== undefined && childPrice !== null
                                ? ` @ ${formatPrice(childPrice)}/night`
                                : ' (adult rate)'}
                            </div>
                          )}
                          {freeChildren > 0 && (
                            <div className="text-xs text-emerald-600">
                              {freeChildren} child{freeChildren !== 1 ? 'ren' : ''} under {childFreeUntilAge} stay free
                            </div>
                          )}
                        </>
                      )}

                      {/* Per unit mode - show this room's guests */}
                      {pricingMode === 'per_unit' && (
                        <div className="text-xs text-gray-400">
                          {roomTotalGuests} guest{roomTotalGuests !== 1 ? 's' : ''} (max {room.maxGuests})
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Rooms subtotal */}
            <div className="flex justify-between text-sm mt-3 pt-2 border-t border-gray-200 pl-6">
              <span className="text-gray-600">Rooms subtotal</span>
              <span className="font-medium text-gray-900">{formatPrice(state.roomTotal)}</span>
            </div>
          </div>

          {/* Add-ons */}
          {state.selectedAddons.length > 0 && (
            <div className="border-t border-gray-200 pt-4">
              <p className="text-sm font-medium text-gray-700 mb-2">Extras</p>
              {state.selectedAddons.map(({ addon, quantity }) => {
                const nights = state.selectedRooms[0]?.pricing?.night_count || 0
                // Calculate individual addon price
                let addonTotal = addon.price * quantity
                switch (addon.pricingType) {
                  case 'per_night':
                    addonTotal = addon.price * quantity * nights
                    break
                  case 'per_guest':
                    addonTotal = addon.price * quantity * state.selectedRooms.reduce((sum, r) => sum + (r.adults || 1) + (r.children || 0), 0)
                    break
                  case 'per_guest_per_night':
                    addonTotal = addon.price * quantity * state.selectedRooms.reduce((sum, r) => sum + (r.adults || 1) + (r.children || 0), 0) * nights
                    break
                }

                return (
                  <div key={addon.id} className="flex justify-between text-sm text-gray-600 py-1">
                    <span>
                      {addon.name}
                      {quantity > 1 && <span className="text-gray-400"> ×{quantity}</span>}
                      <span className="text-xs text-gray-400 ml-1">
                        ({addon.pricingType === 'per_night' ? '/night' :
                          addon.pricingType === 'per_guest' ? '/guest' :
                          addon.pricingType === 'per_guest_per_night' ? '/guest/night' : ''})
                      </span>
                    </span>
                    <span>{formatPrice(addonTotal)}</span>
                  </div>
                )
              })}
              <div className="flex justify-between text-sm mt-2 pt-2 border-t border-gray-200">
                <span className="text-gray-600">Extras subtotal</span>
                <span className="font-medium text-gray-900">{formatPrice(state.addonsTotal)}</span>
              </div>
            </div>
          )}

          {/* Grand Total */}
          <div className="border-t-2 border-gray-300 pt-4 mt-4">
            <div className="flex justify-between items-center">
              <span className="font-semibold text-lg text-gray-900">Total to pay</span>
              <span className="font-bold text-xl text-gray-900">{formatPrice(state.grandTotal)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation buttons */}
      <div className="flex justify-between">
        <button
          onClick={onBack}
          className="px-6 py-3 rounded-xl font-medium border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors"
        >
          Back
        </button>
        <button
          onClick={handleSubmit}
          className="px-8 py-3 rounded-xl font-medium bg-black text-white hover:bg-gray-800 transition-colors"
        >
          Continue to payment
        </button>
      </div>
    </div>
  )
}

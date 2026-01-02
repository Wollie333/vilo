import { Calendar, Users, Tag, Loader2, Package, ChevronDown, ChevronUp, ArrowLeft } from 'lucide-react'
import { useState } from 'react'
import type { PropertyDetail } from '../../services/discoveryApi'
import type { CheckoutState } from '../../pages/discovery/Checkout'

interface CheckoutSidebarProps {
  property: PropertyDetail
  state: CheckoutState
  currentStep: 1 | 2 | 3 | 4
  onNext: () => void
  onBack?: () => void
  isProcessing?: boolean
  nextLabel?: string
  nextDisabled?: boolean
}

export default function CheckoutSidebar({
  property,
  state,
  currentStep,
  onNext,
  onBack,
  isProcessing = false,
  nextLabel,
  nextDisabled = false
}: CheckoutSidebarProps) {
  const [showRoomDetails, setShowRoomDetails] = useState(true)
  const [showAddonDetails, setShowAddonDetails] = useState(true)

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: property.currency || 'ZAR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price)
  }

  const formatDate = (date: string) => {
    if (!date) return ''
    return new Date(date).toLocaleDateString('en-ZA', {
      weekday: 'short',
      day: 'numeric',
      month: 'short'
    })
  }

  const calculateNights = (checkIn: string, checkOut: string): number => {
    if (!checkIn || !checkOut) return 0
    const start = new Date(checkIn)
    const end = new Date(checkOut)
    return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
  }

  const nights = calculateNights(state.checkIn, state.checkOut)
  const totalGuests = state.selectedRooms.reduce((sum, r) => sum + r.adults + r.children, 0)
  const hasAddons = state.selectedAddons.length > 0
  const hasCoupon = state.appliedCoupon !== null

  // Determine button label based on step
  const buttonLabel = nextLabel || (
    currentStep === 4 ? 'Complete Booking' : 'Continue'
  )

  // Determine if button should be disabled
  const isButtonDisabled = nextDisabled || isProcessing || (
    currentStep === 1 && (state.selectedRooms.length === 0 || !state.checkIn || !state.checkOut)
  )

  return (
    <div className="space-y-4">
      {/* Property Card */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {property.images[0] && (
          <div className="aspect-[16/9] overflow-hidden">
            <img
              src={property.images[0]}
              alt={property.name}
              className="w-full h-full object-cover"
            />
          </div>
        )}
        <div className="p-4">
          <h3 className="font-semibold text-gray-900">{property.name}</h3>
          <p className="text-sm text-gray-500 mt-0.5">
            {property.location.city}{property.location.region ? `, ${property.location.region}` : ''}
          </p>
        </div>
      </div>

      {/* Booking Summary Card */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <h3 className="font-semibold text-gray-900 mb-4">Your booking</h3>

        {/* Dates */}
        {state.checkIn && state.checkOut ? (
          <div className="flex items-start gap-3 pb-4 border-b border-gray-100">
            <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
              <Calendar className="w-5 h-5 text-gray-600" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-medium text-gray-900">
                {formatDate(state.checkIn)} — {formatDate(state.checkOut)}
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

        {/* Selected Rooms */}
        {state.selectedRooms.length > 0 ? (
          <div className="py-4 border-b border-gray-100">
            <button
              onClick={() => setShowRoomDetails(!showRoomDetails)}
              className="w-full flex items-center justify-between text-left"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                  <Users className="w-5 h-5 text-gray-600" />
                </div>
                <div>
                  <div className="font-medium text-gray-900">
                    {state.selectedRooms.length} room{state.selectedRooms.length !== 1 ? 's' : ''}
                  </div>
                  <div className="text-sm text-gray-500">
                    {totalGuests} guest{totalGuests !== 1 ? 's' : ''}
                  </div>
                </div>
              </div>
              {showRoomDetails ? (
                <ChevronUp className="w-5 h-5 text-gray-400" />
              ) : (
                <ChevronDown className="w-5 h-5 text-gray-400" />
              )}
            </button>

            {showRoomDetails && (
              <div className="mt-3 space-y-2 pl-[52px] animate-fade-in">
                {state.selectedRooms.map(({ room, adjustedTotal, pricing, adults, children }) => {
                  const roomTotal = adjustedTotal !== undefined ? adjustedTotal : (pricing?.subtotal || 0)
                  const roomGuests = adults + children
                  return (
                    <div key={room.id} className="flex justify-between text-sm">
                      <div className="text-gray-600">
                        <span className="font-medium">{room.name}</span>
                        <span className="text-gray-400 ml-1">({roomGuests} guest{roomGuests !== 1 ? 's' : ''})</span>
                      </div>
                      <span className="text-gray-900 font-medium">{formatPrice(roomTotal)}</span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-3 py-4 border-b border-gray-100 text-gray-400">
            <div className="w-10 h-10 rounded-lg bg-gray-50 flex items-center justify-center flex-shrink-0">
              <Users className="w-5 h-5" />
            </div>
            <span className="text-sm">Select a room</span>
          </div>
        )}

        {/* Add-ons */}
        {hasAddons && (
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
                    {state.selectedAddons.length} extra{state.selectedAddons.length !== 1 ? 's' : ''}
                  </div>
                  <div className="text-sm text-gray-500">
                    {formatPrice(state.addonsTotal)}
                  </div>
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
                {state.selectedAddons.map(({ addon, quantity }) => (
                  <div key={addon.id} className="flex justify-between text-sm">
                    <span className="text-gray-600">
                      {addon.name}
                      {quantity > 1 && <span className="text-gray-400 ml-1">×{quantity}</span>}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Coupon */}
        {hasCoupon && state.appliedCoupon && (
          <div className="py-4 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center flex-shrink-0">
                <Tag className="w-5 h-5 text-emerald-600" />
              </div>
              <div className="flex-1">
                <div className="font-medium text-emerald-700">{state.appliedCoupon.code}</div>
                <div className="text-sm text-emerald-600">
                  -{formatPrice(state.discountAmount)} discount
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Price Breakdown */}
        <div className="pt-4 space-y-2">
          {state.roomTotal > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Accommodation</span>
              <span className="text-gray-900">{formatPrice(state.roomTotal)}</span>
            </div>
          )}
          {state.addonsTotal > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Extras</span>
              <span className="text-gray-900">{formatPrice(state.addonsTotal)}</span>
            </div>
          )}
          {state.discountAmount > 0 && (
            <div className="flex justify-between text-sm text-emerald-600">
              <span>Discount</span>
              <span>-{formatPrice(state.discountAmount)}</span>
            </div>
          )}

          {/* Grand Total */}
          <div className="flex justify-between pt-3 border-t border-gray-200 mt-3">
            <span className="font-semibold text-gray-900">Total</span>
            <span className="text-xl font-bold text-gray-900">{formatPrice(state.grandTotal)}</span>
          </div>
        </div>
      </div>

      {/* Navigation Buttons - Hidden on step 4 (payment has its own button) */}
      {currentStep !== 4 && (
        <div className="flex items-center gap-3">
          {/* Back Button - Show on steps 2 and 3 */}
          {currentStep > 1 && onBack && (
            <button
              onClick={onBack}
              className="flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
          )}

          {/* Continue Button */}
          <button
            onClick={onNext}
            disabled={isButtonDisabled}
            className={`
              flex-1 py-3.5 rounded-xl font-semibold text-center transition-all flex items-center justify-center gap-2
              ${isButtonDisabled
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                : 'bg-black text-white hover:bg-gray-800 shadow-lg shadow-black/10'
              }
            `}
          >
            {isProcessing && <Loader2 className="w-5 h-5 animate-spin" />}
            {buttonLabel}
          </button>
        </div>
      )}

      {/* Trust indicators */}
      <div className="flex items-center justify-center gap-4 text-xs text-gray-400 pt-2">
        <span>Secure checkout</span>
        <span>•</span>
        <span>Instant confirmation</span>
      </div>
    </div>
  )
}

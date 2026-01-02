import { ChevronUp, Loader2, Calendar, Users, Tag, Package, X, ArrowLeft } from 'lucide-react'
import type { PropertyDetail } from '../../services/discoveryApi'
import type { CheckoutState } from '../../pages/discovery/Checkout'

interface CheckoutMobileBarProps {
  property: PropertyDetail
  state: CheckoutState
  currentStep: 1 | 2 | 3 | 4
  grandTotal: number
  isOpen: boolean
  onToggle: () => void
  onNext: () => void
  onBack?: () => void
  isProcessing?: boolean
  nextLabel?: string
  nextDisabled?: boolean
}

export default function CheckoutMobileBar({
  property,
  state,
  currentStep,
  grandTotal,
  isOpen,
  onToggle,
  onNext,
  onBack,
  isProcessing = false,
  nextLabel,
  nextDisabled = false
}: CheckoutMobileBarProps) {
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
    <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40">
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/40 animate-fade-in"
          onClick={onToggle}
        />
      )}

      {/* Expandable Summary Sheet */}
      {isOpen && (
        <div className="relative bg-white border-t border-gray-200 rounded-t-2xl shadow-2xl max-h-[70vh] overflow-y-auto animate-slide-in">
          {/* Handle bar */}
          <div className="sticky top-0 bg-white pt-3 pb-2 px-4 border-b border-gray-100">
            <div className="w-12 h-1.5 bg-gray-300 rounded-full mx-auto mb-3" />
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">Booking summary</h3>
              <button
                onClick={onToggle}
                className="p-2 -mr-2 text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Summary content */}
          <div className="p-4 space-y-4">
            {/* Property */}
            <div className="flex gap-3">
              {property.images[0] && (
                <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0">
                  <img
                    src={property.images[0]}
                    alt={property.name}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              <div>
                <h4 className="font-medium text-gray-900">{property.name}</h4>
                <p className="text-sm text-gray-500">{property.location.city}</p>
              </div>
            </div>

            {/* Dates */}
            {state.checkIn && state.checkOut && (
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                <Calendar className="w-5 h-5 text-gray-400" />
                <div>
                  <div className="text-sm font-medium text-gray-900">
                    {formatDate(state.checkIn)} — {formatDate(state.checkOut)}
                  </div>
                  <div className="text-xs text-gray-500">
                    {nights} night{nights !== 1 ? 's' : ''}
                  </div>
                </div>
              </div>
            )}

            {/* Rooms */}
            {state.selectedRooms.length > 0 && (
              <div className="p-3 bg-gray-50 rounded-xl">
                <div className="flex items-center gap-3 mb-2">
                  <Users className="w-5 h-5 text-gray-400" />
                  <span className="text-sm font-medium text-gray-900">
                    {state.selectedRooms.length} room{state.selectedRooms.length !== 1 ? 's' : ''} · {totalGuests} guest{totalGuests !== 1 ? 's' : ''}
                  </span>
                </div>
                <div className="space-y-1 pl-8">
                  {state.selectedRooms.map(({ room, adjustedTotal, pricing }) => {
                    const roomTotal = adjustedTotal !== undefined ? adjustedTotal : (pricing?.subtotal || 0)
                    return (
                      <div key={room.id} className="flex justify-between text-sm">
                        <span className="text-gray-600">{room.name}</span>
                        <span className="text-gray-900">{formatPrice(roomTotal)}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Add-ons */}
            {hasAddons && (
              <div className="p-3 bg-gray-50 rounded-xl">
                <div className="flex items-center gap-3 mb-2">
                  <Package className="w-5 h-5 text-gray-400" />
                  <span className="text-sm font-medium text-gray-900">
                    {state.selectedAddons.length} extra{state.selectedAddons.length !== 1 ? 's' : ''}
                  </span>
                </div>
                <div className="space-y-1 pl-8">
                  {state.selectedAddons.map(({ addon, quantity }) => (
                    <div key={addon.id} className="flex justify-between text-sm">
                      <span className="text-gray-600">
                        {addon.name}
                        {quantity > 1 && ` ×${quantity}`}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Coupon */}
            {hasCoupon && state.appliedCoupon && (
              <div className="p-3 bg-emerald-50 rounded-xl">
                <div className="flex items-center gap-3">
                  <Tag className="w-5 h-5 text-emerald-600" />
                  <div className="flex-1">
                    <span className="text-sm font-medium text-emerald-700">{state.appliedCoupon.code}</span>
                    <span className="text-sm text-emerald-600 ml-2">-{formatPrice(state.discountAmount)}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Price Breakdown */}
            <div className="pt-3 border-t border-gray-200 space-y-2">
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
            </div>
          </div>
        </div>
      )}

      {/* Bottom Action Bar */}
      <div className="relative bg-white border-t border-gray-200 px-4 py-3 safe-area-bottom">
        <div className="flex items-center justify-between gap-3">
          {/* Back Button - Show on steps 2, 3, 4 */}
          {currentStep > 1 && onBack && (
            <button
              onClick={onBack}
              className="p-3 rounded-xl text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors flex-shrink-0"
              aria-label="Go back"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}

          {/* Price & Summary toggle */}
          <button
            onClick={onToggle}
            className="flex items-center gap-2 text-left min-w-0 flex-1"
          >
            <div>
              <div className="text-lg font-bold text-gray-900">{formatPrice(grandTotal)}</div>
              <div className="text-xs text-gray-500">
                {state.selectedRooms.length > 0
                  ? `${state.selectedRooms.length} room${state.selectedRooms.length !== 1 ? 's' : ''} · ${nights} night${nights !== 1 ? 's' : ''}`
                  : 'View details'
                }
              </div>
            </div>
            <ChevronUp
              className={`w-5 h-5 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
            />
          </button>

          {/* Continue Button */}
          <button
            onClick={onNext}
            disabled={isButtonDisabled}
            className={`
              px-6 py-3 rounded-xl font-semibold transition-all flex items-center gap-2 flex-shrink-0
              ${isButtonDisabled
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                : 'bg-black text-white hover:bg-gray-800'
              }
            `}
          >
            {isProcessing && <Loader2 className="w-4 h-4 animate-spin" />}
            {buttonLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

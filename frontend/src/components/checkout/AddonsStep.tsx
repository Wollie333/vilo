import { Plus, Minus, Check, Package } from 'lucide-react'
import type { Addon, SelectedAddon } from '../../services/discoveryApi'
import type { CheckoutState } from '../../pages/discovery/Checkout'

interface AddonsStepProps {
  addons: Addon[]
  state: CheckoutState
  updateState: (updates: Partial<CheckoutState>) => void
  onNext: () => void
  onBack: () => void
}

export default function AddonsStep({
  addons,
  state,
  updateState,
  onNext,
  onBack
}: AddonsStepProps) {
  const nights = state.selectedRooms[0]?.pricing?.night_count || 1
  // Calculate total guests from all rooms
  const guests = state.selectedRooms.reduce((sum, r) => sum + (r.adults || 1) + (r.children || 0), 0)

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: state.selectedRooms[0]?.pricing?.currency || 'ZAR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price)
  }

  const getPricingLabel = (addon: Addon): string => {
    switch (addon.pricingType) {
      case 'per_night':
        return 'per night'
      case 'per_guest':
        return 'per guest'
      case 'per_guest_per_night':
        return 'per guest/night'
      case 'per_booking':
      default:
        return 'per booking'
    }
  }

  const calculateAddonTotal = (addon: Addon, quantity: number): number => {
    let total = addon.price * quantity

    switch (addon.pricingType) {
      case 'per_night':
        total = addon.price * quantity * nights
        break
      case 'per_guest':
        total = addon.price * quantity * guests
        break
      case 'per_guest_per_night':
        total = addon.price * quantity * guests * nights
        break
    }

    return total
  }

  const getSelectedAddon = (addonId: string): SelectedAddon | undefined => {
    return state.selectedAddons.find(sa => sa.addon.id === addonId)
  }

  const updateAddonQuantity = (addon: Addon, newQuantity: number) => {
    const currentAddons = [...state.selectedAddons]
    const existingIndex = currentAddons.findIndex(sa => sa.addon.id === addon.id)

    if (newQuantity <= 0) {
      // Remove addon
      if (existingIndex !== -1) {
        currentAddons.splice(existingIndex, 1)
      }
    } else if (existingIndex !== -1) {
      // Update quantity
      currentAddons[existingIndex] = { addon, quantity: Math.min(newQuantity, addon.maxQuantity) }
    } else {
      // Add new addon
      currentAddons.push({ addon, quantity: Math.min(newQuantity, addon.maxQuantity) })
    }

    updateState({ selectedAddons: currentAddons })
  }

  const toggleAddon = (addon: Addon) => {
    const existing = getSelectedAddon(addon.id)
    if (existing) {
      updateAddonQuantity(addon, 0)
    } else {
      updateAddonQuantity(addon, 1)
    }
  }

  return (
    <div className="space-y-6">
      {/* Add-ons section */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="font-semibold text-gray-900 mb-2">Enhance your stay</h2>
        <p className="text-sm text-gray-500 mb-4">Optional extras to make your experience even better</p>

        {addons.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>No extras available for this property</p>
          </div>
        ) : (
          <div className="space-y-3">
            {addons.map((addon) => {
              const selected = getSelectedAddon(addon.id)
              const quantity = selected?.quantity || 0
              const isSelected = quantity > 0

              return (
                <div
                  key={addon.id}
                  className={`
                    p-4 rounded-xl border-2 transition-all
                    ${isSelected
                      ? 'border-emerald-600 bg-emerald-50'
                      : 'border-gray-200 bg-white'
                    }
                  `}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      {/* Addon Image Thumbnail */}
                      <div className="w-16 h-16 flex-shrink-0 rounded-lg overflow-hidden bg-gray-100">
                        {addon.imageUrl ? (
                          <img
                            src={addon.imageUrl}
                            alt={addon.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Package className="w-6 h-6 text-gray-300" />
                          </div>
                        )}
                      </div>

                      {/* Checkbox */}
                      <button
                        onClick={() => toggleAddon(addon)}
                        className={`
                          w-5 h-5 rounded border-2 flex-shrink-0 flex items-center justify-center mt-0.5 transition-colors
                          ${isSelected
                            ? 'bg-emerald-600 border-emerald-600'
                            : 'border-gray-300 hover:border-gray-400'
                          }
                        `}
                      >
                        {isSelected && <Check className="w-3 h-3 text-white" />}
                      </button>

                      <div className="flex-1">
                        <h3 className="font-medium text-gray-900">{addon.name}</h3>
                        {addon.description && (
                          <p className="text-sm text-gray-500 mt-0.5">{addon.description}</p>
                        )}
                        <p className="text-sm text-emerald-600 mt-1">
                          {formatPrice(addon.price)} {getPricingLabel(addon)}
                        </p>
                      </div>
                    </div>

                    {/* Quantity selector */}
                    {isSelected && addon.maxQuantity > 1 && (
                      <div className="flex items-center gap-2 ml-4">
                        <button
                          onClick={() => updateAddonQuantity(addon, quantity - 1)}
                          className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-100 transition-colors"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                        <span className="w-8 text-center font-medium">{quantity}</span>
                        <button
                          onClick={() => updateAddonQuantity(addon, quantity + 1)}
                          disabled={quantity >= addon.maxQuantity}
                          className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    )}

                    {/* Total for this addon */}
                    {isSelected && (
                      <div className="text-right ml-4 min-w-[80px]">
                        <span className="font-semibold text-gray-900">
                          {formatPrice(calculateAddonTotal(addon, quantity))}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Price Summary */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="font-semibold text-gray-900 mb-3">Price summary</h2>

        <div className="space-y-3">
          {/* Room costs with per-room guest breakdown */}
          {state.selectedRooms.map(({ room, pricing, adjustedTotal, adults, children, childrenAges }) => {
            const roomNights = pricing?.night_count || nights
            const hasSeasonalRate = pricing?.nights?.some(n => n.rate_name)
            const pricingMode = room.pricingMode || 'per_unit'
            const childFreeUntilAge = room.childFreeUntilAge || 0
            const childAgeLimit = room.childAgeLimit || 12
            const childPrice = room.childPricePerNight

            // Use THIS ROOM's guest config
            const roomAdults = adults || 1
            const roomChildren = children || 0
            const roomChildrenAges = childrenAges || []
            const roomTotalGuests = roomAdults + roomChildren
            const freeChildren = roomChildrenAges.filter(age => age < childFreeUntilAge).length
            const payingChildren = roomChildrenAges.filter(age => age >= childFreeUntilAge && age < childAgeLimit).length
            const childrenAsAdults = roomChildrenAges.filter(age => age >= childAgeLimit).length

            // Use adjustedTotal if available
            const displayTotal = adjustedTotal !== undefined ? adjustedTotal : (pricing?.subtotal || 0)

            return (
              <div key={room.id} className="pb-2 border-b border-gray-100 last:border-0">
                <div className="flex justify-between">
                  <span className="text-gray-900 font-medium">
                    {room.name}
                    <span className="ml-1 text-xs text-gray-500 font-normal">({roomTotalGuests} guest{roomTotalGuests !== 1 ? 's' : ''})</span>
                    {hasSeasonalRate && (
                      <span className="ml-1 text-xs text-emerald-600">(seasonal)</span>
                    )}
                  </span>
                  <span className="font-semibold text-gray-900">{formatPrice(displayTotal)}</span>
                </div>
                <div className="text-xs text-gray-400 mt-0.5 space-y-0.5">
                  <div>{roomNights} night{roomNights !== 1 ? 's' : ''}</div>
                  {pricingMode !== 'per_unit' && (
                    <>
                      {(roomAdults + childrenAsAdults) > 0 && (
                        <div>
                          {roomAdults + childrenAsAdults} adult{(roomAdults + childrenAsAdults) !== 1 ? 's' : ''}
                          {childrenAsAdults > 0 && ` (incl. ${childrenAsAdults} child${childrenAsAdults !== 1 ? 'ren' : ''} ${childAgeLimit}+)`}
                        </div>
                      )}
                      {payingChildren > 0 && (
                        <div>
                          {payingChildren} child{payingChildren !== 1 ? 'ren' : ''}
                          {childPrice !== undefined && childPrice !== null
                            ? ` @ ${formatPrice(childPrice)}/night`
                            : ' (adult rate)'}
                        </div>
                      )}
                      {freeChildren > 0 && (
                        <div className="text-emerald-600">
                          {freeChildren} child{freeChildren !== 1 ? 'ren' : ''} under {childFreeUntilAge} stay free
                        </div>
                      )}
                    </>
                  )}
                  {pricingMode === 'per_unit' && (
                    <div>{roomTotalGuests} guest{roomTotalGuests !== 1 ? 's' : ''} (max {room.maxGuests})</div>
                  )}
                </div>
              </div>
            )
          })}

          {/* Rooms subtotal */}
          <div className="flex justify-between text-sm text-gray-600 pb-2 border-b border-gray-100">
            <span>Rooms subtotal</span>
            <span className="font-medium">{formatPrice(state.roomTotal)}</span>
          </div>

          {/* Selected addons */}
          {state.selectedAddons.length > 0 && (
            <div className="pt-1">
              <div className="text-xs text-gray-500 mb-1">Add-ons</div>
              {state.selectedAddons.map(({ addon, quantity }) => (
                <div key={addon.id} className="flex justify-between text-gray-600">
                  <span>
                    {addon.name}
                    {quantity > 1 && ` (×${quantity})`}
                    <span className="text-gray-400 text-xs ml-1">
                      ({getPricingLabel(addon)})
                    </span>
                  </span>
                  <span>{formatPrice(calculateAddonTotal(addon, quantity))}</span>
                </div>
              ))}
              <div className="flex justify-between text-sm text-gray-600 mt-2 pt-2 border-t border-gray-100">
                <span>Add-ons subtotal</span>
                <span className="font-medium">{formatPrice(state.addonsTotal)}</span>
              </div>
            </div>
          )}

          {/* Total */}
          <div className="border-t-2 border-gray-200 pt-3 mt-2">
            <div className="flex justify-between font-semibold text-lg text-gray-900">
              <span>Total</span>
              <span>{formatPrice(state.grandTotal)}</span>
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
          onClick={onNext}
          className="px-8 py-3 rounded-xl font-medium bg-black text-white hover:bg-gray-800 transition-colors"
        >
          Continue
        </button>
      </div>
    </div>
  )
}

import { Plus, Minus, Check, Package, Sparkles } from 'lucide-react'
import type { Addon, SelectedAddon } from '../../services/discoveryApi'
import type { CheckoutState } from '../../pages/discovery/Checkout'
import StepContainer from './StepContainer'

interface AddonsStepProps {
  addons: Addon[]
  state: CheckoutState
  updateState: (updates: Partial<CheckoutState>) => void
}

export default function AddonsStep({
  addons,
  state,
  updateState
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
    <StepContainer
      title="Enhance Your Stay"
      subtitle="Optional extras to make your experience even better"
      icon={Sparkles}
    >
      {addons.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-8 text-center">
          <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
            <Package className="w-6 h-6 text-gray-400" />
          </div>
          <p className="text-gray-500">No extras available for this property</p>
          <p className="text-sm text-gray-400 mt-1">You can proceed to the next step</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <div className="space-y-3">
            {addons.map((addon) => {
              const selected = getSelectedAddon(addon.id)
              const quantity = selected?.quantity || 0
              const isSelected = quantity > 0

              return (
                <div
                  key={addon.id}
                  className={`
                    group p-4 rounded-xl border-2 transition-all cursor-pointer
                    ${isSelected
                      ? 'border-emerald-600 bg-emerald-50 shadow-sm'
                      : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
                    }
                  `}
                  onClick={() => toggleAddon(addon)}
                >
                  <div className="flex items-start gap-4">
                    {/* Checkbox */}
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

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-gray-900">{addon.name}</h3>
                      {addon.description && (
                        <p className="text-sm text-gray-500 mt-0.5 line-clamp-2">{addon.description}</p>
                      )}
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-sm font-semibold text-emerald-700">
                          {formatPrice(addon.price)}
                        </span>
                        <span className="text-xs text-gray-400">
                          {getPricingLabel(addon)}
                        </span>
                      </div>
                    </div>

                    {/* Quantity selector or Total */}
                    <div className="flex-shrink-0 text-right" onClick={(e) => e.stopPropagation()}>
                      {isSelected && addon.maxQuantity > 1 ? (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => updateAddonQuantity(addon, quantity - 1)}
                            className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-100 transition-colors"
                          >
                            <Minus className="w-4 h-4" />
                          </button>
                          <span className="w-6 text-center font-medium">{quantity}</span>
                          <button
                            onClick={() => updateAddonQuantity(addon, quantity + 1)}
                            disabled={quantity >= addon.maxQuantity}
                            className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                      ) : isSelected ? (
                        <span className="font-semibold text-gray-900">
                          {formatPrice(calculateAddonTotal(addon, quantity))}
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Selected summary */}
      {state.selectedAddons.length > 0 && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-sm font-medium text-emerald-800">
                {state.selectedAddons.length} extra{state.selectedAddons.length !== 1 ? 's' : ''} selected
              </span>
            </div>
            <span className="font-semibold text-emerald-700">
              +{formatPrice(state.addonsTotal)}
            </span>
          </div>
        </div>
      )}
    </StepContainer>
  )
}

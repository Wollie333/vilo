import { useState, useEffect } from 'react'
import { CreditCard, Calendar, DollarSign, User, AlertTriangle, Info, Package, Plus, Minus, Coffee } from 'lucide-react'
import { Room, roomsApi, EffectivePrice, AddOn, addonsApi } from '../../services/api'

interface PricingBreakdownNight {
  date: string
  price: number
  seasonalRate: { name: string; id: string } | null
}

export interface SelectedAddon {
  id: string
  name: string
  quantity: number
  price: number
  pricing_type: string
  total: number
}

interface PaymentConfirmStepProps {
  roomId: string
  roomName: string
  selectedRoom: Room | null
  checkIn: string
  checkOut: string
  guestName: string
  guestEmail: string
  guestPhone: string
  notes: string
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed'
  paymentStatus: 'pending' | 'paid' | 'partial' | 'refunded'
  totalAmount: number
  currency: string
  overrideRules: boolean
  selectedAddons: SelectedAddon[]
  guests?: number
  onStatusChange: (status: 'pending' | 'confirmed' | 'cancelled' | 'completed') => void
  onPaymentStatusChange: (status: 'pending' | 'paid' | 'partial' | 'refunded') => void
  onTotalAmountChange: (amount: number) => void
  onCurrencyChange: (currency: string) => void
  onAddonsChange: (addons: SelectedAddon[]) => void
}

const CURRENCIES = [
  { code: 'ZAR', name: 'South African Rand' },
  { code: 'USD', name: 'US Dollar' },
  { code: 'EUR', name: 'Euro' },
  { code: 'GBP', name: 'British Pound' },
  { code: 'NGN', name: 'Nigerian Naira' },
]

const BOOKING_STATUSES = [
  { value: 'pending', label: 'Pending', description: 'Awaiting confirmation' },
  { value: 'confirmed', label: 'Confirmed', description: 'Booking is confirmed' },
  { value: 'checked_in', label: 'Checked In', description: 'Guest has arrived' },
  { value: 'checked_out', label: 'Checked Out', description: 'Guest has departed' },
  { value: 'cancelled', label: 'Cancelled', description: 'Booking was cancelled' },
  { value: 'completed', label: 'Completed', description: 'Stay completed' },
]

const PAYMENT_STATUSES = [
  { value: 'pending', label: 'Pending', description: 'Payment not received' },
  { value: 'partial', label: 'Partial', description: 'Partial payment received' },
  { value: 'paid', label: 'Paid', description: 'Fully paid' },
  { value: 'refunded', label: 'Refunded', description: 'Payment refunded' },
]

export default function PaymentConfirmStep({
  roomId,
  roomName,
  selectedRoom,
  checkIn,
  checkOut,
  guestName,
  guestEmail,
  guestPhone,
  notes,
  status,
  paymentStatus,
  totalAmount,
  currency,
  overrideRules,
  selectedAddons,
  guests = 2,
  onStatusChange,
  onPaymentStatusChange,
  onTotalAmountChange,
  onCurrencyChange,
  onAddonsChange,
}: PaymentConfirmStepProps) {
  const [pricingBreakdown, setPricingBreakdown] = useState<PricingBreakdownNight[]>([])
  const [isLoadingPrices, setIsLoadingPrices] = useState(false)
  const [calculatedTotal, setCalculatedTotal] = useState(0)
  const [manualOverride, setManualOverride] = useState(false)
  const [availableAddons, setAvailableAddons] = useState<AddOn[]>([])
  const [isLoadingAddons, setIsLoadingAddons] = useState(false)

  // Calculate pricing breakdown when room or dates change
  useEffect(() => {
    if (roomId && checkIn && checkOut) {
      calculatePricing()
    }
  }, [roomId, checkIn, checkOut])

  // Load available add-ons when room changes
  useEffect(() => {
    if (roomId) {
      loadAddons()
    }
  }, [roomId])

  const loadAddons = async () => {
    try {
      setIsLoadingAddons(true)
      // Get all add-ons (active only will be filtered client-side)
      const allAddons = await addonsApi.getAll()
      console.log('All add-ons loaded:', allAddons)
      console.log('Current roomId:', roomId)

      const roomAddons = allAddons.filter(addon => {
        // Must be active
        if (!addon.is_active) {
          console.log(`Add-on "${addon.name}" skipped: not active`)
          return false
        }
        // If available_for_rooms is null, undefined, or empty array, it's available for all rooms
        const availableRooms = Array.isArray(addon.available_for_rooms) ? addon.available_for_rooms : []
        const isAvailable = availableRooms.length === 0 || availableRooms.includes(roomId)
        console.log(`Add-on "${addon.name}": availableRooms=${JSON.stringify(availableRooms)}, isAvailable=${isAvailable}`)
        return isAvailable
      })

      console.log('Filtered add-ons for room:', roomAddons)
      setAvailableAddons(roomAddons)
    } catch (error) {
      console.error('Failed to load add-ons:', error)
    } finally {
      setIsLoadingAddons(false)
    }
  }

  const calculateAddonTotal = (addon: AddOn, quantity: number) => {
    const nights = pricingBreakdown.length || 1
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

  const handleAddonToggle = (addon: AddOn, quantity: number) => {
    if (quantity === 0) {
      onAddonsChange(selectedAddons.filter(a => a.id !== addon.id))
    } else {
      const total = calculateAddonTotal(addon, quantity)
      const existing = selectedAddons.find(a => a.id === addon.id)
      if (existing) {
        onAddonsChange(
          selectedAddons.map(a => (a.id === addon.id ? { ...a, quantity, total } : a))
        )
      } else {
        onAddonsChange([
          ...selectedAddons,
          {
            id: addon.id!,
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

  // Update total when calculated total or add-ons change (unless manually overridden)
  useEffect(() => {
    if (!manualOverride && calculatedTotal > 0) {
      onTotalAmountChange(calculatedTotal + getAddonsTotal())
    }
  }, [calculatedTotal, selectedAddons, manualOverride])

  // Set currency from room if available
  useEffect(() => {
    if (selectedRoom && !currency) {
      onCurrencyChange(selectedRoom.currency)
    }
  }, [selectedRoom])

  const calculatePricing = async () => {
    try {
      setIsLoadingPrices(true)
      const nights: PricingBreakdownNight[] = []
      let total = 0

      const startDate = new Date(checkIn)
      const endDate = new Date(checkOut)

      // Iterate through each night
      const currentDate = new Date(startDate)
      while (currentDate < endDate) {
        const dateStr = currentDate.toISOString().split('T')[0]

        try {
          const priceData: EffectivePrice = await roomsApi.getEffectivePrice(roomId, dateStr)
          nights.push({
            date: dateStr,
            price: priceData.effective_price,
            seasonalRate: priceData.seasonal_rate,
          })
          total += priceData.effective_price
        } catch (error) {
          // Fallback to base price if API fails
          if (selectedRoom) {
            nights.push({
              date: dateStr,
              price: selectedRoom.base_price_per_night,
              seasonalRate: null,
            })
            total += selectedRoom.base_price_per_night
          }
        }

        currentDate.setDate(currentDate.getDate() + 1)
      }

      setPricingBreakdown(nights)
      setCalculatedTotal(total)
    } catch (error) {
      console.error('Failed to calculate pricing:', error)
    } finally {
      setIsLoadingPrices(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: currency || 'ZAR',
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  const handleTotalChange = (value: number) => {
    setManualOverride(true)
    onTotalAmountChange(value)
  }

  const resetToCalculated = () => {
    setManualOverride(false)
    onTotalAmountChange(calculatedTotal)
  }

  const nights = pricingBreakdown.length

  return (
    <div className="p-6 space-y-6">
      {/* Booking Summary */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Booking Summary</h3>
        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-500">Guest:</span>
                <span className="text-sm font-medium text-gray-900">{guestName || '-'}</span>
              </div>
              {guestEmail && (
                <div className="text-sm text-gray-600 ml-6">{guestEmail}</div>
              )}
              {guestPhone && (
                <div className="text-sm text-gray-600 ml-6">{guestPhone}</div>
              )}
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-500">Room:</span>
                <span className="text-sm font-medium text-gray-900">{roomName || '-'}</span>
              </div>
              <div className="text-sm text-gray-600 ml-6">
                {checkIn && checkOut ? (
                  <>
                    {formatDate(checkIn)} - {formatDate(checkOut)} ({nights} night{nights !== 1 ? 's' : ''})
                  </>
                ) : (
                  '-'
                )}
              </div>
            </div>
          </div>
          {notes && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <span className="text-sm text-gray-500">Notes:</span>
              <p className="text-sm text-gray-700 mt-1">{notes}</p>
            </div>
          )}
          {overrideRules && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="flex items-center gap-2 text-amber-600">
                <AlertTriangle className="w-4 h-4" />
                <span className="text-sm font-medium">Room rules were overridden for this booking</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Pricing Breakdown */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Pricing Breakdown</h3>
        {isLoadingPrices ? (
          <div className="text-gray-500 text-sm py-4 text-center">Calculating prices...</div>
        ) : pricingBreakdown.length > 0 ? (
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Date
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Rate
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    Price
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {pricingBreakdown.map((night) => (
                  <tr key={night.date} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {formatDate(night.date)}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {night.seasonalRate ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
                          {night.seasonalRate.name}
                        </span>
                      ) : (
                        <span className="text-gray-500">Base Rate</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-right font-medium text-gray-900">
                      {formatCurrency(night.price)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-50 border-t border-gray-200">
                <tr>
                  <td colSpan={2} className="px-4 py-3 text-sm font-medium text-gray-900">
                    Calculated Total
                  </td>
                  <td className="px-4 py-3 text-right text-lg font-bold text-gray-900">
                    {formatCurrency(calculatedTotal)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        ) : (
          <div className="text-gray-500 text-sm py-4 text-center bg-gray-50 rounded-lg border border-dashed border-gray-300">
            Select room and dates to see pricing breakdown
          </div>
        )}
      </div>

      {/* Add-ons Section */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Package className="w-5 h-5" />
          Add-ons & Extras
        </h3>
        {isLoadingAddons ? (
          <div className="text-gray-500 text-sm py-4 text-center">Loading add-ons...</div>
        ) : availableAddons.length === 0 ? (
          <div className="text-gray-500 text-sm py-4 text-center bg-gray-50 rounded-lg border border-dashed border-gray-300">
            No add-ons available for this room
          </div>
        ) : (
          <div className="space-y-3">
            {availableAddons.map((addon) => {
              const selected = selectedAddons.find((a) => a.id === addon.id)
              const quantity = selected?.quantity || 0

              return (
                <div
                  key={addon.id}
                  className={`border rounded-lg p-4 transition-all ${
                    quantity > 0 ? 'border-black bg-gray-50' : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    {/* Add-on Image */}
                    {addon.image ? (
                      <img
                        src={addon.image.url}
                        alt={addon.name}
                        className="w-12 h-12 object-cover rounded-lg flex-shrink-0"
                      />
                    ) : (
                      <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Coffee className="w-5 h-5 text-gray-400" />
                      </div>
                    )}

                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium text-gray-900">{addon.name}</h4>
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
                        <span className="font-medium">{formatCurrency(addon.price)}</span>
                        <span className="text-gray-500">
                          {' / '}
                          {addon.pricing_type
                            .replace('per_', '')
                            .replace('_', ' ')
                            .replace('guest night', 'guest/night')}
                        </span>
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleAddonToggle(addon, Math.max(0, quantity - 1))}
                        disabled={quantity === 0}
                        className="w-8 h-8 rounded-full border flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
                      >
                        <Minus size={16} />
                      </button>
                      <span className="w-8 text-center font-medium">{quantity}</span>
                      <button
                        type="button"
                        onClick={() => handleAddonToggle(addon, Math.min(addon.max_quantity, quantity + 1))}
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
                      <span className="font-medium">{formatCurrency(selected?.total || 0)}</span>
                    </div>
                  )}
                </div>
              )
            })}

            {selectedAddons.length > 0 && (
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <div className="flex justify-between items-center">
                  <span className="font-medium text-gray-900">Add-ons Total</span>
                  <span className="text-lg font-bold text-gray-900">{formatCurrency(getAddonsTotal())}</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Total Amount Override */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Final Amount</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4" />
                Total Amount *
              </div>
            </label>
            <input
              type="number"
              value={totalAmount}
              onChange={(e) => handleTotalChange(parseFloat(e.target.value) || 0)}
              min="0"
              step="0.01"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
            />
            {manualOverride && totalAmount !== calculatedTotal && (
              <div className="mt-2">
                <button
                  type="button"
                  onClick={resetToCalculated}
                  className="text-xs text-blue-600 hover:text-blue-800"
                >
                  Reset to calculated: {formatCurrency(calculatedTotal)}
                </button>
              </div>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Currency</label>
            <select
              value={currency}
              onChange={(e) => onCurrencyChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
            >
              {CURRENCIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.code} - {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        {manualOverride && totalAmount !== calculatedTotal && (
          <div className="mt-3 flex items-start gap-2 text-amber-600 bg-amber-50 p-3 rounded-lg">
            <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span className="text-sm">
              You have manually adjusted the total amount. The calculated total was {formatCurrency(calculatedTotal)}.
            </span>
          </div>
        )}
      </div>

      {/* Status Fields */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Booking Status</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Booking Status
              </div>
            </label>
            <select
              value={status}
              onChange={(e) => onStatusChange(e.target.value as any)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
            >
              {BOOKING_STATUSES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label} - {s.description}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4" />
                Payment Status
              </div>
            </label>
            <select
              value={paymentStatus}
              onChange={(e) => onPaymentStatusChange(e.target.value as any)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
            >
              {PAYMENT_STATUSES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label} - {s.description}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </div>
  )
}

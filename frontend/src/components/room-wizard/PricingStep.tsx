import { useState } from 'react'
import { Plus, Edit2, Trash2, Calendar, Users, Building2, UserPlus } from 'lucide-react'
import Button from '../Button'
import DatePickerModal from '../DatePickerModal'
import { SeasonalRate, roomsApi, PricingMode } from '../../services/api'
import { useNotification } from '../../contexts/NotificationContext'

interface PricingStepProps {
  roomId: string
  pricingMode: PricingMode
  basePrice: number
  additionalPersonRate?: number
  childPricePerNight?: number
  childFreeUntilAge?: number
  childAgeLimit?: number
  currency: string
  minStayNights: number
  maxStayNights?: number
  seasonalRates: SeasonalRate[]
  onRatesChange: (rates: SeasonalRate[]) => void
  onPricingModeChange: (mode: PricingMode) => void
  onBasePriceChange: (price: number) => void
  onAdditionalPersonRateChange: (rate: number | undefined) => void
  onChildPriceChange: (price: number | undefined) => void
  onChildFreeUntilAgeChange: (age: number | undefined) => void
  onChildAgeLimitChange: (age: number | undefined) => void
  onCurrencyChange: (currency: string) => void
  onMinStayChange: (min: number) => void
  onMaxStayChange: (max: number | undefined) => void
}

interface RateFormData {
  name: string
  start_date: string
  end_date: string
  pricing_mode?: PricingMode
  price_per_night: number
  additional_person_rate?: number
  priority: number
}

const PRICING_MODES: { value: PricingMode; label: string; description: string; icon: React.ReactNode }[] = [
  {
    value: 'per_unit',
    label: 'Per Unit',
    description: 'Flat rate for the entire room regardless of number of guests',
    icon: <Building2 size={20} />,
  },
  {
    value: 'per_person',
    label: 'Per Person',
    description: 'Price multiplied by number of guests',
    icon: <Users size={20} />,
  },
  {
    value: 'per_person_sharing',
    label: 'Per Person Sharing',
    description: 'Base rate for first person, additional rate for each extra guest',
    icon: <UserPlus size={20} />,
  },
]

const CURRENCIES = [
  { code: 'ZAR', name: 'South African Rand' },
  { code: 'USD', name: 'US Dollar' },
  { code: 'EUR', name: 'Euro' },
  { code: 'GBP', name: 'British Pound' },
  { code: 'NGN', name: 'Nigerian Naira' },
]

export default function PricingStep({
  roomId,
  pricingMode,
  basePrice,
  additionalPersonRate,
  childPricePerNight,
  childFreeUntilAge,
  childAgeLimit,
  currency,
  minStayNights,
  maxStayNights,
  seasonalRates,
  onRatesChange,
  onPricingModeChange,
  onBasePriceChange,
  onAdditionalPersonRateChange,
  onChildPriceChange,
  onChildFreeUntilAgeChange,
  onChildAgeLimitChange,
  onCurrencyChange,
  onMinStayChange,
  onMaxStayChange,
}: PricingStepProps) {
  const { showSuccess, showError } = useNotification()
  const [showRateForm, setShowRateForm] = useState(false)
  const [editingRate, setEditingRate] = useState<SeasonalRate | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [rateForm, setRateForm] = useState<RateFormData>({
    name: '',
    start_date: '',
    end_date: '',
    pricing_mode: undefined, // Inherit from room
    price_per_night: 0,
    additional_person_rate: undefined,
    priority: 0,
  })

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: currency,
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  const handleAddRate = () => {
    setEditingRate(null)
    setRateForm({
      name: '',
      start_date: '',
      end_date: '',
      pricing_mode: undefined, // Inherit from room
      price_per_night: basePrice,
      additional_person_rate: additionalPersonRate,
      priority: seasonalRates.length,
    })
    setShowRateForm(true)
  }

  const handleEditRate = (rate: SeasonalRate) => {
    setEditingRate(rate)
    setRateForm({
      name: rate.name,
      start_date: rate.start_date,
      end_date: rate.end_date,
      pricing_mode: rate.pricing_mode,
      price_per_night: rate.price_per_night,
      additional_person_rate: rate.additional_person_rate,
      priority: rate.priority,
    })
    setShowRateForm(true)
  }

  const handleDeleteRate = async (rate: SeasonalRate) => {
    if (!rate.id) return

    try {
      await roomsApi.deleteRate(roomId, rate.id)
      onRatesChange(seasonalRates.filter((r) => r.id !== rate.id))
      showSuccess('Rate Deleted', `"${rate.name}" has been removed.`)
    } catch (error) {
      console.error('Failed to delete rate:', error)
      showError('Delete Failed', 'Could not delete the seasonal rate.')
    }
  }

  const handleSaveRate = async () => {
    try {
      setIsSaving(true)

      if (editingRate?.id) {
        // Update existing rate
        const updated = await roomsApi.updateRate(roomId, editingRate.id, rateForm)
        onRatesChange(seasonalRates.map((r) => (r.id === editingRate.id ? updated : r)))
        showSuccess('Rate Updated', `"${rateForm.name}" has been updated.`)
      } else {
        // Create new rate
        const newRate = await roomsApi.createRate(roomId, rateForm)
        onRatesChange([...seasonalRates, newRate])
        showSuccess('Rate Created', `"${rateForm.name}" has been added.`)
      }

      setShowRateForm(false)
      setEditingRate(null)
    } catch (error) {
      console.error('Failed to save rate:', error)
      showError('Save Failed', 'Could not save the seasonal rate.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancelRateForm = () => {
    setShowRateForm(false)
    setEditingRate(null)
  }

  const handlePricingUpdate = async () => {
    try {
      setIsSaving(true)
      await roomsApi.update(roomId, {
        pricing_mode: pricingMode,
        base_price_per_night: basePrice,
        additional_person_rate: additionalPersonRate,
        child_price_per_night: childPricePerNight,
        child_free_until_age: childFreeUntilAge,
        child_age_limit: childAgeLimit,
        currency,
        min_stay_nights: minStayNights,
        max_stay_nights: maxStayNights,
      })
      showSuccess('Pricing Updated', 'Pricing and booking limits have been saved.')
    } catch (error) {
      console.error('Failed to update pricing:', error)
      showError('Update Failed', 'Could not save the pricing settings.')
    } finally {
      setIsSaving(false)
    }
  }

  // Get the label for base price based on pricing mode
  const getBasePriceLabel = () => {
    switch (pricingMode) {
      case 'per_person':
        return 'Price per Person per Night *'
      case 'per_person_sharing':
        return 'Base Price (First Person) per Night *'
      default:
        return 'Price per Unit per Night *'
    }
  }

  return (
    <div className="p-6 space-y-8">
      {/* Pricing Mode */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Pricing Model</h3>
        <p className="text-sm text-gray-500 mb-4">
          Choose how you want to charge for this room.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {PRICING_MODES.map((mode) => (
            <button
              key={mode.value}
              type="button"
              onClick={() => onPricingModeChange(mode.value)}
              className={`p-4 rounded-lg border-2 text-left transition-all ${
                pricingMode === mode.value
                  ? 'border-black bg-gray-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-3 mb-2">
                <div className={`${pricingMode === mode.value ? 'text-black' : 'text-gray-400'}`}>
                  {mode.icon}
                </div>
                <span className={`font-medium ${pricingMode === mode.value ? 'text-black' : 'text-gray-700'}`}>
                  {mode.label}
                </span>
              </div>
              <p className="text-sm text-gray-500">{mode.description}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Base Price */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Base Price</h3>
        <p className="text-sm text-gray-500 mb-4">
          Set the default nightly rate for this room. Seasonal rates can override this for specific date ranges.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {getBasePriceLabel()}
            </label>
            <input
              type="number"
              value={basePrice}
              onChange={(e) => onBasePriceChange(parseFloat(e.target.value) || 0)}
              min="0"
              step="0.01"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
            />
            {pricingMode === 'per_person' && (
              <p className="text-xs text-gray-500 mt-1">Total = Price x Number of guests</p>
            )}
          </div>

          {pricingMode === 'per_person_sharing' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Additional Person Rate *
              </label>
              <input
                type="number"
                value={additionalPersonRate ?? ''}
                onChange={(e) => onAdditionalPersonRateChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                min="0"
                step="0.01"
                placeholder="Rate per extra person"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
              />
              <p className="text-xs text-gray-500 mt-1">Price for each additional guest after first</p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Currency
            </label>
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

        {/* Pricing Example */}
        <div className="mt-4 p-3 bg-blue-50 border border-blue-100 rounded-lg">
          <p className="text-sm font-medium text-blue-800 mb-1">Pricing Example (2 adults):</p>
          <p className="text-sm text-blue-700">
            {pricingMode === 'per_unit' && (
              <>Total per night: <span className="font-medium">{formatCurrency(basePrice)}</span></>
            )}
            {pricingMode === 'per_person' && (
              <>Total per night: {formatCurrency(basePrice)} x 2 = <span className="font-medium">{formatCurrency(basePrice * 2)}</span></>
            )}
            {pricingMode === 'per_person_sharing' && (
              <>Total per night: {formatCurrency(basePrice)} + {formatCurrency(additionalPersonRate || 0)} = <span className="font-medium">{formatCurrency(basePrice + (additionalPersonRate || 0))}</span></>
            )}
          </p>
        </div>
      </div>

      {/* Children Pricing */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Children Pricing</h3>
        <p className="text-sm text-gray-500 mb-4">
          Set pricing rules for children. Define age ranges and whether children stay free or at a reduced rate.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Children Age Limit
            </label>
            <select
              value={childAgeLimit ?? 12}
              onChange={(e) => onChildAgeLimitChange(parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
            >
              {[6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18].map((age) => (
                <option key={age} value={age}>
                  Under {age} years
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">
              Guests {childAgeLimit ?? 12}+ pay adult rate
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Free Until Age
            </label>
            <select
              value={childFreeUntilAge ?? ''}
              onChange={(e) => onChildFreeUntilAgeChange(e.target.value ? parseInt(e.target.value) : undefined)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
            >
              <option value="">No free children</option>
              {[2, 3, 4, 5, 6].map((age) => (
                <option key={age} value={age}>
                  Under {age} years free
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">
              {childFreeUntilAge
                ? `Children 0-${childFreeUntilAge - 1} stay free`
                : 'All children pay'}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Child Price/Night ({currency})
            </label>
            <input
              type="number"
              value={childPricePerNight ?? ''}
              onChange={(e) => onChildPriceChange(e.target.value ? parseFloat(e.target.value) : undefined)}
              min="0"
              step="0.01"
              placeholder="Same as adult"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
            />
            <p className="text-xs text-gray-500 mt-1">
              {childPricePerNight === 0
                ? 'All children stay free'
                : childPricePerNight
                  ? `${childFreeUntilAge ? `Ages ${childFreeUntilAge}-${(childAgeLimit ?? 12) - 1}` : `Ages 0-${(childAgeLimit ?? 12) - 1}`} pay this rate`
                  : 'Leave empty for adult rate'}
            </p>
          </div>
        </div>

        {/* Pricing Summary */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Pricing Summary</h4>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>• Adults ({childAgeLimit ?? 12}+ years): <span className="font-medium">{formatCurrency(basePrice)}/night</span></li>
            {childFreeUntilAge && (
              <li>• Infants/Toddlers (0-{childFreeUntilAge - 1} years): <span className="font-medium text-accent-600">Free</span></li>
            )}
            <li>
              • Children ({childFreeUntilAge ?? 0}-{(childAgeLimit ?? 12) - 1} years):{' '}
              <span className="font-medium">
                {childPricePerNight === 0
                  ? <span className="text-accent-600">Free</span>
                  : childPricePerNight
                    ? `${formatCurrency(childPricePerNight)}/night`
                    : `${formatCurrency(basePrice)}/night (same as adult)`}
              </span>
            </li>
          </ul>
        </div>
      </div>

      {/* Booking Duration Limits */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Booking Duration Limits</h3>
        <p className="text-sm text-gray-500 mb-4">
          Set minimum and maximum nights a guest can book this room. Leave maximum empty for no limit.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Minimum Stay (nights) *
            </label>
            <input
              type="number"
              value={minStayNights}
              onChange={(e) => onMinStayChange(parseInt(e.target.value) || 1)}
              min="1"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
            />
            <p className="text-xs text-gray-500 mt-1">Guests must book at least this many nights</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Maximum Stay (nights)
            </label>
            <input
              type="number"
              value={maxStayNights ?? ''}
              onChange={(e) => onMaxStayChange(e.target.value ? parseInt(e.target.value) : undefined)}
              min={minStayNights}
              placeholder="No limit"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
            />
            <p className="text-xs text-gray-500 mt-1">Leave empty for unlimited stay duration</p>
          </div>
        </div>

        <div className="mt-4">
          <Button onClick={handlePricingUpdate} disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save Pricing & Limits'}
          </Button>
        </div>
      </div>

      {/* Seasonal Rates */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Seasonal Rates</h3>
            <p className="text-sm text-gray-500">
              Create special pricing for holidays, peak seasons, or promotional periods.
            </p>
          </div>
          <Button onClick={handleAddRate} variant="outline">
            <Plus size={16} className="mr-2" />
            Add Rate
          </Button>
        </div>

        {/* Rate Form */}
        {showRateForm && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4">
            <h4 className="font-medium text-gray-900 mb-4">
              {editingRate ? 'Edit Seasonal Rate' : 'New Seasonal Rate'}
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="lg:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Rate Name *
                </label>
                <input
                  type="text"
                  value={rateForm.name}
                  onChange={(e) => setRateForm((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Christmas Special, Summer Peak"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
                />
              </div>
              <DatePickerModal
                value={rateForm.start_date}
                onChange={(date) => setRateForm((prev) => ({ ...prev, start_date: date }))}
                label="Start Date *"
                placeholder="Select start date"
              />
              <DatePickerModal
                value={rateForm.end_date}
                onChange={(date) => setRateForm((prev) => ({ ...prev, end_date: date }))}
                label="End Date *"
                placeholder="Select end date"
                minDate={rateForm.start_date}
              />
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Price per Night ({currency}) *
                </label>
                <input
                  type="number"
                  value={rateForm.price_per_night}
                  onChange={(e) =>
                    setRateForm((prev) => ({
                      ...prev,
                      price_per_night: parseFloat(e.target.value) || 0,
                    }))
                  }
                  min="0"
                  step="0.01"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Priority
                </label>
                <input
                  type="number"
                  value={rateForm.priority}
                  onChange={(e) =>
                    setRateForm((prev) => ({ ...prev, priority: parseInt(e.target.value) || 0 }))
                  }
                  min="0"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
                />
                <p className="text-xs text-gray-500 mt-1">Higher priority rates take precedence</p>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-4">
              <Button variant="outline" onClick={handleCancelRateForm} disabled={isSaving}>
                Cancel
              </Button>
              <Button
                onClick={handleSaveRate}
                disabled={
                  isSaving ||
                  !rateForm.name ||
                  !rateForm.start_date ||
                  !rateForm.end_date ||
                  rateForm.price_per_night < 0
                }
              >
                {isSaving ? 'Saving...' : editingRate ? 'Update Rate' : 'Add Rate'}
              </Button>
            </div>
          </div>
        )}

        {/* Rates List */}
        {seasonalRates.length === 0 ? (
          <div className="text-center py-8 bg-gray-50 rounded-lg border border-dashed border-gray-300">
            <Calendar className="w-10 h-10 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-500">No seasonal rates configured</p>
            <p className="text-sm text-gray-400">Add rates to set special pricing for specific periods</p>
          </div>
        ) : (
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Name
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Period
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Price/Night
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Priority
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {seasonalRates.map((rate) => (
                  <tr key={rate.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <span className="font-medium text-gray-900">{rate.name}</span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {formatDate(rate.start_date)} - {formatDate(rate.end_date)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`font-medium ${
                          rate.price_per_night > basePrice
                            ? 'text-red-600'
                            : rate.price_per_night < basePrice
                            ? 'text-accent-600'
                            : 'text-gray-900'
                        }`}
                      >
                        {formatCurrency(rate.price_per_night)}
                      </span>
                      {rate.price_per_night !== basePrice && (
                        <span className="text-xs text-gray-400 ml-2">
                          ({rate.price_per_night > basePrice ? '+' : ''}
                          {Math.round(((rate.price_per_night - basePrice) / basePrice) * 100)}%)
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{rate.priority}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleEditRate(rate)}
                          className="p-1 text-gray-500 hover:text-gray-700"
                          title="Edit"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => handleDeleteRate(rate)}
                          className="p-1 text-gray-500 hover:text-red-600"
                          title="Delete"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

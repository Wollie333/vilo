import { Plus, Trash2, Bed } from 'lucide-react'
import AmenitiesInput from '../AmenitiesInput'
import RoomImageUpload from '../RoomImageUpload'
import { RoomFormData } from '../../pages/RoomWizard'
import { BedConfiguration } from '../../services/api'

const BED_TYPES = [
  'King',
  'Queen',
  'Double',
  'Twin',
  'Single',
  'Bunk',
  'Sofa Bed',
]

// Suggested sleeps per bed type
const BED_SLEEPS: Record<string, number> = {
  'King': 2,
  'Queen': 2,
  'Double': 2,
  'Twin': 1,
  'Single': 1,
  'Bunk': 2,
  'Sofa Bed': 2,
}

interface RoomDetailsStepProps {
  formData: RoomFormData
  onChange: (updates: Partial<RoomFormData>) => void
}

export default function RoomDetailsStep({ formData, onChange }: RoomDetailsStepProps) {
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target
    onChange({
      [name]:
        type === 'number'
          ? value === '' ? undefined : parseFloat(value)
          : type === 'checkbox'
          ? (e.target as HTMLInputElement).checked
          : value,
    })
  }

  // Calculate total sleeps from all beds
  const totalBedSleeps = formData.beds.reduce((sum, bed) => sum + (bed.quantity * bed.sleeps), 0)

  // Add a new bed configuration
  const handleAddBed = () => {
    const newBed: BedConfiguration = {
      id: crypto.randomUUID(),
      bed_type: 'Double',
      quantity: 1,
      sleeps: 2,
    }
    onChange({ beds: [...formData.beds, newBed] })
  }

  // Remove a bed configuration
  const handleRemoveBed = (id: string) => {
    if (formData.beds.length <= 1) return // Keep at least one bed
    onChange({ beds: formData.beds.filter(bed => bed.id !== id) })
  }

  // Update a bed configuration
  const handleBedChange = (id: string, field: keyof BedConfiguration, value: string | number) => {
    onChange({
      beds: formData.beds.map(bed => {
        if (bed.id !== id) return bed

        const updates: Partial<BedConfiguration> = { [field]: value }

        // Auto-update sleeps when bed type changes
        if (field === 'bed_type' && typeof value === 'string') {
          updates.sleeps = BED_SLEEPS[value] || 2
        }

        return { ...bed, ...updates }
      })
    })
  }

  return (
    <div className="p-6 space-y-8">
      {/* Basic Information */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Room Name *
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              placeholder="e.g., Deluxe Double Room"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={3}
              placeholder="Describe the room, its features, and what makes it special..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Room Code (Auto-generated)
            </label>
            <input
              type="text"
              name="room_code"
              value={formData.room_code}
              readOnly
              className="w-full px-3 py-2 border border-gray-200 rounded-md bg-gray-50 text-gray-600 cursor-not-allowed"
            />
          </div>
        </div>
      </div>

      {/* Room Configuration */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Configuration</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Room Size (m²)
            </label>
            <input
              type="number"
              name="room_size_sqm"
              value={formData.room_size_sqm ?? ''}
              onChange={handleChange}
              min="0"
              step="0.01"
              placeholder="e.g., 43"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Max Guests (Total Pax) *
            </label>
            <input
              type="number"
              name="max_guests"
              value={formData.max_guests ?? ''}
              onChange={handleChange}
              required
              min="1"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
            />
            <p className="text-xs text-gray-400 mt-1">
              Maximum number of guests allowed in this room
            </p>
          </div>
        </div>
      </div>

      {/* Bed Configuration */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Beds</h3>
            <p className="text-sm text-gray-500">
              Configure beds in this room. Total bed capacity: <span className="font-medium text-gray-900">{totalBedSleeps} sleeps</span>
            </p>
          </div>
          <button
            type="button"
            onClick={handleAddBed}
            className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Plus size={16} />
            Add Bed
          </button>
        </div>

        <div className="space-y-3">
          {formData.beds.map((bed) => (
            <div
              key={bed.id}
              className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg border border-gray-200"
            >
              <div className="flex-shrink-0">
                <Bed size={20} className="text-gray-400" />
              </div>
              <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    Bed Type
                  </label>
                  <select
                    value={bed.bed_type}
                    onChange={(e) => handleBedChange(bed.id, 'bed_type', e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
                  >
                    {BED_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    Quantity
                  </label>
                  <input
                    type="number"
                    value={bed.quantity}
                    onChange={(e) => handleBedChange(bed.id, 'quantity', parseInt(e.target.value) || 1)}
                    min="1"
                    max="10"
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    Sleeps (per bed)
                  </label>
                  <input
                    type="number"
                    value={bed.sleeps}
                    onChange={(e) => handleBedChange(bed.id, 'sleeps', parseInt(e.target.value) || 1)}
                    min="1"
                    max="4"
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
                  />
                </div>
              </div>
              <div className="flex-shrink-0 text-right">
                <p className="text-sm font-medium text-gray-900">
                  {bed.quantity * bed.sleeps} pax
                </p>
                {formData.beds.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveBed(bed.id)}
                    className="mt-1 p-1 text-gray-400 hover:text-red-500 transition-colors"
                    title="Remove bed"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Summary */}
        <div className="mt-4 p-3 bg-gray-100 rounded-lg">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">
              {formData.beds.length} bed{formData.beds.length !== 1 ? 's' : ''} configured
            </span>
            <span className="font-medium text-gray-900">
              Total Capacity: {totalBedSleeps} sleeps
            </span>
          </div>
          {totalBedSleeps !== formData.max_guests && (
            <p className="mt-2 text-xs text-amber-600">
              Note: Bed capacity ({totalBedSleeps}) differs from max guests ({formData.max_guests}).
              Max guests is the booking limit.
            </p>
          )}
        </div>
      </div>

      {/* Amenities */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Amenities</h3>
        <AmenitiesInput
          value={formData.amenities}
          onChange={(amenities) => onChange({ amenities })}
        />
      </div>

      {/* Images */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Images</h3>
        <RoomImageUpload
          value={formData.images}
          onChange={(images) => onChange({ images })}
        />
      </div>

      {/* Inventory */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Inventory</h3>
        <div className="space-y-4">
          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="inventory_mode"
                value="single_unit"
                checked={formData.inventory_mode === 'single_unit'}
                onChange={handleChange}
                className="w-4 h-4 text-black focus:ring-black"
              />
              <span className="text-sm font-medium">Single Unit</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="inventory_mode"
                value="room_type"
                checked={formData.inventory_mode === 'room_type'}
                onChange={handleChange}
                className="w-4 h-4 text-black focus:ring-black"
              />
              <span className="text-sm font-medium">Room Type (Multiple Units)</span>
            </label>
          </div>
          <p className="text-sm text-gray-500">
            {formData.inventory_mode === 'single_unit'
              ? 'This is a single, unique room (e.g., "Room 101").'
              : 'This is a room type with multiple identical units available.'}
          </p>
          {formData.inventory_mode === 'room_type' && (
            <div className="max-w-xs">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Total Units Available
              </label>
              <input
                type="number"
                name="total_units"
                value={formData.total_units ?? ''}
                onChange={handleChange}
                min="1"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
              />
            </div>
          )}
        </div>
      </div>

      {/* Status */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Status</h3>
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            name="is_active"
            checked={formData.is_active}
            onChange={handleChange}
            className="w-5 h-5 rounded border-gray-300 text-black focus:ring-black"
          />
          <span className="text-sm font-medium">
            Active (room is available for booking)
          </span>
        </label>
      </div>
    </div>
  )
}

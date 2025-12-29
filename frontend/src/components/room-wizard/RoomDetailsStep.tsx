import AmenitiesInput from '../AmenitiesInput'
import RoomImageUpload from '../RoomImageUpload'
import { RoomFormData } from '../../pages/RoomWizard'

const BED_TYPES = [
  'King',
  'Queen',
  'Double',
  'Twin',
  'Single',
  'Bunk',
  'Sofa Bed',
]

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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Bed Type *
            </label>
            <select
              name="bed_type"
              value={formData.bed_type}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
            >
              {BED_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Bed Count
            </label>
            <input
              type="number"
              name="bed_count"
              value={formData.bed_count ?? ''}
              onChange={handleChange}
              min="1"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Size (m²)
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
              Max Guests *
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
          </div>
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

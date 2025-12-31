import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import Button from './Button'
import AmenitiesInput from './AmenitiesInput'
import RoomImageUpload from './RoomImageUpload'
import { Room, RoomImages } from '../services/api'

const BED_TYPES = [
  'King',
  'Queen',
  'Double',
  'Twin',
  'Single',
  'Bunk',
  'Sofa Bed',
]

const DEFAULT_IMAGES: RoomImages = {
  featured: null,
  gallery: [],
}

interface RoomFormProps {
  room?: Room | null
  isOpen: boolean
  onClose: () => void
  onSubmit: (room: Omit<Room, 'id' | 'created_at' | 'updated_at'>) => Promise<void>
  isSubmitting?: boolean
  tenantId: string
}

// Generate a unique room code: RM-XXXXXX (6 alphanumeric chars)
const generateRoomCode = (): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let code = 'RM-'
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

export default function RoomForm({ room, isOpen, onClose, onSubmit, isSubmitting = false, tenantId }: RoomFormProps) {
  const [formData, setFormData] = useState<Omit<Room, 'id' | 'created_at' | 'updated_at'>>({
    name: '',
    description: '',
    room_code: generateRoomCode(),
    bed_type: 'Double',
    bed_count: 1,
    room_size_sqm: undefined,
    max_guests: 2,
    amenities: [],
    images: DEFAULT_IMAGES,
    base_price_per_night: 0,
    currency: 'ZAR',
    inventory_mode: 'single_unit',
    total_units: 1,
    is_active: true,
    min_stay_nights: 1,
  })

  useEffect(() => {
    if (room) {
      setFormData({
        name: room.name,
        description: room.description || '',
        room_code: room.room_code || '',
        bed_type: room.bed_type,
        bed_count: room.bed_count,
        room_size_sqm: room.room_size_sqm,
        max_guests: room.max_guests,
        amenities: room.amenities,
        images: room.images || DEFAULT_IMAGES,
        base_price_per_night: room.base_price_per_night,
        currency: room.currency,
        inventory_mode: room.inventory_mode,
        total_units: room.total_units,
        is_active: room.is_active,
        min_stay_nights: room.min_stay_nights || 1,
      })
    } else {
      // Generate a fresh room code for new rooms
      setFormData({
        name: '',
        description: '',
        room_code: generateRoomCode(),
        bed_type: 'Double',
        bed_count: 1,
        room_size_sqm: undefined,
        max_guests: 2,
        amenities: [],
        images: DEFAULT_IMAGES,
        base_price_per_night: 0,
        currency: 'ZAR',
        inventory_mode: 'single_unit',
        total_units: 1,
        is_active: true,
        min_stay_nights: 1,
      })
    }
  }, [room, isOpen])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(formData)
  }

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]:
        type === 'number'
          ? value === '' ? undefined : parseFloat(value)
          : type === 'checkbox'
          ? (e.target as HTMLInputElement).checked
          : value,
    }))
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-gradient-to-r from-accent-600 to-accent-500 px-6 py-5 flex items-center justify-between z-10 rounded-t-lg">
          <h2 className="text-2xl font-bold text-white">
            {room ? 'Edit Room' : 'Add New Room'}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
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
                  placeholder="Describe the room..."
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
              onChange={(amenities) => setFormData((prev) => ({ ...prev, amenities }))}
            />
          </div>

          {/* Images */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Images</h3>
            <RoomImageUpload
              value={formData.images}
              onChange={(images) => setFormData((prev) => ({ ...prev, images }))}
              tenantId={tenantId}
            />
          </div>

          {/* Pricing */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Pricing</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Base Price per Night *
                </label>
                <input
                  type="number"
                  name="base_price_per_night"
                  value={formData.base_price_per_night ?? ''}
                  onChange={handleChange}
                  required
                  min="0"
                  step="0.01"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Currency
                </label>
                <select
                  name="currency"
                  value={formData.currency}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
                >
                  <option value="ZAR">ZAR</option>
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                  <option value="GBP">GBP</option>
                  <option value="NGN">NGN</option>
                </select>
              </div>
            </div>
            <p className="text-sm text-gray-500 mt-2">
              Seasonal rates can be added after creating the room.
            </p>
          </div>

          {/* Inventory */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Inventory</h3>
            <div className="space-y-4">
              <div className="flex items-center gap-4">
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

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : room ? 'Update Room' : 'Create Room'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Save, Package, DollarSign, Settings, Image as ImageIcon } from 'lucide-react'
import Button from '../components/Button'
import AddOnImageUpload from '../components/AddOnImageUpload'
import { addonsApi, roomsApi, AddOn, AddOnImage, Room } from '../services/api'
import { useNotification } from '../contexts/NotificationContext'

// Generate a unique addon code: AO-XXXXXX (6 alphanumeric chars)
const generateAddOnCode = (): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let code = 'AO-'
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

const addonTypes = [
  { value: 'service', label: 'Service', description: 'E.g., Airport transfer, Spa treatment' },
  { value: 'product', label: 'Product', description: 'E.g., Welcome basket, Champagne' },
  { value: 'experience', label: 'Experience', description: 'E.g., Safari tour, Wine tasting' },
]

const pricingTypes = [
  { value: 'per_booking', label: 'Per Booking', description: 'Charged once per booking' },
  { value: 'per_night', label: 'Per Night', description: 'Charged for each night of stay' },
  { value: 'per_guest', label: 'Per Guest', description: 'Charged per guest in the booking' },
  { value: 'per_guest_per_night', label: 'Per Guest Per Night', description: 'Charged per guest for each night' },
]

export interface AddOnFormData {
  name: string
  description: string
  addon_code: string
  addon_type: 'service' | 'product' | 'experience'
  price: number
  currency: string
  pricing_type: 'per_booking' | 'per_night' | 'per_guest' | 'per_guest_per_night'
  max_quantity: number
  image: AddOnImage | null
  available_for_rooms: string[]
  is_active: boolean
}

export default function AddOnWizard() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const isEditing = Boolean(id)
  const { showSuccess, showError } = useNotification()

  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [rooms, setRooms] = useState<Room[]>([])
  const [allRooms, setAllRooms] = useState(true)

  const [formData, setFormData] = useState<AddOnFormData>({
    name: '',
    description: '',
    addon_code: generateAddOnCode(),
    addon_type: 'service',
    price: 0,
    currency: 'ZAR',
    pricing_type: 'per_booking',
    max_quantity: 1,
    image: null,
    available_for_rooms: [],
    is_active: true,
  })

  // Load add-on data if editing
  useEffect(() => {
    if (id) {
      loadAddOn(id)
    }
    loadRooms()
  }, [id])

  const loadRooms = async () => {
    try {
      const data = await roomsApi.getAll({ is_active: true })
      setRooms(data)
    } catch (error) {
      console.error('Failed to load rooms:', error)
    }
  }

  const loadAddOn = async (addonId: string) => {
    try {
      setIsLoading(true)
      const addon = await addonsApi.getById(addonId)
      setFormData({
        name: addon.name,
        description: addon.description || '',
        addon_code: addon.addon_code || '',
        addon_type: addon.addon_type,
        price: addon.price,
        currency: addon.currency,
        pricing_type: addon.pricing_type,
        max_quantity: addon.max_quantity,
        image: addon.image,
        available_for_rooms: addon.available_for_rooms || [],
        is_active: addon.is_active,
      })
      setAllRooms(addon.available_for_rooms.length === 0)
    } catch (error) {
      console.error('Failed to load add-on:', error)
      showError('Failed to Load', 'Could not load add-on data.')
      navigate('/dashboard/addons')
    } finally {
      setIsLoading(false)
    }
  }

  const updateFormData = (updates: Partial<AddOnFormData>) => {
    setFormData((prev) => ({ ...prev, ...updates }))
  }

  const handleSave = async () => {
    if (!formData.name || formData.price < 0) {
      showError('Validation Error', 'Please fill in all required fields.')
      return
    }

    try {
      setIsSaving(true)
      const dataToSave = {
        ...formData,
        available_for_rooms: allRooms ? [] : formData.available_for_rooms,
      }

      if (isEditing && id) {
        await addonsApi.update(id, dataToSave)
        showSuccess('Add-on Updated', `${formData.name} has been updated successfully.`)
      } else {
        await addonsApi.create(dataToSave)
        showSuccess('Add-on Created', `${formData.name} has been created successfully.`)
      }
      navigate('/dashboard/addons')
    } catch (error) {
      console.error('Failed to save add-on:', error)
      showError('Save Failed', 'Could not save add-on. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancel = () => {
    navigate('/dashboard/addons')
  }

  const handleRoomToggle = (roomId: string) => {
    const current = formData.available_for_rooms
    if (current.includes(roomId)) {
      updateFormData({ available_for_rooms: current.filter((id) => id !== roomId) })
    } else {
      updateFormData({ available_for_rooms: [...current, roomId] })
    }
  }

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-ZA', { style: 'currency', currency }).format(amount)
  }

  if (isLoading) {
    return (
      <div style={{ backgroundColor: 'var(--bg-card)' }} className="flex items-center justify-center py-20 min-h-full">
        <div style={{ color: 'var(--text-muted)' }}>Loading add-on...</div>
      </div>
    )
  }

  return (
    <div style={{ backgroundColor: 'var(--bg-secondary)' }} className="min-h-full transition-colors">
      {/* Header */}
      <div style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }} className="border-b">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={handleCancel}
                style={{ color: 'var(--text-muted)' }}
                className="p-2 hover:opacity-70 rounded-lg transition-colors"
              >
                <ArrowLeft size={20} />
              </button>
              <div>
                <h1 style={{ color: 'var(--text-primary)' }} className="text-xl font-bold">
                  {isEditing ? 'Edit Add-on' : 'Create New Add-on'}
                </h1>
                <p style={{ color: 'var(--text-muted)' }} className="text-sm">
                  {formData.addon_code && `Code: ${formData.addon_code}`}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="outline" onClick={handleCancel}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={isSaving}>
                <Save size={16} className="mr-2" />
                {isSaving ? 'Saving...' : isEditing ? 'Update Add-on' : 'Create Add-on'}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Form Content */}
      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Details */}
            <div style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }} className="rounded-lg border p-6">
              <div className="flex items-center gap-2 mb-6">
                <Package size={20} style={{ color: 'var(--text-primary)' }} />
                <h2 style={{ color: 'var(--text-primary)' }} className="text-lg font-semibold">Basic Details</h2>
              </div>

              <div className="space-y-4">
                <div>
                  <label style={{ color: 'var(--text-primary)' }} className="block text-sm font-medium mb-1">
                    Add-on Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => updateFormData({ name: e.target.value })}
                    placeholder="e.g., Airport Transfer, Breakfast Package"
                    style={{
                      backgroundColor: 'var(--bg-secondary)',
                      borderColor: 'var(--border-color)',
                      color: 'var(--text-primary)'
                    }}
                    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-1 focus:ring-gray-400"
                  />
                </div>

                <div>
                  <label style={{ color: 'var(--text-primary)' }} className="block text-sm font-medium mb-1">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => updateFormData({ description: e.target.value })}
                    placeholder="Describe what this add-on includes..."
                    rows={3}
                    style={{
                      backgroundColor: 'var(--bg-secondary)',
                      borderColor: 'var(--border-color)',
                      color: 'var(--text-primary)'
                    }}
                    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-1 focus:ring-gray-400"
                  />
                </div>

                <div>
                  <label style={{ color: 'var(--text-primary)' }} className="block text-sm font-medium mb-2">
                    Add-on Type
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    {addonTypes.map((type) => (
                      <button
                        key={type.value}
                        type="button"
                        onClick={() => updateFormData({ addon_type: type.value as AddOnFormData['addon_type'] })}
                        style={{
                          backgroundColor: formData.addon_type === type.value ? 'var(--bg-tertiary)' : 'var(--bg-secondary)',
                          borderColor: formData.addon_type === type.value ? 'var(--text-primary)' : 'var(--border-color)',
                          color: 'var(--text-primary)'
                        }}
                        className="p-3 rounded-lg border-2 text-left transition-colors"
                      >
                        <div className="font-medium text-sm">{type.label}</div>
                        <div style={{ color: 'var(--text-muted)' }} className="text-xs mt-1">{type.description}</div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Pricing */}
            <div style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }} className="rounded-lg border p-6">
              <div className="flex items-center gap-2 mb-6">
                <DollarSign size={20} style={{ color: 'var(--text-primary)' }} />
                <h2 style={{ color: 'var(--text-primary)' }} className="text-lg font-semibold">Pricing</h2>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label style={{ color: 'var(--text-primary)' }} className="block text-sm font-medium mb-1">
                      Price <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <span style={{ color: 'var(--text-muted)' }} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-sm">
                        {formData.currency}
                      </span>
                      <input
                        type="number"
                        value={formData.price}
                        onChange={(e) => updateFormData({ price: parseFloat(e.target.value) || 0 })}
                        min="0"
                        step="0.01"
                        style={{
                          backgroundColor: 'var(--bg-secondary)',
                          borderColor: 'var(--border-color)',
                          color: 'var(--text-primary)'
                        }}
                        className="w-full pl-12 pr-3 py-2 border rounded-md focus:outline-none focus:ring-1 focus:ring-gray-400"
                      />
                    </div>
                  </div>
                  <div>
                    <label style={{ color: 'var(--text-primary)' }} className="block text-sm font-medium mb-1">
                      Currency
                    </label>
                    <select
                      value={formData.currency}
                      onChange={(e) => updateFormData({ currency: e.target.value })}
                      style={{
                        backgroundColor: 'var(--bg-secondary)',
                        borderColor: 'var(--border-color)',
                        color: 'var(--text-primary)'
                      }}
                      className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-1 focus:ring-gray-400"
                    >
                      <option value="ZAR">ZAR - South African Rand</option>
                      <option value="USD">USD - US Dollar</option>
                      <option value="EUR">EUR - Euro</option>
                      <option value="GBP">GBP - British Pound</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label style={{ color: 'var(--text-primary)' }} className="block text-sm font-medium mb-2">
                    Pricing Type
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    {pricingTypes.map((type) => (
                      <button
                        key={type.value}
                        type="button"
                        onClick={() => updateFormData({ pricing_type: type.value as AddOnFormData['pricing_type'] })}
                        style={{
                          backgroundColor: formData.pricing_type === type.value ? 'var(--bg-tertiary)' : 'var(--bg-secondary)',
                          borderColor: formData.pricing_type === type.value ? 'var(--text-primary)' : 'var(--border-color)',
                          color: 'var(--text-primary)'
                        }}
                        className="p-3 rounded-lg border-2 text-left transition-colors"
                      >
                        <div className="font-medium text-sm">{type.label}</div>
                        <div style={{ color: 'var(--text-muted)' }} className="text-xs mt-1">{type.description}</div>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label style={{ color: 'var(--text-primary)' }} className="block text-sm font-medium mb-1">
                    Maximum Quantity
                  </label>
                  <p style={{ color: 'var(--text-muted)' }} className="text-xs mb-2">
                    How many of this add-on can a guest add to their booking?
                  </p>
                  <input
                    type="number"
                    value={formData.max_quantity}
                    onChange={(e) => updateFormData({ max_quantity: parseInt(e.target.value) || 1 })}
                    min="1"
                    max="100"
                    style={{
                      backgroundColor: 'var(--bg-secondary)',
                      borderColor: 'var(--border-color)',
                      color: 'var(--text-primary)'
                    }}
                    className="w-32 px-3 py-2 border rounded-md focus:outline-none focus:ring-1 focus:ring-gray-400"
                  />
                </div>
              </div>
            </div>

            {/* Featured Image */}
            <div style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }} className="rounded-lg border p-6">
              <div className="flex items-center gap-2 mb-6">
                <ImageIcon size={20} style={{ color: 'var(--text-primary)' }} />
                <h2 style={{ color: 'var(--text-primary)' }} className="text-lg font-semibold">Featured Image</h2>
              </div>

              <AddOnImageUpload
                value={formData.image}
                onChange={(image) => updateFormData({ image })}
              />
            </div>

            {/* Room Availability */}
            <div style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }} className="rounded-lg border p-6">
              <div className="flex items-center gap-2 mb-6">
                <Settings size={20} style={{ color: 'var(--text-primary)' }} />
                <h2 style={{ color: 'var(--text-primary)' }} className="text-lg font-semibold">Room Availability</h2>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="allRooms"
                    checked={allRooms}
                    onChange={(e) => {
                      setAllRooms(e.target.checked)
                      if (e.target.checked) {
                        updateFormData({ available_for_rooms: [] })
                      }
                    }}
                    className="w-4 h-4 rounded"
                  />
                  <label htmlFor="allRooms" style={{ color: 'var(--text-primary)' }} className="text-sm font-medium">
                    Available for all rooms
                  </label>
                </div>

                {!allRooms && (
                  <div>
                    <p style={{ color: 'var(--text-muted)' }} className="text-sm mb-3">
                      Select which rooms this add-on is available for:
                    </p>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {rooms.length === 0 ? (
                        <p style={{ color: 'var(--text-muted)' }} className="text-sm italic">
                          No rooms available. Create rooms first.
                        </p>
                      ) : (
                        rooms.map((room) => (
                          <label
                            key={room.id}
                            style={{ borderColor: 'var(--border-color)' }}
                            className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:opacity-80"
                          >
                            <input
                              type="checkbox"
                              checked={formData.available_for_rooms.includes(room.id!)}
                              onChange={() => handleRoomToggle(room.id!)}
                              className="w-4 h-4 rounded"
                            />
                            <div>
                              <div style={{ color: 'var(--text-primary)' }} className="text-sm font-medium">{room.name}</div>
                              <div style={{ color: 'var(--text-muted)' }} className="text-xs">
                                {room.room_code} • {formatCurrency(room.base_price_per_night, room.currency)}/night
                              </div>
                            </div>
                          </label>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Status Card */}
            <div style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }} className="rounded-lg border p-6">
              <h3 style={{ color: 'var(--text-primary)' }} className="font-semibold mb-4">Status</h3>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={(e) => updateFormData({ is_active: e.target.checked })}
                  className="w-4 h-4 rounded"
                />
                <div>
                  <div style={{ color: 'var(--text-primary)' }} className="text-sm font-medium">Active</div>
                  <div style={{ color: 'var(--text-muted)' }} className="text-xs">Available for booking</div>
                </div>
              </label>
            </div>

            {/* Preview Card */}
            <div style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }} className="rounded-lg border p-6">
              <h3 style={{ color: 'var(--text-primary)' }} className="font-semibold mb-4">Preview</h3>
              <div style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }} className="rounded-lg border p-4">
                <div className="flex items-start gap-3">
                  {formData.image ? (
                    <img
                      src={formData.image.url}
                      alt="Add-on preview"
                      className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
                    />
                  ) : (
                    <div style={{ backgroundColor: 'var(--bg-tertiary)' }} className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Package style={{ color: 'var(--text-muted)' }} size={24} />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div style={{ color: 'var(--text-primary)' }} className="font-medium truncate">
                      {formData.name || 'Add-on Name'}
                    </div>
                    <div style={{ color: 'var(--text-muted)' }} className="text-sm truncate">
                      {formData.description || 'Description will appear here'}
                    </div>
                    <div style={{ color: 'var(--text-primary)' }} className="font-semibold mt-2">
                      {formatCurrency(formData.price, formData.currency)}
                      <span style={{ color: 'var(--text-muted)' }} className="text-xs font-normal ml-1">
                        {formData.pricing_type.replace(/_/g, ' ')}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Stats */}
            <div style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }} className="rounded-lg border p-6">
              <h3 style={{ color: 'var(--text-primary)' }} className="font-semibold mb-4">Summary</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span style={{ color: 'var(--text-muted)' }}>Type</span>
                  <span style={{ color: 'var(--text-primary)' }} className="font-medium capitalize">{formData.addon_type}</span>
                </div>
                <div className="flex justify-between">
                  <span style={{ color: 'var(--text-muted)' }}>Pricing</span>
                  <span style={{ color: 'var(--text-primary)' }} className="font-medium capitalize">
                    {formData.pricing_type.replace(/_/g, ' ')}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span style={{ color: 'var(--text-muted)' }}>Max Qty</span>
                  <span style={{ color: 'var(--text-primary)' }} className="font-medium">{formData.max_quantity}</span>
                </div>
                <div className="flex justify-between">
                  <span style={{ color: 'var(--text-muted)' }}>Rooms</span>
                  <span style={{ color: 'var(--text-primary)' }} className="font-medium">
                    {allRooms ? 'All' : `${formData.available_for_rooms.length} selected`}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

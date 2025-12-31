import { useState, useEffect } from 'react'
import { Package, Check, Plus, Loader2 } from 'lucide-react'
import { addonsApi, AddOn } from '../../services/api'
import { useNotification } from '../../contexts/NotificationContext'

interface AddonsStepProps {
  roomId: string
}

const pricingTypeLabels: Record<string, string> = {
  per_booking: 'Per Booking',
  per_night: 'Per Night',
  per_guest: 'Per Guest',
  per_guest_per_night: 'Per Guest/Night',
}

const addonTypeColors: Record<string, string> = {
  service: 'bg-blue-100 text-blue-700',
  product: 'bg-purple-100 text-purple-700',
  experience: 'bg-orange-100 text-orange-700',
}

export default function AddonsStep({ roomId }: AddonsStepProps) {
  const [addons, setAddons] = useState<AddOn[]>([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState<string | null>(null)
  const { showSuccess, showError } = useNotification()

  useEffect(() => {
    loadAddons()
  }, [])

  const loadAddons = async () => {
    try {
      setLoading(true)
      const data = await addonsApi.getAll({ is_active: true })
      setAddons(data)
    } catch (error) {
      console.error('Failed to load add-ons:', error)
    } finally {
      setLoading(false)
    }
  }

  const isAddonAttached = (addon: AddOn): boolean => {
    // If available_for_rooms is empty, it's available for ALL rooms
    if (!addon.available_for_rooms || addon.available_for_rooms.length === 0) {
      return true
    }
    // Otherwise check if this room is in the list
    return addon.available_for_rooms.includes(roomId)
  }

  const handleToggleAddon = async (addon: AddOn) => {
    if (!addon.id) return

    setUpdating(addon.id)

    try {
      const currentRooms = addon.available_for_rooms || []
      const isCurrentlyAttached = isAddonAttached(addon)

      let newRooms: string[]

      if (currentRooms.length === 0) {
        // Currently available for all rooms, user wants to remove this room
        // We need to get all room IDs and exclude this one
        // For simplicity, just add this room to create a "specific rooms" list
        // Actually, if it's for all rooms and user unchecks, we should explicitly exclude
        // But our model doesn't support exclusions, so we'll just show a message
        showError('Cannot Remove', 'This add-on is set to be available for all rooms. Edit the add-on directly to change this.')
        setUpdating(null)
        return
      }

      if (isCurrentlyAttached) {
        // Remove this room from the list
        newRooms = currentRooms.filter(id => id !== roomId)
      } else {
        // Add this room to the list
        newRooms = [...currentRooms, roomId]
      }

      await addonsApi.update(addon.id, { available_for_rooms: newRooms })

      // Update local state
      setAddons(prev => prev.map(a =>
        a.id === addon.id ? { ...a, available_for_rooms: newRooms } : a
      ))

      showSuccess(
        isCurrentlyAttached ? 'Add-on Removed' : 'Add-on Attached',
        `${addon.name} has been ${isCurrentlyAttached ? 'removed from' : 'attached to'} this room.`
      )
    } catch (error) {
      console.error('Failed to update add-on:', error)
      showError('Update Failed', 'Could not update the add-on. Please try again.')
    } finally {
      setUpdating(null)
    }
  }

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-ZA', { style: 'currency', currency }).format(amount)
  }

  if (loading) {
    return (
      <div className="p-6">
        <h3 style={{ color: 'var(--text-primary)' }} className="text-lg font-semibold mb-4">Add-on Services</h3>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin" style={{ color: 'var(--text-muted)' }} />
          <span style={{ color: 'var(--text-muted)' }} className="ml-2">Loading add-ons...</span>
        </div>
      </div>
    )
  }

  if (addons.length === 0) {
    return (
      <div className="p-6">
        <h3 style={{ color: 'var(--text-primary)' }} className="text-lg font-semibold mb-4">Add-on Services</h3>
        <div className="text-center py-12 rounded-lg border border-dashed" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-secondary)' }}>
          <Package className="w-12 h-12 mx-auto mb-3" style={{ color: 'var(--text-muted)' }} />
          <h4 style={{ color: 'var(--text-primary)' }} className="text-lg font-medium mb-2">No Add-ons Available</h4>
          <p style={{ color: 'var(--text-muted)' }} className="max-w-md mx-auto mb-4">
            Create add-on services first, then you can attach them to rooms.
          </p>
          <a
            href="/dashboard/addons/new"
            className="inline-flex items-center gap-2 px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors"
          >
            <Plus size={16} />
            Create Add-on
          </a>
        </div>
      </div>
    )
  }

  const attachedAddons = addons.filter(isAddonAttached)
  const availableAddons = addons.filter(a => !isAddonAttached(a))

  return (
    <div className="p-6">
      <h3 style={{ color: 'var(--text-primary)' }} className="text-lg font-semibold mb-2">Add-on Services</h3>
      <p style={{ color: 'var(--text-muted)' }} className="text-sm mb-6">
        Select which add-ons guests can purchase when booking this room.
      </p>

      {/* Attached Add-ons */}
      {attachedAddons.length > 0 && (
        <div className="mb-6">
          <h4 style={{ color: 'var(--text-secondary)' }} className="text-sm font-medium mb-3 flex items-center gap-2">
            <Check size={16} className="text-accent-600" />
            Attached to this room ({attachedAddons.length})
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {attachedAddons.map(addon => (
              <div
                key={addon.id}
                className="flex items-center justify-between p-4 rounded-lg border-2 border-accent-200 bg-accent-50"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-10 h-10 rounded-lg bg-accent-100 flex items-center justify-center flex-shrink-0">
                    <Package className="w-5 h-5 text-accent-600" />
                  </div>
                  <div className="min-w-0">
                    <div className="font-medium text-gray-900 truncate">{addon.name}</div>
                    <div className="text-sm text-gray-600">
                      {formatCurrency(addon.price, addon.currency)}
                      <span className="text-gray-400 ml-1">/ {pricingTypeLabels[addon.pricing_type]?.toLowerCase()}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 ml-3">
                  <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${addonTypeColors[addon.addon_type]}`}>
                    {addon.addon_type}
                  </span>
                  {addon.available_for_rooms && addon.available_for_rooms.length > 0 && (
                    <button
                      onClick={() => handleToggleAddon(addon)}
                      disabled={updating === addon.id}
                      className="p-1.5 text-red-600 hover:bg-red-100 rounded transition-colors disabled:opacity-50"
                      title="Remove from this room"
                    >
                      {updating === addon.id ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        <span className="text-xs font-medium">Remove</span>
                      )}
                    </button>
                  )}
                  {(!addon.available_for_rooms || addon.available_for_rooms.length === 0) && (
                    <span className="text-xs text-accent-600 font-medium">All Rooms</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Available Add-ons (not attached) */}
      {availableAddons.length > 0 && (
        <div>
          <h4 style={{ color: 'var(--text-secondary)' }} className="text-sm font-medium mb-3 flex items-center gap-2">
            <Plus size={16} style={{ color: 'var(--text-muted)' }} />
            Available to add ({availableAddons.length})
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {availableAddons.map(addon => (
              <div
                key={addon.id}
                style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-card)' }}
                className="flex items-center justify-between p-4 rounded-lg border"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div style={{ backgroundColor: 'var(--bg-tertiary)' }} className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Package className="w-5 h-5" style={{ color: 'var(--text-muted)' }} />
                  </div>
                  <div className="min-w-0">
                    <div style={{ color: 'var(--text-primary)' }} className="font-medium truncate">{addon.name}</div>
                    <div style={{ color: 'var(--text-muted)' }} className="text-sm">
                      {formatCurrency(addon.price, addon.currency)}
                      <span className="ml-1">/ {pricingTypeLabels[addon.pricing_type]?.toLowerCase()}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 ml-3">
                  <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${addonTypeColors[addon.addon_type]}`}>
                    {addon.addon_type}
                  </span>
                  <button
                    onClick={() => handleToggleAddon(addon)}
                    disabled={updating === addon.id}
                    className="p-1.5 text-accent-600 hover:bg-accent-100 rounded transition-colors disabled:opacity-50"
                    title="Add to this room"
                  >
                    {updating === addon.id ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <Plus size={16} />
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Summary */}
      <div style={{ borderColor: 'var(--border-color)' }} className="mt-6 pt-4 border-t">
        <p style={{ color: 'var(--text-muted)' }} className="text-sm">
          <strong style={{ color: 'var(--text-primary)' }}>{attachedAddons.length}</strong> add-on{attachedAddons.length !== 1 ? 's' : ''} attached to this room.
          {attachedAddons.filter(a => !a.available_for_rooms || a.available_for_rooms.length === 0).length > 0 && (
            <span className="ml-1">
              ({attachedAddons.filter(a => !a.available_for_rooms || a.available_for_rooms.length === 0).length} available for all rooms)
            </span>
          )}
        </p>
      </div>
    </div>
  )
}

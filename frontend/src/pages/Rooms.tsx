import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, Edit, Trash2, Eye, Users, BedDouble, ToggleLeft, ToggleRight } from 'lucide-react'
import Button from '../components/Button'
import ConfirmModal from '../components/ConfirmModal'
import { roomsApi, Room } from '../services/api'
import { useNotification } from '../contexts/NotificationContext'

const inventoryModeLabels = {
  single_unit: 'Single Unit',
  room_type: 'Room Type',
}

export default function Rooms() {
  const navigate = useNavigate()
  const [rooms, setRooms] = useState<Room[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeFilter, setActiveFilter] = useState<string>('all')
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<{ isOpen: boolean; roomId: string | null }>({
    isOpen: false,
    roomId: null,
  })
  const [confirmToggle, setConfirmToggle] = useState<{ isOpen: boolean; room: Room | null }>({
    isOpen: false,
    room: null,
  })
  const { showSuccess, showError } = useNotification()

  useEffect(() => {
    loadRooms()
  }, [])

  const loadRooms = async () => {
    try {
      setLoading(true)
      const data = await roomsApi.getAll()
      setRooms(data)
    } catch (error) {
      console.error('Failed to load rooms:', error)
      setRooms([])
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = () => navigate('/dashboard/rooms/new')
  const handleEdit = (room: Room) => navigate(`/dashboard/rooms/${room.id}/edit`)
  const handleDeleteClick = (id: string) => setConfirmDelete({ isOpen: true, roomId: id })

  const handleDeleteConfirm = async () => {
    if (!confirmDelete.roomId) return
    try {
      setDeletingId(confirmDelete.roomId)
      await roomsApi.delete(confirmDelete.roomId, true)
      setConfirmDelete({ isOpen: false, roomId: null })
      showSuccess('Room Deleted', 'The room has been permanently deleted.')
      await loadRooms()
    } catch (error) {
      console.error('Error deleting room:', error)
      showError('Failed to Delete', 'Could not delete the room. Please try again.')
    } finally {
      setDeletingId(null)
    }
  }

  const handleDeleteCancel = () => setConfirmDelete({ isOpen: false, roomId: null })
  const handleToggleClick = (room: Room) => setConfirmToggle({ isOpen: true, room })

  const handleToggleConfirm = async () => {
    if (!confirmToggle.room) return
    const room = confirmToggle.room
    try {
      setTogglingId(room.id!)
      setConfirmToggle({ isOpen: false, room: null })
      await roomsApi.update(room.id!, { is_active: !room.is_active })
      showSuccess(
        room.is_active ? 'Room Deactivated' : 'Room Activated',
        `${room.name} is now ${room.is_active ? 'inactive' : 'active'}.`
      )
      await loadRooms()
    } catch (error) {
      console.error('Error toggling room status:', error)
      showError('Update Failed', 'Could not update the room status.')
    } finally {
      setTogglingId(null)
    }
  }

  const handleToggleCancel = () => setConfirmToggle({ isOpen: false, room: null })

  const filteredRooms = rooms.filter((room) => {
    const matchesSearch =
      room.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      room.room_code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      room.bed_type?.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesActive =
      activeFilter === 'all' ||
      (activeFilter === 'active' && room.is_active) ||
      (activeFilter === 'inactive' && !room.is_active)
    return matchesSearch && matchesActive
  })

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-ZA', { style: 'currency', currency }).format(amount)
  }

  return (
    <div style={{ backgroundColor: 'var(--bg-card)' }} className="p-8 min-h-full transition-colors">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 style={{ color: 'var(--text-primary)' }} className="text-3xl font-bold mb-2">Rooms</h1>
          <p style={{ color: 'var(--text-muted)' }}>Manage your accommodation rooms and pricing</p>
        </div>
        <Button onClick={handleCreate}>
          <Plus size={18} className="mr-2" />
          Add Room
        </Button>
      </div>

      {/* Filters and Search */}
      <div className="mb-6 flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2" style={{ color: 'var(--text-muted)' }} size={18} />
          <input
            type="text"
            placeholder="Search rooms..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              backgroundColor: 'var(--bg-secondary)',
              borderColor: 'var(--border-color)',
              color: 'var(--text-primary)'
            }}
            className="w-full pl-10 pr-4 py-2 border rounded-md focus:outline-none focus:ring-1 focus:ring-gray-400"
          />
        </div>
        <select
          value={activeFilter}
          onChange={(e) => setActiveFilter(e.target.value)}
          style={{
            backgroundColor: 'var(--bg-secondary)',
            borderColor: 'var(--border-color)',
            color: 'var(--text-primary)'
          }}
          className="px-4 py-2 border rounded-md focus:outline-none focus:ring-1 focus:ring-gray-400"
        >
          <option value="all">All Rooms</option>
          <option value="active">Active Only</option>
          <option value="inactive">Inactive Only</option>
        </select>
      </div>

      {/* Rooms Table */}
      <div style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }} className="border rounded-lg overflow-hidden">
        <table className="w-full">
          <thead style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }} className="border-b">
            <tr>
              <th style={{ color: 'var(--text-muted)' }} className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Room</th>
              <th style={{ color: 'var(--text-muted)' }} className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Bed Type</th>
              <th style={{ color: 'var(--text-muted)' }} className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Capacity</th>
              <th style={{ color: 'var(--text-muted)' }} className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Price/Night</th>
              <th style={{ color: 'var(--text-muted)' }} className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Units</th>
              <th style={{ color: 'var(--text-muted)' }} className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Status</th>
              <th style={{ color: 'var(--text-muted)' }} className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody style={{ borderColor: 'var(--border-color)' }} className="divide-y">
            {loading ? (
              <tr>
                <td colSpan={7} style={{ color: 'var(--text-muted)' }} className="px-6 py-12 text-center">Loading rooms...</td>
              </tr>
            ) : filteredRooms.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ color: 'var(--text-muted)' }} className="px-6 py-12 text-center">No rooms found</td>
              </tr>
            ) : (
              filteredRooms.map((room) => (
                <tr key={room.id} className="hover:opacity-90 transition-opacity">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      {room.images?.featured ? (
                        <img src={room.images.featured.url} alt={room.name} className="w-12 h-12 object-cover rounded-lg" />
                      ) : (
                        <div style={{ backgroundColor: 'var(--bg-tertiary)' }} className="w-12 h-12 rounded-lg flex items-center justify-center">
                          <BedDouble style={{ color: 'var(--text-muted)' }} className="w-6 h-6" />
                        </div>
                      )}
                      <div>
                        <div style={{ color: 'var(--text-primary)' }} className="text-sm font-medium">{room.name}</div>
                        {room.room_code && <div style={{ color: 'var(--text-muted)' }} className="text-xs">{room.room_code}</div>}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div style={{ color: 'var(--text-primary)' }} className="text-sm">{room.bed_count}x {room.bed_type}</div>
                    {room.room_size_sqm && <div style={{ color: 'var(--text-muted)' }} className="text-xs">{room.room_size_sqm} m²</div>}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div style={{ color: 'var(--text-primary)' }} className="flex items-center gap-1 text-sm">
                      <Users size={14} /> {room.max_guests}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div style={{ color: 'var(--text-primary)' }} className="text-sm font-medium">
                      {formatCurrency(room.base_price_per_night, room.currency)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div style={{ color: 'var(--text-primary)' }} className="text-sm">
                      {room.inventory_mode === 'room_type' ? (
                        <span>{room.total_units} units <span style={{ color: 'var(--text-muted)' }} className="text-xs ml-1">({inventoryModeLabels[room.inventory_mode]})</span></span>
                      ) : (
                        <span style={{ color: 'var(--text-muted)' }}>{inventoryModeLabels[room.inventory_mode]}</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button
                      onClick={() => handleToggleClick(room)}
                      disabled={togglingId === room.id}
                      className={`flex items-center gap-1.5 px-2 py-1 text-xs font-medium rounded-full transition-colors ${
                        room.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      {room.is_active ? <><ToggleRight size={14} /> Active</> : <><ToggleLeft size={14} /> Inactive</>}
                    </button>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end gap-2">
                      <button style={{ color: 'var(--text-muted)' }} className="hover:opacity-70 p-1" title="View"><Eye size={16} /></button>
                      <button onClick={() => handleEdit(room)} style={{ color: 'var(--text-muted)' }} className="hover:opacity-70 p-1" title="Edit"><Edit size={16} /></button>
                      <button onClick={() => room.id && handleDeleteClick(room.id)} disabled={deletingId === room.id} className="text-red-500 hover:opacity-70 p-1 disabled:opacity-50" title="Delete"><Trash2 size={16} /></button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Summary Stats */}
      <div style={{ color: 'var(--text-muted)' }} className="mt-6 flex items-center gap-6 text-sm">
        <span>Total: <strong style={{ color: 'var(--text-primary)' }}>{rooms.length}</strong> rooms</span>
        <span>Active: <strong style={{ color: 'var(--text-primary)' }}>{rooms.filter((r) => r.is_active).length}</strong></span>
        <span>Total Units: <strong style={{ color: 'var(--text-primary)' }}>{rooms.reduce((sum, r) => sum + (r.is_active ? r.total_units : 0), 0)}</strong></span>
      </div>

      <ConfirmModal
        isOpen={confirmDelete.isOpen}
        title="Delete Room"
        message="Are you sure you want to permanently delete this room? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        onConfirm={handleDeleteConfirm}
        onCancel={handleDeleteCancel}
        isLoading={deletingId !== null}
      />

      <ConfirmModal
        isOpen={confirmToggle.isOpen}
        title={confirmToggle.room?.is_active ? 'Deactivate Room' : 'Activate Room'}
        message={confirmToggle.room?.is_active
          ? `Are you sure you want to deactivate "${confirmToggle.room?.name}"?`
          : `Are you sure you want to activate "${confirmToggle.room?.name}"?`}
        confirmText={confirmToggle.room?.is_active ? 'Deactivate' : 'Activate'}
        cancelText="Cancel"
        variant={confirmToggle.room?.is_active ? 'danger' : 'info'}
        onConfirm={handleToggleConfirm}
        onCancel={handleToggleCancel}
        isLoading={togglingId !== null}
      />
    </div>
  )
}

import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { BedDouble, Search, Filter, ExternalLink, Pause, Play, Trash2, Loader2, AlertTriangle, Plus } from 'lucide-react'
import type { TenantRoom } from '../types'
import { adminTenants } from '../../../../services/adminApi'

interface PropertiesSectionProps {
  rooms: TenantRoom[]
  onRoomUpdate?: () => void
}

const statusColors: Record<string, string> = {
  active: 'bg-green-100 text-green-700',
  inactive: 'bg-gray-100 text-gray-600',
  maintenance: 'bg-amber-100 text-amber-700',
  blocked: 'bg-red-100 text-red-700',
}

export default function PropertiesSection({ rooms, onRoomUpdate }: PropertiesSectionProps) {
  const { id: tenantId } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<TenantRoom | null>(null)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text })
    setTimeout(() => setMessage(null), 3000)
  }

  const handlePauseRoom = async (e: React.MouseEvent, room: TenantRoom) => {
    e.stopPropagation()
    if (!tenantId) return

    try {
      setActionLoading(`pause-${room.id}`)
      const newPausedState = !room.isPaused
      await adminTenants.pauseRoom(tenantId, room.id, newPausedState)
      showMessage('success', newPausedState ? 'Room paused' : 'Room unpaused')
      onRoomUpdate?.()
    } catch (err) {
      showMessage('error', err instanceof Error ? err.message : 'Failed to update room')
    } finally {
      setActionLoading(null)
    }
  }

  const handleDeleteRoom = async () => {
    if (!tenantId || !deleteConfirm) return

    try {
      setActionLoading(`delete-${deleteConfirm.id}`)
      await adminTenants.deleteRoom(tenantId, deleteConfirm.id)
      showMessage('success', 'Room deleted')
      setDeleteConfirm(null)
      onRoomUpdate?.()
    } catch (err) {
      showMessage('error', err instanceof Error ? err.message : 'Failed to delete room')
    } finally {
      setActionLoading(null)
    }
  }

  const filteredRooms = rooms.filter(room => {
    const matchesSearch = search === '' ||
      room.name.toLowerCase().includes(search.toLowerCase())

    const matchesStatus = statusFilter === 'all' || room.status === statusFilter

    return matchesSearch && matchesStatus
  })

  const uniqueStatuses = [...new Set(rooms.map(r => r.status))]

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Rooms</h2>
          <p className="text-sm text-gray-500">{rooms.length} room{rooms.length !== 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={() => navigate(`/admin/tenants/${tenantId}/rooms/new`)}
          className="flex items-center gap-2 px-3 py-2 bg-accent-600 text-white rounded-lg hover:bg-accent-700 transition-colors text-sm font-medium"
        >
          <Plus size={16} />
          Add Room
        </button>
      </div>

      {/* Message */}
      {message && (
        <div className={`px-3 py-2 rounded-lg text-sm ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
          {message.text}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search rooms..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-accent-500"
          />
        </div>
        <div className="relative">
          <Filter size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="pl-9 pr-8 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-accent-500 appearance-none bg-white"
          >
            <option value="all">All Status</option>
            {uniqueStatuses.map(status => (
              <option key={status} value={status}>{status}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Rooms Grid */}
      {filteredRooms.length === 0 ? (
        <div className="py-12 text-center bg-gray-50 rounded-lg">
          <BedDouble size={32} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500">
            {rooms.length === 0 ? 'No rooms' : 'No rooms match your search'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filteredRooms.map((room) => (
            <div
              key={room.id}
              onClick={() => navigate(`/admin/tenants/${tenantId}/rooms/${room.id}/edit`)}
              className={`flex items-center gap-3 p-4 rounded-lg transition-colors cursor-pointer group ${
                room.isPaused ? 'bg-orange-50 hover:bg-orange-100' : 'bg-gray-50 hover:bg-gray-100'
              }`}
            >
              {/* Icon */}
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                room.isPaused ? 'bg-orange-100' : 'bg-purple-100'
              }`}>
                <BedDouble size={18} className={room.isPaused ? 'text-orange-600' : 'text-purple-600'} />
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate group-hover:text-accent-600 transition-colors">
                  {room.name}
                </p>
                <p className="text-xs text-gray-500">
                  {room.roomCode || `ID: ${room.id.slice(0, 8)}...`}
                </p>
              </div>

              {/* Status badges */}
              <div className="flex items-center gap-1.5 shrink-0">
                {room.isPaused && (
                  <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-orange-100 text-orange-700">
                    Paused
                  </span>
                )}
                <span className={`px-2 py-0.5 text-xs font-medium rounded-full capitalize ${statusColors[room.status] || 'bg-gray-100 text-gray-600'}`}>
                  {room.status}
                </span>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={(e) => handlePauseRoom(e, room)}
                  disabled={actionLoading === `pause-${room.id}`}
                  className={`p-1.5 rounded-lg transition-colors ${
                    room.isPaused
                      ? 'bg-green-100 text-green-600 hover:bg-green-200'
                      : 'bg-orange-100 text-orange-600 hover:bg-orange-200'
                  }`}
                  title={room.isPaused ? 'Unpause room' : 'Pause room'}
                >
                  {actionLoading === `pause-${room.id}` ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : room.isPaused ? (
                    <Play size={14} />
                  ) : (
                    <Pause size={14} />
                  )}
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); setDeleteConfirm(room) }}
                  className="p-1.5 rounded-lg bg-red-100 text-red-600 hover:bg-red-200 transition-colors"
                  title="Delete room"
                >
                  <Trash2 size={14} />
                </button>
              </div>

              {/* Edit indicator */}
              <ExternalLink size={16} className="text-gray-400 group-hover:text-accent-500 transition-colors shrink-0" />
            </div>
          ))}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-sm w-full shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                <AlertTriangle size={20} className="text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Delete Room</h3>
                <p className="text-sm text-gray-500">This action cannot be undone</p>
              </div>
            </div>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete <strong>{deleteConfirm.name}</strong>? The room will be hidden from all listings.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 text-gray-500 hover:text-gray-900"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteRoom}
                disabled={actionLoading === `delete-${deleteConfirm.id}`}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center gap-2"
              >
                {actionLoading === `delete-${deleteConfirm.id}` && <Loader2 size={16} className="animate-spin" />}
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

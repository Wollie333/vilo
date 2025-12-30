import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import Button from './Button'
import { roomsApi, Room } from '../services/api'

interface Booking {
  id?: string
  guest_name: string
  guest_email?: string
  guest_phone?: string
  room_id: string
  room_name?: string
  check_in: string
  check_out: string
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed'
  payment_status: 'pending' | 'paid' | 'partial' | 'refunded'
  total_amount: number
  currency: string
  notes?: string
}

interface BookingFormProps {
  booking?: Booking | null
  isOpen: boolean
  onClose: () => void
  onSubmit: (booking: Booking) => void
  isSubmitting?: boolean
}

export default function BookingForm({ booking, isOpen, onClose, onSubmit, isSubmitting = false }: BookingFormProps) {
  const [rooms, setRooms] = useState<Room[]>([])
  const [loadingRooms, setLoadingRooms] = useState(false)
  const [formData, setFormData] = useState<Booking>({
    guest_name: '',
    guest_email: undefined,
    guest_phone: undefined,
    room_id: '',
    room_name: undefined,
    check_in: '',
    check_out: '',
    status: 'pending',
    payment_status: 'pending',
    total_amount: 0,
    currency: 'ZAR',
    notes: undefined
  })

  // Load rooms when form opens
  useEffect(() => {
    if (isOpen) {
      loadRooms()
    }
  }, [isOpen])

  const loadRooms = async () => {
    try {
      setLoadingRooms(true)
      const data = await roomsApi.getAll({ is_active: true })
      setRooms(data)
    } catch (error) {
      console.error('Failed to load rooms:', error)
      setRooms([])
    } finally {
      setLoadingRooms(false)
    }
  }

  useEffect(() => {
    if (booking) {
      setFormData(booking)
    } else {
      setFormData({
        guest_name: '',
        guest_email: undefined,
        guest_phone: undefined,
        room_id: '',
        room_name: undefined,
        check_in: '',
        check_out: '',
        status: 'pending',
        payment_status: 'pending',
        total_amount: 0,
        currency: 'ZAR',
        notes: undefined
      })
    }
  }, [booking, isOpen])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(formData)
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: name === 'total_amount' ? parseFloat(value) || 0 : value
    }))
  }

  const handleRoomSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const roomId = e.target.value
    const selectedRoom = rooms.find(r => r.id === roomId)

    if (selectedRoom) {
      setFormData(prev => ({
        ...prev,
        room_id: selectedRoom.id!,
        room_name: selectedRoom.name,
        currency: selectedRoom.currency,
        // Auto-calculate price if dates are set
        total_amount: prev.check_in && prev.check_out
          ? calculateTotalPrice(selectedRoom, prev.check_in, prev.check_out)
          : selectedRoom.base_price_per_night
      }))
    } else {
      setFormData(prev => ({
        ...prev,
        room_id: '',
        room_name: undefined
      }))
    }
  }

  const calculateTotalPrice = (room: Room, checkIn: string, checkOut: string): number => {
    const start = new Date(checkIn)
    const end = new Date(checkOut)
    const nights = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
    return nights > 0 ? room.base_price_per_night * nights : room.base_price_per_night
  }

  // Recalculate price when dates change
  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    const selectedRoom = rooms.find(r => r.id === formData.room_id)

    const newCheckIn = name === 'check_in' ? value : formData.check_in
    const newCheckOut = name === 'check_out' ? value : formData.check_out

    setFormData(prev => ({
      ...prev,
      [name]: value,
      total_amount: selectedRoom && newCheckIn && newCheckOut
        ? calculateTotalPrice(selectedRoom, newCheckIn, newCheckOut)
        : prev.total_amount
    }))
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">
            {booking ? 'Edit Booking' : 'Create New Booking'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Guest Information */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Guest Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Guest Name *
                </label>
                <input
                  type="text"
                  name="guest_name"
                  value={formData.guest_name}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Guest Email
                </label>
                <input
                  type="email"
                  name="guest_email"
                  value={formData.guest_email || ''}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Guest Phone
                </label>
                <input
                  type="tel"
                  name="guest_phone"
                  value={formData.guest_phone || ''}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
                />
              </div>
            </div>
          </div>

          {/* Room Information */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Room Information</h3>
            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Room *
                </label>
                <select
                  name="room_id"
                  value={formData.room_id}
                  onChange={handleRoomSelect}
                  required
                  disabled={loadingRooms}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400 disabled:bg-gray-100"
                >
                  <option value="">
                    {loadingRooms ? 'Loading rooms...' : 'Select a room'}
                  </option>
                  {rooms.map((room) => (
                    <option key={room.id} value={room.id}>
                      {room.name} - {room.bed_count}x {room.bed_type} ({room.max_guests} guests) - {new Intl.NumberFormat('en-ZA', { style: 'currency', currency: room.currency }).format(room.base_price_per_night)}/night
                    </option>
                  ))}
                </select>
                {formData.room_id && (
                  <p className="text-xs text-gray-500 mt-1">
                    Selected: {formData.room_name}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Dates */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Dates</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Check-in Date *
                </label>
                <input
                  type="date"
                  name="check_in"
                  value={formData.check_in}
                  onChange={handleDateChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Check-out Date *
                </label>
                <input
                  type="date"
                  name="check_out"
                  value={formData.check_out}
                  onChange={handleDateChange}
                  required
                  min={formData.check_in}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
                />
              </div>
            </div>
            {formData.check_in && formData.check_out && (
              <p className="text-sm text-gray-600 mt-2">
                {(() => {
                  const start = new Date(formData.check_in)
                  const end = new Date(formData.check_out)
                  const nights = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
                  return nights > 0 ? `${nights} night${nights > 1 ? 's' : ''}` : ''
                })()}
              </p>
            )}
          </div>

          {/* Payment & Status */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Payment & Status</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Total Amount *
                </label>
                <input
                  type="number"
                  name="total_amount"
                  value={formData.total_amount}
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
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Booking Status
                </label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
                >
                  <option value="pending">Pending</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Payment Status
                </label>
                <select
                  name="payment_status"
                  value={formData.payment_status}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
                >
                  <option value="pending">Pending</option>
                  <option value="paid">Paid</option>
                  <option value="partial">Partial</option>
                  <option value="refunded">Refunded</option>
                </select>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notes
            </label>
            <textarea
              name="notes"
              value={formData.notes || ''}
              onChange={handleChange}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
              placeholder="Additional notes about this booking..."
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : booking ? 'Update Booking' : 'Create Booking'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}


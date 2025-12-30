import { useState, useEffect } from 'react'
import { X, Loader2, Calendar, User, Mail, BedDouble } from 'lucide-react'
import { format, addDays } from 'date-fns'
import type { Booking, Room } from '../../../services/api'

interface QuickBookingModalProps {
  isOpen: boolean
  onClose: () => void
  rooms: Room[]
  initialRoomId?: string
  initialDate?: string
  onSubmit: (booking: Omit<Booking, 'id'>) => Promise<void>
  isSubmitting: boolean
}

export default function QuickBookingModal({
  isOpen,
  onClose,
  rooms,
  initialRoomId,
  initialDate,
  onSubmit,
  isSubmitting,
}: QuickBookingModalProps) {
  const [formData, setFormData] = useState({
    guest_name: '',
    guest_email: '',
    guest_phone: '',
    room_id: initialRoomId || '',
    check_in: initialDate || format(new Date(), 'yyyy-MM-dd'),
    check_out: initialDate ? format(addDays(new Date(initialDate), 1), 'yyyy-MM-dd') : format(addDays(new Date(), 1), 'yyyy-MM-dd'),
  })

  // Reset form when modal opens with new initial values
  useEffect(() => {
    if (isOpen) {
      setFormData({
        guest_name: '',
        guest_email: '',
        guest_phone: '',
        room_id: initialRoomId || rooms[0]?.id || '',
        check_in: initialDate || format(new Date(), 'yyyy-MM-dd'),
        check_out: initialDate ? format(addDays(new Date(initialDate), 1), 'yyyy-MM-dd') : format(addDays(new Date(), 1), 'yyyy-MM-dd'),
      })
    }
  }, [isOpen, initialRoomId, initialDate, rooms])

  const selectedRoom = rooms.find((r) => r.id === formData.room_id)

  // Calculate nights
  const checkIn = new Date(formData.check_in)
  const checkOut = new Date(formData.check_out)
  const nights = Math.max(0, Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24)))

  // Calculate estimated total
  const estimatedTotal = selectedRoom ? selectedRoom.base_price_per_night * nights : 0

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.guest_name.trim()) return
    if (!formData.room_id) return
    if (nights <= 0) return

    await onSubmit({
      guest_name: formData.guest_name.trim(),
      guest_email: formData.guest_email.trim() || undefined,
      guest_phone: formData.guest_phone.trim() || undefined,
      room_id: formData.room_id,
      room_name: selectedRoom?.name,
      check_in: formData.check_in,
      check_out: formData.check_out,
      status: 'pending',
      payment_status: 'pending',
      total_amount: estimatedTotal,
      currency: selectedRoom?.currency || 'ZAR',
    })
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Quick Booking
          </h2>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Guest Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Guest Name *
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={formData.guest_name}
                onChange={(e) => setFormData({ ...formData, guest_name: e.target.value })}
                placeholder="Enter guest name"
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>
          </div>

          {/* Guest Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Email
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="email"
                value={formData.guest_email}
                onChange={(e) => setFormData({ ...formData, guest_email: e.target.value })}
                placeholder="guest@example.com"
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Room Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Room *
            </label>
            <div className="relative">
              <BedDouble className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <select
                value={formData.room_id}
                onChange={(e) => setFormData({ ...formData, room_id: e.target.value })}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none"
                required
              >
                <option value="">Select a room</option>
                {rooms.map((room) => (
                  <option key={room.id} value={room.id}>
                    {room.name} - {new Intl.NumberFormat('en-ZA', {
                      style: 'currency',
                      currency: room.currency || 'ZAR',
                    }).format(room.base_price_per_night)}/night
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Check-in *
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="date"
                  value={formData.check_in}
                  onChange={(e) => {
                    const newCheckIn = e.target.value
                    const newCheckOut = formData.check_out <= newCheckIn
                      ? format(addDays(new Date(newCheckIn), 1), 'yyyy-MM-dd')
                      : formData.check_out
                    setFormData({
                      ...formData,
                      check_in: newCheckIn,
                      check_out: newCheckOut,
                    })
                  }}
                  min={format(new Date(), 'yyyy-MM-dd')}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Check-out *
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="date"
                  value={formData.check_out}
                  onChange={(e) => setFormData({ ...formData, check_out: e.target.value })}
                  min={format(addDays(new Date(formData.check_in), 1), 'yyyy-MM-dd')}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
            </div>
          </div>

          {/* Summary */}
          {selectedRoom && nights > 0 && (
            <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">
                  {nights} {nights === 1 ? 'night' : 'nights'} x {new Intl.NumberFormat('en-ZA', {
                    style: 'currency',
                    currency: selectedRoom.currency || 'ZAR',
                  }).format(selectedRoom.base_price_per_night)}
                </span>
              </div>
              <div className="flex justify-between pt-2 border-t border-gray-200 dark:border-gray-700">
                <span className="font-medium text-gray-900 dark:text-white">
                  Estimated Total
                </span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {new Intl.NumberFormat('en-ZA', {
                    style: 'currency',
                    currency: selectedRoom.currency || 'ZAR',
                  }).format(estimatedTotal)}
                </span>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !formData.guest_name || !formData.room_id || nights <= 0}
              className="flex-1 px-4 py-2 bg-black dark:bg-white text-white dark:text-black rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Booking'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

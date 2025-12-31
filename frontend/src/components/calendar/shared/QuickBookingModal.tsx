import { useState, useEffect } from 'react'
import { X, Loader2, User, Mail, BedDouble } from 'lucide-react'
import TermsAcceptance from '../../../components/TermsAcceptance'
import GuestSelector, { GuestData, createDefaultGuestData } from '../../../components/GuestSelector'
import DateRangePicker from '../../../components/DateRangePicker'
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
  const [guestData, setGuestData] = useState<GuestData>(createDefaultGuestData())
  const [termsAccepted, setTermsAccepted] = useState(false)

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
      setGuestData(createDefaultGuestData())
      setTermsAccepted(false)
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

    // Build notes JSON with guest data
    const notesData = {
      guests: guestData.adults + guestData.children,
      adults: guestData.adults,
      children: guestData.children,
      children_ages: guestData.childrenAges
    }

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
      notes: JSON.stringify(notesData),
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
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-accent-600 to-accent-500 px-6 py-5 flex items-center justify-between rounded-t-lg z-10">
          <h2 className="text-lg font-semibold text-white">
            Quick Booking
          </h2>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Guest Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Guest Name *
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={formData.guest_name}
                onChange={(e) => setFormData({ ...formData, guest_name: e.target.value })}
                placeholder="Enter guest name"
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>
          </div>

          {/* Guest Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="email"
                value={formData.guest_email}
                onChange={(e) => setFormData({ ...formData, guest_email: e.target.value })}
                placeholder="guest@example.com"
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Number of Guests */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Guests
            </label>
            <GuestSelector
              value={guestData}
              onChange={setGuestData}
              mode="compact"
              showLabels={false}
              size="md"
            />
          </div>

          {/* Room Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Room *
            </label>
            <div className="relative">
              <BedDouble className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <select
                value={formData.room_id}
                onChange={(e) => setFormData({ ...formData, room_id: e.target.value })}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none"
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
          <DateRangePicker
            startDate={formData.check_in}
            endDate={formData.check_out}
            onStartDateChange={(date) => {
              const newCheckOut = formData.check_out <= date
                ? format(addDays(new Date(date), 1), 'yyyy-MM-dd')
                : formData.check_out
              setFormData({
                ...formData,
                check_in: date,
                check_out: newCheckOut,
              })
            }}
            onEndDateChange={(date) => setFormData({ ...formData, check_out: date })}
            minDate={format(new Date(), 'yyyy-MM-dd')}
            startLabel="Check-in"
            endLabel="Check-out"
            compact
          />

          {/* Summary */}
          {selectedRoom && nights > 0 && (
            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">
                  {nights} {nights === 1 ? 'night' : 'nights'} x {new Intl.NumberFormat('en-ZA', {
                    style: 'currency',
                    currency: selectedRoom.currency || 'ZAR',
                  }).format(selectedRoom.base_price_per_night)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">
                  {guestData.adults} {guestData.adults === 1 ? 'adult' : 'adults'}
                  {guestData.children > 0 && `, ${guestData.children} ${guestData.children === 1 ? 'child' : 'children'}`}
                </span>
              </div>
              <div className="flex justify-between pt-2 border-t border-gray-200">
                <span className="font-medium text-gray-900">
                  Estimated Total
                </span>
                <span className="font-medium text-gray-900">
                  {new Intl.NumberFormat('en-ZA', {
                    style: 'currency',
                    currency: selectedRoom.currency || 'ZAR',
                  }).format(estimatedTotal)}
                </span>
              </div>
            </div>
          )}

          {/* Terms Acceptance */}
          <TermsAcceptance
            accepted={termsAccepted}
            onChange={setTermsAccepted}
            size="sm"
          />

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !formData.guest_name || !formData.room_id || nights <= 0 || !termsAccepted}
              className="flex-1 px-4 py-2.5 bg-accent-500 hover:bg-accent-600 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2 font-medium"
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

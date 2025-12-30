import { format } from 'date-fns'
import { X, Plus, Eye, Calendar, User, BedDouble } from 'lucide-react'
import type { Booking, Room } from '../../../services/api'
import { statusColors, getBookingNights } from '../../../utils/calendarUtils'

interface DayModalProps {
  isOpen: boolean
  onClose: () => void
  date: Date | null
  bookings: Booking[]
  rooms: Room[]
  onBookingClick: (booking: Booking) => void
  onCreateClick: () => void
}

export default function DayModal({
  isOpen,
  onClose,
  date,
  bookings,
  rooms,
  onBookingClick,
  onCreateClick,
}: DayModalProps) {
  if (!isOpen || !date) return null

  // Get room name for a booking
  const getRoomName = (booking: Booking) => {
    const room = rooms.find((r) => r.id === booking.room_id)
    return room?.name || booking.room_name || 'Unknown Room'
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md mx-4 max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              {format(date, 'EEEE, MMMM d, yyyy')}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {bookings.length} {bookings.length === 1 ? 'booking' : 'bookings'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[50vh]">
          {bookings.length > 0 ? (
            <div className="space-y-3">
              {bookings.map((booking) => {
                const colors = statusColors[booking.status]
                const nights = getBookingNights(booking)

                return (
                  <div
                    key={booking.id}
                    onClick={() => onBookingClick(booking)}
                    className={`
                      p-4 rounded-lg border-l-4 cursor-pointer
                      ${colors.bg} ${colors.border}
                      hover:shadow-md transition-shadow
                    `}
                  >
                    {/* Guest name and status */}
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                        <span className={`font-medium ${colors.text}`}>
                          {booking.guest_name}
                        </span>
                      </div>
                      <span className={`
                        text-xs px-2 py-1 rounded-full capitalize
                        ${colors.bg} ${colors.text} border ${colors.border}
                      `}>
                        {booking.status.replace('_', ' ')}
                      </span>
                    </div>

                    {/* Room */}
                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mb-1">
                      <BedDouble className="w-4 h-4" />
                      {getRoomName(booking)}
                    </div>

                    {/* Dates */}
                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                      <Calendar className="w-4 h-4" />
                      {format(new Date(booking.check_in), 'MMM d')} - {format(new Date(booking.check_out), 'MMM d')}
                      <span className="text-gray-400">
                        ({nights} {nights === 1 ? 'night' : 'nights'})
                      </span>
                    </div>

                    {/* Total */}
                    <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-600 flex items-center justify-between">
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        Total
                      </span>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {new Intl.NumberFormat('en-ZA', {
                          style: 'currency',
                          currency: booking.currency || 'ZAR',
                        }).format(booking.total_amount)}
                      </span>
                    </div>

                    {/* View details link */}
                    <div className="mt-2 flex items-center justify-end text-sm text-blue-600 dark:text-blue-400">
                      <Eye className="w-4 h-4 mr-1" />
                      View Details
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="text-center py-8">
              <Calendar className="w-12 h-12 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-500 dark:text-gray-400">
                No bookings for this day
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
          <button
            onClick={onCreateClick}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-black dark:bg-white text-white dark:text-black rounded-lg hover:opacity-90 transition-opacity"
          >
            <Plus className="w-4 h-4" />
            Create Booking
          </button>
        </div>
      </div>
    </div>
  )
}

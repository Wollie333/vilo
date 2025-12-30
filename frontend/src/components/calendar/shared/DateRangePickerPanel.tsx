import { useMemo } from 'react'
import { format, parseISO, differenceInDays, eachDayOfInterval } from 'date-fns'
import { Calendar, Eye, Plus, BedDouble, Users } from 'lucide-react'
import type { Booking, Room } from '../../../services/api'
import { getBookingsForDate, statusColors } from '../../../utils/calendarUtils'

interface DateRangePickerPanelProps {
  startDate: string
  endDate: string
  onStartDateChange: (date: string) => void
  onEndDateChange: (date: string) => void
  onGoToRange: () => void
  onCreateBooking: () => void
  bookings: Booking[]
  rooms: Room[]
}

export default function DateRangePickerPanel({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  onGoToRange,
  onCreateBooking,
  bookings,
  rooms,
}: DateRangePickerPanelProps) {
  // Calculate nights
  const nights = useMemo(() => {
    const start = parseISO(startDate)
    const end = parseISO(endDate)
    return Math.max(0, differenceInDays(end, start))
  }, [startDate, endDate])

  // Get bookings within the selected date range
  const bookingsInRange = useMemo(() => {
    if (nights <= 0) return []

    const start = parseISO(startDate)
    const end = parseISO(endDate)
    const daysInRange = eachDayOfInterval({ start, end })

    const uniqueBookings = new Map<string, Booking>()

    daysInRange.forEach(day => {
      const dayBookings = getBookingsForDate(bookings, day)
      dayBookings.forEach(booking => {
        if (!uniqueBookings.has(booking.id!)) {
          uniqueBookings.set(booking.id!, booking)
        }
      })
    })

    return Array.from(uniqueBookings.values())
  }, [startDate, endDate, nights, bookings])

  // Group bookings by room
  const bookingsByRoom = useMemo(() => {
    const map = new Map<string, Booking[]>()
    bookingsInRange.forEach(booking => {
      const roomBookings = map.get(booking.room_id) || []
      roomBookings.push(booking)
      map.set(booking.room_id, roomBookings)
    })
    return map
  }, [bookingsInRange])

  // Check room availability
  const roomAvailability = useMemo(() => {
    return rooms.map(room => {
      const roomBookings = bookingsByRoom.get(room.id!) || []
      const activeBookings = roomBookings.filter(b => b.status !== 'cancelled')
      return {
        room,
        bookings: roomBookings,
        isAvailable: activeBookings.length === 0,
        bookedCount: activeBookings.length,
      }
    })
  }, [rooms, bookingsByRoom])

  const availableRooms = roomAvailability.filter(r => r.isAvailable).length
  const occupiedRooms = roomAvailability.filter(r => !r.isAvailable).length

  // Get room name helper
  const getRoomName = (roomId: string) => {
    const room = rooms.find(r => r.id === roomId)
    return room?.name || 'Unknown Room'
  }

  return (
    <div className="flex-shrink-0 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 mb-4">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Date Selection */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Select Date Range
          </h3>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                Start Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  onStartDateChange(e.target.value)
                  // Auto-adjust end date if needed
                  if (e.target.value >= endDate) {
                    const newEnd = new Date(e.target.value)
                    newEnd.setDate(newEnd.getDate() + 1)
                    onEndDateChange(format(newEnd, 'yyyy-MM-dd'))
                  }
                }}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                End Date
              </label>
              <input
                type="date"
                value={endDate}
                min={startDate}
                onChange={(e) => onEndDateChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {nights > 0 && (
            <div className="text-sm text-gray-600 dark:text-gray-400">
              {nights} {nights === 1 ? 'night' : 'nights'} selected
            </div>
          )}

          <div className="flex gap-2">
            <button
              onClick={onGoToRange}
              className="flex-1 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors flex items-center justify-center gap-2 text-sm"
            >
              <Eye className="w-4 h-4" />
              View in Calendar
            </button>
            <button
              onClick={onCreateBooking}
              disabled={nights <= 0}
              className="flex-1 px-4 py-2 bg-black dark:bg-white text-white dark:text-black rounded-lg hover:opacity-90 transition-opacity flex items-center justify-center gap-2 text-sm disabled:opacity-50"
            >
              <Plus className="w-4 h-4" />
              Create Booking
            </button>
          </div>
        </div>

        {/* Availability Summary */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
            <BedDouble className="w-4 h-4" />
            Room Availability
          </h3>

          {nights > 0 ? (
            <div className="space-y-3">
              {/* Summary stats */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {availableRooms}
                  </div>
                  <div className="text-xs text-green-600 dark:text-green-400">
                    Available
                  </div>
                </div>
                <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                    {occupiedRooms}
                  </div>
                  <div className="text-xs text-red-600 dark:text-red-400">
                    Occupied
                  </div>
                </div>
              </div>

              {/* Room list */}
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {roomAvailability.map(({ room, isAvailable, bookedCount }) => (
                  <div
                    key={room.id}
                    className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm ${
                      isAvailable
                        ? 'bg-green-50 dark:bg-green-900/10 text-green-700 dark:text-green-400'
                        : 'bg-red-50 dark:bg-red-900/10 text-red-700 dark:text-red-400'
                    }`}
                  >
                    <span className="font-medium">{room.name}</span>
                    <span className="text-xs">
                      {isAvailable ? 'Available' : `${bookedCount} booking${bookedCount > 1 ? 's' : ''}`}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
              Select a date range to see availability
            </div>
          )}
        </div>

        {/* Bookings in Range */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
            <Users className="w-4 h-4" />
            Bookings in Range ({bookingsInRange.length})
          </h3>

          {bookingsInRange.length > 0 ? (
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {bookingsInRange.map(booking => {
                const colors = statusColors[booking.status]
                return (
                  <div
                    key={booking.id}
                    className={`px-3 py-2 rounded-lg border-l-4 ${colors.bg} ${colors.border}`}
                  >
                    <div className={`font-medium text-sm ${colors.text}`}>
                      {booking.guest_name}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {getRoomName(booking.room_id)} • {format(parseISO(booking.check_in), 'MMM d')} - {format(parseISO(booking.check_out), 'MMM d')}
                    </div>
                  </div>
                )
              })}
            </div>
          ) : nights > 0 ? (
            <div className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
              No bookings in this date range
            </div>
          ) : (
            <div className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
              Select a date range to see bookings
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

import { useDroppable } from '@dnd-kit/core'
import { isToday, differenceInDays, startOfDay } from 'date-fns'
import type { Booking, Room } from '../../../services/api'
import { calculateBookingPosition, getBookingsForRoomOnDate } from '../../../utils/calendarUtils'
import BookingBlock from './BookingBlock'

// Default turnover hours for cleaning between guests
const DEFAULT_TURNOVER_HOURS = 4

interface RoomRowProps {
  room: Room
  bookings: Booking[]
  days: Date[]
  dayWidth: number
  roomLabelWidth: number
  startDate: Date
  daysCount: number
  onBookingClick: (booking: Booking) => void
  onCellClick: (dayIndex: number) => void
  onBookingResize: (booking: Booking, direction: 'start' | 'end', daysDelta: number) => Promise<boolean>
  isUpdating: boolean
  onStatusChange?: (bookingId: string, status: Booking['status']) => Promise<void>
  onDelete?: (bookingId: string) => Promise<void>
}

const ROW_HEIGHT = 60

export default function RoomRow({
  room,
  bookings,
  days,
  dayWidth,
  roomLabelWidth,
  startDate,
  daysCount,
  onBookingClick,
  onCellClick,
  onBookingResize,
  isUpdating,
  onStatusChange,
  onDelete,
}: RoomRowProps) {
  // Make the entire row droppable
  const { setNodeRef, isOver } = useDroppable({
    id: room.id!,
    data: { room },
  })

  return (
    <div
      ref={setNodeRef}
      className={`flex border-b border-gray-200 relative ${
        isOver ? 'bg-blue-50' : ''
      }`}
      style={{ height: ROW_HEIGHT }}
    >
      {/* Room label */}
      <div
        className="flex-shrink-0 px-4 py-2 border-r border-gray-200 bg-gray-50 flex items-center"
        style={{ width: roomLabelWidth }}
      >
        <div className="truncate">
          <span className="font-medium text-gray-900 text-sm">
            {room.name}
          </span>
          {room.total_units > 1 && (
            <span className="text-xs text-gray-500 ml-1">
              ({room.total_units} units)
            </span>
          )}
        </div>
      </div>

      {/* Day cells (background grid) */}
      <div className="flex relative" style={{ width: days.length * dayWidth }}>
        {days.map((day, index) => {
          const hasBooking = getBookingsForRoomOnDate(bookings, room.id!, day).length > 0

          return (
            <div
              key={index}
              onClick={() => !hasBooking && onCellClick(index)}
              className={`flex-shrink-0 border-r border-gray-200 ${
                isToday(day)
                  ? 'bg-blue-50'
                  : index % 7 === 0 || index % 7 === 6
                  ? 'bg-gray-50'
                  : ''
              } ${
                !hasBooking ? 'cursor-pointer hover:bg-gray-100' : ''
              }`}
              style={{ width: dayWidth, height: '100%' }}
            />
          )
        })}

        {/* Turnover/Buffer zones */}
        {bookings
          .filter(b => b.status !== 'cancelled')
          .map(booking => {
            const checkOut = new Date(booking.check_out)

            // Calculate position for turnover zone
            const checkOutDayOffset = differenceInDays(startOfDay(checkOut), startOfDay(startDate))

            // Only show if checkout is within visible range
            if (checkOutDayOffset < 0 || checkOutDayOffset >= daysCount) return null

            // Calculate width based on turnover hours (fraction of a day)
            const turnoverWidth = (DEFAULT_TURNOVER_HOURS / 24) * dayWidth
            const left = checkOutDayOffset * dayWidth

            return (
              <div
                key={`turnover-${booking.id}`}
                className="absolute top-2 bottom-2 pointer-events-none"
                style={{
                  left,
                  width: Math.min(turnoverWidth, (daysCount - checkOutDayOffset) * dayWidth),
                }}
                title={`Turnover time: ${DEFAULT_TURNOVER_HOURS} hours after checkout`}
              >
                <div className="h-full bg-gradient-to-r from-orange-100/70 to-transparent border-l-2 border-orange-300 border-dashed rounded-r" />
              </div>
            )
          })}

        {/* Booking blocks */}
        {bookings.map(booking => {
          const position = calculateBookingPosition(booking, startDate, daysCount, dayWidth)

          // Skip if booking is completely outside visible range
          if (position.width <= 0) return null

          return (
            <BookingBlock
              key={booking.id}
              booking={booking}
              position={position}
              dayWidth={dayWidth}
              onClick={() => onBookingClick(booking)}
              onResize={onBookingResize}
              isUpdating={isUpdating}
              roomName={room.name}
              onStatusChange={onStatusChange}
              onDelete={onDelete}
            />
          )
        })}
      </div>
    </div>
  )
}

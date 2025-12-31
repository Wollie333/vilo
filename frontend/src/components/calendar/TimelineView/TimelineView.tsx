import { useState, useCallback, useMemo } from 'react'
import {
  DndContext,
  DragOverlay,
  useSensor,
  useSensors,
  PointerSensor,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core'
import { format, addDays, isToday } from 'date-fns'
import type { Booking, Room } from '../../../services/api'
import { getTimelineDays, calculateBookingPosition, isBookingVisible } from '../../../utils/calendarUtils'
import RoomRow from './RoomRow'
import BookingBlock from './BookingBlock'

interface TimelineViewProps {
  rooms: Room[]
  bookings: Booking[]
  startDate: Date
  daysCount: number
  onBookingClick: (booking: Booking) => void
  onEmptyCellClick: (roomId: string, date: string) => void
  onBookingDrag: (booking: Booking, newCheckIn: string, newCheckOut: string, newRoomId?: string) => Promise<boolean>
  onBookingResize: (booking: Booking, direction: 'start' | 'end', daysDelta: number) => Promise<boolean>
  isUpdating: boolean
}

const DAY_WIDTH = 80 // pixels per day
const ROOM_LABEL_WIDTH = 180 // pixels for room name column

export default function TimelineView({
  rooms,
  bookings,
  startDate,
  daysCount,
  onBookingClick,
  onEmptyCellClick,
  onBookingDrag,
  onBookingResize,
  isUpdating,
}: TimelineViewProps) {
  const [activeBooking, setActiveBooking] = useState<Booking | null>(null)

  // Generate timeline days
  const days = useMemo(() => getTimelineDays(startDate, daysCount), [startDate, daysCount])

  // Group bookings by room
  const bookingsByRoom = useMemo(() => {
    const map = new Map<string, Booking[]>()
    rooms.forEach(room => {
      if (room.id) {
        const roomBookings = bookings.filter(
          b => b.room_id === room.id && isBookingVisible(b, startDate, daysCount)
        )
        map.set(room.id, roomBookings)
      }
    })
    return map
  }, [rooms, bookings, startDate, daysCount])

  // Setup drag sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5, // 5px movement required before drag starts
      },
    })
  )

  // Handle drag start
  const handleDragStart = useCallback((event: DragStartEvent) => {
    const bookingId = event.active.id as string
    const booking = bookings.find(b => b.id === bookingId)
    if (booking) {
      setActiveBooking(booking)
    }
  }, [bookings])

  // Handle drag end
  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over, delta } = event
    setActiveBooking(null)

    if (!over || !active.data.current?.booking) return

    const booking = active.data.current.booking as Booking

    // Calculate day delta from drag distance
    const daysDelta = Math.round(delta.x / DAY_WIDTH)

    if (daysDelta === 0) {
      // Check if dropped on a different room
      const targetRoomId = over.id as string
      if (targetRoomId !== booking.room_id && rooms.some(r => r.id === targetRoomId)) {
        // Move to different room, same dates
        await onBookingDrag(booking, booking.check_in, booking.check_out, targetRoomId)
      }
      return
    }

    // Calculate new dates
    const checkIn = new Date(booking.check_in)
    const checkOut = new Date(booking.check_out)
    const newCheckIn = addDays(checkIn, daysDelta)
    const newCheckOut = addDays(checkOut, daysDelta)

    // Check if we're dropping on a different room
    const targetRoomId = over.id as string
    const newRoomId = targetRoomId !== booking.room_id && rooms.some(r => r.id === targetRoomId)
      ? targetRoomId
      : undefined

    await onBookingDrag(
      booking,
      format(newCheckIn, 'yyyy-MM-dd'),
      format(newCheckOut, 'yyyy-MM-dd'),
      newRoomId
    )
  }, [rooms, onBookingDrag])

  // Handle empty cell click
  const handleCellClick = useCallback((roomId: string, dayIndex: number) => {
    const date = days[dayIndex]
    onEmptyCellClick(roomId, format(date, 'yyyy-MM-dd'))
  }, [days, onEmptyCellClick])

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="h-full overflow-auto">
        <div
          className="min-w-max"
          style={{ minWidth: ROOM_LABEL_WIDTH + daysCount * DAY_WIDTH }}
        >
          {/* Header row with day labels */}
          <div className="flex border-b border-gray-200 sticky top-0 bg-white z-10">
            {/* Room label header */}
            <div
              className="flex-shrink-0 px-4 py-3 font-medium text-gray-700 border-r border-gray-200"
              style={{ width: ROOM_LABEL_WIDTH }}
            >
              Rooms
            </div>

            {/* Day headers */}
            <div className="flex">
              {days.map((day, index) => (
                <div
                  key={index}
                  className={`flex-shrink-0 px-2 py-2 text-center border-r border-gray-200 ${
                    isToday(day)
                      ? 'bg-blue-50'
                      : ''
                  }`}
                  style={{ width: DAY_WIDTH }}
                >
                  <div className="text-xs text-gray-500">
                    {format(day, 'EEE')}
                  </div>
                  <div className={`text-sm font-medium ${
                    isToday(day)
                      ? 'text-blue-600'
                      : 'text-gray-900'
                  }`}>
                    {format(day, 'd')}
                  </div>
                  <div className="text-xs text-gray-500">
                    {format(day, 'MMM')}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Room rows */}
          {rooms.map(room => (
            <RoomRow
              key={room.id}
              room={room}
              bookings={bookingsByRoom.get(room.id!) || []}
              days={days}
              dayWidth={DAY_WIDTH}
              roomLabelWidth={ROOM_LABEL_WIDTH}
              startDate={startDate}
              daysCount={daysCount}
              onBookingClick={onBookingClick}
              onCellClick={(dayIndex) => handleCellClick(room.id!, dayIndex)}
              onBookingResize={onBookingResize}
              isUpdating={isUpdating}
            />
          ))}

          {/* Empty state */}
          {rooms.length === 0 && (
            <div className="flex items-center justify-center h-48 text-gray-500">
              No rooms to display
            </div>
          )}
        </div>
      </div>

      {/* Drag overlay */}
      <DragOverlay>
        {activeBooking && (
          <BookingBlock
            booking={activeBooking}
            position={calculateBookingPosition(activeBooking, startDate, daysCount, DAY_WIDTH)}
            dayWidth={DAY_WIDTH}
            isDragging
            onClick={() => {}}
            onResize={() => Promise.resolve(false)}
          />
        )}
      </DragOverlay>
    </DndContext>
  )
}

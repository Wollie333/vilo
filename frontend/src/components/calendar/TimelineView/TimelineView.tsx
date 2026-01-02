import { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import { ZoomIn, ZoomOut, RotateCcw } from 'lucide-react'
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
  onStatusChange?: (bookingId: string, status: Booking['status']) => Promise<void>
  onDelete?: (bookingId: string) => Promise<void>
  onSwipePrev?: () => void
  onSwipeNext?: () => void
}

const ZOOM_LEVELS = [40, 60, 80, 100, 120] // pixels per day
const DEFAULT_ZOOM_INDEX = 2 // 80px default
const ROOM_LABEL_WIDTH = 180 // pixels for room name column

// Get saved zoom preference from localStorage
const getSavedZoomIndex = (): number => {
  try {
    const saved = localStorage.getItem('calendar_zoom_index')
    if (saved) {
      const index = parseInt(saved, 10)
      if (index >= 0 && index < ZOOM_LEVELS.length) {
        return index
      }
    }
  } catch {
    // Ignore localStorage errors
  }
  return DEFAULT_ZOOM_INDEX
}

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
  onStatusChange,
  onDelete,
  onSwipePrev,
  onSwipeNext,
}: TimelineViewProps) {
  const [activeBooking, setActiveBooking] = useState<Booking | null>(null)
  const [zoomIndex, setZoomIndex] = useState(getSavedZoomIndex)
  const dayWidth = ZOOM_LEVELS[zoomIndex]

  // Touch/swipe support
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Save zoom preference
  useEffect(() => {
    try {
      localStorage.setItem('calendar_zoom_index', String(zoomIndex))
    } catch {
      // Ignore localStorage errors
    }
  }, [zoomIndex])

  // Touch event handlers for swipe navigation
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      touchStartRef.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
        time: Date.now(),
      }
    }
  }, [])

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!touchStartRef.current || e.changedTouches.length !== 1) return

    const touchEnd = {
      x: e.changedTouches[0].clientX,
      y: e.changedTouches[0].clientY,
      time: Date.now(),
    }

    const deltaX = touchEnd.x - touchStartRef.current.x
    const deltaY = touchEnd.y - touchStartRef.current.y
    const deltaTime = touchEnd.time - touchStartRef.current.time

    // Only trigger swipe if it was fast enough and mostly horizontal
    const minSwipeDistance = 80
    const maxSwipeTime = 500
    const isHorizontal = Math.abs(deltaX) > Math.abs(deltaY) * 1.5

    if (deltaTime < maxSwipeTime && isHorizontal && Math.abs(deltaX) > minSwipeDistance) {
      if (deltaX > 0 && onSwipePrev) {
        onSwipePrev()
      } else if (deltaX < 0 && onSwipeNext) {
        onSwipeNext()
      }
    }

    touchStartRef.current = null
  }, [onSwipePrev, onSwipeNext])

  // Zoom handlers
  const handleZoomIn = useCallback(() => {
    setZoomIndex(prev => Math.min(prev + 1, ZOOM_LEVELS.length - 1))
  }, [])

  const handleZoomOut = useCallback(() => {
    setZoomIndex(prev => Math.max(prev - 1, 0))
  }, [])

  const handleZoomReset = useCallback(() => {
    setZoomIndex(DEFAULT_ZOOM_INDEX)
  }, [])

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
    const daysDelta = Math.round(delta.x / dayWidth)

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
      <div
        ref={containerRef}
        className="h-full overflow-auto touch-pan-y"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <div
          className="min-w-max"
          style={{ minWidth: ROOM_LABEL_WIDTH + daysCount * dayWidth }}
        >
          {/* Header row with day labels */}
          <div className="flex border-b border-gray-200 sticky top-0 bg-white z-10">
            {/* Room label header with zoom controls */}
            <div
              className="flex-shrink-0 px-4 py-2 border-r border-gray-200 flex items-center justify-between"
              style={{ width: ROOM_LABEL_WIDTH }}
            >
              <span className="font-medium text-gray-700">Rooms</span>
              <div className="flex items-center gap-1">
                <button
                  onClick={handleZoomOut}
                  disabled={zoomIndex === 0}
                  className={`p-1 rounded transition-colors ${
                    zoomIndex === 0
                      ? 'text-gray-300 cursor-not-allowed'
                      : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
                  }`}
                  title="Zoom out (−)"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                <button
                  onClick={handleZoomReset}
                  disabled={zoomIndex === DEFAULT_ZOOM_INDEX}
                  className={`p-1 rounded transition-colors ${
                    zoomIndex === DEFAULT_ZOOM_INDEX
                      ? 'text-gray-300 cursor-not-allowed'
                      : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
                  }`}
                  title="Reset zoom"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={handleZoomIn}
                  disabled={zoomIndex === ZOOM_LEVELS.length - 1}
                  className={`p-1 rounded transition-colors ${
                    zoomIndex === ZOOM_LEVELS.length - 1
                      ? 'text-gray-300 cursor-not-allowed'
                      : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
                  }`}
                  title="Zoom in (+)"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
              </div>
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
                  style={{ width: dayWidth }}
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
              dayWidth={dayWidth}
              roomLabelWidth={ROOM_LABEL_WIDTH}
              startDate={startDate}
              daysCount={daysCount}
              onBookingClick={onBookingClick}
              onCellClick={(dayIndex) => handleCellClick(room.id!, dayIndex)}
              onBookingResize={onBookingResize}
              isUpdating={isUpdating}
              onStatusChange={onStatusChange}
              onDelete={onDelete}
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
            position={calculateBookingPosition(activeBooking, startDate, daysCount, dayWidth)}
            dayWidth={dayWidth}
            isDragging
            onClick={() => {}}
            onResize={() => Promise.resolve(false)}
          />
        )}
      </DragOverlay>
    </DndContext>
  )
}

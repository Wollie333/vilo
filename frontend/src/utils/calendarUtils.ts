import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  addDays,
  subDays,
  addMonths,
  subMonths,
  format,
  parseISO,
  isSameDay,
  differenceInDays,
  isBefore,
  isAfter,
  startOfDay,
} from 'date-fns'
import type { Booking, Room } from '../services/api'

// Status colors for booking blocks
export const statusColors: Record<Booking['status'], { bg: string; border: string; text: string }> = {
  pending: {
    bg: 'bg-yellow-100',
    border: 'border-yellow-400',
    text: 'text-yellow-800',
  },
  confirmed: {
    bg: 'bg-accent-100',
    border: 'border-accent-400',
    text: 'text-accent-800',
  },
  checked_in: {
    bg: 'bg-blue-100',
    border: 'border-blue-400',
    text: 'text-blue-800',
  },
  checked_out: {
    bg: 'bg-purple-100',
    border: 'border-purple-400',
    text: 'text-purple-800',
  },
  cancelled: {
    bg: 'bg-red-100',
    border: 'border-red-400',
    text: 'text-red-800',
  },
  completed: {
    bg: 'bg-gray-100',
    border: 'border-gray-400',
    text: 'text-gray-800',
  },
}

// Get all days for a month view (includes days from prev/next months to fill the grid)
export function getMonthCalendarDays(year: number, month: number): Date[] {
  const monthStart = startOfMonth(new Date(year, month))
  const monthEnd = endOfMonth(monthStart)
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 }) // Sunday
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 })

  return eachDayOfInterval({ start: calendarStart, end: calendarEnd })
}

// Get days between two dates (inclusive of start, exclusive of end - like booking dates)
export function getDaysBetween(startDate: Date | string, endDate: Date | string): Date[] {
  const start = typeof startDate === 'string' ? parseISO(startDate) : startDate
  const end = typeof endDate === 'string' ? parseISO(endDate) : endDate

  if (isBefore(end, start)) return []

  return eachDayOfInterval({ start, end: subDays(end, 1) })
}

// Get array of dates for timeline view
export function getTimelineDays(startDate: Date, daysCount: number): Date[] {
  return Array.from({ length: daysCount }, (_, i) => addDays(startDate, i))
}

// Check if a date falls within a booking's date range
export function isDateInBooking(date: Date, booking: Booking): boolean {
  // Normalize all dates to start of day to avoid timezone issues
  const normalizedDate = startOfDay(date)
  const checkIn = startOfDay(parseISO(booking.check_in))
  const checkOut = startOfDay(parseISO(booking.check_out))

  // Check-in day is included, check-out day is not (guest leaves that day)
  return (
    (isSameDay(normalizedDate, checkIn) || isAfter(normalizedDate, checkIn)) &&
    isBefore(normalizedDate, checkOut)
  )
}

// Get bookings that overlap with a specific date
export function getBookingsForDate(bookings: Booking[], date: Date): Booking[] {
  return bookings.filter((booking) => isDateInBooking(date, booking))
}

// Get bookings for a specific room
export function getBookingsForRoom(bookings: Booking[], roomId: string): Booking[] {
  return bookings.filter((booking) => booking.room_id === roomId)
}

// Get bookings for a room on a specific date
export function getBookingsForRoomOnDate(
  bookings: Booking[],
  roomId: string,
  date: Date
): Booking[] {
  return bookings.filter(
    (booking) => booking.room_id === roomId && isDateInBooking(date, booking)
  )
}

// Calculate booking block position and width for timeline view
export interface BookingPosition {
  left: number // percentage or pixels from start
  width: number // percentage or pixels width
  startIndex: number // day index where booking starts (can be negative if starts before visible range)
  endIndex: number // day index where booking ends
  nightCount: number // total nights
  isPartialStart: boolean // booking starts before visible range
  isPartialEnd: boolean // booking ends after visible range
}

export function calculateBookingPosition(
  booking: Booking,
  timelineStart: Date,
  timelineDays: number,
  dayWidth: number
): BookingPosition {
  const checkIn = startOfDay(parseISO(booking.check_in))
  const checkOut = startOfDay(parseISO(booking.check_out))
  const timelineStartDay = startOfDay(timelineStart)
  const timelineEnd = addDays(timelineStartDay, timelineDays)

  const nightCount = differenceInDays(checkOut, checkIn)
  const startIndex = differenceInDays(checkIn, timelineStartDay)
  const endIndex = differenceInDays(checkOut, timelineStartDay)

  const isPartialStart = isBefore(checkIn, timelineStartDay)
  const isPartialEnd = isAfter(checkOut, timelineEnd)

  // Calculate visible portion
  const visibleStartIndex = Math.max(0, startIndex)
  const visibleEndIndex = Math.min(timelineDays, endIndex)
  const visibleDays = visibleEndIndex - visibleStartIndex

  return {
    left: visibleStartIndex * dayWidth,
    width: visibleDays * dayWidth,
    startIndex,
    endIndex,
    nightCount,
    isPartialStart,
    isPartialEnd,
  }
}

// Check if a booking is visible in the timeline range
export function isBookingVisible(
  booking: Booking,
  timelineStart: Date,
  timelineDays: number
): boolean {
  const checkIn = parseISO(booking.check_in)
  const checkOut = parseISO(booking.check_out)
  const timelineEnd = addDays(timelineStart, timelineDays)

  // Booking overlaps with timeline if:
  // - Check-in is before timeline end AND
  // - Check-out is after timeline start
  return isBefore(checkIn, timelineEnd) && isAfter(checkOut, timelineStart)
}

// Group bookings by room
export function groupBookingsByRoom(
  bookings: Booking[],
  rooms: Room[]
): Map<string, Booking[]> {
  const map = new Map<string, Booking[]>()

  // Initialize all rooms with empty arrays
  rooms.forEach((room) => {
    if (room.id) {
      map.set(room.id, [])
    }
  })

  // Add bookings to their rooms
  bookings.forEach((booking) => {
    const roomBookings = map.get(booking.room_id) || []
    roomBookings.push(booking)
    map.set(booking.room_id, roomBookings)
  })

  return map
}

// Calculate occupancy percentage for a date range
export function calculateOccupancy(
  bookings: Booking[],
  rooms: Room[],
  startDate: Date,
  endDate: Date
): number {
  const days = eachDayOfInterval({ start: startDate, end: subDays(endDate, 1) })
  if (days.length === 0 || rooms.length === 0) return 0

  let occupiedRoomDays = 0
  const totalRoomDays = days.length * rooms.length

  days.forEach((day) => {
    rooms.forEach((room) => {
      const hasBooking = bookings.some(
        (booking) =>
          booking.room_id === room.id &&
          isDateInBooking(day, booking) &&
          booking.status !== 'cancelled'
      )
      if (hasBooking) occupiedRoomDays++
    })
  })

  return Math.round((occupiedRoomDays / totalRoomDays) * 100)
}

// Date navigation helpers
export function navigateTimeline(
  currentStart: Date,
  direction: 'prev' | 'next',
  daysToMove: number = 7
): Date {
  return direction === 'next'
    ? addDays(currentStart, daysToMove)
    : subDays(currentStart, daysToMove)
}

export function navigateMonth(
  currentDate: Date,
  direction: 'prev' | 'next'
): Date {
  return direction === 'next'
    ? addMonths(currentDate, 1)
    : subMonths(currentDate, 1)
}

// Format helpers
export function formatDateRange(startDate: Date, endDate: Date): string {
  const startMonth = format(startDate, 'MMM')
  const endMonth = format(endDate, 'MMM')

  if (startMonth === endMonth) {
    return `${format(startDate, 'MMM d')} - ${format(endDate, 'd, yyyy')}`
  }
  return `${format(startDate, 'MMM d')} - ${format(endDate, 'MMM d, yyyy')}`
}

export function formatMonthYear(date: Date): string {
  return format(date, 'MMMM yyyy')
}

// ISO date string helpers
export function toISODateString(date: Date): string {
  return format(date, 'yyyy-MM-dd')
}

export function fromISODateString(dateString: string): Date {
  return parseISO(dateString)
}

// Check if two bookings overlap
export function doBookingsOverlap(booking1: Booking, booking2: Booking): boolean {
  const start1 = parseISO(booking1.check_in)
  const end1 = parseISO(booking1.check_out)
  const start2 = parseISO(booking2.check_in)
  const end2 = parseISO(booking2.check_out)

  // Bookings overlap if start1 < end2 AND start2 < end1
  return isBefore(start1, end2) && isBefore(start2, end1)
}

// Check if a new booking would conflict with existing bookings for a room
export function hasBookingConflict(
  newBooking: { check_in: string; check_out: string; room_id: string; id?: string },
  existingBookings: Booking[]
): Booking | null {
  const roomBookings = existingBookings.filter(
    (b) =>
      b.room_id === newBooking.room_id &&
      b.id !== newBooking.id && // Exclude the booking being edited
      b.status !== 'cancelled'
  )

  for (const existing of roomBookings) {
    if (
      doBookingsOverlap(
        { ...newBooking, status: 'pending', payment_status: 'pending', total_amount: 0, currency: 'ZAR', guest_name: '' } as Booking,
        existing
      )
    ) {
      return existing
    }
  }

  return null
}

// Get the number of nights for a booking
export function getBookingNights(booking: Booking): number {
  const checkIn = parseISO(booking.check_in)
  const checkOut = parseISO(booking.check_out)
  return differenceInDays(checkOut, checkIn)
}

// Snap a date to the nearest day boundary
export function snapToDay(date: Date): Date {
  return startOfDay(date)
}

// Calculate new dates after dragging a booking
export function calculateDraggedDates(
  originalBooking: Booking,
  daysDelta: number
): { check_in: string; check_out: string } {
  const checkIn = addDays(parseISO(originalBooking.check_in), daysDelta)
  const checkOut = addDays(parseISO(originalBooking.check_out), daysDelta)

  return {
    check_in: toISODateString(checkIn),
    check_out: toISODateString(checkOut),
  }
}

// Calculate new dates after resizing a booking
export function calculateResizedDates(
  originalBooking: Booking,
  direction: 'start' | 'end',
  daysDelta: number
): { check_in: string; check_out: string } {
  const checkIn = parseISO(originalBooking.check_in)
  const checkOut = parseISO(originalBooking.check_out)

  if (direction === 'start') {
    const newCheckIn = addDays(checkIn, daysDelta)
    // Don't allow check-in to be on or after check-out
    if (!isBefore(newCheckIn, checkOut)) {
      return { check_in: originalBooking.check_in, check_out: originalBooking.check_out }
    }
    return {
      check_in: toISODateString(newCheckIn),
      check_out: originalBooking.check_out,
    }
  } else {
    const newCheckOut = addDays(checkOut, daysDelta)
    // Don't allow check-out to be on or before check-in
    if (!isAfter(newCheckOut, checkIn)) {
      return { check_in: originalBooking.check_in, check_out: originalBooking.check_out }
    }
    return {
      check_in: originalBooking.check_in,
      check_out: toISODateString(newCheckOut),
    }
  }
}

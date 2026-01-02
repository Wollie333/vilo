import { useMemo } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  isSameMonth,
  isSameDay,
  isWithinInterval,
  addMonths,
  subMonths,
} from 'date-fns'
import type { Booking } from '../../../services/api'

interface MiniCalendarProps {
  currentDate: Date
  viewStartDate: Date
  viewEndDate: Date
  bookings: Booking[]
  onDateClick: (date: Date) => void
  onMonthChange: (date: Date) => void
}

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']

export default function MiniCalendar({
  currentDate,
  viewStartDate,
  viewEndDate,
  bookings,
  onDateClick,
  onMonthChange,
}: MiniCalendarProps) {
  // Generate calendar grid
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentDate)
    const monthEnd = endOfMonth(currentDate)
    const calendarStart = startOfWeek(monthStart)
    const calendarEnd = endOfWeek(monthEnd)

    const days: Date[] = []
    let day = calendarStart

    while (day <= calendarEnd) {
      days.push(day)
      day = addDays(day, 1)
    }

    return days
  }, [currentDate])

  // Create a set of dates that have bookings for quick lookup
  const datesWithBookings = useMemo(() => {
    const dateSet = new Set<string>()

    bookings.forEach(booking => {
      const checkIn = new Date(booking.check_in)
      const checkOut = new Date(booking.check_out)

      // Add all dates from check-in to check-out (exclusive)
      let current = checkIn
      while (current < checkOut) {
        dateSet.add(format(current, 'yyyy-MM-dd'))
        current = addDays(current, 1)
      }
    })

    return dateSet
  }, [bookings])

  // Check if a date is within the current view range
  const isInViewRange = (date: Date) => {
    return isWithinInterval(date, { start: viewStartDate, end: viewEndDate })
  }

  // Check if a date has bookings
  const hasBooking = (date: Date) => {
    return datesWithBookings.has(format(date, 'yyyy-MM-dd'))
  }

  const handlePrevMonth = () => {
    onMonthChange(subMonths(currentDate, 1))
  }

  const handleNextMonth = () => {
    onMonthChange(addMonths(currentDate, 1))
  }

  const today = new Date()

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-3 w-64">
      {/* Month header with navigation */}
      <div className="flex items-center justify-between mb-2">
        <button
          onClick={handlePrevMonth}
          className="p-1 rounded hover:bg-gray-100 text-gray-500 hover:text-gray-700"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="text-sm font-medium text-gray-900">
          {format(currentDate, 'MMMM yyyy')}
        </span>
        <button
          onClick={handleNextMonth}
          className="p-1 rounded hover:bg-gray-100 text-gray-500 hover:text-gray-700"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 gap-0.5 mb-1">
        {WEEKDAYS.map(day => (
          <div
            key={day}
            className="text-center text-xs font-medium text-gray-500 py-1"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-0.5">
        {calendarDays.map((day, index) => {
          const isCurrentMonth = isSameMonth(day, currentDate)
          const isToday = isSameDay(day, today)
          const inViewRange = isInViewRange(day)
          const hasBookingOnDay = hasBooking(day)

          return (
            <button
              key={index}
              onClick={() => onDateClick(day)}
              className={`
                relative w-8 h-8 text-xs rounded flex items-center justify-center
                transition-colors
                ${!isCurrentMonth ? 'text-gray-300' : 'text-gray-700'}
                ${isToday ? 'font-bold' : ''}
                ${inViewRange ? 'bg-blue-100 text-blue-700' : ''}
                ${isToday && !inViewRange ? 'ring-1 ring-blue-500' : ''}
                ${isCurrentMonth && !inViewRange ? 'hover:bg-gray-100' : ''}
                ${inViewRange ? 'hover:bg-blue-200' : ''}
              `}
            >
              {format(day, 'd')}
              {/* Booking indicator dot */}
              {hasBookingOnDay && isCurrentMonth && (
                <span
                  className={`absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full ${
                    inViewRange ? 'bg-blue-600' : 'bg-accent-500'
                  }`}
                />
              )}
            </button>
          )
        })}
      </div>

      {/* Legend */}
      <div className="mt-3 pt-2 border-t border-gray-100 flex items-center justify-center gap-4 text-xs text-gray-500">
        <div className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-accent-500" />
          <span>Bookings</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-blue-100" />
          <span>Current view</span>
        </div>
      </div>
    </div>
  )
}

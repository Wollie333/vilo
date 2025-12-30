import { useState, useMemo } from 'react'
import { format, isSameMonth, isToday, isSameDay } from 'date-fns'
import type { Booking, Room } from '../../../services/api'
import { getMonthCalendarDays, getBookingsForDate, statusColors } from '../../../utils/calendarUtils'
import DayModal from './DayModal'

interface MonthViewProps {
  currentDate: Date
  bookings: Booking[]
  rooms: Room[]
  onBookingClick: (booking: Booking) => void
  onDayClick: (date: Date) => void
}

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export default function MonthView({
  currentDate,
  bookings,
  rooms,
  onBookingClick,
  onDayClick,
}: MonthViewProps) {
  const [selectedDay, setSelectedDay] = useState<Date | null>(null)

  // Generate calendar days
  const calendarDays = useMemo(
    () => getMonthCalendarDays(currentDate.getFullYear(), currentDate.getMonth()),
    [currentDate]
  )

  // Get bookings for selected day
  const selectedDayBookings = useMemo(() => {
    if (!selectedDay) return []
    return getBookingsForDate(bookings, selectedDay)
  }, [selectedDay, bookings])

  // Handle day click
  const handleDayClick = (day: Date) => {
    const dayBookings = getBookingsForDate(bookings, day)
    if (dayBookings.length > 0) {
      setSelectedDay(day)
    } else {
      // No bookings, trigger create
      onDayClick(day)
    }
  }

  return (
    <div className="p-4">
      {/* Weekday headers */}
      <div className="grid grid-cols-7 gap-px mb-1">
        {WEEKDAY_LABELS.map((label) => (
          <div
            key={label}
            className="text-center text-sm font-medium text-gray-500 dark:text-gray-400 py-2"
          >
            {label}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-px bg-gray-200 dark:bg-gray-700 rounded-lg overflow-hidden">
        {calendarDays.map((day, index) => {
          const dayBookings = getBookingsForDate(bookings, day)
          const isCurrentMonth = isSameMonth(day, currentDate)
          const isCurrentDay = isToday(day)
          const isSelected = selectedDay && isSameDay(day, selectedDay)

          // Group bookings by status for display
          const statusCounts: Record<string, number> = {}
          dayBookings.forEach((booking) => {
            statusCounts[booking.status] = (statusCounts[booking.status] || 0) + 1
          })

          return (
            <div
              key={index}
              onClick={() => handleDayClick(day)}
              className={`
                min-h-[100px] p-2 cursor-pointer transition-colors
                ${isCurrentMonth
                  ? 'bg-white dark:bg-gray-800'
                  : 'bg-gray-50 dark:bg-gray-900/50'
                }
                ${isSelected
                  ? 'ring-2 ring-inset ring-blue-500'
                  : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
                }
              `}
            >
              {/* Day number */}
              <div className={`
                text-sm font-medium mb-1
                ${isCurrentDay
                  ? 'w-7 h-7 flex items-center justify-center rounded-full bg-blue-600 text-white'
                  : isCurrentMonth
                  ? 'text-gray-900 dark:text-white'
                  : 'text-gray-400 dark:text-gray-600'
                }
              `}>
                {format(day, 'd')}
              </div>

              {/* Booking indicators */}
              {dayBookings.length > 0 && (
                <div className="space-y-1">
                  {/* Show first 2-3 bookings */}
                  {dayBookings.slice(0, 2).map((booking) => {
                    const colors = statusColors[booking.status]
                    return (
                      <div
                        key={booking.id}
                        onClick={(e) => {
                          e.stopPropagation()
                          onBookingClick(booking)
                        }}
                        className={`
                          text-xs px-1.5 py-0.5 rounded truncate
                          ${colors.bg} ${colors.text}
                          hover:opacity-80 transition-opacity
                        `}
                      >
                        {booking.guest_name}
                      </div>
                    )
                  })}

                  {/* Show "+X more" if more bookings */}
                  {dayBookings.length > 2 && (
                    <div className="text-xs text-gray-500 dark:text-gray-400 px-1">
                      +{dayBookings.length - 2} more
                    </div>
                  )}
                </div>
              )}

              {/* Empty state for days with no bookings */}
              {dayBookings.length === 0 && isCurrentMonth && (
                <div className="h-full flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                  <span className="text-xs text-gray-400 dark:text-gray-500">
                    Click to book
                  </span>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Day detail modal */}
      <DayModal
        isOpen={selectedDay !== null}
        onClose={() => setSelectedDay(null)}
        date={selectedDay}
        bookings={selectedDayBookings}
        rooms={rooms}
        onBookingClick={(booking) => {
          setSelectedDay(null)
          onBookingClick(booking)
        }}
        onCreateClick={() => {
          if (selectedDay) {
            setSelectedDay(null)
            onDayClick(selectedDay)
          }
        }}
      />
    </div>
  )
}

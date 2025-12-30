import { useState, useMemo, useEffect } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface BookingCalendarProps {
  checkIn: string
  checkOut: string
  onCheckInChange: (date: string) => void
  onCheckOutChange: (date: string) => void
  unavailableDates?: string[] // Array of dates that are unavailable (YYYY-MM-DD format)
  seasonalDates?: string[] // Array of dates with seasonal pricing (YYYY-MM-DD format)
  minStayNights?: number
  maxStayNights?: number | null
  navigateToMonth?: Date | null // Navigate calendar to this month when set
}

export default function BookingCalendar({
  checkIn,
  checkOut,
  onCheckInChange,
  onCheckOutChange,
  unavailableDates = [],
  seasonalDates = [],
  minStayNights = 1,
  maxStayNights = null,
  navigateToMonth = null,
}: BookingCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(() => {
    const today = new Date()
    return new Date(today.getFullYear(), today.getMonth(), 1)
  })

  // Navigate to specific month when navigateToMonth changes
  useEffect(() => {
    if (navigateToMonth) {
      setCurrentMonth(new Date(navigateToMonth.getFullYear(), navigateToMonth.getMonth(), 1))
    }
  }, [navigateToMonth])

  const [selectingCheckOut, setSelectingCheckOut] = useState(false)

  // Get today's date at midnight for comparison
  const today = useMemo(() => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return d
  }, [])

  // Create sets for O(1) lookup
  const unavailableSet = useMemo(() => new Set(unavailableDates), [unavailableDates])
  const seasonalSet = useMemo(() => new Set(seasonalDates), [seasonalDates])

  // Generate calendar days for current month view (including prev/next month padding)
  const calendarDays = useMemo(() => {
    const year = currentMonth.getFullYear()
    const month = currentMonth.getMonth()

    // First day of the month
    const firstDay = new Date(year, month, 1)
    // Last day of the month
    const lastDay = new Date(year, month + 1, 0)

    // Day of week for first day (0 = Sunday)
    const startPadding = firstDay.getDay()

    const days: Array<{
      date: Date
      dateStr: string
      isCurrentMonth: boolean
      isPast: boolean
      isUnavailable: boolean
      isSeasonal: boolean
      isCheckIn: boolean
      isCheckOut: boolean
      isInRange: boolean
      isToday: boolean
    }> = []

    // Add padding days from previous month
    for (let i = startPadding - 1; i >= 0; i--) {
      const date = new Date(year, month, -i)
      const dateStr = formatDateStr(date)
      days.push({
        date,
        dateStr,
        isCurrentMonth: false,
        isPast: date < today,
        isUnavailable: unavailableSet.has(dateStr),
        isSeasonal: seasonalSet.has(dateStr),
        isCheckIn: dateStr === checkIn,
        isCheckOut: dateStr === checkOut,
        isInRange: isDateInRange(dateStr, checkIn, checkOut),
        isToday: dateStr === formatDateStr(today),
      })
    }

    // Add days of current month
    for (let day = 1; day <= lastDay.getDate(); day++) {
      const date = new Date(year, month, day)
      const dateStr = formatDateStr(date)
      days.push({
        date,
        dateStr,
        isCurrentMonth: true,
        isPast: date < today,
        isUnavailable: unavailableSet.has(dateStr),
        isSeasonal: seasonalSet.has(dateStr),
        isCheckIn: dateStr === checkIn,
        isCheckOut: dateStr === checkOut,
        isInRange: isDateInRange(dateStr, checkIn, checkOut),
        isToday: dateStr === formatDateStr(today),
      })
    }

    // Add padding days from next month to complete the grid (6 rows)
    const remainingDays = 42 - days.length
    for (let i = 1; i <= remainingDays; i++) {
      const date = new Date(year, month + 1, i)
      const dateStr = formatDateStr(date)
      days.push({
        date,
        dateStr,
        isCurrentMonth: false,
        isPast: date < today,
        isUnavailable: unavailableSet.has(dateStr),
        isSeasonal: seasonalSet.has(dateStr),
        isCheckIn: dateStr === checkIn,
        isCheckOut: dateStr === checkOut,
        isInRange: isDateInRange(dateStr, checkIn, checkOut),
        isToday: dateStr === formatDateStr(today),
      })
    }

    return days
  }, [currentMonth, today, unavailableSet, seasonalSet, checkIn, checkOut])

  // Calculate nights
  const nights = useMemo(() => {
    if (!checkIn || !checkOut) return 0
    const start = new Date(checkIn)
    const end = new Date(checkOut)
    return Math.max(0, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)))
  }, [checkIn, checkOut])

  function formatDateStr(date: Date): string {
    return date.toISOString().split('T')[0]
  }

  function isDateInRange(dateStr: string, start: string, end: string): boolean {
    if (!start || !end) return false
    return dateStr > start && dateStr < end
  }

  function handleDateClick(day: typeof calendarDays[0]) {
    if (day.isPast || day.isUnavailable) return

    if (!selectingCheckOut || !checkIn) {
      // Selecting check-in date
      onCheckInChange(day.dateStr)
      onCheckOutChange('')
      setSelectingCheckOut(true)
    } else {
      // Selecting check-out date
      if (day.dateStr <= checkIn) {
        // If clicked date is before or equal to check-in, reset and use as new check-in
        onCheckInChange(day.dateStr)
        onCheckOutChange('')
      } else {
        // Check if any date in range is unavailable
        const hasUnavailableInRange = checkForUnavailableInRange(checkIn, day.dateStr)
        if (hasUnavailableInRange) {
          // Reset and start over
          onCheckInChange(day.dateStr)
          onCheckOutChange('')
          return
        }

        // Check min/max stay requirements
        const nightCount = Math.ceil(
          (new Date(day.dateStr).getTime() - new Date(checkIn).getTime()) / (1000 * 60 * 60 * 24)
        )

        if (nightCount < minStayNights) {
          // Don't allow selection if less than minimum nights
          return
        }

        if (maxStayNights && nightCount > maxStayNights) {
          // Don't allow selection if more than maximum nights
          return
        }

        onCheckOutChange(day.dateStr)
        setSelectingCheckOut(false)
      }
    }
  }

  function checkForUnavailableInRange(start: string, end: string): boolean {
    const startDate = new Date(start)
    const endDate = new Date(end)
    const current = new Date(startDate)

    while (current < endDate) {
      if (unavailableSet.has(formatDateStr(current))) {
        return true
      }
      current.setDate(current.getDate() + 1)
    }

    return false
  }

  function goToPrevMonth() {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))
  }

  function goToNextMonth() {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))
  }

  const monthName = currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' })
  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Calendar Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b">
        <button
          onClick={goToPrevMonth}
          className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
          aria-label="Previous month"
        >
          <ChevronLeft size={20} />
        </button>
        <h3 className="text-lg font-semibold text-gray-900">{monthName}</h3>
        <button
          onClick={goToNextMonth}
          className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
          aria-label="Next month"
        >
          <ChevronRight size={20} />
        </button>
      </div>

      {/* Week day headers */}
      <div className="grid grid-cols-7 border-b">
        {weekDays.map((day) => (
          <div
            key={day}
            className="py-2 text-center text-xs font-medium text-gray-500 uppercase"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7">
        {calendarDays.map((day, index) => {
          const isSelectable = !day.isPast && !day.isUnavailable
          const isSelected = day.isCheckIn || day.isCheckOut

          return (
            <button
              key={index}
              onClick={() => handleDateClick(day)}
              disabled={!isSelectable}
              className={`
                relative h-12 sm:h-14 flex items-center justify-center text-sm transition-all
                ${!day.isCurrentMonth ? 'text-gray-300' : ''}
                ${day.isPast ? 'text-gray-300 cursor-not-allowed' : ''}
                ${day.isUnavailable && !day.isPast ? 'bg-red-50 text-red-300 cursor-not-allowed line-through' : ''}
                ${day.isToday && !isSelected ? 'font-bold text-gray-900' : ''}
                ${day.isSeasonal && !day.isUnavailable && !day.isPast && !isSelected && !day.isInRange ? 'bg-amber-100' : ''}
                ${day.isInRange ? 'bg-blue-100' : ''}
                ${day.isCheckIn ? 'bg-blue-600 text-white rounded-l-full' : ''}
                ${day.isCheckOut ? 'bg-blue-600 text-white rounded-r-full' : ''}
                ${isSelectable && !isSelected && !day.isInRange && !day.isSeasonal ? 'hover:bg-gray-100 cursor-pointer' : ''}
                ${isSelectable && !isSelected && !day.isInRange && day.isSeasonal ? 'hover:bg-amber-200 cursor-pointer' : ''}
              `}
            >
              <span className={`${day.isToday && !isSelected ? 'underline' : ''}`}>
                {day.date.getDate()}
              </span>
            </button>
          )
        })}
      </div>

      {/* Legend and Selection Info */}
      <div className="px-4 py-3 bg-gray-50 border-t">
        {/* Selection status */}
        <div className="mb-3">
          {!checkIn ? (
            <p className="text-sm text-gray-600">Select your check-in date</p>
          ) : !checkOut ? (
            <p className="text-sm text-gray-600">Now select your check-out date</p>
          ) : (
            <p className="text-sm text-gray-900 font-medium">
              {nights} {nights === 1 ? 'night' : 'nights'} selected
              {minStayNights > 1 && nights < minStayNights && (
                <span className="text-red-500 ml-2">(Minimum {minStayNights} nights)</span>
              )}
            </p>
          )}
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-4 text-xs text-gray-500">
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-4 bg-blue-600 rounded-full"></div>
            <span>Selected</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-4 bg-blue-100 rounded"></div>
            <span>Your stay</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-4 bg-amber-100 border border-amber-200 rounded"></div>
            <span>Peak season</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-4 bg-red-50 border border-red-200 rounded"></div>
            <span>Unavailable</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-4 bg-white border border-gray-300 rounded"></div>
            <span>Available</span>
          </div>
        </div>
      </div>
    </div>
  )
}

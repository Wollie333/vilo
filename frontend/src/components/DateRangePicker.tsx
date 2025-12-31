import { useState, useMemo, useEffect, useRef } from 'react'
import { ChevronLeft, ChevronRight, Calendar, X, ArrowRight } from 'lucide-react'
import { createPortal } from 'react-dom'

interface DateRangePickerProps {
  startDate: string
  endDate: string
  onStartDateChange: (date: string) => void
  onEndDateChange: (date: string) => void
  startLabel?: string
  endLabel?: string
  startPlaceholder?: string
  endPlaceholder?: string
  minDate?: string
  maxDate?: string
  disabled?: boolean
  error?: string
  className?: string
  unavailableDates?: string[]
  seasonalDates?: string[]
  minStayNights?: number
  maxStayNights?: number | null
  compact?: boolean
}

export default function DateRangePicker({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  startLabel = 'Check-in',
  endLabel = 'Check-out',
  startPlaceholder = 'Select date',
  endPlaceholder = 'Select date',
  minDate,
  disabled = false,
  error,
  className = '',
  unavailableDates = [],
  seasonalDates = [],
  minStayNights = 1,
  maxStayNights = null,
  compact = false,
}: DateRangePickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [selectingEnd, setSelectingEnd] = useState(false)
  const [hoveredDate, setHoveredDate] = useState<string | null>(null)
  const [currentMonth, setCurrentMonth] = useState(() => {
    if (startDate) {
      const d = new Date(startDate)
      return new Date(d.getFullYear(), d.getMonth(), 1)
    }
    const today = new Date()
    return new Date(today.getFullYear(), today.getMonth(), 1)
  })
  const triggerRef = useRef<HTMLButtonElement>(null)
  const modalRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (startDate && isOpen) {
      const d = new Date(startDate)
      setCurrentMonth(new Date(d.getFullYear(), d.getMonth(), 1))
    }
  }, [startDate])

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false)
      }
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        isOpen &&
        modalRef.current &&
        !modalRef.current.contains(e.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  const today = useMemo(() => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return d
  }, [])

  const unavailableSet = useMemo(() => new Set(unavailableDates), [unavailableDates])
  const seasonalSet = useMemo(() => new Set(seasonalDates), [seasonalDates])

  const nights = useMemo(() => {
    if (!startDate || !endDate) return 0
    const start = new Date(startDate)
    const end = new Date(endDate)
    return Math.max(0, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)))
  }, [startDate, endDate])

  const calendarDays = useMemo(() => {
    const year = currentMonth.getFullYear()
    const month = currentMonth.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const startPadding = firstDay.getDay()

    const days: Array<{
      date: Date
      dateStr: string
      isCurrentMonth: boolean
      isPast: boolean
      isDisabled: boolean
      isStart: boolean
      isEnd: boolean
      isInRange: boolean
      isInHoverRange: boolean
      isToday: boolean
      isUnavailable: boolean
      isSeasonal: boolean
    }> = []

    function formatDateStr(date: Date): string {
      return date.toISOString().split('T')[0]
    }

    function isInRange(dateStr: string): boolean {
      if (!startDate || !endDate) return false
      return dateStr > startDate && dateStr < endDate
    }

    function isInHoverRange(dateStr: string): boolean {
      if (!startDate || endDate || !hoveredDate || !selectingEnd) return false
      const isAfterStart = dateStr > startDate
      const isBeforeOrEqualHover = dateStr <= hoveredDate
      return isAfterStart && isBeforeOrEqualHover
    }

    function isDateDisabled(date: Date, dateStr: string): boolean {
      if (date < today) return true
      if (minDate && dateStr < minDate) return true
      if (unavailableSet.has(dateStr)) return true
      return false
    }

    // Previous month padding
    for (let i = startPadding - 1; i >= 0; i--) {
      const date = new Date(year, month, -i)
      const dateStr = formatDateStr(date)
      days.push({
        date,
        dateStr,
        isCurrentMonth: false,
        isPast: date < today,
        isDisabled: isDateDisabled(date, dateStr),
        isStart: dateStr === startDate,
        isEnd: dateStr === endDate,
        isInRange: isInRange(dateStr),
        isInHoverRange: isInHoverRange(dateStr),
        isToday: false,
        isUnavailable: unavailableSet.has(dateStr),
        isSeasonal: seasonalSet.has(dateStr),
      })
    }

    // Current month days
    for (let day = 1; day <= lastDay.getDate(); day++) {
      const date = new Date(year, month, day)
      const dateStr = formatDateStr(date)
      days.push({
        date,
        dateStr,
        isCurrentMonth: true,
        isPast: date < today,
        isDisabled: isDateDisabled(date, dateStr),
        isStart: dateStr === startDate,
        isEnd: dateStr === endDate,
        isInRange: isInRange(dateStr),
        isInHoverRange: isInHoverRange(dateStr),
        isToday: dateStr === formatDateStr(today),
        isUnavailable: unavailableSet.has(dateStr),
        isSeasonal: seasonalSet.has(dateStr),
      })
    }

    // Next month padding
    const remainingDays = 42 - days.length
    for (let i = 1; i <= remainingDays; i++) {
      const date = new Date(year, month + 1, i)
      const dateStr = formatDateStr(date)
      days.push({
        date,
        dateStr,
        isCurrentMonth: false,
        isPast: false,
        isDisabled: isDateDisabled(date, dateStr),
        isStart: dateStr === startDate,
        isEnd: dateStr === endDate,
        isInRange: isInRange(dateStr),
        isInHoverRange: isInHoverRange(dateStr),
        isToday: false,
        isUnavailable: unavailableSet.has(dateStr),
        isSeasonal: seasonalSet.has(dateStr),
      })
    }

    return days
  }, [currentMonth, today, startDate, endDate, hoveredDate, selectingEnd, unavailableSet, seasonalSet, minDate])

  function checkForUnavailableInRange(start: string, end: string): boolean {
    const startD = new Date(start)
    const endD = new Date(end)
    const current = new Date(startD)
    while (current < endD) {
      if (unavailableSet.has(current.toISOString().split('T')[0])) {
        return true
      }
      current.setDate(current.getDate() + 1)
    }
    return false
  }

  function handleDateClick(day: typeof calendarDays[0]) {
    if (day.isDisabled) return

    if (!selectingEnd || !startDate) {
      onStartDateChange(day.dateStr)
      onEndDateChange('')
      setSelectingEnd(true)
    } else {
      if (day.dateStr <= startDate) {
        onStartDateChange(day.dateStr)
        onEndDateChange('')
      } else {
        if (checkForUnavailableInRange(startDate, day.dateStr)) {
          onStartDateChange(day.dateStr)
          onEndDateChange('')
          return
        }

        const nightCount = Math.ceil(
          (new Date(day.dateStr).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24)
        )

        if (nightCount < minStayNights) return
        if (maxStayNights && nightCount > maxStayNights) return

        onEndDateChange(day.dateStr)
        setSelectingEnd(false)
        setIsOpen(false)
      }
    }
  }

  function goToPrevMonth() {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))
  }

  function goToNextMonth() {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))
  }

  function goToToday() {
    setCurrentMonth(new Date(today.getFullYear(), today.getMonth(), 1))
  }

  function formatDisplay(date: string): string {
    if (!date) return ''
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  const monthName = currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' })
  const weekDays = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']

  const modal = isOpen && createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-fadeIn"
        onClick={() => setIsOpen(false)}
      />

      {/* Modal */}
      <div
        ref={modalRef}
        className="relative bg-white rounded-2xl shadow-2xl w-[420px] max-w-[95vw] overflow-hidden animate-scaleIn"
      >
        {/* Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-accent to-accent-600 text-white">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm opacity-90">
              {!startDate ? 'Select check-in date' : !endDate ? 'Select check-out date' : `${nights} night${nights !== 1 ? 's' : ''}`}
            </p>
            <button
              onClick={() => setIsOpen(false)}
              className="p-2 hover:bg-white/20 rounded-full transition-colors -mr-1"
            >
              <X size={20} />
            </button>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <p className="text-xs opacity-75 mb-0.5">{startLabel}</p>
              <p className="text-lg font-semibold">
                {startDate ? new Date(startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'}
              </p>
            </div>
            <ArrowRight size={20} className="opacity-50" />
            <div className="flex-1">
              <p className="text-xs opacity-75 mb-0.5">{endLabel}</p>
              <p className="text-lg font-semibold">
                {endDate ? new Date(endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'}
              </p>
            </div>
          </div>
        </div>

        {/* Month Navigation */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <button
            onClick={goToPrevMonth}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-600"
          >
            <ChevronLeft size={20} />
          </button>
          <button
            onClick={goToToday}
            className="text-base font-semibold text-gray-800 hover:text-accent transition-colors"
          >
            {monthName}
          </button>
          <button
            onClick={goToNextMonth}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-600"
          >
            <ChevronRight size={20} />
          </button>
        </div>

        {/* Week Days Header */}
        <div className="grid grid-cols-7 px-3 py-2 bg-gray-50">
          {weekDays.map((day) => (
            <div
              key={day}
              className="text-center text-xs font-semibold text-gray-500 uppercase py-1"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-0.5 p-3">
          {calendarDays.map((day, index) => {
            const isSelectable = !day.isDisabled
            const isSelected = day.isStart || day.isEnd

            return (
              <button
                key={index}
                onClick={() => handleDateClick(day)}
                onMouseEnter={() => setHoveredDate(day.dateStr)}
                onMouseLeave={() => setHoveredDate(null)}
                disabled={day.isDisabled}
                className={`
                  relative w-full aspect-square flex items-center justify-center text-sm font-medium
                  transition-all duration-100 ease-out
                  ${!day.isCurrentMonth ? 'text-gray-300' : 'text-gray-700'}
                  ${day.isDisabled ? 'text-gray-300 cursor-not-allowed' : ''}
                  ${day.isUnavailable && !day.isPast ? 'text-red-300 line-through' : ''}
                  ${day.isToday && !isSelected ? 'font-bold text-accent' : ''}
                  ${day.isSeasonal && !day.isDisabled && !isSelected && !day.isInRange && !day.isInHoverRange ? 'bg-amber-50' : ''}
                  ${day.isInRange || day.isInHoverRange ? 'bg-accent-50' : ''}
                  ${day.isStart ? 'bg-accent text-white rounded-l-full' : ''}
                  ${day.isEnd ? 'bg-accent text-white rounded-r-full' : ''}
                  ${day.isStart && !day.isEnd ? 'rounded-r-none' : ''}
                  ${day.isEnd && !day.isStart ? 'rounded-l-none' : ''}
                  ${isSelectable && !isSelected && !day.isInRange && !day.isInHoverRange ? 'hover:bg-accent-100 cursor-pointer' : ''}
                `}
              >
                <span className={`
                  w-10 h-10 flex items-center justify-center rounded-full
                  ${day.isStart || day.isEnd ? 'bg-accent text-white shadow-md' : ''}
                  ${day.isToday && !isSelected ? 'ring-2 ring-accent' : ''}
                `}>
                  {day.date.getDate()}
                </span>
              </button>
            )
          })}
        </div>

        {/* Legend */}
        <div className="px-4 py-3 bg-gray-50 border-t border-gray-100">
          <div className="flex flex-wrap gap-4 text-xs text-gray-500">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 bg-accent rounded-full"></div>
              <span>Selected</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 bg-accent-50 rounded"></div>
              <span>Your stay</span>
            </div>
            {seasonalDates.length > 0 && (
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 bg-amber-100 border border-amber-200 rounded"></div>
                <span>Peak season</span>
              </div>
            )}
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 bg-gray-200 rounded"></div>
              <span>Unavailable</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
          <div className="text-sm text-gray-500">
            {minStayNights > 1 && (
              <span>Min. {minStayNights} nights</span>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => {
                onStartDateChange('')
                onEndDateChange('')
                setSelectingEnd(false)
              }}
              className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-200 rounded-lg transition-colors"
            >
              Clear
            </button>
            <button
              onClick={() => setIsOpen(false)}
              className="px-4 py-2 text-sm bg-accent text-white rounded-lg hover:bg-accent-700 transition-colors font-medium"
            >
              Done
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes scaleIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        .animate-fadeIn { animation: fadeIn 0.2s ease-out; }
        .animate-scaleIn { animation: scaleIn 0.2s ease-out; }
      `}</style>
    </div>,
    document.body
  )

  return (
    <div className={className}>
      {!compact && (startLabel || endLabel) && (
        <div className="flex gap-4 mb-1.5">
          {startLabel && <label className="flex-1 text-sm font-medium text-gray-700">{startLabel}</label>}
          {endLabel && <label className="flex-1 text-sm font-medium text-gray-700">{endLabel}</label>}
        </div>
      )}
      <button
        ref={triggerRef}
        type="button"
        onClick={() => !disabled && setIsOpen(true)}
        disabled={disabled}
        className={`
          w-full flex items-center gap-2 px-4 py-3
          bg-white border-2 rounded-xl text-left
          transition-all duration-200 ease-out
          ${disabled ? 'opacity-50 cursor-not-allowed bg-gray-50' : 'hover:border-accent cursor-pointer'}
          ${error ? 'border-red-400' : 'border-gray-200'}
          ${isOpen ? 'border-accent ring-4 ring-accent/10' : ''}
        `}
      >
        <Calendar
          size={20}
          className={`${startDate || endDate ? 'text-accent' : 'text-gray-400'} flex-shrink-0`}
        />
        <div className="flex-1 flex items-center gap-2">
          <span className={`${startDate ? 'text-gray-900' : 'text-gray-400'}`}>
            {formatDisplay(startDate) || startPlaceholder}
          </span>
          <ArrowRight size={16} className="text-gray-300 flex-shrink-0" />
          <span className={`${endDate ? 'text-gray-900' : 'text-gray-400'}`}>
            {formatDisplay(endDate) || endPlaceholder}
          </span>
        </div>
        {nights > 0 && (
          <span className="text-xs text-accent font-medium bg-accent-50 px-2 py-1 rounded-full">
            {nights} {nights === 1 ? 'night' : 'nights'}
          </span>
        )}
      </button>
      {error && (
        <p className="mt-1.5 text-sm text-red-500">{error}</p>
      )}
      {modal}
    </div>
  )
}

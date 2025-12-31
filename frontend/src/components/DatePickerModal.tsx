import { useState, useMemo, useEffect, useRef } from 'react'
import { ChevronLeft, ChevronRight, Calendar, X } from 'lucide-react'
import { createPortal } from 'react-dom'

interface DatePickerModalProps {
  value: string
  onChange: (date: string) => void
  label?: string
  placeholder?: string
  minDate?: string
  maxDate?: string
  disabled?: boolean
  error?: string
  className?: string
  unavailableDates?: string[]
}

export default function DatePickerModal({
  value,
  onChange,
  label,
  placeholder = 'Select date',
  minDate,
  maxDate,
  disabled = false,
  error,
  className = '',
  unavailableDates = [],
}: DatePickerModalProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [currentMonth, setCurrentMonth] = useState(() => {
    if (value) {
      const d = new Date(value)
      return new Date(d.getFullYear(), d.getMonth(), 1)
    }
    const today = new Date()
    return new Date(today.getFullYear(), today.getMonth(), 1)
  })
  const triggerRef = useRef<HTMLButtonElement>(null)
  const modalRef = useRef<HTMLDivElement>(null)

  // Update currentMonth when value changes
  useEffect(() => {
    if (value) {
      const d = new Date(value)
      setCurrentMonth(new Date(d.getFullYear(), d.getMonth(), 1))
    }
  }, [value])

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false)
      }
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen])

  // Close on click outside
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
      isSelected: boolean
      isToday: boolean
      isUnavailable: boolean
    }> = []

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
        isSelected: dateStr === value,
        isToday: false,
        isUnavailable: unavailableSet.has(dateStr),
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
        isSelected: dateStr === value,
        isToday: dateStr === formatDateStr(today),
        isUnavailable: unavailableSet.has(dateStr),
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
        isSelected: dateStr === value,
        isToday: false,
        isUnavailable: unavailableSet.has(dateStr),
      })
    }

    return days
  }, [currentMonth, today, value, unavailableSet, minDate, maxDate])

  function formatDateStr(date: Date): string {
    return date.toISOString().split('T')[0]
  }

  function isDateDisabled(date: Date, dateStr: string): boolean {
    if (date < today) return true
    if (minDate && dateStr < minDate) return true
    if (maxDate && dateStr > maxDate) return true
    if (unavailableSet.has(dateStr)) return true
    return false
  }

  function handleDateClick(day: typeof calendarDays[0]) {
    if (day.isDisabled) return
    onChange(day.dateStr)
    setIsOpen(false)
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

  const displayValue = value
    ? new Date(value).toLocaleDateString('en-US', {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : ''

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
        className="relative bg-white rounded-2xl shadow-2xl w-[380px] max-w-[95vw] overflow-hidden animate-scaleIn"
        style={{
          animation: 'scaleIn 0.2s ease-out',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 bg-gradient-to-r from-accent to-accent-600 text-white">
          <div>
            <p className="text-sm opacity-90">Select Date</p>
            <p className="text-xl font-semibold">
              {value ? new Date(value).toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'short',
                day: 'numeric'
              }) : 'Choose a date'}
            </p>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="p-2 hover:bg-white/20 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
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
        <div className="grid grid-cols-7 gap-1 p-3">
          {calendarDays.map((day, index) => {
            const isSelectable = !day.isDisabled

            return (
              <button
                key={index}
                onClick={() => handleDateClick(day)}
                disabled={day.isDisabled}
                className={`
                  relative w-11 h-11 flex items-center justify-center rounded-full text-sm font-medium
                  transition-all duration-150 ease-out
                  ${!day.isCurrentMonth ? 'text-gray-300' : 'text-gray-700'}
                  ${day.isDisabled ? 'text-gray-300 cursor-not-allowed' : ''}
                  ${day.isUnavailable && !day.isPast ? 'text-red-300 line-through' : ''}
                  ${day.isToday && !day.isSelected ? 'ring-2 ring-accent ring-offset-1 text-accent font-bold' : ''}
                  ${day.isSelected ? 'bg-accent text-white shadow-lg shadow-accent/30 scale-110' : ''}
                  ${isSelectable && !day.isSelected ? 'hover:bg-accent-50 hover:text-accent cursor-pointer' : ''}
                `}
              >
                {day.date.getDate()}
              </button>
            )
          })}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-t border-gray-100">
          <button
            onClick={goToToday}
            className="text-sm text-accent hover:text-accent-700 font-medium transition-colors"
          >
            Today
          </button>
          <div className="flex gap-2">
            <button
              onClick={() => {
                onChange('')
                setIsOpen(false)
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
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.2s ease-out;
        }
        .animate-scaleIn {
          animation: scaleIn 0.2s ease-out;
        }
      `}</style>
    </div>,
    document.body
  )

  return (
    <div className={`${className}`}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          {label}
        </label>
      )}
      <button
        ref={triggerRef}
        type="button"
        onClick={() => !disabled && setIsOpen(true)}
        disabled={disabled}
        className={`
          w-full flex items-center gap-3 px-4 py-3
          bg-white border-2 rounded-xl text-left
          transition-all duration-200 ease-out
          ${disabled ? 'opacity-50 cursor-not-allowed bg-gray-50' : 'hover:border-accent cursor-pointer'}
          ${error ? 'border-red-400 focus:ring-red-400' : 'border-gray-200'}
          ${isOpen ? 'border-accent ring-4 ring-accent/10' : ''}
        `}
      >
        <Calendar
          size={20}
          className={`${value ? 'text-accent' : 'text-gray-400'} flex-shrink-0`}
        />
        <span className={`flex-1 ${value ? 'text-gray-900' : 'text-gray-400'}`}>
          {displayValue || placeholder}
        </span>
      </button>
      {error && (
        <p className="mt-1.5 text-sm text-red-500">{error}</p>
      )}
      {modal}
    </div>
  )
}

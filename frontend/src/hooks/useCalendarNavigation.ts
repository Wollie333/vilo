import { useState, useCallback, useMemo } from 'react'
import {
  addDays,
  addMonths,
  subDays,
  subMonths,
  startOfMonth,
  startOfWeek,
  endOfMonth,
  endOfWeek,
} from 'date-fns'

export type CalendarView = 'timeline' | 'month'

interface UseCalendarNavigationOptions {
  initialView?: CalendarView
  initialDate?: Date
  timelineDays?: number
}

interface UseCalendarNavigationReturn {
  view: CalendarView
  setView: (view: CalendarView) => void
  currentDate: Date
  setCurrentDate: (date: Date) => void
  goToToday: () => void
  goToPrev: () => void
  goToNext: () => void
  // Timeline-specific
  timelineStart: Date
  timelineDays: number
  timelineEnd: Date
  // Month-specific
  monthStart: Date
  monthEnd: Date
  calendarStart: Date // Start of the 6-week grid
  calendarEnd: Date // End of the 6-week grid
  // Visible range (depends on current view)
  visibleStart: Date
  visibleEnd: Date
}

export function useCalendarNavigation(
  options: UseCalendarNavigationOptions = {}
): UseCalendarNavigationReturn {
  const {
    initialView = 'timeline',
    initialDate = new Date(),
    timelineDays: defaultTimelineDays = 14,
  } = options

  const [view, setView] = useState<CalendarView>(initialView)
  const [currentDate, setCurrentDate] = useState<Date>(initialDate)
  const [timelineDays] = useState(defaultTimelineDays)

  // Timeline calculations
  const timelineStart = useMemo(() => {
    // Start timeline from the current date
    return currentDate
  }, [currentDate])

  const timelineEnd = useMemo(() => {
    return addDays(timelineStart, timelineDays)
  }, [timelineStart, timelineDays])

  // Month calculations
  const monthStart = useMemo(() => {
    return startOfMonth(currentDate)
  }, [currentDate])

  const monthEnd = useMemo(() => {
    return endOfMonth(currentDate)
  }, [currentDate])

  // Calendar grid start/end (for the 6-week grid in month view)
  const calendarStart = useMemo(() => {
    return startOfWeek(monthStart, { weekStartsOn: 0 })
  }, [monthStart])

  const calendarEnd = useMemo(() => {
    return endOfWeek(monthEnd, { weekStartsOn: 0 })
  }, [monthEnd])

  // Visible range depends on current view
  const visibleStart = useMemo(() => {
    return view === 'timeline' ? timelineStart : calendarStart
  }, [view, timelineStart, calendarStart])

  const visibleEnd = useMemo(() => {
    return view === 'timeline' ? timelineEnd : calendarEnd
  }, [view, timelineEnd, calendarEnd])

  // Navigation functions
  const goToToday = useCallback(() => {
    setCurrentDate(new Date())
  }, [])

  const goToPrev = useCallback(() => {
    if (view === 'timeline') {
      // Move back by 7 days (one week)
      setCurrentDate((prev) => subDays(prev, 7))
    } else {
      // Move back by one month
      setCurrentDate((prev) => subMonths(prev, 1))
    }
  }, [view])

  const goToNext = useCallback(() => {
    if (view === 'timeline') {
      // Move forward by 7 days (one week)
      setCurrentDate((prev) => addDays(prev, 7))
    } else {
      // Move forward by one month
      setCurrentDate((prev) => addMonths(prev, 1))
    }
  }, [view])

  return {
    view,
    setView,
    currentDate,
    setCurrentDate,
    goToToday,
    goToPrev,
    goToNext,
    timelineStart,
    timelineDays,
    timelineEnd,
    monthStart,
    monthEnd,
    calendarStart,
    calendarEnd,
    visibleStart,
    visibleEnd,
  }
}

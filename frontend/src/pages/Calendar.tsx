import { useState, useCallback, useEffect, useRef, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader2, Calendar as CalendarIcon, LayoutGrid, ChevronLeft, ChevronRight, Filter, X, Search, Keyboard, CalendarDays, Download, FileSpreadsheet, Check } from 'lucide-react'
import { format, addDays, parseISO } from 'date-fns'
import { useCalendarNavigation } from '../hooks/useCalendarNavigation'
import { useCalendarData, useBookingMutations } from '../hooks/useCalendarData'
import { useNotification } from '../contexts/NotificationContext'
import TimelineView from '../components/calendar/TimelineView/TimelineView'
import MonthView from '../components/calendar/MonthView/MonthView'
import DateRangePickerPanel from '../components/calendar/shared/DateRangePickerPanel'
import MiniCalendar from '../components/calendar/shared/MiniCalendar'
import type { Booking, BookingSource } from '../services/api'
import { BOOKING_SOURCE_DISPLAY } from '../services/api'
import { formatDateRange, formatMonthYear, hasBookingConflict, calculateResizedDates } from '../utils/calendarUtils'

export default function Calendar() {
  const navigate = useNavigate()
  const { showSuccess, showError } = useNotification()

  // Calendar navigation state
  const {
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
    visibleStart,
  } = useCalendarNavigation({ initialView: 'timeline', timelineDays: 14 })

  // Date range picker state
  const [showDateRangePicker, setShowDateRangePicker] = useState(false)
  const [dateRangeStart, setDateRangeStart] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [dateRangeEnd, setDateRangeEnd] = useState(format(addDays(new Date(), 7), 'yyyy-MM-dd'))

  // Calendar data
  const {
    bookings,
    rooms,
    loading,
    error,
    refetch,
  } = useCalendarData({ startDate: visibleStart, daysCount: timelineDays })

  // Booking mutations
  const { updateBooking, isUpdating } = useBookingMutations(refetch)

  // Filter state
  const [selectedRooms, setSelectedRooms] = useState<string[]>([])
  const [selectedStatuses, setSelectedStatuses] = useState<Booking['status'][]>([])
  const [selectedSources, setSelectedSources] = useState<BookingSource[]>([])
  const [showFilters, setShowFilters] = useState(false)

  // Legend and keyboard shortcuts
  const [showLegend, setShowLegend] = useState(false)
  const [showShortcuts, setShowShortcuts] = useState(false)
  const [showMiniCalendar, setShowMiniCalendar] = useState(false)
  const [miniCalendarMonth, setMiniCalendarMonth] = useState(new Date())
  const [showExportMenu, setShowExportMenu] = useState(false)
  const exportMenuRef = useRef<HTMLDivElement>(null)

  // Status configuration for interactive legend
  const statusConfig = useMemo(() => [
    { status: 'pending' as const, label: 'Pending', bg: 'bg-yellow-100', border: 'border-yellow-400' },
    { status: 'confirmed' as const, label: 'Confirmed', bg: 'bg-emerald-100', border: 'border-emerald-400' },
    { status: 'checked_in' as const, label: 'Checked In', bg: 'bg-blue-100', border: 'border-blue-400' },
    { status: 'occupied' as const, label: 'Occupied', bg: 'bg-teal-100', border: 'border-teal-400' },
    { status: 'checked_out' as const, label: 'Checked Out', bg: 'bg-purple-100', border: 'border-purple-400' },
    { status: 'cancelled' as const, label: 'Cancelled', bg: 'bg-red-100', border: 'border-red-400' },
    { status: 'completed' as const, label: 'Completed', bg: 'bg-gray-100', border: 'border-gray-400' },
  ], [])

  // Calculate booking counts per status
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    bookings.forEach(b => {
      counts[b.status] = (counts[b.status] || 0) + 1
    })
    return counts
  }, [bookings])

  // Calculate booking counts per source
  const sourceCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    bookings.forEach(b => {
      const source = b.source || 'vilo'
      counts[source] = (counts[source] || 0) + 1
    })
    return counts
  }, [bookings])

  // Available sources (only show sources that have bookings)
  const availableSources = useMemo(() => {
    const sources = new Set<BookingSource>()
    bookings.forEach(b => {
      sources.add(b.source || 'vilo')
    })
    return Array.from(sources).sort()
  }, [bookings])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Skip if user is typing in an input field
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return
      }

      // Don't trigger shortcuts with modifier keys (except for specific combos)
      if (e.metaKey || e.ctrlKey || e.altKey) {
        return
      }

      switch (e.key.toLowerCase()) {
        case 't':
          e.preventDefault()
          goToToday()
          break
        case 'arrowleft':
          e.preventDefault()
          goToPrev()
          break
        case 'arrowright':
          e.preventDefault()
          goToNext()
          break
        case 'm':
          e.preventDefault()
          setView('month')
          break
        case 'w':
          e.preventDefault()
          setView('timeline')
          break
        case 'escape':
          e.preventDefault()
          setShowDateRangePicker(false)
          setShowFilters(false)
          setShowLegend(false)
          setShowShortcuts(false)
          break
        case 'f':
          e.preventDefault()
          setShowFilters(prev => !prev)
          break
        case 'l':
          e.preventDefault()
          setShowLegend(prev => !prev)
          break
        case '?':
          e.preventDefault()
          setShowShortcuts(prev => !prev)
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [goToToday, goToPrev, goToNext, setView])

  // Close export menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target as Node)) {
        setShowExportMenu(false)
      }
    }
    if (showExportMenu) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showExportMenu])

  // Handle mini calendar date click
  const handleMiniCalendarDateClick = useCallback((date: Date) => {
    setCurrentDate(date)
    setShowMiniCalendar(false)
  }, [setCurrentDate])

  // Filter bookings based on selected filters
  const filteredRooms = selectedRooms.length > 0
    ? rooms.filter(r => selectedRooms.includes(r.id!))
    : rooms

  const filterBookings = useCallback((bookingList: Booking[]) => {
    let filtered = bookingList

    if (selectedRooms.length > 0) {
      filtered = filtered.filter(b => selectedRooms.includes(b.room_id))
    }

    if (selectedStatuses.length > 0) {
      filtered = filtered.filter(b => selectedStatuses.includes(b.status))
    }

    if (selectedSources.length > 0) {
      filtered = filtered.filter(b => selectedSources.includes(b.source || 'vilo'))
    }

    return filtered
  }, [selectedRooms, selectedStatuses, selectedSources])

  // Export bookings to CSV
  const exportToCSV = useCallback(() => {
    const filtered = filterBookings(bookings)
    if (filtered.length === 0) {
      showError('No Data', 'No bookings to export')
      return
    }

    const headers = ['Guest Name', 'Room', 'Check In', 'Check Out', 'Status', 'Total Amount', 'Payment Status']
    const rows = filtered.map(b => {
      const room = rooms.find(r => r.id === b.room_id)
      return [
        b.guest_name,
        room?.name || 'Unknown',
        format(new Date(b.check_in), 'yyyy-MM-dd'),
        format(new Date(b.check_out), 'yyyy-MM-dd'),
        b.status.replace('_', ' '),
        b.total_amount?.toFixed(2) || '0.00',
        b.payment_status?.replace('_', ' ') || 'unpaid'
      ]
    })

    const csvContent = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `bookings-${format(new Date(), 'yyyy-MM-dd')}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    setShowExportMenu(false)
    showSuccess('Exported', 'Bookings exported to CSV')
  }, [bookings, rooms, filterBookings, showSuccess, showError])

  // Print calendar view
  const handlePrint = useCallback(() => {
    setShowExportMenu(false)
    window.print()
  }, [])

  // Handle booking click - navigate to booking detail
  const handleBookingClick = useCallback((booking: Booking) => {
    navigate(`/dashboard/bookings/${booking.id}`)
  }, [navigate])

  // Handle empty cell click - navigate to booking form with pre-filled data
  const handleEmptyCellClick = useCallback((roomId: string, date: string) => {
    // Navigate to the booking wizard with pre-filled room and date
    const searchParams = new URLSearchParams({
      room_id: roomId,
      check_in: date,
    })
    navigate(`/dashboard/bookings/new?${searchParams.toString()}`)
  }, [navigate])

  // Handle booking drag (move dates)
  const handleBookingDrag = useCallback(async (
    booking: Booking,
    newCheckIn: string,
    newCheckOut: string,
    newRoomId?: string
  ) => {
    // Check for conflicts
    const conflict = hasBookingConflict(
      {
        check_in: newCheckIn,
        check_out: newCheckOut,
        room_id: newRoomId || booking.room_id,
        id: booking.id,
      },
      bookings
    )

    if (conflict) {
      showError(
        'Booking Conflict',
        `This would overlap with ${conflict.guest_name}'s booking`
      )
      return false
    }

    try {
      await updateBooking(booking.id!, {
        check_in: newCheckIn,
        check_out: newCheckOut,
        ...(newRoomId && newRoomId !== booking.room_id ? { room_id: newRoomId } : {}),
      })
      showSuccess('Booking Updated', 'Dates have been changed successfully')
      return true
    } catch {
      showError('Update Failed', 'Could not update booking dates')
      return false
    }
  }, [bookings, updateBooking, showSuccess, showError])

  // Handle booking resize
  const handleBookingResize = useCallback(async (
    booking: Booking,
    direction: 'start' | 'end',
    daysDelta: number
  ) => {
    const newDates = calculateResizedDates(booking, direction, daysDelta)

    // Check for conflicts
    const conflict = hasBookingConflict(
      {
        check_in: newDates.check_in,
        check_out: newDates.check_out,
        room_id: booking.room_id,
        id: booking.id,
      },
      bookings
    )

    if (conflict) {
      showError(
        'Booking Conflict',
        `This would overlap with ${conflict.guest_name}'s booking`
      )
      return false
    }

    try {
      await updateBooking(booking.id!, newDates)
      showSuccess('Booking Updated', 'Duration has been changed successfully')
      return true
    } catch {
      showError('Update Failed', 'Could not update booking duration')
      return false
    }
  }, [bookings, updateBooking, showSuccess, showError])

  // Handle status change from context menu
  const handleStatusChange = useCallback(async (bookingId: string, status: Booking['status']) => {
    try {
      await updateBooking(bookingId, { status })
      showSuccess('Status Updated', `Booking status changed to ${status.replace('_', ' ')}`)
    } catch {
      showError('Update Failed', 'Could not update booking status')
    }
  }, [updateBooking, showSuccess, showError])

  // Toggle room filter
  const toggleRoomFilter = (roomId: string) => {
    setSelectedRooms(prev =>
      prev.includes(roomId)
        ? prev.filter(id => id !== roomId)
        : [...prev, roomId]
    )
  }

  // Toggle status filter
  const toggleStatusFilter = (status: Booking['status']) => {
    setSelectedStatuses(prev =>
      prev.includes(status)
        ? prev.filter(s => s !== status)
        : [...prev, status]
    )
  }

  // Toggle source filter
  const toggleSourceFilter = (source: BookingSource) => {
    setSelectedSources(prev =>
      prev.includes(source)
        ? prev.filter(s => s !== source)
        : [...prev, source]
    )
  }

  // Clear all filters
  const clearFilters = () => {
    setSelectedRooms([])
    setSelectedStatuses([])
    setSelectedSources([])
  }

  const statuses: Booking['status'][] = ['pending', 'confirmed', 'checked_in', 'checked_out', 'cancelled', 'completed']

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center">
        <p className="text-red-600 mb-4">{error}</p>
        <button
          onClick={refetch}
          className="px-4 py-2 bg-black text-white rounded-lg hover:opacity-90"
        >
          Try Again
        </button>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col p-6">
      {/* Header */}
      <div className="flex-shrink-0 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Calendar</h1>
          <p className="text-gray-600 mt-1">
            View and manage room availability and bookings
          </p>
        </div>

        {/* View Toggle */}
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-gray-300 overflow-hidden">
            <button
              onClick={() => setView('timeline')}
              className={`px-4 py-2 text-sm font-medium flex items-center gap-2 transition-colors ${
                view === 'timeline'
                  ? 'bg-black text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              <LayoutGrid className="w-4 h-4" />
              Timeline
            </button>
            <button
              onClick={() => setView('month')}
              className={`px-4 py-2 text-sm font-medium flex items-center gap-2 transition-colors ${
                view === 'month'
                  ? 'bg-black text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              <CalendarIcon className="w-4 h-4" />
              Month
            </button>
          </div>
        </div>
      </div>

      {/* Navigation and Filters */}
      <div className="flex-shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white rounded-lg border border-gray-200 p-4 mb-4">
        {/* Date Navigation */}
        <div className="flex items-center gap-4">
          <button
            onClick={goToToday}
            className="px-3 py-1.5 text-sm font-medium border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700"
          >
            Today
          </button>

          <button
            onClick={() => setShowDateRangePicker(!showDateRangePicker)}
            className={`px-3 py-1.5 text-sm font-medium border rounded-lg flex items-center gap-2 transition-colors ${
              showDateRangePicker
                ? 'border-blue-500 bg-blue-50 text-blue-600'
                : 'border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            <Search className="w-4 h-4" />
            Select Dates
          </button>

          <div className="flex items-center gap-1">
            <button
              onClick={goToPrev}
              className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-600"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={goToNext}
              className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-600"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          <h2 className="text-lg font-medium text-gray-900">
            {view === 'timeline'
              ? formatDateRange(timelineStart, timelineEnd)
              : formatMonthYear(currentDate)}
          </h2>
        </div>

        {/* Filter Toggle and Tools */}
        <div className="flex items-center gap-2">
          {(selectedRooms.length > 0 || selectedStatuses.length > 0 || selectedSources.length > 0) && (
            <button
              onClick={clearFilters}
              className="px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-lg flex items-center gap-1"
            >
              <X className="w-4 h-4" />
              Clear Filters
            </button>
          )}

          {/* Legend Toggle */}
          <button
            onClick={() => setShowLegend(!showLegend)}
            className={`px-3 py-1.5 text-sm font-medium border rounded-lg flex items-center gap-2 transition-colors ${
              showLegend
                ? 'border-black bg-black text-white'
                : 'border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
            title="Toggle legend (L)"
          >
            <div className="flex gap-0.5">
              <div className="w-2 h-2 rounded-full bg-yellow-400" />
              <div className="w-2 h-2 rounded-full bg-emerald-400" />
              <div className="w-2 h-2 rounded-full bg-blue-400" />
            </div>
            <span className="hidden sm:inline">Legend</span>
          </button>

          {/* Mini Calendar Toggle */}
          <button
            onClick={() => setShowMiniCalendar(!showMiniCalendar)}
            className={`p-1.5 text-sm font-medium border rounded-lg transition-colors ${
              showMiniCalendar
                ? 'border-black bg-black text-white'
                : 'border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
            title="Quick date picker"
          >
            <CalendarDays className="w-4 h-4" />
          </button>

          {/* Export Menu */}
          <div className="relative" ref={exportMenuRef}>
            <button
              onClick={() => setShowExportMenu(!showExportMenu)}
              className={`p-1.5 text-sm font-medium border rounded-lg transition-colors ${
                showExportMenu
                  ? 'border-black bg-black text-white'
                  : 'border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
              title="Export options"
            >
              <Download className="w-4 h-4" />
            </button>
            {showExportMenu && (
              <div className="absolute right-0 top-full mt-1 bg-white rounded-lg shadow-lg border border-gray-200 py-1 min-w-[160px] z-20">
                <button
                  onClick={exportToCSV}
                  className="w-full px-4 py-2 text-sm text-left text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  Export to CSV
                </button>
                <button
                  onClick={handlePrint}
                  className="w-full px-4 py-2 text-sm text-left text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Print View
                </button>
              </div>
            )}
          </div>

          {/* Keyboard Shortcuts */}
          <button
            onClick={() => setShowShortcuts(!showShortcuts)}
            className={`p-1.5 text-sm font-medium border rounded-lg transition-colors ${
              showShortcuts
                ? 'border-black bg-black text-white'
                : 'border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
            title="Keyboard shortcuts (?)"
          >
            <Keyboard className="w-4 h-4" />
          </button>

          {/* Filters */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`px-3 py-1.5 text-sm font-medium border rounded-lg flex items-center gap-2 transition-colors ${
              showFilters || selectedRooms.length > 0 || selectedStatuses.length > 0
                ? 'border-black bg-black text-white'
                : 'border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            <Filter className="w-4 h-4" />
            Filters
            {(selectedRooms.length > 0 || selectedStatuses.length > 0) && (
              <span className="bg-white text-black text-xs rounded-full px-1.5">
                {selectedRooms.length + selectedStatuses.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Date Range Picker Panel */}
      {showDateRangePicker && (
        <DateRangePickerPanel
          startDate={dateRangeStart}
          endDate={dateRangeEnd}
          onStartDateChange={setDateRangeStart}
          onEndDateChange={setDateRangeEnd}
          onGoToRange={() => {
            setCurrentDate(parseISO(dateRangeStart))
            setShowDateRangePicker(false)
          }}
          onCreateBooking={() => {
            // Navigate to booking form with pre-filled dates
            const searchParams = new URLSearchParams({
              check_in: dateRangeStart,
              check_out: dateRangeEnd,
            })
            navigate(`/dashboard/bookings/new?${searchParams.toString()}`)
          }}
          bookings={bookings}
          rooms={rooms}
        />
      )}

      {/* Legend Panel - Interactive Status Filter */}
      {showLegend && (
        <div className="flex-shrink-0 bg-white rounded-lg border border-gray-200 p-4 mb-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-medium text-gray-900">Filter by Status</h3>
              {selectedStatuses.length > 0 && (
                <span className="text-xs text-gray-500">
                  Showing {selectedStatuses.length} of {statusConfig.length}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {selectedStatuses.length > 0 && (
                <button
                  onClick={() => setSelectedStatuses([])}
                  className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                >
                  Show All
                </button>
              )}
              <button
                onClick={() => setShowLegend(false)}
                className="p-1 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {statusConfig.map(({ status, label, bg, border }) => {
              const isActive = selectedStatuses.length === 0 || selectedStatuses.includes(status)
              const count = statusCounts[status] || 0
              return (
                <button
                  key={status}
                  onClick={() => toggleStatusFilter(status)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all ${
                    isActive
                      ? 'border-gray-300 bg-white hover:bg-gray-50'
                      : 'border-gray-200 bg-gray-50 opacity-50 hover:opacity-75'
                  }`}
                >
                  <div className={`w-3 h-3 rounded ${bg} border ${border}`} />
                  <span className="text-sm text-gray-700">{label}</span>
                  <span className="text-xs text-gray-400">({count})</span>
                  {selectedStatuses.includes(status) && (
                    <Check className="w-3 h-3 text-emerald-500" />
                  )}
                </button>
              )
            })}
          </div>

          {/* Source Filter Section */}
          {availableSources.length > 0 && (
            <>
              <div className="border-t border-gray-100 my-3" />
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-medium text-gray-900">Filter by Source</h4>
                  {selectedSources.length > 0 && (
                    <span className="text-xs text-gray-500">
                      Showing {selectedSources.length} of {availableSources.length}
                    </span>
                  )}
                </div>
                {selectedSources.length > 0 && (
                  <button
                    onClick={() => setSelectedSources([])}
                    className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                  >
                    Show All
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {availableSources.map(source => {
                  const sourceInfo = BOOKING_SOURCE_DISPLAY[source]
                  const isActive = selectedSources.length === 0 || selectedSources.includes(source)
                  const count = sourceCounts[source] || 0
                  return (
                    <button
                      key={source}
                      onClick={() => toggleSourceFilter(source)}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all ${
                        isActive
                          ? 'border-gray-300 bg-white hover:bg-gray-50'
                          : 'border-gray-200 bg-gray-50 opacity-50 hover:opacity-75'
                      }`}
                    >
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: sourceInfo?.color || '#6B7280' }}
                      />
                      <span className="text-sm text-gray-700">{sourceInfo?.label || source}</span>
                      <span className="text-xs text-gray-400">({count})</span>
                      {selectedSources.includes(source) && (
                        <Check className="w-3 h-3 text-emerald-500" />
                      )}
                    </button>
                  )
                })}
              </div>
            </>
          )}
        </div>
      )}

      {/* Keyboard Shortcuts Modal */}
      {showShortcuts && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowShortcuts(false)}>
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4 p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Keyboard Shortcuts</h3>
              <button
                onClick={() => setShowShortcuts(false)}
                className="p-1 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-700">Jump to today</span>
                <kbd className="px-2 py-1 bg-gray-100 border border-gray-300 rounded text-sm font-mono">T</kbd>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-700">Previous period</span>
                <kbd className="px-2 py-1 bg-gray-100 border border-gray-300 rounded text-sm font-mono">←</kbd>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-700">Next period</span>
                <kbd className="px-2 py-1 bg-gray-100 border border-gray-300 rounded text-sm font-mono">→</kbd>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-700">Month view</span>
                <kbd className="px-2 py-1 bg-gray-100 border border-gray-300 rounded text-sm font-mono">M</kbd>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-700">Timeline view</span>
                <kbd className="px-2 py-1 bg-gray-100 border border-gray-300 rounded text-sm font-mono">W</kbd>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-700">Toggle filters</span>
                <kbd className="px-2 py-1 bg-gray-100 border border-gray-300 rounded text-sm font-mono">F</kbd>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-700">Toggle legend</span>
                <kbd className="px-2 py-1 bg-gray-100 border border-gray-300 rounded text-sm font-mono">L</kbd>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-700">Close panels</span>
                <kbd className="px-2 py-1 bg-gray-100 border border-gray-300 rounded text-sm font-mono">Esc</kbd>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-700">Show shortcuts</span>
                <kbd className="px-2 py-1 bg-gray-100 border border-gray-300 rounded text-sm font-mono">?</kbd>
              </div>
            </div>
            <p className="mt-4 text-xs text-gray-500 text-center">
              Press <kbd className="px-1 bg-gray-100 border rounded text-xs">Esc</kbd> to close
            </p>
          </div>
        </div>
      )}

      {/* Filter Panel */}
      {showFilters && (
        <div className="flex-shrink-0 bg-white rounded-lg border border-gray-200 p-4 mb-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Room Filter */}
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-3">Rooms</h3>
              <div className="flex flex-wrap gap-2">
                {rooms.map(room => (
                  <button
                    key={room.id}
                    onClick={() => toggleRoomFilter(room.id!)}
                    className={`px-3 py-1.5 text-sm rounded-full border transition-colors ${
                      selectedRooms.includes(room.id!)
                        ? 'bg-black text-white border-black'
                        : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {room.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Status Filter */}
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-3">Status</h3>
              <div className="flex flex-wrap gap-2">
                {statuses.map(status => (
                  <button
                    key={status}
                    onClick={() => toggleStatusFilter(status)}
                    className={`px-3 py-1.5 text-sm rounded-full border transition-colors capitalize ${
                      selectedStatuses.includes(status)
                        ? 'bg-black text-white border-black'
                        : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {status.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mini Calendar Panel */}
      {showMiniCalendar && (
        <div className="flex-shrink-0 mb-4 flex justify-end">
          <MiniCalendar
            currentDate={miniCalendarMonth}
            viewStartDate={timelineStart}
            viewEndDate={timelineEnd}
            bookings={bookings}
            onDateClick={handleMiniCalendarDateClick}
            onMonthChange={setMiniCalendarMonth}
          />
        </div>
      )}

      {/* Calendar View */}
      <div className="flex-1 min-h-0 bg-white rounded-lg border border-gray-200 overflow-hidden">
        {view === 'timeline' ? (
          <TimelineView
            rooms={filteredRooms}
            bookings={filterBookings(bookings)}
            startDate={timelineStart}
            daysCount={timelineDays}
            onBookingClick={handleBookingClick}
            onEmptyCellClick={handleEmptyCellClick}
            onBookingDrag={handleBookingDrag}
            onBookingResize={handleBookingResize}
            isUpdating={isUpdating}
            onStatusChange={handleStatusChange}
            onSwipePrev={goToPrev}
            onSwipeNext={goToNext}
          />
        ) : (
          <MonthView
            currentDate={currentDate}
            bookings={filterBookings(bookings)}
            rooms={rooms}
            onBookingClick={handleBookingClick}
            onDayClick={(date) => {
              const searchParams = new URLSearchParams({
                check_in: format(date, 'yyyy-MM-dd'),
              })
              navigate(`/dashboard/bookings/new?${searchParams.toString()}`)
            }}
          />
        )}
      </div>
    </div>
  )
}

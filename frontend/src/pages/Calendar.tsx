import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader2, Calendar as CalendarIcon, LayoutGrid, ChevronLeft, ChevronRight, Filter, X, Search } from 'lucide-react'
import { format, addDays, parseISO } from 'date-fns'
import { useCalendarNavigation } from '../hooks/useCalendarNavigation'
import { useCalendarData, useBookingMutations } from '../hooks/useCalendarData'
import { useNotification } from '../contexts/NotificationContext'
import TimelineView from '../components/calendar/TimelineView/TimelineView'
import MonthView from '../components/calendar/MonthView/MonthView'
import DateRangePickerPanel from '../components/calendar/shared/DateRangePickerPanel'
import type { Booking } from '../services/api'
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
  const [showFilters, setShowFilters] = useState(false)

  
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

    return filtered
  }, [selectedRooms, selectedStatuses])

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

  // Clear all filters
  const clearFilters = () => {
    setSelectedRooms([])
    setSelectedStatuses([])
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

        {/* Filter Toggle */}
        <div className="flex items-center gap-2">
          {(selectedRooms.length > 0 || selectedStatuses.length > 0) && (
            <button
              onClick={clearFilters}
              className="px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-lg flex items-center gap-1"
            >
              <X className="w-4 h-4" />
              Clear Filters
            </button>
          )}
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

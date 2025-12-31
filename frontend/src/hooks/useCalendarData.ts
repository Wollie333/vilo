import { useState, useEffect, useCallback, useMemo } from 'react'
import { bookingsApi, roomsApi, type Booking, type Room } from '../services/api'
import { groupBookingsByRoom, isBookingVisible, getBookingsForDate } from '../utils/calendarUtils'
import { useAuth } from '../contexts/AuthContext'

interface UseCalendarDataOptions {
  startDate: Date
  daysCount?: number // For timeline view
}

interface UseCalendarDataReturn {
  bookings: Booking[]
  rooms: Room[]
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
  bookingsByRoom: Map<string, Booking[]>
  getVisibleBookingsForRoom: (roomId: string) => Booking[]
  getBookingsForDay: (date: Date) => Booking[]
}

export function useCalendarData(options: UseCalendarDataOptions): UseCalendarDataReturn {
  const { startDate, daysCount = 30 } = options
  const { tenant, tenantLoading } = useAuth()

  const [bookings, setBookings] = useState<Booking[]>([])
  const [rooms, setRooms] = useState<Room[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const [bookingsData, roomsData] = await Promise.all([
        bookingsApi.getAll(),
        roomsApi.getAll({ is_active: true }),
      ])

      setBookings(bookingsData)
      setRooms(roomsData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load calendar data')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    // Wait for tenant to be loaded before fetching calendar data
    if (!tenantLoading && tenant) {
      fetchData()
    } else if (!tenantLoading && !tenant) {
      setLoading(false)
    }
  }, [fetchData, tenant, tenantLoading])

  // Group bookings by room (memoized)
  const bookingsByRoom = useMemo(() => {
    return groupBookingsByRoom(bookings, rooms)
  }, [bookings, rooms])

  // Get bookings visible in the current timeline range for a room
  const getVisibleBookingsForRoom = useCallback(
    (roomId: string): Booking[] => {
      const roomBookings = bookingsByRoom.get(roomId) || []
      return roomBookings.filter((booking) =>
        isBookingVisible(booking, startDate, daysCount)
      )
    },
    [bookingsByRoom, startDate, daysCount]
  )

  // Get all bookings for a specific day
  const getBookingsForDay = useCallback(
    (date: Date): Booking[] => {
      return getBookingsForDate(bookings, date)
    },
    [bookings]
  )

  return {
    bookings,
    rooms,
    loading,
    error,
    refetch: fetchData,
    bookingsByRoom,
    getVisibleBookingsForRoom,
    getBookingsForDay,
  }
}

// Hook for updating bookings (create, update, delete)
interface UseBookingMutationsReturn {
  updateBooking: (id: string, changes: Partial<Booking>) => Promise<Booking>
  createBooking: (booking: Omit<Booking, 'id'>) => Promise<Booking>
  deleteBooking: (id: string) => Promise<void>
  isUpdating: boolean
  updateError: string | null
}

export function useBookingMutations(onSuccess?: () => void): UseBookingMutationsReturn {
  const [isUpdating, setIsUpdating] = useState(false)
  const [updateError, setUpdateError] = useState<string | null>(null)

  const updateBooking = useCallback(
    async (id: string, changes: Partial<Booking>): Promise<Booking> => {
      setIsUpdating(true)
      setUpdateError(null)

      try {
        const updated = await bookingsApi.update(id, changes)
        onSuccess?.()
        return updated
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to update booking'
        setUpdateError(message)
        throw err
      } finally {
        setIsUpdating(false)
      }
    },
    [onSuccess]
  )

  const createBooking = useCallback(
    async (booking: Omit<Booking, 'id'>): Promise<Booking> => {
      setIsUpdating(true)
      setUpdateError(null)

      try {
        const created = await bookingsApi.create(booking)
        onSuccess?.()
        return created
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to create booking'
        setUpdateError(message)
        throw err
      } finally {
        setIsUpdating(false)
      }
    },
    [onSuccess]
  )

  const deleteBooking = useCallback(
    async (id: string): Promise<void> => {
      setIsUpdating(true)
      setUpdateError(null)

      try {
        await bookingsApi.delete(id)
        onSuccess?.()
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to delete booking'
        setUpdateError(message)
        throw err
      } finally {
        setIsUpdating(false)
      }
    },
    [onSuccess]
  )

  return {
    updateBooking,
    createBooking,
    deleteBooking,
    isUpdating,
    updateError,
  }
}

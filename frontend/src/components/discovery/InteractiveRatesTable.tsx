import { useState, useEffect, useCallback, useRef } from 'react'
import { ChevronLeft, ChevronRight, Calendar, Users } from 'lucide-react'
import { Link } from 'react-router-dom'
import { discoveryApi } from '../../services/discoveryApi'
import type { Room } from '../../services/discoveryApi'

interface InteractiveRatesTableProps {
  rooms: Room[]
  propertySlug: string
  currency?: string
}

interface RoomDateData {
  price: number | null
  available: boolean
  rateName?: string | null
}

export default function InteractiveRatesTable({
  rooms,
  propertySlug,
  currency = 'ZAR'
}: InteractiveRatesTableProps) {
  const [startDate, setStartDate] = useState<Date>(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return today
  })
  const [debouncedStartDate, setDebouncedStartDate] = useState<Date>(startDate)
  const [loading, setLoading] = useState(true)
  const [roomData, setRoomData] = useState<Map<string, Map<string, RoomDateData>>>(new Map())

  // Debounce startDate changes to avoid rapid API calls
  useEffect(() => {
    // Show loading immediately when date changes
    setLoading(true)

    const timer = setTimeout(() => {
      setDebouncedStartDate(startDate)
    }, 300) // Wait 300ms after last change

    return () => clearTimeout(timer)
  }, [startDate])

  const formatDate = (date: Date) => {
    // Use local date parts to avoid timezone issues
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  const formatDayName = (date: Date) => {
    return date.toLocaleDateString('en-US', { weekday: 'short' })
  }

  const formatDayNumber = (date: Date) => {
    const day = date.getDate()
    const suffix = day === 1 || day === 21 || day === 31 ? 'st'
                 : day === 2 || day === 22 ? 'nd'
                 : day === 3 || day === 23 ? 'rd'
                 : 'th'
    return `${day}${suffix} ${date.toLocaleDateString('en-US', { month: 'short' })}`
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price)
  }

  // Generate 5 visible dates from debouncedStartDate (so headers match fetched data)
  const getVisibleDates = useCallback(() => {
    return Array.from({ length: 5 }, (_, i) => {
      const date = new Date(debouncedStartDate)
      date.setDate(date.getDate() + i)
      return date
    })
  }, [debouncedStartDate])

  const visibleDates = getVisibleDates()

  // Track current request to avoid race conditions
  const requestIdRef = useRef(0)
  // Track last fetched date range to avoid resetting prices
  const lastFetchedDateRef = useRef<string | null>(null)

  // Fetch data when debouncedStartDate changes
  useEffect(() => {
    if (rooms.length === 0) {
      setLoading(false)
      return
    }

    // Increment request ID to track this specific request
    const currentRequestId = ++requestIdRef.current
    console.log('[RatesTable] Fetching prices for startDate:', formatDate(debouncedStartDate), '(requestId:', currentRequestId, ')')

    // Generate dates for this effect run
    const dates = Array.from({ length: 5 }, (_, i) => {
      const date = new Date(debouncedStartDate)
      date.setDate(date.getDate() + i)
      return date
    })

    // Set base prices immediately for instant display (only if date range changed)
    const firstDateStr = formatDate(dates[0])
    const needsBasePrices = lastFetchedDateRef.current !== firstDateStr

    if (needsBasePrices) {
      const basePriceData = new Map<string, Map<string, RoomDateData>>()
      for (const room of rooms) {
        const dateMap = new Map<string, RoomDateData>()
        for (const date of dates) {
          const dateStr = formatDate(date)
          dateMap.set(dateStr, {
            price: room.basePrice,
            available: true,
            rateName: null
          })
        }
        basePriceData.set(room.id, dateMap)
      }
      setRoomData(basePriceData)
    }
    setLoading(false)

    // Fetch actual pricing (batched - 1 call per room for entire date range)
    const fetchPricing = async () => {
      const fetchedData = new Map<string, Map<string, RoomDateData>>()

      // Calculate date range for batch call
      const startDateStr = formatDate(dates[0])
      const endDate = new Date(dates[dates.length - 1])
      endDate.setDate(endDate.getDate() + 1) // checkOut is exclusive
      const endDateStr = formatDate(endDate)

      try {
        await Promise.all(rooms.map(async (room) => {
          const dateMap = new Map<string, RoomDateData>()

          try {
            // Fetch pricing and availability in parallel
            const [pricingResult, availResult] = await Promise.all([
              discoveryApi.getPricing(propertySlug, room.id, startDateStr, endDateStr),
              discoveryApi.checkAvailability(propertySlug, room.id, startDateStr, endDateStr)
            ])

            // Check if room is actually booked out (ignore min_stay for rates table)
            // available_units > 0 means there's physical availability
            const isRoomAvailable = availResult.available_units > 0

            // Map each night's data
            for (const night of pricingResult.nights) {
              dateMap.set(night.date, {
                price: night.price,
                available: isRoomAvailable,
                rateName: night.rate_name
              })
            }
          } catch {
            // Fallback to base prices on error
            for (const date of dates) {
              const dateStr = formatDate(date)
              dateMap.set(dateStr, {
                price: room.basePrice,
                available: true,
                rateName: null
              })
            }
          }

          fetchedData.set(room.id, dateMap)
        }))

        // Only update if this is still the current request
        if (currentRequestId !== requestIdRef.current) {
          console.log('[RatesTable] Ignoring stale response for requestId:', currentRequestId)
          return
        }

        lastFetchedDateRef.current = firstDateStr
        setRoomData(fetchedData)
      } catch (error) {
        console.error('Error fetching pricing:', error)
      }
    }

    fetchPricing()
  }, [rooms, propertySlug, debouncedStartDate])

  const shiftDates = (days: number) => {
    const newDate = new Date(startDate)
    newDate.setDate(newDate.getDate() + days)

    // Don't allow going before today
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    if (newDate < today) return

    setStartDate(newDate)
  }

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDate = new Date(e.target.value)
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    if (newDate >= today) {
      setStartDate(newDate)
    }
  }

  if (rooms.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        No rooms available
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Date picker row */}
      <div className="flex items-center justify-between">
        <div>
          <label className="block text-sm text-gray-500 mb-1">Check-in</label>
          <div className="relative">
            <input
              type="date"
              value={formatDate(startDate)}
              onChange={handleDateChange}
              min={formatDate(new Date())}
              className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          </div>
        </div>

        {/* Navigation arrows */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => shiftDates(-5)}
            disabled={loading}
            className="p-2 rounded-full border border-gray-200 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            aria-label="Previous 5 days"
          >
            <ChevronLeft className="w-5 h-5 text-gray-600" />
          </button>
          <button
            onClick={() => shiftDates(5)}
            disabled={loading}
            className="p-2 rounded-full border border-gray-200 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            aria-label="Next 5 days"
          >
            <ChevronRight className="w-5 h-5 text-gray-600" />
          </button>
        </div>
      </div>

      {/* Rates table */}
      <div className="overflow-x-auto border border-gray-200 rounded-xl">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left py-3 px-4 font-medium text-gray-700 min-w-[180px]">
                Room Type
              </th>
              {visibleDates.map((date) => (
                <th key={formatDate(date)} className="text-center py-3 px-3 min-w-[100px]">
                  <div className="font-medium text-gray-700">{formatDayName(date)}</div>
                  <div className="text-xs text-gray-500 font-normal">{formatDayNumber(date)}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rooms.map((room, roomIndex) => (
              <tr
                key={room.id}
                className={roomIndex !== rooms.length - 1 ? 'border-b border-gray-100' : ''}
              >
                {/* Room info column */}
                <td className="py-4 px-4">
                  <div className="font-medium text-gray-900">{room.name}</div>
                  <div className="flex items-center gap-1 text-sm text-gray-500 mt-0.5">
                    <Users className="w-3.5 h-3.5" />
                    <span>Sleeps up to {room.maxGuests} {room.maxGuests === 1 ? 'person' : 'people'}</span>
                  </div>
                </td>

                {/* Date cells */}
                {visibleDates.map((date) => {
                  const dateStr = formatDate(date)
                  const data = roomData.get(room.id)?.get(dateStr)
                  const isAvailable = data?.available ?? true
                  const price = data?.price ?? room.basePrice

                  return (
                    <td key={dateStr} className="py-3 px-2 text-center">
                      {loading ? (
                        <div className="animate-pulse">
                          <div className="h-5 bg-gray-200 rounded w-16 mx-auto mb-1"></div>
                          <div className="h-3 bg-gray-100 rounded w-12 mx-auto"></div>
                        </div>
                      ) : (
                        <Link
                          to={`/accommodation/${propertySlug}/book?room=${room.id}&checkIn=${dateStr}`}
                          className={`block p-2 rounded-lg transition-colors group ${
                            isAvailable
                              ? 'bg-emerald-50 hover:bg-emerald-100'
                              : 'bg-gray-50 hover:bg-gray-100'
                          }`}
                        >
                          <div className={`font-semibold ${
                            isAvailable
                              ? 'text-gray-900 group-hover:text-emerald-700'
                              : 'text-gray-500'
                          }`}>
                            {formatPrice(price)}
                          </div>
                          <div className="text-xs text-gray-500">per night</div>
                          {data?.rateName && (
                            <div className="text-xs text-emerald-600 mt-0.5 truncate" title={data.rateName}>
                              {data.rateName}
                            </div>
                          )}
                        </Link>
                      )}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-gray-400 text-center">
        Click on a rate to book. Prices may vary based on seasonal rates.
      </p>
    </div>
  )
}

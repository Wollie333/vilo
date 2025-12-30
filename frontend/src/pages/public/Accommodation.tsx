import { useState, useEffect, useRef } from 'react'
import { Link, useSearchParams, useNavigate } from 'react-router-dom'
import { BedDouble, Users, Maximize, Check, ChevronDown, ChevronUp, Calendar, X, UserCheck, Search, Star } from 'lucide-react'
import { roomsApi, Room, publicReviewsApi, ReviewStats } from '../../services/api'
import { useAuth } from '../../contexts/AuthContext'

// Hook for scroll-triggered animations - starts visible to prevent blank content
function useInView(threshold = 0.1) {
  const ref = useRef<HTMLDivElement>(null)
  // Start visible by default to prevent blank content if IntersectionObserver fails
  const [isInView, setIsInView] = useState(true)

  useEffect(() => {
    const element = ref.current
    if (!element) return

    // Reset to false initially for animation, only if element is below viewport
    const rect = element.getBoundingClientRect()
    if (rect.top > window.innerHeight) {
      setIsInView(false)
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true)
        }
      },
      { threshold }
    )

    observer.observe(element)

    return () => observer.disconnect()
  }, [threshold])

  return { ref, isInView }
}

export default function Accommodation() {
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const { tenant } = useAuth()
  const [rooms, setRooms] = useState<Room[]>([])
  const [expandedRoom, setExpandedRoom] = useState<string | null>(null)
  const [roomStats, setRoomStats] = useState<Record<string, ReviewStats>>({})

  // Get tenant ID from URL param or auth context
  const tenantId = searchParams.get('property') || tenant?.id || ''

  // Handle book room click - redirect to booking page
  const handleBookRoom = (room: Room) => {
    const params = new URLSearchParams()
    if (tenantId) {
      params.set('property', tenantId)
    }
    if (room.id) {
      params.set('room', room.id)
    }
    if (searchGuests) {
      params.set('guests', searchGuests)
    }
    navigate(`/book?${params.toString()}`)
  }

  // Get room link - use room_code if available, otherwise UUID
  const getRoomLink = (room: Room) => {
    const identifier = room.room_code || room.id
    const queryString = hasSearchParams ? `?${searchParams.toString()}` : ''
    return `/accommodation/${identifier}${queryString}`
  }

  // Get search parameters
  const checkIn = searchParams.get('checkIn') || ''
  const checkOut = searchParams.get('checkOut') || ''
  const guests = searchParams.get('guests') || ''

  const hasSearchParams = checkIn || checkOut || guests

  // Search form state
  const [searchCheckIn, setSearchCheckIn] = useState(checkIn)
  const [searchCheckOut, setSearchCheckOut] = useState(checkOut)
  const [searchGuests, setSearchGuests] = useState(guests || '2')

  const heroSection = useInView()
  const roomsSection = useInView(0.05)
  const bookingSection = useInView()

  useEffect(() => {
    if (tenantId) {
      loadRooms()
    }
  }, [tenantId])

  // Load room stats when rooms and tenantId are available
  useEffect(() => {
    if (tenantId && rooms.length > 0) {
      loadRoomStats()
    }
  }, [tenantId, rooms])

  const loadRoomStats = async () => {
    if (!tenantId) return

    const stats: Record<string, ReviewStats> = {}

    // Load stats for each room in parallel
    await Promise.all(
      rooms.map(async (room) => {
        try {
          if (room.room_code) {
            const roomStat = await publicReviewsApi.getRoomStatsByCode(tenantId, room.room_code)
            stats[room.id || room.room_code] = roomStat
          } else if (room.id) {
            const roomStat = await publicReviewsApi.getRoomStats(tenantId, room.id)
            stats[room.id] = roomStat
          }
        } catch (error) {
          // Silently ignore errors for individual rooms
        }
      })
    )

    setRoomStats(stats)
  }

  // Filter rooms based on guest capacity
  const filteredRooms = guests
    ? rooms.filter(room => room.max_guests >= parseInt(guests))
    : rooms

  // Format date for display
  const formatDate = (dateStr: string) => {
    if (!dateStr) return ''
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-ZA', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
  }

  // Calculate nights
  const calculateNights = () => {
    if (!checkIn || !checkOut) return 0
    const start = new Date(checkIn)
    const end = new Date(checkOut)
    const diffTime = end.getTime() - start.getTime()
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  }

  // Clear search
  const clearSearch = () => {
    setSearchParams({})
    setSearchCheckIn('')
    setSearchCheckOut('')
    setSearchGuests('2')
  }

  // Date helpers
  const getTomorrowDate = () => {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    return tomorrow.toISOString().split('T')[0]
  }

  // Handle search form submission
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    const params = new URLSearchParams()
    if (searchCheckIn) params.set('checkIn', searchCheckIn)
    if (searchCheckOut) params.set('checkOut', searchCheckOut)
    if (searchGuests) params.set('guests', searchGuests)
    setSearchParams(params)
  }

  const loadRooms = async () => {
    try {
      const data = await roomsApi.getAll({ is_active: true })
      setRooms(data || [])
    } catch (error) {
      console.error('Failed to load rooms:', error)
      setRooms([])
    }
  }

  const formatCurrency = (amount: number | undefined | null, currency: string | undefined | null) => {
    const safeAmount = amount ?? 0
    const safeCurrency = currency || 'ZAR'
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: safeCurrency,
      minimumFractionDigits: 0,
    }).format(safeAmount)
  }

  const toggleRoom = (roomId: string) => {
    setExpandedRoom(expandedRoom === roomId ? null : roomId)
  }

  return (
    <div className="overflow-x-hidden">
      {/* Hero Section with Search Form */}
      <section ref={heroSection.ref} className="bg-gray-900 text-white py-12 sm:py-16 md:py-20 relative overflow-hidden">
        {/* Animated background elements */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-0 right-0 w-64 h-64 sm:w-96 sm:h-96 bg-white rounded-full blur-3xl animate-pulse-slow"></div>
          <div className="absolute bottom-0 left-0 w-48 h-48 sm:w-72 sm:h-72 bg-white rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: '1s' }}></div>
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4">
              Our Accommodation
            </h1>
            <p className="text-base sm:text-lg text-gray-300 max-w-2xl mx-auto">
              Discover our range of comfortable rooms, each thoughtfully designed to make
              your stay memorable.
            </p>
          </div>

          {/* Search Form */}
          <form
            onSubmit={handleSearch}
            className="bg-white rounded-xl shadow-2xl p-4 sm:p-6 max-w-4xl mx-auto"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Check-in */}
              <div className="text-left">
                <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wide">
                  Check-in
                </label>
                <div className="relative">
                  <Calendar size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="date"
                    value={searchCheckIn}
                    onChange={(e) => setSearchCheckIn(e.target.value)}
                    min={getTomorrowDate()}
                    className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-300 focus:border-gray-300 transition-all"
                  />
                </div>
              </div>

              {/* Check-out */}
              <div className="text-left">
                <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wide">
                  Check-out
                </label>
                <div className="relative">
                  <Calendar size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="date"
                    value={searchCheckOut}
                    onChange={(e) => setSearchCheckOut(e.target.value)}
                    min={searchCheckIn || getTomorrowDate()}
                    className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-300 focus:border-gray-300 transition-all"
                  />
                </div>
              </div>

              {/* Guests */}
              <div className="text-left">
                <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wide">
                  Guests
                </label>
                <div className="relative">
                  <UserCheck size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <select
                    value={searchGuests}
                    onChange={(e) => setSearchGuests(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-300 focus:border-gray-300 transition-all appearance-none bg-white"
                  >
                    <option value="1">1 Guest</option>
                    <option value="2">2 Guests</option>
                    <option value="3">3 Guests</option>
                    <option value="4">4 Guests</option>
                    <option value="5">5+ Guests</option>
                  </select>
                </div>
              </div>

              {/* Search Button */}
              <div className="flex items-end">
                <button
                  type="submit"
                  className="w-full bg-gray-900 text-white px-6 py-3 rounded-lg font-medium hover:bg-gray-800 transition-all duration-300 flex items-center justify-center gap-2"
                >
                  <Search size={18} />
                  Search
                </button>
              </div>
            </div>
          </form>
        </div>
      </section>

      {/* Search Summary Banner */}
      {hasSearchParams && (
        <section className="bg-gray-100 border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex flex-wrap items-center gap-3 sm:gap-4">
                <span className="text-sm font-medium text-gray-700">Your search:</span>
                {checkIn && checkOut && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white rounded-full text-sm border border-gray-200">
                    <Calendar size={14} className="text-gray-500" />
                    {formatDate(checkIn)} - {formatDate(checkOut)}
                    <span className="text-gray-500">({calculateNights()} nights)</span>
                  </span>
                )}
                {guests && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white rounded-full text-sm border border-gray-200">
                    <Users size={14} className="text-gray-500" />
                    {guests} {parseInt(guests) === 1 ? 'Guest' : 'Guests'}
                  </span>
                )}
              </div>
              <button
                onClick={clearSearch}
                className="inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 transition-colors"
              >
                <X size={14} />
                Clear search
              </button>
            </div>
            {guests && filteredRooms.length !== rooms.length && (
              <p className="text-sm text-gray-600 mt-2">
                Showing {filteredRooms.length} of {rooms.length} rooms that accommodate {guests}+ guests
              </p>
            )}
          </div>
        </section>
      )}

      {/* Rooms List */}
      <section ref={roomsSection.ref} className="py-12 sm:py-16 md:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="space-y-6 sm:space-y-8">
            {filteredRooms.map((room) => (
              <div
                key={room.id}
                className="bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-xl transition-all duration-500"
              >
                  <div className="flex flex-col lg:flex-row">
                    {/* Room Image */}
                    <div className="lg:w-80 h-48 sm:h-56 lg:h-auto bg-gray-100 flex-shrink-0 overflow-hidden group">
                      {room.images?.featured ? (
                        <img
                          src={room.images.featured.url}
                          alt={room.name}
                          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
                          <BedDouble size={48} className="text-gray-300 sm:w-16 sm:h-16 transition-transform duration-300 group-hover:scale-110" />
                        </div>
                      )}
                    </div>

                    {/* Room Details */}
                    <div className="flex-1 p-4 sm:p-6">
                      <div className="flex flex-col gap-4">
                        <div className="flex-1">
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
                              {room.name}
                            </h2>
                            {/* Star Rating */}
                            {roomStats[room.id || '']?.total_reviews > 0 && (
                              <div className="flex items-center gap-1 flex-shrink-0">
                                <Star size={16} className="fill-yellow-400 text-yellow-400" />
                                <span className="text-sm font-medium text-gray-900">
                                  {roomStats[room.id || ''].average_rating.toFixed(1)}
                                </span>
                                <span className="text-xs text-gray-500">
                                  ({roomStats[room.id || ''].total_reviews})
                                </span>
                              </div>
                            )}
                          </div>
                          <p className="text-gray-600 mb-4 line-clamp-2 text-sm sm:text-base">
                            {room.description}
                          </p>

                          {/* Room Features */}
                          <div className="flex flex-wrap gap-3 sm:gap-4 text-xs sm:text-sm text-gray-600 mb-4">
                            {(room.bed_count || room.bed_type) && (
                              <span className="flex items-center gap-1.5">
                                <BedDouble size={16} className="text-gray-400" />
                                {room.bed_count || 1}x {room.bed_type || 'Bed'}
                              </span>
                            )}
                            <span className="flex items-center gap-1.5">
                              <Users size={16} className="text-gray-400" />
                              Max {room.max_guests || 2} guests
                            </span>
                            {room.room_size_sqm && (
                              <span className="flex items-center gap-1.5">
                                <Maximize size={16} className="text-gray-400" />
                                {room.room_size_sqm} m²
                              </span>
                            )}
                          </div>

                          {/* Amenities Preview */}
                          {room.amenities && room.amenities.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 sm:gap-2 mb-4">
                              {room.amenities.slice(0, 4).map((amenity, i) => (
                                <span
                                  key={i}
                                  className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full transition-colors hover:bg-gray-200"
                                >
                                  <Check size={10} className="sm:w-3 sm:h-3" />
                                  {amenity}
                                </span>
                              ))}
                              {room.amenities.length > 4 && (
                                <span className="px-2 py-1 text-gray-500 text-xs">
                                  +{room.amenities.length - 4} more
                                </span>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Price and Book - Mobile stacked, Desktop side by side */}
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-4 border-t border-gray-100">
                          <div>
                            <span className="text-xl sm:text-2xl font-bold text-gray-900">
                              {formatCurrency(room.base_price_per_night, room.currency)}
                            </span>
                            <span className="text-gray-500 text-sm"> / night</span>
                          </div>
                          <div className="flex gap-2">
                            <Link
                              to={getRoomLink(room)}
                              className="inline-flex items-center justify-center border border-gray-300 text-gray-700 px-4 sm:px-5 py-2.5 rounded-md text-sm font-medium hover:bg-gray-50 transition-all duration-300 hover:scale-105 active:scale-95 whitespace-nowrap"
                            >
                              View Details
                            </Link>
                            <button
                              onClick={() => handleBookRoom(room)}
                              className="inline-flex items-center justify-center bg-gray-900 text-white px-5 sm:px-6 py-2.5 rounded-md text-sm font-medium hover:bg-gray-800 transition-all duration-300 hover:scale-105 active:scale-95 whitespace-nowrap"
                            >
                              Book Now
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Expand/Collapse Amenities - only show if room has amenities */}
                      {room.amenities && room.amenities.length > 0 && (
                        <>
                          <button
                            onClick={() => toggleRoom(room.id!)}
                            className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900 mt-3 transition-colors"
                          >
                            {expandedRoom === room.id ? (
                              <>
                                <ChevronUp size={16} className="transition-transform" />
                                Show less
                              </>
                            ) : (
                              <>
                                <ChevronDown size={16} className="transition-transform" />
                                View all amenities
                              </>
                            )}
                          </button>

                          {/* Expanded Amenities */}
                          <div
                            className={`overflow-hidden transition-all duration-300 ${
                              expandedRoom === room.id ? 'max-h-96 opacity-100 mt-4' : 'max-h-0 opacity-0'
                            }`}
                          >
                            <div className="pt-4 border-t border-gray-100">
                              <h3 className="font-medium text-gray-900 mb-3 text-sm sm:text-base">All Amenities</h3>
                              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                                {room.amenities.map((amenity, i) => (
                                  <span
                                    key={i}
                                    className="flex items-center gap-2 text-xs sm:text-sm text-gray-700"
                                  >
                                    <Check size={14} className="text-green-600 flex-shrink-0" />
                                    {amenity}
                                  </span>
                                ))}
                              </div>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

          {filteredRooms.length === 0 && (
            <div className="text-center py-12">
              <BedDouble size={48} className="mx-auto text-gray-300 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {hasSearchParams ? 'No rooms match your search' : 'No rooms available'}
              </h3>
              <p className="text-gray-600 mb-4">
                {hasSearchParams
                  ? 'Try adjusting your search criteria or clear the search to see all rooms.'
                  : 'Please check back later or contact us for inquiries.'}
              </p>
              {hasSearchParams && (
                <button
                  onClick={clearSearch}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-md text-sm font-medium hover:bg-gray-800 transition-colors"
                >
                  View all rooms
                </button>
              )}
            </div>
          )}
        </div>
      </section>

      {/* Booking Info Section */}
      <section ref={bookingSection.ref} className="py-12 sm:py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-lg border border-gray-200 p-6 sm:p-8 md:p-12">
            <div className="grid md:grid-cols-2 gap-6 sm:gap-8 items-center">
              <div>
                <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 mb-3 sm:mb-4">
                  Ready to Book?
                </h2>
                <p className="text-gray-600 mb-4 sm:mb-6 text-sm sm:text-base">
                  Contact us to check availability and make a reservation. We'll help you find
                  the perfect room for your stay.
                </p>
                <ul className="space-y-2 sm:space-y-3 text-gray-600 mb-4 sm:mb-6 text-sm sm:text-base">
                  <li className="flex items-center gap-2">
                    <Check size={18} className="text-green-600 flex-shrink-0" />
                    Flexible check-in/check-out times
                  </li>
                  <li className="flex items-center gap-2">
                    <Check size={18} className="text-green-600 flex-shrink-0" />
                    Free cancellation up to 48 hours before
                  </li>
                  <li className="flex items-center gap-2">
                    <Check size={18} className="text-green-600 flex-shrink-0" />
                    Special rates for extended stays
                  </li>
                </ul>
              </div>
              <div className="text-center md:text-right">
                <button
                  onClick={() => {
                    const params = new URLSearchParams()
                    if (tenant?.id) params.set('property', tenant.id)
                    navigate(`/book?${params.toString()}`)
                  }}
                  className="inline-flex items-center justify-center bg-gray-900 text-white px-6 sm:px-8 py-3 rounded-md text-base font-medium hover:bg-gray-800 transition-all duration-300 hover:scale-105 active:scale-95"
                >
                  Book Online Now
                </button>
                <p className="text-xs sm:text-sm text-gray-500 mt-3">
                  Or call us at{' '}
                  <a href="tel:+27123456789" className="text-gray-900 font-medium hover:underline">
                    +27 12 345 6789
                  </a>
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

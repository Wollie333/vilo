import { useState, useEffect, useRef } from 'react'
import { useParams, Link, useNavigate, useSearchParams } from 'react-router-dom'
import {
  BedDouble, Users, Maximize, Check, ArrowLeft, ChevronLeft, ChevronRight,
  Calendar, Phone, Mail
} from 'lucide-react'
import { roomsApi, Room } from '../../services/api'
import { useAuth } from '../../contexts/AuthContext'

// Hook for scroll-triggered animations
function useInView(threshold = 0.1) {
  const ref = useRef<HTMLDivElement>(null)
  const [isInView, setIsInView] = useState(false)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true)
        }
      },
      { threshold }
    )

    if (ref.current) {
      observer.observe(ref.current)
    }

    return () => observer.disconnect()
  }, [threshold])

  return { ref, isInView }
}

// Placeholder room data based on ID
const getPlaceholderRoom = (roomId: string): Room => {
  const rooms: Record<string, Room> = {
    '1': {
      id: '1',
      name: 'Deluxe Double Room',
      description: 'A spacious and elegantly furnished room featuring a comfortable double bed, modern amenities, and a relaxing atmosphere perfect for couples or solo travelers seeking comfort. The room includes a private balcony with garden views, a modern en-suite bathroom with a walk-in shower, and a comfortable seating area. Enjoy complimentary WiFi, a flat-screen TV with streaming services, and a mini-bar stocked with refreshments.',
      room_code: 'DDR-101',
      bed_type: 'Double',
      bed_count: 1,
      room_size_sqm: 28,
      max_guests: 2,
      amenities: ['Free WiFi', 'Air Conditioning', 'Flat-screen TV', 'Ensuite Bathroom', 'Mini Bar', 'Work Desk', 'Tea/Coffee Maker', 'Hair Dryer', 'Safe', 'Iron & Ironing Board', 'Daily Housekeeping', 'Room Service'],
      images: { featured: null, gallery: [] },
      base_price_per_night: 1500,
      currency: 'ZAR',
      min_stay_nights: 1,
      inventory_mode: 'single_unit',
      total_units: 1,
      is_active: true,
    },
    '2': {
      id: '2',
      name: 'Family Suite',
      description: 'Our spacious family suite is perfect for families traveling with children. Features two king beds, a separate living area, and plenty of space for everyone to relax. The suite includes a fully equipped kitchenette, a large bathroom with both shower and bathtub, and a private balcony overlooking the garden.',
      room_code: 'FS-201',
      bed_type: 'King',
      bed_count: 2,
      room_size_sqm: 45,
      max_guests: 4,
      amenities: ['Free WiFi', 'Air Conditioning', 'Flat-screen TV', 'Ensuite Bathroom', 'Mini Kitchen', 'Balcony', 'Sofa Bed', 'Safe', 'Hair Dryer', 'Iron & Ironing Board', 'Daily Housekeeping', 'Room Service'],
      images: { featured: null, gallery: [] },
      base_price_per_night: 2800,
      currency: 'ZAR',
      min_stay_nights: 1,
      inventory_mode: 'room_type',
      total_units: 3,
      is_active: true,
    },
    '3': {
      id: '3',
      name: 'Standard Single Room',
      description: 'A cozy and comfortable room ideal for solo travelers. Features all essential amenities in a compact, well-designed space. Perfect for business travelers or those looking for an affordable yet comfortable stay.',
      room_code: 'SSR-001',
      bed_type: 'Single',
      bed_count: 1,
      room_size_sqm: 18,
      max_guests: 1,
      amenities: ['Free WiFi', 'Air Conditioning', 'Flat-screen TV', 'Ensuite Bathroom', 'Work Desk', 'Hair Dryer', 'Daily Housekeeping'],
      images: { featured: null, gallery: [] },
      base_price_per_night: 850,
      currency: 'ZAR',
      min_stay_nights: 1,
      inventory_mode: 'room_type',
      total_units: 5,
      is_active: true,
    },
    '4': {
      id: '4',
      name: 'Executive Suite',
      description: 'Our premium executive suite offers luxury accommodation with a separate bedroom, living room, and work area. Perfect for business travelers who need extra space and comfort. Features include a jacuzzi bath, premium toiletries, and complimentary minibar.',
      room_code: 'ES-301',
      bed_type: 'King',
      bed_count: 1,
      room_size_sqm: 55,
      max_guests: 2,
      amenities: ['Free WiFi', 'Air Conditioning', 'Smart TV', 'Ensuite Bathroom', 'Jacuzzi', 'Mini Bar', 'Work Station', 'Lounge Area', 'Nespresso Machine', 'Bathrobes', 'Premium Toiletries', 'Daily Housekeeping', 'Room Service', 'Turndown Service'],
      images: { featured: null, gallery: [] },
      base_price_per_night: 3500,
      currency: 'ZAR',
      min_stay_nights: 1,
      inventory_mode: 'single_unit',
      total_units: 1,
      is_active: true,
    },
  }

  return rooms[roomId] || rooms['1']
}

export default function RoomDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { tenant } = useAuth()
  const [room, setRoom] = useState<Room | null>(id ? getPlaceholderRoom(id) : null)
  const [currentImageIndex, setCurrentImageIndex] = useState(0)

  // Get pre-filled values from search params
  const prefilledGuests = searchParams.get('guests') || '2'

  const heroSection = useInView()
  const detailsSection = useInView(0.05)
  const amenitiesSection = useInView()
  const bookingSection = useInView()

  // Handle Book Now click - redirect to booking page
  const handleBookNow = () => {
    // Build query params for booking page
    const params = new URLSearchParams()
    if (tenant?.id) {
      params.set('property', tenant.id)
    }
    if (id) {
      params.set('room', id)
    }
    if (prefilledGuests) {
      params.set('guests', prefilledGuests)
    }
    navigate(`/book?${params.toString()}`)
  }

  // Update room when id changes
  useEffect(() => {
    if (id) {
      setRoom(getPlaceholderRoom(id))
    }
    loadRoom()
  }, [id])

  const loadRoom = async () => {
    if (!id) {
      navigate('/accommodation')
      return
    }

    // Already initialized with placeholder data, try to get real data from API
    try {
      const data = await roomsApi.getById(id)
      if (data) {
        setRoom(data)
      }
    } catch (error) {
      console.error('Failed to load room from API, using placeholder data:', error)
      // Keep using placeholder data (already set as initial state)
    }
  }

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
    }).format(amount)
  }

  // Get all images (featured + gallery)
  const allImages = room ? [
    room.images?.featured,
    ...(room.images?.gallery || [])
  ].filter(Boolean) : []

  const nextImage = () => {
    setCurrentImageIndex((prev) => (prev + 1) % Math.max(1, allImages.length))
  }

  const prevImage = () => {
    setCurrentImageIndex((prev) => (prev - 1 + Math.max(1, allImages.length)) % Math.max(1, allImages.length))
  }

  if (!room) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center px-4">
          <BedDouble size={48} className="mx-auto text-gray-300 mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Room Not Found</h2>
          <p className="text-gray-600 mb-4">The room you're looking for doesn't exist.</p>
          <Link
            to="/accommodation"
            className="inline-flex items-center text-gray-900 font-medium hover:underline"
          >
            <ArrowLeft size={18} className="mr-2" />
            Back to Accommodation
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="overflow-x-hidden bg-white">
      {/* Back Navigation */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8">
        <Link
          to="/accommodation"
          className="inline-flex items-center text-gray-600 hover:text-gray-900 transition-colors text-sm sm:text-base"
        >
          <ArrowLeft size={18} className="mr-2" />
          Back to Accommodation
        </Link>
      </div>

      {/* Room Images */}
      <section ref={heroSection.ref} className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className={`relative rounded-lg sm:rounded-xl overflow-hidden bg-gray-100 transition-all duration-700 ${heroSection.isInView ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}>
          <div className="aspect-[16/9] sm:aspect-[2/1] lg:aspect-[3/1]">
            {allImages.length > 0 && allImages[currentImageIndex] ? (
              <img
                src={allImages[currentImageIndex]!.url}
                alt={room.name}
                className="w-full h-full object-cover transition-transform duration-700 hover:scale-105"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
                <BedDouble size={64} className="text-gray-300 sm:w-24 sm:h-24" />
              </div>
            )}
          </div>

          {/* Image navigation */}
          {allImages.length > 1 && (
            <>
              <button
                onClick={prevImage}
                className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 p-2 bg-white/80 hover:bg-white rounded-full shadow-lg transition-all hover:scale-110"
              >
                <ChevronLeft size={20} className="sm:w-6 sm:h-6" />
              </button>
              <button
                onClick={nextImage}
                className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 p-2 bg-white/80 hover:bg-white rounded-full shadow-lg transition-all hover:scale-110"
              >
                <ChevronRight size={20} className="sm:w-6 sm:h-6" />
              </button>
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                {allImages.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentImageIndex(index)}
                    className={`w-2 h-2 sm:w-3 sm:h-3 rounded-full transition-all ${
                      index === currentImageIndex ? 'bg-white scale-125' : 'bg-white/50 hover:bg-white/80'
                    }`}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </section>

      {/* Room Details & Booking */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12 sm:pb-16">
        <div className="grid lg:grid-cols-3 gap-6 lg:gap-8">
          {/* Room Info */}
          <div ref={detailsSection.ref} className="lg:col-span-2">
            <div className={`transition-all duration-700 ${detailsSection.isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                {room.name}
              </h1>

              {/* Quick Info */}
              <div className="flex flex-wrap gap-4 sm:gap-6 text-sm sm:text-base text-gray-600 mb-6 pb-6 border-b border-gray-200">
                <span className="flex items-center gap-2">
                  <BedDouble size={18} className="text-gray-400" />
                  {room.bed_count}x {room.bed_type} bed
                </span>
                <span className="flex items-center gap-2">
                  <Users size={18} className="text-gray-400" />
                  Up to {room.max_guests} guests
                </span>
                {room.room_size_sqm && (
                  <span className="flex items-center gap-2">
                    <Maximize size={18} className="text-gray-400" />
                    {room.room_size_sqm} m²
                  </span>
                )}
              </div>

              {/* Description */}
              <div className="mb-8">
                <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-3">About This Room</h2>
                <p className="text-gray-600 leading-relaxed text-sm sm:text-base">
                  {room.description}
                </p>
              </div>

              {/* Amenities */}
              <div ref={amenitiesSection.ref} className={`transition-all duration-700 ${amenitiesSection.isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
                <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4">Amenities</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {room.amenities.map((amenity, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-2 text-sm sm:text-base text-gray-700"
                    >
                      <Check size={16} className="text-green-600 flex-shrink-0" />
                      {amenity}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Booking Card */}
          <div ref={bookingSection.ref} className="lg:col-span-1">
            <div className={`sticky top-24 bg-white rounded-lg border border-gray-200 p-5 sm:p-6 shadow-sm transition-all duration-700 ${bookingSection.isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
              <div className="mb-4 pb-4 border-b border-gray-100">
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl sm:text-3xl font-bold text-gray-900">
                    {formatCurrency(room.base_price_per_night, room.currency)}
                  </span>
                  <span className="text-gray-500 text-sm">/ night</span>
                </div>
                {room.min_stay_nights > 1 && (
                  <p className="text-sm text-gray-500 mt-1">
                    Minimum stay: {room.min_stay_nights} nights
                  </p>
                )}
              </div>

              <button
                onClick={handleBookNow}
                className="w-full bg-gray-900 text-white py-3 rounded-md font-medium hover:bg-gray-800 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2"
              >
                <Calendar size={18} />
                Book Now
              </button>

              <div className="mt-4 pt-4 border-t border-gray-100">
                <p className="text-sm text-gray-600 text-center mb-3">Or contact us directly</p>
                <div className="space-y-2">
                  <a
                    href="tel:+27123456789"
                    className="flex items-center justify-center gap-2 text-gray-700 hover:text-gray-900 transition-colors text-sm"
                  >
                    <Phone size={16} />
                    +27 12 345 6789
                  </a>
                  <a
                    href="mailto:info@viloguesthouse.com"
                    className="flex items-center justify-center gap-2 text-gray-700 hover:text-gray-900 transition-colors text-sm"
                  >
                    <Mail size={16} />
                    info@viloguesthouse.com
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

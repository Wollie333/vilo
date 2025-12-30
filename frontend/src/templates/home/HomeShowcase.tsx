import { Link, useNavigate } from 'react-router-dom'
import { Wifi, Car, Coffee, Shield, Star, ArrowRight, BedDouble, Users, Calendar, UserCheck, ChevronLeft, ChevronRight } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'
import { Room, PublicReview, ReviewStats } from '../../services/api'
import { formatCurrency, getRoomLink, getTomorrowDate, getDayAfterTomorrow } from '../../hooks/useHomeData'

function useInView(threshold = 0.1) {
  const ref = useRef<HTMLDivElement>(null)
  const [isInView, setIsInView] = useState(true)

  useEffect(() => {
    const element = ref.current
    if (!element) return
    const rect = element.getBoundingClientRect()
    if (rect.top > window.innerHeight) setIsInView(false)

    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) setIsInView(true)
    }, { threshold })
    observer.observe(element)
    return () => observer.disconnect()
  }, [threshold])

  return { ref, isInView }
}

const heroImages = [
  'https://images.unsplash.com/photo-1566073771259-6a8506099945?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80',
  'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80',
  'https://images.unsplash.com/photo-1590490360182-c33d57733427?ixlib=rb-4.0.3&auto=format&fit=crop&w=1974&q=80',
]

const features = [
  { icon: Wifi, label: 'Free WiFi' },
  { icon: Car, label: 'Parking' },
  { icon: Coffee, label: 'Breakfast' },
  { icon: Shield, label: 'Security' },
]

interface HomeShowcaseProps {
  rooms: Room[]
  reviews: PublicReview[]
  propertyStats: ReviewStats | null
  roomStats: Record<string, ReviewStats>
  loading: boolean
  colors: { primary: string; secondary: string; accent: string }
  hero: { title: string | null; subtitle: string | null }
}

export default function HomeShowcase({
  rooms,
  reviews,
  propertyStats,
  roomStats,
  loading,
  colors,
  hero
}: HomeShowcaseProps) {
  const navigate = useNavigate()
  const [currentSlide, setCurrentSlide] = useState(0)
  const [checkIn, setCheckIn] = useState('')
  const [checkOut, setCheckOut] = useState('')
  const [guests, setGuests] = useState('2')

  const roomsSection = useInView()
  const reviewsSection = useInView()

  // Auto-advance carousel
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % heroImages.length)
    }, 5000)
    return () => clearInterval(timer)
  }, [])

  const nextSlide = () => setCurrentSlide((prev) => (prev + 1) % heroImages.length)
  const prevSlide = () => setCurrentSlide((prev) => (prev - 1 + heroImages.length) % heroImages.length)

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    const params = new URLSearchParams()
    if (checkIn) params.set('checkIn', checkIn)
    if (checkOut) params.set('checkOut', checkOut)
    if (guests) params.set('guests', guests)
    navigate(`/accommodation?${params.toString()}`)
  }

  return (
    <div className="overflow-x-hidden">
      {/* Hero Carousel */}
      <section className="relative h-screen min-h-[600px]">
        {/* Slides */}
        {heroImages.map((img, index) => (
          <div
            key={index}
            className={`absolute inset-0 transition-opacity duration-1000 ${
              index === currentSlide ? 'opacity-100' : 'opacity-0'
            }`}
          >
            <div
              className="absolute inset-0 bg-cover bg-center"
              style={{ backgroundImage: `url("${img}")` }}
            />
            <div className="absolute inset-0 bg-black/40" />
          </div>
        ))}

        {/* Content */}
        <div className="relative z-10 h-full flex flex-col">
          {/* Hero Text */}
          <div className="flex-1 flex items-center justify-center text-center px-6">
            <div className="max-w-3xl">
              <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-white leading-tight mb-6">
                {hero.title || 'Discover Your Perfect Stay'}
              </h1>
              <p className="text-lg md:text-xl text-white/80 mb-8">
                {hero.subtitle || 'Luxury accommodations crafted for unforgettable experiences'}
              </p>
            </div>
          </div>

          {/* Overlaid Features */}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent pt-16 pb-32">
            <div className="max-w-7xl mx-auto px-6">
              <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-12">
                {features.map((item) => (
                  <div key={item.label} className="flex items-center gap-2 text-white/90">
                    <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                      <item.icon size={18} />
                    </div>
                    <span className="text-sm font-medium">{item.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Carousel Controls */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-4">
            <button onClick={prevSlide} className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-white hover:bg-white/30 transition-all">
              <ChevronLeft size={20} />
            </button>
            <div className="flex gap-2">
              {heroImages.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentSlide(index)}
                  className={`w-2 h-2 rounded-full transition-all ${
                    index === currentSlide ? 'w-6' : ''
                  }`}
                  style={{ backgroundColor: index === currentSlide ? colors.accent : 'rgba(255,255,255,0.5)' }}
                />
              ))}
            </div>
            <button onClick={nextSlide} className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-white hover:bg-white/30 transition-all">
              <ChevronRight size={20} />
            </button>
          </div>
        </div>
      </section>

      {/* Search Section */}
      <section className="py-8 bg-white shadow-lg relative z-20 -mt-16 mx-4 sm:mx-8 lg:mx-16 rounded-xl">
        <form onSubmit={handleSearch} className="max-w-5xl mx-auto px-6">
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-4 items-end">
            <div className="text-left">
              <label className="block text-xs font-medium text-gray-500 mb-1 uppercase">Check-in</label>
              <div className="relative">
                <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="date"
                  value={checkIn}
                  onChange={(e) => setCheckIn(e.target.value)}
                  min={getTomorrowDate()}
                  className="w-full pl-10 pr-3 py-3 border border-gray-200 rounded-lg text-gray-900 text-sm focus:outline-none focus:border-gray-400"
                />
              </div>
            </div>
            <div className="text-left">
              <label className="block text-xs font-medium text-gray-500 mb-1 uppercase">Check-out</label>
              <div className="relative">
                <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="date"
                  value={checkOut}
                  onChange={(e) => setCheckOut(e.target.value)}
                  min={checkIn || getDayAfterTomorrow()}
                  className="w-full pl-10 pr-3 py-3 border border-gray-200 rounded-lg text-gray-900 text-sm focus:outline-none focus:border-gray-400"
                />
              </div>
            </div>
            <div className="text-left">
              <label className="block text-xs font-medium text-gray-500 mb-1 uppercase">Guests</label>
              <div className="relative">
                <UserCheck size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <select
                  value={guests}
                  onChange={(e) => setGuests(e.target.value)}
                  className="w-full pl-10 pr-3 py-3 border border-gray-200 rounded-lg text-gray-900 text-sm focus:outline-none bg-white appearance-none"
                >
                  {[1, 2, 3, 4, 5].map(n => (
                    <option key={n} value={n}>{n} {n === 1 ? 'Guest' : 'Guests'}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="sm:col-span-2 flex items-end">
              <button
                type="submit"
                className="w-full py-3 rounded-lg font-medium text-white flex items-center justify-center gap-2 hover:opacity-90 transition-all"
                style={{ backgroundColor: colors.accent }}
              >
                Check Availability
              </button>
            </div>
          </div>
        </form>
      </section>

      {/* Masonry Room Grid */}
      <section ref={roomsSection.ref} className="py-20">
        <div className="max-w-7xl mx-auto px-6">
          <div className={`flex justify-between items-end mb-10 transition-all duration-700 ${roomsSection.isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-2">Our Rooms</h2>
              <p className="text-gray-600">Each room is uniquely designed for comfort</p>
            </div>
            <Link to="/accommodation" className="hidden sm:flex items-center gap-2 font-medium hover:opacity-80" style={{ color: colors.accent }}>
              View All <ArrowRight size={18} />
            </Link>
          </div>

          {loading ? (
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className={`animate-pulse bg-gray-200 rounded-xl ${i <= 2 ? 'h-80' : 'h-64'}`} />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
              {rooms.slice(0, 6).map((room, index) => {
                const isLarge = index < 2
                return (
                  <Link
                    key={room.id}
                    to={getRoomLink(room)}
                    className={`group relative rounded-xl overflow-hidden transition-all duration-700 ${
                      isLarge ? 'h-80' : 'h-64'
                    } ${roomsSection.isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
                    style={{ transitionDelay: `${index * 100}ms` }}
                  >
                    {room.images?.featured ? (
                      <img src={room.images.featured.url} alt={room.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                    ) : (
                      <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                        <BedDouble size={48} className="text-gray-400" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                    <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
                      {roomStats[room.id || '']?.total_reviews > 0 && (
                        <div className="flex items-center gap-1 mb-2">
                          <Star size={14} className="fill-yellow-400 text-yellow-400" />
                          <span className="text-sm">{roomStats[room.id || ''].average_rating.toFixed(1)}</span>
                        </div>
                      )}
                      <h3 className="font-semibold mb-1">{room.name}</h3>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-white/80">
                          <Users size={14} className="inline mr-1" />
                          {room.max_guests || 2} guests
                        </span>
                        <span className="font-bold">{formatCurrency(room.base_price_per_night, room.currency)}</span>
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </div>
      </section>

      {/* Reviews Carousel */}
      <section ref={reviewsSection.ref} className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-6">
          <div className={`text-center mb-12 transition-all duration-700 ${reviewsSection.isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <h2 className="text-3xl font-bold text-gray-900 mb-4">What Guests Say</h2>
            {propertyStats && propertyStats.total_reviews > 0 && (
              <div className="flex items-center justify-center gap-2">
                <span className="text-2xl font-bold">{propertyStats.average_rating.toFixed(1)}</span>
                <div className="flex">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} size={20} className={i < Math.round(propertyStats.average_rating) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'} />
                  ))}
                </div>
                <span className="text-gray-500">({propertyStats.total_reviews} reviews)</span>
              </div>
            )}
          </div>

          <div className="flex gap-6 overflow-x-auto pb-4 snap-x snap-mandatory">
            {reviews.map((review, index) => (
              <div
                key={review.id}
                className={`flex-shrink-0 w-[350px] bg-white p-6 rounded-xl shadow-sm snap-start transition-all duration-500 ${
                  reviewsSection.isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
                }`}
                style={{ transitionDelay: `${index * 100}ms` }}
              >
                <div className="flex gap-1 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} size={16} className={i < review.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'} />
                  ))}
                </div>
                {review.title && <p className="font-medium text-gray-900 mb-2">"{review.title}"</p>}
                {review.content && <p className="text-gray-600 mb-4 line-clamp-3">{review.content}</p>}
                <div className="flex items-center gap-3 pt-4 border-t border-gray-100">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-medium" style={{ backgroundColor: colors.accent }}>
                    {review.guest_name?.charAt(0) || 'G'}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{review.guest_name}</p>
                    <p className="text-sm text-gray-500">{review.bookings?.room_name}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Full-width CTA */}
      <section className="py-20 text-white text-center" style={{ backgroundColor: colors.accent }}>
        <div className="max-w-3xl mx-auto px-6">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Ready for Your Next Adventure?</h2>
          <p className="text-white/80 mb-8">Book your stay and create memories that last a lifetime</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/accommodation" className="inline-flex items-center justify-center px-8 py-3 rounded-lg font-medium transition-all hover:opacity-90" style={{ backgroundColor: colors.primary }}>
              Explore Rooms
            </Link>
            <Link to="/contact" className="inline-flex items-center justify-center px-8 py-3 rounded-lg font-medium border-2 border-white text-white hover:bg-white/10 transition-all">
              Contact Us
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}

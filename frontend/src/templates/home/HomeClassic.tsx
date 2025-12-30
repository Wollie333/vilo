import { Link, useNavigate } from 'react-router-dom'
import { Wifi, Car, Coffee, Shield, Star, ArrowRight, BedDouble, Users, ChevronDown, Search, Calendar, UserCheck } from 'lucide-react'
import { useState, useEffect, useRef } from 'react'
import { Room, PublicReview, ReviewStats } from '../../services/api'
import { formatCurrency, getRoomLink, getTomorrowDate, getDayAfterTomorrow } from '../../hooks/useHomeData'

// Hook for scroll-triggered animations
function useInView(threshold = 0.1) {
  const ref = useRef<HTMLDivElement>(null)
  const [isInView, setIsInView] = useState(true)

  useEffect(() => {
    const element = ref.current
    if (!element) return

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

const features = [
  { icon: Wifi, title: 'Free WiFi', description: 'High-speed internet throughout the property' },
  { icon: Car, title: 'Free Parking', description: 'Secure on-site parking for all guests' },
  { icon: Coffee, title: 'Breakfast Included', description: 'Start your day with a delicious breakfast' },
  { icon: Shield, title: '24/7 Security', description: 'Your safety is our top priority' },
]

interface HomeClassicProps {
  rooms: Room[]
  reviews: PublicReview[]
  propertyStats: ReviewStats | null
  roomStats: Record<string, ReviewStats>
  loading: boolean
  colors: { primary: string; secondary: string; accent: string }
  hero: { title: string | null; subtitle: string | null }
}

export default function HomeClassic({
  rooms,
  reviews,
  propertyStats,
  roomStats,
  loading,
  colors,
  hero
}: HomeClassicProps) {
  const navigate = useNavigate()
  const [isPaused, setIsPaused] = useState(false)
  const [checkIn, setCheckIn] = useState('')
  const [checkOut, setCheckOut] = useState('')
  const [guests, setGuests] = useState('2')

  const featuresSection = useInView()
  const roomsSection = useInView()
  const testimonialsSection = useInView()
  const ctaSection = useInView()

  const featuredRooms = rooms.slice(0, 3)

  const scrollToContent = () => {
    window.scrollTo({ top: window.innerHeight - 80, behavior: 'smooth' })
  }

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
      {/* Hero Section */}
      <section className="relative text-white min-h-screen flex flex-col justify-center overflow-hidden" style={{ backgroundColor: colors.primary }}>
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: 'url("https://images.unsplash.com/photo-1566073771259-6a8506099945?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80")',
          }}
        />
        <div className="absolute inset-0 bg-black/60" />

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24 w-full">
          <div className="text-center max-w-3xl mx-auto">
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold leading-tight mb-6">
              {hero.title || 'Your Home Away From Home'}
            </h1>
            <p className="text-base sm:text-lg md:text-xl text-gray-200 mb-10 leading-relaxed">
              {hero.subtitle || 'Experience comfort and hospitality. Whether traveling for business or leisure, we provide the perfect retreat.'}
            </p>

            {/* Search Form */}
            <form onSubmit={handleSearch} className="bg-white rounded-xl shadow-2xl p-4 sm:p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="text-left">
                  <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wide">Check-in</label>
                  <div className="relative">
                    <Calendar size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="date"
                      value={checkIn}
                      onChange={(e) => setCheckIn(e.target.value)}
                      min={getTomorrowDate()}
                      className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-300"
                    />
                  </div>
                </div>
                <div className="text-left">
                  <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wide">Check-out</label>
                  <div className="relative">
                    <Calendar size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="date"
                      value={checkOut}
                      onChange={(e) => setCheckOut(e.target.value)}
                      min={checkIn || getDayAfterTomorrow()}
                      className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-300"
                    />
                  </div>
                </div>
                <div className="text-left">
                  <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wide">Guests</label>
                  <div className="relative">
                    <UserCheck size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <select
                      value={guests}
                      onChange={(e) => setGuests(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-300 appearance-none bg-white"
                    >
                      <option value="1">1 Guest</option>
                      <option value="2">2 Guests</option>
                      <option value="3">3 Guests</option>
                      <option value="4">4 Guests</option>
                      <option value="5">5+ Guests</option>
                    </select>
                  </div>
                </div>
                <div className="flex items-end">
                  <button
                    type="submit"
                    className="w-full py-3 px-6 rounded-lg font-medium hover:opacity-90 transition-all flex items-center justify-center gap-2 text-white"
                    style={{ backgroundColor: colors.primary }}
                  >
                    <Search size={18} />
                    Check Availability
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>

        <button
          onClick={scrollToContent}
          className="absolute bottom-8 left-1/2 transform -translate-x-1/2 text-white animate-bounce hidden md:block"
          aria-label="Scroll down"
        >
          <ChevronDown size={32} className="opacity-70 hover:opacity-100 transition-opacity" />
        </button>
      </section>

      {/* Features Section */}
      <section ref={featuresSection.ref} className="py-16 md:py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className={`text-center mb-12 transition-all duration-700 ${featuresSection.isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-4">Why Choose Us?</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">We offer more than just a place to stay. Experience exceptional service and amenities.</p>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-8">
            {features.map((feature, index) => (
              <div
                key={feature.title}
                className={`bg-white p-4 sm:p-6 rounded-lg shadow-sm border border-gray-100 text-center hover:shadow-md transition-all duration-300 ${
                  featuresSection.isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
                }`}
                style={{ transitionDelay: `${index * 100}ms` }}
              >
                <div className="inline-flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-full mb-3 sm:mb-4" style={{ backgroundColor: `${colors.accent}20` }}>
                  <feature.icon size={20} style={{ color: colors.accent }} />
                </div>
                <h3 className="text-sm sm:text-lg font-semibold text-gray-900 mb-1">{feature.title}</h3>
                <p className="text-gray-600 text-xs sm:text-sm">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Rooms Section */}
      <section ref={roomsSection.ref} className="py-16 md:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className={`flex flex-col sm:flex-row sm:items-end sm:justify-between mb-8 sm:mb-12 gap-4 transition-all duration-700 ${roomsSection.isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <div>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-2">Our Accommodation</h2>
              <p className="text-gray-600 max-w-xl">Choose from our selection of comfortable rooms.</p>
            </div>
            <Link to="/accommodation" className="hidden sm:inline-flex items-center font-medium hover:opacity-80 transition-colors group" style={{ color: colors.primary }}>
              View All Rooms
              <ArrowRight size={18} className="ml-2 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-8">
              {[1, 2, 3].map((i) => (
                <div key={i} className="animate-pulse">
                  <div className="bg-gray-200 h-48 rounded-lg mb-4"></div>
                  <div className="bg-gray-200 h-6 rounded w-3/4 mb-2"></div>
                  <div className="bg-gray-200 h-4 rounded w-1/2"></div>
                </div>
              ))}
            </div>
          ) : featuredRooms.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-8">
              {featuredRooms.map((room, index) => (
                <Link
                  key={room.id}
                  to={getRoomLink(room)}
                  className={`group bg-white rounded-lg overflow-hidden border border-gray-200 hover:shadow-xl transition-all duration-500 ${
                    roomsSection.isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
                  }`}
                  style={{ transitionDelay: `${index * 150}ms` }}
                >
                  <div className="relative h-48 bg-gray-100 overflow-hidden">
                    {room.images?.featured ? (
                      <img src={room.images.featured.url} alt={room.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
                        <BedDouble size={48} className="text-gray-300" />
                      </div>
                    )}
                    {roomStats[room.id || '']?.total_reviews > 0 && (
                      <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-full flex items-center gap-1">
                        <Star size={14} className="fill-yellow-400 text-yellow-400" />
                        <span className="text-sm font-medium text-gray-900">{roomStats[room.id || ''].average_rating.toFixed(1)}</span>
                      </div>
                    )}
                  </div>
                  <div className="p-4 sm:p-5">
                    <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2">{room.name}</h3>
                    <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
                      <span className="flex items-center gap-1">
                        <BedDouble size={14} />
                        {room.bed_count || 1}x {room.bed_type || 'Bed'}
                      </span>
                      <span className="flex items-center gap-1">
                        <Users size={14} />
                        {room.max_guests || 2} guests
                      </span>
                    </div>
                    <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                      <div>
                        <span className="text-xl font-bold text-gray-900">{formatCurrency(room.base_price_per_night, room.currency)}</span>
                        <span className="text-sm text-gray-500"> / night</span>
                      </div>
                      <span className="text-sm font-medium" style={{ color: colors.accent }}>View Details</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <BedDouble size={48} className="mx-auto text-gray-300 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Rooms Available</h3>
              <p className="text-gray-600">Please check back later or contact us.</p>
            </div>
          )}
        </div>
      </section>

      {/* Testimonials Section */}
      <section ref={testimonialsSection.ref} className="py-16 md:py-24 bg-gray-50 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className={`text-center mb-12 transition-all duration-700 ${testimonialsSection.isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-4">What Our Guests Say</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">Don't just take our word for it.</p>
            {propertyStats && propertyStats.total_reviews > 0 && (
              <div className="flex items-center justify-center gap-2 mt-4">
                <div className="flex gap-0.5">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} size={20} className={i < Math.round(propertyStats.average_rating) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'} />
                  ))}
                </div>
                <span className="text-lg font-semibold text-gray-900">{propertyStats.average_rating.toFixed(1)}</span>
                <span className="text-gray-500">({propertyStats.total_reviews} reviews)</span>
              </div>
            )}
          </div>
        </div>

        {/* Marquee */}
        <div className="relative" onMouseEnter={() => setIsPaused(true)} onMouseLeave={() => setIsPaused(false)}>
          <div className="absolute left-0 top-0 bottom-0 w-16 sm:w-32 bg-gradient-to-r from-gray-50 to-transparent z-10 pointer-events-none" />
          <div className="absolute right-0 top-0 bottom-0 w-16 sm:w-32 bg-gradient-to-l from-gray-50 to-transparent z-10 pointer-events-none" />

          <div className={`flex gap-6 ${isPaused ? '' : 'animate-marquee'}`} style={{ width: 'max-content', animationPlayState: isPaused ? 'paused' : 'running' }}>
            {[...reviews, ...reviews].map((review, index) => (
              <div key={`${review.id}-${index}`} className="w-[350px] flex-shrink-0 bg-white p-6 rounded-lg shadow-sm border border-gray-100">
                <div className="flex gap-1 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} size={16} className={i < review.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'} />
                  ))}
                </div>
                {review.title && <p className="font-medium text-gray-900 mb-2">"{review.title}"</p>}
                {review.content && <p className="text-gray-700 mb-4 leading-relaxed line-clamp-3">{review.content}</p>}
                <div className="border-t border-gray-100 pt-4">
                  <p className="font-medium text-gray-900">{review.guest_name}</p>
                  <p className="text-sm text-gray-500">
                    {review.bookings?.room_name} • {new Date(review.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section ref={ctaSection.ref} className="py-16 md:py-24 text-white relative overflow-hidden" style={{ backgroundColor: colors.primary }}>
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 left-10 w-64 h-64 bg-white rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-10 right-10 w-96 h-96 bg-white rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1.5s' }} />
        </div>

        <div className={`relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center transition-all duration-700 ${ctaSection.isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4">Ready to Book Your Stay?</h2>
          <p className="text-white/80 max-w-2xl mx-auto mb-8">Check availability and book your room today.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/accommodation" className="inline-flex items-center justify-center bg-white px-8 py-3 rounded-md font-medium hover:bg-gray-100 transition-all" style={{ color: colors.primary }}>
              Book Now
            </Link>
            <Link to="/contact" className="inline-flex items-center justify-center border-2 border-white text-white px-8 py-3 rounded-md font-medium hover:bg-white/10 transition-all">
              Get in Touch
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}

import { Link, useNavigate } from 'react-router-dom'
import { Wifi, Car, Coffee, Shield, Star, ArrowRight, BedDouble, Users, Calendar, UserCheck } from 'lucide-react'
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

const features = [
  { icon: Wifi, title: 'Free WiFi', description: 'High-speed internet' },
  { icon: Car, title: 'Free Parking', description: 'Secure on-site parking' },
  { icon: Coffee, title: 'Breakfast', description: 'Complimentary breakfast' },
  { icon: Shield, title: '24/7 Security', description: 'Round-the-clock safety' },
]

interface HomeModernProps {
  rooms: Room[]
  reviews: PublicReview[]
  propertyStats: ReviewStats | null
  roomStats: Record<string, ReviewStats>
  loading: boolean
  colors: { primary: string; secondary: string; accent: string }
  hero: { title: string | null; subtitle: string | null }
}

export default function HomeModern({
  rooms,
  reviews,
  propertyStats,
  roomStats,
  loading,
  colors,
  hero
}: HomeModernProps) {
  const navigate = useNavigate()
  const [checkIn, setCheckIn] = useState('')
  const [checkOut, setCheckOut] = useState('')
  const [guests, setGuests] = useState('2')

  const featuresSection = useInView()
  const roomsSection = useInView()
  const reviewsSection = useInView()

  const featuredRooms = rooms.slice(0, 2)

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
      {/* Split Hero Section */}
      <section className="min-h-screen flex flex-col lg:flex-row">
        {/* Left - Content */}
        <div className="lg:w-1/2 flex flex-col justify-center px-6 sm:px-12 lg:px-16 py-16 lg:py-24" style={{ backgroundColor: colors.primary }}>
          <div className="max-w-lg">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-bold text-white leading-tight mb-6">
              {hero.title || 'Experience Luxury & Comfort'}
            </h1>
            <p className="text-lg text-white/80 mb-8 leading-relaxed">
              {hero.subtitle || 'Discover the perfect blend of modern amenities and warm hospitality for your next getaway.'}
            </p>

            {/* Search Form */}
            <form onSubmit={handleSearch} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-white/60 mb-1">Check-in</label>
                  <div className="relative">
                    <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="date"
                      value={checkIn}
                      onChange={(e) => setCheckIn(e.target.value)}
                      min={getTomorrowDate()}
                      className="w-full pl-10 pr-4 py-3 rounded-lg text-gray-900 text-sm focus:outline-none focus:ring-2"
                      style={{ '--tw-ring-color': colors.accent } as any}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-white/60 mb-1">Check-out</label>
                  <div className="relative">
                    <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="date"
                      value={checkOut}
                      onChange={(e) => setCheckOut(e.target.value)}
                      min={checkIn || getDayAfterTomorrow()}
                      className="w-full pl-10 pr-4 py-3 rounded-lg text-gray-900 text-sm focus:outline-none focus:ring-2"
                    />
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-white/60 mb-1">Guests</label>
                  <div className="relative">
                    <UserCheck size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <select
                      value={guests}
                      onChange={(e) => setGuests(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 rounded-lg text-gray-900 text-sm focus:outline-none bg-white appearance-none"
                    >
                      {[1, 2, 3, 4, 5].map(n => (
                        <option key={n} value={n}>{n} {n === 1 ? 'Guest' : 'Guests'}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="flex items-end">
                  <button
                    type="submit"
                    className="w-full py-3 rounded-lg font-medium text-white hover:opacity-90 transition-all"
                    style={{ backgroundColor: colors.accent }}
                  >
                    Search
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>

        {/* Right - Image */}
        <div
          className="lg:w-1/2 min-h-[50vh] lg:min-h-screen bg-cover bg-center"
          style={{
            backgroundImage: 'url("https://images.unsplash.com/photo-1590490360182-c33d57733427?ixlib=rb-4.0.3&auto=format&fit=crop&w=1974&q=80")',
          }}
        />
      </section>

      {/* Features - 2 Columns Vertical */}
      <section ref={featuresSection.ref} className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className={`grid lg:grid-cols-2 gap-8 transition-all duration-700 ${featuresSection.isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-4">Why Stay With Us</h2>
              <p className="text-gray-600 mb-8">We combine modern comfort with personalized service to create memorable experiences.</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {features.map((feature, index) => (
                <div
                  key={feature.title}
                  className="p-5 rounded-xl border border-gray-100 hover:border-gray-200 hover:shadow-sm transition-all"
                  style={{ transitionDelay: `${index * 100}ms` }}
                >
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-3" style={{ backgroundColor: `${colors.accent}15` }}>
                    <feature.icon size={20} style={{ color: colors.accent }} />
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-1">{feature.title}</h3>
                  <p className="text-sm text-gray-500">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Rooms - Large Cards with Overlay */}
      <section ref={roomsSection.ref} className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className={`flex justify-between items-end mb-10 transition-all duration-700 ${roomsSection.isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-2">Featured Rooms</h2>
              <p className="text-gray-600">Handpicked accommodations for the perfect stay</p>
            </div>
            <Link to="/accommodation" className="hidden sm:flex items-center gap-2 font-medium hover:opacity-80" style={{ color: colors.accent }}>
              View All <ArrowRight size={18} />
            </Link>
          </div>

          {loading ? (
            <div className="grid lg:grid-cols-2 gap-8">
              {[1, 2].map((i) => (
                <div key={i} className="animate-pulse h-80 bg-gray-200 rounded-2xl" />
              ))}
            </div>
          ) : (
            <div className="grid lg:grid-cols-2 gap-8">
              {featuredRooms.map((room, index) => (
                <Link
                  key={room.id}
                  to={getRoomLink(room)}
                  className={`group relative h-80 rounded-2xl overflow-hidden transition-all duration-700 ${
                    roomsSection.isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
                  }`}
                  style={{ transitionDelay: `${index * 150}ms` }}
                >
                  {room.images?.featured ? (
                    <img src={room.images.featured.url} alt={room.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center">
                      <BedDouble size={64} className="text-gray-400" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
                    <div className="flex justify-between items-end">
                      <div>
                        {roomStats[room.id || '']?.total_reviews > 0 && (
                          <div className="flex items-center gap-1 mb-2">
                            <Star size={14} className="fill-yellow-400 text-yellow-400" />
                            <span className="text-sm font-medium">{roomStats[room.id || ''].average_rating.toFixed(1)}</span>
                          </div>
                        )}
                        <h3 className="text-xl font-bold mb-1">{room.name}</h3>
                        <div className="flex items-center gap-3 text-sm text-white/80">
                          <span className="flex items-center gap-1">
                            <BedDouble size={14} />
                            {room.bed_type || 'Bed'}
                          </span>
                          <span className="flex items-center gap-1">
                            <Users size={14} />
                            {room.max_guests || 2}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold">{formatCurrency(room.base_price_per_night, room.currency)}</p>
                        <p className="text-sm text-white/60">per night</p>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Reviews Grid */}
      <section ref={reviewsSection.ref} className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className={`text-center mb-12 transition-all duration-700 ${reviewsSection.isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Guest Experiences</h2>
            {propertyStats && propertyStats.total_reviews > 0 && (
              <div className="flex items-center justify-center gap-2">
                <div className="flex">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} size={20} className={i < Math.round(propertyStats.average_rating) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'} />
                  ))}
                </div>
                <span className="text-lg font-semibold">{propertyStats.average_rating.toFixed(1)}</span>
                <span className="text-gray-500">• {propertyStats.total_reviews} reviews</span>
              </div>
            )}
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {reviews.slice(0, 3).map((review, index) => (
              <div
                key={review.id}
                className={`p-6 rounded-xl border border-gray-100 transition-all duration-500 ${
                  reviewsSection.isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
                }`}
                style={{ transitionDelay: `${index * 100}ms` }}
              >
                <div className="flex gap-1 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} size={16} className={i < review.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'} />
                  ))}
                </div>
                {review.content && <p className="text-gray-700 mb-4 line-clamp-3">{review.content}</p>}
                <div className="flex items-center gap-3">
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

      {/* Minimal CTA */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Ready to experience it yourself?</h2>
          <Link
            to="/accommodation"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg font-medium text-white hover:opacity-90 transition-all"
            style={{ backgroundColor: colors.accent }}
          >
            Browse Rooms <ArrowRight size={18} />
          </Link>
        </div>
      </section>
    </div>
  )
}

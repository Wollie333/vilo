import { Link, useNavigate } from 'react-router-dom'
import { Wifi, Car, Coffee, Shield, Star, BedDouble, Users, Calendar, UserCheck, Search } from 'lucide-react'
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

const amenities = [
  { icon: Wifi, label: 'WiFi' },
  { icon: Car, label: 'Parking' },
  { icon: Coffee, label: 'Breakfast' },
  { icon: Shield, label: 'Security' },
]

interface HomeMinimalProps {
  rooms: Room[]
  reviews: PublicReview[]
  propertyStats: ReviewStats | null
  roomStats: Record<string, ReviewStats>
  loading: boolean
  colors: { primary: string; secondary: string; accent: string }
  hero: { title: string | null; subtitle: string | null }
}

export default function HomeMinimal({
  rooms,
  reviews,
  propertyStats,
  roomStats,
  loading,
  colors,
  hero
}: HomeMinimalProps) {
  const navigate = useNavigate()
  const [checkIn, setCheckIn] = useState('')
  const [checkOut, setCheckOut] = useState('')
  const [guests, setGuests] = useState('2')

  const roomsSection = useInView()

  const featuredRooms = rooms.slice(0, 2)
  const featuredReview = reviews[0]

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
      {/* Compact Hero */}
      <section className="relative py-20 md:py-28" style={{ backgroundColor: colors.primary }}>
        <div
          className="absolute inset-0 bg-cover bg-center opacity-30"
          style={{
            backgroundImage: 'url("https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80")',
          }}
        />
        <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white leading-tight mb-4">
            {hero.title || 'Simple Stays, Simply Beautiful'}
          </h1>
          <p className="text-lg text-white/70 mb-10">
            {hero.subtitle || 'Quality accommodation without the fuss'}
          </p>

          {/* Prominent Search */}
          <form onSubmit={handleSearch} className="bg-white rounded-2xl shadow-xl p-6 max-w-3xl mx-auto">
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div className="text-left">
                <label className="block text-xs font-medium text-gray-500 mb-1">CHECK-IN</label>
                <div className="relative">
                  <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="date"
                    value={checkIn}
                    onChange={(e) => setCheckIn(e.target.value)}
                    min={getTomorrowDate()}
                    className="w-full pl-10 pr-3 py-2.5 border border-gray-200 rounded-lg text-gray-900 text-sm focus:outline-none focus:border-gray-400"
                  />
                </div>
              </div>
              <div className="text-left">
                <label className="block text-xs font-medium text-gray-500 mb-1">CHECK-OUT</label>
                <div className="relative">
                  <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="date"
                    value={checkOut}
                    onChange={(e) => setCheckOut(e.target.value)}
                    min={checkIn || getDayAfterTomorrow()}
                    className="w-full pl-10 pr-3 py-2.5 border border-gray-200 rounded-lg text-gray-900 text-sm focus:outline-none focus:border-gray-400"
                  />
                </div>
              </div>
              <div className="text-left">
                <label className="block text-xs font-medium text-gray-500 mb-1">GUESTS</label>
                <div className="relative">
                  <UserCheck size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <select
                    value={guests}
                    onChange={(e) => setGuests(e.target.value)}
                    className="w-full pl-10 pr-3 py-2.5 border border-gray-200 rounded-lg text-gray-900 text-sm focus:outline-none bg-white appearance-none"
                  >
                    {[1, 2, 3, 4, 5].map(n => (
                      <option key={n} value={n}>{n}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex items-end">
                <button
                  type="submit"
                  className="w-full py-2.5 rounded-lg font-medium text-white flex items-center justify-center gap-2 hover:opacity-90 transition-all"
                  style={{ backgroundColor: colors.accent }}
                >
                  <Search size={16} />
                  Search
                </button>
              </div>
            </div>
          </form>
        </div>
      </section>

      {/* Horizontal Icon Bar */}
      <section className="py-8 bg-gray-50 border-b border-gray-100">
        <div className="max-w-4xl mx-auto px-6">
          <div className="flex items-center justify-center gap-8 sm:gap-16">
            {amenities.map((item) => (
              <div key={item.label} className="flex flex-col items-center gap-2">
                <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: `${colors.accent}15` }}>
                  <item.icon size={18} style={{ color: colors.accent }} />
                </div>
                <span className="text-xs font-medium text-gray-600">{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 2-Column Large Room Cards */}
      <section ref={roomsSection.ref} className="py-16 md:py-24">
        <div className="max-w-5xl mx-auto px-6">
          <div className={`flex justify-between items-end mb-10 transition-all duration-700 ${roomsSection.isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <h2 className="text-2xl font-bold text-gray-900">Our Rooms</h2>
            <Link to="/accommodation" className="text-sm font-medium hover:opacity-80" style={{ color: colors.accent }}>
              View all
            </Link>
          </div>

          {loading ? (
            <div className="grid md:grid-cols-2 gap-8">
              {[1, 2].map((i) => (
                <div key={i} className="animate-pulse">
                  <div className="h-64 bg-gray-200 rounded-xl mb-4" />
                  <div className="h-6 bg-gray-200 rounded w-3/4 mb-2" />
                  <div className="h-4 bg-gray-200 rounded w-1/2" />
                </div>
              ))}
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-8">
              {featuredRooms.map((room, index) => (
                <Link
                  key={room.id}
                  to={getRoomLink(room)}
                  className={`group transition-all duration-700 ${
                    roomsSection.isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
                  }`}
                  style={{ transitionDelay: `${index * 150}ms` }}
                >
                  <div className="relative h-64 rounded-xl overflow-hidden mb-4">
                    {room.images?.featured ? (
                      <img src={room.images.featured.url} alt={room.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                    ) : (
                      <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                        <BedDouble size={48} className="text-gray-400" />
                      </div>
                    )}
                    {roomStats[room.id || '']?.total_reviews > 0 && (
                      <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm px-2.5 py-1 rounded-full flex items-center gap-1">
                        <Star size={14} className="fill-yellow-400 text-yellow-400" />
                        <span className="text-sm font-medium">{roomStats[room.id || ''].average_rating.toFixed(1)}</span>
                      </div>
                    )}
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{room.name}</h3>
                  <div className="flex items-center gap-4 text-sm text-gray-500 mb-3">
                    <span className="flex items-center gap-1">
                      <BedDouble size={14} />
                      {room.bed_type || 'Bed'}
                    </span>
                    <span className="flex items-center gap-1">
                      <Users size={14} />
                      Up to {room.max_guests || 2}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xl font-bold text-gray-900">{formatCurrency(room.base_price_per_night, room.currency)}</span>
                      <span className="text-sm text-gray-500"> /night</span>
                    </div>
                    <span
                      className="px-4 py-2 rounded-lg text-sm font-medium text-white"
                      style={{ backgroundColor: colors.accent }}
                    >
                      Book Now
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Single Featured Review */}
      {featuredReview && (
        <section className="py-16 bg-gray-50">
          <div className="max-w-3xl mx-auto px-6 text-center">
            <div className="flex justify-center gap-1 mb-4">
              {[...Array(5)].map((_, i) => (
                <Star key={i} size={20} className={i < featuredReview.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'} />
              ))}
            </div>
            {featuredReview.content && (
              <blockquote className="text-xl md:text-2xl text-gray-700 italic mb-6 leading-relaxed">
                "{featuredReview.content}"
              </blockquote>
            )}
            <p className="font-medium text-gray-900">{featuredReview.guest_name}</p>
            {propertyStats && (
              <p className="text-sm text-gray-500 mt-2">
                One of {propertyStats.total_reviews} happy guests
              </p>
            )}
          </div>
        </section>
      )}

      {/* Simple CTA */}
      <section className="py-12 border-t border-gray-100">
        <div className="max-w-3xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Ready to book?</h3>
            <p className="text-gray-500 text-sm">Find your perfect room today</p>
          </div>
          <div className="flex gap-3">
            <Link
              to="/accommodation"
              className="px-6 py-2.5 rounded-lg font-medium text-white hover:opacity-90 transition-all"
              style={{ backgroundColor: colors.primary }}
            >
              View Rooms
            </Link>
            <Link
              to="/contact"
              className="px-6 py-2.5 rounded-lg font-medium border hover:bg-gray-50 transition-all"
              style={{ borderColor: colors.primary, color: colors.primary }}
            >
              Contact
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}

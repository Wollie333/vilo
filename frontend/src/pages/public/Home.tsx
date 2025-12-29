import { Link, useNavigate } from 'react-router-dom'
import { Wifi, Car, Coffee, Shield, Star, ArrowRight, BedDouble, Users, ChevronDown, Search, Calendar, UserCheck } from 'lucide-react'
import { useState, useEffect, useRef } from 'react'
import { roomsApi, Room } from '../../services/api'

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

const features = [
  {
    icon: Wifi,
    title: 'Free WiFi',
    description: 'High-speed internet throughout the property',
  },
  {
    icon: Car,
    title: 'Free Parking',
    description: 'Secure on-site parking for all guests',
  },
  {
    icon: Coffee,
    title: 'Breakfast Included',
    description: 'Start your day with a delicious breakfast',
  },
  {
    icon: Shield,
    title: '24/7 Security',
    description: 'Your safety is our top priority',
  },
]

const testimonials = [
  {
    name: 'Sarah M.',
    location: 'Johannesburg',
    text: 'Absolutely wonderful stay! The rooms were spotless and the staff went above and beyond.',
    rating: 5,
  },
  {
    name: 'James K.',
    location: 'Cape Town',
    text: 'Perfect location and amazing hospitality. Will definitely be coming back.',
    rating: 5,
  },
  {
    name: 'Linda P.',
    location: 'Durban',
    text: 'Great value for money. The breakfast was delicious and the beds were so comfortable.',
    rating: 5,
  },
  {
    name: 'Michael T.',
    location: 'Bloemfontein',
    text: 'The staff made us feel right at home. Clean rooms and excellent service throughout.',
    rating: 5,
  },
  {
    name: 'Emma S.',
    location: 'Port Elizabeth',
    text: 'A hidden gem! Peaceful atmosphere and everything you need for a relaxing stay.',
    rating: 5,
  },
  {
    name: 'David R.',
    location: 'Pretoria',
    text: 'Best guest house in the area. Professional staff and beautiful surroundings.',
    rating: 5,
  },
]

export default function Home() {
  const navigate = useNavigate()
  const [featuredRooms, setFeaturedRooms] = useState<Room[]>([])
  const [loading, setLoading] = useState(true)
  const [isPaused, setIsPaused] = useState(false)

  // Search form state
  const [checkIn, setCheckIn] = useState('')
  const [checkOut, setCheckOut] = useState('')
  const [guests, setGuests] = useState('2')

  const featuresSection = useInView()
  const roomsSection = useInView()
  const testimonialsSection = useInView()
  const ctaSection = useInView()

  useEffect(() => {
    loadFeaturedRooms()
  }, [])

  const loadFeaturedRooms = async () => {
    try {
      const data = await roomsApi.getAll({ is_active: true })
      setFeaturedRooms(data.slice(0, 3))
    } catch (error) {
      console.error('Failed to load rooms:', error)
      setFeaturedRooms([])
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
    }).format(amount)
  }

  const scrollToContent = () => {
    window.scrollTo({ top: window.innerHeight - 80, behavior: 'smooth' })
  }

  const getTomorrowDate = () => {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    return tomorrow.toISOString().split('T')[0]
  }

  const getDayAfterTomorrow = () => {
    const dayAfter = new Date()
    dayAfter.setDate(dayAfter.getDate() + 2)
    return dayAfter.toISOString().split('T')[0]
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    // Navigate to accommodation page with search params
    const params = new URLSearchParams()
    if (checkIn) params.set('checkIn', checkIn)
    if (checkOut) params.set('checkOut', checkOut)
    if (guests) params.set('guests', guests)
    navigate(`/accommodation?${params.toString()}`)
  }

  return (
    <div className="overflow-x-hidden">
      {/* Hero Section */}
      <section className="relative bg-gray-900 text-white min-h-screen flex flex-col justify-center overflow-hidden">
        {/* Background Image */}
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: 'url("https://images.unsplash.com/photo-1566073771259-6a8506099945?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80")',
          }}
        ></div>
        {/* Dark Overlay */}
        <div className="absolute inset-0 bg-black/60"></div>

        {/* Content */}
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24 w-full">
          <div className="text-center max-w-3xl mx-auto">
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold leading-tight mb-6">
              Your Home Away From Home
            </h1>
            <p className="text-base sm:text-lg md:text-xl text-gray-200 mb-10 leading-relaxed">
              Experience comfort and hospitality at Vilo Guest House. Whether you're traveling
              for business or leisure, we provide the perfect retreat.
            </p>

            {/* Search Form */}
            <form
              onSubmit={handleSearch}
              className="bg-white rounded-xl shadow-2xl p-4 sm:p-6"
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
                      value={checkIn}
                      onChange={(e) => setCheckIn(e.target.value)}
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
                      value={checkOut}
                      onChange={(e) => setCheckOut(e.target.value)}
                      min={checkIn || getDayAfterTomorrow()}
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
                      value={guests}
                      onChange={(e) => setGuests(e.target.value)}
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
                    className="w-full bg-gray-900 text-white py-3 px-6 rounded-lg font-medium hover:bg-gray-800 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2"
                  >
                    <Search size={18} />
                    Check Availability
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>

        {/* Scroll indicator */}
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
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Why Choose Vilo?
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto text-sm sm:text-base">
              We offer more than just a place to stay. Experience exceptional service and amenities
              designed for your comfort.
            </p>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 md:gap-8">
            {features.map((feature, index) => (
              <div
                key={feature.title}
                className={`bg-white p-4 sm:p-6 rounded-lg shadow-sm border border-gray-100 text-center hover:shadow-md hover:-translate-y-1 transition-all duration-300 ${
                  featuresSection.isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
                }`}
                style={{ transitionDelay: `${index * 100}ms` }}
              >
                <div className="inline-flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 bg-gray-100 rounded-full mb-3 sm:mb-4 transition-transform hover:scale-110">
                  <feature.icon size={20} className="text-gray-700 sm:w-6 sm:h-6" />
                </div>
                <h3 className="text-sm sm:text-lg font-semibold text-gray-900 mb-1 sm:mb-2">
                  {feature.title}
                </h3>
                <p className="text-gray-600 text-xs sm:text-sm">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Rooms Preview Section */}
      <section ref={roomsSection.ref} className="py-16 md:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className={`flex flex-col sm:flex-row sm:items-end sm:justify-between mb-8 sm:mb-12 gap-4 transition-all duration-700 ${roomsSection.isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <div>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-2 sm:mb-4">
                Our Accommodation
              </h2>
              <p className="text-gray-600 max-w-xl text-sm sm:text-base">
                Choose from our selection of comfortable rooms, each designed with your
                comfort in mind.
              </p>
            </div>
            <Link
              to="/accommodation"
              className="hidden sm:inline-flex items-center text-gray-900 font-medium hover:text-gray-700 transition-colors group"
            >
              View All Rooms
              <ArrowRight size={18} className="ml-2 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 md:gap-8">
              {[1, 2, 3].map((i) => (
                <div key={i} className="animate-pulse">
                  <div className="bg-gray-200 h-40 sm:h-48 rounded-lg mb-4"></div>
                  <div className="bg-gray-200 h-6 rounded w-3/4 mb-2"></div>
                  <div className="bg-gray-200 h-4 rounded w-1/2"></div>
                </div>
              ))}
            </div>
          ) : featuredRooms.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 md:gap-8">
              {featuredRooms.map((room, index) => (
                <Link
                  key={room.id}
                  to={`/accommodation/${room.id}`}
                  className={`group bg-white rounded-lg overflow-hidden border border-gray-200 hover:shadow-xl transition-all duration-500 hover:-translate-y-2 ${
                    roomsSection.isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
                  }`}
                  style={{ transitionDelay: `${index * 150}ms` }}
                >
                  <div className="relative h-40 sm:h-48 bg-gray-100 overflow-hidden">
                    {room.images?.featured ? (
                      <img
                        src={room.images.featured.url}
                        alt={room.name}
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
                        <BedDouble size={48} className="text-gray-300 transition-transform duration-300 group-hover:scale-110" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  </div>
                  <div className="p-4 sm:p-5">
                    <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2">
                      {room.name}
                    </h3>
                    <div className="flex items-center gap-3 sm:gap-4 text-xs sm:text-sm text-gray-600 mb-3">
                      <span className="flex items-center gap-1">
                        <BedDouble size={14} className="sm:w-4 sm:h-4" />
                        {room.bed_count}x {room.bed_type}
                      </span>
                      <span className="flex items-center gap-1">
                        <Users size={14} className="sm:w-4 sm:h-4" />
                        {room.max_guests} guests
                      </span>
                    </div>
                    <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                      <div>
                        <span className="text-lg sm:text-xl font-bold text-gray-900">
                          {formatCurrency(room.base_price_per_night, room.currency)}
                        </span>
                        <span className="text-xs sm:text-sm text-gray-500"> / night</span>
                      </div>
                      <span className="text-xs sm:text-sm font-medium text-gray-900 group-hover:text-gray-700 transition-colors">
                        View Details
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 md:gap-8">
              {/* Placeholder rooms when API is unavailable */}
              {[
                { id: '1', name: 'Deluxe Double Room', bedType: 'Double', guests: 2, price: 1500 },
                { id: '2', name: 'Family Suite', bedType: 'King', guests: 4, price: 2800 },
                { id: '3', name: 'Standard Single', bedType: 'Single', guests: 1, price: 850 },
              ].map((room, index) => (
                <Link
                  key={index}
                  to={`/accommodation/${room.id}`}
                  className={`group bg-white rounded-lg overflow-hidden border border-gray-200 hover:shadow-xl transition-all duration-500 hover:-translate-y-2 ${
                    roomsSection.isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
                  }`}
                  style={{ transitionDelay: `${index * 150}ms` }}
                >
                  <div className="relative h-40 sm:h-48 bg-gray-100 overflow-hidden">
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
                      <BedDouble size={48} className="text-gray-300 transition-transform duration-300 group-hover:scale-110" />
                    </div>
                  </div>
                  <div className="p-4 sm:p-5">
                    <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2">
                      {room.name}
                    </h3>
                    <div className="flex items-center gap-3 sm:gap-4 text-xs sm:text-sm text-gray-600 mb-3">
                      <span className="flex items-center gap-1">
                        <BedDouble size={14} className="sm:w-4 sm:h-4" />
                        1x {room.bedType}
                      </span>
                      <span className="flex items-center gap-1">
                        <Users size={14} className="sm:w-4 sm:h-4" />
                        {room.guests} guests
                      </span>
                    </div>
                    <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                      <div>
                        <span className="text-lg sm:text-xl font-bold text-gray-900">
                          R{room.price.toLocaleString()}
                        </span>
                        <span className="text-xs sm:text-sm text-gray-500"> / night</span>
                      </div>
                      <span className="text-xs sm:text-sm font-medium text-gray-900 group-hover:text-gray-700 transition-colors">
                        View Details
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}

          <div className="mt-6 sm:mt-8 text-center sm:hidden">
            <Link
              to="/accommodation"
              className="inline-flex items-center text-gray-900 font-medium hover:text-gray-700"
            >
              View All Rooms
              <ArrowRight size={18} className="ml-2" />
            </Link>
          </div>
        </div>
      </section>

      {/* Testimonials Section - Marquee Style */}
      <section ref={testimonialsSection.ref} className="py-16 md:py-24 bg-gray-50 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className={`text-center mb-8 sm:mb-12 transition-all duration-700 ${testimonialsSection.isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-2 sm:mb-4">
              What Our Guests Say
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto text-sm sm:text-base">
              Don't just take our word for it. Here's what our guests have to say about their stay.
            </p>
          </div>
        </div>

        {/* Marquee Container */}
        <div
          className="relative"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
        >
          {/* Gradient overlays for smooth fade effect */}
          <div className="absolute left-0 top-0 bottom-0 w-16 sm:w-32 bg-gradient-to-r from-gray-50 to-transparent z-10 pointer-events-none"></div>
          <div className="absolute right-0 top-0 bottom-0 w-16 sm:w-32 bg-gradient-to-l from-gray-50 to-transparent z-10 pointer-events-none"></div>

          {/* Scrolling testimonials */}
          <div
            className={`flex gap-4 sm:gap-6 ${isPaused ? '' : 'animate-marquee'}`}
            style={{
              width: 'max-content',
              animationPlayState: isPaused ? 'paused' : 'running'
            }}
          >
            {/* Double the testimonials for seamless loop */}
            {[...testimonials, ...testimonials].map((testimonial, index) => (
              <div
                key={index}
                className="w-[300px] sm:w-[350px] flex-shrink-0 bg-white p-5 sm:p-6 rounded-lg shadow-sm border border-gray-100 hover:shadow-md transition-shadow duration-300"
              >
                <div className="flex gap-0.5 sm:gap-1 mb-3 sm:mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} size={16} className="fill-yellow-400 text-yellow-400 sm:w-[18px] sm:h-[18px]" />
                  ))}
                </div>
                <p className="text-gray-700 mb-4 leading-relaxed text-sm sm:text-base line-clamp-3">
                  "{testimonial.text}"
                </p>
                <div className="border-t border-gray-100 pt-4">
                  <p className="font-medium text-gray-900 text-sm sm:text-base">{testimonial.name}</p>
                  <p className="text-xs sm:text-sm text-gray-500">{testimonial.location}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Pause indicator */}
        <div className={`text-center mt-4 transition-opacity duration-300 ${isPaused ? 'opacity-100' : 'opacity-0'}`}>
          <span className="text-xs text-gray-500">Paused - move mouse away to continue</span>
        </div>
      </section>

      {/* CTA Section */}
      <section ref={ctaSection.ref} className="py-16 md:py-24 bg-gray-900 text-white relative overflow-hidden">
        {/* Animated background elements */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 left-10 w-32 h-32 sm:w-64 sm:h-64 bg-white rounded-full blur-3xl animate-pulse-slow"></div>
          <div className="absolute bottom-10 right-10 w-48 h-48 sm:w-96 sm:h-96 bg-white rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: '1.5s' }}></div>
        </div>

        <div className={`relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center transition-all duration-700 ${ctaSection.isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4">
            Ready to Book Your Stay?
          </h2>
          <p className="text-gray-300 max-w-2xl mx-auto mb-6 sm:mb-8 text-sm sm:text-base">
            Check availability and book your room today. We look forward to welcoming you.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/accommodation"
              className="inline-flex items-center justify-center bg-white text-gray-900 px-6 sm:px-8 py-3 rounded-md text-base font-medium hover:bg-gray-100 transition-all duration-300 hover:scale-105 active:scale-95"
            >
              Book Now
            </Link>
            <Link
              to="/contact"
              className="inline-flex items-center justify-center border-2 border-white text-white px-6 sm:px-8 py-3 rounded-md text-base font-medium hover:bg-white hover:text-gray-900 transition-all duration-300 active:scale-95"
            >
              Get in Touch
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}

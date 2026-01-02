import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import {
  Waves,
  Trees,
  PawPrint,
  Heart,
  Users,
  User,
  Mountain,
  Star,
  ArrowRight,
  Check,
  Building2,
  Compass,
  Tent,
  Wine,
  Palmtree,
  Sunset,
  Camera,
  Utensils,
  Clock,
  Sparkles
} from 'lucide-react'
import DiscoveryHero from '../../components/discovery/DiscoveryHero'
import CategoryCard, { Category } from '../../components/discovery/CategoryCard'
import PropertyCard from '../../components/discovery/PropertyCard'
import { discoveryApi, DiscoveryProperty, PlatformStats, PropertyCategory, PlatformReview } from '../../services/discoveryApi'

// Recently viewed localStorage key
const RECENTLY_VIEWED_KEY = 'vilo_recently_viewed'

// Get recently viewed property slugs from localStorage
const getRecentlyViewedSlugs = (): string[] => {
  try {
    const stored = localStorage.getItem(RECENTLY_VIEWED_KEY)
    if (stored) {
      const parsed = JSON.parse(stored)
      return Array.isArray(parsed) ? parsed.slice(0, 4) : []
    }
  } catch (e) {
    console.error('Error reading recently viewed:', e)
  }
  return []
}

// Fallback categories (shown while loading or if API fails)
const defaultCategories: Category[] = [
  {
    slug: 'beach',
    name: 'Beachfront Stays',
    description: 'Wake up to ocean views and sandy beaches',
    icon: Waves,
    image: 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=800&auto=format&fit=crop&q=60' // Beach resort with ocean view
  },
  {
    slug: 'bush',
    name: 'Bush & Safari',
    description: 'Experience the African wilderness',
    icon: Trees,
    image: 'https://images.unsplash.com/photo-1516426122078-c23e76319801?w=800&auto=format&fit=crop&q=60' // African bush safari scene
  },
  {
    slug: 'pet-friendly',
    name: 'Pet-Friendly',
    description: 'Bring your furry friends along',
    icon: PawPrint,
    image: 'https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=800&auto=format&fit=crop&q=60' // Dogs running happily
  },
  {
    slug: 'romantic',
    name: 'Romantic Retreats',
    description: 'Perfect escapes for couples',
    icon: Heart,
    image: 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=800&auto=format&fit=crop&q=60' // Romantic luxury resort
  },
  {
    slug: 'family',
    name: 'Family Getaways',
    description: 'Spaces for the whole family',
    icon: Users,
    image: 'https://images.unsplash.com/photo-1602002418816-5c0aeef426aa?w=800&auto=format&fit=crop&q=60' // Family-friendly resort pool
  },
  {
    slug: 'mountain',
    name: 'Mountain Escapes',
    description: 'Breathtaking views and fresh air',
    icon: Mountain,
    image: 'https://images.unsplash.com/photo-1587061949409-02df41d5e562?w=800&auto=format&fit=crop&q=60' // Mountain cabin with views
  },
]

// Icon name to component mapping for categories
const categoryIcons: Record<string, typeof Compass> = {
  Waves,
  Trees,
  PawPrint,
  Heart,
  Users,
  Mountain,
  Compass,
  Building2,
  Star,
  Tent,
  Wine,
  Palmtree,
  Sunset,
  Camera,
  Utensils
}

// Category slug to image mapping - ensures correct images for each category
const categoryImages: Record<string, string> = {
  'beach': 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=800&auto=format&fit=crop&q=60', // Beach resort with ocean
  'beachfront': 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=800&auto=format&fit=crop&q=60',
  'bush': 'https://images.unsplash.com/photo-1516426122078-c23e76319801?w=800&auto=format&fit=crop&q=60', // African bush safari
  'safari': 'https://images.unsplash.com/photo-1516426122078-c23e76319801?w=800&auto=format&fit=crop&q=60',
  'wildlife': 'https://images.unsplash.com/photo-1516426122078-c23e76319801?w=800&auto=format&fit=crop&q=60',
  'pet-friendly': 'https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=800&auto=format&fit=crop&q=60', // Happy dogs
  'pets': 'https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=800&auto=format&fit=crop&q=60',
  'romantic': 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=800&auto=format&fit=crop&q=60', // Romantic luxury resort
  'couples': 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=800&auto=format&fit=crop&q=60',
  'family': 'https://images.unsplash.com/photo-1602002418816-5c0aeef426aa?w=800&auto=format&fit=crop&q=60', // Family resort pool
  'family-friendly': 'https://images.unsplash.com/photo-1602002418816-5c0aeef426aa?w=800&auto=format&fit=crop&q=60',
  'mountain': 'https://images.unsplash.com/photo-1587061949409-02df41d5e562?w=800&auto=format&fit=crop&q=60', // Mountain cabin
  'mountains': 'https://images.unsplash.com/photo-1587061949409-02df41d5e562?w=800&auto=format&fit=crop&q=60',
  'luxury': 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&auto=format&fit=crop&q=60', // Luxury pool resort
  'spa': 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=800&auto=format&fit=crop&q=60', // Spa wellness
  'adventure': 'https://images.unsplash.com/photo-1530789253388-582c481c54b0?w=800&auto=format&fit=crop&q=60', // Adventure outdoor
  'golf': 'https://images.unsplash.com/photo-1587174486073-ae5e5cff23aa?w=800&auto=format&fit=crop&q=60', // Golf course
  'wine': 'https://images.unsplash.com/photo-1506377247377-2a5b3b417ebb?w=800&auto=format&fit=crop&q=60', // Winelands vineyard
  'winelands': 'https://images.unsplash.com/photo-1506377247377-2a5b3b417ebb?w=800&auto=format&fit=crop&q=60',
  'city': 'https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=800&auto=format&fit=crop&q=60', // City skyline
  'urban': 'https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=800&auto=format&fit=crop&q=60',
  'countryside': 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=800&auto=format&fit=crop&q=60', // Countryside farm
  'farm': 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=800&auto=format&fit=crop&q=60',
  'camping': 'https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?w=800&auto=format&fit=crop&q=60', // Camping tent
  'glamping': 'https://images.unsplash.com/photo-1517823382935-51bfcb0ec6bc?w=800&auto=format&fit=crop&q=60', // Glamping luxury tent
}

// Convert API PropertyCategory to local Category format
const convertToCategory = (cat: PropertyCategory): Category => {
  // Get icon component from mapping or use Compass as fallback
  const iconName = cat.icon || 'Compass'
  const IconComponent = categoryIcons[iconName] || Compass

  // Use slug-based image mapping first, then API image, then fallback
  const image = categoryImages[cat.slug] ||
                cat.image_url ||
                'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&auto=format&fit=crop&q=60'

  return {
    slug: cat.slug,
    name: cat.name,
    description: cat.description || '',
    icon: IconComponent,
    image,
    propertyCount: cat.propertyCount
  }
}


// Fallback testimonials (used when no real reviews exist)
const fallbackTestimonials = [
  {
    id: 'fallback-1',
    quote: "Found the most amazing beachfront cottage for our anniversary. The booking was seamless and the host was incredibly helpful.",
    author: "Sarah M.",
    authorImage: null as string | null,
    location: "Johannesburg",
    rating: 5
  },
  {
    id: 'fallback-2',
    quote: "We've booked three trips through Vilo now. Love that we can book directly with hosts and support local businesses.",
    author: "Michael D.",
    authorImage: null as string | null,
    location: "Cape Town",
    rating: 5
  },
  {
    id: 'fallback-3',
    quote: "The search made it so easy to find a pet-friendly place for our family holiday. Our dog loved it as much as we did!",
    author: "Lisa K.",
    authorImage: null as string | null,
    location: "Pretoria",
    rating: 5
  },
]

export default function DiscoveryHome() {
  const [stats, setStats] = useState<PlatformStats>({ properties: 0, rooms: 0, bookings: 0, destinations: 8 })
  const [categories, setCategories] = useState<Category[]>(defaultCategories)
  const [featuredProperties, setFeaturedProperties] = useState<DiscoveryProperty[]>([])
  const [newlyAddedProperties, setNewlyAddedProperties] = useState<DiscoveryProperty[]>([])
  const [recentlyViewedProperties, setRecentlyViewedProperties] = useState<DiscoveryProperty[]>([])
  const [platformReviews, setPlatformReviews] = useState<PlatformReview[]>([])
  const [, setLoading] = useState(true)

  // Review carousel state
  const [isPaused, setIsPaused] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch all data in parallel
        const [statsData, categoriesData, featuredData, newlyAddedData, reviewsData] = await Promise.all([
          discoveryApi.getStats().catch(() => null),
          discoveryApi.getCategories().catch(() => null),
          discoveryApi.getFeatured(4).catch(() => null),
          discoveryApi.getNewlyAdded(4).catch(() => null),
          discoveryApi.getPlatformReviews(20).catch(() => null)
        ])

        if (statsData) {
          setStats(statsData)
        }

        // Use API categories if available
        if (categoriesData) {
          // Combine experience and trip_type categories, prioritizing experiences
          const allCategories = [
            ...(categoriesData.experience || []),
            ...(categoriesData.trip_type || [])
          ]
          if (allCategories.length > 0) {
            // Convert and take up to 6 categories
            setCategories(allCategories.slice(0, 6).map(convertToCategory))
          }
        }

        if (featuredData?.properties && featuredData.properties.length > 0) {
          setFeaturedProperties(featuredData.properties)
        }

        if (newlyAddedData?.properties && newlyAddedData.properties.length > 0) {
          setNewlyAddedProperties(newlyAddedData.properties)
        }

        if (reviewsData?.reviews && reviewsData.reviews.length > 0) {
          setPlatformReviews(reviewsData.reviews)
        }

        // Fetch recently viewed properties
        const recentSlugs = getRecentlyViewedSlugs()
        if (recentSlugs.length > 0) {
          const recentProperties = await Promise.all(
            recentSlugs.map(slug => discoveryApi.getProperty(slug).catch(() => null))
          )
          // Filter out nulls and cast PropertyDetail to DiscoveryProperty (it extends it)
          const validProperties = recentProperties
            .filter((p): p is NonNullable<typeof p> => p !== null)
            .map(p => p as DiscoveryProperty)
          setRecentlyViewedProperties(validProperties)
        }
      } catch (error) {
        console.error('Error fetching discovery data:', error)
        // Keep default data on error
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  // Review carousel auto-scroll effect
  useEffect(() => {
    if (!scrollRef.current || isPaused || platformReviews.length === 0) return

    const scrollContainer = scrollRef.current
    let animationFrameId: number
    let scrollPosition = 0
    const scrollSpeed = 0.5 // pixels per frame

    const animate = () => {
      scrollPosition += scrollSpeed

      // Reset position when we've scrolled through half (since content is duplicated)
      const halfWidth = scrollContainer.scrollWidth / 2
      if (scrollPosition >= halfWidth) {
        scrollPosition = 0
      }

      scrollContainer.scrollLeft = scrollPosition
      animationFrameId = requestAnimationFrame(animate)
    }

    animationFrameId = requestAnimationFrame(animate)

    return () => {
      cancelAnimationFrame(animationFrameId)
    }
  }, [isPaused, platformReviews.length])

  // Prepare reviews for carousel (use real reviews or fallback)
  const reviewsForCarousel = platformReviews.length > 0
    ? platformReviews.map(r => ({
        id: r.id,
        quote: r.comment || r.title || 'Great stay!',
        author: r.guestName,
        authorImage: r.guestProfilePicture,
        location: r.propertyName,
        rating: r.rating
      }))
    : fallbackTestimonials

  return (
    <div>
      {/* Hero Section */}
      <DiscoveryHero propertyCount={stats.properties} />

      {/* Featured Properties */}
      {featuredProperties.length > 0 && (
        <section className="py-16 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-8">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Star className="w-5 h-5 text-accent-500" />
                  <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">
                    Featured Properties
                  </h2>
                </div>
                <p className="text-gray-500">Handpicked stays for an unforgettable experience</p>
              </div>
              <Link
                to="/search"
                className="hidden sm:flex items-center gap-1 text-accent-600 font-medium hover:text-accent-700"
              >
                View all
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {featuredProperties.map((property) => (
                <PropertyCard key={property.id} property={property} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Newly Added Properties */}
      {newlyAddedProperties.length > 0 && (
        <section className="py-16 px-4 sm:px-6 lg:px-8 bg-gray-50">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-8">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Sparkles className="w-5 h-5 text-accent-500" />
                  <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">
                    Newly Added
                  </h2>
                </div>
                <p className="text-gray-500">Fresh listings just added to Vilo</p>
              </div>
              <Link
                to="/search?sort=newest"
                className="hidden sm:flex items-center gap-1 text-accent-600 font-medium hover:text-accent-700"
              >
                View all
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {newlyAddedProperties.map((property) => (
                <PropertyCard key={property.id} property={property} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Recently Viewed Properties */}
      {recentlyViewedProperties.length > 0 && (
        <section className="py-16 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-8">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Clock className="w-5 h-5 text-accent-500" />
                  <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">
                    Recently Viewed
                  </h2>
                </div>
                <p className="text-gray-500">Pick up where you left off</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {recentlyViewedProperties.map((property) => (
                <PropertyCard key={property.id} property={property} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Categories / Find Your Perfect Stay */}
      <section className={`py-16 px-4 sm:px-6 lg:px-8 ${recentlyViewedProperties.length > 0 ? 'bg-gray-50' : ''}`}>
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">
              Find Your Perfect Stay
            </h2>
            <p className="text-gray-500 mt-2">Browse by what matters most to you</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {categories.map((category) => (
              <CategoryCard key={category.slug} category={category} />
            ))}
          </div>
        </div>
      </section>

      {/* Moving Review Bar */}
      <section className="py-12 bg-accent-50 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-6">
          <div className="text-center">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">
              What Travelers Say
            </h2>
            <p className="text-gray-500 mt-2">Real experiences from our community</p>
          </div>
        </div>

        {/* Scrolling review container */}
        <div
          ref={scrollRef}
          className="flex gap-6 overflow-hidden"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {/* Duplicate reviews for seamless infinite scroll */}
          {[...reviewsForCarousel, ...reviewsForCarousel].map((review, index) => (
            <div
              key={`${review.id}-${index}`}
              className="flex-shrink-0 w-80 bg-white rounded-xl p-6 border border-gray-100 shadow-sm cursor-pointer transition-transform hover:scale-[1.02]"
              onMouseEnter={() => setIsPaused(true)}
              onMouseLeave={() => setIsPaused(false)}
            >
              <div className="flex gap-1 mb-3">
                {Array.from({ length: review.rating }).map((_, i) => (
                  <Star key={i} className="w-4 h-4 text-accent-400 fill-current" />
                ))}
              </div>
              <p className="text-gray-700 mb-4 leading-relaxed line-clamp-3">"{review.quote}"</p>
              <div className="border-t pt-3 flex items-center gap-3">
                {review.authorImage ? (
                  <img
                    src={review.authorImage}
                    alt={review.author}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                    <User className="w-5 h-5 text-gray-400" />
                  </div>
                )}
                <div>
                  <div className="font-semibold text-gray-900 text-sm">{review.author}</div>
                  <div className="text-xs text-gray-500">{review.location}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Host CTA */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          <div className="bg-gradient-to-br from-gray-900 to-black rounded-3xl p-8 sm:p-12 lg:p-16 relative overflow-hidden">
            {/* Background Pattern */}
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-0 right-0 w-96 h-96 bg-accent-500 rounded-full blur-3xl" />
              <div className="absolute bottom-0 left-0 w-64 h-64 bg-accent-600 rounded-full blur-3xl" />
            </div>

            <div className="relative grid lg:grid-cols-2 gap-8 items-center">
              <div>
                <div className="inline-flex items-center gap-2 bg-accent-500/20 text-accent-400 px-4 py-2 rounded-full text-sm font-medium mb-6">
                  <Building2 className="w-4 h-4" />
                  For Property Owners
                </div>
                <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
                  List your property on Vilo
                </h2>
                <p className="text-gray-300 text-lg mb-6">
                  Join hundreds of hosts earning more by taking direct bookings.
                  No commission fees — just a simple subscription.
                </p>

                <ul className="space-y-3 mb-8">
                  {[
                    'Keep 100% of your booking revenue',
                    'Manage bookings with our easy dashboard',
                    'Accept payments via Paystack, PayPal, EFT & more'
                  ].map((benefit) => (
                    <li key={benefit} className="flex items-center gap-3 text-gray-300">
                      <div className="w-5 h-5 rounded-full bg-accent-500/20 flex items-center justify-center">
                        <Check className="w-3 h-3 text-accent-400" />
                      </div>
                      {benefit}
                    </li>
                  ))}
                </ul>

                <Link
                  to="/for-hosts"
                  className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-3 rounded-full font-semibold transition-colors"
                >
                  Learn More
                  <ArrowRight className="w-5 h-5" />
                </Link>
              </div>

              <div className="hidden lg:block">
                <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
                  <div className="text-center mb-6">
                    <div className="text-5xl font-bold text-emerald-400 mb-2">R375</div>
                    <div className="text-gray-400">You save per booking</div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Avg. booking value</span>
                      <span className="text-white">R2,500</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">OTA commission (15%)</span>
                      <span className="text-red-400">-R375</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Vilo commission</span>
                      <span className="text-accent-400">R0</span>
                    </div>
                    <hr className="border-white/10" />
                    <div className="flex justify-between">
                      <span className="text-gray-300 font-medium">You save per booking</span>
                      <span className="text-accent-400 font-bold">R375</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

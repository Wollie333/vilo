import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  Waves,
  Trees,
  PawPrint,
  Heart,
  Users,
  Mountain,
  Star,
  ArrowRight,
  Check,
  Building2
} from 'lucide-react'
import DiscoveryHero from '../../components/discovery/DiscoveryHero'
import DestinationCard, { Destination } from '../../components/discovery/DestinationCard'
import CategoryCard, { Category } from '../../components/discovery/CategoryCard'
import PropertyCard from '../../components/discovery/PropertyCard'
import { discoveryApi, DiscoveryProperty, PlatformStats } from '../../services/discoveryApi'

// Default/fallback destinations (shown while loading or if API fails)
const defaultDestinations: Destination[] = [
  {
    slug: 'cape-town',
    name: 'Cape Town',
    image: 'https://images.unsplash.com/photo-1580060839134-75a5edca2e99?w=800&auto=format&fit=crop&q=60',
    propertyCount: 0
  },
  {
    slug: 'garden-route',
    name: 'Garden Route',
    image: 'https://images.unsplash.com/photo-1516026672322-bc52d61a55d5?w=800&auto=format&fit=crop&q=60',
    propertyCount: 0
  },
  {
    slug: 'kruger',
    name: 'Kruger National Park',
    image: 'https://images.unsplash.com/photo-1516426122078-c23e76319801?w=800&auto=format&fit=crop&q=60',
    propertyCount: 0
  },
  {
    slug: 'drakensberg',
    name: 'Drakensberg',
    image: 'https://images.unsplash.com/photo-1489392191049-fc10c97e64b6?w=800&auto=format&fit=crop&q=60',
    propertyCount: 0
  },
  {
    slug: 'durban',
    name: 'Durban',
    image: 'https://images.unsplash.com/photo-1577948000111-9c970dfe3743?w=800&auto=format&fit=crop&q=60',
    propertyCount: 0
  },
  {
    slug: 'wine-lands',
    name: 'Cape Winelands',
    image: 'https://images.unsplash.com/photo-1506377247377-2a5b3b417ebb?w=800&auto=format&fit=crop&q=60',
    propertyCount: 0
  },
]

// Destination images mapping for API data
const destinationImages: Record<string, string> = {
  'cape-town': 'https://images.unsplash.com/photo-1580060839134-75a5edca2e99?w=800&auto=format&fit=crop&q=60',
  'garden-route': 'https://images.unsplash.com/photo-1516026672322-bc52d61a55d5?w=800&auto=format&fit=crop&q=60',
  'kruger': 'https://images.unsplash.com/photo-1516426122078-c23e76319801?w=800&auto=format&fit=crop&q=60',
  'drakensberg': 'https://images.unsplash.com/photo-1489392191049-fc10c97e64b6?w=800&auto=format&fit=crop&q=60',
  'durban': 'https://images.unsplash.com/photo-1577948000111-9c970dfe3743?w=800&auto=format&fit=crop&q=60',
  'wine-lands': 'https://images.unsplash.com/photo-1506377247377-2a5b3b417ebb?w=800&auto=format&fit=crop&q=60',
  'johannesburg': 'https://images.unsplash.com/photo-1577948000111-9c970dfe3743?w=800&auto=format&fit=crop&q=60',
  'wild-coast': 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&auto=format&fit=crop&q=60',
}

const categories: Category[] = [
  {
    slug: 'beach',
    name: 'Beachfront Stays',
    description: 'Wake up to ocean views and sandy beaches',
    icon: Waves,
    image: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&auto=format&fit=crop&q=60'
  },
  {
    slug: 'safari',
    name: 'Safari & Wildlife',
    description: 'Get close to nature and the Big Five',
    icon: Trees,
    image: 'https://images.unsplash.com/photo-1547471080-7cc2caa01a7e?w=800&auto=format&fit=crop&q=60'
  },
  {
    slug: 'pet-friendly',
    name: 'Pet-Friendly',
    description: 'Bring your furry friends along',
    icon: PawPrint,
    image: 'https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=800&auto=format&fit=crop&q=60'
  },
  {
    slug: 'romantic',
    name: 'Romantic Retreats',
    description: 'Perfect escapes for couples',
    icon: Heart,
    image: 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=800&auto=format&fit=crop&q=60'
  },
  {
    slug: 'family',
    name: 'Family Getaways',
    description: 'Spaces for the whole family',
    icon: Users,
    image: 'https://images.unsplash.com/photo-1602002418082-a4443e081dd1?w=800&auto=format&fit=crop&q=60'
  },
  {
    slug: 'mountain',
    name: 'Mountain Escapes',
    description: 'Breathtaking views and fresh air',
    icon: Mountain,
    image: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800&auto=format&fit=crop&q=60'
  },
]

// Default featured properties (shown while loading or if API fails)
const defaultFeaturedProperties: DiscoveryProperty[] = [
  {
    id: '1',
    slug: 'oceanview-villa',
    tenantId: 'tenant1',
    name: 'Oceanview Villa',
    description: 'Stunning beachfront villa with panoramic ocean views, private pool, and direct beach access.',
    location: { city: 'Camps Bay', region: 'Cape Town' },
    images: ['https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=800&auto=format&fit=crop&q=60'],
    priceFrom: 2500,
    currency: 'ZAR',
    rating: 4.9,
    reviewCount: 127,
    propertyType: 'Villa',
    amenities: ['Pool', 'WiFi', 'Sea View', 'Kitchen']
  },
  {
    id: '2',
    slug: 'bush-lodge',
    tenantId: 'tenant2',
    name: 'Kruger Bush Lodge',
    description: 'Authentic safari experience with guided game drives and luxury tented accommodation.',
    location: { city: 'Hoedspruit', region: 'Limpopo' },
    images: ['https://images.unsplash.com/photo-1493246507139-91e8fad9978e?w=800&auto=format&fit=crop&q=60'],
    priceFrom: 3200,
    currency: 'ZAR',
    rating: 4.8,
    reviewCount: 89,
    propertyType: 'Lodge',
    amenities: ['Game Drives', 'Pool', 'Restaurant', 'WiFi']
  },
  {
    id: '3',
    slug: 'wine-estate-cottage',
    tenantId: 'tenant3',
    name: 'Wine Estate Cottage',
    description: 'Charming cottage nestled in the vineyards with wine tasting and gourmet dining.',
    location: { city: 'Franschhoek', region: 'Cape Winelands' },
    images: ['https://images.unsplash.com/photo-1505843513577-22bb7d21e455?w=800&auto=format&fit=crop&q=60'],
    priceFrom: 1800,
    currency: 'ZAR',
    rating: 4.7,
    reviewCount: 64,
    propertyType: 'Cottage',
    amenities: ['Wine Tasting', 'Garden', 'Fireplace', 'Breakfast']
  },
  {
    id: '4',
    slug: 'drakensberg-retreat',
    tenantId: 'tenant4',
    name: 'Mountain View Retreat',
    description: 'Peaceful mountain retreat with hiking trails and stunning Berg views.',
    location: { city: 'Champagne Valley', region: 'Drakensberg' },
    images: ['https://images.unsplash.com/photo-1518780664697-55e3ad937233?w=800&auto=format&fit=crop&q=60'],
    priceFrom: 1200,
    currency: 'ZAR',
    rating: 4.6,
    reviewCount: 52,
    propertyType: 'Guesthouse',
    amenities: ['Hiking', 'Mountain View', 'Braai', 'Parking']
  },
]

const testimonials = [
  {
    quote: "Found the most amazing beachfront cottage for our anniversary. The booking was seamless and the host was incredibly helpful.",
    author: "Sarah M.",
    location: "Johannesburg",
    rating: 5
  },
  {
    quote: "We've booked three trips through Vilo now. Love that we can book directly with hosts and support local businesses.",
    author: "Michael D.",
    location: "Cape Town",
    rating: 5
  },
  {
    quote: "The search made it so easy to find a pet-friendly place for our family holiday. Our dog loved it as much as we did!",
    author: "Lisa K.",
    location: "Pretoria",
    rating: 5
  },
]

export default function DiscoveryHome() {
  const [stats, setStats] = useState<PlatformStats>({ properties: 500, rooms: 0, bookings: 0, destinations: 8 })
  const [destinations, setDestinations] = useState<Destination[]>(defaultDestinations)
  const [featuredProperties, setFeaturedProperties] = useState<DiscoveryProperty[]>(defaultFeaturedProperties)
  const [, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch all data in parallel
        const [statsData, destinationsData, featuredData] = await Promise.all([
          discoveryApi.getStats().catch(() => null),
          discoveryApi.getDestinations().catch(() => null),
          discoveryApi.getFeatured(4).catch(() => null)
        ])

        if (statsData) {
          setStats(statsData)
        }

        if (destinationsData?.destinations) {
          // Map API destinations with fallback images
          const mappedDestinations = destinationsData.destinations.map(dest => ({
            ...dest,
            image: dest.image || destinationImages[dest.slug] || 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&auto=format&fit=crop&q=60'
          }))
          // If we have destinations, use them; otherwise keep defaults
          if (mappedDestinations.length > 0) {
            setDestinations(mappedDestinations.slice(0, 6))
          }
        }

        if (featuredData?.properties && featuredData.properties.length > 0) {
          setFeaturedProperties(featuredData.properties)
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

  return (
    <div>
      {/* Hero Section */}
      <DiscoveryHero propertyCount={stats.properties} />

      {/* Trending Destinations */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">
                Trending Destinations
              </h2>
              <p className="text-gray-500 mt-1">Explore popular spots across South Africa</p>
            </div>
            <Link
              to="/search"
              className="hidden sm:flex items-center gap-1 text-accent-600 font-medium hover:text-accent-700"
            >
              View all
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {destinations.map((destination) => (
              <DestinationCard key={destination.slug} destination={destination} />
            ))}
          </div>
        </div>
      </section>

      {/* Categories / Themed Getaways */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-gray-50">
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

      {/* Featured Properties */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">
                Featured Properties
              </h2>
              <p className="text-gray-500 mt-1">Handpicked stays for an unforgettable experience</p>
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

      {/* How It Works */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-accent-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">
              How Vilo Works
            </h2>
            <p className="text-gray-500 mt-2">Book directly with hosts in three simple steps</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                step: '01',
                title: 'Search & Discover',
                description: 'Browse hundreds of unique accommodations across South Africa. Filter by location, dates, and what matters to you.'
              },
              {
                step: '02',
                title: 'Book Directly',
                description: 'Book with confidence knowing you\'re dealing directly with verified hosts. No middleman fees.'
              },
              {
                step: '03',
                title: 'Enjoy Your Stay',
                description: 'Arrive and enjoy. Your host is there to help make your stay memorable.'
              }
            ].map((item) => (
              <div key={item.step} className="text-center">
                <div className="w-16 h-16 bg-black text-white rounded-2xl flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                  {item.step}
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{item.title}</h3>
                <p className="text-gray-600">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">
              What Travelers Say
            </h2>
            <p className="text-gray-500 mt-2">Real experiences from our community</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <div key={index} className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm">
                <div className="flex gap-1 mb-4">
                  {Array.from({ length: testimonial.rating }).map((_, i) => (
                    <Star key={i} className="w-5 h-5 text-accent-400 fill-current" />
                  ))}
                </div>
                <p className="text-gray-700 mb-4 leading-relaxed">"{testimonial.quote}"</p>
                <div>
                  <div className="font-semibold text-gray-900">{testimonial.author}</div>
                  <div className="text-sm text-gray-500">{testimonial.location}</div>
                </div>
              </div>
            ))}
          </div>
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
                    'Get your own branded booking website',
                    'Accept payments directly via Paystack'
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
                  className="inline-flex items-center gap-2 bg-black hover:bg-gray-800 text-white px-6 py-3 rounded-full font-semibold transition-colors"
                >
                  Learn More
                  <ArrowRight className="w-5 h-5" />
                </Link>
              </div>

              <div className="hidden lg:block">
                <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
                  <div className="text-center mb-6">
                    <div className="text-5xl font-bold text-white mb-2">R0</div>
                    <div className="text-gray-400">Commission per booking</div>
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

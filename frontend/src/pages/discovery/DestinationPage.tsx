import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { MapPin, Loader2 } from 'lucide-react'
import SearchBar from '../../components/discovery/SearchBar'
import PropertyCard from '../../components/discovery/PropertyCard'
import { discoveryApi, DiscoveryProperty, Destination } from '../../services/discoveryApi'

// Fallback destination images
const destinationImages: Record<string, string> = {
  'cape-town': 'https://images.unsplash.com/photo-1580060839134-75a5edca2e99?w=1920&auto=format&fit=crop&q=80',
  'garden-route': 'https://images.unsplash.com/photo-1516026672322-bc52d61a55d5?w=1920&auto=format&fit=crop&q=80',
  'kruger': 'https://images.unsplash.com/photo-1516426122078-c23e76319801?w=1920&auto=format&fit=crop&q=80',
  'drakensberg': 'https://images.unsplash.com/photo-1489392191049-fc10c97e64b6?w=1920&auto=format&fit=crop&q=80',
  'durban': 'https://images.unsplash.com/photo-1577948000111-9c970dfe3743?w=1920&auto=format&fit=crop&q=80',
  'wine-lands': 'https://images.unsplash.com/photo-1506377247377-2a5b3b417ebb?w=1920&auto=format&fit=crop&q=80',
  'johannesburg': 'https://images.unsplash.com/photo-1577948000111-9c970dfe3743?w=1920&auto=format&fit=crop&q=80',
  'wild-coast': 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1920&auto=format&fit=crop&q=80',
}

// Fallback destination descriptions
const destinationDescriptions: Record<string, string> = {
  'cape-town': 'The Mother City offers stunning beaches, Table Mountain, vibrant culture, and world-class dining.',
  'garden-route': 'A scenic stretch of coastline featuring lush forests, dramatic cliffs, and charming coastal towns.',
  'kruger': 'South Africa\'s premier safari destination. Experience the Big Five and incredible wildlife.',
  'drakensberg': 'Majestic mountain range perfect for hiking, climbing, and escaping to nature.',
  'durban': 'Warm waters, golden beaches, and rich Indian-influenced culture.',
  'wine-lands': 'Rolling vineyards, historic estates, and award-winning wines.',
}

export default function DestinationPage() {
  const { region } = useParams()
  const [destination, setDestination] = useState<Destination | null>(null)
  const [properties, setProperties] = useState<DiscoveryProperty[]>([])
  const [otherDestinations, setOtherDestinations] = useState<Destination[]>([])
  const [loading, setLoading] = useState(true)
  const [sortBy, setSortBy] = useState<'popular' | 'price_asc' | 'price_desc' | 'rating'>('popular')
  const [hasMore, setHasMore] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [offset, setOffset] = useState(0)
  const LIMIT = 12

  useEffect(() => {
    const fetchData = async () => {
      if (!region) return

      setLoading(true)
      setOffset(0)

      try {
        // Fetch destination with properties
        const destData = await discoveryApi.getDestination(region, {
          sort: sortBy,
          limit: LIMIT
        })

        // Set destination with fallback values
        setDestination({
          id: destData.destination.id,
          slug: destData.destination.slug,
          name: destData.destination.name,
          description: destData.destination.description || destinationDescriptions[region] || 'Discover amazing accommodations in this beautiful destination.',
          image_url: destData.destination.image_url || destinationImages[region] || 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1920&auto=format&fit=crop&q=80',
          propertyCount: destData.total
        })

        setProperties(destData.properties)
        setHasMore(destData.hasMore)

        // Fetch other destinations for "Explore nearby"
        const allDests = await discoveryApi.getDestinations()
        const others = allDests.destinations
          .filter(d => d.slug !== region)
          .slice(0, 4)
          .map(d => ({
            ...d,
            image: d.image || destinationImages[d.slug] || 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&auto=format&fit=crop&q=60'
          }))
        setOtherDestinations(others)

      } catch (error) {
        console.error('Error fetching destination:', error)
        // Set fallback destination
        const name = region.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
        setDestination({
          id: `fallback-${region}`,
          slug: region,
          name,
          description: destinationDescriptions[region] || 'Discover amazing accommodations in this beautiful destination.',
          image_url: destinationImages[region] || 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1920&auto=format&fit=crop&q=80',
          propertyCount: 0
        })
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [region, sortBy])

  const loadMore = async () => {
    if (!region || loadingMore || !hasMore) return

    setLoadingMore(true)
    try {
      const newOffset = offset + LIMIT
      const destData = await discoveryApi.getDestination(region, {
        sort: sortBy,
        limit: LIMIT,
        offset: newOffset
      })

      setProperties(prev => [...prev, ...destData.properties])
      setHasMore(destData.hasMore)
      setOffset(newOffset)
    } catch (error) {
      console.error('Error loading more properties:', error)
    } finally {
      setLoadingMore(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-accent-500" />
      </div>
    )
  }

  if (!destination) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center">
        <MapPin className="w-16 h-16 text-gray-300 mb-4" />
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Destination Not Found</h1>
        <p className="text-gray-500 mb-6">The destination you're looking for doesn't exist.</p>
        <Link to="/" className="text-accent-600 font-medium hover:text-accent-700">
          Browse all destinations
        </Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Hero */}
      <section className="relative min-h-[600px] flex items-center justify-center overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url('${destination.image_url || destination.image}')` }}
        >
          <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/30 to-black/60" />
        </div>

        <div className="relative z-10 text-center max-w-4xl mx-auto px-4">
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm text-white px-4 py-2 rounded-full text-sm mb-4">
            <MapPin className="w-4 h-4" />
            South Africa
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-4">
            {destination.name}
          </h1>

          <p className="text-lg text-white/80 mb-8 max-w-2xl mx-auto">
            {destination.description}
          </p>

          <div className="max-w-3xl mx-auto">
            <SearchBar
              variant="expanded"
              initialValues={{ location: destination.name }}
            />
          </div>
        </div>
      </section>

      {/* Properties */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              Places to stay in {destination.name}
            </h2>
            <p className="text-gray-500 mt-1">
              {destination.propertyCount} {destination.propertyCount === 1 ? 'property' : 'properties'} available
            </p>
          </div>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            className="px-4 py-2 border border-gray-200 rounded-lg bg-white text-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-accent-500"
          >
            <option value="popular">Most Popular</option>
            <option value="price_asc">Price: Low to High</option>
            <option value="price_desc">Price: High to Low</option>
            <option value="rating">Highest Rated</option>
          </select>
        </div>

        {properties.length === 0 ? (
          <div className="text-center py-20">
            <MapPin className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No properties found</h3>
            <p className="text-gray-500">There are no properties listed in this destination yet.</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {properties.map((property) => (
                <PropertyCard key={property.id} property={property} />
              ))}
            </div>

            {/* Load More */}
            {hasMore && (
              <div className="text-center mt-12">
                <button
                  onClick={loadMore}
                  disabled={loadingMore}
                  className="px-8 py-3 border border-gray-300 rounded-full text-gray-700 font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  {loadingMore ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Loading...
                    </span>
                  ) : (
                    'Load more properties'
                  )}
                </button>
              </div>
            )}
          </>
        )}
      </section>

      {/* Nearby Destinations */}
      {otherDestinations.length > 0 && (
        <section className="bg-gray-50 py-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              Explore nearby
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {otherDestinations.map((dest) => (
                <Link
                  key={dest.slug}
                  to={`/destinations/${dest.slug}`}
                  className="group relative rounded-xl overflow-hidden aspect-[4/3]"
                >
                  <img
                    src={dest.image || destinationImages[dest.slug] || 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800'}
                    alt={dest.name}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-4">
                    <h3 className="font-semibold text-white">{dest.name}</h3>
                    <p className="text-white/80 text-sm">{dest.propertyCount} properties</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  )
}

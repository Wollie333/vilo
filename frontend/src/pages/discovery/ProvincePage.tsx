import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, MapPin, Grid, List, SlidersHorizontal } from 'lucide-react'
import PropertyCard from '../../components/discovery/PropertyCard'
import { discoveryApi, Province, Destination, DiscoveryProperty } from '../../services/discoveryApi'

const sortOptions = [
  { value: 'popular', label: 'Most Popular' },
  { value: 'price_asc', label: 'Price: Low to High' },
  { value: 'price_desc', label: 'Price: High to Low' },
  { value: 'rating', label: 'Highest Rated' },
]

export default function ProvincePage() {
  const { provinceSlug } = useParams<{ provinceSlug: string }>()
  const [province, setProvince] = useState<(Province & { destinations: Destination[]; propertyCount: number }) | null>(null)
  const [properties, setProperties] = useState<DiscoveryProperty[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [sortBy, setSortBy] = useState('popular')
  const [selectedDestination, setSelectedDestination] = useState<string | null>(null)

  // Fetch province data
  useEffect(() => {
    if (!provinceSlug) return

    const fetchProvince = async () => {
      try {
        const data = await discoveryApi.getProvinceBySlug(provinceSlug)
        setProvince(data)
      } catch (err) {
        console.error('Error fetching province:', err)
        setError('Province not found')
      }
    }

    fetchProvince()
  }, [provinceSlug])

  // Fetch properties
  useEffect(() => {
    if (!provinceSlug) return

    const fetchProperties = async () => {
      setLoading(true)
      try {
        const result = await discoveryApi.searchProperties({
          province_slug: provinceSlug,
          destination_slug: selectedDestination || undefined,
          sort: sortBy as 'popular' | 'price_asc' | 'price_desc' | 'rating',
          limit: 50
        })
        setProperties(result.properties)
      } catch (err) {
        console.error('Error fetching properties:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchProperties()
  }, [provinceSlug, sortBy, selectedDestination])

  if (error || (!loading && !province)) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Province not found</h1>
          <p className="text-gray-600 mb-4">{error || 'The province you are looking for does not exist.'}</p>
          <Link to="/" className="text-emerald-600 hover:text-emerald-700 font-medium">
            Go back home
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Header */}
      <section className="relative min-h-[600px] flex items-center justify-center overflow-hidden">
        {/* Background */}
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: province?.image_url
              ? `url('${province.image_url}')`
              : `url('https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=1920&auto=format&fit=crop&q=80')`,
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/30 to-black/50" />
        </div>

        {/* Content */}
        <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-white/80 hover:text-white mb-6 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to browse
          </Link>

          {province ? (
            <>
              <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm text-white px-4 py-2 rounded-full text-sm font-medium mb-4 border border-white/20">
                <MapPin className="w-4 h-4" />
                <span>{province.countries?.name || 'South Africa'}</span>
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-4 leading-tight">
                {province.name}
              </h1>

              <p className="text-white/60">
                {province.propertyCount} {province.propertyCount === 1 ? 'property' : 'properties'} available
              </p>
            </>
          ) : (
            <div className="animate-pulse">
              <div className="h-12 bg-white/20 rounded w-48 mx-auto mb-4" />
              <div className="h-6 bg-white/20 rounded w-24 mx-auto" />
            </div>
          )}
        </div>
      </section>

      {/* Destinations */}
      {province && province.destinations.length > 0 && (
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center gap-2 overflow-x-auto pb-2">
              <button
                onClick={() => setSelectedDestination(null)}
                className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                  !selectedDestination
                    ? 'bg-emerald-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                All Destinations
              </button>
              {province.destinations.map(dest => (
                <button
                  key={dest.id}
                  onClick={() => setSelectedDestination(dest.slug)}
                  className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                    selectedDestination === dest.slug
                      ? 'bg-emerald-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {dest.name}
                  {dest.propertyCount > 0 && (
                    <span className="ml-1 text-xs opacity-75">({dest.propertyCount})</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Filters Bar */}
      <div className="bg-white border-b border-gray-200 sticky top-16 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {/* View Toggle */}
              <div className="hidden sm:flex items-center bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded-md transition-colors ${
                    viewMode === 'grid' ? 'bg-white shadow-sm' : 'text-gray-500'
                  }`}
                >
                  <Grid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded-md transition-colors ${
                    viewMode === 'list' ? 'bg-white shadow-sm' : 'text-gray-500'
                  }`}
                >
                  <List className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Sort */}
            <div className="flex items-center gap-3">
              <SlidersHorizontal className="w-4 h-4 text-gray-400" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-4 py-2 border border-gray-200 rounded-lg bg-white text-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                {sortOptions.map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500" />
          </div>
        ) : properties.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <MapPin className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No properties found</h3>
            <p className="text-gray-500 mb-6">
              {selectedDestination
                ? 'There are no properties in this destination yet.'
                : 'There are no properties in this province yet.'}
            </p>
            {selectedDestination && (
              <button
                onClick={() => setSelectedDestination(null)}
                className="inline-flex items-center gap-2 text-emerald-600 font-medium hover:text-emerald-700"
              >
                View all destinations
              </button>
            )}
          </div>
        ) : (
          <div className={viewMode === 'grid'
            ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6'
            : 'space-y-4'
          }>
            {properties.map(property => (
              <PropertyCard
                key={property.id}
                property={property}
                layout={viewMode}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

import { useState, useEffect } from 'react'
import { Search, MapPin, Star, Loader2, ExternalLink, Building2, ChevronRight } from 'lucide-react'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3002/api'

// ============================================
// TYPES
// ============================================

interface DirectoryProperty {
  id: string
  slug: string
  custom_domain: string | null
  business_name: string
  business_description: string | null
  directory_description: string | null
  directory_featured_image_url: string | null
  directory_tags: string[]
  logo_url: string | null
  city: string | null
  state_province: string | null
  country: string | null
  currency: string | null
  website_url: string
  room_count?: number
  min_price?: number
  max_price?: number
  average_rating?: number
  review_count?: number
}

interface Location {
  city: string
  country: string
  count: number
}

// ============================================
// COMPONENT
// ============================================

export default function Directory() {
  const [properties, setProperties] = useState<DirectoryProperty[]>([])
  const [locations, setLocations] = useState<Location[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCity, setSelectedCity] = useState('')
  const [selectedCountry, setSelectedCountry] = useState('')

  // Fetch properties
  const fetchProperties = async () => {
    try {
      setLoading(true)

      const params = new URLSearchParams()
      if (searchQuery) params.set('search', searchQuery)
      if (selectedCity) params.set('city', selectedCity)
      if (selectedCountry) params.set('country', selectedCountry)
      params.set('limit', '50')

      const response = await fetch(`${API_URL}/directory/properties?${params}`)
      const data = await response.json()

      setProperties(data.properties || [])
    } catch (error) {
      console.error('Error fetching properties:', error)
      setProperties([])
    } finally {
      setLoading(false)
    }
  }

  // Fetch locations for filter
  const fetchLocations = async () => {
    try {
      const response = await fetch(`${API_URL}/directory/locations`)
      const data = await response.json()
      setLocations(data || [])
    } catch (error) {
      console.error('Error fetching locations:', error)
    }
  }

  useEffect(() => {
    fetchLocations()
    fetchProperties()
  }, [])

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchProperties()
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQuery, selectedCity, selectedCountry])

  // Get unique countries
  const countries = [...new Set(locations.map(l => l.country))].filter(Boolean).sort()

  // Get cities for selected country
  const cities = locations
    .filter(l => !selectedCountry || l.country === selectedCountry)
    .sort((a, b) => b.count - a.count)

  // Format currency
  const formatPrice = (price: number | undefined, currency: string | null) => {
    if (!price) return null
    const currencySymbol = currency === 'USD' ? '$' : currency === 'EUR' ? '\u20AC' : currency === 'GBP' ? '\u00A3' : 'R'
    return `${currencySymbol}${price.toLocaleString()}`
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <div className="bg-gradient-to-br from-gray-900 to-gray-800 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
          <div className="text-center">
            <h1 className="text-4xl sm:text-5xl font-bold mb-4">
              Find Your Perfect Stay
            </h1>
            <p className="text-xl text-gray-300 max-w-2xl mx-auto mb-8">
              Discover unique accommodations from trusted hosts across South Africa and beyond
            </p>

            {/* Search Bar */}
            <div className="max-w-2xl mx-auto">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by name or location..."
                  className="w-full pl-12 pr-4 py-4 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filters */}
        <div className="flex flex-wrap gap-4 mb-8">
          <select
            value={selectedCountry}
            onChange={(e) => {
              setSelectedCountry(e.target.value)
              setSelectedCity('')
            }}
            className="px-4 py-2 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-gray-400"
          >
            <option value="">All Countries</option>
            {countries.map(country => (
              <option key={country} value={country}>{country}</option>
            ))}
          </select>

          <select
            value={selectedCity}
            onChange={(e) => setSelectedCity(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-gray-400"
          >
            <option value="">All Cities</option>
            {cities.map(loc => (
              <option key={`${loc.city}-${loc.country}`} value={loc.city}>
                {loc.city} ({loc.count})
              </option>
            ))}
          </select>

          {(searchQuery || selectedCity || selectedCountry) && (
            <button
              onClick={() => {
                setSearchQuery('')
                setSelectedCity('')
                setSelectedCountry('')
              }}
              className="px-4 py-2 text-gray-600 hover:text-gray-900"
            >
              Clear filters
            </button>
          )}
        </div>

        {/* Results */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="animate-spin text-gray-400" size={40} />
          </div>
        ) : properties.length === 0 ? (
          <div className="text-center py-16">
            <Building2 className="mx-auto text-gray-300 mb-4" size={48} />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No properties found</h3>
            <p className="text-gray-600">
              {searchQuery || selectedCity || selectedCountry
                ? 'Try adjusting your search or filters'
                : 'Check back soon for new listings'}
            </p>
          </div>
        ) : (
          <>
            <p className="text-gray-600 mb-6">
              {properties.length} {properties.length === 1 ? 'property' : 'properties'} found
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {properties.map(property => (
                <PropertyCard key={property.id} property={property} formatPrice={formatPrice} />
              ))}
            </div>
          </>
        )}
      </div>

      {/* Footer CTA */}
      <div className="bg-gray-900 text-white py-16">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold mb-4">
            Own an accommodation business?
          </h2>
          <p className="text-gray-300 mb-8 max-w-2xl mx-auto">
            List your property on Vilo and reach guests looking for unique stays.
            Get your own booking website with custom domain support.
          </p>
          <a
            href="https://vilo.io/signup"
            className="inline-flex items-center gap-2 px-6 py-3 bg-white text-gray-900 font-semibold rounded-lg hover:bg-gray-100 transition-colors"
          >
            Get Started Free
            <ChevronRight size={18} />
          </a>
        </div>
      </div>
    </div>
  )
}

// ============================================
// PROPERTY CARD
// ============================================

function PropertyCard({
  property,
  formatPrice
}: {
  property: DirectoryProperty
  formatPrice: (price: number | undefined, currency: string | null) => string | null
}) {
  const location = [property.city, property.country].filter(Boolean).join(', ')
  const priceDisplay = property.min_price
    ? property.max_price && property.max_price !== property.min_price
      ? `${formatPrice(property.min_price, property.currency)} - ${formatPrice(property.max_price, property.currency)}`
      : `From ${formatPrice(property.min_price, property.currency)}`
    : null

  return (
    <a
      href={property.website_url}
      target="_blank"
      rel="noopener noreferrer"
      className="group bg-white rounded-xl overflow-hidden shadow-sm border border-gray-200 hover:shadow-lg hover:border-gray-300 transition-all"
    >
      {/* Image */}
      <div className="aspect-[4/3] bg-gray-100 relative overflow-hidden">
        {property.directory_featured_image_url ? (
          <img
            src={property.directory_featured_image_url}
            alt={property.business_name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : property.logo_url ? (
          <div className="w-full h-full flex items-center justify-center bg-gray-50">
            <img
              src={property.logo_url}
              alt={property.business_name}
              className="max-w-[60%] max-h-[60%] object-contain"
            />
          </div>
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
            <Building2 className="text-gray-300" size={48} />
          </div>
        )}

        {/* Rating Badge */}
        {property.average_rating && (
          <div className="absolute top-3 right-3 flex items-center gap-1 px-2 py-1 bg-white/90 backdrop-blur-sm rounded-lg text-sm font-medium">
            <Star className="text-yellow-500 fill-yellow-500" size={14} />
            {property.average_rating}
            {property.review_count && (
              <span className="text-gray-500">({property.review_count})</span>
            )}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="font-semibold text-gray-900 text-lg group-hover:text-blue-600 transition-colors">
          {property.business_name}
        </h3>

        {location && (
          <div className="flex items-center gap-1 text-gray-500 text-sm mt-1">
            <MapPin size={14} />
            {location}
          </div>
        )}

        {property.directory_description && (
          <p className="text-gray-600 text-sm mt-2 line-clamp-2">
            {property.directory_description}
          </p>
        )}

        {/* Tags */}
        {property.directory_tags && property.directory_tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-3">
            {property.directory_tags.slice(0, 3).map(tag => (
              <span
                key={tag}
                className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
          {priceDisplay ? (
            <div className="text-sm">
              <span className="font-semibold text-gray-900">{priceDisplay}</span>
              <span className="text-gray-500"> / night</span>
            </div>
          ) : (
            <div className="text-sm text-gray-500">
              {property.room_count ? `${property.room_count} rooms` : 'View details'}
            </div>
          )}

          <span className="flex items-center gap-1 text-blue-600 text-sm font-medium group-hover:gap-2 transition-all">
            Visit
            <ExternalLink size={14} />
          </span>
        </div>
      </div>
    </a>
  )
}

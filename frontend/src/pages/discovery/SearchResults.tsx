import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { SlidersHorizontal, Grid, List, MapPin, X, Calendar, Users, Moon, Tag } from 'lucide-react'
import SearchBar from '../../components/discovery/SearchBar'
import PropertyCard from '../../components/discovery/PropertyCard'
import { discoveryApi, DiscoveryProperty } from '../../services/discoveryApi'

const amenityOptions = ['WiFi', 'Pool', 'Parking', 'Kitchen', 'Sea View', 'Pet-Friendly', 'Breakfast', 'Air Conditioning']
const propertyTypes = ['All', 'Villa', 'Lodge', 'Cottage', 'Guesthouse', 'House', 'Cabin', 'Hotel']
const sortOptions = [
  { value: 'popular', label: 'Most Popular' },
  { value: 'price_asc', label: 'Price: Low to High' },
  { value: 'price_desc', label: 'Price: High to Low' },
  { value: 'rating', label: 'Highest Rated' },
]

export default function SearchResults() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [showFilters, setShowFilters] = useState(false)
  const [properties, setProperties] = useState<DiscoveryProperty[]>([])
  const [totalResults, setTotalResults] = useState(0)
  const [loading, setLoading] = useState(true)

  // Filter state
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 10000])
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([])
  const [selectedType, setSelectedType] = useState('All')
  const [sortBy, setSortBy] = useState<'popular' | 'price_asc' | 'price_desc' | 'rating'>('popular')
  const [showSearchCard, setShowSearchCard] = useState(true)

  const location = searchParams.get('location') || ''
  const checkIn = searchParams.get('checkIn') || ''
  const checkOut = searchParams.get('checkOut') || ''
  const guests = searchParams.get('guests') || '2'
  const hasCoupons = searchParams.get('has_coupons') === 'true'

  useEffect(() => {
    const fetchProperties = async () => {
      setLoading(true)
      try {
        const result = await discoveryApi.searchProperties({
          location: location || undefined,
          checkIn: checkIn || undefined,
          checkOut: checkOut || undefined,
          guests: guests ? parseInt(guests) : undefined,
          minPrice: priceRange[0] > 0 ? priceRange[0] : undefined,
          maxPrice: priceRange[1] < 10000 ? priceRange[1] : undefined,
          propertyType: selectedType !== 'All' ? selectedType : undefined,
          amenities: selectedAmenities.length > 0 ? selectedAmenities : undefined,
          sort: sortBy,
          limit: 50,
          has_coupons: hasCoupons || undefined
        })

        setProperties(result.properties)
        setTotalResults(result.total)
      } catch (error) {
        console.error('Error fetching properties:', error)
        setProperties([])
        setTotalResults(0)
      } finally {
        setLoading(false)
      }
    }

    fetchProperties()
  }, [location, checkIn, checkOut, guests, selectedType, priceRange, selectedAmenities, sortBy, hasCoupons])

  const toggleAmenity = (amenity: string) => {
    setSelectedAmenities(prev =>
      prev.includes(amenity)
        ? prev.filter(a => a !== amenity)
        : [...prev, amenity]
    )
  }

  const clearFilters = () => {
    setPriceRange([0, 10000])
    setSelectedAmenities([])
    setSelectedType('All')
    setSortBy('popular')
    // Also remove special offers filter from URL
    if (hasCoupons) {
      const newParams = new URLSearchParams(searchParams)
      newParams.delete('has_coupons')
      setSearchParams(newParams)
    }
  }

  const clearSearch = () => {
    // Clear all search params and hide the search summary card
    setSearchParams({})
    setShowSearchCard(false)
    // Also clear the filters
    clearFilters()
  }

  const hasActiveFilters = selectedType !== 'All' || selectedAmenities.length > 0 || priceRange[0] > 0 || priceRange[1] < 10000 || hasCoupons

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Search Header */}
      <div className="bg-emerald-500 border-b border-emerald-600 sticky top-16 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col lg:flex-row items-center gap-4">
            <div className="flex-1 w-full">
              <SearchBar
                variant="compact"
                initialValues={{ location, checkIn, checkOut, guests: parseInt(guests) }}
              />
            </div>

            <div className="flex items-center gap-3">
              {/* Filter Toggle */}
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${
                  showFilters || hasActiveFilters
                    ? 'bg-accent-50 border-accent-200 text-accent-700'
                    : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                }`}
              >
                <SlidersHorizontal className="w-4 h-4" />
                Filters
                {hasActiveFilters && (
                  <span className="w-5 h-5 bg-accent-500 text-white text-xs rounded-full flex items-center justify-center">
                    {selectedAmenities.length + (selectedType !== 'All' ? 1 : 0)}
                  </span>
                )}
              </button>

              {/* View Toggle */}
              <div className="hidden sm:flex items-center bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded-md transition-colors ${viewMode === 'grid' ? 'bg-white shadow-sm' : 'text-gray-500'
                    }`}
                >
                  <Grid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded-md transition-colors ${viewMode === 'list' ? 'bg-white shadow-sm' : 'text-gray-500'
                    }`}
                >
                  <List className="w-4 h-4" />
                </button>
              </div>

              {/* Sort */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'popular' | 'price_asc' | 'price_desc' | 'rating')}
                className="px-4 py-2 border border-gray-200 rounded-lg bg-white text-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-accent-500"
              >
                {sortOptions.map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Active Filters (excluding hasCoupons which shows in its own banner) */}
          {(selectedType !== 'All' || selectedAmenities.length > 0 || priceRange[0] > 0 || priceRange[1] < 10000) && (
            <div className="flex items-center gap-2 mt-4 flex-wrap">
              {selectedType !== 'All' && (
                <span className="inline-flex items-center gap-1 px-3 py-1 bg-accent-100 text-accent-700 rounded-full text-sm">
                  {selectedType}
                  <button onClick={() => setSelectedType('All')}>
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              {selectedAmenities.map(amenity => (
                <span key={amenity} className="inline-flex items-center gap-1 px-3 py-1 bg-accent-100 text-accent-700 rounded-full text-sm">
                  {amenity}
                  <button onClick={() => toggleAmenity(amenity)}>
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
              <button
                onClick={clearFilters}
                className="text-sm text-gray-500 hover:text-gray-700 underline"
              >
                Clear all
              </button>
            </div>
          )}
        </div>

        {/* Expanded Filters Panel */}
        {showFilters && (
          <div className="border-t border-gray-200 bg-white">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Price Range */}
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Price Range (per night)</h4>
                  <div className="flex items-center gap-4">
                    <input
                      type="number"
                      value={priceRange[0]}
                      onChange={(e) => setPriceRange([parseInt(e.target.value) || 0, priceRange[1]])}
                      className="w-24 px-3 py-2 border border-gray-200 rounded-lg text-sm"
                      placeholder="Min"
                    />
                    <span className="text-gray-400">to</span>
                    <input
                      type="number"
                      value={priceRange[1]}
                      onChange={(e) => setPriceRange([priceRange[0], parseInt(e.target.value) || 10000])}
                      className="w-24 px-3 py-2 border border-gray-200 rounded-lg text-sm"
                      placeholder="Max"
                    />
                  </div>
                </div>

                {/* Property Type */}
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Property Type</h4>
                  <div className="flex flex-wrap gap-2">
                    {propertyTypes.map(type => (
                      <button
                        key={type}
                        onClick={() => setSelectedType(type)}
                        className={`px-3 py-1.5 rounded-full text-sm transition-colors ${selectedType === type
                            ? 'bg-black text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Amenities */}
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Amenities</h4>
                  <div className="flex flex-wrap gap-2">
                    {amenityOptions.map(amenity => (
                      <button
                        key={amenity}
                        onClick={() => toggleAmenity(amenity)}
                        className={`px-3 py-1.5 rounded-full text-sm transition-colors ${selectedAmenities.includes(amenity)
                            ? 'bg-black text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                      >
                        {amenity}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Special Offers Banner */}
      {hasCoupons && (
        <div className="bg-gradient-to-r from-emerald-500 to-teal-500">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-white/20 rounded-xl">
                  <Tag className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white">Special Offers</h2>
                  <p className="text-white/90">Properties with exclusive discounts and promotional codes</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/20 text-white rounded-full text-sm font-medium">
                  <Tag className="w-3.5 h-3.5" />
                  Special Offers
                  <button
                    onClick={() => {
                      const newParams = new URLSearchParams(searchParams)
                      newParams.delete('has_coupons')
                      setSearchParams(newParams)
                    }}
                    className="ml-1 hover:bg-white/20 rounded-full p-0.5"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
                <button
                  onClick={clearFilters}
                  className="text-sm text-white font-medium hover:underline"
                >
                  Clear all
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Results */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search Summary Card - only show when an actual search was performed (location or dates) */}
        {showSearchCard && !hasCoupons && (location || checkIn || checkOut) && (
          <SearchSummaryCard
            location={location}
            checkIn={checkIn}
            checkOut={checkOut}
            guests={parseInt(guests)}
            totalResults={totalResults}
            onClear={clearSearch}
          />
        )}

        {/* Loading State */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent-500" />
          </div>
        ) : properties.length === 0 ? (
          /* Empty State */
          <div className="text-center py-20">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <MapPin className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No properties found</h3>
            <p className="text-gray-500 mb-6">Try adjusting your filters or search criteria</p>
            <button
              onClick={clearFilters}
              className="text-accent-600 font-medium hover:text-accent-700"
            >
              Clear all filters
            </button>
          </div>
        ) : (
          /* Property Grid/List */
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

// Search Summary Card Component
function SearchSummaryCard({
  location,
  checkIn,
  checkOut,
  guests,
  totalResults,
  onClear
}: {
  location: string
  checkIn: string
  checkOut: string
  guests: number
  totalResults: number
  onClear: () => void
}) {
  // Calculate number of nights
  const calculateNights = () => {
    if (!checkIn || !checkOut) return null
    const start = new Date(checkIn)
    const end = new Date(checkOut)
    const diffTime = end.getTime() - start.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays > 0 ? diffDays : null
  }

  const nights = calculateNights()

  // Format date for display
  const formatDate = (dateStr: string) => {
    if (!dateStr) return null
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    })
  }

  const hasSearchParams = location || checkIn || checkOut || guests > 0

  if (!hasSearchParams) return null

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 mb-6 shadow-sm">
      <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">Your search</div>
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        {/* Location */}
        {location && (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center">
              <MapPin className="w-4 h-4 text-emerald-600" />
            </div>
            <div>
              <div className="text-xs text-gray-500">Destination</div>
              <div className="text-sm font-medium text-gray-900">{location}</div>
            </div>
          </div>
        )}

        {/* Divider */}
        {location && (checkIn || checkOut) && (
          <div className="hidden sm:block w-px h-10 bg-gray-200" />
        )}

        {/* Check-in */}
        {checkIn && (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center">
              <Calendar className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <div className="text-xs text-gray-500">Check-in</div>
              <div className="text-sm font-medium text-gray-900">{formatDate(checkIn)}</div>
            </div>
          </div>
        )}

        {/* Check-out */}
        {checkOut && (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center">
              <Calendar className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <div className="text-xs text-gray-500">Check-out</div>
              <div className="text-sm font-medium text-gray-900">{formatDate(checkOut)}</div>
            </div>
          </div>
        )}

        {/* Nights */}
        {nights && (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-purple-50 flex items-center justify-center">
              <Moon className="w-4 h-4 text-purple-600" />
            </div>
            <div>
              <div className="text-xs text-gray-500">Duration</div>
              <div className="text-sm font-medium text-gray-900">{nights} night{nights !== 1 ? 's' : ''}</div>
            </div>
          </div>
        )}

        {/* Divider */}
        {(checkIn || checkOut || nights) && guests > 0 && (
          <div className="hidden sm:block w-px h-10 bg-gray-200" />
        )}

        {/* Guests */}
        {guests > 0 && (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-amber-50 flex items-center justify-center">
              <Users className="w-4 h-4 text-amber-600" />
            </div>
            <div>
              <div className="text-xs text-gray-500">Guests</div>
              <div className="text-sm font-medium text-gray-900">{guests} guest{guests !== 1 ? 's' : ''}</div>
            </div>
          </div>
        )}

        {/* Results Count & Clear Button - pushed to the right */}
        <div className="ml-auto flex items-center gap-3">
          <div className="flex items-center gap-2 bg-gray-100 px-3 py-1.5 rounded-full">
            <span className="text-sm font-semibold text-gray-900">{totalResults}</span>
            <span className="text-sm text-gray-600">{totalResults === 1 ? 'result' : 'results'}</span>
          </div>
          <button
            onClick={onClear}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-3.5 h-3.5" />
            Clear
          </button>
        </div>
      </div>
    </div>
  )
}

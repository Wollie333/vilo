import { useState, useEffect } from 'react'
import { SlidersHorizontal, Grid, List, MapPin, X, Search } from 'lucide-react'
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

export default function PortalBrowse() {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [showFilters, setShowFilters] = useState(false)
  const [properties, setProperties] = useState<DiscoveryProperty[]>([])
  const [totalResults, setTotalResults] = useState(0)
  const [loading, setLoading] = useState(true)

  // Search state
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')

  // Filter state
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 10000])
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([])
  const [selectedType, setSelectedType] = useState('All')
  const [sortBy, setSortBy] = useState<'popular' | 'price_asc' | 'price_desc' | 'rating'>('popular')

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQuery])

  useEffect(() => {
    const fetchProperties = async () => {
      setLoading(true)
      try {
        const result = await discoveryApi.searchProperties({
          location: debouncedSearch || undefined,
          minPrice: priceRange[0] > 0 ? priceRange[0] : undefined,
          maxPrice: priceRange[1] < 10000 ? priceRange[1] : undefined,
          propertyType: selectedType !== 'All' ? selectedType : undefined,
          amenities: selectedAmenities.length > 0 ? selectedAmenities : undefined,
          sort: sortBy,
          limit: 50,
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
  }, [debouncedSearch, selectedType, priceRange, selectedAmenities, sortBy])

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
    setSearchQuery('')
  }

  const hasActiveFilters = selectedType !== 'All' || selectedAmenities.length > 0 || priceRange[0] > 0 || priceRange[1] < 10000

  return (
    <div className="min-h-full bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="p-6 md:p-8">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Find Accommodation</h1>
            <p className="text-gray-600 mt-1">Browse all properties and book your next stay</p>
          </div>

          {/* Search and Controls */}
          <div className="flex flex-col lg:flex-row items-start lg:items-center gap-4">
            {/* Search Input */}
            <div className="relative flex-1 w-full lg:max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by location, property name..."
                className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent"
              />
            </div>

            <div className="flex items-center gap-3 w-full lg:w-auto">
              {/* Filter Toggle */}
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border transition-colors ${
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
                  className={`p-2 rounded-md transition-colors ${viewMode === 'grid' ? 'bg-white shadow-sm' : 'text-gray-500'}`}
                >
                  <Grid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded-md transition-colors ${viewMode === 'list' ? 'bg-white shadow-sm' : 'text-gray-500'}`}
                >
                  <List className="w-4 h-4" />
                </button>
              </div>

              {/* Sort */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'popular' | 'price_asc' | 'price_desc' | 'rating')}
                className="px-4 py-2.5 border border-gray-200 rounded-lg bg-white text-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-accent-500"
              >
                {sortOptions.map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Active Filters */}
          {hasActiveFilters && (
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
          <div className="border-t border-gray-200 bg-gray-50">
            <div className="p-6 md:p-8">
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
                            ? 'bg-gray-900 text-white'
                            : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-100'
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
                            ? 'bg-gray-900 text-white'
                            : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-100'
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

      {/* Results */}
      <div className="p-6 md:p-8">
        {/* Results count */}
        <div className="flex items-center justify-between mb-6">
          <p className="text-sm text-gray-600">
            {loading ? 'Loading...' : `${totalResults} ${totalResults === 1 ? 'property' : 'properties'} found`}
          </p>
        </div>

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
            ? 'grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6'
            : 'space-y-4'
          }>
            {properties.map(property => (
              <PropertyCard
                key={property.id}
                property={property}
                layout={viewMode}
                linkPrefix="/portal/bookings/browse"
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

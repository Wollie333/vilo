import { useState, useEffect, useCallback } from 'react'
import { useParams, Link, useSearchParams, useLocation } from 'react-router-dom'
import {
  MapPin,
  Star,
  Heart,
  Share2,
  ChevronLeft,
  ChevronRight,
  Users,
  Bed,
  Bath,
  Wifi,
  Car,
  Coffee,
  Waves,
  TreePine,
  Check,
  Loader2,
  Clock,
  Phone,
  Mail,
  Home,
  Camera,
  X,
  Grid,
  ChevronDown,
  Award,
  Shield,
  AlertCircle,
  Sparkles,
  Tag
} from 'lucide-react'
import { discoveryApi, PropertyDetail as PropertyDetailType } from '../../services/discoveryApi'
import RatesTab from '../../components/discovery/RatesTab'
import GoogleMap from '../../components/discovery/GoogleMap'
import DateRangePicker from '../../components/DateRangePicker'

// Icon mapping for amenities
const amenityIcons: Record<string, typeof Wifi> = {
  'WiFi': Wifi,
  'Parking': Car,
  'Pool': Waves,
  'Breakfast': Coffee,
  'Garden': TreePine,
  'Kitchen': Coffee,
  'Sea View': Waves,
  'Pet-Friendly': TreePine,
  'Air Conditioning': Wifi,
}

// Default placeholder images
const defaultImages = [
  'https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=1200&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1200&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1200&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=1200&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1582719508461-905c673771fd?w=1200&auto=format&fit=crop&q=80',
]

type TabType = 'overview' | 'rooms' | 'rates' | 'reviews' | 'location'

export default function PropertyDetail() {
  const { slug } = useParams()
  const [searchParams] = useSearchParams()
  const location = useLocation()
  const [property, setProperty] = useState<PropertyDetailType | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentImage, setCurrentImage] = useState(0)
  const [isFavorite, setIsFavorite] = useState(false)
  const [showGallery, setShowGallery] = useState(false)
  const [showAllAmenities, setShowAllAmenities] = useState(false)

  // Get initial tab from URL hash
  const getTabFromHash = useCallback((): TabType => {
    const hash = location.hash.replace('#', '')
    const validTabs: TabType[] = ['overview', 'rooms', 'rates', 'reviews', 'location']
    return validTabs.includes(hash as TabType) ? (hash as TabType) : 'overview'
  }, [location.hash])

  const [activeTab, setActiveTab] = useState<TabType>(getTabFromHash())

  // Update active tab when hash changes
  useEffect(() => {
    setActiveTab(getTabFromHash())
  }, [getTabFromHash])

  // Handle tab change and update URL hash
  const handleTabChange = useCallback((tab: TabType) => {
    setActiveTab(tab)
    window.history.replaceState(null, '', `#${tab}`)
  }, [])

  // Booking form state
  const [checkIn, setCheckIn] = useState(searchParams.get('checkIn') || '')
  const [checkOut, setCheckOut] = useState(searchParams.get('checkOut') || '')
  const [guests, setGuests] = useState(parseInt(searchParams.get('guests') || '2'))

  useEffect(() => {
    const fetchProperty = async () => {
      if (!slug) return

      setLoading(true)
      setError(null)

      try {
        const data = await discoveryApi.getProperty(slug)
        setProperty(data)
      } catch (err) {
        console.error('Error fetching property:', err)
        setError('Property not found')
      } finally {
        setLoading(false)
      }
    }

    fetchProperty()
  }, [slug])

  const images = property?.images?.length ? property.images : defaultImages

  const nextImage = () => {
    setCurrentImage((prev) => (prev + 1) % images.length)
  }

  const prevImage = () => {
    setCurrentImage((prev) => (prev - 1 + images.length) % images.length)
  }

  const totalCapacity = property?.rooms?.reduce((sum, room) => sum + (room.maxGuests || 0), 0) || 0
  const totalBedrooms = property?.rooms?.reduce((sum, room) => sum + (room.bedrooms || 1), 0) || 0
  const totalBathrooms = property?.rooms?.reduce((sum, room) => sum + (room.bathrooms || 1), 0) || 0

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-accent-500" />
      </div>
    )
  }

  // Error state
  if (error || !property) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center">
        <MapPin className="w-16 h-16 text-gray-300 mb-4" />
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Property Not Found</h1>
        <p className="text-gray-500 mb-6">The property you're looking for doesn't exist or is no longer available.</p>
        <Link to="/search" className="text-accent-600 font-medium hover:text-accent-700">
          Browse all properties
        </Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Breadcrumb */}
      <div className="bg-gray-50 border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <nav className="flex items-center gap-2 text-sm">
            <Link to="/" className="text-gray-500 hover:text-gray-700">
              <Home className="w-4 h-4" />
            </Link>
            <ChevronRight className="w-4 h-4 text-gray-400" />
            <Link to={`/destinations/${property.location.region?.toLowerCase().replace(/\s+/g, '-')}`} className="text-gray-500 hover:text-gray-700">
              {property.location.region}
            </Link>
            <ChevronRight className="w-4 h-4 text-gray-400" />
            <span className="text-gray-700 font-medium truncate">{property.name}</span>
          </nav>
        </div>
      </div>

      {/* Image Gallery - LekkeSlaap style grid */}
      <div className="relative bg-gray-100">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-4 grid-rows-2 gap-2 h-[400px] md:h-[500px] p-2">
            {/* Main large image */}
            <button
              onClick={() => setShowGallery(true)}
              className="col-span-2 row-span-2 relative overflow-hidden rounded-l-xl group"
            >
              <img
                src={images[0]}
                alt={property.name}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
            </button>

            {/* Smaller images */}
            {images.slice(1, 5).map((img, i) => (
              <button
                key={i}
                onClick={() => { setCurrentImage(i + 1); setShowGallery(true) }}
                className={`relative overflow-hidden group ${
                  i === 1 ? 'rounded-tr-xl' : i === 3 ? 'rounded-br-xl' : ''
                }`}
              >
                <img
                  src={img}
                  alt={`${property.name} ${i + 2}`}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
              </button>
            ))}

            {/* View All Photos Button */}
            <button
              onClick={() => setShowGallery(true)}
              className="absolute bottom-6 right-6 flex items-center gap-2 px-4 py-2 bg-white rounded-lg shadow-lg hover:shadow-xl transition-shadow text-sm font-medium"
            >
              <Grid className="w-4 h-4" />
              View all {images.length} photos
            </button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="absolute top-6 right-6 flex items-center gap-2">
          <button
            onClick={() => setIsFavorite(!isFavorite)}
            className="p-2.5 bg-white rounded-full shadow-lg hover:shadow-xl transition-shadow"
          >
            <Heart className={`w-5 h-5 ${isFavorite ? 'fill-red-500 text-red-500' : 'text-gray-600'}`} />
          </button>
          <button className="p-2.5 bg-white rounded-full shadow-lg hover:shadow-xl transition-shadow">
            <Share2 className="w-5 h-5 text-gray-600" />
          </button>
        </div>
      </div>

      {/* Full Gallery Modal */}
      {showGallery && (
        <div className="fixed inset-0 z-50 bg-black">
          <div className="relative h-full flex flex-col">
            {/* Gallery Header */}
            <div className="flex items-center justify-between p-4 text-white">
              <span className="text-lg font-medium">{currentImage + 1} / {images.length}</span>
              <button
                onClick={() => setShowGallery(false)}
                className="p-2 hover:bg-white/10 rounded-full transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Gallery Content */}
            <div className="flex-1 flex items-center justify-center px-4">
              <button
                onClick={prevImage}
                className="absolute left-4 p-3 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
              >
                <ChevronLeft className="w-8 h-8 text-white" />
              </button>

              <img
                src={images[currentImage]}
                alt={`${property.name} ${currentImage + 1}`}
                className="max-h-[80vh] max-w-full object-contain"
              />

              <button
                onClick={nextImage}
                className="absolute right-4 p-3 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
              >
                <ChevronRight className="w-8 h-8 text-white" />
              </button>
            </div>

            {/* Thumbnail Strip */}
            <div className="p-4 flex justify-center gap-2 overflow-x-auto">
              {images.map((img, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentImage(i)}
                  className={`flex-shrink-0 w-16 h-12 rounded overflow-hidden ${
                    currentImage === i ? 'ring-2 ring-white' : 'opacity-50 hover:opacity-100'
                  }`}
                >
                  <img src={img} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="sticky top-16 z-30 bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex gap-8">
            {(['overview', 'rooms', 'rates', 'reviews', 'location'] as TabType[]).map((tab) => (
              <button
                key={tab}
                onClick={() => handleTabChange(tab)}
                className={`py-4 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab
                    ? 'border-black text-black'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            {/* Property Header */}
            <div className="mb-8">
              <div className="flex items-center gap-2 mb-3 flex-wrap">
                {property.featured && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-medium">
                    <Award className="w-3 h-3" />
                    Prime Pick
                  </span>
                )}
                <span className="px-2.5 py-1 bg-accent-100 text-accent-700 rounded-full text-xs font-medium">
                  {property.propertyType}
                </span>
                {property.categories && property.categories.length > 0 && property.categories.map((category) => (
                  <span
                    key={category}
                    className="px-2.5 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium capitalize"
                  >
                    {category.replace(/-/g, ' ')}
                  </span>
                ))}
              </div>

              <h1 className="text-3xl font-bold text-gray-900 mb-3">{property.name}</h1>

              <div className="flex items-center gap-4 text-sm text-gray-600 mb-4">
                <span className="flex items-center gap-1">
                  <MapPin className="w-4 h-4" />
                  {property.location.city}, {property.location.region}
                </span>
                {property.rating && (
                  <span className="flex items-center gap-1">
                    <Star className="w-4 h-4 text-accent-500 fill-current" />
                    <span className="font-semibold text-gray-900">{property.rating}</span>
                    <span>({property.reviewCount} reviews)</span>
                  </span>
                )}
              </div>

              {/* Quick Stats */}
              <div className="flex items-center gap-6 py-4 border-y border-gray-100">
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-gray-400" />
                  <span className="text-gray-700">{totalCapacity} guests</span>
                </div>
                <div className="flex items-center gap-2">
                  <Bed className="w-5 h-5 text-gray-400" />
                  <span className="text-gray-700">{totalBedrooms} bedrooms</span>
                </div>
                <div className="flex items-center gap-2">
                  <Bath className="w-5 h-5 text-gray-400" />
                  <span className="text-gray-700">{totalBathrooms} bathrooms</span>
                </div>
              </div>
            </div>

            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <>
                {/* Seasonal Message Banner */}
                {property.seasonalMessage && (
                  <div className="mb-10 p-4 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl">
                    <p className="text-amber-800 text-sm">
                      <strong>Special Notice:</strong> {property.seasonalMessage}
                    </p>
                  </div>
                )}

                {/* Property Highlights */}
                {property.propertyHighlights && property.propertyHighlights.length > 0 && (
                  <div className="mb-10 flex flex-wrap gap-2">
                    {property.propertyHighlights.map((highlight, i) => (
                      <span key={i} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-accent-50 text-accent-700 rounded-full text-sm font-medium">
                        <Sparkles className="w-4 h-4" />
                        {highlight}
                      </span>
                    ))}
                  </div>
                )}

                {/* Special Offers - Main Content */}
                {property.specialOffers && property.specialOffers.filter(o => o.active).length > 0 && (
                  <div className="mb-10 space-y-3">
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                      <Tag className="w-5 h-5 text-accent-500" />
                      Special Offers
                    </h3>
                    {property.specialOffers.filter(o => o.active).map((offer, i) => (
                      <div key={i} className="p-4 bg-gradient-to-r from-emerald-50 to-teal-50 border border-accent-200 rounded-xl">
                        <div className="font-medium text-accent-800">{offer.title}</div>
                        <p className="text-sm text-accent-700 mt-1">{offer.description}</p>
                        {offer.valid_until && (
                          <p className="text-xs text-accent-600 mt-2">
                            Valid until {new Date(offer.valid_until).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Description */}
                {property.description && (
                  <div className="mb-12">
                    <h2 className="text-xl font-semibold text-gray-900 mb-5">About this property</h2>
                    <div className="prose prose-gray max-w-none">
                      {property.description.split('\n\n').map((paragraph, i) => (
                        <p key={i} className="text-gray-600 mb-4 leading-relaxed">{paragraph}</p>
                      ))}
                    </div>
                  </div>
                )}

                {/* Amenities */}
                {property.amenities && property.amenities.length > 0 && (
                  <div className="mb-12">
                    <h2 className="text-xl font-semibold text-gray-900 mb-5">Amenities & Features</h2>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {(showAllAmenities ? property.amenities : property.amenities.slice(0, 6)).map((amenity) => {
                        const Icon = amenityIcons[amenity] || Check
                        return (
                          <div key={amenity} className="flex items-center gap-3 p-3 rounded-lg border border-gray-100">
                            <Icon className="w-5 h-5 text-accent-500" />
                            <span className="text-gray-700 text-sm">{amenity}</span>
                          </div>
                        )
                      })}
                    </div>
                    {property.amenities.length > 6 && (
                      <button
                        onClick={() => setShowAllAmenities(!showAllAmenities)}
                        className="mt-4 flex items-center gap-1 text-accent-600 font-medium text-sm hover:text-accent-700"
                      >
                        {showAllAmenities ? 'Show less' : `Show all ${property.amenities.length} amenities`}
                        <ChevronDown className={`w-4 h-4 transition-transform ${showAllAmenities ? 'rotate-180' : ''}`} />
                      </button>
                    )}
                  </div>
                )}

                {/* Policies */}
                <div className="mb-12">
                  <h2 className="text-xl font-semibold text-gray-900 mb-5">House Rules & Policies</h2>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 bg-gray-50 rounded-xl">
                      <div className="flex items-center gap-2 mb-2">
                        <Clock className="w-5 h-5 text-gray-400" />
                        <span className="text-sm text-gray-500">Check-in</span>
                      </div>
                      <div className="font-semibold text-gray-900">From {property.checkInTime || '14:00'}</div>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-xl">
                      <div className="flex items-center gap-2 mb-2">
                        <Clock className="w-5 h-5 text-gray-400" />
                        <span className="text-sm text-gray-500">Check-out</span>
                      </div>
                      <div className="font-semibold text-gray-900">Before {property.checkOutTime || '10:00'}</div>
                    </div>
                    <div className="p-4 bg-accent-50 rounded-xl">
                      <div className="flex items-center gap-2 mb-2">
                        <Shield className="w-5 h-5 text-accent-500" />
                        <span className="text-sm text-accent-700">Cancellation</span>
                      </div>
                      <div className="font-semibold text-accent-700 text-sm">
                        {property.cancellationPolicies?.[0]?.label || 'Free cancellation up to 7 days before'}
                      </div>
                    </div>
                  </div>

                  {/* House Rules List */}
                  {property.houseRules && property.houseRules.length > 0 && (
                    <div className="mt-6">
                      <h3 className="text-lg font-medium text-gray-900 mb-3">House Rules</h3>
                      <ul className="space-y-2">
                        {property.houseRules.map((rule, i) => (
                          <li key={i} className="flex items-start gap-3">
                            <AlertCircle className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0" />
                            <span className="text-gray-700">{rule}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Cancellation Policies */}
                  {property.cancellationPolicies && property.cancellationPolicies.length > 0 && (
                    <div className="mt-6">
                      <h3 className="text-lg font-medium text-gray-900 mb-3">Cancellation Policy</h3>
                      <div className="space-y-3">
                        {property.cancellationPolicies.map((policy, i) => (
                          <div key={i} className="flex items-start gap-3 p-3 bg-accent-50 rounded-lg">
                            <Shield className="w-5 h-5 text-accent-500 mt-0.5 flex-shrink-0" />
                            <div>
                              <span className="text-accent-800 font-medium">{policy.label}</span>
                              {policy.refund_percentage !== undefined && (
                                <p className="text-sm text-accent-600 mt-1">
                                  {policy.refund_percentage}% refund if cancelled {policy.days_before} days before check-in
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Rooms Tab */}
            {activeTab === 'rooms' && (
              <div className="mb-12">
                <h2 className="text-xl font-semibold text-gray-900 mb-6">Available Rooms & Rates</h2>
                {property.rooms && property.rooms.length > 0 ? (
                  <div className="space-y-4">
                    {property.rooms.map((room) => (
                      <div key={room.id} className="border border-gray-200 rounded-xl overflow-hidden hover:border-accent-200 hover:shadow-md transition-all">
                        <div className="flex flex-col md:flex-row">
                          {/* Room Image */}
                          <div className="md:w-72 h-48 md:h-auto relative">
                            <img
                              src={room.images?.[0] || defaultImages[0]}
                              alt={room.name}
                              className="w-full h-full object-cover"
                            />
                            {room.images && room.images.length > 1 && (
                              <div className="absolute bottom-2 right-2 flex items-center gap-1 px-2 py-1 bg-black/60 rounded text-white text-xs">
                                <Camera className="w-3 h-3" />
                                {room.images.length}
                              </div>
                            )}
                          </div>

                          {/* Room Details */}
                          <div className="flex-1 p-5">
                            <div className="flex items-start justify-between mb-3">
                              <div>
                                <h3 className="font-semibold text-lg text-gray-900">{room.name}</h3>
                                {room.description && (
                                  <p className="text-sm text-gray-600 mt-1 line-clamp-2">{room.description}</p>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
                              <span className="flex items-center gap-1">
                                <Users className="w-4 h-4" />
                                Sleeps {room.maxGuests}
                              </span>
                              {room.bedrooms && (
                                <span className="flex items-center gap-1">
                                  <Bed className="w-4 h-4" />
                                  {room.bedrooms} bed{room.bedrooms > 1 ? 's' : ''}
                                </span>
                              )}
                              {room.bathrooms && (
                                <span className="flex items-center gap-1">
                                  <Bath className="w-4 h-4" />
                                  {room.bathrooms} bath
                                </span>
                              )}
                            </div>

                            <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                              <div>
                                <span className="text-2xl font-bold text-gray-900">R{room.basePrice.toLocaleString()}</span>
                                <span className="text-gray-500 text-sm ml-1">/ night</span>
                              </div>
                              <Link
                                to={`/accommodation/${slug}/book?room=${room.id}`}
                                className="px-6 py-2.5 bg-black hover:bg-gray-800 text-white rounded-lg font-medium transition-colors"
                              >
                                Reserve
                              </Link>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500">No rooms available at the moment.</p>
                )}
              </div>
            )}

            {/* Rates Tab */}
            {activeTab === 'rates' && (
              <div className="mb-12">
                <RatesTab
                  rooms={property.rooms || []}
                  cancellationPolicies={property.cancellationPolicies || []}
                  whatsIncluded={property.whatsIncluded || []}
                  propertySlug={slug || ''}
                />
              </div>
            )}

            {/* Reviews Tab */}
            {activeTab === 'reviews' && (
              <div className="mb-12">
                <div className="flex items-center justify-between mb-8">
                  <h2 className="text-xl font-semibold text-gray-900">Guest Reviews</h2>
                  {property.rating && (
                    <div className="flex items-center gap-3 bg-accent-50 px-4 py-2 rounded-lg">
                      <Star className="w-6 h-6 text-accent-500 fill-current" />
                      <div>
                        <span className="text-xl font-bold text-accent-700">{property.rating}</span>
                        <span className="text-sm text-accent-600 ml-1">/ 5</span>
                      </div>
                      <span className="text-sm text-accent-600">({property.reviewCount} reviews)</span>
                    </div>
                  )}
                </div>

                {/* Review Categories */}
                {property.rating && (
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
                    {[
                      { label: 'Cleanliness', rating: 4.5 },
                      { label: 'Location', rating: 4.8 },
                      { label: 'Value', rating: 4.3 },
                      { label: 'Service', rating: 4.6 },
                      { label: 'Safety', rating: 4.7 },
                    ].map((cat) => (
                      <div key={cat.label} className="text-center p-3 bg-gray-50 rounded-lg">
                        <div className="text-lg font-semibold text-gray-900">{cat.rating}</div>
                        <div className="text-xs text-gray-500">{cat.label}</div>
                      </div>
                    ))}
                  </div>
                )}

                {property.reviews && property.reviews.length > 0 ? (
                  <div className="space-y-4">
                    {property.reviews.map((review) => (
                      <div key={review.id} className="p-5 bg-gray-50 rounded-xl">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-accent-100 rounded-full flex items-center justify-center">
                              <span className="text-accent-700 font-medium">
                                {review.guestName.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <div>
                              <span className="font-medium text-gray-900">{review.guestName}</span>
                              <div className="text-sm text-gray-500">
                                {new Date(review.date).toLocaleDateString('en-ZA', { month: 'long', year: 'numeric' })}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <Star
                                key={i}
                                className={`w-4 h-4 ${
                                  i < review.rating ? 'text-accent-500 fill-current' : 'text-gray-300'
                                }`}
                              />
                            ))}
                          </div>
                        </div>
                        {review.comment && (
                          <p className="text-gray-600 leading-relaxed">{review.comment}</p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 bg-gray-50 rounded-xl">
                    <Star className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">No reviews yet</p>
                    <p className="text-sm text-gray-400">Be the first to review this property!</p>
                  </div>
                )}
              </div>
            )}

            {/* Location Tab */}
            {activeTab === 'location' && (
              <div className="mb-12">
                <h2 className="text-xl font-semibold text-gray-900 mb-6">Location</h2>
                <div className="bg-gray-50 rounded-xl p-6 mb-6">
                  <div className="flex items-start gap-3">
                    <MapPin className="w-5 h-5 text-accent-500 mt-0.5" />
                    <div>
                      <p className="font-medium text-gray-900">
                        {property.location.city}, {property.location.region}
                      </p>
                      {property.location.address && (
                        <p className="text-gray-600 text-sm mt-1">{property.location.address}</p>
                      )}
                    </div>
                  </div>
                </div>
                {/* Google Map */}
                {property.latitude && property.longitude ? (
                  <GoogleMap
                    center={{ lat: property.latitude, lng: property.longitude }}
                    markerPosition={{ lat: property.latitude, lng: property.longitude }}
                    markerTitle={property.name}
                    zoom={15}
                    height={400}
                    className="shadow-sm"
                  />
                ) : (
                  <div className="aspect-video bg-gray-100 rounded-xl flex items-center justify-center">
                    <div className="text-center text-gray-500">
                      <MapPin className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                      <p>Map location not available</p>
                      <p className="text-sm mt-1">Contact the property for directions</p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Booking Sidebar */}
          <div className="lg:col-span-1">
            <div className="sticky top-32 bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-lg">
              {/* Price Header */}
              <div className="p-6 border-b border-gray-100">
                <div className="flex items-baseline gap-1">
                  {property.priceFrom ? (
                    <>
                      <span className="text-sm text-gray-500">From</span>
                      <span className="text-3xl font-bold text-gray-900">R{property.priceFrom.toLocaleString()}</span>
                      <span className="text-gray-500">/ night</span>
                    </>
                  ) : (
                    <span className="text-xl font-medium text-gray-600">Contact for pricing</span>
                  )}
                </div>
                {property.rating && (
                  <div className="flex items-center gap-1 mt-2">
                    <Star className="w-4 h-4 text-accent-500 fill-current" />
                    <span className="font-medium">{property.rating}</span>
                    <span className="text-gray-500 text-sm">({property.reviewCount} reviews)</span>
                  </div>
                )}
              </div>

              <div className="p-6">
                {/* Date Selection */}
                <div className="mb-4">
                  <DateRangePicker
                    startDate={checkIn}
                    endDate={checkOut}
                    onStartDateChange={setCheckIn}
                    onEndDateChange={setCheckOut}
                    minDate={new Date().toISOString().split('T')[0]}
                    startLabel="Check-in"
                    endLabel="Check-out"
                    compact
                  />
                </div>

                {/* Guests */}
                <div className="p-3 border border-gray-200 rounded-lg mb-4 hover:border-gray-300 transition-colors">
                  <div className="text-xs text-gray-500 mb-1">GUESTS</div>
                  <select
                    value={guests}
                    onChange={(e) => setGuests(parseInt(e.target.value))}
                    className="w-full text-sm text-gray-900 bg-transparent outline-none cursor-pointer"
                  >
                    {Array.from({ length: Math.max(totalCapacity, 10) }, (_, i) => i + 1).map((n) => (
                      <option key={n} value={n}>{n} guest{n > 1 ? 's' : ''}</option>
                    ))}
                  </select>
                </div>

                {/* Book Button */}
                <Link
                  to={`/accommodation/${slug}/book?checkIn=${checkIn}&checkOut=${checkOut}&guests=${guests}`}
                  className="block w-full bg-black hover:bg-gray-800 text-white text-center py-3.5 rounded-xl font-semibold transition-colors mb-3"
                >
                  Reserve Now
                </Link>

                <p className="text-center text-sm text-gray-500 mb-4">
                  You won't be charged yet
                </p>

                {/* Cancellation Policy */}
                <div className="flex items-center gap-2 p-3 bg-accent-50 rounded-lg text-sm">
                  <Shield className="w-4 h-4 text-accent-600" />
                  <span className="text-accent-700">
                    {property.cancellationPolicies?.[0]?.label || 'Free cancellation up to 7 days before'}
                  </span>
                </div>

                {/* Special Offers - Sidebar */}
                {property.specialOffers && property.specialOffers.filter(o => o.active).length > 0 && (
                  <div className="mt-4 space-y-2">
                    {property.specialOffers.filter(o => o.active).slice(0, 2).map((offer, i) => (
                      <div key={i} className="p-3 bg-gradient-to-r from-emerald-50 to-teal-50 border border-accent-200 rounded-lg">
                        <div className="flex items-center gap-2">
                          <Tag className="w-4 h-4 text-accent-600" />
                          <span className="font-medium text-accent-800 text-sm">{offer.title}</span>
                        </div>
                        {offer.valid_until && (
                          <p className="text-xs text-accent-600 mt-1 pl-6">
                            Until {new Date(offer.valid_until).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Contact Info */}
              {(property.email || property.phone) && (
                <div className="p-6 border-t border-gray-100 bg-gray-50">
                  <h4 className="font-medium text-gray-900 mb-3">Need help?</h4>
                  <div className="space-y-2">
                    {property.phone && (
                      <a href={`tel:${property.phone}`} className="flex items-center gap-2 text-sm text-gray-600 hover:text-accent-600">
                        <Phone className="w-4 h-4" />
                        {property.phone}
                      </a>
                    )}
                    {property.email && (
                      <a href={`mailto:${property.email}`} className="flex items-center gap-2 text-sm text-gray-600 hover:text-accent-600">
                        <Mail className="w-4 h-4" />
                        {property.email}
                      </a>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Sticky Booking Bar */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 z-40">
        <div className="flex items-center justify-between">
          <div>
            {property.priceFrom ? (
              <>
                <span className="text-lg font-bold text-gray-900">R{property.priceFrom.toLocaleString()}</span>
                <span className="text-gray-500 text-sm"> / night</span>
              </>
            ) : (
              <span className="text-gray-600">Contact for pricing</span>
            )}
            {property.rating && (
              <div className="flex items-center gap-1 text-sm">
                <Star className="w-3 h-3 text-accent-500 fill-current" />
                <span>{property.rating}</span>
              </div>
            )}
          </div>
          <Link
            to={`/accommodation/${slug}/book`}
            className="px-6 py-3 bg-black hover:bg-gray-800 text-white rounded-xl font-semibold transition-colors"
          >
            Reserve
          </Link>
        </div>
      </div>
    </div>
  )
}

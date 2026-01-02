import { useState, useEffect, useCallback } from 'react'
import { useParams, Link, useLocation } from 'react-router-dom'
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
  Camera,
  X,
  Grid,
  ChevronDown,
  ChevronUp,
  Award,
  Shield,
  AlertCircle,
  Sparkles,
  Tag,
  Baby,
  CheckCircle,
  BedDouble,
  Building,
  MessageCircle,
  ArrowLeft
} from 'lucide-react'
import { discoveryApi, PropertyDetail as PropertyDetailType, RoomReview, ClaimableCoupon } from '../../services/discoveryApi'
import RatesTab from '../../components/discovery/RatesTab'
import GoogleMap from '../../components/discovery/GoogleMap'
import RoomReviewsModal from '../../components/discovery/RoomReviewsModal'
import CouponClaimModal from '../../components/discovery/CouponClaimModal'
import ContactHostModal from '../../components/discovery/ContactHostModal'

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

export default function PortalPropertyDetail() {
  const { slug } = useParams()
  const location = useLocation()
  const [property, setProperty] = useState<PropertyDetailType | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentImage, setCurrentImage] = useState(0)
  const [isFavorite, setIsFavorite] = useState(false)
  const [showGallery, setShowGallery] = useState(false)
  const [showAllAmenities, setShowAllAmenities] = useState(false)

  // Review images lightbox state
  const [reviewLightbox, setReviewLightbox] = useState<{
    images: Array<{ url: string; path?: string }>
    currentIndex: number
  } | null>(null)

  // Room images lightbox state
  const [roomLightbox, setRoomLightbox] = useState<{
    images: string[]
    currentIndex: number
    roomName: string
  } | null>(null)

  // Track expanded room descriptions
  const [expandedRoomIds, setExpandedRoomIds] = useState<Set<string>>(new Set())

  // Room reviews modal state
  const [roomReviewsModal, setRoomReviewsModal] = useState<{
    roomName: string
    reviews: RoomReview[]
    rating: number | null
  } | null>(null)

  // Claimable coupons state
  const [claimableCoupons, setClaimableCoupons] = useState<ClaimableCoupon[]>([])
  const [selectedCouponForClaim, setSelectedCouponForClaim] = useState<ClaimableCoupon | null>(null)

  // Contact host modal state
  const [showContactModal, setShowContactModal] = useState(false)

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

  useEffect(() => {
    const fetchProperty = async () => {
      if (!slug) return

      setLoading(true)
      setError(null)

      try {
        const data = await discoveryApi.getProperty(slug)
        setProperty(data)

        // Fetch claimable coupons
        try {
          const coupons = await discoveryApi.getClaimableCoupons(slug)
          setClaimableCoupons(coupons)
        } catch (e) {
          console.error('Error fetching claimable coupons:', e)
        }
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
      <div className="min-h-full bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-accent-500" />
      </div>
    )
  }

  // Error state
  if (error || !property) {
    return (
      <div className="min-h-full bg-gray-50 flex flex-col items-center justify-center p-8">
        <MapPin className="w-16 h-16 text-gray-300 mb-4" />
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Property Not Found</h1>
        <p className="text-gray-500 mb-6">The property you're looking for doesn't exist or is no longer available.</p>
        <Link to="/portal/bookings/browse" className="text-accent-600 font-medium hover:text-accent-700">
          Back to Browse
        </Link>
      </div>
    )
  }

  return (
    <div className="min-h-full bg-gray-50">
      {/* Back Navigation */}
      <div className="bg-white border-b border-gray-200">
        <div className="p-4 md:p-6">
          <Link
            to="/portal/bookings/browse"
            className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Browse</span>
          </Link>
        </div>
      </div>

      {/* Image Gallery */}
      <div className="relative bg-gray-100">
        <div className="grid grid-cols-4 grid-rows-2 gap-2 h-[300px] md:h-[400px] p-2">
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
            className="absolute bottom-4 right-4 flex items-center gap-2 px-4 py-2 bg-white rounded-lg shadow-lg hover:shadow-xl transition-shadow text-sm font-medium"
          >
            <Grid className="w-4 h-4" />
            View all {images.length} photos
          </button>
        </div>

        {/* Action Buttons */}
        <div className="absolute top-4 right-4 flex items-center gap-2">
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

      {/* Review Images Lightbox Modal */}
      {reviewLightbox && (
        <div className="fixed inset-0 z-50 bg-black">
          <div className="relative h-full flex flex-col">
            <div className="flex items-center justify-between p-4 text-white">
              <span className="text-lg font-medium">
                {reviewLightbox.currentIndex + 1} / {reviewLightbox.images.length}
              </span>
              <button
                onClick={() => setReviewLightbox(null)}
                className="p-2 hover:bg-white/10 rounded-full transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="flex-1 flex items-center justify-center px-4">
              {reviewLightbox.images.length > 1 && (
                <button
                  onClick={() => setReviewLightbox({
                    ...reviewLightbox,
                    currentIndex: (reviewLightbox.currentIndex - 1 + reviewLightbox.images.length) % reviewLightbox.images.length
                  })}
                  className="absolute left-4 p-3 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
                >
                  <ChevronLeft className="w-8 h-8 text-white" />
                </button>
              )}

              <img
                src={reviewLightbox.images[reviewLightbox.currentIndex].url}
                alt={`Review photo ${reviewLightbox.currentIndex + 1}`}
                className="max-h-[80vh] max-w-full object-contain"
              />

              {reviewLightbox.images.length > 1 && (
                <button
                  onClick={() => setReviewLightbox({
                    ...reviewLightbox,
                    currentIndex: (reviewLightbox.currentIndex + 1) % reviewLightbox.images.length
                  })}
                  className="absolute right-4 p-3 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
                >
                  <ChevronRight className="w-8 h-8 text-white" />
                </button>
              )}
            </div>

            {reviewLightbox.images.length > 1 && (
              <div className="p-4 flex justify-center gap-2 overflow-x-auto">
                {reviewLightbox.images.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setReviewLightbox({ ...reviewLightbox, currentIndex: i })}
                    className={`flex-shrink-0 w-16 h-12 rounded overflow-hidden ${
                      reviewLightbox.currentIndex === i ? 'ring-2 ring-white' : 'opacity-50 hover:opacity-100'
                    }`}
                  >
                    <img src={img.url} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Room Images Lightbox Modal */}
      {roomLightbox && (
        <div className="fixed inset-0 z-50 bg-black">
          <div className="relative h-full flex flex-col">
            <div className="flex items-center justify-between p-4 text-white">
              <div>
                <span className="text-lg font-medium">
                  {roomLightbox.currentIndex + 1} / {roomLightbox.images.length}
                </span>
                <span className="text-white/70 ml-3">{roomLightbox.roomName}</span>
              </div>
              <button
                onClick={() => setRoomLightbox(null)}
                className="p-2 hover:bg-white/10 rounded-full transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="flex-1 flex items-center justify-center px-4">
              {roomLightbox.images.length > 1 && (
                <button
                  onClick={() => setRoomLightbox({
                    ...roomLightbox,
                    currentIndex: (roomLightbox.currentIndex - 1 + roomLightbox.images.length) % roomLightbox.images.length
                  })}
                  className="absolute left-4 p-3 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
                >
                  <ChevronLeft className="w-8 h-8 text-white" />
                </button>
              )}

              <img
                src={roomLightbox.images[roomLightbox.currentIndex]}
                alt={`${roomLightbox.roomName} photo ${roomLightbox.currentIndex + 1}`}
                className="max-h-[80vh] max-w-full object-contain"
              />

              {roomLightbox.images.length > 1 && (
                <button
                  onClick={() => setRoomLightbox({
                    ...roomLightbox,
                    currentIndex: (roomLightbox.currentIndex + 1) % roomLightbox.images.length
                  })}
                  className="absolute right-4 p-3 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
                >
                  <ChevronRight className="w-8 h-8 text-white" />
                </button>
              )}
            </div>

            {roomLightbox.images.length > 1 && (
              <div className="p-4 flex justify-center gap-2 overflow-x-auto">
                {roomLightbox.images.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setRoomLightbox({ ...roomLightbox, currentIndex: i })}
                    className={`flex-shrink-0 w-16 h-12 rounded overflow-hidden ${
                      roomLightbox.currentIndex === i ? 'ring-2 ring-white' : 'opacity-50 hover:opacity-100'
                    }`}
                  >
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="sticky top-0 z-30 bg-white border-b border-gray-200">
        <div className="px-4 md:px-6">
          <div className="flex gap-6 overflow-x-auto">
            {(['overview', 'rooms', 'rates', 'reviews', 'location'] as TabType[]).map((tab) => (
              <button
                key={tab}
                onClick={() => handleTabChange(tab)}
                className={`py-4 border-b-2 font-medium text-sm transition-colors whitespace-nowrap ${
                  activeTab === tab
                    ? 'border-accent-500 text-accent-600'
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
      <div className="p-4 md:p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2">
            {/* Property Header */}
            <div className="mb-6 bg-white rounded-xl p-6 border border-gray-200">
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
              </div>

              <h1 className="text-2xl font-bold text-gray-900 mb-3">{property.name}</h1>

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
              <div className="flex items-center gap-6 py-4 border-t border-gray-100">
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
              <div className="space-y-6">
                {/* Seasonal Message Banner */}
                {property.seasonalMessage && (
                  <div className="p-4 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl">
                    <p className="text-amber-800 text-sm">
                      <strong>Special Notice:</strong> {property.seasonalMessage}
                    </p>
                  </div>
                )}

                {/* Property Highlights */}
                {property.propertyHighlights && property.propertyHighlights.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {property.propertyHighlights.map((highlight, i) => (
                      <span key={i} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-accent-50 text-accent-700 rounded-full text-sm font-medium">
                        <Sparkles className="w-4 h-4" />
                        {highlight}
                      </span>
                    ))}
                  </div>
                )}

                {/* Special Offers */}
                {property.specialOffers && property.specialOffers.filter(o => o.active).length > 0 && (
                  <div className="bg-white rounded-xl border border-gray-200 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2 mb-4">
                      <Tag className="w-5 h-5 text-accent-500" />
                      Special Offers
                    </h3>
                    <div className="space-y-3">
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
                  </div>
                )}

                {/* Claimable Coupons */}
                {claimableCoupons.length > 0 && (
                  <div className="bg-white rounded-xl border border-gray-200 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2 mb-4">
                      <Tag className="w-5 h-5 text-blue-500" />
                      Exclusive Coupons
                    </h3>
                    <div className="space-y-3">
                      {claimableCoupons.map((coupon) => (
                        <div key={coupon.id} className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-semibold text-blue-800">{coupon.code}</span>
                                <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-medium rounded">
                                  {coupon.discount_type === 'percentage'
                                    ? `${coupon.discount_value}% off`
                                    : coupon.discount_type === 'fixed_amount'
                                      ? `R${coupon.discount_value} off`
                                      : `${coupon.discount_value} free night${coupon.discount_value > 1 ? 's' : ''}`}
                                </span>
                              </div>
                              <p className="text-sm text-blue-700 mt-1">{coupon.name}</p>
                            </div>
                            <button
                              onClick={() => setSelectedCouponForClaim(coupon)}
                              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
                            >
                              Claim
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Description */}
                {property.description && (
                  <div className="bg-white rounded-xl border border-gray-200 p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">About this property</h2>
                    <div className="prose prose-gray max-w-none">
                      {property.description.split('\n\n').map((paragraph, i) => (
                        <p key={i} className="text-gray-600 mb-4 leading-relaxed">{paragraph}</p>
                      ))}
                    </div>
                  </div>
                )}

                {/* Amenities */}
                {property.amenities && property.amenities.length > 0 && (
                  <div className="bg-white rounded-xl border border-gray-200 p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">Amenities & Features</h2>
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
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">House Rules & Policies</h2>
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
                      <h3 className="text-md font-medium text-gray-900 mb-3">House Rules</h3>
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
                </div>
              </div>
            )}

            {/* Rooms Tab */}
            {activeTab === 'rooms' && (
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-6">Available Rooms & Rates</h2>
                {property.rooms && property.rooms.length > 0 ? (
                  <div className="space-y-4">
                    {property.rooms.map((room) => (
                      <div key={room.id} className="border border-gray-200 rounded-xl overflow-hidden hover:border-accent-200 hover:shadow-md transition-all">
                        <div className="flex flex-col md:flex-row">
                          {/* Room Image */}
                          <button
                            onClick={() => room.images && room.images.length > 0 && setRoomLightbox({
                              images: room.images,
                              currentIndex: 0,
                              roomName: room.name
                            })}
                            className="md:w-64 h-48 md:h-auto relative group cursor-pointer"
                            disabled={!room.images || room.images.length === 0}
                          >
                            <img
                              src={room.images?.[0] || defaultImages[0]}
                              alt={room.name}
                              className="w-full h-full object-cover group-hover:brightness-90 transition-all"
                            />
                            {room.images && room.images.length > 1 && (
                              <div className="absolute bottom-2 right-2 flex items-center gap-1 px-2 py-1 bg-black/60 rounded text-white text-xs">
                                <Camera className="w-3 h-3" />
                                {room.images.length}
                              </div>
                            )}
                          </button>

                          {/* Room Details */}
                          <div className="flex-1 p-5">
                            <div className="flex items-start justify-between mb-2">
                              <div>
                                <h3 className="font-semibold text-lg text-gray-900">{room.name}</h3>
                                {room.reviewCount && room.reviewCount > 0 ? (
                                  <button
                                    onClick={() => setRoomReviewsModal({
                                      roomName: room.name,
                                      reviews: room.reviews || [],
                                      rating: room.rating || null
                                    })}
                                    className="flex items-center gap-1.5 mt-1 text-sm hover:text-accent-600 transition-colors group"
                                  >
                                    <Star className="w-4 h-4 text-accent-500 fill-current" />
                                    <span className="font-medium text-gray-900 group-hover:text-accent-600">
                                      {room.rating}
                                    </span>
                                    <span className="text-gray-500 group-hover:text-accent-600">
                                      ({room.reviewCount} {room.reviewCount === 1 ? 'review' : 'reviews'})
                                    </span>
                                  </button>
                                ) : (
                                  <div className="flex items-center gap-1.5 mt-1 text-sm text-gray-400">
                                    <Star className="w-4 h-4" />
                                    <span>No reviews yet</span>
                                  </div>
                                )}
                              </div>
                              <div className="text-right">
                                <div className="text-sm text-gray-400">From</div>
                                <div className="text-2xl font-bold text-gray-900">
                                  R{room.basePrice.toLocaleString()}
                                </div>
                                <div className="text-sm text-gray-500">per night</div>
                              </div>
                            </div>

                            {/* Room Details List */}
                            <div className="flex flex-wrap gap-4 text-sm text-gray-600 mb-4">
                              <div className="flex items-center gap-1">
                                <Users className="w-4 h-4 text-gray-400" />
                                <span>Sleeps {room.maxGuests}</span>
                              </div>
                              {room.bedrooms && (
                                <div className="flex items-center gap-1">
                                  <BedDouble className="w-4 h-4 text-gray-400" />
                                  <span>{room.bedrooms} bedrooms</span>
                                </div>
                              )}
                              {room.bathrooms && (
                                <div className="flex items-center gap-1">
                                  <Bath className="w-4 h-4 text-gray-400" />
                                  <span>{room.bathrooms} bathrooms</span>
                                </div>
                              )}
                            </div>

                            {/* Room Amenities */}
                            {room.amenities && room.amenities.length > 0 && (
                              <div className="flex flex-wrap gap-2 mb-4">
                                {room.amenities.slice(0, 4).map((amenity) => (
                                  <span key={amenity} className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 rounded text-xs text-gray-600">
                                    <Check className="w-3 h-3 text-emerald-500" />
                                    {amenity}
                                  </span>
                                ))}
                                {room.amenities.length > 4 && (
                                  <span className="inline-flex items-center px-2 py-1 bg-gray-100 rounded text-xs text-gray-500">
                                    +{room.amenities.length - 4} more
                                  </span>
                                )}
                              </div>
                            )}

                            {/* Footer with reserve button */}
                            <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                              <div className="flex items-center gap-2">
                                <CheckCircle className="w-4 h-4 text-emerald-500" />
                                <span className="text-sm text-emerald-600 font-medium">Available</span>
                              </div>
                              <Link
                                to={`/portal/bookings/checkout/${slug}?room=${room.id}`}
                                className="px-6 py-2.5 bg-accent-500 hover:bg-accent-600 text-white rounded-lg font-medium transition-colors"
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
              <div className="bg-white rounded-xl border border-gray-200 p-6">
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
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-semibold text-gray-900">Guest Reviews</h2>
                  {property.rating && (
                    <div className="flex items-center gap-3 bg-accent-50 px-4 py-2 rounded-lg">
                      <Star className="w-5 h-5 text-accent-500 fill-current" />
                      <div>
                        <span className="text-lg font-bold text-accent-700">{property.rating}</span>
                        <span className="text-sm text-accent-600 ml-1">/ 5</span>
                      </div>
                      <span className="text-sm text-accent-600">({property.reviewCount} reviews)</span>
                    </div>
                  )}
                </div>

                {property.reviews && property.reviews.length > 0 ? (
                  <div className="space-y-4">
                    {property.reviews.map((review) => (
                      <div key={review.id} className="p-5 bg-gray-50 rounded-xl">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-3">
                            {review.guestProfilePicture ? (
                              <img
                                src={review.guestProfilePicture}
                                alt={review.guestName}
                                className="w-10 h-10 rounded-full object-cover"
                              />
                            ) : (
                              <div className="w-10 h-10 bg-accent-100 rounded-full flex items-center justify-center">
                                <span className="text-accent-700 font-medium">
                                  {review.guestName.charAt(0).toUpperCase()}
                                </span>
                              </div>
                            )}
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
                        {review.title && (
                          <h4 className="font-medium text-gray-900 mb-2">{review.title}</h4>
                        )}
                        {review.comment && (
                          <p className="text-gray-600 leading-relaxed">{review.comment}</p>
                        )}
                        {review.images && review.images.length > 0 && (
                          <div className="mt-4 flex gap-2 overflow-x-auto">
                            {review.images.map((img, idx) => (
                              <button
                                key={idx}
                                onClick={() => setReviewLightbox({
                                  images: review.images!,
                                  currentIndex: idx
                                })}
                                className="flex-shrink-0 focus:outline-none focus:ring-2 focus:ring-accent-500 rounded-lg"
                              >
                                <img
                                  src={img.url}
                                  alt={`Review photo ${idx + 1}`}
                                  className="w-24 h-24 object-cover rounded-lg hover:opacity-90 transition-opacity cursor-pointer"
                                />
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 bg-gray-50 rounded-xl">
                    <Star className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">No reviews yet</p>
                  </div>
                )}
              </div>
            )}

            {/* Location Tab */}
            {activeTab === 'location' && (
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-6">Location</h2>
                <div className="bg-gray-50 rounded-xl p-4 mb-6">
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
                {property.latitude && property.longitude ? (
                  <GoogleMap
                    center={{ lat: property.latitude, lng: property.longitude }}
                    markerPosition={{ lat: property.latitude, lng: property.longitude }}
                    markerTitle={property.name}
                    zoom={15}
                    height={350}
                    className="shadow-sm"
                  />
                ) : (
                  <div className="aspect-video bg-gray-100 rounded-xl flex items-center justify-center">
                    <div className="text-center text-gray-500">
                      <MapPin className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                      <p>Map location not available</p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Booking Sidebar */}
          <div className="lg:col-span-1">
            <div className="sticky top-20 bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-lg">
              {/* Price Header */}
              <div className="p-6 border-b border-gray-100 text-center">
                {property.priceFrom ? (
                  <div className="space-y-1">
                    <span className="text-sm text-gray-500 block">From</span>
                    <div className="flex items-baseline justify-center gap-1">
                      <span className="text-4xl font-bold text-accent-600">R{property.priceFrom.toLocaleString()}</span>
                      <span className="text-gray-500">/ night</span>
                    </div>
                  </div>
                ) : (
                  <span className="text-xl font-medium text-gray-600">Contact for pricing</span>
                )}
                {property.rating && (
                  <div className="flex items-center justify-center gap-1.5 mt-3">
                    <Star className="w-5 h-5 text-accent-500 fill-current" />
                    <span className="font-semibold text-lg">{property.rating}</span>
                    <span className="text-gray-500">({property.reviewCount} reviews)</span>
                  </div>
                )}
              </div>

              <div className="p-6">
                {/* Book Button */}
                <Link
                  to={`/portal/bookings/checkout/${slug}`}
                  className="block w-full bg-accent-500 hover:bg-accent-600 text-white text-center py-3.5 rounded-xl font-semibold transition-colors mb-3"
                >
                  Reserve Now
                </Link>

                <p className="text-center text-sm text-gray-500 mb-4">
                  Your profile details will be pre-filled
                </p>

                {/* Special Offers - Sidebar */}
                {property.specialOffers && property.specialOffers.filter(o => o.active).length > 0 && (
                  <div className="space-y-2">
                    {property.specialOffers.filter(o => o.active).slice(0, 2).map((offer, i) => (
                      <div key={i} className="p-3 bg-gradient-to-r from-emerald-50 to-teal-50 border border-accent-200 rounded-lg">
                        <div className="flex items-center gap-2">
                          <Tag className="w-4 h-4 text-accent-600" />
                          <span className="font-medium text-accent-800 text-sm">{offer.title}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Host Contact */}
              <div className="px-6 pb-5">
                <button
                  onClick={() => setShowContactModal(true)}
                  className="w-full hover:bg-gray-50 text-gray-500 hover:text-accent-600 font-medium flex items-center justify-center gap-1.5 text-sm py-2.5 rounded-lg transition-colors"
                >
                  <MessageCircle className="w-4 h-4" />
                  Message Host
                </button>
              </div>
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
          </div>
          <Link
            to={`/portal/bookings/checkout/${slug}`}
            className="px-6 py-3 bg-accent-500 hover:bg-accent-600 text-white rounded-xl font-semibold transition-colors"
          >
            Reserve
          </Link>
        </div>
      </div>

      {/* Room Reviews Modal */}
      <RoomReviewsModal
        isOpen={roomReviewsModal !== null}
        onClose={() => setRoomReviewsModal(null)}
        roomName={roomReviewsModal?.roomName || ''}
        reviews={roomReviewsModal?.reviews || []}
        rating={roomReviewsModal?.rating || null}
      />

      {/* Coupon Claim Modal */}
      {selectedCouponForClaim && property && (
        <CouponClaimModal
          isOpen={!!selectedCouponForClaim}
          onClose={() => setSelectedCouponForClaim(null)}
          coupon={selectedCouponForClaim}
          propertySlug={slug || ''}
          propertyName={property.name}
        />
      )}

      {/* Contact Host Modal */}
      <ContactHostModal
        isOpen={showContactModal}
        onClose={() => setShowContactModal(false)}
        propertySlug={slug || ''}
        propertyName={property.name}
        propertyLogo={property.logoUrl}
      />
    </div>
  )
}

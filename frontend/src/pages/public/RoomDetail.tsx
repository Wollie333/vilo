import { useState, useEffect, useRef } from 'react'
import { useParams, Link, useNavigate, useSearchParams } from 'react-router-dom'
import {
  BedDouble, Users, Maximize, Check, ArrowLeft, ChevronLeft, ChevronRight,
  Calendar, Phone, Mail, MessageSquare, User
} from 'lucide-react'
import { Room, publicReviewsApi, publicRoomsApi, PublicReview, ReviewStats } from '../../services/api'
import { useAuth } from '../../contexts/AuthContext'
import StarRating from '../../components/StarRating'

// Hook for scroll-triggered animations - starts visible to prevent blank content
function useInView(threshold = 0.1) {
  const ref = useRef<HTMLDivElement>(null)
  // Start visible by default to prevent blank content if IntersectionObserver fails
  const [isInView, setIsInView] = useState(true)

  useEffect(() => {
    const element = ref.current
    if (!element) return

    // Reset to false initially for animation, only if element is below viewport
    const rect = element.getBoundingClientRect()
    if (rect.top > window.innerHeight) {
      setIsInView(false)
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true)
        }
      },
      { threshold }
    )

    observer.observe(element)

    return () => observer.disconnect()
  }, [threshold])

  return { ref, isInView }
}

export default function RoomDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { tenant } = useAuth()
  const [room, setRoom] = useState<Room | null>(null)
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [reviews, setReviews] = useState<PublicReview[]>([])
  const [reviewStats, setReviewStats] = useState<ReviewStats | null>(null)
  const [loadingReviews, setLoadingReviews] = useState(false)
  const [loadingRoom, setLoadingRoom] = useState(true)

  // Get tenant ID from URL param or auth context
  const tenantId = searchParams.get('property') || tenant?.id || ''

  // Get pre-filled values from search params
  const prefilledGuests = searchParams.get('guests') || '2'

  // Check if the ID looks like a UUID or a room_code
  const isUUID = (str: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str)
  const roomCode = id && !isUUID(id) ? id : null

  const heroSection = useInView()
  const detailsSection = useInView(0.05)
  const amenitiesSection = useInView()
  const bookingSection = useInView()
  const reviewsSection = useInView()

  // Handle Book Now click - redirect to booking page
  const handleBookNow = () => {
    // Build query params for booking page
    const params = new URLSearchParams()
    if (tenantId) {
      params.set('property', tenantId)
    }
    // Use the room's actual UUID for booking
    if (room?.id) {
      params.set('room', room.id)
    }
    if (prefilledGuests) {
      params.set('guests', prefilledGuests)
    }
    navigate(`/book?${params.toString()}`)
  }

  // Load room when id changes
  useEffect(() => {
    loadRoom()
  }, [id, tenantId])

  const loadRoom = async () => {
    if (!id) {
      navigate('/accommodation')
      return
    }

    setLoadingRoom(true)
    try {
      let data: Room | null = null

      // If it looks like a room_code (not a UUID), use the public API by code
      if (roomCode) {
        data = await publicRoomsApi.getByCode(roomCode, tenantId || undefined)
      } else {
        // It's a UUID, use the public API by ID
        data = await publicRoomsApi.getById(id)
      }

      if (data && data.name) {
        setRoom(data)
      } else {
        setRoom(null)
      }
    } catch (error) {
      console.error('Failed to load room:', error)
      setRoom(null)
    } finally {
      setLoadingRoom(false)
    }
  }

  // Load reviews for this room
  const loadReviews = async () => {
    if (!tenantId || !room) return

    setLoadingReviews(true)
    try {
      let reviewsData: PublicReview[] = []
      let statsData: ReviewStats = { total_reviews: 0, average_rating: 0 }

      // Use room_code if available, otherwise use room UUID
      if (room.room_code) {
        [reviewsData, statsData] = await Promise.all([
          publicReviewsApi.getRoomReviewsByCode(tenantId, room.room_code),
          publicReviewsApi.getRoomStatsByCode(tenantId, room.room_code)
        ])
      } else if (room.id) {
        [reviewsData, statsData] = await Promise.all([
          publicReviewsApi.getRoomReviews(tenantId, room.id),
          publicReviewsApi.getRoomStats(tenantId, room.id)
        ])
      }

      setReviews(reviewsData)
      setReviewStats(statsData)
    } catch (error) {
      console.error('Failed to load reviews:', error)
    } finally {
      setLoadingReviews(false)
    }
  }

  // Load reviews when tenant and room are available
  useEffect(() => {
    if (tenantId && room) {
      loadReviews()
    }
  }, [tenantId, room?.id])

  const formatCurrency = (amount: number | undefined | null, currency: string | undefined | null) => {
    const safeAmount = amount ?? 0
    const safeCurrency = currency || 'ZAR'
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: safeCurrency,
      minimumFractionDigits: 0,
    }).format(safeAmount)
  }

  // Get all images (featured + gallery)
  const allImages = room ? [
    room.images?.featured,
    ...(room.images?.gallery || [])
  ].filter(Boolean) : []

  const nextImage = () => {
    setCurrentImageIndex((prev) => (prev + 1) % Math.max(1, allImages.length))
  }

  const prevImage = () => {
    setCurrentImageIndex((prev) => (prev - 1 + Math.max(1, allImages.length)) % Math.max(1, allImages.length))
  }

  // Show loading state
  if (loadingRoom) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center px-4">
          <div className="animate-spin w-12 h-12 border-4 border-gray-200 border-t-gray-900 rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">Loading room details...</p>
        </div>
      </div>
    )
  }

  if (!room || !room.name) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center px-4">
          <BedDouble size={48} className="mx-auto text-gray-300 mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Room Not Found</h2>
          <p className="text-gray-600 mb-4">The room you're looking for doesn't exist or couldn't be loaded.</p>
          <Link
            to="/accommodation"
            className="inline-flex items-center text-gray-900 font-medium hover:underline"
          >
            <ArrowLeft size={18} className="mr-2" />
            Back to Accommodation
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="overflow-x-hidden bg-white">
      {/* Back Navigation */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8">
        <Link
          to="/accommodation"
          className="inline-flex items-center text-gray-600 hover:text-gray-900 transition-colors text-sm sm:text-base"
        >
          <ArrowLeft size={18} className="mr-2" />
          Back to Accommodation
        </Link>
      </div>

      {/* Room Images */}
      <section ref={heroSection.ref} className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className={`relative rounded-lg sm:rounded-xl overflow-hidden bg-gray-100 transition-all duration-700 ${heroSection.isInView ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}>
          <div className="aspect-[16/9] sm:aspect-[2/1] lg:aspect-[3/1]">
            {allImages.length > 0 && allImages[currentImageIndex] ? (
              <img
                src={allImages[currentImageIndex]!.url}
                alt={room.name}
                className="w-full h-full object-cover transition-transform duration-700 hover:scale-105"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
                <BedDouble size={64} className="text-gray-300 sm:w-24 sm:h-24" />
              </div>
            )}
          </div>

          {/* Image navigation */}
          {allImages.length > 1 && (
            <>
              <button
                onClick={prevImage}
                className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 p-2 bg-white/80 hover:bg-white rounded-full shadow-lg transition-all hover:scale-110"
              >
                <ChevronLeft size={20} className="sm:w-6 sm:h-6" />
              </button>
              <button
                onClick={nextImage}
                className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 p-2 bg-white/80 hover:bg-white rounded-full shadow-lg transition-all hover:scale-110"
              >
                <ChevronRight size={20} className="sm:w-6 sm:h-6" />
              </button>
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                {allImages.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentImageIndex(index)}
                    className={`w-2 h-2 sm:w-3 sm:h-3 rounded-full transition-all ${
                      index === currentImageIndex ? 'bg-white scale-125' : 'bg-white/50 hover:bg-white/80'
                    }`}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </section>

      {/* Room Details & Booking */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12 sm:pb-16">
        <div className="grid lg:grid-cols-3 gap-6 lg:gap-8">
          {/* Room Info */}
          <div ref={detailsSection.ref} className="lg:col-span-2">
            <div className={`transition-all duration-700 ${detailsSection.isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                {room.name}
              </h1>

              {/* Quick Info */}
              <div className="flex flex-wrap gap-4 sm:gap-6 text-sm sm:text-base text-gray-600 mb-6 pb-6 border-b border-gray-200">
                {(room.bed_count || room.bed_type) && (
                  <span className="flex items-center gap-2">
                    <BedDouble size={18} className="text-gray-400" />
                    {room.bed_count || 1}x {room.bed_type || 'Bed'}
                  </span>
                )}
                <span className="flex items-center gap-2">
                  <Users size={18} className="text-gray-400" />
                  Up to {room.max_guests || 2} guests
                </span>
                {room.room_size_sqm && (
                  <span className="flex items-center gap-2">
                    <Maximize size={18} className="text-gray-400" />
                    {room.room_size_sqm} m²
                  </span>
                )}
              </div>

              {/* Description */}
              <div className="mb-8">
                <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-3">About This Room</h2>
                <p className="text-gray-600 leading-relaxed text-sm sm:text-base">
                  {room.description}
                </p>
              </div>

              {/* Amenities */}
              {room.amenities && room.amenities.length > 0 && (
                <div ref={amenitiesSection.ref} className={`transition-all duration-700 ${amenitiesSection.isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
                  <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4">Amenities</h2>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {room.amenities.map((amenity, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-2 text-sm sm:text-base text-gray-700"
                      >
                        <Check size={16} className="text-green-600 flex-shrink-0" />
                        {amenity}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Reviews Section */}
              {(reviews.length > 0 || reviewStats?.total_reviews) && (
                <div ref={reviewsSection.ref} className={`mt-8 pt-8 border-t border-gray-200 transition-all duration-700 ${reviewsSection.isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Guest Reviews</h2>
                      {reviewStats && reviewStats.total_reviews > 0 && (
                        <div className="flex items-center gap-2 mt-1">
                          <StarRating rating={reviewStats.average_rating} size="sm" />
                          <span className="text-gray-700 font-medium">{reviewStats.average_rating.toFixed(1)}</span>
                          <span className="text-gray-500 text-sm">({reviewStats.total_reviews} {reviewStats.total_reviews === 1 ? 'review' : 'reviews'})</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {loadingReviews ? (
                    <div className="text-center py-8">
                      <div className="animate-spin w-8 h-8 border-2 border-gray-300 border-t-gray-900 rounded-full mx-auto"></div>
                    </div>
                  ) : reviews.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <MessageSquare size={32} className="mx-auto mb-2 opacity-50" />
                      <p>No reviews yet for this room.</p>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {reviews.slice(0, 5).map((review) => (
                        <div key={review.id} className="pb-6 border-b border-gray-100 last:border-0">
                          <div className="flex items-start gap-3">
                            <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
                              <User size={20} className="text-gray-400" />
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-medium text-gray-900">{review.guest_name}</span>
                                <StarRating rating={review.rating} size="sm" />
                              </div>
                              <p className="text-xs text-gray-500 mb-2">
                                {new Date(review.created_at).toLocaleDateString('en-US', {
                                  month: 'long',
                                  year: 'numeric'
                                })}
                              </p>
                              {review.title && (
                                <p className="font-medium text-gray-900 mb-1">"{review.title}"</p>
                              )}
                              {review.content && (
                                <p className="text-gray-600 text-sm leading-relaxed">{review.content}</p>
                              )}
                              {review.owner_response && (
                                <div className="mt-3 p-3 bg-gray-50 rounded-lg border-l-4 border-gray-300">
                                  <div className="flex items-center gap-1 mb-1">
                                    <MessageSquare size={12} className="text-gray-500" />
                                    <span className="text-xs font-medium text-gray-600">Response from property</span>
                                  </div>
                                  <p className="text-sm text-gray-600">{review.owner_response}</p>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                      {reviews.length > 5 && (
                        <p className="text-center text-sm text-gray-500">
                          Showing 5 of {reviews.length} reviews
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Booking Card */}
          <div ref={bookingSection.ref} className="lg:col-span-1">
            <div className={`sticky top-24 bg-white rounded-lg border border-gray-200 p-5 sm:p-6 shadow-sm transition-all duration-700 ${bookingSection.isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
              <div className="mb-4 pb-4 border-b border-gray-100">
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl sm:text-3xl font-bold text-gray-900">
                    {formatCurrency(room.base_price_per_night, room.currency)}
                  </span>
                  <span className="text-gray-500 text-sm">/ night</span>
                </div>
                {room.min_stay_nights > 1 && (
                  <p className="text-sm text-gray-500 mt-1">
                    Minimum stay: {room.min_stay_nights} nights
                  </p>
                )}
              </div>

              <button
                onClick={handleBookNow}
                className="w-full bg-gray-900 text-white py-3 rounded-md font-medium hover:bg-gray-800 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2"
              >
                <Calendar size={18} />
                Book Now
              </button>

              <div className="mt-4 pt-4 border-t border-gray-100">
                <p className="text-sm text-gray-600 text-center mb-3">Or contact us directly</p>
                <div className="space-y-2">
                  <a
                    href="tel:+27123456789"
                    className="flex items-center justify-center gap-2 text-gray-700 hover:text-gray-900 transition-colors text-sm"
                  >
                    <Phone size={16} />
                    +27 12 345 6789
                  </a>
                  <a
                    href="mailto:info@viloguesthouse.com"
                    className="flex items-center justify-center gap-2 text-gray-700 hover:text-gray-900 transition-colors text-sm"
                  >
                    <Mail size={16} />
                    info@viloguesthouse.com
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

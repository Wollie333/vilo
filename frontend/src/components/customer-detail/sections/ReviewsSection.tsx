import { useState } from 'react'
import { Star, ExternalLink, X, ChevronLeft, ChevronRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

interface ReviewImage {
  url: string
  path: string
  hidden?: boolean
}

interface Review {
  id: string
  booking_id: string
  room_name: string
  rating: number
  title?: string
  content?: string
  status: string
  owner_response?: string
  created_at: string
  check_in: string
  check_out: string
  images?: ReviewImage[]
}

interface ReviewsSectionProps {
  reviews: Review[]
}

const reviewStatusColors: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700',
  published: 'bg-accent-100 text-accent-700',
  hidden: 'bg-gray-100 text-gray-700',
}

export default function ReviewsSection({ reviews }: ReviewsSectionProps) {
  const navigate = useNavigate()
  const [lightboxImages, setLightboxImages] = useState<ReviewImage[]>([])
  const [lightboxIndex, setLightboxIndex] = useState(0)

  const openLightbox = (images: ReviewImage[], startIndex: number) => {
    setLightboxImages(images)
    setLightboxIndex(startIndex)
  }

  const closeLightbox = () => {
    setLightboxImages([])
    setLightboxIndex(0)
  }

  const goToPrevious = () => {
    setLightboxIndex((prev) => (prev > 0 ? prev - 1 : lightboxImages.length - 1))
  }

  const goToNext = () => {
    setLightboxIndex((prev) => (prev < lightboxImages.length - 1 ? prev + 1 : 0))
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') closeLightbox()
    if (e.key === 'ArrowLeft') goToPrevious()
    if (e.key === 'ArrowRight') goToNext()
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return '-'
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            size={14}
            className={star <= rating ? 'text-amber-400 fill-amber-400' : 'text-gray-300'}
          />
        ))}
      </div>
    )
  }

  // Calculate average rating
  const averageRating = reviews.length > 0
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
    : 0

  // Rating distribution
  const ratingCounts = [5, 4, 3, 2, 1].map(rating => ({
    rating,
    count: reviews.filter(r => r.rating === rating).length
  }))

  return (
    <div className="space-y-6">
      {/* Lightbox Modal */}
      {lightboxImages.length > 0 && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
          onClick={closeLightbox}
          onKeyDown={handleKeyDown}
          tabIndex={0}
        >
          {/* Close button */}
          <button
            onClick={closeLightbox}
            className="absolute top-4 right-4 p-2 text-white/80 hover:text-white transition-colors"
          >
            <X size={28} />
          </button>

          {/* Image counter */}
          <div className="absolute top-4 left-4 text-white/80 text-sm font-medium">
            {lightboxIndex + 1} / {lightboxImages.length}
          </div>

          {/* Previous button */}
          {lightboxImages.length > 1 && (
            <button
              onClick={(e) => { e.stopPropagation(); goToPrevious() }}
              className="absolute left-4 top-1/2 -translate-y-1/2 p-2 text-white/80 hover:text-white bg-black/30 hover:bg-black/50 rounded-full transition-colors"
            >
              <ChevronLeft size={32} />
            </button>
          )}

          {/* Main image */}
          <img
            src={lightboxImages[lightboxIndex].url}
            alt={`Review image ${lightboxIndex + 1}`}
            className="max-h-[85vh] max-w-[90vw] object-contain"
            onClick={(e) => e.stopPropagation()}
          />

          {/* Next button */}
          {lightboxImages.length > 1 && (
            <button
              onClick={(e) => { e.stopPropagation(); goToNext() }}
              className="absolute right-4 top-1/2 -translate-y-1/2 p-2 text-white/80 hover:text-white bg-black/30 hover:bg-black/50 rounded-full transition-colors"
            >
              <ChevronRight size={32} />
            </button>
          )}

          {/* Thumbnail strip */}
          {lightboxImages.length > 1 && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 p-2 bg-black/50 rounded-lg">
              {lightboxImages.map((img, idx) => (
                <button
                  key={idx}
                  onClick={(e) => { e.stopPropagation(); setLightboxIndex(idx) }}
                  className={`w-12 h-12 rounded overflow-hidden border-2 transition-colors ${
                    idx === lightboxIndex ? 'border-white' : 'border-transparent opacity-60 hover:opacity-100'
                  }`}
                >
                  <img
                    src={img.url}
                    alt={`Thumbnail ${idx + 1}`}
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Summary Stats */}
      {reviews.length > 0 && (
        <div className="flex flex-col sm:flex-row gap-6 p-4 bg-gray-50 rounded-xl">
          {/* Average Rating */}
          <div className="flex items-center gap-4">
            <div className="text-4xl font-bold text-gray-900">{averageRating.toFixed(1)}</div>
            <div>
              <div className="flex items-center gap-1 mb-1">
                {renderStars(Math.round(averageRating))}
              </div>
              <p className="text-sm text-gray-500">{reviews.length} review{reviews.length !== 1 ? 's' : ''}</p>
            </div>
          </div>

          {/* Rating Distribution */}
          <div className="flex-1 space-y-1.5">
            {ratingCounts.map(({ rating, count }) => (
              <div key={rating} className="flex items-center gap-2 text-sm">
                <span className="w-3 text-gray-500">{rating}</span>
                <Star size={12} className="text-amber-400 fill-amber-400" />
                <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-amber-400 rounded-full transition-all"
                    style={{ width: reviews.length > 0 ? `${(count / reviews.length) * 100}%` : '0%' }}
                  />
                </div>
                <span className="w-6 text-right text-gray-400">{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Reviews List */}
      {reviews.length === 0 ? (
        <div className="py-16 text-center">
          <Star size={40} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500">No reviews from this customer yet</p>
        </div>
      ) : (
        <div className="space-y-4">
          {reviews.map((review) => {
            const visibleImages = review.images?.filter(img => !img.hidden) || []

            return (
              <div key={review.id} className="p-4 bg-gray-50 rounded-xl">
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      {renderStars(review.rating)}
                      <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${reviewStatusColors[review.status] || 'bg-gray-100 text-gray-700'}`}>
                        {review.status}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500">
                      {review.room_name} • {formatDate(review.check_in)} - {formatDate(review.check_out)}
                    </p>
                  </div>
                  <span className="text-xs text-gray-400 shrink-0">{formatDate(review.created_at)}</span>
                </div>

                {/* Content */}
                {review.title && (
                  <h4 className="font-medium text-gray-900 mb-1">{review.title}</h4>
                )}
                {review.content && (
                  <p className="text-gray-600 mb-3">{review.content}</p>
                )}

                {/* Images */}
                {visibleImages.length > 0 && (
                  <div className="flex gap-2 mb-3 flex-wrap">
                    {visibleImages.slice(0, 4).map((image, index) => (
                      <button
                        key={index}
                        onClick={() => openLightbox(visibleImages, index)}
                        className="relative w-16 h-16 rounded-lg overflow-hidden bg-gray-200 hover:opacity-90 transition-opacity cursor-pointer focus:outline-none focus:ring-2 focus:ring-accent-500 focus:ring-offset-2"
                      >
                        <img
                          src={image.url}
                          alt={`Review image ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                        {index === 3 && visibleImages.length > 4 && (
                          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                            <span className="text-white text-sm font-medium">+{visibleImages.length - 4}</span>
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                )}

                {/* Owner Response */}
                {review.owner_response && (
                  <div className="mt-3 p-3 bg-accent-50 rounded-lg border-l-4 border-accent-400">
                    <p className="text-xs font-medium text-accent-700 mb-1">Your Response</p>
                    <p className="text-sm text-gray-700">{review.owner_response}</p>
                  </div>
                )}

                {/* Footer Action */}
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <button
                    onClick={() => navigate(`/dashboard/bookings/${review.booking_id}`)}
                    className="flex items-center gap-1.5 text-sm font-medium text-accent-600 hover:text-accent-700"
                  >
                    <ExternalLink size={14} />
                    View Booking
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

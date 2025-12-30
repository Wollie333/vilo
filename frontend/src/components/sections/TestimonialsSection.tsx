import { Star, Quote } from 'lucide-react'
import { PublicReview } from '../../services/api'

interface TestimonialsSectionProps {
  config: {
    title?: string
    subtitle?: string
    limit?: number
    showRating?: boolean
    layout?: 'cards' | 'carousel' | 'masonry'
  }
  reviews?: PublicReview[]
  loading?: boolean
  colors?: {
    primary?: string
    accent?: string
  }
}

export default function TestimonialsSection({ config, reviews = [], loading, colors }: TestimonialsSectionProps) {
  const {
    title = 'What Our Guests Say',
    subtitle = 'Real reviews from real guests',
    limit = 3,
    showRating = true,
  } = config

  const displayReviews = reviews.slice(0, limit)
  const primaryColor = colors?.primary || '#1f2937'

  // Helper to get review text (content or title)
  const getReviewText = (review: PublicReview): string => {
    return review.content || review.title || 'Great experience!'
  }

  // Helper to get room name from booking
  const getRoomName = (review: PublicReview): string | undefined => {
    return review.bookings?.room_name
  }

  if (loading) {
    return (
      <section className="py-20 px-6 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/3 mx-auto mb-4" />
            <div className="h-4 bg-gray-200 rounded w-1/2 mx-auto mb-12" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[1, 2, 3].map(i => (
                <div key={i} className="bg-gray-50 rounded-2xl p-8">
                  <div className="h-4 bg-gray-200 rounded w-full mb-2" />
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-6" />
                  <div className="h-3 bg-gray-200 rounded w-1/3" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    )
  }

  if (reviews.length === 0) {
    return (
      <section className="py-20 px-6 bg-white">
        <div className="max-w-6xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">{title}</h2>
          <p className="text-gray-600">No reviews yet. Be the first to share your experience!</p>
        </div>
      </section>
    )
  }

  return (
    <section className="py-20 px-6 bg-white">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            {title}
          </h2>
          {subtitle && (
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              {subtitle}
            </p>
          )}
        </div>

        {/* Reviews Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {displayReviews.map((review) => {
            const reviewText = getReviewText(review)
            const roomName = getRoomName(review)
            
            return (
              <div
                key={review.id}
                className="relative bg-gray-50 rounded-2xl p-8 hover:shadow-lg transition-shadow duration-300"
              >
                {/* Quote Icon */}
                <Quote
                  size={40}
                  className="absolute top-6 right-6 opacity-10"
                  style={{ color: primaryColor }}
                />

                {/* Rating */}
                {showRating && (
                  <div className="flex items-center gap-1 mb-4">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        size={18}
                        className={i < review.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}
                      />
                    ))}
                  </div>
                )}

                {/* Comment */}
                <p className="text-gray-700 leading-relaxed mb-6 line-clamp-4">
                  "{reviewText}"
                </p>

                {/* Author */}
                <div className="flex items-center gap-3">
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center text-white font-semibold"
                    style={{ backgroundColor: primaryColor }}
                  >
                    {review.guest_name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{review.guest_name}</p>
                    {roomName && (
                      <p className="text-sm text-gray-500">Stayed in {roomName}</p>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Average Rating */}
        {reviews.length > 0 && (
          <div className="text-center mt-12 p-8 bg-gray-50 rounded-2xl">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Star size={28} className="text-yellow-400 fill-yellow-400" />
              <span className="text-4xl font-bold text-gray-900">
                {(reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)}
              </span>
            </div>
            <p className="text-gray-600">
              Based on {reviews.length} review{reviews.length !== 1 ? 's' : ''}
            </p>
          </div>
        )}
      </div>
    </section>
  )
}


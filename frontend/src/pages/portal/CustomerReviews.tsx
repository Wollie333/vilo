import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Star, Calendar, Building2 } from 'lucide-react'
import { portalApi, CustomerReview } from '../../services/portalApi'

export default function CustomerReviews() {
  const [reviews, setReviews] = useState<CustomerReview[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadReviews()
  }, [])

  const loadReviews = async () => {
    try {
      setLoading(true)
      const data = await portalApi.getReviews()
      setReviews(data)
    } catch (error) {
      console.error('Failed to load reviews:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  if (loading) {
    return (
      <div className="p-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-gray-300 border-t-gray-900 rounded-full animate-spin mx-auto mb-4" />
            <p className="text-gray-500">Loading reviews...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8 bg-white min-h-full">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">My Reviews</h1>
        <p className="text-gray-600">Reviews you've left for your stays</p>
      </div>

      {reviews.length === 0 ? (
        <div className="bg-gray-50 rounded-lg p-8 text-center">
          <Star className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No reviews yet</h3>
          <p className="text-gray-500 mb-4">
            You haven't left any reviews. After your stay, you can share your experience.
          </p>
          <Link
            to="/portal"
            className="text-gray-900 hover:underline"
          >
            View your bookings
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {reviews.map((review) => (
            <div key={review.id} className="bg-white border border-gray-200 rounded-lg p-6">
              {/* Booking Info */}
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-gray-900">{review.booking.roomName}</h3>
                  <p className="text-sm text-gray-500 flex items-center gap-2 mt-1">
                    <Building2 size={14} />
                    {review.booking.propertyName}
                  </p>
                  <p className="text-sm text-gray-500 flex items-center gap-2 mt-1">
                    <Calendar size={14} />
                    {formatDate(review.booking.checkIn)} - {formatDate(review.booking.checkOut)}
                  </p>
                </div>
                <span className="text-sm text-gray-500">
                  Reviewed {formatDate(review.created_at)}
                </span>
              </div>

              {/* Rating */}
              <div className="flex items-center gap-1 mb-3">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    size={18}
                    className={star <= review.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}
                  />
                ))}
              </div>

              {/* Review Content */}
              {review.title && (
                <h4 className="font-medium text-gray-900 mb-2">{review.title}</h4>
              )}
              {review.content && (
                <p className="text-gray-600 mb-4">{review.content}</p>
              )}

              {/* Owner Response */}
              {review.owner_response && (
                <div className="mt-4 p-4 bg-gray-50 rounded-lg border-l-4 border-gray-300">
                  <p className="text-sm font-medium text-gray-700 mb-2">Response from property</p>
                  <p className="text-gray-600">{review.owner_response}</p>
                  {review.owner_response_at && (
                    <p className="text-xs text-gray-400 mt-2">
                      {formatDate(review.owner_response_at)}
                    </p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

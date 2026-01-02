import { useState, useEffect } from 'react'
import { Star, Filter, Loader2, MessageSquare } from 'lucide-react'
import type { TenantReview } from '../types'

interface ReviewsSectionProps {
  tenantId: string
  onFetch: (status?: string) => Promise<TenantReview[]>
}

const statusColors: Record<string, string> = {
  published: 'bg-green-100 text-green-700',
  pending: 'bg-amber-100 text-amber-700',
  hidden: 'bg-gray-100 text-gray-600',
  flagged: 'bg-red-100 text-red-700',
}

export default function ReviewsSection({ tenantId, onFetch }: ReviewsSectionProps) {
  const [reviews, setReviews] = useState<TenantReview[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchReviews()
  }, [tenantId])

  const fetchReviews = async (status?: string) => {
    try {
      setLoading(true)
      setError(null)
      const data = await onFetch(status)
      setReviews(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch reviews')
    } finally {
      setLoading(false)
    }
  }

  const handleStatusChange = (status: string) => {
    setStatusFilter(status)
    fetchReviews(status === 'all' ? undefined : status)
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

  const averageRating = reviews.length > 0
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
    : '0.0'

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Reviews</h2>
          <p className="text-sm text-gray-500">
            {reviews.length} review{reviews.length !== 1 ? 's' : ''} • {averageRating} avg rating
          </p>
        </div>
      </div>

      {/* Filter */}
      <div className="relative w-fit">
        <Filter size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <select
          value={statusFilter}
          onChange={(e) => handleStatusChange(e.target.value)}
          className="pl-9 pr-8 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-accent-500 appearance-none bg-white"
        >
          <option value="all">All Status</option>
          <option value="published">Published</option>
          <option value="pending">Pending</option>
          <option value="hidden">Hidden</option>
          <option value="flagged">Flagged</option>
        </select>
      </div>

      {/* Loading */}
      {loading && (
        <div className="py-12 text-center">
          <Loader2 size={24} className="mx-auto text-accent-500 animate-spin mb-2" />
          <p className="text-sm text-gray-500">Loading reviews...</p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && reviews.length === 0 && (
        <div className="py-12 text-center bg-gray-50 rounded-lg">
          <MessageSquare size={32} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500">No reviews yet</p>
        </div>
      )}

      {/* Reviews List */}
      {!loading && !error && reviews.length > 0 && (
        <div className="space-y-3">
          {reviews.map((review) => (
            <div
              key={review.id}
              className="p-4 bg-gray-50 rounded-lg"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    {renderStars(review.rating)}
                    <span className={`px-2 py-0.5 text-xs font-medium rounded-full capitalize ${statusColors[review.status] || 'bg-gray-100 text-gray-600'}`}>
                      {review.status}
                    </span>
                  </div>
                  {review.title && (
                    <p className="text-sm font-medium text-gray-900 mb-1">{review.title}</p>
                  )}
                  {review.comment && (
                    <p className="text-sm text-gray-600 line-clamp-2">{review.comment}</p>
                  )}
                  <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                    <span>{review.guest_name || 'Anonymous'}</span>
                    {review.room_name && (
                      <>
                        <span>•</span>
                        <span>{review.room_name}</span>
                      </>
                    )}
                    <span>•</span>
                    <span>{formatDate(review.created_at)}</span>
                  </div>
                </div>
                <div className="shrink-0 text-xs text-gray-400 capitalize">
                  {review.source}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

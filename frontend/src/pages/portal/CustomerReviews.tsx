import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Star, Calendar, Building2, BedDouble, Eye, Pencil, X, Loader2, ChevronDown, ChevronUp } from 'lucide-react'
import { portalApi, CustomerReview } from '../../services/portalApi'
import StarRating from '../../components/StarRating'
import ReviewCategoryRatings, {
  CategoryRatings,
  createEmptyRatings,
  toCategoryRatings,
  fromCategoryRatings,
  areAllRatingsFilled,
  calculateOverallRating
} from '../../components/ReviewCategoryRatings'
import TermsAcceptance from '../../components/TermsAcceptance'

const reviewStatusColors: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700 border-amber-200',
  published: 'bg-accent-100 text-accent-700 border-accent-200',
  hidden: 'bg-gray-100 text-gray-700 border-gray-200',
}

const reviewStatusLabels: Record<string, string> = {
  pending: 'Pending',
  published: 'Published',
  hidden: 'Hidden',
}

interface EditModalProps {
  review: CustomerReview
  isOpen: boolean
  onClose: () => void
  onSave: (data: {
    rating: number
    rating_cleanliness: number
    rating_service: number
    rating_location: number
    rating_value: number
    rating_safety: number
    title: string
    content: string
  }) => Promise<void>
  isSaving: boolean
}

function EditReviewModal({ review, isOpen, onClose, onSave, isSaving }: EditModalProps) {
  // Initialize category ratings from review or create empty
  const existingCategoryRatings = toCategoryRatings(review)
  const [categoryRatings, setCategoryRatings] = useState<CategoryRatings>(
    existingCategoryRatings || createEmptyRatings()
  )
  const [title, setTitle] = useState(review.title || '')
  const [content, setContent] = useState(review.content || '')
  const [termsAccepted, setTermsAccepted] = useState(false)

  useEffect(() => {
    const ratings = toCategoryRatings(review)
    setCategoryRatings(ratings || createEmptyRatings())
    setTitle(review.title || '')
    setContent(review.content || '')
    setTermsAccepted(false)
  }, [review])

  if (!isOpen) return null

  const overallRating = calculateOverallRating(categoryRatings)
  const allRatingsFilled = areAllRatingsFilled(categoryRatings)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!allRatingsFilled) return

    const apiRatings = fromCategoryRatings(categoryRatings)
    await onSave({
      rating: overallRating,
      ...apiRatings,
      title,
      content
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Edit Review</h2>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-5">
          {/* Property Info */}
          <div className="p-3 bg-gray-50 rounded-lg">
            <p className="font-medium text-gray-900">{review.booking.roomName}</p>
            <p className="text-sm text-gray-500">{review.booking.propertyName}</p>
          </div>

          {/* Category Ratings */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Your Ratings <span className="text-red-500">*</span>
            </label>
            <ReviewCategoryRatings
              ratings={categoryRatings}
              onChange={setCategoryRatings}
              interactive
              size="sm"
              layout="vertical"
            />
            {allRatingsFilled && (
              <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
                <span className="text-sm text-gray-600">Overall Rating</span>
                <div className="flex items-center gap-2">
                  <StarRating rating={overallRating} size="sm" />
                  <span className="font-semibold text-gray-900">{overallRating.toFixed(1)}</span>
                </div>
              </div>
            )}
          </div>

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Review Title <span className="text-gray-400">(optional)</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Summarize your experience"
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent"
              maxLength={100}
            />
          </div>

          {/* Content */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Your Review <span className="text-gray-400">(optional)</span>
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Tell others about your experience..."
              rows={4}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent resize-none"
              maxLength={1000}
            />
            <p className="mt-1 text-xs text-gray-400 text-right">{content.length}/1000</p>
          </div>

          {/* Terms Acceptance */}
          <TermsAcceptance
            accepted={termsAccepted}
            onChange={setTermsAccepted}
            size="sm"
          />

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving || !termsAccepted || !allRatingsFilled}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-accent-600 rounded-lg hover:bg-accent-700 transition-colors disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function CustomerReviews() {
  const [reviews, setReviews] = useState<CustomerReview[]>([])
  const [loading, setLoading] = useState(true)
  const [editingReview, setEditingReview] = useState<CustomerReview | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [expandedReviews, setExpandedReviews] = useState<Set<string>>(new Set())

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

  const handleSaveReview = async (data: {
    rating: number
    rating_cleanliness: number
    rating_service: number
    rating_location: number
    rating_value: number
    rating_safety: number
    title: string
    content: string
  }) => {
    if (!editingReview) return

    try {
      setIsSaving(true)
      setError(null)
      const updated = await portalApi.updateReview(editingReview.id, data)

      // Update the review in the list
      setReviews(prev => prev.map(r =>
        r.id === editingReview.id
          ? {
              ...r,
              rating: updated.rating,
              rating_cleanliness: updated.rating_cleanliness,
              rating_service: updated.rating_service,
              rating_location: updated.rating_location,
              rating_value: updated.rating_value,
              rating_safety: updated.rating_safety,
              title: updated.title,
              content: updated.content
            }
          : r
      ))

      setEditingReview(null)
      setSuccessMessage('Review updated successfully!')
      setTimeout(() => setSuccessMessage(null), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update review')
    } finally {
      setIsSaving(false)
    }
  }

  const toggleExpanded = (reviewId: string) => {
    setExpandedReviews(prev => {
      const next = new Set(prev)
      if (next.has(reviewId)) {
        next.delete(reviewId)
      } else {
        next.add(reviewId)
      }
      return next
    })
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const formatShortDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    })
  }

  if (loading) {
    return (
      <div className="p-8 bg-gray-50 min-h-full">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-accent-200 border-t-accent-600 rounded-full animate-spin mx-auto mb-4" />
            <p className="text-gray-500">Loading reviews...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 md:p-8 bg-gray-50 min-h-full">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">My Reviews</h1>
          <p className="text-gray-600">Reviews you've left for your stays</p>
        </div>

        {/* Success Message */}
        {successMessage && (
          <div className="mb-6 p-4 bg-accent-50 border border-accent-200 rounded-lg text-accent-700 text-sm">
            {successMessage}
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* Reviews List */}
        {reviews.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <Star className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No reviews yet</h3>
            <p className="text-gray-500 mb-6">
              You haven't left any reviews yet. After your stay, you can share your experience.
            </p>
            <Link
              to="/portal/bookings"
              className="inline-flex items-center gap-2 px-4 py-2 bg-accent-600 text-white text-sm font-medium rounded-lg hover:bg-accent-700 transition-colors"
            >
              <Calendar size={16} />
              View your bookings
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {reviews.map((review) => {
              const categoryRatings = toCategoryRatings(review)
              const isExpanded = expandedReviews.has(review.id)
              const visibleImages = (review.images || []).filter(img => !img.hidden)

              return (
                <div
                  key={review.id}
                  className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-md transition-shadow"
                >
                  <div className="flex flex-col sm:flex-row">
                    {/* Room Image Placeholder */}
                    <div className="sm:w-48 h-40 sm:h-auto flex-shrink-0 bg-gray-100 flex items-center justify-center">
                      <BedDouble className="w-10 h-10 text-gray-300" />
                    </div>

                    {/* Review Details */}
                    <div className="flex-1 p-5">
                      <div className="flex flex-col h-full">
                        {/* Top: Room name and status */}
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <div>
                            <h3 className="font-semibold text-gray-900 text-lg leading-tight">
                              {review.booking.roomName}
                            </h3>
                            <p className="text-sm text-gray-500 flex items-center gap-1 mt-0.5">
                              <Building2 size={14} />
                              {review.booking.propertyName}
                            </p>
                          </div>
                          <span className={`px-2.5 py-1 text-xs font-medium rounded-full border ${reviewStatusColors[review.status] || 'bg-gray-100 text-gray-700 border-gray-200'}`}>
                            {reviewStatusLabels[review.status] || review.status}
                          </span>
                        </div>

                        {/* Dates */}
                        <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 mb-3">
                          <div className="flex items-center gap-1.5">
                            <Calendar size={15} className="text-gray-400" />
                            <span>{formatShortDate(review.booking.checkIn)} - {formatShortDate(review.booking.checkOut)}</span>
                          </div>
                          <span className="text-gray-300">|</span>
                          <span className="text-gray-500">Reviewed {formatDate(review.created_at)}</span>
                        </div>

                        {/* Overall Rating */}
                        <div className="flex items-center gap-2 mb-3">
                          <StarRating rating={review.rating} size="sm" showValue />
                        </div>

                        {/* Category Ratings Toggle */}
                        {categoryRatings && (
                          <div className="mb-3">
                            <button
                              onClick={() => toggleExpanded(review.id)}
                              className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900 transition-colors"
                            >
                              {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                              <span>{isExpanded ? 'Hide' : 'Show'} category ratings</span>
                            </button>
                            {isExpanded && (
                              <div className="mt-2 p-3 bg-gray-50 rounded-lg">
                                <ReviewCategoryRatings
                                  ratings={categoryRatings}
                                  size="sm"
                                  layout="grid"
                                />
                              </div>
                            )}
                          </div>
                        )}

                        {/* Review Content */}
                        {review.title && (
                          <h4 className="font-medium text-gray-900 mb-1">{review.title}</h4>
                        )}
                        {review.content && (
                          <p className="text-gray-600 text-sm line-clamp-2 mb-3">{review.content}</p>
                        )}

                        {/* Review Images */}
                        {visibleImages.length > 0 && (
                          <div className="flex flex-wrap gap-2 mb-3">
                            {visibleImages.map((image, index) => (
                              <img
                                key={image.path || index}
                                src={image.url}
                                alt={`Review photo ${index + 1}`}
                                className="w-16 h-16 object-cover rounded-lg"
                              />
                            ))}
                          </div>
                        )}

                        {/* Owner Response */}
                        {review.owner_response && (
                          <div className="mt-auto p-3 bg-accent-50 rounded-lg border-l-4 border-accent-400">
                            <p className="text-xs font-medium text-accent-700 mb-1">Response from property</p>
                            <p className="text-sm text-gray-700 line-clamp-2">{review.owner_response}</p>
                          </div>
                        )}

                        {/* Actions */}
                        <div className="flex items-center justify-end gap-2 mt-4 pt-3 border-t border-gray-100">
                          <button
                            onClick={() => setEditingReview(review)}
                            className="flex items-center gap-1.5 px-4 py-2 text-gray-700 text-sm font-medium bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                          >
                            <Pencil size={16} />
                            Edit
                          </button>
                          <Link
                            to={`/portal/bookings/${review.booking.id}`}
                            className="flex items-center gap-1.5 px-4 py-2 bg-accent-600 text-white text-sm font-medium rounded-lg hover:bg-accent-700 transition-colors"
                          >
                            <Eye size={16} />
                            View Booking
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {editingReview && (
        <EditReviewModal
          review={editingReview}
          isOpen={true}
          onClose={() => setEditingReview(null)}
          onSave={handleSaveReview}
          isSaving={isSaving}
        />
      )}
    </div>
  )
}

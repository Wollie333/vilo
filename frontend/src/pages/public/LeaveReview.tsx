import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { Loader2, CheckCircle, AlertCircle, BedDouble, Calendar } from 'lucide-react'
import StarRating from '../../components/StarRating'
import { publicReviewsApi, type ReviewVerification } from '../../services/api'

export default function LeaveReview() {
  const { tenantId, token } = useParams<{ tenantId: string; token: string }>()
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [verification, setVerification] = useState<ReviewVerification | null>(null)

  // Form state
  const [rating, setRating] = useState(0)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')

  useEffect(() => {
    const verifyToken = async () => {
      if (!tenantId || !token) {
        setError('Invalid review link')
        setLoading(false)
        return
      }

      try {
        const data = await publicReviewsApi.verifyToken(tenantId, token)
        setVerification(data)
      } catch (err: any) {
        setError(err.message || 'Invalid or expired review link')
      } finally {
        setLoading(false)
      }
    }

    verifyToken()
  }, [tenantId, token])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (rating === 0) {
      setError('Please select a rating')
      return
    }

    if (!tenantId || !token) return

    setSubmitting(true)
    setError(null)

    try {
      await publicReviewsApi.submitReview(tenantId, token, {
        rating,
        title: title.trim() || undefined,
        content: content.trim() || undefined
      })
      setSuccess(true)
    } catch (err: any) {
      setError(err.message || 'Failed to submit review')
    } finally {
      setSubmitting(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 size={40} className="animate-spin text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">Verifying your review link...</p>
        </div>
      </div>
    )
  }

  // Error state (invalid link)
  if (error && !verification) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle size={32} className="text-red-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Invalid Review Link</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <p className="text-sm text-gray-500">
            This review link may have expired or already been used.
            If you believe this is an error, please contact the property.
          </p>
        </div>
      </div>
    )
  }

  // Success state
  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle size={32} className="text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Thank You!</h1>
          <p className="text-gray-600 mb-6">
            Your review has been submitted successfully. We appreciate you taking the time to share your experience.
          </p>
          <div className="flex justify-center">
            <StarRating rating={rating} size="lg" />
          </div>
          {title && (
            <p className="mt-4 text-gray-700 font-medium">"{title}"</p>
          )}
        </div>
      </div>
    )
  }

  // Review form
  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            How was your stay?
          </h1>
          <p className="text-gray-600">
            Share your experience at {verification?.property_name}
          </p>
        </div>

        {/* Booking Summary Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Your Stay</h2>
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                <BedDouble size={24} className="text-gray-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900">{verification?.booking.room_name}</p>
                <p className="text-sm text-gray-500">
                  Guest: {verification?.booking.guest_name}
                </p>
              </div>
            </div>
            <div className="sm:ml-auto flex items-center gap-2 text-sm text-gray-600">
              <Calendar size={16} />
              <span>
                {verification?.booking.check_in && formatDate(verification.booking.check_in)} - {verification?.booking.check_out && formatDate(verification.booking.check_out)}
              </span>
            </div>
          </div>
        </div>

        {/* Review Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          {/* Rating */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-900 mb-3">
              Overall Rating <span className="text-red-500">*</span>
            </label>
            <div className="flex items-center gap-4">
              <StarRating
                rating={rating}
                size="lg"
                interactive
                onChange={setRating}
              />
              {rating > 0 && (
                <span className="text-lg font-semibold text-gray-900">
                  {rating === 1 && 'Poor'}
                  {rating === 2 && 'Fair'}
                  {rating === 3 && 'Good'}
                  {rating === 4 && 'Very Good'}
                  {rating === 5 && 'Excellent'}
                </span>
              )}
            </div>
          </div>

          {/* Title */}
          <div className="mb-6">
            <label htmlFor="title" className="block text-sm font-medium text-gray-900 mb-2">
              Review Title
              <span className="text-gray-500 font-normal ml-1">(optional)</span>
            </label>
            <input
              type="text"
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Summarize your experience in a few words"
              maxLength={100}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
            />
            <p className="mt-1 text-xs text-gray-500">{title.length}/100 characters</p>
          </div>

          {/* Content */}
          <div className="mb-6">
            <label htmlFor="content" className="block text-sm font-medium text-gray-900 mb-2">
              Your Review
              <span className="text-gray-500 font-normal ml-1">(optional)</span>
            </label>
            <textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={5}
              placeholder="Tell us more about your experience. What did you enjoy? What could be improved?"
              maxLength={2000}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent resize-none"
            />
            <p className="mt-1 text-xs text-gray-500">{content.length}/2000 characters</p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
              <AlertCircle size={20} className="text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={submitting || rating === 0}
            className="w-full py-3 px-4 bg-black text-white font-medium rounded-lg hover:bg-gray-800 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            {submitting ? (
              <>
                <Loader2 size={20} className="animate-spin" />
                Submitting...
              </>
            ) : (
              'Submit Review'
            )}
          </button>

          <p className="mt-4 text-xs text-gray-500 text-center">
            By submitting, you confirm that this review is based on your own experience
            and is your honest opinion.
          </p>
        </form>
      </div>
    </div>
  )
}

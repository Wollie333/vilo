import { useState } from 'react'
import { MessageSquare, Eye, EyeOff, Flag, Trash2, Send, User, Calendar, BedDouble } from 'lucide-react'
import StarRating from './StarRating'
import type { Review, PublicReview } from '../services/api'

interface ReviewCardProps {
  review: Review | PublicReview
  variant?: 'admin' | 'public'
  onRespond?: (reviewId: string, response: string) => Promise<void>
  onUpdateStatus?: (reviewId: string, status: 'published' | 'hidden' | 'flagged') => Promise<void>
  onDelete?: (reviewId: string) => Promise<void>
}

export default function ReviewCard({
  review,
  variant = 'public',
  onRespond,
  onUpdateStatus,
  onDelete
}: ReviewCardProps) {
  const [isResponding, setIsResponding] = useState(false)
  const [response, setResponse] = useState((review as Review).owner_response || '')
  const [isSaving, setIsSaving] = useState(false)

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const handleSaveResponse = async () => {
    if (!onRespond || !review.id) return
    setIsSaving(true)
    try {
      await onRespond(review.id, response)
      setIsResponding(false)
    } finally {
      setIsSaving(false)
    }
  }

  const adminReview = review as Review
  const isAdmin = variant === 'admin'

  const statusColors = {
    published: 'bg-green-100 text-green-700',
    hidden: 'bg-gray-100 text-gray-700',
    flagged: 'bg-red-100 text-red-700'
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
            <User size={20} className="text-gray-400" />
          </div>
          <div>
            <h4 className="font-medium text-gray-900">{review.guest_name}</h4>
            <div className="flex flex-wrap items-center gap-2 mt-1">
              <StarRating rating={review.rating} size="sm" />
              {review.bookings && (
                <>
                  <span className="text-gray-400 text-xs">•</span>
                  <span className="text-gray-500 text-xs flex items-center gap-1">
                    <BedDouble size={12} />
                    {review.bookings.room_name}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isAdmin && adminReview.status && (
            <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusColors[adminReview.status]}`}>
              {adminReview.status}
            </span>
          )}
          <span className="text-gray-400 text-xs flex items-center gap-1">
            <Calendar size={12} />
            {review.created_at && formatDate(review.created_at)}
          </span>
        </div>
      </div>

      {/* Review Content */}
      {review.title && (
        <h5 className="font-medium text-gray-900 mb-2">"{review.title}"</h5>
      )}
      {review.content && (
        <p className="text-gray-600 text-sm leading-relaxed">{review.content}</p>
      )}

      {/* Stay Details (Admin) */}
      {isAdmin && review.bookings && (
        <div className="mt-4 p-3 bg-gray-50 rounded-lg border border-gray-100 text-xs">
          <span className="text-gray-500">Stay: </span>
          <span className="text-gray-700">
            {formatDate(review.bookings.check_in)} - {formatDate(review.bookings.check_out)}
          </span>
        </div>
      )}

      {/* Owner Response */}
      {review.owner_response && !isResponding && (
        <div className="mt-4 p-4 bg-blue-50 rounded-lg border-l-4 border-l-blue-500">
          <div className="flex items-center gap-2 mb-2">
            <MessageSquare size={14} className="text-blue-500" />
            <span className="text-gray-900 text-sm font-medium">Response from property</span>
            {review.owner_response_at && (
              <span className="text-gray-500 text-xs">• {formatDate(review.owner_response_at)}</span>
            )}
          </div>
          <p className="text-gray-700 text-sm">{review.owner_response}</p>
        </div>
      )}

      {/* Response Form (Admin) */}
      {isAdmin && isResponding && (
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">Your Response</label>
          <textarea
            value={response}
            onChange={(e) => setResponse(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Write a thoughtful response to this review..."
          />
          <div className="flex justify-end gap-2 mt-2">
            <button
              onClick={() => setIsResponding(false)}
              className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveResponse}
              disabled={isSaving}
              className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
            >
              {isSaving ? 'Saving...' : (
                <>
                  <Send size={14} />
                  Save Response
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Admin Actions */}
      {isAdmin && (
        <div className="mt-4 pt-4 border-t border-gray-200 flex flex-wrap gap-2">
          {!isResponding && (
            <button
              onClick={() => setIsResponding(true)}
              className="px-3 py-1.5 text-xs border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 flex items-center gap-1"
            >
              <MessageSquare size={14} />
              {review.owner_response ? 'Edit Response' : 'Respond'}
            </button>
          )}

          {onUpdateStatus && (
            <>
              {adminReview.status === 'published' ? (
                <button
                  onClick={() => onUpdateStatus(review.id!, 'hidden')}
                  className="px-3 py-1.5 text-xs border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 flex items-center gap-1"
                >
                  <EyeOff size={14} />
                  Hide
                </button>
              ) : (
                <button
                  onClick={() => onUpdateStatus(review.id!, 'published')}
                  className="px-3 py-1.5 text-xs border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 flex items-center gap-1"
                >
                  <Eye size={14} />
                  Publish
                </button>
              )}

              {adminReview.status !== 'flagged' && (
                <button
                  onClick={() => onUpdateStatus(review.id!, 'flagged')}
                  className="px-3 py-1.5 text-xs border border-red-200 text-red-600 rounded-lg hover:bg-red-50 flex items-center gap-1"
                >
                  <Flag size={14} />
                  Flag
                </button>
              )}
            </>
          )}

          {onDelete && (
            <button
              onClick={() => onDelete(review.id!)}
              className="px-3 py-1.5 text-xs border border-red-200 text-red-600 rounded-lg hover:bg-red-50 flex items-center gap-1 ml-auto"
            >
              <Trash2 size={14} />
              Delete
            </button>
          )}
        </div>
      )}
    </div>
  )
}

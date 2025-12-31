import { useState, useEffect } from 'react'
import { Loader2, Star, TrendingUp, MessageSquare, Filter, RefreshCw } from 'lucide-react'
import { useNotification } from '../contexts/NotificationContext'
import { useAuth } from '../contexts/AuthContext'
import ReviewCard from '../components/ReviewCard'
import StarRating from '../components/StarRating'
import ConfirmModal from '../components/ConfirmModal'
import { reviewsApi, roomsApi, type Review, type ReviewStats, type Room, type ReviewImage, REVIEW_SOURCE_DISPLAY } from '../services/api'

export default function Reviews() {
  const { showSuccess, showError } = useNotification()
  const { tenant, tenantLoading } = useAuth()
  const [reviews, setReviews] = useState<Review[]>([])
  const [stats, setStats] = useState<ReviewStats | null>(null)
  const [rooms, setRooms] = useState<Room[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  // Filters
  const [statusFilter, setStatusFilter] = useState('all')
  const [ratingFilter, setRatingFilter] = useState<string>('all')
  const [roomFilter, setRoomFilter] = useState('all')
  const [sourceFilter, setSourceFilter] = useState('all')
  const [sortBy, setSortBy] = useState('newest')

  // Delete modal
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [reviewToDelete, setReviewToDelete] = useState<string | null>(null)

  const fetchData = async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true)
    } else {
      setLoading(true)
    }

    try {
      const [reviewsData, statsData, roomsData] = await Promise.all([
        reviewsApi.getAll({
          status: statusFilter !== 'all' ? statusFilter : undefined,
          rating: ratingFilter !== 'all' ? Number(ratingFilter) : undefined,
          room_id: roomFilter !== 'all' ? roomFilter : undefined,
          source: sourceFilter !== 'all' ? sourceFilter : undefined,
          sort: sortBy
        }),
        reviewsApi.getStats(),
        roomsApi.getAll({ is_active: true })
      ])

      setReviews(reviewsData)
      setStats(statsData)
      setRooms(roomsData)
    } catch (error: any) {
      showError('Error', error.message || 'Failed to fetch reviews')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    // Wait for tenant to be loaded before fetching reviews
    if (!tenantLoading && tenant) {
      fetchData()
    } else if (!tenantLoading && !tenant) {
      setLoading(false)
    }
  }, [tenantLoading, tenant, statusFilter, ratingFilter, roomFilter, sourceFilter, sortBy])

  const handleRespond = async (reviewId: string, response: string) => {
    try {
      await reviewsApi.update(reviewId, { owner_response: response })
      showSuccess('Response Saved', 'Your response has been published')
      fetchData(true)
    } catch (error: any) {
      showError('Error', error.message || 'Failed to save response')
    }
  }

  const handleUpdateStatus = async (reviewId: string, status: 'published' | 'hidden' | 'flagged') => {
    try {
      await reviewsApi.update(reviewId, { status })
      showSuccess('Status Updated', `Review has been ${status}`)
      fetchData(true)
    } catch (error: any) {
      showError('Error', error.message || 'Failed to update status')
    }
  }

  const handleDelete = async (reviewId: string) => {
    setReviewToDelete(reviewId)
    setDeleteModalOpen(true)
  }

  const handleUpdateImages = async (reviewId: string, images: ReviewImage[]) => {
    try {
      await reviewsApi.update(reviewId, { images })
      showSuccess('Images Updated', 'Review image visibility has been updated')
      fetchData(true)
    } catch (error: any) {
      showError('Error', error.message || 'Failed to update images')
    }
  }

  const confirmDelete = async () => {
    if (!reviewToDelete) return

    try {
      await reviewsApi.delete(reviewToDelete)
      showSuccess('Review Deleted', 'The review has been permanently deleted')
      setDeleteModalOpen(false)
      setReviewToDelete(null)
      fetchData(true)
    } catch (error: any) {
      showError('Error', error.message || 'Failed to delete review')
    }
  }

  // Stats cards
  const statsCards = stats ? [
    {
      label: 'Average Rating',
      value: stats.average_rating.toFixed(1),
      icon: Star,
      extra: <StarRating rating={stats.average_rating} size="sm" />
    },
    {
      label: 'Total Reviews',
      value: stats.total_reviews,
      icon: MessageSquare
    },
    {
      label: '5-Star Reviews',
      value: stats.rating_distribution?.[5] || 0,
      icon: TrendingUp,
      trend: stats.total_reviews > 0
        ? Math.round(((stats.rating_distribution?.[5] || 0) / stats.total_reviews) * 100)
        : 0
    }
  ] : []

  if (loading) {
    return (
      <div className="p-8 bg-gray-50 min-h-full flex items-center justify-center">
        <Loader2 size={32} className="animate-spin text-accent-500" />
      </div>
    )
  }

  return (
    <div className="p-8 bg-gray-50 min-h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Reviews</h1>
          <p className="text-gray-500">Manage and respond to guest reviews</p>
        </div>
        <button
          onClick={() => fetchData(true)}
          disabled={refreshing}
          className="px-4 py-2.5 border border-gray-200 rounded-xl bg-white text-sm flex items-center gap-2 hover:bg-gray-50 disabled:opacity-50 shadow-sm"
        >
          <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-6">
          {statsCards.map((stat, index) => (
            <div
              key={index}
              className="bg-white border border-gray-100 rounded-xl p-6 shadow-sm hover:shadow-md transition-all"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-gray-500">{stat.label}</span>
                <div className="w-10 h-10 bg-gray-50 rounded-lg flex items-center justify-center">
                  <stat.icon size={18} className="text-gray-600" />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-3xl font-bold text-gray-900">{stat.value}</span>
                {stat.extra}
                {stat.trend !== undefined && (
                  <span className="text-sm font-medium text-accent-600 bg-accent-50 px-2 py-0.5 rounded-full">
                    {stat.trend}%
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Rating Distribution & Category Averages */}
      {stats?.rating_distribution && stats.total_reviews > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Rating Distribution */}
          <div className="bg-white border border-gray-100 rounded-xl p-6 shadow-sm">
            <h3 className="text-sm font-medium text-gray-900 mb-4">Rating Distribution</h3>
            <div className="space-y-2">
              {[5, 4, 3, 2, 1].map((rating) => {
                const count = stats.rating_distribution![rating as keyof typeof stats.rating_distribution]
                const percentage = stats.total_reviews > 0
                  ? Math.round((count / stats.total_reviews) * 100)
                  : 0

                return (
                  <div key={rating} className="flex items-center gap-3">
                    <div className="flex items-center gap-1 w-16">
                      <span className="text-sm text-gray-600">{rating}</span>
                      <Star size={14} className="fill-yellow-400 text-yellow-400" />
                    </div>
                    <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-yellow-400 rounded-full transition-all"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-500 w-16 text-right">
                      {count} ({percentage}%)
                    </span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Category Averages */}
          {stats.average_cleanliness !== null && (
            <div className="bg-white border border-gray-100 rounded-xl p-6 shadow-sm">
              <h3 className="text-sm font-medium text-gray-900 mb-4">Category Averages</h3>
              <div className="space-y-3">
                {[
                  { key: 'cleanliness', label: 'Cleanliness', icon: '🧹', value: stats.average_cleanliness },
                  { key: 'service', label: 'Service', icon: '🤝', value: stats.average_service },
                  { key: 'location', label: 'Location', icon: '📍', value: stats.average_location },
                  { key: 'value', label: 'Value', icon: '💰', value: stats.average_value },
                  { key: 'safety', label: 'Safety', icon: '🛡️', value: stats.average_safety }
                ].map((category) => (
                  <div key={category.key} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span>{category.icon}</span>
                      <span className="text-sm text-gray-700">{category.label}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-yellow-400 rounded-full transition-all"
                          style={{ width: `${((category.value || 0) / 5) * 100}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium text-gray-900 w-8">
                        {category.value?.toFixed(1) || '-'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Filters */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Filter size={16} className="text-gray-500" />
          <span className="text-sm font-medium text-gray-900">Filters</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-4">
          {/* Status Filter */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-accent-500 shadow-sm"
            >
              <option value="all">All Status</option>
              <option value="published">Published</option>
              <option value="hidden">Hidden</option>
              <option value="flagged">Flagged</option>
            </select>
          </div>

          {/* Source Filter */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Source</label>
            <select
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-accent-500 shadow-sm"
            >
              <option value="all">All Sources</option>
              {Object.entries(REVIEW_SOURCE_DISPLAY).map(([key, info]) => (
                <option key={key} value={key}>{info.label}</option>
              ))}
            </select>
          </div>

          {/* Rating Filter */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Rating</label>
            <select
              value={ratingFilter}
              onChange={(e) => setRatingFilter(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-accent-500 shadow-sm"
            >
              <option value="all">All Ratings</option>
              <option value="5">5 Stars</option>
              <option value="4">4 Stars</option>
              <option value="3">3 Stars</option>
              <option value="2">2 Stars</option>
              <option value="1">1 Star</option>
            </select>
          </div>

          {/* Room Filter */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Room</label>
            <select
              value={roomFilter}
              onChange={(e) => setRoomFilter(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-accent-500 shadow-sm"
            >
              <option value="all">All Rooms</option>
              {rooms.map((room) => (
                <option key={room.id} value={room.id}>
                  {room.name}
                </option>
              ))}
            </select>
          </div>

          {/* Sort */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Sort By</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-accent-500 shadow-sm"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="highest">Highest Rating</option>
              <option value="lowest">Lowest Rating</option>
            </select>
          </div>
        </div>
      </div>

      {/* Reviews List */}
      <div className="space-y-4">
        {reviews.length === 0 ? (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
            <MessageSquare size={48} className="mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No reviews yet</h3>
            <p className="text-sm text-gray-600">
              {statusFilter !== 'all' || ratingFilter !== 'all' || roomFilter !== 'all' || sourceFilter !== 'all'
                ? 'No reviews match your current filters. Try adjusting them.'
                : 'When guests leave reviews, they will appear here. Send review requests from the booking details page.'}
            </p>
          </div>
        ) : (
          reviews.map((review) => (
            <ReviewCard
              key={review.id}
              review={review}
              variant="admin"
              onRespond={handleRespond}
              onUpdateStatus={handleUpdateStatus}
              onDelete={handleDelete}
              onUpdateImages={handleUpdateImages}
            />
          ))
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteModalOpen}
        onCancel={() => {
          setDeleteModalOpen(false)
          setReviewToDelete(null)
        }}
        onConfirm={confirmDelete}
        title="Delete Review"
        message="Are you sure you want to permanently delete this review? This action cannot be undone."
        confirmText="Delete"
        variant="danger"
      />
    </div>
  )
}

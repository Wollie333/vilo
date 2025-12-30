import { useState, useEffect, useRef } from 'react'
import { Star, Quote, ThumbsUp } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useCMSPage } from '../../hooks/useCMSPage'
import { publicReviewsApi, PublicReview, ReviewStats } from '../../services/api'

function useInView(threshold = 0.1) {
  const ref = useRef<HTMLDivElement>(null)
  const [isInView, setIsInView] = useState(true)

  useEffect(() => {
    const element = ref.current
    if (!element) return
    const rect = element.getBoundingClientRect()
    if (rect.top > window.innerHeight) setIsInView(false)

    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) setIsInView(true)
    }, { threshold })
    observer.observe(element)
    return () => observer.disconnect()
  }, [threshold])

  return { ref, isInView }
}

export default function Reviews() {
  const { tenant } = useAuth()
  const { templateId, colors, hero } = useCMSPage('reviews')
  const [reviews, setReviews] = useState<PublicReview[]>([])
  const [stats, setStats] = useState<ReviewStats | null>(null)
  const [loading, setLoading] = useState(true)

  const tenantId = tenant?.id || ''

  const heroSection = useInView()
  const statsSection = useInView()
  const reviewsSection = useInView()

  useEffect(() => {
    async function loadReviews() {
      if (!tenantId) return

      try {
        setLoading(true)
        const [reviewsData, statsData] = await Promise.all([
          publicReviewsApi.getPropertyReviews(tenantId, 50),
          publicReviewsApi.getPropertyStats(tenantId)
        ])
        setReviews(reviewsData)
        setStats(statsData)
      } catch (error) {
        console.error('Failed to load reviews:', error)
      } finally {
        setLoading(false)
      }
    }

    loadReviews()
  }, [tenantId])

  // Calculate rating distribution
  const ratingDistribution = [5, 4, 3, 2, 1].map(rating => {
    const count = reviews.filter(r => r.rating === rating).length
    const percentage = reviews.length > 0 ? (count / reviews.length) * 100 : 0
    return { rating, count, percentage }
  })

  // Render based on template
  if (templateId === 2) {
    // Grid Template
    return (
      <div className="overflow-x-hidden">
        {/* Hero */}
        <section ref={heroSection.ref} className="py-16 md:py-24" style={{ backgroundColor: colors.primary }}>
          <div className="max-w-7xl mx-auto px-6 text-center">
            <h1 className={`text-3xl md:text-5xl font-bold text-white mb-4 transition-all duration-700 ${heroSection.isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
              {hero.title || 'Guest Reviews'}
            </h1>
            <p className="text-lg text-white/70">{hero.subtitle || 'See what our guests have to say'}</p>
          </div>
        </section>

        {/* Stats Bar */}
        {stats && stats.total_reviews > 0 && (
          <section ref={statsSection.ref} className="py-8 bg-gray-50 border-b border-gray-100">
            <div className="max-w-7xl mx-auto px-6 flex flex-wrap items-center justify-center gap-8">
              <div className="flex items-center gap-3">
                <span className="text-4xl font-bold" style={{ color: colors.primary }}>{stats.average_rating.toFixed(1)}</span>
                <div>
                  <div className="flex gap-0.5">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} size={16} className={i < Math.round(stats.average_rating) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'} />
                    ))}
                  </div>
                  <p className="text-sm text-gray-500">{stats.total_reviews} reviews</p>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Reviews Grid */}
        <section ref={reviewsSection.ref} className="py-16">
          <div className="max-w-7xl mx-auto px-6">
            {loading ? (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="animate-pulse bg-gray-100 rounded-xl h-48" />
                ))}
              </div>
            ) : reviews.length > 0 ? (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {reviews.map((review, index) => (
                  <div
                    key={review.id}
                    className={`bg-white p-6 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-all duration-500 ${
                      reviewsSection.isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
                    }`}
                    style={{ transitionDelay: `${index * 50}ms` }}
                  >
                    <div className="flex gap-1 mb-3">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} size={16} className={i < review.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'} />
                      ))}
                    </div>
                    {review.title && <h3 className="font-semibold text-gray-900 mb-2">{review.title}</h3>}
                    {review.content && <p className="text-gray-600 text-sm mb-4 line-clamp-4">{review.content}</p>}
                    <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                      <div>
                        <p className="font-medium text-gray-900 text-sm">{review.guest_name}</p>
                        <p className="text-xs text-gray-500">{review.bookings?.room_name}</p>
                      </div>
                      <p className="text-xs text-gray-400">{new Date(review.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-16">
                <Star size={48} className="mx-auto text-gray-300 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Reviews Yet</h3>
                <p className="text-gray-600">Be the first to share your experience!</p>
              </div>
            )}
          </div>
        </section>
      </div>
    )
  }

  if (templateId === 3) {
    // Timeline Template
    return (
      <div className="overflow-x-hidden">
        {/* Hero */}
        <section ref={heroSection.ref} className="py-16 md:py-24" style={{ backgroundColor: colors.primary }}>
          <div className="max-w-4xl mx-auto px-6 text-center">
            <h1 className="text-3xl md:text-5xl font-bold text-white mb-4">{hero.title || 'Guest Reviews'}</h1>
            <p className="text-lg text-white/70">{hero.subtitle || 'A journey through our guest experiences'}</p>
          </div>
        </section>

        {/* Timeline Reviews */}
        <section ref={reviewsSection.ref} className="py-16">
          <div className="max-w-3xl mx-auto px-6">
            <div className="relative">
              {/* Timeline line */}
              <div className="absolute left-4 md:left-1/2 top-0 bottom-0 w-0.5 bg-gray-200 -translate-x-1/2" />

              {loading ? (
                <div className="space-y-8">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="animate-pulse ml-8 md:ml-0 bg-gray-100 rounded-xl h-40" />
                  ))}
                </div>
              ) : reviews.length > 0 ? (
                <div className="space-y-8">
                  {reviews.map((review, index) => (
                    <div
                      key={review.id}
                      className={`relative flex ${index % 2 === 0 ? 'md:flex-row' : 'md:flex-row-reverse'}`}
                    >
                      {/* Timeline dot */}
                      <div
                        className="absolute left-4 md:left-1/2 w-3 h-3 rounded-full -translate-x-1/2 mt-6"
                        style={{ backgroundColor: colors.accent }}
                      />

                      {/* Content */}
                      <div className={`ml-8 md:ml-0 md:w-1/2 ${index % 2 === 0 ? 'md:pr-12' : 'md:pl-12'}`}>
                        <div
                          className={`bg-white p-6 rounded-xl border border-gray-100 shadow-sm transition-all duration-500 ${
                            reviewsSection.isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
                          }`}
                          style={{ transitionDelay: `${index * 100}ms` }}
                        >
                          <div className="flex gap-1 mb-3">
                            {[...Array(5)].map((_, i) => (
                              <Star key={i} size={14} className={i < review.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'} />
                            ))}
                          </div>
                          {review.content && <p className="text-gray-600 text-sm mb-4">{review.content}</p>}
                          <div className="flex items-center justify-between">
                            <p className="font-medium text-gray-900 text-sm">{review.guest_name}</p>
                            <p className="text-xs text-gray-400">{new Date(review.created_at).toLocaleDateString()}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-16">
                  <Star size={48} className="mx-auto text-gray-300 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900">No Reviews Yet</h3>
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    )
  }

  if (templateId === 4) {
    // Featured Template
    const featuredReview = reviews[0]
    const otherReviews = reviews.slice(1, 7)

    return (
      <div className="overflow-x-hidden">
        {/* Hero */}
        <section ref={heroSection.ref} className="py-16 md:py-24" style={{ backgroundColor: colors.primary }}>
          <div className="max-w-7xl mx-auto px-6 text-center">
            <h1 className="text-3xl md:text-5xl font-bold text-white mb-4">{hero.title || 'Guest Reviews'}</h1>
            <p className="text-lg text-white/70">{hero.subtitle || 'Real experiences from our guests'}</p>
          </div>
        </section>

        {/* Featured Review */}
        {featuredReview && (
          <section className="py-16 bg-gray-50">
            <div className="max-w-4xl mx-auto px-6">
              <div className="bg-white p-8 md:p-12 rounded-2xl shadow-lg">
                <Quote size={48} className="text-gray-200 mb-6" />
                <div className="flex gap-1 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} size={24} className={i < featuredReview.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'} />
                  ))}
                </div>
                {featuredReview.title && <h3 className="text-xl font-bold text-gray-900 mb-4">{featuredReview.title}</h3>}
                {featuredReview.content && <p className="text-lg text-gray-600 mb-8 leading-relaxed">{featuredReview.content}</p>}
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold" style={{ backgroundColor: colors.accent }}>
                    {featuredReview.guest_name?.charAt(0) || 'G'}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{featuredReview.guest_name}</p>
                    <p className="text-sm text-gray-500">{featuredReview.bookings?.room_name}</p>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Other Reviews Grid */}
        {otherReviews.length > 0 && (
          <section ref={reviewsSection.ref} className="py-16">
            <div className="max-w-7xl mx-auto px-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-8 text-center">More Guest Experiences</h2>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {otherReviews.map((review, index) => (
                  <div
                    key={review.id}
                    className={`bg-white p-6 rounded-xl border border-gray-100 transition-all duration-500 ${
                      reviewsSection.isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
                    }`}
                    style={{ transitionDelay: `${index * 50}ms` }}
                  >
                    <div className="flex gap-1 mb-3">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} size={14} className={i < review.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'} />
                      ))}
                    </div>
                    {review.content && <p className="text-gray-600 text-sm mb-4 line-clamp-3">{review.content}</p>}
                    <p className="font-medium text-gray-900 text-sm">{review.guest_name}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}
      </div>
    )
  }

  // Default: Carousel Template (templateId === 1)
  return (
    <div className="overflow-x-hidden">
      {/* Hero with Stats */}
      <section ref={heroSection.ref} className="py-16 md:py-24" style={{ backgroundColor: colors.primary }}>
        <div className="max-w-7xl mx-auto px-6 text-center">
          <h1 className={`text-3xl md:text-5xl font-bold text-white mb-4 transition-all duration-700 ${heroSection.isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            {hero.title || 'Guest Reviews'}
          </h1>
          <p className="text-lg text-white/70 mb-8">{hero.subtitle || 'Discover what our guests love about their stay'}</p>

          {stats && stats.total_reviews > 0 && (
            <div className="flex flex-col items-center gap-4">
              <div className="flex items-center gap-2">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} size={28} className={i < Math.round(stats.average_rating) ? 'fill-yellow-400 text-yellow-400' : 'text-white/30'} />
                ))}
              </div>
              <div className="text-white">
                <span className="text-4xl font-bold">{stats.average_rating.toFixed(1)}</span>
                <span className="text-white/70 ml-2">out of 5</span>
              </div>
              <p className="text-white/70">Based on {stats.total_reviews} guest reviews</p>
            </div>
          )}
        </div>
      </section>

      {/* Rating Distribution */}
      {stats && stats.total_reviews > 0 && (
        <section ref={statsSection.ref} className="py-12 bg-gray-50">
          <div className="max-w-2xl mx-auto px-6">
            <div className="space-y-3">
              {ratingDistribution.map(({ rating, count, percentage }) => (
                <div key={rating} className="flex items-center gap-4">
                  <div className="flex items-center gap-1 w-16">
                    <span className="text-sm font-medium text-gray-700">{rating}</span>
                    <Star size={14} className="fill-yellow-400 text-yellow-400" />
                  </div>
                  <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-1000"
                      style={{ width: `${percentage}%`, backgroundColor: colors.accent }}
                    />
                  </div>
                  <span className="text-sm text-gray-500 w-12 text-right">{count}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Reviews Carousel */}
      <section ref={reviewsSection.ref} className="py-16">
        <div className="max-w-7xl mx-auto px-6">
          {loading ? (
            <div className="flex gap-6 overflow-hidden">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex-shrink-0 w-[350px] animate-pulse bg-gray-100 rounded-xl h-56" />
              ))}
            </div>
          ) : reviews.length > 0 ? (
            <div className="flex gap-6 overflow-x-auto pb-4 snap-x snap-mandatory">
              {reviews.map((review, index) => (
                <div
                  key={review.id}
                  className={`flex-shrink-0 w-[350px] bg-white p-6 rounded-xl border border-gray-100 shadow-sm snap-start transition-all duration-500 ${
                    reviewsSection.isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
                  }`}
                  style={{ transitionDelay: `${index * 50}ms` }}
                >
                  <div className="flex gap-1 mb-4">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} size={18} className={i < review.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'} />
                    ))}
                  </div>
                  {review.title && <h3 className="font-semibold text-gray-900 mb-2">{review.title}</h3>}
                  {review.content && <p className="text-gray-600 text-sm mb-4 line-clamp-4">{review.content}</p>}
                  <div className="flex items-center gap-3 pt-4 border-t border-gray-100">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-medium" style={{ backgroundColor: colors.accent }}>
                      {review.guest_name?.charAt(0) || 'G'}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 text-sm">{review.guest_name}</p>
                      <p className="text-xs text-gray-500">{review.bookings?.room_name}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <Star size={48} className="mx-auto text-gray-300 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Reviews Yet</h3>
              <p className="text-gray-600">Be the first to share your experience with us!</p>
            </div>
          )}
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 text-center" style={{ backgroundColor: colors.accent }}>
        <div className="max-w-3xl mx-auto px-6">
          <ThumbsUp size={48} className="mx-auto text-white/80 mb-4" />
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">Stayed with us?</h2>
          <p className="text-white/80 mb-6">We'd love to hear about your experience</p>
          <a
            href="/leave-review"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all text-white"
            style={{ backgroundColor: colors.primary }}
          >
            Leave a Review
          </a>
        </div>
      </section>
    </div>
  )
}

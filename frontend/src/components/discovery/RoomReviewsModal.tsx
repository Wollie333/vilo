import { X, Star, ChevronLeft, ChevronRight } from 'lucide-react'
import { useState } from 'react'
import { RoomReview, ReviewImage } from '../../services/discoveryApi'

interface RoomReviewsModalProps {
  isOpen: boolean
  onClose: () => void
  roomName: string
  reviews: RoomReview[]
  rating: number | null
}

export default function RoomReviewsModal({
  isOpen,
  onClose,
  roomName,
  reviews,
  rating
}: RoomReviewsModalProps) {
  const [imageLightbox, setImageLightbox] = useState<{
    images: ReviewImage[]
    currentIndex: number
  } | null>(null)

  if (!isOpen) return null

  return (
    <>
      {/* Main Modal */}
      <div className="fixed inset-0 z-50 overflow-y-auto">
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-black/50 transition-opacity"
          onClick={onClose}
        />

        {/* Modal Content */}
        <div className="relative min-h-screen flex items-center justify-center p-4">
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between z-10">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  Reviews for {roomName}
                </h2>
                {rating !== null && reviews.length > 0 && (
                  <div className="flex items-center gap-2 mt-1">
                    <div className="flex items-center gap-1">
                      <Star className="w-4 h-4 text-accent-500 fill-current" />
                      <span className="font-semibold text-gray-900">{rating}</span>
                    </div>
                    <span className="text-gray-500 text-sm">
                      ({reviews.length} {reviews.length === 1 ? 'review' : 'reviews'})
                    </span>
                  </div>
                )}
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Reviews List */}
            <div className="flex-1 overflow-y-auto p-6">
              {reviews.length === 0 ? (
                <div className="text-center py-12">
                  <Star className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">No reviews yet for this room</p>
                  <p className="text-sm text-gray-400 mt-1">
                    Be the first to review after your stay!
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  {reviews.map((review) => (
                    <div
                      key={review.id}
                      className="p-5 bg-gray-50 rounded-xl"
                    >
                      {/* Review Header */}
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          {review.guestProfilePicture ? (
                            <img
                              src={review.guestProfilePicture}
                              alt={review.guestName}
                              className="w-10 h-10 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-10 h-10 bg-accent-100 rounded-full flex items-center justify-center">
                              <span className="text-accent-700 font-medium">
                                {review.guestName.charAt(0).toUpperCase()}
                              </span>
                            </div>
                          )}
                          <div>
                            <span className="font-medium text-gray-900">
                              {review.guestName}
                            </span>
                            <div className="text-sm text-gray-500">
                              {new Date(review.date).toLocaleDateString('en-ZA', {
                                month: 'long',
                                year: 'numeric'
                              })}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star
                              key={i}
                              className={`w-4 h-4 ${
                                i < review.rating
                                  ? 'text-accent-500 fill-current'
                                  : 'text-gray-300'
                              }`}
                            />
                          ))}
                        </div>
                      </div>

                      {/* Review Title */}
                      {review.title && (
                        <h4 className="font-medium text-gray-900 mb-2">
                          {review.title}
                        </h4>
                      )}

                      {/* Review Comment */}
                      {review.comment && (
                        <p className="text-gray-600 leading-relaxed">
                          {review.comment}
                        </p>
                      )}

                      {/* Review Images */}
                      {review.images && review.images.length > 0 && (
                        <div className="mt-4 flex gap-2 overflow-x-auto">
                          {review.images.map((img, idx) => (
                            <button
                              key={idx}
                              onClick={() =>
                                setImageLightbox({
                                  images: review.images!,
                                  currentIndex: idx
                                })
                              }
                              className="flex-shrink-0 focus:outline-none focus:ring-2 focus:ring-accent-500 rounded-lg"
                            >
                              <img
                                src={img.url}
                                alt={`Review photo ${idx + 1}`}
                                className="w-20 h-20 object-cover rounded-lg hover:opacity-90 transition-opacity cursor-pointer"
                              />
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Category Ratings (if available) */}
                      {(review.ratingCleanliness ||
                        review.ratingService ||
                        review.ratingLocation ||
                        review.ratingValue ||
                        review.ratingSafety) && (
                        <div className="mt-4 pt-4 border-t border-gray-200">
                          <div className="flex flex-wrap gap-4 text-sm">
                            {review.ratingCleanliness && (
                              <div className="flex items-center gap-1">
                                <span className="text-gray-500">Cleanliness:</span>
                                <span className="font-medium">{review.ratingCleanliness}</span>
                              </div>
                            )}
                            {review.ratingService && (
                              <div className="flex items-center gap-1">
                                <span className="text-gray-500">Service:</span>
                                <span className="font-medium">{review.ratingService}</span>
                              </div>
                            )}
                            {review.ratingLocation && (
                              <div className="flex items-center gap-1">
                                <span className="text-gray-500">Location:</span>
                                <span className="font-medium">{review.ratingLocation}</span>
                              </div>
                            )}
                            {review.ratingValue && (
                              <div className="flex items-center gap-1">
                                <span className="text-gray-500">Value:</span>
                                <span className="font-medium">{review.ratingValue}</span>
                              </div>
                            )}
                            {review.ratingSafety && (
                              <div className="flex items-center gap-1">
                                <span className="text-gray-500">Safety:</span>
                                <span className="font-medium">{review.ratingSafety}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Image Lightbox */}
      {imageLightbox && (
        <div className="fixed inset-0 z-[60] bg-black">
          <div className="relative h-full flex flex-col">
            {/* Lightbox Header */}
            <div className="flex items-center justify-between p-4 text-white">
              <span className="text-lg font-medium">
                {imageLightbox.currentIndex + 1} / {imageLightbox.images.length}
              </span>
              <button
                onClick={() => setImageLightbox(null)}
                className="p-2 hover:bg-white/10 rounded-full transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Lightbox Content */}
            <div className="flex-1 flex items-center justify-center px-4">
              {imageLightbox.images.length > 1 && (
                <button
                  onClick={() =>
                    setImageLightbox({
                      ...imageLightbox,
                      currentIndex:
                        (imageLightbox.currentIndex -
                          1 +
                          imageLightbox.images.length) %
                        imageLightbox.images.length
                    })
                  }
                  className="absolute left-4 p-3 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
                >
                  <ChevronLeft className="w-8 h-8 text-white" />
                </button>
              )}

              <img
                src={imageLightbox.images[imageLightbox.currentIndex].url}
                alt={`Review photo ${imageLightbox.currentIndex + 1}`}
                className="max-h-[80vh] max-w-full object-contain"
              />

              {imageLightbox.images.length > 1 && (
                <button
                  onClick={() =>
                    setImageLightbox({
                      ...imageLightbox,
                      currentIndex:
                        (imageLightbox.currentIndex + 1) %
                        imageLightbox.images.length
                    })
                  }
                  className="absolute right-4 p-3 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
                >
                  <ChevronRight className="w-8 h-8 text-white" />
                </button>
              )}
            </div>

            {/* Thumbnail Strip */}
            {imageLightbox.images.length > 1 && (
              <div className="p-4 flex justify-center gap-2 overflow-x-auto">
                {imageLightbox.images.map((img, i) => (
                  <button
                    key={i}
                    onClick={() =>
                      setImageLightbox({ ...imageLightbox, currentIndex: i })
                    }
                    className={`flex-shrink-0 w-16 h-12 rounded overflow-hidden ${
                      imageLightbox.currentIndex === i
                        ? 'ring-2 ring-white'
                        : 'opacity-50 hover:opacity-100'
                    }`}
                  >
                    <img
                      src={img.url}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}

import StarRating from './StarRating'

export interface CategoryRatings {
  cleanliness: number
  service: number
  location: number
  value: number
  safety: number
}

interface ReviewCategoryRatingsProps {
  ratings: CategoryRatings
  interactive?: boolean
  onChange?: (ratings: CategoryRatings) => void
  size?: 'sm' | 'md' | 'lg'
  layout?: 'vertical' | 'grid'
  showLabels?: boolean
  className?: string
}

const CATEGORY_LABELS: Record<keyof CategoryRatings, string> = {
  cleanliness: 'Cleanliness',
  service: 'Service',
  location: 'Location',
  value: 'Value for Money',
  safety: 'Safety'
}

const CATEGORY_ICONS: Record<keyof CategoryRatings, string> = {
  cleanliness: '🧹',
  service: '🤝',
  location: '📍',
  value: '💰',
  safety: '🛡️'
}

export default function ReviewCategoryRatings({
  ratings,
  interactive = false,
  onChange,
  size = 'md',
  layout = 'vertical',
  showLabels = true,
  className = ''
}: ReviewCategoryRatingsProps) {
  const categories: (keyof CategoryRatings)[] = ['cleanliness', 'service', 'location', 'value', 'safety']

  const handleCategoryChange = (category: keyof CategoryRatings, value: number) => {
    if (onChange) {
      onChange({
        ...ratings,
        [category]: value
      })
    }
  }

  const containerClass = layout === 'grid'
    ? 'grid grid-cols-1 sm:grid-cols-2 gap-3'
    : 'flex flex-col gap-3'

  return (
    <div className={`${containerClass} ${className}`}>
      {categories.map((category) => (
        <div
          key={category}
          className={`flex items-center justify-between ${
            layout === 'grid' ? 'p-2 rounded-lg' : ''
          }`}
          style={layout === 'grid' ? { backgroundColor: 'var(--bg-secondary)' } : undefined}
        >
          {showLabels && (
            <div className="flex items-center gap-2 min-w-[120px]">
              <span className="text-base">{CATEGORY_ICONS[category]}</span>
              <span
                className={`font-medium ${size === 'sm' ? 'text-sm' : 'text-base'}`}
                style={{ color: 'var(--text-primary)' }}
              >
                {CATEGORY_LABELS[category]}
              </span>
            </div>
          )}
          <StarRating
            rating={ratings[category]}
            size={size}
            interactive={interactive}
            onChange={(value) => handleCategoryChange(category, value)}
            showValue={!interactive && ratings[category] > 0}
          />
        </div>
      ))}
    </div>
  )
}

// Helper to convert from API format to CategoryRatings
export function toCategoryRatings(review: {
  rating_cleanliness?: number
  rating_service?: number
  rating_location?: number
  rating_value?: number
  rating_safety?: number
}): CategoryRatings | null {
  if (
    review.rating_cleanliness == null ||
    review.rating_service == null ||
    review.rating_location == null ||
    review.rating_value == null ||
    review.rating_safety == null
  ) {
    return null
  }

  return {
    cleanliness: review.rating_cleanliness,
    service: review.rating_service,
    location: review.rating_location,
    value: review.rating_value,
    safety: review.rating_safety
  }
}

// Helper to convert from CategoryRatings to API format
export function fromCategoryRatings(ratings: CategoryRatings): {
  rating_cleanliness: number
  rating_service: number
  rating_location: number
  rating_value: number
  rating_safety: number
} {
  return {
    rating_cleanliness: ratings.cleanliness,
    rating_service: ratings.service,
    rating_location: ratings.location,
    rating_value: ratings.value,
    rating_safety: ratings.safety
  }
}

// Calculate overall rating from categories
export function calculateOverallRating(ratings: CategoryRatings): number {
  const sum = ratings.cleanliness + ratings.service + ratings.location + ratings.value + ratings.safety
  return Math.round(sum / 5 * 10) / 10
}

// Create empty ratings (for form initialization)
export function createEmptyRatings(): CategoryRatings {
  return {
    cleanliness: 0,
    service: 0,
    location: 0,
    value: 0,
    safety: 0
  }
}

// Check if all ratings are filled
export function areAllRatingsFilled(ratings: CategoryRatings): boolean {
  return (
    ratings.cleanliness > 0 &&
    ratings.service > 0 &&
    ratings.location > 0 &&
    ratings.value > 0 &&
    ratings.safety > 0
  )
}

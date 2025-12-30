import { Star } from 'lucide-react'

interface StarRatingProps {
  rating: number
  maxRating?: number
  size?: 'sm' | 'md' | 'lg'
  interactive?: boolean
  onChange?: (rating: number) => void
  showValue?: boolean
  className?: string
}

export default function StarRating({
  rating,
  maxRating = 5,
  size = 'md',
  interactive = false,
  onChange,
  showValue = false,
  className = ''
}: StarRatingProps) {
  const sizes = {
    sm: 14,
    md: 18,
    lg: 24
  }

  const iconSize = sizes[size]

  const handleClick = (index: number) => {
    if (interactive && onChange) {
      onChange(index + 1)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (interactive && onChange && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault()
      onChange(index + 1)
    }
  }

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      <div className="flex items-center">
        {Array.from({ length: maxRating }).map((_, index) => {
          const filled = index < rating
          return (
            <button
              key={index}
              type="button"
              onClick={() => handleClick(index)}
              onKeyDown={(e) => handleKeyDown(e, index)}
              disabled={!interactive}
              className={`
                ${interactive ? 'cursor-pointer hover:scale-110 transition-transform focus:outline-none focus:ring-2 focus:ring-yellow-400 rounded' : 'cursor-default'}
                ${!interactive && 'pointer-events-none'}
              `}
              aria-label={interactive ? `Rate ${index + 1} of ${maxRating} stars` : undefined}
            >
              <Star
                size={iconSize}
                className={`
                  transition-colors
                  ${filled
                    ? 'fill-yellow-400 text-yellow-400'
                    : interactive
                      ? 'text-gray-300 hover:text-yellow-300'
                      : 'text-gray-300'
                  }
                `}
              />
            </button>
          )
        })}
      </div>
      {showValue && (
        <span
          style={{ color: 'var(--text-secondary)' }}
          className={`ml-1 ${size === 'sm' ? 'text-xs' : size === 'lg' ? 'text-base' : 'text-sm'}`}
        >
          {rating.toFixed(1)}
        </span>
      )}
    </div>
  )
}

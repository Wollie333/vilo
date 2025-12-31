import { ExternalLink } from 'lucide-react'
import type { BookingSource, ReviewSource } from '../services/api'
import { BOOKING_SOURCE_DISPLAY, REVIEW_SOURCE_DISPLAY } from '../services/api'

interface SourceBadgeProps {
  source: BookingSource | ReviewSource
  type?: 'booking' | 'review'
  externalUrl?: string
  size?: 'sm' | 'md' | 'lg'
  showIcon?: boolean
  className?: string
}

/**
 * SourceBadge - Displays a colored badge indicating the source of a booking or review
 *
 * @param source - The source identifier (e.g., 'vilo', 'airbnb', 'booking_com')
 * @param type - Whether this is a booking or review source (defaults to 'booking')
 * @param externalUrl - Optional link to the external platform
 * @param size - Badge size: 'sm', 'md', or 'lg' (defaults to 'sm')
 * @param showIcon - Whether to show external link icon when URL is present
 * @param className - Additional CSS classes
 */
export default function SourceBadge({
  source,
  type = 'booking',
  externalUrl,
  size = 'sm',
  showIcon = true,
  className = ''
}: SourceBadgeProps) {
  // Get display info based on type
  const displayMap = type === 'review' ? REVIEW_SOURCE_DISPLAY : BOOKING_SOURCE_DISPLAY
  const displayInfo = displayMap[source as keyof typeof displayMap]

  if (!displayInfo) {
    // Fallback for unknown source
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 ${className}`}>
        {source}
      </span>
    )
  }

  // Size-based classes
  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-sm',
    lg: 'px-3 py-1.5 text-sm'
  }

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-3.5 h-3.5',
    lg: 'w-4 h-4'
  }

  const badge = (
    <span
      className={`
        inline-flex items-center gap-1 rounded-full font-medium
        ${sizeClasses[size]}
        ${displayInfo.bgColor}
        ${displayInfo.textColor}
        ${externalUrl ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''}
        ${className}
      `}
    >
      {displayInfo.label}
      {externalUrl && showIcon && (
        <ExternalLink className={iconSizes[size]} />
      )}
    </span>
  )

  // Wrap in link if external URL provided
  if (externalUrl) {
    return (
      <a
        href={externalUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-block"
        title={`View on ${displayInfo.label}`}
      >
        {badge}
      </a>
    )
  }

  return badge
}

// Icon component for source (useful in tables/lists)
export function SourceIcon({ source, type = 'booking', size = 16 }: {
  source: BookingSource | ReviewSource
  type?: 'booking' | 'review'
  size?: number
}) {
  const displayMap = type === 'review' ? REVIEW_SOURCE_DISPLAY : BOOKING_SOURCE_DISPLAY
  const displayInfo = displayMap[source as keyof typeof displayMap]

  if (!displayInfo) {
    return null
  }

  return (
    <span
      className="inline-block rounded-full"
      style={{
        width: size,
        height: size,
        backgroundColor: displayInfo.color
      }}
      title={displayInfo.label}
    />
  )
}

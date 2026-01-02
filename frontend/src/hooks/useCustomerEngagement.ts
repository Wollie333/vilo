import { useMemo } from 'react'
import type { CustomerEngagementData, SectionStatus } from '../components/customer-detail/types'

interface EngagementWeights {
  portalAccess: number
  contactComplete: number
  bookingHistory: number
  reviewsGiven: number
  lifetimeValue: number
  supportHealth: number
  hasNotes: number
}

const DEFAULT_WEIGHTS: EngagementWeights = {
  portalAccess: 15,    // 15%
  contactComplete: 10, // 10%
  bookingHistory: 25,  // 25%
  reviewsGiven: 15,    // 15%
  lifetimeValue: 20,   // 20%
  supportHealth: 10,   // 10%
  hasNotes: 5          // 5%
}

// Thresholds for scoring
const BOOKING_THRESHOLDS = { min: 1, ideal: 5 }
const VALUE_THRESHOLDS = { min: 1000, ideal: 10000 }
const REVIEW_THRESHOLDS = { min: 1, ideal: 3 }

export function useCustomerEngagement(data: CustomerEngagementData | null) {
  const engagementScore = useMemo(() => {
    if (!data) return 0

    let score = 0

    // Portal Access (15%) - binary
    if (data.hasPortalAccess) {
      score += DEFAULT_WEIGHTS.portalAccess
    }

    // Contact Complete (10%) - has phone
    if (data.hasPhone) {
      score += DEFAULT_WEIGHTS.contactComplete
    }

    // Booking History (25%) - scaled
    const bookingScore = Math.min(
      data.totalBookings / BOOKING_THRESHOLDS.ideal,
      1
    ) * DEFAULT_WEIGHTS.bookingHistory
    score += bookingScore

    // Reviews Given (15%) - scaled
    const reviewScore = Math.min(
      data.reviewCount / REVIEW_THRESHOLDS.ideal,
      1
    ) * DEFAULT_WEIGHTS.reviewsGiven
    score += reviewScore

    // Lifetime Value (20%) - scaled
    const valueScore = Math.min(
      data.totalSpent / VALUE_THRESHOLDS.ideal,
      1
    ) * DEFAULT_WEIGHTS.lifetimeValue
    score += valueScore

    // Support Health (10%) - inverse of open tickets ratio
    // No open tickets = full score, all tickets open = 0
    if (data.supportTicketCount === 0) {
      score += DEFAULT_WEIGHTS.supportHealth // No tickets = healthy relationship
    } else {
      const resolvedRatio = 1 - (data.openSupportTickets / data.supportTicketCount)
      score += resolvedRatio * DEFAULT_WEIGHTS.supportHealth
    }

    // Has Notes (5%) - binary
    if (data.hasNotes) {
      score += DEFAULT_WEIGHTS.hasNotes
    }

    return Math.round(score)
  }, [data])

  const getSectionStatus = useMemo(() => {
    if (!data) return () => 'empty' as SectionStatus

    return (sectionId: string): SectionStatus => {
      switch (sectionId) {
        case 'overview':
          // Overview is always complete if we have basic data
          return 'complete'

        case 'contact':
          // Complete if has phone, partial if just email
          return data.hasPhone ? 'complete' : 'partial'

        case 'preferences':
          // Placeholder - will be complete when preferences are set
          return 'empty'

        case 'business':
          // Business section is complete if business name is set
          // This is a simplified check - add more fields as needed
          return 'empty' // Will show complete when backend tracks this

        case 'bookings':
          if (data.totalBookings >= BOOKING_THRESHOLDS.ideal) return 'complete'
          if (data.totalBookings >= BOOKING_THRESHOLDS.min) return 'partial'
          return 'empty'

        case 'reviews':
          if (data.reviewCount >= REVIEW_THRESHOLDS.ideal) return 'complete'
          if (data.reviewCount >= REVIEW_THRESHOLDS.min) return 'partial'
          return 'empty'

        case 'support':
          if (data.supportTicketCount === 0) return 'empty'
          if (data.openSupportTickets === 0) return 'complete'
          return 'partial'

        case 'activity':
          // Activity is partial if they have any interactions
          if (data.totalBookings > 0 || data.supportTicketCount > 0) return 'partial'
          return 'empty'

        case 'notes':
          return data.hasNotes ? 'complete' : 'empty'

        case 'tags':
          return data.tags.length > 0 ? 'complete' : 'empty'

        default:
          return 'empty'
      }
    }
  }, [data])

  const engagementLevel = useMemo(() => {
    if (engagementScore >= 80) return 'high'
    if (engagementScore >= 50) return 'medium'
    return 'low'
  }, [engagementScore])

  return {
    engagementScore,
    engagementLevel,
    getSectionStatus
  }
}

export function buildEngagementData(
  customer: { phone?: string | null; hasPortalAccess?: boolean },
  stats: { totalBookings: number; totalSpent: number; averageRating: number | null; totalReviews?: number },
  supportTickets: { status: string }[],
  notes: unknown[] = [],
  tags: string[] = []
): CustomerEngagementData {
  const openStatuses = ['new', 'open', 'pending']

  return {
    hasPortalAccess: customer.hasPortalAccess || false,
    totalBookings: stats.totalBookings,
    totalSpent: stats.totalSpent,
    averageRating: stats.averageRating,
    reviewCount: stats.totalReviews || 0,
    supportTicketCount: supportTickets.length,
    openSupportTickets: supportTickets.filter(t => openStatuses.includes(t.status)).length,
    hasPhone: !!customer.phone,
    hasNotes: notes.length > 0,
    tags
  }
}

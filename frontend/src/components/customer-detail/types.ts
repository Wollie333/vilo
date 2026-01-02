import type { LucideIcon } from 'lucide-react'

export type SectionStatus = 'complete' | 'partial' | 'empty'

export interface SectionItem {
  id: string
  name: string
  icon: LucideIcon
  count?: number
}

export interface SectionGroup {
  id: string
  name: string
  items: SectionItem[]
}

export interface CustomerEngagementData {
  hasPortalAccess: boolean
  totalBookings: number
  totalSpent: number
  averageRating: number | null
  reviewCount: number
  supportTicketCount: number
  openSupportTickets: number
  hasPhone: boolean
  hasNotes: boolean
  tags: string[]
}

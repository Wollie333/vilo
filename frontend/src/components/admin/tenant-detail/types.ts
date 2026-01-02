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

export interface TenantHealthData {
  subscriptionStatus: string | null
  roomCount: number
  memberCount: number
  monthlyBookings: number
  maxRooms: number
  maxMembers: number
  lastActiveAt: string | null
  createdAt: string
}

export interface TenantMember {
  id: string
  user_id: string
  email: string
  display_name: string | null
  role_id: string
  status: 'active' | 'invited' | 'pending' | 'suspended' | 'removed'
  created_at: string
  roles: {
    name: string
    slug: string
  }
}

export interface TenantRoom {
  id: string
  name: string
  roomCode: string | null
  status: string
  isPaused?: boolean
}

export interface TenantBooking {
  id: string
  status: string
  total_amount: number
  created_at: string
  customer_name?: string
  guest_email?: string
  guest_phone?: string
  room_id?: string
  room_name?: string
  room_image?: string
  check_in?: string
  check_out?: string
}

export interface TenantActivity {
  id: string
  type: 'booking' | 'payment' | 'member' | 'setting'
  description: string
  created_at: string
  metadata?: Record<string, unknown>
}

export interface TenantProperty {
  id: string
  businessName?: string
  businessDescription?: string
  logoUrl?: string
  businessEmail?: string
  businessPhone?: string
  websiteUrl?: string
  addressLine1?: string
  addressLine2?: string
  city?: string
  stateProvince?: string
  postalCode?: string
  country?: string
  vatNumber?: string
  companyRegistrationNumber?: string
  currency?: string
  timezone?: string
  language?: string
  dateFormat?: string
  discoverable?: boolean
}

export interface TenantOwner {
  userId: string
  email: string
  displayName: string | null
  phone: string | null
  avatarUrl: string | null
  address?: {
    line1?: string
    line2?: string
    city?: string
    state?: string
    postalCode?: string
    country?: string
  }
  createdAt: string
  lastSignInAt?: string
}

export interface OwnerUpdateData {
  displayName?: string
  email?: string
  phone?: string
  avatarUrl?: string
  address?: {
    line1?: string
    line2?: string
    city?: string
    state?: string
    postalCode?: string
    country?: string
  }
}

// Operations section types
export interface TenantCustomer {
  id: string
  email: string
  name: string | null
  phone: string | null
  avatar: string | null
  bookingCount: number
  totalSpent: number
  firstStay: string | null
  lastStay: string | null
  hasPortalAccess: boolean
}

export interface TenantReview {
  id: string
  rating: number
  title: string | null
  comment: string | null
  status: string
  source: string
  created_at: string
  guest_name: string | null
  room_name: string | null
}

export interface TenantRefund {
  id: string
  booking_id: string
  original_amount: number
  eligible_amount: number
  approved_amount: number | null
  status: string
  requested_at: string
  guest_name: string | null
  currency: string
}

/**
 * FOB (Front of Business) Integration Types
 * Multi-source booking and review sync from OTAs
 */

// ============================================
// Source Types
// ============================================

export type BookingSource =
  | 'vilo'           // Vilo network booking
  | 'website'        // Direct website booking
  | 'manual'         // Manually added by host
  | 'airbnb'         // Airbnb
  | 'booking_com'    // Booking.com
  | 'lekkerslaap'    // LekkeSlaap
  | 'expedia'        // Expedia
  | 'tripadvisor'    // TripAdvisor

export type ReviewSource =
  | 'vilo'           // Vilo platform review
  | 'airbnb'         // Airbnb
  | 'booking_com'    // Booking.com
  | 'lekkerslaap'    // LekkeSlaap
  | 'expedia'        // Expedia
  | 'tripadvisor'    // TripAdvisor
  | 'google'         // Google Reviews

export type Platform =
  | 'airbnb'
  | 'booking_com'
  | 'lekkerslaap'
  | 'expedia'
  | 'tripadvisor'
  | 'google'
  | 'ical'           // Generic iCal import

// ============================================
// Integration Configuration
// ============================================

export interface Integration {
  id: string
  tenant_id: string
  platform: Platform
  display_name: string | null
  credentials: IntegrationCredentials
  settings: IntegrationSettings
  is_active: boolean
  is_connected: boolean
  last_sync_at: string | null
  last_error: string | null
  sync_bookings: boolean
  sync_reviews: boolean
  sync_availability: boolean
  auto_sync_enabled: boolean
  sync_interval_minutes: number
  webhook_url: string | null
  webhook_secret: string | null
  created_at: string
  updated_at: string
}

export interface IntegrationCredentials {
  api_key?: string
  api_secret?: string
  access_token?: string
  refresh_token?: string
  property_id?: string
  hotel_id?: string
  [key: string]: string | undefined
}

export interface IntegrationSettings {
  auto_confirm_bookings?: boolean
  sync_cancelled?: boolean
  default_room_id?: string
  [key: string]: unknown
}

// ============================================
// Room Mapping
// ============================================

export interface RoomMapping {
  id: string
  tenant_id: string
  room_id: string
  integration_id: string
  external_room_id: string
  external_room_name: string | null
  ical_url: string | null
  last_ical_sync: string | null
  created_at: string
  updated_at: string
  // Joined fields
  room_name?: string
}

export interface RoomMappingInput {
  room_id: string
  external_room_id: string
  external_room_name?: string
  ical_url?: string
}

// ============================================
// Sync Operations
// ============================================

export type SyncType = 'bookings' | 'reviews' | 'availability' | 'full'
export type SyncDirection = 'inbound' | 'outbound'
export type SyncStatus = 'pending' | 'running' | 'success' | 'failed'

export interface SyncLog {
  id: string
  tenant_id: string
  integration_id: string
  sync_type: SyncType
  direction: SyncDirection
  status: SyncStatus
  started_at: string
  completed_at: string | null
  records_processed: number
  records_created: number
  records_updated: number
  records_skipped: number
  error_message: string | null
  details: Record<string, unknown>
  created_at: string
}

export interface SyncResult {
  success: boolean
  records_processed: number
  records_created: number
  records_updated: number
  records_skipped: number
  errors: string[]
}

// ============================================
// Platform Configuration (static info)
// ============================================

export interface PlatformConfig {
  id: Platform
  name: string
  description: string
  logo?: string
  color: string
  supports_bookings: boolean
  supports_reviews: boolean
  supports_availability: boolean
  supports_webhooks: boolean
  auth_type: 'api_key' | 'oauth' | 'ical' | 'manual'
  setup_instructions: string
}

export const PLATFORM_CONFIGS: Record<Platform, PlatformConfig> = {
  airbnb: {
    id: 'airbnb',
    name: 'Airbnb',
    description: 'Sync bookings and reviews from Airbnb',
    color: '#FF5A5F',
    supports_bookings: true,
    supports_reviews: true,
    supports_availability: true,
    supports_webhooks: true,
    auth_type: 'oauth',
    setup_instructions: 'Connect your Airbnb account to sync bookings, reviews, and availability.',
  },
  booking_com: {
    id: 'booking_com',
    name: 'Booking.com',
    description: 'Sync bookings and reviews from Booking.com',
    color: '#003580',
    supports_bookings: true,
    supports_reviews: true,
    supports_availability: true,
    supports_webhooks: true,
    auth_type: 'api_key',
    setup_instructions: 'Enter your Booking.com Partner API credentials to sync bookings and reviews.',
  },
  lekkerslaap: {
    id: 'lekkerslaap',
    name: 'LekkeSlaap',
    description: 'Sync bookings from LekkeSlaap',
    color: '#F97316',
    supports_bookings: true,
    supports_reviews: true,
    supports_availability: true,
    supports_webhooks: false,
    auth_type: 'ical',
    setup_instructions: 'Add your LekkeSlaap iCal URL to import bookings automatically.',
  },
  expedia: {
    id: 'expedia',
    name: 'Expedia',
    description: 'Sync bookings from Expedia Group',
    color: '#FBBF24',
    supports_bookings: true,
    supports_reviews: true,
    supports_availability: true,
    supports_webhooks: true,
    auth_type: 'api_key',
    setup_instructions: 'Connect your Expedia Partner Central account.',
  },
  tripadvisor: {
    id: 'tripadvisor',
    name: 'TripAdvisor',
    description: 'Sync reviews from TripAdvisor',
    color: '#00AF87',
    supports_bookings: false,
    supports_reviews: true,
    supports_availability: false,
    supports_webhooks: false,
    auth_type: 'api_key',
    setup_instructions: 'Connect your TripAdvisor business account to import reviews.',
  },
  google: {
    id: 'google',
    name: 'Google Business',
    description: 'Sync reviews from Google Business Profile',
    color: '#4285F4',
    supports_bookings: false,
    supports_reviews: true,
    supports_availability: false,
    supports_webhooks: false,
    auth_type: 'oauth',
    setup_instructions: 'Connect your Google Business Profile to import reviews.',
  },
  ical: {
    id: 'ical',
    name: 'iCal Import',
    description: 'Import bookings from any iCal feed',
    color: '#6B7280',
    supports_bookings: true,
    supports_reviews: false,
    supports_availability: true,
    supports_webhooks: false,
    auth_type: 'ical',
    setup_instructions: 'Add an iCal URL to import calendar events as bookings.',
  },
}

// ============================================
// API Request/Response Types
// ============================================

export interface CreateIntegrationRequest {
  platform: Platform
  display_name?: string
  credentials?: IntegrationCredentials
  settings?: IntegrationSettings
}

export interface UpdateIntegrationRequest {
  display_name?: string
  credentials?: IntegrationCredentials
  settings?: IntegrationSettings
  is_active?: boolean
  sync_bookings?: boolean
  sync_reviews?: boolean
  sync_availability?: boolean
  auto_sync_enabled?: boolean
  sync_interval_minutes?: number
}

export interface TriggerSyncRequest {
  sync_type: SyncType
}

export interface IntegrationWithMappings extends Integration {
  room_mappings: RoomMapping[]
}

// ============================================
// Source Display Utilities
// ============================================

export interface SourceDisplayInfo {
  label: string
  color: string
  bgColor: string
  textColor: string
}

export const BOOKING_SOURCE_DISPLAY: Record<BookingSource, SourceDisplayInfo> = {
  vilo: {
    label: 'Vilo',
    color: '#047857',
    bgColor: 'bg-emerald-100',
    textColor: 'text-emerald-800',
  },
  website: {
    label: 'Website',
    color: '#2563EB',
    bgColor: 'bg-blue-100',
    textColor: 'text-blue-800',
  },
  manual: {
    label: 'Manual',
    color: '#6B7280',
    bgColor: 'bg-gray-100',
    textColor: 'text-gray-800',
  },
  airbnb: {
    label: 'Airbnb',
    color: '#FF5A5F',
    bgColor: 'bg-rose-100',
    textColor: 'text-rose-800',
  },
  booking_com: {
    label: 'Booking.com',
    color: '#003580',
    bgColor: 'bg-blue-100',
    textColor: 'text-blue-900',
  },
  lekkerslaap: {
    label: 'LekkeSlaap',
    color: '#F97316',
    bgColor: 'bg-orange-100',
    textColor: 'text-orange-800',
  },
  expedia: {
    label: 'Expedia',
    color: '#FBBF24',
    bgColor: 'bg-yellow-100',
    textColor: 'text-yellow-800',
  },
  tripadvisor: {
    label: 'TripAdvisor',
    color: '#00AF87',
    bgColor: 'bg-emerald-100',
    textColor: 'text-emerald-800',
  },
}

export const REVIEW_SOURCE_DISPLAY: Record<ReviewSource, SourceDisplayInfo> = {
  vilo: BOOKING_SOURCE_DISPLAY.vilo,
  airbnb: BOOKING_SOURCE_DISPLAY.airbnb,
  booking_com: BOOKING_SOURCE_DISPLAY.booking_com,
  lekkerslaap: BOOKING_SOURCE_DISPLAY.lekkerslaap,
  expedia: BOOKING_SOURCE_DISPLAY.expedia,
  tripadvisor: BOOKING_SOURCE_DISPLAY.tripadvisor,
  google: {
    label: 'Google',
    color: '#4285F4',
    bgColor: 'bg-blue-100',
    textColor: 'text-blue-800',
  },
}

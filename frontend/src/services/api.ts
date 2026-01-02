const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3002/api'

// Tenant ID is stored by AuthContext when user logs in
let cachedTenantId: string | null = null

export const setTenantId = (id: string | null) => {
  cachedTenantId = id
}

export const getTenantId = (): string => {
  return cachedTenantId || ''
}

// Cache for auth token to avoid async calls on every request
let cachedAccessToken: string | null = null

export const setAccessToken = (token: string | null) => {
  cachedAccessToken = token
}

export const getAccessToken = (): string | null => {
  return cachedAccessToken
}

const getHeaders = (): Record<string, string> => {
  const tenantId = getTenantId()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-tenant-id': tenantId,
  }

  if (cachedAccessToken) {
    headers['Authorization'] = `Bearer ${cachedAccessToken}`
  }

  // Debug logging for API calls
  if (!tenantId) {
    console.warn('[API] Making request without tenant ID - data may not load')
  }

  return headers
}

export interface ProofOfPayment {
  url: string
  path: string
  filename: string
  uploaded_at: string
}

// Source types for FOB (Front of Business) integration
export type BookingSource = 'vilo' | 'website' | 'manual' | 'airbnb' | 'booking_com' | 'lekkerslaap' | 'expedia' | 'tripadvisor'
export type ReviewSource = 'vilo' | 'airbnb' | 'booking_com' | 'lekkerslaap' | 'expedia' | 'tripadvisor' | 'google'
export type Platform = 'airbnb' | 'booking_com' | 'lekkerslaap' | 'expedia' | 'tripadvisor' | 'google' | 'ical'

export interface Booking {
  id?: string
  guest_name: string
  guest_email?: string
  guest_phone?: string
  room_id: string
  room_name?: string
  check_in: string
  check_out: string
  status: 'pending' | 'confirmed' | 'checked_in' | 'checked_out' | 'cancelled' | 'completed' | 'occupied'
  payment_status: 'pending' | 'paid' | 'partial' | 'refunded'
  total_amount: number
  currency: string
  notes?: string
  internal_notes?: string
  proof_of_payment?: ProofOfPayment | null
  // Payment tracking fields
  payment_method?: 'paystack' | 'paypal' | 'eft' | 'manual' | null
  payment_reference?: string | null
  payment_completed_at?: string | null
  // Review request tracking
  review_request_sent?: boolean
  review_request_sent_at?: string
  // FOB integration fields
  source?: BookingSource
  external_id?: string
  external_url?: string
  synced_at?: string
}

// Room types
export interface RoomImage {
  url: string
  path: string
  caption?: string
}

export interface RoomImages {
  featured: RoomImage | null
  gallery: RoomImage[]
}

export interface BedConfiguration {
  id: string // Unique ID for React keys
  bed_type: string // King, Queen, Double, Twin, Single, Bunk, Sofa Bed, etc.
  quantity: number // How many of this bed type
  sleeps: number // How many people can sleep in this bed configuration
}

// Pricing mode types
export type PricingMode = 'per_unit' | 'per_person' | 'per_person_sharing'

export interface Room {
  id?: string
  name: string
  description?: string
  room_code?: string
  // New flexible bed configuration (optional for backwards compatibility)
  beds?: BedConfiguration[]
  // Legacy fields (kept for backwards compatibility)
  bed_type?: string
  bed_count?: number
  room_size_sqm?: number
  max_guests: number
  max_adults?: number
  max_children?: number
  amenities: string[]
  extra_options?: string[] // Extra room options like "Balcony", "Sea View", "Kitchenette"
  images: RoomImages
  // Pricing configuration
  pricing_mode?: PricingMode // per_unit, per_person, per_person_sharing (defaults to per_unit)
  base_price_per_night: number // For per_unit: total room price, For per_person: price per person
  additional_person_rate?: number // For per_person_sharing: rate for each additional person after first
  child_price_per_night?: number // Price per child per night (0 = free, null = same as adult)
  child_free_until_age?: number // Children younger than this age stay free (e.g., 2 = 0-1 years free)
  child_age_limit?: number // Max age considered a child (e.g., 12 = 0-11 are children, 12+ are adults)
  currency: string
  min_stay_nights: number
  max_stay_nights?: number
  inventory_mode: 'single_unit' | 'room_type'
  total_units: number
  is_active: boolean
  created_at?: string
  updated_at?: string
}

export interface SeasonalRate {
  id?: string
  room_id: string
  name: string
  start_date: string
  end_date: string
  pricing_mode?: PricingMode // Inherits from room if not set
  price_per_night: number // For per_unit: total room price, For per_person: price per person
  additional_person_rate?: number // For per_person_sharing: rate for each additional person
  priority: number
}

export interface EffectivePrice {
  date: string
  base_price: number
  effective_price: number
  seasonal_rate: {
    id: string
    name: string
    price_per_night: number
  } | null
  currency: string
}

export interface BatchPricing {
  nights: Array<{
    date: string
    base_price: number
    effective_price: number
    seasonal_rate: {
      id: string
      name: string
      price_per_night: number
    } | null
  }>
  total_amount: number
  currency: string
  night_count: number
}

// Add-on types
export interface AddOnImage {
  url: string
  path: string
}

export interface AddOn {
  id?: string
  name: string
  description?: string
  addon_code?: string
  addon_type: 'service' | 'product' | 'experience'
  price: number
  currency: string
  pricing_type: 'per_booking' | 'per_night' | 'per_guest' | 'per_guest_per_night'
  max_quantity: number
  image: AddOnImage | null
  available_for_rooms: string[] // Array of room IDs, empty means all rooms
  is_active: boolean
  created_at?: string
  updated_at?: string
}

export const bookingsApi = {
  getAll: async (): Promise<Booking[]> => {
    const response = await fetch(`${API_BASE_URL}/bookings`, {
      headers: getHeaders(),
    })
    if (!response.ok) {
      throw new Error('Failed to fetch bookings')
    }
    return response.json()
  },

  getById: async (id: string): Promise<Booking> => {
    const response = await fetch(`${API_BASE_URL}/bookings/${id}`, {
      headers: getHeaders(),
    })
    if (!response.ok) {
      throw new Error('Failed to fetch booking')
    }
    return response.json()
  },

  create: async (booking: Omit<Booking, 'id'>): Promise<Booking> => {
    const response = await fetch(`${API_BASE_URL}/bookings`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(booking),
    })
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to create booking')
    }
    return response.json()
  },

  update: async (id: string, booking: Partial<Booking>): Promise<Booking> => {
    const response = await fetch(`${API_BASE_URL}/bookings/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(booking),
    })
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to update booking')
    }
    return response.json()
  },

  delete: async (id: string): Promise<void> => {
    const response = await fetch(`${API_BASE_URL}/bookings/${id}`, {
      method: 'DELETE',
      headers: getHeaders(),
    })
    if (!response.ok) {
      throw new Error('Failed to delete booking')
    }
  },

  checkConflicts: async (params: {
    room_id: string
    check_in: string
    check_out: string
    exclude_booking_id?: string
  }): Promise<{
    hasConflict: boolean
    conflicts: Array<{
      id: string
      guest: string
      source: BookingSource
      dates: string
      status: string
    }>
  }> => {
    const response = await fetch(`${API_BASE_URL}/bookings/check-conflicts`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(params),
    })
    if (!response.ok) {
      throw new Error('Failed to check conflicts')
    }
    return response.json()
  },
}

// Rooms API
export const roomsApi = {
  getAll: async (params?: { is_active?: boolean; inventory_mode?: string; search?: string }): Promise<Room[]> => {
    const searchParams = new URLSearchParams()
    if (params?.is_active !== undefined) searchParams.set('is_active', String(params.is_active))
    if (params?.inventory_mode) searchParams.set('inventory_mode', params.inventory_mode)
    if (params?.search) searchParams.set('search', params.search)

    const url = `${API_BASE_URL}/rooms${searchParams.toString() ? `?${searchParams}` : ''}`
    const response = await fetch(url, { headers: getHeaders() })
    if (!response.ok) {
      throw new Error('Failed to fetch rooms')
    }
    return response.json()
  },

  getById: async (id: string): Promise<Room> => {
    const response = await fetch(`${API_BASE_URL}/rooms/${id}`, {
      headers: getHeaders(),
    })
    if (!response.ok) {
      throw new Error('Failed to fetch room')
    }
    return response.json()
  },

  create: async (room: Omit<Room, 'id' | 'created_at' | 'updated_at'>): Promise<Room> => {
    const response = await fetch(`${API_BASE_URL}/rooms`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(room),
    })
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to create room')
    }
    return response.json()
  },

  update: async (id: string, room: Partial<Room>): Promise<Room> => {
    const response = await fetch(`${API_BASE_URL}/rooms/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(room),
    })
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to update room')
    }
    return response.json()
  },

  delete: async (id: string, hard = false): Promise<void> => {
    const url = `${API_BASE_URL}/rooms/${id}${hard ? '?hard=true' : ''}`
    const response = await fetch(url, {
      method: 'DELETE',
      headers: getHeaders(),
    })
    if (!response.ok) {
      throw new Error('Failed to delete room')
    }
  },

  // Images
  updateImages: async (id: string, images: RoomImages): Promise<Room> => {
    const response = await fetch(`${API_BASE_URL}/rooms/${id}/images`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(images),
    })
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to update room images')
    }
    return response.json()
  },

  // Seasonal Rates
  getRates: async (roomId: string): Promise<SeasonalRate[]> => {
    const response = await fetch(`${API_BASE_URL}/rooms/${roomId}/rates`, {
      headers: getHeaders(),
    })
    if (!response.ok) {
      throw new Error('Failed to fetch seasonal rates')
    }
    return response.json()
  },

  createRate: async (roomId: string, rate: Omit<SeasonalRate, 'id' | 'room_id'>): Promise<SeasonalRate> => {
    const response = await fetch(`${API_BASE_URL}/rooms/${roomId}/rates`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(rate),
    })
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to create seasonal rate')
    }
    return response.json()
  },

  updateRate: async (roomId: string, rateId: string, rate: Partial<SeasonalRate>): Promise<SeasonalRate> => {
    const response = await fetch(`${API_BASE_URL}/rooms/${roomId}/rates/${rateId}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(rate),
    })
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to update seasonal rate')
    }
    return response.json()
  },

  deleteRate: async (roomId: string, rateId: string): Promise<void> => {
    const response = await fetch(`${API_BASE_URL}/rooms/${roomId}/rates/${rateId}`, {
      method: 'DELETE',
      headers: getHeaders(),
    })
    if (!response.ok) {
      throw new Error('Failed to delete seasonal rate')
    }
  },

  // Utility
  getEffectivePrice: async (roomId: string, date: string): Promise<EffectivePrice> => {
    const response = await fetch(`${API_BASE_URL}/rooms/${roomId}/price?date=${date}`, {
      headers: getHeaders(),
    })
    if (!response.ok) {
      throw new Error('Failed to get effective price')
    }
    return response.json()
  },

  // Get batch prices for a date range
  getBatchPrices: async (roomId: string, startDate: string, endDate: string): Promise<BatchPricing> => {
    const response = await fetch(
      `${API_BASE_URL}/rooms/${roomId}/prices?start_date=${startDate}&end_date=${endDate}`,
      { headers: getHeaders() }
    )
    if (!response.ok) {
      throw new Error('Failed to get batch prices')
    }
    return response.json()
  },
}

// Add-ons API
// Public Booking API (no auth required)
export interface PublicRoom {
  id: string
  name: string
  description?: string
  room_code?: string
  beds?: BedConfiguration[] // Optional for backwards compatibility
  bed_type?: string // Legacy
  bed_count?: number // Legacy
  room_size_sqm?: number
  max_guests: number
  max_adults?: number
  max_children?: number
  amenities: string[]
  extra_options?: string[]
  images: RoomImages
  // Pricing configuration
  pricing_mode?: PricingMode // defaults to per_unit
  base_price_per_night: number
  additional_person_rate?: number
  child_price_per_night?: number
  child_free_until_age?: number
  child_age_limit?: number
  currency: string
  min_stay_nights: number
  max_stay_nights?: number
  inventory_mode: 'single_unit' | 'room_type'
  total_units: number
}

export interface PublicAddOn {
  id: string
  name: string
  description?: string
  addon_type: 'service' | 'product' | 'experience'
  price: number
  currency: string
  pricing_type: 'per_booking' | 'per_night' | 'per_guest' | 'per_guest_per_night'
  max_quantity: number
  image: AddOnImage | null
}

export interface AvailabilityResponse {
  available: boolean
  available_units: number
  total_units: number
  nights: number
  min_stay_nights: number
  max_stay_nights: number | null
  meets_min_stay: boolean
  meets_max_stay: boolean
}

export interface PricingResponse {
  room_name: string
  nights: Array<{
    date: string
    price: number
    rate_name: string | null
  }>
  subtotal: number
  currency: string
  night_count: number
}

export interface BookingRequest {
  guest_name: string
  guest_email: string
  guest_phone?: string
  room_id: string
  check_in: string
  check_out: string
  guests: number
  adults?: number
  children?: number
  addons?: Array<{
    id: string
    name: string
    quantity: number
    price: number
    total: number
  }>
  special_requests?: string
  total_amount: number
  currency: string
}

export interface BookingResponse {
  success: boolean
  booking: {
    id: string
    reference: string
    guest_name: string
    guest_email: string
    room_name: string
    check_in: string
    check_out: string
    total_amount: number
    currency: string
    status: string
  }
  // Customer session for automatic portal login
  customer?: {
    id: string
    email: string
    name: string | null
    hasPassword: boolean
  } | null
  token?: string | null
  expiresAt?: string | null
}

export interface PublicPropertyInfo {
  id: string
  name: string
  email: string | null
  phone: string | null
  address: string | null
  address_line1: string | null
  address_line2: string | null
  city: string | null
  state_province: string | null
  postal_code: string | null
  country: string | null
  business_hours: Record<string, { open: string; close: string; closed: boolean }> | null
}

export const publicBookingApi = {
  getProperty: async (tenantId: string): Promise<PublicPropertyInfo> => {
    const response = await fetch(`${API_BASE_URL}/public/${tenantId}/property`)
    if (!response.ok) throw new Error('Property not found')
    return response.json()
  },

  getRooms: async (tenantId: string): Promise<PublicRoom[]> => {
    const response = await fetch(`${API_BASE_URL}/public/${tenantId}/rooms`)
    if (!response.ok) throw new Error('Failed to fetch rooms')
    return response.json()
  },

  getRoom: async (tenantId: string, roomId: string): Promise<PublicRoom> => {
    const response = await fetch(`${API_BASE_URL}/public/${tenantId}/rooms/${roomId}`)
    if (!response.ok) throw new Error('Room not found')
    return response.json()
  },

  getAddons: async (tenantId: string, roomId: string): Promise<PublicAddOn[]> => {
    const response = await fetch(`${API_BASE_URL}/public/${tenantId}/rooms/${roomId}/addons`)
    if (!response.ok) throw new Error('Failed to fetch add-ons')
    return response.json()
  },

  checkAvailability: async (
    tenantId: string,
    roomId: string,
    checkIn: string,
    checkOut: string
  ): Promise<AvailabilityResponse> => {
    const response = await fetch(
      `${API_BASE_URL}/public/${tenantId}/rooms/${roomId}/availability?check_in=${checkIn}&check_out=${checkOut}`
    )
    if (!response.ok) throw new Error('Failed to check availability')
    return response.json()
  },

  getBookedDates: async (
    tenantId: string,
    roomId: string,
    startDate?: string,
    endDate?: string
  ): Promise<{ unavailable_dates: string[]; total_units: number; inventory_mode: string }> => {
    const params = new URLSearchParams()
    if (startDate) params.set('start_date', startDate)
    if (endDate) params.set('end_date', endDate)
    const queryString = params.toString() ? `?${params.toString()}` : ''
    const response = await fetch(
      `${API_BASE_URL}/public/${tenantId}/rooms/${roomId}/booked-dates${queryString}`
    )
    if (!response.ok) throw new Error('Failed to get booked dates')
    return response.json()
  },

  getPricing: async (
    tenantId: string,
    roomId: string,
    checkIn: string,
    checkOut: string
  ): Promise<PricingResponse> => {
    const response = await fetch(
      `${API_BASE_URL}/public/${tenantId}/rooms/${roomId}/pricing?check_in=${checkIn}&check_out=${checkOut}`
    )
    if (!response.ok) throw new Error('Failed to get pricing')
    return response.json()
  },

  createBooking: async (tenantId: string, booking: BookingRequest): Promise<BookingResponse> => {
    const response = await fetch(`${API_BASE_URL}/public/${tenantId}/bookings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(booking),
    })
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to create booking')
    }
    return response.json()
  },

  getBooking: async (tenantId: string, reference: string) => {
    const response = await fetch(`${API_BASE_URL}/public/${tenantId}/bookings/${reference}`)
    if (!response.ok) throw new Error('Booking not found')
    return response.json()
  },

  getSeasonalRates: async (
    tenantId: string,
    roomId: string
  ): Promise<{ rates: Array<{ name: string; start_date: string; end_date: string }> }> => {
    const response = await fetch(`${API_BASE_URL}/public/${tenantId}/rooms/${roomId}/seasonal-rates`)
    if (!response.ok) throw new Error('Failed to get seasonal rates')
    return response.json()
  },
}

// Review image type
export interface ReviewImage {
  url: string
  path: string
  hidden?: boolean
}

// Review types
export interface Review {
  id?: string
  tenant_id?: string
  booking_id?: string // Optional for external reviews
  rating: number
  // Category ratings (1-5)
  rating_cleanliness?: number
  rating_service?: number
  rating_location?: number
  rating_value?: number
  rating_safety?: number
  title?: string
  content?: string
  guest_name: string
  owner_response?: string
  owner_response_at?: string
  status: 'published' | 'hidden' | 'flagged'
  created_at?: string
  updated_at?: string
  // Review images (max 4)
  images?: ReviewImage[]
  // FOB integration fields
  source?: ReviewSource
  external_id?: string
  external_url?: string
  synced_at?: string
  bookings?: {
    id: string
    guest_name: string
    guest_email?: string
    room_id: string
    room_name: string
    check_in: string
    check_out: string
  }
}

export interface ReviewStats {
  total_reviews: number
  average_rating: number
  // Category averages (null if no reviews with categories)
  average_cleanliness?: number | null
  average_service?: number | null
  average_location?: number | null
  average_value?: number | null
  average_safety?: number | null
  rating_distribution?: {
    1: number
    2: number
    3: number
    4: number
    5: number
  }
}

export interface PublicReview {
  id: string
  rating: number
  // Category ratings (1-5)
  rating_cleanliness?: number
  rating_service?: number
  rating_location?: number
  rating_value?: number
  rating_safety?: number
  title?: string
  content?: string
  guest_name: string
  owner_response?: string
  owner_response_at?: string
  created_at: string
  // Review images (only non-hidden ones)
  images?: ReviewImage[]
  bookings: {
    room_id: string
    room_name: string
    check_in: string
    check_out: string
  }
}

export interface ReviewVerification {
  valid: boolean
  booking: {
    id: string
    guest_name: string
    room_name: string
    check_in: string
    check_out: string
  }
  property_name: string
}

// Reviews API (admin)
export const reviewsApi = {
  getAll: async (params?: { status?: string; room_id?: string; rating?: number; source?: string; sort?: string }): Promise<Review[]> => {
    const searchParams = new URLSearchParams()
    if (params?.status) searchParams.set('status', params.status)
    if (params?.room_id) searchParams.set('room_id', params.room_id)
    if (params?.rating) searchParams.set('rating', String(params.rating))
    if (params?.source) searchParams.set('source', params.source)
    if (params?.sort) searchParams.set('sort', params.sort)

    const url = `${API_BASE_URL}/reviews${searchParams.toString() ? `?${searchParams}` : ''}`
    const response = await fetch(url, { headers: getHeaders() })
    if (!response.ok) {
      throw new Error('Failed to fetch reviews')
    }
    return response.json()
  },

  getById: async (id: string): Promise<Review> => {
    const response = await fetch(`${API_BASE_URL}/reviews/${id}`, {
      headers: getHeaders(),
    })
    if (!response.ok) {
      throw new Error('Failed to fetch review')
    }
    return response.json()
  },

  getByBookingId: async (bookingId: string): Promise<Review & { hasReview: boolean }> => {
    const response = await fetch(`${API_BASE_URL}/reviews/booking/${bookingId}`, {
      headers: getHeaders(),
    })
    if (!response.ok) {
      if (response.status === 404) {
        return { hasReview: false } as any
      }
      throw new Error('Failed to fetch review')
    }
    return response.json()
  },

  getStats: async (): Promise<ReviewStats> => {
    const response = await fetch(`${API_BASE_URL}/reviews/stats`, {
      headers: getHeaders(),
    })
    if (!response.ok) {
      throw new Error('Failed to fetch review stats')
    }
    return response.json()
  },

  update: async (id: string, data: { owner_response?: string; status?: string; images?: ReviewImage[] }): Promise<Review> => {
    const response = await fetch(`${API_BASE_URL}/reviews/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data),
    })
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to update review')
    }
    return response.json()
  },

  delete: async (id: string): Promise<void> => {
    const response = await fetch(`${API_BASE_URL}/reviews/${id}`, {
      method: 'DELETE',
      headers: getHeaders(),
    })
    if (!response.ok) {
      throw new Error('Failed to delete review')
    }
  },

  sendRequest: async (bookingId: string): Promise<{ success: boolean; message: string; reviewUrl: string }> => {
    const response = await fetch(`${API_BASE_URL}/reviews/send-request/${bookingId}`, {
      method: 'POST',
      headers: getHeaders(),
    })
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to send review request')
    }
    return response.json()
  },
}

// Public Rooms API (no auth)
export const publicRoomsApi = {
  getByCode: async (roomCode: string, tenantId?: string): Promise<Room> => {
    const url = `${API_BASE_URL}/rooms/public/by-code/${roomCode}${tenantId ? `?tenant_id=${tenantId}` : ''}`
    const response = await fetch(url)
    if (!response.ok) throw new Error('Room not found')
    return response.json()
  },

  getById: async (roomId: string): Promise<Room> => {
    const response = await fetch(`${API_BASE_URL}/rooms/public/by-id/${roomId}`)
    if (!response.ok) throw new Error('Room not found')
    return response.json()
  },

  getAll: async (tenantId: string): Promise<Room[]> => {
    const response = await fetch(`${API_BASE_URL}/rooms/public/tenant/${tenantId}`)
    if (!response.ok) throw new Error('Failed to fetch rooms')
    return response.json()
  },
}

// Public Reviews API (no auth)
export const publicReviewsApi = {
  getPropertyReviews: async (tenantId: string, limit?: number): Promise<PublicReview[]> => {
    const url = `${API_BASE_URL}/reviews/public/${tenantId}${limit ? `?limit=${limit}` : ''}`
    const response = await fetch(url)
    if (!response.ok) throw new Error('Failed to fetch reviews')
    return response.json()
  },

  getRoomReviews: async (tenantId: string, roomId: string): Promise<PublicReview[]> => {
    const response = await fetch(`${API_BASE_URL}/reviews/public/${tenantId}/room/${roomId}`)
    if (!response.ok) throw new Error('Failed to fetch room reviews')
    return response.json()
  },

  getRoomReviewsByCode: async (tenantId: string, roomCode: string): Promise<PublicReview[]> => {
    const response = await fetch(`${API_BASE_URL}/reviews/public/${tenantId}/room/by-code/${roomCode}`)
    if (!response.ok) throw new Error('Failed to fetch room reviews')
    return response.json()
  },

  getPropertyStats: async (tenantId: string): Promise<ReviewStats> => {
    const response = await fetch(`${API_BASE_URL}/reviews/public/${tenantId}/stats`)
    if (!response.ok) throw new Error('Failed to fetch review stats')
    return response.json()
  },

  getRoomStats: async (tenantId: string, roomId: string): Promise<ReviewStats> => {
    const response = await fetch(`${API_BASE_URL}/reviews/public/${tenantId}/room/${roomId}/stats`)
    if (!response.ok) throw new Error('Failed to fetch room review stats')
    return response.json()
  },

  getRoomStatsByCode: async (tenantId: string, roomCode: string): Promise<ReviewStats> => {
    const response = await fetch(`${API_BASE_URL}/reviews/public/${tenantId}/room/by-code/${roomCode}/stats`)
    if (!response.ok) throw new Error('Failed to fetch room review stats')
    return response.json()
  },

  verifyToken: async (tenantId: string, token: string): Promise<ReviewVerification> => {
    const response = await fetch(`${API_BASE_URL}/reviews/public/verify/${tenantId}/${token}`)
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Invalid review link')
    }
    return response.json()
  },

  submitReview: async (
    tenantId: string,
    token: string,
    data: {
      rating_cleanliness: number
      rating_service: number
      rating_location: number
      rating_value: number
      rating_safety: number
      title?: string
      content?: string
      images?: ReviewImage[]
    }
  ): Promise<{ success: boolean; message: string }> => {
    const response = await fetch(`${API_BASE_URL}/reviews/public/submit/${tenantId}/${token}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to submit review')
    }
    return response.json()
  },
}

export const addonsApi = {
  getAll: async (params?: { is_active?: boolean; addon_type?: string; search?: string }): Promise<AddOn[]> => {
    const searchParams = new URLSearchParams()
    if (params?.is_active !== undefined) searchParams.set('is_active', String(params.is_active))
    if (params?.addon_type) searchParams.set('addon_type', params.addon_type)
    if (params?.search) searchParams.set('search', params.search)

    const url = `${API_BASE_URL}/addons${searchParams.toString() ? `?${searchParams}` : ''}`
    const response = await fetch(url, { headers: getHeaders() })
    if (!response.ok) {
      throw new Error('Failed to fetch add-ons')
    }
    return response.json()
  },

  getById: async (id: string): Promise<AddOn> => {
    const response = await fetch(`${API_BASE_URL}/addons/${id}`, {
      headers: getHeaders(),
    })
    if (!response.ok) {
      throw new Error('Failed to fetch add-on')
    }
    return response.json()
  },

  create: async (addon: Omit<AddOn, 'id' | 'created_at' | 'updated_at'>): Promise<AddOn> => {
    const response = await fetch(`${API_BASE_URL}/addons`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(addon),
    })
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to create add-on')
    }
    return response.json()
  },

  update: async (id: string, addon: Partial<AddOn>): Promise<AddOn> => {
    const response = await fetch(`${API_BASE_URL}/addons/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(addon),
    })
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to update add-on')
    }
    return response.json()
  },

  delete: async (id: string, hard = false): Promise<void> => {
    const url = `${API_BASE_URL}/addons/${id}${hard ? '?hard=true' : ''}`
    const response = await fetch(url, {
      method: 'DELETE',
      headers: getHeaders(),
    })
    if (!response.ok) {
      throw new Error('Failed to delete add-on')
    }
  },
}

// ============================================
// COUPONS TYPES & API
// ============================================

export type DiscountType = 'percentage' | 'fixed_amount' | 'free_nights'

export interface Coupon {
  id?: string
  code: string
  name: string
  description?: string
  discount_type: DiscountType
  discount_value: number
  applicable_room_ids: string[]
  valid_from?: string
  valid_until?: string
  max_uses?: number
  max_uses_per_customer?: number
  current_uses: number
  min_booking_amount?: number
  min_nights?: number
  is_active: boolean
  is_claimable?: boolean
  created_at?: string
  updated_at?: string
}

export interface CouponValidationRequest {
  code: string
  room_id?: string
  room_ids?: string[]
  customer_email?: string
  subtotal: number
  nights: number
  check_in: string
  check_out?: string
}

export interface CouponValidationResponse {
  valid: boolean
  errors?: string[]
  coupon?: {
    id: string
    code: string
    name: string
    description?: string
    discount_type: DiscountType
    discount_value: number
  }
  discount_amount?: number
  final_amount?: number
}

export interface CouponUsage {
  id: string
  coupon_id: string
  booking_id?: string
  customer_email: string
  discount_applied: number
  original_amount: number
  final_amount: number
  used_at: string
  bookings?: {
    id: string
    guest_name: string
    room_name: string
    check_in: string
    check_out: string
  }
}

export const couponsApi = {
  getAll: async (params?: { is_active?: boolean; room_id?: string; search?: string }): Promise<Coupon[]> => {
    const searchParams = new URLSearchParams()
    if (params?.is_active !== undefined) searchParams.set('is_active', String(params.is_active))
    if (params?.room_id) searchParams.set('room_id', params.room_id)
    if (params?.search) searchParams.set('search', params.search)

    const url = `${API_BASE_URL}/coupons${searchParams.toString() ? `?${searchParams}` : ''}`
    const response = await fetch(url, { headers: getHeaders() })
    if (!response.ok) {
      throw new Error('Failed to fetch coupons')
    }
    return response.json()
  },

  getById: async (id: string): Promise<Coupon> => {
    const response = await fetch(`${API_BASE_URL}/coupons/${id}`, {
      headers: getHeaders(),
    })
    if (!response.ok) {
      throw new Error('Failed to fetch coupon')
    }
    return response.json()
  },

  create: async (coupon: Omit<Coupon, 'id' | 'current_uses' | 'created_at' | 'updated_at'>): Promise<Coupon> => {
    const response = await fetch(`${API_BASE_URL}/coupons`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(coupon),
    })
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to create coupon')
    }
    return response.json()
  },

  update: async (id: string, coupon: Partial<Coupon>): Promise<Coupon> => {
    const response = await fetch(`${API_BASE_URL}/coupons/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(coupon),
    })
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to update coupon')
    }
    return response.json()
  },

  delete: async (id: string, hard = false): Promise<void> => {
    const url = `${API_BASE_URL}/coupons/${id}${hard ? '?hard=true' : ''}`
    const response = await fetch(url, {
      method: 'DELETE',
      headers: getHeaders(),
    })
    if (!response.ok) {
      throw new Error('Failed to delete coupon')
    }
  },

  validate: async (request: CouponValidationRequest): Promise<CouponValidationResponse> => {
    const response = await fetch(`${API_BASE_URL}/coupons/validate`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(request),
    })
    if (!response.ok) {
      throw new Error('Failed to validate coupon')
    }
    return response.json()
  },

  getUsage: async (id: string): Promise<CouponUsage[]> => {
    const response = await fetch(`${API_BASE_URL}/coupons/${id}/usage`, {
      headers: getHeaders(),
    })
    if (!response.ok) {
      throw new Error('Failed to fetch coupon usage')
    }
    return response.json()
  },
}

// Customer types
export interface CustomerListItem {
  email: string
  name: string | null
  phone: string | null
  customerId: string | null
  hasPortalAccess: boolean
  bookingCount: number
  totalSpent: number
  currency: string
  firstStay: string
  lastStay: string
}

export interface CustomerStats {
  totalCustomers: number
  repeatCustomers: number
  repeatRate: string
  totalRevenue: number
  averageBookingsPerCustomer: string
  customersWithPortalAccess: number
}

export interface CustomerReview {
  id: string
  rating: number
  title?: string
  content?: string
  owner_response?: string
  status: string
  created_at: string
  booking_id: string
  room_name: string
  check_in: string
  check_out: string
  images?: { url: string; path: string; hidden?: boolean }[]
}

export interface CustomerDetail {
  customer: {
    email: string
    name: string | null
    phone: string | null
    customerId: string | null
    hasPortalAccess: boolean
    lastLoginAt: string | null
    // Profile fields
    profilePictureUrl?: string | null
    // Business details
    businessName?: string | null
    businessVatNumber?: string | null
    businessRegistrationNumber?: string | null
    businessAddressLine1?: string | null
    businessAddressLine2?: string | null
    businessCity?: string | null
    businessPostalCode?: string | null
    businessCountry?: string | null
    useBusinessDetailsOnInvoice?: boolean
  }
  stats: {
    totalBookings: number
    totalSpent: number
    currency: string
    firstStay: string
    lastStay: string
    averageRating: number | null
    totalReviews: number
  }
  bookings: Booking[]
  reviews: CustomerReview[]
  supportTickets: any[]
}

export interface CustomerUpdateData {
  name?: string
  phone?: string
  businessName?: string
  businessVatNumber?: string
  businessRegistrationNumber?: string
  businessAddressLine1?: string
  businessAddressLine2?: string
  businessCity?: string
  businessPostalCode?: string
  businessCountry?: string
  useBusinessDetailsOnInvoice?: boolean
}

export interface CustomerNote {
  id: string
  tenant_id: string
  customer_id: string
  content: string
  created_by: string | null
  created_by_name: string
  created_at: string
  updated_at: string
}

export interface CustomerActivity {
  id: string
  type: 'booking' | 'review' | 'support' | 'portal_signup' | 'portal_login' | 'payment' | 'note' | string
  title: string
  description?: string
  date: string
  metadata?: {
    bookingId?: string
    ticketId?: string
    amount?: number
    currency?: string
    [key: string]: any
  }
}

// Customers API (admin)
export const customersApi = {
  getAll: async (params?: {
    search?: string
    sort?: string
    order?: 'asc' | 'desc'
    page?: number
    limit?: number
  }): Promise<{
    customers: CustomerListItem[]
    total: number
    page: number
    limit: number
    totalPages: number
  }> => {
    const searchParams = new URLSearchParams()
    if (params?.search) searchParams.set('search', params.search)
    if (params?.sort) searchParams.set('sort', params.sort)
    if (params?.order) searchParams.set('order', params.order)
    if (params?.page) searchParams.set('page', String(params.page))
    if (params?.limit) searchParams.set('limit', String(params.limit))

    const url = `${API_BASE_URL}/customers${searchParams.toString() ? `?${searchParams}` : ''}`
    const response = await fetch(url, { headers: getHeaders() })
    if (!response.ok) {
      throw new Error('Failed to fetch customers')
    }
    return response.json()
  },

  getStats: async (): Promise<CustomerStats> => {
    const response = await fetch(`${API_BASE_URL}/customers/stats`, {
      headers: getHeaders(),
    })
    if (!response.ok) {
      throw new Error('Failed to fetch customer stats')
    }
    return response.json()
  },

  getByEmail: async (email: string): Promise<CustomerDetail> => {
    const response = await fetch(`${API_BASE_URL}/customers/${encodeURIComponent(email)}`, {
      headers: getHeaders(),
    })
    if (!response.ok) {
      throw new Error('Failed to fetch customer')
    }
    return response.json()
  },

  exportCsv: async (): Promise<void> => {
    const response = await fetch(`${API_BASE_URL}/customers/export`, {
      headers: getHeaders(),
    })
    if (!response.ok) {
      throw new Error('Failed to export customers')
    }
    const blob = await response.blob()
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `customers-${new Date().toISOString().split('T')[0]}.csv`
    document.body.appendChild(a)
    a.click()
    window.URL.revokeObjectURL(url)
    document.body.removeChild(a)
  },

  update: async (email: string, data: CustomerUpdateData): Promise<{ success: boolean; customer: CustomerDetail['customer'] }> => {
    const response = await fetch(`${API_BASE_URL}/customers/${encodeURIComponent(email)}`, {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify(data),
    })
    if (!response.ok) {
      throw new Error('Failed to update customer')
    }
    return response.json()
  },

  // Customer Notes
  getNotes: async (email: string): Promise<CustomerNote[]> => {
    const response = await fetch(`${API_BASE_URL}/customers/${encodeURIComponent(email)}/notes`, {
      headers: getHeaders(),
    })
    if (!response.ok) {
      throw new Error('Failed to fetch notes')
    }
    return response.json()
  },

  addNote: async (email: string, content: string): Promise<CustomerNote> => {
    const response = await fetch(`${API_BASE_URL}/customers/${encodeURIComponent(email)}/notes`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ content }),
    })
    if (!response.ok) {
      throw new Error('Failed to add note')
    }
    return response.json()
  },

  updateNote: async (email: string, noteId: string, content: string): Promise<CustomerNote> => {
    const response = await fetch(`${API_BASE_URL}/customers/${encodeURIComponent(email)}/notes/${noteId}`, {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify({ content }),
    })
    if (!response.ok) {
      throw new Error('Failed to update note')
    }
    return response.json()
  },

  deleteNote: async (email: string, noteId: string): Promise<void> => {
    const response = await fetch(`${API_BASE_URL}/customers/${encodeURIComponent(email)}/notes/${noteId}`, {
      method: 'DELETE',
      headers: getHeaders(),
    })
    if (!response.ok) {
      throw new Error('Failed to delete note')
    }
  },

  // Customer Activity
  getActivities: async (email: string, limit: number = 50): Promise<CustomerActivity[]> => {
    const response = await fetch(`${API_BASE_URL}/customers/${encodeURIComponent(email)}/activity?limit=${limit}`, {
      headers: getHeaders(),
    })
    if (!response.ok) {
      throw new Error('Failed to fetch activities')
    }
    return response.json()
  },
}

// ============================================
// SUPPORT TYPES & API
// ============================================

export interface SupportReply {
  id: string
  content: string
  sender_type: 'customer' | 'admin'
  sender_name: string
  created_at: string
  status?: 'sending' | 'sent' | 'delivered' | 'read'
}

export interface SupportTicket {
  id: string
  tenant_id: string
  customer_id: string | null
  booking_id: string | null
  subject: string
  message: string
  sender_email: string
  sender_name: string | null
  sender_phone: string | null
  status: 'new' | 'open' | 'pending' | 'resolved' | 'closed'
  source: 'website' | 'portal'
  assigned_to: string | null
  created_at: string
  updated_at: string
  customers?: {
    id: string
    name: string | null
    email: string
  } | null
  bookings?: {
    id: string
    room_name: string
    check_in: string
    check_out: string
  } | null
  support_replies?: SupportReply[]
  replyCount?: number
}

export interface TeamMember {
  id: string
  email: string
  name: string | null
  role: string
  avatar_url: string | null
}

export const supportApi = {
  getTickets: async (params?: {
    source?: string
    status?: string
    assigned_to?: string
    page?: number
    limit?: number
  }): Promise<{
    tickets: SupportTicket[]
    total: number
    page: number
    totalPages: number
  }> => {
    const searchParams = new URLSearchParams()
    if (params?.source) searchParams.set('source', params.source)
    if (params?.status) searchParams.set('status', params.status)
    if (params?.assigned_to) searchParams.set('assigned_to', params.assigned_to)
    if (params?.page) searchParams.set('page', String(params.page))
    if (params?.limit) searchParams.set('limit', String(params.limit))

    const url = `${API_BASE_URL}/customers/support/tickets${searchParams.toString() ? `?${searchParams}` : ''}`
    const response = await fetch(url, { headers: getHeaders() })
    if (!response.ok) {
      throw new Error('Failed to fetch support tickets')
    }
    return response.json()
  },

  getTicket: async (id: string): Promise<SupportTicket> => {
    const response = await fetch(`${API_BASE_URL}/customers/support/tickets/${id}`, {
      headers: getHeaders(),
    })
    if (!response.ok) {
      throw new Error('Failed to fetch support ticket')
    }
    return response.json()
  },

  replyToTicket: async (id: string, data: { content: string; status?: string }): Promise<{ success: boolean; reply: SupportReply }> => {
    const response = await fetch(`${API_BASE_URL}/customers/support/tickets/${id}/reply`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    })
    if (!response.ok) {
      throw new Error('Failed to reply to ticket')
    }
    return response.json()
  },

  updateTicket: async (id: string, data: { status?: string; assigned_to?: string | null }): Promise<{ success: boolean; ticket: SupportTicket }> => {
    const response = await fetch(`${API_BASE_URL}/customers/support/tickets/${id}`, {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify(data),
    })
    if (!response.ok) {
      throw new Error('Failed to update ticket')
    }
    return response.json()
  },

  getTeamMembers: async (): Promise<TeamMember[]> => {
    const response = await fetch(`${API_BASE_URL}/customers/support/team-members`, {
      headers: getHeaders(),
    })
    if (!response.ok) {
      throw new Error('Failed to fetch team members')
    }
    return response.json()
  },

  createTicket: async (data: {
    sender_email: string
    sender_name?: string
    subject: string
    message: string
    source?: string
  }): Promise<{ success: boolean; ticket: SupportTicket }> => {
    const response = await fetch(`${API_BASE_URL}/customers/support/tickets`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    })
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to create ticket')
    }
    return response.json()
  },
}

// Public contact form API
export const publicContactApi = {
  submit: async (tenantId: string, data: {
    name: string
    email: string
    phone?: string
    subject: string
    message: string
  }): Promise<{ success: boolean; message: string; id: string }> => {
    const response = await fetch(`${API_BASE_URL.replace('/api', '')}/api/public/${tenantId}/contact`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    })
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to submit contact form')
    }
    return response.json()
  },
}

// Invoice types
export interface InvoiceData {
  invoice_number: string
  invoice_date: string
  payment_date: string
  business: {
    name: string
    logo_url: string | null
    address_line1: string | null
    address_line2: string | null
    city: string | null
    state_province: string | null
    postal_code: string | null
    country: string | null
    vat_number: string | null
    company_registration_number: string | null
    email: string | null
    phone: string | null
  }
  customer: {
    name: string
    email: string | null
    phone: string | null
  }
  booking: {
    id: string
    reference: string
    room_name: string
    check_in: string
    check_out: string
    nights: number
  }
  line_items: Array<{
    description: string
    quantity: number
    unit_price: number
    total: number
  }>
  subtotal: number
  vat_rate: number
  vat_amount: number
  total_amount: number
  currency: string
}

export interface Invoice {
  id: string
  tenant_id: string
  booking_id: string
  invoice_number: string
  invoice_data: InvoiceData
  pdf_url: string | null
  pdf_path: string | null
  sent_via_email_at: string | null
  sent_via_whatsapp_at: string | null
  email_recipient: string | null
  generated_at: string
  created_at: string
  updated_at: string
}

// Invoices API
export const invoicesApi = {
  getByBookingId: async (bookingId: string): Promise<Invoice | null> => {
    const response = await fetch(`${API_BASE_URL}/invoices/booking/${bookingId}`, {
      headers: getHeaders(),
    })
    if (response.status === 404) {
      return null
    }
    if (!response.ok) {
      throw new Error('Failed to fetch invoice')
    }
    return response.json()
  },

  generate: async (bookingId: string): Promise<Invoice> => {
    const response = await fetch(`${API_BASE_URL}/invoices/booking/${bookingId}/generate`, {
      method: 'POST',
      headers: getHeaders(),
    })
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to generate invoice')
    }
    return response.json()
  },

  download: async (invoiceId: string, invoiceNumber: string): Promise<void> => {
    const response = await fetch(`${API_BASE_URL}/invoices/${invoiceId}/download`, {
      headers: getHeaders(),
    })
    if (!response.ok) {
      throw new Error('Failed to download invoice')
    }
    const blob = await response.blob()
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${invoiceNumber}.pdf`
    document.body.appendChild(a)
    a.click()
    window.URL.revokeObjectURL(url)
    document.body.removeChild(a)
  },

  sendEmail: async (invoiceId: string, email?: string): Promise<{ success: boolean; message: string }> => {
    const response = await fetch(`${API_BASE_URL}/invoices/${invoiceId}/send-email`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ email }),
    })
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to send invoice email')
    }
    return response.json()
  },

  getWhatsAppLink: async (invoiceId: string, phone?: string): Promise<{ url: string }> => {
    const params = phone ? `?phone=${encodeURIComponent(phone)}` : ''
    const response = await fetch(`${API_BASE_URL}/invoices/${invoiceId}/whatsapp-link${params}`, {
      headers: getHeaders(),
    })
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to get WhatsApp link')
    }
    return response.json()
  },

  getAll: async (page = 1, limit = 20): Promise<{
    invoices: Invoice[]
    pagination: { page: number; limit: number; total: number; totalPages: number }
  }> => {
    const response = await fetch(`${API_BASE_URL}/invoices?page=${page}&limit=${limit}`, {
      headers: getHeaders(),
    })
    if (!response.ok) {
      throw new Error('Failed to fetch invoices')
    }
    return response.json()
  },
}

// ============================================
// INTEGRATIONS (FOB) TYPES & API
// ============================================

export interface Integration {
  id: string
  tenant_id: string
  platform: Platform
  display_name: string | null
  credentials: Record<string, string>
  settings: Record<string, unknown>
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
  created_at: string
  updated_at: string
}

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
  room_name?: string // Joined from rooms table
}

export interface SyncLog {
  id: string
  tenant_id: string
  integration_id: string
  sync_type: 'bookings' | 'reviews' | 'availability' | 'full'
  direction: 'inbound' | 'outbound'
  status: 'pending' | 'running' | 'success' | 'failed'
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

export interface PlatformConfig {
  id: Platform
  name: string
  description: string
  color: string
  supports_bookings: boolean
  supports_reviews: boolean
  supports_availability: boolean
  supports_webhooks: boolean
  auth_type: 'api_key' | 'oauth' | 'ical' | 'manual'
  setup_instructions: string
}

// Platform display configurations
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
    setup_instructions: 'Enter your Booking.com Partner API credentials.',
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
    setup_instructions: 'Add your LekkeSlaap iCal URL to import bookings.',
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
    setup_instructions: 'Connect your TripAdvisor business account.',
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
    setup_instructions: 'Connect your Google Business Profile.',
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
    setup_instructions: 'Add an iCal URL to import calendar events.',
  },
}

// Source display configurations for badges
export interface SourceDisplayInfo {
  label: string
  color: string
  bgColor: string
  textColor: string
}

export const BOOKING_SOURCE_DISPLAY: Record<BookingSource, SourceDisplayInfo> = {
  vilo: { label: 'Vilo', color: '#047857', bgColor: 'bg-emerald-100', textColor: 'text-emerald-800' },
  website: { label: 'Website', color: '#2563EB', bgColor: 'bg-blue-100', textColor: 'text-blue-800' },
  manual: { label: 'Manual', color: '#6B7280', bgColor: 'bg-gray-100', textColor: 'text-gray-800' },
  airbnb: { label: 'Airbnb', color: '#FF5A5F', bgColor: 'bg-rose-100', textColor: 'text-rose-800' },
  booking_com: { label: 'Booking.com', color: '#003580', bgColor: 'bg-blue-100', textColor: 'text-blue-900' },
  lekkerslaap: { label: 'LekkeSlaap', color: '#F97316', bgColor: 'bg-orange-100', textColor: 'text-orange-800' },
  expedia: { label: 'Expedia', color: '#FBBF24', bgColor: 'bg-yellow-100', textColor: 'text-yellow-800' },
  tripadvisor: { label: 'TripAdvisor', color: '#00AF87', bgColor: 'bg-emerald-100', textColor: 'text-emerald-800' },
}

export const REVIEW_SOURCE_DISPLAY: Record<ReviewSource, SourceDisplayInfo> = {
  vilo: BOOKING_SOURCE_DISPLAY.vilo,
  airbnb: BOOKING_SOURCE_DISPLAY.airbnb,
  booking_com: BOOKING_SOURCE_DISPLAY.booking_com,
  lekkerslaap: BOOKING_SOURCE_DISPLAY.lekkerslaap,
  expedia: BOOKING_SOURCE_DISPLAY.expedia,
  tripadvisor: BOOKING_SOURCE_DISPLAY.tripadvisor,
  google: { label: 'Google', color: '#4285F4', bgColor: 'bg-blue-100', textColor: 'text-blue-800' },
}

// Integrations API
export const integrationsApi = {
  getAll: async (): Promise<Integration[]> => {
    const response = await fetch(`${API_BASE_URL}/integrations`, {
      headers: getHeaders(),
    })
    if (!response.ok) {
      throw new Error('Failed to fetch integrations')
    }
    return response.json()
  },

  getById: async (id: string): Promise<Integration & { room_mappings: RoomMapping[] }> => {
    const response = await fetch(`${API_BASE_URL}/integrations/${id}`, {
      headers: getHeaders(),
    })
    if (!response.ok) {
      throw new Error('Failed to fetch integration')
    }
    return response.json()
  },

  create: async (data: {
    platform: Platform
    display_name?: string
    credentials?: Record<string, string>
    settings?: Record<string, unknown>
  }): Promise<Integration> => {
    const response = await fetch(`${API_BASE_URL}/integrations`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    })
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to create integration')
    }
    return response.json()
  },

  update: async (id: string, data: Partial<{
    display_name: string
    credentials: Record<string, string>
    settings: Record<string, unknown>
    is_active: boolean
    sync_bookings: boolean
    sync_reviews: boolean
    sync_availability: boolean
    auto_sync_enabled: boolean
    sync_interval_minutes: number
  }>): Promise<Integration> => {
    const response = await fetch(`${API_BASE_URL}/integrations/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data),
    })
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to update integration')
    }
    return response.json()
  },

  delete: async (id: string): Promise<void> => {
    const response = await fetch(`${API_BASE_URL}/integrations/${id}`, {
      method: 'DELETE',
      headers: getHeaders(),
    })
    if (!response.ok) {
      throw new Error('Failed to delete integration')
    }
  },

  triggerSync: async (id: string, syncType: 'bookings' | 'reviews' | 'availability' | 'full'): Promise<{
    success: boolean
    log_id: string
    records_created: number
    records_updated: number
    records_skipped: number
    conflicts_detected?: number
    conflicts?: string[]
    errors?: string[]
    message: string
  }> => {
    const response = await fetch(`${API_BASE_URL}/integrations/${id}/sync`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ sync_type: syncType }),
    })
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to trigger sync')
    }
    return response.json()
  },

  getSyncLogs: async (id: string, limit = 20): Promise<SyncLog[]> => {
    const response = await fetch(`${API_BASE_URL}/integrations/${id}/sync-logs?limit=${limit}`, {
      headers: getHeaders(),
    })
    if (!response.ok) {
      throw new Error('Failed to fetch sync logs')
    }
    return response.json()
  },

  getRoomMappings: async (id: string): Promise<RoomMapping[]> => {
    const response = await fetch(`${API_BASE_URL}/integrations/${id}/room-mappings`, {
      headers: getHeaders(),
    })
    if (!response.ok) {
      throw new Error('Failed to fetch room mappings')
    }
    return response.json()
  },

  updateRoomMappings: async (id: string, mappings: Array<{
    room_id: string
    external_room_id: string
    external_room_name?: string
    ical_url?: string
  }>): Promise<RoomMapping[]> => {
    const response = await fetch(`${API_BASE_URL}/integrations/${id}/room-mappings`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify({ mappings }),
    })
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to update room mappings')
    }
    return response.json()
  },

  testConnection: async (id: string): Promise<{ success: boolean; message: string }> => {
    const response = await fetch(`${API_BASE_URL}/integrations/${id}/test`, {
      method: 'POST',
      headers: getHeaders(),
    })
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Connection test failed')
    }
    return response.json()
  },

  getSyncedBookingsCount: async (id: string): Promise<{ platform: string; count: number }> => {
    const response = await fetch(`${API_BASE_URL}/integrations/${id}/synced-bookings/count`, {
      headers: getHeaders(),
    })
    if (!response.ok) {
      throw new Error('Failed to get synced bookings count')
    }
    return response.json()
  },

  deleteSyncedBookings: async (id: string): Promise<{ success: boolean; deleted_count: number; message: string }> => {
    const response = await fetch(`${API_BASE_URL}/integrations/${id}/synced-bookings`, {
      method: 'DELETE',
      headers: getHeaders(),
    })
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to delete synced bookings')
    }
    return response.json()
  },
}

// Notification types
export interface NotificationPreferences {
  bookings: boolean
  payments: boolean
  reviews: boolean
  support: boolean
  system: boolean
}

// Notifications API
export const notificationsApi = {
  getAll: async (options: { limit?: number; offset?: number; unreadOnly?: boolean } = {}): Promise<{
    notifications: Array<{
      id: string
      type: string
      title: string
      message: string | null
      link_type: string | null
      link_id: string | null
      read_at: string | null
      created_at: string
    }>
    total: number
    unread: number
  }> => {
    const params = new URLSearchParams()
    if (options.limit) params.set('limit', options.limit.toString())
    if (options.offset) params.set('offset', options.offset.toString())
    if (options.unreadOnly) params.set('unread_only', 'true')

    const response = await fetch(`${API_BASE_URL}/notifications?${params}`, {
      headers: getHeaders(),
    })
    if (!response.ok) {
      throw new Error('Failed to fetch notifications')
    }
    return response.json()
  },

  getUnreadCount: async (): Promise<{ count: number }> => {
    const response = await fetch(`${API_BASE_URL}/notifications/unread-count`, {
      headers: getHeaders(),
    })
    if (!response.ok) {
      throw new Error('Failed to fetch unread count')
    }
    return response.json()
  },

  markAsRead: async (id: string): Promise<{ success: boolean }> => {
    const response = await fetch(`${API_BASE_URL}/notifications/${id}/read`, {
      method: 'POST',
      headers: getHeaders(),
    })
    if (!response.ok) {
      throw new Error('Failed to mark as read')
    }
    return response.json()
  },

  markAllAsRead: async (): Promise<{ success: boolean }> => {
    const response = await fetch(`${API_BASE_URL}/notifications/read-all`, {
      method: 'POST',
      headers: getHeaders(),
    })
    if (!response.ok) {
      throw new Error('Failed to mark all as read')
    }
    return response.json()
  },

  getPreferences: async (): Promise<NotificationPreferences> => {
    const response = await fetch(`${API_BASE_URL}/notifications/preferences`, {
      headers: getHeaders(),
    })
    if (!response.ok) {
      throw new Error('Failed to fetch preferences')
    }
    return response.json()
  },

  updatePreferences: async (preferences: Partial<NotificationPreferences>): Promise<NotificationPreferences> => {
    const response = await fetch(`${API_BASE_URL}/notifications/preferences`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(preferences),
    })
    if (!response.ok) {
      throw new Error('Failed to update preferences')
    }
    return response.json()
  },
}

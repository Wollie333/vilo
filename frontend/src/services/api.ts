const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3002/api'

// Tenant ID is stored by AuthContext when user logs in
let cachedTenantId: string | null = null

export const setTenantId = (id: string | null) => {
  cachedTenantId = id
}

const getTenantId = (): string => {
  return cachedTenantId || ''
}

// Cache for auth token to avoid async calls on every request
let cachedAccessToken: string | null = null

export const setAccessToken = (token: string | null) => {
  cachedAccessToken = token
}

const getHeaders = (): Record<string, string> => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-tenant-id': getTenantId(),
  }

  if (cachedAccessToken) {
    headers['Authorization'] = `Bearer ${cachedAccessToken}`
  }

  return headers
}

export interface ProofOfPayment {
  url: string
  path: string
  filename: string
  uploaded_at: string
}

export interface Booking {
  id?: string
  guest_name: string
  guest_email?: string
  guest_phone?: string
  room_id: string
  room_name?: string
  check_in: string
  check_out: string
  status: 'pending' | 'confirmed' | 'checked_in' | 'checked_out' | 'cancelled' | 'completed'
  payment_status: 'pending' | 'paid' | 'partial' | 'refunded'
  total_amount: number
  currency: string
  notes?: string
  internal_notes?: string
  proof_of_payment?: ProofOfPayment | null
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

// Review types
export interface Review {
  id?: string
  tenant_id?: string
  booking_id: string
  rating: number
  title?: string
  content?: string
  guest_name: string
  owner_response?: string
  owner_response_at?: string
  status: 'published' | 'hidden' | 'flagged'
  created_at?: string
  updated_at?: string
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
  title?: string
  content?: string
  guest_name: string
  owner_response?: string
  owner_response_at?: string
  created_at: string
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
  getAll: async (params?: { status?: string; room_id?: string; rating?: number; sort?: string }): Promise<Review[]> => {
    const searchParams = new URLSearchParams()
    if (params?.status) searchParams.set('status', params.status)
    if (params?.room_id) searchParams.set('room_id', params.room_id)
    if (params?.rating) searchParams.set('rating', String(params.rating))
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

  update: async (id: string, data: { owner_response?: string; status?: string }): Promise<Review> => {
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

  submitReview: async (tenantId: string, token: string, data: { rating: number; title?: string; content?: string }): Promise<{ success: boolean; message: string }> => {
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

export interface CustomerDetail {
  customer: {
    email: string
    name: string | null
    phone: string | null
    customerId: string | null
    hasPortalAccess: boolean
    lastLoginAt: string | null
  }
  stats: {
    totalBookings: number
    totalSpent: number
    currency: string
    firstStay: string
    lastStay: string
    averageRating: number | null
  }
  bookings: Booking[]
  supportTickets: any[]
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

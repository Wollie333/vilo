const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3002/api'

// Tenant ID is stored by AuthContext when user logs in
let cachedTenantId: string | null = null

export const setTenantId = (id: string | null) => {
  cachedTenantId = id
  if (id) {
    localStorage.setItem('tenantId', id)
  } else {
    localStorage.removeItem('tenantId')
  }
}

const getTenantId = (): string => {
  if (cachedTenantId) return cachedTenantId
  const stored = localStorage.getItem('tenantId')
  if (stored) {
    cachedTenantId = stored
    return stored
  }
  // Fallback for development only
  return '00000000-0000-0000-0000-000000000000'
}

const getHeaders = () => ({
  'Content-Type': 'application/json',
  'x-tenant-id': getTenantId(),
})

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

export interface Room {
  id?: string
  name: string
  description?: string
  room_code?: string
  bed_type: string
  bed_count: number
  room_size_sqm?: number
  max_guests: number
  amenities: string[]
  images: RoomImages
  base_price_per_night: number
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
  price_per_night: number
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
  bed_type: string
  bed_count: number
  room_size_sqm?: number
  max_guests: number
  amenities: string[]
  images: RoomImages
  base_price_per_night: number
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
}

export const publicBookingApi = {
  getProperty: async (tenantId: string): Promise<{ id: string; name: string }> => {
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


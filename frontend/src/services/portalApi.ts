const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3002/api'

// Customer session token stored in memory and localStorage
let customerToken: string | null = null

export const setCustomerToken = (token: string | null) => {
  customerToken = token
  if (token) {
    localStorage.setItem('customer_token', token)
  } else {
    localStorage.removeItem('customer_token')
  }
}

export const getCustomerToken = (): string | null => {
  if (customerToken) return customerToken
  const stored = localStorage.getItem('customer_token')
  if (stored) {
    customerToken = stored
  }
  return customerToken
}

const getHeaders = () => {
  const token = getCustomerToken()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }
  return headers
}

// Types
export interface Customer {
  id: string
  email: string
  name: string | null
  phone: string | null
  hasPassword: boolean
  preferredLanguage?: string
  marketingConsent?: boolean
  createdAt?: string
  lastLoginAt?: string
}

export interface CustomerBooking {
  id: string
  guest_name: string
  guest_email: string
  guest_phone: string | null
  room_id: string
  room_name: string
  check_in: string
  check_out: string
  status: string
  payment_status: string
  total_amount: number
  currency: string
  notes: string | null
  tenants: {
    id: string
    business_name: string
    logo_url: string | null
  }
  room?: {
    id: string
    name: string
    images: {
      featured: { url: string } | null
      gallery: { url: string }[]
    } | null
  } | null
  reviews?: Array<{
    id: string
    rating: number
    title: string | null
    content: string | null
    owner_response: string | null
    owner_response_at: string | null
    status: string
    created_at: string
  }>
  availableAddons?: any[]
  canModifyAddons?: boolean
}

export interface ReviewImage {
  url: string
  path: string
  hidden?: boolean
}

export interface CustomerReview {
  id: string
  rating: number
  // Category ratings (1-5)
  rating_cleanliness?: number
  rating_service?: number
  rating_location?: number
  rating_value?: number
  rating_safety?: number
  title: string | null
  content: string | null
  owner_response: string | null
  owner_response_at: string | null
  status: string
  created_at: string
  // Review images (max 4)
  images?: ReviewImage[]
  booking: {
    id: string
    roomName: string
    checkIn: string
    checkOut: string
    propertyName: string
  }
}

export interface SupportTicket {
  id: string
  tenant_id: string
  customer_id: string
  booking_id: string | null
  subject: string
  message: string
  sender_email: string
  sender_name: string
  status: string
  priority: string
  created_at: string
  updated_at: string
  tenants: {
    id: string
    business_name: string
  }
  bookings?: {
    id: string
    room_name: string
    check_in: string
    check_out: string
  }
  support_replies?: Array<{
    id: string
    content: string
    sender_type: 'customer' | 'admin'
    sender_name: string
    created_at: string
  }>
}

export interface Property {
  id: string
  business_name: string
  logo_url: string | null
  business_email: string | null
  business_phone: string | null
}

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
  id: string
  tenant_id: string
  name: string
  description: string | null
  room_type: string
  max_occupancy: number
  base_price: number
  pricing: any
  amenities: string[]
  images: RoomImages
  is_active: boolean
  isAvailable?: boolean
}

export interface AddOn {
  id: string
  tenant_id: string
  name: string
  description: string | null
  price: number
  price_type: string
  category: string
  is_active: boolean
}

export interface CreateBookingData {
  tenantId: string
  roomId: string
  checkIn: string
  checkOut: string
  guests?: number
  adults?: number
  children?: number
  specialRequests?: string
  addons?: Array<{
    id: string
    name: string
    price: number
    quantity: number
  }>
}

export interface Invoice {
  id: string
  tenant_id: string
  booking_id: string
  invoice_number: string
  invoice_data: any
  pdf_url: string | null
  pdf_path: string | null
  sent_via_email_at: string | null
  sent_via_whatsapp_at: string | null
  email_recipient: string | null
  generated_at: string
  created_at: string
  updated_at: string
}

// Portal API
export const portalApi = {
  // Auth
  requestMagicLink: async (email: string): Promise<{ success: boolean; message: string; dev_token?: string; dev_link?: string }> => {
    const response = await fetch(`${API_BASE_URL}/portal/auth/magic-link`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    })
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to send magic link')
    }
    return response.json()
  },

  verifyToken: async (token: string): Promise<{ success: boolean; customer: Customer; token: string; expiresAt: string }> => {
    const response = await fetch(`${API_BASE_URL}/portal/auth/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    })
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Invalid or expired link')
    }
    return response.json()
  },

  login: async (email: string, password: string): Promise<{ success: boolean; customer: Customer; token: string; expiresAt: string }> => {
    const response = await fetch(`${API_BASE_URL}/portal/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Invalid email or password')
    }
    return response.json()
  },

  setPassword: async (password: string): Promise<{ success: boolean }> => {
    const response = await fetch(`${API_BASE_URL}/portal/auth/set-password`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ password }),
    })
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to set password')
    }
    return response.json()
  },

  getMe: async (): Promise<Customer> => {
    const response = await fetch(`${API_BASE_URL}/portal/auth/me`, {
      headers: getHeaders(),
    })
    if (!response.ok) {
      throw new Error('Not authenticated')
    }
    return response.json()
  },

  logout: async (): Promise<void> => {
    try {
      await fetch(`${API_BASE_URL}/portal/auth/logout`, {
        method: 'POST',
        headers: getHeaders(),
      })
    } catch (e) {
      // Ignore errors during logout
    }
    setCustomerToken(null)
  },

  // Bookings
  getBookings: async (): Promise<CustomerBooking[]> => {
    const response = await fetch(`${API_BASE_URL}/portal/bookings`, {
      headers: getHeaders(),
    })
    if (!response.ok) {
      throw new Error('Failed to fetch bookings')
    }
    return response.json()
  },

  getBooking: async (id: string): Promise<CustomerBooking> => {
    const response = await fetch(`${API_BASE_URL}/portal/bookings/${id}`, {
      headers: getHeaders(),
    })
    if (!response.ok) {
      throw new Error('Booking not found')
    }
    return response.json()
  },

  updateBookingAddons: async (id: string, addons: any[]): Promise<{ success: boolean; booking: CustomerBooking }> => {
    const response = await fetch(`${API_BASE_URL}/portal/bookings/${id}/addons`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify({ addons }),
    })
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to update add-ons')
    }
    return response.json()
  },

  cancelBooking: async (id: string): Promise<{ success: boolean; booking: CustomerBooking }> => {
    const response = await fetch(`${API_BASE_URL}/portal/bookings/${id}/cancel`, {
      method: 'POST',
      headers: getHeaders(),
    })
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to cancel booking')
    }
    return response.json()
  },

  // Reviews
  getReviews: async (): Promise<CustomerReview[]> => {
    const response = await fetch(`${API_BASE_URL}/portal/reviews`, {
      headers: getHeaders(),
    })
    if (!response.ok) {
      throw new Error('Failed to fetch reviews')
    }
    return response.json()
  },

  submitReview: async (bookingId: string, data: { rating: number; title?: string; content?: string }): Promise<{ success: boolean; review: any }> => {
    const response = await fetch(`${API_BASE_URL}/portal/bookings/${bookingId}/review`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    })
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to submit review')
    }
    return response.json()
  },

  getReview: async (id: string): Promise<CustomerReview> => {
    const response = await fetch(`${API_BASE_URL}/portal/reviews/${id}`, {
      headers: getHeaders(),
    })
    if (!response.ok) {
      throw new Error('Review not found')
    }
    return response.json()
  },

  updateReview: async (id: string, data: { rating: number; title?: string; content?: string }): Promise<CustomerReview> => {
    const response = await fetch(`${API_BASE_URL}/portal/reviews/${id}`, {
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

  // Support
  getTickets: async (): Promise<SupportTicket[]> => {
    const response = await fetch(`${API_BASE_URL}/portal/support`, {
      headers: getHeaders(),
    })
    if (!response.ok) {
      throw new Error('Failed to fetch support tickets')
    }
    return response.json()
  },

  createTicket: async (data: { tenantId: string; bookingId?: string; subject: string; message: string }): Promise<{ success: boolean; ticket: SupportTicket }> => {
    const response = await fetch(`${API_BASE_URL}/portal/support`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    })
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to create support ticket')
    }
    return response.json()
  },

  getTicket: async (id: string): Promise<SupportTicket> => {
    const response = await fetch(`${API_BASE_URL}/portal/support/${id}`, {
      headers: getHeaders(),
    })
    if (!response.ok) {
      throw new Error('Ticket not found')
    }
    return response.json()
  },

  replyToTicket: async (id: string, content: string): Promise<{ success: boolean; reply: any }> => {
    const response = await fetch(`${API_BASE_URL}/portal/support/${id}/reply`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ content }),
    })
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to send reply')
    }
    return response.json()
  },

  // Profile
  getProfile: async (): Promise<Customer> => {
    const response = await fetch(`${API_BASE_URL}/portal/profile`, {
      headers: getHeaders(),
    })
    if (!response.ok) {
      throw new Error('Failed to fetch profile')
    }
    return response.json()
  },

  updateProfile: async (data: { name?: string; phone?: string; preferredLanguage?: string; marketingConsent?: boolean }): Promise<{ success: boolean; customer: Customer }> => {
    const response = await fetch(`${API_BASE_URL}/portal/profile`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data),
    })
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to update profile')
    }
    return response.json()
  },

  // Properties (tenants the customer has bookings with)
  getProperties: async (): Promise<Property[]> => {
    const response = await fetch(`${API_BASE_URL}/portal/properties`, {
      headers: getHeaders(),
    })
    if (!response.ok) {
      throw new Error('Failed to fetch properties')
    }
    return response.json()
  },

  // Rooms for a property
  getPropertyRooms: async (tenantId: string, checkIn?: string, checkOut?: string): Promise<Room[]> => {
    let url = `${API_BASE_URL}/portal/properties/${tenantId}/rooms`
    if (checkIn && checkOut) {
      url += `?checkIn=${checkIn}&checkOut=${checkOut}`
    }
    const response = await fetch(url, {
      headers: getHeaders(),
    })
    if (!response.ok) {
      throw new Error('Failed to fetch rooms')
    }
    return response.json()
  },

  // Room pricing with seasonal rates
  getRoomPricing: async (tenantId: string, roomId: string, checkIn: string, checkOut: string): Promise<{
    room_name: string
    nights: Array<{ date: string; price: number; rate_name: string | null }>
    subtotal: number
    currency: string
    night_count: number
  }> => {
    const url = `${API_BASE_URL}/portal/properties/${tenantId}/rooms/${roomId}/pricing?checkIn=${checkIn}&checkOut=${checkOut}`
    const response = await fetch(url, {
      headers: getHeaders(),
    })
    if (!response.ok) {
      throw new Error('Failed to fetch room pricing')
    }
    return response.json()
  },

  // Add-ons for a property
  getPropertyAddons: async (tenantId: string): Promise<AddOn[]> => {
    const response = await fetch(`${API_BASE_URL}/portal/properties/${tenantId}/addons`, {
      headers: getHeaders(),
    })
    if (!response.ok) {
      throw new Error('Failed to fetch add-ons')
    }
    return response.json()
  },

  // Create new booking
  createBooking: async (data: CreateBookingData): Promise<{ success: boolean; booking: CustomerBooking; summary: any }> => {
    const response = await fetch(`${API_BASE_URL}/portal/bookings`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    })
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to create booking')
    }
    return response.json()
  },

  // Invoices
  getInvoice: async (bookingId: string): Promise<Invoice> => {
    const response = await fetch(`${API_BASE_URL}/portal/bookings/${bookingId}/invoice`, {
      headers: getHeaders(),
    })
    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('No invoice available')
      }
      throw new Error('Failed to fetch invoice')
    }
    return response.json()
  },

  downloadInvoice: async (bookingId: string): Promise<Blob> => {
    const response = await fetch(`${API_BASE_URL}/portal/bookings/${bookingId}/invoice/download`, {
      headers: getHeaders(),
    })
    if (!response.ok) {
      throw new Error('Failed to download invoice')
    }
    return response.blob()
  },
}

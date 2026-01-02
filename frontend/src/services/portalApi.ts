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
  profilePictureUrl?: string | null
  hasPassword: boolean
  preferredLanguage?: string
  marketingConsent?: boolean
  createdAt?: string
  lastLoginAt?: string
  // Business details for invoices
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

// Booking status types
export type BookingStatus =
  | 'pending'
  | 'confirmed'
  | 'payment_failed'
  | 'cart_abandoned'
  | 'checked_in'
  | 'checked_out'
  | 'cancelled'
  | 'completed'

// Customer refund status type
export type CustomerRefundStatus = 'requested' | 'under_review' | 'approved' | 'rejected' | 'processing' | 'completed' | 'failed'

export interface CustomerBooking {
  id: string
  guest_name: string
  guest_email: string
  guest_phone: string | null
  room_id: string
  room_name: string
  check_in: string
  check_out: string
  status: BookingStatus
  payment_status: string
  total_amount: number
  currency: string
  notes: string | null
  // Failed booking info (stored in checkout_data)
  failed_at?: string | null
  retry_count?: number
  checkout_data?: any
  // Payment tracking fields
  payment_method?: 'paystack' | 'paypal' | 'eft' | 'manual' | null
  payment_reference?: string | null
  payment_completed_at?: string | null
  proof_of_payment?: {
    url: string
    path: string
    filename: string
    uploaded_at: string
  } | null
  tenants: {
    id: string
    business_name: string
    logo_url: string | null
    slug?: string
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
  // Cancellation fields
  cancellation_reason?: string
  cancellation_details?: string
  refund_requested?: boolean
  refund_status?: CustomerRefundStatus
  cancelled_at?: string
  cancellation_ticket_id?: string
}

// Failed booking type for incomplete/abandoned bookings
export interface FailedBooking {
  id: string
  reference: string
  status: string
  payment_status: string
  failure_type: string
  failure_reason: string | null
  failed_at: string | null
  retry_count: number
  property: {
    id: string
    slug: string
    name: string
    logoUrl: string | null
  }
  room: {
    id: string
    name: string
    image: string | null
  }
  guest: {
    name: string
    email: string
    phone: string | null
  }
  dates: {
    checkIn: string
    checkOut: string
    nights: number
  }
  total_amount: number
  currency: string
  checkout_data: any
  created_at: string
}

export interface ReviewImage {
  url: string
  path: string
  hidden?: boolean
}

export interface CustomerReview {
  id: string
  tenant_id: string
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
    slug?: string
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
    status?: 'sending' | 'sent' | 'delivered' | 'read'
    read_at?: string | null
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

  // Failed Bookings
  getFailedBookings: async (): Promise<FailedBooking[]> => {
    const response = await fetch(`${API_BASE_URL}/portal/failed-bookings`, {
      headers: getHeaders(),
    })
    if (!response.ok) {
      throw new Error('Failed to fetch failed bookings')
    }
    return response.json()
  },

  deleteFailedBooking: async (id: string): Promise<{ success: boolean }> => {
    const response = await fetch(`${API_BASE_URL}/portal/failed-bookings/${id}`, {
      method: 'DELETE',
      headers: getHeaders(),
    })
    if (!response.ok) {
      throw new Error('Failed to delete booking')
    }
    return response.json()
  },

  checkRetryAvailability: async (id: string): Promise<{
    available: boolean
    unavailable_rooms: string[]
    pricing_changed: boolean
    original_total: number
    new_total: number
    checkout_data: any
    retry_count: number
    property_slug: string
  }> => {
    const response = await fetch(`${API_BASE_URL}/portal/failed-bookings/${id}/retry-availability`, {
      headers: getHeaders(),
    })
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Failed to check availability')
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

  cancelBooking: async (
    id: string,
    data: {
      reason: string
      details?: string
      refund_requested?: boolean
    }
  ): Promise<{ success: boolean; booking: CustomerBooking; support_ticket_id?: string; message: string }> => {
    const response = await fetch(`${API_BASE_URL}/portal/bookings/${id}/cancel`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    })
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to cancel booking')
    }
    return response.json()
  },

  // Upload proof of payment (for EFT/manual payments)
  uploadProofOfPayment: async (bookingId: string, file: File): Promise<{ success: boolean }> => {
    const token = getCustomerToken()
    const headers: Record<string, string> = {}
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }

    // Read file as base64
    const reader = new FileReader()
    const base64Promise = new Promise<string>((resolve, reject) => {
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
    const base64Data = await base64Promise

    const response = await fetch(`${API_BASE_URL}/portal/bookings/${bookingId}/proof`, {
      method: 'POST',
      headers: {
        ...headers,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        filename: file.name,
        data: base64Data
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to upload proof of payment')
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

  submitReview: async (bookingId: string, data: {
    rating_cleanliness: number
    rating_service: number
    rating_location: number
    rating_value: number
    rating_safety: number
    title?: string
    content?: string
    images?: Array<{ url: string; path: string }>
  }): Promise<{ success: boolean; review: any }> => {
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

  updateReview: async (id: string, data: {
    rating: number
    rating_cleanliness: number
    rating_service: number
    rating_location: number
    rating_value: number
    rating_safety: number
    title?: string
    content?: string
    images?: Array<{ url: string; path: string }>
  }): Promise<CustomerReview> => {
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

  updateProfile: async (data: {
    name?: string
    phone?: string
    preferredLanguage?: string
    marketingConsent?: boolean
    // Business details
    businessName?: string
    businessVatNumber?: string
    businessRegistrationNumber?: string
    businessAddressLine1?: string
    businessAddressLine2?: string
    businessCity?: string
    businessPostalCode?: string
    businessCountry?: string
    useBusinessDetailsOnInvoice?: boolean
  }): Promise<{ success: boolean; customer: Customer }> => {
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

  uploadProfilePicture: async (imageBase64: string): Promise<{ success: boolean; profilePictureUrl: string }> => {
    const response = await fetch(`${API_BASE_URL}/portal/profile/picture`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ image: imageBase64 }),
    })
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to upload profile picture')
    }
    return response.json()
  },

  deleteProfilePicture: async (): Promise<{ success: boolean }> => {
    const response = await fetch(`${API_BASE_URL}/portal/profile/picture`, {
      method: 'DELETE',
      headers: getHeaders(),
    })
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to delete profile picture')
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

  // Get bookings that are eligible for review
  getReviewableBookings: async (): Promise<CustomerBooking[]> => {
    const bookings = await portalApi.getBookings()
    return bookings.filter(booking => {
      const isCompletedStay = booking.status === 'checked_out' || booking.status === 'completed'
      const isPaid = booking.payment_status === 'paid'
      const hasNoReview = !booking.reviews || booking.reviews.length === 0
      return isCompletedStay && isPaid && hasNoReview
    }).sort((a, b) => {
      // Sort by check_out date descending (most recent first)
      return new Date(b.check_out).getTime() - new Date(a.check_out).getTime()
    })
  },

  // ============================================
  // NOTIFICATION METHODS
  // ============================================

  getNotifications: async (options: { limit?: number; offset?: number; unreadOnly?: boolean } = {}): Promise<{
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

    const response = await fetch(`${API_BASE_URL}/portal/notifications?${params}`, {
      headers: getHeaders(),
    })
    if (!response.ok) {
      throw new Error('Failed to fetch notifications')
    }
    return response.json()
  },

  getUnreadCount: async (): Promise<{ count: number }> => {
    const response = await fetch(`${API_BASE_URL}/portal/notifications/unread-count`, {
      headers: getHeaders(),
    })
    if (!response.ok) {
      throw new Error('Failed to fetch unread count')
    }
    return response.json()
  },

  markNotificationAsRead: async (id: string): Promise<{ success: boolean }> => {
    const response = await fetch(`${API_BASE_URL}/portal/notifications/${id}/read`, {
      method: 'POST',
      headers: getHeaders(),
    })
    if (!response.ok) {
      throw new Error('Failed to mark as read')
    }
    return response.json()
  },

  markAllNotificationsAsRead: async (): Promise<{ success: boolean }> => {
    const response = await fetch(`${API_BASE_URL}/portal/notifications/read-all`, {
      method: 'POST',
      headers: getHeaders(),
    })
    if (!response.ok) {
      throw new Error('Failed to mark all as read')
    }
    return response.json()
  },

  getNotificationPreferences: async (): Promise<CustomerNotificationPreferences> => {
    const response = await fetch(`${API_BASE_URL}/portal/notifications/preferences`, {
      headers: getHeaders(),
    })
    if (!response.ok) {
      throw new Error('Failed to fetch preferences')
    }
    return response.json()
  },

  updateNotificationPreferences: async (preferences: Partial<CustomerNotificationPreferences>): Promise<CustomerNotificationPreferences> => {
    const response = await fetch(`${API_BASE_URL}/portal/notifications/preferences`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(preferences),
    })
    if (!response.ok) {
      throw new Error('Failed to update preferences')
    }
    return response.json()
  },

  // ============================================
  // REFUND METHODS
  // ============================================

  getRefundForBooking: async (bookingId: string): Promise<CustomerRefund | null> => {
    const response = await fetch(`${API_BASE_URL}/portal/bookings/${bookingId}/refund`, {
      headers: getHeaders(),
    })
    if (!response.ok) {
      if (response.status === 404) {
        return null
      }
      throw new Error('Failed to fetch refund')
    }
    return response.json()
  },

  // Get all refunds for the customer
  getRefunds: async (): Promise<CustomerRefundWithBooking[]> => {
    const response = await fetch(`${API_BASE_URL}/portal/refunds`, {
      headers: getHeaders(),
    })
    if (!response.ok) {
      throw new Error('Failed to fetch refunds')
    }
    return response.json()
  },
}

// Customer notification preferences - individual types
export interface CustomerNotificationPreferences {
  // Bookings
  booking_confirmed: boolean
  booking_modified_customer: boolean
  booking_reminder: boolean
  check_in_reminder: boolean
  cart_abandoned_customer: boolean
  // Payments
  payment_confirmed: boolean
  payment_overdue: boolean
  payment_failed_customer: boolean
  // Reviews
  review_requested: boolean
  review_response_added: boolean
  // Support
  support_ticket_replied: boolean
  support_status_changed: boolean
  // System
  portal_welcome: boolean
}

// Customer refund type (CustomerRefundStatus defined above near BookingStatus)
export interface CustomerRefund {
  id: string
  booking_id: string
  status: CustomerRefundStatus
  original_amount: number
  eligible_amount: number
  approved_amount: number | null
  processed_amount: number | null
  currency: string
  refund_percentage: number | null
  days_before_checkin: number | null
  policy_applied: any
  rejection_reason: string | null
  requested_at: string
  approved_at: string | null
  completed_at: string | null
}

// Customer refund with booking details for listing
export interface CustomerRefundWithBooking extends CustomerRefund {
  payment_method: string | null
  failure_reason: string | null
  rejected_at: string | null
  failed_at: string | null
  booking: {
    guest_name: string
    room_name: string
    check_in: string
    check_out: string
    property: {
      id: string
      name: string
      logo_url: string | null
    }
  }
}

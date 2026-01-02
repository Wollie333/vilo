import { supabase } from '../lib/supabase'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3002/api'

async function getAuthHeaders(): Promise<Record<string, string>> {
  const { data: { session } } = await supabase.auth.getSession()
  return {
    'Content-Type': 'application/json',
    ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
  }
}

async function adminFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const headers = await getAuthHeaders()
  const response = await fetch(`${API_URL}/admin${endpoint}`, {
    ...options,
    headers: { ...headers, ...(options.headers || {}) },
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.error || errorData.message || `Request failed: ${response.status}`)
  }

  return response.json()
}

// ============================================================================
// DASHBOARD
// ============================================================================

export interface DashboardStats {
  totalTenants: number
  activeTenants: number
  totalUsers: number
  totalRevenue: number
  mrr: number
  arr: number
  trialConversionRate: number
  churnRate: number
  activeTrials: number
  pendingPayments: number
}

export interface RecentActivity {
  id: string
  type: string
  description: string
  tenantId?: string
  tenantName?: string
  userId?: string
  userEmail?: string
  createdAt: string
}

export const adminDashboard = {
  async getStats(): Promise<DashboardStats> {
    return adminFetch('/dashboard/stats')
  },

  async getRecentActivity(limit = 20): Promise<RecentActivity[]> {
    return adminFetch(`/dashboard/activity?limit=${limit}`)
  },

  async getRevenueChart(period: 'week' | 'month' | 'year' = 'month'): Promise<any> {
    return adminFetch(`/dashboard/revenue?period=${period}`)
  },

  async getGrowthChart(period: 'week' | 'month' | 'year' = 'month'): Promise<any> {
    return adminFetch(`/dashboard/growth?period=${period}`)
  },
}

// ============================================================================
// TENANTS
// ============================================================================

export interface Tenant {
  id: string
  name: string | null
  ownerUserId: string
  ownerEmail?: string
  slug: string | null
  status: 'active' | 'trial' | 'suspended' | 'cancelled'
  subscriptionPlan?: string
  roomCount?: number
  memberCount?: number
  createdAt: string
  lastActiveAt?: string
  is_paused?: boolean
  paused_at?: string
  pause_reason?: string
}

export interface TenantRoom {
  id: string
  name: string
  roomCode: string | null
  status: 'active' | 'inactive'
  isPaused: boolean
  primary_image_url: string | null
}

export interface TenantDetail extends Tenant {
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
  rooms?: TenantRoom[]
  subscription?: {
    id: string
    planName: string
    status: string
    currentPeriodEnd: string
    cancelAtPeriodEnd: boolean
  }
  usage?: {
    rooms: number
    teamMembers: number
    monthlyBookings: number
    storageUsedMB: number
  }
  limits?: {
    maxRooms: number
    maxTeamMembers: number
    maxBookingsPerMonth: number
    maxStorageMB: number
  }
}

export interface TenantUpdateData {
  business_name?: string
  business_description?: string
  logo_url?: string
  business_email?: string
  business_phone?: string
  website_url?: string
  address_line1?: string
  address_line2?: string
  city?: string
  state_province?: string
  postal_code?: string
  country?: string
  vat_number?: string
  company_registration_number?: string
  currency?: string
  timezone?: string
  language?: string
  date_format?: string
  discoverable?: boolean
}

export interface TenantFilterOptions {
  plans: { id: string; name: string; slug: string }[]
  countries: string[]
  statuses: string[]
  verificationStatuses: string[]
}

export const adminTenants = {
  async list(options?: {
    page?: number
    limit?: number
    search?: string
    status?: string
    plan?: string
    isPaused?: string
    country?: string
    verification?: string
    discoverable?: string
    dateFrom?: string
    dateTo?: string
    sortBy?: string
    sortOrder?: 'asc' | 'desc'
  }): Promise<{ tenants: Tenant[]; total: number; totalPages: number }> {
    const params = new URLSearchParams()
    if (options?.page) params.set('page', String(options.page))
    if (options?.limit) params.set('limit', String(options.limit))
    if (options?.search) params.set('search', options.search)
    if (options?.status) params.set('status', options.status)
    if (options?.plan) params.set('plan', options.plan)
    if (options?.isPaused) params.set('isPaused', options.isPaused)
    if (options?.country) params.set('country', options.country)
    if (options?.verification) params.set('verification', options.verification)
    if (options?.discoverable) params.set('discoverable', options.discoverable)
    if (options?.dateFrom) params.set('dateFrom', options.dateFrom)
    if (options?.dateTo) params.set('dateTo', options.dateTo)
    if (options?.sortBy) params.set('sortBy', options.sortBy)
    if (options?.sortOrder) params.set('sortOrder', options.sortOrder)
    return adminFetch(`/tenants?${params}`)
  },

  async getFilters(): Promise<TenantFilterOptions> {
    return adminFetch('/tenants/filters')
  },

  async get(id: string): Promise<TenantDetail> {
    return adminFetch(`/tenants/${id}`)
  },

  async update(id: string, data: TenantUpdateData): Promise<{ success: boolean; message: string; tenant: TenantDetail }> {
    return adminFetch(`/tenants/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
  },

  async suspend(id: string, reason: string): Promise<void> {
    return adminFetch(`/tenants/${id}/suspend`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    })
  },

  async activate(id: string): Promise<void> {
    return adminFetch(`/tenants/${id}/activate`, {
      method: 'POST',
    })
  },

  async delete(id: string, confirm: boolean): Promise<void> {
    return adminFetch(`/tenants/${id}`, {
      method: 'DELETE',
      body: JSON.stringify({ confirm }),
    })
  },

  async impersonate(id: string, reason: string, durationMinutes?: number): Promise<{ token: string; expiresAt: string }> {
    return adminFetch(`/tenants/${id}/impersonate`, {
      method: 'POST',
      body: JSON.stringify({ reason, durationMinutes }),
    })
  },

  async pause(id: string, reason: string): Promise<void> {
    return adminFetch(`/tenants/${id}/pause`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    })
  },

  async unpause(id: string): Promise<void> {
    return adminFetch(`/tenants/${id}/unpause`, {
      method: 'POST',
    })
  },

  async getRoom(tenantId: string, roomId: string): Promise<AdminRoom> {
    return adminFetch(`/tenants/${tenantId}/rooms/${roomId}`)
  },

  async updateRoom(tenantId: string, roomId: string, data: AdminRoomUpdateData): Promise<{ success: boolean; message: string; room: AdminRoom }> {
    return adminFetch(`/tenants/${tenantId}/rooms/${roomId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
  },

  // Seasonal Rates CRUD
  async getRoomRates(tenantId: string, roomId: string): Promise<AdminSeasonalRate[]> {
    return adminFetch(`/tenants/${tenantId}/rooms/${roomId}/rates`)
  },

  async createRoomRate(tenantId: string, roomId: string, data: AdminSeasonalRateCreateData): Promise<{ success: boolean; message: string; rate: AdminSeasonalRate }> {
    return adminFetch(`/tenants/${tenantId}/rooms/${roomId}/rates`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  async updateRoomRate(tenantId: string, roomId: string, rateId: string, data: AdminSeasonalRateUpdateData): Promise<{ success: boolean; message: string; rate: AdminSeasonalRate }> {
    return adminFetch(`/tenants/${tenantId}/rooms/${roomId}/rates/${rateId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
  },

  async deleteRoomRate(tenantId: string, roomId: string, rateId: string): Promise<{ success: boolean; message: string }> {
    return adminFetch(`/tenants/${tenantId}/rooms/${roomId}/rates/${rateId}`, {
      method: 'DELETE',
    })
  },

  // Room pause/delete
  async pauseRoom(tenantId: string, roomId: string, paused: boolean, reason?: string): Promise<{ success: boolean; message: string; isPaused: boolean }> {
    return adminFetch(`/tenants/${tenantId}/rooms/${roomId}/pause`, {
      method: 'POST',
      body: JSON.stringify({ paused, reason }),
    })
  },

  async deleteRoom(tenantId: string, roomId: string): Promise<{ success: boolean; message: string }> {
    return adminFetch(`/tenants/${tenantId}/rooms/${roomId}`, {
      method: 'DELETE',
    })
  },

  async createRoom(tenantId: string, data: { name: string; description?: string; base_price_per_night: number; max_guests?: number; currency?: string }): Promise<{ success: boolean; message: string; room: any }> {
    return adminFetch(`/tenants/${tenantId}/rooms`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  // Member suspend/delete
  async suspendMember(tenantId: string, memberId: string, suspended: boolean): Promise<{ success: boolean; message: string; status: string }> {
    return adminFetch(`/tenants/${tenantId}/members/${memberId}/suspend`, {
      method: 'POST',
      body: JSON.stringify({ suspended }),
    })
  },

  async deleteMember(tenantId: string, memberId: string): Promise<{ success: boolean; message: string }> {
    return adminFetch(`/tenants/${tenantId}/members/${memberId}`, {
      method: 'DELETE',
    })
  },

  async addMember(tenantId: string, data: { email: string; name: string; role_id: string; phone?: string; avatar?: string }): Promise<{ success: boolean; message: string; member: any }> {
    return adminFetch(`/tenants/${tenantId}/members`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  async getRoles(tenantId: string): Promise<{ roles: Array<{ id: string; name: string; slug: string }> }> {
    return adminFetch(`/tenants/${tenantId}/roles`)
  },

  // Owner profile management
  async updateOwner(tenantId: string, data: OwnerUpdateData): Promise<{ success: boolean; owner: TenantOwner }> {
    return adminFetch(`/tenants/${tenantId}/owner`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
  },

  async resetOwnerPassword(tenantId: string): Promise<{ success: boolean; message: string }> {
    return adminFetch(`/tenants/${tenantId}/owner/reset-password`, {
      method: 'POST',
    })
  },

  async uploadOwnerAvatar(tenantId: string, data: string, filename?: string): Promise<{ success: boolean; url: string }> {
    return adminFetch(`/tenants/${tenantId}/owner/avatar`, {
      method: 'POST',
      body: JSON.stringify({ data, filename }),
    })
  },

  async getOwnerActivity(tenantId: string, limit = 20): Promise<OwnerActivityLog[]> {
    return adminFetch(`/tenants/${tenantId}/owner/activity?limit=${limit}`)
  },

  // Operations data
  async getCustomers(tenantId: string, search?: string): Promise<TenantCustomer[]> {
    const params = new URLSearchParams()
    if (search) params.set('search', search)
    const queryString = params.toString()
    return adminFetch(`/tenants/${tenantId}/customers${queryString ? `?${queryString}` : ''}`)
  },

  async getReviews(tenantId: string, status?: string): Promise<TenantReview[]> {
    const params = new URLSearchParams()
    if (status) params.set('status', status)
    const queryString = params.toString()
    return adminFetch(`/tenants/${tenantId}/reviews${queryString ? `?${queryString}` : ''}`)
  },

  async getRefunds(tenantId: string, status?: string): Promise<TenantRefund[]> {
    const params = new URLSearchParams()
    if (status) params.set('status', status)
    const queryString = params.toString()
    return adminFetch(`/tenants/${tenantId}/refunds${queryString ? `?${queryString}` : ''}`)
  },

  // Booking management
  async getBooking(tenantId: string, bookingId: string): Promise<any> {
    return adminFetch(`/tenants/${tenantId}/bookings/${bookingId}`)
  },

  async createBooking(tenantId: string, data: {
    room_id: string
    guest_name: string
    guest_email?: string
    guest_phone?: string
    check_in: string
    check_out: string
    adults?: number
    children?: number
    total_amount?: number
    status?: string
    notes?: string
  }): Promise<any> {
    return adminFetch(`/tenants/${tenantId}/bookings`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  async updateBooking(tenantId: string, bookingId: string, data: {
    room_id?: string
    guest_name?: string
    guest_email?: string
    guest_phone?: string
    check_in?: string
    check_out?: string
    adults?: number
    children?: number
    total_amount?: number
    status?: string
    notes?: string
    addons?: any[]
    coupon_id?: string | null
    discount_amount?: number
  }): Promise<any> {
    return adminFetch(`/tenants/${tenantId}/bookings/${bookingId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  },

  // Booking form data endpoints
  async getRoomsFull(tenantId: string): Promise<AdminRoomFull[]> {
    return adminFetch(`/tenants/${tenantId}/rooms/full`)
  },

  async getAddons(tenantId: string): Promise<AdminAddOn[]> {
    return adminFetch(`/tenants/${tenantId}/addons`)
  },

  async getRoomPrices(tenantId: string, roomId: string, startDate: string, endDate: string): Promise<AdminPricingResult> {
    const params = new URLSearchParams()
    params.set('start_date', startDate)
    params.set('end_date', endDate)
    return adminFetch(`/tenants/${tenantId}/rooms/${roomId}/prices?${params}`)
  },

  async validateCoupon(tenantId: string, data: {
    code: string
    room_id?: string
    room_ids?: string[]
    customer_email?: string
    subtotal?: number
    nights?: number
    check_in?: string
  }): Promise<AdminCouponValidation> {
    return adminFetch(`/tenants/${tenantId}/coupons/validate`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },
}

// Operations types
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

// Owner types
export interface SocialLinks {
  whatsapp?: string
  linkedin?: string
  twitter?: string
  facebook?: string
  instagram?: string
}

export interface TenantOwner {
  userId: string | null
  email: string
  displayName: string | null
  phone: string | null
  avatarUrl: string | null
  jobTitle: string | null
  bio: string | null
  socialLinks: SocialLinks | null
  address?: {
    line1?: string | null
    line2?: string | null
    city?: string | null
    state?: string | null
    postalCode?: string | null
    country?: string | null
  }
  createdAt: string
  lastSignInAt?: string | null
}

export interface OwnerUpdateData {
  displayName?: string
  email?: string
  phone?: string
  avatarUrl?: string
  jobTitle?: string
  bio?: string
  socialLinks?: SocialLinks
  address?: {
    line1?: string
    line2?: string
    city?: string
    state?: string
    postalCode?: string
    country?: string
  }
}

export interface OwnerActivityLog {
  id: string
  action: string
  description: string
  adminEmail: string
  metadata?: Record<string, any>
  timestamp: string
  ipAddress?: string
}

// Bed configuration matching database format
export interface AdminBedConfiguration {
  id?: string
  bed_type: string
  quantity: number
  sleeps?: number
}

// Room image (matching database storage format)
export interface AdminRoomImage {
  url: string
  path: string
  caption?: string
}

// Room images structure (matching database storage format)
export interface AdminRoomImages {
  featured: AdminRoomImage | null
  gallery: AdminRoomImage[]
}

// Seasonal rate
export interface AdminSeasonalRate {
  id: string
  roomId: string
  name: string
  startDate: string
  endDate: string
  pricePerNight: number
  additionalPersonRate?: number | null
  childPricePerNight?: number | null
  minNights?: number | null
  isActive: boolean
  createdAt: string
  updatedAt?: string
}

export interface AdminSeasonalRateCreateData {
  name: string
  start_date: string
  end_date: string
  price_per_night: number
  additional_person_rate?: number | null
  child_price_per_night?: number | null
  min_nights?: number | null
  is_active?: boolean
}

export interface AdminSeasonalRateUpdateData extends Partial<AdminSeasonalRateCreateData> {}

// Full room interface with all fields
export interface AdminRoom {
  id: string
  tenantId: string
  // Basic Info
  name: string
  description: string
  roomCode: string
  roomSizeSqm: number | null
  // Beds
  beds: AdminBedConfiguration[]
  // Capacity
  maxGuests: number
  maxAdults: number | null
  maxChildren: number | null
  // Amenities
  amenities: string[]
  extraOptions: string[]
  // Images
  images: AdminRoomImages
  // Pricing
  pricingMode: 'per_unit' | 'per_person' | 'per_person_sharing'
  basePricePerNight: number
  additionalPersonRate: number | null
  currency: string
  // Children pricing
  childPricePerNight: number | null
  childFreeUntilAge: number | null
  childAgeLimit: number
  // Stay rules
  minStayNights: number
  maxStayNights: number | null
  checkInTime: string
  checkOutTime: string
  // Inventory
  inventoryMode: 'single_unit' | 'room_type'
  totalUnits: number
  isActive: boolean
  // Timestamps
  createdAt: string
  updatedAt?: string
}

// Full room update data interface
export interface AdminRoomUpdateData {
  // Basic Info
  name?: string
  description?: string
  room_code?: string
  room_size_sqm?: number | null
  // Beds
  beds?: AdminBedConfiguration[]
  // Capacity
  max_guests?: number
  max_adults?: number | null
  max_children?: number | null
  // Amenities
  amenities?: string[]
  extra_options?: string[]
  // Images
  featured_image?: string | null
  gallery_images?: string[]
  // Pricing
  pricing_mode?: 'per_unit' | 'per_person' | 'per_person_sharing'
  base_price_per_night?: number
  additional_person_rate?: number | null
  currency?: string
  // Children pricing
  child_price_per_night?: number | null
  child_free_until_age?: number | null
  child_age_limit?: number
  // Stay rules
  min_stay_nights?: number
  max_stay_nights?: number | null
  check_in_time?: string
  check_out_time?: string
  // Inventory
  inventory_mode?: 'single_unit' | 'room_type'
  total_units?: number
  is_active?: boolean
}

// ============================================================================
// BOOKING FORM DATA TYPES
// ============================================================================

// Full room for booking form
export interface AdminRoomFull {
  id: string
  tenant_id: string
  name: string
  description: string | null
  room_code: string | null
  room_size_sqm: number | null
  beds: AdminBedConfiguration[]
  max_guests: number
  max_adults: number | null
  max_children: number | null
  amenities: string[]
  extra_options: string[]
  images: AdminRoomImages | null
  primary_image_url: string | null
  pricing_mode: 'per_unit' | 'per_person' | 'per_person_sharing'
  base_price_per_night: number
  additional_person_rate: number | null
  currency: string
  child_price_per_night: number | null
  child_free_until_age: number | null
  child_age_limit: number
  min_stay_nights: number
  max_stay_nights: number | null
  check_in_time: string
  check_out_time: string
  inventory_mode: 'single_unit' | 'room_type'
  total_units: number
  is_active: boolean
  is_paused: boolean
  created_at: string
  updated_at: string
}

// AddOn for booking form
export interface AdminAddOn {
  id: string
  tenant_id: string
  name: string
  description: string | null
  addon_code: string | null
  addon_type: 'service' | 'product' | 'experience'
  price: number
  pricing_type: 'per_booking' | 'per_night' | 'per_guest' | 'per_unit' | 'per_guest_per_night'
  max_quantity: number | null
  is_active: boolean
  image_url: string | null
  created_at: string
  updated_at: string
}

// Pricing result from admin API
export interface AdminPricingResult {
  room_id: string
  start_date: string
  end_date: string
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
  total_nights: number
  total_amount: number
  currency: string
}

// Coupon validation result
export interface AdminCouponValidation {
  valid: boolean
  errors?: string[]
  coupon?: {
    id: string
    code: string
    name: string
    discount_type: 'percentage' | 'fixed_amount' | 'free_nights'
    discount_value: number
  }
  discount_amount?: number
}

// ============================================================================
// USERS
// ============================================================================

export interface User {
  id: string
  email: string
  displayName?: string
  avatarUrl?: string
  tenantMemberships: {
    tenantId: string
    tenantName: string
    role: string
    status: string
  }[]
  createdAt: string
  lastSignInAt?: string
}

export const adminUsers = {
  async list(options?: {
    page?: number
    limit?: number
    search?: string
    tenantId?: string
  }): Promise<{ users: User[]; total: number }> {
    const params = new URLSearchParams()
    if (options?.page) params.set('page', String(options.page))
    if (options?.limit) params.set('limit', String(options.limit))
    if (options?.search) params.set('search', options.search)
    if (options?.tenantId) params.set('tenantId', options.tenantId)
    return adminFetch(`/users?${params}`)
  },

  async get(id: string): Promise<User> {
    return adminFetch(`/users/${id}`)
  },

  async resetPassword(id: string): Promise<void> {
    return adminFetch(`/users/${id}/reset-password`, {
      method: 'POST',
    })
  },

  async verifyEmail(id: string): Promise<void> {
    return adminFetch(`/users/${id}/verify-email`, {
      method: 'POST',
    })
  },
}

// ============================================================================
// BILLING & SUBSCRIPTIONS
// ============================================================================

export interface Subscription {
  id: string
  tenantId: string
  tenantName: string
  tenantEmail?: string
  planId: string
  planName: string
  status: 'active' | 'trial' | 'past_due' | 'cancelled' | 'expired'
  billingCycle: 'monthly' | 'yearly'
  priceMonthly?: number
  priceYearly?: number
  autoRenew: boolean
  currentPeriodStart: string
  currentPeriodEnd: string
  cancelAtPeriodEnd: boolean
  createdAt: string
}

export interface Plan {
  id: string
  name: string
  slug: string
  description?: string
  price: number
  priceMonthly: number
  priceYearly: number
  interval: 'monthly' | 'yearly'
  trialDays: number
  features: string[]
  limits: {
    max_rooms?: number
    max_team_members?: number
    max_bookings_per_month?: number
    [key: string]: number | boolean | undefined
  }
  isActive: boolean
  displayOrder: number
  highlightBadge?: string
  recommended?: boolean
  subscriberCount?: number
}

export const adminBilling = {
  async getSubscriptions(options?: {
    page?: number
    limit?: number
    status?: string
    planId?: string
  }): Promise<{ subscriptions: Subscription[]; total: number; totalPages: number }> {
    const params = new URLSearchParams()
    if (options?.page) params.set('page', String(options.page))
    if (options?.limit) params.set('limit', String(options.limit))
    if (options?.status) params.set('status', options.status)
    if (options?.planId) params.set('planId', options.planId)
    return adminFetch(`/billing/subscriptions?${params}`)
  },

  async getSubscription(id: string): Promise<Subscription> {
    return adminFetch(`/billing/subscriptions/${id}`)
  },

  async extendTrial(subscriptionId: string, days: number, reason: string): Promise<void> {
    return adminFetch(`/billing/subscriptions/${subscriptionId}/extend-trial`, {
      method: 'POST',
      body: JSON.stringify({ days, reason }),
    })
  },

  async changePlan(subscriptionId: string, newPlanId: string, reason: string): Promise<void> {
    return adminFetch(`/billing/subscriptions/${subscriptionId}/change-plan`, {
      method: 'POST',
      body: JSON.stringify({ newPlanId, reason }),
    })
  },

  async cancelSubscription(subscriptionId: string, immediate: boolean, reason: string): Promise<void> {
    return adminFetch(`/billing/subscriptions/${subscriptionId}/cancel`, {
      method: 'POST',
      body: JSON.stringify({ immediate, reason }),
    })
  },

  async getPlans(): Promise<Plan[]> {
    return adminFetch('/billing/plans')
  },

  async createPlan(plan: Omit<Plan, 'id'>): Promise<Plan> {
    return adminFetch('/billing/plans', {
      method: 'POST',
      body: JSON.stringify(plan),
    })
  },

  async updatePlan(id: string, plan: Partial<Plan>): Promise<Plan> {
    return adminFetch(`/billing/plans/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(plan),
    })
  },

  async deletePlan(id: string): Promise<void> {
    return adminFetch(`/billing/plans/${id}`, {
      method: 'DELETE',
    })
  },

  async getRevenueStats(): Promise<{
    mrr: number
    arr: number
    mrrGrowth: number
    arpu: number
    nrr: number
    totalRevenue: number
    revenueByPlan: { planName: string; revenue: number; subscribers: number }[]
    subscriptionsByStatus: {
      active: number
      trial: number
      past_due: number
      cancelled: number
      expired: number
    }
  }> {
    return adminFetch('/billing/stats')
  },
}

// ============================================================================
// GRACE PERIODS
// ============================================================================

export interface GracePeriod {
  id: string
  subscriptionId: string
  tenantId: string
  tenantName: string
  tenantEmail: string
  planName: string
  planSlug: string
  billingCycle: string
  startedAt: string
  endsAt: string
  originalFailureReason: string
  originalFailureAt: string
  retryCount: number
  maxRetries: number
  lastRetryAt: string | null
  nextRetryAt: string | null
  status: 'active' | 'resolved_paid' | 'resolved_cancelled' | 'expired'
  createdAt: string
}

export interface GracePeriodStats {
  counts: {
    active: number
    resolved_paid: number
    resolved_cancelled: number
    expired: number
  }
  expiringToday: number
  avgDaysInGrace: number
  resolutionRate: number
}

export const adminGracePeriods = {
  async list(options?: {
    status?: string
    page?: number
    limit?: number
  }): Promise<{ gracePeriods: GracePeriod[]; total: number }> {
    const params = new URLSearchParams()
    if (options?.status) params.set('status', options.status)
    if (options?.page) params.set('page', String(options.page))
    if (options?.limit) params.set('limit', String(options.limit))
    return adminFetch(`/grace-periods?${params}`)
  },

  async get(id: string): Promise<GracePeriod> {
    return adminFetch(`/grace-periods/${id}`)
  },

  async getStats(): Promise<GracePeriodStats> {
    return adminFetch('/grace-periods/stats')
  },

  async retry(id: string): Promise<{ success: boolean; message: string }> {
    return adminFetch(`/grace-periods/${id}/retry`, {
      method: 'POST',
    })
  },

  async extend(id: string, days: number, reason: string): Promise<GracePeriod> {
    return adminFetch(`/grace-periods/${id}/extend`, {
      method: 'POST',
      body: JSON.stringify({ days, reason }),
    })
  },

  async resolve(id: string, resolution: 'paid' | 'cancelled', reason?: string): Promise<GracePeriod> {
    return adminFetch(`/grace-periods/${id}/resolve`, {
      method: 'POST',
      body: JSON.stringify({ resolution, reason }),
    })
  },
}

// ============================================================================
// SYSTEM HEALTH
// ============================================================================

export interface SystemHealth {
  status: 'healthy' | 'degraded' | 'unhealthy'
  uptime: number
  memory: {
    heapUsed: number
    heapTotal: number
    rss: number
    percentUsed: number
  }
  database: {
    connected: boolean
    latency: number
  }
  api: {
    avgLatency: number
    p95Latency: number
    p99Latency: number
    requestsPerMinute: number
    errorRate: number
  }
  websocket: {
    connections: number
    messagesPerMinute: number
  }
}

export const adminHealth = {
  async getStatus(): Promise<SystemHealth> {
    return adminFetch('/health/system')
  },

  async getApiMetrics(): Promise<any> {
    return adminFetch('/health/api-performance')
  },

  async getDashboard(): Promise<any> {
    return adminFetch('/health/dashboard')
  },
}

// ============================================================================
// ERROR LOGS
// ============================================================================

export interface ErrorLog {
  id: string
  level: 'error' | 'warning' | 'info'
  message: string
  stack?: string
  context?: Record<string, any>
  requestId?: string
  userId?: string
  tenantId?: string
  sentryEventId?: string
  environment: string
  createdAt: string
}

export const adminErrors = {
  async list(options?: {
    page?: number
    limit?: number
    level?: string
    search?: string
    startDate?: string
    endDate?: string
  }): Promise<{ errors: ErrorLog[]; total: number }> {
    const params = new URLSearchParams()
    if (options?.page) params.set('page', String(options.page))
    if (options?.limit) params.set('limit', String(options.limit))
    if (options?.level) params.set('level', options.level)
    if (options?.search) params.set('search', options.search)
    if (options?.startDate) params.set('startDate', options.startDate)
    if (options?.endDate) params.set('endDate', options.endDate)
    return adminFetch(`/errors?${params}`)
  },

  async get(id: string): Promise<ErrorLog> {
    return adminFetch(`/errors/${id}`)
  },

  async getStats(): Promise<{
    totalErrors: number
    errorsToday: number
    errorsByLevel: { level: string; count: number }[]
    errorTrend: { date: string; count: number }[]
  }> {
    return adminFetch('/errors/stats')
  },
}

// ============================================================================
// BACKUPS
// ============================================================================

export interface Backup {
  id: string
  type: 'full' | 'incremental' | 'tenant_export'
  status: 'pending' | 'in_progress' | 'completed' | 'failed'
  fileName: string
  fileSize: number
  checksum?: string
  tenantId?: string
  tenantName?: string
  startedAt: string
  completedAt?: string
  expiresAt?: string
  initiatedBy?: string
  errorMessage?: string
}

export const adminBackups = {
  async list(options?: {
    page?: number
    limit?: number
    type?: string
    status?: string
  }): Promise<{ backups: Backup[]; total: number }> {
    const params = new URLSearchParams()
    if (options?.page) params.set('page', String(options.page))
    if (options?.limit) params.set('limit', String(options.limit))
    if (options?.type) params.set('type', options.type)
    if (options?.status) params.set('status', options.status)
    return adminFetch(`/backups?${params}`)
  },

  async create(type: 'full' | 'incremental' | 'tenant_export', tenantId?: string): Promise<Backup> {
    return adminFetch('/backups', {
      method: 'POST',
      body: JSON.stringify({ type, tenantId }),
    })
  },

  async download(id: string): Promise<{ url: string }> {
    return adminFetch(`/backups/${id}/download`)
  },

  async restore(id: string): Promise<void> {
    return adminFetch(`/backups/${id}/restore`, {
      method: 'POST',
    })
  },

  async delete(id: string): Promise<void> {
    return adminFetch(`/backups/${id}`, {
      method: 'DELETE',
    })
  },
}

// ============================================================================
// FEATURE FLAGS
// ============================================================================

export interface FeatureFlag {
  id: string
  key: string
  name: string
  description?: string
  enabled: boolean
  targeting: 'all' | 'percentage' | 'tenants' | 'plans'
  percentage?: number
  tenants?: string[]
  plans?: string[]
  createdAt: string
  updatedAt: string
}

export const adminFeatureFlags = {
  async list(): Promise<FeatureFlag[]> {
    return adminFetch('/feature-flags')
  },

  async get(key: string): Promise<FeatureFlag> {
    return adminFetch(`/feature-flags/${key}`)
  },

  async create(flag: Omit<FeatureFlag, 'id' | 'createdAt' | 'updatedAt'>): Promise<FeatureFlag> {
    return adminFetch('/feature-flags', {
      method: 'POST',
      body: JSON.stringify(flag),
    })
  },

  async update(key: string, flag: Partial<FeatureFlag>): Promise<FeatureFlag> {
    return adminFetch(`/feature-flags/${key}`, {
      method: 'PATCH',
      body: JSON.stringify(flag),
    })
  },

  async delete(key: string): Promise<void> {
    return adminFetch(`/feature-flags/${key}`, {
      method: 'DELETE',
    })
  },

  async addTenantOverride(key: string, tenantId: string, enabled: boolean, expiresAt?: string): Promise<void> {
    return adminFetch(`/feature-flags/${key}/overrides`, {
      method: 'POST',
      body: JSON.stringify({ tenantId, enabled, expiresAt }),
    })
  },
}

// ============================================================================
// ANNOUNCEMENTS
// ============================================================================

export interface Announcement {
  id: string
  type: 'banner' | 'changelog' | 'maintenance'
  title: string
  content: string
  status: 'draft' | 'scheduled' | 'active' | 'expired'
  targetAudience: 'all' | 'tenants' | 'plans'
  targetPlans?: string[]
  startsAt: string
  endsAt?: string
  dismissible: boolean
  createdAt: string
}

export const adminAnnouncements = {
  async list(): Promise<Announcement[]> {
    return adminFetch('/announcements')
  },

  async create(announcement: Omit<Announcement, 'id' | 'createdAt'>): Promise<Announcement> {
    return adminFetch('/announcements', {
      method: 'POST',
      body: JSON.stringify(announcement),
    })
  },

  async update(id: string, announcement: Partial<Announcement>): Promise<Announcement> {
    return adminFetch(`/announcements/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(announcement),
    })
  },

  async delete(id: string): Promise<void> {
    return adminFetch(`/announcements/${id}`, {
      method: 'DELETE',
    })
  },
}

// ============================================================================
// ACTIVITY LOGS
// ============================================================================

export interface ActivityLog {
  id: string
  adminId: string
  adminName: string
  adminEmail: string
  action: string
  resource: string
  resourceId: string
  description?: string
  changes?: Record<string, any>
  ipAddress?: string
  userAgent?: string
  impersonatedAs?: string
  createdAt: string
}

export const adminActivity = {
  async getLogs(options?: {
    page?: number
    limit?: number
    adminId?: string
    action?: string
    resource?: string
    startDate?: string
    endDate?: string
  }): Promise<{ logs: ActivityLog[]; total: number }> {
    const params = new URLSearchParams()
    if (options?.page) params.set('page', String(options.page))
    if (options?.limit) params.set('limit', String(options.limit))
    if (options?.adminId) params.set('adminId', options.adminId)
    if (options?.action) params.set('action', options.action)
    if (options?.resource) params.set('resource', options.resource)
    if (options?.startDate) params.set('startDate', options.startDate)
    if (options?.endDate) params.set('endDate', options.endDate)
    return adminFetch(`/activity?${params}`)
  },
}

// ============================================================================
// PLATFORM SETTINGS
// ============================================================================

export interface PlatformSettings {
  // General
  platformName: string
  supportEmail: string
  defaultCurrency: string
  defaultTimezone: string
  maintenanceMode: boolean
  // Automation
  trialDays: number
  gracePeriodDays: number
  paymentRetryDays: string
  autoSuspendOnFailedPayment: boolean
  // Limits
  defaultRoomLimit: number
  defaultMemberLimit: number
  defaultBookingLimit: number
  maxFileUploadSize: number
  // Email
  emailFromName: string
  emailFromAddress: string
  enableEmailNotifications: boolean
  // Security
  sessionTimeout: number
  maxLoginAttempts: number
  requireMfa: boolean
  allowedDomains: string
}

export const adminSettings = {
  async get(): Promise<PlatformSettings> {
    return adminFetch('/settings')
  },

  async update(settings: Partial<PlatformSettings>): Promise<PlatformSettings> {
    return adminFetch('/settings', {
      method: 'PATCH',
      body: JSON.stringify(settings),
    })
  },
}

// ============================================================================
// IMPERSONATION
// ============================================================================

export const adminImpersonation = {
  async getActiveSessions(): Promise<any[]> {
    return adminFetch('/impersonation/sessions')
  },

  async endSession(sessionId: string): Promise<void> {
    return adminFetch(`/impersonation/sessions/${sessionId}/end`, {
      method: 'POST',
    })
  },

  async getSessionHistory(options?: {
    page?: number
    limit?: number
    adminId?: string
    tenantId?: string
  }): Promise<{ sessions: any[]; total: number }> {
    const params = new URLSearchParams()
    if (options?.page) params.set('page', String(options.page))
    if (options?.limit) params.set('limit', String(options.limit))
    if (options?.adminId) params.set('adminId', options.adminId)
    if (options?.tenantId) params.set('tenantId', options.tenantId)
    return adminFetch(`/impersonation/history?${params}`)
  },
}

// ============================================================================
// AUTOMATION
// ============================================================================

export const adminAutomation = {
  async getRunHistory(options?: {
    page?: number
    limit?: number
    jobName?: string
    status?: string
  }): Promise<{ runs: any[]; total: number }> {
    const params = new URLSearchParams()
    if (options?.page) params.set('page', String(options.page))
    if (options?.limit) params.set('limit', String(options.limit))
    if (options?.jobName) params.set('jobName', options.jobName)
    if (options?.status) params.set('status', options.status)
    return adminFetch(`/automation/runs?${params}`)
  },

  async triggerJob(jobName: string): Promise<any> {
    return adminFetch(`/automation/trigger/${jobName}`, {
      method: 'POST',
    })
  },
}

// ============================================================================
// PLATFORM ANALYTICS (Industry-Standard SaaS Metrics)
// ============================================================================

export interface OverviewMetrics {
  mrr: number
  mrrGrowth: number
  arr: number
  totalCustomers: number
  activeCustomers: number
  churnRate: number
  nrr: number
  arpu: number
  totalRevenue: number
  activeTrials: number
  trialConversionRate: number
  pendingPayments: number
  totalBookings: number
  platformOccupancy: number
}

export interface RevenueMetrics {
  mrr: number
  mrrGrowth: number
  arr: number
  arpu: number
  nrr: number
  expansionMrr: number
  contractionMrr: number
  newMrr: number
  churnedMrr: number
  revenueByPlan: { plan: string; planId: string; revenue: number; count: number; percentage: number }[]
  revenueTrend: { date: string; mrr: number; arr: number; newMrr: number; churnedMrr: number }[]
  topCustomers: { id: string; name: string; revenue: number; plan: string; bookings: number }[]
}

export interface CustomerMetrics {
  totalCustomers: number
  activeCustomers: number
  newCustomers: number
  churnedCustomers: number
  churnRate: number
  revenueChurnRate: number
  ltv: number
  averageLifespan: number
  customersByPlan: { plan: string; count: number; percentage: number }[]
  acquisitionTrend: { date: string; new: number; churned: number; net: number; total: number }[]
  cohortRetention: CohortData[]
  healthDistribution: { score: string; count: number; percentage: number }[]
}

export interface CohortData {
  cohort: string
  month0: number
  month1: number | null
  month2: number | null
  month3: number | null
  month4: number | null
  month5: number | null
  month6: number | null
  month7: number | null
  month8: number | null
  month9: number | null
  month10: number | null
  month11: number | null
  totalCustomers: number
}

export interface GrowthMetrics {
  newSignups: number
  signupGrowth: number
  trialConversionRate: number
  avgTimeToConvert: number
  activationRate: number
  netNewCustomers: number
  signupTrend: { date: string; signups: number; conversions: number; activations: number }[]
  conversionFunnel: { stage: string; count: number; percentage: number }[]
  growthByPlan: { plan: string; new: number; converted: number; rate: number }[]
  sourceDistribution: { source: string; count: number; percentage: number }[]
}

// ============== COMPREHENSIVE GROWTH ANALYTICS TYPES ==============

export interface TenantGrowthMetrics {
  newSignups: number
  signupGrowth: number
  totalTenants: number
  signupsBySource: { source: string; count: number; percentage: number }[]
  signupsByCampaign: { campaign: string; count: number; conversions: number }[]
  signupTrend: { date: string; signups: number }[]
}

export interface ActivationFunnelMetrics {
  stages: {
    stage: string
    count: number
    percentage: number
    dropOffRate: number
  }[]
  timeToValue: {
    avgDaysToFirstRoom: number
    avgDaysToFirstBooking: number
    avgDaysToFirstPayment: number
  }
  activationRate: number
}

export interface InventoryMetrics {
  totalRooms: number
  newRooms: number
  roomGrowth: number
  activeRooms: number
  activeRoomRate: number
  avgRoomsPerTenant: number
  roomsTrend: { date: string; total: number; new: number }[]
}

export interface TeamMetrics {
  totalMembers: number
  newMembers: number
  memberGrowth: number
  avgTeamSize: number
  membersByRole: { role: string; count: number; percentage: number }[]
  teamsWithMultipleMembers: number
  teamSizeDistribution: { size: string; count: number }[]
}

export interface CustomerAcquisitionMetrics {
  totalCustomers: number
  newCustomers: number
  customerGrowth: number
  customersWithBookings: number
  conversionRate: number
  repeatCustomers: number
  repeatRate: number
  customersByTenantTier: { tier: string; customers: number }[]
  customerTrend: { date: string; total: number; new: number }[]
}

export interface EngagementMetrics {
  activeTenants7d: number
  activeTenants30d: number
  activeRate7d: number
  activeRate30d: number
  avgLoginsPerTenant: number
  avgSessionDuration: number
  featureAdoption: { feature: string; adoptionRate: number; usage: number }[]
  engagementTrend: { date: string; activeTenants: number; logins: number }[]
}

export interface GMVMetrics {
  totalGMV: number
  gmvGrowth: number
  totalBookings: number
  bookingGrowth: number
  avgBookingValue: number
  avgBookingValueGrowth: number
  revenuePerActiveTenant: number
  gmvTrend: { date: string; gmv: number; bookings: number }[]
}

export interface MarketingAttributionMetrics {
  sourcePerformance: {
    source: string
    signups: number
    activated: number
    activationRate: number
    avgTimeToActivate: number
    estimatedLTV: number
  }[]
  campaignPerformance: {
    campaign: string
    signups: number
    activated: number
    activationRate: number
  }[]
  bestPerformingSource: string
  bestPerformingCampaign: string
}

export interface ChurnMetrics {
  churnedTenants: number
  churnRate: number
  churnReasons: { reason: string; count: number; percentage: number }[]
  avgTenureBeforeChurn: number
  churnTrend: { date: string; churned: number }[]
  atRiskTenants: number
}

export interface ComprehensiveGrowthMetrics {
  tenantGrowth: TenantGrowthMetrics
  activationFunnel: ActivationFunnelMetrics
  inventory: InventoryMetrics
  team: TeamMetrics
  customers: CustomerAcquisitionMetrics
  engagement: EngagementMetrics
  gmv: GMVMetrics
  attribution: MarketingAttributionMetrics
  churn: ChurnMetrics
}

export interface UsageMetrics {
  dau: number
  wau: number
  mau: number
  dauWauRatio: number
  totalBookings: number
  avgBookingsPerTenant: number
  totalRooms: number
  avgRoomsPerTenant: number
  apiRequestsToday: number
  storageUsedMb: number
  featureAdoption: { feature: string; tenantsUsing: number; percentage: number }[]
  usageTrend: { date: string; dau: number; bookings: number; apiRequests: number }[]
  planLimitUtilization: { plan: string; avgRoomUtilization: number; avgBookingUtilization: number; avgStorageUtilization: number }[]
  topApiConsumers: { tenantId: string; name: string; requests: number }[]
}

export interface TrendDataPoint {
  date: string
  value: number
  label?: string
}

export type AnalyticsRange = '7d' | '30d' | '90d' | '1y'
export type TrendPeriod = 'week' | 'month' | 'quarter' | 'year'
export type TrendMetric = 'mrr' | 'customers' | 'churn' | 'bookings'

export interface ScheduledReport {
  id: string
  reportName: string
  reportType: string
  frequency: 'daily' | 'weekly' | 'monthly'
  emailRecipients: string[]
  isActive: boolean
  nextRunAt?: string
  lastRunAt?: string
  createdAt: string
}

export interface GeneratedReport {
  id: string
  reportName: string
  reportType: string
  format: 'pdf' | 'csv'
  dateRangeStart: string
  dateRangeEnd: string
  fileSize?: number
  filePath?: string
  generatedAt: string
}

export const adminAnalytics = {
  /**
   * Get comprehensive overview metrics
   */
  async getOverview(): Promise<OverviewMetrics> {
    return adminFetch('/analytics/overview')
  },

  /**
   * Get detailed revenue analytics
   */
  async getRevenue(range: AnalyticsRange = '30d'): Promise<RevenueMetrics> {
    return adminFetch(`/analytics/revenue-metrics?range=${range}`)
  },

  /**
   * Get customer analytics with cohort retention
   */
  async getCustomers(range: AnalyticsRange = '30d'): Promise<CustomerMetrics> {
    return adminFetch(`/analytics/customer-metrics?range=${range}`)
  },

  /**
   * Get growth and conversion analytics
   */
  async getGrowth(range: AnalyticsRange = '30d'): Promise<GrowthMetrics> {
    return adminFetch(`/analytics/growth-metrics?range=${range}`)
  },

  /**
   * Get comprehensive growth analytics for marketing decisions
   */
  async getGrowthComprehensive(range: AnalyticsRange = '30d'): Promise<ComprehensiveGrowthMetrics> {
    return adminFetch(`/analytics/growth-comprehensive?range=${range}`)
  },

  /**
   * Get tenant growth metrics
   */
  async getTenantGrowth(range: AnalyticsRange = '30d'): Promise<TenantGrowthMetrics> {
    return adminFetch(`/analytics/growth/tenants?range=${range}`)
  },

  /**
   * Get activation funnel metrics
   */
  async getActivationFunnel(range: AnalyticsRange = '30d'): Promise<ActivationFunnelMetrics> {
    return adminFetch(`/analytics/growth/activation-funnel?range=${range}`)
  },

  /**
   * Get inventory (rooms) growth metrics
   */
  async getInventoryMetrics(range: AnalyticsRange = '30d'): Promise<InventoryMetrics> {
    return adminFetch(`/analytics/growth/inventory?range=${range}`)
  },

  /**
   * Get team growth metrics
   */
  async getTeamMetrics(range: AnalyticsRange = '30d'): Promise<TeamMetrics> {
    return adminFetch(`/analytics/growth/team?range=${range}`)
  },

  /**
   * Get customer acquisition metrics
   */
  async getCustomerAcquisition(range: AnalyticsRange = '30d'): Promise<CustomerAcquisitionMetrics> {
    return adminFetch(`/analytics/growth/customers?range=${range}`)
  },

  /**
   * Get engagement metrics
   */
  async getEngagement(range: AnalyticsRange = '30d'): Promise<EngagementMetrics> {
    return adminFetch(`/analytics/engagement?range=${range}`)
  },

  /**
   * Get GMV and booking value metrics
   */
  async getGMV(range: AnalyticsRange = '30d'): Promise<GMVMetrics> {
    return adminFetch(`/analytics/gmv?range=${range}`)
  },

  /**
   * Get marketing attribution metrics
   */
  async getAttribution(range: AnalyticsRange = '30d'): Promise<MarketingAttributionMetrics> {
    return adminFetch(`/analytics/attribution?range=${range}`)
  },

  /**
   * Get churn analysis metrics
   */
  async getChurn(range: AnalyticsRange = '30d'): Promise<ChurnMetrics> {
    return adminFetch(`/analytics/churn?range=${range}`)
  },

  /**
   * Get usage and engagement analytics
   */
  async getUsage(range: AnalyticsRange = '30d'): Promise<UsageMetrics> {
    return adminFetch(`/analytics/usage-metrics?range=${range}`)
  },

  /**
   * Get trend data for sparklines
   */
  async getTrend(metric: TrendMetric, period: TrendPeriod = 'month'): Promise<TrendDataPoint[]> {
    return adminFetch(`/analytics/trends/${metric}?period=${period}`)
  },

  /**
   * Legacy dashboard endpoint
   */
  async getDashboard(range: AnalyticsRange = '30d'): Promise<any> {
    return adminFetch(`/analytics/dashboard?range=${range}`)
  },

  /**
   * Get plan distribution
   */
  async getPlanDistribution(): Promise<{ plan: string; slug: string; count: number }[]> {
    return adminFetch('/analytics/plan-distribution')
  },

  /**
   * Get top performing tenants
   */
  async getTopTenants(limit = 10, sortBy: 'revenue' | 'bookings' = 'revenue'): Promise<any[]> {
    return adminFetch(`/analytics/top-tenants?limit=${limit}&sortBy=${sortBy}`)
  },

  /**
   * Get geographic distribution
   */
  async getGeographic(): Promise<{ country: string; count: number }[]> {
    return adminFetch('/analytics/geographic')
  },

  /**
   * Generate a platform report
   */
  async generateReport(
    type: 'platform' | 'revenue' | 'customers' | 'growth' | 'usage',
    dateRange: { startDate: string; endDate: string },
    format: 'pdf' | 'csv' = 'pdf'
  ): Promise<Blob> {
    const headers = await getAuthHeaders()
    const response = await fetch(
      `${API_URL}/admin/analytics/reports/generate`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify({ type, dateRange, format }),
      }
    )
    if (!response.ok) {
      throw new Error('Failed to generate report')
    }
    return response.blob()
  },

  /**
   * Generate unified analytics report with selected sections
   */
  async generateUnifiedReport(
    sections: string[],
    dateRange: { startDate: string; endDate: string },
    format: 'pdf' | 'csv' = 'pdf'
  ): Promise<Blob> {
    const headers = await getAuthHeaders()
    const response = await fetch(
      `${API_URL}/admin/analytics/reports/unified`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify({ sections, dateRange, format }),
      }
    )
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.error || 'Failed to generate report')
    }
    return response.blob()
  },

  /**
   * Get list of recently generated reports
   */
  async getRecentReports(limit = 10): Promise<GeneratedReport[]> {
    return adminFetch(`/analytics/reports?limit=${limit}`)
  },

  /**
   * Download a report
   */
  async downloadReport(id: string): Promise<{ url: string; filename: string }> {
    return adminFetch(`/analytics/reports/${id}/download`)
  },

  /**
   * Schedule a recurring report
   */
  async scheduleReport(config: {
    reportType: string
    frequency: 'daily' | 'weekly' | 'monthly'
    emailRecipients: string[]
    reportName: string
  }): Promise<ScheduledReport> {
    return adminFetch('/analytics/reports/schedule', {
      method: 'POST',
      body: JSON.stringify(config),
    })
  },

  /**
   * Get scheduled reports
   */
  async getScheduledReports(): Promise<ScheduledReport[]> {
    return adminFetch('/analytics/reports/scheduled')
  },

  /**
   * Delete a scheduled report
   */
  async deleteScheduledReport(id: string): Promise<void> {
    return adminFetch(`/analytics/reports/schedule/${id}`, {
      method: 'DELETE',
    })
  },

  /**
   * Toggle a scheduled report (pause/resume)
   */
  async toggleScheduledReport(id: string, active: boolean): Promise<void> {
    return adminFetch(`/analytics/reports/schedule/${id}/toggle`, {
      method: 'PATCH',
      body: JSON.stringify({ active }),
    })
  },
}

// Helper to get auth headers (exposed for report generation)
async function getAuthHeadersExport(): Promise<Record<string, string>> {
  return getAuthHeaders()
}

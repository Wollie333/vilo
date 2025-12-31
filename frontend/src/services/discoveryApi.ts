/**
 * Discovery API Service
 * Handles all API calls for the public discovery/marketplace platform
 */

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3002/api'

export interface DiscoveryProperty {
  id: string
  slug: string
  tenantId: string
  name: string
  description?: string
  location: {
    city: string
    region: string
    address?: string
  }
  images: string[]
  logoUrl?: string
  priceFrom: number | null
  currency: string
  rating: number | null
  reviewCount: number
  propertyType: string
  amenities: string[]
  featured?: boolean
  latitude?: number
  longitude?: number
  categories?: string[]
}

export interface CancellationPolicy {
  days_before: number
  refund_percentage: number
  label: string
}

export interface SpecialOffer {
  title: string
  description: string
  valid_until?: string
  active: boolean
}

export interface PropertyDetail extends DiscoveryProperty {
  email?: string
  phone?: string
  businessHours?: string
  // New directory listing fields
  checkInTime: string
  checkOutTime: string
  cancellationPolicies: CancellationPolicy[]
  houseRules: string[]
  whatsIncluded: string[]
  propertyHighlights: string[]
  seasonalMessage?: string
  specialOffers: SpecialOffer[]
  rooms: Room[]
  reviews: Review[]
}

export type PricingMode = 'per_unit' | 'per_person' | 'per_person_sharing'

export interface Room {
  id: string
  name: string
  description?: string
  basePrice: number
  currency: string
  maxGuests: number
  bedrooms?: number
  bathrooms?: number
  amenities: string[]
  images: string[]
  minStay?: number
  maxStay?: number
  // Pricing configuration
  pricingMode?: PricingMode // per_unit, per_person, per_person_sharing
  additionalPersonRate?: number // For per_person_sharing: rate for each additional person
  childPricePerNight?: number // Price per child per night (0 = free, null/undefined = same as adult)
  childFreeUntilAge?: number // Children younger than this age stay free (e.g., 2 = 0-1 years free)
  childAgeLimit?: number // Max age considered a child (e.g., 12 = 0-11 are children, 12+ are adults)
}

export interface Review {
  id: string
  rating: number
  comment?: string
  guestName: string
  date: string
}

export interface Destination {
  id: string
  slug: string
  name: string
  description?: string
  image_url?: string
  image?: string
  latitude?: number
  longitude?: number
  is_featured?: boolean
  propertyCount: number
  province_id?: string
  country_id?: string
  provinces?: Province
  countries?: Country
}

export interface Country {
  id: string
  name: string
  code: string
  slug: string
  propertyCount?: number
}

export interface Province {
  id: string
  name: string
  slug: string
  abbreviation?: string
  image_url?: string
  country_id: string
  countries?: Country
  propertyCount?: number
}

export interface PropertyCategory {
  id: string
  name: string
  slug: string
  description?: string
  icon?: string
  image_url?: string
  category_type: 'experience' | 'trip_type'
  propertyCount?: number
}

export interface CategoriesGrouped {
  experience: PropertyCategory[]
  trip_type: PropertyCategory[]
}

export interface MapMarker {
  id: string
  slug: string
  name: string
  latitude: number
  longitude: number
  priceFrom: number | null
  currency: string
}

export interface SearchParams {
  location?: string
  checkIn?: string
  checkOut?: string
  guests?: number
  minPrice?: number
  maxPrice?: number
  propertyType?: string
  amenities?: string[]
  sort?: 'popular' | 'price_asc' | 'price_desc' | 'rating'
  limit?: number
  offset?: number
  // New geographic filters
  destination_slug?: string
  province_slug?: string
  country_code?: string
  // Category filter
  categories?: string[]
  // Proximity search
  near_lat?: number
  near_lng?: number
  radius_km?: number
}

export interface SearchResult {
  properties: DiscoveryProperty[]
  total: number
  limit: number
  offset: number
  hasMore: boolean
}

export interface PlatformStats {
  properties: number
  rooms: number
  bookings: number
  destinations: number
}

export interface BookingRequest {
  property_slug: string
  guest_name: string
  guest_email: string
  guest_phone?: string
  room_id: string
  check_in: string
  check_out: string
  guests?: number
  addons?: Array<{ id: string; quantity: number }>
  special_requests?: string
  total_amount: number
  currency?: string
}

export interface BookingResponse {
  success: boolean
  booking: {
    id: string
    reference: string
    propertyName: string
    propertySlug: string
    guest_name: string
    guest_email: string
    room_name: string
    check_in: string
    check_out: string
    total_amount: number
    currency: string
    status: string
  }
  customer?: {
    id: string
    email: string
    name: string
    hasPassword: boolean
  }
  token?: string
  expiresAt?: string
}

export interface AvailabilityResult {
  available: boolean
  available_units: number
  total_units: number
  nights: number
  min_stay_nights: number
  max_stay_nights: number | null
  meets_min_stay: boolean
  meets_max_stay: boolean
}

export interface PricingResult {
  room_name: string
  nights: Array<{ date: string; price: number; rate_name: string | null }>
  subtotal: number
  currency: string
  night_count: number
}

export interface PaymentMethods {
  currency: string
  methods: {
    paystack?: {
      enabled: boolean
      publicKey: string
    }
    eft?: {
      enabled: boolean
      accountHolder: string
      bankName: string
      accountNumber: string
      branchCode: string
      accountType: string
      swiftCode?: string
      referenceInstructions?: string
    }
    paypal?: {
      enabled: boolean
      clientId: string
    }
  }
  hasPaymentMethods: boolean
}

export interface Addon {
  id: string
  name: string
  description?: string
  price: number
  pricingType: 'per_booking' | 'per_night' | 'per_guest' | 'per_guest_per_night'
  maxQuantity: number
  imageUrl?: string
}

export interface SelectedAddon {
  addon: Addon
  quantity: number
}

/**
 * Discovery API methods
 */
export const discoveryApi = {
  /**
   * Search properties with filters
   */
  async searchProperties(params: SearchParams = {}): Promise<SearchResult> {
    const searchParams = new URLSearchParams()

    if (params.location) searchParams.set('location', params.location)
    if (params.checkIn) searchParams.set('checkIn', params.checkIn)
    if (params.checkOut) searchParams.set('checkOut', params.checkOut)
    if (params.guests) searchParams.set('guests', String(params.guests))
    if (params.minPrice) searchParams.set('minPrice', String(params.minPrice))
    if (params.maxPrice) searchParams.set('maxPrice', String(params.maxPrice))
    if (params.propertyType) searchParams.set('propertyType', params.propertyType)
    if (params.amenities?.length) searchParams.set('amenities', params.amenities.join(','))
    if (params.sort) searchParams.set('sort', params.sort)
    if (params.limit) searchParams.set('limit', String(params.limit))
    if (params.offset) searchParams.set('offset', String(params.offset))
    // New geographic filters
    if (params.destination_slug) searchParams.set('destination_slug', params.destination_slug)
    if (params.province_slug) searchParams.set('province_slug', params.province_slug)
    if (params.country_code) searchParams.set('country_code', params.country_code)
    // Category filter
    if (params.categories?.length) searchParams.set('categories', params.categories.join(','))
    // Proximity search
    if (params.near_lat) searchParams.set('near_lat', String(params.near_lat))
    if (params.near_lng) searchParams.set('near_lng', String(params.near_lng))
    if (params.radius_km) searchParams.set('radius_km', String(params.radius_km))

    const response = await fetch(`${API_URL}/discovery/properties?${searchParams}`)

    if (!response.ok) {
      throw new Error('Failed to fetch properties')
    }

    return response.json()
  },

  /**
   * Get single property by slug
   */
  async getProperty(slug: string): Promise<PropertyDetail> {
    const response = await fetch(`${API_URL}/discovery/properties/${slug}`)

    if (!response.ok) {
      throw new Error('Property not found')
    }

    return response.json()
  },

  /**
   * Get all destinations
   */
  async getDestinations(): Promise<{ destinations: Destination[] }> {
    const response = await fetch(`${API_URL}/discovery/destinations`)

    if (!response.ok) {
      throw new Error('Failed to fetch destinations')
    }

    return response.json()
  },

  /**
   * Get single destination with properties
   */
  async getDestination(slug: string, params: { sort?: string; limit?: number; offset?: number } = {}): Promise<{
    destination: Destination
    properties: DiscoveryProperty[]
    total: number
    hasMore: boolean
  }> {
    const searchParams = new URLSearchParams()
    if (params.sort) searchParams.set('sort', params.sort)
    if (params.limit) searchParams.set('limit', String(params.limit))
    if (params.offset) searchParams.set('offset', String(params.offset))

    const response = await fetch(`${API_URL}/discovery/destinations/${slug}?${searchParams}`)

    if (!response.ok) {
      throw new Error('Destination not found')
    }

    return response.json()
  },

  /**
   * Get featured properties
   */
  async getFeatured(limit: number = 6): Promise<{ properties: DiscoveryProperty[] }> {
    const response = await fetch(`${API_URL}/discovery/featured?limit=${limit}`)

    if (!response.ok) {
      throw new Error('Failed to fetch featured properties')
    }

    return response.json()
  },

  /**
   * Get platform statistics
   */
  async getStats(): Promise<PlatformStats> {
    const response = await fetch(`${API_URL}/discovery/stats`)

    if (!response.ok) {
      throw new Error('Failed to fetch stats')
    }

    return response.json()
  },

  /**
   * Check room availability
   */
  async checkAvailability(slug: string, roomId: string, checkIn: string, checkOut: string): Promise<AvailabilityResult> {
    const params = new URLSearchParams({
      room_id: roomId,
      check_in: checkIn,
      check_out: checkOut
    })

    const response = await fetch(`${API_URL}/discovery/properties/${slug}/availability?${params}`)

    if (!response.ok) {
      throw new Error('Failed to check availability')
    }

    return response.json()
  },

  /**
   * Get pricing for date range
   */
  async getPricing(slug: string, roomId: string, checkIn: string, checkOut: string): Promise<PricingResult> {
    const params = new URLSearchParams({
      room_id: roomId,
      check_in: checkIn,
      check_out: checkOut
    })

    const response = await fetch(`${API_URL}/discovery/properties/${slug}/pricing?${params}`)

    if (!response.ok) {
      throw new Error('Failed to get pricing')
    }

    return response.json()
  },

  /**
   * Get payment methods for a property
   */
  async getPaymentMethods(slug: string): Promise<PaymentMethods> {
    const response = await fetch(`${API_URL}/discovery/properties/${slug}/payment-methods`)

    if (!response.ok) {
      throw new Error('Failed to get payment methods')
    }

    return response.json()
  },

  /**
   * Get available add-ons for a property
   */
  async getAddons(slug: string): Promise<{ addons: Addon[] }> {
    const response = await fetch(`${API_URL}/discovery/properties/${slug}/addons`)

    if (!response.ok) {
      throw new Error('Failed to get add-ons')
    }

    return response.json()
  },

  /**
   * Create a booking
   */
  async createBooking(data: BookingRequest): Promise<BookingResponse> {
    const response = await fetch(`${API_URL}/discovery/bookings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to create booking')
    }

    return response.json()
  },

  // ============================================
  // GEOGRAPHY API METHODS
  // ============================================

  /**
   * Get all countries
   */
  async getCountries(): Promise<Country[]> {
    const response = await fetch(`${API_URL}/geography/countries`)
    if (!response.ok) throw new Error('Failed to fetch countries')
    return response.json()
  },

  /**
   * Get provinces, optionally filtered by country
   */
  async getProvinces(countryId?: string): Promise<Province[]> {
    const params = countryId ? `?country_id=${countryId}` : ''
    const response = await fetch(`${API_URL}/geography/provinces${params}`)
    if (!response.ok) throw new Error('Failed to fetch provinces')
    return response.json()
  },

  /**
   * Get province by slug with destinations
   */
  async getProvinceBySlug(slug: string): Promise<Province & { destinations: Destination[]; propertyCount: number }> {
    const response = await fetch(`${API_URL}/geography/provinces/${slug}`)
    if (!response.ok) throw new Error('Province not found')
    return response.json()
  },

  /**
   * Get destinations, optionally filtered
   */
  async getDestinationsNew(params: { province_slug?: string; country_code?: string; featured?: boolean } = {}): Promise<Destination[]> {
    const searchParams = new URLSearchParams()
    if (params.province_slug) searchParams.set('province_slug', params.province_slug)
    if (params.country_code) searchParams.set('country_code', params.country_code)
    if (params.featured) searchParams.set('featured', 'true')

    const response = await fetch(`${API_URL}/geography/destinations?${searchParams}`)
    if (!response.ok) throw new Error('Failed to fetch destinations')
    return response.json()
  },

  /**
   * Get destination by slug with details
   */
  async getDestinationBySlug(slug: string): Promise<Destination & { propertyCount: number }> {
    const response = await fetch(`${API_URL}/geography/destinations/${slug}`)
    if (!response.ok) throw new Error('Destination not found')
    return response.json()
  },

  // ============================================
  // CATEGORIES API METHODS
  // ============================================

  /**
   * Get all categories (grouped by type)
   */
  async getCategories(): Promise<CategoriesGrouped> {
    const response = await fetch(`${API_URL}/categories`)
    if (!response.ok) throw new Error('Failed to fetch categories')
    return response.json()
  },

  /**
   * Get categories by type
   */
  async getCategoriesByType(type: 'experience' | 'trip_type'): Promise<PropertyCategory[]> {
    const response = await fetch(`${API_URL}/categories?type=${type}`)
    if (!response.ok) throw new Error('Failed to fetch categories')
    return response.json()
  },

  /**
   * Get category by slug
   */
  async getCategoryBySlug(slug: string): Promise<PropertyCategory & { propertyCount: number }> {
    const response = await fetch(`${API_URL}/categories/${slug}`)
    if (!response.ok) throw new Error('Category not found')
    return response.json()
  },

  /**
   * Get properties in a category
   */
  async getCategoryProperties(slug: string, params: { sort?: string; limit?: number; offset?: number } = {}): Promise<{
    category: PropertyCategory
    properties: DiscoveryProperty[]
    total: number
  }> {
    const searchParams = new URLSearchParams()
    if (params.sort) searchParams.set('sort', params.sort)
    if (params.limit) searchParams.set('limit', String(params.limit))
    if (params.offset) searchParams.set('offset', String(params.offset))

    const response = await fetch(`${API_URL}/categories/${slug}/properties?${searchParams}`)
    if (!response.ok) throw new Error('Failed to fetch category properties')
    return response.json()
  },

  // ============================================
  // MAP API METHODS
  // ============================================

  /**
   * Get map markers (minimal property data for map display)
   */
  async getMapMarkers(params: {
    destination_slug?: string
    province_slug?: string
    country_code?: string
    categories?: string[]
    bounds?: { ne: { lat: number; lng: number }; sw: { lat: number; lng: number } }
  } = {}): Promise<{ markers: MapMarker[] }> {
    const searchParams = new URLSearchParams()
    if (params.destination_slug) searchParams.set('destination_slug', params.destination_slug)
    if (params.province_slug) searchParams.set('province_slug', params.province_slug)
    if (params.country_code) searchParams.set('country_code', params.country_code)
    if (params.categories?.length) searchParams.set('categories', params.categories.join(','))
    if (params.bounds) {
      searchParams.set('bounds_ne_lat', String(params.bounds.ne.lat))
      searchParams.set('bounds_ne_lng', String(params.bounds.ne.lng))
      searchParams.set('bounds_sw_lat', String(params.bounds.sw.lat))
      searchParams.set('bounds_sw_lng', String(params.bounds.sw.lng))
    }

    const response = await fetch(`${API_URL}/discovery/properties-map?${searchParams}`)
    if (!response.ok) throw new Error('Failed to fetch map markers')
    return response.json()
  }
}

export default discoveryApi

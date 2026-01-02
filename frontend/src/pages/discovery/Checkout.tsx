import { useState, useEffect, useCallback } from 'react'
import { useParams, useSearchParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { discoveryApi } from '../../services/discoveryApi'
import { useCustomerAuth } from '../../contexts/CustomerAuthContext'
import type { AppliedCoupon } from '../../components/CouponInput'
import type {
  PropertyDetail,
  Room,
  PricingResult,
  PaymentMethods,
  Addon,
  SelectedAddon
} from '../../services/discoveryApi'
import CheckoutProgress from '../../components/checkout/CheckoutProgress'
import DateRoomStep from '../../components/checkout/DateRoomStep'
import AddonsStep from '../../components/checkout/AddonsStep'
import GuestDetailsStep from '../../components/checkout/GuestDetailsStep'
import PaymentStep from '../../components/checkout/PaymentStep'

export interface SelectedRoomWithPricing {
  room: Room
  pricing: PricingResult | null
  adjustedTotal?: number // Guest-adjusted total based on pricing mode
  // Per-room guest configuration
  adults: number
  children: number
  childrenAges: number[]
}

export interface CheckoutState {
  step: 1 | 2 | 3 | 4
  // Step 1: Dates & Room
  checkIn: string
  checkOut: string
  // Total guests (computed from selectedRooms)
  guests: number
  adults: number
  children: number
  childrenAges: number[]
  // Selected rooms with per-room guest configuration
  selectedRooms: SelectedRoomWithPricing[]
  // Step 2: Addons
  selectedAddons: SelectedAddon[]
  // Step 3: Guest Details
  guestName: string
  guestEmail: string
  guestPhone: string
  specialRequests: string
  // Step 4: Payment
  selectedPaymentMethod: 'paystack' | 'eft' | 'paypal' | null
  // Coupon
  initialCouponCode: string
  couponApplicableRoomIds: string[]
  appliedCoupon: AppliedCoupon | null
  discountAmount: number
  // Totals
  roomTotal: number
  addonsTotal: number
  grandTotal: number
}

export default function Checkout() {
  const { slug } = useParams<{ slug: string }>()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  // Get logged-in customer data for pre-populating forms
  const { customer, isAuthenticated } = useCustomerAuth()

  // Property data
  const [property, setProperty] = useState<PropertyDetail | null>(null)
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethods | null>(null)
  const [availableAddons, setAvailableAddons] = useState<Addon[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Checkout state
  const [state, setState] = useState<CheckoutState>(() => {
    // Initialize from URL params
    const checkIn = searchParams.get('checkIn') || ''
    const checkOut = searchParams.get('checkOut') || ''
    const guests = parseInt(searchParams.get('guests') || '2')
    // Pre-fill guest details from URL params (e.g., from coupon claim)
    const guestName = searchParams.get('name') || ''
    const guestEmail = searchParams.get('email') || ''
    const guestPhone = searchParams.get('phone') || ''
    // Pre-fill coupon code from URL params
    const initialCouponCode = searchParams.get('coupon') || ''

    return {
      step: 1,
      checkIn,
      checkOut,
      guests,
      adults: 2,
      children: 0,
      childrenAges: [],
      selectedRooms: [],
      selectedAddons: [],
      guestName,
      guestEmail,
      guestPhone,
      specialRequests: '',
      selectedPaymentMethod: null,
      initialCouponCode,
      couponApplicableRoomIds: [],
      appliedCoupon: null,
      discountAmount: 0,
      roomTotal: 0,
      addonsTotal: 0,
      grandTotal: 0
    }
  })

  // Pre-populate guest details from logged-in customer profile
  // This runs once when customer data becomes available and fields are empty
  useEffect(() => {
    if (isAuthenticated && customer) {
      setState(prev => ({
        ...prev,
        // Only pre-fill if the field is empty (don't override URL params or user input)
        guestName: prev.guestName || customer.name || '',
        guestEmail: prev.guestEmail || customer.email || '',
        guestPhone: prev.guestPhone || customer.phone || ''
      }))
    }
  }, [isAuthenticated, customer])

  // Fetch property and payment methods
  useEffect(() => {
    if (!slug) return

    const fetchData = async () => {
      setLoading(true)
      setError(null)

      try {
        const [propertyData, paymentData, addonsData] = await Promise.all([
          discoveryApi.getProperty(slug),
          discoveryApi.getPaymentMethods(slug),
          discoveryApi.getAddons(slug)
        ])

        setProperty(propertyData)
        setPaymentMethods(paymentData)
        setAvailableAddons(addonsData.addons)

        // Pre-select room from URL if available
        const roomId = searchParams.get('room')
        if (roomId && propertyData.rooms) {
          const room = propertyData.rooms.find(r => r.id === roomId)
          if (room) {
            setState(prev => ({
              ...prev,
              selectedRooms: [{
                room,
                pricing: null,
                adults: 1,
                children: 0,
                childrenAges: []
              }]
            }))
          }
        }

        // Fetch coupon info if coupon code is provided in URL
        const couponCode = searchParams.get('coupon')
        if (couponCode) {
          const couponInfo = await discoveryApi.getCouponByCode(slug, couponCode)
          if (couponInfo?.applicable_room_ids && couponInfo.applicable_room_ids.length > 0) {
            setState(prev => ({
              ...prev,
              couponApplicableRoomIds: couponInfo.applicable_room_ids || []
            }))
          }
        }
      } catch (err) {
        console.error('Error fetching checkout data:', err)
        setError('Failed to load property details')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [slug, searchParams])

  // Calculate addons total when addons or dates change
  const calculateAddonsTotal = useCallback((addons: SelectedAddon[], nights: number, guests: number) => {
    return addons.reduce((total, { addon, quantity }) => {
      let addonPrice = addon.price * quantity

      switch (addon.pricingType) {
        case 'per_night':
          addonPrice = addon.price * quantity * nights
          break
        case 'per_guest':
          addonPrice = addon.price * quantity * guests
          break
        case 'per_guest_per_night':
          addonPrice = addon.price * quantity * guests * nights
          break
        case 'per_booking':
        default:
          addonPrice = addon.price * quantity
      }

      return total + addonPrice
    }, 0)
  }, [])

  // Update totals when pricing, addons, or coupon change
  useEffect(() => {
    // Sum up all selected rooms' adjusted totals (accounts for pricing mode and guests)
    // If adjustedTotal is set (calculated by DateRoomStep), use it; otherwise fall back to backend subtotal
    const roomTotal = state.selectedRooms.reduce((total, { pricing, adjustedTotal }) => {
      // Use adjustedTotal if available (calculated based on pricing mode and guests)
      // Otherwise use backend subtotal (for per_unit rooms or fallback)
      return total + (adjustedTotal !== undefined ? adjustedTotal : (pricing?.subtotal || 0))
    }, 0)
    // Get nights from first room's pricing (all rooms have same dates)
    const nights = state.selectedRooms[0]?.pricing?.night_count || 0
    const addonsTotal = calculateAddonsTotal(state.selectedAddons, nights, state.guests)
    const discountAmount = state.appliedCoupon?.discount_amount || 0
    const grandTotal = Math.max(0, roomTotal + addonsTotal - discountAmount)

    setState(prev => ({
      ...prev,
      roomTotal,
      addonsTotal,
      discountAmount,
      grandTotal
    }))
  }, [state.selectedRooms, state.selectedAddons, state.guests, state.appliedCoupon, calculateAddonsTotal])

  // Navigation handlers
  const nextStep = () => {
    setState(prev => ({
      ...prev,
      step: Math.min(prev.step + 1, 4) as 1 | 2 | 3 | 4
    }))
  }

  const prevStep = () => {
    setState(prev => ({
      ...prev,
      step: Math.max(prev.step - 1, 1) as 1 | 2 | 3 | 4
    }))
  }

  // State update handlers
  const updateState = (updates: Partial<CheckoutState>) => {
    setState(prev => ({ ...prev, ...updates }))
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-600 mx-auto mb-3" />
          <p className="text-gray-600">Loading checkout...</p>
        </div>
      </div>
    )
  }

  if (error || !property) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error || 'Property not found'}</p>
          <button
            onClick={() => navigate(-1)}
            className="text-emerald-600 hover:underline"
          >
            Go back
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-gradient-to-r from-accent-600 to-accent-500 shadow-lg sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 py-5">
          <div className="flex items-center gap-4">
            <button
              onClick={() => state.step === 1 ? navigate(-1) : prevStep()}
              className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
              aria-label="Go back"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-xl font-bold text-white">Complete your booking</h1>
              <p className="text-sm text-white/70">{property.name}</p>
            </div>
          </div>
        </div>
      </header>

      {/* Progress indicator */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-4xl mx-auto px-4 py-3">
          <CheckoutProgress currentStep={state.step} />
        </div>
      </div>

      {/* Main content */}
      <main className="max-w-4xl mx-auto px-4 py-6">
        {state.step === 1 && (
          <DateRoomStep
            property={property}
            state={state}
            updateState={updateState}
            onNext={nextStep}
          />
        )}

        {state.step === 2 && (
          <AddonsStep
            addons={availableAddons}
            state={state}
            updateState={updateState}
            onNext={nextStep}
            onBack={prevStep}
          />
        )}

        {state.step === 3 && (
          <GuestDetailsStep
            state={state}
            updateState={updateState}
            onNext={nextStep}
            onBack={prevStep}
          />
        )}

        {state.step === 4 && (
          <PaymentStep
            property={property}
            paymentMethods={paymentMethods}
            state={state}
            updateState={updateState}
            onBack={prevStep}
          />
        )}
      </main>
    </div>
  )
}

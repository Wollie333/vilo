import { useState, useEffect, useCallback } from 'react'
import { useParams, useSearchParams, useNavigate, Link } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
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
import CheckoutLayout from '../../components/checkout/CheckoutLayout'
import DateRoomStep from '../../components/checkout/DateRoomStep'
import AddonsStep from '../../components/checkout/AddonsStep'
import GuestDetailsStep from '../../components/checkout/GuestDetailsStep'
import PaymentStep from '../../components/checkout/PaymentStep'

export interface SelectedRoomWithPricing {
  room: Room
  pricing: PricingResult | null
  adjustedTotal?: number
  adults: number
  children: number
  childrenAges: number[]
}

export interface CheckoutState {
  step: 1 | 2 | 3 | 4
  checkIn: string
  checkOut: string
  guests: number
  adults: number
  children: number
  childrenAges: number[]
  selectedRooms: SelectedRoomWithPricing[]
  selectedAddons: SelectedAddon[]
  guestName: string
  guestEmail: string
  guestPhone: string
  specialRequests: string
  selectedPaymentMethod: 'paystack' | 'eft' | 'paypal' | null
  initialCouponCode: string
  couponApplicableRoomIds: string[]
  appliedCoupon: AppliedCoupon | null
  discountAmount: number
  roomTotal: number
  addonsTotal: number
  grandTotal: number
}

export default function PortalCheckout() {
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
    const checkIn = searchParams.get('checkIn') || ''
    const checkOut = searchParams.get('checkOut') || ''
    const guests = parseInt(searchParams.get('guests') || '2')
    const guestName = searchParams.get('name') || ''
    const guestEmail = searchParams.get('email') || ''
    const guestPhone = searchParams.get('phone') || ''
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
  useEffect(() => {
    if (isAuthenticated && customer) {
      setState(prev => ({
        ...prev,
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
    const roomTotal = state.selectedRooms.reduce((total, { pricing, adjustedTotal }) => {
      return total + (adjustedTotal !== undefined ? adjustedTotal : (pricing?.subtotal || 0))
    }, 0)
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

  // Go to specific step (for clicking on completed steps)
  const goToStep = (step: number) => {
    if (step >= 1 && step <= 4 && step < state.step) {
      setState(prev => ({
        ...prev,
        step: step as 1 | 2 | 3 | 4
      }))
    }
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-8">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error || 'Property not found'}</p>
          <Link
            to="/portal/bookings/browse"
            className="text-emerald-600 hover:underline"
          >
            Back to Browse
          </Link>
        </div>
      </div>
    )
  }

  // Determine next button label and disabled state based on current step
  const getNextConfig = () => {
    switch (state.step) {
      case 1:
        const canContinue = state.selectedRooms.length > 0 &&
          state.checkIn &&
          state.checkOut &&
          state.selectedRooms.every(r => r.pricing !== null)
        return { label: 'Continue', disabled: !canContinue }
      case 2:
        return { label: 'Continue', disabled: false }
      case 3:
        const hasRequiredFields = state.guestName && state.guestEmail && state.guestPhone
        return { label: 'Continue to Payment', disabled: !hasRequiredFields }
      case 4:
        return { label: 'Complete Booking', disabled: !state.selectedPaymentMethod }
      default:
        return { label: 'Continue', disabled: false }
    }
  }

  const nextConfig = getNextConfig()

  return (
    <CheckoutLayout
      property={property}
      state={state}
      currentStep={state.step}
      onBack={state.step === 1 ? () => navigate(`/portal/bookings/browse/${slug}`) : prevStep}
      onNext={nextStep}
      onStepClick={goToStep}
      nextLabel={nextConfig.label}
      nextDisabled={nextConfig.disabled}
    >
      {state.step === 1 && (
        <DateRoomStep
          property={property}
          state={state}
          updateState={updateState}
        />
      )}

      {state.step === 2 && (
        <AddonsStep
          addons={availableAddons}
          state={state}
          updateState={updateState}
        />
      )}

      {state.step === 3 && (
        <GuestDetailsStep
          state={state}
          updateState={updateState}
          onNext={nextStep}
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
    </CheckoutLayout>
  )
}

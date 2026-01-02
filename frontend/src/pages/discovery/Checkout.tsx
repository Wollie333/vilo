import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useSearchParams, useNavigate } from 'react-router-dom'
import { Loader2, AlertTriangle } from 'lucide-react'
import { discoveryApi } from '../../services/discoveryApi'
import { trackingService } from '../../services/trackingService'
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

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3002/api'

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

  // Track booking ID for abandoned checkout detection
  const [currentBookingId, setCurrentBookingId] = useState<string | null>(null)
  const [paymentCompleted, setPaymentCompleted] = useState(false)
  const paymentCompletedRef = useRef(false)
  const currentBookingIdRef = useRef<string | null>(null)

  // Retry flow state
  const [retryBookingId, setRetryBookingId] = useState<string | null>(null)
  const [retryPricingChanged, setRetryPricingChanged] = useState(false)
  const [retryOriginalTotal, setRetryOriginalTotal] = useState<number>(0)
  const [retryNewTotal, setRetryNewTotal] = useState<number>(0)
  const [pendingRetryData, setPendingRetryData] = useState<any>(null) // Store retry data until property loads

  // Keep refs in sync with state
  useEffect(() => {
    paymentCompletedRef.current = paymentCompleted
    currentBookingIdRef.current = currentBookingId
  }, [paymentCompleted, currentBookingId])

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
    // Check if this is a retry - start on step 4
    const isRetry = searchParams.get('retry') !== null

    return {
      step: isRetry ? 4 : 1,
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

  // Beforeunload handler - mark booking as abandoned if user leaves during payment step
  useEffect(() => {
    const handleBeforeUnload = () => {
      // Only mark as abandoned if:
      // 1. We're on the payment step (step 4)
      // 2. A booking has been created
      // 3. Payment hasn't been completed
      if (state.step === 4 && currentBookingIdRef.current && !paymentCompletedRef.current) {
        // Use sendBeacon for reliable delivery even during page unload
        navigator.sendBeacon(
          `${API_URL}/discovery/bookings/${currentBookingIdRef.current}/abandon`,
          JSON.stringify({})
        )
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [state.step])

  // Retry flow: Check for retry URL param and load checkout data
  useEffect(() => {
    const retryId = searchParams.get('retry')
    if (!retryId || !slug) return

    setRetryBookingId(retryId)

    const loadRetryData = async () => {
      try {
        // Check retry availability
        const response = await fetch(`${API_URL}/discovery/bookings/${retryId}/retry-availability`)
        const data = await response.json()

        if (!response.ok) {
          if (data.error === 'expired') {
            setError('This booking has expired. The check-in date has passed.')
          } else if (data.error === 'already_completed') {
            setError('This booking has already been completed.')
          } else if (data.error === 'too_many_retries') {
            setError('Too many payment attempts. Please contact support.')
          } else {
            setError(data.message || 'Unable to retry this booking')
          }
          setLoading(false)
          return
        }

        // Check if rooms are unavailable
        if (!data.available) {
          setError(`Some rooms are no longer available: ${data.unavailable_rooms.join(', ')}. Please start a new booking.`)
          setLoading(false)
          return
        }

        // Store the checkout data for processing after property loads
        // (Pricing change detection happens in processRetryData after we fetch current prices)
        const checkoutData = data.checkout_data
        if (checkoutData) {
          setPendingRetryData(checkoutData)
          // Pre-fill basic fields immediately
          setState(prev => ({
            ...prev,
            checkIn: checkoutData.check_in || prev.checkIn,
            checkOut: checkoutData.check_out || prev.checkOut,
            guests: checkoutData.guests || prev.guests,
            guestName: checkoutData.guest_name || prev.guestName,
            guestEmail: checkoutData.guest_email || prev.guestEmail,
            guestPhone: checkoutData.guest_phone || prev.guestPhone,
            specialRequests: checkoutData.special_requests || prev.specialRequests
          }))
        }
      } catch (err) {
        console.error('Error loading retry data:', err)
        setError('Failed to load booking data for retry')
        setLoading(false)
      }
    }

    loadRetryData()
  }, [slug, searchParams])

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

        // Track checkout page view for analytics
        if (propertyData.tenantId) {
          trackingService.init({ tenantId: propertyData.tenantId })
          trackingService.trackPageView('checkout')
          trackingService.trackEvent('checkout_started', 'conversion')
        }

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

  // Process pending retry data after property and addons are loaded
  useEffect(() => {
    if (!pendingRetryData || !property || availableAddons.length === 0) return

    const processRetryData = async () => {
      try {
        const checkoutData = pendingRetryData
        const roomIds = checkoutData.room_ids || [checkoutData.room_id]
        const roomDetails = checkoutData.room_details || []

        // Match rooms from checkout_data to property rooms and get pricing
        const selectedRoomsWithPricing: SelectedRoomWithPricing[] = []

        for (const roomId of roomIds) {
          const room = property.rooms?.find(r => r.id === roomId)
          if (!room) continue

          // Find room details for guest counts
          const detail = roomDetails.find((d: any) => d.room_id === roomId)
          const adults = detail?.adults || 1
          const children = detail?.children || 0
          const childrenAges = detail?.children_ages || []

          // Fetch current pricing for this room
          let pricing: PricingResult | null = null
          try {
            pricing = await discoveryApi.getPricing(
              property.slug!,
              roomId,
              checkoutData.check_in,
              checkoutData.check_out
            )
          } catch (e) {
            console.error('Error fetching pricing for retry room:', e)
          }

          selectedRoomsWithPricing.push({
            room,
            pricing,
            adjustedTotal: pricing?.subtotal || detail?.total || 0,
            adults,
            children,
            childrenAges
          })
        }

        // Match addons from checkout_data to available addons
        const selectedAddons: SelectedAddon[] = []
        const checkoutAddons = checkoutData.addons || []
        let addonPricesChanged = false

        for (const savedAddon of checkoutAddons) {
          const addon = availableAddons.find(a => a.id === savedAddon.id)
          if (addon) {
            // Check if addon price changed
            if (addon.price !== savedAddon.price) {
              addonPricesChanged = true
            }
            selectedAddons.push({
              addon,
              quantity: savedAddon.quantity || 1
            })
          }
        }

        // Calculate new totals
        const newRoomTotal = selectedRoomsWithPricing.reduce((sum, r) => sum + (r.pricing?.subtotal || 0), 0)
        const newAddonTotal = selectedAddons.reduce((sum, { addon, quantity }) => sum + (addon.price * quantity), 0)
        const newTotal = newRoomTotal + newAddonTotal

        // Calculate original totals from room_details and addons (not from total_amount which may include fees)
        const originalRoomTotal = roomDetails.reduce((sum: number, d: any) => sum + (d.total || 0), 0)
        const originalAddonTotal = checkoutAddons.reduce((sum: number, a: any) => sum + ((a.price || 0) * (a.quantity || 1)), 0)
        const originalTotal = originalRoomTotal + originalAddonTotal

        // Check if there's a meaningful price difference (more than 1 ZAR)
        const priceDifference = Math.abs(newTotal - originalTotal)
        const hasPriceChanged = priceDifference > 1

        // Only show pricing changed notification if actual prices changed
        if (hasPriceChanged) {
          setRetryPricingChanged(true)
          setRetryOriginalTotal(originalTotal)
          setRetryNewTotal(newTotal)
        } else {
          // Clear any previously set pricing change
          setRetryPricingChanged(false)
        }

        // Update state with all the pre-filled data
        setState(prev => ({
          ...prev,
          selectedRooms: selectedRoomsWithPricing,
          selectedAddons,
          // Ensure we have the basic fields too
          checkIn: checkoutData.check_in || prev.checkIn,
          checkOut: checkoutData.check_out || prev.checkOut,
          guests: checkoutData.guests || prev.guests,
          guestName: checkoutData.guest_name || prev.guestName,
          guestEmail: checkoutData.guest_email || prev.guestEmail,
          guestPhone: checkoutData.guest_phone || prev.guestPhone,
          specialRequests: checkoutData.special_requests || prev.specialRequests
          // step is already set to 4 in initial state for retry
        }))

        // Clear pending data
        setPendingRetryData(null)
      } catch (err) {
        console.error('Error processing retry data:', err)
        setError('Failed to restore booking data')
      }
    }

    processRetryData()
  }, [pendingRetryData, property, availableAddons])

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

  // Pricing change notice for retry flow
  const pricingChangeNotice = retryPricingChanged && retryBookingId && (
    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4 flex items-start gap-3">
      <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
      <div>
        <p className="font-medium text-amber-800">Pricing has changed</p>
        <p className="text-sm text-amber-700 mt-1">
          The original price was {property?.currency || 'ZAR'} {retryOriginalTotal.toLocaleString()}.
          The new price is <strong>{property?.currency || 'ZAR'} {retryNewTotal.toLocaleString()}</strong>.
        </p>
      </div>
    </div>
  )

  return (
    <CheckoutLayout
      property={property}
      state={state}
      currentStep={state.step}
      onBack={state.step === 1 ? () => navigate(-1) : prevStep}
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
        <>
          {pricingChangeNotice}
          <PaymentStep
            property={property}
            paymentMethods={paymentMethods}
            state={state}
            updateState={updateState}
            onBack={prevStep}
            onBookingCreated={setCurrentBookingId}
            onPaymentCompleted={() => setPaymentCompleted(true)}
            retryBookingId={retryBookingId}
          />
        </>
      )}
    </CheckoutLayout>
  )
}

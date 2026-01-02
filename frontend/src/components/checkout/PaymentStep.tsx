import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  CreditCard,
  Building2,
  Shield,
  Loader2,
  AlertCircle,
  Tag,
  Check,
  ArrowLeft
} from 'lucide-react'
import { discoveryApi } from '../../services/discoveryApi'
import CouponInput from '../CouponInput'
import { couponsApi } from '../../services/api'
import type { PropertyDetail, PaymentMethods } from '../../services/discoveryApi'
import type { CheckoutState } from '../../pages/discovery/Checkout'
import { setCustomerToken } from '../../services/portalApi'
import { useCustomerAuth } from '../../contexts/CustomerAuthContext'
import EFTInstructions from './EFTInstructions'
import PaystackPayment from './PaystackPayment'
import TermsAcceptance from '../TermsAcceptance'
import StepContainer from './StepContainer'

interface PaymentStepProps {
  property: PropertyDetail
  paymentMethods: PaymentMethods | null
  state: CheckoutState
  updateState: (updates: Partial<CheckoutState>) => void
  onBack: () => void
  onBookingCreated?: (bookingId: string) => void
  onPaymentCompleted?: () => void
  retryBookingId?: string | null
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3002/api'

export default function PaymentStep({
  property,
  paymentMethods,
  state,
  updateState,
  onBack,
  onBookingCreated,
  onPaymentCompleted,
  retryBookingId
}: PaymentStepProps) {
  const navigate = useNavigate()
  const { refreshCustomer } = useCustomerAuth()
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showEFTInstructions, setShowEFTInstructions] = useState(false)
  const [bookingReference, setBookingReference] = useState<string | null>(null)
  const [bookingId, setBookingId] = useState<string | null>(null)
  const [termsAccepted, setTermsAccepted] = useState(false)

  // Reset terms when component mounts
  useEffect(() => {
    setTermsAccepted(false)
  }, [])

  // For retry bookings, set the booking ID immediately
  useEffect(() => {
    if (retryBookingId) {
      setBookingId(retryBookingId)
    }
  }, [retryBookingId])

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: paymentMethods?.currency || 'ZAR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price)
  }

  const nights = state.selectedRooms[0]?.pricing?.night_count || 0
  const hasPaymentMethods = paymentMethods?.hasPaymentMethods

  const createBooking = async () => {
    setProcessing(true)
    setError(null)

    try {
      // Calculate total guests from all rooms
      const totalGuests = state.selectedRooms.reduce(
        (sum, r) => sum + (r.adults || 1) + (r.children || 0), 0
      )

      // Build per-room guest details
      const roomDetails = state.selectedRooms.map(r => ({
        room_id: r.room.id,
        room_name: r.room.name,
        adults: r.adults || 1,
        children: r.children || 0,
        children_ages: r.childrenAges || [],
        total: r.adjustedTotal || r.pricing?.subtotal || 0
      }))

      const primaryRoom = state.selectedRooms[0]
      const bookingData: any = {
        property_slug: property.slug!,
        guest_name: state.guestName,
        guest_email: state.guestEmail,
        guest_phone: state.guestPhone || undefined,
        room_id: primaryRoom.room.id,
        room_ids: state.selectedRooms.map(r => r.room.id),
        room_details: roomDetails,
        check_in: state.checkIn,
        check_out: state.checkOut,
        guests: totalGuests,
        addons: state.selectedAddons.map(sa => ({
          id: sa.addon.id,
          name: sa.addon.name,
          quantity: sa.quantity,
          price: sa.addon.price,
          total: sa.addon.price * sa.quantity
        })),
        special_requests: state.specialRequests || undefined,
        total_amount: state.grandTotal,
        currency: paymentMethods?.currency || 'ZAR'
      }

      // Add coupon data if applied
      if (state.appliedCoupon) {
        bookingData.coupon = {
          id: state.appliedCoupon.id,
          code: state.appliedCoupon.code,
          name: state.appliedCoupon.name,
          discount_type: state.appliedCoupon.discount_type,
          discount_value: state.appliedCoupon.discount_value,
          discount_amount: state.appliedCoupon.discount_amount,
        }
        bookingData.subtotal_before_discount = state.roomTotal + state.addonsTotal
        bookingData.discount_amount = state.discountAmount
      }

      const response = await discoveryApi.createBooking(bookingData)

      if (response.success) {
        setBookingReference(response.booking.reference)
        setBookingId(response.booking.id)

        // Notify parent of booking creation (for abandon tracking)
        if (onBookingCreated) {
          onBookingCreated(response.booking.id)
        }

        // Auto-login customer with the session token
        if (response.token) {
          setCustomerToken(response.token)
          await refreshCustomer()
        }

        return response
      } else {
        throw new Error('Booking creation failed')
      }
    } catch (err) {
      console.error('Booking error:', err)
      setError(err instanceof Error ? err.message : 'Failed to create booking')
      throw err
    } finally {
      setProcessing(false)
    }
  }

  const handlePaystackSuccess = async (_bId: string) => {
    // Notify parent that payment is complete (stops abandon tracking)
    if (onPaymentCompleted) {
      onPaymentCompleted()
    }
    // Booking was created and paid - redirect to customer portal bookings list
    navigate('/portal/bookings')
  }

  // Prepare retry - update existing booking with new pricing and increment retry count
  const prepareRetry = async (): Promise<{ bookingId: string; reference: string }> => {
    setProcessing(true)
    setError(null)

    try {
      const response = await fetch(`${API_URL}/discovery/bookings/${retryBookingId}/prepare-retry`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          total_amount: state.grandTotal,
          room_details: state.selectedRooms.map(r => ({
            room_id: r.room.id,
            room_name: r.room.name,
            adults: r.adults || 1,
            children: r.children || 0,
            children_ages: r.childrenAges || [],
            total: r.adjustedTotal || r.pricing?.subtotal || 0
          })),
          addons: state.selectedAddons.map(sa => ({
            id: sa.addon.id,
            name: sa.addon.name,
            quantity: sa.quantity,
            price: sa.addon.price,
            total: sa.addon.price * sa.quantity
          }))
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to prepare retry')
      }

      setBookingReference(data.reference)
      return { bookingId: retryBookingId!, reference: data.reference }
    } catch (err) {
      console.error('Prepare retry error:', err)
      setError(err instanceof Error ? err.message : 'Failed to prepare retry')
      throw err
    } finally {
      setProcessing(false)
    }
  }

  const handleEFTPayment = async () => {
    try {
      if (retryBookingId) {
        // For retry, just prepare the retry (updates pricing/retry count)
        await prepareRetry()
        setShowEFTInstructions(true)
      } else {
        const response = await createBooking()
        if (response.success) {
          setShowEFTInstructions(true)
        }
      }
    } catch (err) {
      // Error already set
    }
  }

  const handlePaystackPayment = async (): Promise<{ bookingId: string } | void> => {
    try {
      if (retryBookingId) {
        // For retry, prepare the retry and return existing booking ID
        const result = await prepareRetry()
        return { bookingId: result.bookingId }
      } else {
        const response = await createBooking()
        if (response.success) {
          return { bookingId: response.booking.id }
        }
      }
    } catch (err) {
      // Error already set
      throw err
    }
  }

  // Show EFT instructions after booking created
  if (showEFTInstructions && bookingReference && paymentMethods?.methods.eft) {
    return (
      <EFTInstructions
        eft={paymentMethods.methods.eft}
        bookingReference={bookingReference}
        amount={state.grandTotal}
        currency={paymentMethods.currency}
        onComplete={() => {
          navigate('/portal/bookings')
        }}
      />
    )
  }

  return (
    <StepContainer
      title="Payment"
      subtitle="Complete your booking securely"
      icon={CreditCard}
    >
      {/* Error Alert */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3 text-red-700 animate-fade-in">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span className="text-sm">{error}</span>
        </div>
      )}

      {/* Promo Code Card */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-center gap-2 mb-4">
          <Tag className="w-5 h-5 text-gray-400" />
          <h3 className="text-lg font-semibold text-gray-900">Promo Code</h3>
          <span className="text-xs text-gray-400">(optional)</span>
        </div>

        <CouponInput
          onApply={async (code) => {
            const roomIds = state.selectedRooms.map(r => r.room.id)
            const result = await couponsApi.validate({
              code,
              room_ids: roomIds,
              subtotal: state.roomTotal + state.addonsTotal,
              nights: state.selectedRooms[0]?.pricing?.night_count || 0,
              check_in: state.checkIn,
              check_out: state.checkOut,
              customer_email: state.guestEmail,
            })
            if (result.valid && result.coupon && result.discount_amount !== undefined) {
              updateState({
                appliedCoupon: {
                  ...result.coupon,
                  discount_amount: result.discount_amount,
                }
              })
            }
            return result
          }}
          onRemove={() => updateState({ appliedCoupon: null })}
          appliedCoupon={state.appliedCoupon}
          currency={paymentMethods?.currency || 'ZAR'}
          disabled={!state.checkIn || !state.checkOut || state.selectedRooms.length === 0}
          initialCode={state.initialCouponCode}
        />

        {/* Applied Coupon Display */}
        {state.appliedCoupon && (
          <div className="mt-4 p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-600" />
              <span className="text-sm font-medium text-emerald-700">
                {state.appliedCoupon.code} applied
              </span>
            </div>
            <span className="text-sm font-semibold text-emerald-700">
              -{formatPrice(state.discountAmount)}
            </span>
          </div>
        )}
      </div>

      {/* Payment Methods Card */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-5">Payment Method</h3>

        {!hasPaymentMethods ? (
          <div className="text-center py-8">
            <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
              <CreditCard className="w-6 h-6 text-gray-400" />
            </div>
            <p className="text-gray-500">No payment methods available for this property.</p>
            <p className="text-sm text-gray-400 mt-1">Please contact the property directly.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Paystack (Card Payment) */}
            {paymentMethods?.methods.paystack && (
              <button
                type="button"
                onClick={() => updateState({ selectedPaymentMethod: 'paystack' })}
                className={`
                  w-full p-4 rounded-xl border-2 text-left transition-all
                  ${state.selectedPaymentMethod === 'paystack'
                    ? 'border-emerald-600 bg-emerald-50 shadow-sm'
                    : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
                  }
                `}
              >
                <div className="flex items-center gap-4">
                  <div className={`
                    w-12 h-12 rounded-xl flex items-center justify-center transition-colors
                    ${state.selectedPaymentMethod === 'paystack' ? 'bg-emerald-100' : 'bg-gray-100'}
                  `}>
                    <CreditCard className={`w-6 h-6 ${state.selectedPaymentMethod === 'paystack' ? 'text-emerald-600' : 'text-gray-500'}`} />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">Pay with Card</p>
                    <p className="text-sm text-gray-500">Visa, Mastercard, or local cards</p>
                  </div>
                  <div className={`
                    w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all
                    ${state.selectedPaymentMethod === 'paystack'
                      ? 'border-emerald-600 bg-emerald-600'
                      : 'border-gray-300'
                    }
                  `}>
                    {state.selectedPaymentMethod === 'paystack' && (
                      <Check className="w-4 h-4 text-white" />
                    )}
                  </div>
                </div>
              </button>
            )}

            {/* EFT */}
            {paymentMethods?.methods.eft && (
              <button
                type="button"
                onClick={() => updateState({ selectedPaymentMethod: 'eft' })}
                className={`
                  w-full p-4 rounded-xl border-2 text-left transition-all
                  ${state.selectedPaymentMethod === 'eft'
                    ? 'border-emerald-600 bg-emerald-50 shadow-sm'
                    : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
                  }
                `}
              >
                <div className="flex items-center gap-4">
                  <div className={`
                    w-12 h-12 rounded-xl flex items-center justify-center transition-colors
                    ${state.selectedPaymentMethod === 'eft' ? 'bg-blue-100' : 'bg-gray-100'}
                  `}>
                    <Building2 className={`w-6 h-6 ${state.selectedPaymentMethod === 'eft' ? 'text-blue-600' : 'text-gray-500'}`} />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">Bank Transfer (EFT)</p>
                    <p className="text-sm text-gray-500">Pay directly to bank account</p>
                  </div>
                  <div className={`
                    w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all
                    ${state.selectedPaymentMethod === 'eft'
                      ? 'border-emerald-600 bg-emerald-600'
                      : 'border-gray-300'
                    }
                  `}>
                    {state.selectedPaymentMethod === 'eft' && (
                      <Check className="w-4 h-4 text-white" />
                    )}
                  </div>
                </div>
              </button>
            )}

            {/* PayPal - Coming Soon */}
            {paymentMethods?.methods.paypal && (
              <div
                className="w-full p-4 rounded-xl border-2 border-gray-200 opacity-50 cursor-not-allowed"
                title="PayPal coming soon"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center">
                    <span className="text-blue-600 font-bold text-sm">PP</span>
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">PayPal</p>
                    <p className="text-sm text-gray-500">Coming soon</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Cancellation Policy */}
      {property.cancellationPolicies && property.cancellationPolicies.length > 0 && (
        <div className="bg-gray-50 rounded-xl border border-gray-200 p-5">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center flex-shrink-0">
              <Shield className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="font-medium text-gray-900">Cancellation Policy</p>
              <p className="text-sm text-gray-600 mt-1">
                {property.cancellationPolicies[0].label}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Terms Acceptance Card */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <TermsAcceptance
          accepted={termsAccepted}
          onChange={setTermsAccepted}
        />
      </div>

      {/* Action Buttons - Desktop Only */}
      <div className="hidden lg:flex justify-between items-center pt-2">
        <button
          onClick={onBack}
          disabled={processing}
          className="px-6 py-3 rounded-xl font-medium border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          Back
        </button>

        {state.selectedPaymentMethod === 'paystack' && paymentMethods?.methods.paystack ? (
          <PaystackPayment
            publicKey={paymentMethods.methods.paystack.publicKey}
            email={state.guestEmail}
            amount={state.grandTotal}
            currency={paymentMethods.currency}
            onSuccess={handlePaystackSuccess}
            onClose={() => {}}
            disabled={processing || !state.selectedPaymentMethod || !termsAccepted}
            onBeforePayment={handlePaystackPayment}
            bookingRef={bookingReference}
            bookingId={bookingId}
          />
        ) : (
          <button
            onClick={state.selectedPaymentMethod === 'eft' ? handleEFTPayment : undefined}
            disabled={processing || !state.selectedPaymentMethod || !termsAccepted}
            className={`
              px-8 py-3 rounded-xl font-medium transition-all flex items-center gap-2
              ${state.selectedPaymentMethod && termsAccepted
                ? 'bg-black text-white hover:bg-gray-800'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }
            `}
          >
            {processing && <Loader2 className="w-4 h-4 animate-spin" />}
            {processing ? 'Processing...' : `Pay Now ${formatPrice(state.grandTotal)}`}
          </button>
        )}
      </div>

      {/* Mobile Action Buttons - Show only on mobile at the bottom of content */}
      <div className="lg:hidden flex items-center gap-3">
        <button
          onClick={onBack}
          disabled={processing}
          className="flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors disabled:opacity-50"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>

        <div className="flex-1">
          {state.selectedPaymentMethod === 'paystack' && paymentMethods?.methods.paystack ? (
            <PaystackPayment
              publicKey={paymentMethods.methods.paystack.publicKey}
              email={state.guestEmail}
              amount={state.grandTotal}
              currency={paymentMethods.currency}
              onSuccess={handlePaystackSuccess}
              onClose={() => {}}
              disabled={processing || !state.selectedPaymentMethod || !termsAccepted}
              onBeforePayment={handlePaystackPayment}
              bookingRef={bookingReference}
              bookingId={bookingId}
            />
          ) : (
            <button
              onClick={state.selectedPaymentMethod === 'eft' ? handleEFTPayment : undefined}
              disabled={processing || !state.selectedPaymentMethod || !termsAccepted}
              className={`
                w-full py-4 rounded-xl font-medium transition-all flex items-center justify-center gap-2
                ${state.selectedPaymentMethod && termsAccepted
                  ? 'bg-black text-white hover:bg-gray-800'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }
              `}
            >
              {processing && <Loader2 className="w-4 h-4 animate-spin" />}
              {processing ? 'Processing...' : `Pay Now ${formatPrice(state.grandTotal)}`}
            </button>
          )}
        </div>
      </div>
    </StepContainer>
  )
}

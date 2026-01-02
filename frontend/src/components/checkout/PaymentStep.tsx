import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  CreditCard,
  Building2,
  Shield,
  Loader2,
  AlertCircle,
  Tag
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

interface PaymentStepProps {
  property: PropertyDetail
  paymentMethods: PaymentMethods | null
  state: CheckoutState
  updateState: (updates: Partial<CheckoutState>) => void
  onBack: () => void
}

export default function PaymentStep({
  property,
  paymentMethods,
  state,
  updateState,
  onBack
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

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: paymentMethods?.currency || 'ZAR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price)
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-ZA', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    })
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
    // Booking was created and paid - redirect to customer portal bookings list
    navigate('/portal/bookings')
  }

  const handleEFTPayment = async () => {
    try {
      const response = await createBooking()
      if (response.success) {
        setShowEFTInstructions(true)
      }
    } catch (err) {
      // Error already set in createBooking
    }
  }

  const handlePaystackPayment = async (): Promise<{ bookingId: string } | void> => {
    try {
      const response = await createBooking()
      if (response.success) {
        return { bookingId: response.booking.id }
      }
    } catch (err) {
      // Error already set in createBooking
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
    <div className="space-y-6">
      {/* Property & Dates Header */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="flex gap-4 p-4">
          {/* Property Thumbnail */}
          {property.images[0] && (
            <div className="w-24 h-24 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100">
              <img
                src={property.images[0]}
                alt={property.name}
                className="w-full h-full object-cover"
              />
            </div>
          )}
          {/* Property Info & Dates */}
          <div className="flex-1 min-w-0">
            <h2 className="font-semibold text-gray-900 text-lg">{property.name}</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              {property.location.city}{property.location.region ? `, ${property.location.region}` : ''}
            </p>
            <div className="mt-2 text-sm">
              <span className="font-medium text-gray-900">{formatDate(state.checkIn)}</span>
              <span className="text-gray-400 mx-2">→</span>
              <span className="font-medium text-gray-900">{formatDate(state.checkOut)}</span>
              <span className="text-gray-500 ml-2">({nights} night{nights !== 1 ? 's' : ''})</span>
            </div>
          </div>
        </div>
      </div>

      {/* Booking Summary - Same style as DateRoomStep */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-gray-900">Booking summary</h2>
          <div className="text-sm font-medium px-2 py-1 rounded-full bg-emerald-100 text-emerald-700">
            {state.selectedRooms.reduce((sum, r) => sum + (r.adults || 1) + (r.children || 0), 0)} guest{state.selectedRooms.reduce((sum, r) => sum + (r.adults || 1) + (r.children || 0), 0) !== 1 ? 's' : ''} total
          </div>
        </div>

        <div className="space-y-4">
          {state.selectedRooms.map(({ room, pricing, adjustedTotal, adults, children, childrenAges }) => {
            const roomNights = pricing?.night_count || nights
            const avgNightlyRate = pricing && roomNights > 0 ? pricing.subtotal / roomNights : room.basePrice
            const hasSeasonalRate = pricing?.nights?.some(n => n.rate_name)
            const pricingMode = room.pricingMode || 'per_unit'
            const childAgeLimit = room.childAgeLimit || 12
            const childFreeUntilAge = room.childFreeUntilAge || 0
            const childPrice = room.childPricePerNight

            // Calculate guest breakdown using THIS ROOM's guests
            const roomAdults = adults || 1
            const roomChildren = children || 0
            const roomChildrenAges = childrenAges || []
            const freeChildren = roomChildrenAges.filter(age => age < childFreeUntilAge).length
            const payingChildren = roomChildrenAges.filter(age => age >= childFreeUntilAge && age < childAgeLimit).length
            const childrenAsAdults = roomChildrenAges.filter(age => age >= childAgeLimit).length
            const totalAdults = roomAdults + childrenAsAdults
            const roomTotalGuests = roomAdults + roomChildren

            // Use adjustedTotal if available, otherwise fall back to backend subtotal
            const displayTotal = adjustedTotal !== undefined ? adjustedTotal : (pricing?.subtotal || 0)

            return (
              <div key={room.id} className="border-b border-gray-100 pb-3 last:border-0 last:pb-0">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <span className="font-medium text-gray-900">{room.name}</span>
                    <span className="ml-2 text-xs text-gray-500">
                      ({roomTotalGuests} guest{roomTotalGuests !== 1 ? 's' : ''})
                    </span>
                    {hasSeasonalRate && (
                      <span className="ml-2 text-xs bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded">
                        Seasonal rate
                      </span>
                    )}
                  </div>
                  <span className="font-semibold text-gray-900">
                    {formatPrice(displayTotal)}
                  </span>
                </div>

                {/* Detailed breakdown */}
                <div className="text-sm text-gray-500 space-y-1 pl-2 border-l-2 border-gray-100">
                  <div className="flex justify-between">
                    <span>{roomNights} night{roomNights !== 1 ? 's' : ''} × {formatPrice(avgNightlyRate)}/night</span>
                  </div>

                  {/* Guest breakdown for per_person modes */}
                  {pricingMode !== 'per_unit' && (
                    <>
                      {totalAdults > 0 && (
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-400">
                            {totalAdults} adult{totalAdults !== 1 ? 's' : ''}
                            {childrenAsAdults > 0 && ` (incl. ${childrenAsAdults} child${childrenAsAdults !== 1 ? 'ren' : ''} ${childAgeLimit}+)`}
                          </span>
                        </div>
                      )}
                      {payingChildren > 0 && (
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-400">
                            {payingChildren} child{payingChildren !== 1 ? 'ren' : ''}
                            {childPrice !== undefined && childPrice !== null
                              ? ` @ ${formatPrice(childPrice)}/night`
                              : ' (adult rate)'}
                          </span>
                        </div>
                      )}
                      {freeChildren > 0 && (
                        <div className="flex justify-between text-xs">
                          <span className="text-emerald-600">
                            {freeChildren} child{freeChildren !== 1 ? 'ren' : ''} under {childFreeUntilAge} stay free
                          </span>
                        </div>
                      )}
                    </>
                  )}

                  {/* Per unit mode - show this room's guests */}
                  {pricingMode === 'per_unit' && (
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-400">
                        {roomTotalGuests} guest{roomTotalGuests !== 1 ? 's' : ''} (max {room.maxGuests})
                      </span>
                    </div>
                  )}

                  {/* Show varied rates if applicable */}
                  {pricing?.nights?.some((n, i, arr) => i > 0 && n.price !== arr[0].price) && (
                    <div className="mt-1 pt-1 border-t border-gray-100">
                      <span className="text-xs text-gray-400">Rate breakdown:</span>
                      {pricing.nights.map((night, idx) => (
                        <div key={idx} className="flex justify-between text-xs text-gray-400">
                          <span>
                            {new Date(night.date).toLocaleDateString('en-ZA', { weekday: 'short', day: 'numeric', month: 'short' })}
                            {night.rate_name && <span className="text-emerald-600 ml-1">({night.rate_name})</span>}
                          </span>
                          <span>{formatPrice(night.price)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )
          })}

          {/* Per-room guest breakdown for multi-room bookings */}
          {state.selectedRooms.length > 1 && (
            <div className="bg-gray-50 rounded-lg p-3 text-sm">
              <div className="font-medium text-gray-700 mb-2">Guests per room</div>
              <div className="space-y-1.5">
                {state.selectedRooms.map(({ room, adults, children, childrenAges }) => {
                  const roomAdults = adults || 1
                  const roomChildren = children || 0
                  const roomChildrenAges = childrenAges || []

                  return (
                    <div key={room.id} className="flex justify-between items-center">
                      <span className="text-gray-600">{room.name}</span>
                      <span className="text-gray-500 text-xs">
                        {roomAdults} adult{roomAdults !== 1 ? 's' : ''}
                        {roomChildren > 0 && (
                          <>, {roomChildren} child{roomChildren !== 1 ? 'ren' : ''}
                          ({roomChildrenAges.join(', ')} yrs)</>
                        )}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Rooms subtotal */}
          <div className="border-t border-gray-200 pt-3">
            <div className="flex justify-between font-semibold text-gray-900">
              <span>Rooms subtotal</span>
              <span>{formatPrice(state.roomTotal)}</span>
            </div>
          </div>

          {/* Add-ons / Extras */}
          {state.selectedAddons.length > 0 && (
            <div className="border-t border-gray-200 pt-3">
              <div className="font-medium text-gray-700 mb-2">Extras</div>
              {state.selectedAddons.map(({ addon, quantity }) => {
                // Calculate individual addon price
                let addonTotal = addon.price * quantity
                switch (addon.pricingType) {
                  case 'per_night':
                    addonTotal = addon.price * quantity * nights
                    break
                  case 'per_guest':
                    addonTotal = addon.price * quantity * state.selectedRooms.reduce((sum, r) => sum + (r.adults || 1) + (r.children || 0), 0)
                    break
                  case 'per_guest_per_night':
                    addonTotal = addon.price * quantity * state.selectedRooms.reduce((sum, r) => sum + (r.adults || 1) + (r.children || 0), 0) * nights
                    break
                }

                return (
                  <div key={addon.id} className="flex justify-between text-sm text-gray-600 py-1">
                    <span>
                      {addon.name}
                      {quantity > 1 && <span className="text-gray-400"> ×{quantity}</span>}
                      <span className="text-xs text-gray-400 ml-1">
                        ({addon.pricingType === 'per_night' ? '/night' :
                          addon.pricingType === 'per_guest' ? '/guest' :
                          addon.pricingType === 'per_guest_per_night' ? '/guest/night' : 'once'})
                      </span>
                    </span>
                    <span>{formatPrice(addonTotal)}</span>
                  </div>
                )
              })}
              <div className="flex justify-between font-semibold text-gray-900 mt-2 pt-2 border-t border-gray-100">
                <span>Extras subtotal</span>
                <span>{formatPrice(state.addonsTotal)}</span>
              </div>
            </div>
          )}

          {/* Promotional Code */}
          <div className="border-t border-gray-200 pt-3">
            <div className="flex items-center gap-2 mb-3">
              <Tag size={16} className="text-gray-500" />
              <span className="font-medium text-gray-700">Have a promo code?</span>
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
          </div>

          {/* Discount Line (if coupon applied) */}
          {state.appliedCoupon && (
            <div className="flex justify-between text-emerald-600 font-medium">
              <span>Discount ({state.appliedCoupon.code})</span>
              <span>-{formatPrice(state.discountAmount)}</span>
            </div>
          )}

          {/* Grand Total */}
          <div className="border-t-2 border-gray-200 pt-3">
            <div className="flex justify-between items-center">
              <span className="font-semibold text-lg text-gray-900">Total to pay</span>
              <span className="font-bold text-xl text-gray-900">{formatPrice(state.grandTotal)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Payment Methods */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="font-semibold text-gray-900 mb-4">Select payment method</h3>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
            <AlertCircle className="w-4 h-4" />
            <span className="text-sm">{error}</span>
          </div>
        )}

        {!hasPaymentMethods ? (
          <div className="text-center py-6">
            <p className="text-gray-500">No payment methods available for this property.</p>
            <p className="text-sm text-gray-400 mt-1">Please contact the property directly.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Paystack (Card Payment) */}
            {paymentMethods?.methods.paystack && (
              <div
                className={`
                  p-4 rounded-xl border-2 cursor-pointer transition-all
                  ${state.selectedPaymentMethod === 'paystack'
                    ? 'border-emerald-600 bg-emerald-50'
                    : 'border-gray-200 hover:border-gray-300'
                  }
                `}
                onClick={() => updateState({ selectedPaymentMethod: 'paystack' })}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                    <CreditCard className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">Pay with Card</p>
                    <p className="text-sm text-gray-500">Visa, Mastercard, or local cards</p>
                  </div>
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${state.selectedPaymentMethod === 'paystack' ? 'border-emerald-600 bg-emerald-600' : 'border-gray-300'}`}>
                    {state.selectedPaymentMethod === 'paystack' && <div className="w-2 h-2 bg-white rounded-full" />}
                  </div>
                </div>
              </div>
            )}

            {/* EFT */}
            {paymentMethods?.methods.eft && (
              <div
                className={`
                  p-4 rounded-xl border-2 cursor-pointer transition-all
                  ${state.selectedPaymentMethod === 'eft'
                    ? 'border-emerald-600 bg-emerald-50'
                    : 'border-gray-200 hover:border-gray-300'
                  }
                `}
                onClick={() => updateState({ selectedPaymentMethod: 'eft' })}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                    <Building2 className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">Bank Transfer (EFT)</p>
                    <p className="text-sm text-gray-500">Pay directly to bank account</p>
                  </div>
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${state.selectedPaymentMethod === 'eft' ? 'border-emerald-600 bg-emerald-600' : 'border-gray-300'}`}>
                    {state.selectedPaymentMethod === 'eft' && <div className="w-2 h-2 bg-white rounded-full" />}
                  </div>
                </div>
              </div>
            )}

            {/* PayPal - TODO: Implement PayPal integration */}
            {paymentMethods?.methods.paypal && (
              <div
                className={`
                  p-4 rounded-xl border-2 cursor-pointer transition-all opacity-50
                  border-gray-200
                `}
                title="PayPal coming soon"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
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
        <div className="bg-gray-50 rounded-xl border border-gray-200 p-4">
          <div className="flex items-start gap-3">
            <Shield className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-gray-900 text-sm">Cancellation policy</p>
              <p className="text-sm text-gray-600 mt-1">
                {property.cancellationPolicies[0].label}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Terms Acceptance */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <TermsAcceptance
          accepted={termsAccepted}
          onChange={setTermsAccepted}
        />
      </div>

      {/* Navigation buttons */}
      <div className="flex justify-between">
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
            {processing ? 'Processing...' : 'Complete Booking'}
          </button>
        )}
      </div>
    </div>
  )
}

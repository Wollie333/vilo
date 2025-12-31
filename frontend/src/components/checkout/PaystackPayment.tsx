import { useState, useEffect } from 'react'
import { CreditCard, Loader2, AlertCircle } from 'lucide-react'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3002/api'

declare global {
  interface Window {
    PaystackPop: {
      setup: (config: {
        key: string
        email: string
        amount: number
        currency?: string
        ref?: string
        callback: (response: { reference: string; status: string }) => void
        onClose: () => void
      }) => { openIframe: () => void }
    }
  }
}

interface PaystackPaymentProps {
  publicKey: string
  email: string
  amount: number
  currency: string
  onSuccess: (bookingId: string) => void
  onClose: () => void
  disabled: boolean
  onBeforePayment: () => Promise<{ bookingId: string } | void>
  bookingRef: string | null
  bookingId: string | null
}

export default function PaystackPayment({
  publicKey,
  email,
  amount,
  currency,
  onSuccess,
  onClose,
  disabled,
  onBeforePayment,
  bookingRef,
  bookingId
}: PaystackPaymentProps) {
  const [loading, setLoading] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [scriptLoaded, setScriptLoaded] = useState(false)
  const [currentBookingId, setCurrentBookingId] = useState<string | null>(bookingId)

  // Update currentBookingId when prop changes
  useEffect(() => {
    if (bookingId) {
      setCurrentBookingId(bookingId)
    }
  }, [bookingId])

  // Load Paystack script
  useEffect(() => {
    const existingScript = document.getElementById('paystack-script')
    if (existingScript) {
      setScriptLoaded(true)
      return
    }

    const script = document.createElement('script')
    script.id = 'paystack-script'
    script.src = 'https://js.paystack.co/v1/inline.js'
    script.async = true
    script.onload = () => setScriptLoaded(true)
    document.body.appendChild(script)

    return () => {
      // Don't remove script on unmount as other components might need it
    }
  }, [])

  // Verify payment with backend
  const verifyPayment = async (reference: string, bId: string): Promise<boolean> => {
    setVerifying(true)
    setError(null)

    try {
      const response = await fetch(`${API_URL}/discovery/bookings/${bId}/verify-payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ reference })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Payment verification failed')
      }

      return data.success
    } catch (err) {
      console.error('Verification error:', err)
      setError(err instanceof Error ? err.message : 'Payment verification failed')
      return false
    } finally {
      setVerifying(false)
    }
  }

  const handlePayment = async () => {
    if (!scriptLoaded || !window.PaystackPop) {
      setError('Payment system not ready. Please refresh the page.')
      return
    }

    setLoading(true)
    setError(null)

    let bId: string | null = null

    try {
      // Create booking first
      const result = await onBeforePayment()

      // Get booking ID from result or use prop
      bId = (result as { bookingId: string } | undefined)?.bookingId || currentBookingId

      if (!bId) {
        throw new Error('Booking creation failed')
      }

      setCurrentBookingId(bId)
    } catch (err) {
      console.error('Booking creation error:', err)
      setError(err instanceof Error ? err.message : 'Failed to create booking')
      setLoading(false)
      return // Don't proceed to Paystack if booking failed
    }

    // Store bookingId in a variable for the callback closure
    const bookingIdForCallback = bId

    try {
      // Initialize Paystack payment
      const handler = window.PaystackPop.setup({
        key: publicKey,
        email: email,
        amount: Math.round(amount * 100), // Paystack expects amount in kobo/cents
        currency: currency,
        ref: bookingRef || `VIL-${Date.now()}-${Math.random().toString(36).substring(7)}`,
        callback: function(response: { reference: string; status: string }) {
          console.log('Paystack callback:', response)

          // Verify payment with backend (non-async wrapper)
          verifyPayment(response.reference, bookingIdForCallback)
            .then((verified) => {
              if (verified) {
                onSuccess(bookingIdForCallback)
              } else {
                setLoading(false)
              }
            })
            .catch(() => {
              setLoading(false)
            })
        },
        onClose: function() {
          setLoading(false)
          onClose()
        }
      })

      handler.openIframe()
    } catch (err) {
      console.error('Paystack initialization error:', err)
      setError('Payment system error. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col items-end gap-2">
      {error && (
        <div className="flex items-center gap-2 text-red-600 text-sm">
          <AlertCircle className="w-4 h-4" />
          <span>{error}</span>
        </div>
      )}
      <button
        onClick={handlePayment}
        disabled={disabled || loading || verifying || !scriptLoaded}
        className={`
          px-8 py-3 rounded-xl font-medium transition-all flex items-center gap-2
          ${disabled || !scriptLoaded
            ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
            : 'bg-emerald-600 text-white hover:bg-emerald-700'
          }
        `}
      >
        {verifying ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Verifying...
          </>
        ) : loading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Processing...
          </>
        ) : (
          <>
            <CreditCard className="w-4 h-4" />
            Pay Now
          </>
        )}
      </button>
    </div>
  )
}

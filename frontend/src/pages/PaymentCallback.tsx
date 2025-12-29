import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { CheckCircle, XCircle, Loader2 } from 'lucide-react'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3002/api'

type Status = 'verifying' | 'success' | 'error'

export default function PaymentCallback() {
  const [status, setStatus] = useState<Status>('verifying')
  const [errorMessage, setErrorMessage] = useState('')
  const [searchParams] = useSearchParams()
  const { session, refreshTenant } = useAuth()
  const navigate = useNavigate()

  const reference = searchParams.get('reference')

  useEffect(() => {
    const verifyPayment = async () => {
      if (!reference) {
        setStatus('error')
        setErrorMessage('No payment reference found')
        return
      }

      if (!session?.access_token) {
        setStatus('error')
        setErrorMessage('Please sign in to verify your payment')
        return
      }

      try {
        const response = await fetch(`${API_URL}/payments/verify/${reference}`, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        })

        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || 'Payment verification failed')
        }

        // Refresh tenant data to get updated has_lifetime_access
        if (refreshTenant) {
          await refreshTenant()
        }

        setStatus('success')

        // Redirect to dashboard after 2 seconds
        setTimeout(() => {
          navigate('/dashboard', { replace: true })
        }, 2000)
      } catch (err: any) {
        setStatus('error')
        setErrorMessage(err.message || 'Something went wrong')
      }
    }

    verifyPayment()
  }, [reference, session, navigate, refreshTenant])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full text-center">
        {status === 'verifying' && (
          <>
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-6">
              <Loader2 size={32} className="text-gray-600 animate-spin" />
            </div>
            <h1 className="text-2xl font-semibold text-gray-900 mb-2">
              Verifying your payment...
            </h1>
            <p className="text-gray-500">
              Please wait while we confirm your payment with Paystack.
            </p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-6">
              <CheckCircle size={32} className="text-green-600" />
            </div>
            <h1 className="text-2xl font-semibold text-gray-900 mb-2">
              Payment Successful!
            </h1>
            <p className="text-gray-500 mb-6">
              Welcome to Vilo! You now have lifetime access to all features.
            </p>
            <p className="text-sm text-gray-400">
              Redirecting to your dashboard...
            </p>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-6">
              <XCircle size={32} className="text-red-600" />
            </div>
            <h1 className="text-2xl font-semibold text-gray-900 mb-2">
              Payment Failed
            </h1>
            <p className="text-gray-500 mb-6">
              {errorMessage || 'We could not verify your payment. Please try again.'}
            </p>
            <div className="space-y-3">
              <button
                onClick={() => navigate('/payment')}
                className="w-full py-3 px-4 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors"
              >
                Try Again
              </button>
              <button
                onClick={() => navigate('/login')}
                className="w-full py-3 px-4 bg-white text-gray-700 text-sm font-medium rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
              >
                Back to Login
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

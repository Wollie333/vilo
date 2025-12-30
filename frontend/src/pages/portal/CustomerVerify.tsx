import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { CheckCircle, XCircle, Loader } from 'lucide-react'
import { useCustomerAuth } from '../../contexts/CustomerAuthContext'

export default function CustomerVerify() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { verifyToken, isAuthenticated } = useCustomerAuth()
  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying')
  const [error, setError] = useState('')

  const token = searchParams.get('token')

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/portal')
      return
    }

    if (!token) {
      setStatus('error')
      setError('Invalid link. No token provided.')
      return
    }

    const verify = async () => {
      try {
        await verifyToken(token)
        setStatus('success')
        // Redirect after short delay
        setTimeout(() => {
          navigate('/portal')
        }, 1500)
      } catch (err: any) {
        setStatus('error')
        setError(err.message || 'Invalid or expired link')
      }
    }

    verify()
  }, [token, verifyToken, navigate, isAuthenticated])

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
          {status === 'verifying' && (
            <>
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Loader className="w-8 h-8 text-gray-600 animate-spin" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Verifying...</h1>
              <p className="text-gray-600">Please wait while we verify your login link.</p>
            </>
          )}

          {status === 'success' && (
            <>
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Success!</h1>
              <p className="text-gray-600">You're now logged in. Redirecting to your portal...</p>
            </>
          )}

          {status === 'error' && (
            <>
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <XCircle className="w-8 h-8 text-red-600" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Link Invalid</h1>
              <p className="text-gray-600 mb-6">{error}</p>
              <Link
                to="/portal/login"
                className="inline-block bg-gray-900 text-white py-2 px-6 rounded-md hover:bg-gray-800 transition-colors"
              >
                Back to Login
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

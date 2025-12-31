import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { Check } from 'lucide-react'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3002/api'

const features = [
  'Unlimited rooms & bookings',
  'Full booking management system',
  'Guest communication tools',
  'Payment tracking & invoicing',
  'Seasonal pricing & rates',
  'Multi-user access',
  'Priority email support',
  'Lifetime updates included',
]

export default function Payment() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const { session, signOut } = useAuth()
  const navigate = useNavigate()

  const handlePayment = async () => {
    if (!session?.access_token) {
      setError('Please sign in to continue')
      return
    }

    setLoading(true)
    setError('')

    try {
      const response = await fetch(`${API_URL}/payments/initialize`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to initialize payment')
      }

      // Redirect to Paystack
      window.location.href = data.authorization_url
    } catch (err: any) {
      setError(err.message || 'Something went wrong')
      setLoading(false)
    }
  }

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  return (
    <div className="min-h-screen flex">
      {/* Left side - Image with testimonial */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-gray-900">
        <img
          src="https://images.unsplash.com/photo-1613490493576-7fde63acd811?q=80&w=2071&auto=format&fit=crop"
          alt="Luxury villa"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

        {/* Testimonial */}
        <div className="absolute bottom-0 left-0 right-0 p-8">
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20">
            <p className="text-white/90 text-lg leading-relaxed mb-6">
              "Vilo transformed how we manage our boutique hotel. The intuitive interface
              and powerful features have saved us countless hours. Worth every penny!"
            </p>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white font-semibold">Michael Chen</p>
                <p className="text-white/60 text-sm">Owner, Seaside Retreat</p>
                <p className="text-white/60 text-sm">Cape Town, South Africa</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right side - Payment form */}
      <div className="flex-1 flex flex-col justify-center px-8 lg:px-16 xl:px-24 bg-white">
        <div className="w-full max-w-md mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-emerald-500 rounded-xl mb-4">
              <span className="text-white font-bold text-lg">V</span>
            </div>
            <h1 className="text-2xl font-semibold text-gray-900 mb-2">
              Get Lifetime Access
            </h1>
            <p className="text-gray-500 text-sm">
              One-time payment. No subscriptions. Yours forever.
            </p>
          </div>

          {/* Price card */}
          <div className="bg-gray-50 rounded-2xl p-6 mb-6 border border-gray-100">
            <div className="flex items-baseline justify-center gap-1 mb-4">
              <span className="text-4xl font-bold text-gray-900">$99</span>
              <span className="text-gray-500 text-sm">USD</span>
            </div>
            <p className="text-center text-sm text-gray-600 mb-6">
              Lifetime access to all features
            </p>

            {/* Features list */}
            <ul className="space-y-3">
              {features.map((feature, index) => (
                <li key={index} className="flex items-center gap-3 text-sm text-gray-700">
                  <div className="flex-shrink-0 w-5 h-5 bg-accent-100 rounded-full flex items-center justify-center">
                    <Check size={12} className="text-accent-600" />
                  </div>
                  {feature}
                </li>
              ))}
            </ul>
          </div>

          {/* Error message */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm mb-4">
              {error}
            </div>
          )}

          {/* Payment button */}
          <button
            onClick={handlePayment}
            disabled={loading}
            className="w-full py-3 px-4 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Processing...' : 'Get Lifetime Access - $99'}
          </button>

          {/* Secure payment note */}
          <p className="mt-4 text-center text-xs text-gray-400">
            Secure payment powered by Paystack.
            <br />
            30-day money-back guarantee.
          </p>

          {/* Footer */}
          <div className="mt-8 pt-6 border-t border-gray-100 text-center">
            <p className="text-sm text-gray-500">
              Signed in as {session?.user?.email}
            </p>
            <button
              onClick={handleSignOut}
              className="mt-2 text-sm text-gray-600 hover:text-gray-900 underline"
            >
              Sign out
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

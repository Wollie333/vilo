import { useState, FormEvent } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

type AuthMode = 'login' | 'signup'

export default function Login() {
  const [mode, setMode] = useState<AuthMode>('signup')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [acceptUpdates, setAcceptUpdates] = useState(false)
  const { signIn, signUp } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/dashboard'

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    if (mode === 'signup') {
      const { error, session } = await signUp(email, password)
      if (error) {
        setError(error.message)
        setLoading(false)
      } else if (session) {
        // New signup - redirect to payment page
        navigate('/payment', { replace: true })
      } else {
        // Email confirmation required
        setError('Account created! Please check your email to verify, then sign in.')
        setMode('login')
        setLoading(false)
      }
    } else {
      const { error } = await signIn(email, password)
      if (error) {
        setError(error.message)
        setLoading(false)
      } else {
        // Existing user login - redirect to intended destination
        // ProtectedRoute will redirect to /payment if no lifetime access
        navigate(from, { replace: true })
      }
    }
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
              "Vilo makes it easy to manage our boutique hotel. Whether I'm handling bookings,
              managing room availability, or tracking payments, every feature is seamless,
              intuitive, and reliable."
            </p>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white font-semibold">Isabella Garcia</p>
                <p className="text-white/60 text-sm">Layers Capital</p>
                <p className="text-white/60 text-sm">Global Real Estate Investment Firm</p>
              </div>
              <div className="flex gap-2">
                <button className="w-8 h-8 rounded-full border border-white/30 flex items-center justify-center text-white/70 hover:bg-white/10 transition-colors">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <button className="w-8 h-8 rounded-full border border-white/30 flex items-center justify-center text-white/70 hover:bg-white/10 transition-colors">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right side - Auth form */}
      <div className="flex-1 flex flex-col justify-center px-8 lg:px-16 xl:px-24 bg-white">
        <div className="w-full max-w-md mx-auto">
          {/* Tabs */}
          <div className="flex items-center justify-center gap-6 mb-8">
            <button
              onClick={() => setMode('login')}
              className={`flex items-center gap-2 pb-1 text-sm font-medium transition-colors ${
                mode === 'login'
                  ? 'text-gray-900 border-b-2 border-gray-900'
                  : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
              </svg>
              Login
            </button>
            <button
              onClick={() => setMode('signup')}
              className={`flex items-center gap-2 pb-1 text-sm font-medium transition-colors ${
                mode === 'signup'
                  ? 'text-gray-900 border-b-2 border-gray-900'
                  : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
              Sign Up
            </button>
          </div>

          {/* Heading */}
          <div className="text-center mb-8">
            <h1 className="text-2xl font-semibold text-gray-900 mb-2">
              {mode === 'signup' ? 'Create an account' : 'Welcome back'}
            </h1>
            <p className="text-gray-500 text-sm">
              {mode === 'signup'
                ? 'Please enter your details to create an account.'
                : 'Please enter your details to sign in.'}
            </p>
          </div>

          {/* Social buttons */}
          <div className="space-y-3 mb-6">
            <button
              type="button"
              className="w-full flex items-center justify-center gap-3 px-4 py-2.5 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              <span className="text-sm font-medium text-gray-700">Continue with Google</span>
            </button>

            <button
              type="button"
              className="w-full flex items-center justify-center gap-3 px-4 py-2.5 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
              </svg>
              <span className="text-sm font-medium text-gray-700">Continue with Apple</span>
            </button>
          </div>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-white text-gray-400">OR</span>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent transition-shadow"
                placeholder="Enter your email address"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1.5">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent transition-shadow"
                placeholder="Enter your password"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading
                ? (mode === 'signup' ? 'Creating account...' : 'Signing in...')
                : (mode === 'signup' ? 'Create an account' : 'Sign in')}
            </button>

            {mode === 'signup' && (
              <div className="flex items-start gap-3 mt-4">
                <input
                  id="updates"
                  type="checkbox"
                  checked={acceptUpdates}
                  onChange={(e) => setAcceptUpdates(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-gray-300 text-gray-900 focus:ring-gray-900"
                />
                <label htmlFor="updates" className="text-xs text-gray-500 leading-relaxed">
                  Please keep me updated by email with the latest news, research findings, reward programs, event updates.
                </label>
              </div>
            )}
          </form>

          {/* Bottom link */}
          <p className="mt-8 text-center text-sm text-gray-500">
            {mode === 'signup' ? (
              <>
                Already have an account?{' '}
                <button
                  onClick={() => setMode('login')}
                  className="font-medium text-gray-900 hover:underline"
                >
                  Sign in
                </button>
              </>
            ) : (
              <>
                Don't have an account?{' '}
                <button
                  onClick={() => setMode('signup')}
                  className="font-medium text-gray-900 hover:underline"
                >
                  Sign up
                </button>
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  )
}

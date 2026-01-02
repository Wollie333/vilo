import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate, Link } from 'react-router-dom'
import { KeyRound, Loader2, Check, AlertCircle, Eye, EyeOff, Users } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3002/api'

interface TokenDetails {
  email: string
  name: string
  role: string
  tenant_name: string
  tenant_logo: string | null
}

export default function SetupPassword() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { signIn } = useAuth()

  const token = searchParams.get('token')

  // Token validation state
  const [tokenDetails, setTokenDetails] = useState<TokenDetails | null>(null)
  const [validating, setValidating] = useState(true)
  const [tokenError, setTokenError] = useState<string | null>(null)

  // Form state
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  // Submission state
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // Validate token on mount
  useEffect(() => {
    if (!token) {
      setTokenError('No setup token provided')
      setValidating(false)
      return
    }
    validateToken()
  }, [token])

  const validateToken = async () => {
    try {
      const response = await fetch(`${API_URL}/members/setup/${token}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Invalid token')
      }

      setTokenDetails(data)
    } catch (err) {
      setTokenError(err instanceof Error ? err.message : 'Invalid token')
    } finally {
      setValidating(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // Validate password
    if (!password) {
      setError('Please enter a password')
      return
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setLoading(true)

    try {
      const response = await fetch(`${API_URL}/members/setup/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to set password')
      }

      setSuccess(true)

      // Auto-login after successful password setup
      if (tokenDetails?.email) {
        const { error: signInError } = await signIn(tokenDetails.email, password)
        if (!signInError) {
          // Wait a moment then redirect
          setTimeout(() => navigate('/dashboard'), 1500)
        } else {
          // If auto-login fails, redirect to login page
          setTimeout(() => navigate('/login'), 2000)
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to set password')
    } finally {
      setLoading(false)
    }
  }

  const getRoleDisplayName = (role: string) => {
    switch (role) {
      case 'owner':
        return 'Owner'
      case 'general_manager':
        return 'General Manager'
      case 'accountant':
        return 'Accountant'
      default:
        return role
    }
  }

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'owner':
        return 'bg-purple-100 text-purple-800'
      case 'general_manager':
        return 'bg-blue-100 text-blue-800'
      case 'accountant':
        return 'bg-accent-100 text-accent-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  // Success state
  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-accent-100 rounded-full mb-4">
            <Check size={32} className="text-accent-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Welcome to the team!</h1>
          <p className="text-gray-600 mb-4">
            Your account has been created. You've joined{' '}
            <strong>{tokenDetails?.tenant_name}</strong> as a{' '}
            <strong>{getRoleDisplayName(tokenDetails?.role || '')}</strong>.
          </p>
          <p className="text-sm text-gray-500">Redirecting to dashboard...</p>
        </div>
      </div>
    )
  }

  // Loading state
  if (validating) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center">
          <Loader2 size={32} className="animate-spin text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">Validating your invitation...</p>
        </div>
      </div>
    )
  }

  // Token error state
  if (tokenError) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <div className="text-center mb-8">
            <Link to="/" className="inline-block">
              <h1 className="text-3xl font-bold text-gray-900">Vilo</h1>
            </Link>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-8">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-4">
                <AlertCircle size={32} className="text-red-600" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Invalid Link
              </h2>
              <p className="text-gray-600 mb-6">
                {tokenError}
              </p>

              <div className="space-y-3">
                <Link
                  to="/login"
                  className="block w-full px-4 py-3 bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-800 transition-colors text-center"
                >
                  Go to Login
                </Link>
                <p className="text-sm text-gray-500">
                  If you've already set your password, you can log in directly.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Main password setup form
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-block">
            <h1 className="text-3xl font-bold text-gray-900">Vilo</h1>
          </Link>
          <p className="text-gray-600 mt-2">Set up your account</p>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-8">
          {/* Welcome message */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-accent-100 rounded-full mb-4">
              <Users size={32} className="text-accent-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-1">
              Welcome, {tokenDetails?.name}!
            </h2>
            <p className="text-gray-600 text-sm">
              You've been added to <strong>{tokenDetails?.tenant_name}</strong>.
              <br />
              Set your password to get started.
            </p>
          </div>

          {/* Role info */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500">Your Role</span>
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${getRoleBadgeColor(tokenDetails?.role || '')}`}>
                {getRoleDisplayName(tokenDetails?.role || '')}
              </span>
            </div>
          </div>

          {/* Error message */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
              <AlertCircle size={20} className="text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Password form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                type="email"
                value={tokenDetails?.email || ''}
                disabled
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <div className="relative">
                <KeyRound size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Confirm Password
              </label>
              <input
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm your password"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-accent-600 text-white rounded-lg font-medium hover:bg-accent-700 transition-colors disabled:opacity-50 mt-6"
            >
              {loading && <Loader2 size={18} className="animate-spin" />}
              {loading ? 'Creating Account...' : 'Create Account & Continue'}
            </button>
          </form>

          {/* Footer */}
          <div className="mt-6 pt-6 border-t border-gray-200 text-center">
            <p className="text-sm text-gray-500">
              Already have an account?{' '}
              <Link to="/login" className="text-accent-600 font-medium hover:underline">
                Log in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

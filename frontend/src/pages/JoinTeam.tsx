import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate, Link } from 'react-router-dom'
import { Users, Loader2, Check, AlertCircle, Mail, KeyRound, Eye, EyeOff } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3002/api'

interface InvitationDetails {
  tenant_name: string
  role: string
  email: string
  expires_at: string
  is_expired: boolean
}

export default function JoinTeam() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { user, session, refreshTenant } = useAuth()

  // Form state
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  // UI state
  const [loading, setLoading] = useState(false)
  const [validating, setValidating] = useState(false)
  const [invitation, setInvitation] = useState<InvitationDetails | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [needsAccount, setNeedsAccount] = useState(false)

  // Get token from URL if present
  const tokenFromUrl = searchParams.get('token')

  // Validate token on mount if present
  useEffect(() => {
    if (tokenFromUrl) {
      validateToken(tokenFromUrl)
    }
  }, [tokenFromUrl])

  const validateToken = async (token: string) => {
    setValidating(true)
    setError(null)

    try {
      const response = await fetch(`${API_URL}/members/invitation/${token}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Invalid invitation')
      }

      setInvitation(data.invitation)
      setEmail(data.invitation.email)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to validate invitation')
    } finally {
      setValidating(false)
    }
  }

  const validateCode = async () => {
    if (!code || !email) {
      setError('Please enter both email and invitation code')
      return
    }

    setValidating(true)
    setError(null)

    try {
      const response = await fetch(`${API_URL}/members/invitation/code/${code}?email=${encodeURIComponent(email)}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Invalid invitation code')
      }

      setInvitation(data.invitation)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to validate invitation')
    } finally {
      setValidating(false)
    }
  }

  const handleJoin = async () => {
    if (!invitation) return

    // Validate password if creating account
    if (needsAccount) {
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
    }

    setLoading(true)
    setError(null)

    try {
      const body: Record<string, string> = {
        email: invitation.email,
      }

      if (tokenFromUrl) {
        body.token = tokenFromUrl
      } else {
        body.code = code
      }

      if (needsAccount) {
        body.password = password
      }

      // Add auth token if user is logged in
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      }
      if (session?.access_token) {
        headers.Authorization = `Bearer ${session.access_token}`
      }

      const response = await fetch(`${API_URL}/members/join`, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      })

      const data = await response.json()

      if (!response.ok) {
        // Check if user needs to create an account
        if (data.needs_account) {
          setNeedsAccount(true)
          setError(null)
          return
        }
        throw new Error(data.error || 'Failed to join team')
      }

      setSuccess(true)

      // Refresh tenant data and redirect after a short delay
      setTimeout(async () => {
        if (session) {
          await refreshTenant()
        }
        navigate('/dashboard')
      }, 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to join team')
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
        return 'bg-green-100 text-green-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  // Success state
  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
            <Check size={32} className="text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Welcome to the team!</h1>
          <p className="text-gray-600 mb-4">
            You've successfully joined <strong>{invitation?.tenant_name}</strong> as a{' '}
            <strong>{getRoleDisplayName(invitation?.role || '')}</strong>.
          </p>
          <p className="text-sm text-gray-500">Redirecting to dashboard...</p>
        </div>
      </div>
    )
  }

  // Validating token state
  if (tokenFromUrl && validating) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center">
          <Loader2 size={32} className="animate-spin text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">Validating invitation...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-block">
            <h1 className="text-3xl font-bold text-gray-900">Vilo</h1>
          </Link>
          <p className="text-gray-600 mt-2">Join a team</p>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-8">
          {/* Error message */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
              <AlertCircle size={20} className="text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Invitation validated - show details */}
          {invitation && !needsAccount && (
            <div className="space-y-6">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
                  <Users size={32} className="text-gray-600" />
                </div>
                <h2 className="text-xl font-semibold text-gray-900 mb-1">
                  You've been invited!
                </h2>
                <p className="text-gray-600">
                  Join <strong>{invitation.tenant_name}</strong> as a team member.
                </p>
              </div>

              <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">Workspace</span>
                  <span className="font-medium text-gray-900">{invitation.tenant_name}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">Your Role</span>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${getRoleBadgeColor(invitation.role)}`}>
                    {getRoleDisplayName(invitation.role)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">Email</span>
                  <span className="text-sm text-gray-900">{invitation.email}</span>
                </div>
              </div>

              {invitation.is_expired ? (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-700 text-center">
                    This invitation has expired. Please ask for a new invitation.
                  </p>
                </div>
              ) : (
                <button
                  onClick={handleJoin}
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-800 transition-colors disabled:opacity-50"
                >
                  {loading && <Loader2 size={18} className="animate-spin" />}
                  {user ? 'Join Team' : 'Continue'}
                </button>
              )}

              {user && (
                <p className="text-xs text-center text-gray-500">
                  Signed in as {user.email}
                </p>
              )}
            </div>
          )}

          {/* Need to create account */}
          {invitation && needsAccount && (
            <div className="space-y-6">
              <div className="text-center">
                <h2 className="text-xl font-semibold text-gray-900 mb-1">
                  Create your account
                </h2>
                <p className="text-gray-600 text-sm">
                  Set a password to join {invitation.tenant_name}
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={invitation.email}
                    disabled
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="At least 8 characters"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-400 pr-10"
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-400"
                  />
                </div>
              </div>

              <button
                onClick={handleJoin}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-800 transition-colors disabled:opacity-50"
              >
                {loading && <Loader2 size={18} className="animate-spin" />}
                Create Account & Join
              </button>
            </div>
          )}

          {/* No invitation yet - show code entry form */}
          {!invitation && !tokenFromUrl && (
            <div className="space-y-6">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
                  <KeyRound size={32} className="text-gray-600" />
                </div>
                <h2 className="text-xl font-semibold text-gray-900 mb-1">
                  Enter invitation details
                </h2>
                <p className="text-gray-600 text-sm">
                  Enter your email and the invitation code you received.
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="your@email.com"
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-400"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Invitation Code
                  </label>
                  <input
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    placeholder="XXXXXXXX"
                    maxLength={8}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-400 text-center font-mono text-lg tracking-wider uppercase"
                  />
                </div>
              </div>

              <button
                onClick={validateCode}
                disabled={validating || !email || !code}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-800 transition-colors disabled:opacity-50"
              >
                {validating && <Loader2 size={18} className="animate-spin" />}
                Verify Invitation
              </button>
            </div>
          )}

          {/* Invalid token from URL */}
          {tokenFromUrl && !validating && !invitation && error && (
            <div className="space-y-6">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-4">
                  <AlertCircle size={32} className="text-red-600" />
                </div>
                <h2 className="text-xl font-semibold text-gray-900 mb-1">
                  Invalid Invitation
                </h2>
                <p className="text-gray-600 text-sm">
                  This invitation link is invalid or has expired.
                </p>
              </div>

              <div className="text-center">
                <p className="text-sm text-gray-500 mb-4">
                  Have an invitation code instead?
                </p>
                <Link
                  to="/join"
                  className="text-gray-900 font-medium hover:underline"
                >
                  Enter code manually
                </Link>
              </div>
            </div>
          )}

          {/* Footer links */}
          <div className="mt-8 pt-6 border-t border-gray-200 text-center">
            <p className="text-sm text-gray-600">
              Don't have an invitation?{' '}
              <Link to="/register" className="text-gray-900 font-medium hover:underline">
                Create your own account
              </Link>
            </p>
            {user && (
              <p className="text-sm text-gray-500 mt-2">
                or{' '}
                <Link to="/dashboard" className="text-gray-900 font-medium hover:underline">
                  go to dashboard
                </Link>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

import { useState } from 'react'
import { X, Lock, Eye, EyeOff, Shield, Check } from 'lucide-react'
import { createPortal } from 'react-dom'
import { useCustomerAuth } from '../../contexts/CustomerAuthContext'

interface SetPasswordModalProps {
  isOpen: boolean
  onClose: () => void
  onSkip: () => void
}

export default function SetPasswordModal({
  isOpen,
  onClose,
  onSkip
}: SetPasswordModalProps) {
  const { setPassword, customer } = useCustomerAuth()
  const [password, setPasswordValue] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Password validation
  const hasMinLength = password.length >= 8
  const hasUppercase = /[A-Z]/.test(password)
  const hasLowercase = /[a-z]/.test(password)
  const hasNumber = /[0-9]/.test(password)
  const passwordsMatch = password === confirmPassword && password.length > 0
  const isValidPassword = hasMinLength && hasUppercase && hasLowercase && hasNumber && passwordsMatch

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!isValidPassword) {
      setError('Please meet all password requirements')
      return
    }

    try {
      setSubmitting(true)
      await setPassword(password)
      onClose()
    } catch (err: any) {
      setError(err.message || 'Failed to set password')
    } finally {
      setSubmitting(false)
    }
  }

  if (!isOpen) return null

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onSkip}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-accent to-accent-600 text-white p-5">
          <button
            onClick={onSkip}
            className="absolute top-4 right-4 p-1 hover:bg-white/20 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-lg">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-semibold">Welcome to Your Portal!</h2>
              <p className="text-sm text-white/80">
                {customer?.name ? `Hi ${customer.name.split(' ')[0]}, ` : ''}Create a password for easy access
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6">
          <p className="text-gray-600 text-sm mb-5">
            Set up a password so you can easily log in to your customer portal in the future using your email and password.
          </p>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          {/* Password Field */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPasswordValue(e.target.value)}
                placeholder="Create a password"
                className="w-full pl-10 pr-10 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Password Requirements */}
          <div className="mb-4 p-3 bg-gray-50 rounded-lg">
            <p className="text-xs font-medium text-gray-500 mb-2">Password must have:</p>
            <div className="grid grid-cols-2 gap-1">
              <PasswordCheck label="8+ characters" met={hasMinLength} />
              <PasswordCheck label="Uppercase letter" met={hasUppercase} />
              <PasswordCheck label="Lowercase letter" met={hasLowercase} />
              <PasswordCheck label="Number" met={hasNumber} />
            </div>
          </div>

          {/* Confirm Password Field */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Confirm Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm your password"
                className={`w-full pl-10 pr-10 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent ${
                  confirmPassword && !passwordsMatch ? 'border-red-300 bg-red-50' : 'border-gray-300'
                }`}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            {confirmPassword && !passwordsMatch && (
              <p className="text-xs text-red-500 mt-1">Passwords do not match</p>
            )}
          </div>

          {/* Buttons */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onSkip}
              className="flex-1 px-4 py-2.5 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg font-medium transition-colors"
            >
              Skip for now
            </button>
            <button
              type="submit"
              disabled={!isValidPassword || submitting}
              className="flex-1 px-4 py-2.5 bg-accent text-white rounded-lg font-medium hover:bg-accent-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Setting...' : 'Set Password'}
            </button>
          </div>

          <p className="text-xs text-gray-400 text-center mt-4">
            You can always set a password later from your profile settings
          </p>
        </form>
      </div>
    </div>,
    document.body
  )
}

function PasswordCheck({ label, met }: { label: string; met: boolean }) {
  return (
    <div className={`flex items-center gap-1.5 text-xs ${met ? 'text-green-600' : 'text-gray-400'}`}>
      <Check className={`w-3.5 h-3.5 ${met ? 'opacity-100' : 'opacity-30'}`} />
      <span>{label}</span>
    </div>
  )
}

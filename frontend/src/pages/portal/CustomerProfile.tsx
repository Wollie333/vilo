import { useState, useEffect } from 'react'
import { User, Mail, Phone, Lock, Check } from 'lucide-react'
import Button from '../../components/Button'
import Card from '../../components/Card'
import { useCustomerAuth } from '../../contexts/CustomerAuthContext'
import { portalApi } from '../../services/portalApi'
import { useNotification } from '../../contexts/NotificationContext'

export default function CustomerProfile() {
  const { customer, setPassword, refreshCustomer } = useCustomerAuth()
  const { showSuccess, showError } = useNotification()
  const [loading, setLoading] = useState(false)
  const [showPasswordForm, setShowPasswordForm] = useState(false)

  // Profile form
  const [name, setName] = useState(customer?.name || '')
  const [phone, setPhone] = useState(customer?.phone || '')
  const [marketingConsent, setMarketingConsent] = useState(customer?.marketingConsent || false)

  // Password form
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [savingPassword, setSavingPassword] = useState(false)

  useEffect(() => {
    if (customer) {
      setName(customer.name || '')
      setPhone(customer.phone || '')
      setMarketingConsent(customer.marketingConsent || false)
    }
  }, [customer])

  const handleSaveProfile = async () => {
    try {
      setLoading(true)
      await portalApi.updateProfile({
        name: name || undefined,
        phone: phone || undefined,
        marketingConsent
      })
      await refreshCustomer()
      showSuccess('Profile Updated', 'Your profile has been saved')
    } catch (error: any) {
      showError('Error', error.message || 'Failed to update profile')
    } finally {
      setLoading(false)
    }
  }

  const handleSetPassword = async () => {
    if (newPassword.length < 8) {
      showError('Error', 'Password must be at least 8 characters')
      return
    }

    if (newPassword !== confirmPassword) {
      showError('Error', 'Passwords do not match')
      return
    }

    try {
      setSavingPassword(true)
      await setPassword(newPassword)
      setNewPassword('')
      setConfirmPassword('')
      setShowPasswordForm(false)
      showSuccess('Password Set', 'You can now log in with your email and password')
    } catch (error: any) {
      showError('Error', error.message || 'Failed to set password')
    } finally {
      setSavingPassword(false)
    }
  }

  return (
    <div className="p-8 bg-gray-50 min-h-full">
      <div className="max-w-2xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Profile</h1>
          <p className="text-gray-500">Manage your account settings</p>
        </div>

        {/* Profile Info */}
        <Card className="p-6 mb-6">
          <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <User size={18} />
            Personal Information
          </h2>

          <div className="space-y-4">
            {/* Email (read-only) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="email"
                  value={customer?.email || ''}
                  disabled
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-md bg-gray-50 text-gray-500"
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
            </div>

            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Full Name
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your name"
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-400"
                />
              </div>
            </div>

            {/* Phone */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phone Number
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Enter your phone number"
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-400"
                />
              </div>
            </div>

            {/* Marketing Consent */}
            <div className="flex items-start gap-3 pt-2">
              <input
                type="checkbox"
                id="marketing"
                checked={marketingConsent}
                onChange={(e) => setMarketingConsent(e.target.checked)}
                className="mt-1"
              />
              <label htmlFor="marketing" className="text-sm text-gray-600">
                I'd like to receive emails about special offers and promotions
              </label>
            </div>

            <div className="pt-4">
              <Button onClick={handleSaveProfile} disabled={loading}>
                {loading ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </div>
        </Card>

        {/* Password Section */}
        <Card className="p-6">
          <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Lock size={18} />
            Password
          </h2>

          {customer?.hasPassword ? (
            <div className="flex items-center gap-3 text-accent-600">
              <Check size={18} />
              <span className="text-sm">Password is set. You can log in with email and password.</span>
            </div>
          ) : !showPasswordForm ? (
            <div>
              <p className="text-sm text-gray-600 mb-4">
                Set a password to log in without magic link. This is optional.
              </p>
              <Button variant="secondary" onClick={() => setShowPasswordForm(true)}>
                Set Password
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  New Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="At least 8 characters"
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm your password"
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-400"
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <Button onClick={handleSetPassword} disabled={savingPassword}>
                  {savingPassword ? 'Saving...' : 'Set Password'}
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => {
                    setShowPasswordForm(false)
                    setNewPassword('')
                    setConfirmPassword('')
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}

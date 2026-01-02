import { useState, useEffect, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { User, Mail, Lock, Check, Camera, Trash2, Loader2, Building2, Shield, Circle, AlertCircle, ChevronDown, Bell, Calendar, CreditCard, Star, MessageSquare, Settings } from 'lucide-react'
import Button from '../../components/Button'
import PhoneInput from '../../components/PhoneInput'
import VatNumberInput from '../../components/VatNumberInput'
import RegistrationNumberInput from '../../components/RegistrationNumberInput'
import { useCustomerAuth } from '../../contexts/CustomerAuthContext'
import { portalApi } from '../../services/portalApi'
import { useNotification } from '../../contexts/NotificationContext'

// Notification preferences types
interface NotificationPreferences {
  bookings: boolean
  payments: boolean
  reviews: boolean
  support: boolean
  system: boolean
}

interface PreferenceCategory {
  key: keyof NotificationPreferences
  label: string
  description: string
  icon: typeof Calendar
}

const notificationCategories: PreferenceCategory[] = [
  {
    key: 'bookings',
    label: 'Bookings',
    description: 'Confirmations, reminders, and cancellations',
    icon: Calendar
  },
  {
    key: 'payments',
    label: 'Payments',
    description: 'Payment confirmations and receipts',
    icon: CreditCard
  },
  {
    key: 'reviews',
    label: 'Reviews',
    description: 'Review requests and responses',
    icon: Star
  },
  {
    key: 'support',
    label: 'Support',
    description: 'Ticket replies and updates',
    icon: MessageSquare
  },
  {
    key: 'system',
    label: 'System',
    description: 'Account and security alerts',
    icon: Settings
  }
]

// Section configuration
interface SectionItem {
  id: string
  name: string
  icon: React.ElementType
}

interface SectionGroup {
  id: string
  name: string
  items: SectionItem[]
}

const sectionGroups: SectionGroup[] = [
  {
    id: 'account',
    name: 'Account',
    items: [
      { id: 'personal', name: 'Personal Info', icon: User },
      { id: 'business', name: 'Business Details', icon: Building2 },
      { id: 'notifications', name: 'Notifications', icon: Bell },
      { id: 'security', name: 'Security', icon: Shield },
    ]
  }
]

type SectionStatus = 'complete' | 'partial' | 'empty'

// Progress Ring Component
function ProfileProgress({ percentage, size = 80, strokeWidth = 8 }: { percentage: number; size?: number; strokeWidth?: number }) {
  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  const offset = circumference - (percentage / 100) * circumference

  const getColor = () => {
    if (percentage >= 80) return '#10b981'
    if (percentage >= 50) return '#f59e0b'
    return '#6b7280'
  }

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#e5e7eb"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={getColor()}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-500 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-lg font-bold text-gray-900">{Math.round(percentage)}%</span>
        <span className="text-[10px] text-gray-500">Complete</span>
      </div>
    </div>
  )
}

// Status Icon Component
function StatusIcon({ status }: { status: SectionStatus }) {
  switch (status) {
    case 'complete':
      return (
        <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center">
          <Check size={12} className="text-emerald-600" />
        </div>
      )
    case 'partial':
      return (
        <div className="w-5 h-5 rounded-full bg-amber-100 flex items-center justify-center">
          <AlertCircle size={12} className="text-amber-600" />
        </div>
      )
    default:
      return (
        <div className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center">
          <Circle size={10} className="text-gray-400" />
        </div>
      )
  }
}

export default function CustomerProfile() {
  const [searchParams] = useSearchParams()
  const { customer, setPassword, refreshCustomer } = useCustomerAuth()
  const { showSuccess, showError } = useNotification()

  // Get initial section from URL parameter or default to 'personal'
  const initialSection = searchParams.get('section') || 'personal'
  const validSections = ['personal', 'business', 'notifications', 'security']
  const [activeSection, setActiveSection] = useState(
    validSections.includes(initialSection) ? initialSection : 'personal'
  )
  const [loading, setLoading] = useState(false)
  const [uploadingPicture, setUploadingPicture] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Profile form
  const [name, setName] = useState(customer?.name || '')
  const [phone, setPhone] = useState(customer?.phone || '')
  const [marketingConsent, setMarketingConsent] = useState(customer?.marketingConsent || false)

  // Password form
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [savingPassword, setSavingPassword] = useState(false)

  // Business details
  const [businessName, setBusinessName] = useState(customer?.businessName || '')
  const [businessVatNumber, setBusinessVatNumber] = useState(customer?.businessVatNumber || '')
  const [businessRegistrationNumber, setBusinessRegistrationNumber] = useState(customer?.businessRegistrationNumber || '')
  const [businessAddressLine1, setBusinessAddressLine1] = useState(customer?.businessAddressLine1 || '')
  const [businessAddressLine2, setBusinessAddressLine2] = useState(customer?.businessAddressLine2 || '')
  const [businessCity, setBusinessCity] = useState(customer?.businessCity || '')
  const [businessPostalCode, setBusinessPostalCode] = useState(customer?.businessPostalCode || '')
  const [businessCountry, setBusinessCountry] = useState(customer?.businessCountry || '')
  const [useBusinessDetailsOnInvoice, setUseBusinessDetailsOnInvoice] = useState(customer?.useBusinessDetailsOnInvoice || false)
  const [savingBusinessDetails, setSavingBusinessDetails] = useState(false)

  // Notification preferences
  const [notificationPrefs, setNotificationPrefs] = useState<NotificationPreferences>({
    bookings: true,
    payments: true,
    reviews: true,
    support: true,
    system: true
  })
  const [loadingNotificationPrefs, setLoadingNotificationPrefs] = useState(true)
  const [savingNotificationKey, setSavingNotificationKey] = useState<string | null>(null)

  useEffect(() => {
    if (customer) {
      setName(customer.name || '')
      setPhone(customer.phone || '')
      setMarketingConsent(customer.marketingConsent || false)
      setBusinessName(customer.businessName || '')
      setBusinessVatNumber(customer.businessVatNumber || '')
      setBusinessRegistrationNumber(customer.businessRegistrationNumber || '')
      setBusinessAddressLine1(customer.businessAddressLine1 || '')
      setBusinessAddressLine2(customer.businessAddressLine2 || '')
      setBusinessCity(customer.businessCity || '')
      setBusinessPostalCode(customer.businessPostalCode || '')
      setBusinessCountry(customer.businessCountry || '')
      setUseBusinessDetailsOnInvoice(customer.useBusinessDetailsOnInvoice || false)
    }
  }, [customer])

  // Fetch notification preferences
  useEffect(() => {
    const fetchNotificationPrefs = async () => {
      try {
        const prefs = await portalApi.getNotificationPreferences()
        setNotificationPrefs(prefs)
      } catch (error) {
        console.error('Failed to fetch notification preferences:', error)
      } finally {
        setLoadingNotificationPrefs(false)
      }
    }
    fetchNotificationPrefs()
  }, [])

  // Calculate section statuses
  const getSectionStatus = (sectionId: string): SectionStatus => {
    switch (sectionId) {
      case 'personal':
        if (customer?.name && customer?.phone && customer?.profilePictureUrl) return 'complete'
        if (customer?.name || customer?.phone) return 'partial'
        return 'empty'
      case 'security':
        return customer?.hasPassword ? 'complete' : 'empty'
      case 'business':
        if (customer?.useBusinessDetailsOnInvoice && customer?.businessName && customer?.businessVatNumber) return 'complete'
        if (customer?.businessName || customer?.businessVatNumber) return 'partial'
        return 'empty'
      case 'notifications':
        return 'complete' // Notifications section is always "complete" as it's just settings
      default:
        return 'empty'
    }
  }

  // Calculate completeness percentage
  const calculateCompleteness = (): number => {
    let score = 0
    const total = 7

    if (customer?.name) score++
    if (customer?.phone) score++
    if (customer?.profilePictureUrl) score++
    if (customer?.hasPassword) score++
    if (customer?.businessName) score++
    if (customer?.businessVatNumber) score++
    if (customer?.useBusinessDetailsOnInvoice) score++

    return Math.round((score / total) * 100)
  }

  const handleProfilePictureClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      showError('Invalid File', 'Please select an image file')
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      showError('File Too Large', 'Please select an image under 5MB')
      return
    }

    try {
      setUploadingPicture(true)
      const reader = new FileReader()
      reader.onload = async () => {
        try {
          const base64 = reader.result as string
          await portalApi.uploadProfilePicture(base64)
          await refreshCustomer()
          showSuccess('Profile Picture Updated', 'Your profile picture has been saved')
        } catch (error: any) {
          showError('Upload Failed', error.message || 'Failed to upload profile picture')
        } finally {
          setUploadingPicture(false)
        }
      }
      reader.onerror = () => {
        showError('Error', 'Failed to read file')
        setUploadingPicture(false)
      }
      reader.readAsDataURL(file)
    } catch (error: any) {
      showError('Error', error.message || 'Failed to upload profile picture')
      setUploadingPicture(false)
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleDeletePicture = async () => {
    if (!customer?.profilePictureUrl) return

    try {
      setUploadingPicture(true)
      await portalApi.deleteProfilePicture()
      await refreshCustomer()
      showSuccess('Profile Picture Removed', 'Your profile picture has been deleted')
    } catch (error: any) {
      showError('Error', error.message || 'Failed to delete profile picture')
    } finally {
      setUploadingPicture(false)
    }
  }

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
      showSuccess('Password Set', 'You can now log in with your email and password')
    } catch (error: any) {
      showError('Error', error.message || 'Failed to set password')
    } finally {
      setSavingPassword(false)
    }
  }

  const handleSaveBusinessDetails = async () => {
    try {
      setSavingBusinessDetails(true)
      await portalApi.updateProfile({
        businessName: businessName || undefined,
        businessVatNumber: businessVatNumber || undefined,
        businessRegistrationNumber: businessRegistrationNumber || undefined,
        businessAddressLine1: businessAddressLine1 || undefined,
        businessAddressLine2: businessAddressLine2 || undefined,
        businessCity: businessCity || undefined,
        businessPostalCode: businessPostalCode || undefined,
        businessCountry: businessCountry || undefined,
        useBusinessDetailsOnInvoice
      })
      await refreshCustomer()
      showSuccess('Business Details Saved', 'Your business details have been updated')
    } catch (error: any) {
      showError('Error', error.message || 'Failed to save business details')
    } finally {
      setSavingBusinessDetails(false)
    }
  }

  const handleNotificationToggle = async (key: keyof NotificationPreferences) => {
    const newValue = !notificationPrefs[key]
    setSavingNotificationKey(key)

    // Optimistic update
    setNotificationPrefs(prev => ({ ...prev, [key]: newValue }))

    try {
      await portalApi.updateNotificationPreferences({ [key]: newValue })
      showSuccess('Preference Updated', `${key.charAt(0).toUpperCase() + key.slice(1)} notifications ${newValue ? 'enabled' : 'disabled'}`)
    } catch (error) {
      // Revert on error
      setNotificationPrefs(prev => ({ ...prev, [key]: !newValue }))
      showError('Error', 'Failed to update notification preference')
    } finally {
      setSavingNotificationKey(null)
    }
  }

  const currentSectionName = sectionGroups
    .flatMap((g) => g.items)
    .find((item) => item.id === activeSection)?.name || 'Section'

  const completeness = calculateCompleteness()

  return (
    <div className="min-h-full bg-gray-50">
      {/* Header - Sticky */}
      <div className="sticky top-0 z-20 bg-white border-b border-gray-200">
        <div className="px-4 lg:px-6 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div>
                <h1 className="text-xl font-semibold text-gray-900">My Profile</h1>
                <p className="text-xs text-gray-400">Manage your account settings</p>
              </div>
              {/* Mobile Progress Ring */}
              <div className="lg:hidden">
                <ProfileProgress percentage={completeness} size={40} strokeWidth={4} />
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Section Selector */}
        <div className="lg:hidden border-t border-gray-100">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="w-full flex items-center justify-between px-4 py-3 text-left"
          >
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-900">{currentSectionName}</span>
              <StatusIcon status={getSectionStatus(activeSection)} />
            </div>
            <ChevronDown
              size={18}
              className={`text-gray-400 transition-transform ${mobileMenuOpen ? 'rotate-180' : ''}`}
            />
          </button>

          {/* Mobile Menu Dropdown */}
          {mobileMenuOpen && (
            <div className="absolute left-0 right-0 bg-white border-b border-gray-200 shadow-lg z-30 max-h-[60vh] overflow-y-auto">
              {sectionGroups.map((group) => (
                <div key={group.id} className="border-t border-gray-100 first:border-t-0">
                  <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase bg-gray-50">
                    {group.name}
                  </div>
                  {group.items.map((item) => {
                    const isActive = activeSection === item.id
                    const status = getSectionStatus(item.id)
                    const Icon = item.icon

                    return (
                      <button
                        key={item.id}
                        onClick={() => {
                          setActiveSection(item.id)
                          setMobileMenuOpen(false)
                        }}
                        className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                          isActive ? 'bg-emerald-50 text-emerald-700' : 'hover:bg-gray-50'
                        }`}
                      >
                        <Icon size={18} className={isActive ? 'text-emerald-600' : 'text-gray-400'} />
                        <span className="flex-1 text-sm">{item.name}</span>
                        <StatusIcon status={status} />
                      </button>
                    )
                  })}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex gap-6 p-4 lg:p-6">
        {/* Sidebar */}
        <div className="hidden lg:block w-64 shrink-0">
          <div className="sticky top-24 space-y-6">
            {/* Progress Ring */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex flex-col items-center">
                <ProfileProgress percentage={completeness} />
                <p className="text-sm text-gray-500 mt-3 text-center">
                  {completeness >= 80
                    ? 'Profile complete!'
                    : completeness >= 50
                      ? 'Good progress!'
                      : 'Complete your profile'}
                </p>
              </div>
            </div>

            {/* Navigation */}
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              {sectionGroups.map((group, groupIndex) => (
                <div key={group.id} className={groupIndex > 0 ? 'mt-5 pt-5 border-t border-gray-100' : ''}>
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 px-2">
                    {group.name}
                  </h3>
                  <div className="space-y-1">
                    {group.items.map((item) => {
                      const Icon = item.icon
                      const isActive = activeSection === item.id
                      const status = getSectionStatus(item.id)

                      return (
                        <button
                          key={item.id}
                          onClick={() => setActiveSection(item.id)}
                          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
                            isActive
                              ? 'bg-emerald-50 text-emerald-700'
                              : 'text-gray-700 hover:bg-gray-50'
                          }`}
                        >
                          <Icon size={18} className={isActive ? 'text-emerald-600' : 'text-gray-400'} />
                          <span className="text-sm font-medium flex-1 text-left">{item.name}</span>
                          <StatusIcon status={status} />
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 min-w-0">
          <div className="bg-white rounded-xl border border-gray-200 p-4 lg:p-6">
            {/* Personal Info Section */}
            {activeSection === 'personal' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Personal Information</h2>
                  <p className="text-sm text-gray-500 mt-1">Update your personal details and profile picture</p>
                </div>

                {/* Profile Picture */}
                <div className="flex items-center gap-6 p-4 bg-gray-50 rounded-xl">
                  <div className="relative">
                    <button
                      onClick={handleProfilePictureClick}
                      disabled={uploadingPicture}
                      className="relative w-20 h-20 rounded-full overflow-hidden border-2 border-gray-200 hover:border-gray-400 transition-colors group focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500"
                    >
                      {customer?.profilePictureUrl ? (
                        <img
                          src={customer.profilePictureUrl}
                          alt="Profile"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                          <User size={28} className="text-gray-400" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        {uploadingPicture ? (
                          <Loader2 size={20} className="text-white animate-spin" />
                        ) : (
                          <Camera size={20} className="text-white" />
                        )}
                      </div>
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900 mb-1">Profile Picture</p>
                    <p className="text-xs text-gray-500 mb-3">JPG, PNG or GIF. Max 5MB.</p>
                    <div className="flex gap-2">
                      <button
                        onClick={handleProfilePictureClick}
                        disabled={uploadingPicture}
                        className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        {uploadingPicture ? 'Uploading...' : 'Upload'}
                      </button>
                      {customer?.profilePictureUrl && (
                        <button
                          onClick={handleDeletePicture}
                          disabled={uploadingPicture}
                          className="px-3 py-1.5 text-xs font-medium text-red-600 bg-white border border-gray-300 rounded-lg hover:bg-red-50 transition-colors flex items-center gap-1"
                        >
                          <Trash2 size={12} />
                          Remove
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Form Fields */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Email Address
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                      <input
                        type="email"
                        value={customer?.email || ''}
                        disabled
                        className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg bg-gray-50 text-gray-500 text-sm"
                      />
                    </div>
                    <p className="text-xs text-gray-400 mt-1">Email cannot be changed</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Full Name
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Enter your name"
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Phone Number
                    </label>
                    <PhoneInput
                      value={phone}
                      onChange={setPhone}
                      placeholder="Phone number"
                    />
                  </div>

                  <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
                    <input
                      type="checkbox"
                      id="marketing"
                      checked={marketingConsent}
                      onChange={(e) => setMarketingConsent(e.target.checked)}
                      className="mt-0.5 w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500"
                    />
                    <label htmlFor="marketing" className="text-sm text-gray-600 cursor-pointer">
                      I'd like to receive emails about special offers and promotions
                    </label>
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-100">
                  <Button onClick={handleSaveProfile} disabled={loading}>
                    {loading ? 'Saving...' : 'Save Changes'}
                  </Button>
                </div>
              </div>
            )}

            {/* Security Section */}
            {activeSection === 'security' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Security</h2>
                  <p className="text-sm text-gray-500 mt-1">Manage your password and account security</p>
                </div>

                {customer?.hasPassword ? (
                  <div className="flex items-center gap-3 p-4 bg-emerald-50 rounded-xl border border-emerald-100">
                    <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
                      <Check size={20} className="text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-emerald-800">Password is set</p>
                      <p className="text-xs text-emerald-600">You can log in with your email and password</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="p-4 bg-amber-50 rounded-xl border border-amber-100">
                      <p className="text-sm text-amber-800">
                        Set a password to log in without magic link. This is optional but recommended for convenience.
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        New Password
                      </label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                        <input
                          type="password"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="At least 8 characters"
                          className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        Confirm Password
                      </label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                        <input
                          type="password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="Confirm your password"
                          className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm"
                        />
                      </div>
                    </div>

                    <div className="pt-4 border-t border-gray-100">
                      <Button onClick={handleSetPassword} disabled={savingPassword}>
                        {savingPassword ? 'Setting Password...' : 'Set Password'}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Business Details Section */}
            {activeSection === 'business' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Business Details</h2>
                  <p className="text-sm text-gray-500 mt-1">Add your business information to display on invoices</p>
                </div>

                <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
                  <p className="text-sm text-blue-800">
                    When enabled, your business details will appear on invoices instead of your personal name and contact info.
                  </p>
                </div>

                {/* Enable toggle */}
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                  <div>
                    <p className="text-sm font-medium text-gray-900">Use business details on invoices</p>
                    <p className="text-xs text-gray-500 mt-0.5">Your company name and VAT will be shown in the "Bill To" section</p>
                  </div>
                  <button
                    onClick={() => setUseBusinessDetailsOnInvoice(!useBusinessDetailsOnInvoice)}
                    className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 ${
                      useBusinessDetailsOnInvoice ? 'bg-emerald-500' : 'bg-gray-200'
                    }`}
                  >
                    <span
                      className={`inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        useBusinessDetailsOnInvoice ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Business / Company Name
                    </label>
                    <input
                      type="text"
                      value={businessName}
                      onChange={(e) => setBusinessName(e.target.value)}
                      placeholder="Your company name"
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        VAT Number
                      </label>
                      <VatNumberInput
                        value={businessVatNumber}
                        onChange={setBusinessVatNumber}
                      />
                      <p className="text-xs text-gray-400 mt-1">10-digit SA VAT number</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        Registration Number
                      </label>
                      <RegistrationNumberInput
                        value={businessRegistrationNumber}
                        onChange={setBusinessRegistrationNumber}
                      />
                      <p className="text-xs text-gray-400 mt-1">Format: YYYY/NNNNNN/NN</p>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Business Address
                    </label>
                    <input
                      type="text"
                      value={businessAddressLine1}
                      onChange={(e) => setBusinessAddressLine1(e.target.value)}
                      placeholder="Street address"
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm mb-2"
                    />
                    <input
                      type="text"
                      value={businessAddressLine2}
                      onChange={(e) => setBusinessAddressLine2(e.target.value)}
                      placeholder="Suite, unit, building (optional)"
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        City
                      </label>
                      <input
                        type="text"
                        value={businessCity}
                        onChange={(e) => setBusinessCity(e.target.value)}
                        placeholder="City"
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        Postal Code
                      </label>
                      <input
                        type="text"
                        value={businessPostalCode}
                        onChange={(e) => setBusinessPostalCode(e.target.value)}
                        placeholder="Postal code"
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        Country
                      </label>
                      <input
                        type="text"
                        value={businessCountry}
                        onChange={(e) => setBusinessCountry(e.target.value)}
                        placeholder="Country"
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm"
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-100">
                  <Button onClick={handleSaveBusinessDetails} disabled={savingBusinessDetails}>
                    {savingBusinessDetails ? 'Saving...' : 'Save Business Details'}
                  </Button>
                </div>
              </div>
            )}

            {/* Notifications Section */}
            {activeSection === 'notifications' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Notification Settings</h2>
                  <p className="text-sm text-gray-500 mt-1">Choose which notifications you want to receive</p>
                </div>

                {loadingNotificationPrefs ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
                  </div>
                ) : (
                  <div className="space-y-3">
                    {notificationCategories.map(category => {
                      const Icon = category.icon
                      const isEnabled = notificationPrefs[category.key]
                      const isSaving = savingNotificationKey === category.key

                      return (
                        <div
                          key={category.key}
                          className="flex items-center justify-between p-4 bg-gray-50 rounded-xl"
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                                isEnabled ? 'bg-emerald-100 text-emerald-600' : 'bg-gray-200 text-gray-400'
                              }`}
                            >
                              <Icon size={20} />
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">{category.label}</p>
                              <p className="text-sm text-gray-500">{category.description}</p>
                            </div>
                          </div>

                          <button
                            onClick={() => handleNotificationToggle(category.key)}
                            disabled={isSaving}
                            className={`relative w-11 h-6 rounded-full transition-colors ${
                              isEnabled ? 'bg-emerald-500' : 'bg-gray-300'
                            } ${isSaving ? 'opacity-50' : ''}`}
                          >
                            <span
                              className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                                isEnabled ? 'translate-x-5' : 'translate-x-0'
                              }`}
                            />
                            {isSaving && (
                              <span className="absolute inset-0 flex items-center justify-center">
                                <Loader2 className="w-3 h-3 animate-spin text-white" />
                              </span>
                            )}
                          </button>
                        </div>
                      )
                    })}
                  </div>
                )}

                <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
                  <div className="flex gap-3">
                    <Bell size={18} className="text-blue-600 shrink-0 mt-0.5" />
                    <p className="text-sm text-blue-700">
                      Even with notifications disabled, you'll still receive critical account security alerts.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

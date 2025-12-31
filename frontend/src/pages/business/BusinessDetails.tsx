import { Loader2, Upload, X, ChevronDown } from 'lucide-react'
import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import FlagIcon from '../../components/FlagIcon'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3002/api'

// Phone country codes
const PHONE_CODES = [
  { code: '+27', country: 'ZA', name: 'South Africa' },
  { code: '+1', country: 'US', name: 'United States' },
  { code: '+44', country: 'GB', name: 'United Kingdom' },
  { code: '+267', country: 'BW', name: 'Botswana' },
  { code: '+264', country: 'NA', name: 'Namibia' },
  { code: '+263', country: 'ZW', name: 'Zimbabwe' },
  { code: '+258', country: 'MZ', name: 'Mozambique' },
  { code: '+260', country: 'ZM', name: 'Zambia' },
  { code: '+254', country: 'KE', name: 'Kenya' },
  { code: '+255', country: 'TZ', name: 'Tanzania' },
  { code: '+234', country: 'NG', name: 'Nigeria' },
  { code: '+233', country: 'GH', name: 'Ghana' },
  { code: '+49', country: 'DE', name: 'Germany' },
  { code: '+33', country: 'FR', name: 'France' },
  { code: '+31', country: 'NL', name: 'Netherlands' },
  { code: '+61', country: 'AU', name: 'Australia' },
  { code: '+351', country: 'PT', name: 'Portugal' },
  { code: '+34', country: 'ES', name: 'Spain' },
  { code: '+971', country: 'AE', name: 'UAE' },
]

// Country options
const COUNTRIES = [
  'South Africa',
  'Botswana',
  'Namibia',
  'Zimbabwe',
  'Mozambique',
  'Zambia',
  'Lesotho',
  'Eswatini',
  'Kenya',
  'Tanzania',
  'Nigeria',
  'Ghana',
  'United States',
  'United Kingdom',
  'Germany',
  'France',
  'Netherlands',
  'Australia',
  'Other',
]

// Phone input component with flag dropdown
function PhoneInput({
  phoneCode,
  setPhoneCode,
  phoneNumber,
  setPhoneNumber,
  placeholder = '82 123 4567'
}: {
  phoneCode: string
  setPhoneCode: (code: string) => void
  phoneNumber: string
  setPhoneNumber: (number: string) => void
  placeholder?: string
}) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const selectedCountry = PHONE_CODES.find(pc => pc.code === phoneCode) || PHONE_CODES[0]

  return (
    <div className="flex">
      <div className="relative" ref={dropdownRef}>
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 h-full px-3 py-2 border border-r-0 border-gray-300 rounded-l-lg bg-gray-50 hover:bg-gray-100 focus:outline-none focus:ring-1 focus:ring-gray-400 transition-colors"
        >
          <FlagIcon country={selectedCountry.country} className="w-6 h-4 rounded-sm shadow-sm" />
          <span className="text-sm font-medium text-gray-700">{selectedCountry.code}</span>
          <ChevronDown size={14} className={`text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {isOpen && (
          <div className="absolute top-full left-0 mt-1 w-64 max-h-64 overflow-y-auto bg-white border border-gray-200 rounded-lg shadow-lg z-50">
            {PHONE_CODES.map((pc) => (
              <button
                key={pc.code}
                type="button"
                onClick={() => {
                  setPhoneCode(pc.code)
                  setIsOpen(false)
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 transition-colors ${
                  pc.code === phoneCode ? 'bg-gray-100' : ''
                }`}
              >
                <FlagIcon country={pc.country} className="w-6 h-4 rounded-sm shadow-sm" />
                <span className="text-sm text-gray-900">{pc.name}</span>
                <span className="text-sm text-gray-500 ml-auto">{pc.code}</span>
              </button>
            ))}
          </div>
        )}
      </div>
      <input
        type="tel"
        value={phoneNumber}
        onChange={(e) => setPhoneNumber(e.target.value.replace(/[^0-9\s]/g, ''))}
        placeholder={placeholder}
        className="flex-1 px-3 py-2 border border-gray-300 rounded-r-lg focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
      />
    </div>
  )
}

interface DayHours {
  open: string
  close: string
  closed: boolean
}

export default function BusinessDetails() {
  const { session, tenant, refreshTenant } = useAuth()
  const logoInputRef = useRef<HTMLInputElement>(null)

  // Business settings state
  const [businessName, setBusinessName] = useState('')
  const [businessDescription, setBusinessDescription] = useState('')
  const [logoUrl, setLogoUrl] = useState('')
  const [addressLine1, setAddressLine1] = useState('')
  const [addressLine2, setAddressLine2] = useState('')
  const [city, setCity] = useState('')
  const [stateProvince, setStateProvince] = useState('')
  const [postalCode, setPostalCode] = useState('')
  const [businessCountry, setBusinessCountry] = useState('South Africa')
  const [vatNumber, setVatNumber] = useState('')
  const [companyRegNumber, setCompanyRegNumber] = useState('')
  const [businessEmail, setBusinessEmail] = useState('')
  const [businessPhoneCode, setBusinessPhoneCode] = useState('+27')
  const [businessPhoneNumber, setBusinessPhoneNumber] = useState('')
  const [websiteUrl, setWebsiteUrl] = useState('')
  const [businessLoading, setBusinessLoading] = useState(false)
  const [businessMessage, setBusinessMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [logoUploading, setLogoUploading] = useState(false)

  // Business Hours state
  const defaultHours: Record<string, DayHours> = {
    monday: { open: '08:00', close: '17:00', closed: false },
    tuesday: { open: '08:00', close: '17:00', closed: false },
    wednesday: { open: '08:00', close: '17:00', closed: false },
    thursday: { open: '08:00', close: '17:00', closed: false },
    friday: { open: '08:00', close: '17:00', closed: false },
    saturday: { open: '09:00', close: '13:00', closed: false },
    sunday: { open: '09:00', close: '13:00', closed: true },
  }
  const [businessHours, setBusinessHours] = useState<Record<string, DayHours>>(defaultHours)

  // Initialize with tenant data
  useEffect(() => {
    if (tenant) {
      setBusinessName(tenant.business_name || '')
      setBusinessDescription(tenant.business_description || '')
      setLogoUrl(tenant.logo_url || '')
      setAddressLine1(tenant.address_line1 || '')
      setAddressLine2(tenant.address_line2 || '')
      setCity(tenant.city || '')
      setStateProvince(tenant.state_province || '')
      setPostalCode(tenant.postal_code || '')
      setBusinessCountry(tenant.country || 'South Africa')
      setVatNumber(tenant.vat_number || '')
      setCompanyRegNumber(tenant.company_registration_number || '')
      setBusinessEmail(tenant.business_email || '')
      setWebsiteUrl(tenant.website_url || '')

      // Parse business phone
      const fullBusinessPhone = tenant.business_phone || ''
      if (fullBusinessPhone) {
        const matchedCode = PHONE_CODES.find(pc => fullBusinessPhone.startsWith(pc.code))
        if (matchedCode) {
          setBusinessPhoneCode(matchedCode.code)
          setBusinessPhoneNumber(fullBusinessPhone.replace(matchedCode.code, '').trim())
        } else {
          setBusinessPhoneNumber(fullBusinessPhone)
        }
      }

      // Business hours
      if (tenant.business_hours) {
        setBusinessHours(tenant.business_hours as Record<string, DayHours>)
      }
    }
  }, [tenant])

  // Generate URL-friendly slug from business name
  const generateSlug = (name: string): string => {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '') // Remove special characters except spaces and hyphens
      .replace(/\s+/g, '-')     // Replace spaces with hyphens
      .replace(/-+/g, '-')      // Replace multiple hyphens with single hyphen
      .replace(/^-|-$/g, '')    // Remove leading/trailing hyphens
  }

  const handleBusinessUpdate = async () => {
    if (!session?.access_token) return

    setBusinessLoading(true)
    setBusinessMessage(null)

    // Combine business phone code and number
    const fullBusinessPhone = businessPhoneNumber ? `${businessPhoneCode}${businessPhoneNumber.replace(/^0+/, '')}` : ''

    // Auto-generate slug from business name
    const slug = businessName ? generateSlug(businessName) : null

    try {
      const response = await fetch(`${API_URL}/tenants/me`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          business_name: businessName,
          slug, // Auto-generated from business name
          business_description: businessDescription,
          address_line1: addressLine1,
          address_line2: addressLine2,
          city,
          state_province: stateProvince,
          postal_code: postalCode,
          country: businessCountry,
          vat_number: vatNumber,
          company_registration_number: companyRegNumber,
          business_email: businessEmail,
          business_phone: fullBusinessPhone,
          website_url: websiteUrl,
          business_hours: businessHours,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update business settings')
      }

      await refreshTenant()
      setBusinessMessage({ type: 'success', text: 'Business settings updated successfully' })
    } catch (error) {
      setBusinessMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to update business settings',
      })
    } finally {
      setBusinessLoading(false)
    }
  }

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !session?.access_token) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setBusinessMessage({ type: 'error', text: 'Please upload an image file' })
      return
    }

    // Validate file size (2MB)
    if (file.size > 2 * 1024 * 1024) {
      setBusinessMessage({ type: 'error', text: 'Image must be under 2MB' })
      return
    }

    setLogoUploading(true)
    setBusinessMessage(null)

    try {
      // Convert to base64
      const reader = new FileReader()
      reader.onload = async () => {
        const base64 = reader.result as string

        const response = await fetch(`${API_URL}/tenants/me/logo`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ image: base64 }),
        })

        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || 'Failed to upload logo')
        }

        setLogoUrl(data.logo_url)
        await refreshTenant()
        setBusinessMessage({ type: 'success', text: 'Logo uploaded successfully' })
        setLogoUploading(false)
      }
      reader.onerror = () => {
        setBusinessMessage({ type: 'error', text: 'Failed to read image file' })
        setLogoUploading(false)
      }
      reader.readAsDataURL(file)
    } catch (error) {
      setBusinessMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to upload logo',
      })
      setLogoUploading(false)
    }
  }

  const handleRemoveLogo = async () => {
    if (!session?.access_token) return

    setLogoUploading(true)

    try {
      const response = await fetch(`${API_URL}/tenants/me`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ logo_url: null }),
      })

      if (!response.ok) {
        throw new Error('Failed to remove logo')
      }

      setLogoUrl('')
      await refreshTenant()
      setBusinessMessage({ type: 'success', text: 'Logo removed' })
    } catch (error) {
      setBusinessMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to remove logo',
      })
    } finally {
      setLogoUploading(false)
    }
  }

  return (
    <div className="p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Business Details</h1>
        <p className="text-sm text-gray-500 mt-1">
          Configure your business details. This information will be displayed on your public booking pages and invoices.
        </p>
      </div>

      <div className="space-y-8">
        {/* Logo */}
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Business Logo</h2>
          <div className="flex items-start gap-4">
            <div className="w-24 h-24 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden bg-gray-50">
              {logoUrl ? (
                <img src={logoUrl} alt="Business logo" className="w-full h-full object-contain" />
              ) : (
                <Upload size={24} className="text-gray-400" />
              )}
            </div>
            <div className="flex-1">
              <div className="flex gap-3 mb-2">
                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="hidden"
                />
                <button
                  onClick={() => logoInputRef.current?.click()}
                  disabled={logoUploading}
                  className="flex items-center gap-2 px-4 py-2 bg-accent-500 text-white rounded-md text-sm font-medium hover:bg-accent-600 transition-colors disabled:opacity-50"
                >
                  {logoUploading ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Upload size={16} />
                  )}
                  Upload Logo
                </button>
                {logoUrl && (
                  <button
                    onClick={handleRemoveLogo}
                    disabled={logoUploading}
                    className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-md text-sm font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
                  >
                    <X size={16} />
                    Remove
                  </button>
                )}
              </div>
              <p className="text-xs text-gray-500">
                PNG, JPG, GIF up to 2MB. Recommended: 200x200px or larger, square format.
              </p>
            </div>
          </div>
        </div>

        {/* Basic Info */}
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Basic Information</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Business Name
              </label>
              <input
                type="text"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                placeholder="Enter your business name"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
              />
              {businessName && (
                <p className="mt-2 text-xs text-gray-500">
                  Your listing URL: <span className="font-medium text-accent-600">/accommodation/{generateSlug(businessName)}</span>
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Business Description
              </label>
              <textarea
                value={businessDescription}
                onChange={(e) => setBusinessDescription(e.target.value)}
                placeholder="Describe your business..."
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
              />
              <p className="mt-1 text-xs text-gray-500">
                This description may be shown on your public booking pages.
              </p>
            </div>
          </div>
        </div>

        {/* Address */}
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Address</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Address Line 1
              </label>
              <input
                type="text"
                value={addressLine1}
                onChange={(e) => setAddressLine1(e.target.value)}
                placeholder="Street address"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Address Line 2
              </label>
              <input
                type="text"
                value={addressLine2}
                onChange={(e) => setAddressLine2(e.target.value)}
                placeholder="Apartment, suite, unit, etc. (optional)"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  City
                </label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="City"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  State/Province
                </label>
                <input
                  type="text"
                  value={stateProvince}
                  onChange={(e) => setStateProvince(e.target.value)}
                  placeholder="State or Province"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Postal Code
                </label>
                <input
                  type="text"
                  value={postalCode}
                  onChange={(e) => setPostalCode(e.target.value)}
                  placeholder="Postal code"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Country
                </label>
                <select
                  value={businessCountry}
                  onChange={(e) => setBusinessCountry(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
                >
                  {COUNTRIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Tax Information */}
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Tax Information</h2>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              VAT Number
            </label>
            <input
              type="text"
              value={vatNumber}
              onChange={(e) => setVatNumber(e.target.value)}
              placeholder="VAT registration number (optional)"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
            />
            <p className="mt-1 text-xs text-gray-500">
              Your VAT/Tax ID will be displayed on invoices if provided.
            </p>
          </div>
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Company Registration Number
            </label>
            <input
              type="text"
              value={companyRegNumber}
              onChange={(e) => setCompanyRegNumber(e.target.value)}
              placeholder="Company registration number (optional)"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
            />
            <p className="mt-1 text-xs text-gray-500">
              Your company registration number for official documentation.
            </p>
          </div>
        </div>

        {/* Contact Information */}
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Contact Information</h2>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Business Email
                </label>
                <input
                  type="email"
                  value={businessEmail}
                  onChange={(e) => setBusinessEmail(e.target.value)}
                  placeholder="contact@business.com"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Business Phone
                </label>
                <PhoneInput
                  phoneCode={businessPhoneCode}
                  setPhoneCode={setBusinessPhoneCode}
                  phoneNumber={businessPhoneNumber}
                  setPhoneNumber={setBusinessPhoneNumber}
                  placeholder="12 345 6789"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Website URL
              </label>
              <input
                type="url"
                value={websiteUrl}
                onChange={(e) => setWebsiteUrl(e.target.value)}
                placeholder="https://www.yourbusiness.com"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
              />
            </div>
          </div>
        </div>

        {/* Business Hours */}
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-2">Business Hours</h2>
          <p className="text-xs text-gray-500 mb-4">
            Set your operating hours for each day. These will be displayed on your public pages.
          </p>
          <div className="space-y-3">
            {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map((day) => (
              <div key={day} className="flex items-center gap-4">
                <div className="w-24">
                  <span className="text-sm font-medium text-gray-700 capitalize">{day}</span>
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={businessHours[day]?.closed || false}
                    onChange={(e) => {
                      setBusinessHours(prev => ({
                        ...prev,
                        [day]: { ...prev[day], closed: e.target.checked }
                      }))
                    }}
                    className="w-4 h-4 text-gray-900 border-gray-300 rounded focus:ring-gray-500"
                  />
                  <span className="text-sm text-gray-600">Closed</span>
                </label>
                {!businessHours[day]?.closed && (
                  <div className="flex items-center gap-2 flex-1">
                    <input
                      type="time"
                      value={businessHours[day]?.open || '08:00'}
                      onChange={(e) => {
                        setBusinessHours(prev => ({
                          ...prev,
                          [day]: { ...prev[day], open: e.target.value }
                        }))
                      }}
                      className="px-2 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
                    />
                    <span className="text-gray-400">to</span>
                    <input
                      type="time"
                      value={businessHours[day]?.close || '17:00'}
                      onChange={(e) => {
                        setBusinessHours(prev => ({
                          ...prev,
                          [day]: { ...prev[day], close: e.target.value }
                        }))
                      }}
                      className="px-2 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
                    />
                  </div>
                )}
                {businessHours[day]?.closed && (
                  <span className="text-sm text-gray-400 italic">Closed all day</span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Save Button */}
        <div className="flex items-center gap-4 pt-4">
          <button
            onClick={handleBusinessUpdate}
            disabled={businessLoading}
            className="flex items-center gap-2 px-6 py-2.5 bg-accent-500 text-white rounded-lg text-sm font-medium hover:bg-accent-600 transition-colors disabled:opacity-50"
          >
            {businessLoading && <Loader2 size={16} className="animate-spin" />}
            Save Changes
          </button>
          {businessMessage && (
            <span
              className={`text-sm ${
                businessMessage.type === 'success' ? 'text-accent-600' : 'text-red-600'
              }`}
            >
              {businessMessage.text}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

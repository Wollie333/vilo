import { Upload, X, ChevronDown, Image, Building2, MapPin, Receipt, Phone, Clock } from 'lucide-react'
import { useState, useEffect, useRef, useMemo } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import FlagIcon from '../../components/FlagIcon'
import VatNumberInput from '../../components/VatNumberInput'
import RegistrationNumberInput from '../../components/RegistrationNumberInput'
import {
  BusinessDetailsLayout,
  BusinessDetailsSidebar,
  BusinessPreviewPanel
} from '../../components/business'
import { useBusinessCompleteness, BusinessFormData } from '../../hooks/useBusinessCompleteness'
import { useAutoSave } from '../../hooks/useAutoSave'

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
  'South Africa', 'Botswana', 'Namibia', 'Zimbabwe', 'Mozambique', 'Zambia',
  'Lesotho', 'Eswatini', 'Kenya', 'Tanzania', 'Nigeria', 'Ghana',
  'United States', 'United Kingdom', 'Germany', 'France', 'Netherlands', 'Australia', 'Other',
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
          className="flex items-center gap-2 h-full px-3 py-2 border border-r-0 border-gray-200 rounded-l-lg bg-gray-50 hover:bg-gray-100 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-colors"
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
        className="flex-1 px-4 py-3 border border-gray-200 rounded-r-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
      />
    </div>
  )
}

interface DayHours {
  open: string
  close: string
  closed: boolean
}

// Section Header Component
function SectionHeader({ icon: Icon, title, description }: { icon: React.ElementType; title: string; description?: string }) {
  return (
    <div className="mb-6">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center">
          <Icon size={20} className="text-emerald-600" />
        </div>
        <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
      </div>
      {description && (
        <p className="text-sm text-gray-500 ml-[52px]">{description}</p>
      )}
    </div>
  )
}

export default function BusinessDetails() {
  const { session, tenant, refreshTenant } = useAuth()
  const logoInputRef = useRef<HTMLInputElement>(null)
  const [activeSection, setActiveSection] = useState('logo')

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
  const [logoUploading, setLogoUploading] = useState(false)
  const [businessMessage, setBusinessMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

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

  // Full phone for display
  const fullBusinessPhone = businessPhoneNumber ? `${businessPhoneCode}${businessPhoneNumber.replace(/^0+/, '')}` : ''

  // Prepare form data for completeness hook
  const formData: BusinessFormData = useMemo(() => ({
    logoUrl,
    businessName,
    businessDescription,
    addressLine1,
    addressLine2,
    city,
    stateProvince,
    postalCode,
    businessCountry,
    vatNumber,
    companyRegNumber,
    businessEmail,
    businessPhone: fullBusinessPhone,
    websiteUrl,
    businessHours
  }), [
    logoUrl, businessName, businessDescription, addressLine1, addressLine2,
    city, stateProvince, postalCode, businessCountry, vatNumber, companyRegNumber,
    businessEmail, fullBusinessPhone, websiteUrl, businessHours
  ])

  // Completeness tracking
  const { totalPercentage, incompleteItems, getSectionStatus } = useBusinessCompleteness(formData)

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
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
  }

  const handleBusinessUpdate = async () => {
    if (!session?.access_token) return

    setBusinessMessage(null)

    // Auto-generate slug from business name
    const slug = businessName ? generateSlug(businessName) : null

    const response = await fetch(`${API_URL}/tenants/me`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        business_name: businessName,
        slug,
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
  }

  // Auto-save hook
  const { isSaving, lastSaved, save } = useAutoSave(
    handleBusinessUpdate,
    [formData],
    { enabled: false }
  )

  // Compute hasUnsavedChanges by comparing current form state against tenant data
  const hasUnsavedChanges = useMemo(() => {
    if (!tenant) return false

    // Compare each field against tenant data
    const tenantPhone = tenant.business_phone || ''
    const tenantPhoneCode = PHONE_CODES.find(pc => tenantPhone.startsWith(pc.code))?.code || '+27'
    const tenantPhoneNumber = tenantPhoneCode ? tenantPhone.replace(tenantPhoneCode, '').trim() : tenantPhone

    return (
      businessName !== (tenant.business_name || '') ||
      businessDescription !== (tenant.business_description || '') ||
      logoUrl !== (tenant.logo_url || '') ||
      addressLine1 !== (tenant.address_line1 || '') ||
      addressLine2 !== (tenant.address_line2 || '') ||
      city !== (tenant.city || '') ||
      stateProvince !== (tenant.state_province || '') ||
      postalCode !== (tenant.postal_code || '') ||
      businessCountry !== (tenant.country || 'South Africa') ||
      vatNumber !== (tenant.vat_number || '') ||
      companyRegNumber !== (tenant.company_registration_number || '') ||
      businessEmail !== (tenant.business_email || '') ||
      businessPhoneCode !== tenantPhoneCode ||
      businessPhoneNumber !== tenantPhoneNumber ||
      websiteUrl !== (tenant.website_url || '') ||
      JSON.stringify(businessHours) !== JSON.stringify(tenant.business_hours || defaultHours)
    )
  }, [
    tenant, businessName, businessDescription, logoUrl, addressLine1, addressLine2,
    city, stateProvince, postalCode, businessCountry, vatNumber, companyRegNumber,
    businessEmail, businessPhoneCode, businessPhoneNumber, websiteUrl, businessHours
  ])

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !session?.access_token) return

    if (!file.type.startsWith('image/')) {
      setBusinessMessage({ type: 'error', text: 'Please upload an image file' })
      return
    }

    if (file.size > 2 * 1024 * 1024) {
      setBusinessMessage({ type: 'error', text: 'Image must be under 2MB' })
      return
    }

    setLogoUploading(true)
    setBusinessMessage(null)

    try {
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

  // Render section content based on active section
  const renderSectionContent = () => {
    switch (activeSection) {
      case 'logo':
        return (
          <div>
            <SectionHeader
              icon={Image}
              title="Business Logo"
              description="Upload your logo to display on invoices and booking pages"
            />
            <div className="flex items-start gap-6">
              <div className="w-32 h-32 rounded-xl border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden bg-gray-50">
                {logoUrl ? (
                  <img src={logoUrl} alt="Business logo" className="w-full h-full object-contain" />
                ) : (
                  <Upload size={32} className="text-gray-400" />
                )}
              </div>
              <div className="flex-1">
                <div className="flex gap-3 mb-3">
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
                    className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors disabled:opacity-50"
                  >
                    <Upload size={16} />
                    {logoUploading ? 'Uploading...' : 'Upload Logo'}
                  </button>
                  {logoUrl && (
                    <button
                      onClick={handleRemoveLogo}
                      disabled={logoUploading}
                      className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
                    >
                      <X size={16} />
                      Remove
                    </button>
                  )}
                </div>
                <p className="text-sm text-gray-500">
                  PNG, JPG, GIF up to 2MB. Recommended: 200x200px or larger, square format.
                </p>
              </div>
            </div>
          </div>
        )

      case 'basic-info':
        return (
          <div>
            <SectionHeader
              icon={Building2}
              title="Basic Information"
              description="Your business name and description"
            />
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Business Name
                </label>
                <input
                  type="text"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  placeholder="Enter your business name"
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                {businessName && (
                  <p className="mt-2 text-xs text-gray-500">
                    Your listing URL: <span className="font-medium text-emerald-600">/accommodation/{generateSlug(businessName)}</span>
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
                  rows={5}
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                />
                <p className="mt-2 text-xs text-gray-500">
                  This description may be shown on your public booking pages.
                </p>
              </div>
            </div>
          </div>
        )

      case 'address':
        return (
          <div>
            <SectionHeader
              icon={MapPin}
              title="Business Address"
              description="Your physical business location"
            />
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
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Address Line 2 <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <input
                  type="text"
                  value={addressLine2}
                  onChange={(e) => setAddressLine2(e.target.value)}
                  placeholder="Apartment, suite, unit, etc."
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    City
                  </label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="City"
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
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
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Postal Code
                  </label>
                  <input
                    type="text"
                    value={postalCode}
                    onChange={(e) => setPostalCode(e.target.value)}
                    placeholder="Postal code"
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Country
                  </label>
                  <div className="relative">
                    <select
                      value={businessCountry}
                      onChange={(e) => setBusinessCountry(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 appearance-none bg-white"
                    >
                      {COUNTRIES.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )

      case 'tax':
        return (
          <div>
            <SectionHeader
              icon={Receipt}
              title="Tax Information"
              description="Tax and registration details for invoicing (optional)"
            />
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  VAT Number <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <VatNumberInput
                  value={vatNumber}
                  onChange={setVatNumber}
                  className="py-3"
                />
                <p className="mt-2 text-xs text-gray-500">
                  10-digit SA VAT number. Will be displayed on invoices if provided.
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Company Registration Number <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <RegistrationNumberInput
                  value={companyRegNumber}
                  onChange={setCompanyRegNumber}
                  className="py-3"
                />
                <p className="mt-2 text-xs text-gray-500">
                  Format: YYYY/NNNNNN/NN (e.g., 2024/123456/07)
                </p>
              </div>
            </div>
          </div>
        )

      case 'contact':
        return (
          <div>
            <SectionHeader
              icon={Phone}
              title="Contact Information"
              description="How guests and customers can reach you"
            />
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Business Email
                  </label>
                  <input
                    type="email"
                    value={businessEmail}
                    onChange={(e) => setBusinessEmail(e.target.value)}
                    placeholder="contact@business.com"
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
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
                  Website URL <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <input
                  type="url"
                  value={websiteUrl}
                  onChange={(e) => setWebsiteUrl(e.target.value)}
                  placeholder="https://www.yourbusiness.com"
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>
          </div>
        )

      case 'hours':
        return (
          <div>
            <SectionHeader
              icon={Clock}
              title="Business Hours"
              description="Set your operating hours for each day"
            />
            <div className="space-y-3">
              {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map((day) => (
                <div key={day} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                  <div className="w-28">
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
                      className="w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500"
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
                        className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
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
                        className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                  )}
                  {businessHours[day]?.closed && (
                    <span className="text-sm text-gray-400 italic flex-1">Closed all day</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )

      default:
        return null
    }
  }

  // Mobile preview content
  const mobilePreviewContent = (
    <div className="bg-gradient-to-br from-gray-50 to-white rounded-lg border border-gray-200 p-4">
      <div className="flex items-start gap-3 mb-3">
        <div className="w-14 h-14 rounded-lg bg-gray-100 flex items-center justify-center overflow-hidden shrink-0">
          {logoUrl ? (
            <img src={logoUrl} alt="Business logo" className="w-full h-full object-contain" />
          ) : (
            <Building2 size={24} className="text-gray-400" />
          )}
        </div>
        <div>
          <h4 className="font-semibold text-gray-900 text-sm">
            {businessName || 'Your Business Name'}
          </h4>
          <p className="text-xs text-gray-500">
            {[city, stateProvince, businessCountry].filter(Boolean).join(', ') || 'Location not set'}
          </p>
        </div>
      </div>
      {businessDescription && (
        <p className="text-xs text-gray-600 line-clamp-2">{businessDescription}</p>
      )}
    </div>
  )

  return (
    <BusinessDetailsLayout
      activeSection={activeSection}
      onSectionChange={setActiveSection}
      getSectionStatus={getSectionStatus}
      completenessPercentage={totalPercentage}
      isSaving={isSaving}
      lastSaved={lastSaved}
      hasUnsavedChanges={hasUnsavedChanges}
      onSave={save}
      mobilePreviewContent={mobilePreviewContent}
      sidebar={
        <BusinessDetailsSidebar
          activeSection={activeSection}
          onSectionChange={setActiveSection}
          getSectionStatus={getSectionStatus}
          completenessPercentage={totalPercentage}
        />
      }
      preview={
        <BusinessPreviewPanel
          logoUrl={logoUrl}
          businessName={businessName}
          businessDescription={businessDescription}
          city={city}
          stateProvince={stateProvince}
          businessCountry={businessCountry}
          businessEmail={businessEmail}
          businessPhone={fullBusinessPhone}
          websiteUrl={websiteUrl}
          incompleteItems={incompleteItems}
          onNavigateToSection={setActiveSection}
        />
      }
    >
      {/* Section Content with Animation */}
      <div className="min-h-[400px]">
        <div key={activeSection} className="animate-fade-in">
          {renderSectionContent()}
        </div>
      </div>

      {/* Message */}
      {businessMessage && (
        <div
          className={`mt-6 p-4 rounded-lg text-sm ${
            businessMessage.type === 'success'
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              : 'bg-red-50 text-red-700 border border-red-200'
          }`}
        >
          {businessMessage.text}
        </div>
      )}
    </BusinessDetailsLayout>
  )
}

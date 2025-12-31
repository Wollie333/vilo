import { useState, FormEvent } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Check, Building2, User, Phone, Upload, X } from 'lucide-react'
import { supabase } from '../lib/supabase'
import TermsAcceptance from '../components/TermsAcceptance'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3002/api'

const PROPERTY_TYPES = [
  { value: 'guesthouse', label: 'Guest House' },
  { value: 'lodge', label: 'Lodge' },
  { value: 'hotel', label: 'Hotel' },
  { value: 'bnb', label: 'Bed & Breakfast' },
  { value: 'self-catering', label: 'Self-Catering' },
  { value: 'safari', label: 'Safari/Game Lodge' },
  { value: 'backpackers', label: 'Backpackers' },
  { value: 'boutique', label: 'Boutique Hotel' },
  { value: 'other', label: 'Other' }
]

const REGIONS = [
  { value: 'Western Cape', slug: 'western-cape' },
  { value: 'Eastern Cape', slug: 'eastern-cape' },
  { value: 'Gauteng', slug: 'gauteng' },
  { value: 'KwaZulu-Natal', slug: 'kwazulu-natal' },
  { value: 'Free State', slug: 'free-state' },
  { value: 'Limpopo', slug: 'limpopo' },
  { value: 'Mpumalanga', slug: 'mpumalanga' },
  { value: 'North West', slug: 'north-west' },
  { value: 'Northern Cape', slug: 'northern-cape' }
]

const PLAN_DISPLAY = {
  lifetime: { name: 'Lifetime Access', price: 'R1,999 once' },
  annual: { name: 'Annual Plan', price: 'R4,999/year' },
  monthly: { name: 'Monthly Plan', price: 'R499/month' }
}

interface FormData {
  // Step 1: Account
  firstName: string
  lastName: string
  email: string
  password: string
  confirmPassword: string
  // Step 2: Property
  businessName: string
  propertyType: string
  region: string
  businessDescription: string
  // Step 3: Contact
  businessPhone: string
  addressLine1: string
  city: string
  stateProvince: string
  country: string
  logoFile: File | null
  logoPreview: string | null
}

export default function HostSignup() {
  const [searchParams] = useSearchParams()
  const plan = (searchParams.get('plan') as 'lifetime' | 'monthly' | 'annual') || 'lifetime'

  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [termsAccepted, setTermsAccepted] = useState(false)

  const [formData, setFormData] = useState<FormData>({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    businessName: '',
    propertyType: '',
    region: '',
    businessDescription: '',
    businessPhone: '',
    addressLine1: '',
    city: '',
    stateProvince: '',
    country: 'South Africa',
    logoFile: null,
    logoPreview: null
  })

  const updateFormData = (field: keyof FormData, value: string | File | null) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      updateFormData('logoFile', file)
      const reader = new FileReader()
      reader.onloadend = () => {
        updateFormData('logoPreview', reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const removeLogo = () => {
    updateFormData('logoFile', null)
    updateFormData('logoPreview', null)
  }

  const validateStep1 = (): boolean => {
    if (!formData.firstName.trim()) {
      setError('First name is required')
      return false
    }
    if (!formData.lastName.trim()) {
      setError('Last name is required')
      return false
    }
    if (!formData.email.trim() || !formData.email.includes('@')) {
      setError('Valid email is required')
      return false
    }
    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters')
      return false
    }
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match')
      return false
    }
    return true
  }

  const validateStep2 = (): boolean => {
    if (!formData.businessName.trim()) {
      setError('Business name is required')
      return false
    }
    if (!formData.propertyType) {
      setError('Property type is required')
      return false
    }
    if (!formData.region) {
      setError('Region is required')
      return false
    }
    return true
  }

  const validateStep3 = (): boolean => {
    if (!formData.businessPhone.trim()) {
      setError('Phone number is required')
      return false
    }
    if (!formData.city.trim()) {
      setError('City is required')
      return false
    }
    return true
  }

  const nextStep = () => {
    setError('')
    if (step === 1 && !validateStep1()) return
    if (step === 2 && !validateStep2()) return
    setStep(prev => Math.min(prev + 1, 3))
  }

  const prevStep = () => {
    setError('')
    setStep(prev => Math.max(prev - 1, 1))
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')

    if (!validateStep3()) return

    setLoading(true)

    try {
      // Step 1: Upload logo if exists
      let logoUrl: string | null = null
      if (formData.logoFile) {
        const fileExt = formData.logoFile.name.split('.').pop()
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
        const filePath = `logos/${fileName}`

        const { error: uploadError } = await supabase.storage
          .from('public')
          .upload(filePath, formData.logoFile)

        if (!uploadError) {
          const { data: { publicUrl } } = supabase.storage
            .from('public')
            .getPublicUrl(filePath)
          logoUrl = publicUrl
        }
      }

      // Step 2: Create Supabase account
      const { data: authData, error: signupError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            first_name: formData.firstName,
            last_name: formData.lastName
          }
        }
      })

      if (signupError) {
        setError(signupError.message)
        setLoading(false)
        return
      }

      if (!authData.session) {
        setError('Please check your email to confirm your account, then sign in.')
        setLoading(false)
        return
      }

      // Step 3: Initialize payment with profile data
      const selectedRegion = REGIONS.find(r => r.value === formData.region)

      const response = await fetch(`${API_URL}/payments/initialize-with-profile`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authData.session.access_token}`
        },
        body: JSON.stringify({
          plan,
          currency: 'ZAR',
          profile: {
            businessName: formData.businessName,
            propertyType: formData.propertyType,
            region: formData.region,
            regionSlug: selectedRegion?.slug || '',
            businessDescription: formData.businessDescription,
            businessPhone: formData.businessPhone,
            addressLine1: formData.addressLine1,
            city: formData.city,
            stateProvince: formData.stateProvince,
            country: formData.country,
            logoUrl
          }
        })
      })

      const data = await response.json()

      if (data.authorization_url) {
        window.location.href = data.authorization_url
      } else {
        setError(data.error || 'Failed to initialize payment')
        setLoading(false)
      }
    } catch (err) {
      console.error('Signup error:', err)
      setError('Something went wrong. Please try again.')
      setLoading(false)
    }
  }

  const planInfo = PLAN_DISPLAY[plan]

  return (
    <div className="min-h-screen flex">
      {/* Left side - Visual */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-gray-900">
        <img
          src="https://images.unsplash.com/photo-1566073771259-6a8506099945?q=80&w=2070&auto=format&fit=crop"
          alt="Beautiful accommodation"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />

        {/* Plan info card */}
        <div className="absolute bottom-0 left-0 right-0 p-8">
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center">
                <Check size={16} className="text-white" />
              </div>
              <span className="text-white/80 text-sm">Selected Plan</span>
            </div>
            <h3 className="text-2xl font-bold text-white mb-1">{planInfo.name}</h3>
            <p className="text-white/70">{planInfo.price}</p>
            <Link
              to="/pricing"
              className="text-emerald-400 text-sm hover:underline mt-4 inline-block"
            >
              Change plan
            </Link>
          </div>
        </div>
      </div>

      {/* Right side - Form */}
      <div className="flex-1 flex flex-col bg-white">
        {/* Header */}
        <div className="px-8 py-6 border-b border-gray-100">
          <div className="max-w-md mx-auto flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">V</span>
              </div>
              <span className="text-xl font-bold text-gray-900">Vilo</span>
            </Link>
            <Link to="/login" className="text-sm text-gray-600 hover:text-gray-900">
              Already have an account?
            </Link>
          </div>
        </div>

        {/* Progress indicator */}
        <div className="px-8 py-6">
          <div className="max-w-md mx-auto">
            <div className="flex items-center justify-between mb-2">
              {[1, 2, 3].map((s) => (
                <div key={s} className="flex items-center">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                      s < step
                        ? 'bg-emerald-500 text-white'
                        : s === step
                        ? 'bg-gray-900 text-white'
                        : 'bg-gray-100 text-gray-400'
                    }`}
                  >
                    {s < step ? <Check size={16} /> : s}
                  </div>
                  {s < 3 && (
                    <div
                      className={`w-16 sm:w-24 h-1 mx-2 rounded ${
                        s < step ? 'bg-emerald-500' : 'bg-gray-100'
                      }`}
                    />
                  )}
                </div>
              ))}
            </div>
            <div className="flex justify-between text-xs text-gray-500">
              <span>Account</span>
              <span>Property</span>
              <span>Contact</span>
            </div>
          </div>
        </div>

        {/* Form content */}
        <div className="flex-1 px-8 py-6 overflow-y-auto">
          <div className="max-w-md mx-auto">
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                  {error}
                </div>
              )}

              {/* Step 1: Account Details */}
              {step === 1 && (
                <div className="space-y-6">
                  <div className="text-center mb-8">
                    <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <User size={24} className="text-gray-600" />
                    </div>
                    <h2 className="text-2xl font-semibold text-gray-900 mb-2">Create your account</h2>
                    <p className="text-gray-500 text-sm">Enter your personal details to get started</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        First name
                      </label>
                      <input
                        type="text"
                        value={formData.firstName}
                        onChange={(e) => updateFormData('firstName', e.target.value)}
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                        placeholder="John"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        Last name
                      </label>
                      <input
                        type="text"
                        value={formData.lastName}
                        onChange={(e) => updateFormData('lastName', e.target.value)}
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                        placeholder="Doe"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Email address
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => updateFormData('email', e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                      placeholder="john@example.com"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Password
                    </label>
                    <input
                      type="password"
                      value={formData.password}
                      onChange={(e) => updateFormData('password', e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                      placeholder="At least 6 characters"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Confirm password
                    </label>
                    <input
                      type="password"
                      value={formData.confirmPassword}
                      onChange={(e) => updateFormData('confirmPassword', e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                      placeholder="Confirm your password"
                    />
                  </div>
                </div>
              )}

              {/* Step 2: Property Info */}
              {step === 2 && (
                <div className="space-y-6">
                  <div className="text-center mb-8">
                    <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Building2 size={24} className="text-gray-600" />
                    </div>
                    <h2 className="text-2xl font-semibold text-gray-900 mb-2">Tell us about your property</h2>
                    <p className="text-gray-500 text-sm">This helps guests find your listing</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Business / Property name
                    </label>
                    <input
                      type="text"
                      value={formData.businessName}
                      onChange={(e) => updateFormData('businessName', e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                      placeholder="e.g. Sunset Beach Lodge"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Property type
                    </label>
                    <select
                      value={formData.propertyType}
                      onChange={(e) => updateFormData('propertyType', e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent bg-white"
                    >
                      <option value="">Select property type</option>
                      {PROPERTY_TYPES.map((type) => (
                        <option key={type.value} value={type.value}>
                          {type.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Region / Province
                    </label>
                    <select
                      value={formData.region}
                      onChange={(e) => updateFormData('region', e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent bg-white"
                    >
                      <option value="">Select region</option>
                      {REGIONS.map((region) => (
                        <option key={region.slug} value={region.value}>
                          {region.value}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Description <span className="text-gray-400">(optional)</span>
                    </label>
                    <textarea
                      value={formData.businessDescription}
                      onChange={(e) => updateFormData('businessDescription', e.target.value)}
                      rows={3}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent resize-none"
                      placeholder="Tell potential guests about your property..."
                    />
                  </div>
                </div>
              )}

              {/* Step 3: Contact & Branding */}
              {step === 3 && (
                <div className="space-y-6">
                  <div className="text-center mb-8">
                    <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Phone size={24} className="text-gray-600" />
                    </div>
                    <h2 className="text-2xl font-semibold text-gray-900 mb-2">Contact & Branding</h2>
                    <p className="text-gray-500 text-sm">How guests can reach you</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Phone number
                    </label>
                    <input
                      type="tel"
                      value={formData.businessPhone}
                      onChange={(e) => updateFormData('businessPhone', e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                      placeholder="+27 XX XXX XXXX"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Street address <span className="text-gray-400">(optional)</span>
                    </label>
                    <input
                      type="text"
                      value={formData.addressLine1}
                      onChange={(e) => updateFormData('addressLine1', e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                      placeholder="123 Beach Road"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        City
                      </label>
                      <input
                        type="text"
                        value={formData.city}
                        onChange={(e) => updateFormData('city', e.target.value)}
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                        placeholder="Cape Town"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        Province <span className="text-gray-400">(optional)</span>
                      </label>
                      <input
                        type="text"
                        value={formData.stateProvince}
                        onChange={(e) => updateFormData('stateProvince', e.target.value)}
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                        placeholder="Western Cape"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Logo <span className="text-gray-400">(optional)</span>
                    </label>
                    {formData.logoPreview ? (
                      <div className="relative w-24 h-24 rounded-lg overflow-hidden border border-gray-200">
                        <img
                          src={formData.logoPreview}
                          alt="Logo preview"
                          className="w-full h-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={removeLogo}
                          className="absolute top-1 right-1 w-6 h-6 bg-black/50 rounded-full flex items-center justify-center hover:bg-black/70 transition-colors"
                        >
                          <X size={14} className="text-white" />
                        </button>
                      </div>
                    ) : (
                      <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-200 border-dashed rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                          <Upload size={24} className="text-gray-400 mb-2" />
                          <p className="text-sm text-gray-500">Click to upload logo</p>
                          <p className="text-xs text-gray-400">PNG, JPG up to 2MB</p>
                        </div>
                        <input
                          type="file"
                          className="hidden"
                          accept="image/*"
                          onChange={handleLogoChange}
                        />
                      </label>
                    )}
                  </div>

                  {/* Terms Acceptance */}
                  <TermsAcceptance
                    accepted={termsAccepted}
                    onChange={setTermsAccepted}
                  />
                </div>
              )}

              {/* Navigation buttons */}
              <div className="flex gap-4 pt-4">
                {step > 1 && (
                  <button
                    type="button"
                    onClick={prevStep}
                    className="flex items-center justify-center gap-2 px-6 py-3 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <ArrowLeft size={16} />
                    Back
                  </button>
                )}

                {step < 3 ? (
                  <button
                    type="button"
                    onClick={nextStep}
                    className="flex-1 flex items-center justify-center gap-2 py-3 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors"
                  >
                    Continue
                    <ArrowRight size={16} />
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={loading || !termsAccepted}
                    className="flex-1 py-3 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? 'Processing...' : `Complete Registration & Pay ${planInfo.price}`}
                  </button>
                )}
              </div>

              {/* Mobile plan info */}
              <div className="lg:hidden mt-6 p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Selected plan</p>
                    <p className="font-semibold text-gray-900">{planInfo.name}</p>
                  </div>
                  <p className="font-semibold text-gray-900">{planInfo.price}</p>
                </div>
                <Link
                  to="/pricing"
                  className="text-emerald-600 text-sm hover:underline mt-2 inline-block"
                >
                  Change plan
                </Link>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}

import { Wrench, UserPlus, Bell, Globe, CreditCard, Loader2, Trash2, Upload, X, ChevronDown, Check, Calendar, AlertCircle, Building2, Eye, EyeOff, Users, Mail, Copy, Shield, MessageCircle, Link2 } from 'lucide-react'
import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import FlagIcon from '../components/FlagIcon'
import { supabase } from '../lib/supabase'
import DomainSettings from '../components/DomainSettings'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3002/api'

// Language options
const LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'af', name: 'Afrikaans' },
  { code: 'zu', name: 'Zulu' },
  { code: 'xh', name: 'Xhosa' },
  { code: 'st', name: 'Sotho' },
  { code: 'tn', name: 'Tswana' },
  { code: 'pt', name: 'Portuguese' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'es', name: 'Spanish' },
  { code: 'nl', name: 'Dutch' },
]

// Currency options
const CURRENCIES = [
  { code: 'ZAR', name: 'South African Rand (R)', symbol: 'R' },
  { code: 'USD', name: 'US Dollar ($)', symbol: '$' },
  { code: 'EUR', name: 'Euro (\u20AC)', symbol: '\u20AC' },
  { code: 'GBP', name: 'British Pound (\u00A3)', symbol: '\u00A3' },
  { code: 'BWP', name: 'Botswana Pula (P)', symbol: 'P' },
  { code: 'NAD', name: 'Namibian Dollar (N$)', symbol: 'N$' },
  { code: 'MZN', name: 'Mozambican Metical (MT)', symbol: 'MT' },
  { code: 'KES', name: 'Kenyan Shilling (KSh)', symbol: 'KSh' },
  { code: 'NGN', name: 'Nigerian Naira (\u20A6)', symbol: '\u20A6' },
  { code: 'AUD', name: 'Australian Dollar (A$)', symbol: 'A$' },
]

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

export default function Settings() {
  const { user, session, tenant, signOut, refreshTenant, refreshUser, isOwner } = useAuth()
  const navigate = useNavigate()
  const [activeSection, setActiveSection] = useState('account')
  const [twoStepEnabled, setTwoStepEnabled] = useState(false)
  const logoInputRef = useRef<HTMLInputElement>(null)
  const avatarInputRef = useRef<HTMLInputElement>(null)
  const [avatarUrl, setAvatarUrl] = useState('')
  const [avatarUploading, setAvatarUploading] = useState(false)

  // Profile state
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [phoneCode, setPhoneCode] = useState('+27')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [profileLoading, setProfileLoading] = useState(false)
  const [profileMessage, setProfileMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Email state
  const [email, setEmail] = useState('')
  const [emailLoading, setEmailLoading] = useState(false)
  const [emailMessage, setEmailMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Password state
  const [showPasswordForm, setShowPasswordForm] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordLoading, setPasswordLoading] = useState(false)
  const [passwordMessage, setPasswordMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Delete account state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [deleteLoading, setDeleteLoading] = useState(false)

  // Language & Region state
  const [language, setLanguage] = useState('en')
  const [currency, setCurrency] = useState('ZAR')
  const [country, setCountry] = useState('South Africa')
  const [timezone, setTimezone] = useState('Africa/Johannesburg')
  const [dateFormat, setDateFormat] = useState('DD/MM/YYYY')
  const [regionLoading, setRegionLoading] = useState(false)
  const [regionMessage, setRegionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Business/General settings state
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
  const [businessEmail, setBusinessEmail] = useState('')
  const [businessPhoneCode, setBusinessPhoneCode] = useState('+27')
  const [businessPhoneNumber, setBusinessPhoneNumber] = useState('')
  const [websiteUrl, setWebsiteUrl] = useState('')
  const [businessLoading, setBusinessLoading] = useState(false)
  const [businessMessage, setBusinessMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [logoUploading, setLogoUploading] = useState(false)

  // Business Hours state
  interface DayHours {
    open: string
    close: string
    closed: boolean
  }
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

  // Billing state
  const [hasActiveSubscription, setHasActiveSubscription] = useState(false)
  const [subscriptionDate, setSubscriptionDate] = useState<string | null>(null)
  const [subscriptionPlan, setSubscriptionPlan] = useState<'lifetime' | 'monthly' | 'annual' | null>(null)
  const [billingLoading, setBillingLoading] = useState(false)
  const [selectedBillingCycle, setSelectedBillingCycle] = useState<'monthly' | 'annual'>('annual')
  const [billingPrices, setBillingPrices] = useState<{
    lifetime: { amount: number; currency: string }
    monthly: { amount: number; currency: string }
    annual: { amount: number; currency: string }
    exchangeRate: number
  } | null>(null)
  const [pricesLoading, setPricesLoading] = useState(true)

  // Payment history (would come from API)
  const [paymentHistory, _setPaymentHistory] = useState<Array<{
    id: string
    date: string
    description: string
    amount: number
    currency: string
    status: 'success' | 'pending' | 'failed'
    reference: string
  }>>([])

  // Team Members state
  interface TeamMember {
    id: string
    user_id: string
    email: string
    name: string | null
    avatar_url: string | null
    role: 'owner' | 'general_manager' | 'accountant'
    status: 'pending' | 'active' | 'suspended' | 'removed'
    joined_at: string | null
  }

  interface Invitation {
    id: string
    email: string
    role: 'general_manager' | 'accountant'
    invitation_code: string
    expires_at: string
    status: string
    invited_at: string
    is_expired?: boolean
  }

  const [members, setMembers] = useState<TeamMember[]>([])
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [membersLoading, setMembersLoading] = useState(false)
  const [membersMessage, setMembersMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<'general_manager' | 'accountant'>('general_manager')
  const [inviteMethod, setInviteMethod] = useState<'email' | 'code'>('code')
  const [inviteLoading, setInviteLoading] = useState(false)
  const [generatedCode, setGeneratedCode] = useState<string | null>(null)
  const [showRemoveModal, setShowRemoveModal] = useState(false)
  const [memberToRemove, setMemberToRemove] = useState<TeamMember | null>(null)

  // Payment Apps State
  // Toggle debounce to prevent accidental double-clicks
  const lastToggleRef = useRef<{ [key: string]: number }>({})
  const canToggle = (key: string) => {
    const now = Date.now()
    const lastToggle = lastToggleRef.current[key] || 0
    if (now - lastToggle < 300) return false
    lastToggleRef.current[key] = now
    return true
  }

  // Paystack
  const [paystackEnabled, setPaystackEnabled] = useState(false)
  const [paystackMode, setPaystackMode] = useState<'test' | 'live'>('test')
  const [paystackTestPublicKey, setPaystackTestPublicKey] = useState('')
  const [paystackTestSecretKey, setPaystackTestSecretKey] = useState('')
  const [paystackLivePublicKey, setPaystackLivePublicKey] = useState('')
  const [paystackLiveSecretKey, setPaystackLiveSecretKey] = useState('')
  const [showPaystackSecretKey, setShowPaystackSecretKey] = useState(false)
  const [paystackLoading, setPaystackLoading] = useState(false)
  const [paystackMessage, setPaystackMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // EFT/Bank Details
  const [eftEnabled, setEftEnabled] = useState(false)
  const [eftAccountHolder, setEftAccountHolder] = useState('')
  const [eftBankName, setEftBankName] = useState('')
  const [eftAccountNumber, setEftAccountNumber] = useState('')
  const [eftBranchCode, setEftBranchCode] = useState('')
  const [eftAccountType, setEftAccountType] = useState<'cheque' | 'savings' | 'current'>('cheque')
  const [eftSwiftCode, setEftSwiftCode] = useState('')
  const [eftReferenceInstructions, setEftReferenceInstructions] = useState('')
  const [eftLoading, setEftLoading] = useState(false)
  const [eftMessage, setEftMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // PayPal
  const [paypalEnabled, setPaypalEnabled] = useState(false)
  const [paypalMode, setPaypalMode] = useState<'sandbox' | 'live'>('sandbox')
  const [paypalSandboxClientId, setPaypalSandboxClientId] = useState('')
  const [paypalSandboxSecret, setPaypalSandboxSecret] = useState('')
  const [paypalLiveClientId, setPaypalLiveClientId] = useState('')
  const [paypalLiveSecret, setPaypalLiveSecret] = useState('')
  const [showPaypalSecret, setShowPaypalSecret] = useState(false)
  const [paypalLoading, setPaypalLoading] = useState(false)
  const [paypalMessage, setPaypalMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Calendar Sync State
  // Airbnb
  const [airbnbSyncEnabled, setAirbnbSyncEnabled] = useState(false)
  const [airbnbIcalImportUrl, setAirbnbIcalImportUrl] = useState('')
  const [airbnbSyncFrequency, setAirbnbSyncFrequency] = useState<'15min' | 'hourly' | '6hours' | 'daily'>('hourly')
  const [airbnbSyncLoading, setAirbnbSyncLoading] = useState(false)
  const [airbnbSyncMessage, setAirbnbSyncMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Booking.com
  const [bookingComSyncEnabled, setBookingComSyncEnabled] = useState(false)
  const [bookingComIcalImportUrl, setBookingComIcalImportUrl] = useState('')
  const [bookingComSyncFrequency, setBookingComSyncFrequency] = useState<'15min' | 'hourly' | '6hours' | 'daily'>('hourly')
  const [bookingComSyncLoading, setBookingComSyncLoading] = useState(false)
  const [bookingComSyncMessage, setBookingComSyncMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // LekkeSlaap
  const [lekkeslaapSyncEnabled, setLekkeslaapSyncEnabled] = useState(false)
  const [lekkeslaapIcalImportUrl, setLekkeslaapIcalImportUrl] = useState('')
  const [lekkeslaapSyncFrequency, setLekkeslaapSyncFrequency] = useState<'15min' | 'hourly' | '6hours' | 'daily'>('hourly')
  const [lekkeslaapSyncLoading, setLekkeslaapSyncLoading] = useState(false)
  const [lekkeslaapSyncMessage, setLekkeslaapSyncMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // VRBO
  const [vrboSyncEnabled, setVrboSyncEnabled] = useState(false)
  const [vrboIcalImportUrl, setVrboIcalImportUrl] = useState('')
  const [vrboSyncFrequency, setVrboSyncFrequency] = useState<'15min' | 'hourly' | '6hours' | 'daily'>('hourly')
  const [vrboSyncLoading, setVrboSyncLoading] = useState(false)
  const [vrboSyncMessage, setVrboSyncMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Expedia
  const [expediaSyncEnabled, setExpediaSyncEnabled] = useState(false)
  const [expediaIcalImportUrl, setExpediaIcalImportUrl] = useState('')
  const [expediaSyncFrequency, setExpediaSyncFrequency] = useState<'15min' | 'hourly' | '6hours' | 'daily'>('hourly')
  const [expediaSyncLoading, setExpediaSyncLoading] = useState(false)
  const [expediaSyncMessage, setExpediaSyncMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // TripAdvisor
  const [tripadvisorSyncEnabled, setTripadvisorSyncEnabled] = useState(false)
  const [tripadvisorIcalImportUrl, setTripadvisorIcalImportUrl] = useState('')
  const [tripadvisorSyncFrequency, setTripadvisorSyncFrequency] = useState<'15min' | 'hourly' | '6hours' | 'daily'>('hourly')
  const [tripadvisorSyncLoading, setTripadvisorSyncLoading] = useState(false)
  const [tripadvisorSyncMessage, setTripadvisorSyncMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Agoda
  const [agodaSyncEnabled, setAgodaSyncEnabled] = useState(false)
  const [agodaIcalImportUrl, setAgodaIcalImportUrl] = useState('')
  const [agodaSyncFrequency, setAgodaSyncFrequency] = useState<'15min' | 'hourly' | '6hours' | 'daily'>('hourly')
  const [agodaSyncLoading, setAgodaSyncLoading] = useState(false)
  const [agodaSyncMessage, setAgodaSyncMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Hotels.com
  const [hotelsComSyncEnabled, setHotelsComSyncEnabled] = useState(false)
  const [hotelsComIcalImportUrl, setHotelsComIcalImportUrl] = useState('')
  const [hotelsComSyncFrequency, setHotelsComSyncFrequency] = useState<'15min' | 'hourly' | '6hours' | 'daily'>('hourly')
  const [hotelsComSyncLoading, setHotelsComSyncLoading] = useState(false)
  const [hotelsComSyncMessage, setHotelsComSyncMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Google Calendar
  const [googleCalSyncEnabled, setGoogleCalSyncEnabled] = useState(false)
  const [googleCalIcalImportUrl, setGoogleCalIcalImportUrl] = useState('')
  const [googleCalSyncFrequency, setGoogleCalSyncFrequency] = useState<'15min' | 'hourly' | '6hours' | 'daily'>('hourly')
  const [googleCalSyncLoading, setGoogleCalSyncLoading] = useState(false)
  const [googleCalSyncMessage, setGoogleCalSyncMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Outlook/Microsoft
  const [outlookSyncEnabled, setOutlookSyncEnabled] = useState(false)
  const [outlookIcalImportUrl, setOutlookIcalImportUrl] = useState('')
  const [outlookSyncFrequency, setOutlookSyncFrequency] = useState<'15min' | 'hourly' | '6hours' | 'daily'>('hourly')
  const [outlookSyncLoading, setOutlookSyncLoading] = useState(false)
  const [outlookSyncMessage, setOutlookSyncMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Clipboard copy state
  const [copiedPlatform, setCopiedPlatform] = useState<string | null>(null)

  // Fetch billing prices on mount
  useEffect(() => {
    const fetchPrices = async () => {
      try {
        const response = await fetch(API_URL + '/payments/prices?currency=ZAR')
        if (response.ok) {
          const data = await response.json()
          setBillingPrices({
            lifetime: data.lifetime,
            monthly: data.monthly,
            annual: data.annual,
            exchangeRate: data.exchangeRate
          })
        }
      } catch (error) {
        console.error('Error fetching prices:', error)
      } finally {
        setPricesLoading(false)
      }
    }
    fetchPrices()
  }, [])

  // Paystack payment handler - uses backend API with ZAR conversion
  const handlePaystackPayment = async () => {
    setBillingLoading(true)
    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token
      const response = await fetch(API_URL + '/payments/initialize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + token,
        },
        body: JSON.stringify({ plan: 'lifetime', currency: 'ZAR' }),
      })
      const data = await response.json()
      if (data.authorization_url) {
        window.location.href = data.authorization_url
      } else {
        alert(data.error || 'Failed to initialize payment')
        setBillingLoading(false)
      }
    } catch (error) {
      console.error('Payment error:', error)
      alert('Payment failed. Please try again.')
      setBillingLoading(false)
    }
  }

  // Subscription payment handler - uses backend API with ZAR
  const handleSubscriptionPayment = async (plan: 'monthly' | 'annual') => {
    setBillingLoading(true)
    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token
      const response = await fetch(API_URL + '/payments/initialize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + token,
        },
        body: JSON.stringify({ plan, currency: 'ZAR' }),
      })
      const data = await response.json()
      if (data.authorization_url) {
        window.location.href = data.authorization_url
      } else {
        alert(data.error || 'Failed to initialize payment')
        setBillingLoading(false)
      }
    } catch (error) {
      console.error('Subscription payment error:', error)
      alert('Payment failed. Please try again.')
      setBillingLoading(false)
    }
  }

  // Initialize form with user data
  useEffect(() => {
    if (user) {
      setEmail(user.email || '')
      setFirstName(user.user_metadata?.first_name || '')
      setLastName(user.user_metadata?.last_name || '')
      setAvatarUrl(user.user_metadata?.avatar_url || '')

      // Parse phone number to extract country code
      const fullPhone = user.phone || user.user_metadata?.phone || ''
      if (fullPhone) {
        // Try to match known country codes
        const matchedCode = PHONE_CODES.find(pc => fullPhone.startsWith(pc.code))
        if (matchedCode) {
          setPhoneCode(matchedCode.code)
          setPhoneNumber(fullPhone.replace(matchedCode.code, '').trim())
        } else {
          setPhoneNumber(fullPhone)
        }
      }
    }
  }, [user])

  // Initialize with tenant data
  useEffect(() => {
    if (tenant) {
      // Subscription status from tenant
      if (tenant.has_lifetime_access) {
        setHasActiveSubscription(true)
        setSubscriptionPlan('lifetime')
        setSubscriptionDate(tenant.created_at || null)
      }

      // Regional settings
      setLanguage(tenant.language || 'en')
      setCurrency(tenant.currency || 'ZAR')
      setCountry(tenant.country || 'South Africa')
      setTimezone(tenant.timezone || 'Africa/Johannesburg')
      setDateFormat(tenant.date_format || 'DD/MM/YYYY')
      // Business settings
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

      // Paystack settings
      setPaystackEnabled(tenant.paystack_enabled || false)
      setPaystackMode((tenant.paystack_mode as 'test' | 'live') || 'test')
      setPaystackTestPublicKey(tenant.paystack_test_public_key || '')
      setPaystackTestSecretKey(tenant.paystack_test_secret_key || '')
      setPaystackLivePublicKey(tenant.paystack_live_public_key || '')
      setPaystackLiveSecretKey(tenant.paystack_live_secret_key || '')

      // EFT settings
      setEftEnabled(tenant.eft_enabled || false)
      setEftAccountHolder(tenant.eft_account_holder || '')
      setEftBankName(tenant.eft_bank_name || '')
      setEftAccountNumber(tenant.eft_account_number || '')
      setEftBranchCode(tenant.eft_branch_code || '')
      setEftAccountType((tenant.eft_account_type as 'cheque' | 'savings' | 'current') || 'cheque')
    }
  }, [tenant])

  const generalSettings = [
    { id: 'apps', name: 'Apps', icon: Wrench },
    { id: 'account', name: 'Account', icon: UserPlus },
    { id: 'notification', name: 'Notification', icon: Bell },
    { id: 'language', name: 'Language & Region', icon: Globe },
  ]

  const workspaceSettings = [
    { id: 'general', name: 'General', icon: Wrench },
    { id: 'domains', name: 'Domains', icon: Link2 },
    { id: 'members', name: 'Members', icon: UserPlus },
    { id: 'billing', name: 'Billing', icon: CreditCard },
  ]

  const getInitials = () => {
    const first = firstName || user?.email?.charAt(0) || ''
    const last = lastName || ''
    return (first.charAt(0) + last.charAt(0)).toUpperCase() || 'U'
  }

  const handleProfileUpdate = async () => {
    if (!session?.access_token) return

    setProfileLoading(true)
    setProfileMessage(null)

    // Combine phone code and number
    const fullPhone = phoneNumber ? `${phoneCode}${phoneNumber.replace(/^0+/, '')}` : ''

    try {
      const response = await fetch(`${API_URL}/users/me`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          first_name: firstName,
          last_name: lastName,
          phone: fullPhone,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update profile')
      }

      // Refresh user data to get updated metadata
      await refreshUser()
      setProfileMessage({ type: 'success', text: 'Profile updated successfully' })
    } catch (error) {
      setProfileMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to update profile',
      })
    } finally {
      setProfileLoading(false)
    }
  }

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !session?.access_token) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setProfileMessage({ type: 'error', text: 'Please upload an image file' })
      return
    }

    // Validate file size (2MB)
    if (file.size > 2 * 1024 * 1024) {
      setProfileMessage({ type: 'error', text: 'Image must be under 2MB' })
      return
    }

    setAvatarUploading(true)
    setProfileMessage(null)

    try {
      const reader = new FileReader()
      reader.onload = async () => {
        const base64 = reader.result as string

        const response = await fetch(`${API_URL}/users/me/avatar`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ image: base64 }),
        })

        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || 'Failed to upload avatar')
        }

        setAvatarUrl(data.avatar_url)
        await refreshUser()
        setProfileMessage({ type: 'success', text: 'Profile image updated' })
        setAvatarUploading(false)
      }
      reader.onerror = () => {
        setProfileMessage({ type: 'error', text: 'Failed to read image file' })
        setAvatarUploading(false)
      }
      reader.readAsDataURL(file)
    } catch (error) {
      setProfileMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to upload avatar',
      })
      setAvatarUploading(false)
    }
  }

  const handleRemoveAvatar = async () => {
    if (!session?.access_token) return

    setAvatarUploading(true)

    try {
      const response = await fetch(`${API_URL}/users/me`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ avatar_url: null }),
      })

      if (!response.ok) {
        throw new Error('Failed to remove avatar')
      }

      setAvatarUrl('')
      await refreshUser()
      setProfileMessage({ type: 'success', text: 'Profile image removed' })
    } catch (error) {
      setProfileMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to remove avatar',
      })
    } finally {
      setAvatarUploading(false)
    }
  }

  const handleEmailUpdate = async () => {
    if (!session?.access_token || !email) return

    setEmailLoading(true)
    setEmailMessage(null)

    try {
      const response = await fetch(`${API_URL}/users/me/email`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ email }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update email')
      }

      setEmailMessage({ type: 'success', text: 'Email updated successfully' })
    } catch (error) {
      setEmailMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to update email',
      })
    } finally {
      setEmailLoading(false)
    }
  }

  const handlePasswordUpdate = async () => {
    if (!session?.access_token) return

    if (newPassword !== confirmPassword) {
      setPasswordMessage({ type: 'error', text: 'Passwords do not match' })
      return
    }

    if (newPassword.length < 6) {
      setPasswordMessage({ type: 'error', text: 'Password must be at least 6 characters' })
      return
    }

    setPasswordLoading(true)
    setPasswordMessage(null)

    try {
      const response = await fetch(`${API_URL}/users/me/password`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ new_password: newPassword }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update password')
      }

      setPasswordMessage({ type: 'success', text: 'Password updated successfully' })
      setNewPassword('')
      setConfirmPassword('')
      setShowPasswordForm(false)
    } catch (error) {
      setPasswordMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to update password',
      })
    } finally {
      setPasswordLoading(false)
    }
  }

  const handleDeleteAccount = async () => {
    if (!session?.access_token) return
    if (deleteConfirmText !== 'DELETE') return

    setDeleteLoading(true)

    try {
      const response = await fetch(`${API_URL}/users/me`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete account')
      }

      await signOut()
      navigate('/')
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to delete account')
      setDeleteLoading(false)
    }
  }

  const handleRegionUpdate = async () => {
    if (!session?.access_token) return

    setRegionLoading(true)
    setRegionMessage(null)

    try {
      const response = await fetch(`${API_URL}/tenants/me`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          language,
          currency,
          country,
          timezone,
          date_format: dateFormat,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update regional settings')
      }

      await refreshTenant()
      setRegionMessage({ type: 'success', text: 'Regional settings updated successfully' })
    } catch (error) {
      setRegionMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to update regional settings',
      })
    } finally {
      setRegionLoading(false)
    }
  }

  const handleBusinessUpdate = async () => {
    if (!session?.access_token) return

    setBusinessLoading(true)
    setBusinessMessage(null)

    // Combine business phone code and number
    const fullBusinessPhone = businessPhoneNumber ? `${businessPhoneCode}${businessPhoneNumber.replace(/^0+/, '')}` : ''

    try {
      const response = await fetch(`${API_URL}/tenants/me`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          business_name: businessName,
          business_description: businessDescription,
          address_line1: addressLine1,
          address_line2: addressLine2,
          city,
          state_province: stateProvince,
          postal_code: postalCode,
          country: businessCountry,
          vat_number: vatNumber,
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

  // Payment Apps Handlers
  const handlePaystackSave = async () => {
    if (!session?.access_token) return

    setPaystackLoading(true)
    setPaystackMessage(null)

    try {
      const response = await fetch(`${API_URL}/tenants/me/payment-apps/paystack`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          enabled: paystackEnabled,
          mode: paystackMode,
          test_public_key: paystackTestPublicKey,
          test_secret_key: paystackTestSecretKey,
          live_public_key: paystackLivePublicKey,
          live_secret_key: paystackLiveSecretKey,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save Paystack settings')
      }

      setPaystackMessage({ type: 'success', text: 'Paystack settings saved successfully' })
    } catch (error) {
      setPaystackMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to save Paystack settings',
      })
    } finally {
      setPaystackLoading(false)
    }
  }

  const handleEftSave = async () => {
    if (!session?.access_token) return

    setEftLoading(true)
    setEftMessage(null)

    try {
      const response = await fetch(`${API_URL}/tenants/me/payment-apps/eft`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          enabled: eftEnabled,
          account_holder: eftAccountHolder,
          bank_name: eftBankName,
          account_number: eftAccountNumber,
          branch_code: eftBranchCode,
          account_type: eftAccountType,
          swift_code: eftSwiftCode,
          reference_instructions: eftReferenceInstructions,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save EFT settings')
      }

      setEftMessage({ type: 'success', text: 'EFT settings saved successfully' })
    } catch (error) {
      setEftMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to save EFT settings',
      })
    } finally {
      setEftLoading(false)
    }
  }

  const handlePaypalSave = async () => {
    if (!session?.access_token) return

    setPaypalLoading(true)
    setPaypalMessage(null)

    try {
      const response = await fetch(`${API_URL}/tenants/me/payment-apps/paypal`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          enabled: paypalEnabled,
          mode: paypalMode,
          sandbox_client_id: paypalSandboxClientId,
          sandbox_secret: paypalSandboxSecret,
          live_client_id: paypalLiveClientId,
          live_secret: paypalLiveSecret,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save PayPal settings')
      }

      setPaypalMessage({ type: 'success', text: 'PayPal settings saved successfully' })
    } catch (error) {
      setPaypalMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to save PayPal settings',
      })
    } finally {
      setPaypalLoading(false)
    }
  }

  // Copy to clipboard helper
  const copyToClipboard = async (text: string, platform: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedPlatform(platform)
      setTimeout(() => setCopiedPlatform(null), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  // Get export URL for a platform
  const getExportUrl = (platform: string) => {
    const baseUrl = window.location.origin
    return `${baseUrl}/api/ical/${tenant?.id || 'your-tenant-id'}/${platform}.ics`
  }

  // Generic sync save handler
  const handleSyncSave = async (
    platform: string,
    enabled: boolean,
    icalUrl: string,
    frequency: string,
    setLoading: (loading: boolean) => void,
    setMessage: (msg: { type: 'success' | 'error'; text: string } | null) => void
  ) => {
    if (!session?.access_token) return

    setLoading(true)
    setMessage(null)

    try {
      const response = await fetch(`${API_URL}/tenants/me/sync-apps/${platform}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          enabled,
          ical_import_url: icalUrl,
          sync_frequency: frequency,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || `Failed to save ${platform} sync settings`)
      }

      setMessage({ type: 'success', text: 'Sync settings saved successfully' })
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : `Failed to save ${platform} sync settings`,
      })
    } finally {
      setLoading(false)
    }
  }

  // Team Members Handlers
  const fetchMembers = async () => {
    if (!session?.access_token) return

    setMembersLoading(true)
    try {
      const response = await fetch(`${API_URL}/members`, {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        setMembers(data.members || [])
      }
    } catch (error) {
      console.error('Error fetching members:', error)
    } finally {
      setMembersLoading(false)
    }
  }

  const fetchInvitations = async () => {
    if (!session?.access_token) return

    try {
      const response = await fetch(`${API_URL}/members/invitations`, {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        setInvitations(data.invitations || [])
      }
    } catch (error) {
      console.error('Error fetching invitations:', error)
    }
  }

  const handleInviteMember = async () => {
    if (!session?.access_token || !inviteEmail) return

    setInviteLoading(true)
    setMembersMessage(null)
    setGeneratedCode(null)

    try {
      const response = await fetch(`${API_URL}/members/invite`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          email: inviteEmail,
          role: inviteRole,
          method: inviteMethod,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send invitation')
      }

      if (inviteMethod === 'code') {
        setGeneratedCode(data.invitation.invitation_code)
        setMembersMessage({ type: 'success', text: 'Invitation code generated!' })
      } else {
        setMembersMessage({ type: 'success', text: 'Invitation email sent successfully!' })
        setShowInviteModal(false)
        setInviteEmail('')
      }

      fetchInvitations()
    } catch (error) {
      setMembersMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to send invitation',
      })
    } finally {
      setInviteLoading(false)
    }
  }

  const handleCancelInvitation = async (invitationId: string) => {
    if (!session?.access_token) return

    try {
      const response = await fetch(`${API_URL}/members/invite/${invitationId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      })

      if (response.ok) {
        setMembersMessage({ type: 'success', text: 'Invitation cancelled' })
        fetchInvitations()
      } else {
        const data = await response.json()
        throw new Error(data.error || 'Failed to cancel invitation')
      }
    } catch (error) {
      setMembersMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to cancel invitation',
      })
    }
  }

  const handleRemoveMember = async () => {
    if (!session?.access_token || !memberToRemove) return

    try {
      const response = await fetch(`${API_URL}/members/${memberToRemove.user_id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      })

      if (response.ok) {
        setMembersMessage({ type: 'success', text: 'Team member removed' })
        setShowRemoveModal(false)
        setMemberToRemove(null)
        fetchMembers()
      } else {
        const data = await response.json()
        throw new Error(data.error || 'Failed to remove member')
      }
    } catch (error) {
      setMembersMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to remove member',
      })
    }
  }

  const handleRoleChange = async (userId: string, newRole: 'general_manager' | 'accountant') => {
    if (!session?.access_token) return

    try {
      const response = await fetch(`${API_URL}/members/${userId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ role: newRole }),
      })

      if (response.ok) {
        setMembersMessage({ type: 'success', text: 'Role updated successfully' })
        fetchMembers()
      } else {
        const data = await response.json()
        throw new Error(data.error || 'Failed to update role')
      }
    } catch (error) {
      setMembersMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to update role',
      })
    }
  }

  const copyInviteCodeToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    setMembersMessage({ type: 'success', text: 'Copied to clipboard!' })
    setTimeout(() => setMembersMessage(null), 2000)
  }

  const shareViaEmail = (email: string, code: string) => {
    const subject = encodeURIComponent(`You're invited to join ${tenant?.business_name || 'our team'} on Vilo`)
    const body = encodeURIComponent(
      `Hi,\n\nYou've been invited to join ${tenant?.business_name || 'our team'} on Vilo.\n\n` +
      `Use this invitation code: ${code}\n\n` +
      `Join here: ${window.location.origin}/join\n\n` +
      `This code expires in 7 days.`
    )
    window.open(`mailto:${email}?subject=${subject}&body=${body}`)
  }

  const shareViaWhatsApp = (code: string) => {
    const message = encodeURIComponent(
      `You're invited to join ${tenant?.business_name || 'our team'} on Vilo!\n\n` +
      `Use this code: *${code}*\n\n` +
      `Join here: ${window.location.origin}/join`
    )
    window.open(`https://wa.me/?text=${message}`, '_blank')
  }

  // Load members when section is active
  useEffect(() => {
    if (activeSection === 'members' && session?.access_token) {
      fetchMembers()
      fetchInvitations()
    }
  }, [activeSection, session?.access_token])

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

  return (
    <div className="p-8 bg-white min-h-full">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Account Settings</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column - Settings Navigation */}
        <div className="lg:col-span-1 space-y-6">
          <div>
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
              GENERAL SETTINGS
            </h2>
            <div className="space-y-1">
              {generalSettings.map((item) => {
                const Icon = item.icon
                const isActive = activeSection === item.id
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveSection(item.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md transition-all ${
                      isActive
                        ? 'bg-gray-100 text-gray-900 font-medium'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <Icon size={18} />
                    <span className="text-sm">{item.name}</span>
                  </button>
                )
              })}
            </div>
          </div>

          <div>
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
              WORKSPACE SETTINGS
            </h2>
            <div className="space-y-1">
              {workspaceSettings.map((item) => {
                const Icon = item.icon
                const isActive = activeSection === item.id
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveSection(item.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md transition-all ${
                      isActive
                        ? 'bg-gray-100 text-gray-900 font-medium'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <Icon size={18} />
                    <span className="text-sm">{item.name}</span>
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {/* Right Column - Settings Content */}
        <div className="lg:col-span-2">
          {/* Account Section */}
          {activeSection === 'account' && (
            <div className="space-y-8">
              {/* My Profile */}
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-4">My Profile</h2>
                <div className="flex items-start gap-6">
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-gray-400 to-gray-600 flex items-center justify-center overflow-hidden">
                    {avatarUrl ? (
                      <img src={avatarUrl} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-white text-2xl font-semibold">{getInitials()}</span>
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex gap-3 mb-4">
                      <input
                        ref={avatarInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleAvatarUpload}
                        className="hidden"
                      />
                      <button
                        onClick={() => avatarInputRef.current?.click()}
                        disabled={avatarUploading}
                        className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-md text-sm font-medium hover:bg-gray-800 transition-colors disabled:opacity-50"
                      >
                        {avatarUploading ? (
                          <Loader2 size={16} className="animate-spin" />
                        ) : (
                          <Upload size={16} />
                        )}
                        <span>Change Image</span>
                      </button>
                      {avatarUrl && (
                        <button
                          onClick={handleRemoveAvatar}
                          disabled={avatarUploading}
                          className="flex items-center gap-2 px-4 py-2 bg-white text-gray-900 border border-gray-300 rounded-md text-sm font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
                        >
                          <X size={16} />
                          Remove Image
                        </button>
                      )}
                    </div>
                    <p className="text-sm text-gray-500">
                      We support PNGs, JPEGs and GIFs under 2MB
                    </p>
                  </div>
                </div>
                <div className="mt-6 grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      First Name
                    </label>
                    <input
                      type="text"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder="Enter first name"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Last Name
                    </label>
                    <input
                      type="text"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      placeholder="Enter last name"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
                    />
                  </div>
                </div>
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Phone Number
                  </label>
                  <PhoneInput
                    phoneCode={phoneCode}
                    setPhoneCode={setPhoneCode}
                    phoneNumber={phoneNumber}
                    setPhoneNumber={setPhoneNumber}
                  />
                  <p className="mt-1.5 text-xs text-gray-500">
                    Enter your number without the leading zero
                  </p>
                </div>
                <div className="mt-4 flex items-center gap-4">
                  <button
                    onClick={handleProfileUpdate}
                    disabled={profileLoading}
                    className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-md text-sm font-medium hover:bg-gray-800 transition-colors disabled:opacity-50"
                  >
                    {profileLoading && <Loader2 size={16} className="animate-spin" />}
                    Save Profile
                  </button>
                  {profileMessage && (
                    <span
                      className={`text-sm ${
                        profileMessage.type === 'success' ? 'text-green-600' : 'text-red-600'
                      }`}
                    >
                      {profileMessage.text}
                    </span>
                  )}
                </div>
              </div>

              {/* Account Security */}
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Account Security</h2>
                <div className="space-y-4">
                  {/* Email */}
                  <div>
                    <div className="flex items-end gap-4">
                      <div className="flex-1">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Email
                        </label>
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
                        />
                      </div>
                      <button
                        onClick={handleEmailUpdate}
                        disabled={emailLoading || email === user?.email}
                        className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
                      >
                        {emailLoading ? <Loader2 size={16} className="animate-spin" /> : 'Update Email'}
                      </button>
                    </div>
                    {emailMessage && (
                      <p
                        className={`mt-2 text-sm ${
                          emailMessage.type === 'success' ? 'text-green-600' : 'text-red-600'
                        }`}
                      >
                        {emailMessage.text}
                      </p>
                    )}
                  </div>

                  {/* Password */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-sm font-medium text-gray-700">Password</label>
                      <button
                        onClick={() => setShowPasswordForm(!showPasswordForm)}
                        className="text-sm font-medium text-gray-700 hover:text-gray-900"
                      >
                        {showPasswordForm ? 'Cancel' : 'Change password'}
                      </button>
                    </div>
                    {!showPasswordForm ? (
                      <input
                        type="password"
                        value="••••••••••••"
                        disabled
                        className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
                      />
                    ) : (
                      <div className="space-y-3">
                        <div>
                          <input
                            type="password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            placeholder="New password"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
                          />
                        </div>
                        <div>
                          <input
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="Confirm new password"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
                          />
                        </div>
                        <div className="flex items-center gap-4">
                          <button
                            onClick={handlePasswordUpdate}
                            disabled={passwordLoading || !newPassword || !confirmPassword}
                            className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-md text-sm font-medium hover:bg-gray-800 transition-colors disabled:opacity-50"
                          >
                            {passwordLoading && <Loader2 size={16} className="animate-spin" />}
                            Update Password
                          </button>
                          {passwordMessage && (
                            <span
                              className={`text-sm ${
                                passwordMessage.type === 'success' ? 'text-green-600' : 'text-red-600'
                              }`}
                            >
                              {passwordMessage.text}
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* 2-Step Verification */}
                  <div className="flex items-center justify-between pt-2">
                    <div className="flex-1">
                      <h3 className="text-sm font-medium text-gray-900 mb-1">
                        2-Step Verifications
                      </h3>
                      <p className="text-sm text-gray-500">
                        Add an additional layer of security to your account during login.
                      </p>
                    </div>
                    <button
                      onClick={() => setTwoStepEnabled(!twoStepEnabled)}
                      className={`ml-4 w-12 h-6 rounded-full transition-colors ${
                        twoStepEnabled ? 'bg-black' : 'bg-gray-300'
                      }`}
                    >
                      <div
                        className={`w-5 h-5 bg-white rounded-full transition-transform ${
                          twoStepEnabled ? 'translate-x-6' : 'translate-x-0.5'
                        }`}
                        style={{ marginTop: '2px' }}
                      />
                    </button>
                  </div>
                </div>
              </div>

              {/* Danger Zone */}
              <div className="border-t border-gray-200 pt-8">
                <h2 className="text-lg font-semibold text-red-600 mb-4">Danger Zone</h2>
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-sm font-medium text-gray-900">Delete Account</h3>
                      <p className="text-sm text-gray-500 mt-1">
                        Permanently delete your account and all associated data. This action cannot be undone.
                      </p>
                    </div>
                    <button
                      onClick={() => setShowDeleteConfirm(true)}
                      className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-md text-sm font-medium hover:bg-red-700 transition-colors"
                    >
                      <Trash2 size={16} />
                      Delete Account
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Language & Region Section */}
          {activeSection === 'language' && (
            <div className="space-y-8">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-2">Language & Region</h2>
                <p className="text-sm text-gray-500 mb-6">
                  Configure your preferred language, currency, and regional settings. These settings affect how dates, numbers, and prices are displayed throughout the application.
                </p>

                <div className="space-y-6">
                  {/* Language */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Language
                    </label>
                    <select
                      value={language}
                      onChange={(e) => setLanguage(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
                    >
                      {LANGUAGES.map((lang) => (
                        <option key={lang.code} value={lang.code}>
                          {lang.name}
                        </option>
                      ))}
                    </select>
                    <p className="mt-1 text-xs text-gray-500">
                      This will change the display language of the interface.
                    </p>
                  </div>

                  {/* Currency */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Currency
                    </label>
                    <select
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
                    >
                      {CURRENCIES.map((curr) => (
                        <option key={curr.code} value={curr.code}>
                          {curr.name}
                        </option>
                      ))}
                    </select>
                    <p className="mt-1 text-xs text-gray-500">
                      All prices and monetary values will be displayed in this currency.
                    </p>
                  </div>

                  {/* Country */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Country
                    </label>
                    <select
                      value={country}
                      onChange={(e) => setCountry(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
                    >
                      {COUNTRIES.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Timezone */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Timezone
                    </label>
                    <select
                      value={timezone}
                      onChange={(e) => setTimezone(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
                    >
                      <optgroup label="Africa">
                        <option value="Africa/Johannesburg">Johannesburg +2:00</option>
                        <option value="Africa/Cairo">Cairo +2:00</option>
                        <option value="Africa/Lagos">Lagos +1:00</option>
                        <option value="Africa/Nairobi">Nairobi +3:00</option>
                        <option value="Africa/Casablanca">Casablanca +1:00</option>
                        <option value="Africa/Accra">Accra +0:00</option>
                        <option value="Africa/Addis_Ababa">Addis Ababa +3:00</option>
                        <option value="Africa/Algiers">Algiers +1:00</option>
                        <option value="Africa/Dar_es_Salaam">Dar es Salaam +3:00</option>
                        <option value="Africa/Harare">Harare +2:00</option>
                        <option value="Africa/Kinshasa">Kinshasa +1:00</option>
                        <option value="Africa/Luanda">Luanda +1:00</option>
                        <option value="Africa/Maputo">Maputo +2:00</option>
                        <option value="Africa/Tunis">Tunis +1:00</option>
                        <option value="Africa/Windhoek">Windhoek +2:00</option>
                      </optgroup>
                      <optgroup label="Americas">
                        <option value="America/New_York">New York -5:00</option>
                        <option value="America/Los_Angeles">Los Angeles -8:00</option>
                        <option value="America/Chicago">Chicago -6:00</option>
                        <option value="America/Denver">Denver -7:00</option>
                        <option value="America/Phoenix">Phoenix -7:00</option>
                        <option value="America/Anchorage">Anchorage -9:00</option>
                        <option value="Pacific/Honolulu">Honolulu -10:00</option>
                        <option value="America/Toronto">Toronto -5:00</option>
                        <option value="America/Vancouver">Vancouver -8:00</option>
                        <option value="America/Mexico_City">Mexico City -6:00</option>
                        <option value="America/Bogota">Bogota -5:00</option>
                        <option value="America/Lima">Lima -5:00</option>
                        <option value="America/Santiago">Santiago -3:00</option>
                        <option value="America/Buenos_Aires">Buenos Aires -3:00</option>
                        <option value="America/Sao_Paulo">São Paulo -3:00</option>
                        <option value="America/Caracas">Caracas -4:00</option>
                        <option value="America/Panama">Panama -5:00</option>
                      </optgroup>
                      <optgroup label="Asia">
                        <option value="Asia/Dubai">Dubai +4:00</option>
                        <option value="Asia/Tokyo">Tokyo +9:00</option>
                        <option value="Asia/Shanghai">Shanghai +8:00</option>
                        <option value="Asia/Hong_Kong">Hong Kong +8:00</option>
                        <option value="Asia/Singapore">Singapore +8:00</option>
                        <option value="Asia/Seoul">Seoul +9:00</option>
                        <option value="Asia/Bangkok">Bangkok +7:00</option>
                        <option value="Asia/Jakarta">Jakarta +7:00</option>
                        <option value="Asia/Kolkata">Kolkata +5:30</option>
                        <option value="Asia/Mumbai">Mumbai +5:30</option>
                        <option value="Asia/Karachi">Karachi +5:00</option>
                        <option value="Asia/Dhaka">Dhaka +6:00</option>
                        <option value="Asia/Manila">Manila +8:00</option>
                        <option value="Asia/Kuala_Lumpur">Kuala Lumpur +8:00</option>
                        <option value="Asia/Taipei">Taipei +8:00</option>
                        <option value="Asia/Ho_Chi_Minh">Ho Chi Minh +7:00</option>
                        <option value="Asia/Riyadh">Riyadh +3:00</option>
                        <option value="Asia/Tehran">Tehran +3:30</option>
                        <option value="Asia/Jerusalem">Jerusalem +2:00</option>
                        <option value="Asia/Beirut">Beirut +2:00</option>
                        <option value="Asia/Kuwait">Kuwait +3:00</option>
                        <option value="Asia/Qatar">Qatar +3:00</option>
                      </optgroup>
                      <optgroup label="Europe">
                        <option value="Europe/London">London +0:00</option>
                        <option value="Europe/Paris">Paris +1:00</option>
                        <option value="Europe/Berlin">Berlin +1:00</option>
                        <option value="Europe/Amsterdam">Amsterdam +1:00</option>
                        <option value="Europe/Brussels">Brussels +1:00</option>
                        <option value="Europe/Madrid">Madrid +1:00</option>
                        <option value="Europe/Rome">Rome +1:00</option>
                        <option value="Europe/Vienna">Vienna +1:00</option>
                        <option value="Europe/Zurich">Zurich +1:00</option>
                        <option value="Europe/Stockholm">Stockholm +1:00</option>
                        <option value="Europe/Oslo">Oslo +1:00</option>
                        <option value="Europe/Copenhagen">Copenhagen +1:00</option>
                        <option value="Europe/Helsinki">Helsinki +2:00</option>
                        <option value="Europe/Athens">Athens +2:00</option>
                        <option value="Europe/Istanbul">Istanbul +3:00</option>
                        <option value="Europe/Moscow">Moscow +3:00</option>
                        <option value="Europe/Warsaw">Warsaw +1:00</option>
                        <option value="Europe/Prague">Prague +1:00</option>
                        <option value="Europe/Budapest">Budapest +1:00</option>
                        <option value="Europe/Dublin">Dublin +0:00</option>
                        <option value="Europe/Lisbon">Lisbon +0:00</option>
                      </optgroup>
                      <optgroup label="Australia & Pacific">
                        <option value="Australia/Sydney">Sydney +10:00</option>
                        <option value="Australia/Melbourne">Melbourne +10:00</option>
                        <option value="Australia/Brisbane">Brisbane +10:00</option>
                        <option value="Australia/Perth">Perth +8:00</option>
                        <option value="Australia/Adelaide">Adelaide +9:30</option>
                        <option value="Australia/Darwin">Darwin +9:30</option>
                        <option value="Pacific/Auckland">Auckland +12:00</option>
                        <option value="Pacific/Fiji">Fiji +12:00</option>
                        <option value="Pacific/Guam">Guam +10:00</option>
                        <option value="Pacific/Tahiti">Tahiti -10:00</option>
                      </optgroup>
                      <optgroup label="Atlantic & Indian Ocean">
                        <option value="Atlantic/Reykjavik">Reykjavik +0:00</option>
                        <option value="Atlantic/Azores">Azores -1:00</option>
                        <option value="Atlantic/Cape_Verde">Cape Verde -1:00</option>
                        <option value="Indian/Mauritius">Mauritius +4:00</option>
                        <option value="Indian/Maldives">Maldives +5:00</option>
                      </optgroup>
                    </select>
                  </div>

                  {/* Date Format */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Date Format
                    </label>
                    <select
                      value={dateFormat}
                      onChange={(e) => setDateFormat(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
                    >
                      <option value="DD/MM/YYYY">DD/MM/YYYY (31/12/2024)</option>
                      <option value="MM/DD/YYYY">MM/DD/YYYY (12/31/2024)</option>
                      <option value="YYYY-MM-DD">YYYY-MM-DD (2024-12-31)</option>
                      <option value="DD-MM-YYYY">DD-MM-YYYY (31-12-2024)</option>
                      <option value="DD.MM.YYYY">DD.MM.YYYY (31.12.2024)</option>
                      <option value="D MMMM YYYY">D MMMM YYYY (1 April 2025)</option>
                      <option value="MMMM D, YYYY">MMMM D, YYYY (April 1, 2025)</option>
                    </select>
                  </div>

                  {/* Save Button */}
                  <div className="flex items-center gap-4 pt-4">
                    <button
                      onClick={handleRegionUpdate}
                      disabled={regionLoading}
                      className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-md text-sm font-medium hover:bg-gray-800 transition-colors disabled:opacity-50"
                    >
                      {regionLoading && <Loader2 size={16} className="animate-spin" />}
                      Save Regional Settings
                    </button>
                    {regionMessage && (
                      <span
                        className={`text-sm ${
                          regionMessage.type === 'success' ? 'text-green-600' : 'text-red-600'
                        }`}
                      >
                        {regionMessage.text}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* General/Business Settings Section */}
          {activeSection === 'general' && (
            <div className="space-y-8">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-2">Business Information</h2>
                <p className="text-sm text-gray-500 mb-6">
                  Configure your business details. This information will be displayed on your public booking pages and invoices.
                </p>

                {/* Logo */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Business Logo
                  </label>
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
                          className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-md text-sm font-medium hover:bg-gray-800 transition-colors disabled:opacity-50"
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

                <div className="space-y-4">
                  {/* Business Name */}
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
                  </div>

                  {/* Business Description */}
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

                  {/* Address */}
                  <div className="border-t border-gray-200 pt-4 mt-6">
                    <h3 className="text-sm font-semibold text-gray-900 mb-4">Address</h3>
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
                  <div className="border-t border-gray-200 pt-4 mt-6">
                    <h3 className="text-sm font-semibold text-gray-900 mb-4">Tax Information</h3>
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
                  </div>

                  {/* Contact Information */}
                  <div className="border-t border-gray-200 pt-4 mt-6">
                    <h3 className="text-sm font-semibold text-gray-900 mb-4">Contact Information</h3>
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
                  <div className="border-t border-gray-200 pt-4 mt-6">
                    <h3 className="text-sm font-semibold text-gray-900 mb-2">Business Hours</h3>
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
                  <div className="flex items-center gap-4 pt-6 border-t border-gray-200 mt-6">
                    <button
                      onClick={handleBusinessUpdate}
                      disabled={businessLoading}
                      className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-md text-sm font-medium hover:bg-gray-800 transition-colors disabled:opacity-50"
                    >
                      {businessLoading && <Loader2 size={16} className="animate-spin" />}
                      Save Business Settings
                    </button>
                    {businessMessage && (
                      <span
                        className={`text-sm ${
                          businessMessage.type === 'success' ? 'text-green-600' : 'text-red-600'
                        }`}
                      >
                        {businessMessage.text}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Domains Section */}
          {activeSection === 'domains' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-1">Domain Settings</h2>
                <p className="text-gray-600 text-sm">
                  Manage your property's subdomain and custom domain settings
                </p>
              </div>
              {session?.access_token && (
                <DomainSettings accessToken={session.access_token} />
              )}
            </div>
          )}

          {/* Billing Section */}
          {activeSection === 'billing' && (
            <div className="space-y-8">
              {/* Subscription Status */}
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-2">Subscription</h2>
                <p className="text-sm text-gray-500 mb-6">
                  Manage your Vilo subscription and view payment history.
                </p>

                {/* Current Status Card */}
                {hasActiveSubscription ? (
                  <div className="bg-gradient-to-r from-green-600 to-green-500 rounded-xl p-6 text-white mb-8">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium text-green-100">Subscription Status</span>
                          <span className="px-2 py-0.5 bg-white/20 text-white text-xs font-medium rounded-full">
                            Active
                          </span>
                        </div>
                        <h3 className="text-2xl font-bold mb-2">
                          {subscriptionPlan === 'lifetime' && 'Lifetime Access'}
                          {subscriptionPlan === 'monthly' && 'Monthly Plan'}
                          {subscriptionPlan === 'annual' && 'Annual Plan'}
                          {!subscriptionPlan && 'Lifetime Access'}
                        </h3>
                        <p className="text-green-100 text-sm">
                          {subscriptionPlan === 'lifetime' || !subscriptionPlan
                            ? 'You have unlimited access to all Vilo features forever.'
                            : subscriptionPlan === 'monthly'
                            ? 'You have full access to all Vilo features. Renews monthly.'
                            : 'You have full access to all Vilo features. Renews annually.'}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
                          <Check size={32} className="text-white" />
                        </div>
                      </div>
                    </div>
                    {subscriptionDate && (
                      <div className="mt-4 pt-4 border-t border-green-400/30 flex items-center gap-2 text-sm text-green-100">
                        <Calendar size={16} />
                        <span>
                          {subscriptionPlan === 'monthly' || subscriptionPlan === 'annual'
                            ? `Subscribed since ${new Date(subscriptionDate).toLocaleDateString('en-ZA', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                              })}`
                            : `Member since ${new Date(subscriptionDate).toLocaleDateString('en-ZA', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                              })}`}
                        </span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="bg-gradient-to-r from-gray-900 to-gray-700 rounded-xl p-6 text-white mb-8">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium text-gray-300">Subscription Status</span>
                          <span className="px-2 py-0.5 bg-yellow-500/20 text-yellow-300 text-xs font-medium rounded-full">
                            Trial
                          </span>
                        </div>
                        <h3 className="text-2xl font-bold mb-2">No Active Subscription</h3>
                        <p className="text-gray-300 text-sm">
                          Upgrade to unlock all features and remove limitations.
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center">
                          <AlertCircle size={32} className="text-yellow-400" />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Lifetime Plan Card */}
                {!hasActiveSubscription && (
                  <div className="relative rounded-xl border-2 border-black ring-2 ring-black ring-offset-2 p-6 bg-white">
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-black text-white text-xs font-medium rounded-full">
                      Limited Time Offer
                    </div>

                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                      <div className="flex-1">
                        <h3 className="text-xl font-bold text-gray-900 mb-1">Lifetime Access</h3>
                        <p className="text-sm text-gray-500 mb-4">
                          Pay once, use forever. No recurring fees, no hidden costs.
                        </p>

                        <ul className="space-y-2">
                          <li className="flex items-center gap-2 text-sm text-gray-600">
                            <Check size={16} className="text-green-500 flex-shrink-0" />
                            <span>Unlimited rooms & bookings</span>
                          </li>
                          <li className="flex items-center gap-2 text-sm text-gray-600">
                            <Check size={16} className="text-green-500 flex-shrink-0" />
                            <span>Calendar sync (Google, iCal, Outlook)</span>
                          </li>
                          <li className="flex items-center gap-2 text-sm text-gray-600">
                            <Check size={16} className="text-green-500 flex-shrink-0" />
                            <span>Custom branding & no watermarks</span>
                          </li>
                          <li className="flex items-center gap-2 text-sm text-gray-600">
                            <Check size={16} className="text-green-500 flex-shrink-0" />
                            <span>Advanced analytics & reporting</span>
                          </li>
                          <li className="flex items-center gap-2 text-sm text-gray-600">
                            <Check size={16} className="text-green-500 flex-shrink-0" />
                            <span>Priority email support</span>
                          </li>
                          <li className="flex items-center gap-2 text-sm text-gray-600">
                            <Check size={16} className="text-green-500 flex-shrink-0" />
                            <span>All future updates included</span>
                          </li>
                        </ul>
                      </div>

                      <div className="text-center md:text-right">
                        <div className="mb-4">
                          {pricesLoading ? (
                              <div className="animate-pulse h-12 bg-gray-200 rounded"></div>
                            ) : (
                              <>
                                <div className="text-sm text-gray-500 line-through">R3,999</div>
                                <div className="text-4xl font-bold text-gray-900">R1,999</div>
                              </>
                            )}
                          <div className="text-sm text-gray-500">one-time payment</div>
                        </div>

                        <button
                          onClick={handlePaystackPayment}
                          disabled={billingLoading}
                          className="w-full md:w-auto flex items-center justify-center gap-2 px-8 py-3 bg-black text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors disabled:opacity-50"
                        >
                          {billingLoading ? (
                            <Loader2 size={18} className="animate-spin" />
                          ) : (
                            <CreditCard size={18} />
                          )}
                          <span>{billingLoading ? 'Processing...' : 'Get Lifetime Access'}</span>
                        </button>

                        <p className="mt-3 text-xs text-gray-500">
                          Secure payment via Paystack
                        </p>
                      </div>
                    </div>

                    <div className="mt-6 pt-4 border-t border-gray-200">
                      <p className="text-xs text-gray-500 text-center">
                        30-day money-back guarantee. No questions asked.
                      </p>
                    </div>
                  </div>
                )}

                {/* Subscription Plans */}
                {!hasActiveSubscription && (
                  <div className="mt-8">
                    <div className="flex items-center justify-between mb-6">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">Or Subscribe Monthly/Annually</h3>
                        <p className="text-sm text-gray-500">Flexible plans with all features included</p>
                      </div>
                      {/* Billing Cycle Toggle */}
                      <div className="flex items-center bg-gray-100 rounded-lg p-1">
                        <button
                          onClick={() => setSelectedBillingCycle('monthly')}
                          className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                            selectedBillingCycle === 'monthly'
                              ? 'bg-white text-gray-900 shadow-sm'
                              : 'text-gray-600 hover:text-gray-900'
                          }`}
                        >
                          Monthly
                        </button>
                        <button
                          onClick={() => setSelectedBillingCycle('annual')}
                          className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                            selectedBillingCycle === 'annual'
                              ? 'bg-white text-gray-900 shadow-sm'
                              : 'text-gray-600 hover:text-gray-900'
                          }`}
                        >
                          Annual
                          <span className="ml-1 text-xs text-green-600 font-semibold">Save 14%</span>
                        </button>
                      </div>
                    </div>

                    {/* Subscription Card */}
                    <div className="rounded-xl border border-gray-200 p-6 bg-white">
                      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                        <div className="flex-1">
                          <h3 className="text-xl font-bold text-gray-900 mb-1">
                            {selectedBillingCycle === 'monthly' ? 'Monthly Plan' : 'Annual Plan'}
                          </h3>
                          <p className="text-sm text-gray-500 mb-4">
                            {selectedBillingCycle === 'monthly'
                              ? 'Pay monthly, cancel anytime.'
                              : 'Pay yearly and save 14% compared to monthly.'}
                          </p>

                          <ul className="space-y-2">
                            <li className="flex items-center gap-2 text-sm text-gray-600">
                              <Check size={16} className="text-green-500 flex-shrink-0" />
                              <span>Unlimited rooms & bookings</span>
                            </li>
                            <li className="flex items-center gap-2 text-sm text-gray-600">
                              <Check size={16} className="text-green-500 flex-shrink-0" />
                              <span>Calendar sync (Google, iCal, Outlook)</span>
                            </li>
                            <li className="flex items-center gap-2 text-sm text-gray-600">
                              <Check size={16} className="text-green-500 flex-shrink-0" />
                              <span>Custom branding & no watermarks</span>
                            </li>
                            <li className="flex items-center gap-2 text-sm text-gray-600">
                              <Check size={16} className="text-green-500 flex-shrink-0" />
                              <span>Advanced analytics & reporting</span>
                            </li>
                            <li className="flex items-center gap-2 text-sm text-gray-600">
                              <Check size={16} className="text-green-500 flex-shrink-0" />
                              <span>Priority email support</span>
                            </li>
                            <li className="flex items-center gap-2 text-sm text-gray-600">
                              <Check size={16} className="text-green-500 flex-shrink-0" />
                              <span>Cancel anytime</span>
                            </li>
                          </ul>
                        </div>

                        <div className="text-center md:text-right">
                          <div className="mb-4">
                            {billingPrices && selectedBillingCycle === 'annual' && (
                              <div className="text-sm text-gray-500 line-through">R{((billingPrices.monthly.amount * 12) / 100).toLocaleString()}/year</div>
                            )}
                            <div className="text-4xl font-bold text-gray-900">
                              {billingPrices ? (
                                selectedBillingCycle === 'monthly' 
                                  ? 'R' + (billingPrices.monthly.amount / 100).toLocaleString()
                                  : 'R' + (billingPrices.annual.amount / 100).toLocaleString()
                              ) : (
                                selectedBillingCycle === 'monthly' ? 'R499' : 'R4,999'
                              )}
                            </div>
                            <div className="text-sm text-gray-500">
                              {selectedBillingCycle === 'monthly' ? 'per month' : 'per year'}
                            </div>
                            {selectedBillingCycle === 'annual' && (
                              <div className="text-xs text-green-600 mt-1">
                                That's just R{billingPrices ? ((billingPrices.annual.amount / 12 / 100).toFixed(0)) : "417"}/month
                              </div>
                            )}
                          </div>

                          <button
                            onClick={() => handleSubscriptionPayment(selectedBillingCycle)}
                            disabled={billingLoading}
                            className="w-full md:w-auto flex items-center justify-center gap-2 px-8 py-3 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors disabled:opacity-50"
                          >
                            {billingLoading ? (
                              <Loader2 size={18} className="animate-spin" />
                            ) : (
                              <CreditCard size={18} />
                            )}
                            <span>{billingLoading ? 'Processing...' : 'Subscribe Now'}</span>
                          </button>

                          <p className="mt-3 text-xs text-gray-500">
                            Secure payment via Paystack
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Features included with subscription */}
                {hasActiveSubscription && (
                  <div className="bg-gray-50 rounded-xl p-6">
                    <h3 className="text-sm font-semibold text-gray-900 mb-4">Your Plan Includes</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {[
                        'Unlimited rooms & bookings',
                        'Calendar sync (Google, iCal, Outlook)',
                        'Custom branding & no watermarks',
                        'Advanced analytics & reporting',
                        'Priority email support',
                        'All future updates included',
                      ].map((feature, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-sm text-gray-600">
                          <Check size={16} className="text-green-500 flex-shrink-0" />
                          <span>{feature}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Payment History */}
              <div className="border-t border-gray-200 pt-8">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Payment History</h2>

                {paymentHistory.length > 0 ? (
                  <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Date
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Description
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Amount
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Status
                          </th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Reference
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {paymentHistory.map((payment) => (
                          <tr key={payment.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3 text-sm text-gray-900">
                              {new Date(payment.date).toLocaleDateString('en-ZA', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                              })}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600">{payment.description}</td>
                            <td className="px-4 py-3 text-sm text-gray-900 font-medium">
                              ${payment.amount.toFixed(2)} {payment.currency}
                            </td>
                            <td className="px-4 py-3">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                payment.status === 'success'
                                  ? 'bg-green-100 text-green-700'
                                  : payment.status === 'pending'
                                  ? 'bg-yellow-100 text-yellow-700'
                                  : 'bg-red-100 text-red-700'
                              }`}>
                                {payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right text-sm text-gray-500 font-mono">
                              {payment.reference.slice(0, 12)}...
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="bg-gray-50 rounded-lg p-8 text-center">
                    <CreditCard size={32} className="mx-auto text-gray-400 mb-3" />
                    <p className="text-gray-500 text-sm">No payment history yet</p>
                    <p className="text-gray-400 text-xs mt-1">
                      Your payments will appear here after you subscribe.
                    </p>
                  </div>
                )}
              </div>

              {/* FAQ */}
              <div className="border-t border-gray-200 pt-8">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Frequently Asked Questions</h2>
                <div className="space-y-4">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="text-sm font-medium text-gray-900 mb-1">
                      What payment methods do you accept?
                    </h3>
                    <p className="text-sm text-gray-600">
                      We accept all major credit/debit cards (Visa, Mastercard, Verve) and bank transfers via Paystack.
                    </p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="text-sm font-medium text-gray-900 mb-1">
                      Is my payment secure?
                    </h3>
                    <p className="text-sm text-gray-600">
                      Yes! All payments are processed securely through Paystack. We never store your card details on our servers.
                    </p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="text-sm font-medium text-gray-900 mb-1">
                      What does "lifetime access" mean?
                    </h3>
                    <p className="text-sm text-gray-600">
                      Pay once and get access to Vilo forever. This includes all current features and future updates at no additional cost.
                    </p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="text-sm font-medium text-gray-900 mb-1">
                      Can I get a refund?
                    </h3>
                    <p className="text-sm text-gray-600">
                      Yes, we offer a 30-day money-back guarantee. If you're not satisfied, contact us for a full refund.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Apps Section */}
          {activeSection === 'apps' && (
            <div className="space-y-8">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-2">Payment Apps</h2>
                <p className="text-sm text-gray-500 mb-6">
                  Connect payment gateways to accept payments directly from your guests. Configure your API keys and banking details below.
                </p>

                {/* Paystack Card */}
                <div className="bg-white border border-gray-200 rounded-xl overflow-hidden mb-6">
                  <div className="p-6 border-b border-gray-100">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-lg bg-[#00C3F7]/10 flex items-center justify-center">
                          <svg viewBox="0 0 24 24" className="w-7 h-7" fill="none">
                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" fill="#00C3F7"/>
                            <path d="M12 6.5c-1.38 0-2.5 1.12-2.5 2.5h1.5c0-.55.45-1 1-1s1 .45 1 1c0 .55-.45 1-1 1h-.5v2.5h1.5v-1.08c1.14-.32 2-1.37 2-2.62 0-1.52-1.35-2.8-3-2.8zM11.25 14.5v1.5h1.5v-1.5h-1.5z" fill="white"/>
                          </svg>
                        </div>
                        <div>
                          <h3 className="text-base font-semibold text-gray-900">Paystack</h3>
                          <p className="text-sm text-gray-500">Accept card payments, bank transfers, and mobile money</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => canToggle('paystack') && setPaystackEnabled(!paystackEnabled)}
                        className={`relative w-12 h-6 rounded-full transition-colors ${
                          paystackEnabled ? 'bg-[#00C3F7]' : 'bg-gray-300'
                        }`}
                      >
                        <div
                          className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                            paystackEnabled ? 'translate-x-6' : 'translate-x-0.5'
                          }`}
                        />
                      </button>
                    </div>
                  </div>

                  {paystackEnabled && (
                    <div className="p-6 bg-gray-50">
                      {/* Mode Toggle */}
                      <div className="mb-6">
                        <label className="block text-sm font-medium text-gray-700 mb-3">Environment</label>
                        <div className="flex gap-2">
                          <button
                            onClick={() => setPaystackMode('test')}
                            className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-colors ${
                              paystackMode === 'test'
                                ? 'bg-yellow-100 text-yellow-800 border-2 border-yellow-300'
                                : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-50'
                            }`}
                          >
                            Test Mode
                          </button>
                          <button
                            onClick={() => setPaystackMode('live')}
                            className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-colors ${
                              paystackMode === 'live'
                                ? 'bg-green-100 text-green-800 border-2 border-green-300'
                                : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-50'
                            }`}
                          >
                            Live Mode
                          </button>
                        </div>
                        <p className="mt-2 text-xs text-gray-500">
                          {paystackMode === 'test'
                            ? 'Test mode allows you to simulate transactions without processing real payments.'
                            : 'Live mode processes real transactions. Make sure your keys are correct.'}
                        </p>
                      </div>

                      {/* Test Keys */}
                      {paystackMode === 'test' && (
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Test Public Key
                            </label>
                            <input
                              type="text"
                              value={paystackTestPublicKey}
                              onChange={(e) => setPaystackTestPublicKey(e.target.value)}
                              placeholder="pk_test_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#00C3F7] focus:border-[#00C3F7] font-mono text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Test Secret Key
                            </label>
                            <div className="relative">
                              <input
                                type={showPaystackSecretKey ? 'text' : 'password'}
                                value={paystackTestSecretKey}
                                onChange={(e) => setPaystackTestSecretKey(e.target.value)}
                                placeholder="sk_test_your_secret_key_here"
                                className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#00C3F7] focus:border-[#00C3F7] font-mono text-sm"
                              />
                              <button
                                type="button"
                                onClick={() => setShowPaystackSecretKey(!showPaystackSecretKey)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                              >
                                {showPaystackSecretKey ? <EyeOff size={18} /> : <Eye size={18} />}
                              </button>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Live Keys */}
                      {paystackMode === 'live' && (
                        <div className="space-y-4">
                          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
                            <p className="text-sm text-amber-800">
                              <strong>Warning:</strong> Live keys will process real transactions. Only use verified keys from your Paystack dashboard.
                            </p>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Live Public Key
                            </label>
                            <input
                              type="text"
                              value={paystackLivePublicKey}
                              onChange={(e) => setPaystackLivePublicKey(e.target.value)}
                              placeholder="pk_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#00C3F7] focus:border-[#00C3F7] font-mono text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Live Secret Key
                            </label>
                            <div className="relative">
                              <input
                                type={showPaystackSecretKey ? 'text' : 'password'}
                                value={paystackLiveSecretKey}
                                onChange={(e) => setPaystackLiveSecretKey(e.target.value)}
                                placeholder="sk_live_your_secret_key_here"
                                className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#00C3F7] focus:border-[#00C3F7] font-mono text-sm"
                              />
                              <button
                                type="button"
                                onClick={() => setShowPaystackSecretKey(!showPaystackSecretKey)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                              >
                                {showPaystackSecretKey ? <EyeOff size={18} /> : <Eye size={18} />}
                              </button>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Save Button */}
                      <div className="flex items-center gap-4 mt-6 pt-4 border-t border-gray-200">
                        <button
                          onClick={handlePaystackSave}
                          disabled={paystackLoading}
                          className="flex items-center gap-2 px-4 py-2 bg-[#00C3F7] text-white rounded-lg text-sm font-medium hover:bg-[#00a8d4] transition-colors disabled:opacity-50"
                        >
                          {paystackLoading && <Loader2 size={16} className="animate-spin" />}
                          Save Paystack Settings
                        </button>
                        {paystackMessage && (
                          <span className={`text-sm ${paystackMessage.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
                            {paystackMessage.text}
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* EFT/Bank Details Card */}
                <div className="bg-white border border-gray-200 rounded-xl overflow-hidden mb-6">
                  <div className="p-6 border-b border-gray-100">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center">
                          <Building2 size={24} className="text-gray-600" />
                        </div>
                        <div>
                          <h3 className="text-base font-semibold text-gray-900">EFT / Bank Transfer</h3>
                          <p className="text-sm text-gray-500">Accept direct bank transfers to your account</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => canToggle('eft') && setEftEnabled(!eftEnabled)}
                        className={`relative w-12 h-6 rounded-full transition-colors ${
                          eftEnabled ? 'bg-gray-900' : 'bg-gray-300'
                        }`}
                      >
                        <div
                          className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                            eftEnabled ? 'translate-x-6' : 'translate-x-0.5'
                          }`}
                        />
                      </button>
                    </div>
                  </div>

                  {eftEnabled && (
                    <div className="p-6 bg-gray-50">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Account Holder Name
                          </label>
                          <input
                            type="text"
                            value={eftAccountHolder}
                            onChange={(e) => setEftAccountHolder(e.target.value)}
                            placeholder="John Doe or Business Name"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Bank Name
                          </label>
                          <input
                            type="text"
                            value={eftBankName}
                            onChange={(e) => setEftBankName(e.target.value)}
                            placeholder="e.g., FNB, Standard Bank, Absa"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Account Number
                          </label>
                          <input
                            type="text"
                            value={eftAccountNumber}
                            onChange={(e) => setEftAccountNumber(e.target.value)}
                            placeholder="1234567890"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400 font-mono"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Branch Code
                          </label>
                          <input
                            type="text"
                            value={eftBranchCode}
                            onChange={(e) => setEftBranchCode(e.target.value)}
                            placeholder="250655"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400 font-mono"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Account Type
                          </label>
                          <select
                            value={eftAccountType}
                            onChange={(e) => setEftAccountType(e.target.value as 'cheque' | 'savings' | 'current')}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
                          >
                            <option value="cheque">Cheque Account</option>
                            <option value="savings">Savings Account</option>
                            <option value="current">Current Account</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            SWIFT Code <span className="text-gray-400 font-normal">(Optional)</span>
                          </label>
                          <input
                            type="text"
                            value={eftSwiftCode}
                            onChange={(e) => setEftSwiftCode(e.target.value)}
                            placeholder="FIABORJJ"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400 font-mono"
                          />
                        </div>
                      </div>
                      <div className="mt-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Reference Instructions
                        </label>
                        <textarea
                          value={eftReferenceInstructions}
                          onChange={(e) => setEftReferenceInstructions(e.target.value)}
                          placeholder="e.g., Please use your booking reference number as the payment reference."
                          rows={2}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
                        />
                        <p className="mt-1 text-xs text-gray-500">
                          This message will be shown to guests when they select EFT as a payment method.
                        </p>
                      </div>

                      {/* Save Button */}
                      <div className="flex items-center gap-4 mt-6 pt-4 border-t border-gray-200">
                        <button
                          onClick={handleEftSave}
                          disabled={eftLoading}
                          className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors disabled:opacity-50"
                        >
                          {eftLoading && <Loader2 size={16} className="animate-spin" />}
                          Save EFT Settings
                        </button>
                        {eftMessage && (
                          <span className={`text-sm ${eftMessage.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
                            {eftMessage.text}
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* PayPal Card */}
                <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                  <div className="p-6 border-b border-gray-100">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-lg bg-[#003087]/10 flex items-center justify-center">
                          <svg viewBox="0 0 24 24" className="w-7 h-7" fill="none">
                            <path d="M7.076 21.337H2.47a.641.641 0 01-.633-.74L4.944 3.72a.77.77 0 01.76-.654h6.394c2.118 0 3.768.506 4.896 1.502 1.168 1.03 1.652 2.56 1.384 4.42-.312 2.168-1.26 3.862-2.82 5.04-1.512 1.141-3.479 1.719-5.85 1.719h-1.31c-.503 0-.929.365-1.007.862l-.917 5.893a.642.642 0 01-.633.54l-.765-.005z" fill="#003087"/>
                            <path d="M19.093 8.366c-.307 2.168-1.259 3.862-2.819 5.04-1.512 1.142-3.48 1.72-5.85 1.72h-1.31c-.503 0-.93.364-1.007.861l-1.373 8.694a.519.519 0 00.512.6h3.327c.44 0 .816-.32.886-.753l.729-4.648a.897.897 0 01.886-.752h.559c3.616 0 6.45-1.47 7.282-5.72.347-1.781.149-3.258-.822-4.042z" fill="#0070E0"/>
                          </svg>
                        </div>
                        <div>
                          <h3 className="text-base font-semibold text-gray-900">PayPal</h3>
                          <p className="text-sm text-gray-500">Accept PayPal payments worldwide</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => canToggle('paypal') && setPaypalEnabled(!paypalEnabled)}
                        className={`relative w-12 h-6 rounded-full transition-colors ${
                          paypalEnabled ? 'bg-[#003087]' : 'bg-gray-300'
                        }`}
                      >
                        <div
                          className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                            paypalEnabled ? 'translate-x-6' : 'translate-x-0.5'
                          }`}
                        />
                      </button>
                    </div>
                  </div>

                  {paypalEnabled && (
                    <div className="p-6 bg-gray-50">
                      {/* Mode Toggle */}
                      <div className="mb-6">
                        <label className="block text-sm font-medium text-gray-700 mb-3">Environment</label>
                        <div className="flex gap-2">
                          <button
                            onClick={() => setPaypalMode('sandbox')}
                            className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-colors ${
                              paypalMode === 'sandbox'
                                ? 'bg-yellow-100 text-yellow-800 border-2 border-yellow-300'
                                : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-50'
                            }`}
                          >
                            Sandbox (Test)
                          </button>
                          <button
                            onClick={() => setPaypalMode('live')}
                            className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-colors ${
                              paypalMode === 'live'
                                ? 'bg-green-100 text-green-800 border-2 border-green-300'
                                : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-50'
                            }`}
                          >
                            Live Mode
                          </button>
                        </div>
                        <p className="mt-2 text-xs text-gray-500">
                          {paypalMode === 'sandbox'
                            ? 'Sandbox mode allows you to test payments without processing real transactions.'
                            : 'Live mode processes real PayPal payments.'}
                        </p>
                      </div>

                      {/* Sandbox Keys */}
                      {paypalMode === 'sandbox' && (
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Sandbox Client ID
                            </label>
                            <input
                              type="text"
                              value={paypalSandboxClientId}
                              onChange={(e) => setPaypalSandboxClientId(e.target.value)}
                              placeholder="AxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxB"
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#003087] focus:border-[#003087] font-mono text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Sandbox Secret
                            </label>
                            <div className="relative">
                              <input
                                type={showPaypalSecret ? 'text' : 'password'}
                                value={paypalSandboxSecret}
                                onChange={(e) => setPaypalSandboxSecret(e.target.value)}
                                placeholder="ExxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxB"
                                className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#003087] focus:border-[#003087] font-mono text-sm"
                              />
                              <button
                                type="button"
                                onClick={() => setShowPaypalSecret(!showPaypalSecret)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                              >
                                {showPaypalSecret ? <EyeOff size={18} /> : <Eye size={18} />}
                              </button>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Live Keys */}
                      {paypalMode === 'live' && (
                        <div className="space-y-4">
                          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
                            <p className="text-sm text-amber-800">
                              <strong>Warning:</strong> Live credentials will process real PayPal transactions. Use production keys from your PayPal Developer Dashboard.
                            </p>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Live Client ID
                            </label>
                            <input
                              type="text"
                              value={paypalLiveClientId}
                              onChange={(e) => setPaypalLiveClientId(e.target.value)}
                              placeholder="AxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxB"
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#003087] focus:border-[#003087] font-mono text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Live Secret
                            </label>
                            <div className="relative">
                              <input
                                type={showPaypalSecret ? 'text' : 'password'}
                                value={paypalLiveSecret}
                                onChange={(e) => setPaypalLiveSecret(e.target.value)}
                                placeholder="ExxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxB"
                                className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#003087] focus:border-[#003087] font-mono text-sm"
                              />
                              <button
                                type="button"
                                onClick={() => setShowPaypalSecret(!showPaypalSecret)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                              >
                                {showPaypalSecret ? <EyeOff size={18} /> : <Eye size={18} />}
                              </button>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Save Button */}
                      <div className="flex items-center gap-4 mt-6 pt-4 border-t border-gray-200">
                        <button
                          onClick={handlePaypalSave}
                          disabled={paypalLoading}
                          className="flex items-center gap-2 px-4 py-2 bg-[#003087] text-white rounded-lg text-sm font-medium hover:bg-[#002060] transition-colors disabled:opacity-50"
                        >
                          {paypalLoading && <Loader2 size={16} className="animate-spin" />}
                          Save PayPal Settings
                        </button>
                        {paypalMessage && (
                          <span className={`text-sm ${paypalMessage.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
                            {paypalMessage.text}
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Info Section */}
                <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-blue-900 mb-2">How Payment Apps Work</h4>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li>- Enable the payment methods you want to offer to your guests.</li>
                    <li>- Guests will see available payment options when making a booking.</li>
                    <li>- For Paystack and PayPal, payments are processed automatically.</li>
                    <li>- For EFT, guests will receive your bank details to make a manual transfer.</li>
                    <li>- Always test your integration in test/sandbox mode first.</li>
                  </ul>
                </div>

                {/* Calendar Sync Section */}
                <div className="mt-12 pt-8 border-t border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-900 mb-2">Calendar Sync</h2>
                  <p className="text-sm text-gray-500 mb-6">
                    Connect booking platforms to sync availability and prevent double bookings. When a booking is made on any platform, all connected calendars will be updated.
                  </p>

                  {/* Airbnb Card */}
                  <div className="bg-white border border-gray-200 rounded-xl overflow-hidden mb-4">
                    <div className="p-5 border-b border-gray-100">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-lg bg-[#FF5A5F]/10 flex items-center justify-center">
                            <svg viewBox="0 0 24 24" className="w-6 h-6" fill="#FF5A5F"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2a7.2 7.2 0 01-6-3.22c.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08a7.2 7.2 0 01-6 3.22z"/></svg>
                          </div>
                          <div>
                            <h3 className="text-sm font-semibold text-gray-900">Airbnb</h3>
                            <p className="text-xs text-gray-500">Sync with your Airbnb listings</p>
                          </div>
                        </div>
                        <button onClick={() => setAirbnbSyncEnabled(!airbnbSyncEnabled)} className={`relative w-11 h-6 rounded-full transition-colors ${airbnbSyncEnabled ? 'bg-[#FF5A5F]' : 'bg-gray-300'}`}>
                          <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${airbnbSyncEnabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
                        </button>
                      </div>
                    </div>
                    {airbnbSyncEnabled && (
                      <div className="p-5 bg-gray-50 space-y-4">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1.5">iCal Import URL (from Airbnb)</label>
                          <input type="url" value={airbnbIcalImportUrl} onChange={(e) => setAirbnbIcalImportUrl(e.target.value)} placeholder="https://www.airbnb.com/calendar/ical/xxxxx.ics" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#FF5A5F]" />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1.5">Your Vilo Export URL (add to Airbnb)</label>
                          <div className="flex gap-2">
                            <input type="text" value={getExportUrl('airbnb')} readOnly className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm bg-gray-100 text-gray-600" />
                            <button onClick={() => copyToClipboard(getExportUrl('airbnb'), 'airbnb')} className="px-3 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg transition-colors">
                              {copiedPlatform === 'airbnb' ? <Check size={16} className="text-green-600" /> : <Copy size={16} className="text-gray-600" />}
                            </button>
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1.5">Sync Frequency</label>
                          <select value={airbnbSyncFrequency} onChange={(e) => setAirbnbSyncFrequency(e.target.value as '15min' | 'hourly' | '6hours' | 'daily')} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#FF5A5F]">
                            <option value="15min">Every 15 minutes</option>
                            <option value="hourly">Hourly</option>
                            <option value="6hours">Every 6 hours</option>
                            <option value="daily">Daily</option>
                          </select>
                        </div>
                        <div className="flex items-center gap-3 pt-2">
                          <button onClick={() => handleSyncSave('airbnb', airbnbSyncEnabled, airbnbIcalImportUrl, airbnbSyncFrequency, setAirbnbSyncLoading, setAirbnbSyncMessage)} disabled={airbnbSyncLoading} className="flex items-center gap-2 px-4 py-2 bg-[#FF5A5F] text-white rounded-lg text-sm font-medium hover:bg-[#e54e52] transition-colors disabled:opacity-50">
                            {airbnbSyncLoading && <Loader2 size={14} className="animate-spin" />}
                            Save
                          </button>
                          {airbnbSyncMessage && <span className={`text-xs ${airbnbSyncMessage.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>{airbnbSyncMessage.text}</span>}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Booking.com Card */}
                  <div className="bg-white border border-gray-200 rounded-xl overflow-hidden mb-4">
                    <div className="p-5 border-b border-gray-100">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-lg bg-[#003580]/10 flex items-center justify-center">
                            <span className="text-[#003580] font-bold text-sm">B.</span>
                          </div>
                          <div>
                            <h3 className="text-sm font-semibold text-gray-900">Booking.com</h3>
                            <p className="text-xs text-gray-500">Sync with Booking.com extranet</p>
                          </div>
                        </div>
                        <button onClick={() => setBookingComSyncEnabled(!bookingComSyncEnabled)} className={`relative w-11 h-6 rounded-full transition-colors ${bookingComSyncEnabled ? 'bg-[#003580]' : 'bg-gray-300'}`}>
                          <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${bookingComSyncEnabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
                        </button>
                      </div>
                    </div>
                    {bookingComSyncEnabled && (
                      <div className="p-5 bg-gray-50 space-y-4">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1.5">iCal Import URL (from Booking.com)</label>
                          <input type="url" value={bookingComIcalImportUrl} onChange={(e) => setBookingComIcalImportUrl(e.target.value)} placeholder="https://admin.booking.com/hotel/hoteladmin/ical.html?..." className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#003580]" />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1.5">Your Vilo Export URL</label>
                          <div className="flex gap-2">
                            <input type="text" value={getExportUrl('bookingcom')} readOnly className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm bg-gray-100 text-gray-600" />
                            <button onClick={() => copyToClipboard(getExportUrl('bookingcom'), 'bookingcom')} className="px-3 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg transition-colors">
                              {copiedPlatform === 'bookingcom' ? <Check size={16} className="text-green-600" /> : <Copy size={16} className="text-gray-600" />}
                            </button>
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1.5">Sync Frequency</label>
                          <select value={bookingComSyncFrequency} onChange={(e) => setBookingComSyncFrequency(e.target.value as '15min' | 'hourly' | '6hours' | 'daily')} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#003580]">
                            <option value="15min">Every 15 minutes</option>
                            <option value="hourly">Hourly</option>
                            <option value="6hours">Every 6 hours</option>
                            <option value="daily">Daily</option>
                          </select>
                        </div>
                        <div className="flex items-center gap-3 pt-2">
                          <button onClick={() => handleSyncSave('bookingcom', bookingComSyncEnabled, bookingComIcalImportUrl, bookingComSyncFrequency, setBookingComSyncLoading, setBookingComSyncMessage)} disabled={bookingComSyncLoading} className="flex items-center gap-2 px-4 py-2 bg-[#003580] text-white rounded-lg text-sm font-medium hover:bg-[#002a66] transition-colors disabled:opacity-50">
                            {bookingComSyncLoading && <Loader2 size={14} className="animate-spin" />}
                            Save
                          </button>
                          {bookingComSyncMessage && <span className={`text-xs ${bookingComSyncMessage.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>{bookingComSyncMessage.text}</span>}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* LekkeSlaap Card */}
                  <div className="bg-white border border-gray-200 rounded-xl overflow-hidden mb-4">
                    <div className="p-5 border-b border-gray-100">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-lg bg-[#2E7D32]/10 flex items-center justify-center">
                            <span className="text-[#2E7D32] font-bold text-xs">LS</span>
                          </div>
                          <div>
                            <h3 className="text-sm font-semibold text-gray-900">LekkeSlaap</h3>
                            <p className="text-xs text-gray-500">Sync with LekkeSlaap listings</p>
                          </div>
                        </div>
                        <button onClick={() => setLekkeslaapSyncEnabled(!lekkeslaapSyncEnabled)} className={`relative w-11 h-6 rounded-full transition-colors ${lekkeslaapSyncEnabled ? 'bg-[#2E7D32]' : 'bg-gray-300'}`}>
                          <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${lekkeslaapSyncEnabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
                        </button>
                      </div>
                    </div>
                    {lekkeslaapSyncEnabled && (
                      <div className="p-5 bg-gray-50 space-y-4">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1.5">iCal Import URL (from LekkeSlaap)</label>
                          <input type="url" value={lekkeslaapIcalImportUrl} onChange={(e) => setLekkeslaapIcalImportUrl(e.target.value)} placeholder="https://www.lekkeslaap.co.za/ical/xxxxx.ics" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#2E7D32]" />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1.5">Your Vilo Export URL</label>
                          <div className="flex gap-2">
                            <input type="text" value={getExportUrl('lekkeslaap')} readOnly className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm bg-gray-100 text-gray-600" />
                            <button onClick={() => copyToClipboard(getExportUrl('lekkeslaap'), 'lekkeslaap')} className="px-3 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg transition-colors">
                              {copiedPlatform === 'lekkeslaap' ? <Check size={16} className="text-green-600" /> : <Copy size={16} className="text-gray-600" />}
                            </button>
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1.5">Sync Frequency</label>
                          <select value={lekkeslaapSyncFrequency} onChange={(e) => setLekkeslaapSyncFrequency(e.target.value as '15min' | 'hourly' | '6hours' | 'daily')} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#2E7D32]">
                            <option value="15min">Every 15 minutes</option>
                            <option value="hourly">Hourly</option>
                            <option value="6hours">Every 6 hours</option>
                            <option value="daily">Daily</option>
                          </select>
                        </div>
                        <div className="flex items-center gap-3 pt-2">
                          <button onClick={() => handleSyncSave('lekkeslaap', lekkeslaapSyncEnabled, lekkeslaapIcalImportUrl, lekkeslaapSyncFrequency, setLekkeslaapSyncLoading, setLekkeslaapSyncMessage)} disabled={lekkeslaapSyncLoading} className="flex items-center gap-2 px-4 py-2 bg-[#2E7D32] text-white rounded-lg text-sm font-medium hover:bg-[#256529] transition-colors disabled:opacity-50">
                            {lekkeslaapSyncLoading && <Loader2 size={14} className="animate-spin" />}
                            Save
                          </button>
                          {lekkeslaapSyncMessage && <span className={`text-xs ${lekkeslaapSyncMessage.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>{lekkeslaapSyncMessage.text}</span>}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* VRBO Card */}
                  <div className="bg-white border border-gray-200 rounded-xl overflow-hidden mb-4">
                    <div className="p-5 border-b border-gray-100">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-lg bg-[#3B5998]/10 flex items-center justify-center">
                            <span className="text-[#3B5998] font-bold text-xs">VRBO</span>
                          </div>
                          <div>
                            <h3 className="text-sm font-semibold text-gray-900">VRBO</h3>
                            <p className="text-xs text-gray-500">Sync with VRBO/HomeAway listings</p>
                          </div>
                        </div>
                        <button onClick={() => setVrboSyncEnabled(!vrboSyncEnabled)} className={`relative w-11 h-6 rounded-full transition-colors ${vrboSyncEnabled ? 'bg-[#3B5998]' : 'bg-gray-300'}`}>
                          <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${vrboSyncEnabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
                        </button>
                      </div>
                    </div>
                    {vrboSyncEnabled && (
                      <div className="p-5 bg-gray-50 space-y-4">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1.5">iCal Import URL (from VRBO)</label>
                          <input type="url" value={vrboIcalImportUrl} onChange={(e) => setVrboIcalImportUrl(e.target.value)} placeholder="https://www.vrbo.com/icalendar/xxxxx.ics" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#3B5998]" />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1.5">Your Vilo Export URL</label>
                          <div className="flex gap-2">
                            <input type="text" value={getExportUrl('vrbo')} readOnly className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm bg-gray-100 text-gray-600" />
                            <button onClick={() => copyToClipboard(getExportUrl('vrbo'), 'vrbo')} className="px-3 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg transition-colors">
                              {copiedPlatform === 'vrbo' ? <Check size={16} className="text-green-600" /> : <Copy size={16} className="text-gray-600" />}
                            </button>
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1.5">Sync Frequency</label>
                          <select value={vrboSyncFrequency} onChange={(e) => setVrboSyncFrequency(e.target.value as '15min' | 'hourly' | '6hours' | 'daily')} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#3B5998]">
                            <option value="15min">Every 15 minutes</option>
                            <option value="hourly">Hourly</option>
                            <option value="6hours">Every 6 hours</option>
                            <option value="daily">Daily</option>
                          </select>
                        </div>
                        <div className="flex items-center gap-3 pt-2">
                          <button onClick={() => handleSyncSave('vrbo', vrboSyncEnabled, vrboIcalImportUrl, vrboSyncFrequency, setVrboSyncLoading, setVrboSyncMessage)} disabled={vrboSyncLoading} className="flex items-center gap-2 px-4 py-2 bg-[#3B5998] text-white rounded-lg text-sm font-medium hover:bg-[#324b80] transition-colors disabled:opacity-50">
                            {vrboSyncLoading && <Loader2 size={14} className="animate-spin" />}
                            Save
                          </button>
                          {vrboSyncMessage && <span className={`text-xs ${vrboSyncMessage.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>{vrboSyncMessage.text}</span>}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Expedia Card */}
                  <div className="bg-white border border-gray-200 rounded-xl overflow-hidden mb-4">
                    <div className="p-5 border-b border-gray-100">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-lg bg-[#FFCC00]/20 flex items-center justify-center">
                            <span className="text-[#1a1a1a] font-bold text-xs">EXP</span>
                          </div>
                          <div>
                            <h3 className="text-sm font-semibold text-gray-900">Expedia</h3>
                            <p className="text-xs text-gray-500">Sync with Expedia Partner Central</p>
                          </div>
                        </div>
                        <button onClick={() => setExpediaSyncEnabled(!expediaSyncEnabled)} className={`relative w-11 h-6 rounded-full transition-colors ${expediaSyncEnabled ? 'bg-[#1a1a1a]' : 'bg-gray-300'}`}>
                          <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${expediaSyncEnabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
                        </button>
                      </div>
                    </div>
                    {expediaSyncEnabled && (
                      <div className="p-5 bg-gray-50 space-y-4">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1.5">iCal Import URL (from Expedia)</label>
                          <input type="url" value={expediaIcalImportUrl} onChange={(e) => setExpediaIcalImportUrl(e.target.value)} placeholder="https://www.expedia.com/calendar/ical/xxxxx.ics" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#1a1a1a]" />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1.5">Your Vilo Export URL</label>
                          <div className="flex gap-2">
                            <input type="text" value={getExportUrl('expedia')} readOnly className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm bg-gray-100 text-gray-600" />
                            <button onClick={() => copyToClipboard(getExportUrl('expedia'), 'expedia')} className="px-3 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg transition-colors">
                              {copiedPlatform === 'expedia' ? <Check size={16} className="text-green-600" /> : <Copy size={16} className="text-gray-600" />}
                            </button>
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1.5">Sync Frequency</label>
                          <select value={expediaSyncFrequency} onChange={(e) => setExpediaSyncFrequency(e.target.value as '15min' | 'hourly' | '6hours' | 'daily')} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#1a1a1a]">
                            <option value="15min">Every 15 minutes</option>
                            <option value="hourly">Hourly</option>
                            <option value="6hours">Every 6 hours</option>
                            <option value="daily">Daily</option>
                          </select>
                        </div>
                        <div className="flex items-center gap-3 pt-2">
                          <button onClick={() => handleSyncSave('expedia', expediaSyncEnabled, expediaIcalImportUrl, expediaSyncFrequency, setExpediaSyncLoading, setExpediaSyncMessage)} disabled={expediaSyncLoading} className="flex items-center gap-2 px-4 py-2 bg-[#1a1a1a] text-white rounded-lg text-sm font-medium hover:bg-[#333] transition-colors disabled:opacity-50">
                            {expediaSyncLoading && <Loader2 size={14} className="animate-spin" />}
                            Save
                          </button>
                          {expediaSyncMessage && <span className={`text-xs ${expediaSyncMessage.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>{expediaSyncMessage.text}</span>}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* TripAdvisor Card */}
                  <div className="bg-white border border-gray-200 rounded-xl overflow-hidden mb-4">
                    <div className="p-5 border-b border-gray-100">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-lg bg-[#00AF87]/10 flex items-center justify-center">
                            <span className="text-[#00AF87] font-bold text-xs">TA</span>
                          </div>
                          <div>
                            <h3 className="text-sm font-semibold text-gray-900">TripAdvisor</h3>
                            <p className="text-xs text-gray-500">Sync with TripAdvisor Rentals</p>
                          </div>
                        </div>
                        <button onClick={() => setTripadvisorSyncEnabled(!tripadvisorSyncEnabled)} className={`relative w-11 h-6 rounded-full transition-colors ${tripadvisorSyncEnabled ? 'bg-[#00AF87]' : 'bg-gray-300'}`}>
                          <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${tripadvisorSyncEnabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
                        </button>
                      </div>
                    </div>
                    {tripadvisorSyncEnabled && (
                      <div className="p-5 bg-gray-50 space-y-4">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1.5">iCal Import URL (from TripAdvisor)</label>
                          <input type="url" value={tripadvisorIcalImportUrl} onChange={(e) => setTripadvisorIcalImportUrl(e.target.value)} placeholder="https://www.tripadvisor.com/ical/xxxxx.ics" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#00AF87]" />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1.5">Your Vilo Export URL</label>
                          <div className="flex gap-2">
                            <input type="text" value={getExportUrl('tripadvisor')} readOnly className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm bg-gray-100 text-gray-600" />
                            <button onClick={() => copyToClipboard(getExportUrl('tripadvisor'), 'tripadvisor')} className="px-3 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg transition-colors">
                              {copiedPlatform === 'tripadvisor' ? <Check size={16} className="text-green-600" /> : <Copy size={16} className="text-gray-600" />}
                            </button>
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1.5">Sync Frequency</label>
                          <select value={tripadvisorSyncFrequency} onChange={(e) => setTripadvisorSyncFrequency(e.target.value as '15min' | 'hourly' | '6hours' | 'daily')} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#00AF87]">
                            <option value="15min">Every 15 minutes</option>
                            <option value="hourly">Hourly</option>
                            <option value="6hours">Every 6 hours</option>
                            <option value="daily">Daily</option>
                          </select>
                        </div>
                        <div className="flex items-center gap-3 pt-2">
                          <button onClick={() => handleSyncSave('tripadvisor', tripadvisorSyncEnabled, tripadvisorIcalImportUrl, tripadvisorSyncFrequency, setTripadvisorSyncLoading, setTripadvisorSyncMessage)} disabled={tripadvisorSyncLoading} className="flex items-center gap-2 px-4 py-2 bg-[#00AF87] text-white rounded-lg text-sm font-medium hover:bg-[#009973] transition-colors disabled:opacity-50">
                            {tripadvisorSyncLoading && <Loader2 size={14} className="animate-spin" />}
                            Save
                          </button>
                          {tripadvisorSyncMessage && <span className={`text-xs ${tripadvisorSyncMessage.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>{tripadvisorSyncMessage.text}</span>}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Agoda Card */}
                  <div className="bg-white border border-gray-200 rounded-xl overflow-hidden mb-4">
                    <div className="p-5 border-b border-gray-100">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-lg bg-[#5392F9]/10 flex items-center justify-center">
                            <span className="text-[#5392F9] font-bold text-xs">AG</span>
                          </div>
                          <div>
                            <h3 className="text-sm font-semibold text-gray-900">Agoda</h3>
                            <p className="text-xs text-gray-500">Sync with Agoda YCS</p>
                          </div>
                        </div>
                        <button onClick={() => setAgodaSyncEnabled(!agodaSyncEnabled)} className={`relative w-11 h-6 rounded-full transition-colors ${agodaSyncEnabled ? 'bg-[#5392F9]' : 'bg-gray-300'}`}>
                          <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${agodaSyncEnabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
                        </button>
                      </div>
                    </div>
                    {agodaSyncEnabled && (
                      <div className="p-5 bg-gray-50 space-y-4">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1.5">iCal Import URL (from Agoda)</label>
                          <input type="url" value={agodaIcalImportUrl} onChange={(e) => setAgodaIcalImportUrl(e.target.value)} placeholder="https://ycs.agoda.com/ical/xxxxx.ics" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#5392F9]" />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1.5">Your Vilo Export URL</label>
                          <div className="flex gap-2">
                            <input type="text" value={getExportUrl('agoda')} readOnly className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm bg-gray-100 text-gray-600" />
                            <button onClick={() => copyToClipboard(getExportUrl('agoda'), 'agoda')} className="px-3 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg transition-colors">
                              {copiedPlatform === 'agoda' ? <Check size={16} className="text-green-600" /> : <Copy size={16} className="text-gray-600" />}
                            </button>
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1.5">Sync Frequency</label>
                          <select value={agodaSyncFrequency} onChange={(e) => setAgodaSyncFrequency(e.target.value as '15min' | 'hourly' | '6hours' | 'daily')} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#5392F9]">
                            <option value="15min">Every 15 minutes</option>
                            <option value="hourly">Hourly</option>
                            <option value="6hours">Every 6 hours</option>
                            <option value="daily">Daily</option>
                          </select>
                        </div>
                        <div className="flex items-center gap-3 pt-2">
                          <button onClick={() => handleSyncSave('agoda', agodaSyncEnabled, agodaIcalImportUrl, agodaSyncFrequency, setAgodaSyncLoading, setAgodaSyncMessage)} disabled={agodaSyncLoading} className="flex items-center gap-2 px-4 py-2 bg-[#5392F9] text-white rounded-lg text-sm font-medium hover:bg-[#4080e6] transition-colors disabled:opacity-50">
                            {agodaSyncLoading && <Loader2 size={14} className="animate-spin" />}
                            Save
                          </button>
                          {agodaSyncMessage && <span className={`text-xs ${agodaSyncMessage.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>{agodaSyncMessage.text}</span>}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Hotels.com Card */}
                  <div className="bg-white border border-gray-200 rounded-xl overflow-hidden mb-4">
                    <div className="p-5 border-b border-gray-100">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-lg bg-[#D32F2F]/10 flex items-center justify-center">
                            <span className="text-[#D32F2F] font-bold text-xs">H</span>
                          </div>
                          <div>
                            <h3 className="text-sm font-semibold text-gray-900">Hotels.com</h3>
                            <p className="text-xs text-gray-500">Sync with Hotels.com Partner Central</p>
                          </div>
                        </div>
                        <button onClick={() => setHotelsComSyncEnabled(!hotelsComSyncEnabled)} className={`relative w-11 h-6 rounded-full transition-colors ${hotelsComSyncEnabled ? 'bg-[#D32F2F]' : 'bg-gray-300'}`}>
                          <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${hotelsComSyncEnabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
                        </button>
                      </div>
                    </div>
                    {hotelsComSyncEnabled && (
                      <div className="p-5 bg-gray-50 space-y-4">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1.5">iCal Import URL (from Hotels.com)</label>
                          <input type="url" value={hotelsComIcalImportUrl} onChange={(e) => setHotelsComIcalImportUrl(e.target.value)} placeholder="https://www.hotels.com/ical/xxxxx.ics" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#D32F2F]" />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1.5">Your Vilo Export URL</label>
                          <div className="flex gap-2">
                            <input type="text" value={getExportUrl('hotelscom')} readOnly className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm bg-gray-100 text-gray-600" />
                            <button onClick={() => copyToClipboard(getExportUrl('hotelscom'), 'hotelscom')} className="px-3 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg transition-colors">
                              {copiedPlatform === 'hotelscom' ? <Check size={16} className="text-green-600" /> : <Copy size={16} className="text-gray-600" />}
                            </button>
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1.5">Sync Frequency</label>
                          <select value={hotelsComSyncFrequency} onChange={(e) => setHotelsComSyncFrequency(e.target.value as '15min' | 'hourly' | '6hours' | 'daily')} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#D32F2F]">
                            <option value="15min">Every 15 minutes</option>
                            <option value="hourly">Hourly</option>
                            <option value="6hours">Every 6 hours</option>
                            <option value="daily">Daily</option>
                          </select>
                        </div>
                        <div className="flex items-center gap-3 pt-2">
                          <button onClick={() => handleSyncSave('hotelscom', hotelsComSyncEnabled, hotelsComIcalImportUrl, hotelsComSyncFrequency, setHotelsComSyncLoading, setHotelsComSyncMessage)} disabled={hotelsComSyncLoading} className="flex items-center gap-2 px-4 py-2 bg-[#D32F2F] text-white rounded-lg text-sm font-medium hover:bg-[#b92626] transition-colors disabled:opacity-50">
                            {hotelsComSyncLoading && <Loader2 size={14} className="animate-spin" />}
                            Save
                          </button>
                          {hotelsComSyncMessage && <span className={`text-xs ${hotelsComSyncMessage.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>{hotelsComSyncMessage.text}</span>}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Google Calendar Card */}
                  <div className="bg-white border border-gray-200 rounded-xl overflow-hidden mb-4">
                    <div className="p-5 border-b border-gray-100">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-lg bg-[#4285F4]/10 flex items-center justify-center">
                            <Calendar size={20} className="text-[#4285F4]" />
                          </div>
                          <div>
                            <h3 className="text-sm font-semibold text-gray-900">Google Calendar</h3>
                            <p className="text-xs text-gray-500">Sync with your Google Calendar</p>
                          </div>
                        </div>
                        <button onClick={() => setGoogleCalSyncEnabled(!googleCalSyncEnabled)} className={`relative w-11 h-6 rounded-full transition-colors ${googleCalSyncEnabled ? 'bg-[#4285F4]' : 'bg-gray-300'}`}>
                          <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${googleCalSyncEnabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
                        </button>
                      </div>
                    </div>
                    {googleCalSyncEnabled && (
                      <div className="p-5 bg-gray-50 space-y-4">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1.5">iCal Import URL (from Google Calendar)</label>
                          <input type="url" value={googleCalIcalImportUrl} onChange={(e) => setGoogleCalIcalImportUrl(e.target.value)} placeholder="https://calendar.google.com/calendar/ical/xxxxx/basic.ics" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#4285F4]" />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1.5">Your Vilo Export URL (add to Google Calendar)</label>
                          <div className="flex gap-2">
                            <input type="text" value={getExportUrl('googlecal')} readOnly className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm bg-gray-100 text-gray-600" />
                            <button onClick={() => copyToClipboard(getExportUrl('googlecal'), 'googlecal')} className="px-3 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg transition-colors">
                              {copiedPlatform === 'googlecal' ? <Check size={16} className="text-green-600" /> : <Copy size={16} className="text-gray-600" />}
                            </button>
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1.5">Sync Frequency</label>
                          <select value={googleCalSyncFrequency} onChange={(e) => setGoogleCalSyncFrequency(e.target.value as '15min' | 'hourly' | '6hours' | 'daily')} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#4285F4]">
                            <option value="15min">Every 15 minutes</option>
                            <option value="hourly">Hourly</option>
                            <option value="6hours">Every 6 hours</option>
                            <option value="daily">Daily</option>
                          </select>
                        </div>
                        <div className="flex items-center gap-3 pt-2">
                          <button onClick={() => handleSyncSave('googlecal', googleCalSyncEnabled, googleCalIcalImportUrl, googleCalSyncFrequency, setGoogleCalSyncLoading, setGoogleCalSyncMessage)} disabled={googleCalSyncLoading} className="flex items-center gap-2 px-4 py-2 bg-[#4285F4] text-white rounded-lg text-sm font-medium hover:bg-[#3574e0] transition-colors disabled:opacity-50">
                            {googleCalSyncLoading && <Loader2 size={14} className="animate-spin" />}
                            Save
                          </button>
                          {googleCalSyncMessage && <span className={`text-xs ${googleCalSyncMessage.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>{googleCalSyncMessage.text}</span>}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Outlook Card */}
                  <div className="bg-white border border-gray-200 rounded-xl overflow-hidden mb-4">
                    <div className="p-5 border-b border-gray-100">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-lg bg-[#0078D4]/10 flex items-center justify-center">
                            <Calendar size={20} className="text-[#0078D4]" />
                          </div>
                          <div>
                            <h3 className="text-sm font-semibold text-gray-900">Outlook / Microsoft 365</h3>
                            <p className="text-xs text-gray-500">Sync with Outlook Calendar</p>
                          </div>
                        </div>
                        <button onClick={() => setOutlookSyncEnabled(!outlookSyncEnabled)} className={`relative w-11 h-6 rounded-full transition-colors ${outlookSyncEnabled ? 'bg-[#0078D4]' : 'bg-gray-300'}`}>
                          <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${outlookSyncEnabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
                        </button>
                      </div>
                    </div>
                    {outlookSyncEnabled && (
                      <div className="p-5 bg-gray-50 space-y-4">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1.5">iCal Import URL (from Outlook)</label>
                          <input type="url" value={outlookIcalImportUrl} onChange={(e) => setOutlookIcalImportUrl(e.target.value)} placeholder="https://outlook.live.com/owa/calendar/xxxxx/ics" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#0078D4]" />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1.5">Your Vilo Export URL (add to Outlook)</label>
                          <div className="flex gap-2">
                            <input type="text" value={getExportUrl('outlook')} readOnly className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm bg-gray-100 text-gray-600" />
                            <button onClick={() => copyToClipboard(getExportUrl('outlook'), 'outlook')} className="px-3 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg transition-colors">
                              {copiedPlatform === 'outlook' ? <Check size={16} className="text-green-600" /> : <Copy size={16} className="text-gray-600" />}
                            </button>
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1.5">Sync Frequency</label>
                          <select value={outlookSyncFrequency} onChange={(e) => setOutlookSyncFrequency(e.target.value as '15min' | 'hourly' | '6hours' | 'daily')} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#0078D4]">
                            <option value="15min">Every 15 minutes</option>
                            <option value="hourly">Hourly</option>
                            <option value="6hours">Every 6 hours</option>
                            <option value="daily">Daily</option>
                          </select>
                        </div>
                        <div className="flex items-center gap-3 pt-2">
                          <button onClick={() => handleSyncSave('outlook', outlookSyncEnabled, outlookIcalImportUrl, outlookSyncFrequency, setOutlookSyncLoading, setOutlookSyncMessage)} disabled={outlookSyncLoading} className="flex items-center gap-2 px-4 py-2 bg-[#0078D4] text-white rounded-lg text-sm font-medium hover:bg-[#006abc] transition-colors disabled:opacity-50">
                            {outlookSyncLoading && <Loader2 size={14} className="animate-spin" />}
                            Save
                          </button>
                          {outlookSyncMessage && <span className={`text-xs ${outlookSyncMessage.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>{outlookSyncMessage.text}</span>}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Calendar Sync Info Section */}
                  <div className="mt-6 bg-green-50 border border-green-200 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-green-900 mb-2">How Calendar Sync Works</h4>
                    <ul className="text-sm text-green-800 space-y-1">
                      <li>- Paste the iCal URL from each booking platform to import their bookings into Vilo.</li>
                      <li>- Copy your Vilo Export URL and add it to each platform to share your availability.</li>
                      <li>- When a booking is made on any platform, all connected calendars update automatically.</li>
                      <li>- Blocked dates on any platform will block availability everywhere, preventing double bookings.</li>
                      <li>- Sync frequency determines how often Vilo checks for updates from external calendars.</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Members Section */}
          {activeSection === 'members' && (
            <div className="space-y-8">
              {/* Header */}
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-1">Team Members</h2>
                <p className="text-sm text-gray-500">
                  Manage your team and their permissions. You can have up to 3 team members plus the owner.
                </p>
              </div>

              {/* Status Message */}
              {membersMessage && (
                <div
                  className={`p-4 rounded-lg ${
                    membersMessage.type === 'success'
                      ? 'bg-green-50 border border-green-200 text-green-800'
                      : 'bg-red-50 border border-red-200 text-red-800'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {membersMessage.type === 'success' ? (
                      <Check size={16} />
                    ) : (
                      <AlertCircle size={16} />
                    )}
                    <span className="text-sm">{membersMessage.text}</span>
                  </div>
                </div>
              )}

              {/* Team Size Indicator */}
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white rounded-lg border border-gray-200">
                      <Users size={20} className="text-gray-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">Team Size</p>
                      <p className="text-sm text-gray-500">
                        {members.length} of 4 members
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gray-800 rounded-full transition-all duration-300"
                        style={{ width: `${(members.length / 4) * 100}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium text-gray-600">
                      {members.length}/4
                    </span>
                  </div>
                </div>
              </div>

              {/* Current Members */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900">Current Members</h3>
                  {(isOwner || tenant?.owner_user_id === user?.id) && members.length < 4 && (
                    <button
                      onClick={() => {
                        setShowInviteModal(true)
                        setGeneratedCode(null)
                        setInviteEmail('')
                        setMembersMessage(null)
                      }}
                      className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
                    >
                      <UserPlus size={16} />
                      <span>Invite Member</span>
                    </button>
                  )}
                </div>

                {membersLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="animate-spin text-gray-400" size={24} />
                  </div>
                ) : members.length === 0 ? (
                  <div className="text-center py-8 bg-gray-50 rounded-lg border border-gray-200">
                    <Users size={32} className="mx-auto text-gray-400 mb-2" />
                    <p className="text-gray-500">No team members yet</p>
                    <p className="text-sm text-gray-400">Invite team members to collaborate</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {members.map((member) => (
                      <div
                        key={member.id}
                        className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg"
                      >
                        <div className="flex items-center gap-4">
                          {member.avatar_url ? (
                            <img
                              src={member.avatar_url}
                              alt={member.name || member.email}
                              className="w-10 h-10 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                              <span className="text-sm font-medium text-gray-600">
                                {(member.name || member.email).charAt(0).toUpperCase()}
                              </span>
                            </div>
                          )}
                          <div>
                            <p className="font-medium text-gray-900">
                              {member.name || member.email}
                              {member.user_id === user?.id && (
                                <span className="ml-2 text-xs text-gray-500">(You)</span>
                              )}
                            </p>
                            <p className="text-sm text-gray-500">{member.email}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          {member.role === 'owner' ? (
                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${getRoleBadgeColor(member.role)}`}>
                              {getRoleDisplayName(member.role)}
                            </span>
                          ) : (isOwner || tenant?.owner_user_id === user?.id) ? (
                            <select
                              value={member.role}
                              onChange={(e) =>
                                handleRoleChange(member.user_id, e.target.value as 'general_manager' | 'accountant')
                              }
                              className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-400"
                            >
                              <option value="general_manager">General Manager</option>
                              <option value="accountant">Accountant</option>
                            </select>
                          ) : (
                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${getRoleBadgeColor(member.role)}`}>
                              {getRoleDisplayName(member.role)}
                            </span>
                          )}
                          {(isOwner || tenant?.owner_user_id === user?.id) && member.role !== 'owner' && (
                            <button
                              onClick={() => {
                                setMemberToRemove(member)
                                setShowRemoveModal(true)
                              }}
                              className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                              title="Remove member"
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Pending Invitations */}
              {(isOwner || tenant?.owner_user_id === user?.id) && invitations.length > 0 && (
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Pending Invitations</h3>
                  <div className="space-y-3">
                    {invitations.map((invitation) => (
                      <div
                        key={invitation.id}
                        className={`flex items-center justify-between p-4 bg-white border rounded-lg ${
                          invitation.is_expired ? 'border-red-200 bg-red-50' : 'border-gray-200'
                        }`}
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                            <Mail size={18} className="text-gray-400" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{invitation.email}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className={`px-2 py-0.5 rounded text-xs font-medium ${getRoleBadgeColor(invitation.role)}`}>
                                {getRoleDisplayName(invitation.role)}
                              </span>
                              {invitation.is_expired ? (
                                <span className="text-xs text-red-600">Expired</span>
                              ) : (
                                <span className="text-xs text-gray-500">
                                  Expires {new Date(invitation.expires_at).toLocaleDateString()}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => copyInviteCodeToClipboard(invitation.invitation_code)}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                            title="Copy invitation code"
                          >
                            <Copy size={14} />
                            <span className="font-mono text-xs">{invitation.invitation_code}</span>
                          </button>
                          <button
                            onClick={() => handleCancelInvitation(invitation.id)}
                            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                            title="Cancel invitation"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Permission Guide */}
              <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                <div className="flex items-start gap-3 mb-4">
                  <Shield size={20} className="text-gray-600 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-gray-900">Role Permissions</h4>
                    <p className="text-sm text-gray-500 mt-1">
                      Different roles have different levels of access to your workspace.
                    </p>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <span className="px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
                      Owner
                    </span>
                    <p className="text-sm text-gray-600">
                      Full access to everything including billing, team management, and account deletion.
                    </p>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                      General Manager
                    </span>
                    <p className="text-sm text-gray-600">
                      Full access to bookings, rooms, calendar, and reviews. Can manage business settings but not billing or team.
                    </p>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                      Accountant
                    </span>
                    <p className="text-sm text-gray-600">
                      View-only access to most features. Full access to billing, payments, and financial reports.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Delete Account Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete Account</h3>
            <p className="text-sm text-gray-600 mb-4">
              Are you sure you want to delete your account? This will permanently delete:
            </p>
            <ul className="text-sm text-gray-600 mb-4 list-disc list-inside">
              <li>Your profile and settings</li>
              <li>All your rooms and room data</li>
              <li>All bookings and booking history</li>
              <li>All reviews and ratings</li>
            </ul>
            <p className="text-sm text-gray-600 mb-4">
              Type <strong>DELETE</strong> to confirm:
            </p>
            <input
              type="text"
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder="Type DELETE to confirm"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-red-400 focus:border-red-400 mb-4"
            />
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowDeleteConfirm(false)
                  setDeleteConfirmText('')
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={deleteConfirmText !== 'DELETE' || deleteLoading}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-md text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {deleteLoading && <Loader2 size={16} className="animate-spin" />}
                Delete Forever
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Invite Member Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Invite Team Member</h3>
              <button
                onClick={() => {
                  setShowInviteModal(false)
                  setInviteEmail('')
                  setGeneratedCode(null)
                  setMembersMessage(null)
                }}
                className="p-1 text-gray-400 hover:text-gray-600 rounded"
              >
                <X size={20} />
              </button>
            </div>

            {!generatedCode ? (
              <>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email Address
                    </label>
                    <input
                      type="email"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      placeholder="colleague@example.com"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-400"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Role
                    </label>
                    <select
                      value={inviteRole}
                      onChange={(e) => setInviteRole(e.target.value as 'general_manager' | 'accountant')}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-400"
                    >
                      <option value="general_manager">General Manager</option>
                      <option value="accountant">Accountant</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Invitation Method
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setInviteMethod('code')}
                        className={`flex items-center justify-center gap-2 px-4 py-3 border rounded-lg transition-colors ${
                          inviteMethod === 'code'
                            ? 'border-gray-900 bg-gray-900 text-white'
                            : 'border-gray-300 hover:border-gray-400'
                        }`}
                      >
                        <Copy size={16} />
                        <span className="text-sm">Get Code</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setInviteMethod('email')}
                        className={`flex items-center justify-center gap-2 px-4 py-3 border rounded-lg transition-colors ${
                          inviteMethod === 'email'
                            ? 'border-gray-900 bg-gray-900 text-white'
                            : 'border-gray-300 hover:border-gray-400'
                        }`}
                      >
                        <Mail size={16} />
                        <span className="text-sm">Send Email</span>
                      </button>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      {inviteMethod === 'code'
                        ? 'Generate a code to share manually with your team member.'
                        : 'We\'ll send an invitation email with a link to join.'}
                    </p>
                  </div>
                </div>

                <div className="flex justify-end gap-3 mt-6">
                  <button
                    onClick={() => {
                      setShowInviteModal(false)
                      setInviteEmail('')
                      setMembersMessage(null)
                    }}
                    className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleInviteMember}
                    disabled={!inviteEmail || inviteLoading}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors disabled:opacity-50"
                  >
                    {inviteLoading && <Loader2 size={16} className="animate-spin" />}
                    {inviteMethod === 'code' ? 'Generate Code' : 'Send Invitation'}
                  </button>
                </div>
              </>
            ) : (
              <div className="text-center py-4">
                <div className="mb-4">
                  <div className="inline-flex items-center justify-center w-12 h-12 bg-green-100 rounded-full mb-3">
                    <Check size={24} className="text-green-600" />
                  </div>
                  <p className="text-sm text-gray-600 mb-2">
                    Share this code with <strong>{inviteEmail}</strong>
                  </p>
                </div>

                <div className="bg-gray-100 rounded-lg p-4 mb-4">
                  <p className="text-2xl font-mono font-bold tracking-wider text-gray-900">
                    {generatedCode}
                  </p>
                </div>

                <button
                  onClick={() => copyInviteCodeToClipboard(generatedCode)}
                  className="flex items-center justify-center gap-2 w-full px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors"
                >
                  <Copy size={16} />
                  Copy Code
                </button>

                <div className="mt-4">
                  <p className="text-xs text-gray-400 mb-3">Or share via</p>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => shareViaEmail(inviteEmail, generatedCode)}
                      className="flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      <Mail size={16} />
                      Email
                    </button>
                    <button
                      onClick={() => shareViaWhatsApp(generatedCode)}
                      className="flex items-center justify-center gap-2 px-4 py-2 border border-green-500 bg-green-50 rounded-lg text-sm font-medium text-green-700 hover:bg-green-100 transition-colors"
                    >
                      <MessageCircle size={16} />
                      WhatsApp
                    </button>
                  </div>
                </div>

                <p className="text-xs text-gray-500 mt-4">
                  They can use this code at <strong>{window.location.origin}/join</strong> to join your team.
                </p>

                <button
                  onClick={() => {
                    setShowInviteModal(false)
                    setInviteEmail('')
                    setGeneratedCode(null)
                    setMembersMessage(null)
                  }}
                  className="mt-4 text-sm text-gray-600 hover:text-gray-900"
                >
                  Done
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Remove Member Modal */}
      {showRemoveModal && memberToRemove && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Remove Team Member</h3>
            <p className="text-sm text-gray-600 mb-4">
              Are you sure you want to remove <strong>{memberToRemove.name || memberToRemove.email}</strong> from your team?
            </p>
            <p className="text-sm text-gray-500 mb-4">
              They will no longer have access to your workspace. You can invite them again later if needed.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowRemoveModal(false)
                  setMemberToRemove(null)
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleRemoveMember}
                className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors"
              >
                Remove Member
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}

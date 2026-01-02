import { useState, useRef, useEffect } from 'react'
import {
  Building2, Mail, Phone, Globe, MapPin, Edit, X, Check, Loader2,
  Camera, FileText, DollarSign, Clock, Languages, Eye, EyeOff, FileCheck
} from 'lucide-react'
import type { TenantProperty } from '../types'
import type { TenantUpdateData } from '../../../../services/adminApi'

interface PropertySectionProps {
  property: TenantProperty
  onUpdate: (data: TenantUpdateData) => Promise<void>
}

// Validation
const validateEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
const validateUrl = (url: string) => url === '' || /^https?:\/\/.+/.test(url)

// Compact editable text component (same as OwnerSection)
function EditableText({
  value,
  onSave,
  placeholder = 'Not set',
  validate,
  type = 'text',
  className = ''
}: {
  value: string | null | undefined
  onSave: (value: string) => Promise<void>
  placeholder?: string
  validate?: (v: string) => boolean
  type?: 'text' | 'email' | 'tel' | 'url' | 'textarea'
  className?: string
}) {
  const [editing, setEditing] = useState(false)
  const [editValue, setEditValue] = useState(value || '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(false)
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null)

  useEffect(() => {
    if (editing) inputRef.current?.focus()
  }, [editing])

  const handleSave = async () => {
    if (validate && editValue && !validate(editValue)) {
      setError(true)
      return
    }
    try {
      setSaving(true)
      await onSave(editValue)
      setEditing(false)
      setError(false)
    } catch {
      setError(true)
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    setEditValue(value || '')
    setEditing(false)
    setError(false)
  }

  if (!editing) {
    return (
      <button
        onClick={() => setEditing(true)}
        className={`group text-left hover:bg-gray-100 rounded px-1 -mx-1 transition-colors ${className}`}
      >
        <span className={value ? 'text-gray-900' : 'text-gray-400 italic'}>
          {value || placeholder}
        </span>
        <Edit size={12} className="inline ml-1.5 opacity-0 group-hover:opacity-100 text-gray-400" />
      </button>
    )
  }

  return (
    <div className={`flex items-center gap-1.5 ${className}`}>
      {type === 'textarea' ? (
        <textarea
          ref={inputRef as React.RefObject<HTMLTextAreaElement>}
          value={editValue}
          onChange={(e) => { setEditValue(e.target.value); setError(false) }}
          onKeyDown={(e) => { if (e.key === 'Escape') handleCancel() }}
          rows={2}
          className={`flex-1 px-2 py-1 text-sm border rounded focus:outline-none focus:ring-1 focus:ring-accent-500 resize-none ${error ? 'border-red-300' : 'border-gray-300'}`}
        />
      ) : (
        <input
          ref={inputRef as React.RefObject<HTMLInputElement>}
          type={type === 'url' ? 'text' : type}
          value={editValue}
          onChange={(e) => { setEditValue(e.target.value); setError(false) }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSave()
            if (e.key === 'Escape') handleCancel()
          }}
          className={`flex-1 px-2 py-1 text-sm border rounded focus:outline-none focus:ring-1 focus:ring-accent-500 ${error ? 'border-red-300' : 'border-gray-300'}`}
        />
      )}
      <button onClick={handleCancel} className="p-1 text-gray-400 hover:text-gray-600">
        <X size={14} />
      </button>
      <button onClick={handleSave} disabled={saving} className="p-1 text-accent-500 hover:text-accent-600">
        {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
      </button>
    </div>
  )
}

// Editable select component
function EditableSelect({
  value,
  options,
  onSave,
  placeholder = 'Select...',
  className = ''
}: {
  value: string | null | undefined
  options: { value: string; label: string }[]
  onSave: (value: string) => Promise<void>
  placeholder?: string
  className?: string
}) {
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)

  const handleChange = async (newValue: string) => {
    try {
      setSaving(true)
      await onSave(newValue)
      setEditing(false)
    } catch {
      // error handled by parent
    } finally {
      setSaving(false)
    }
  }

  const displayValue = options.find(o => o.value === value)?.label || value

  if (!editing) {
    return (
      <button
        onClick={() => setEditing(true)}
        className={`group text-left hover:bg-gray-100 rounded px-1 -mx-1 transition-colors ${className}`}
      >
        <span className={value ? 'text-gray-900' : 'text-gray-400 italic'}>
          {displayValue || placeholder}
        </span>
        <Edit size={12} className="inline ml-1.5 opacity-0 group-hover:opacity-100 text-gray-400" />
      </button>
    )
  }

  return (
    <div className={`flex items-center gap-1.5 ${className}`}>
      <select
        value={value || ''}
        onChange={(e) => handleChange(e.target.value)}
        disabled={saving}
        className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-accent-500 bg-white"
        autoFocus
      >
        <option value="">{placeholder}</option>
        {options.map(opt => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
      <button onClick={() => setEditing(false)} className="p-1 text-gray-400 hover:text-gray-600">
        <X size={14} />
      </button>
      {saving && <Loader2 size={14} className="animate-spin text-accent-500" />}
    </div>
  )
}

// Currency options
const CURRENCIES = [
  { value: 'ZAR', label: 'ZAR - South African Rand' },
  { value: 'USD', label: 'USD - US Dollar' },
  { value: 'EUR', label: 'EUR - Euro' },
  { value: 'GBP', label: 'GBP - British Pound' },
  { value: 'AUD', label: 'AUD - Australian Dollar' },
  { value: 'CAD', label: 'CAD - Canadian Dollar' },
]

// Timezone options (common ones)
const TIMEZONES = [
  { value: 'Africa/Johannesburg', label: 'Africa/Johannesburg (GMT+2)' },
  { value: 'Europe/London', label: 'Europe/London (GMT+0)' },
  { value: 'Europe/Paris', label: 'Europe/Paris (GMT+1)' },
  { value: 'America/New_York', label: 'America/New York (GMT-5)' },
  { value: 'America/Los_Angeles', label: 'America/Los Angeles (GMT-8)' },
  { value: 'Asia/Dubai', label: 'Asia/Dubai (GMT+4)' },
  { value: 'Australia/Sydney', label: 'Australia/Sydney (GMT+11)' },
]

// Language options
const LANGUAGES = [
  { value: 'en', label: 'English' },
  { value: 'af', label: 'Afrikaans' },
  { value: 'zu', label: 'Zulu' },
  { value: 'xh', label: 'Xhosa' },
  { value: 'fr', label: 'French' },
  { value: 'de', label: 'German' },
  { value: 'es', label: 'Spanish' },
  { value: 'pt', label: 'Portuguese' },
]

export default function PropertySection({ property, onUpdate }: PropertySectionProps) {
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [isUploadingLogo, setIsUploadingLogo] = useState(false)
  const [showAddressEdit, setShowAddressEdit] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text })
    setTimeout(() => setMessage(null), 3000)
  }

  const handleFieldSave = async (field: keyof TenantUpdateData, value: string) => {
    await onUpdate({ [field]: value || undefined })
    showMessage('success', 'Updated')
  }

  const handleLogoUpload = async (file: File) => {
    if (!file.type.startsWith('image/') || file.size > 5 * 1024 * 1024) {
      showMessage('error', 'Invalid image (max 5MB)')
      return
    }
    setIsUploadingLogo(true)
    const reader = new FileReader()
    reader.onload = async (e) => {
      try {
        // For now, store as base64 data URL (would need proper upload endpoint for production)
        const dataUrl = e.target?.result as string
        await onUpdate({ logo_url: dataUrl })
        showMessage('success', 'Logo updated')
      } catch { showMessage('error', 'Upload failed') }
      finally { setIsUploadingLogo(false) }
    }
    reader.readAsDataURL(file)
  }

  const handleToggleDiscoverable = async () => {
    await onUpdate({ discoverable: !property.discoverable })
    showMessage('success', property.discoverable ? 'Hidden from discovery' : 'Now discoverable')
  }

  const formatAddress = () => {
    const parts = [property.addressLine1, property.city, property.country].filter(Boolean)
    return parts.length ? parts.join(', ') : null
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Property</h2>
        <p className="text-sm text-gray-500">Business information and settings</p>
      </div>

      {/* Message */}
      {message && (
        <div className={`px-3 py-2 rounded-lg text-sm ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
          {message.text}
        </div>
      )}

      {/* Business Card */}
      <div className="bg-gray-50 rounded-xl p-5">
        <div className="flex gap-4">
          {/* Logo */}
          <div
            className="relative w-16 h-16 rounded-xl overflow-hidden cursor-pointer shrink-0 group bg-accent-100"
            onClick={() => fileInputRef.current?.click()}
          >
            {property.logoUrl ? (
              <img src={property.logoUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Building2 size={24} className="text-accent-600" />
              </div>
            )}
            <div className={`absolute inset-0 bg-black/40 flex items-center justify-center transition-opacity ${isUploadingLogo ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
              {isUploadingLogo ? <Loader2 size={18} className="text-white animate-spin" /> : <Camera size={18} className="text-white" />}
            </div>
            <input ref={fileInputRef} type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && handleLogoUpload(e.target.files[0])} className="hidden" />
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0 space-y-1">
            <div className="flex items-center gap-2">
              <Building2 size={14} className="text-gray-400 shrink-0" />
              <EditableText
                value={property.businessName}
                onSave={(v) => handleFieldSave('business_name', v)}
                placeholder="Business name"
                className="text-sm font-medium"
              />
            </div>
            <div className="flex items-center gap-2">
              <Mail size={14} className="text-gray-400 shrink-0" />
              <EditableText
                value={property.businessEmail}
                onSave={(v) => handleFieldSave('business_email', v)}
                placeholder="Email"
                validate={validateEmail}
                type="email"
                className="text-sm"
              />
            </div>
            <div className="flex items-center gap-2">
              <Phone size={14} className="text-gray-400 shrink-0" />
              <EditableText
                value={property.businessPhone}
                onSave={(v) => handleFieldSave('business_phone', v)}
                placeholder="Phone"
                type="tel"
                className="text-sm"
              />
            </div>
            <div className="flex items-center gap-2">
              <Globe size={14} className="text-gray-400 shrink-0" />
              <EditableText
                value={property.websiteUrl}
                onSave={(v) => handleFieldSave('website_url', v)}
                placeholder="Website URL"
                validate={validateUrl}
                type="url"
                className="text-sm"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Description */}
      <div className="bg-gray-50 rounded-xl p-4">
        <div className="flex items-start gap-2">
          <FileText size={14} className="text-gray-400 mt-0.5 shrink-0" />
          <div className="flex-1">
            <p className="text-xs text-gray-500 mb-1">Description</p>
            <EditableText
              value={property.businessDescription}
              onSave={(v) => handleFieldSave('business_description', v)}
              placeholder="Add a business description..."
              type="textarea"
              className="text-sm"
            />
          </div>
        </div>
      </div>

      {/* Address */}
      <div className="bg-gray-50 rounded-xl p-4">
        <div className="flex items-start gap-2">
          <MapPin size={14} className="text-gray-400 mt-0.5 shrink-0" />
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-500">Address</p>
              <button
                onClick={() => setShowAddressEdit(!showAddressEdit)}
                className="text-xs text-accent-600 hover:underline"
              >
                {showAddressEdit ? 'Done' : 'Edit'}
              </button>
            </div>
            {!showAddressEdit ? (
              <p className="text-sm text-gray-900 mt-0.5">
                {formatAddress() || <span className="text-gray-400 italic">Not set</span>}
              </p>
            ) : (
              <div className="mt-2 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500 w-20">Line 1</span>
                  <EditableText value={property.addressLine1} onSave={(v) => handleFieldSave('address_line1', v)} placeholder="Street address" className="text-sm flex-1" />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500 w-20">Line 2</span>
                  <EditableText value={property.addressLine2} onSave={(v) => handleFieldSave('address_line2', v)} placeholder="Suite, unit, etc." className="text-sm flex-1" />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500 w-20">City</span>
                  <EditableText value={property.city} onSave={(v) => handleFieldSave('city', v)} placeholder="City" className="text-sm flex-1" />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500 w-20">State</span>
                  <EditableText value={property.stateProvince} onSave={(v) => handleFieldSave('state_province', v)} placeholder="State/Province" className="text-sm flex-1" />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500 w-20">Postal</span>
                  <EditableText value={property.postalCode} onSave={(v) => handleFieldSave('postal_code', v)} placeholder="Postal code" className="text-sm flex-1" />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500 w-20">Country</span>
                  <EditableText value={property.country} onSave={(v) => handleFieldSave('country', v)} placeholder="Country" className="text-sm flex-1" />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Settings */}
      <div className="bg-gray-50 rounded-xl p-4">
        <p className="text-xs text-gray-500 mb-3">Settings</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <div className="flex items-center gap-1.5 text-gray-400 mb-1">
              <DollarSign size={12} />
              <span className="text-xs">Currency</span>
            </div>
            <EditableSelect
              value={property.currency}
              options={CURRENCIES}
              onSave={(v) => handleFieldSave('currency', v)}
              placeholder="Select"
              className="text-sm"
            />
          </div>
          <div>
            <div className="flex items-center gap-1.5 text-gray-400 mb-1">
              <Clock size={12} />
              <span className="text-xs">Timezone</span>
            </div>
            <EditableSelect
              value={property.timezone}
              options={TIMEZONES}
              onSave={(v) => handleFieldSave('timezone', v)}
              placeholder="Select"
              className="text-sm"
            />
          </div>
          <div>
            <div className="flex items-center gap-1.5 text-gray-400 mb-1">
              <Languages size={12} />
              <span className="text-xs">Language</span>
            </div>
            <EditableSelect
              value={property.language}
              options={LANGUAGES}
              onSave={(v) => handleFieldSave('language', v)}
              placeholder="Select"
              className="text-sm"
            />
          </div>
          <div>
            <div className="flex items-center gap-1.5 text-gray-400 mb-1">
              {property.discoverable ? <Eye size={12} /> : <EyeOff size={12} />}
              <span className="text-xs">Discoverable</span>
            </div>
            <button
              onClick={handleToggleDiscoverable}
              className={`text-sm font-medium px-2 py-0.5 rounded transition-colors ${
                property.discoverable
                  ? 'text-green-700 bg-green-100 hover:bg-green-200'
                  : 'text-gray-500 bg-gray-200 hover:bg-gray-300'
              }`}
            >
              {property.discoverable ? 'Yes' : 'No'}
            </button>
          </div>
        </div>
      </div>

      {/* Legal Info */}
      <div className="bg-gray-50 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <FileCheck size={14} className="text-gray-400" />
          <p className="text-xs text-gray-500">Legal Information</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-gray-500 mb-1">VAT Number</p>
            <EditableText
              value={property.vatNumber}
              onSave={(v) => handleFieldSave('vat_number', v)}
              placeholder="Add VAT number"
              className="text-sm"
            />
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">Company Registration</p>
            <EditableText
              value={property.companyRegistrationNumber}
              onSave={(v) => handleFieldSave('company_registration_number', v)}
              placeholder="Add registration number"
              className="text-sm"
            />
          </div>
        </div>
      </div>
    </div>
  )
}

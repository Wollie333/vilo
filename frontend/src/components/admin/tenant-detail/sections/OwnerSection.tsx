import { useState, useRef, useEffect } from 'react'
import {
  User, Mail, Phone, MapPin, Edit, X, Check, KeyRound, Loader2,
  Camera, Briefcase, FileText, ChevronDown, History, ExternalLink
} from 'lucide-react'
import type { TenantOwner, OwnerUpdateData, SocialLinks, OwnerActivityLog } from '../../../../services/adminApi'
import { adminTenants } from '../../../../services/adminApi'

// Social media icons
const SocialIcon = ({ platform, filled }: { platform: string; filled: boolean }) => {
  const baseClass = `w-5 h-5 ${filled ? 'text-gray-700' : 'text-gray-300'}`

  const icons: Record<string, JSX.Element> = {
    whatsapp: (
      <svg viewBox="0 0 24 24" className={baseClass} fill="currentColor">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
      </svg>
    ),
    linkedin: (
      <svg viewBox="0 0 24 24" className={baseClass} fill="currentColor">
        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
      </svg>
    ),
    twitter: (
      <svg viewBox="0 0 24 24" className={baseClass} fill="currentColor">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
      </svg>
    ),
    facebook: (
      <svg viewBox="0 0 24 24" className={baseClass} fill="currentColor">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
      </svg>
    ),
    instagram: (
      <svg viewBox="0 0 24 24" className={baseClass} fill="currentColor">
        <path d="M12 0C8.74 0 8.333.015 7.053.072 5.775.132 4.905.333 4.14.63c-.789.306-1.459.717-2.126 1.384S.935 3.35.63 4.14C.333 4.905.131 5.775.072 7.053.012 8.333 0 8.74 0 12s.015 3.667.072 4.947c.06 1.277.261 2.148.558 2.913.306.788.717 1.459 1.384 2.126.667.666 1.336 1.079 2.126 1.384.766.296 1.636.499 2.913.558C8.333 23.988 8.74 24 12 24s3.667-.015 4.947-.072c1.277-.06 2.148-.262 2.913-.558.788-.306 1.459-.718 2.126-1.384.666-.667 1.079-1.335 1.384-2.126.296-.765.499-1.636.558-2.913.06-1.28.072-1.687.072-4.947s-.015-3.667-.072-4.947c-.06-1.277-.262-2.149-.558-2.913-.306-.789-.718-1.459-1.384-2.126C21.319 1.347 20.651.935 19.86.63c-.765-.297-1.636-.499-2.913-.558C15.667.012 15.26 0 12 0zm0 2.16c3.203 0 3.585.016 4.85.071 1.17.055 1.805.249 2.227.415.562.217.96.477 1.382.896.419.42.679.819.896 1.381.164.422.36 1.057.413 2.227.057 1.266.07 1.646.07 4.85s-.015 3.585-.074 4.85c-.061 1.17-.256 1.805-.421 2.227-.224.562-.479.96-.899 1.382-.419.419-.824.679-1.38.896-.42.164-1.065.36-2.235.413-1.274.057-1.649.07-4.859.07-3.211 0-3.586-.015-4.859-.074-1.171-.061-1.816-.256-2.236-.421-.569-.224-.96-.479-1.379-.899-.421-.419-.69-.824-.9-1.38-.165-.42-.359-1.065-.42-2.235-.045-1.26-.061-1.649-.061-4.844 0-3.196.016-3.586.061-4.861.061-1.17.255-1.814.42-2.234.21-.57.479-.96.9-1.381.419-.419.81-.689 1.379-.898.42-.166 1.051-.361 2.221-.421 1.275-.045 1.65-.06 4.859-.06l.045.03zm0 3.678c-3.405 0-6.162 2.76-6.162 6.162 0 3.405 2.76 6.162 6.162 6.162 3.405 0 6.162-2.76 6.162-6.162 0-3.405-2.76-6.162-6.162-6.162zM12 16c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4zm7.846-10.405c0 .795-.646 1.44-1.44 1.44-.795 0-1.44-.646-1.44-1.44 0-.794.646-1.439 1.44-1.439.793-.001 1.44.645 1.44 1.439z"/>
      </svg>
    )
  }
  return icons[platform] || null
}

interface OwnerSectionProps {
  owner: TenantOwner | null
  tenantId: string
  onUpdate: (data: OwnerUpdateData) => Promise<void>
  onResetPassword: () => Promise<void>
}

// Validation
const validateEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
const validatePhone = (phone: string) => phone === '' || /^[+]?[\d\s()-]{7,20}$/.test(phone)

// Compact editable text component
function EditableText({
  value,
  onSave,
  placeholder = 'Not set',
  validate,
  type = 'text',
  className = ''
}: {
  value: string | null
  onSave: (value: string) => Promise<void>
  placeholder?: string
  validate?: (v: string) => boolean
  type?: 'text' | 'email' | 'tel' | 'textarea'
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
          type={type}
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

export default function OwnerSection({ owner, tenantId, onUpdate, onResetPassword }: OwnerSectionProps) {
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false)
  const [isResettingPassword, setIsResettingPassword] = useState(false)
  const [showActivity, setShowActivity] = useState(false)
  const [activityLog, setActivityLog] = useState<OwnerActivityLog[]>([])
  const [loadingActivity, setLoadingActivity] = useState(false)
  const [editingSocial, setEditingSocial] = useState<keyof SocialLinks | null>(null)
  const [socialValue, setSocialValue] = useState('')
  const [showAddressEdit, setShowAddressEdit] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text })
    setTimeout(() => setMessage(null), 3000)
  }

  const handleFieldSave = async (key: string, value: string) => {
    await onUpdate({ [key]: value })
    showMessage('success', 'Updated')
  }

  const handleAddressSave = async (key: string, value: string) => {
    const addr = owner?.address || {}
    await onUpdate({
      address: {
        line1: addr.line1 || undefined,
        line2: addr.line2 || undefined,
        city: addr.city || undefined,
        state: addr.state || undefined,
        postalCode: addr.postalCode || undefined,
        country: addr.country || undefined,
        [key]: value || undefined
      }
    })
    showMessage('success', 'Address updated')
  }

  const handleSocialSave = async () => {
    if (!editingSocial) return
    await onUpdate({
      socialLinks: { ...owner?.socialLinks, [editingSocial]: socialValue || undefined }
    })
    setEditingSocial(null)
    showMessage('success', 'Social link updated')
  }

  const handleAvatarUpload = async (file: File) => {
    if (!file.type.startsWith('image/') || file.size > 5 * 1024 * 1024) {
      showMessage('error', 'Invalid image (max 5MB)')
      return
    }
    setIsUploadingAvatar(true)
    const reader = new FileReader()
    reader.onload = async (e) => {
      try {
        const result = await adminTenants.uploadOwnerAvatar(tenantId, e.target?.result as string, file.name)
        await onUpdate({ avatarUrl: result.url })
        showMessage('success', 'Avatar updated')
      } catch { showMessage('error', 'Upload failed') }
      finally { setIsUploadingAvatar(false) }
    }
    reader.readAsDataURL(file)
  }

  const handleResetPassword = async () => {
    if (!confirm('Send password reset email?')) return
    setIsResettingPassword(true)
    try {
      await onResetPassword()
      showMessage('success', 'Reset email sent')
    } catch { showMessage('error', 'Failed to send') }
    finally { setIsResettingPassword(false) }
  }

  const loadActivity = async () => {
    if (activityLog.length) return
    setLoadingActivity(true)
    try {
      const logs = await adminTenants.getOwnerActivity(tenantId)
      setActivityLog(logs)
    } catch { /* ignore */ }
    finally { setLoadingActivity(false) }
  }

  const formatDate = (d: string) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '-'

  const formatAddress = () => {
    if (!owner?.address) return null
    const parts = [owner.address.line1, owner.address.city, owner.address.country].filter(Boolean)
    return parts.length ? parts.join(', ') : null
  }

  const getInitials = () => {
    if (owner?.displayName) return owner.displayName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    return owner?.email?.charAt(0).toUpperCase() || 'O'
  }

  if (!owner) {
    return (
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Owner</h2>
          <p className="text-sm text-gray-500">Account owner and primary contact</p>
        </div>
        <div className="py-12 text-center bg-gray-50 rounded-lg">
          <User size={32} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500">No owner information available</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Owner</h2>
        <p className="text-sm text-gray-500">Account owner and primary contact</p>
      </div>

      {/* Message */}
      {message && (
        <div className={`px-3 py-2 rounded-lg text-sm ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
          {message.text}
        </div>
      )}

      {/* Profile Card */}
      <div className="bg-gray-50 rounded-xl p-5">
        <div className="flex gap-4">
          {/* Avatar */}
          <div
            className="relative w-16 h-16 rounded-xl overflow-hidden cursor-pointer shrink-0 group"
            onClick={() => fileInputRef.current?.click()}
          >
            {owner.avatarUrl ? (
              <img src={owner.avatarUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-accent-400 to-accent-600 flex items-center justify-center text-white font-semibold text-lg">
                {getInitials()}
              </div>
            )}
            <div className={`absolute inset-0 bg-black/40 flex items-center justify-center transition-opacity ${isUploadingAvatar ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
              {isUploadingAvatar ? <Loader2 size={18} className="text-white animate-spin" /> : <Camera size={18} className="text-white" />}
            </div>
            <input ref={fileInputRef} type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && handleAvatarUpload(e.target.files[0])} className="hidden" />
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0 space-y-1">
            <div className="flex items-center gap-2">
              <User size={14} className="text-gray-400 shrink-0" />
              <EditableText
                value={owner.displayName}
                onSave={(v) => handleFieldSave('displayName', v)}
                placeholder="Add name"
                className="text-sm font-medium"
              />
            </div>
            <div className="flex items-center gap-2">
              <Briefcase size={14} className="text-gray-400 shrink-0" />
              <EditableText
                value={owner.jobTitle}
                onSave={(v) => handleFieldSave('jobTitle', v)}
                placeholder="Add title"
                className="text-sm"
              />
            </div>
            <div className="flex items-center gap-2">
              <Mail size={14} className="text-gray-400 shrink-0" />
              <EditableText
                value={owner.email}
                onSave={(v) => handleFieldSave('email', v)}
                validate={validateEmail}
                type="email"
                className="text-sm"
              />
            </div>
            <div className="flex items-center gap-2">
              <Phone size={14} className="text-gray-400 shrink-0" />
              <EditableText
                value={owner.phone}
                onSave={(v) => handleFieldSave('phone', v)}
                placeholder="Add phone"
                validate={validatePhone}
                type="tel"
                className="text-sm"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Bio */}
      <div className="bg-gray-50 rounded-xl p-4">
        <div className="flex items-start gap-2">
          <FileText size={14} className="text-gray-400 mt-0.5 shrink-0" />
          <div className="flex-1">
            <p className="text-xs text-gray-500 mb-1">Bio</p>
            <EditableText
              value={owner.bio}
              onSave={(v) => handleFieldSave('bio', v)}
              placeholder="Add a short bio..."
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
                {(['line1', 'line2', 'city', 'state', 'postalCode', 'country'] as const).map((field) => (
                  <div key={field} className="flex items-center gap-2">
                    <span className="text-xs text-gray-500 w-20 capitalize">{field === 'postalCode' ? 'Postal' : field}</span>
                    <EditableText
                      value={owner.address?.[field] || null}
                      onSave={(v) => handleAddressSave(field, v)}
                      placeholder={`Add ${field}`}
                      className="text-sm flex-1"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Social Links */}
      <div className="bg-gray-50 rounded-xl p-4">
        <p className="text-xs text-gray-500 mb-2">Social Links</p>
        <div className="flex items-center gap-3">
          {(['whatsapp', 'linkedin', 'twitter', 'facebook', 'instagram'] as const).map((platform) => {
            const hasLink = !!owner.socialLinks?.[platform]
            const isEditing = editingSocial === platform

            if (isEditing) {
              return (
                <div key={platform} className="flex items-center gap-1">
                  <input
                    type="text"
                    value={socialValue}
                    onChange={(e) => setSocialValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSocialSave()
                      if (e.key === 'Escape') setEditingSocial(null)
                    }}
                    placeholder={platform === 'whatsapp' ? '+27...' : 'https://...'}
                    className="w-40 px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-accent-500"
                    autoFocus
                  />
                  <button onClick={() => setEditingSocial(null)} className="p-0.5 text-gray-400">
                    <X size={12} />
                  </button>
                  <button onClick={handleSocialSave} className="p-0.5 text-accent-500">
                    <Check size={12} />
                  </button>
                </div>
              )
            }

            return (
              <button
                key={platform}
                onClick={() => {
                  setSocialValue(owner.socialLinks?.[platform] || '')
                  setEditingSocial(platform)
                }}
                className={`p-2 rounded-lg transition-colors ${hasLink ? 'bg-white hover:bg-gray-100' : 'hover:bg-gray-100'}`}
                title={hasLink ? owner.socialLinks?.[platform] : `Add ${platform}`}
              >
                <SocialIcon platform={platform} filled={hasLink} />
              </button>
            )
          })}
        </div>
      </div>

      {/* Account Info + Actions */}
      <div className="flex items-center justify-between bg-gray-50 rounded-xl p-4">
        <div className="flex items-center gap-6 text-sm">
          <div>
            <span className="text-gray-500">Created </span>
            <span className="text-gray-900">{formatDate(owner.createdAt)}</span>
          </div>
          {owner.lastSignInAt && (
            <div>
              <span className="text-gray-500">Last login </span>
              <span className="text-gray-900">{formatDate(owner.lastSignInAt)}</span>
            </div>
          )}
        </div>
        <button
          onClick={handleResetPassword}
          disabled={isResettingPassword}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
        >
          {isResettingPassword ? <Loader2 size={14} className="animate-spin" /> : <KeyRound size={14} />}
          Reset Password
        </button>
      </div>

      {/* Activity Log Toggle */}
      <button
        onClick={() => { setShowActivity(!showActivity); loadActivity() }}
        className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700"
      >
        <History size={14} />
        Activity Log
        <ChevronDown size={14} className={`transition-transform ${showActivity ? 'rotate-180' : ''}`} />
      </button>

      {showActivity && (
        <div className="bg-gray-50 rounded-xl p-4">
          {loadingActivity ? (
            <div className="py-4 text-center">
              <Loader2 size={16} className="animate-spin mx-auto text-gray-400" />
            </div>
          ) : activityLog.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-2">No activity yet</p>
          ) : (
            <div className="space-y-2">
              {activityLog.slice(0, 5).map((log) => (
                <div key={log.id} className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">{log.description}</span>
                  <span className="text-gray-400 text-xs">{formatDate(log.timestamp)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

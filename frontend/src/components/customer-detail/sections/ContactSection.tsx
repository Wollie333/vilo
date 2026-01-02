import { useState, useEffect } from 'react'
import { Mail, Phone, Globe, MapPin, Edit2, Check, X, User } from 'lucide-react'

interface ContactInfo {
  name?: string | null
  email: string
  phone?: string | null
  country?: string
  city?: string
}

interface ContactSectionProps {
  contact: ContactInfo
  onUpdate?: (updates: Partial<ContactInfo>) => Promise<void>
  isEditable?: boolean
}

export default function ContactSection({
  contact,
  onUpdate,
  isEditable = false
}: ContactSectionProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editedContact, setEditedContact] = useState<ContactInfo>(contact)
  const [saving, setSaving] = useState(false)

  // Sync when contact prop changes
  useEffect(() => {
    setEditedContact(contact)
  }, [contact])

  const handleSave = async () => {
    if (!onUpdate) return

    try {
      setSaving(true)
      await onUpdate(editedContact)
      setIsEditing(false)
    } catch (error) {
      console.error('Failed to update contact:', error)
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    setEditedContact(contact)
    setIsEditing(false)
  }

  const contactFields = [
    {
      id: 'name',
      label: 'Full Name',
      icon: User,
      value: contact.name,
      editable: true,
      type: 'text'
    },
    {
      id: 'email',
      label: 'Email Address',
      icon: Mail,
      value: contact.email,
      editable: false, // Email is typically not editable
      type: 'email'
    },
    {
      id: 'phone',
      label: 'Phone Number',
      icon: Phone,
      value: contact.phone,
      editable: true,
      type: 'tel'
    }
  ]

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900">Contact Information</h3>
        {isEditable && !isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            className="flex items-center gap-1.5 text-sm text-accent-600 hover:text-accent-700 font-medium"
          >
            <Edit2 size={14} />
            Edit
          </button>
        )}
        {isEditing && (
          <div className="flex items-center gap-2">
            <button
              onClick={handleCancel}
              disabled={saving}
              className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800 font-medium rounded-lg hover:bg-gray-100"
            >
              <X size={14} />
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-1 px-3 py-1.5 text-sm text-white bg-accent-600 hover:bg-accent-700 font-medium rounded-lg disabled:opacity-50"
            >
              {saving ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Check size={14} />
              )}
              Save
            </button>
          </div>
        )}
      </div>

      {/* Contact Fields */}
      <div className="space-y-4">
        {contactFields.map((field) => {
          const Icon = field.icon

          return (
            <div key={field.id} className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                <Icon size={18} className="text-gray-500" />
              </div>
              <div className="flex-1 min-w-0">
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                  {field.label}
                </label>
                {isEditing && field.editable ? (
                  <input
                    type={field.type}
                    value={editedContact[field.id as keyof ContactInfo] || ''}
                    onChange={(e) => setEditedContact({
                      ...editedContact,
                      [field.id]: e.target.value
                    })}
                    className="mt-1 w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-500/20 focus:border-accent-500"
                    placeholder={`Enter ${field.label.toLowerCase()}`}
                  />
                ) : (
                  <p className="mt-1 text-sm text-gray-900">
                    {field.value || <span className="text-gray-400">Not provided</span>}
                  </p>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Portal Access Info */}
      <div className="mt-6 pt-6 border-t border-gray-100">
        <h4 className="text-sm font-semibold text-gray-900 mb-3">Portal Access</h4>
        <div className="p-4 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-600">
            Customer portal access is managed through their account settings.
            Use the "Send Portal Link" action to help customers access their portal.
          </p>
        </div>
      </div>
    </div>
  )
}

import { useState, useEffect } from 'react'
import { Building2, Check, X, Save } from 'lucide-react'

interface BusinessDetails {
  businessName?: string | null
  businessVatNumber?: string | null
  businessRegistrationNumber?: string | null
  businessAddressLine1?: string | null
  businessAddressLine2?: string | null
  businessCity?: string | null
  businessPostalCode?: string | null
  businessCountry?: string | null
  useBusinessDetailsOnInvoice?: boolean
}

interface BusinessDetailsUpdate {
  businessName?: string
  businessVatNumber?: string
  businessRegistrationNumber?: string
  businessAddressLine1?: string
  businessAddressLine2?: string
  businessCity?: string
  businessPostalCode?: string
  businessCountry?: string
  useBusinessDetailsOnInvoice?: boolean
}

interface BusinessDetailsSectionProps {
  details: BusinessDetails
  onSave?: (updates: BusinessDetailsUpdate) => Promise<void>
  isEditing?: boolean
}

export default function BusinessDetailsSection({
  details,
  onSave,
  isEditing: initialEditing = false
}: BusinessDetailsSectionProps) {
  const [isEditing, setIsEditing] = useState(initialEditing)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState<BusinessDetailsUpdate>({
    businessName: details.businessName || '',
    businessVatNumber: details.businessVatNumber || '',
    businessRegistrationNumber: details.businessRegistrationNumber || '',
    businessAddressLine1: details.businessAddressLine1 || '',
    businessAddressLine2: details.businessAddressLine2 || '',
    businessCity: details.businessCity || '',
    businessPostalCode: details.businessPostalCode || '',
    businessCountry: details.businessCountry || '',
    useBusinessDetailsOnInvoice: details.useBusinessDetailsOnInvoice || false
  })

  useEffect(() => {
    setFormData({
      businessName: details.businessName || '',
      businessVatNumber: details.businessVatNumber || '',
      businessRegistrationNumber: details.businessRegistrationNumber || '',
      businessAddressLine1: details.businessAddressLine1 || '',
      businessAddressLine2: details.businessAddressLine2 || '',
      businessCity: details.businessCity || '',
      businessPostalCode: details.businessPostalCode || '',
      businessCountry: details.businessCountry || '',
      useBusinessDetailsOnInvoice: details.useBusinessDetailsOnInvoice || false
    })
  }, [details])

  const handleSave = async () => {
    if (!onSave) return

    try {
      setSaving(true)
      await onSave(formData)
      setIsEditing(false)
    } catch (error) {
      console.error('Failed to save business details:', error)
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    setFormData({
      businessName: details.businessName || '',
      businessVatNumber: details.businessVatNumber || '',
      businessRegistrationNumber: details.businessRegistrationNumber || '',
      businessAddressLine1: details.businessAddressLine1 || '',
      businessAddressLine2: details.businessAddressLine2 || '',
      businessCity: details.businessCity || '',
      businessPostalCode: details.businessPostalCode || '',
      businessCountry: details.businessCountry || '',
      useBusinessDetailsOnInvoice: details.useBusinessDetailsOnInvoice || false
    })
    setIsEditing(false)
  }

  const hasBusinessDetails = details.businessName || details.businessVatNumber

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Business Details</h3>
          <p className="text-sm text-gray-500">
            Optional billing information for invoices
          </p>
        </div>
        {onSave && !isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            className="px-4 py-2 text-sm font-medium text-accent-600 hover:text-accent-700 hover:bg-accent-50 rounded-lg transition-colors"
          >
            {hasBusinessDetails ? 'Edit Details' : 'Add Details'}
          </button>
        )}
        {isEditing && (
          <div className="flex items-center gap-2">
            <button
              onClick={handleCancel}
              disabled={saving}
              className="flex items-center gap-1 px-3 py-2 text-sm text-gray-600 hover:text-gray-800 font-medium rounded-lg hover:bg-gray-100"
            >
              <X size={14} />
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-1 px-4 py-2 text-sm text-white bg-accent-600 hover:bg-accent-700 font-medium rounded-lg disabled:opacity-50"
            >
              {saving ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Save size={14} />
              )}
              Save
            </button>
          </div>
        )}
      </div>

      {isEditing ? (
        /* Edit Form */
        <div className="space-y-6">
          {/* Company Info */}
          <div className="p-4 bg-gray-50 rounded-xl">
            <h4 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
              <Building2 size={16} />
              Company Information
            </h4>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Business Name
                </label>
                <input
                  type="text"
                  value={formData.businessName || ''}
                  onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                  placeholder="Company or business name"
                  className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-500/20 focus:border-accent-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    VAT Number
                  </label>
                  <input
                    type="text"
                    value={formData.businessVatNumber || ''}
                    onChange={(e) => setFormData({ ...formData, businessVatNumber: e.target.value })}
                    placeholder="VAT123456789"
                    className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-500/20 focus:border-accent-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Registration Number
                  </label>
                  <input
                    type="text"
                    value={formData.businessRegistrationNumber || ''}
                    onChange={(e) => setFormData({ ...formData, businessRegistrationNumber: e.target.value })}
                    placeholder="REG123456"
                    className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-500/20 focus:border-accent-500"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Address */}
          <div className="p-4 bg-gray-50 rounded-xl">
            <h4 className="text-sm font-semibold text-gray-700 mb-4">
              Business Address
            </h4>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Address Line 1
                </label>
                <input
                  type="text"
                  value={formData.businessAddressLine1 || ''}
                  onChange={(e) => setFormData({ ...formData, businessAddressLine1: e.target.value })}
                  placeholder="Street address"
                  className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-500/20 focus:border-accent-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Address Line 2
                </label>
                <input
                  type="text"
                  value={formData.businessAddressLine2 || ''}
                  onChange={(e) => setFormData({ ...formData, businessAddressLine2: e.target.value })}
                  placeholder="Suite, floor, building (optional)"
                  className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-500/20 focus:border-accent-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    City
                  </label>
                  <input
                    type="text"
                    value={formData.businessCity || ''}
                    onChange={(e) => setFormData({ ...formData, businessCity: e.target.value })}
                    placeholder="City"
                    className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-500/20 focus:border-accent-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Postal Code
                  </label>
                  <input
                    type="text"
                    value={formData.businessPostalCode || ''}
                    onChange={(e) => setFormData({ ...formData, businessPostalCode: e.target.value })}
                    placeholder="Postal code"
                    className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-500/20 focus:border-accent-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Country
                </label>
                <input
                  type="text"
                  value={formData.businessCountry || ''}
                  onChange={(e) => setFormData({ ...formData, businessCountry: e.target.value })}
                  placeholder="Country"
                  className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-500/20 focus:border-accent-500"
                />
              </div>
            </div>
          </div>

          {/* Invoice Setting */}
          <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.useBusinessDetailsOnInvoice || false}
                onChange={(e) => setFormData({ ...formData, useBusinessDetailsOnInvoice: e.target.checked })}
                className="mt-1 w-4 h-4 text-accent-600 border-gray-300 rounded focus:ring-accent-500"
              />
              <div>
                <span className="text-sm font-medium text-gray-900">
                  Use business details on invoices
                </span>
                <p className="text-xs text-gray-500 mt-0.5">
                  When enabled, invoices will display the business name and address instead of personal details
                </p>
              </div>
            </label>
          </div>
        </div>
      ) : hasBusinessDetails ? (
        /* Display Mode - With Details */
        <div className="space-y-6">
          <div className="p-4 bg-gray-50 rounded-xl">
            <h4 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
              <Building2 size={16} />
              Company Information
            </h4>
            <div className="space-y-3">
              {details.businessName && (
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Business Name
                  </label>
                  <p className="text-sm text-gray-900 mt-0.5">{details.businessName}</p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                {details.businessVatNumber && (
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                      VAT Number
                    </label>
                    <p className="text-sm text-gray-900 mt-0.5">{details.businessVatNumber}</p>
                  </div>
                )}
                {details.businessRegistrationNumber && (
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                      Registration Number
                    </label>
                    <p className="text-sm text-gray-900 mt-0.5">{details.businessRegistrationNumber}</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {(details.businessAddressLine1 || details.businessCity) && (
            <div className="p-4 bg-gray-50 rounded-xl">
              <h4 className="text-sm font-semibold text-gray-700 mb-4">
                Business Address
              </h4>
              <p className="text-sm text-gray-900">
                {[
                  details.businessAddressLine1,
                  details.businessAddressLine2,
                  details.businessCity,
                  details.businessPostalCode,
                  details.businessCountry
                ].filter(Boolean).join(', ')}
              </p>
            </div>
          )}

          {details.useBusinessDetailsOnInvoice && (
            <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-100 rounded-lg">
              <Check size={16} className="text-blue-600" />
              <span className="text-sm text-blue-700">
                Business details will be used on invoices
              </span>
            </div>
          )}
        </div>
      ) : (
        /* Empty State */
        <div className="py-12 text-center">
          <Building2 size={40} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500">No business details added</p>
          <p className="text-sm text-gray-400 mt-1">
            Add company information for invoice billing
          </p>
        </div>
      )}
    </div>
  )
}

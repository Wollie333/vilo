import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Loader2, Save, Building2, Mail, Phone, Globe, MapPin, CreditCard, Settings } from 'lucide-react'
import { adminTenants, TenantDetail, TenantUpdateData } from '../../services/adminApi'

interface FormSection {
  id: string
  title: string
  icon: React.ReactNode
}

const formSections: FormSection[] = [
  { id: 'business', title: 'Business Info', icon: <Building2 size={18} /> },
  { id: 'contact', title: 'Contact', icon: <Mail size={18} /> },
  { id: 'address', title: 'Address', icon: <MapPin size={18} /> },
  { id: 'legal', title: 'Legal', icon: <CreditCard size={18} /> },
  { id: 'settings', title: 'Settings', icon: <Settings size={18} /> },
]

export function TenantEdit() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [tenant, setTenant] = useState<TenantDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeSection, setActiveSection] = useState('business')
  const [hasChanges, setHasChanges] = useState(false)

  // Form state
  const [formData, setFormData] = useState<TenantUpdateData>({
    business_name: '',
    business_description: '',
    logo_url: '',
    business_email: '',
    business_phone: '',
    website_url: '',
    address_line1: '',
    address_line2: '',
    city: '',
    state_province: '',
    postal_code: '',
    country: '',
    vat_number: '',
    company_registration_number: '',
    currency: '',
    timezone: '',
    language: '',
    date_format: '',
    discoverable: true,
  })

  useEffect(() => {
    async function fetchTenant() {
      if (!id) return
      try {
        setLoading(true)
        const data = await adminTenants.get(id)
        setTenant(data)
        // Populate form with existing data
        setFormData({
          business_name: data.businessName || '',
          business_description: data.businessDescription || '',
          logo_url: data.logoUrl || '',
          business_email: data.businessEmail || '',
          business_phone: data.businessPhone || '',
          website_url: data.websiteUrl || '',
          address_line1: data.addressLine1 || '',
          address_line2: data.addressLine2 || '',
          city: data.city || '',
          state_province: data.stateProvince || '',
          postal_code: data.postalCode || '',
          country: data.country || '',
          vat_number: data.vatNumber || '',
          company_registration_number: data.companyRegistrationNumber || '',
          currency: data.currency || 'ZAR',
          timezone: data.timezone || 'Africa/Johannesburg',
          language: data.language || 'en',
          date_format: data.dateFormat || 'DD/MM/YYYY',
          discoverable: data.discoverable ?? true,
        })
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load tenant')
      } finally {
        setLoading(false)
      }
    }

    fetchTenant()
  }, [id])

  const handleChange = (field: keyof TenantUpdateData, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    setHasChanges(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!id) return

    try {
      setSaving(true)
      await adminTenants.update(id, formData)
      setHasChanges(false)
      navigate(`/admin/tenants/${id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save changes')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="bg-gray-50 p-8 min-h-full flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-accent-500" />
          <p className="text-gray-500">Loading tenant...</p>
        </div>
      </div>
    )
  }

  if (error || !tenant) {
    return (
      <div className="bg-gray-50 p-8 min-h-full">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center max-w-md mx-auto">
          <p className="text-red-700 mb-4">{error || 'Tenant not found'}</p>
          <button
            onClick={() => navigate('/admin/tenants')}
            className="text-accent-600 hover:text-accent-700"
          >
            Back to Tenants
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-gray-50 min-h-full">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate(`/admin/tenants/${id}`)}
                className="p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft size={20} />
              </button>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">Edit Property</h1>
                <p className="text-sm text-gray-500">{tenant.businessName || 'Unnamed Property'}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate(`/admin/tenants/${id}`)}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={saving || !hasChanges}
                className="flex items-center gap-2 px-4 py-2 bg-accent-500 text-white text-sm font-medium rounded-lg hover:bg-accent-600 disabled:opacity-50 transition-colors"
              >
                {saving ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save size={16} />
                    Save Changes
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="flex gap-8">
          {/* Sidebar Navigation */}
          <div className="w-48 shrink-0">
            <nav className="space-y-1 sticky top-28">
              {formSections.map((section) => (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                    activeSection === section.id
                      ? 'bg-accent-50 text-accent-600'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {section.icon}
                  {section.title}
                </button>
              ))}
            </nav>
          </div>

          {/* Form Content */}
          <form onSubmit={handleSubmit} className="flex-1 space-y-6">
            {/* Business Info Section */}
            {activeSection === 'business' && (
              <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-accent-50 flex items-center justify-center">
                    <Building2 size={20} className="text-accent-600" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">Business Information</h2>
                    <p className="text-sm text-gray-500">Basic details about the property</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Business Name
                    </label>
                    <input
                      type="text"
                      value={formData.business_name}
                      onChange={(e) => handleChange('business_name', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500"
                      placeholder="e.g., The Mountain Lodge"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Description
                    </label>
                    <textarea
                      value={formData.business_description}
                      onChange={(e) => handleChange('business_description', e.target.value)}
                      rows={4}
                      className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500"
                      placeholder="Describe the property..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Logo URL
                    </label>
                    <input
                      type="url"
                      value={formData.logo_url}
                      onChange={(e) => handleChange('logo_url', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500"
                      placeholder="https://..."
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Contact Section */}
            {activeSection === 'contact' && (
              <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-accent-50 flex items-center justify-center">
                    <Mail size={20} className="text-accent-600" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">Contact Information</h2>
                    <p className="text-sm text-gray-500">How guests can reach the property</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <div className="flex items-center gap-2">
                        <Mail size={14} className="text-gray-400" />
                        Email
                      </div>
                    </label>
                    <input
                      type="email"
                      value={formData.business_email}
                      onChange={(e) => handleChange('business_email', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500"
                      placeholder="contact@property.com"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <div className="flex items-center gap-2">
                        <Phone size={14} className="text-gray-400" />
                        Phone
                      </div>
                    </label>
                    <input
                      type="tel"
                      value={formData.business_phone}
                      onChange={(e) => handleChange('business_phone', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500"
                      placeholder="+27 12 345 6789"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <div className="flex items-center gap-2">
                        <Globe size={14} className="text-gray-400" />
                        Website
                      </div>
                    </label>
                    <input
                      type="url"
                      value={formData.website_url}
                      onChange={(e) => handleChange('website_url', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500"
                      placeholder="https://www.property.com"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Address Section */}
            {activeSection === 'address' && (
              <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-accent-50 flex items-center justify-center">
                    <MapPin size={20} className="text-accent-600" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">Address</h2>
                    <p className="text-sm text-gray-500">Physical location of the property</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Address Line 1
                    </label>
                    <input
                      type="text"
                      value={formData.address_line1}
                      onChange={(e) => handleChange('address_line1', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500"
                      placeholder="Street address"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Address Line 2
                    </label>
                    <input
                      type="text"
                      value={formData.address_line2}
                      onChange={(e) => handleChange('address_line2', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500"
                      placeholder="Apartment, suite, etc."
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        City
                      </label>
                      <input
                        type="text"
                        value={formData.city}
                        onChange={(e) => handleChange('city', e.target.value)}
                        className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500"
                        placeholder="City"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        State/Province
                      </label>
                      <input
                        type="text"
                        value={formData.state_province}
                        onChange={(e) => handleChange('state_province', e.target.value)}
                        className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500"
                        placeholder="State or Province"
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
                        value={formData.postal_code}
                        onChange={(e) => handleChange('postal_code', e.target.value)}
                        className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500"
                        placeholder="Postal code"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Country
                      </label>
                      <input
                        type="text"
                        value={formData.country}
                        onChange={(e) => handleChange('country', e.target.value)}
                        className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500"
                        placeholder="Country"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Legal Section */}
            {activeSection === 'legal' && (
              <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-accent-50 flex items-center justify-center">
                    <CreditCard size={20} className="text-accent-600" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">Legal Information</h2>
                    <p className="text-sm text-gray-500">Tax and company registration details</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      VAT Number
                    </label>
                    <input
                      type="text"
                      value={formData.vat_number}
                      onChange={(e) => handleChange('vat_number', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500"
                      placeholder="VAT registration number"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Company Registration Number
                    </label>
                    <input
                      type="text"
                      value={formData.company_registration_number}
                      onChange={(e) => handleChange('company_registration_number', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500"
                      placeholder="Company registration number"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Settings Section */}
            {activeSection === 'settings' && (
              <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-accent-50 flex items-center justify-center">
                    <Settings size={20} className="text-accent-600" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">Settings</h2>
                    <p className="text-sm text-gray-500">Regional and display preferences</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Currency
                      </label>
                      <select
                        value={formData.currency}
                        onChange={(e) => handleChange('currency', e.target.value)}
                        className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500 bg-white"
                      >
                        <option value="ZAR">ZAR - South African Rand</option>
                        <option value="USD">USD - US Dollar</option>
                        <option value="EUR">EUR - Euro</option>
                        <option value="GBP">GBP - British Pound</option>
                        <option value="BWP">BWP - Botswana Pula</option>
                        <option value="NAD">NAD - Namibian Dollar</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Timezone
                      </label>
                      <select
                        value={formData.timezone}
                        onChange={(e) => handleChange('timezone', e.target.value)}
                        className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500 bg-white"
                      >
                        <option value="Africa/Johannesburg">Africa/Johannesburg (GMT+2)</option>
                        <option value="Africa/Gaborone">Africa/Gaborone (GMT+2)</option>
                        <option value="Africa/Windhoek">Africa/Windhoek (GMT+2)</option>
                        <option value="Africa/Cairo">Africa/Cairo (GMT+2)</option>
                        <option value="Africa/Nairobi">Africa/Nairobi (GMT+3)</option>
                        <option value="Europe/London">Europe/London (GMT+0)</option>
                        <option value="America/New_York">America/New_York (GMT-5)</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Language
                      </label>
                      <select
                        value={formData.language}
                        onChange={(e) => handleChange('language', e.target.value)}
                        className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500 bg-white"
                      >
                        <option value="en">English</option>
                        <option value="af">Afrikaans</option>
                        <option value="zu">Zulu</option>
                        <option value="xh">Xhosa</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Date Format
                      </label>
                      <select
                        value={formData.date_format}
                        onChange={(e) => handleChange('date_format', e.target.value)}
                        className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500 bg-white"
                      >
                        <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                        <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                        <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                      </select>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-gray-100">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.discoverable}
                        onChange={(e) => handleChange('discoverable', e.target.checked)}
                        className="w-5 h-5 rounded border-gray-300 text-accent-500 focus:ring-accent-500"
                      />
                      <div>
                        <p className="text-sm font-medium text-gray-900">Discoverable</p>
                        <p className="text-xs text-gray-500">Allow this property to appear in public search results</p>
                      </div>
                    </label>
                  </div>
                </div>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  )
}

import { useState, useEffect } from 'react'
import { Loader2, Settings, Zap, BarChart3, Mail, Shield } from 'lucide-react'
import Card from '../../components/Card'
import { adminSettings, PlatformSettings } from '../../services/adminApi'

type SettingsSection = 'general' | 'automation' | 'limits' | 'email' | 'security'

export function AdminSettings() {
  const [settings, setSettings] = useState<PlatformSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [activeSection, setActiveSection] = useState<SettingsSection>('general')

  const [formData, setFormData] = useState({
    // General
    platformName: '',
    supportEmail: '',
    defaultCurrency: 'USD',
    defaultTimezone: 'UTC',
    maintenanceMode: false,

    // Automation
    trialDays: 14,
    gracePeriodDays: 7,
    paymentRetryDays: '1,3,7',
    autoSuspendOnFailedPayment: true,

    // Limits
    defaultRoomLimit: 10,
    defaultMemberLimit: 5,
    defaultBookingLimit: 100,
    maxFileUploadSize: 10,

    // Email
    emailFromName: '',
    emailFromAddress: '',
    enableEmailNotifications: true,

    // Security
    sessionTimeout: 24,
    maxLoginAttempts: 5,
    requireMfa: false,
    allowedDomains: '',
  })

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    try {
      setLoading(true)
      const data = await adminSettings.get()
      setSettings(data)
      setFormData({
        platformName: data.platformName || '',
        supportEmail: data.supportEmail || '',
        defaultCurrency: data.defaultCurrency || 'USD',
        defaultTimezone: data.defaultTimezone || 'UTC',
        maintenanceMode: data.maintenanceMode || false,
        trialDays: data.trialDays || 14,
        gracePeriodDays: data.gracePeriodDays || 7,
        paymentRetryDays: data.paymentRetryDays || '1,3,7',
        autoSuspendOnFailedPayment: data.autoSuspendOnFailedPayment ?? true,
        defaultRoomLimit: data.defaultRoomLimit || 10,
        defaultMemberLimit: data.defaultMemberLimit || 5,
        defaultBookingLimit: data.defaultBookingLimit || 100,
        maxFileUploadSize: data.maxFileUploadSize || 10,
        emailFromName: data.emailFromName || '',
        emailFromAddress: data.emailFromAddress || '',
        enableEmailNotifications: data.enableEmailNotifications ?? true,
        sessionTimeout: data.sessionTimeout || 24,
        maxLoginAttempts: data.maxLoginAttempts || 5,
        requireMfa: data.requireMfa || false,
        allowedDomains: data.allowedDomains || '',
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load settings')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      setError(null)
      setSuccess(null)
      await adminSettings.update(formData)
      setSuccess('Settings saved successfully')
      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  const sections: { id: SettingsSection; label: string; icon: React.ReactNode }[] = [
    { id: 'general', label: 'General', icon: <Settings size={18} /> },
    { id: 'automation', label: 'Automation', icon: <Zap size={18} /> },
    { id: 'limits', label: 'Limits', icon: <BarChart3 size={18} /> },
    { id: 'email', label: 'Email', icon: <Mail size={18} /> },
    { id: 'security', label: 'Security', icon: <Shield size={18} /> },
  ]

  if (loading) {
    return (
      <div className="bg-gray-50 p-8 min-h-full flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-accent-500" />
          <p className="text-gray-500">Loading settings...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-gray-50 p-8 min-h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Platform Settings</h1>
          <p className="text-gray-500">Configure system-wide settings and defaults</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-2 bg-accent-500 text-white rounded-lg hover:bg-accent-600 disabled:opacity-50 flex items-center gap-2"
        >
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Saving...
            </>
          ) : (
            'Save Changes'
          )}
        </button>
      </div>

      {/* Messages */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 mb-6">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-green-700 mb-6">
          {success}
        </div>
      )}

      <div className="flex gap-6">
        {/* Sidebar */}
        <div className="w-48 flex-shrink-0">
          <nav className="space-y-1">
            {sections.map((section) => (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors ${
                  activeSection === section.id
                    ? 'bg-white text-gray-900 shadow-sm border border-gray-200'
                    : 'text-gray-500 hover:text-gray-900 hover:bg-white/50'
                }`}
              >
                {section.icon}
                <span className="text-sm font-medium">{section.label}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <Card className="flex-1">
          {/* General Settings */}
          {activeSection === 'general' && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold text-gray-900">General Settings</h2>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Platform Name</label>
                  <input
                    type="text"
                    value={formData.platformName}
                    onChange={(e) => setFormData({ ...formData, platformName: e.target.value })}
                    className="w-full bg-white border border-gray-200 rounded-lg px-4 py-2 text-gray-900 focus:outline-none focus:border-accent-500"
                    placeholder="Vilo"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Support Email</label>
                  <input
                    type="email"
                    value={formData.supportEmail}
                    onChange={(e) => setFormData({ ...formData, supportEmail: e.target.value })}
                    className="w-full bg-white border border-gray-200 rounded-lg px-4 py-2 text-gray-900 focus:outline-none focus:border-accent-500"
                    placeholder="support@example.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Default Currency</label>
                  <select
                    value={formData.defaultCurrency}
                    onChange={(e) => setFormData({ ...formData, defaultCurrency: e.target.value })}
                    className="w-full bg-white border border-gray-200 rounded-lg px-4 py-2 text-gray-900 focus:outline-none focus:border-accent-500"
                  >
                    <option value="USD">USD - US Dollar</option>
                    <option value="EUR">EUR - Euro</option>
                    <option value="GBP">GBP - British Pound</option>
                    <option value="ZAR">ZAR - South African Rand</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Default Timezone</label>
                  <select
                    value={formData.defaultTimezone}
                    onChange={(e) => setFormData({ ...formData, defaultTimezone: e.target.value })}
                    className="w-full bg-white border border-gray-200 rounded-lg px-4 py-2 text-gray-900 focus:outline-none focus:border-accent-500"
                  >
                    <option value="UTC">UTC</option>
                    <option value="Africa/Johannesburg">Africa/Johannesburg</option>
                    <option value="Europe/London">Europe/London</option>
                    <option value="America/New_York">America/New York</option>
                    <option value="America/Los_Angeles">America/Los Angeles</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-3 pt-4 border-t border-gray-100">
                <button
                  onClick={() => setFormData({ ...formData, maintenanceMode: !formData.maintenanceMode })}
                  className={`relative w-12 h-6 rounded-full transition-colors ${
                    formData.maintenanceMode ? 'bg-yellow-500' : 'bg-gray-300'
                  }`}
                >
                  <div
                    className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                      formData.maintenanceMode ? 'translate-x-7' : 'translate-x-1'
                    }`}
                  />
                </button>
                <div>
                  <p className="text-gray-900 font-medium">Maintenance Mode</p>
                  <p className="text-sm text-gray-500">Show maintenance page to all users</p>
                </div>
              </div>
            </div>
          )}

          {/* Automation Settings */}
          {activeSection === 'automation' && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold text-gray-900">Automation Settings</h2>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Trial Period (days)</label>
                  <input
                    type="number"
                    value={formData.trialDays}
                    onChange={(e) => setFormData({ ...formData, trialDays: parseInt(e.target.value) || 0 })}
                    className="w-full bg-white border border-gray-200 rounded-lg px-4 py-2 text-gray-900 focus:outline-none focus:border-accent-500"
                    min="0"
                    max="90"
                  />
                  <p className="text-xs text-gray-400 mt-1">Default trial period for new subscriptions</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Grace Period (days)</label>
                  <input
                    type="number"
                    value={formData.gracePeriodDays}
                    onChange={(e) => setFormData({ ...formData, gracePeriodDays: parseInt(e.target.value) || 0 })}
                    className="w-full bg-white border border-gray-200 rounded-lg px-4 py-2 text-gray-900 focus:outline-none focus:border-accent-500"
                    min="0"
                    max="30"
                  />
                  <p className="text-xs text-gray-400 mt-1">Days before suspension after failed payment</p>
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Payment Retry Schedule</label>
                  <input
                    type="text"
                    value={formData.paymentRetryDays}
                    onChange={(e) => setFormData({ ...formData, paymentRetryDays: e.target.value })}
                    className="w-full bg-white border border-gray-200 rounded-lg px-4 py-2 text-gray-900 focus:outline-none focus:border-accent-500"
                    placeholder="1,3,7"
                  />
                  <p className="text-xs text-gray-400 mt-1">Comma-separated days to retry failed payments (e.g., 1,3,7)</p>
                </div>
              </div>

              <div className="flex items-center gap-3 pt-4 border-t border-gray-100">
                <button
                  onClick={() => setFormData({ ...formData, autoSuspendOnFailedPayment: !formData.autoSuspendOnFailedPayment })}
                  className={`relative w-12 h-6 rounded-full transition-colors ${
                    formData.autoSuspendOnFailedPayment ? 'bg-green-500' : 'bg-gray-300'
                  }`}
                >
                  <div
                    className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                      formData.autoSuspendOnFailedPayment ? 'translate-x-7' : 'translate-x-1'
                    }`}
                  />
                </button>
                <div>
                  <p className="text-gray-900 font-medium">Auto-suspend on Failed Payment</p>
                  <p className="text-sm text-gray-500">Automatically suspend tenants after grace period expires</p>
                </div>
              </div>
            </div>
          )}

          {/* Limits Settings */}
          {activeSection === 'limits' && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold text-gray-900">Default Limits</h2>
              <p className="text-sm text-gray-500">These limits apply to new tenants unless overridden by their plan.</p>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Room Limit</label>
                  <input
                    type="number"
                    value={formData.defaultRoomLimit}
                    onChange={(e) => setFormData({ ...formData, defaultRoomLimit: parseInt(e.target.value) || 0 })}
                    className="w-full bg-white border border-gray-200 rounded-lg px-4 py-2 text-gray-900 focus:outline-none focus:border-accent-500"
                    min="1"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Team Member Limit</label>
                  <input
                    type="number"
                    value={formData.defaultMemberLimit}
                    onChange={(e) => setFormData({ ...formData, defaultMemberLimit: parseInt(e.target.value) || 0 })}
                    className="w-full bg-white border border-gray-200 rounded-lg px-4 py-2 text-gray-900 focus:outline-none focus:border-accent-500"
                    min="1"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Monthly Booking Limit</label>
                  <input
                    type="number"
                    value={formData.defaultBookingLimit}
                    onChange={(e) => setFormData({ ...formData, defaultBookingLimit: parseInt(e.target.value) || 0 })}
                    className="w-full bg-white border border-gray-200 rounded-lg px-4 py-2 text-gray-900 focus:outline-none focus:border-accent-500"
                    min="1"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Max File Upload Size (MB)</label>
                  <input
                    type="number"
                    value={formData.maxFileUploadSize}
                    onChange={(e) => setFormData({ ...formData, maxFileUploadSize: parseInt(e.target.value) || 0 })}
                    className="w-full bg-white border border-gray-200 rounded-lg px-4 py-2 text-gray-900 focus:outline-none focus:border-accent-500"
                    min="1"
                    max="100"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Email Settings */}
          {activeSection === 'email' && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold text-gray-900">Email Settings</h2>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">From Name</label>
                  <input
                    type="text"
                    value={formData.emailFromName}
                    onChange={(e) => setFormData({ ...formData, emailFromName: e.target.value })}
                    className="w-full bg-white border border-gray-200 rounded-lg px-4 py-2 text-gray-900 focus:outline-none focus:border-accent-500"
                    placeholder="Vilo Support"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">From Address</label>
                  <input
                    type="email"
                    value={formData.emailFromAddress}
                    onChange={(e) => setFormData({ ...formData, emailFromAddress: e.target.value })}
                    className="w-full bg-white border border-gray-200 rounded-lg px-4 py-2 text-gray-900 focus:outline-none focus:border-accent-500"
                    placeholder="noreply@example.com"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 pt-4 border-t border-gray-100">
                <button
                  onClick={() => setFormData({ ...formData, enableEmailNotifications: !formData.enableEmailNotifications })}
                  className={`relative w-12 h-6 rounded-full transition-colors ${
                    formData.enableEmailNotifications ? 'bg-green-500' : 'bg-gray-300'
                  }`}
                >
                  <div
                    className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                      formData.enableEmailNotifications ? 'translate-x-7' : 'translate-x-1'
                    }`}
                  />
                </button>
                <div>
                  <p className="text-gray-900 font-medium">Enable Email Notifications</p>
                  <p className="text-sm text-gray-500">Send transactional emails to users</p>
                </div>
              </div>
            </div>
          )}

          {/* Security Settings */}
          {activeSection === 'security' && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold text-gray-900">Security Settings</h2>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Session Timeout (hours)</label>
                  <input
                    type="number"
                    value={formData.sessionTimeout}
                    onChange={(e) => setFormData({ ...formData, sessionTimeout: parseInt(e.target.value) || 0 })}
                    className="w-full bg-white border border-gray-200 rounded-lg px-4 py-2 text-gray-900 focus:outline-none focus:border-accent-500"
                    min="1"
                    max="168"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Max Login Attempts</label>
                  <input
                    type="number"
                    value={formData.maxLoginAttempts}
                    onChange={(e) => setFormData({ ...formData, maxLoginAttempts: parseInt(e.target.value) || 0 })}
                    className="w-full bg-white border border-gray-200 rounded-lg px-4 py-2 text-gray-900 focus:outline-none focus:border-accent-500"
                    min="3"
                    max="10"
                  />
                  <p className="text-xs text-gray-400 mt-1">Lock account after this many failed attempts</p>
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Allowed Domains (optional)</label>
                  <input
                    type="text"
                    value={formData.allowedDomains}
                    onChange={(e) => setFormData({ ...formData, allowedDomains: e.target.value })}
                    className="w-full bg-white border border-gray-200 rounded-lg px-4 py-2 text-gray-900 focus:outline-none focus:border-accent-500"
                    placeholder="example.com, company.org"
                  />
                  <p className="text-xs text-gray-400 mt-1">Comma-separated list of allowed email domains for sign-ups (leave empty for all)</p>
                </div>
              </div>

              <div className="flex items-center gap-3 pt-4 border-t border-gray-100">
                <button
                  onClick={() => setFormData({ ...formData, requireMfa: !formData.requireMfa })}
                  className={`relative w-12 h-6 rounded-full transition-colors ${
                    formData.requireMfa ? 'bg-green-500' : 'bg-gray-300'
                  }`}
                >
                  <div
                    className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                      formData.requireMfa ? 'translate-x-7' : 'translate-x-1'
                    }`}
                  />
                </button>
                <div>
                  <p className="text-gray-900 font-medium">Require MFA for Admins</p>
                  <p className="text-sm text-gray-500">Force multi-factor authentication for all admin accounts</p>
                </div>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}

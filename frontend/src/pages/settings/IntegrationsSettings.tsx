import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  Plus,
  Settings,
  RefreshCw,
  X,
  AlertCircle,
  Loader2,
  Clock,
  Calendar,
  Star,
  Trash2,
  ChevronRight,
  Wifi,
  WifiOff
} from 'lucide-react'
import Button from '../../components/Button'
import ConfirmModal from '../../components/ConfirmModal'
import {
  integrationsApi,
  Integration,
  Platform,
  PLATFORM_CONFIGS
} from '../../services/api'
import { useNotification } from '../../contexts/NotificationContext'
import { useAuth } from '../../contexts/AuthContext'

export default function IntegrationsSettings() {
  const navigate = useNavigate()
  const { tenant, tenantLoading } = useAuth()
  const { showSuccess, showError } = useNotification()

  const [integrations, setIntegrations] = useState<Integration[]>([])
  const [loading, setLoading] = useState(true)
  const [addModalOpen, setAddModalOpen] = useState(false)
  const [configModalOpen, setConfigModalOpen] = useState(false)
  const [selectedIntegration, setSelectedIntegration] = useState<Integration | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; id: string | null }>({
    isOpen: false,
    id: null
  })
  const [deleting, setDeleting] = useState(false)
  const [syncing, setSyncing] = useState<string | null>(null)

  useEffect(() => {
    if (!tenantLoading && tenant) {
      loadIntegrations()
    }
  }, [tenant, tenantLoading])

  const loadIntegrations = async () => {
    try {
      setLoading(true)
      const data = await integrationsApi.getAll()
      setIntegrations(data)
    } catch (error) {
      console.error('Failed to load integrations:', error)
      showError('Error', 'Failed to load integrations')
    } finally {
      setLoading(false)
    }
  }

  const handleAddIntegration = async (platform: Platform) => {
    try {
      await integrationsApi.create({ platform })
      showSuccess('Integration Added', `${PLATFORM_CONFIGS[platform].name} integration has been added.`)
      setAddModalOpen(false)
      await loadIntegrations()
    } catch (error: any) {
      showError('Error', error.message || 'Failed to add integration')
    }
  }

  const handleDeleteConfirm = async () => {
    if (!deleteConfirm.id) return

    try {
      setDeleting(true)
      await integrationsApi.delete(deleteConfirm.id)
      showSuccess('Integration Deleted', 'The integration has been removed.')
      setDeleteConfirm({ isOpen: false, id: null })
      await loadIntegrations()
    } catch (error) {
      showError('Error', 'Failed to delete integration')
    } finally {
      setDeleting(false)
    }
  }

  const handleToggleActive = async (integration: Integration) => {
    try {
      await integrationsApi.update(integration.id, { is_active: !integration.is_active })
      showSuccess(
        integration.is_active ? 'Integration Disabled' : 'Integration Enabled',
        `${PLATFORM_CONFIGS[integration.platform].name} is now ${integration.is_active ? 'disabled' : 'active'}.`
      )
      await loadIntegrations()
    } catch (error) {
      showError('Error', 'Failed to update integration')
    }
  }

  const handleSync = async (integration: Integration) => {
    try {
      setSyncing(integration.id)
      await integrationsApi.triggerSync(integration.id, 'full')
      showSuccess('Sync Started', 'Sync has been initiated. Check back shortly for results.')
      await loadIntegrations()
    } catch (error: any) {
      showError('Error', error.message || 'Failed to start sync')
    } finally {
      setSyncing(null)
    }
  }

  const handleTestConnection = async (integration: Integration) => {
    try {
      const result = await integrationsApi.testConnection(integration.id)
      if (result.success) {
        showSuccess('Connection OK', 'Successfully connected to the platform.')
      } else {
        showError('Connection Failed', result.message)
      }
      await loadIntegrations()
    } catch (error: any) {
      showError('Error', error.message || 'Connection test failed')
    }
  }

  // Get platforms not yet added
  const availablePlatforms = Object.keys(PLATFORM_CONFIGS).filter(
    (p) => !integrations.some((i) => i.platform === p)
  ) as Platform[]

  if (loading || tenantLoading) {
    return (
      <div className="p-8 bg-gray-50 min-h-full flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-accent-500" />
          <p className="text-gray-500">Loading integrations...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8 bg-gray-50 min-h-full">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => navigate('/dashboard/settings')}
          className="flex items-center text-gray-600 hover:text-gray-900 mb-4 transition-colors"
        >
          <ArrowLeft size={18} className="mr-2" />
          Back to Settings
        </button>

        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-1">Integrations</h1>
            <p className="text-gray-500">
              Connect third-party booking platforms to sync bookings, reviews, and availability.
            </p>
          </div>
          {availablePlatforms.length > 0 && (
            <Button onClick={() => setAddModalOpen(true)}>
              <Plus size={16} className="mr-2" />
              Add Integration
            </Button>
          )}
        </div>
      </div>

      {/* Integrations List */}
      {integrations.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Settings size={32} className="text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Integrations Yet</h3>
          <p className="text-gray-500 mb-6 max-w-md mx-auto">
            Connect your booking platforms like Airbnb, Booking.com, or LekkeSlaap to sync bookings and reviews automatically.
          </p>
          <Button onClick={() => setAddModalOpen(true)}>
            <Plus size={16} className="mr-2" />
            Add Your First Integration
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {integrations.map((integration) => {
            const config = PLATFORM_CONFIGS[integration.platform]
            if (!config) return null

            return (
              <div
                key={integration.id}
                className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between">
                  {/* Platform Info */}
                  <div className="flex items-start gap-4">
                    <div
                      className="w-12 h-12 rounded-lg flex items-center justify-center text-white font-bold text-lg"
                      style={{ backgroundColor: config.color }}
                    >
                      {config.name.charAt(0)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-gray-900">{config.name}</h3>
                        {integration.is_connected ? (
                          <span className="flex items-center gap-1 text-xs font-medium text-green-700 bg-green-100 px-2 py-0.5 rounded-full">
                            <Wifi size={10} />
                            Connected
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-xs font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                            <WifiOff size={10} />
                            Not Connected
                          </span>
                        )}
                        {integration.is_active ? (
                          <span className="text-xs font-medium text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                            Active
                          </span>
                        ) : (
                          <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                            Inactive
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500">{config.description}</p>

                      {/* Sync Info */}
                      <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                        {config.supports_bookings && integration.sync_bookings && (
                          <span className="flex items-center gap-1">
                            <Calendar size={12} />
                            Bookings
                          </span>
                        )}
                        {config.supports_reviews && integration.sync_reviews && (
                          <span className="flex items-center gap-1">
                            <Star size={12} />
                            Reviews
                          </span>
                        )}
                        {integration.last_sync_at && (
                          <span className="flex items-center gap-1">
                            <Clock size={12} />
                            Last sync: {new Date(integration.last_sync_at).toLocaleDateString('en-ZA')}
                          </span>
                        )}
                      </div>

                      {integration.last_error && (
                        <p className="text-xs text-red-600 mt-2 flex items-center gap-1">
                          <AlertCircle size={12} />
                          {integration.last_error}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    {/* Active Toggle */}
                    <button
                      onClick={() => handleToggleActive(integration)}
                      className={`relative w-11 h-6 rounded-full transition-colors ${
                        integration.is_active ? 'bg-accent-500' : 'bg-gray-300'
                      }`}
                      title={integration.is_active ? 'Click to disable' : 'Click to enable'}
                    >
                      <div
                        className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                          integration.is_active ? 'translate-x-5' : 'translate-x-0.5'
                        }`}
                      />
                    </button>
                    <button
                      onClick={() => handleSync(integration)}
                      disabled={syncing === integration.id || !integration.is_active}
                      className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Sync Now"
                    >
                      {syncing === integration.id ? (
                        <Loader2 size={18} className="animate-spin" />
                      ) : (
                        <RefreshCw size={18} />
                      )}
                    </button>
                    <button
                      onClick={() => handleTestConnection(integration)}
                      className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                      title="Test Connection"
                    >
                      <Wifi size={18} />
                    </button>
                    <button
                      onClick={() => {
                        setSelectedIntegration(integration)
                        setConfigModalOpen(true)
                      }}
                      className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                      title="Configure"
                    >
                      <Settings size={18} />
                    </button>
                    <button
                      onClick={() => setDeleteConfirm({ isOpen: true, id: integration.id })}
                      className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Remove Integration"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Add Integration Modal */}
      {addModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[80vh] overflow-hidden">
            <div className="bg-gradient-to-r from-gray-900 to-gray-800 px-6 py-5">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-white">Add Integration</h3>
                <button
                  onClick={() => setAddModalOpen(false)}
                  className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            <div className="p-4 overflow-y-auto max-h-[60vh]">
              {availablePlatforms.length === 0 ? (
                <p className="text-center text-gray-500 py-8">
                  All available integrations have been added.
                </p>
              ) : (
                <div className="space-y-3">
                  {availablePlatforms.map((platform) => {
                    const config = PLATFORM_CONFIGS[platform]
                    return (
                      <button
                        key={platform}
                        onClick={() => handleAddIntegration(platform)}
                        className="w-full flex items-center gap-4 p-4 border border-gray-200 rounded-xl hover:border-gray-300 hover:bg-gray-50 transition-all text-left group"
                      >
                        <div
                          className="w-12 h-12 rounded-lg flex items-center justify-center text-white font-bold text-lg flex-shrink-0"
                          style={{ backgroundColor: config.color }}
                        >
                          {config.name.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-gray-900">{config.name}</h4>
                          <p className="text-sm text-gray-500 truncate">{config.description}</p>
                          <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                            {config.supports_bookings && <span>Bookings</span>}
                            {config.supports_reviews && <span>Reviews</span>}
                            {config.supports_availability && <span>Calendar</span>}
                          </div>
                        </div>
                        <ChevronRight size={20} className="text-gray-400 group-hover:text-gray-600" />
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Configure Integration Modal */}
      {configModalOpen && selectedIntegration && (
        <ConfigureIntegrationModal
          integration={selectedIntegration}
          onClose={() => {
            setConfigModalOpen(false)
            setSelectedIntegration(null)
          }}
          onSave={async () => {
            setConfigModalOpen(false)
            setSelectedIntegration(null)
            await loadIntegrations()
          }}
        />
      )}

      {/* Delete Confirmation */}
      <ConfirmModal
        isOpen={deleteConfirm.isOpen}
        title="Remove Integration"
        message="Are you sure you want to remove this integration? All sync settings and room mappings will be deleted."
        confirmText="Remove"
        cancelText="Cancel"
        variant="danger"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteConfirm({ isOpen: false, id: null })}
        isLoading={deleting}
      />
    </div>
  )
}

// Configure Integration Modal Component
function ConfigureIntegrationModal({
  integration,
  onClose,
  onSave
}: {
  integration: Integration
  onClose: () => void
  onSave: () => void
}) {
  const { showSuccess, showError } = useNotification()
  const config = PLATFORM_CONFIGS[integration.platform]

  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({
    display_name: integration.display_name || '',
    is_active: integration.is_active,
    sync_bookings: integration.sync_bookings,
    sync_reviews: integration.sync_reviews,
    sync_availability: integration.sync_availability,
    auto_sync_enabled: integration.auto_sync_enabled,
    sync_interval_minutes: integration.sync_interval_minutes
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      setSaving(true)
      await integrationsApi.update(integration.id, formData)
      showSuccess('Settings Saved', 'Integration settings have been updated.')
      onSave()
    } catch (error: any) {
      showError('Error', error.message || 'Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full overflow-hidden">
        <div
          className="px-6 py-5"
          style={{ background: `linear-gradient(135deg, ${config.color}, ${config.color}dd)` }}
        >
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-white">
              Configure {config.name}
            </h3>
            <button
              onClick={onClose}
              className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Display Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Display Name (Optional)
            </label>
            <input
              type="text"
              value={formData.display_name}
              onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
              placeholder={config.name}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
            />
          </div>

          {/* Toggle Options */}
          <div className="space-y-3">
            <label className="flex items-center justify-between">
              <span className="text-sm text-gray-700">Integration Active</span>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, is_active: !formData.is_active })}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  formData.is_active ? 'bg-emerald-600' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    formData.is_active ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </label>

            {config.supports_bookings && (
              <label className="flex items-center justify-between">
                <span className="text-sm text-gray-700">Sync Bookings</span>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, sync_bookings: !formData.sync_bookings })}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    formData.sync_bookings ? 'bg-emerald-600' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      formData.sync_bookings ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </label>
            )}

            {config.supports_reviews && (
              <label className="flex items-center justify-between">
                <span className="text-sm text-gray-700">Sync Reviews</span>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, sync_reviews: !formData.sync_reviews })}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    formData.sync_reviews ? 'bg-emerald-600' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      formData.sync_reviews ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </label>
            )}

            {config.supports_availability && (
              <label className="flex items-center justify-between">
                <span className="text-sm text-gray-700">Sync Availability</span>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, sync_availability: !formData.sync_availability })}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    formData.sync_availability ? 'bg-emerald-600' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      formData.sync_availability ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </label>
            )}

            <label className="flex items-center justify-between">
              <span className="text-sm text-gray-700">Auto Sync</span>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, auto_sync_enabled: !formData.auto_sync_enabled })}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  formData.auto_sync_enabled ? 'bg-emerald-600' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    formData.auto_sync_enabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </label>
          </div>

          {/* Sync Interval */}
          {formData.auto_sync_enabled && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Sync Interval (minutes)
              </label>
              <select
                value={formData.sync_interval_minutes}
                onChange={(e) => setFormData({ ...formData, sync_interval_minutes: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
              >
                <option value={15}>Every 15 minutes</option>
                <option value={30}>Every 30 minutes</option>
                <option value={60}>Every hour</option>
                <option value={180}>Every 3 hours</option>
                <option value={360}>Every 6 hours</option>
                <option value={720}>Every 12 hours</option>
                <option value={1440}>Daily</option>
              </select>
            </div>
          )}

          {/* Setup Instructions */}
          <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-600">
            <p className="font-medium text-gray-700 mb-1">Setup Instructions:</p>
            <p>{config.setup_instructions}</p>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {saving ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Settings'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

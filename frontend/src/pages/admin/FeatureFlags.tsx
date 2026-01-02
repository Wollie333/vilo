import { useState, useEffect } from 'react'
import { Loader2, Plus, X } from 'lucide-react'
import Card from '../../components/Card'
import { adminFeatureFlags, FeatureFlag } from '../../services/adminApi'

const targetingLabels: Record<string, string> = {
  all: 'All Users',
  percentage: 'Percentage Rollout',
  tenants: 'Specific Tenants',
  plans: 'Specific Plans',
}

export function FeatureFlags() {
  const [flags, setFlags] = useState<FeatureFlag[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingFlag, setEditingFlag] = useState<FeatureFlag | null>(null)
  const [saving, setSaving] = useState(false)

  const [formData, setFormData] = useState({
    key: '',
    name: '',
    description: '',
    enabled: false,
    targeting: 'all' as 'all' | 'percentage' | 'tenants' | 'plans',
    percentage: 50,
  })

  const fetchFlags = async () => {
    try {
      setLoading(true)
      const data = await adminFeatureFlags.list()
      setFlags(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load feature flags')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchFlags()
  }, [])

  const handleCreate = async () => {
    try {
      setSaving(true)
      await adminFeatureFlags.create({
        key: formData.key,
        name: formData.name,
        description: formData.description,
        enabled: formData.enabled,
        targeting: formData.targeting,
        percentage: formData.targeting === 'percentage' ? formData.percentage : undefined,
      })
      setShowCreateModal(false)
      resetForm()
      fetchFlags()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to create flag')
    } finally {
      setSaving(false)
    }
  }

  const handleUpdate = async () => {
    if (!editingFlag) return
    try {
      setSaving(true)
      await adminFeatureFlags.update(editingFlag.key, {
        name: formData.name,
        description: formData.description,
        enabled: formData.enabled,
        targeting: formData.targeting,
        percentage: formData.targeting === 'percentage' ? formData.percentage : undefined,
      })
      setEditingFlag(null)
      resetForm()
      fetchFlags()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update flag')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (key: string) => {
    if (!confirm('Are you sure you want to delete this feature flag?')) return
    try {
      await adminFeatureFlags.delete(key)
      fetchFlags()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete flag')
    }
  }

  const handleToggle = async (flag: FeatureFlag) => {
    try {
      await adminFeatureFlags.update(flag.key, { enabled: !flag.enabled })
      setFlags(flags.map(f => f.key === flag.key ? { ...f, enabled: !f.enabled } : f))
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to toggle flag')
    }
  }

  const resetForm = () => {
    setFormData({
      key: '',
      name: '',
      description: '',
      enabled: false,
      targeting: 'all',
      percentage: 50,
    })
  }

  const openEdit = (flag: FeatureFlag) => {
    setFormData({
      key: flag.key,
      name: flag.name,
      description: flag.description || '',
      enabled: flag.enabled,
      targeting: flag.targeting,
      percentage: flag.percentage || 50,
    })
    setEditingFlag(flag)
  }

  if (loading) {
    return (
      <div className="bg-gray-50 p-8 min-h-full flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-accent-500" />
          <p className="text-gray-500">Loading feature flags...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-gray-50 p-8 min-h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Feature Flags</h1>
          <p className="text-gray-500">Control feature rollouts and experiments</p>
        </div>
        <button
          onClick={() => {
            resetForm()
            setShowCreateModal(true)
          }}
          className="px-4 py-2 bg-accent-500 text-white rounded-lg hover:bg-accent-600 flex items-center gap-2"
        >
          <Plus size={20} />
          New Flag
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 mb-6">
          {error}
        </div>
      )}

      {/* Flags List */}
      <Card>
        {flags.length === 0 ? (
          <div className="p-8 text-center text-gray-400">
            No feature flags configured
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {flags.map((flag) => (
              <div key={flag.key} className="p-4 hover:bg-gray-50">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => handleToggle(flag)}
                        className={`relative w-12 h-6 rounded-full transition-colors ${
                          flag.enabled ? 'bg-green-500' : 'bg-gray-300'
                        }`}
                      >
                        <div
                          className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                            flag.enabled ? 'translate-x-7' : 'translate-x-1'
                          }`}
                        />
                      </button>
                      <div>
                        <p className="text-gray-900 font-medium">{flag.name}</p>
                        <p className="text-sm text-gray-500 font-mono">{flag.key}</p>
                      </div>
                    </div>
                    {flag.description && (
                      <p className="text-sm text-gray-500 mt-2 ml-15">{flag.description}</p>
                    )}
                    <div className="flex items-center gap-4 mt-2 ml-15">
                      <span className="text-xs text-gray-400">
                        Targeting: {targetingLabels[flag.targeting]}
                        {flag.targeting === 'percentage' && ` (${flag.percentage}%)`}
                      </span>
                      <span className="text-xs text-gray-400">
                        Updated: {new Date(flag.updatedAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => openEdit(flag)}
                      className="text-accent-600 hover:text-accent-700 text-sm"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(flag.key)}
                      className="text-red-600 hover:text-red-700 text-sm"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Create/Edit Modal */}
      {(showCreateModal || editingFlag) && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-lg w-full shadow-xl">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">
                {editingFlag ? 'Edit Feature Flag' : 'Create Feature Flag'}
              </h3>
              <button
                onClick={() => {
                  setShowCreateModal(false)
                  setEditingFlag(null)
                  resetForm()
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={24} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              {!editingFlag && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Key</label>
                  <input
                    type="text"
                    value={formData.key}
                    onChange={(e) => setFormData({ ...formData, key: e.target.value.toLowerCase().replace(/\s+/g, '_') })}
                    placeholder="feature_key"
                    className="w-full bg-white border border-gray-200 rounded-lg px-4 py-2 text-gray-900 font-mono focus:outline-none focus:border-accent-500"
                  />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Feature Name"
                  className="w-full bg-white border border-gray-200 rounded-lg px-4 py-2 text-gray-900 focus:outline-none focus:border-accent-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={2}
                  className="w-full bg-white border border-gray-200 rounded-lg px-4 py-2 text-gray-900 focus:outline-none focus:border-accent-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Targeting</label>
                <select
                  value={formData.targeting}
                  onChange={(e) => setFormData({ ...formData, targeting: e.target.value as any })}
                  className="w-full bg-white border border-gray-200 rounded-lg px-4 py-2 text-gray-900 focus:outline-none focus:border-accent-500"
                >
                  <option value="all">All Users</option>
                  <option value="percentage">Percentage Rollout</option>
                  <option value="tenants">Specific Tenants</option>
                  <option value="plans">Specific Plans</option>
                </select>
              </div>
              {formData.targeting === 'percentage' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Percentage: {formData.percentage}%
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={formData.percentage}
                    onChange={(e) => setFormData({ ...formData, percentage: parseInt(e.target.value) })}
                    className="w-full accent-accent-500"
                  />
                </div>
              )}
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setFormData({ ...formData, enabled: !formData.enabled })}
                  className={`relative w-12 h-6 rounded-full transition-colors ${
                    formData.enabled ? 'bg-green-500' : 'bg-gray-300'
                  }`}
                >
                  <div
                    className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                      formData.enabled ? 'translate-x-7' : 'translate-x-1'
                    }`}
                  />
                </button>
                <span className="text-gray-700">Enabled</span>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowCreateModal(false)
                  setEditingFlag(null)
                  resetForm()
                }}
                className="px-4 py-2 text-gray-500 hover:text-gray-900"
              >
                Cancel
              </button>
              <button
                onClick={editingFlag ? handleUpdate : handleCreate}
                disabled={saving || !formData.name || (!editingFlag && !formData.key)}
                className="px-4 py-2 bg-accent-500 text-white rounded-lg hover:bg-accent-600 disabled:opacity-50"
              >
                {saving ? 'Saving...' : editingFlag ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

import { useState, useEffect } from 'react'
import { Loader2, Plus, X } from 'lucide-react'
import Card from '../../components/Card'
import { adminAnnouncements, Announcement } from '../../services/adminApi'

const typeColors: Record<string, string> = {
  banner: 'bg-blue-100 text-blue-700',
  changelog: 'bg-green-100 text-green-700',
  maintenance: 'bg-yellow-100 text-yellow-700',
}

const statusColors: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-600',
  scheduled: 'bg-purple-100 text-purple-700',
  active: 'bg-green-100 text-green-700',
  expired: 'bg-red-100 text-red-700',
}

export function AnnouncementManager() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null)
  const [saving, setSaving] = useState(false)

  const [formData, setFormData] = useState({
    type: 'banner' as 'banner' | 'changelog' | 'maintenance',
    title: '',
    content: '',
    status: 'draft' as 'draft' | 'scheduled' | 'active' | 'expired',
    targetAudience: 'all' as 'all' | 'tenants' | 'plans',
    startsAt: '',
    endsAt: '',
    dismissible: true,
  })

  const fetchAnnouncements = async () => {
    try {
      setLoading(true)
      const data = await adminAnnouncements.list()
      setAnnouncements(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load announcements')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAnnouncements()
  }, [])

  const handleCreate = async () => {
    try {
      setSaving(true)
      await adminAnnouncements.create({
        type: formData.type,
        title: formData.title,
        content: formData.content,
        status: formData.status,
        targetAudience: formData.targetAudience,
        startsAt: formData.startsAt || new Date().toISOString(),
        endsAt: formData.endsAt || undefined,
        dismissible: formData.dismissible,
      })
      setShowCreateModal(false)
      resetForm()
      fetchAnnouncements()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to create announcement')
    } finally {
      setSaving(false)
    }
  }

  const handleUpdate = async () => {
    if (!editingAnnouncement) return
    try {
      setSaving(true)
      await adminAnnouncements.update(editingAnnouncement.id, {
        title: formData.title,
        content: formData.content,
        status: formData.status,
        targetAudience: formData.targetAudience,
        startsAt: formData.startsAt,
        endsAt: formData.endsAt || undefined,
        dismissible: formData.dismissible,
      })
      setEditingAnnouncement(null)
      resetForm()
      fetchAnnouncements()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update announcement')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this announcement?')) return
    try {
      await adminAnnouncements.delete(id)
      fetchAnnouncements()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete announcement')
    }
  }

  const resetForm = () => {
    setFormData({
      type: 'banner',
      title: '',
      content: '',
      status: 'draft',
      targetAudience: 'all',
      startsAt: '',
      endsAt: '',
      dismissible: true,
    })
  }

  const openEdit = (announcement: Announcement) => {
    setFormData({
      type: announcement.type,
      title: announcement.title,
      content: announcement.content,
      status: announcement.status,
      targetAudience: announcement.targetAudience,
      startsAt: announcement.startsAt.slice(0, 16),
      endsAt: announcement.endsAt?.slice(0, 16) || '',
      dismissible: announcement.dismissible,
    })
    setEditingAnnouncement(announcement)
  }

  if (loading) {
    return (
      <div className="bg-gray-50 p-8 min-h-full flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-accent-500" />
          <p className="text-gray-500">Loading announcements...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-gray-50 p-8 min-h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Announcements</h1>
          <p className="text-gray-500">Manage banners, changelogs, and maintenance notices</p>
        </div>
        <button
          onClick={() => {
            resetForm()
            setShowCreateModal(true)
          }}
          className="px-4 py-2 bg-accent-500 text-white rounded-lg hover:bg-accent-600 flex items-center gap-2"
        >
          <Plus size={20} />
          New Announcement
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 mb-6">
          {error}
        </div>
      )}

      {/* Announcements List */}
      <Card>
        {announcements.length === 0 ? (
          <div className="p-8 text-center text-gray-400">
            No announcements created
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {announcements.map((announcement) => (
              <div key={announcement.id} className="p-4 hover:bg-gray-50">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`px-2 py-1 text-xs rounded-full capitalize ${typeColors[announcement.type]}`}>
                        {announcement.type}
                      </span>
                      <span className={`px-2 py-1 text-xs rounded-full capitalize ${statusColors[announcement.status]}`}>
                        {announcement.status}
                      </span>
                    </div>
                    <p className="text-gray-900 font-medium">{announcement.title}</p>
                    <p className="text-sm text-gray-500 mt-1 line-clamp-2">{announcement.content}</p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                      <span>Starts: {new Date(announcement.startsAt).toLocaleString()}</span>
                      {announcement.endsAt && (
                        <span>Ends: {new Date(announcement.endsAt).toLocaleString()}</span>
                      )}
                      <span>Audience: {announcement.targetAudience}</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => openEdit(announcement)}
                      className="text-accent-600 hover:text-accent-700 text-sm"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(announcement.id)}
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
      {(showCreateModal || editingAnnouncement) && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-xl">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">
                {editingAnnouncement ? 'Edit Announcement' : 'Create Announcement'}
              </h3>
              <button
                onClick={() => {
                  setShowCreateModal(false)
                  setEditingAnnouncement(null)
                  resetForm()
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={24} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                  className="w-full bg-white border border-gray-200 rounded-lg px-4 py-2 text-gray-900 focus:outline-none focus:border-accent-500"
                  disabled={!!editingAnnouncement}
                >
                  <option value="banner">Banner</option>
                  <option value="changelog">Changelog</option>
                  <option value="maintenance">Maintenance</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full bg-white border border-gray-200 rounded-lg px-4 py-2 text-gray-900 focus:outline-none focus:border-accent-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Content</label>
                <textarea
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  rows={4}
                  className="w-full bg-white border border-gray-200 rounded-lg px-4 py-2 text-gray-900 focus:outline-none focus:border-accent-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                    className="w-full bg-white border border-gray-200 rounded-lg px-4 py-2 text-gray-900 focus:outline-none focus:border-accent-500"
                  >
                    <option value="draft">Draft</option>
                    <option value="scheduled">Scheduled</option>
                    <option value="active">Active</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Target Audience</label>
                  <select
                    value={formData.targetAudience}
                    onChange={(e) => setFormData({ ...formData, targetAudience: e.target.value as any })}
                    className="w-full bg-white border border-gray-200 rounded-lg px-4 py-2 text-gray-900 focus:outline-none focus:border-accent-500"
                  >
                    <option value="all">All Users</option>
                    <option value="tenants">Specific Tenants</option>
                    <option value="plans">Specific Plans</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Starts At</label>
                  <input
                    type="datetime-local"
                    value={formData.startsAt}
                    onChange={(e) => setFormData({ ...formData, startsAt: e.target.value })}
                    className="w-full bg-white border border-gray-200 rounded-lg px-4 py-2 text-gray-900 focus:outline-none focus:border-accent-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ends At (optional)</label>
                  <input
                    type="datetime-local"
                    value={formData.endsAt}
                    onChange={(e) => setFormData({ ...formData, endsAt: e.target.value })}
                    className="w-full bg-white border border-gray-200 rounded-lg px-4 py-2 text-gray-900 focus:outline-none focus:border-accent-500"
                  />
                </div>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="dismissible"
                  checked={formData.dismissible}
                  onChange={(e) => setFormData({ ...formData, dismissible: e.target.checked })}
                  className="w-4 h-4 text-accent-500 rounded border-gray-300 focus:ring-accent-500"
                />
                <label htmlFor="dismissible" className="text-gray-700">Allow users to dismiss</label>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowCreateModal(false)
                  setEditingAnnouncement(null)
                  resetForm()
                }}
                className="px-4 py-2 text-gray-500 hover:text-gray-900"
              >
                Cancel
              </button>
              <button
                onClick={editingAnnouncement ? handleUpdate : handleCreate}
                disabled={saving || !formData.title || !formData.content}
                className="px-4 py-2 bg-accent-500 text-white rounded-lg hover:bg-accent-600 disabled:opacity-50"
              >
                {saving ? 'Saving...' : editingAnnouncement ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

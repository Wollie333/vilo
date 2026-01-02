import { useState, useEffect, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { Users, Search, Filter, Pause, Play, Trash2, Loader2, AlertTriangle, Plus, X, Camera, Phone } from 'lucide-react'
import type { TenantMember } from '../types'
import { adminTenants } from '../../../../services/adminApi'

interface TeamMembersSectionProps {
  members: TenantMember[]
  onMemberUpdate?: () => void
}

interface Role {
  id: string
  name: string
  slug: string
}

const statusColors: Record<string, string> = {
  active: 'bg-green-100 text-green-700',
  invited: 'bg-blue-100 text-blue-700',
  pending: 'bg-amber-100 text-amber-700',
  suspended: 'bg-orange-100 text-orange-700',
  removed: 'bg-red-100 text-red-700',
}

const roleColors: Record<string, string> = {
  owner: 'bg-purple-100 text-purple-700',
  general_manager: 'bg-accent-100 text-accent-700',
  accountant: 'bg-blue-100 text-blue-700',
}

export default function TeamMembersSection({ members, onMemberUpdate }: TeamMembersSectionProps) {
  const { id: tenantId } = useParams<{ id: string }>()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<TenantMember | null>(null)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Add member modal state
  const [showAddModal, setShowAddModal] = useState(false)
  const [roles, setRoles] = useState<Role[]>([])
  const [newMember, setNewMember] = useState({ email: '', name: '', phone: '', role_id: '', avatarPreview: '' })
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [addLoading, setAddLoading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Fetch roles when modal opens
  useEffect(() => {
    let cancelled = false
    if (showAddModal && tenantId) {
      setRoles([]) // Clear existing roles first
      adminTenants.getRoles(tenantId).then(({ roles: fetchedRoles }) => {
        if (!cancelled) {
          // Deduplicate by id
          const uniqueRoles = Array.from(new Map(fetchedRoles.map(r => [r.id, r])).values())
          setRoles(uniqueRoles)
          if (uniqueRoles.length > 0) {
            setNewMember(prev => ({ ...prev, role_id: prev.role_id || uniqueRoles[0].id }))
          }
        }
      }).catch(console.error)
    }
    return () => { cancelled = true }
  }, [showAddModal, tenantId])

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text })
    setTimeout(() => setMessage(null), 3000)
  }

  const handleSuspendMember = async (member: TenantMember) => {
    if (!tenantId) return

    try {
      setActionLoading(`suspend-${member.id}`)
      const newSuspendedState = member.status !== 'suspended'
      await adminTenants.suspendMember(tenantId, member.id, newSuspendedState)
      showMessage('success', newSuspendedState ? 'Member suspended' : 'Member unsuspended')
      onMemberUpdate?.()
    } catch (err) {
      showMessage('error', err instanceof Error ? err.message : 'Failed to update member')
    } finally {
      setActionLoading(null)
    }
  }

  const handleDeleteMember = async () => {
    if (!tenantId || !deleteConfirm) return

    try {
      setActionLoading(`delete-${deleteConfirm.id}`)
      await adminTenants.deleteMember(tenantId, deleteConfirm.id)
      showMessage('success', 'Member removed')
      setDeleteConfirm(null)
      onMemberUpdate?.()
    } catch (err) {
      showMessage('error', err instanceof Error ? err.message : 'Failed to remove member')
    } finally {
      setActionLoading(null)
    }
  }

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        showMessage('error', 'Image must be less than 5MB')
        return
      }
      setAvatarFile(file)
      const reader = new FileReader()
      reader.onload = (e) => {
        setNewMember(prev => ({ ...prev, avatarPreview: e.target?.result as string }))
      }
      reader.readAsDataURL(file)
    }
  }

  const handleAddMember = async () => {
    if (!tenantId || !newMember.email || !newMember.name || !newMember.role_id) return

    try {
      setAddLoading(true)

      // Convert avatar file to base64 if present
      let avatarBase64: string | undefined
      if (avatarFile) {
        avatarBase64 = await new Promise<string>((resolve) => {
          const reader = new FileReader()
          reader.onload = (e) => resolve(e.target?.result as string)
          reader.readAsDataURL(avatarFile)
        })
      }

      await adminTenants.addMember(tenantId, {
        email: newMember.email,
        name: newMember.name,
        role_id: newMember.role_id,
        phone: newMember.phone || undefined,
        avatar: avatarBase64
      })
      showMessage('success', 'Team member added')
      setShowAddModal(false)
      setNewMember({ email: '', name: '', phone: '', role_id: roles[0]?.id || '', avatarPreview: '' })
      setAvatarFile(null)
      onMemberUpdate?.()
    } catch (err) {
      showMessage('error', err instanceof Error ? err.message : 'Failed to add member')
    } finally {
      setAddLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return '-'
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const getInitial = (member: TenantMember) => {
    return (member.display_name || member.email).charAt(0).toUpperCase()
  }

  const isOwner = (member: TenantMember) => member.roles?.slug === 'owner'

  const filteredMembers = members.filter(member => {
    const matchesSearch = search === '' ||
      member.email.toLowerCase().includes(search.toLowerCase()) ||
      (member.display_name && member.display_name.toLowerCase().includes(search.toLowerCase()))

    const matchesStatus = statusFilter === 'all' || member.status === statusFilter

    return matchesSearch && matchesStatus
  })

  const uniqueStatuses = [...new Set(members.map(m => m.status))]

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Team Members</h2>
          <p className="text-sm text-gray-500">{members.length} member{members.length !== 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-3 py-2 bg-accent-600 text-white rounded-lg hover:bg-accent-700 transition-colors text-sm font-medium"
        >
          <Plus size={16} />
          Add Member
        </button>
      </div>

      {/* Message */}
      {message && (
        <div className={`px-3 py-2 rounded-lg text-sm ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
          {message.text}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-accent-500"
          />
        </div>
        <div className="relative">
          <Filter size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="pl-9 pr-8 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-accent-500 appearance-none bg-white"
          >
            <option value="all">All Status</option>
            {uniqueStatuses.map(status => (
              <option key={status} value={status}>{status}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Members List */}
      {filteredMembers.length === 0 ? (
        <div className="py-12 text-center bg-gray-50 rounded-lg">
          <Users size={32} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500">
            {members.length === 0 ? 'No team members' : 'No members match your search'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredMembers.map((member) => (
            <div
              key={member.id}
              className={`flex items-center justify-between p-4 rounded-lg transition-colors ${
                member.status === 'suspended' ? 'bg-orange-50' : 'bg-gray-50 hover:bg-gray-100'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                {/* Avatar */}
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold shrink-0 ${
                  member.status === 'suspended'
                    ? 'bg-gradient-to-br from-orange-400 to-orange-600'
                    : 'bg-gradient-to-br from-accent-400 to-accent-600'
                }`}>
                  {getInitial(member)}
                </div>

                {/* Info */}
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {member.display_name || 'Unnamed User'}
                    </p>
                    <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${roleColors[member.roles?.slug] || 'bg-gray-100 text-gray-600'}`}>
                      {member.roles?.name || 'Member'}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 truncate">{member.email}</p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span className={`px-2 py-0.5 text-xs font-medium rounded-full capitalize ${statusColors[member.status] || 'bg-gray-100 text-gray-600'}`}>
                  {member.status}
                </span>
                <span className="text-xs text-gray-400 hidden sm:inline">
                  Joined {formatDate(member.created_at)}
                </span>

                {/* Action buttons - don't show for owner */}
                {!isOwner(member) && (
                  <div className="flex items-center gap-1 ml-2">
                    <button
                      onClick={() => handleSuspendMember(member)}
                      disabled={actionLoading === `suspend-${member.id}`}
                      className={`p-1.5 rounded-lg transition-colors ${
                        member.status === 'suspended'
                          ? 'bg-green-100 text-green-600 hover:bg-green-200'
                          : 'bg-orange-100 text-orange-600 hover:bg-orange-200'
                      }`}
                      title={member.status === 'suspended' ? 'Unsuspend member' : 'Suspend member'}
                    >
                      {actionLoading === `suspend-${member.id}` ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : member.status === 'suspended' ? (
                        <Play size={14} />
                      ) : (
                        <Pause size={14} />
                      )}
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(member)}
                      className="p-1.5 rounded-lg bg-red-100 text-red-600 hover:bg-red-200 transition-colors"
                      title="Remove member"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Member Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Add Team Member</h3>
              <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              {/* Profile Picture */}
              <div className="flex justify-center">
                <div className="relative">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarChange}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-20 h-20 rounded-full bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center hover:border-accent-500 hover:bg-gray-50 transition-colors overflow-hidden"
                  >
                    {newMember.avatarPreview ? (
                      <img src={newMember.avatarPreview} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <Camera size={24} className="text-gray-400" />
                    )}
                  </button>
                  {newMember.avatarPreview && (
                    <button
                      type="button"
                      onClick={() => {
                        setNewMember(prev => ({ ...prev, avatarPreview: '' }))
                        setAvatarFile(null)
                      }}
                      className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
              </div>
              <p className="text-xs text-gray-500 text-center">Click to upload profile picture</p>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                <input
                  type="text"
                  value={newMember.name}
                  onChange={(e) => setNewMember(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-accent-500"
                  placeholder="John Doe"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                <input
                  type="email"
                  value={newMember.email}
                  onChange={(e) => setNewMember(prev => ({ ...prev, email: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-accent-500"
                  placeholder="john@example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <div className="relative">
                  <Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="tel"
                    value={newMember.phone}
                    onChange={(e) => setNewMember(prev => ({ ...prev, phone: e.target.value }))}
                    className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-accent-500"
                    placeholder="+27 82 123 4567"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Role *</label>
                <select
                  value={newMember.role_id}
                  onChange={(e) => setNewMember(prev => ({ ...prev, role_id: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-accent-500"
                >
                  {roles.length === 0 ? (
                    <option value="">Loading roles...</option>
                  ) : (
                    roles.map(role => (
                      <option key={role.id} value={role.id}>{role.name}</option>
                    ))
                  )}
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  setShowAddModal(false)
                  setNewMember({ email: '', name: '', phone: '', role_id: roles[0]?.id || '', avatarPreview: '' })
                  setAvatarFile(null)
                }}
                className="px-4 py-2 text-gray-500 hover:text-gray-900"
              >
                Cancel
              </button>
              <button
                onClick={handleAddMember}
                disabled={addLoading || !newMember.email || !newMember.name || !newMember.role_id}
                className="px-4 py-2 bg-accent-600 text-white rounded-lg hover:bg-accent-700 disabled:opacity-50 flex items-center gap-2"
              >
                {addLoading && <Loader2 size={16} className="animate-spin" />}
                Add Member
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-sm w-full shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                <AlertTriangle size={20} className="text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Remove Member</h3>
                <p className="text-sm text-gray-500">This action cannot be undone</p>
              </div>
            </div>
            <p className="text-gray-600 mb-6">
              Are you sure you want to remove <strong>{deleteConfirm.display_name || deleteConfirm.email}</strong> from the team?
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 text-gray-500 hover:text-gray-900"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteMember}
                disabled={actionLoading === `delete-${deleteConfirm.id}`}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center gap-2"
              >
                {actionLoading === `delete-${deleteConfirm.id}` && <Loader2 size={16} className="animate-spin" />}
                Remove
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

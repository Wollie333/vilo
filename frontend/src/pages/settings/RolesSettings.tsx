import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Plus, Trash2, Copy, Shield, Users, Star, Loader2, ChevronDown, ChevronUp } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import {
  getRoles,
  createRole,
  updateRole,
  updateRolePermissions,
  deleteRole,
  duplicateRole,
  setDefaultRole,
  RoleWithMemberCount,
  Permission,
  RESOURCES,
  PERMISSION_LEVELS,
} from '../../services/rolesApi'

export default function RolesSettings() {
  const navigate = useNavigate()
  const { can } = useAuth()

  // State
  const [roles, setRoles] = useState<RoleWithMemberCount[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedRoleId, setExpandedRoleId] = useState<string | null>(null)

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showDuplicateModal, setShowDuplicateModal] = useState(false)
  const [selectedRole, setSelectedRole] = useState<RoleWithMemberCount | null>(null)

  // Form states
  const [newRoleName, setNewRoleName] = useState('')
  const [newRoleDescription, setNewRoleDescription] = useState('')
  const [copyFromRoleId, setCopyFromRoleId] = useState<string>('')
  const [duplicateName, setDuplicateName] = useState('')
  const [reassignRoleId, setReassignRoleId] = useState<string>('')
  const [saving, setSaving] = useState(false)

  // Check permissions
  const canManageRoles = can('settings.roles', 'full')
  const canViewRoles = can('settings.roles', 'view')

  useEffect(() => {
    if (canViewRoles) {
      fetchRoles()
    }
  }, [canViewRoles])

  const fetchRoles = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await getRoles()
      setRoles(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load roles')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateRole = async () => {
    if (!newRoleName.trim()) return

    try {
      setSaving(true)
      await createRole({
        name: newRoleName.trim(),
        description: newRoleDescription.trim() || undefined,
        copyFromRoleId: copyFromRoleId || undefined,
      })
      setShowCreateModal(false)
      setNewRoleName('')
      setNewRoleDescription('')
      setCopyFromRoleId('')
      await fetchRoles()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create role')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteRole = async () => {
    if (!selectedRole) return

    try {
      setSaving(true)
      await deleteRole(selectedRole.id, reassignRoleId || undefined)
      setShowDeleteModal(false)
      setSelectedRole(null)
      setReassignRoleId('')
      await fetchRoles()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete role')
    } finally {
      setSaving(false)
    }
  }

  const handleDuplicateRole = async () => {
    if (!selectedRole || !duplicateName.trim()) return

    try {
      setSaving(true)
      await duplicateRole(selectedRole.id, duplicateName.trim())
      setShowDuplicateModal(false)
      setSelectedRole(null)
      setDuplicateName('')
      await fetchRoles()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to duplicate role')
    } finally {
      setSaving(false)
    }
  }

  const handleSetDefault = async (roleId: string) => {
    try {
      setSaving(true)
      await setDefaultRole(roleId)
      await fetchRoles()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to set default role')
    } finally {
      setSaving(false)
    }
  }

  const handlePermissionChange = async (roleId: string, resource: string, permission: Permission) => {
    try {
      await updateRolePermissions(roleId, { [resource]: permission })
      // Update local state
      setRoles(roles.map(r =>
        r.id === roleId
          ? { ...r, permissions: { ...r.permissions, [resource]: permission } }
          : r
      ))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update permission')
    }
  }

  // Note: This function is available for inline role name editing if needed
  const _handleRoleNameChange = async (roleId: string, name: string) => {
    try {
      await updateRole(roleId, { name })
      setRoles(roles.map(r => r.id === roleId ? { ...r, name } : r))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update role name')
    }
  }
  void _handleRoleNameChange // Suppress unused warning

  if (!canViewRoles) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <Shield className="w-12 h-12 mx-auto text-gray-400 mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600">You don't have permission to view roles and permissions.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/dashboard/settings')}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Roles & Permissions</h1>
                <p className="text-sm text-gray-500 mt-1">
                  Manage team roles and configure what each role can access
                </p>
              </div>
            </div>
            {canManageRoles && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-accent-500 text-white rounded-lg hover:bg-accent-600 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Create Role
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Error message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
            <button onClick={() => setError(null)} className="ml-2 underline">Dismiss</button>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-accent-500" />
          </div>
        ) : (
          <div className="space-y-4">
            {roles.map((role) => (
              <div key={role.id} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                {/* Role Header */}
                <div
                  className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50"
                  onClick={() => setExpandedRoleId(expandedRoleId === role.id ? null : role.id)}
                >
                  <div className="flex items-center gap-4">
                    <div className={`p-2 rounded-lg ${role.is_system_role ? 'bg-purple-100' : 'bg-accent-100'}`}>
                      <Shield className={`w-5 h-5 ${role.is_system_role ? 'text-purple-600' : 'text-accent-600'}`} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-gray-900">{role.name}</h3>
                        {role.is_system_role && (
                          <span className="px-2 py-0.5 text-xs font-medium bg-purple-100 text-purple-700 rounded">
                            System
                          </span>
                        )}
                        {role.is_default && (
                          <span className="px-2 py-0.5 text-xs font-medium bg-green-100 text-green-700 rounded flex items-center gap-1">
                            <Star className="w-3 h-3" /> Default
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500">{role.description || 'No description'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1 text-sm text-gray-500">
                      <Users className="w-4 h-4" />
                      <span>{role.member_count} member{role.member_count !== 1 ? 's' : ''}</span>
                    </div>
                    {expandedRoleId === role.id ? (
                      <ChevronUp className="w-5 h-5 text-gray-400" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-gray-400" />
                    )}
                  </div>
                </div>

                {/* Expanded Content */}
                {expandedRoleId === role.id && (
                  <div className="border-t border-gray-200">
                    {/* Actions */}
                    {canManageRoles && !role.is_system_role && (
                      <div className="flex items-center gap-2 p-4 bg-gray-50 border-b border-gray-200">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setSelectedRole(role)
                            setDuplicateName(`${role.name} (Copy)`)
                            setShowDuplicateModal(true)
                          }}
                          className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
                        >
                          <Copy className="w-4 h-4" />
                          Duplicate
                        </button>
                        {!role.is_default && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleSetDefault(role.id)
                            }}
                            disabled={saving}
                            className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
                          >
                            <Star className="w-4 h-4" />
                            Set as Default
                          </button>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setSelectedRole(role)
                            setShowDeleteModal(true)
                          }}
                          className="flex items-center gap-1 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors ml-auto"
                        >
                          <Trash2 className="w-4 h-4" />
                          Delete
                        </button>
                      </div>
                    )}

                    {/* Permissions Matrix */}
                    <div className="p-4">
                      <h4 className="font-medium text-gray-900 mb-4">Permissions</h4>
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="text-left text-sm text-gray-500">
                              <th className="pb-3 pr-4 font-medium">Resource</th>
                              {PERMISSION_LEVELS.map((level) => (
                                <th key={level.value} className="pb-3 px-4 font-medium text-center w-24">
                                  {level.label}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {RESOURCES.map((resource) => (
                              <tr key={resource.key} className="border-t border-gray-100">
                                <td className="py-3 pr-4">
                                  <div className="font-medium text-gray-900">{resource.label}</div>
                                  <div className="text-xs text-gray-500">{resource.description}</div>
                                </td>
                                {PERMISSION_LEVELS.map((level) => (
                                  <td key={level.value} className="py-3 px-4 text-center">
                                    <input
                                      type="radio"
                                      name={`${role.id}-${resource.key}`}
                                      checked={role.permissions[resource.key] === level.value}
                                      disabled={!canManageRoles || role.is_system_role}
                                      onChange={() => handlePermissionChange(role.id, resource.key, level.value)}
                                      className="w-4 h-4 text-accent-500 focus:ring-accent-500 disabled:opacity-50"
                                    />
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}

            {roles.length === 0 && (
              <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
                <Shield className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No roles found</h3>
                <p className="text-gray-500 mb-4">Create your first role to get started.</p>
                {canManageRoles && (
                  <button
                    onClick={() => setShowCreateModal(true)}
                    className="px-4 py-2 bg-accent-500 text-white rounded-lg hover:bg-accent-600"
                  >
                    Create Role
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Create Role Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h2 className="text-xl font-semibold mb-4">Create New Role</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Role Name *
                </label>
                <input
                  type="text"
                  value={newRoleName}
                  onChange={(e) => setNewRoleName(e.target.value)}
                  placeholder="e.g., Front Desk"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent-500 focus:border-accent-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={newRoleDescription}
                  onChange={(e) => setNewRoleDescription(e.target.value)}
                  placeholder="Describe what this role is for..."
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent-500 focus:border-accent-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Copy permissions from
                </label>
                <select
                  value={copyFromRoleId}
                  onChange={(e) => setCopyFromRoleId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent-500 focus:border-accent-500"
                >
                  <option value="">Start with view-only permissions</option>
                  {roles.map((role) => (
                    <option key={role.id} value={role.id}>
                      {role.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  setShowCreateModal(false)
                  setNewRoleName('')
                  setNewRoleDescription('')
                  setCopyFromRoleId('')
                }}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateRole}
                disabled={!newRoleName.trim() || saving}
                className="px-4 py-2 bg-accent-500 text-white rounded-lg hover:bg-accent-600 disabled:opacity-50 flex items-center gap-2"
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                Create Role
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Role Modal */}
      {showDeleteModal && selectedRole && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h2 className="text-xl font-semibold mb-4">Delete Role</h2>
            <p className="text-gray-600 mb-4">
              Are you sure you want to delete the <strong>{selectedRole.name}</strong> role?
              {selectedRole.member_count > 0 && (
                <span className="block mt-2 text-amber-600">
                  This role has {selectedRole.member_count} member(s). Select a role to reassign them to:
                </span>
              )}
            </p>
            {selectedRole.member_count > 0 && (
              <div className="mb-4">
                <select
                  value={reassignRoleId}
                  onChange={(e) => setReassignRoleId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent-500 focus:border-accent-500"
                >
                  <option value="">Select a role...</option>
                  {roles
                    .filter((r) => r.id !== selectedRole.id && !r.is_system_role)
                    .map((role) => (
                      <option key={role.id} value={role.id}>
                        {role.name}
                      </option>
                    ))}
                </select>
              </div>
            )}
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowDeleteModal(false)
                  setSelectedRole(null)
                  setReassignRoleId('')
                }}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteRole}
                disabled={saving || (selectedRole.member_count > 0 && !reassignRoleId)}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50 flex items-center gap-2"
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                Delete Role
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Duplicate Role Modal */}
      {showDuplicateModal && selectedRole && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h2 className="text-xl font-semibold mb-4">Duplicate Role</h2>
            <p className="text-gray-600 mb-4">
              Create a copy of <strong>{selectedRole.name}</strong> with all its permissions.
            </p>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                New Role Name *
              </label>
              <input
                type="text"
                value={duplicateName}
                onChange={(e) => setDuplicateName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent-500 focus:border-accent-500"
              />
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  setShowDuplicateModal(false)
                  setSelectedRole(null)
                  setDuplicateName('')
                }}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleDuplicateRole}
                disabled={!duplicateName.trim() || saving}
                className="px-4 py-2 bg-accent-500 text-white rounded-lg hover:bg-accent-600 disabled:opacity-50 flex items-center gap-2"
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                Duplicate
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

import { useState, useEffect } from 'react'
import { Loader2, Search, Users, Mail, Key, Eye, X } from 'lucide-react'
import Table from '../../components/Table'
import { adminUsers, User } from '../../services/adminApi'

export function UserList() {
  const [users, setUsers] = useState<User[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const limit = 20

  useEffect(() => {
    async function fetchUsers() {
      try {
        setLoading(true)
        const { users, total } = await adminUsers.list({
          page,
          limit,
          search: search || undefined,
        })
        setUsers(users)
        setTotal(total)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load users')
      } finally {
        setLoading(false)
      }
    }

    fetchUsers()
  }, [page, search])

  const handleResetPassword = async (userId: string) => {
    if (!confirm('Send password reset email to this user?')) return
    try {
      setActionLoading(userId)
      await adminUsers.resetPassword(userId)
      alert('Password reset email sent')
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to reset password')
    } finally {
      setActionLoading(null)
    }
  }

  const handleVerifyEmail = async (userId: string) => {
    try {
      setActionLoading(userId)
      await adminUsers.verifyEmail(userId)
      alert('Email verified')
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to verify email')
    } finally {
      setActionLoading(null)
    }
  }

  const totalPages = Math.ceil(total / limit)

  if (loading && users.length === 0) {
    return (
      <div style={{ backgroundColor: 'var(--bg-card)' }} className="p-8 min-h-full flex items-center justify-center transition-colors">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-accent-500" />
          <p style={{ color: 'var(--text-muted)' }}>Loading users...</p>
        </div>
      </div>
    )
  }

  return (
    <div style={{ backgroundColor: 'var(--bg-card)' }} className="p-8 min-h-full transition-colors">
      {/* Header */}
      <div className="mb-8">
        <h1 style={{ color: 'var(--text-primary)' }} className="text-3xl font-bold mb-2">Users</h1>
        <p style={{ color: 'var(--text-muted)' }}>Manage users across all tenants</p>
      </div>

      {/* Search */}
      <div className="max-w-md mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: 'var(--text-muted)' }} />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
            placeholder="Search by email or name..."
            style={{
              backgroundColor: 'var(--bg-secondary)',
              borderColor: 'var(--border-color)',
              color: 'var(--text-primary)'
            }}
            className="w-full border rounded-lg pl-10 pr-4 py-2 placeholder-gray-400 focus:outline-none focus:border-accent-500"
          />
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 mb-6">
          {error}
        </div>
      )}

      {/* Table */}
      <Table>
        <Table.Header>
          <tr>
            <Table.HeaderCell>User</Table.HeaderCell>
            <Table.HeaderCell>Memberships</Table.HeaderCell>
            <Table.HeaderCell>Created</Table.HeaderCell>
            <Table.HeaderCell>Last Sign In</Table.HeaderCell>
            <Table.HeaderCell align="right">Actions</Table.HeaderCell>
          </tr>
        </Table.Header>
        <Table.Body>
          {loading ? (
            <tr>
              <td colSpan={5} style={{ color: 'var(--text-muted)' }} className="px-6 py-8 text-center">
                <Loader2 className="w-8 h-8 animate-spin mx-auto text-accent-500" />
              </td>
            </tr>
          ) : users.length === 0 ? (
            <Table.Empty colSpan={5}>No users found</Table.Empty>
          ) : (
            users.map((user) => (
              <Table.Row key={user.id}>
                <Table.Cell>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-accent-100 rounded-full flex items-center justify-center text-accent-700 font-medium">
                      {user.avatarUrl ? (
                        <img src={user.avatarUrl} alt="" className="w-10 h-10 rounded-full" />
                      ) : (
                        user.email.charAt(0).toUpperCase()
                      )}
                    </div>
                    <div>
                      <p style={{ color: 'var(--text-primary)' }} className="font-medium">{user.displayName || 'No name'}</p>
                      <p style={{ color: 'var(--text-muted)' }} className="text-sm">{user.email}</p>
                    </div>
                  </div>
                </Table.Cell>
                <Table.Cell>
                  {!user.tenantMemberships || user.tenantMemberships.length === 0 ? (
                    <span style={{ color: 'var(--text-muted)' }}>None</span>
                  ) : (
                    <div className="flex flex-wrap gap-1">
                      {user.tenantMemberships.slice(0, 3).map((m, i) => (
                        <span
                          key={i}
                          className="inline-flex px-2 py-0.5 text-xs bg-gray-100 text-gray-700 rounded"
                          title={m.tenantName}
                        >
                          {m.tenantName?.slice(0, 15) || 'Unnamed'}
                        </span>
                      ))}
                      {user.tenantMemberships.length > 3 && (
                        <span style={{ color: 'var(--text-muted)' }} className="text-xs">
                          +{user.tenantMemberships.length - 3} more
                        </span>
                      )}
                    </div>
                  )}
                </Table.Cell>
                <Table.Cell>
                  <span style={{ color: 'var(--text-muted)' }} className="text-sm">
                    {new Date(user.createdAt).toLocaleDateString()}
                  </span>
                </Table.Cell>
                <Table.Cell>
                  <span style={{ color: 'var(--text-muted)' }} className="text-sm">
                    {user.lastSignInAt ? new Date(user.lastSignInAt).toLocaleDateString() : 'Never'}
                  </span>
                </Table.Cell>
                <Table.Cell align="right">
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => setSelectedUser(user)}
                      style={{ color: 'var(--text-muted)' }}
                      className="p-2 hover:opacity-70 rounded-lg transition-colors"
                      title="View"
                    >
                      <Eye size={16} />
                    </button>
                    <button
                      onClick={() => handleResetPassword(user.id)}
                      disabled={actionLoading === user.id}
                      style={{ color: 'var(--text-muted)' }}
                      className="p-2 hover:text-yellow-600 rounded-lg transition-colors disabled:opacity-50"
                      title="Reset Password"
                    >
                      <Key size={16} />
                    </button>
                    <button
                      onClick={() => handleVerifyEmail(user.id)}
                      disabled={actionLoading === user.id}
                      style={{ color: 'var(--text-muted)' }}
                      className="p-2 hover:text-green-600 rounded-lg transition-colors disabled:opacity-50"
                      title="Verify Email"
                    >
                      <Mail size={16} />
                    </button>
                  </div>
                </Table.Cell>
              </Table.Row>
            ))
          )}
        </Table.Body>
      </Table>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ borderColor: 'var(--border-color)' }} className="mt-4 px-6 py-4 border-t flex items-center justify-between">
          <p style={{ color: 'var(--text-muted)' }} className="text-sm">
            Showing {(page - 1) * limit + 1} to {Math.min(page * limit, total)} of {total} users
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
              className="px-3 py-1 text-sm border rounded-lg disabled:opacity-50 hover:opacity-80"
            >
              Previous
            </button>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
              className="px-3 py-1 text-sm border rounded-lg disabled:opacity-50 hover:opacity-80"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* User Detail Modal */}
      {selectedUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col shadow-xl">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">User Details</h3>
              <button
                onClick={() => setSelectedUser(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={24} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* User Info */}
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-accent-100 rounded-full flex items-center justify-center text-2xl text-accent-700 font-medium">
                  {selectedUser.avatarUrl ? (
                    <img src={selectedUser.avatarUrl} alt="" className="w-16 h-16 rounded-full" />
                  ) : (
                    selectedUser.email.charAt(0).toUpperCase()
                  )}
                </div>
                <div>
                  <p className="text-xl font-semibold text-gray-900">{selectedUser.displayName || 'No name'}</p>
                  <p className="text-gray-500">{selectedUser.email}</p>
                </div>
              </div>

              {/* Metadata */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-gray-50 rounded-xl">
                  <p className="text-sm text-gray-500">User ID</p>
                  <p className="text-gray-900 font-mono text-sm mt-1">{selectedUser.id}</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-xl">
                  <p className="text-sm text-gray-500">Created</p>
                  <p className="text-gray-900 mt-1">{new Date(selectedUser.createdAt).toLocaleString()}</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-xl col-span-2">
                  <p className="text-sm text-gray-500">Last Sign In</p>
                  <p className="text-gray-900 mt-1">
                    {selectedUser.lastSignInAt ? new Date(selectedUser.lastSignInAt).toLocaleString() : 'Never'}
                  </p>
                </div>
              </div>

              {/* Memberships */}
              <div>
                <h4 className="text-sm font-medium text-gray-500 mb-3">Tenant Memberships</h4>
                {!selectedUser.tenantMemberships || selectedUser.tenantMemberships.length === 0 ? (
                  <p className="text-gray-400">No memberships</p>
                ) : (
                  <div className="space-y-2">
                    {selectedUser.tenantMemberships.map((m, i) => (
                      <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                        <div>
                          <p className="font-medium text-gray-900">{m.tenantName || 'Unnamed Tenant'}</p>
                          <p className="text-sm text-gray-500 capitalize">{m.role}</p>
                        </div>
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          m.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                        }`}>
                          {m.status}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4 border-t border-gray-100">
                <button
                  onClick={() => handleResetPassword(selectedUser.id)}
                  disabled={actionLoading === selectedUser.id}
                  className="px-4 py-2 bg-yellow-50 text-yellow-700 rounded-lg hover:bg-yellow-100 disabled:opacity-50 flex items-center gap-2"
                >
                  <Key size={16} />
                  Send Password Reset
                </button>
                <button
                  onClick={() => handleVerifyEmail(selectedUser.id)}
                  disabled={actionLoading === selectedUser.id}
                  className="px-4 py-2 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 disabled:opacity-50 flex items-center gap-2"
                >
                  <Mail size={16} />
                  Verify Email
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

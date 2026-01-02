import { useState, useEffect } from 'react'
import { Loader2, X, Filter } from 'lucide-react'
import Table from '../../components/Table'
import { adminActivity, ActivityLog } from '../../services/adminApi'

const actionColors: Record<string, string> = {
  create: 'bg-green-100 text-green-700',
  update: 'bg-blue-100 text-blue-700',
  delete: 'bg-red-100 text-red-700',
  login: 'bg-purple-100 text-purple-700',
  impersonate: 'bg-yellow-100 text-yellow-700',
  view: 'bg-gray-100 text-gray-600',
}

export function ActivityLogs() {
  const [logs, setLogs] = useState<ActivityLog[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [filters, setFilters] = useState({
    adminId: '',
    action: '',
    resource: '',
    startDate: '',
    endDate: '',
  })
  const [selectedLog, setSelectedLog] = useState<ActivityLog | null>(null)
  const limit = 20

  useEffect(() => {
    fetchLogs()
  }, [page, filters])

  const fetchLogs = async () => {
    try {
      setLoading(true)
      const { logs, total } = await adminActivity.getLogs({
        page,
        limit,
        adminId: filters.adminId || undefined,
        action: filters.action || undefined,
        resource: filters.resource || undefined,
        startDate: filters.startDate || undefined,
        endDate: filters.endDate || undefined,
      })
      setLogs(logs)
      setTotal(total)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load activity logs')
    } finally {
      setLoading(false)
    }
  }

  const handleFilterChange = (key: string, value: string) => {
    setFilters({ ...filters, [key]: value })
    setPage(1)
  }

  const clearFilters = () => {
    setFilters({
      adminId: '',
      action: '',
      resource: '',
      startDate: '',
      endDate: '',
    })
    setPage(1)
  }

  const totalPages = Math.ceil(total / limit)

  const formatChanges = (changes: any) => {
    if (!changes) return null
    return Object.entries(changes).map(([key, value]) => (
      <div key={key} className="text-sm">
        <span className="text-gray-500">{key}:</span>{' '}
        <span className="text-gray-900 font-mono">{JSON.stringify(value)}</span>
      </div>
    ))
  }

  return (
    <div style={{ backgroundColor: 'var(--bg-card)' }} className="p-8 min-h-full transition-colors">
      {/* Header */}
      <div className="mb-8">
        <h1 style={{ color: 'var(--text-primary)' }} className="text-3xl font-bold mb-2">Activity Logs</h1>
        <p style={{ color: 'var(--text-muted)' }}>Track all admin actions and system events</p>
      </div>

      {/* Filters */}
      <div style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }} className="rounded-xl border p-6 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Filter size={16} style={{ color: 'var(--text-muted)' }} />
          <span style={{ color: 'var(--text-primary)' }} className="text-sm font-medium">Filters</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div>
            <label style={{ color: 'var(--text-muted)' }} className="block text-sm mb-1">Action</label>
            <select
              value={filters.action}
              onChange={(e) => handleFilterChange('action', e.target.value)}
              style={{ backgroundColor: 'var(--bg-tertiary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent-500"
            >
              <option value="">All Actions</option>
              <option value="create">Create</option>
              <option value="update">Update</option>
              <option value="delete">Delete</option>
              <option value="login">Login</option>
              <option value="impersonate">Impersonate</option>
              <option value="view">View</option>
            </select>
          </div>
          <div>
            <label style={{ color: 'var(--text-muted)' }} className="block text-sm mb-1">Resource</label>
            <select
              value={filters.resource}
              onChange={(e) => handleFilterChange('resource', e.target.value)}
              style={{ backgroundColor: 'var(--bg-tertiary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent-500"
            >
              <option value="">All Resources</option>
              <option value="tenant">Tenant</option>
              <option value="user">User</option>
              <option value="subscription">Subscription</option>
              <option value="plan">Plan</option>
              <option value="feature_flag">Feature Flag</option>
              <option value="announcement">Announcement</option>
              <option value="backup">Backup</option>
              <option value="settings">Settings</option>
            </select>
          </div>
          <div>
            <label style={{ color: 'var(--text-muted)' }} className="block text-sm mb-1">Start Date</label>
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => handleFilterChange('startDate', e.target.value)}
              style={{ backgroundColor: 'var(--bg-tertiary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent-500"
            />
          </div>
          <div>
            <label style={{ color: 'var(--text-muted)' }} className="block text-sm mb-1">End Date</label>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => handleFilterChange('endDate', e.target.value)}
              style={{ backgroundColor: 'var(--bg-tertiary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent-500"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={clearFilters}
              style={{ color: 'var(--text-muted)' }}
              className="px-4 py-2 hover:opacity-70 text-sm"
            >
              Clear Filters
            </button>
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 mb-6">
          {error}
        </div>
      )}

      {/* Logs Table */}
      <Table>
        <Table.Header>
          <tr>
            <Table.HeaderCell>Timestamp</Table.HeaderCell>
            <Table.HeaderCell>Admin</Table.HeaderCell>
            <Table.HeaderCell>Action</Table.HeaderCell>
            <Table.HeaderCell>Resource</Table.HeaderCell>
            <Table.HeaderCell>Details</Table.HeaderCell>
            <Table.HeaderCell align="right">View</Table.HeaderCell>
          </tr>
        </Table.Header>
        <Table.Body>
          {loading ? (
            <tr>
              <td colSpan={6} style={{ color: 'var(--text-muted)' }} className="px-6 py-8 text-center">
                <Loader2 className="w-8 h-8 animate-spin mx-auto text-accent-500" />
              </td>
            </tr>
          ) : logs.length === 0 ? (
            <Table.Empty colSpan={6}>No activity logs found</Table.Empty>
          ) : (
            logs.map((log) => (
              <Table.Row key={log.id}>
                <Table.Cell className="whitespace-nowrap">
                  <span style={{ color: 'var(--text-muted)' }} className="text-sm">
                    {new Date(log.createdAt).toLocaleString()}
                  </span>
                </Table.Cell>
                <Table.Cell>
                  <div>
                    <p style={{ color: 'var(--text-primary)' }} className="text-sm">{log.adminEmail}</p>
                    {log.impersonatedAs && (
                      <p className="text-xs text-yellow-600">
                        Impersonating: {log.impersonatedAs}
                      </p>
                    )}
                  </div>
                </Table.Cell>
                <Table.Cell>
                  <span className={`px-2 py-1 text-xs rounded-full capitalize ${actionColors[log.action] || 'bg-gray-100 text-gray-600'}`}>
                    {log.action}
                  </span>
                </Table.Cell>
                <Table.Cell>
                  <span style={{ color: 'var(--text-primary)' }} className="text-sm capitalize">{log.resource}</span>
                  {log.resourceId && (
                    <p style={{ color: 'var(--text-muted)' }} className="text-xs font-mono truncate max-w-[150px]">
                      {log.resourceId}
                    </p>
                  )}
                </Table.Cell>
                <Table.Cell className="max-w-xs truncate">
                  <span style={{ color: 'var(--text-muted)' }} className="text-sm">
                    {log.description || '-'}
                  </span>
                </Table.Cell>
                <Table.Cell align="right">
                  <button
                    onClick={() => setSelectedLog(log)}
                    className="text-accent-600 hover:text-accent-700 text-sm"
                  >
                    Details
                  </button>
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
            Showing {(page - 1) * limit + 1} to {Math.min(page * limit, total)} of {total} logs
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

      {/* Log Detail Modal */}
      {selectedLog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col shadow-xl">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Activity Log Details</h3>
              <button
                onClick={() => setSelectedLog(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={24} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Timestamp</p>
                  <p className="text-gray-900">{new Date(selectedLog.createdAt).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Admin</p>
                  <p className="text-gray-900">{selectedLog.adminEmail}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Action</p>
                  <span className={`px-2 py-1 text-xs rounded-full capitalize ${actionColors[selectedLog.action] || 'bg-gray-100 text-gray-600'}`}>
                    {selectedLog.action}
                  </span>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Resource</p>
                  <p className="text-gray-900 capitalize">{selectedLog.resource}</p>
                </div>
              </div>

              {/* Resource ID */}
              {selectedLog.resourceId && (
                <div>
                  <p className="text-sm text-gray-500 mb-1">Resource ID</p>
                  <p className="text-gray-900 font-mono bg-gray-50 p-2 rounded text-sm">
                    {selectedLog.resourceId}
                  </p>
                </div>
              )}

              {/* Description */}
              {selectedLog.description && (
                <div>
                  <p className="text-sm text-gray-500 mb-1">Description</p>
                  <p className="text-gray-900">{selectedLog.description}</p>
                </div>
              )}

              {/* Changes */}
              {selectedLog.changes && Object.keys(selectedLog.changes).length > 0 && (
                <div>
                  <p className="text-sm text-gray-500 mb-2">Changes</p>
                  <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                    {formatChanges(selectedLog.changes)}
                  </div>
                </div>
              )}

              {/* Impersonation Info */}
              {selectedLog.impersonatedAs && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <p className="text-sm text-yellow-700">
                    Action performed while impersonating: {selectedLog.impersonatedAs}
                  </p>
                </div>
              )}

              {/* Technical Details */}
              <div className="border-t border-gray-100 pt-4">
                <p className="text-sm text-gray-500 mb-2">Technical Details</p>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-400">IP Address</p>
                    <p className="text-gray-900 font-mono">{selectedLog.ipAddress || '-'}</p>
                  </div>
                  <div>
                    <p className="text-gray-400">User Agent</p>
                    <p className="text-gray-900 truncate" title={selectedLog.userAgent || ''}>
                      {selectedLog.userAgent || '-'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

import { useState, useEffect } from 'react'
import { Loader2, Plus, X, Download, Trash2, Database } from 'lucide-react'
import Table from '../../components/Table'
import { adminBackups, Backup } from '../../services/adminApi'

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  in_progress: 'bg-blue-100 text-blue-700',
  completed: 'bg-green-100 text-green-700',
  failed: 'bg-red-100 text-red-700',
}

const typeLabels: Record<string, string> = {
  full: 'Full Backup',
  incremental: 'Incremental',
  tenant_export: 'Tenant Export',
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

export function BackupManager() {
  const [backups, setBackups] = useState<Backup[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [typeFilter, setTypeFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [creating, setCreating] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newBackupType, setNewBackupType] = useState<'full' | 'incremental' | 'tenant_export'>('full')
  const limit = 20

  const fetchBackups = async () => {
    try {
      setLoading(true)
      const { backups, total } = await adminBackups.list({
        page,
        limit,
        type: typeFilter || undefined,
        status: statusFilter || undefined,
      })
      setBackups(backups)
      setTotal(total)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load backups')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchBackups()
  }, [page, typeFilter, statusFilter])

  const handleCreateBackup = async () => {
    try {
      setCreating(true)
      await adminBackups.create(newBackupType)
      setShowCreateModal(false)
      fetchBackups()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to create backup')
    } finally {
      setCreating(false)
    }
  }

  const handleDownload = async (id: string) => {
    try {
      const { url } = await adminBackups.download(id)
      window.open(url, '_blank')
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to get download URL')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this backup?')) return
    try {
      await adminBackups.delete(id)
      fetchBackups()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete backup')
    }
  }

  const totalPages = Math.ceil(total / limit)

  return (
    <div style={{ backgroundColor: 'var(--bg-card)' }} className="p-8 min-h-full transition-colors">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 style={{ color: 'var(--text-primary)' }} className="text-3xl font-bold mb-2">Backup Manager</h1>
          <p style={{ color: 'var(--text-muted)' }}>Create and manage database backups</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 bg-accent-500 text-white rounded-lg hover:bg-accent-600 flex items-center gap-2 transition-colors"
        >
          <Plus size={20} />
          Create Backup
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 mb-6">
        <select
          value={typeFilter}
          onChange={(e) => {
            setTypeFilter(e.target.value)
            setPage(1)
          }}
          style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
          className="border rounded-lg px-4 py-2 focus:outline-none focus:border-accent-500"
        >
          <option value="">All Types</option>
          <option value="full">Full Backup</option>
          <option value="incremental">Incremental</option>
          <option value="tenant_export">Tenant Export</option>
        </select>
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value)
            setPage(1)
          }}
          style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
          className="border rounded-lg px-4 py-2 focus:outline-none focus:border-accent-500"
        >
          <option value="">All Status</option>
          <option value="pending">Pending</option>
          <option value="in_progress">In Progress</option>
          <option value="completed">Completed</option>
          <option value="failed">Failed</option>
        </select>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 mb-6">
          {error}
        </div>
      )}

      {/* Backup List */}
      <Table>
        <Table.Header>
          <tr>
            <Table.HeaderCell>Backup</Table.HeaderCell>
            <Table.HeaderCell>Type</Table.HeaderCell>
            <Table.HeaderCell>Status</Table.HeaderCell>
            <Table.HeaderCell>Size</Table.HeaderCell>
            <Table.HeaderCell>Created</Table.HeaderCell>
            <Table.HeaderCell>Expires</Table.HeaderCell>
            <Table.HeaderCell align="right">Actions</Table.HeaderCell>
          </tr>
        </Table.Header>
        <Table.Body>
          {loading ? (
            <tr>
              <Table.Cell colSpan={7} className="text-center">
                <Loader2 className="w-8 h-8 animate-spin mx-auto text-accent-500" />
              </Table.Cell>
            </tr>
          ) : backups.length === 0 ? (
            <Table.Empty colSpan={7}>
              <Database className="w-12 h-12 mx-auto mb-3" style={{ color: 'var(--text-muted)' }} />
              <p>No backups found</p>
            </Table.Empty>
          ) : (
            backups.map((backup) => (
              <Table.Row key={backup.id}>
                <Table.Cell>
                  <div>
                    <p style={{ color: 'var(--text-primary)' }} className="font-medium font-mono text-sm">{backup.fileName}</p>
                    {backup.tenantName && (
                      <p style={{ color: 'var(--text-muted)' }} className="text-xs">{backup.tenantName}</p>
                    )}
                  </div>
                </Table.Cell>
                <Table.Cell>
                  <span style={{ color: 'var(--text-muted)' }}>
                    {typeLabels[backup.type] || backup.type}
                  </span>
                </Table.Cell>
                <Table.Cell>
                  <span className={`inline-flex px-2 py-1 text-xs rounded-full capitalize ${statusColors[backup.status]}`}>
                    {backup.status.replace('_', ' ')}
                  </span>
                </Table.Cell>
                <Table.Cell>
                  <span style={{ color: 'var(--text-muted)' }}>
                    {backup.fileSize ? formatFileSize(backup.fileSize) : '-'}
                  </span>
                </Table.Cell>
                <Table.Cell>
                  <span style={{ color: 'var(--text-muted)' }} className="text-sm">
                    {new Date(backup.startedAt).toLocaleString()}
                  </span>
                </Table.Cell>
                <Table.Cell>
                  <span style={{ color: 'var(--text-muted)' }} className="text-sm">
                    {backup.expiresAt ? new Date(backup.expiresAt).toLocaleDateString() : '-'}
                  </span>
                </Table.Cell>
                <Table.Cell align="right">
                  <div className="flex justify-end gap-2">
                    {backup.status === 'completed' && (
                      <button
                        onClick={() => handleDownload(backup.id)}
                        style={{ color: 'var(--text-muted)' }}
                        className="p-2 hover:text-accent-600 hover:opacity-70 rounded-lg transition-colors"
                        title="Download"
                      >
                        <Download size={16} />
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(backup.id)}
                      style={{ color: 'var(--text-muted)' }}
                      className="p-2 hover:text-red-600 hover:opacity-70 rounded-lg transition-colors"
                      title="Delete"
                    >
                      <Trash2 size={16} />
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
        <div style={{ borderColor: 'var(--border-color)' }} className="px-6 py-4 border-t flex items-center justify-between">
          <p style={{ color: 'var(--text-muted)' }} className="text-sm">
            Showing {(page - 1) * limit + 1} to {Math.min(page * limit, total)} of {total} backups
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
              className="px-3 py-1 text-sm border rounded-lg disabled:opacity-50 hover:opacity-70"
            >
              Previous
            </button>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
              className="px-3 py-1 text-sm border rounded-lg disabled:opacity-50 hover:opacity-70"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Create Backup Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div style={{ backgroundColor: 'var(--bg-card)' }} className="rounded-xl p-6 max-w-md w-full mx-4 shadow-xl">
            <div className="flex items-center justify-between mb-6">
              <h3 style={{ color: 'var(--text-primary)' }} className="text-lg font-semibold">Create Backup</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                style={{ color: 'var(--text-muted)' }}
                className="hover:opacity-70"
              >
                <X size={24} />
              </button>
            </div>
            <div className="mb-6">
              <label style={{ color: 'var(--text-primary)' }} className="block text-sm font-medium mb-3">
                Backup Type
              </label>
              <div className="space-y-2">
                <label style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }} className="flex items-center gap-3 p-4 border rounded-xl cursor-pointer hover:opacity-90 transition-colors">
                  <input
                    type="radio"
                    value="full"
                    checked={newBackupType === 'full'}
                    onChange={(e) => setNewBackupType(e.target.value as any)}
                    className="text-accent-500 focus:ring-accent-500"
                  />
                  <div>
                    <p style={{ color: 'var(--text-primary)' }} className="font-medium">Full Backup</p>
                    <p style={{ color: 'var(--text-muted)' }} className="text-sm">Complete database backup</p>
                  </div>
                </label>
                <label style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }} className="flex items-center gap-3 p-4 border rounded-xl cursor-pointer hover:opacity-90 transition-colors">
                  <input
                    type="radio"
                    value="incremental"
                    checked={newBackupType === 'incremental'}
                    onChange={(e) => setNewBackupType(e.target.value as any)}
                    className="text-accent-500 focus:ring-accent-500"
                  />
                  <div>
                    <p style={{ color: 'var(--text-primary)' }} className="font-medium">Incremental Backup</p>
                    <p style={{ color: 'var(--text-muted)' }} className="text-sm">Changes since last backup</p>
                  </div>
                </label>
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowCreateModal(false)}
                style={{ color: 'var(--text-muted)' }}
                className="px-4 py-2 hover:opacity-70"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateBackup}
                disabled={creating}
                className="px-4 py-2 bg-accent-500 text-white rounded-lg hover:bg-accent-600 disabled:opacity-50 flex items-center gap-2 transition-colors"
              >
                {creating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create Backup'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

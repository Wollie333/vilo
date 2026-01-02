import { useState, useEffect } from 'react'
import { Loader2, Search, ChevronRight, X } from 'lucide-react'
import Card from '../../components/Card'
import { adminErrors, ErrorLog } from '../../services/adminApi'

const levelColors: Record<string, string> = {
  error: 'bg-red-100 text-red-700',
  warning: 'bg-yellow-100 text-yellow-700',
  info: 'bg-blue-100 text-blue-700',
}

export function ErrorLogs() {
  const [errors, setErrors] = useState<ErrorLog[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [levelFilter, setLevelFilter] = useState('')
  const [search, setSearch] = useState('')
  const [selectedError, setSelectedError] = useState<ErrorLog | null>(null)
  const limit = 25

  useEffect(() => {
    async function fetchErrors() {
      try {
        setLoading(true)
        const { errors, total } = await adminErrors.list({
          page,
          limit,
          level: levelFilter || undefined,
          search: search || undefined,
        })
        setErrors(errors)
        setTotal(total)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load errors')
      } finally {
        setLoading(false)
      }
    }

    fetchErrors()
  }, [page, levelFilter, search])

  const totalPages = Math.ceil(total / limit)

  return (
    <div className="bg-gray-50 p-8 min-h-full">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Error Logs</h1>
        <p className="text-gray-500">Monitor and investigate system errors</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 mb-6">
        <div className="flex-1 min-w-[200px] max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(1)
              }}
              placeholder="Search error messages..."
              className="w-full bg-white border border-gray-200 rounded-lg pl-10 pr-4 py-2 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-accent-500"
            />
          </div>
        </div>
        <select
          value={levelFilter}
          onChange={(e) => {
            setLevelFilter(e.target.value)
            setPage(1)
          }}
          className="bg-white border border-gray-200 rounded-lg px-4 py-2 text-gray-900 focus:outline-none focus:border-accent-500"
        >
          <option value="">All Levels</option>
          <option value="error">Error</option>
          <option value="warning">Warning</option>
          <option value="info">Info</option>
        </select>
      </div>

      {/* Error display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 mb-6">
          {error}
        </div>
      )}

      {/* Error List */}
      <Card>
        {loading ? (
          <div className="p-8 text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-accent-500" />
          </div>
        ) : errors.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No errors found
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {errors.map((err) => (
              <div
                key={err.id}
                className="p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                onClick={() => setSelectedError(err)}
              >
                <div className="flex items-start gap-3">
                  <span className={`inline-flex px-2 py-1 text-xs rounded-full capitalize ${levelColors[err.level]}`}>
                    {err.level}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-gray-900 font-medium truncate">{err.message}</p>
                    <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                      <span>{new Date(err.createdAt).toLocaleString()}</span>
                      {err.requestId && (
                        <span className="font-mono text-xs">{err.requestId.slice(0, 8)}</span>
                      )}
                      {err.sentryEventId && (
                        <span className="text-accent-600">Sentry</span>
                      )}
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
            <p className="text-sm text-gray-500">
              Showing {(page - 1) * limit + 1} to {Math.min(page * limit, total)} of {total} errors
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1 text-sm bg-white border border-gray-200 text-gray-700 rounded-lg disabled:opacity-50 hover:bg-gray-50"
              >
                Previous
              </button>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1 text-sm bg-white border border-gray-200 text-gray-700 rounded-lg disabled:opacity-50 hover:bg-gray-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </Card>

      {/* Error Detail Modal */}
      {selectedError && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-3xl w-full max-h-[80vh] overflow-hidden flex flex-col shadow-xl">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className={`inline-flex px-2 py-1 text-xs rounded-full capitalize ${levelColors[selectedError.level]}`}>
                  {selectedError.level}
                </span>
                <span className="text-sm text-gray-500">
                  {new Date(selectedError.createdAt).toLocaleString()}
                </span>
              </div>
              <button
                onClick={() => setSelectedError(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={24} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {/* Message */}
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-1">Message</h3>
                <p className="text-gray-900">{selectedError.message}</p>
              </div>

              {/* Stack Trace */}
              {selectedError.stack && (
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-1">Stack Trace</h3>
                  <pre className="bg-gray-50 border border-gray-100 rounded-lg p-4 text-sm text-gray-700 overflow-x-auto whitespace-pre-wrap font-mono">
                    {selectedError.stack}
                  </pre>
                </div>
              )}

              {/* Context */}
              {selectedError.context && Object.keys(selectedError.context).length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-1">Context</h3>
                  <pre className="bg-gray-50 border border-gray-100 rounded-lg p-4 text-sm text-gray-700 overflow-x-auto font-mono">
                    {JSON.stringify(selectedError.context, null, 2)}
                  </pre>
                </div>
              )}

              {/* Metadata */}
              <div className="grid grid-cols-2 gap-4">
                {selectedError.requestId && (
                  <div className="p-4 bg-gray-50 rounded-xl">
                    <h3 className="text-sm font-medium text-gray-500 mb-1">Request ID</h3>
                    <p className="text-gray-900 font-mono text-sm">{selectedError.requestId}</p>
                  </div>
                )}
                {selectedError.userId && (
                  <div className="p-4 bg-gray-50 rounded-xl">
                    <h3 className="text-sm font-medium text-gray-500 mb-1">User ID</h3>
                    <p className="text-gray-900 font-mono text-sm">{selectedError.userId}</p>
                  </div>
                )}
                {selectedError.tenantId && (
                  <div className="p-4 bg-gray-50 rounded-xl">
                    <h3 className="text-sm font-medium text-gray-500 mb-1">Tenant ID</h3>
                    <p className="text-gray-900 font-mono text-sm">{selectedError.tenantId}</p>
                  </div>
                )}
                {selectedError.sentryEventId && (
                  <div className="p-4 bg-gray-50 rounded-xl">
                    <h3 className="text-sm font-medium text-gray-500 mb-1">Sentry Event</h3>
                    <p className="text-accent-600 font-mono text-sm">{selectedError.sentryEventId}</p>
                  </div>
                )}
                <div className="p-4 bg-gray-50 rounded-xl">
                  <h3 className="text-sm font-medium text-gray-500 mb-1">Environment</h3>
                  <p className="text-gray-900">{selectedError.environment}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

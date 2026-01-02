import { useState, useEffect } from 'react'
import { Loader2, RefreshCw, AlertCircle, Activity, Database, Globe, Wifi } from 'lucide-react'
import Card from '../../components/Card'
import { adminHealth, SystemHealth as SystemHealthType } from '../../services/adminApi'

function StatusIndicator({ status }: { status: 'healthy' | 'degraded' | 'unhealthy' }) {
  const colors = {
    healthy: 'bg-green-500',
    degraded: 'bg-yellow-500',
    unhealthy: 'bg-red-500',
  }

  return (
    <div className="flex items-center gap-2">
      <div className={`w-3 h-3 rounded-full ${colors[status]} animate-pulse`} />
      <span className="text-gray-900 capitalize">{status}</span>
    </div>
  )
}

function MetricCard({
  title,
  value,
  unit,
  subtitle,
  status,
}: {
  title: string
  value: string | number
  unit?: string
  subtitle?: string
  status?: 'good' | 'warning' | 'critical'
}) {
  const statusColors = {
    good: 'border-green-200 bg-green-50',
    warning: 'border-yellow-200 bg-yellow-50',
    critical: 'border-red-200 bg-red-50',
  }

  return (
    <div className={`border rounded-xl p-4 ${status ? statusColors[status] : 'border-gray-100 bg-gray-50'}`}>
      <p className="text-sm text-gray-500 mb-1">{title}</p>
      <p className="text-2xl font-bold text-gray-900">
        {value}
        {unit && <span className="text-sm text-gray-500 ml-1">{unit}</span>}
      </p>
      {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
    </div>
  )
}

function formatBytes(bytes: number): string {
  const mb = bytes / (1024 * 1024)
  if (mb >= 1024) {
    return `${(mb / 1024).toFixed(2)} GB`
  }
  return `${mb.toFixed(0)} MB`
}

function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400)
  const hours = Math.floor((seconds % 86400) / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)

  if (days > 0) {
    return `${days}d ${hours}h ${minutes}m`
  }
  if (hours > 0) {
    return `${hours}h ${minutes}m`
  }
  return `${minutes}m`
}

export function SystemHealth() {
  const [health, setHealth] = useState<SystemHealthType | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const fetchHealth = async () => {
    try {
      setLoading(true)
      const data = await adminHealth.getStatus()
      setHealth(data)
      setLastUpdated(new Date())
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load health status')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchHealth()
    const interval = setInterval(fetchHealth, 30000)
    return () => clearInterval(interval)
  }, [])

  if (loading && !health) {
    return (
      <div className="bg-gray-50 p-8 min-h-full flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-accent-500" />
          <p className="text-gray-500">Loading health status...</p>
        </div>
      </div>
    )
  }

  if (error && !health) {
    return (
      <div className="bg-gray-50 p-8 min-h-full">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center max-w-md mx-auto">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-red-700 mb-4">{error}</p>
          <button
            onClick={fetchHealth}
            className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  if (!health) return null

  const memoryStatus = health.memory.percentUsed > 90 ? 'critical' : health.memory.percentUsed > 70 ? 'warning' : 'good'
  const latencyStatus = health.api.avgLatency > 500 ? 'critical' : health.api.avgLatency > 200 ? 'warning' : 'good'
  const errorStatus = health.api.errorRate > 5 ? 'critical' : health.api.errorRate > 1 ? 'warning' : 'good'

  return (
    <div className="bg-gray-50 p-8 min-h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">System Health</h1>
          <p className="text-gray-500">Monitor platform performance and status</p>
        </div>
        <div className="flex items-center gap-4">
          {lastUpdated && (
            <p className="text-sm text-gray-400">
              Last updated: {lastUpdated.toLocaleTimeString()}
            </p>
          )}
          <button
            onClick={fetchHealth}
            disabled={loading}
            className="px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Overall Status */}
      <Card className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Activity className="w-5 h-5 text-gray-500" />
              <h2 className="text-lg font-semibold text-gray-900">Overall Status</h2>
            </div>
            <StatusIndicator status={health.status} />
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-500">Uptime</p>
            <p className="text-2xl font-bold text-gray-900">{formatUptime(health.uptime)}</p>
          </div>
        </div>
      </Card>

      {/* Memory */}
      <Card title="Memory Usage" className="mb-6">
        <div className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-4">
          <MetricCard
            title="Heap Used"
            value={formatBytes(health.memory.heapUsed)}
            status={memoryStatus}
          />
          <MetricCard
            title="Heap Total"
            value={formatBytes(health.memory.heapTotal)}
          />
          <MetricCard
            title="RSS"
            value={formatBytes(health.memory.rss)}
          />
          <MetricCard
            title="Usage"
            value={health.memory.percentUsed.toFixed(1)}
            unit="%"
            status={memoryStatus}
          />
        </div>
        <div className="mt-4">
          <div className="h-4 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                memoryStatus === 'critical' ? 'bg-red-500' :
                memoryStatus === 'warning' ? 'bg-yellow-500' : 'bg-green-500'
              }`}
              style={{ width: `${health.memory.percentUsed}%` }}
            />
          </div>
        </div>
      </Card>

      {/* Database */}
      <Card className="mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Database className="w-5 h-5 text-gray-500" />
          <h3 className="text-lg font-semibold text-gray-900">Database</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-center gap-4 p-4 bg-gray-50 border border-gray-100 rounded-xl">
            <div className={`w-4 h-4 rounded-full ${health.database.connected ? 'bg-green-500' : 'bg-red-500'}`} />
            <div>
              <p className="text-gray-900 font-medium">Connection Status</p>
              <p className="text-sm text-gray-500">{health.database.connected ? 'Connected' : 'Disconnected'}</p>
            </div>
          </div>
          <MetricCard
            title="Query Latency"
            value={health.database.latency.toFixed(0)}
            unit="ms"
            status={health.database.latency > 100 ? 'warning' : 'good'}
          />
        </div>
      </Card>

      {/* API Performance */}
      <Card className="mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Globe className="w-5 h-5 text-gray-500" />
          <h3 className="text-lg font-semibold text-gray-900">API Performance</h3>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <MetricCard
            title="Avg Latency"
            value={health.api.avgLatency.toFixed(0)}
            unit="ms"
            status={latencyStatus}
          />
          <MetricCard
            title="P95 Latency"
            value={health.api.p95Latency.toFixed(0)}
            unit="ms"
          />
          <MetricCard
            title="P99 Latency"
            value={health.api.p99Latency.toFixed(0)}
            unit="ms"
          />
          <MetricCard
            title="Requests/min"
            value={health.api.requestsPerMinute.toFixed(0)}
          />
          <MetricCard
            title="Error Rate"
            value={health.api.errorRate.toFixed(2)}
            unit="%"
            status={errorStatus}
          />
        </div>
      </Card>

      {/* WebSocket */}
      <Card>
        <div className="flex items-center gap-2 mb-4">
          <Wifi className="w-5 h-5 text-gray-500" />
          <h3 className="text-lg font-semibold text-gray-900">WebSocket</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <MetricCard
            title="Active Connections"
            value={health.websocket.connections}
          />
          <MetricCard
            title="Messages/min"
            value={health.websocket.messagesPerMinute}
          />
        </div>
      </Card>
    </div>
  )
}

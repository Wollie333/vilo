import { supabase } from '../lib/supabase.js'

// In-memory storage for API latency metrics
interface LatencyRecord {
  endpoint: string
  method: string
  latencyMs: number
  timestamp: number
  statusCode: number
}

const latencyBuffer: LatencyRecord[] = []
const MAX_BUFFER_SIZE = 1000

// System metrics interfaces
export interface MemoryMetrics {
  heapUsed: number
  heapTotal: number
  rss: number
  external: number
  arrayBuffers: number
  percentUsed: number
}

export interface APIMetrics {
  totalRequests: number
  avgLatencyMs: number
  p50LatencyMs: number
  p95LatencyMs: number
  p99LatencyMs: number
  requestsPerMinute: number
  errorRate: number
  errorCount: number
  successCount: number
}

export interface DatabaseMetrics {
  status: 'healthy' | 'degraded' | 'down'
  latencyMs: number
  lastCheck: string
}

export interface WebSocketMetrics {
  totalConnections: number
  dashboardConnections: number
  portalConnections: number
}

export interface SystemMetrics {
  memory: MemoryMetrics
  api: APIMetrics
  database: DatabaseMetrics
  websocket: WebSocketMetrics
  uptime: number
  nodeVersion: string
  platform: string
  timestamp: string
}

export interface ServiceHealth {
  name: string
  status: 'healthy' | 'degraded' | 'down'
  latencyMs?: number
  lastCheck: string
  error?: string
}

/**
 * Get current memory usage metrics
 */
export function getMemoryMetrics(): MemoryMetrics {
  const memUsage = process.memoryUsage()

  return {
    heapUsed: memUsage.heapUsed,
    heapTotal: memUsage.heapTotal,
    rss: memUsage.rss,
    external: memUsage.external,
    arrayBuffers: memUsage.arrayBuffers || 0,
    percentUsed: Math.round((memUsage.heapUsed / memUsage.heapTotal) * 100 * 100) / 100
  }
}

/**
 * Record an API request latency
 */
export function recordAPILatency(
  endpoint: string,
  method: string,
  latencyMs: number,
  statusCode: number
): void {
  const record: LatencyRecord = {
    endpoint,
    method,
    latencyMs,
    statusCode,
    timestamp: Date.now()
  }

  latencyBuffer.push(record)

  // Keep buffer size manageable
  if (latencyBuffer.length > MAX_BUFFER_SIZE) {
    latencyBuffer.shift()
  }
}

/**
 * Calculate percentile from sorted array
 */
function calculatePercentile(sortedArray: number[], percentile: number): number {
  if (sortedArray.length === 0) return 0
  const index = Math.ceil((percentile / 100) * sortedArray.length) - 1
  return sortedArray[Math.max(0, index)]
}

/**
 * Get API performance metrics
 */
export function getAPIMetrics(windowMinutes: number = 5): APIMetrics {
  const now = Date.now()
  const windowMs = windowMinutes * 60 * 1000
  const cutoff = now - windowMs

  // Filter to recent records
  const recentRecords = latencyBuffer.filter(r => r.timestamp >= cutoff)

  if (recentRecords.length === 0) {
    return {
      totalRequests: 0,
      avgLatencyMs: 0,
      p50LatencyMs: 0,
      p95LatencyMs: 0,
      p99LatencyMs: 0,
      requestsPerMinute: 0,
      errorRate: 0,
      errorCount: 0,
      successCount: 0
    }
  }

  const latencies = recentRecords.map(r => r.latencyMs).sort((a, b) => a - b)
  const avgLatency = latencies.reduce((sum, l) => sum + l, 0) / latencies.length

  const errorCount = recentRecords.filter(r => r.statusCode >= 400).length
  const successCount = recentRecords.length - errorCount

  return {
    totalRequests: recentRecords.length,
    avgLatencyMs: Math.round(avgLatency * 100) / 100,
    p50LatencyMs: calculatePercentile(latencies, 50),
    p95LatencyMs: calculatePercentile(latencies, 95),
    p99LatencyMs: calculatePercentile(latencies, 99),
    requestsPerMinute: Math.round((recentRecords.length / windowMinutes) * 100) / 100,
    errorRate: Math.round((errorCount / recentRecords.length) * 100 * 100) / 100,
    errorCount,
    successCount
  }
}

/**
 * Check database health
 */
export async function checkDatabaseHealth(): Promise<DatabaseMetrics> {
  const startTime = Date.now()

  try {
    // Simple query to check database connectivity
    const { error } = await supabase
      .from('tenants')
      .select('id')
      .limit(1)

    const latencyMs = Date.now() - startTime

    if (error) {
      console.error('[HealthMonitor] Database query error:', error.message)
      return {
        status: 'down',
        latencyMs,
        lastCheck: new Date().toISOString()
      }
    }

    // Determine status based on latency
    let status: 'healthy' | 'degraded' | 'down' = 'healthy'
    if (latencyMs > 1000) {
      status = 'degraded'
    } else if (latencyMs > 5000) {
      status = 'down'
    }

    return {
      status,
      latencyMs,
      lastCheck: new Date().toISOString()
    }
  } catch (error: any) {
    console.error('[HealthMonitor] Database health check failed:', error.message)
    return {
      status: 'down',
      latencyMs: Date.now() - startTime,
      lastCheck: new Date().toISOString()
    }
  }
}

/**
 * Check Supabase Auth service health
 */
export async function checkAuthHealth(): Promise<ServiceHealth> {
  const startTime = Date.now()

  try {
    // Try to get session (will fail gracefully if no session)
    await supabase.auth.getSession()
    const latencyMs = Date.now() - startTime

    return {
      name: 'Supabase Auth',
      status: latencyMs < 500 ? 'healthy' : 'degraded',
      latencyMs,
      lastCheck: new Date().toISOString()
    }
  } catch (error: any) {
    return {
      name: 'Supabase Auth',
      status: 'down',
      latencyMs: Date.now() - startTime,
      lastCheck: new Date().toISOString(),
      error: error.message
    }
  }
}

/**
 * Check Supabase Storage service health
 */
export async function checkStorageHealth(): Promise<ServiceHealth> {
  const startTime = Date.now()

  try {
    // List buckets to check storage connectivity
    const { error } = await supabase.storage.listBuckets()
    const latencyMs = Date.now() - startTime

    if (error) {
      return {
        name: 'Supabase Storage',
        status: 'down',
        latencyMs,
        lastCheck: new Date().toISOString(),
        error: error.message
      }
    }

    return {
      name: 'Supabase Storage',
      status: latencyMs < 500 ? 'healthy' : 'degraded',
      latencyMs,
      lastCheck: new Date().toISOString()
    }
  } catch (error: any) {
    return {
      name: 'Supabase Storage',
      status: 'down',
      latencyMs: Date.now() - startTime,
      lastCheck: new Date().toISOString(),
      error: error.message
    }
  }
}

/**
 * Get WebSocket connection metrics
 * Note: This requires access to the Socket.IO server instance
 */
export function getWebSocketMetrics(io?: any): WebSocketMetrics {
  if (!io) {
    return {
      totalConnections: 0,
      dashboardConnections: 0,
      portalConnections: 0
    }
  }

  try {
    // Get total connected sockets
    const totalConnections = io.sockets?.sockets?.size || 0

    // Get namespace-specific connections if available
    const dashboardNamespace = io.of?.('/dashboard')
    const portalNamespace = io.of?.('/portal')

    return {
      totalConnections,
      dashboardConnections: dashboardNamespace?.sockets?.size || 0,
      portalConnections: portalNamespace?.sockets?.size || 0
    }
  } catch (error) {
    console.error('[HealthMonitor] Error getting WebSocket metrics:', error)
    return {
      totalConnections: 0,
      dashboardConnections: 0,
      portalConnections: 0
    }
  }
}

/**
 * Get comprehensive system metrics
 */
export async function getSystemMetrics(io?: any): Promise<SystemMetrics> {
  const [dbHealth] = await Promise.all([
    checkDatabaseHealth()
  ])

  return {
    memory: getMemoryMetrics(),
    api: getAPIMetrics(),
    database: dbHealth,
    websocket: getWebSocketMetrics(io),
    uptime: process.uptime(),
    nodeVersion: process.version,
    platform: process.platform,
    timestamp: new Date().toISOString()
  }
}

/**
 * Get all service health checks
 */
export async function getAllServiceHealth(): Promise<ServiceHealth[]> {
  const [dbHealth, authHealth, storageHealth] = await Promise.all([
    checkDatabaseHealth(),
    checkAuthHealth(),
    checkStorageHealth()
  ])

  return [
    {
      name: 'Database',
      status: dbHealth.status,
      latencyMs: dbHealth.latencyMs,
      lastCheck: dbHealth.lastCheck
    },
    authHealth,
    storageHealth
  ]
}

/**
 * Express middleware to track API latency
 */
export function latencyTrackingMiddleware() {
  return (req: any, res: any, next: any) => {
    const startTime = Date.now()

    // Hook into response finish event
    res.on('finish', () => {
      const latencyMs = Date.now() - startTime
      const endpoint = req.route?.path || req.path || req.url

      recordAPILatency(
        endpoint,
        req.method,
        latencyMs,
        res.statusCode
      )
    })

    next()
  }
}

/**
 * Get metrics for admin dashboard
 */
export async function getDashboardMetrics(io?: any): Promise<{
  system: SystemMetrics
  services: ServiceHealth[]
  recentErrors: number
}> {
  const [system, services] = await Promise.all([
    getSystemMetrics(io),
    getAllServiceHealth()
  ])

  // Get recent error count from error_logs table (last 24 hours)
  let recentErrors = 0
  try {
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)

    const { count } = await supabase
      .from('error_logs')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', yesterday.toISOString())
      .in('severity', ['error', 'critical'])

    recentErrors = count || 0
  } catch (error) {
    console.error('[HealthMonitor] Error fetching error count:', error)
  }

  return {
    system,
    services,
    recentErrors
  }
}

/**
 * Format bytes to human readable string
 */
export function formatBytes(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB']
  let unitIndex = 0
  let value = bytes

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024
    unitIndex++
  }

  return `${value.toFixed(2)} ${units[unitIndex]}`
}

/**
 * Format uptime to human readable string
 */
export function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400)
  const hours = Math.floor((seconds % 86400) / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)

  const parts = []
  if (days > 0) parts.push(`${days}d`)
  if (hours > 0) parts.push(`${hours}h`)
  if (minutes > 0) parts.push(`${minutes}m`)
  if (secs > 0 || parts.length === 0) parts.push(`${secs}s`)

  return parts.join(' ')
}

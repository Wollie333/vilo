import { Router, Response } from 'express'
import { supabase } from '../../lib/supabase.js'
import { SuperAdminRequest, requirePermission } from '../../middleware/superAdmin.js'
import {
  getSystemMetrics,
  getAllServiceHealth,
  getDashboardMetrics,
  getAPIMetrics,
  getMemoryMetrics,
  formatBytes as formatBytesUtil,
  formatUptime as formatUptimeUtil
} from '../../services/healthMonitoringService.js'

const router = Router()

interface HealthCheck {
  service: string
  status: 'healthy' | 'degraded' | 'down' | 'unknown'
  latency?: number
  message?: string
  lastChecked: string
}

/**
 * GET /api/admin/health
 * Get overall system health status
 */
router.get('/', requirePermission('analytics'), async (req: SuperAdminRequest, res: Response) => {
  try {
    const checks: HealthCheck[] = []

    // Check Supabase/Database
    const dbStart = Date.now()
    try {
      const { error } = await supabase.from('tenants').select('id').limit(1)
      checks.push({
        service: 'database',
        status: error ? 'down' : 'healthy',
        latency: Date.now() - dbStart,
        message: error?.message,
        lastChecked: new Date().toISOString()
      })
    } catch (err) {
      checks.push({
        service: 'database',
        status: 'down',
        latency: Date.now() - dbStart,
        message: err instanceof Error ? err.message : 'Unknown error',
        lastChecked: new Date().toISOString()
      })
    }

    // Check Supabase Auth
    const authStart = Date.now()
    try {
      const { error } = await supabase.auth.getSession()
      checks.push({
        service: 'auth',
        status: error ? 'degraded' : 'healthy',
        latency: Date.now() - authStart,
        message: error?.message,
        lastChecked: new Date().toISOString()
      })
    } catch (err) {
      checks.push({
        service: 'auth',
        status: 'down',
        latency: Date.now() - authStart,
        message: err instanceof Error ? err.message : 'Unknown error',
        lastChecked: new Date().toISOString()
      })
    }

    // Check payment gateways
    const { data: gateways } = await supabase
      .from('platform_payment_gateways')
      .select('gateway_name, is_enabled, health_status, last_health_check')
      .eq('is_enabled', true)

    gateways?.forEach(gateway => {
      checks.push({
        service: `payment_${gateway.gateway_name}`,
        status: gateway.health_status || 'unknown',
        message: gateway.is_enabled ? 'Enabled' : 'Disabled',
        lastChecked: gateway.last_health_check || new Date().toISOString()
      })
    })

    // Get recent error rate
    const oneHourAgo = new Date()
    oneHourAgo.setHours(oneHourAgo.getHours() - 1)

    const { count: recentErrors } = await supabase
      .from('error_logs')
      .select('*', { count: 'exact', head: true })
      .gte('occurred_at', oneHourAgo.toISOString())
      .in('severity', ['error', 'critical'])

    // Determine overall status
    const hasDown = checks.some(c => c.status === 'down')
    const hasDegraded = checks.some(c => c.status === 'degraded')
    const overallStatus = hasDown ? 'down' : hasDegraded ? 'degraded' : 'healthy'

    res.json({
      status: overallStatus,
      checks,
      metrics: {
        recentErrors: recentErrors || 0,
        errorThreshold: 100 // Alert if above this
      },
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Health check error:', error)
    res.status(500).json({
      status: 'down',
      error: 'Health check failed',
      timestamp: new Date().toISOString()
    })
  }
})

/**
 * GET /api/admin/health/metrics
 * Get system performance metrics
 */
router.get('/metrics', requirePermission('analytics'), async (req: SuperAdminRequest, res: Response) => {
  try {
    const days = parseInt(req.query.days as string) || 7

    // Get daily metrics
    const { data: dailyMetrics } = await supabase
      .from('platform_metrics_daily')
      .select('*')
      .order('metric_date', { ascending: false })
      .limit(days)

    // Get current counts
    const { count: totalTenants } = await supabase
      .from('tenants')
      .select('*', { count: 'exact', head: true })

    const { count: totalUsers } = await supabase
      .from('tenant_members')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active')

    const { count: totalBookings } = await supabase
      .from('bookings')
      .select('*', { count: 'exact', head: true })

    // Get today's metrics
    const today = new Date().toISOString().split('T')[0]
    const { count: todayErrors } = await supabase
      .from('error_logs')
      .select('*', { count: 'exact', head: true })
      .gte('occurred_at', today)

    res.json({
      current: {
        totalTenants: totalTenants || 0,
        totalUsers: totalUsers || 0,
        totalBookings: totalBookings || 0,
        todayErrors: todayErrors || 0
      },
      history: dailyMetrics?.map(m => ({
        date: m.metric_date,
        tenants: m.total_tenants,
        activeTenants: m.active_tenants,
        newTenants: m.new_tenants,
        users: m.total_users,
        activeUsers: m.active_users,
        bookings: m.total_bookings,
        revenue: m.total_revenue,
        errors: m.error_count,
        avgResponseTime: m.avg_response_time_ms
      })) || []
    })
  } catch (error) {
    console.error('Get metrics error:', error)
    res.status(500).json({ error: 'Failed to get metrics' })
  }
})

/**
 * GET /api/admin/health/uptime
 * Get service uptime information
 */
router.get('/uptime', requirePermission('analytics'), async (req: SuperAdminRequest, res: Response) => {
  try {
    // Calculate uptime based on error patterns
    const days30 = new Date()
    days30.setDate(days30.getDate() - 30)

    const { data: errors } = await supabase
      .from('error_logs')
      .select('occurred_at, severity')
      .gte('occurred_at', days30.toISOString())
      .eq('severity', 'critical')

    // Calculate approximate uptime (simplified)
    const totalMinutes = 30 * 24 * 60
    const downMinutes = (errors?.length || 0) * 5 // Assume 5 min downtime per critical error
    const uptimePercent = ((totalMinutes - downMinutes) / totalMinutes) * 100

    res.json({
      uptime30Days: Math.max(0, Math.min(100, uptimePercent)).toFixed(2) + '%',
      criticalErrors30Days: errors?.length || 0,
      lastCriticalError: errors?.[0]?.occurred_at || null,
      serverStartTime: new Date(Date.now() - process.uptime() * 1000).toISOString(),
      currentUptime: formatUptime(process.uptime())
    })
  } catch (error) {
    console.error('Get uptime error:', error)
    res.status(500).json({ error: 'Failed to get uptime' })
  }
})

/**
 * POST /api/admin/health/check-payment/:gateway
 * Run health check on specific payment gateway
 */
router.post('/check-payment/:gateway', requirePermission('settings'), async (req: SuperAdminRequest, res: Response) => {
  try {
    const { gateway } = req.params

    // Get gateway config
    const { data: gatewayData, error } = await supabase
      .from('platform_payment_gateways')
      .select('*')
      .eq('gateway_name', gateway)
      .single()

    if (error || !gatewayData) {
      return res.status(404).json({ error: 'Payment gateway not found' })
    }

    // Simulate health check (in real implementation, you'd ping the actual gateway)
    const healthStatus = gatewayData.is_enabled ? 'healthy' : 'unknown'

    // Update health status
    await supabase
      .from('platform_payment_gateways')
      .update({
        health_status: healthStatus,
        last_health_check: new Date().toISOString()
      })
      .eq('gateway_name', gateway)

    res.json({
      gateway,
      status: healthStatus,
      checkedAt: new Date().toISOString(),
      message: `${gatewayData.display_name} is ${healthStatus}`
    })
  } catch (error) {
    console.error('Check payment gateway error:', error)
    res.status(500).json({ error: 'Failed to check payment gateway' })
  }
})

/**
 * GET /api/admin/health/storage
 * Get storage usage information
 */
router.get('/storage', requirePermission('analytics'), async (req: SuperAdminRequest, res: Response) => {
  try {
    // Get backup storage usage
    const { data: backups } = await supabase
      .from('backup_history')
      .select('size_bytes')
      .eq('status', 'completed')

    const backupStorage = backups?.reduce((sum, b) => sum + (b.size_bytes || 0), 0) || 0

    // Get metrics for storage usage from platform metrics
    const { data: latestMetrics } = await supabase
      .from('platform_metrics_daily')
      .select('total_storage_used_mb')
      .order('metric_date', { ascending: false })
      .limit(1)
      .single()

    res.json({
      backup: {
        usedBytes: backupStorage,
        usedFormatted: formatBytes(backupStorage)
      },
      platform: {
        usedMB: latestMetrics?.total_storage_used_mb || 0,
        usedFormatted: formatBytes((latestMetrics?.total_storage_used_mb || 0) * 1024 * 1024)
      }
    })
  } catch (error) {
    console.error('Get storage error:', error)
    res.status(500).json({ error: 'Failed to get storage info' })
  }
})

/**
 * GET /api/admin/health/system
 * Get detailed system metrics including memory, API latency, and service health
 */
router.get('/system', requirePermission('analytics'), async (req: SuperAdminRequest, res: Response) => {
  try {
    const metrics = await getSystemMetrics()
    const services = await getAllServiceHealth()

    res.json({
      system: {
        memory: {
          ...metrics.memory,
          heapUsedFormatted: formatBytesUtil(metrics.memory.heapUsed),
          heapTotalFormatted: formatBytesUtil(metrics.memory.heapTotal),
          rssFormatted: formatBytesUtil(metrics.memory.rss)
        },
        uptime: metrics.uptime,
        uptimeFormatted: formatUptimeUtil(metrics.uptime),
        nodeVersion: metrics.nodeVersion,
        platform: metrics.platform
      },
      api: metrics.api,
      services,
      timestamp: metrics.timestamp
    })
  } catch (error) {
    console.error('Get system metrics error:', error)
    res.status(500).json({ error: 'Failed to get system metrics' })
  }
})

/**
 * GET /api/admin/health/api-performance
 * Get API performance metrics (latency, error rate)
 */
router.get('/api-performance', requirePermission('analytics'), async (req: SuperAdminRequest, res: Response) => {
  try {
    const windowMinutes = parseInt(req.query.window as string) || 5
    const metrics = getAPIMetrics(windowMinutes)

    res.json({
      window: `${windowMinutes} minutes`,
      metrics,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Get API performance error:', error)
    res.status(500).json({ error: 'Failed to get API performance metrics' })
  }
})

/**
 * GET /api/admin/health/dashboard
 * Get consolidated health metrics for admin dashboard
 */
router.get('/dashboard', requirePermission('analytics'), async (req: SuperAdminRequest, res: Response) => {
  try {
    const dashboardMetrics = await getDashboardMetrics()

    res.json({
      ...dashboardMetrics,
      formatted: {
        memory: formatBytesUtil(dashboardMetrics.system.memory.heapUsed),
        uptime: formatUptimeUtil(dashboardMetrics.system.uptime)
      }
    })
  } catch (error) {
    console.error('Get dashboard metrics error:', error)
    res.status(500).json({ error: 'Failed to get dashboard metrics' })
  }
})

// Helper function to format uptime
function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400)
  const hours = Math.floor((seconds % 86400) / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)

  const parts = []
  if (days > 0) parts.push(`${days}d`)
  if (hours > 0) parts.push(`${hours}h`)
  if (minutes > 0) parts.push(`${minutes}m`)

  return parts.join(' ') || '< 1m'
}

// Helper function to format bytes
function formatBytes(bytes: number): string {
  if (!bytes) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

export default router

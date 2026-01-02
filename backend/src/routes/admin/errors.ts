import { Router, Response } from 'express'
import { supabase } from '../../lib/supabase.js'
import { SuperAdminRequest, requirePermission, logAdminAction, auditLog } from '../../middleware/superAdmin.js'

const router = Router()

/**
 * GET /api/admin/errors
 * List all error logs with filters and pagination
 */
router.get('/', requirePermission('errors'), async (req: SuperAdminRequest, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1
    const limit = parseInt(req.query.limit as string) || 50
    const severity = req.query.severity as string
    const errorType = req.query.type as string
    const status = req.query.status as string
    const tenantId = req.query.tenantId as string
    const search = req.query.search as string
    const startDate = req.query.startDate as string
    const endDate = req.query.endDate as string

    const offset = (page - 1) * limit

    // Build query
    let query = supabase
      .from('error_logs')
      .select(`
        *,
        tenants (id, business_name)
      `, { count: 'exact' })

    // Apply filters
    if (severity) {
      query = query.eq('severity', severity)
    }
    if (errorType) {
      query = query.eq('error_type', errorType)
    }
    if (status) {
      query = query.eq('status', status)
    }
    if (tenantId) {
      query = query.eq('tenant_id', tenantId)
    }
    if (search) {
      query = query.or(`message.ilike.%${search}%,error_code.ilike.%${search}%`)
    }
    if (startDate) {
      query = query.gte('occurred_at', startDate)
    }
    if (endDate) {
      query = query.lte('occurred_at', endDate)
    }

    // Sort and paginate
    query = query.order('occurred_at', { ascending: false })
    query = query.range(offset, offset + limit - 1)

    const { data: errors, count, error } = await query

    if (error) {
      console.error('List errors error:', error)
      return res.status(500).json({ error: 'Failed to list errors' })
    }

    // Transform data
    const transformedErrors = errors?.map(err => ({
      id: err.id,
      errorCode: err.error_code,
      errorType: err.error_type,
      severity: err.severity,
      status: err.status,
      message: err.message,
      endpoint: err.endpoint,
      httpMethod: err.http_method,
      tenantId: err.tenant_id,
      tenantName: err.tenants?.business_name,
      userId: err.user_id,
      occurredAt: err.occurred_at,
      sentryEventId: err.sentry_event_id,
      metadata: err.metadata
    })) || []

    res.json({
      errors: transformedErrors,
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit)
    })
  } catch (error) {
    console.error('List errors error:', error)
    res.status(500).json({ error: 'Failed to list errors' })
  }
})

/**
 * GET /api/admin/errors/stats
 * Get error statistics
 */
router.get('/stats', requirePermission('errors'), async (req: SuperAdminRequest, res: Response) => {
  try {
    const days = parseInt(req.query.days as string) || 7
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    // Get counts by severity
    const { data: bySeverity } = await supabase
      .from('error_logs')
      .select('severity')
      .gte('occurred_at', startDate.toISOString())

    const severityCounts = bySeverity?.reduce((acc: Record<string, number>, err) => {
      acc[err.severity] = (acc[err.severity] || 0) + 1
      return acc
    }, {}) || {}

    // Get counts by status
    const { data: byStatus } = await supabase
      .from('error_logs')
      .select('status')
      .gte('occurred_at', startDate.toISOString())

    const statusCounts = byStatus?.reduce((acc: Record<string, number>, err) => {
      acc[err.status] = (acc[err.status] || 0) + 1
      return acc
    }, {}) || {}

    // Get counts by type
    const { data: byType } = await supabase
      .from('error_logs')
      .select('error_type')
      .gte('occurred_at', startDate.toISOString())

    const typeCounts = byType?.reduce((acc: Record<string, number>, err) => {
      acc[err.error_type] = (acc[err.error_type] || 0) + 1
      return acc
    }, {}) || {}

    // Get unresolved count
    const { count: unresolvedCount } = await supabase
      .from('error_logs')
      .select('*', { count: 'exact', head: true })
      .in('status', ['new', 'acknowledged'])

    res.json({
      period: `${days} days`,
      bySeverity: severityCounts,
      byStatus: statusCounts,
      byType: typeCounts,
      unresolvedCount: unresolvedCount || 0,
      totalInPeriod: bySeverity?.length || 0
    })
  } catch (error) {
    console.error('Get error stats error:', error)
    res.status(500).json({ error: 'Failed to get error stats' })
  }
})

/**
 * GET /api/admin/errors/:id
 * Get single error details
 */
router.get('/:id', requirePermission('errors'), async (req: SuperAdminRequest, res: Response) => {
  try {
    const { id } = req.params

    const { data: errorLog, error } = await supabase
      .from('error_logs')
      .select(`
        *,
        tenants (id, business_name),
        super_admins!resolved_by (email, display_name)
      `)
      .eq('id', id)
      .single()

    if (error || !errorLog) {
      return res.status(404).json({ error: 'Error log not found' })
    }

    res.json({
      id: errorLog.id,
      errorCode: errorLog.error_code,
      errorType: errorLog.error_type,
      severity: errorLog.severity,
      status: errorLog.status,
      message: errorLog.message,
      stackTrace: errorLog.stack_trace,
      endpoint: errorLog.endpoint,
      httpMethod: errorLog.http_method,
      requestId: errorLog.request_id,
      metadata: errorLog.metadata,
      environment: errorLog.environment,
      serverInstance: errorLog.server_instance,
      tenant: errorLog.tenants ? {
        id: errorLog.tenants.id,
        name: errorLog.tenants.business_name
      } : null,
      userId: errorLog.user_id,
      occurredAt: errorLog.occurred_at,
      createdAt: errorLog.created_at,
      sentry: {
        eventId: errorLog.sentry_event_id,
        issueId: errorLog.sentry_issue_id
      },
      resolution: errorLog.resolved_at ? {
        resolvedBy: errorLog.super_admins?.display_name || errorLog.super_admins?.email,
        resolvedAt: errorLog.resolved_at,
        notes: errorLog.resolution_notes
      } : null
    })
  } catch (error) {
    console.error('Get error log error:', error)
    res.status(500).json({ error: 'Failed to get error log' })
  }
})

/**
 * POST /api/admin/errors/:id/acknowledge
 * Acknowledge an error
 */
router.post('/:id/acknowledge', requirePermission('errors'), auditLog('error.acknowledge', 'error_log'), async (req: SuperAdminRequest, res: Response) => {
  try {
    const { id } = req.params

    const { error } = await supabase
      .from('error_logs')
      .update({ status: 'acknowledged' })
      .eq('id', id)

    if (error) {
      return res.status(500).json({ error: 'Failed to acknowledge error' })
    }

    res.json({ success: true, message: 'Error acknowledged' })
  } catch (error) {
    console.error('Acknowledge error error:', error)
    res.status(500).json({ error: 'Failed to acknowledge error' })
  }
})

/**
 * POST /api/admin/errors/:id/resolve
 * Resolve an error
 */
router.post('/:id/resolve', requirePermission('errors'), auditLog('error.resolve', 'error_log'), async (req: SuperAdminRequest, res: Response) => {
  try {
    const { id } = req.params
    const { notes } = req.body

    const { error } = await supabase
      .from('error_logs')
      .update({
        status: 'resolved',
        resolved_by: req.superAdmin?.id,
        resolved_at: new Date().toISOString(),
        resolution_notes: notes
      })
      .eq('id', id)

    if (error) {
      return res.status(500).json({ error: 'Failed to resolve error' })
    }

    res.json({ success: true, message: 'Error resolved' })
  } catch (error) {
    console.error('Resolve error error:', error)
    res.status(500).json({ error: 'Failed to resolve error' })
  }
})

/**
 * POST /api/admin/errors/:id/ignore
 * Ignore an error
 */
router.post('/:id/ignore', requirePermission('errors'), auditLog('error.ignore', 'error_log'), async (req: SuperAdminRequest, res: Response) => {
  try {
    const { id } = req.params
    const { reason } = req.body

    const { error } = await supabase
      .from('error_logs')
      .update({
        status: 'ignored',
        resolution_notes: reason || 'Ignored by admin'
      })
      .eq('id', id)

    if (error) {
      return res.status(500).json({ error: 'Failed to ignore error' })
    }

    res.json({ success: true, message: 'Error ignored' })
  } catch (error) {
    console.error('Ignore error error:', error)
    res.status(500).json({ error: 'Failed to ignore error' })
  }
})

/**
 * POST /api/admin/errors/bulk-resolve
 * Bulk resolve multiple errors
 */
router.post('/bulk-resolve', requirePermission('errors'), async (req: SuperAdminRequest, res: Response) => {
  try {
    const { ids, notes } = req.body

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'No error IDs provided' })
    }

    const { error } = await supabase
      .from('error_logs')
      .update({
        status: 'resolved',
        resolved_by: req.superAdmin?.id,
        resolved_at: new Date().toISOString(),
        resolution_notes: notes || 'Bulk resolved by admin'
      })
      .in('id', ids)

    if (error) {
      return res.status(500).json({ error: 'Failed to bulk resolve errors' })
    }

    // Log the bulk action
    if (req.superAdmin) {
      await logAdminAction({
        adminId: req.superAdmin.id,
        adminEmail: req.superAdmin.email,
        action: 'error.bulk_resolve',
        resourceType: 'error_log',
        description: `Bulk resolved ${ids.length} errors`,
        metadata: { errorIds: ids, notes },
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      })
    }

    res.json({ success: true, message: `${ids.length} errors resolved` })
  } catch (error) {
    console.error('Bulk resolve error:', error)
    res.status(500).json({ error: 'Failed to bulk resolve errors' })
  }
})

/**
 * DELETE /api/admin/errors/cleanup
 * Delete old resolved errors
 */
router.delete('/cleanup', requirePermission('errors'), async (req: SuperAdminRequest, res: Response) => {
  try {
    const daysOld = parseInt(req.query.daysOld as string) || 30

    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - daysOld)

    const { count, error } = await supabase
      .from('error_logs')
      .delete({ count: 'exact' })
      .in('status', ['resolved', 'ignored'])
      .lt('occurred_at', cutoffDate.toISOString())

    if (error) {
      return res.status(500).json({ error: 'Failed to cleanup errors' })
    }

    // Log the cleanup action
    if (req.superAdmin) {
      await logAdminAction({
        adminId: req.superAdmin.id,
        adminEmail: req.superAdmin.email,
        action: 'error.cleanup',
        resourceType: 'error_log',
        description: `Cleaned up ${count} old error logs (${daysOld}+ days old)`,
        metadata: { daysOld, deletedCount: count },
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      })
    }

    res.json({ success: true, deletedCount: count || 0 })
  } catch (error) {
    console.error('Cleanup errors error:', error)
    res.status(500).json({ error: 'Failed to cleanup errors' })
  }
})

export default router

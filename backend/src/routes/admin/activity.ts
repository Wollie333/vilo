import { Router, Response } from 'express'
import { supabase } from '../../lib/supabase.js'
import { SuperAdminRequest, requirePermission } from '../../middleware/superAdmin.js'

const router = Router()

/**
 * GET /api/admin/activity
 * Get admin audit log / activity feed
 */
router.get('/', requirePermission('analytics'), async (req: SuperAdminRequest, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1
    const limit = parseInt(req.query.limit as string) || 50
    const action = req.query.action as string
    const resourceType = req.query.resourceType as string
    const adminId = req.query.adminId as string
    const startDate = req.query.startDate as string
    const endDate = req.query.endDate as string

    const offset = (page - 1) * limit

    // Build query
    let query = supabase
      .from('admin_audit_logs')
      .select(`
        *,
        super_admins (email, display_name)
      `, { count: 'exact' })

    // Apply filters
    if (action) {
      query = query.ilike('action', `%${action}%`)
    }
    if (resourceType) {
      query = query.eq('resource_type', resourceType)
    }
    if (adminId) {
      query = query.eq('admin_id', adminId)
    }
    if (startDate) {
      query = query.gte('created_at', startDate)
    }
    if (endDate) {
      query = query.lte('created_at', endDate)
    }

    // Sort and paginate
    query = query.order('created_at', { ascending: false })
    query = query.range(offset, offset + limit - 1)

    const { data: logs, count, error } = await query

    if (error) {
      console.error('Get activity error:', error)
      return res.status(500).json({ error: 'Failed to get activity' })
    }

    // Transform data
    const transformedLogs = logs?.map(log => ({
      id: log.id,
      action: log.action,
      resourceType: log.resource_type,
      resourceId: log.resource_id,
      description: log.description,
      changes: log.changes,
      metadata: log.metadata,
      admin: {
        id: log.admin_id,
        email: log.admin_email || log.super_admins?.email,
        name: log.super_admins?.display_name
      },
      ipAddress: log.ip_address,
      userAgent: log.user_agent,
      timestamp: log.created_at
    })) || []

    res.json({
      logs: transformedLogs,
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit)
    })
  } catch (error) {
    console.error('Get activity error:', error)
    res.status(500).json({ error: 'Failed to get activity' })
  }
})

/**
 * GET /api/admin/activity/actions
 * Get list of unique action types
 */
router.get('/actions', requirePermission('analytics'), async (req: SuperAdminRequest, res: Response) => {
  try {
    const { data: logs } = await supabase
      .from('admin_audit_logs')
      .select('action, resource_type')

    // Get unique actions and resource types
    const actions = [...new Set(logs?.map(l => l.action) || [])]
    const resourceTypes = [...new Set(logs?.map(l => l.resource_type) || [])]

    res.json({ actions, resourceTypes })
  } catch (error) {
    console.error('Get actions error:', error)
    res.status(500).json({ error: 'Failed to get actions' })
  }
})

/**
 * GET /api/admin/activity/stats
 * Get activity statistics
 */
router.get('/stats', requirePermission('analytics'), async (req: SuperAdminRequest, res: Response) => {
  try {
    const days = parseInt(req.query.days as string) || 7
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    // Get activity by action type
    const { data: logs } = await supabase
      .from('admin_audit_logs')
      .select('action, resource_type, admin_id')
      .gte('created_at', startDate.toISOString())

    const byAction = logs?.reduce((acc: Record<string, number>, log) => {
      acc[log.action] = (acc[log.action] || 0) + 1
      return acc
    }, {}) || {}

    const byResourceType = logs?.reduce((acc: Record<string, number>, log) => {
      acc[log.resource_type] = (acc[log.resource_type] || 0) + 1
      return acc
    }, {}) || {}

    const byAdmin = logs?.reduce((acc: Record<string, number>, log) => {
      acc[log.admin_id] = (acc[log.admin_id] || 0) + 1
      return acc
    }, {}) || {}

    // Get most active admins
    const { data: admins } = await supabase
      .from('super_admins')
      .select('id, email, display_name')

    const adminMap = new Map(admins?.map(a => [a.id, a]) || [])

    const topAdmins = Object.entries(byAdmin)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([id, count]) => ({
        id,
        email: adminMap.get(id)?.email,
        name: adminMap.get(id)?.display_name,
        actionCount: count
      }))

    res.json({
      period: `${days} days`,
      totalActions: logs?.length || 0,
      byAction,
      byResourceType,
      topAdmins
    })
  } catch (error) {
    console.error('Get activity stats error:', error)
    res.status(500).json({ error: 'Failed to get activity stats' })
  }
})

/**
 * GET /api/admin/activity/timeline
 * Get activity timeline for charts
 */
router.get('/timeline', requirePermission('analytics'), async (req: SuperAdminRequest, res: Response) => {
  try {
    const days = parseInt(req.query.days as string) || 30
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    // Get all activity in date range
    const { data: logs } = await supabase
      .from('admin_audit_logs')
      .select('created_at')
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: true })

    // Group by date
    const byDate = logs?.reduce((acc: Record<string, number>, log) => {
      const date = log.created_at.split('T')[0]
      acc[date] = (acc[date] || 0) + 1
      return acc
    }, {}) || {}

    // Fill in missing dates
    const timeline = []
    const current = new Date(startDate)
    while (current <= new Date()) {
      const dateStr = current.toISOString().split('T')[0]
      timeline.push({
        date: dateStr,
        count: byDate[dateStr] || 0
      })
      current.setDate(current.getDate() + 1)
    }

    res.json({ timeline })
  } catch (error) {
    console.error('Get activity timeline error:', error)
    res.status(500).json({ error: 'Failed to get activity timeline' })
  }
})

/**
 * GET /api/admin/activity/resource/:type/:id
 * Get activity for a specific resource
 */
router.get('/resource/:type/:id', requirePermission('analytics'), async (req: SuperAdminRequest, res: Response) => {
  try {
    const { type, id } = req.params
    const limit = parseInt(req.query.limit as string) || 20

    const { data: logs, error } = await supabase
      .from('admin_audit_logs')
      .select(`
        *,
        super_admins (email, display_name)
      `)
      .eq('resource_type', type)
      .eq('resource_id', id)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      return res.status(500).json({ error: 'Failed to get resource activity' })
    }

    res.json({
      resourceType: type,
      resourceId: id,
      logs: logs?.map(log => ({
        id: log.id,
        action: log.action,
        description: log.description,
        changes: log.changes,
        admin: {
          email: log.admin_email || log.super_admins?.email,
          name: log.super_admins?.display_name
        },
        timestamp: log.created_at
      })) || []
    })
  } catch (error) {
    console.error('Get resource activity error:', error)
    res.status(500).json({ error: 'Failed to get resource activity' })
  }
})

/**
 * GET /api/admin/activity/admin/:id
 * Get activity for a specific admin
 */
router.get('/admin/:id', requirePermission('analytics'), async (req: SuperAdminRequest, res: Response) => {
  try {
    const { id } = req.params
    const page = parseInt(req.query.page as string) || 1
    const limit = parseInt(req.query.limit as string) || 50

    const offset = (page - 1) * limit

    const { data: logs, count, error } = await supabase
      .from('admin_audit_logs')
      .select('*', { count: 'exact' })
      .eq('admin_id', id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      return res.status(500).json({ error: 'Failed to get admin activity' })
    }

    res.json({
      adminId: id,
      logs: logs?.map(log => ({
        id: log.id,
        action: log.action,
        resourceType: log.resource_type,
        resourceId: log.resource_id,
        description: log.description,
        changes: log.changes,
        timestamp: log.created_at
      })) || [],
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit)
    })
  } catch (error) {
    console.error('Get admin activity error:', error)
    res.status(500).json({ error: 'Failed to get admin activity' })
  }
})

export default router

import { Router, Request, Response } from 'express'
import { supabase } from '../lib/supabase.js'
import { attachUserContext, requireAuth } from '../middleware/permissions.js'
import {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  getPreferences,
  updatePreferences,
  NotificationPreferences
} from '../services/notificationService.js'

const router = Router()

// Apply auth middleware to all routes
router.use(attachUserContext)

/**
 * Get member's tenant_member id from user context
 */
async function getMemberId(tenantId: string, userId: string): Promise<string | null> {
  // First check if owner
  const { data: tenant } = await supabase
    .from('tenants')
    .select('id, owner_user_id')
    .eq('id', tenantId)
    .eq('owner_user_id', userId)
    .maybeSingle()

  if (tenant) {
    // Owner - find or create their tenant_member record
    const { data: existingMember } = await supabase
      .from('tenant_members')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('user_id', userId)
      .maybeSingle()

    if (existingMember) {
      return existingMember.id
    }

    // Owner might not have a tenant_member record - that's ok for now
    // We'll handle owner notifications differently if needed
    return null
  }

  // Regular member
  const { data: member } = await supabase
    .from('tenant_members')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('user_id', userId)
    .eq('status', 'active')
    .maybeSingle()

  return member?.id || null
}

// ============================================
// DASHBOARD (ADMIN/STAFF) NOTIFICATION ROUTES
// ============================================

/**
 * GET /api/notifications
 * Get notifications for the current user
 */
router.get('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const { tenantId, userId } = req.userContext!
    const { limit = '20', offset = '0', unread_only } = req.query

    const memberId = await getMemberId(tenantId, userId)
    if (!memberId) {
      return res.json({ notifications: [], total: 0, unread: 0 })
    }

    const result = await getNotifications(tenantId, memberId, undefined, {
      limit: parseInt(limit as string),
      offset: parseInt(offset as string),
      unreadOnly: unread_only === 'true'
    })

    res.json(result)
  } catch (error: any) {
    console.error('Error fetching notifications:', error)
    res.status(500).json({ error: 'Failed to fetch notifications', details: error.message })
  }
})

/**
 * GET /api/notifications/unread-count
 * Get unread notification count for the current user
 */
router.get('/unread-count', requireAuth, async (req: Request, res: Response) => {
  try {
    const { tenantId, userId } = req.userContext!

    const memberId = await getMemberId(tenantId, userId)
    if (!memberId) {
      return res.json({ count: 0 })
    }

    const count = await getUnreadCount(tenantId, memberId)
    res.json({ count })
  } catch (error: any) {
    console.error('Error fetching unread count:', error)
    res.status(500).json({ error: 'Failed to fetch unread count', details: error.message })
  }
})

/**
 * POST /api/notifications/:id/read
 * Mark a notification as read
 */
router.post('/:id/read', requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const { tenantId, userId } = req.userContext!

    const memberId = await getMemberId(tenantId, userId)
    if (!memberId) {
      return res.status(403).json({ error: 'Not authorized' })
    }

    const success = await markAsRead(id, tenantId, memberId)
    if (!success) {
      return res.status(404).json({ error: 'Notification not found' })
    }

    res.json({ success: true })
  } catch (error: any) {
    console.error('Error marking notification as read:', error)
    res.status(500).json({ error: 'Failed to mark as read', details: error.message })
  }
})

/**
 * POST /api/notifications/read-all
 * Mark all notifications as read for current user
 */
router.post('/read-all', requireAuth, async (req: Request, res: Response) => {
  try {
    const { tenantId, userId } = req.userContext!

    const memberId = await getMemberId(tenantId, userId)
    if (!memberId) {
      return res.status(403).json({ error: 'Not authorized' })
    }

    const success = await markAllAsRead(tenantId, memberId)
    res.json({ success })
  } catch (error: any) {
    console.error('Error marking all as read:', error)
    res.status(500).json({ error: 'Failed to mark all as read', details: error.message })
  }
})

/**
 * GET /api/notifications/preferences
 * Get notification preferences for current user
 */
router.get('/preferences', requireAuth, async (req: Request, res: Response) => {
  try {
    const { tenantId, userId } = req.userContext!

    const memberId = await getMemberId(tenantId, userId)
    if (!memberId) {
      return res.json({
        bookings: true,
        payments: true,
        reviews: true,
        support: true,
        system: true
      })
    }

    const preferences = await getPreferences(tenantId, memberId)
    res.json(preferences)
  } catch (error: any) {
    console.error('Error fetching preferences:', error)
    res.status(500).json({ error: 'Failed to fetch preferences', details: error.message })
  }
})

/**
 * PUT /api/notifications/preferences
 * Update notification preferences for current user
 */
router.put('/preferences', requireAuth, async (req: Request, res: Response) => {
  try {
    const { tenantId, userId } = req.userContext!
    const preferences = req.body as Partial<NotificationPreferences>

    const memberId = await getMemberId(tenantId, userId)
    if (!memberId) {
      return res.status(403).json({ error: 'Not authorized' })
    }

    const success = await updatePreferences(tenantId, preferences, memberId)
    if (!success) {
      return res.status(500).json({ error: 'Failed to update preferences' })
    }

    // Return updated preferences
    const updated = await getPreferences(tenantId, memberId)
    res.json(updated)
  } catch (error: any) {
    console.error('Error updating preferences:', error)
    res.status(500).json({ error: 'Failed to update preferences', details: error.message })
  }
})

export default router

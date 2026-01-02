import { Router, Response } from 'express'
import { supabase } from '../../lib/supabase.js'
import { SuperAdminRequest, logAdminAction } from '../../middleware/superAdmin.js'

const router = Router()

/**
 * GET /api/admin/announcements
 * List all announcements
 */
router.get('/', async (req: SuperAdminRequest, res: Response) => {
  try {
    const { data: announcements, error } = await supabase
      .from('announcements')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error

    const formatted = (announcements || []).map(a => ({
      id: a.id,
      type: a.type,
      title: a.title,
      content: a.content,
      status: a.status,
      targetAudience: a.target_audience,
      targetPlans: a.target_plans,
      startsAt: a.starts_at,
      endsAt: a.ends_at,
      dismissible: a.dismissible,
      createdAt: a.created_at,
    }))

    res.json(formatted)
  } catch (error) {
    console.error('List announcements error:', error)
    res.status(500).json({ error: 'Failed to fetch announcements' })
  }
})

/**
 * POST /api/admin/announcements
 * Create a new announcement
 */
router.post('/', async (req: SuperAdminRequest, res: Response) => {
  try {
    const {
      type,
      title,
      content,
      status,
      targetAudience,
      targetPlans,
      startsAt,
      endsAt,
      dismissible,
    } = req.body

    const { data, error } = await supabase
      .from('announcements')
      .insert({
        type,
        title,
        content,
        status: status || 'draft',
        target_audience: targetAudience || 'all',
        target_plans: targetPlans,
        starts_at: startsAt,
        ends_at: endsAt,
        dismissible: dismissible ?? true,
      })
      .select()
      .single()

    if (error) throw error

    await logAdminAction({
      adminId: req.superAdmin!.id,
      adminEmail: req.superAdmin!.email,
      action: 'announcement.create',
      resourceType: 'announcement',
      resourceId: data.id,
      description: `Created announcement: ${title}`,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    })

    res.status(201).json({
      id: data.id,
      type: data.type,
      title: data.title,
      content: data.content,
      status: data.status,
      targetAudience: data.target_audience,
      targetPlans: data.target_plans,
      startsAt: data.starts_at,
      endsAt: data.ends_at,
      dismissible: data.dismissible,
      createdAt: data.created_at,
    })
  } catch (error) {
    console.error('Create announcement error:', error)
    res.status(500).json({ error: 'Failed to create announcement' })
  }
})

/**
 * PATCH /api/admin/announcements/:id
 * Update an announcement
 */
router.patch('/:id', async (req: SuperAdminRequest, res: Response) => {
  try {
    const { id } = req.params
    const {
      title,
      content,
      status,
      targetAudience,
      targetPlans,
      startsAt,
      endsAt,
      dismissible,
    } = req.body

    const updates: Record<string, any> = { updated_at: new Date().toISOString() }
    if (title !== undefined) updates.title = title
    if (content !== undefined) updates.content = content
    if (status !== undefined) updates.status = status
    if (targetAudience !== undefined) updates.target_audience = targetAudience
    if (targetPlans !== undefined) updates.target_plans = targetPlans
    if (startsAt !== undefined) updates.starts_at = startsAt
    if (endsAt !== undefined) updates.ends_at = endsAt
    if (dismissible !== undefined) updates.dismissible = dismissible

    const { data, error } = await supabase
      .from('announcements')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    await logAdminAction({
      adminId: req.superAdmin!.id,
      adminEmail: req.superAdmin!.email,
      action: 'announcement.update',
      resourceType: 'announcement',
      resourceId: id,
      description: `Updated announcement: ${data.title}`,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    })

    res.json({
      id: data.id,
      type: data.type,
      title: data.title,
      content: data.content,
      status: data.status,
      targetAudience: data.target_audience,
      targetPlans: data.target_plans,
      startsAt: data.starts_at,
      endsAt: data.ends_at,
      dismissible: data.dismissible,
      createdAt: data.created_at,
    })
  } catch (error) {
    console.error('Update announcement error:', error)
    res.status(500).json({ error: 'Failed to update announcement' })
  }
})

/**
 * DELETE /api/admin/announcements/:id
 * Delete an announcement
 */
router.delete('/:id', async (req: SuperAdminRequest, res: Response) => {
  try {
    const { id } = req.params

    const { error } = await supabase
      .from('announcements')
      .delete()
      .eq('id', id)

    if (error) throw error

    await logAdminAction({
      adminId: req.superAdmin!.id,
      adminEmail: req.superAdmin!.email,
      action: 'announcement.delete',
      resourceType: 'announcement',
      resourceId: id,
      description: 'Deleted announcement',
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    })

    res.json({ success: true })
  } catch (error) {
    console.error('Delete announcement error:', error)
    res.status(500).json({ error: 'Failed to delete announcement' })
  }
})

export default router

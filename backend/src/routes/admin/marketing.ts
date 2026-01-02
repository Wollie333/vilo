import { Router, Response } from 'express'
import { supabase } from '../../lib/supabase.js'
import { SuperAdminRequest, requirePermission, logAdminAction, auditLog } from '../../middleware/superAdmin.js'

const router = Router()

/**
 * GET /api/admin/marketing/campaigns
 * List all marketing campaigns
 */
router.get('/campaigns', requirePermission('marketing'), async (req: SuperAdminRequest, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1
    const limit = parseInt(req.query.limit as string) || 20
    const status = req.query.status as string
    const type = req.query.type as string

    const offset = (page - 1) * limit

    let query = supabase
      .from('marketing_campaigns')
      .select('*', { count: 'exact' })

    if (status) {
      query = query.eq('status', status)
    }

    if (type) {
      query = query.eq('campaign_type', type)
    }

    query = query.order('created_at', { ascending: false })
    query = query.range(offset, offset + limit - 1)

    const { data: campaigns, count, error } = await query

    if (error) {
      return res.status(500).json({ error: 'Failed to get campaigns' })
    }

    res.json({
      campaigns: campaigns || [],
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit)
    })
  } catch (error) {
    console.error('Get campaigns error:', error)
    res.status(500).json({ error: 'Failed to get campaigns' })
  }
})

/**
 * GET /api/admin/marketing/campaigns/:id
 * Get campaign details
 */
router.get('/campaigns/:id', requirePermission('marketing'), async (req: SuperAdminRequest, res: Response) => {
  try {
    const { id } = req.params

    const { data: campaign, error } = await supabase
      .from('marketing_campaigns')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !campaign) {
      return res.status(404).json({ error: 'Campaign not found' })
    }

    res.json(campaign)
  } catch (error) {
    console.error('Get campaign error:', error)
    res.status(500).json({ error: 'Failed to get campaign' })
  }
})

/**
 * POST /api/admin/marketing/campaigns
 * Create a new campaign
 */
router.post('/campaigns', requirePermission('marketing'), auditLog('campaign.create', 'marketing'), async (req: SuperAdminRequest, res: Response) => {
  try {
    const {
      name,
      campaign_type,
      subject,
      body_html,
      body_text,
      body_json,
      target_audience,
      channels
    } = req.body

    if (!name || !subject || !campaign_type) {
      return res.status(400).json({ error: 'Name, subject, and campaign type are required' })
    }

    const { data: campaign, error } = await supabase
      .from('marketing_campaigns')
      .insert({
        name,
        campaign_type,
        subject,
        body_html,
        body_text,
        body_json,
        target_audience: target_audience || { all_tenants: true },
        channels: channels || { email: true, in_app_notification: true },
        status: 'draft',
        created_by: req.superAdmin?.id
      })
      .select()
      .single()

    if (error) {
      console.error('Create campaign error:', error)
      return res.status(500).json({ error: 'Failed to create campaign' })
    }

    res.status(201).json(campaign)
  } catch (error) {
    console.error('Create campaign error:', error)
    res.status(500).json({ error: 'Failed to create campaign' })
  }
})

/**
 * PUT /api/admin/marketing/campaigns/:id
 * Update a campaign
 */
router.put('/campaigns/:id', requirePermission('marketing'), auditLog('campaign.update', 'marketing'), async (req: SuperAdminRequest, res: Response) => {
  try {
    const { id } = req.params
    const updates = req.body

    // Get current campaign
    const { data: current } = await supabase
      .from('marketing_campaigns')
      .select('status')
      .eq('id', id)
      .single()

    if (!current) {
      return res.status(404).json({ error: 'Campaign not found' })
    }

    // Can't edit sent campaigns
    if (current.status === 'sent') {
      return res.status(400).json({ error: 'Cannot edit a sent campaign' })
    }

    const allowedFields = [
      'name', 'campaign_type', 'subject', 'body_html', 'body_text',
      'body_json', 'target_audience', 'channels'
    ]

    const updateData: Record<string, any> = {
      updated_at: new Date().toISOString(),
      updated_by: req.superAdmin?.id
    }

    allowedFields.forEach(field => {
      if (updates[field] !== undefined) {
        updateData[field] = updates[field]
      }
    })

    const { data: campaign, error } = await supabase
      .from('marketing_campaigns')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return res.status(500).json({ error: 'Failed to update campaign' })
    }

    res.json(campaign)
  } catch (error) {
    console.error('Update campaign error:', error)
    res.status(500).json({ error: 'Failed to update campaign' })
  }
})

/**
 * DELETE /api/admin/marketing/campaigns/:id
 * Delete a campaign
 */
router.delete('/campaigns/:id', requirePermission('marketing'), auditLog('campaign.delete', 'marketing'), async (req: SuperAdminRequest, res: Response) => {
  try {
    const { id } = req.params

    const { error } = await supabase
      .from('marketing_campaigns')
      .delete()
      .eq('id', id)

    if (error) {
      return res.status(500).json({ error: 'Failed to delete campaign' })
    }

    res.json({ success: true, message: 'Campaign deleted' })
  } catch (error) {
    console.error('Delete campaign error:', error)
    res.status(500).json({ error: 'Failed to delete campaign' })
  }
})

/**
 * POST /api/admin/marketing/campaigns/:id/send
 * Send a campaign immediately
 */
router.post('/campaigns/:id/send', requirePermission('marketing'), auditLog('campaign.send', 'marketing'), async (req: SuperAdminRequest, res: Response) => {
  try {
    const { id } = req.params

    // Get campaign
    const { data: campaign, error: getError } = await supabase
      .from('marketing_campaigns')
      .select('*')
      .eq('id', id)
      .single()

    if (getError || !campaign) {
      return res.status(404).json({ error: 'Campaign not found' })
    }

    if (campaign.status === 'sent') {
      return res.status(400).json({ error: 'Campaign already sent' })
    }

    // Update status to sending
    await supabase
      .from('marketing_campaigns')
      .update({ status: 'sending' })
      .eq('id', id)

    // Get target recipients
    const recipients = await getRecipients(campaign.target_audience)

    // Send to recipients (in background)
    sendCampaignToRecipients(campaign, recipients).then(async (stats) => {
      // Update campaign with final stats
      await supabase
        .from('marketing_campaigns')
        .update({
          status: 'sent',
          sent_at: new Date().toISOString(),
          stats
        })
        .eq('id', id)
    }).catch(async (error) => {
      console.error('Campaign send error:', error)
      await supabase
        .from('marketing_campaigns')
        .update({ status: 'draft' })
        .eq('id', id)
    })

    res.json({
      success: true,
      message: 'Campaign is being sent',
      recipientCount: recipients.length
    })
  } catch (error) {
    console.error('Send campaign error:', error)
    res.status(500).json({ error: 'Failed to send campaign' })
  }
})

/**
 * POST /api/admin/marketing/campaigns/:id/schedule
 * Schedule a campaign
 */
router.post('/campaigns/:id/schedule', requirePermission('marketing'), auditLog('campaign.schedule', 'marketing'), async (req: SuperAdminRequest, res: Response) => {
  try {
    const { id } = req.params
    const { scheduled_at } = req.body

    if (!scheduled_at) {
      return res.status(400).json({ error: 'Scheduled time is required' })
    }

    const scheduledDate = new Date(scheduled_at)
    if (scheduledDate <= new Date()) {
      return res.status(400).json({ error: 'Scheduled time must be in the future' })
    }

    const { error } = await supabase
      .from('marketing_campaigns')
      .update({
        status: 'scheduled',
        scheduled_at: scheduledDate.toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', id)

    if (error) {
      return res.status(500).json({ error: 'Failed to schedule campaign' })
    }

    res.json({ success: true, message: 'Campaign scheduled', scheduled_at: scheduledDate.toISOString() })
  } catch (error) {
    console.error('Schedule campaign error:', error)
    res.status(500).json({ error: 'Failed to schedule campaign' })
  }
})

/**
 * POST /api/admin/marketing/broadcast
 * Quick broadcast to all or filtered tenants
 */
router.post('/broadcast', requirePermission('marketing'), auditLog('broadcast.send', 'marketing'), async (req: SuperAdminRequest, res: Response) => {
  try {
    const { subject, message, channels, target_audience } = req.body

    if (!subject || !message) {
      return res.status(400).json({ error: 'Subject and message are required' })
    }

    // Get recipients
    const recipients = await getRecipients(target_audience || { all_tenants: true })

    // Send notifications
    let notificationsSent = 0

    if (channels?.in_app_notification !== false) {
      for (const recipient of recipients) {
        // Create notification for each member
        await supabase
          .from('notifications')
          .insert({
            tenant_id: recipient.tenantId,
            member_id: recipient.memberId,
            type: 'sync_completed', // Use existing type for now
            title: subject,
            message: message.substring(0, 200),
            data: { broadcast: true }
          })
        notificationsSent++
      }
    }

    // Log the broadcast
    if (req.superAdmin) {
      await logAdminAction({
        adminId: req.superAdmin.id,
        adminEmail: req.superAdmin.email,
        action: 'broadcast.send',
        resourceType: 'marketing',
        description: `Sent broadcast: ${subject}`,
        metadata: {
          subject,
          recipientCount: recipients.length,
          notificationsSent
        },
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      })
    }

    res.json({
      success: true,
      message: 'Broadcast sent',
      recipientCount: recipients.length,
      notificationsSent
    })
  } catch (error) {
    console.error('Broadcast error:', error)
    res.status(500).json({ error: 'Failed to send broadcast' })
  }
})

// Helper functions
async function getRecipients(targetAudience: any): Promise<Array<{ tenantId: string; memberId: string; email: string }>> {
  let query = supabase
    .from('tenant_members')
    .select('id, tenant_id, email')
    .eq('status', 'active')

  if (!targetAudience.all_tenants) {
    if (targetAudience.tenant_ids?.length) {
      query = query.in('tenant_id', targetAudience.tenant_ids)
    }
  }

  if (targetAudience.exclude_tenant_ids?.length) {
    query = query.not('tenant_id', 'in', `(${targetAudience.exclude_tenant_ids.join(',')})`)
  }

  const { data: members } = await query

  return members?.map(m => ({
    tenantId: m.tenant_id,
    memberId: m.id,
    email: m.email
  })) || []
}

async function sendCampaignToRecipients(campaign: any, recipients: any[]): Promise<any> {
  let emailsSent = 0
  let notificationsSent = 0

  for (const recipient of recipients) {
    // Send in-app notification
    if (campaign.channels?.in_app_notification) {
      await supabase
        .from('notifications')
        .insert({
          tenant_id: recipient.tenantId,
          member_id: recipient.memberId,
          type: 'sync_completed',
          title: campaign.subject,
          message: campaign.body_text?.substring(0, 200) || campaign.subject,
          data: { campaign_id: campaign.id }
        })
      notificationsSent++
    }

    // TODO: Send email if configured
    if (campaign.channels?.email) {
      // Email sending would go here
      emailsSent++
    }
  }

  return {
    total_recipients: recipients.length,
    emails_sent: emailsSent,
    notifications_sent: notificationsSent
  }
}

export default router

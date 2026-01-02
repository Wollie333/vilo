import { Router, Response } from 'express'
import { supabase } from '../../lib/supabase.js'
import { SuperAdminRequest, requirePermission, logAdminAction, auditLog } from '../../middleware/superAdmin.js'

const router = Router()

/**
 * GET /api/admin/subscriptions
 * List all subscriptions with filters
 */
router.get('/', requirePermission('plans'), async (req: SuperAdminRequest, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1
    const limit = parseInt(req.query.limit as string) || 20
    const status = req.query.status as string
    const planId = req.query.plan_id as string

    const offset = (page - 1) * limit

    let query = supabase
      .from('tenant_subscriptions')
      .select(`
        *,
        tenants (id, business_name, business_email),
        subscription_plans (id, name, slug, price_monthly, price_yearly)
      `, { count: 'exact' })

    if (status) {
      query = query.eq('status', status)
    }

    if (planId) {
      query = query.eq('plan_id', planId)
    }

    query = query.order('created_at', { ascending: false })
    query = query.range(offset, offset + limit - 1)

    const { data: subscriptions, count, error } = await query

    if (error) {
      return res.status(500).json({ error: 'Failed to get subscriptions' })
    }

    const transformedSubs = subscriptions?.map((sub: any) => ({
      id: sub.id,
      tenantId: sub.tenant_id,
      tenantName: sub.tenants?.business_name,
      tenantEmail: sub.tenants?.business_email,
      planId: sub.plan_id,
      planName: sub.subscription_plans?.name,
      planSlug: sub.subscription_plans?.slug,
      status: sub.status,
      billingCycle: sub.billing_cycle,
      priceMonthly: sub.subscription_plans?.price_monthly,
      priceYearly: sub.subscription_plans?.price_yearly,
      currentPeriodStart: sub.current_period_start,
      currentPeriodEnd: sub.current_period_end,
      trialStart: sub.trial_start,
      trialEnd: sub.trial_end,
      cancelledAt: sub.cancelled_at,
      cancellationReason: sub.cancellation_reason,
      paymentProvider: sub.payment_provider,
      createdAt: sub.created_at
    })) || []

    res.json({
      subscriptions: transformedSubs,
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit)
    })
  } catch (error) {
    console.error('Get subscriptions error:', error)
    res.status(500).json({ error: 'Failed to get subscriptions' })
  }
})

/**
 * GET /api/admin/subscriptions/:id
 * Get subscription details
 */
router.get('/:id', requirePermission('plans'), async (req: SuperAdminRequest, res: Response) => {
  try {
    const { id } = req.params

    const { data: subscription, error } = await supabase
      .from('tenant_subscriptions')
      .select(`
        *,
        tenants (id, business_name, business_email, created_at),
        subscription_plans (*)
      `)
      .eq('id', id)
      .single()

    if (error || !subscription) {
      return res.status(404).json({ error: 'Subscription not found' })
    }

    res.json(subscription)
  } catch (error) {
    console.error('Get subscription error:', error)
    res.status(500).json({ error: 'Failed to get subscription' })
  }
})

/**
 * POST /api/admin/subscriptions
 * Create a subscription for a tenant
 */
router.post('/', requirePermission('plans'), auditLog('subscription.create', 'subscription'), async (req: SuperAdminRequest, res: Response) => {
  try {
    const { tenant_id, plan_id, billing_cycle, skip_trial } = req.body

    if (!tenant_id || !plan_id) {
      return res.status(400).json({ error: 'Tenant ID and Plan ID are required' })
    }

    // Check for existing active subscription
    const { data: existing } = await supabase
      .from('tenant_subscriptions')
      .select('id')
      .eq('tenant_id', tenant_id)
      .in('status', ['active', 'trial'])
      .single()

    if (existing) {
      return res.status(400).json({ error: 'Tenant already has an active subscription' })
    }

    // Get plan details
    const { data: plan } = await supabase
      .from('subscription_plans')
      .select('*')
      .eq('id', plan_id)
      .single()

    if (!plan) {
      return res.status(404).json({ error: 'Plan not found' })
    }

    // Calculate dates
    const now = new Date()
    const periodEnd = new Date(now)
    if (billing_cycle === 'yearly') {
      periodEnd.setFullYear(periodEnd.getFullYear() + 1)
    } else {
      periodEnd.setMonth(periodEnd.getMonth() + 1)
    }

    const trialEnd = !skip_trial && plan.trial_days > 0
      ? new Date(now.getTime() + plan.trial_days * 24 * 60 * 60 * 1000)
      : null

    const { data: subscription, error } = await supabase
      .from('tenant_subscriptions')
      .insert({
        tenant_id,
        plan_id,
        status: trialEnd ? 'trial' : 'active',
        billing_cycle: billing_cycle || 'monthly',
        current_period_start: now.toISOString(),
        current_period_end: periodEnd.toISOString(),
        trial_start: trialEnd ? now.toISOString() : null,
        trial_end: trialEnd?.toISOString() || null
      })
      .select()
      .single()

    if (error) {
      console.error('Create subscription error:', error)
      return res.status(500).json({ error: 'Failed to create subscription' })
    }

    // Log the action
    if (req.superAdmin) {
      await logAdminAction({
        adminId: req.superAdmin.id,
        adminEmail: req.superAdmin.email,
        action: 'subscription.create',
        resourceType: 'subscription',
        resourceId: subscription.id,
        description: `Created subscription for tenant ${tenant_id} on plan ${plan.name}`,
        metadata: { tenant_id, plan_id, billing_cycle },
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      })
    }

    res.status(201).json(subscription)
  } catch (error) {
    console.error('Create subscription error:', error)
    res.status(500).json({ error: 'Failed to create subscription' })
  }
})

/**
 * PATCH /api/admin/subscriptions/:id
 * Update a subscription (change plan, extend period, etc.)
 */
router.patch('/:id', requirePermission('plans'), auditLog('subscription.update', 'subscription'), async (req: SuperAdminRequest, res: Response) => {
  try {
    const { id } = req.params
    const { plan_id, billing_cycle, extend_days, status } = req.body

    // Get current subscription
    const { data: current } = await supabase
      .from('tenant_subscriptions')
      .select('*')
      .eq('id', id)
      .single()

    if (!current) {
      return res.status(404).json({ error: 'Subscription not found' })
    }

    const updates: Record<string, any> = { updated_at: new Date().toISOString() }
    const changes: Record<string, { old: any; new: any }> = {}

    if (plan_id && plan_id !== current.plan_id) {
      updates.plan_id = plan_id
      changes.plan_id = { old: current.plan_id, new: plan_id }
    }

    if (billing_cycle && billing_cycle !== current.billing_cycle) {
      updates.billing_cycle = billing_cycle
      changes.billing_cycle = { old: current.billing_cycle, new: billing_cycle }
    }

    if (status && status !== current.status) {
      updates.status = status
      changes.status = { old: current.status, new: status }
    }

    if (extend_days && extend_days > 0) {
      const currentEnd = new Date(current.current_period_end)
      currentEnd.setDate(currentEnd.getDate() + extend_days)
      updates.current_period_end = currentEnd.toISOString()
      changes.current_period_end = { old: current.current_period_end, new: updates.current_period_end }
    }

    const { data: subscription, error } = await supabase
      .from('tenant_subscriptions')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return res.status(500).json({ error: 'Failed to update subscription' })
    }

    // Log the action
    if (req.superAdmin && Object.keys(changes).length > 0) {
      await logAdminAction({
        adminId: req.superAdmin.id,
        adminEmail: req.superAdmin.email,
        action: 'subscription.update',
        resourceType: 'subscription',
        resourceId: id,
        description: 'Updated subscription',
        changes,
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      })
    }

    res.json(subscription)
  } catch (error) {
    console.error('Update subscription error:', error)
    res.status(500).json({ error: 'Failed to update subscription' })
  }
})

/**
 * POST /api/admin/subscriptions/:id/cancel
 * Cancel a subscription
 */
router.post('/:id/cancel', requirePermission('plans'), auditLog('subscription.cancel', 'subscription'), async (req: SuperAdminRequest, res: Response) => {
  try {
    const { id } = req.params
    const { reason, immediate } = req.body

    const updates: Record<string, any> = {
      cancellation_reason: reason || 'Cancelled by admin',
      cancelled_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    if (immediate) {
      updates.status = 'cancelled'
    } else {
      updates.cancel_at_period_end = true
    }

    const { error } = await supabase
      .from('tenant_subscriptions')
      .update(updates)
      .eq('id', id)

    if (error) {
      return res.status(500).json({ error: 'Failed to cancel subscription' })
    }

    // Log the action
    if (req.superAdmin) {
      await logAdminAction({
        adminId: req.superAdmin.id,
        adminEmail: req.superAdmin.email,
        action: 'subscription.cancel',
        resourceType: 'subscription',
        resourceId: id,
        description: `Cancelled subscription: ${reason || 'No reason provided'}`,
        metadata: { reason, immediate },
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      })
    }

    res.json({ success: true, message: immediate ? 'Subscription cancelled immediately' : 'Subscription will cancel at period end' })
  } catch (error) {
    console.error('Cancel subscription error:', error)
    res.status(500).json({ error: 'Failed to cancel subscription' })
  }
})

/**
 * POST /api/admin/subscriptions/:id/resume
 * Resume a cancelled subscription
 */
router.post('/:id/resume', requirePermission('plans'), auditLog('subscription.resume', 'subscription'), async (req: SuperAdminRequest, res: Response) => {
  try {
    const { id } = req.params

    const { error } = await supabase
      .from('tenant_subscriptions')
      .update({
        status: 'active',
        cancel_at_period_end: false,
        cancelled_at: null,
        cancellation_reason: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)

    if (error) {
      return res.status(500).json({ error: 'Failed to resume subscription' })
    }

    // Log the action
    if (req.superAdmin) {
      await logAdminAction({
        adminId: req.superAdmin.id,
        adminEmail: req.superAdmin.email,
        action: 'subscription.resume',
        resourceType: 'subscription',
        resourceId: id,
        description: 'Resumed cancelled subscription',
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      })
    }

    res.json({ success: true, message: 'Subscription resumed successfully' })
  } catch (error) {
    console.error('Resume subscription error:', error)
    res.status(500).json({ error: 'Failed to resume subscription' })
  }
})

/**
 * GET /api/admin/subscriptions/:id/events
 * Get subscription event history
 */
router.get('/:id/events', requirePermission('plans'), async (req: SuperAdminRequest, res: Response) => {
  try {
    const { id } = req.params
    const page = parseInt(req.query.page as string) || 1
    const limit = parseInt(req.query.limit as string) || 20
    const offset = (page - 1) * limit

    const { data: events, count, error } = await supabase
      .from('subscription_events')
      .select('*', { count: 'exact' })
      .eq('subscription_id', id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      return res.status(500).json({ error: 'Failed to get subscription events' })
    }

    const transformed = events?.map((event: any) => ({
      id: event.id,
      eventType: event.event_type,
      details: event.details,
      previousStatus: event.previous_status,
      newStatus: event.new_status,
      notificationSent: event.notification_sent,
      notificationType: event.notification_type,
      isAutomated: event.is_automated,
      triggeredBy: event.triggered_by,
      createdAt: event.created_at
    })) || []

    res.json({
      events: transformed,
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit)
    })
  } catch (error) {
    console.error('Get subscription events error:', error)
    res.status(500).json({ error: 'Failed to get subscription events' })
  }
})

/**
 * GET /api/admin/subscriptions/:id/usage
 * Get subscription usage vs limits
 */
router.get('/:id/usage', requirePermission('plans'), async (req: SuperAdminRequest, res: Response) => {
  try {
    const { id } = req.params

    // Get subscription with plan limits
    const { data: subscription, error: subError } = await supabase
      .from('tenant_subscriptions')
      .select(`
        tenant_id,
        usage_snapshot,
        subscription_plans (limits)
      `)
      .eq('id', id)
      .single()

    if (subError || !subscription) {
      return res.status(404).json({ error: 'Subscription not found' })
    }

    const tenantId = subscription.tenant_id
    const limits = (subscription.subscription_plans as any)?.limits || {}

    // Get actual usage from tenant data
    const [roomsResult, membersResult, bookingsResult] = await Promise.all([
      // Count rooms
      supabase
        .from('rooms')
        .select('id', { count: 'exact', head: true })
        .eq('tenant_id', tenantId),
      // Count team members
      supabase
        .from('tenant_members')
        .select('id', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
        .in('status', ['active', 'pending']),
      // Count bookings this month
      supabase
        .from('bookings')
        .select('id', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
        .gte('created_at', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString())
    ])

    const usage = {
      rooms: {
        current: roomsResult.count || 0,
        limit: limits.max_rooms || 5,
        percentage: Math.min(100, Math.round(((roomsResult.count || 0) / (limits.max_rooms || 5)) * 100))
      },
      teamMembers: {
        current: membersResult.count || 0,
        limit: limits.max_team_members || 3,
        percentage: Math.min(100, Math.round(((membersResult.count || 0) / (limits.max_team_members || 3)) * 100))
      },
      bookingsThisMonth: {
        current: bookingsResult.count || 0,
        limit: limits.max_bookings_per_month || 100,
        percentage: Math.min(100, Math.round(((bookingsResult.count || 0) / (limits.max_bookings_per_month || 100)) * 100))
      },
      storage: {
        current: subscription.usage_snapshot?.storage_used_mb || 0,
        limit: limits.max_storage_mb || 500,
        percentage: Math.min(100, Math.round(((subscription.usage_snapshot?.storage_used_mb || 0) / (limits.max_storage_mb || 500)) * 100))
      }
    }

    res.json({ usage, limits })
  } catch (error) {
    console.error('Get subscription usage error:', error)
    res.status(500).json({ error: 'Failed to get subscription usage' })
  }
})

/**
 * POST /api/admin/subscriptions/:id/change-plan
 * Change subscription plan
 */
router.post('/:id/change-plan', requirePermission('plans'), async (req: SuperAdminRequest, res: Response) => {
  try {
    const { id } = req.params
    const { planId, reason } = req.body

    if (!planId) {
      return res.status(400).json({ error: 'Plan ID is required' })
    }

    // Get current subscription
    const { data: current, error: fetchError } = await supabase
      .from('tenant_subscriptions')
      .select(`
        *,
        subscription_plans (name, slug)
      `)
      .eq('id', id)
      .single()

    if (fetchError || !current) {
      return res.status(404).json({ error: 'Subscription not found' })
    }

    // Get new plan details
    const { data: newPlan, error: planError } = await supabase
      .from('subscription_plans')
      .select('*')
      .eq('id', planId)
      .single()

    if (planError || !newPlan) {
      return res.status(404).json({ error: 'New plan not found' })
    }

    const isUpgrade = newPlan.price_monthly > (current.subscription_plans as any)?.price_monthly

    // Update subscription
    const { error: updateError } = await supabase
      .from('tenant_subscriptions')
      .update({
        plan_id: planId,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)

    if (updateError) {
      return res.status(500).json({ error: 'Failed to change plan' })
    }

    // Log subscription event
    await supabase.from('subscription_events').insert({
      subscription_id: id,
      tenant_id: current.tenant_id,
      event_type: isUpgrade ? 'plan_upgraded' : 'plan_downgraded',
      details: {
        previousPlan: (current.subscription_plans as any)?.name,
        newPlan: newPlan.name,
        reason
      },
      previous_status: current.status,
      new_status: current.status,
      triggered_by: req.superAdmin?.id,
      is_automated: false
    })

    // Log admin action
    await logAdminAction({
      adminId: req.superAdmin!.id,
      adminEmail: req.superAdmin!.email,
      action: isUpgrade ? 'subscription.upgrade' : 'subscription.downgrade',
      resourceType: 'subscription',
      resourceId: id,
      metadata: {
        previousPlanId: current.plan_id,
        newPlanId: planId,
        previousPlan: (current.subscription_plans as any)?.name,
        newPlan: newPlan.name,
        reason
      }
    })

    res.json({
      success: true,
      message: `Plan ${isUpgrade ? 'upgraded' : 'downgraded'} to ${newPlan.name}`,
      isUpgrade
    })
  } catch (error) {
    console.error('Change plan error:', error)
    res.status(500).json({ error: 'Failed to change plan' })
  }
})

/**
 * POST /api/admin/subscriptions/:id/extend
 * Extend subscription period
 */
router.post('/:id/extend', requirePermission('plans'), async (req: SuperAdminRequest, res: Response) => {
  try {
    const { id } = req.params
    const { days, reason } = req.body

    if (!days || days < 1 || days > 365) {
      return res.status(400).json({ error: 'Days must be between 1 and 365' })
    }

    // Get current subscription
    const { data: current, error: fetchError } = await supabase
      .from('tenant_subscriptions')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError || !current) {
      return res.status(404).json({ error: 'Subscription not found' })
    }

    // Calculate new end date
    const currentEnd = new Date(current.current_period_end)
    const newEnd = new Date(currentEnd)
    newEnd.setDate(newEnd.getDate() + days)

    // Update subscription
    const { error: updateError } = await supabase
      .from('tenant_subscriptions')
      .update({
        current_period_end: newEnd.toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', id)

    if (updateError) {
      return res.status(500).json({ error: 'Failed to extend subscription' })
    }

    // Log subscription event
    await supabase.from('subscription_events').insert({
      subscription_id: id,
      tenant_id: current.tenant_id,
      event_type: 'manually_extended',
      details: {
        previousEnd: current.current_period_end,
        newEnd: newEnd.toISOString(),
        daysExtended: days,
        reason
      },
      previous_status: current.status,
      new_status: current.status,
      triggered_by: req.superAdmin?.id,
      is_automated: false
    })

    // Log admin action
    await logAdminAction({
      adminId: req.superAdmin!.id,
      adminEmail: req.superAdmin!.email,
      action: 'subscription.extend',
      resourceType: 'subscription',
      resourceId: id,
      metadata: {
        previousEnd: current.current_period_end,
        newEnd: newEnd.toISOString(),
        daysExtended: days,
        reason
      }
    })

    res.json({
      success: true,
      message: `Subscription extended by ${days} days`,
      newEndDate: newEnd.toISOString()
    })
  } catch (error) {
    console.error('Extend subscription error:', error)
    res.status(500).json({ error: 'Failed to extend subscription' })
  }
})

/**
 * GET /api/admin/subscriptions/expiring
 * Get subscriptions expiring soon
 */
router.get('/status/expiring', requirePermission('plans'), async (req: SuperAdminRequest, res: Response) => {
  try {
    const days = parseInt(req.query.days as string) || 7
    const futureDate = new Date()
    futureDate.setDate(futureDate.getDate() + days)

    const { data: subscriptions, error } = await supabase
      .from('tenant_subscriptions')
      .select(`
        *,
        tenants (id, business_name, business_email),
        subscription_plans (name, slug)
      `)
      .in('status', ['active', 'trial'])
      .lte('current_period_end', futureDate.toISOString())
      .order('current_period_end', { ascending: true })

    if (error) {
      return res.status(500).json({ error: 'Failed to get expiring subscriptions' })
    }

    res.json(subscriptions || [])
  } catch (error) {
    console.error('Get expiring subscriptions error:', error)
    res.status(500).json({ error: 'Failed to get expiring subscriptions' })
  }
})

/**
 * GET /api/admin/subscriptions/past-due
 * Get past-due subscriptions
 */
router.get('/status/past-due', requirePermission('plans'), async (req: SuperAdminRequest, res: Response) => {
  try {
    const { data: subscriptions, error } = await supabase
      .from('tenant_subscriptions')
      .select(`
        *,
        tenants (id, business_name, business_email),
        subscription_plans (name, slug)
      `)
      .eq('status', 'past_due')
      .order('current_period_end', { ascending: true })

    if (error) {
      return res.status(500).json({ error: 'Failed to get past-due subscriptions' })
    }

    res.json(subscriptions || [])
  } catch (error) {
    console.error('Get past-due subscriptions error:', error)
    res.status(500).json({ error: 'Failed to get past-due subscriptions' })
  }
})

export default router

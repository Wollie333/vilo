import { Router, Response } from 'express'
import { supabase } from '../../lib/supabase.js'
import { SuperAdminRequest, requirePermission, logAdminAction } from '../../middleware/superAdmin.js'

const router = Router()

/**
 * GET /api/admin/grace-periods
 * List all active grace periods
 */
router.get('/', requirePermission('plans'), async (req: SuperAdminRequest, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1
    const limit = parseInt(req.query.limit as string) || 20
    const status = req.query.status as string || 'active'

    const offset = (page - 1) * limit

    let query = supabase
      .from('payment_grace_periods')
      .select(`
        *,
        tenant_subscriptions (
          id,
          status,
          billing_cycle,
          subscription_plans (id, name, slug, price_monthly, price_yearly)
        ),
        tenants (id, business_name, business_email)
      `, { count: 'exact' })

    if (status && status !== 'all') {
      query = query.eq('status', status)
    }

    query = query.order('ends_at', { ascending: true })
    query = query.range(offset, offset + limit - 1)

    const { data: gracePeriods, count, error } = await query

    if (error) {
      console.error('Grace periods query error:', error)
      return res.status(500).json({ error: 'Failed to get grace periods' })
    }

    const transformed = gracePeriods?.map((gp: any) => ({
      id: gp.id,
      subscriptionId: gp.subscription_id,
      tenantId: gp.tenant_id,
      tenantName: gp.tenants?.business_name,
      tenantEmail: gp.tenants?.business_email,
      planName: gp.tenant_subscriptions?.subscription_plans?.name,
      planSlug: gp.tenant_subscriptions?.subscription_plans?.slug,
      billingCycle: gp.tenant_subscriptions?.billing_cycle,
      startedAt: gp.started_at,
      endsAt: gp.ends_at,
      originalFailureReason: gp.original_failure_reason,
      originalFailureAt: gp.original_failure_at,
      retryCount: gp.retry_count,
      maxRetries: gp.max_retries,
      lastRetryAt: gp.last_retry_at,
      nextRetryAt: gp.next_retry_at,
      retryHistory: gp.retry_history,
      status: gp.status,
      notificationsSent: gp.notifications_sent,
      createdAt: gp.created_at
    })) || []

    res.json({
      gracePeriods: transformed,
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit)
    })
  } catch (error) {
    console.error('Get grace periods error:', error)
    res.status(500).json({ error: 'Failed to get grace periods' })
  }
})

/**
 * GET /api/admin/grace-periods/stats
 * Get grace period statistics
 */
router.get('/stats', requirePermission('plans'), async (req: SuperAdminRequest, res: Response) => {
  try {
    // Get counts by status
    const { data: statusCounts, error: statusError } = await supabase
      .from('payment_grace_periods')
      .select('status')

    if (statusError) {
      return res.status(500).json({ error: 'Failed to get grace period stats' })
    }

    const counts = {
      active: 0,
      resolved_paid: 0,
      resolved_cancelled: 0,
      expired: 0
    }

    statusCounts?.forEach((gp: any) => {
      if (counts.hasOwnProperty(gp.status)) {
        counts[gp.status as keyof typeof counts]++
      }
    })

    // Get expiring today count
    const today = new Date()
    const todayEnd = new Date(today)
    todayEnd.setHours(23, 59, 59, 999)

    const { count: expiringToday } = await supabase
      .from('payment_grace_periods')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'active')
      .lte('ends_at', todayEnd.toISOString())

    // Get average days in grace period for active
    const { data: activePeriods } = await supabase
      .from('payment_grace_periods')
      .select('started_at')
      .eq('status', 'active')

    let avgDaysInGrace = 0
    if (activePeriods && activePeriods.length > 0) {
      const totalDays = activePeriods.reduce((sum: number, gp: any) => {
        const started = new Date(gp.started_at)
        const now = new Date()
        const days = Math.floor((now.getTime() - started.getTime()) / (1000 * 60 * 60 * 24))
        return sum + days
      }, 0)
      avgDaysInGrace = Math.round((totalDays / activePeriods.length) * 10) / 10
    }

    // Calculate resolution rate (last 30 days)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const { data: recentPeriods } = await supabase
      .from('payment_grace_periods')
      .select('status')
      .gte('created_at', thirtyDaysAgo.toISOString())
      .in('status', ['resolved_paid', 'resolved_cancelled', 'expired'])

    const resolved = recentPeriods?.filter((gp: any) => gp.status === 'resolved_paid').length || 0
    const total = recentPeriods?.length || 0
    const resolutionRate = total > 0 ? Math.round((resolved / total) * 100) : 0

    res.json({
      counts,
      expiringToday: expiringToday || 0,
      avgDaysInGrace,
      resolutionRate
    })
  } catch (error) {
    console.error('Get grace period stats error:', error)
    res.status(500).json({ error: 'Failed to get grace period stats' })
  }
})

/**
 * GET /api/admin/grace-periods/:id
 * Get grace period details
 */
router.get('/:id', requirePermission('plans'), async (req: SuperAdminRequest, res: Response) => {
  try {
    const { id } = req.params

    const { data: gracePeriod, error } = await supabase
      .from('payment_grace_periods')
      .select(`
        *,
        tenant_subscriptions (
          *,
          subscription_plans (*)
        ),
        tenants (id, business_name, business_email, created_at)
      `)
      .eq('id', id)
      .single()

    if (error || !gracePeriod) {
      return res.status(404).json({ error: 'Grace period not found' })
    }

    res.json({ gracePeriod })
  } catch (error) {
    console.error('Get grace period error:', error)
    res.status(500).json({ error: 'Failed to get grace period' })
  }
})

/**
 * POST /api/admin/grace-periods/:id/retry
 * Manually retry payment for a grace period
 */
router.post('/:id/retry', requirePermission('plans'), async (req: SuperAdminRequest, res: Response) => {
  try {
    const { id } = req.params

    // Get the grace period
    const { data: gracePeriod, error: fetchError } = await supabase
      .from('payment_grace_periods')
      .select(`
        *,
        tenant_subscriptions (
          id,
          payment_provider,
          payment_provider_subscription_id,
          payment_provider_customer_id
        )
      `)
      .eq('id', id)
      .single()

    if (fetchError || !gracePeriod) {
      return res.status(404).json({ error: 'Grace period not found' })
    }

    if (gracePeriod.status !== 'active') {
      return res.status(400).json({ error: 'Grace period is not active' })
    }

    if (gracePeriod.retry_count >= gracePeriod.max_retries) {
      return res.status(400).json({ error: 'Maximum retry attempts reached' })
    }

    // Update retry count and history
    const retryHistory = gracePeriod.retry_history || []
    retryHistory.push({
      attempt: gracePeriod.retry_count + 1,
      timestamp: new Date().toISOString(),
      triggeredBy: req.superAdmin?.id,
      manual: true,
      result: 'pending'
    })

    const { error: updateError } = await supabase
      .from('payment_grace_periods')
      .update({
        retry_count: gracePeriod.retry_count + 1,
        last_retry_at: new Date().toISOString(),
        retry_history: retryHistory,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)

    if (updateError) {
      return res.status(500).json({ error: 'Failed to update grace period' })
    }

    // Log the action
    await logAdminAction({
      adminId: req.superAdmin!.id,
      adminEmail: req.superAdmin!.email,
      action: 'retry_payment',
      resourceType: 'grace_period',
      resourceId: id,
      metadata: { retryAttempt: gracePeriod.retry_count + 1 }
    })

    // TODO: Actually trigger payment retry via payment provider
    // This would be handled by the subscriptionAutomation service

    res.json({
      success: true,
      message: 'Payment retry initiated',
      retryCount: gracePeriod.retry_count + 1
    })
  } catch (error) {
    console.error('Retry payment error:', error)
    res.status(500).json({ error: 'Failed to retry payment' })
  }
})

/**
 * POST /api/admin/grace-periods/:id/extend
 * Extend a grace period
 */
router.post('/:id/extend', requirePermission('plans'), async (req: SuperAdminRequest, res: Response) => {
  try {
    const { id } = req.params
    const { days, reason } = req.body

    if (!days || days < 1 || days > 30) {
      return res.status(400).json({ error: 'Days must be between 1 and 30' })
    }

    // Get the grace period
    const { data: gracePeriod, error: fetchError } = await supabase
      .from('payment_grace_periods')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError || !gracePeriod) {
      return res.status(404).json({ error: 'Grace period not found' })
    }

    if (gracePeriod.status !== 'active') {
      return res.status(400).json({ error: 'Grace period is not active' })
    }

    // Calculate new end date
    const currentEndsAt = new Date(gracePeriod.ends_at)
    const newEndsAt = new Date(currentEndsAt)
    newEndsAt.setDate(newEndsAt.getDate() + days)

    const { error: updateError } = await supabase
      .from('payment_grace_periods')
      .update({
        ends_at: newEndsAt.toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', id)

    if (updateError) {
      return res.status(500).json({ error: 'Failed to extend grace period' })
    }

    // Log the action
    await logAdminAction({
      adminId: req.superAdmin!.id,
      adminEmail: req.superAdmin!.email,
      action: 'extend_grace_period',
      resourceType: 'grace_period',
      resourceId: id,
      metadata: {
        previousEndsAt: gracePeriod.ends_at,
        newEndsAt: newEndsAt.toISOString(),
        daysExtended: days,
        reason
      }
    })

    res.json({
      success: true,
      message: `Grace period extended by ${days} days`,
      newEndsAt: newEndsAt.toISOString()
    })
  } catch (error) {
    console.error('Extend grace period error:', error)
    res.status(500).json({ error: 'Failed to extend grace period' })
  }
})

/**
 * POST /api/admin/grace-periods/:id/resolve
 * Manually resolve a grace period
 */
router.post('/:id/resolve', requirePermission('plans'), async (req: SuperAdminRequest, res: Response) => {
  try {
    const { id } = req.params
    const { resolution, reason } = req.body

    if (!resolution || !['resolved_paid', 'resolved_cancelled'].includes(resolution)) {
      return res.status(400).json({ error: 'Invalid resolution status' })
    }

    // Get the grace period
    const { data: gracePeriod, error: fetchError } = await supabase
      .from('payment_grace_periods')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError || !gracePeriod) {
      return res.status(404).json({ error: 'Grace period not found' })
    }

    if (gracePeriod.status !== 'active') {
      return res.status(400).json({ error: 'Grace period is not active' })
    }

    const { error: updateError } = await supabase
      .from('payment_grace_periods')
      .update({
        status: resolution,
        resolved_at: new Date().toISOString(),
        resolved_by: req.superAdmin?.id,
        resolution_reason: reason,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)

    if (updateError) {
      return res.status(500).json({ error: 'Failed to resolve grace period' })
    }

    // If resolved as paid, update subscription status
    if (resolution === 'resolved_paid') {
      await supabase
        .from('tenant_subscriptions')
        .update({
          status: 'active',
          updated_at: new Date().toISOString()
        })
        .eq('id', gracePeriod.subscription_id)
    }

    // If resolved as cancelled, update subscription status
    if (resolution === 'resolved_cancelled') {
      await supabase
        .from('tenant_subscriptions')
        .update({
          status: 'cancelled',
          cancelled_at: new Date().toISOString(),
          cancellation_reason: 'Payment failed - grace period expired',
          updated_at: new Date().toISOString()
        })
        .eq('id', gracePeriod.subscription_id)
    }

    // Log the action
    await logAdminAction({
      adminId: req.superAdmin!.id,
      adminEmail: req.superAdmin!.email,
      action: 'resolve_grace_period',
      resourceType: 'grace_period',
      resourceId: id,
      metadata: { resolution, reason }
    })

    res.json({
      success: true,
      message: `Grace period resolved as ${resolution}`,
      resolution
    })
  } catch (error) {
    console.error('Resolve grace period error:', error)
    res.status(500).json({ error: 'Failed to resolve grace period' })
  }
})

export default router

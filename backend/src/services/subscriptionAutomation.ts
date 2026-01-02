import { supabase } from '../lib/supabase.js'

/**
 * Subscription Automation Service
 * Handles trial expirations, grace periods, payment retries, and automated notifications
 */

interface AutomationRunResult {
  runId: string
  jobName: string
  status: 'completed' | 'failed' | 'partial'
  itemsProcessed: number
  itemsSucceeded: number
  itemsFailed: number
  results: Record<string, any>
  error?: string
}

interface SubscriptionEvent {
  subscriptionId: string
  tenantId: string
  eventType: string
  details?: Record<string, any>
  previousStatus?: string
  newStatus?: string
  notificationType?: 'email' | 'in_app' | 'both'
  isAutomated?: boolean
  triggeredBy?: string
}

// ============================================================================
// AUTOMATION SETTINGS HELPERS
// ============================================================================

/**
 * Get automation setting from platform_settings
 */
async function getSetting(key: string, defaultValue: string): Promise<string> {
  try {
    const { data } = await supabase
      .from('platform_settings')
      .select('value')
      .eq('key', key)
      .single()

    return data?.value || defaultValue
  } catch {
    return defaultValue
  }
}

async function getSettingNumber(key: string, defaultValue: number): Promise<number> {
  const value = await getSetting(key, String(defaultValue))
  return parseInt(value, 10) || defaultValue
}

async function getSettingBoolean(key: string, defaultValue: boolean): Promise<boolean> {
  const value = await getSetting(key, String(defaultValue))
  return value === 'true'
}

// ============================================================================
// EVENT LOGGING
// ============================================================================

/**
 * Log a subscription event
 */
export async function logSubscriptionEvent(event: SubscriptionEvent): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from('subscription_events')
      .insert({
        subscription_id: event.subscriptionId,
        tenant_id: event.tenantId,
        event_type: event.eventType,
        details: event.details || {},
        previous_status: event.previousStatus,
        new_status: event.newStatus,
        notification_type: event.notificationType,
        is_automated: event.isAutomated ?? true,
        triggered_by: event.triggeredBy
      })
      .select('id')
      .single()

    if (error) throw error
    return data?.id || null
  } catch (error) {
    console.error('[SubscriptionAutomation] Failed to log event:', error)
    return null
  }
}

/**
 * Start an automation run and return the run ID
 */
async function startAutomationRun(
  jobName: string,
  triggeredBy: 'scheduled' | 'manual' | 'webhook' = 'scheduled',
  adminId?: string
): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from('automation_runs')
      .insert({
        job_name: jobName,
        status: 'running',
        triggered_by: triggeredBy,
        triggered_by_admin: adminId
      })
      .select('id')
      .single()

    if (error) throw error
    return data?.id || null
  } catch (error) {
    console.error('[SubscriptionAutomation] Failed to start automation run:', error)
    return null
  }
}

/**
 * Complete an automation run
 */
async function completeAutomationRun(
  runId: string,
  result: Omit<AutomationRunResult, 'runId' | 'jobName'>
): Promise<void> {
  try {
    await supabase
      .from('automation_runs')
      .update({
        status: result.status,
        completed_at: new Date().toISOString(),
        items_processed: result.itemsProcessed,
        items_succeeded: result.itemsSucceeded,
        items_failed: result.itemsFailed,
        results: result.results,
        error_message: result.error
      })
      .eq('id', runId)
  } catch (error) {
    console.error('[SubscriptionAutomation] Failed to complete automation run:', error)
  }
}

// ============================================================================
// TRIAL PROCESSING
// ============================================================================

/**
 * Process expiring trials - send notifications and handle expirations
 */
export async function processExpiringTrials(): Promise<AutomationRunResult> {
  const runId = await startAutomationRun('process_expiring_trials')
  const result: AutomationRunResult = {
    runId: runId || 'unknown',
    jobName: 'process_expiring_trials',
    status: 'completed',
    itemsProcessed: 0,
    itemsSucceeded: 0,
    itemsFailed: 0,
    results: { notified: [], expired: [], errors: [] }
  }

  try {
    const noticeDays = await getSettingNumber('trial_ending_notice_days', 3)
    const noticeDate = new Date()
    noticeDate.setDate(noticeDate.getDate() + noticeDays)

    // Find trials ending soon that haven't been notified
    const { data: endingTrials } = await supabase
      .from('tenant_subscriptions')
      .select('id, tenant_id, ends_at, tenants(name, email)')
      .eq('status', 'trial')
      .lte('ends_at', noticeDate.toISOString())
      .gt('ends_at', new Date().toISOString())

    // Send trial ending soon notifications
    for (const trial of endingTrials || []) {
      result.itemsProcessed++
      try {
        // Check if we already sent this notification
        const { data: existingEvent } = await supabase
          .from('subscription_events')
          .select('id')
          .eq('subscription_id', trial.id)
          .eq('event_type', 'trial_ending_soon')
          .single()

        if (!existingEvent) {
          await logSubscriptionEvent({
            subscriptionId: trial.id,
            tenantId: trial.tenant_id,
            eventType: 'trial_ending_soon',
            details: {
              ends_at: trial.ends_at,
              tenant_name: (trial.tenants as any)?.name
            },
            notificationType: 'both'
          })
          result.itemsSucceeded++
          ;(result.results.notified as string[]).push(trial.id)
        }
      } catch (error) {
        result.itemsFailed++
        ;(result.results.errors as any[]).push({ id: trial.id, error: String(error) })
      }
    }

    // Find and expire trials that have ended
    const { data: expiredTrials } = await supabase
      .from('tenant_subscriptions')
      .select('id, tenant_id')
      .eq('status', 'trial')
      .lt('ends_at', new Date().toISOString())

    const downgradeToFree = await getSettingBoolean('downgrade_to_free_on_cancel', true)

    for (const trial of expiredTrials || []) {
      result.itemsProcessed++
      try {
        const newStatus = downgradeToFree ? 'cancelled' : 'expired'

        await supabase
          .from('tenant_subscriptions')
          .update({ status: newStatus })
          .eq('id', trial.id)

        await logSubscriptionEvent({
          subscriptionId: trial.id,
          tenantId: trial.tenant_id,
          eventType: 'trial_expired',
          previousStatus: 'trial',
          newStatus,
          notificationType: 'both'
        })

        result.itemsSucceeded++
        ;(result.results.expired as string[]).push(trial.id)
      } catch (error) {
        result.itemsFailed++
        ;(result.results.errors as any[]).push({ id: trial.id, error: String(error) })
      }
    }
  } catch (error) {
    result.status = 'failed'
    result.error = String(error)
    console.error('[SubscriptionAutomation] processExpiringTrials failed:', error)
  }

  if (runId) {
    await completeAutomationRun(runId, result)
  }

  return result
}

// ============================================================================
// GRACE PERIOD PROCESSING
// ============================================================================

/**
 * Start a grace period for a failed payment
 */
export async function startGracePeriod(
  subscriptionId: string,
  tenantId: string,
  failureReason: string
): Promise<string | null> {
  try {
    const graceDays = await getSettingNumber('grace_period_days', 7)
    const retryIntervals = JSON.parse(await getSetting('payment_retry_intervals', '[1, 3, 7]'))

    const endsAt = new Date()
    endsAt.setDate(endsAt.getDate() + graceDays)

    const nextRetryAt = new Date()
    nextRetryAt.setDate(nextRetryAt.getDate() + (retryIntervals[0] || 1))

    const { data, error } = await supabase
      .from('payment_grace_periods')
      .insert({
        subscription_id: subscriptionId,
        tenant_id: tenantId,
        ends_at: endsAt.toISOString(),
        original_failure_reason: failureReason,
        next_retry_at: nextRetryAt.toISOString(),
        max_retries: retryIntervals.length
      })
      .select('id')
      .single()

    if (error) throw error

    // Log the event
    await logSubscriptionEvent({
      subscriptionId,
      tenantId,
      eventType: 'grace_period_started',
      details: {
        grace_period_id: data.id,
        ends_at: endsAt.toISOString(),
        failure_reason: failureReason
      },
      notificationType: 'both'
    })

    return data.id
  } catch (error) {
    console.error('[SubscriptionAutomation] Failed to start grace period:', error)
    return null
  }
}

/**
 * Process active grace periods - retry payments, expire, etc.
 */
export async function processGracePeriods(): Promise<AutomationRunResult> {
  const runId = await startAutomationRun('process_grace_periods')
  const result: AutomationRunResult = {
    runId: runId || 'unknown',
    jobName: 'process_grace_periods',
    status: 'completed',
    itemsProcessed: 0,
    itemsSucceeded: 0,
    itemsFailed: 0,
    results: { expired: [], retried: [], errors: [] }
  }

  try {
    const autoCancel = await getSettingBoolean('auto_cancel_after_grace', true)

    // Find expired grace periods
    const { data: expiredPeriods } = await supabase
      .from('payment_grace_periods')
      .select('id, subscription_id, tenant_id')
      .eq('status', 'active')
      .lt('ends_at', new Date().toISOString())

    for (const period of expiredPeriods || []) {
      result.itemsProcessed++
      try {
        // Mark grace period as expired
        await supabase
          .from('payment_grace_periods')
          .update({
            status: 'expired',
            resolved_at: new Date().toISOString(),
            resolution_method: 'expired'
          })
          .eq('id', period.id)

        // Optionally cancel the subscription
        if (autoCancel) {
          await supabase
            .from('tenant_subscriptions')
            .update({ status: 'cancelled' })
            .eq('id', period.subscription_id)
        }

        await logSubscriptionEvent({
          subscriptionId: period.subscription_id,
          tenantId: period.tenant_id,
          eventType: 'grace_period_ended',
          details: { grace_period_id: period.id, action: autoCancel ? 'cancelled' : 'expired' },
          newStatus: autoCancel ? 'cancelled' : undefined,
          notificationType: 'both'
        })

        result.itemsSucceeded++
        ;(result.results.expired as string[]).push(period.id)
      } catch (error) {
        result.itemsFailed++
        ;(result.results.errors as any[]).push({ id: period.id, error: String(error) })
      }
    }

    // Find grace periods due for retry
    const { data: retryPeriods } = await supabase
      .from('payment_grace_periods')
      .select('id, subscription_id, tenant_id, retry_count, max_retries, retry_history')
      .eq('status', 'active')
      .lte('next_retry_at', new Date().toISOString())

    const retryIntervals = JSON.parse(await getSetting('payment_retry_intervals', '[1, 3, 7]'))

    for (const period of retryPeriods || []) {
      result.itemsProcessed++
      try {
        // TODO: Integrate with actual payment provider to retry payment
        // For now, we just log the retry attempt
        const newRetryCount = period.retry_count + 1
        const retryHistory = [...(period.retry_history || []), {
          attempt: newRetryCount,
          at: new Date().toISOString(),
          result: 'pending_implementation'
        }]

        // Calculate next retry
        let nextRetryAt = null
        if (newRetryCount < period.max_retries) {
          const nextInterval = retryIntervals[newRetryCount] || retryIntervals[retryIntervals.length - 1]
          nextRetryAt = new Date()
          nextRetryAt.setDate(nextRetryAt.getDate() + nextInterval)
        }

        await supabase
          .from('payment_grace_periods')
          .update({
            retry_count: newRetryCount,
            last_retry_at: new Date().toISOString(),
            next_retry_at: nextRetryAt?.toISOString() || null,
            retry_history: retryHistory
          })
          .eq('id', period.id)

        await logSubscriptionEvent({
          subscriptionId: period.subscription_id,
          tenantId: period.tenant_id,
          eventType: 'payment_retry',
          details: {
            grace_period_id: period.id,
            retry_count: newRetryCount,
            max_retries: period.max_retries
          }
        })

        result.itemsSucceeded++
        ;(result.results.retried as string[]).push(period.id)
      } catch (error) {
        result.itemsFailed++
        ;(result.results.errors as any[]).push({ id: period.id, error: String(error) })
      }
    }
  } catch (error) {
    result.status = 'failed'
    result.error = String(error)
    console.error('[SubscriptionAutomation] processGracePeriods failed:', error)
  }

  if (runId) {
    await completeAutomationRun(runId, result)
  }

  return result
}

/**
 * Resolve a grace period (payment succeeded)
 */
export async function resolveGracePeriod(
  gracePeriodId: string,
  resolutionMethod: 'auto_payment' | 'manual_payment' | 'admin_override'
): Promise<boolean> {
  try {
    const { data: period } = await supabase
      .from('payment_grace_periods')
      .select('subscription_id, tenant_id')
      .eq('id', gracePeriodId)
      .single()

    if (!period) return false

    await supabase
      .from('payment_grace_periods')
      .update({
        status: 'resolved_paid',
        resolved_at: new Date().toISOString(),
        resolution_method: resolutionMethod
      })
      .eq('id', gracePeriodId)

    // Reactivate subscription if needed
    await supabase
      .from('tenant_subscriptions')
      .update({ status: 'active' })
      .eq('id', period.subscription_id)

    await logSubscriptionEvent({
      subscriptionId: period.subscription_id,
      tenantId: period.tenant_id,
      eventType: 'payment_succeeded',
      details: { grace_period_id: gracePeriodId, resolution_method: resolutionMethod },
      newStatus: 'active',
      notificationType: 'both'
    })

    return true
  } catch (error) {
    console.error('[SubscriptionAutomation] Failed to resolve grace period:', error)
    return false
  }
}

// ============================================================================
// RENEWAL PROCESSING
// ============================================================================

/**
 * Process upcoming renewals - send reminders
 */
export async function processRenewals(): Promise<AutomationRunResult> {
  const runId = await startAutomationRun('process_renewals')
  const result: AutomationRunResult = {
    runId: runId || 'unknown',
    jobName: 'process_renewals',
    status: 'completed',
    itemsProcessed: 0,
    itemsSucceeded: 0,
    itemsFailed: 0,
    results: { reminded: [], renewed: [], errors: [] }
  }

  try {
    const reminderDays = await getSettingNumber('renewal_reminder_days', 7)
    const reminderDate = new Date()
    reminderDate.setDate(reminderDate.getDate() + reminderDays)

    // Find subscriptions due for renewal reminder
    const { data: upcomingRenewals } = await supabase
      .from('tenant_subscriptions')
      .select('id, tenant_id, ends_at')
      .eq('status', 'active')
      .eq('auto_renew', true)
      .lte('ends_at', reminderDate.toISOString())
      .gt('ends_at', new Date().toISOString())

    for (const sub of upcomingRenewals || []) {
      result.itemsProcessed++
      try {
        // Check if we already sent a reminder
        const { data: existingEvent } = await supabase
          .from('subscription_events')
          .select('id')
          .eq('subscription_id', sub.id)
          .eq('event_type', 'renewal_reminder')
          .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()) // Last 7 days
          .single()

        if (!existingEvent) {
          await logSubscriptionEvent({
            subscriptionId: sub.id,
            tenantId: sub.tenant_id,
            eventType: 'renewal_reminder',
            details: { renewal_date: sub.ends_at },
            notificationType: 'email'
          })
          result.itemsSucceeded++
          ;(result.results.reminded as string[]).push(sub.id)
        }
      } catch (error) {
        result.itemsFailed++
        ;(result.results.errors as any[]).push({ id: sub.id, error: String(error) })
      }
    }
  } catch (error) {
    result.status = 'failed'
    result.error = String(error)
    console.error('[SubscriptionAutomation] processRenewals failed:', error)
  }

  if (runId) {
    await completeAutomationRun(runId, result)
  }

  return result
}

// ============================================================================
// USAGE LIMIT PROCESSING
// ============================================================================

/**
 * Check usage limits for all active tenants and send warnings
 */
export async function checkUsageLimits(): Promise<AutomationRunResult> {
  const runId = await startAutomationRun('check_usage_limits')
  const result: AutomationRunResult = {
    runId: runId || 'unknown',
    jobName: 'check_usage_limits',
    status: 'completed',
    itemsProcessed: 0,
    itemsSucceeded: 0,
    itemsFailed: 0,
    results: { warnings: [], limits: [], errors: [] }
  }

  try {
    const warningThreshold = parseFloat(await getSetting('limit_warning_threshold', '0.8'))

    // Get all active subscriptions with their limits
    const { data: subscriptions } = await supabase
      .from('tenant_subscriptions')
      .select('id, tenant_id, plans:plan_id(limits)')
      .in('status', ['active', 'trial'])

    for (const sub of subscriptions || []) {
      result.itemsProcessed++
      try {
        const limits = (sub.plans as any)?.limits || {}

        // Check room usage
        const { count: roomCount } = await supabase
          .from('rooms')
          .select('id', { count: 'exact', head: true })
          .eq('tenant_id', sub.tenant_id)

        const maxRooms = limits.max_rooms || 999999
        const roomUsage = (roomCount || 0) / maxRooms

        if (roomUsage >= 1) {
          await recordLimitEvent(sub.tenant_id, sub.id, 'rooms', roomCount || 0, maxRooms, 'limit')
          ;(result.results.limits as any[]).push({ tenant: sub.tenant_id, type: 'rooms' })
        } else if (roomUsage >= warningThreshold) {
          await recordLimitEvent(sub.tenant_id, sub.id, 'rooms', roomCount || 0, maxRooms, 'warning')
          ;(result.results.warnings as any[]).push({ tenant: sub.tenant_id, type: 'rooms' })
        }

        // Check team member usage
        const { count: memberCount } = await supabase
          .from('tenant_members')
          .select('id', { count: 'exact', head: true })
          .eq('tenant_id', sub.tenant_id)
          .eq('status', 'active')

        const maxMembers = limits.max_team_members || 999999
        const memberUsage = (memberCount || 0) / maxMembers

        if (memberUsage >= 1) {
          await recordLimitEvent(sub.tenant_id, sub.id, 'team_members', memberCount || 0, maxMembers, 'limit')
          ;(result.results.limits as any[]).push({ tenant: sub.tenant_id, type: 'team_members' })
        } else if (memberUsage >= warningThreshold) {
          await recordLimitEvent(sub.tenant_id, sub.id, 'team_members', memberCount || 0, maxMembers, 'warning')
          ;(result.results.warnings as any[]).push({ tenant: sub.tenant_id, type: 'team_members' })
        }

        result.itemsSucceeded++
      } catch (error) {
        result.itemsFailed++
        ;(result.results.errors as any[]).push({ id: sub.id, error: String(error) })
      }
    }
  } catch (error) {
    result.status = 'failed'
    result.error = String(error)
    console.error('[SubscriptionAutomation] checkUsageLimits failed:', error)
  }

  if (runId) {
    await completeAutomationRun(runId, result)
  }

  return result
}

/**
 * Record a usage limit event
 */
async function recordLimitEvent(
  tenantId: string,
  subscriptionId: string,
  limitType: string,
  currentUsage: number,
  limitValue: number,
  thresholdType: 'warning' | 'limit' | 'exceeded'
): Promise<void> {
  try {
    const usagePercent = limitValue > 0 ? (currentUsage / limitValue) * 100 : 0

    // Check if we already recorded this event recently (last 24 hours)
    const { data: existing } = await supabase
      .from('usage_limit_events')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('limit_type', limitType)
      .eq('threshold_type', thresholdType)
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .single()

    if (existing) return // Already recorded recently

    await supabase
      .from('usage_limit_events')
      .insert({
        tenant_id: tenantId,
        subscription_id: subscriptionId,
        limit_type: limitType,
        current_usage: currentUsage,
        limit_value: limitValue,
        usage_percent: usagePercent,
        threshold_type: thresholdType,
        action_taken: thresholdType === 'limit' ? 'feature_disabled' : 'notification_sent'
      })
  } catch (error) {
    console.error('[SubscriptionAutomation] Failed to record limit event:', error)
  }
}

// ============================================================================
// MANUAL ADMIN ACTIONS
// ============================================================================

/**
 * Manually extend a trial period
 */
export async function extendTrial(
  subscriptionId: string,
  days: number,
  adminId: string,
  reason: string
): Promise<boolean> {
  try {
    const { data: sub } = await supabase
      .from('tenant_subscriptions')
      .select('tenant_id, ends_at, status')
      .eq('id', subscriptionId)
      .single()

    if (!sub || sub.status !== 'trial') return false

    const newEndsAt = new Date(sub.ends_at)
    newEndsAt.setDate(newEndsAt.getDate() + days)

    await supabase
      .from('tenant_subscriptions')
      .update({ ends_at: newEndsAt.toISOString() })
      .eq('id', subscriptionId)

    await logSubscriptionEvent({
      subscriptionId,
      tenantId: sub.tenant_id,
      eventType: 'manually_extended',
      details: {
        extension_days: days,
        new_ends_at: newEndsAt.toISOString(),
        reason
      },
      isAutomated: false,
      triggeredBy: adminId
    })

    return true
  } catch (error) {
    console.error('[SubscriptionAutomation] Failed to extend trial:', error)
    return false
  }
}

/**
 * Manually change subscription plan
 */
export async function changePlan(
  subscriptionId: string,
  newPlanId: string,
  adminId: string,
  reason: string
): Promise<boolean> {
  try {
    const { data: sub } = await supabase
      .from('tenant_subscriptions')
      .select('tenant_id, plan_id')
      .eq('id', subscriptionId)
      .single()

    if (!sub) return false

    const { data: oldPlan } = await supabase
      .from('subscription_plans')
      .select('slug, price')
      .eq('id', sub.plan_id)
      .single()

    const { data: newPlan } = await supabase
      .from('subscription_plans')
      .select('slug, price')
      .eq('id', newPlanId)
      .single()

    if (!newPlan) return false

    await supabase
      .from('tenant_subscriptions')
      .update({ plan_id: newPlanId })
      .eq('id', subscriptionId)

    const isUpgrade = (newPlan.price || 0) > (oldPlan?.price || 0)

    await logSubscriptionEvent({
      subscriptionId,
      tenantId: sub.tenant_id,
      eventType: isUpgrade ? 'plan_upgraded' : 'plan_downgraded',
      details: {
        old_plan: oldPlan?.slug,
        new_plan: newPlan.slug,
        reason
      },
      isAutomated: false,
      triggeredBy: adminId
    })

    return true
  } catch (error) {
    console.error('[SubscriptionAutomation] Failed to change plan:', error)
    return false
  }
}

/**
 * Cancel a subscription
 */
export async function cancelSubscription(
  subscriptionId: string,
  adminId: string,
  reason: string,
  immediate: boolean = false
): Promise<boolean> {
  try {
    const { data: sub } = await supabase
      .from('tenant_subscriptions')
      .select('tenant_id, status')
      .eq('id', subscriptionId)
      .single()

    if (!sub) return false

    const updates: Record<string, any> = immediate
      ? { status: 'cancelled' }
      : { auto_renew: false, cancel_at_period_end: true }

    await supabase
      .from('tenant_subscriptions')
      .update(updates)
      .eq('id', subscriptionId)

    await logSubscriptionEvent({
      subscriptionId,
      tenantId: sub.tenant_id,
      eventType: 'subscription_cancelled',
      previousStatus: sub.status,
      newStatus: immediate ? 'cancelled' : sub.status,
      details: {
        immediate,
        reason,
        cancel_at_period_end: !immediate
      },
      isAutomated: false,
      triggeredBy: adminId
    })

    return true
  } catch (error) {
    console.error('[SubscriptionAutomation] Failed to cancel subscription:', error)
    return false
  }
}

// ============================================================================
// CRON JOB RUNNERS
// ============================================================================

/**
 * Run all daily automation jobs
 */
export async function runDailyJobs(): Promise<Record<string, AutomationRunResult>> {
  console.log('[SubscriptionAutomation] Starting daily jobs...')

  const results: Record<string, AutomationRunResult> = {}

  results.trials = await processExpiringTrials()
  results.gracePeriods = await processGracePeriods()
  results.usageLimits = await checkUsageLimits()

  console.log('[SubscriptionAutomation] Daily jobs complete:', {
    trials: results.trials.status,
    gracePeriods: results.gracePeriods.status,
    usageLimits: results.usageLimits.status
  })

  return results
}

/**
 * Run hourly automation jobs
 */
export async function runHourlyJobs(): Promise<Record<string, AutomationRunResult>> {
  console.log('[SubscriptionAutomation] Starting hourly jobs...')

  const results: Record<string, AutomationRunResult> = {}

  results.renewals = await processRenewals()

  console.log('[SubscriptionAutomation] Hourly jobs complete:', {
    renewals: results.renewals.status
  })

  return results
}

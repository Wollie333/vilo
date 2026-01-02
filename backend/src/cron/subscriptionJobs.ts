import * as cron from 'node-cron'
import { runDailyJobs, runHourlyJobs } from '../services/subscriptionAutomation.js'
import { cleanupExpiredSessions } from '../services/impersonationService.js'

/**
 * Subscription Automation Cron Jobs
 *
 * Daily Jobs (2 AM UTC):
 * - Process expiring trials
 * - Process grace periods
 * - Check usage limits
 *
 * Hourly Jobs:
 * - Process upcoming renewals
 * - Cleanup expired impersonation sessions
 */

let dailyJob: ReturnType<typeof cron.schedule> | null = null
let hourlyJob: ReturnType<typeof cron.schedule> | null = null

/**
 * Initialize all subscription cron jobs
 */
export function initializeSubscriptionJobs(): void {
  console.log('[SubscriptionJobs] Initializing subscription automation cron jobs...')

  // Daily job at 2 AM UTC
  dailyJob = cron.schedule('0 2 * * *', async () => {
    console.log('[SubscriptionJobs] Running daily subscription automation...')
    try {
      const results = await runDailyJobs()
      console.log('[SubscriptionJobs] Daily jobs completed:', results)
    } catch (error) {
      console.error('[SubscriptionJobs] Daily jobs failed:', error)
    }
  }, {
    timezone: 'UTC'
  })

  // Hourly job at minute 0
  hourlyJob = cron.schedule('0 * * * *', async () => {
    console.log('[SubscriptionJobs] Running hourly subscription automation...')
    try {
      const results = await runHourlyJobs()
      console.log('[SubscriptionJobs] Hourly jobs completed:', results)

      // Also cleanup expired impersonation sessions
      const cleanedSessions = await cleanupExpiredSessions()
      if (cleanedSessions > 0) {
        console.log(`[SubscriptionJobs] Cleaned up ${cleanedSessions} expired impersonation sessions`)
      }
    } catch (error) {
      console.error('[SubscriptionJobs] Hourly jobs failed:', error)
    }
  }, {
    timezone: 'UTC'
  })

  console.log('[SubscriptionJobs] Cron jobs initialized:')
  console.log('  - Daily jobs: 2:00 AM UTC')
  console.log('  - Hourly jobs: Every hour at :00')
}

/**
 * Stop all subscription cron jobs
 */
export function stopSubscriptionJobs(): void {
  if (dailyJob) {
    dailyJob.stop()
    dailyJob = null
  }
  if (hourlyJob) {
    hourlyJob.stop()
    hourlyJob = null
  }
  console.log('[SubscriptionJobs] Cron jobs stopped')
}

/**
 * Manually trigger daily jobs (for testing/admin use)
 */
export async function triggerDailyJobs(): Promise<any> {
  console.log('[SubscriptionJobs] Manually triggering daily jobs...')
  return await runDailyJobs()
}

/**
 * Manually trigger hourly jobs (for testing/admin use)
 */
export async function triggerHourlyJobs(): Promise<any> {
  console.log('[SubscriptionJobs] Manually triggering hourly jobs...')
  return await runHourlyJobs()
}

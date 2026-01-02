import { Router } from 'express'
import { requireSuperAdmin } from '../../middleware/superAdmin.js'

import authRouter from './auth.js'
import dashboardRouter from './dashboard.js'
import billingRouter from './billing.js'
import analyticsRouter from './analytics.js'
import tenantsRouter from './tenants.js'
import usersRouter from './users.js'
import plansRouter from './plans.js'
import subscriptionsRouter from './subscriptions.js'
import integrationsRouter from './integrations.js'
import marketingRouter from './marketing.js'
import teamsRouter from './teams.js'
import errorsRouter from './errors.js'
import backupsRouter from './backups.js'
import settingsRouter from './settings.js'
import healthRouter from './health.js'
import activityRouter from './activity.js'
import featureFlagsRouter from './featureFlags.js'
import announcementsRouter from './announcements.js'
import webhooksRouter from './webhooks.js'
import forecastRouter from './forecast.js'
import onboardingRouter from './onboarding.js'
import gracePeriodsRouter from './grace-periods.js'

const router = Router()

// Auth routes (no authentication required for login)
router.use('/auth', authRouter)

// All other admin routes require super-admin authentication
router.use(requireSuperAdmin)

// Core admin routes
router.use('/dashboard', dashboardRouter)
router.use('/billing', billingRouter)
router.use('/analytics', analyticsRouter)
router.use('/tenants', tenantsRouter)
router.use('/users', usersRouter)
router.use('/plans', plansRouter)
router.use('/subscriptions', subscriptionsRouter)
router.use('/integrations', integrationsRouter)
router.use('/marketing', marketingRouter)
router.use('/teams', teamsRouter)
router.use('/errors', errorsRouter)
router.use('/backups', backupsRouter)
router.use('/settings', settingsRouter)

// Suggested improvements routes
router.use('/health', healthRouter)
router.use('/activity', activityRouter)
router.use('/feature-flags', featureFlagsRouter)
router.use('/announcements', announcementsRouter)
router.use('/webhooks', webhooksRouter)
router.use('/forecast', forecastRouter)
router.use('/onboarding', onboardingRouter)
router.use('/grace-periods', gracePeriodsRouter)

// Health check for admin API
router.get('/ping', (req, res) => {
  res.json({ status: 'ok', admin: true, timestamp: new Date().toISOString() })
})

export default router

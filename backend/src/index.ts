import express from 'express'
import { createServer } from 'http'
import cors from 'cors'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { initializeWebSocket } from './websocket/index.js'
import bookingsRouter from './routes/bookings.js'
import roomsRouter from './routes/rooms.js'
import addonsRouter from './routes/addons.js'
import couponsRouter from './routes/coupons.js'
import tenantsRouter from './routes/tenants.js'
import paymentsRouter from './routes/payments.js'
import publicRouter from './routes/public.js'
import reviewsRouter from './routes/reviews.js'
import usersRouter from './routes/users.js'
import membersRouter from './routes/members.js'
import rolesRouter from './routes/roles.js'
import customersRouter from './routes/customers.js'
import portalRouter from './routes/portal.js'
import discoveryRouter from './routes/discovery.js'
import invoicesRouter from './routes/invoices.js'
import integrationsRouter from './routes/integrations.js'
import geographyRouter from './routes/geography.js'
import categoriesRouter from './routes/categories.js'
import verificationRouter from './routes/verification.js'
import notificationsRouter from './routes/notifications.js'
import trackingRouter from './routes/tracking.js'
import analyticsRouter from './routes/analytics.js'
import adminRouter from './routes/admin/index.js'
import refundsRouter from './routes/refunds.js'
import { latencyTrackingMiddleware } from './services/healthMonitoringService.js'
import { initializeSentry, errorHandlingMiddleware, requestIdMiddleware } from './services/errorLoggingService.js'
import { initializeSubscriptionJobs } from './cron/subscriptionJobs.js'
import { impersonationMiddleware } from './services/impersonationService.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Load .env file from backend directory
dotenv.config({ path: join(__dirname, '../.env') })

const app = express()
const httpServer = createServer(app)
const PORT = process.env.PORT || 3002

// Initialize WebSocket
initializeWebSocket(httpServer)

app.use(cors())
app.use(express.json({ limit: '50mb' }))
app.use(requestIdMiddleware())
app.use(latencyTrackingMiddleware())
app.use(impersonationMiddleware())

// Initialize Sentry for error tracking
initializeSentry().catch(err => console.error('Failed to initialize Sentry:', err))

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Vilo API is running' })
})

// Supabase connection check
app.get('/api/health/db', async (req, res) => {
  try {
    const { supabase } = await import('./lib/supabase.js')
    const { data, error } = await supabase.from('bookings').select('count').limit(1)
    
    if (error) {
      return res.status(500).json({ 
        status: 'error', 
        message: 'Database connection failed',
        error: error.message 
      })
    }
    
    res.json({ 
      status: 'ok', 
      message: 'Database connection successful',
      supabase_configured: true
    })
  } catch (error: any) {
    res.status(500).json({ 
      status: 'error', 
      message: 'Database not configured',
      error: error.message,
      supabase_configured: false
    })
  }
})

// API routes
app.use('/api/bookings', bookingsRouter)
app.use('/api/rooms', roomsRouter)
app.use('/api/addons', addonsRouter)
app.use('/api/coupons', couponsRouter)
app.use('/api/tenants', tenantsRouter)
app.use('/api/payments', paymentsRouter)
app.use('/api/public', publicRouter)
app.use('/api/reviews', reviewsRouter)
app.use('/api/users', usersRouter)
app.use('/api/members', membersRouter)
app.use('/api/roles', rolesRouter)
app.use('/api/customers', customersRouter)
app.use('/api/portal', portalRouter)
app.use('/api/discovery', discoveryRouter)
app.use('/api/invoices', invoicesRouter)
app.use('/api/integrations', integrationsRouter)
app.use('/api/geography', geographyRouter)
app.use('/api/categories', categoriesRouter)
app.use('/api/verification', verificationRouter)
app.use('/api/notifications', notificationsRouter)
app.use('/api/track', trackingRouter)
app.use('/api/analytics', analyticsRouter)
app.use('/api/admin', adminRouter)
app.use('/api/refunds', refundsRouter)

// Error handling middleware (must be after all routes)
app.use(errorHandlingMiddleware())

// In production, serve the built frontend
if (process.env.NODE_ENV === 'production') {
  const frontendPath = join(__dirname, '../../frontend/dist')

  // Serve static files from frontend build
  app.use(express.static(frontendPath))

  // SPA fallback - serve index.html for all non-API routes
  app.get('*', (req, res) => {
    res.sendFile(join(frontendPath, 'index.html'))
  })
}

httpServer.listen(PORT, () => {
  console.log(`🚀 Vilo backend running on http://localhost:${PORT}`)
  console.log(`📡 WebSocket server listening on ws://localhost:${PORT}`)

  // Initialize subscription automation cron jobs
  initializeSubscriptionJobs()
})


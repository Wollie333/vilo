import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import bookingsRouter from './routes/bookings.js'
import roomsRouter from './routes/rooms.js'
import addonsRouter from './routes/addons.js'
import tenantsRouter from './routes/tenants.js'
import paymentsRouter from './routes/payments.js'
import publicRouter from './routes/public.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Load .env file from backend directory
dotenv.config({ path: join(__dirname, '../.env') })

const app = express()
const PORT = process.env.PORT || 3001

app.use(cors())
app.use(express.json({ limit: '50mb' }))

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
app.use('/api/tenants', tenantsRouter)
app.use('/api/payments', paymentsRouter)
app.use('/api/public', publicRouter)

app.listen(PORT, () => {
  console.log(`🚀 Vilo backend running on http://localhost:${PORT}`)
})


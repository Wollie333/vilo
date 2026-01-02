import { Server, Socket } from 'socket.io'
import { supabase } from '../lib/supabase.js'

interface AuthenticatedSocket extends Socket {
  customerId?: string
  email?: string
}

/**
 * Setup the /portal namespace for customer WebSocket connections
 */
export function setupPortalNamespace(io: Server): void {
  const portalNs = io.of('/portal')

  console.log('[WebSocket] Portal namespace setup')

  // Authentication middleware
  portalNs.use(async (socket: AuthenticatedSocket, next) => {
    console.log('[WebSocket] Portal auth middleware - connection attempt')
    try {
      const token = socket.handshake.auth.token || socket.handshake.query.token

      if (!token) {
        console.log('[WebSocket] Portal auth failed - missing token')
        return next(new Error('Authentication required'))
      }

      // Verify session token
      const { data, error } = await supabase
        .from('customer_access_tokens')
        .select('*, customers(*)')
        .eq('token', token)
        .eq('token_type', 'booking_access')
        .is('used_at', null)
        .gt('expires_at', new Date().toISOString())
        .single()

      if (error || !data || !data.customers) {
        console.log('[WebSocket] Portal auth failed - invalid token')
        return next(new Error('Invalid or expired token'))
      }

      console.log('[WebSocket] Portal customer verified:', data.customers.email)

      // Attach customer info to socket
      socket.customerId = data.customers.id
      socket.email = data.customers.email

      next()
    } catch (error) {
      console.error('[WebSocket] Portal auth error:', error)
      next(new Error('Authentication failed'))
    }
  })

  // Connection handler
  portalNs.on('connection', (socket: AuthenticatedSocket) => {
    console.log(`[WebSocket] Portal customer connected: ${socket.email}`)

    // Join customer room
    if (socket.customerId) {
      socket.join(`customer:${socket.customerId}`)
      console.log(`[WebSocket] Customer ${socket.email} joined room customer:${socket.customerId}`)
    }

    // Handle disconnect
    socket.on('disconnect', (reason) => {
      console.log(`Portal customer disconnected: ${socket.email} (${reason})`)
    })

    // Handle errors
    socket.on('error', (error) => {
      console.error(`Portal socket error for ${socket.email}:`, error)
    })
  })
}

import { Server, Socket } from 'socket.io'
import { supabase } from '../lib/supabase.js'

interface AuthenticatedSocket extends Socket {
  userId?: string
  email?: string
  tenantId?: string
}

/**
 * Setup the /dashboard namespace for staff/admin WebSocket connections
 */
export function setupDashboardNamespace(io: Server): void {
  const dashboardNs = io.of('/dashboard')

  console.log('[WebSocket] Dashboard namespace setup')

  // Authentication middleware
  dashboardNs.use(async (socket: AuthenticatedSocket, next) => {
    console.log('[WebSocket] Dashboard auth middleware - connection attempt')
    try {
      const token = socket.handshake.auth.token || socket.handshake.query.token
      const tenantId = socket.handshake.auth.tenantId || socket.handshake.query.tenantId

      console.log('[WebSocket] Auth params:', { hasToken: !!token, hasTenantId: !!tenantId })

      if (!token || !tenantId) {
        console.log('[WebSocket] Auth failed - missing token or tenantId')
        return next(new Error('Authentication required'))
      }

      // Verify JWT token with Supabase
      const { data: { user }, error: authError } = await supabase.auth.getUser(token as string)

      if (authError || !user) {
        console.log('[WebSocket] Auth failed - invalid token:', authError?.message)
        return next(new Error('Invalid token'))
      }

      console.log('[WebSocket] User verified:', user.email)

      // Verify user is a member of this tenant
      const { data: tenant } = await supabase
        .from('tenants')
        .select('id, owner_user_id')
        .eq('id', tenantId)
        .single()

      if (!tenant) {
        return next(new Error('Tenant not found'))
      }

      // Check if owner or member
      const isOwner = tenant.owner_user_id === user.id

      if (!isOwner) {
        const { data: membership } = await supabase
          .from('tenant_members')
          .select('id')
          .eq('tenant_id', tenantId)
          .eq('user_id', user.id)
          .eq('status', 'active')
          .single()

        if (!membership) {
          return next(new Error('Not a member of this tenant'))
        }
      }

      // Attach user info to socket
      socket.userId = user.id
      socket.email = user.email
      socket.tenantId = tenantId as string

      next()
    } catch (error) {
      console.error('[WebSocket] Dashboard auth error:', error)
      next(new Error('Authentication failed'))
    }
  })

  // Connection handler
  dashboardNs.on('connection', (socket: AuthenticatedSocket) => {
    console.log(`[WebSocket] Dashboard user connected: ${socket.email} (tenant: ${socket.tenantId})`)

    // Join tenant room
    if (socket.tenantId) {
      socket.join(`tenant:${socket.tenantId}`)
      console.log(`[WebSocket] User ${socket.email} joined room tenant:${socket.tenantId}`)
    }

    // Handle disconnect
    socket.on('disconnect', (reason) => {
      console.log(`Dashboard user disconnected: ${socket.email} (${reason})`)
    })

    // Handle errors
    socket.on('error', (error) => {
      console.error(`Dashboard socket error for ${socket.email}:`, error)
    })
  })
}

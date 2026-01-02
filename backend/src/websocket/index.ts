import { Server as HttpServer } from 'http'
import { Server } from 'socket.io'
import { setupDashboardNamespace } from './dashboardNamespace.js'
import { setupPortalNamespace } from './portalNamespace.js'

let io: Server | null = null

/**
 * Initialize Socket.IO WebSocket server
 */
export function initializeWebSocket(httpServer: HttpServer): Server {
  console.log('[WebSocket] Initializing Socket.IO server...')

  io = new Server(httpServer, {
    cors: {
      origin: '*', // Allow all origins in dev, configure properly in production
      methods: ['GET', 'POST'],
      credentials: true
    },
    transports: ['websocket', 'polling']
  })

  // Log all connection attempts to root namespace
  io.on('connection', (socket) => {
    console.log('[WebSocket] Root namespace connection:', socket.id)
  })

  // Setup namespaces
  setupDashboardNamespace(io)
  setupPortalNamespace(io)

  console.log('[WebSocket] Server initialized successfully')

  return io
}

/**
 * Get the Socket.IO instance
 */
export function getIO(): Server | null {
  return io
}

/**
 * Emit notification to dashboard users (staff/admin) for a specific tenant
 */
export function emitDashboardNotification(tenantId: string, notification: any): void {
  if (!io) {
    console.warn('WebSocket not initialized, cannot emit notification')
    return
  }

  console.log(`[WebSocket] Emitting notification to tenant:${tenantId}`, notification.title)
  io.of('/dashboard').to(`tenant:${tenantId}`).emit('notification', { notification })
}

/**
 * Emit notification to a specific customer
 */
export function emitCustomerNotification(customerId: string, notification: any): void {
  if (!io) {
    console.warn('WebSocket not initialized, cannot emit notification')
    return
  }

  console.log(`[WebSocket] Emitting notification to customer:${customerId}`, notification.title)
  io.of('/portal').to(`customer:${customerId}`).emit('notification', { notification })
}

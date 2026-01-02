import { createContext, useContext, useEffect, useRef, useState, useCallback, ReactNode } from 'react'
import { io, Socket } from 'socket.io-client'
import { useAuth } from './AuthContext'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3002/api'
// Socket.IO uses HTTP/HTTPS URLs (not ws://), it handles the upgrade internally
const WS_URL = API_URL.replace('/api', '')

interface WebSocketContextType {
  isConnected: boolean
  subscribe: (event: string, callback: (data: any) => void) => () => void
}

const WebSocketContext = createContext<WebSocketContextType | undefined>(undefined)

export function WebSocketProvider({ children }: { children: ReactNode }) {
  const { session, tenant } = useAuth()
  const [isConnected, setIsConnected] = useState(false)
  const socketRef = useRef<Socket | null>(null)
  const subscribersRef = useRef<Map<string, Set<(data: any) => void>>>(new Map())

  useEffect(() => {
    // Only connect if we have both session token and tenant
    if (!session?.access_token || !tenant?.id) {
      console.log('[WebSocket] Not connecting - missing session or tenant', {
        hasSession: !!session?.access_token,
        hasTenant: !!tenant?.id
      })
      // Disconnect if connected but no longer authenticated
      if (socketRef.current) {
        socketRef.current.disconnect()
        socketRef.current = null
        setIsConnected(false)
      }
      return
    }

    // Don't reconnect if already connected
    if (socketRef.current?.connected) {
      console.log('[WebSocket] Already connected, skipping')
      return
    }

    console.log('[WebSocket] Connecting to:', `${WS_URL}/dashboard`)

    // Connect to dashboard namespace
    const socket = io(`${WS_URL}/dashboard`, {
      auth: {
        token: session.access_token,
        tenantId: tenant.id
      },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000
    })

    socket.on('connect', () => {
      console.log('Dashboard WebSocket connected')
      setIsConnected(true)
    })

    socket.on('disconnect', (reason) => {
      console.log('Dashboard WebSocket disconnected:', reason)
      setIsConnected(false)
    })

    socket.on('connect_error', (error) => {
      console.error('Dashboard WebSocket connection error:', error.message)
      setIsConnected(false)
    })

    // Generic message handler - routes to subscribers
    socket.onAny((event, data) => {
      console.log('[WebSocket] Received event:', event, data)
      const callbacks = subscribersRef.current.get(event)
      if (callbacks) {
        callbacks.forEach(callback => callback(data))
      }
    })

    socketRef.current = socket

    return () => {
      socket.disconnect()
      socketRef.current = null
      setIsConnected(false)
    }
  }, [session?.access_token, tenant?.id])

  // Subscribe to events
  const subscribe = useCallback((event: string, callback: (data: any) => void) => {
    console.log('[WebSocket] Subscribing to event:', event)
    if (!subscribersRef.current.has(event)) {
      subscribersRef.current.set(event, new Set())
    }
    subscribersRef.current.get(event)!.add(callback)

    // Return unsubscribe function
    return () => {
      console.log('[WebSocket] Unsubscribing from event:', event)
      subscribersRef.current.get(event)?.delete(callback)
    }
  }, [])

  return (
    <WebSocketContext.Provider value={{ isConnected, subscribe }}>
      {children}
    </WebSocketContext.Provider>
  )
}

export function useWebSocket() {
  const context = useContext(WebSocketContext)
  if (context === undefined) {
    throw new Error('useWebSocket must be used within a WebSocketProvider')
  }
  return context
}

// Hook specifically for notification updates
export function useNotificationSubscription(onNotification: (notification: any) => void) {
  const { subscribe } = useWebSocket()

  useEffect(() => {
    const unsubscribe = subscribe('notification', (data) => {
      onNotification(data.notification)
    })

    return unsubscribe
  }, [subscribe, onNotification])
}

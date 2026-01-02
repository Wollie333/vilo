import { createContext, useContext, useEffect, useRef, useState, useCallback, ReactNode } from 'react'
import { io, Socket } from 'socket.io-client'
import { useCustomerAuth } from './CustomerAuthContext'
import { getCustomerToken } from '../services/portalApi'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3002/api'
// Socket.IO uses HTTP/HTTPS URLs (not ws://), it handles the upgrade internally
const WS_URL = API_URL.replace('/api', '')

interface CustomerWebSocketContextType {
  isConnected: boolean
  subscribe: (event: string, callback: (data: any) => void) => () => void
}

const CustomerWebSocketContext = createContext<CustomerWebSocketContextType | undefined>(undefined)

export function CustomerWebSocketProvider({ children }: { children: ReactNode }) {
  const { customer, isAuthenticated } = useCustomerAuth()
  const [isConnected, setIsConnected] = useState(false)
  const socketRef = useRef<Socket | null>(null)
  const subscribersRef = useRef<Map<string, Set<(data: any) => void>>>(new Map())

  useEffect(() => {
    // Only connect if authenticated
    if (!isAuthenticated || !customer) {
      if (socketRef.current) {
        socketRef.current.disconnect()
        socketRef.current = null
        setIsConnected(false)
      }
      return
    }

    const token = getCustomerToken()
    if (!token) {
      return
    }

    // Don't reconnect if already connected
    if (socketRef.current?.connected) {
      return
    }

    // Connect to portal namespace
    const socket = io(`${WS_URL}/portal`, {
      auth: {
        token
      },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000
    })

    socket.on('connect', () => {
      console.log('Portal WebSocket connected')
      setIsConnected(true)
    })

    socket.on('disconnect', (reason) => {
      console.log('Portal WebSocket disconnected:', reason)
      setIsConnected(false)
    })

    socket.on('connect_error', (error) => {
      console.error('Portal WebSocket connection error:', error.message)
      setIsConnected(false)
    })

    // Generic message handler - routes to subscribers
    socket.onAny((event, data) => {
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
  }, [isAuthenticated, customer])

  // Subscribe to events
  const subscribe = useCallback((event: string, callback: (data: any) => void) => {
    if (!subscribersRef.current.has(event)) {
      subscribersRef.current.set(event, new Set())
    }
    subscribersRef.current.get(event)!.add(callback)

    // Return unsubscribe function
    return () => {
      subscribersRef.current.get(event)?.delete(callback)
    }
  }, [])

  return (
    <CustomerWebSocketContext.Provider value={{ isConnected, subscribe }}>
      {children}
    </CustomerWebSocketContext.Provider>
  )
}

export function useCustomerWebSocket() {
  const context = useContext(CustomerWebSocketContext)
  if (context === undefined) {
    throw new Error('useCustomerWebSocket must be used within a CustomerWebSocketProvider')
  }
  return context
}

// Hook specifically for notification updates
export function useCustomerNotificationSubscription(onNotification: (notification: any) => void) {
  const { subscribe } = useCustomerWebSocket()

  useEffect(() => {
    const unsubscribe = subscribe('notification', (data) => {
      onNotification(data.notification)
    })

    return unsubscribe
  }, [subscribe, onNotification])
}

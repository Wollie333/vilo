import { useEffect, useRef, useState, useCallback } from 'react'
import { io, Socket } from 'socket.io-client'
import { useSuperAdmin } from '../contexts/SuperAdminContext'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3002/api'
const WS_URL = API_URL.replace('/api', '')

export interface AnalyticsUpdate {
  type: 'mrr_updated' | 'new_tenant' | 'tenant_churned' | 'booking_created' | 'subscription_changed'
  data: any
  timestamp: string
}

interface UseAdminAnalyticsSocketOptions {
  onMrrUpdate?: (data: { mrr: number; change: number }) => void
  onNewTenant?: (data: { tenantId: string; name: string; plan: string }) => void
  onTenantChurned?: (data: { tenantId: string; name: string; mrr: number }) => void
  onBookingCreated?: (data: { bookingId: string; tenantId: string; amount: number }) => void
  onSubscriptionChanged?: (data: { tenantId: string; fromPlan: string; toPlan: string; mrrChange: number }) => void
  onAnyUpdate?: (update: AnalyticsUpdate) => void
}

export function useAdminAnalyticsSocket(options: UseAdminAnalyticsSocketOptions = {}) {
  const { session, admin } = useSuperAdmin()
  const [isConnected, setIsConnected] = useState(false)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
  const socketRef = useRef<Socket | null>(null)
  const optionsRef = useRef(options)

  // Keep options ref updated
  useEffect(() => {
    optionsRef.current = options
  }, [options])

  useEffect(() => {
    // Only connect if we have admin session
    if (!session?.access_token || !admin) {
      if (socketRef.current) {
        socketRef.current.disconnect()
        socketRef.current = null
        setIsConnected(false)
      }
      return
    }

    // Don't reconnect if already connected
    if (socketRef.current?.connected) {
      return
    }

    console.log('[AdminAnalyticsSocket] Connecting to:', `${WS_URL}/admin-analytics`)

    // Connect to admin-analytics namespace
    const socket = io(`${WS_URL}/admin-analytics`, {
      auth: {
        token: session.access_token,
        adminId: admin.id
      },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000
    })

    socket.on('connect', () => {
      console.log('[AdminAnalyticsSocket] Connected')
      setIsConnected(true)
    })

    socket.on('disconnect', (reason) => {
      console.log('[AdminAnalyticsSocket] Disconnected:', reason)
      setIsConnected(false)
    })

    socket.on('connect_error', (error) => {
      console.error('[AdminAnalyticsSocket] Connection error:', error.message)
      setIsConnected(false)
    })

    // Analytics event handlers
    socket.on('analytics:mrr_updated', (data) => {
      console.log('[AdminAnalyticsSocket] MRR updated:', data)
      setLastUpdate(new Date())
      optionsRef.current.onMrrUpdate?.(data)
      optionsRef.current.onAnyUpdate?.({
        type: 'mrr_updated',
        data,
        timestamp: new Date().toISOString()
      })
    })

    socket.on('analytics:new_tenant', (data) => {
      console.log('[AdminAnalyticsSocket] New tenant:', data)
      setLastUpdate(new Date())
      optionsRef.current.onNewTenant?.(data)
      optionsRef.current.onAnyUpdate?.({
        type: 'new_tenant',
        data,
        timestamp: new Date().toISOString()
      })
    })

    socket.on('analytics:tenant_churned', (data) => {
      console.log('[AdminAnalyticsSocket] Tenant churned:', data)
      setLastUpdate(new Date())
      optionsRef.current.onTenantChurned?.(data)
      optionsRef.current.onAnyUpdate?.({
        type: 'tenant_churned',
        data,
        timestamp: new Date().toISOString()
      })
    })

    socket.on('analytics:booking_created', (data) => {
      console.log('[AdminAnalyticsSocket] Booking created:', data)
      setLastUpdate(new Date())
      optionsRef.current.onBookingCreated?.(data)
      optionsRef.current.onAnyUpdate?.({
        type: 'booking_created',
        data,
        timestamp: new Date().toISOString()
      })
    })

    socket.on('analytics:subscription_changed', (data) => {
      console.log('[AdminAnalyticsSocket] Subscription changed:', data)
      setLastUpdate(new Date())
      optionsRef.current.onSubscriptionChanged?.(data)
      optionsRef.current.onAnyUpdate?.({
        type: 'subscription_changed',
        data,
        timestamp: new Date().toISOString()
      })
    })

    socketRef.current = socket

    return () => {
      socket.disconnect()
      socketRef.current = null
      setIsConnected(false)
    }
  }, [session?.access_token, admin?.id])

  // Method to manually trigger a refresh request
  const requestRefresh = useCallback(() => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('analytics:request_refresh')
    }
  }, [])

  return {
    isConnected,
    lastUpdate,
    requestRefresh
  }
}

// Hook for live metrics indicator
export function useLiveIndicator() {
  const [isLive, setIsLive] = useState(false)
  const [pulseActive, setPulseActive] = useState(false)

  const { isConnected, lastUpdate } = useAdminAnalyticsSocket({
    onAnyUpdate: () => {
      // Trigger pulse animation on any update
      setPulseActive(true)
      setTimeout(() => setPulseActive(false), 1000)
    }
  })

  useEffect(() => {
    setIsLive(isConnected)
  }, [isConnected])

  return {
    isLive,
    pulseActive,
    lastUpdate
  }
}

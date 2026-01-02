import { useState, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { Bell, Check, Calendar, CreditCard, MessageSquare, PartyPopper } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { portalApi } from '../../services/portalApi'
import { useCustomerNotificationSubscription } from '../../contexts/CustomerWebSocketContext'

interface Notification {
  id: string
  type: string
  title: string
  message: string | null
  link_type: string | null
  link_id: string | null
  read_at: string | null
  created_at: string
}

const POLL_INTERVAL = 60000 // 60 seconds (increased since we have real-time updates)

const notificationIcons: Record<string, typeof Calendar> = {
  booking_confirmed: Calendar,
  booking_reminder: Calendar,
  booking_cancelled: Calendar,
  payment_confirmed: CreditCard,
  support_ticket_replied: MessageSquare,
  portal_welcome: PartyPopper
}

const notificationColors: Record<string, string> = {
  booking_confirmed: 'bg-green-100 text-green-600',
  booking_reminder: 'bg-amber-100 text-amber-600',
  booking_cancelled: 'bg-red-100 text-red-600',
  payment_confirmed: 'bg-emerald-100 text-emerald-600',
  support_ticket_replied: 'bg-indigo-100 text-indigo-600',
  portal_welcome: 'bg-accent-100 text-accent-600'
}

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / (1000 * 60))
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffMins < 1) {
    return 'Just now'
  } else if (diffMins < 60) {
    return `${diffMins}m ago`
  } else if (diffHours < 24) {
    return `${diffHours}h ago`
  } else if (diffDays === 1) {
    return 'Yesterday'
  } else if (diffDays < 7) {
    return `${diffDays}d ago`
  } else {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }
}

export default function CustomerNotificationBell() {
  const navigate = useNavigate()
  const [isOpen, setIsOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Handle real-time notification via WebSocket
  const handleRealtimeNotification = useCallback((notification: Notification) => {
    // Add to notifications list (prepend)
    setNotifications(prev => [notification, ...prev.slice(0, 9)]) // Keep max 10
    // Increment unread count
    setUnreadCount(prev => prev + 1)
  }, [])

  // Subscribe to real-time notifications
  useCustomerNotificationSubscription(handleRealtimeNotification)

  // Fetch unread count
  const fetchUnreadCount = useCallback(async () => {
    try {
      const data = await portalApi.getUnreadCount()
      setUnreadCount(data.count)
    } catch (error) {
      console.error('Failed to fetch unread count:', error)
    }
  }, [])

  // Fetch notifications
  const fetchNotifications = useCallback(async () => {
    try {
      const data = await portalApi.getNotifications({ limit: 10 })
      setNotifications(data.notifications)
      setUnreadCount(data.unread)
    } catch (error) {
      console.error('Failed to fetch notifications:', error)
    }
  }, [])

  // Poll for unread count
  useEffect(() => {
    fetchUnreadCount()
    const interval = setInterval(fetchUnreadCount, POLL_INTERVAL)
    return () => clearInterval(interval)
  }, [fetchUnreadCount])

  // Fetch notifications when dropdown opens
  useEffect(() => {
    if (isOpen) {
      fetchNotifications()
    }
  }, [isOpen, fetchNotifications])

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Mark notification as read and navigate
  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.read_at) {
      try {
        await portalApi.markNotificationAsRead(notification.id)
        setNotifications(prev =>
          prev.map(n => (n.id === notification.id ? { ...n, read_at: new Date().toISOString() } : n))
        )
        setUnreadCount(prev => Math.max(0, prev - 1))
      } catch (error) {
        console.error('Failed to mark as read:', error)
      }
    }

    // Navigate based on link_type
    if (notification.link_type && notification.link_id) {
      switch (notification.link_type) {
        case 'booking':
          navigate(`/portal/bookings/${notification.link_id}`)
          break
        case 'support':
          navigate(`/portal/support/${notification.link_id}`)
          break
      }
    }

    setIsOpen(false)
  }

  // Mark all as read
  const handleMarkAllRead = async () => {
    try {
      await portalApi.markAllNotificationsAsRead()
      setNotifications(prev => prev.map(n => ({ ...n, read_at: new Date().toISOString() })))
      setUnreadCount(0)
    } catch (error) {
      console.error('Failed to mark all as read:', error)
    }
  }

  // Calculate dropdown position
  const getDropdownPosition = () => {
    if (!buttonRef.current) return { top: 0, right: 0 }
    const rect = buttonRef.current.getBoundingClientRect()
    return {
      top: rect.bottom + 8,
      right: window.innerWidth - rect.right
    }
  }

  const position = getDropdownPosition()
  const hasUnread = notifications.some(n => !n.read_at)

  return (
    <>
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-lg transition-colors hover:bg-gray-100"
        style={{ color: 'var(--text-secondary)' }}
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center bg-red-500 text-white text-xs font-medium rounded-full px-1">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen &&
        createPortal(
          <div
            ref={dropdownRef}
            style={{
              position: 'fixed',
              top: position.top,
              right: position.right,
              zIndex: 9999
            }}
          >
            <div
              style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}
              className="w-80 rounded-xl shadow-xl border overflow-hidden"
            >
              {/* Header */}
              <div
                style={{ borderColor: 'var(--border-color)' }}
                className="flex items-center justify-between px-4 py-3 border-b"
              >
                <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                  Notifications
                </h3>
                {hasUnread && (
                  <button
                    onClick={handleMarkAllRead}
                    className="flex items-center gap-1.5 text-sm text-accent-600 hover:text-accent-700 transition-colors"
                  >
                    <Check size={14} />
                    Mark all read
                  </button>
                )}
              </div>

              {/* List */}
              <div className="max-h-[320px] overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="py-10 text-center">
                    <Bell size={28} className="mx-auto text-gray-300 mb-2" />
                    <p style={{ color: 'var(--text-muted)' }} className="text-sm">
                      No notifications yet
                    </p>
                  </div>
                ) : (
                  <div className="divide-y" style={{ borderColor: 'var(--border-color)' }}>
                    {notifications.map(notification => {
                      const Icon = notificationIcons[notification.type] || Calendar
                      const colorClass = notificationColors[notification.type] || 'bg-gray-100 text-gray-600'
                      const isUnread = !notification.read_at

                      return (
                        <button
                          key={notification.id}
                          onClick={() => handleNotificationClick(notification)}
                          className={`w-full flex items-start gap-3 p-3 text-left transition-colors ${
                            isUnread ? 'bg-accent-50/50' : 'hover:bg-gray-50'
                          }`}
                        >
                          {/* Unread indicator */}
                          <div className="pt-1.5">
                            {isUnread ? (
                              <div className="w-2 h-2 rounded-full bg-accent-500" />
                            ) : (
                              <div className="w-2 h-2" />
                            )}
                          </div>

                          {/* Icon */}
                          <div className={`w-8 h-8 rounded-full ${colorClass} flex items-center justify-center shrink-0`}>
                            <Icon size={14} />
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm ${isUnread ? 'font-medium' : ''}`} style={{ color: 'var(--text-primary)' }}>
                              {notification.title}
                            </p>
                            {notification.message && (
                              <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--text-muted)' }}>
                                {notification.message}
                              </p>
                            )}
                            <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                              {formatRelativeTime(notification.created_at)}
                            </p>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Footer */}
              {notifications.length > 0 && (
                <div style={{ borderColor: 'var(--border-color)' }} className="border-t">
                  <button
                    onClick={() => {
                      navigate('/portal/profile?section=notifications')
                      setIsOpen(false)
                    }}
                    className="w-full py-3 text-sm text-center text-accent-600 hover:bg-gray-50 transition-colors"
                  >
                    Notification Settings
                  </button>
                </div>
              )}
            </div>
          </div>,
          document.body
        )}
    </>
  )
}

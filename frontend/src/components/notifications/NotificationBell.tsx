import { useState, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { Bell } from 'lucide-react'
import NotificationDropdown from './NotificationDropdown'
import { notificationsApi } from '../../services/api'
import { Notification } from './NotificationItem'
import { useNotificationSubscription } from '../../contexts/WebSocketContext'

const POLL_INTERVAL = 60000 // 60 seconds (increased since we have real-time updates)

export default function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Handle real-time notification via WebSocket
  const handleRealtimeNotification = useCallback((notification: Notification) => {
    console.log('[NotificationBell] Received real-time notification:', notification)
    // Add to notifications list (prepend)
    setNotifications(prev => [notification, ...prev.slice(0, 19)]) // Keep max 20
    // Increment unread count
    setUnreadCount(prev => prev + 1)
  }, [])

  // Subscribe to real-time notifications
  useNotificationSubscription(handleRealtimeNotification)

  // Fetch unread count (for badge)
  const fetchUnreadCount = useCallback(async () => {
    try {
      const data = await notificationsApi.getUnreadCount()
      setUnreadCount(data.count)
    } catch (error) {
      console.error('Failed to fetch unread count:', error)
    }
  }, [])

  // Fetch notifications (when dropdown opens)
  const fetchNotifications = useCallback(async () => {
    setIsLoading(true)
    try {
      const data = await notificationsApi.getAll({ limit: 20 })
      setNotifications(data.notifications)
      setUnreadCount(data.unread)
    } catch (error) {
      console.error('Failed to fetch notifications:', error)
    } finally {
      setIsLoading(false)
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

  // Mark notification as read
  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.read_at) {
      try {
        await notificationsApi.markAsRead(notification.id)
        setNotifications(prev =>
          prev.map(n => (n.id === notification.id ? { ...n, read_at: new Date().toISOString() } : n))
        )
        setUnreadCount(prev => Math.max(0, prev - 1))
      } catch (error) {
        console.error('Failed to mark as read:', error)
      }
    }
  }

  // Mark all as read
  const handleMarkAllRead = async () => {
    try {
      await notificationsApi.markAllAsRead()
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

  return (
    <>
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-md transition-colors hover:bg-gray-100"
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
            <NotificationDropdown
              notifications={notifications}
              onMarkAllRead={handleMarkAllRead}
              onNotificationClick={handleNotificationClick}
              onClose={() => setIsOpen(false)}
            />
          </div>,
          document.body
        )}
    </>
  )
}

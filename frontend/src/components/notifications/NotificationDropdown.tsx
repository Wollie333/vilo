import { Check, Bell } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import NotificationItem, { Notification } from './NotificationItem'

interface NotificationDropdownProps {
  notifications: Notification[]
  onMarkAllRead: () => void
  onNotificationClick: (notification: Notification) => void
  onClose: () => void
}

// Group notifications by date
function groupByDate(notifications: Notification[]): Record<string, Notification[]> {
  const groups: Record<string, Notification[]> = {}
  const now = new Date()
  const today = now.toDateString()
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000).toDateString()

  notifications.forEach(notification => {
    const date = new Date(notification.created_at)
    const dateStr = date.toDateString()

    let groupKey: string
    if (dateStr === today) {
      groupKey = 'Today'
    } else if (dateStr === yesterday) {
      groupKey = 'Yesterday'
    } else {
      groupKey = 'Earlier'
    }

    if (!groups[groupKey]) {
      groups[groupKey] = []
    }
    groups[groupKey].push(notification)
  })

  return groups
}

export default function NotificationDropdown({
  notifications,
  onMarkAllRead,
  onNotificationClick,
  onClose
}: NotificationDropdownProps) {
  const navigate = useNavigate()
  const hasUnread = notifications.some(n => !n.read_at)
  const grouped = groupByDate(notifications)
  const groupOrder = ['Today', 'Yesterday', 'Earlier']

  const handleNotificationClick = (notification: Notification) => {
    onNotificationClick(notification)

    // Navigate to the relevant page based on link_type
    if (notification.link_type && notification.link_id) {
      switch (notification.link_type) {
        case 'booking':
          navigate(`/dashboard/bookings/${notification.link_id}`)
          break
        case 'support':
          navigate(`/dashboard/support/${notification.link_id}`)
          break
        case 'review':
          navigate(`/dashboard/bookings/${notification.link_id}`)
          break
        case 'customer':
          navigate(`/dashboard/customers/${notification.link_id}`)
          break
        case 'room':
          navigate(`/dashboard/rooms/${notification.link_id}`)
          break
        case 'settings':
          navigate('/dashboard/settings')
          break
      }
    }

    onClose()
  }

  return (
    <div
      style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}
      className="w-96 rounded-xl shadow-xl border overflow-hidden"
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
            onClick={onMarkAllRead}
            className="flex items-center gap-1.5 text-sm text-accent-600 hover:text-accent-700 transition-colors"
          >
            <Check size={14} />
            Mark all read
          </button>
        )}
      </div>

      {/* Notifications list */}
      <div className="max-h-[400px] overflow-y-auto">
        {notifications.length === 0 ? (
          <div className="py-12 text-center">
            <Bell size={32} className="mx-auto text-gray-300 mb-3" />
            <p style={{ color: 'var(--text-muted)' }} className="text-sm">
              No notifications yet
            </p>
          </div>
        ) : (
          groupOrder.map(group => {
            if (!grouped[group] || grouped[group].length === 0) return null

            return (
              <div key={group}>
                <div
                  style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-muted)' }}
                  className="px-4 py-1.5 text-xs font-medium uppercase tracking-wide"
                >
                  {group}
                </div>
                <div style={{ borderColor: 'var(--border-color)' }} className="divide-y">
                  {grouped[group].map(notification => (
                    <NotificationItem
                      key={notification.id}
                      notification={notification}
                      onClick={() => handleNotificationClick(notification)}
                    />
                  ))}
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Footer */}
      {notifications.length > 0 && (
        <div style={{ borderColor: 'var(--border-color)' }} className="border-t">
          <button
            onClick={() => {
              navigate('/dashboard/settings#notifications')
              onClose()
            }}
            className="w-full py-3 text-sm text-center text-accent-600 hover:bg-gray-50 transition-colors"
          >
            Notification Settings
          </button>
        </div>
      )}
    </div>
  )
}

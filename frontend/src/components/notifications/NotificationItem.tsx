import {
  Calendar,
  CalendarPlus,
  CalendarX,
  DoorOpen,
  DoorClosed,
  CreditCard,
  Star,
  MessageSquare,
  RefreshCw,
  AlertCircle,
  PartyPopper
} from 'lucide-react'

export interface Notification {
  id: string
  type: string
  title: string
  message: string | null
  link_type: string | null
  link_id: string | null
  read_at: string | null
  created_at: string
}

interface NotificationItemProps {
  notification: Notification
  onClick?: () => void
}

const notificationIcons: Record<string, typeof Calendar> = {
  booking_created: CalendarPlus,
  booking_cancelled: CalendarX,
  booking_checked_in: DoorOpen,
  booking_checked_out: DoorClosed,
  booking_confirmed: Calendar,
  booking_reminder: Calendar,
  payment_received: CreditCard,
  payment_confirmed: CreditCard,
  review_submitted: Star,
  support_ticket_created: MessageSquare,
  support_ticket_replied: MessageSquare,
  sync_completed: RefreshCw,
  sync_failed: AlertCircle,
  portal_welcome: PartyPopper
}

const notificationColors: Record<string, string> = {
  booking_created: 'bg-blue-100 text-blue-600',
  booking_cancelled: 'bg-red-100 text-red-600',
  booking_checked_in: 'bg-teal-100 text-teal-600',
  booking_checked_out: 'bg-slate-100 text-slate-600',
  booking_confirmed: 'bg-green-100 text-green-600',
  booking_reminder: 'bg-amber-100 text-amber-600',
  payment_received: 'bg-emerald-100 text-emerald-600',
  payment_confirmed: 'bg-emerald-100 text-emerald-600',
  review_submitted: 'bg-amber-100 text-amber-600',
  support_ticket_created: 'bg-purple-100 text-purple-600',
  support_ticket_replied: 'bg-indigo-100 text-indigo-600',
  sync_completed: 'bg-green-100 text-green-600',
  sync_failed: 'bg-red-100 text-red-600',
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

export default function NotificationItem({ notification, onClick }: NotificationItemProps) {
  const Icon = notificationIcons[notification.type] || Calendar
  const colorClass = notificationColors[notification.type] || 'bg-gray-100 text-gray-600'
  const isUnread = !notification.read_at

  return (
    <button
      onClick={onClick}
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
      <div className={`w-9 h-9 rounded-full ${colorClass} flex items-center justify-center shrink-0`}>
        <Icon size={16} />
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
}

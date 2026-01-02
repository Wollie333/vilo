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
  PartyPopper,
  Users,
  UserPlus,
  Shield,
  LogOut,
  Ban,
  Upload,
  Bell,
  Clock,
  MapPin,
  User,
  Home,
  Hash
} from 'lucide-react'

// Dynamic data types for notifications
export interface NotificationData {
  // Booking data
  booking_id?: string
  booking_ref?: string
  guest_name?: string
  guest_email?: string
  room_name?: string
  room_id?: string
  check_in?: string
  check_out?: string
  nights?: number
  guests?: number
  total_amount?: number
  currency?: string
  status?: string
  payment_status?: string
  // Payment data
  amount?: number
  payment_method?: string
  payment_date?: string
  // Review data
  review_id?: string
  rating?: number
  comment?: string
  // Support data
  ticket_id?: string
  ticket_ref?: string
  customer_name?: string
  subject?: string
  priority?: string
  // Sync data
  source?: string
  bookings_imported?: number
  bookings_updated?: number
  error?: string
  // Member data
  business_name?: string
  role_name?: string
  invited_by?: string
  // Room data
  start_date?: string
  end_date?: string
  reason?: string
  available_days?: number
  period_days?: number
}

export interface Notification {
  id: string
  type: string
  title: string
  message: string | null
  link_type: string | null
  link_id: string | null
  data?: NotificationData | null
  read_at: string | null
  created_at: string
}

interface NotificationItemProps {
  notification: Notification
  onClick?: () => void
}

const notificationIcons: Record<string, typeof Calendar> = {
  // Booking notifications
  booking_created: CalendarPlus,
  booking_cancelled: CalendarX,
  booking_modified: Calendar,
  booking_modified_customer: Calendar,
  booking_checked_in: DoorOpen,
  booking_checked_out: DoorClosed,
  booking_confirmed: Calendar,
  booking_reminder: Clock,
  check_in_reminder: DoorOpen,
  room_blocked: Ban,
  low_availability: AlertCircle,
  // Payment notifications
  payment_received: CreditCard,
  payment_confirmed: CreditCard,
  payment_proof_uploaded: Upload,
  payment_overdue: AlertCircle,
  // Review notifications
  review_submitted: Star,
  review_requested: Star,
  review_response_added: MessageSquare,
  // Support notifications
  support_ticket_created: MessageSquare,
  support_ticket_replied: MessageSquare,
  support_status_changed: Bell,
  // System notifications
  sync_completed: RefreshCw,
  sync_failed: AlertCircle,
  portal_welcome: PartyPopper,
  // Member notifications
  member_invited: UserPlus,
  member_role_changed: Shield,
  member_removed: LogOut
}

const notificationColors: Record<string, string> = {
  // Booking notifications
  booking_created: 'bg-blue-100 text-blue-600',
  booking_cancelled: 'bg-red-100 text-red-600',
  booking_modified: 'bg-amber-100 text-amber-600',
  booking_modified_customer: 'bg-amber-100 text-amber-600',
  booking_checked_in: 'bg-teal-100 text-teal-600',
  booking_checked_out: 'bg-slate-100 text-slate-600',
  booking_confirmed: 'bg-green-100 text-green-600',
  booking_reminder: 'bg-amber-100 text-amber-600',
  check_in_reminder: 'bg-teal-100 text-teal-600',
  room_blocked: 'bg-orange-100 text-orange-600',
  low_availability: 'bg-yellow-100 text-yellow-600',
  // Payment notifications
  payment_received: 'bg-emerald-100 text-emerald-600',
  payment_confirmed: 'bg-emerald-100 text-emerald-600',
  payment_proof_uploaded: 'bg-blue-100 text-blue-600',
  payment_overdue: 'bg-red-100 text-red-600',
  // Review notifications
  review_submitted: 'bg-amber-100 text-amber-600',
  review_requested: 'bg-purple-100 text-purple-600',
  review_response_added: 'bg-indigo-100 text-indigo-600',
  // Support notifications
  support_ticket_created: 'bg-purple-100 text-purple-600',
  support_ticket_replied: 'bg-indigo-100 text-indigo-600',
  support_status_changed: 'bg-blue-100 text-blue-600',
  // System notifications
  sync_completed: 'bg-green-100 text-green-600',
  sync_failed: 'bg-red-100 text-red-600',
  portal_welcome: 'bg-accent-100 text-accent-600',
  // Member notifications
  member_invited: 'bg-blue-100 text-blue-600',
  member_role_changed: 'bg-purple-100 text-purple-600',
  member_removed: 'bg-red-100 text-red-600'
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

function formatCurrency(amount: number, currency?: string): string {
  return new Intl.NumberFormat('en-ZA', {
    style: 'currency',
    currency: currency || 'ZAR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount)
}

function formatShortDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

interface DataBadge {
  icon?: typeof Calendar
  text: string
  color: string
}

function getDataBadges(type: string, data?: NotificationData | null): DataBadge[] {
  if (!data) return []

  const badges: DataBadge[] = []

  // Booking-related badges
  if (type.startsWith('booking_') || type === 'check_in_reminder' || type === 'room_blocked') {
    // Guest name
    if (data.guest_name) {
      badges.push({
        icon: User,
        text: data.guest_name,
        color: 'bg-blue-50 text-blue-700'
      })
    }

    // Room name
    if (data.room_name) {
      badges.push({
        icon: Home,
        text: data.room_name,
        color: 'bg-purple-50 text-purple-700'
      })
    }

    // Amount
    if (data.total_amount !== undefined) {
      badges.push({
        icon: CreditCard,
        text: formatCurrency(data.total_amount, data.currency),
        color: 'bg-emerald-50 text-emerald-700'
      })
    }

    // Check-in/out dates
    if (data.check_in && data.check_out) {
      badges.push({
        icon: Calendar,
        text: `${formatShortDate(data.check_in)} - ${formatShortDate(data.check_out)}`,
        color: 'bg-amber-50 text-amber-700'
      })
    }

    // Nights and guests
    if (data.nights) {
      const guestText = data.guests ? `, ${data.guests} guest${data.guests > 1 ? 's' : ''}` : ''
      badges.push({
        text: `${data.nights} night${data.nights > 1 ? 's' : ''}${guestText}`,
        color: 'bg-slate-100 text-slate-600'
      })
    }
  }

  // Payment badges
  if (type.startsWith('payment_')) {
    if (data.amount !== undefined) {
      badges.push({
        icon: CreditCard,
        text: formatCurrency(data.amount, data.currency),
        color: 'bg-emerald-50 text-emerald-700'
      })
    }
    if (data.guest_name) {
      badges.push({
        icon: User,
        text: data.guest_name,
        color: 'bg-blue-50 text-blue-700'
      })
    }
    if (data.payment_method) {
      badges.push({
        text: data.payment_method,
        color: 'bg-slate-100 text-slate-600'
      })
    }
  }

  // Review badges
  if (type.startsWith('review_')) {
    if (data.rating !== undefined) {
      badges.push({
        icon: Star,
        text: `${data.rating}/5`,
        color: data.rating >= 4 ? 'bg-amber-50 text-amber-700' : data.rating >= 3 ? 'bg-yellow-50 text-yellow-700' : 'bg-red-50 text-red-700'
      })
    }
    if (data.guest_name) {
      badges.push({
        icon: User,
        text: data.guest_name,
        color: 'bg-blue-50 text-blue-700'
      })
    }
    if (data.room_name) {
      badges.push({
        icon: Home,
        text: data.room_name,
        color: 'bg-purple-50 text-purple-700'
      })
    }
  }

  // Support badges
  if (type.startsWith('support_')) {
    if (data.ticket_ref) {
      badges.push({
        icon: Hash,
        text: data.ticket_ref,
        color: 'bg-purple-50 text-purple-700'
      })
    }
    if (data.customer_name) {
      badges.push({
        icon: User,
        text: data.customer_name,
        color: 'bg-blue-50 text-blue-700'
      })
    }
    if (data.priority === 'high' || data.priority === 'urgent') {
      badges.push({
        icon: AlertCircle,
        text: data.priority.charAt(0).toUpperCase() + data.priority.slice(1),
        color: 'bg-red-50 text-red-700'
      })
    }
  }

  // Sync badges
  if (type.startsWith('sync_')) {
    if (data.room_name) {
      badges.push({
        icon: Home,
        text: data.room_name,
        color: 'bg-purple-50 text-purple-700'
      })
    }
    if (data.source) {
      badges.push({
        text: data.source,
        color: 'bg-slate-100 text-slate-600'
      })
    }
    if (data.bookings_imported !== undefined || data.bookings_updated !== undefined) {
      const parts = []
      if (data.bookings_imported) parts.push(`${data.bookings_imported} imported`)
      if (data.bookings_updated) parts.push(`${data.bookings_updated} updated`)
      if (parts.length > 0) {
        badges.push({
          text: parts.join(', '),
          color: 'bg-green-50 text-green-700'
        })
      }
    }
  }

  // Member badges
  if (type.startsWith('member_')) {
    if (data.business_name) {
      badges.push({
        icon: Home,
        text: data.business_name,
        color: 'bg-purple-50 text-purple-700'
      })
    }
    if (data.role_name) {
      badges.push({
        icon: Shield,
        text: data.role_name,
        color: 'bg-blue-50 text-blue-700'
      })
    }
  }

  // Low availability badges
  if (type === 'low_availability') {
    if (data.room_name) {
      badges.push({
        icon: Home,
        text: data.room_name,
        color: 'bg-purple-50 text-purple-700'
      })
    }
    if (data.available_days !== undefined && data.period_days !== undefined) {
      badges.push({
        icon: AlertCircle,
        text: `${data.available_days}/${data.period_days} days available`,
        color: 'bg-amber-50 text-amber-700'
      })
    }
  }

  return badges.slice(0, 3) // Limit to 3 badges max
}

export default function NotificationItem({ notification, onClick }: NotificationItemProps) {
  const Icon = notificationIcons[notification.type] || Calendar
  const colorClass = notificationColors[notification.type] || 'bg-gray-100 text-gray-600'
  const isUnread = !notification.read_at
  const badges = getDataBadges(notification.type, notification.data)

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

        {/* Dynamic Data Badges */}
        {badges.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-1.5">
            {badges.map((badge, index) => {
              const BadgeIcon = badge.icon
              return (
                <span
                  key={index}
                  className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium ${badge.color}`}
                >
                  {BadgeIcon && <BadgeIcon size={10} />}
                  {badge.text}
                </span>
              )
            })}
          </div>
        )}

        <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
          {formatRelativeTime(notification.created_at)}
        </p>
      </div>
    </button>
  )
}

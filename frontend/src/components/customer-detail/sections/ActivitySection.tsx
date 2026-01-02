import { useState } from 'react'
import {
  Calendar,
  CalendarPlus,
  CalendarCheck,
  CalendarX,
  Star,
  MessageSquare,
  MessageCircle,
  UserPlus,
  UserCog,
  LogIn,
  LogOut,
  CreditCard,
  StickyNote,
  DoorOpen,
  DoorClosed,
  ShoppingCart,
  AlertCircle,
  RotateCcw,
  Send,
  Loader2
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'

interface ActivityItem {
  id: string
  type: string
  title: string
  description?: string
  date: string
  metadata?: {
    bookingId?: string
    booking_id?: string
    ticketId?: string
    support_ticket_id?: string
    amount?: number
    currency?: string
    // Cart abandoned metadata
    bookingRef?: string
    roomName?: string
    propertyName?: string
    checkIn?: string
    checkOut?: string
    totalAmount?: number
    guests?: number
  }
}

interface ActivitySectionProps {
  activities: ActivityItem[]
  customerId?: string
  onRefresh?: () => void
}

const activityIcons: Record<string, typeof Calendar> = {
  // Booking activities
  booking: Calendar,
  booking_created: CalendarPlus,
  booking_confirmed: CalendarCheck,
  booking_cancelled: CalendarX,
  booking_checked_in: DoorOpen,
  booking_checked_out: DoorClosed,
  booking_recovered: RotateCcw,
  // Cart/Payment failures
  cart_abandoned: ShoppingCart,
  payment_failed: AlertCircle,
  // Payment
  payment: CreditCard,
  payment_received: CreditCard,
  // Reviews
  review: Star,
  review_submitted: Star,
  // Support
  support: MessageSquare,
  support_ticket_created: MessageSquare,
  support_ticket_replied: MessageCircle,
  // Portal
  portal_signup: UserPlus,
  portal_login: LogIn,
  portal_profile_updated: UserCog,
  // Notes
  note: StickyNote,
  note_added: StickyNote,
}

const activityColors: Record<string, string> = {
  // Booking activities
  booking: 'bg-blue-100 text-blue-600',
  booking_created: 'bg-blue-100 text-blue-600',
  booking_confirmed: 'bg-green-100 text-green-600',
  booking_cancelled: 'bg-red-100 text-red-600',
  booking_checked_in: 'bg-teal-100 text-teal-600',
  booking_checked_out: 'bg-slate-100 text-slate-600',
  // Payment
  payment: 'bg-emerald-100 text-emerald-600',
  payment_received: 'bg-emerald-100 text-emerald-600',
  // Reviews
  review: 'bg-amber-100 text-amber-600',
  review_submitted: 'bg-amber-100 text-amber-600',
  // Support
  support: 'bg-purple-100 text-purple-600',
  support_ticket_created: 'bg-purple-100 text-purple-600',
  support_ticket_replied: 'bg-indigo-100 text-indigo-600',
  // Portal
  portal_signup: 'bg-accent-100 text-accent-600',
  portal_login: 'bg-gray-100 text-gray-600',
  portal_profile_updated: 'bg-cyan-100 text-cyan-600',
  // Notes
  note: 'bg-yellow-100 text-yellow-600',
  note_added: 'bg-yellow-100 text-yellow-600',
}

export default function ActivitySection({ activities }: ActivitySectionProps) {
  const navigate = useNavigate()

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffTime = now.getTime() - date.getTime()
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays === 0) {
      return 'Today'
    } else if (diffDays === 1) {
      return 'Yesterday'
    } else if (diffDays < 7) {
      return `${diffDays} days ago`
    } else {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
      })
    }
  }

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit'
    })
  }

  const handleActivityClick = (activity: ActivityItem) => {
    const bookingId = activity.metadata?.bookingId || activity.metadata?.booking_id
    const ticketId = activity.metadata?.ticketId || activity.metadata?.support_ticket_id

    // Handle booking-related activities
    if (activity.type.startsWith('booking') && bookingId) {
      navigate(`/dashboard/bookings/${bookingId}`)
    } else if (activity.type === 'payment_received' && bookingId) {
      navigate(`/dashboard/bookings/${bookingId}`)
    } else if (activity.type === 'review_submitted' && bookingId) {
      navigate(`/dashboard/bookings/${bookingId}`)
    }
    // Handle support-related activities
    else if (activity.type.startsWith('support') && ticketId) {
      navigate(`/dashboard/support/${ticketId}`)
    }
    // Legacy types
    else if (activity.type === 'booking' && bookingId) {
      navigate(`/dashboard/bookings/${bookingId}`)
    } else if (activity.type === 'support' && ticketId) {
      navigate(`/dashboard/support/${ticketId}`)
    }
  }

  // Group activities by date
  const groupedActivities = activities.reduce((groups, activity) => {
    const dateKey = new Date(activity.date).toDateString()
    if (!groups[dateKey]) {
      groups[dateKey] = []
    }
    groups[dateKey].push(activity)
    return groups
  }, {} as Record<string, ActivityItem[]>)

  const dateKeys = Object.keys(groupedActivities).sort((a, b) =>
    new Date(b).getTime() - new Date(a).getTime()
  )

  if (activities.length === 0) {
    return (
      <div className="py-16 text-center">
        <Calendar size={40} className="mx-auto text-gray-300 mb-3" />
        <p className="text-gray-500">No activity recorded yet</p>
        <p className="text-sm text-gray-400 mt-1">
          Customer interactions will appear here
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {dateKeys.map((dateKey) => (
        <div key={dateKey}>
          {/* Date Header */}
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
            {formatDate(new Date(dateKey).toISOString())}
          </div>

          {/* Timeline */}
          <div className="space-y-0">
            {groupedActivities[dateKey].map((activity, index) => {
              const Icon = activityIcons[activity.type] || Calendar
              const colorClass = activityColors[activity.type] || 'bg-gray-100 text-gray-600'
              const bookingId = activity.metadata?.bookingId || activity.metadata?.booking_id
              const ticketId = activity.metadata?.ticketId || activity.metadata?.support_ticket_id
              const isClickable =
                (activity.type.startsWith('booking') && bookingId) ||
                (activity.type === 'payment_received' && bookingId) ||
                (activity.type === 'review_submitted' && bookingId) ||
                (activity.type.startsWith('support') && ticketId) ||
                (activity.type === 'booking' && bookingId) ||
                (activity.type === 'support' && ticketId)

              return (
                <div
                  key={activity.id}
                  className={`relative flex gap-4 pb-4 ${isClickable ? 'cursor-pointer group' : ''}`}
                  onClick={() => isClickable && handleActivityClick(activity)}
                >
                  {/* Timeline line */}
                  {index < groupedActivities[dateKey].length - 1 && (
                    <div className="absolute left-5 top-10 bottom-0 w-px bg-gray-200" />
                  )}

                  {/* Icon */}
                  <div className={`w-10 h-10 rounded-full ${colorClass} flex items-center justify-center shrink-0 z-10`}>
                    <Icon size={18} />
                  </div>

                  {/* Content */}
                  <div className={`flex-1 min-w-0 pt-1 ${isClickable ? 'group-hover:bg-gray-50 -mx-2 px-2 rounded-lg transition-colors' : ''}`}>
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium text-gray-900">{activity.title}</p>
                      <span className="text-xs text-gray-400 shrink-0">{formatTime(activity.date)}</span>
                    </div>
                    {activity.description && (
                      <p className="text-sm text-gray-500 mt-0.5">{activity.description}</p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}

import {
  Calendar,
  CreditCard,
  Mail,
  MessageSquare,
  CheckCircle,
  XCircle,
  Clock,
  FileText,
  Star,
  Edit,
  User,
  LogIn,
  LogOut,
} from 'lucide-react'

export interface TimelineEvent {
  id: string
  type: 'booking_created' | 'status_change' | 'payment' | 'email_sent' | 'note_added' |
        'check_in' | 'check_out' | 'invoice_generated' | 'review_received' | 'booking_modified' |
        'confirmation_sent' | 'reminder_sent' | 'cancelled'
  title: string
  description?: string
  timestamp: string
  user?: string
  metadata?: Record<string, any>
}

interface ActivityTimelineProps {
  events: TimelineEvent[]
  maxEvents?: number
  onViewAll?: () => void
}

const eventConfig: Record<TimelineEvent['type'], { icon: React.ElementType; color: string; bgColor: string }> = {
  booking_created: { icon: Calendar, color: 'text-emerald-600', bgColor: 'bg-emerald-100' },
  status_change: { icon: Edit, color: 'text-blue-600', bgColor: 'bg-blue-100' },
  payment: { icon: CreditCard, color: 'text-green-600', bgColor: 'bg-green-100' },
  email_sent: { icon: Mail, color: 'text-purple-600', bgColor: 'bg-purple-100' },
  note_added: { icon: MessageSquare, color: 'text-gray-600', bgColor: 'bg-gray-100' },
  check_in: { icon: LogIn, color: 'text-blue-600', bgColor: 'bg-blue-100' },
  check_out: { icon: LogOut, color: 'text-purple-600', bgColor: 'bg-purple-100' },
  invoice_generated: { icon: FileText, color: 'text-teal-600', bgColor: 'bg-teal-100' },
  review_received: { icon: Star, color: 'text-yellow-600', bgColor: 'bg-yellow-100' },
  booking_modified: { icon: Edit, color: 'text-orange-600', bgColor: 'bg-orange-100' },
  confirmation_sent: { icon: CheckCircle, color: 'text-emerald-600', bgColor: 'bg-emerald-100' },
  reminder_sent: { icon: Clock, color: 'text-amber-600', bgColor: 'bg-amber-100' },
  cancelled: { icon: XCircle, color: 'text-red-600', bgColor: 'bg-red-100' },
}

function formatTimeAgo(timestamp: string): string {
  const now = new Date()
  const date = new Date(timestamp)
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000)

  if (seconds < 60) return 'Just now'
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`

  return date.toLocaleDateString('en-ZA', {
    day: 'numeric',
    month: 'short',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  })
}

function formatFullDate(timestamp: string): string {
  return new Date(timestamp).toLocaleString('en-ZA', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function ActivityTimeline({
  events,
  maxEvents = 5,
  onViewAll
}: ActivityTimelineProps) {
  const displayedEvents = events.slice(0, maxEvents)
  const hasMore = events.length > maxEvents

  if (events.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <Clock size={32} className="mx-auto mb-2 opacity-40" />
        <p className="text-sm">No activity yet</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="relative">
        {/* Timeline line */}
        <div className="absolute left-5 top-3 bottom-3 w-px bg-gray-200" />

        {/* Events */}
        <div className="space-y-4">
          {displayedEvents.map((event, index) => {
            const config = eventConfig[event.type] || eventConfig.status_change
            const Icon = config.icon
            const isFirst = index === 0

            return (
              <div key={event.id} className="relative flex gap-4">
                {/* Icon */}
                <div className={`relative z-10 w-10 h-10 rounded-full ${config.bgColor} flex items-center justify-center flex-shrink-0 ${isFirst ? 'ring-4 ring-white shadow-sm' : ''}`}>
                  <Icon size={18} className={config.color} />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 pt-1">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className={`font-medium ${isFirst ? 'text-gray-900' : 'text-gray-700'}`}>
                        {event.title}
                      </p>
                      {event.description && (
                        <p className="text-sm text-gray-500 mt-0.5">{event.description}</p>
                      )}
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-xs text-gray-500" title={formatFullDate(event.timestamp)}>
                        {formatTimeAgo(event.timestamp)}
                      </p>
                    </div>
                  </div>

                  {/* User who performed action */}
                  {event.user && (
                    <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                      <User size={10} />
                      {event.user}
                    </p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* View all link */}
      {hasMore && onViewAll && (
        <button
          onClick={onViewAll}
          className="w-full text-center py-2 text-sm text-emerald-600 hover:text-emerald-700 font-medium hover:bg-emerald-50 rounded-lg transition-colors"
        >
          View all {events.length} activities
        </button>
      )}
    </div>
  )
}

// Helper function to generate timeline events from booking data
export function generateBookingTimeline(
  booking: {
    id: string
    status: string
    payment_status: string
    created_at?: string
    check_in: string
    check_out: string
    guest_name: string
  },
  additionalEvents?: TimelineEvent[]
): TimelineEvent[] {
  const events: TimelineEvent[] = []

  // Booking created
  if (booking.created_at) {
    events.push({
      id: `${booking.id}-created`,
      type: 'booking_created',
      title: 'Booking created',
      description: `Reservation made by ${booking.guest_name}`,
      timestamp: booking.created_at,
    })
  }

  // Status-based events (these would come from an activity log in a real app)
  if (booking.status === 'confirmed') {
    events.push({
      id: `${booking.id}-confirmed`,
      type: 'status_change',
      title: 'Booking confirmed',
      description: 'Reservation was confirmed',
      timestamp: booking.created_at || new Date().toISOString(),
    })
  }

  if (booking.payment_status === 'paid') {
    events.push({
      id: `${booking.id}-paid`,
      type: 'payment',
      title: 'Payment received',
      description: 'Full payment received',
      timestamp: booking.created_at || new Date().toISOString(),
    })
  }

  if (booking.status === 'checked_in') {
    events.push({
      id: `${booking.id}-checkin`,
      type: 'check_in',
      title: 'Guest checked in',
      timestamp: booking.check_in,
    })
  }

  if (booking.status === 'checked_out') {
    events.push({
      id: `${booking.id}-checkout`,
      type: 'check_out',
      title: 'Guest checked out',
      timestamp: booking.check_out,
    })
  }

  if (booking.status === 'cancelled') {
    events.push({
      id: `${booking.id}-cancelled`,
      type: 'cancelled',
      title: 'Booking cancelled',
      timestamp: new Date().toISOString(),
    })
  }

  // Add any additional events
  if (additionalEvents) {
    events.push(...additionalEvents)
  }

  // Sort by timestamp descending (most recent first)
  return events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
}

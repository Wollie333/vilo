import { Calendar, DollarSign, Users, Settings, Activity } from 'lucide-react'
import type { TenantBooking } from '../types'

interface ActivitySectionProps {
  bookings: TenantBooking[]
}

const statusColors: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700',
  confirmed: 'bg-accent-100 text-accent-700',
  checked_in: 'bg-blue-100 text-blue-700',
  checked_out: 'bg-purple-100 text-purple-700',
  cancelled: 'bg-red-100 text-red-700',
  completed: 'bg-gray-100 text-gray-700',
}

interface GroupedActivity {
  label: string
  items: TenantBooking[]
}

export default function ActivitySection({ bookings }: ActivitySectionProps) {
  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit'
    })
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR',
      maximumFractionDigits: 0
    }).format(amount)
  }

  const getDateLabel = (dateString: string): string => {
    const date = new Date(dateString)
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    if (date.toDateString() === today.toDateString()) return 'Today'
    if (date.toDateString() === yesterday.toDateString()) return 'Yesterday'

    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric'
    })
  }

  // Group bookings by date
  const groupedActivities: GroupedActivity[] = bookings.reduce((acc: GroupedActivity[], booking) => {
    const label = getDateLabel(booking.created_at)
    const existing = acc.find(g => g.label === label)

    if (existing) {
      existing.items.push(booking)
    } else {
      acc.push({ label, items: [booking] })
    }

    return acc
  }, [])

  if (bookings.length === 0) {
    return (
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Activity</h2>
          <p className="text-sm text-gray-500">Recent tenant activity</p>
        </div>

        <div className="py-12 text-center bg-gray-50 rounded-lg">
          <Activity size={32} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500">No activity recorded</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Activity</h2>
        <p className="text-sm text-gray-500">{bookings.length} recent activities</p>
      </div>

      {/* Timeline */}
      <div className="space-y-6">
        {groupedActivities.map((group) => (
          <div key={group.label}>
            {/* Date Header */}
            <div className="flex items-center gap-3 mb-3">
              <div className="h-px flex-1 bg-gray-200" />
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                {group.label}
              </span>
              <div className="h-px flex-1 bg-gray-200" />
            </div>

            {/* Activities for this date */}
            <div className="space-y-2">
              {group.items.map((booking, index) => (
                <div
                  key={booking.id || index}
                  className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg"
                >
                  {/* Icon */}
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                    <Calendar size={14} className="text-blue-600" />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium text-gray-900">
                        New booking created
                      </p>
                      <span className="text-xs text-gray-400 shrink-0">
                        {formatTime(booking.created_at)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-sm text-gray-600">
                        {formatCurrency(booking.total_amount)}
                      </span>
                      {booking.customer_name && (
                        <>
                          <span className="text-gray-300">•</span>
                          <span className="text-sm text-gray-500 truncate">
                            {booking.customer_name}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Status */}
                  <span className={`px-2 py-0.5 text-xs font-medium rounded-full shrink-0 ${statusColors[booking.status] || 'bg-gray-100 text-gray-600'}`}>
                    {booking.status.replace('_', ' ')}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

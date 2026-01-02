import { useState } from 'react'
import {
  CheckCircle,
  CreditCard,
  LogIn,
  LogOut,
  X,
  Loader2,
  Zap,
} from 'lucide-react'
import type { Booking } from '../../services/api'

interface QuickAction {
  id: string
  label: string
  icon: React.ElementType
  color: string
  hoverColor: string
  action: () => void | Promise<void>
  disabled?: boolean
  hidden?: boolean
}

interface QuickActionsBarProps {
  booking: Booking
  onConfirm: () => Promise<void>
  onCheckIn: () => Promise<void>
  onCheckOut: () => Promise<void>
  onMarkPaid: () => Promise<void>
  onCancel: () => void
}

export default function QuickActionsBar({
  booking,
  onConfirm,
  onCheckIn,
  onCheckOut,
  onMarkPaid,
  onCancel,
}: QuickActionsBarProps) {
  const [loadingAction, setLoadingAction] = useState<string | null>(null)
  const [mobileExpanded, setMobileExpanded] = useState(false)

  const handleAction = async (id: string, action: () => void | Promise<void>) => {
    setLoadingAction(id)
    try {
      await action()
    } finally {
      setLoadingAction(null)
    }
  }

  // Status actions based on current state
  const statusActions: QuickAction[] = [
    {
      id: 'confirm',
      label: 'Confirm Booking',
      icon: CheckCircle,
      color: 'bg-emerald-500',
      hoverColor: 'hover:bg-emerald-600',
      action: () => handleAction('confirm', onConfirm),
      hidden: booking.status !== 'pending',
    },
    {
      id: 'checkin',
      label: 'Check In',
      icon: LogIn,
      color: 'bg-blue-500',
      hoverColor: 'hover:bg-blue-600',
      action: () => handleAction('checkin', onCheckIn),
      hidden: booking.status !== 'confirmed',
    },
    {
      id: 'checkout',
      label: 'Check Out',
      icon: LogOut,
      color: 'bg-purple-500',
      hoverColor: 'hover:bg-purple-600',
      action: () => handleAction('checkout', onCheckOut),
      hidden: booking.status !== 'checked_in',
    },
    {
      id: 'markpaid',
      label: 'Mark as Paid',
      icon: CreditCard,
      color: 'bg-teal-500',
      hoverColor: 'hover:bg-teal-600',
      action: () => handleAction('markpaid', onMarkPaid),
      hidden: booking.payment_status === 'paid',
    },
    {
      id: 'cancel',
      label: 'Cancel Booking',
      icon: X,
      color: 'bg-red-500',
      hoverColor: 'hover:bg-red-600',
      action: onCancel,
      hidden: ['cancelled', 'checked_out', 'completed'].includes(booking.status),
    },
  ]

  const visibleActions = statusActions.filter((a) => !a.hidden)

  // Don't render if no actions available
  if (visibleActions.length === 0) {
    return null
  }

  return (
    <>
      {/* Desktop: Sticky bottom bar */}
      <div className="hidden lg:block fixed bottom-0 left-0 right-0 z-30">
        <div className="max-w-7xl mx-auto px-6 pb-6">
          <div className="bg-gray-900 rounded-2xl shadow-2xl border border-gray-800 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3">
              {/* Left: Status badges */}
              <div className="flex items-center gap-3">
                <StatusBadge status={booking.status} type="booking" />
                <span className="text-gray-600">|</span>
                <StatusBadge status={booking.payment_status} type="payment" />
              </div>

              {/* Right: Action buttons */}
              <div className="flex items-center gap-2">
                {visibleActions.map((action) => {
                  const Icon = action.icon
                  const isLoading = loadingAction === action.id

                  return (
                    <button
                      key={action.id}
                      onClick={action.action}
                      disabled={action.disabled || isLoading}
                      className={`inline-flex items-center gap-2 px-4 py-2 ${action.color} ${action.hoverColor} text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      {isLoading ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        <Icon size={16} />
                      )}
                      {action.label}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile: Floating action button */}
      <div className="lg:hidden fixed bottom-4 right-4 z-30">
        <button
          onClick={() => setMobileExpanded(!mobileExpanded)}
          className="w-14 h-14 rounded-full bg-emerald-500 text-white shadow-lg flex items-center justify-center hover:bg-emerald-600 transition-colors"
        >
          <Zap size={24} />
        </button>

        {/* Mobile expanded menu */}
        {mobileExpanded && (
          <div className="absolute bottom-16 right-0 w-56 bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden">
            <div className="p-3 border-b border-gray-100 bg-gray-50">
              <p className="text-xs font-semibold text-gray-500 uppercase">Quick Actions</p>
            </div>

            <div className="p-2">
              {visibleActions.map((action) => {
                const Icon = action.icon
                const isLoading = loadingAction === action.id

                return (
                  <button
                    key={action.id}
                    onClick={async () => {
                      await action.action()
                      setMobileExpanded(false)
                    }}
                    disabled={action.disabled || isLoading}
                    className="w-full flex items-center gap-3 px-3 py-2.5 text-gray-700 hover:bg-gray-50 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {isLoading ? (
                      <Loader2 size={18} className="animate-spin text-gray-500" />
                    ) : (
                      <Icon size={18} className="text-gray-500" />
                    )}
                    <span className="text-sm font-medium">{action.label}</span>
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* Spacer for fixed bottom bar */}
      <div className="hidden lg:block h-20" />
    </>
  )
}

// Status badge component
function StatusBadge({ status, type }: { status: string; type: 'booking' | 'payment' }) {
  const getColor = () => {
    if (type === 'booking') {
      const colors: Record<string, string> = {
        pending: 'bg-yellow-500/20 text-yellow-400',
        confirmed: 'bg-emerald-500/20 text-emerald-400',
        checked_in: 'bg-blue-500/20 text-blue-400',
        checked_out: 'bg-purple-500/20 text-purple-400',
        cancelled: 'bg-red-500/20 text-red-400',
        completed: 'bg-gray-500/20 text-gray-400',
      }
      return colors[status] || 'bg-gray-500/20 text-gray-400'
    } else {
      const colors: Record<string, string> = {
        pending: 'bg-gray-500/20 text-gray-400',
        paid: 'bg-emerald-500/20 text-emerald-400',
        partial: 'bg-blue-500/20 text-blue-400',
        refunded: 'bg-red-500/20 text-red-400',
      }
      return colors[status] || 'bg-gray-500/20 text-gray-400'
    }
  }

  return (
    <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${getColor()}`}>
      {status.replace('_', ' ')}
    </span>
  )
}

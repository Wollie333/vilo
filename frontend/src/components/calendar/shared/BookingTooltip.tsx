import { useState, useEffect, useRef } from 'react'
import { Calendar, Moon, CreditCard, User } from 'lucide-react'
import { format, parseISO, differenceInDays } from 'date-fns'
import type { Booking } from '../../../services/api'
import { BOOKING_SOURCE_DISPLAY } from '../../../services/api'
import { getStatusColor, getStatusLabel, getPaymentStatusColor, getPaymentStatusLabel } from '../../../utils/calendarUtils'

interface BookingTooltipProps {
  booking: Booking
  roomName?: string
  position: { x: number; y: number }
  onClose: () => void
}

export default function BookingTooltip({ booking, roomName, position, onClose }: BookingTooltipProps) {
  const tooltipRef = useRef<HTMLDivElement>(null)
  const [adjustedPosition, setAdjustedPosition] = useState(position)

  useEffect(() => {
    if (tooltipRef.current) {
      const rect = tooltipRef.current.getBoundingClientRect()
      const viewportWidth = window.innerWidth
      const viewportHeight = window.innerHeight

      let newX = position.x
      let newY = position.y

      // Adjust if tooltip goes off right edge
      if (position.x + rect.width > viewportWidth - 20) {
        newX = position.x - rect.width - 10
      }

      // Adjust if tooltip goes off bottom edge
      if (position.y + rect.height > viewportHeight - 20) {
        newY = position.y - rect.height - 10
      }

      // Ensure minimum margins
      newX = Math.max(10, newX)
      newY = Math.max(10, newY)

      setAdjustedPosition({ x: newX, y: newY })
    }
  }, [position])

  const checkIn = parseISO(booking.check_in)
  const checkOut = parseISO(booking.check_out)
  const nights = differenceInDays(checkOut, checkIn)
  const statusColor = getStatusColor(booking.status)
  const paymentColor = getPaymentStatusColor(booking.payment_status)

  const formatCurrency = (amount: number | string | null | undefined, currency: string = 'ZAR') => {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : (amount ?? 0)
    if (isNaN(numAmount)) return 'R0'
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: currency || 'ZAR',
    }).format(numAmount)
  }

  return (
    <div
      ref={tooltipRef}
      className="fixed z-50 bg-white rounded-lg shadow-xl border border-gray-200 p-4 min-w-[280px] max-w-[320px]"
      style={{
        left: adjustedPosition.x,
        top: adjustedPosition.y,
      }}
      onMouseLeave={onClose}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
            <User className="w-4 h-4 text-gray-600" />
          </div>
          <div>
            <p className="font-semibold text-gray-900">{booking.guest_name}</p>
            {roomName && (
              <p className="text-xs text-gray-500">{roomName}</p>
            )}
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusColor.bg} ${statusColor.text}`}>
            {getStatusLabel(booking.status)}
          </span>
          {booking.source && BOOKING_SOURCE_DISPLAY[booking.source] && (
            <span
              className={`text-xs font-medium px-2 py-0.5 rounded-full ${BOOKING_SOURCE_DISPLAY[booking.source].bgColor} ${BOOKING_SOURCE_DISPLAY[booking.source].textColor}`}
            >
              {BOOKING_SOURCE_DISPLAY[booking.source].label}
            </span>
          )}
        </div>
      </div>

      {/* Details */}
      <div className="space-y-2 text-sm">
        <div className="flex items-center gap-2 text-gray-600">
          <Calendar className="w-4 h-4" />
          <span>
            {format(checkIn, 'MMM d')} → {format(checkOut, 'MMM d, yyyy')}
          </span>
        </div>

        <div className="flex items-center gap-2 text-gray-600">
          <Moon className="w-4 h-4" />
          <span>{nights} {nights === 1 ? 'night' : 'nights'}</span>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-gray-600">
            <CreditCard className="w-4 h-4" />
            <span className="font-medium text-gray-900">
              {formatCurrency(booking.total_amount, booking.currency)}
            </span>
          </div>
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${paymentColor.bg} ${paymentColor.text}`}>
            {getPaymentStatusLabel(booking.payment_status)}
          </span>
        </div>
      </div>

      {/* Hint */}
      <div className="mt-3 pt-2 border-t border-gray-100">
        <p className="text-xs text-gray-400 text-center">
          Click to view details • Drag to move
        </p>
      </div>
    </div>
  )
}

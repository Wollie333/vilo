import { Calendar, User, BedDouble, CreditCard, Clock } from 'lucide-react'
import type { Booking, Room } from '../../services/api'

interface BookingDetailsPreviewProps {
  booking: Booking
  room: Room | null
  nights: number
  formatCurrency: (amount: number, currency: string) => string
}

export default function BookingDetailsPreview({
  booking,
  room,
  nights,
  formatCurrency
}: BookingDetailsPreviewProps) {
  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-700 border-yellow-200',
      confirmed: 'bg-emerald-100 text-emerald-700 border-emerald-200',
      checked_in: 'bg-blue-100 text-blue-700 border-blue-200',
      checked_out: 'bg-purple-100 text-purple-700 border-purple-200',
      cancelled: 'bg-red-100 text-red-700 border-red-200',
      completed: 'bg-gray-100 text-gray-700 border-gray-200',
    }
    return colors[status] || 'bg-gray-100 text-gray-700 border-gray-200'
  }

  const getPaymentStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-gray-100 text-gray-700 border-gray-200',
      paid: 'bg-emerald-100 text-emerald-700 border-emerald-200',
      partial: 'bg-blue-100 text-blue-700 border-blue-200',
      refunded: 'bg-red-100 text-red-700 border-red-200',
    }
    return colors[status] || 'bg-gray-100 text-gray-700 border-gray-200'
  }

  return (
    <div className="hidden xl:block w-80 flex-shrink-0">
      <div className="sticky top-24 space-y-4">
        {/* Booking Summary Card */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
          {/* Room Image Header */}
          <div className="relative h-32 bg-gradient-to-br from-gray-100 to-gray-200">
            {room?.images?.featured ? (
              <img
                src={room.images.featured.url}
                alt={room.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <BedDouble size={40} className="text-gray-400" />
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
            <div className="absolute bottom-3 left-4 right-4">
              <h3 className="text-white font-semibold truncate">
                {booking.room_name || 'Room'}
              </h3>
              {room?.room_code && (
                <p className="text-white/70 text-xs font-mono">{room.room_code}</p>
              )}
            </div>
          </div>

          {/* Booking Info */}
          <div className="p-4 space-y-4">
            {/* Status Badges */}
            <div className="flex flex-wrap gap-2">
              <span className={`inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-full border ${getStatusColor(booking.status)}`}>
                {booking.status.replace('_', ' ').charAt(0).toUpperCase() + booking.status.replace('_', ' ').slice(1)}
              </span>
              <span className={`inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-full border ${getPaymentStatusColor(booking.payment_status)}`}>
                {booking.payment_status.charAt(0).toUpperCase() + booking.payment_status.slice(1)}
              </span>
            </div>

            {/* Guest */}
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                <User size={18} className="text-emerald-600" />
              </div>
              <div className="min-w-0">
                <p className="font-medium text-gray-900 truncate">{booking.guest_name}</p>
                {booking.guest_email && (
                  <p className="text-xs text-gray-500 truncate">{booking.guest_email}</p>
                )}
              </div>
            </div>

            {/* Dates */}
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-2">
                <Calendar size={14} className="text-gray-400" />
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Stay Period</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-gray-500">Check-in</p>
                  <p className="text-sm font-medium text-gray-900">
                    {new Date(booking.check_in).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' })}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Check-out</p>
                  <p className="text-sm font-medium text-gray-900">
                    {new Date(booking.check_out).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' })}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1 mt-2 pt-2 border-t border-gray-200">
                <Clock size={12} className="text-gray-400" />
                <span className="text-xs text-gray-600">
                  {nights} {nights === 1 ? 'night' : 'nights'}
                </span>
              </div>
            </div>

            {/* Total */}
            <div className="flex items-center justify-between pt-3 border-t border-gray-100">
              <div className="flex items-center gap-2">
                <CreditCard size={16} className="text-gray-400" />
                <span className="text-sm text-gray-600">Total</span>
              </div>
              <span className="text-lg font-bold text-gray-900">
                {formatCurrency(booking.total_amount, booking.currency)}
              </span>
            </div>
          </div>
        </div>

        {/* Quick Contact */}
        {(booking.guest_email || booking.guest_phone) && (
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Quick Contact</h4>
            <div className="space-y-2">
              {booking.guest_email && (
                <a
                  href={`mailto:${booking.guest_email}`}
                  className="flex items-center gap-2 text-sm text-emerald-600 hover:text-emerald-700 hover:underline"
                >
                  Send Email
                </a>
              )}
              {booking.guest_phone && (
                <a
                  href={`tel:${booking.guest_phone}`}
                  className="flex items-center gap-2 text-sm text-emerald-600 hover:text-emerald-700 hover:underline"
                >
                  Call Guest
                </a>
              )}
              {booking.guest_phone && (
                <a
                  href={`https://wa.me/${booking.guest_phone.replace(/[^0-9]/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-green-600 hover:text-green-700 hover:underline"
                >
                  WhatsApp
                </a>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

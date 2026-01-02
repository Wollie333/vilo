import { User, Calendar, Moon, DollarSign, Home } from 'lucide-react'

interface BookingPreviewCardProps {
  guestName: string
  guestEmail: string
  roomName: string
  checkIn: string
  checkOut: string
  adults: number
  children: number
  totalAmount: number
  currency: string
  status: string
  paymentStatus: string
}

export default function BookingPreviewCard({
  guestName,
  guestEmail,
  roomName,
  checkIn,
  checkOut,
  adults,
  children,
  totalAmount,
  currency,
  status,
  paymentStatus
}: BookingPreviewCardProps) {
  // Calculate nights
  const calculateNights = () => {
    if (!checkIn || !checkOut) return 0
    const start = new Date(checkIn)
    const end = new Date(checkOut)
    const diffTime = end.getTime() - start.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays > 0 ? diffDays : 0
  }

  const nights = calculateNights()

  // Format date
  const formatDate = (dateString: string) => {
    if (!dateString) return '--'
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  // Format currency
  const formatPrice = (amount: number) => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: currency || 'ZAR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  // Status badge colors
  const getStatusColor = (s: string) => {
    const colors: Record<string, string> = {
      confirmed: 'bg-emerald-100 text-emerald-700',
      pending: 'bg-amber-100 text-amber-700',
      checked_in: 'bg-blue-100 text-blue-700',
      checked_out: 'bg-gray-100 text-gray-700',
      cancelled: 'bg-red-100 text-red-700',
      completed: 'bg-emerald-100 text-emerald-700',
      occupied: 'bg-blue-100 text-blue-700',
    }
    return colors[s] || 'bg-gray-100 text-gray-700'
  }

  const getPaymentColor = (s: string) => {
    const colors: Record<string, string> = {
      paid: 'bg-emerald-100 text-emerald-700',
      pending: 'bg-amber-100 text-amber-700',
      partial: 'bg-orange-100 text-orange-700',
      refunded: 'bg-gray-100 text-gray-700',
    }
    return colors[s] || 'bg-gray-100 text-gray-700'
  }

  const formatStatus = (s: string) => {
    return s.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
  }

  const totalGuests = adults + children

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
      {/* Guest Header */}
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
            <User size={20} className="text-gray-400" />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-gray-900 text-sm truncate">
              {guestName || 'Guest Name'}
            </h4>
            <p className="text-xs text-gray-500 truncate">
              {guestEmail || 'No email'}
            </p>
          </div>
        </div>
      </div>

      {/* Booking Details */}
      <div className="p-4 space-y-3">
        {/* Room */}
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2 text-gray-500">
            <Home size={14} />
            <span>Room</span>
          </div>
          <span className="font-medium text-gray-900 text-right truncate max-w-[60%]">
            {roomName || 'Not selected'}
          </span>
        </div>

        {/* Dates */}
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2 text-gray-500">
            <Calendar size={14} />
            <span>Dates</span>
          </div>
          <span className="font-medium text-gray-900">
            {checkIn && checkOut ? `${formatDate(checkIn)} - ${formatDate(checkOut)}` : '--'}
          </span>
        </div>

        {/* Nights */}
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2 text-gray-500">
            <Moon size={14} />
            <span>Nights</span>
          </div>
          <span className="font-medium text-gray-900">
            {nights > 0 ? `${nights} night${nights !== 1 ? 's' : ''}` : '--'}
          </span>
        </div>

        {/* Guests */}
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2 text-gray-500">
            <User size={14} />
            <span>Guests</span>
          </div>
          <span className="font-medium text-gray-900">
            {totalGuests > 0 ? (
              <>
                {adults} adult{adults !== 1 ? 's' : ''}
                {children > 0 && `, ${children} child${children !== 1 ? 'ren' : ''}`}
              </>
            ) : '--'}
          </span>
        </div>

        {/* Total */}
        <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2 text-gray-500">
            <DollarSign size={14} />
            <span className="font-medium">Total</span>
          </div>
          <span className="text-lg font-bold text-gray-900">
            {totalAmount > 0 ? formatPrice(totalAmount) : '--'}
          </span>
        </div>
      </div>

      {/* Status Badges */}
      <div className="px-4 pb-4 flex gap-2">
        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(status)}`}>
          {formatStatus(status)}
        </span>
        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getPaymentColor(paymentStatus)}`}>
          {formatStatus(paymentStatus)}
        </span>
      </div>
    </div>
  )
}

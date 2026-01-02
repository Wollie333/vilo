import { Phone, Mail, MessageCircle, Star, Award, Calendar, CreditCard, ChevronRight } from 'lucide-react'
import type { Booking } from '../../services/api'

interface GuestStats {
  totalBookings: number
  totalSpent: number
  firstBooking: string | null
  isReturning: boolean
  averageRating?: number
}

interface GuestProfileCardProps {
  booking: Booking
  guestStats?: GuestStats
  formatCurrency: (amount: number, currency: string) => string
  onCall?: () => void
  onEmail?: () => void
  onWhatsApp?: () => void
}

// Generate avatar color based on name
function getAvatarColor(name: string): string {
  const colors = [
    'bg-emerald-500',
    'bg-blue-500',
    'bg-purple-500',
    'bg-pink-500',
    'bg-orange-500',
    'bg-teal-500',
    'bg-indigo-500',
    'bg-rose-500',
  ]
  const index = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
  return colors[index % colors.length]
}

// Get initials from name
function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export default function GuestProfileCard({
  booking,
  guestStats,
  formatCurrency,
  onCall,
  onEmail,
  onWhatsApp
}: GuestProfileCardProps) {
  const initials = getInitials(booking.guest_name || 'Guest')
  const avatarColor = getAvatarColor(booking.guest_name || 'Guest')

  // Determine guest tags
  const tags: { label: string; color: string; icon: React.ElementType }[] = []

  if (guestStats?.isReturning) {
    tags.push({ label: 'Returning Guest', color: 'bg-emerald-100 text-emerald-700', icon: Award })
  } else {
    tags.push({ label: 'First Time', color: 'bg-blue-100 text-blue-700', icon: Star })
  }

  if (guestStats && guestStats.totalSpent > 10000) {
    tags.push({ label: 'VIP', color: 'bg-purple-100 text-purple-700', icon: Award })
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      {/* Header with gradient */}
      <div className="bg-gradient-to-r from-gray-900 to-gray-800 px-6 py-5">
        <div className="flex items-start gap-4">
          {/* Avatar */}
          <div className={`w-16 h-16 rounded-full ${avatarColor} flex items-center justify-center text-white text-xl font-bold shadow-lg ring-4 ring-white/20`}>
            {initials}
          </div>

          {/* Name and contact */}
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-bold text-white truncate">{booking.guest_name}</h2>

            {/* Contact info */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2">
              {booking.guest_email && (
                <span className="text-sm text-gray-300 truncate flex items-center gap-1">
                  <Mail size={12} />
                  {booking.guest_email}
                </span>
              )}
              {booking.guest_phone && (
                <span className="text-sm text-gray-300 flex items-center gap-1">
                  <Phone size={12} />
                  {booking.guest_phone}
                </span>
              )}
            </div>

            {/* Tags */}
            <div className="flex flex-wrap gap-2 mt-3">
              {tags.map((tag, index) => (
                <span
                  key={index}
                  className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full ${tag.color}`}
                >
                  <tag.icon size={10} />
                  {tag.label}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Quick contact actions */}
      <div className="grid grid-cols-3 border-b border-gray-100">
        <button
          onClick={onCall}
          disabled={!booking.guest_phone}
          className="flex flex-col items-center gap-1 py-4 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
            <Phone size={18} className="text-blue-600" />
          </div>
          <span className="text-xs font-medium">Call</span>
        </button>
        <button
          onClick={onEmail}
          disabled={!booking.guest_email}
          className="flex flex-col items-center gap-1 py-4 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors border-x border-gray-100"
        >
          <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
            <Mail size={18} className="text-emerald-600" />
          </div>
          <span className="text-xs font-medium">Email</span>
        </button>
        <button
          onClick={onWhatsApp}
          disabled={!booking.guest_phone}
          className="flex flex-col items-center gap-1 py-4 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
            <MessageCircle size={18} className="text-green-600" />
          </div>
          <span className="text-xs font-medium">WhatsApp</span>
        </button>
      </div>

      {/* Guest stats */}
      {guestStats && (
        <div className="p-4 space-y-3">
          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Guest Overview</h4>

          <div className="grid grid-cols-2 gap-3">
            {/* Total Bookings */}
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="flex items-center gap-2 text-gray-500 mb-1">
                <Calendar size={14} />
                <span className="text-xs">Bookings</span>
              </div>
              <p className="text-lg font-bold text-gray-900">{guestStats.totalBookings}</p>
            </div>

            {/* Total Spent */}
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="flex items-center gap-2 text-gray-500 mb-1">
                <CreditCard size={14} />
                <span className="text-xs">Total Spent</span>
              </div>
              <p className="text-lg font-bold text-gray-900">
                {formatCurrency(guestStats.totalSpent, booking.currency)}
              </p>
            </div>
          </div>

          {/* First booking date */}
          {guestStats.firstBooking && (
            <div className="flex items-center justify-between text-sm text-gray-600 pt-2 border-t border-gray-100">
              <span>Guest since</span>
              <span className="font-medium">
                {new Date(guestStats.firstBooking).toLocaleDateString('en-ZA', {
                  month: 'short',
                  year: 'numeric'
                })}
              </span>
            </div>
          )}

          {/* View full profile link */}
          <button className="w-full flex items-center justify-between px-3 py-2 text-sm text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors group">
            <span className="font-medium">View Guest History</span>
            <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      )}
    </div>
  )
}

import {
  Globe,
  User,
  Mail,
  Phone,
  Calendar,
  Users,
  MessageSquare,
  Tag,
  Sparkles,
  Clock,
  MapPin
} from 'lucide-react'

export type SystemMessageType = 'website_inquiry' | 'coupon_claim' | 'booking_update' | 'system_notice'

interface ContactInfo {
  name?: string
  email?: string
  phone?: string
}

interface StayDetails {
  checkIn?: string
  checkOut?: string
  guests?: number
}

interface CouponDetails {
  code?: string
  name?: string
  discount?: string
}

interface SystemMessageCardProps {
  type: SystemMessageType
  contact?: ContactInfo
  stay?: StayDetails
  coupon?: CouponDetails
  message?: string
  additionalNotes?: string
}

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  } catch {
    return dateStr
  }
}

function calculateNights(checkIn?: string, checkOut?: string): number | null {
  if (!checkIn || !checkOut) return null
  try {
    const start = new Date(checkIn)
    const end = new Date(checkOut)
    const diff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
    return diff > 0 ? diff : null
  } catch {
    return null
  }
}

const typeConfig: Record<SystemMessageType, { icon: typeof Globe; label: string; gradient: string; iconBg: string }> = {
  website_inquiry: {
    icon: Globe,
    label: 'Website Inquiry',
    gradient: 'from-blue-500 to-indigo-500',
    iconBg: 'bg-blue-100 text-blue-600'
  },
  coupon_claim: {
    icon: Tag,
    label: 'Coupon Claim Request',
    gradient: 'from-emerald-500 to-teal-500',
    iconBg: 'bg-emerald-100 text-emerald-600'
  },
  booking_update: {
    icon: Calendar,
    label: 'Booking Update',
    gradient: 'from-amber-500 to-orange-500',
    iconBg: 'bg-amber-100 text-amber-600'
  },
  system_notice: {
    icon: Sparkles,
    label: 'System Notice',
    gradient: 'from-purple-500 to-pink-500',
    iconBg: 'bg-purple-100 text-purple-600'
  }
}

export default function SystemMessageCard({
  type,
  contact,
  stay,
  coupon,
  message,
  additionalNotes
}: SystemMessageCardProps) {
  const config = typeConfig[type]
  const Icon = config.icon
  const nights = calculateNights(stay?.checkIn, stay?.checkOut)
  const hasContactInfo = contact?.name || contact?.email || contact?.phone
  const hasStayDetails = stay?.checkIn || stay?.checkOut || stay?.guests

  return (
    <div className="rounded-xl overflow-hidden border border-gray-200 bg-white shadow-sm">
      {/* Header */}
      <div className={`bg-gradient-to-r ${config.gradient} px-4 py-3`}>
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
            <Icon className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-white">{config.label}</h3>
            <p className="text-xs text-white/80">Auto-generated message</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-4">
        {/* Coupon Details (for coupon claims) */}
        {coupon?.code && (
          <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-lg p-4 border border-emerald-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-emerald-600 font-medium uppercase tracking-wide mb-1">Coupon Code</p>
                <p className="font-mono font-bold text-emerald-800 text-xl">{coupon.code}</p>
                {coupon.name && (
                  <p className="text-sm text-emerald-700 mt-1">{coupon.name}</p>
                )}
              </div>
              {coupon.discount && (
                <div className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm">
                  {coupon.discount}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Stay Details */}
        {hasStayDetails && (
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <Calendar className="w-4 h-4 text-gray-500" />
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Stay Details</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {stay?.checkIn && (
                <div className="bg-white rounded-lg p-3 border border-gray-200">
                  <p className="text-xs text-gray-500 mb-1">Check-in</p>
                  <p className="font-medium text-gray-900 text-sm">{formatDate(stay.checkIn)}</p>
                </div>
              )}
              {stay?.checkOut && (
                <div className="bg-white rounded-lg p-3 border border-gray-200">
                  <p className="text-xs text-gray-500 mb-1">Check-out</p>
                  <p className="font-medium text-gray-900 text-sm">{formatDate(stay.checkOut)}</p>
                </div>
              )}
              {nights && (
                <div className="bg-white rounded-lg p-3 border border-gray-200">
                  <p className="text-xs text-gray-500 mb-1">Duration</p>
                  <p className="font-medium text-gray-900 text-sm">{nights} night{nights !== 1 ? 's' : ''}</p>
                </div>
              )}
              {stay?.guests && (
                <div className="bg-white rounded-lg p-3 border border-gray-200">
                  <p className="text-xs text-gray-500 mb-1">Guests</p>
                  <p className="font-medium text-gray-900 text-sm flex items-center gap-1">
                    <Users className="w-4 h-4 text-gray-400" />
                    {stay.guests} guest{stay.guests !== 1 ? 's' : ''}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Contact Information */}
        {hasContactInfo && (
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <User className="w-4 h-4 text-gray-500" />
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Contact Information</span>
            </div>
            <div className="space-y-2">
              {contact?.name && (
                <div className="flex items-center gap-3 bg-white rounded-lg p-3 border border-gray-200">
                  <div className="p-2 bg-gray-100 rounded-full">
                    <User className="w-4 h-4 text-gray-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Name</p>
                    <p className="font-medium text-gray-900">{contact.name}</p>
                  </div>
                </div>
              )}
              {contact?.email && (
                <a
                  href={`mailto:${contact.email}`}
                  className="flex items-center gap-3 bg-white rounded-lg p-3 border border-gray-200 hover:border-accent-300 hover:bg-accent-50 transition-colors group"
                >
                  <div className="p-2 bg-blue-100 rounded-full group-hover:bg-blue-200 transition-colors">
                    <Mail className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Email</p>
                    <p className="font-medium text-accent-600 group-hover:text-accent-700">{contact.email}</p>
                  </div>
                </a>
              )}
              {contact?.phone && (
                <a
                  href={`tel:${contact.phone.replace(/[\s()-]/g, '')}`}
                  className="flex items-center gap-3 bg-white rounded-lg p-3 border border-gray-200 hover:border-accent-300 hover:bg-accent-50 transition-colors group"
                >
                  <div className="p-2 bg-green-100 rounded-full group-hover:bg-green-200 transition-colors">
                    <Phone className="w-4 h-4 text-green-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Phone</p>
                    <p className="font-medium text-accent-600 group-hover:text-accent-700">{contact.phone}</p>
                  </div>
                </a>
              )}
            </div>
          </div>
        )}

        {/* Message */}
        {message && (
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <MessageSquare className="w-4 h-4 text-gray-500" />
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Message</span>
            </div>
            <div className="bg-white rounded-lg p-4 border border-gray-200">
              <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">{message}</p>
            </div>
          </div>
        )}

        {/* Additional Notes */}
        {additionalNotes && (
          <div className="bg-amber-50 rounded-lg p-4 border border-amber-200">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-4 h-4 text-amber-600" />
              <span className="text-xs font-semibold text-amber-700 uppercase tracking-wide">Additional Notes</span>
            </div>
            <p className="text-amber-800 text-sm italic">{additionalNotes}</p>
          </div>
        )}
      </div>
    </div>
  )
}

// Helper function to parse "Inquiry from Website" messages
export function parseWebsiteInquiry(message: string): {
  isInquiry: boolean
  contact?: ContactInfo
  stay?: StayDetails
  message?: string
} {
  if (!message) return { isInquiry: false }
  const isInquiry = message.includes('Inquiry from Website')

  if (!isInquiry) return { isInquiry: false }

  // Parse contact info
  const nameMatch = message.match(/- Name:\s*(.+?)(?:\n|$)/i)
  const emailMatch = message.match(/- Email:\s*[📧✉]?\s*([\w.-]+@[\w.-]+\.\w+)/i)
  const phoneMatch = message.match(/- Phone:\s*[📞]?\s*(\+?[\d\s()-]+)/i)

  // Parse stay details
  const checkInMatch = message.match(/- Check-in:\s*[📅]?\s*(\d{4}-\d{2}-\d{2})/i)
  const checkOutMatch = message.match(/- Check-out:\s*[📅]?\s*(\d{4}-\d{2}-\d{2})/i)
  const guestsMatch = message.match(/Guests:\s*(\d+)/i)

  // Parse message content
  const messageMatch = message.match(/Message:\s*\n?([\s\S]*?)$/i)

  return {
    isInquiry: true,
    contact: {
      name: nameMatch?.[1]?.trim(),
      email: emailMatch?.[1]?.trim(),
      phone: phoneMatch?.[1]?.trim()
    },
    stay: {
      checkIn: checkInMatch?.[1],
      checkOut: checkOutMatch?.[1],
      guests: guestsMatch ? parseInt(guestsMatch[1]) : undefined
    },
    message: messageMatch?.[1]?.trim()
  }
}

// Helper function to parse coupon claim messages (same as before, but exported)
export function parseCouponClaim(message: string): {
  isCouponClaim: boolean
  coupon?: CouponDetails
  contact?: ContactInfo
  stay?: StayDetails
  additionalNotes?: string
} {
  if (!message) return { isCouponClaim: false }
  const isCouponClaim = message.includes('Coupon Claim Request')

  if (!isCouponClaim) return { isCouponClaim: false }

  const codeMatch = message.match(/Code:\s*(\S+)/i)
  const nameMatch = message.match(/(?:Coupon )?Name:\s*(.+?)(?:\n|$)/i)
  const discountMatch = message.match(/Discount:\s*(.+?)(?:\n|$)/i)
  const checkInMatch = message.match(/Check-in:\s*(\d{4}-\d{2}-\d{2})/i)
  const checkOutMatch = message.match(/Check-out:\s*(\d{4}-\d{2}-\d{2})/i)
  const guestNameMatch = message.match(/Contact Information:[\s\S]*?Name:\s*(.+?)(?:\n|$)/i)
  const guestEmailMatch = message.match(/Email:\s*([\w.-]+@[\w.-]+\.\w+)/i)
  const guestPhoneMatch = message.match(/Phone:\s*(\+?[\d\s()-]+)/i)
  const additionalMatch = message.match(/Additional Message:\s*([\s\S]*?)$/i)

  return {
    isCouponClaim: true,
    coupon: {
      code: codeMatch?.[1],
      name: nameMatch?.[1]?.trim(),
      discount: discountMatch?.[1]?.trim()
    },
    contact: {
      name: guestNameMatch?.[1]?.trim(),
      email: guestEmailMatch?.[1]?.trim(),
      phone: guestPhoneMatch?.[1]?.trim()
    },
    stay: {
      checkIn: checkInMatch?.[1],
      checkOut: checkOutMatch?.[1]
    },
    additionalNotes: additionalMatch?.[1]?.trim()
  }
}

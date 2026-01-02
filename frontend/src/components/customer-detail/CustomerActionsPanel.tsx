import {
  Mail,
  Phone,
  MessageCircle,
  Link2,
  StickyNote,
  Calendar,
  DollarSign,
  Star,
  Clock,
  Shield,
  Copy,
  Check,
  Building2,
  FileText
} from 'lucide-react'
import { useState } from 'react'

interface CustomerData {
  name?: string | null
  email: string
  phone?: string | null
  hasPortalAccess?: boolean
  profilePictureUrl?: string | null
  // Business details
  businessName?: string | null
  businessVatNumber?: string | null
  businessRegistrationNumber?: string | null
  businessAddressLine1?: string | null
  businessAddressLine2?: string | null
  businessCity?: string | null
  businessPostalCode?: string | null
  businessCountry?: string | null
  useBusinessDetailsOnInvoice?: boolean
}

interface CustomerStats {
  totalBookings: number
  totalSpent: number
  currency: string
  averageRating: number | null
  totalReviews: number
  firstStay: string
}

interface TenantData {
  slug?: string | null
  business_name?: string | null
}

interface CustomerActionsPanelProps {
  customer: CustomerData
  stats: CustomerStats
  tenant: TenantData | null
  onAddNote?: () => void
  onEditBusinessDetails?: () => void
}

export default function CustomerActionsPanel({
  customer,
  stats,
  tenant,
  onAddNote,
  onEditBusinessDetails
}: CustomerActionsPanelProps) {
  const [copied, setCopied] = useState(false)

  const formatCurrency = (amount: number, currency: string = 'ZAR') => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: currency,
      maximumFractionDigits: 0
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return '-'
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      year: 'numeric'
    })
  }

  const handleMessage = () => {
    const url = `/dashboard/support?newMessage=${encodeURIComponent(customer.email)}&name=${encodeURIComponent(customer.name || '')}`
    window.location.href = url
  }

  const handleSendPortalLink = () => {
    const portalUrl = `${window.location.origin}/portal/${tenant?.slug || ''}/login`
    const subject = encodeURIComponent(`Access your guest portal at ${tenant?.business_name || 'our property'}`)
    const body = encodeURIComponent(
      `Hi ${customer.name || 'there'},\n\n` +
      `You can access your guest portal to view your bookings, leave reviews, and contact us.\n\n` +
      `Portal link: ${portalUrl}\n\n` +
      `If you don't have an account yet, you can create one using your email: ${customer.email}\n\n` +
      `Best regards,\n${tenant?.business_name || 'The Team'}`
    )
    window.open(`mailto:${customer.email}?subject=${subject}&body=${body}`, '_blank')
  }

  const handleCopyEmail = async () => {
    try {
      await navigator.clipboard.writeText(customer.email)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy email:', err)
    }
  }

  const getInitial = () => {
    return (customer.name || customer.email).charAt(0).toUpperCase()
  }

  return (
    <div className="hidden xl:block w-80 shrink-0">
      <div className="sticky top-24 space-y-4">
        {/* Customer Card */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {/* Header gradient */}
          <div className="h-16 bg-gradient-to-r from-accent-500 to-accent-600" />

          {/* Avatar & Info */}
          <div className="px-5 pb-5 -mt-8">
            {/* Avatar */}
            <div className="mb-4">
              {customer.profilePictureUrl ? (
                <img
                  src={customer.profilePictureUrl}
                  alt={customer.name || 'Customer'}
                  className="w-16 h-16 rounded-full border-4 border-white object-cover shadow-sm"
                />
              ) : (
                <div className="w-16 h-16 rounded-full border-4 border-white bg-gradient-to-br from-accent-400 to-accent-600 flex items-center justify-center text-white text-2xl font-bold shadow-sm">
                  {getInitial()}
                </div>
              )}
            </div>

            {/* Name & Portal Status */}
            <div className="mb-3">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-lg font-semibold text-gray-900 truncate">
                  {customer.name || 'Unnamed Customer'}
                </h3>
                {customer.hasPortalAccess && (
                  <span className="shrink-0 flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-accent-100 text-accent-700">
                    <Shield size={10} />
                    Portal
                  </span>
                )}
              </div>
            </div>

            {/* Contact Info */}
            <div className="space-y-2">
              <button
                onClick={handleCopyEmail}
                className="w-full flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 group"
              >
                <Mail size={14} className="text-gray-400 shrink-0" />
                <span className="truncate flex-1 text-left">{customer.email}</span>
                {copied ? (
                  <Check size={14} className="text-accent-500 shrink-0" />
                ) : (
                  <Copy size={14} className="text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                )}
              </button>
              {customer.phone && (
                <a
                  href={`tel:${customer.phone}`}
                  className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
                >
                  <Phone size={14} className="text-gray-400 shrink-0" />
                  <span>{customer.phone}</span>
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Business Details Card */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Business Details
            </h4>
            {onEditBusinessDetails && (
              <button
                onClick={onEditBusinessDetails}
                className="text-xs text-accent-600 hover:text-accent-700 font-medium"
              >
                Edit
              </button>
            )}
          </div>

          {customer.businessName ? (
            <div className="space-y-2">
              <div className="flex items-start gap-2">
                <Building2 size={14} className="text-gray-400 mt-0.5 shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900">{customer.businessName}</p>
                  {(customer.businessAddressLine1 || customer.businessCity) && (
                    <p className="text-xs text-gray-500">
                      {[
                        customer.businessAddressLine1,
                        customer.businessAddressLine2,
                        customer.businessCity,
                        customer.businessPostalCode
                      ].filter(Boolean).join(', ')}
                    </p>
                  )}
                </div>
              </div>

              {(customer.businessVatNumber || customer.businessRegistrationNumber) && (
                <div className="flex items-start gap-2">
                  <FileText size={14} className="text-gray-400 mt-0.5 shrink-0" />
                  <div className="text-xs text-gray-500">
                    {customer.businessVatNumber && (
                      <p>VAT: {customer.businessVatNumber}</p>
                    )}
                    {customer.businessRegistrationNumber && (
                      <p>Reg: {customer.businessRegistrationNumber}</p>
                    )}
                  </div>
                </div>
              )}

              {customer.useBusinessDetailsOnInvoice && (
                <div className="mt-2 pt-2 border-t border-gray-100">
                  <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full bg-blue-50 text-blue-700">
                    <Check size={10} className="mr-1" />
                    Used on invoices
                  </span>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-4">
              <Building2 size={24} className="mx-auto text-gray-300 mb-2" />
              <p className="text-sm text-gray-500">No business details</p>
              {onEditBusinessDetails && (
                <button
                  onClick={onEditBusinessDetails}
                  className="mt-2 text-sm text-accent-600 hover:text-accent-700 font-medium"
                >
                  Add details
                </button>
              )}
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
            Quick Actions
          </h4>
          <div className="space-y-2">
            <button
              onClick={handleMessage}
              className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <MessageCircle size={16} className="text-accent-600" />
              Send Message
            </button>
            <button
              onClick={handleSendPortalLink}
              className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Link2 size={16} className="text-purple-600" />
              Send Portal Link
            </button>
            {onAddNote && (
              <button
                onClick={onAddNote}
                className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <StickyNote size={16} className="text-amber-600" />
                Add Note
              </button>
            )}
          </div>
        </div>

        {/* Key Metrics */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
            Key Metrics
          </h4>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Calendar size={14} className="text-blue-500" />
                Total Bookings
              </div>
              <span className="text-sm font-semibold text-gray-900">{stats.totalBookings}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <DollarSign size={14} className="text-accent-500" />
                Lifetime Value
              </div>
              <span className="text-sm font-semibold text-gray-900">
                {formatCurrency(stats.totalSpent, stats.currency)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Star size={14} className="text-amber-500" />
                Avg Rating
              </div>
              <span className="text-sm font-semibold text-gray-900">
                {stats.averageRating ? stats.averageRating.toFixed(1) : '-'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Clock size={14} className="text-gray-400" />
                Customer Since
              </div>
              <span className="text-sm font-semibold text-gray-900">
                {formatDate(stats.firstStay)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

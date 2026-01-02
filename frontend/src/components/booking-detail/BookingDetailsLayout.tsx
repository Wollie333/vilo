import { ReactNode, useState } from 'react'
import { ArrowLeft, Edit, Save, X, Loader2, ChevronDown, Phone, Mail, MessageCircle } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { bookingSections } from './BookingDetailsSidebar'
import type { Booking } from '../../services/api'
import SourceBadge from '../SourceBadge'
import type { BookingSource } from '../../services/api'

interface BookingDetailsLayoutProps {
  booking: Booking
  bookingReference?: string
  children: ReactNode
  sidebar: ReactNode
  preview: ReactNode
  activeSection: string
  onSectionChange: (sectionId: string) => void
  isEditing: boolean
  onEditToggle: () => void
  onSave: () => void
  saving: boolean
  onCall?: () => void
  onEmail?: () => void
  onWhatsApp?: () => void
}

export default function BookingDetailsLayout({
  booking,
  bookingReference,
  children,
  sidebar,
  preview,
  activeSection,
  onSectionChange,
  isEditing,
  onEditToggle,
  onSave,
  saving,
  onCall,
  onEmail,
  onWhatsApp
}: BookingDetailsLayoutProps) {
  const navigate = useNavigate()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  // Find current section
  const currentSection = bookingSections.find((s) => s.id === activeSection)
  const currentSectionName = currentSection?.name || 'Section'
  const CurrentSectionIcon = currentSection?.icon

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-700',
      confirmed: 'bg-emerald-100 text-emerald-700',
      checked_in: 'bg-blue-100 text-blue-700',
      checked_out: 'bg-purple-100 text-purple-700',
      cancelled: 'bg-red-100 text-red-700',
      completed: 'bg-gray-100 text-gray-700',
    }
    return colors[status] || 'bg-gray-100 text-gray-700'
  }

  const getPaymentStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-gray-100 text-gray-600',
      paid: 'bg-emerald-100 text-emerald-700',
      partial: 'bg-blue-100 text-blue-700',
      refunded: 'bg-red-100 text-red-700',
    }
    return colors[status] || 'bg-gray-100 text-gray-600'
  }

  return (
    <div className="min-h-full bg-gray-50">
      {/* Sticky Header */}
      <div className="sticky top-0 z-20 bg-white border-b border-gray-200 shadow-sm">
        <div className="px-4 lg:px-6 py-4">
          <div className="flex items-center justify-between gap-4">
            {/* Left: Back + Title */}
            <div className="flex items-center gap-4 min-w-0">
              <button
                onClick={() => navigate('/dashboard/bookings')}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"
              >
                <ArrowLeft size={20} />
              </button>
              <div className="min-w-0">
                <div className="flex items-center gap-3">
                  <h1 className="text-xl font-semibold text-gray-900 truncate">
                    {booking.guest_name}
                  </h1>
                  <div className="hidden sm:flex items-center gap-2">
                    <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${getStatusColor(booking.status)}`}>
                      {booking.status.replace('_', ' ')}
                    </span>
                    <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${getPaymentStatusColor(booking.payment_status)}`}>
                      {booking.payment_status}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-3 mt-0.5">
                  {bookingReference && (
                    <p className="text-sm text-gray-500">
                      Ref: <span className="font-mono">{bookingReference}</span>
                    </p>
                  )}
                  <SourceBadge
                    source={(booking.source || 'manual') as BookingSource}
                    type="booking"
                    externalUrl={booking.external_url}
                    size="sm"
                  />
                </div>
              </div>
            </div>

            {/* Center: Quick Contact */}
            <div className="hidden md:flex items-center gap-1">
              <button
                onClick={onCall}
                disabled={!booking.guest_phone}
                title={booking.guest_phone ? `Call ${booking.guest_phone}` : 'No phone number'}
                className="w-9 h-9 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center hover:bg-blue-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <Phone size={16} />
              </button>
              <button
                onClick={onEmail}
                disabled={!booking.guest_email}
                title={booking.guest_email ? `Email ${booking.guest_email}` : 'No email address'}
                className="w-9 h-9 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center hover:bg-emerald-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <Mail size={16} />
              </button>
              <button
                onClick={onWhatsApp}
                disabled={!booking.guest_phone}
                title={booking.guest_phone ? `WhatsApp ${booking.guest_phone}` : 'No phone number'}
                className="w-9 h-9 rounded-full bg-green-100 text-green-600 flex items-center justify-center hover:bg-green-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <MessageCircle size={16} />
              </button>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-2">
              {isEditing ? (
                <>
                  <button
                    onClick={onEditToggle}
                    className="flex items-center gap-2 px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-lg text-sm font-medium transition-colors"
                  >
                    <X size={16} />
                    <span className="hidden sm:inline">Cancel</span>
                  </button>
                  <button
                    onClick={onSave}
                    disabled={saving}
                    className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                  >
                    {saving ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        <span className="hidden sm:inline">Saving...</span>
                      </>
                    ) : (
                      <>
                        <Save size={16} />
                        <span className="hidden sm:inline">Save</span>
                      </>
                    )}
                  </button>
                </>
              ) : (
                <button
                  onClick={onEditToggle}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors"
                >
                  <Edit size={16} />
                  <span className="hidden sm:inline">Edit</span>
                </button>
              )}
            </div>
          </div>

          {/* Mobile Status Badges */}
          <div className="sm:hidden flex items-center gap-2 mt-3">
            <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${getStatusColor(booking.status)}`}>
              {booking.status.replace('_', ' ')}
            </span>
            <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${getPaymentStatusColor(booking.payment_status)}`}>
              {booking.payment_status}
            </span>
          </div>
        </div>

        {/* Mobile Section Selector */}
        <div className="lg:hidden border-t border-gray-100">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="w-full flex items-center justify-between px-4 py-3 text-left"
          >
            <div className="flex items-center gap-2">
              {CurrentSectionIcon && <CurrentSectionIcon size={18} className="text-emerald-600" />}
              <span className="text-sm font-medium text-gray-900">{currentSectionName}</span>
            </div>
            <ChevronDown
              size={18}
              className={`text-gray-400 transition-transform ${mobileMenuOpen ? 'rotate-180' : ''}`}
            />
          </button>

          {/* Mobile Menu Dropdown */}
          {mobileMenuOpen && (
            <div className="absolute left-0 right-0 bg-white border-b border-gray-200 shadow-lg z-30 max-h-[60vh] overflow-y-auto">
              {bookingSections.map((section) => {
                const isActive = activeSection === section.id
                const Icon = section.icon

                return (
                  <button
                    key={section.id}
                    onClick={() => {
                      onSectionChange(section.id)
                      setMobileMenuOpen(false)
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                      isActive ? 'bg-emerald-50 text-emerald-700' : 'hover:bg-gray-50'
                    }`}
                  >
                    <Icon size={18} className={isActive ? 'text-emerald-600' : 'text-gray-400'} />
                    <div className="flex-1">
                      <span className="text-sm font-medium">{section.name}</span>
                      {section.description && (
                        <p className="text-xs text-gray-500">{section.description}</p>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex gap-6 p-4 lg:p-6">
        {/* Sidebar */}
        {sidebar}

        {/* Main Content */}
        <div className="flex-1 min-w-0">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            {/* Section Header */}
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
              <div className="flex items-center gap-3">
                {CurrentSectionIcon && (
                  <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                    <CurrentSectionIcon size={20} className="text-emerald-600" />
                  </div>
                )}
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">{currentSectionName}</h2>
                  {bookingSections.find(s => s.id === activeSection)?.description && (
                    <p className="text-sm text-gray-500">
                      {bookingSections.find(s => s.id === activeSection)?.description}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Section Content */}
            <div className="p-6">
              {children}
            </div>
          </div>
        </div>

        {/* Preview Panel */}
        {preview}
      </div>

      {/* Bottom padding for mobile */}
      <div className="lg:hidden h-4" />
    </div>
  )
}

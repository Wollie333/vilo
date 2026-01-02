import { useEffect, useState, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  CheckCircle,
  Calendar,
  MapPin,
  Users,
  Clock,
  Mail,
  Phone,
  Home,
  Loader2,
  AlertCircle,
  Share2,
  Download
} from 'lucide-react'
import { trackingService } from '../../services/trackingService'

// DataLayer type declaration for analytics tracking
declare global {
  interface Window {
    dataLayer: Record<string, unknown>[];
  }
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3002/api'

interface BookingDetails {
  id: string
  reference: string
  status: string
  payment_status: string
  property: {
    id: string
    name: string
    slug: string
    address: string
    email: string
    phone: string
    checkInTime: string
    checkOutTime: string
  }
  room: {
    id: string
    name: string
  }
  guest: {
    name: string
    email: string
    phone?: string
  }
  dates: {
    checkIn: string
    checkOut: string
    nights: number
  }
  guests: number
  total: number
  currency: string
  createdAt: string
}

export default function BookingConfirmation() {
  const { bookingId } = useParams<{ bookingId: string }>()
  const [booking, setBooking] = useState<BookingDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const dataLayerPushed = useRef(false)

  useEffect(() => {
    if (!bookingId) return

    const fetchBooking = async () => {
      try {
        const response = await fetch(`${API_URL}/discovery/bookings/${bookingId}`)

        if (!response.ok) {
          throw new Error('Booking not found')
        }

        const data = await response.json()
        setBooking(data)
      } catch (err) {
        console.error('Error fetching booking:', err)
        setError('Unable to load booking details')
      } finally {
        setLoading(false)
      }
    }

    fetchBooking()
  }, [bookingId])

  // Push booking data to dataLayer for Facebook Pixel / Google Analytics / GTM
  useEffect(() => {
    if (!booking || dataLayerPushed.current) return

    // Initialize dataLayer if not exists
    window.dataLayer = window.dataLayer || []

    // Push purchase event with e-commerce data
    window.dataLayer.push({
      event: 'purchase',
      ecommerce: {
        transaction_id: booking.reference,
        value: booking.total,
        currency: booking.currency,
        items: [{
          item_id: booking.room.id,
          item_name: booking.room.name,
          item_category: 'Accommodation',
          item_brand: booking.property.name,
          price: booking.total / booking.dates.nights,
          quantity: booking.dates.nights
        }]
      },
      // Extended booking details for custom audiences and reporting
      booking: {
        id: booking.id,
        reference: booking.reference,
        property_id: booking.property.id,
        property_name: booking.property.name,
        property_slug: booking.property.slug,
        room_id: booking.room.id,
        room_name: booking.room.name,
        check_in: booking.dates.checkIn,
        check_out: booking.dates.checkOut,
        nights: booking.dates.nights,
        guests: booking.guests,
        total_value: booking.total,
        currency: booking.currency,
        payment_status: booking.payment_status,
        booking_status: booking.status
      }
    })

    // Track conversion for Vilo analytics
    trackingService.trackConversion(booking.id, booking.total)

    dataLayerPushed.current = true
  }, [booking])

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-ZA', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    })
  }

  const formatPrice = (price: number, currency: string) => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price)
  }

  const getStatusBadge = (status: string, paymentStatus: string) => {
    if (paymentStatus === 'paid') {
      return (
        <span className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-sm font-medium">
          <CheckCircle className="w-4 h-4" />
          Confirmed
        </span>
      )
    }

    if (paymentStatus === 'pending') {
      return (
        <span className="inline-flex items-center gap-1 px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-sm font-medium">
          <Clock className="w-4 h-4" />
          Awaiting Payment
        </span>
      )
    }

    return (
      <span className="inline-flex items-center gap-1 px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm font-medium">
        {status}
      </span>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-600 mx-auto mb-3" />
          <p className="text-gray-600">Loading booking details...</p>
        </div>
      </div>
    )
  }

  if (error || !booking) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h1 className="text-xl font-semibold text-gray-900 mb-2">Booking Not Found</h1>
          <p className="text-gray-600 mb-6">{error || 'We could not find the booking you are looking for.'}</p>
          <Link
            to="/accommodation"
            className="inline-flex items-center gap-2 px-6 py-3 bg-black text-white rounded-xl hover:bg-gray-800 transition-colors"
          >
            <Home className="w-4 h-4" />
            Browse Properties
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-emerald-600 text-white py-12">
        <div className="max-w-2xl mx-auto px-4 text-center">
          <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Booking Received!</h1>
          <p className="text-emerald-100">
            {booking.payment_status === 'paid'
              ? 'Your booking has been confirmed.'
              : 'Complete your payment to confirm your booking.'}
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-4 py-8 -mt-6">
        {/* Booking reference card */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm text-gray-500">Booking Reference</p>
              <p className="text-2xl font-mono font-bold text-gray-900">{booking.reference}</p>
            </div>
            {getStatusBadge(booking.status, booking.payment_status)}
          </div>

          <p className="text-sm text-gray-500">
            Confirmation sent to <span className="font-medium text-gray-700">{booking.guest.email}</span>
          </p>
        </div>

        {/* Property & Room details */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 mb-6">
          <h2 className="font-semibold text-gray-900 mb-4">Your Stay</h2>

          <div className="space-y-4">
            {/* Property */}
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <Home className="w-5 h-5 text-gray-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900">{booking.property.name}</p>
                <p className="text-sm text-gray-500">{booking.room.name}</p>
                {booking.property.address && (
                  <p className="text-sm text-gray-500 mt-1">{booking.property.address}</p>
                )}
              </div>
            </div>

            {/* Dates */}
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <Calendar className="w-5 h-5 text-gray-600" />
              </div>
              <div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Check-in</p>
                    <p className="font-medium text-gray-900">{formatDate(booking.dates.checkIn)}</p>
                    <p className="text-sm text-emerald-600">After {booking.property.checkInTime || '14:00'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Check-out</p>
                    <p className="font-medium text-gray-900">{formatDate(booking.dates.checkOut)}</p>
                    <p className="text-sm text-emerald-600">Before {booking.property.checkOutTime || '10:00'}</p>
                  </div>
                </div>
                <p className="text-sm text-gray-500 mt-2">{booking.dates.nights} night{booking.dates.nights !== 1 ? 's' : ''}</p>
              </div>
            </div>

            {/* Guests */}
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <Users className="w-5 h-5 text-gray-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Guests</p>
                <p className="font-medium text-gray-900">{booking.guests} guest{booking.guests !== 1 ? 's' : ''}</p>
              </div>
            </div>
          </div>

          {/* Total */}
          <div className="border-t border-gray-200 mt-4 pt-4">
            <div className="flex justify-between items-center">
              <span className="font-medium text-gray-900">Total</span>
              <span className="text-xl font-bold text-gray-900">
                {formatPrice(booking.total, booking.currency)}
              </span>
            </div>
          </div>
        </div>

        {/* Contact property */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 mb-6">
          <h2 className="font-semibold text-gray-900 mb-4">Contact Property</h2>

          <div className="space-y-3">
            {booking.property.email && (
              <a
                href={`mailto:${booking.property.email}`}
                className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <Mail className="w-5 h-5 text-gray-600" />
                <span className="text-gray-900">{booking.property.email}</span>
              </a>
            )}
            {booking.property.phone && (
              <a
                href={`tel:${booking.property.phone}`}
                className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <Phone className="w-5 h-5 text-gray-600" />
                <span className="text-gray-900">{booking.property.phone}</span>
              </a>
            )}
            {booking.property.address && (
              <a
                href={`https://maps.google.com/?q=${encodeURIComponent(booking.property.address)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <MapPin className="w-5 h-5 text-gray-600" />
                <span className="text-gray-900">Get Directions</span>
              </a>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={() => window.print()}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 border border-gray-200 rounded-xl text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <Download className="w-4 h-4" />
            Download
          </button>
          <button
            onClick={() => {
              if (navigator.share) {
                navigator.share({
                  title: `Booking at ${booking.property.name}`,
                  text: `Booking confirmation #${booking.reference}`,
                  url: window.location.href
                })
              } else {
                navigator.clipboard.writeText(window.location.href)
              }
            }}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 border border-gray-200 rounded-xl text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <Share2 className="w-4 h-4" />
            Share
          </button>
        </div>

        {/* Back to property */}
        <div className="text-center mt-8">
          <Link
            to={`/accommodation/${booking.property.slug}`}
            className="text-emerald-600 hover:underline text-sm"
          >
            Back to {booking.property.name}
          </Link>
        </div>
      </div>
    </div>
  )
}

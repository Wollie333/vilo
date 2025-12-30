import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Calendar, Star, MessageCircle, Building2, CheckCircle, Clock } from 'lucide-react'
import Button from '../../components/Button'
import { portalApi, CustomerBooking } from '../../services/portalApi'

export default function CustomerDashboard() {
  const [bookings, setBookings] = useState<CustomerBooking[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const bookingsData = await portalApi.getBookings()
      setBookings(bookingsData)
    } catch (error) {
      console.error('Failed to load data:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  // Get current/upcoming booking (first upcoming or currently active)
  const now = new Date()
  const currentBooking = bookings.find(b => {
    const checkIn = new Date(b.check_in)
    const checkOut = new Date(b.check_out)
    return checkIn >= now || (checkIn <= now && checkOut >= now)
  })

  // Past bookings (checked out)
  const pastBookings = bookings.filter(b => new Date(b.check_out) < now)

  // Find a past booking that needs a review
  const bookingNeedsReview = pastBookings.find(b =>
    ['checked_out', 'completed'].includes(b.status) &&
    b.payment_status === 'paid' &&
    (!b.reviews || b.reviews.length === 0)
  )

  const getStatusDisplay = (status: string) => {
    switch (status) {
      case 'pending':
        return { label: 'Pending', color: 'text-yellow-700', bg: 'bg-yellow-100', icon: Clock }
      case 'confirmed':
        return { label: 'Confirmed', color: 'text-green-700', bg: 'bg-green-100', icon: CheckCircle }
      case 'checked_in':
        return { label: 'Checked In', color: 'text-blue-700', bg: 'bg-blue-100', icon: CheckCircle }
      case 'checked_out':
        return { label: 'Checked Out', color: 'text-purple-700', bg: 'bg-purple-100', icon: CheckCircle }
      case 'cancelled':
        return { label: 'Cancelled', color: 'text-red-700', bg: 'bg-red-100', icon: Clock }
      case 'completed':
        return { label: 'Completed', color: 'text-gray-700', bg: 'bg-gray-100', icon: CheckCircle }
      default:
        return { label: status.replace('_', ' '), color: 'text-gray-700', bg: 'bg-gray-100', icon: Clock }
    }
  }

  if (loading) {
    return (
      <div className="p-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-gray-300 border-t-gray-900 rounded-full animate-spin mx-auto mb-4" />
            <p className="text-gray-500">Loading...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8 bg-white min-h-full">
      <div className="max-w-2xl">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">My Booking</h1>
        <p className="text-gray-600 mb-8">View your reservation details</p>

        {/* Current/Upcoming Booking */}
        {currentBooking ? (
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden mb-8">
            <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-gray-900">Your Upcoming Stay</h2>
                {(() => {
                  const statusInfo = getStatusDisplay(currentBooking.status)
                  const StatusIcon = statusInfo.icon
                  return (
                    <span className={`flex items-center gap-1 text-sm px-3 py-1 rounded-full ${statusInfo.bg} ${statusInfo.color}`}>
                      <StatusIcon size={14} />
                      {statusInfo.label}
                    </span>
                  )
                })()}
              </div>
            </div>

            <div className="p-6">
              <div className="mb-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-1">{currentBooking.room_name}</h3>
                <p className="text-gray-500 flex items-center gap-1">
                  <Building2 size={14} />
                  {currentBooking.tenants?.business_name}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-500 mb-1">Check-in</p>
                  <p className="font-medium text-gray-900">{formatDate(currentBooking.check_in)}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-500 mb-1">Check-out</p>
                  <p className="font-medium text-gray-900">{formatDate(currentBooking.check_out)}</p>
                </div>
              </div>

              <div className="flex items-center gap-2 text-sm text-gray-600 mb-6">
                <Calendar size={16} />
                <span>
                  {Math.ceil((new Date(currentBooking.check_out).getTime() - new Date(currentBooking.check_in).getTime()) / (1000 * 60 * 60 * 24))} nights
                </span>
              </div>

              <div className="flex gap-3">
                <Link to={`/portal/bookings/${currentBooking.id}`} className="flex-1">
                  <Button className="w-full">View Details</Button>
                </Link>
                <Link to="/portal/support">
                  <Button variant="secondary">
                    <MessageCircle size={16} className="mr-2" />
                    Support
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-8 text-center mb-8">
            <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
              <Calendar size={24} className="text-gray-400" />
            </div>
            <h3 className="font-medium text-gray-900 mb-2">No upcoming bookings</h3>
            <p className="text-gray-500 text-sm">You don't have any upcoming reservations.</p>
          </div>
        )}

        {/* Review Prompt */}
        {bookingNeedsReview && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 mb-8">
            <div className="flex items-start gap-4">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Star size={20} className="text-yellow-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-medium text-gray-900 mb-1">How was your stay?</h3>
                <p className="text-sm text-gray-600 mb-3">
                  Share your experience at {bookingNeedsReview.room_name}
                </p>
                <Link to={`/portal/bookings/${bookingNeedsReview.id}`}>
                  <Button>Leave a Review</Button>
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Help Section */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 mb-8">
          <div className="flex items-center gap-4">
            <div className="p-2 bg-gray-100 rounded-lg">
              <MessageCircle size={20} className="text-gray-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-medium text-gray-900">Need help?</h3>
              <p className="text-sm text-gray-500">Contact our support team</p>
            </div>
            <Link to="/portal/support">
              <Button variant="secondary">Contact Support</Button>
            </Link>
          </div>
        </div>

        {/* Past Bookings */}
        {pastBookings.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Past Stays</h2>
            <div className="space-y-3">
              {pastBookings.slice(0, 5).map((booking) => (
                <Link
                  key={booking.id}
                  to={`/portal/bookings/${booking.id}`}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div>
                    <p className="font-medium text-gray-900">{booking.room_name}</p>
                    <p className="text-sm text-gray-500">
                      {formatDate(booking.check_in)} - {formatDate(booking.check_out)}
                    </p>
                  </div>
                  {(!booking.reviews || booking.reviews.length === 0) &&
                   ['checked_out', 'completed'].includes(booking.status) &&
                   booking.payment_status === 'paid' && (
                    <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full flex items-center gap-1">
                      <Star size={10} />
                      Review
                    </span>
                  )}
                </Link>
              ))}
            </div>
            {pastBookings.length > 5 && (
              <Link to="/portal/bookings" className="block text-center text-sm text-gray-500 hover:text-gray-700 mt-4">
                View all {pastBookings.length} past bookings
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

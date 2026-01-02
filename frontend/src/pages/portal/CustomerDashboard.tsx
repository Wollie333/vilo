import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  Calendar,
  Star,
  MessageCircle,
  Building2,
  CheckCircle,
  Clock,
  ArrowRight,
  CalendarCheck,
  CalendarDays,
  Ticket,
  BedDouble,
  ChevronRight,
  Sparkles,
  AlertCircle
} from 'lucide-react'
import Button from '../../components/Button'
import { useCustomerAuth } from '../../contexts/CustomerAuthContext'
import { portalApi, CustomerBooking, SupportTicket } from '../../services/portalApi'

interface DashboardStats {
  totalBookings: number
  upcomingBookings: number
  completedStays: number
  pendingReviews: number
  openTickets: number
}

export default function CustomerDashboard() {
  const { customer } = useCustomerAuth()
  const [bookings, setBookings] = useState<CustomerBooking[]>([])
  const [tickets, setTickets] = useState<SupportTicket[]>([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<DashboardStats>({
    totalBookings: 0,
    upcomingBookings: 0,
    completedStays: 0,
    pendingReviews: 0,
    openTickets: 0
  })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const [bookingsData, ticketsData] = await Promise.all([
        portalApi.getBookings(),
        portalApi.getTickets()
      ])

      setBookings(bookingsData)
      setTickets(ticketsData)

      // Calculate stats
      const now = new Date()
      const upcoming = bookingsData.filter(b => {
        const checkIn = new Date(b.check_in)
        return checkIn >= now && b.status !== 'cancelled'
      })

      const completed = bookingsData.filter(b =>
        ['checked_out', 'completed'].includes(b.status)
      )

      const pendingReviews = bookingsData.filter(b =>
        ['checked_out', 'completed'].includes(b.status) &&
        b.payment_status === 'paid' &&
        (!b.reviews || b.reviews.length === 0)
      )

      const openTickets = ticketsData.filter(t =>
        ['open', 'in_progress'].includes(t.status)
      )

      setStats({
        totalBookings: bookingsData.length,
        upcomingBookings: upcoming.length,
        completedStays: completed.length,
        pendingReviews: pendingReviews.length,
        openTickets: openTickets.length
      })
    } catch (error) {
      console.error('Failed to load dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    })
  }

  const getDaysUntil = (dateString: string) => {
    const now = new Date()
    now.setHours(0, 0, 0, 0)
    const date = new Date(dateString)
    date.setHours(0, 0, 0, 0)
    const diff = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    return diff
  }

  const getNights = (checkIn: string, checkOut: string) => {
    const start = new Date(checkIn)
    const end = new Date(checkOut)
    return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
  }

  const getRoomImage = (booking: CustomerBooking): string | null => {
    if (booking.room?.images?.featured?.url) {
      return booking.room.images.featured.url
    }
    if (booking.room?.images?.gallery?.[0]?.url) {
      return booking.room.images.gallery[0].url
    }
    return null
  }

  const getStatusDisplay = (status: string) => {
    switch (status) {
      case 'pending':
        return { label: 'Pending Confirmation', color: 'text-yellow-700', bg: 'bg-yellow-50', border: 'border-yellow-200', icon: Clock }
      case 'confirmed':
        return { label: 'Confirmed', color: 'text-accent-700', bg: 'bg-accent-50', border: 'border-accent-200', icon: CheckCircle }
      case 'checked_in':
        return { label: 'Currently Staying', color: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-200', icon: CheckCircle }
      case 'checked_out':
        return { label: 'Completed', color: 'text-purple-700', bg: 'bg-purple-50', border: 'border-purple-200', icon: CheckCircle }
      default:
        return { label: status.replace('_', ' '), color: 'text-gray-700', bg: 'bg-gray-50', border: 'border-gray-200', icon: Clock }
    }
  }

  // Get current stay or next upcoming booking
  const now = new Date()
  const currentStay = bookings.find(b => {
    const checkIn = new Date(b.check_in)
    const checkOut = new Date(b.check_out)
    return b.status === 'checked_in' || (checkIn <= now && checkOut >= now && b.status !== 'cancelled')
  })

  const nextUpcoming = !currentStay
    ? bookings
        .filter(b => {
          const checkIn = new Date(b.check_in)
          return checkIn > now && b.status !== 'cancelled'
        })
        .sort((a, b) => new Date(a.check_in).getTime() - new Date(b.check_in).getTime())[0]
    : null

  const highlightedBooking = currentStay || nextUpcoming

  // Recent bookings (excluding highlighted)
  const recentBookings = bookings
    .filter(b => b.id !== highlightedBooking?.id && b.status !== 'cancelled')
    .sort((a, b) => new Date(b.check_in).getTime() - new Date(a.check_in).getTime())
    .slice(0, 3)

  // Recent support ticket
  const recentTicket = tickets
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())[0]

  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Good morning'
    if (hour < 18) return 'Good afternoon'
    return 'Good evening'
  }

  if (loading) {
    return (
      <div className="p-8 bg-gray-50 min-h-full">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-accent-200 border-t-accent-600 rounded-full animate-spin mx-auto mb-4" />
            <p className="text-gray-500">Loading your dashboard...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 md:p-8 bg-gray-50 min-h-full">
      <div className="max-w-5xl mx-auto">
        {/* Welcome Header */}
        <div className="mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-1">
            {getGreeting()}, {customer?.name?.split(' ')[0] || 'Guest'}
          </h1>
          <p className="text-gray-600">Here's an overview of your travel activity</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Link
            to="/portal/bookings"
            className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md hover:border-gray-300 transition-all group"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="p-2 bg-accent-50 rounded-lg">
                <Calendar size={20} className="text-accent-600" />
              </div>
              <ChevronRight size={18} className="text-gray-400 group-hover:text-gray-600 transition-colors" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{stats.totalBookings}</p>
            <p className="text-sm text-gray-500">Total Bookings</p>
          </Link>

          <Link
            to="/portal/bookings?filter=upcoming"
            className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md hover:border-gray-300 transition-all group"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="p-2 bg-blue-50 rounded-lg">
                <CalendarCheck size={20} className="text-blue-600" />
              </div>
              <ChevronRight size={18} className="text-gray-400 group-hover:text-gray-600 transition-colors" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{stats.upcomingBookings}</p>
            <p className="text-sm text-gray-500">Upcoming Stays</p>
          </Link>

          <Link
            to="/portal/reviews"
            className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md hover:border-gray-300 transition-all group relative"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="p-2 bg-yellow-50 rounded-lg">
                <Star size={20} className="text-yellow-600" />
              </div>
              <ChevronRight size={18} className="text-gray-400 group-hover:text-gray-600 transition-colors" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{stats.pendingReviews}</p>
            <p className="text-sm text-gray-500">Pending Reviews</p>
            {stats.pendingReviews > 0 && (
              <span className="absolute top-3 right-3 w-2.5 h-2.5 bg-yellow-400 rounded-full animate-pulse" />
            )}
          </Link>

          <Link
            to="/portal/support"
            className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md hover:border-gray-300 transition-all group"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="p-2 bg-purple-50 rounded-lg">
                <MessageCircle size={20} className="text-purple-600" />
              </div>
              <ChevronRight size={18} className="text-gray-400 group-hover:text-gray-600 transition-colors" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{stats.openTickets}</p>
            <p className="text-sm text-gray-500">Open Tickets</p>
          </Link>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Highlighted Booking Card */}
            {highlightedBooking ? (
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="bg-gradient-to-r from-accent-600 to-accent-500 px-6 py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-white">
                      {currentStay ? (
                        <>
                          <Sparkles size={18} />
                          <span className="font-medium">Your Current Stay</span>
                        </>
                      ) : (
                        <>
                          <CalendarDays size={18} />
                          <span className="font-medium">Your Next Trip</span>
                        </>
                      )}
                    </div>
                    {!currentStay && nextUpcoming && (
                      <span className="text-accent-100 text-sm">
                        {getDaysUntil(highlightedBooking.check_in) === 0
                          ? 'Today!'
                          : getDaysUntil(highlightedBooking.check_in) === 1
                          ? 'Tomorrow'
                          : `In ${getDaysUntil(highlightedBooking.check_in)} days`}
                      </span>
                    )}
                  </div>
                </div>

                <div className="p-6">
                  <div className="flex flex-col md:flex-row gap-6">
                    {/* Room Image */}
                    <div className="md:w-48 h-36 flex-shrink-0 rounded-lg overflow-hidden">
                      {getRoomImage(highlightedBooking) ? (
                        <img
                          src={getRoomImage(highlightedBooking)!}
                          alt={highlightedBooking.room_name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                          <BedDouble size={32} className="text-gray-300" />
                        </div>
                      )}
                    </div>

                    {/* Booking Info */}
                    <div className="flex-1">
                      <div className="flex items-start justify-between gap-4 mb-4">
                        <div>
                          <h3 className="text-xl font-semibold text-gray-900 mb-1">
                            {highlightedBooking.room_name}
                          </h3>
                          <p className="text-gray-500 flex items-center gap-1.5">
                            <Building2 size={14} />
                            {highlightedBooking.tenants?.business_name}
                          </p>
                        </div>
                        {(() => {
                          const status = getStatusDisplay(highlightedBooking.status)
                          const StatusIcon = status.icon
                          return (
                            <span className={`flex items-center gap-1.5 text-sm px-3 py-1 rounded-full ${status.bg} ${status.color} border ${status.border}`}>
                              <StatusIcon size={14} />
                              {status.label}
                            </span>
                          )
                        })()}
                      </div>

                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div className="bg-gray-50 rounded-lg p-3">
                          <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Check-in</p>
                          <p className="font-semibold text-gray-900">{formatDate(highlightedBooking.check_in)}</p>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-3">
                          <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Check-out</p>
                          <p className="font-semibold text-gray-900">{formatDate(highlightedBooking.check_out)}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <Link to={`/portal/bookings/${highlightedBooking.id}`} className="flex-1">
                          <Button className="w-full">View Details</Button>
                        </Link>
                        <Link to={`/portal/support?booking=${highlightedBooking.id}`}>
                          <Button variant="secondary">
                            <MessageCircle size={16} className="mr-2" />
                            Support
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Calendar size={28} className="text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No upcoming trips</h3>
                <p className="text-gray-500 mb-6">Start planning your next adventure</p>
                <Link to="/">
                  <Button>
                    <Sparkles size={16} className="mr-2" />
                    Explore Accommodations
                  </Button>
                </Link>
              </div>
            )}

            {/* Recent Bookings */}
            {recentBookings.length > 0 && (
              <div className="bg-white rounded-xl border border-gray-200">
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                  <h2 className="font-semibold text-gray-900">Recent Bookings</h2>
                  <Link
                    to="/portal/bookings"
                    className="text-sm text-accent-600 hover:text-accent-700 font-medium flex items-center gap-1"
                  >
                    View all
                    <ArrowRight size={14} />
                  </Link>
                </div>
                <div className="divide-y divide-gray-100">
                  {recentBookings.map((booking) => {
                    const status = getStatusDisplay(booking.status)
                    return (
                      <Link
                        key={booking.id}
                        to={`/portal/bookings/${booking.id}`}
                        className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50 transition-colors"
                      >
                        <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0">
                          {getRoomImage(booking) ? (
                            <img
                              src={getRoomImage(booking)!}
                              alt={booking.room_name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                              <BedDouble size={18} className="text-gray-300" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 truncate">{booking.room_name}</p>
                          <p className="text-sm text-gray-500">
                            {formatDate(booking.check_in)} - {formatDate(booking.check_out)} ({getNights(booking.check_in, booking.check_out)} nights)
                          </p>
                        </div>
                        <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${status.bg} ${status.color}`}>
                          {status.label}
                        </span>
                        <ChevronRight size={18} className="text-gray-400" />
                      </Link>
                    )
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Right Column - Sidebar */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="font-semibold text-gray-900 mb-4">Quick Actions</h3>
              <div className="space-y-2">
                <Link
                  to="/"
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors group"
                >
                  <div className="p-2 bg-accent-50 rounded-lg group-hover:bg-accent-100 transition-colors">
                    <Sparkles size={18} className="text-accent-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900 text-sm">Book a new stay</p>
                    <p className="text-xs text-gray-500">Explore accommodations</p>
                  </div>
                  <ChevronRight size={16} className="text-gray-400" />
                </Link>
                <Link
                  to="/portal/support"
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors group"
                >
                  <div className="p-2 bg-purple-50 rounded-lg group-hover:bg-purple-100 transition-colors">
                    <MessageCircle size={18} className="text-purple-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900 text-sm">Contact Support</p>
                    <p className="text-xs text-gray-500">Get help with your booking</p>
                  </div>
                  <ChevronRight size={16} className="text-gray-400" />
                </Link>
                <Link
                  to="/portal/profile"
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors group"
                >
                  <div className="p-2 bg-gray-100 rounded-lg group-hover:bg-gray-200 transition-colors">
                    <Ticket size={18} className="text-gray-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900 text-sm">Manage Profile</p>
                    <p className="text-xs text-gray-500">Update your details</p>
                  </div>
                  <ChevronRight size={16} className="text-gray-400" />
                </Link>
              </div>
            </div>

            {/* Recent Support Activity */}
            {recentTicket && (
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-gray-900">Recent Support</h3>
                  <Link
                    to="/portal/support"
                    className="text-xs text-accent-600 hover:text-accent-700 font-medium"
                  >
                    View all
                  </Link>
                </div>
                <Link
                  to={`/portal/support/${recentTicket.id}`}
                  className="block p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <div className={`p-1.5 rounded-full ${
                      recentTicket.status === 'open' || recentTicket.status === 'in_progress'
                        ? 'bg-blue-100'
                        : 'bg-gray-100'
                    }`}>
                      {recentTicket.status === 'open' || recentTicket.status === 'in_progress' ? (
                        <AlertCircle size={14} className="text-blue-600" />
                      ) : (
                        <CheckCircle size={14} className="text-gray-500" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 text-sm truncate">
                        {recentTicket.subject}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {recentTicket.tenants?.business_name}
                      </p>
                    </div>
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      recentTicket.status === 'open'
                        ? 'bg-blue-50 text-blue-700'
                        : recentTicket.status === 'in_progress'
                        ? 'bg-yellow-50 text-yellow-700'
                        : 'bg-gray-100 text-gray-600'
                    }`}>
                      {recentTicket.status.replace('_', ' ')}
                    </span>
                    <span className="text-xs text-gray-400">
                      {new Date(recentTicket.updated_at).toLocaleDateString()}
                    </span>
                  </div>
                </Link>
              </div>
            )}

            {/* Travel Stats */}
            {stats.completedStays > 0 && (
              <div className="bg-gradient-to-br from-accent-50 to-emerald-50 rounded-xl border border-accent-100 p-5">
                <h3 className="font-semibold text-gray-900 mb-4">Your Travel Stats</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-accent-700">{stats.completedStays}</p>
                    <p className="text-xs text-gray-600">Stays Completed</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-accent-700">
                      {bookings.filter(b => b.reviews && b.reviews.length > 0).length}
                    </p>
                    <p className="text-xs text-gray-600">Reviews Written</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader2, Calendar, TrendingUp, Users, CreditCard, Eye, ArrowRight } from 'lucide-react'
import Card from '../components/Card'
import { bookingsApi, roomsApi, Booking, Room } from '../services/api'
import { useAuth } from '../contexts/AuthContext'

interface DashboardStats {
  totalBookings: number
  totalRevenue: number
  confirmedBookings: number
  pendingBookings: number
  completedBookings: number
  cancelledBookings: number
  todayCheckIns: number
  tomorrowCheckIns: number
  weekCheckIns: number
  occupancyRate: number
  occupiedToday: number
  totalUnits: number
  annualOccupancy: number
  annualNightsSold: number
  annualNightsAvailable: number
  recentBookings: Booking[]
}

export default function Dashboard() {
  const navigate = useNavigate()
  const { tenant, loading: authLoading, tenantLoading } = useAuth()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<DashboardStats>({
    totalBookings: 0,
    totalRevenue: 0,
    confirmedBookings: 0,
    pendingBookings: 0,
    completedBookings: 0,
    cancelledBookings: 0,
    todayCheckIns: 0,
    tomorrowCheckIns: 0,
    weekCheckIns: 0,
    occupancyRate: 0,
    occupiedToday: 0,
    totalUnits: 0,
    annualOccupancy: 0,
    annualNightsSold: 0,
    annualNightsAvailable: 0,
    recentBookings: [],
  })
  const [rooms, setRooms] = useState<Room[]>([])

  useEffect(() => {
    // Wait for auth and tenant to be ready before loading data
    if (!authLoading && !tenantLoading && tenant) {
      loadDashboardData()
    } else if (!authLoading && !tenantLoading && !tenant) {
      // No tenant available, stop loading
      setLoading(false)
    }
  }, [authLoading, tenantLoading, tenant])

  const loadDashboardData = async () => {
    try {
      setLoading(true)
      const [bookings, roomsData] = await Promise.all([
        bookingsApi.getAll(),
        roomsApi.getAll({ is_active: true }),
      ])

      setRooms(roomsData)

      // Helper to parse date string as local date (avoids timezone issues)
      // When JS parses "2025-01-15" it treats it as UTC, causing date mismatches
      const parseLocalDate = (dateStr: string): Date => {
        const [year, month, day] = dateStr.split('-').map(Number)
        return new Date(year, month - 1, day)
      }

      // Calculate stats
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const tomorrow = new Date(today)
      tomorrow.setDate(tomorrow.getDate() + 1)
      const weekEnd = new Date(today)
      weekEnd.setDate(weekEnd.getDate() + 7)

      const totalRevenue = bookings.reduce((sum, b) => {
        if (b.status !== 'cancelled') {
          return sum + (b.total_amount || 0)
        }
        return sum
      }, 0)

      const confirmedBookings = bookings.filter(b => b.status === 'confirmed').length
      const pendingBookings = bookings.filter(b => b.status === 'pending').length
      const completedBookings = bookings.filter(b => b.status === 'completed').length
      const cancelledBookings = bookings.filter(b => b.status === 'cancelled').length

      // Calculate check-ins
      const todayCheckIns = bookings.filter(b => {
        const checkIn = parseLocalDate(b.check_in)
        return checkIn.getTime() === today.getTime() && b.status !== 'cancelled'
      }).length

      const tomorrowCheckIns = bookings.filter(b => {
        const checkIn = parseLocalDate(b.check_in)
        return checkIn.getTime() === tomorrow.getTime() && b.status !== 'cancelled'
      }).length

      const weekCheckIns = bookings.filter(b => {
        const checkIn = parseLocalDate(b.check_in)
        return checkIn >= today && checkIn < weekEnd && b.status !== 'cancelled'
      }).length

      // Calculate occupancy rate using industry standard formula:
      // Occupancy Rate = (Rooms Sold / Available Rooms) × 100
      //
      // "Rooms Sold" = rooms with confirmed bookings for TODAY
      // Industry standard counts: confirmed, checked_in
      // Excludes: pending (unconfirmed), cancelled, completed, checked_out (guest departed)

      const totalRoomUnits = roomsData.reduce((sum, r) => sum + (r.total_units || 1), 0)

      // Count rooms sold today (confirmed/checked_in bookings where today is within stay period)
      const roomsSoldToday = bookings.filter(b => {
        // Only count confirmed or checked_in bookings (industry standard for "sold" rooms)
        if (!['confirmed', 'checked_in'].includes(b.status)) return false

        const checkIn = parseLocalDate(b.check_in)
        const checkOut = parseLocalDate(b.check_out)

        // Room is sold for today if: checkIn <= today < checkOut
        return checkIn <= today && today < checkOut
      }).length

      const occupancyRate = totalRoomUnits > 0
        ? Math.round((roomsSoldToday / totalRoomUnits) * 100)
        : 0

      // Calculate occupancy for next 12 months (rolling forward view)
      // This shows how booked you are for the upcoming year
      // Formula: (Total Room Nights Booked / Total Room Nights Available) × 100
      const periodStart = new Date(today) // Start from today
      const periodEnd = new Date(today)
      periodEnd.setFullYear(periodEnd.getFullYear() + 1) // 12 months from now
      const daysInPeriod = 365

      // Count nights booked in the next 12 months (confirmed, checked_in, completed)
      let annualNightsSold = 0
      bookings.forEach(b => {
        // Count confirmed, checked_in, and completed bookings
        if (!['confirmed', 'checked_in', 'completed'].includes(b.status)) return

        const checkIn = parseLocalDate(b.check_in)
        const checkOut = parseLocalDate(b.check_out)

        // Calculate overlap with the 12-month period
        const effectiveStart = checkIn < periodStart ? periodStart : checkIn
        const effectiveEnd = checkOut > periodEnd ? periodEnd : checkOut

        if (effectiveStart < effectiveEnd) {
          const nightsInPeriod = Math.ceil((effectiveEnd.getTime() - effectiveStart.getTime()) / (1000 * 60 * 60 * 24))
          annualNightsSold += nightsInPeriod
        }
      })

      const annualNightsAvailable = totalRoomUnits * daysInPeriod
      const annualOccupancy = annualNightsAvailable > 0
        ? Math.round((annualNightsSold / annualNightsAvailable) * 100)
        : 0

      // Get recent bookings (last 5)
      const recentBookings = [...bookings]
        .sort((a, b) => new Date(b.check_in).getTime() - new Date(a.check_in).getTime())
        .slice(0, 5)

      setStats({
        totalBookings: bookings.length,
        totalRevenue,
        confirmedBookings,
        pendingBookings,
        completedBookings,
        cancelledBookings,
        todayCheckIns,
        tomorrowCheckIns,
        weekCheckIns,
        occupancyRate,
        occupiedToday: roomsSoldToday,
        totalUnits: totalRoomUnits,
        annualOccupancy,
        annualNightsSold,
        annualNightsAvailable,
        recentBookings,
      })
    } catch (error) {
      console.error('Failed to load dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)
    const checkIn = new Date(dateString)
    checkIn.setHours(0, 0, 0, 0)

    if (checkIn.getTime() === today.getTime()) {
      return 'Today'
    } else if (checkIn.getTime() === tomorrow.getTime()) {
      return 'Tomorrow'
    } else {
      return date.toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' })
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'bg-accent-50 text-accent-700'
      case 'pending':
        return 'bg-yellow-50 text-yellow-700'
      case 'cancelled':
        return 'bg-red-50 text-red-700'
      case 'completed':
        return 'bg-gray-100 text-gray-700'
      case 'checked_in':
        return 'bg-blue-50 text-blue-700'
      default:
        return 'bg-gray-100 text-gray-700'
    }
  }

  if (loading || authLoading || tenantLoading) {
    return (
      <div className="bg-gray-50 p-8 min-h-full flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-accent-500" />
          <p className="text-gray-500">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  if (!tenant) {
    return (
      <div className="bg-gray-50 p-8 min-h-full flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500">No workspace found. Please set up your property first.</p>
        </div>
      </div>
    )
  }

  const totalActive = stats.confirmedBookings + stats.pendingBookings
  const maxBookings = Math.max(stats.confirmedBookings, stats.pendingBookings, stats.completedBookings, 1)

  return (
    <div className="bg-gray-50 p-8 min-h-full">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Dashboard
        </h1>
        <p className="text-gray-500">
          Welcome back! Here's an overview of your property.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card
          title="Total Bookings"
          value={stats.totalBookings.toString()}
          icon={<Calendar size={20} />}
          trend={stats.totalBookings > 0 ? { value: `${stats.confirmedBookings} confirmed`, isPositive: true } : undefined}
        />
        <Card
          title="Revenue"
          value={formatCurrency(stats.totalRevenue)}
          icon={<CreditCard size={20} />}
          trend={stats.totalRevenue > 0 ? { value: "All time", isPositive: true } : undefined}
        />
        <Card
          title="12-Month Occupancy"
          value={`${stats.annualOccupancy}%`}
          icon={<TrendingUp size={20} />}
          trend={rooms.length > 0 ? { value: `${stats.annualNightsSold} nights booked`, isPositive: stats.annualOccupancy > 50 } : undefined}
        />
        <Card
          title="Pending Bookings"
          value={stats.pendingBookings.toString()}
          icon={<Users size={20} />}
          trend={stats.pendingBookings > 0 ? { value: "Needs action", isPositive: false } : { value: "All clear", isPositive: true }}
        />
      </div>

      {/* Recent Bookings & Check-ins */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <Card title="Recent Bookings" className="lg:col-span-2">
          <div className="mt-4">
            {stats.recentBookings.length === 0 ? (
              <div className="text-center py-8">
                <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Calendar className="w-6 h-6 text-gray-400" />
                </div>
                <p className="text-gray-500 mb-4">No bookings yet</p>
                <button
                  onClick={() => navigate('/dashboard/bookings/new')}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-accent-500 text-white rounded-lg hover:bg-accent-600 transition-colors font-medium"
                >
                  Create First Booking
                  <ArrowRight size={16} />
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {stats.recentBookings.map((booking) => (
                  <div
                    key={booking.id}
                    className="flex items-center justify-between p-4 bg-gray-50 border border-gray-100 rounded-xl hover:bg-gray-100 hover:border-gray-200 transition-all cursor-pointer group"
                    onClick={() => navigate(`/dashboard/bookings/${booking.id}`)}
                  >
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">
                        {booking.room_name || booking.room_id}
                      </p>
                      <p className="text-sm text-gray-500">
                        {booking.guest_name} • Check-in: {formatDate(booking.check_in)}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`px-3 py-1 text-xs font-medium rounded-full ${getStatusColor(booking.status)}`}>
                        {booking.status.charAt(0).toUpperCase() + booking.status.slice(1).replace('_', ' ')}
                      </span>
                      <Eye size={16} className="text-gray-400 group-hover:text-gray-600 transition-colors" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>

        <Card title="Upcoming Check-ins">
          <div className="mt-4 space-y-3">
            <div className="p-4 bg-accent-50 border border-accent-100 rounded-xl">
              <div className="flex items-center justify-between">
                <p className="font-medium text-gray-900 text-sm">Today</p>
                <span className="text-2xl font-bold text-accent-600">
                  {stats.todayCheckIns}
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {stats.todayCheckIns === 1 ? 'check-in scheduled' : 'check-ins scheduled'}
              </p>
            </div>
            <div className="p-4 bg-gray-50 border border-gray-100 rounded-xl">
              <div className="flex items-center justify-between">
                <p className="font-medium text-gray-900 text-sm">Tomorrow</p>
                <span className="text-2xl font-bold text-gray-900">
                  {stats.tomorrowCheckIns}
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {stats.tomorrowCheckIns === 1 ? 'check-in scheduled' : 'check-ins scheduled'}
              </p>
            </div>
            <div className="p-4 bg-gray-50 border border-gray-100 rounded-xl">
              <div className="flex items-center justify-between">
                <p className="font-medium text-gray-900 text-sm">This Week</p>
                <span className="text-2xl font-bold text-gray-900">
                  {stats.weekCheckIns}
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                total check-ins (7 days)
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Booking Status & Quick Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Booking Status">
          <div className="mt-4 space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-600">Pending</span>
                <span className="font-medium text-gray-900">{stats.pendingBookings}</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2">
                <div
                  className="bg-yellow-500 h-2 rounded-full transition-all"
                  style={{ width: `${(stats.pendingBookings / maxBookings) * 100}%` }}
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-600">Confirmed</span>
                <span className="font-medium text-gray-900">{stats.confirmedBookings}</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2">
                <div
                  className="bg-accent-500 h-2 rounded-full transition-all"
                  style={{ width: `${(stats.confirmedBookings / maxBookings) * 100}%` }}
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-600">Completed</span>
                <span className="font-medium text-gray-900">{stats.completedBookings}</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2">
                <div
                  className="bg-gray-500 h-2 rounded-full transition-all"
                  style={{ width: `${(stats.completedBookings / maxBookings) * 100}%` }}
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-600">Cancelled</span>
                <span className="font-medium text-gray-900">{stats.cancelledBookings}</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2">
                <div
                  className="bg-red-500 h-2 rounded-full transition-all"
                  style={{ width: `${(stats.cancelledBookings / maxBookings) * 100}%` }}
                />
              </div>
            </div>
          </div>
        </Card>

        <Card title="Quick Stats">
          <div className="mt-4 grid grid-cols-2 gap-4">
            <div className="p-4 bg-gray-50 border border-gray-100 rounded-xl text-center">
              <p className="text-sm text-gray-500">Active Rooms</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{rooms.length}</p>
            </div>
            <div className="p-4 bg-gray-50 border border-gray-100 rounded-xl text-center">
              <p className="text-sm text-gray-500">Total Units</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {rooms.reduce((sum, r) => sum + r.total_units, 0)}
              </p>
            </div>
            <div className="p-4 bg-gray-50 border border-gray-100 rounded-xl text-center">
              <p className="text-sm text-gray-500">Avg. Booking Value</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {stats.totalBookings > 0
                  ? formatCurrency(stats.totalRevenue / stats.totalBookings)
                  : formatCurrency(0)}
              </p>
            </div>
            <div className="p-4 bg-accent-50 border border-accent-100 rounded-xl text-center">
              <p className="text-sm text-accent-600">Active Bookings</p>
              <p className="text-2xl font-bold text-accent-700 mt-1">{totalActive}</p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}

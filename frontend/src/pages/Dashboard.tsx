import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader2, Calendar, TrendingUp, Users, CreditCard, Eye } from 'lucide-react'
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
        const checkIn = new Date(b.check_in)
        checkIn.setHours(0, 0, 0, 0)
        return checkIn.getTime() === today.getTime() && b.status !== 'cancelled'
      }).length

      const tomorrowCheckIns = bookings.filter(b => {
        const checkIn = new Date(b.check_in)
        checkIn.setHours(0, 0, 0, 0)
        return checkIn.getTime() === tomorrow.getTime() && b.status !== 'cancelled'
      }).length

      const weekCheckIns = bookings.filter(b => {
        const checkIn = new Date(b.check_in)
        checkIn.setHours(0, 0, 0, 0)
        return checkIn >= today && checkIn < weekEnd && b.status !== 'cancelled'
      }).length

      // Calculate occupancy rate (bookings with checked_in status)
      const checkedInBookings = bookings.filter(b => b.status === 'checked_in').length

      const totalRoomUnits = roomsData.reduce((sum, r) => sum + r.total_units, 0)
      const occupancyRate = totalRoomUnits > 0
        ? Math.round((checkedInBookings / totalRoomUnits) * 100)
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
        return 'bg-green-100 text-green-700'
      case 'pending':
        return 'bg-yellow-100 text-yellow-700'
      case 'cancelled':
        return 'bg-red-100 text-red-700'
      case 'completed':
        return 'bg-gray-100 text-gray-700'
      default:
        return 'bg-gray-100 text-gray-700'
    }
  }

  if (loading || authLoading || tenantLoading) {
    return (
      <div style={{ backgroundColor: 'var(--bg-card)' }} className="p-8 min-h-full flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-gray-400" />
          <p style={{ color: 'var(--text-muted)' }}>Loading dashboard...</p>
        </div>
      </div>
    )
  }

  if (!tenant) {
    return (
      <div style={{ backgroundColor: 'var(--bg-card)' }} className="p-8 min-h-full flex items-center justify-center">
        <div className="text-center">
          <p style={{ color: 'var(--text-muted)' }}>No workspace found. Please set up your property first.</p>
        </div>
      </div>
    )
  }

  const totalActive = stats.confirmedBookings + stats.pendingBookings
  const maxBookings = Math.max(stats.confirmedBookings, stats.pendingBookings, stats.completedBookings, 1)

  return (
    <div style={{ backgroundColor: 'var(--bg-card)' }} className="p-8 min-h-full transition-colors">
      <div className="mb-8">
        <h1 style={{ color: 'var(--text-primary)' }} className="text-3xl font-bold mb-2">
          Dashboard
        </h1>
        <p style={{ color: 'var(--text-muted)' }}>
          Welcome back! Here's an overview of your property.
        </p>
      </div>

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
          title="Occupancy Rate"
          value={`${stats.occupancyRate}%`}
          icon={<TrendingUp size={20} />}
          trend={rooms.length > 0 ? { value: `${rooms.length} rooms`, isPositive: stats.occupancyRate > 50 } : undefined}
        />
        <Card
          title="Pending Bookings"
          value={stats.pendingBookings.toString()}
          icon={<Users size={20} />}
          trend={stats.pendingBookings > 0 ? { value: "Needs action", isPositive: false } : { value: "All clear", isPositive: true }}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <Card title="Recent Bookings" className="lg:col-span-2">
          <div className="mt-4">
            {stats.recentBookings.length === 0 ? (
              <div className="text-center py-8">
                <Calendar style={{ color: 'var(--text-muted)' }} className="w-12 h-12 mx-auto mb-4" />
                <p style={{ color: 'var(--text-muted)' }}>No bookings yet</p>
                <button
                  onClick={() => navigate('/dashboard/bookings/new')}
                  className="mt-4 px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors"
                >
                  Create First Booking
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {stats.recentBookings.map((booking) => (
                  <div
                    key={booking.id}
                    style={{ borderColor: 'var(--border-color)' }}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
                    onClick={() => navigate(`/dashboard/bookings/${booking.id}`)}
                  >
                    <div className="flex-1">
                      <p style={{ color: 'var(--text-primary)' }} className="font-medium">
                        {booking.room_name || booking.room_id}
                      </p>
                      <p style={{ color: 'var(--text-muted)' }} className="text-sm">
                        {booking.guest_name} • Check-in: {formatDate(booking.check_in)}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`px-3 py-1 text-xs font-medium rounded-full ${getStatusColor(booking.status)}`}>
                        {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                      </span>
                      <Eye size={16} style={{ color: 'var(--text-muted)' }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>
        <Card title="Upcoming Check-ins">
          <div className="mt-4 space-y-3">
            <div style={{ borderColor: 'var(--border-color)' }} className="p-3 border rounded-lg">
              <div className="flex items-center justify-between">
                <p style={{ color: 'var(--text-primary)' }} className="font-medium text-sm">Today</p>
                <span className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
                  {stats.todayCheckIns}
                </span>
              </div>
              <p style={{ color: 'var(--text-muted)' }} className="text-xs mt-1">
                {stats.todayCheckIns === 1 ? 'check-in scheduled' : 'check-ins scheduled'}
              </p>
            </div>
            <div style={{ borderColor: 'var(--border-color)' }} className="p-3 border rounded-lg">
              <div className="flex items-center justify-between">
                <p style={{ color: 'var(--text-primary)' }} className="font-medium text-sm">Tomorrow</p>
                <span className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
                  {stats.tomorrowCheckIns}
                </span>
              </div>
              <p style={{ color: 'var(--text-muted)' }} className="text-xs mt-1">
                {stats.tomorrowCheckIns === 1 ? 'check-in scheduled' : 'check-ins scheduled'}
              </p>
            </div>
            <div style={{ borderColor: 'var(--border-color)' }} className="p-3 border rounded-lg">
              <div className="flex items-center justify-between">
                <p style={{ color: 'var(--text-primary)' }} className="font-medium text-sm">This Week</p>
                <span className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
                  {stats.weekCheckIns}
                </span>
              </div>
              <p style={{ color: 'var(--text-muted)' }} className="text-xs mt-1">
                total check-ins (7 days)
              </p>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Booking Status">
          <div className="mt-4 space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span style={{ color: 'var(--text-secondary)' }}>Pending</span>
                <span style={{ color: 'var(--text-primary)' }} className="font-medium">{stats.pendingBookings}</span>
              </div>
              <div style={{ backgroundColor: 'var(--bg-tertiary)' }} className="w-full rounded-full h-2">
                <div
                  className="bg-yellow-500 h-2 rounded-full transition-all"
                  style={{ width: `${(stats.pendingBookings / maxBookings) * 100}%` }}
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span style={{ color: 'var(--text-secondary)' }}>Confirmed</span>
                <span style={{ color: 'var(--text-primary)' }} className="font-medium">{stats.confirmedBookings}</span>
              </div>
              <div style={{ backgroundColor: 'var(--bg-tertiary)' }} className="w-full rounded-full h-2">
                <div
                  className="bg-green-500 h-2 rounded-full transition-all"
                  style={{ width: `${(stats.confirmedBookings / maxBookings) * 100}%` }}
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span style={{ color: 'var(--text-secondary)' }}>Completed</span>
                <span style={{ color: 'var(--text-primary)' }} className="font-medium">{stats.completedBookings}</span>
              </div>
              <div style={{ backgroundColor: 'var(--bg-tertiary)' }} className="w-full rounded-full h-2">
                <div
                  className="bg-blue-500 h-2 rounded-full transition-all"
                  style={{ width: `${(stats.completedBookings / maxBookings) * 100}%` }}
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span style={{ color: 'var(--text-secondary)' }}>Cancelled</span>
                <span style={{ color: 'var(--text-primary)' }} className="font-medium">{stats.cancelledBookings}</span>
              </div>
              <div style={{ backgroundColor: 'var(--bg-tertiary)' }} className="w-full rounded-full h-2">
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
            <div style={{ borderColor: 'var(--border-color)' }} className="p-4 border rounded-lg text-center">
              <p style={{ color: 'var(--text-muted)' }} className="text-sm">Active Rooms</p>
              <p style={{ color: 'var(--text-primary)' }} className="text-2xl font-bold mt-1">{rooms.length}</p>
            </div>
            <div style={{ borderColor: 'var(--border-color)' }} className="p-4 border rounded-lg text-center">
              <p style={{ color: 'var(--text-muted)' }} className="text-sm">Total Units</p>
              <p style={{ color: 'var(--text-primary)' }} className="text-2xl font-bold mt-1">
                {rooms.reduce((sum, r) => sum + r.total_units, 0)}
              </p>
            </div>
            <div style={{ borderColor: 'var(--border-color)' }} className="p-4 border rounded-lg text-center">
              <p style={{ color: 'var(--text-muted)' }} className="text-sm">Avg. Booking Value</p>
              <p style={{ color: 'var(--text-primary)' }} className="text-2xl font-bold mt-1">
                {stats.totalBookings > 0
                  ? formatCurrency(stats.totalRevenue / stats.totalBookings)
                  : formatCurrency(0)}
              </p>
            </div>
            <div style={{ borderColor: 'var(--border-color)' }} className="p-4 border rounded-lg text-center">
              <p style={{ color: 'var(--text-muted)' }} className="text-sm">Active Bookings</p>
              <p style={{ color: 'var(--text-primary)' }} className="text-2xl font-bold mt-1">{totalActive}</p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}

import { Calendar, BedDouble, Users, DollarSign, Activity } from 'lucide-react'
import type { TenantBooking, TenantRoom, TenantMember } from '../types'

interface TenantUsage {
  rooms: number
  teamMembers: number
  monthlyBookings: number
  storageUsedMB: number
}

interface TenantLimits {
  maxRooms: number
  maxTeamMembers: number
  maxBookingsPerMonth: number
  maxStorageMB: number
}

interface OverviewSectionProps {
  usage: TenantUsage
  limits: TenantLimits
  recentBookings: TenantBooking[]
  recentActivity: TenantBooking[]
  subscription?: {
    planName: string
    status: string
  } | null
  onNavigateToSection: (sectionId: string) => void
}

const statusColors: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700',
  confirmed: 'bg-accent-100 text-accent-700',
  checked_in: 'bg-blue-100 text-blue-700',
  checked_out: 'bg-purple-100 text-purple-700',
  cancelled: 'bg-red-100 text-red-700',
  completed: 'bg-gray-100 text-gray-700',
}

export default function OverviewSection({
  usage,
  limits,
  recentBookings,
  recentActivity,
  subscription,
  onNavigateToSection
}: OverviewSectionProps) {
  const formatDate = (dateString: string) => {
    if (!dateString) return '-'
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    })
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR',
      maximumFractionDigits: 0
    }).format(amount)
  }

  const getUsageColor = (used: number, max: number) => {
    if (max <= 0) return 'bg-accent-500'
    const percentage = (used / max) * 100
    if (percentage >= 90) return 'bg-red-500'
    if (percentage >= 70) return 'bg-amber-500'
    return 'bg-accent-500'
  }

  const totalRevenue = recentBookings.reduce((sum, b) => sum + (b.total_amount || 0), 0)
  const displayActivity = recentActivity.slice(0, 3)

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 bg-blue-50 rounded-xl">
          <div className="flex items-center gap-2 mb-1">
            <Calendar size={16} className="text-blue-600" />
            <span className="text-xs font-medium text-blue-600">Monthly Bookings</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{usage.monthlyBookings}</p>
          <p className="text-xs text-gray-500 mt-1">
            of {limits.maxBookingsPerMonth === -1 ? 'Unlimited' : limits.maxBookingsPerMonth}
          </p>
        </div>
        <div className="p-4 bg-accent-50 rounded-xl">
          <div className="flex items-center gap-2 mb-1">
            <DollarSign size={16} className="text-accent-600" />
            <span className="text-xs font-medium text-accent-600">Revenue</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {formatCurrency(totalRevenue)}
          </p>
          <p className="text-xs text-gray-500 mt-1">This period</p>
        </div>
        <div className="p-4 bg-purple-50 rounded-xl">
          <div className="flex items-center gap-2 mb-1">
            <BedDouble size={16} className="text-purple-600" />
            <span className="text-xs font-medium text-purple-600">Rooms</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{usage.rooms}</p>
          <p className="text-xs text-gray-500 mt-1">
            of {limits.maxRooms === -1 ? 'Unlimited' : limits.maxRooms}
          </p>
        </div>
        <div className="p-4 bg-amber-50 rounded-xl">
          <div className="flex items-center gap-2 mb-1">
            <Users size={16} className="text-amber-600" />
            <span className="text-xs font-medium text-amber-600">Team Members</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{usage.teamMembers}</p>
          <p className="text-xs text-gray-500 mt-1">
            of {limits.maxTeamMembers === -1 ? 'Unlimited' : limits.maxTeamMembers}
          </p>
        </div>
      </div>

      {/* Usage Bars */}
      <div className="bg-gray-50 rounded-xl p-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">Usage Overview</h3>
        <div className="space-y-3">
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-600">Rooms</span>
              <span className="text-gray-900 font-medium">
                {usage.rooms} / {limits.maxRooms === -1 ? '∞' : limits.maxRooms}
              </span>
            </div>
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${getUsageColor(usage.rooms, limits.maxRooms)}`}
                style={{ width: limits.maxRooms === -1 ? '10%' : `${Math.min(100, (usage.rooms / limits.maxRooms) * 100)}%` }}
              />
            </div>
          </div>
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-600">Team Members</span>
              <span className="text-gray-900 font-medium">
                {usage.teamMembers} / {limits.maxTeamMembers === -1 ? '∞' : limits.maxTeamMembers}
              </span>
            </div>
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${getUsageColor(usage.teamMembers, limits.maxTeamMembers)}`}
                style={{ width: limits.maxTeamMembers === -1 ? '10%' : `${Math.min(100, (usage.teamMembers / limits.maxTeamMembers) * 100)}%` }}
              />
            </div>
          </div>
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-600">Monthly Bookings</span>
              <span className="text-gray-900 font-medium">
                {usage.monthlyBookings} / {limits.maxBookingsPerMonth === -1 ? '∞' : limits.maxBookingsPerMonth}
              </span>
            </div>
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${getUsageColor(usage.monthlyBookings, limits.maxBookingsPerMonth)}`}
                style={{ width: limits.maxBookingsPerMonth === -1 ? '10%' : `${Math.min(100, (usage.monthlyBookings / limits.maxBookingsPerMonth) * 100)}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-900">Recent Activity</h3>
          {recentActivity.length > 3 && (
            <button
              onClick={() => onNavigateToSection('activity')}
              className="text-xs font-medium text-accent-600 hover:text-accent-700"
            >
              View all
            </button>
          )}
        </div>
        {displayActivity.length === 0 ? (
          <div className="py-8 text-center bg-gray-50 rounded-lg">
            <Activity size={24} className="mx-auto text-gray-300 mb-2" />
            <p className="text-sm text-gray-500">No recent activity</p>
          </div>
        ) : (
          <div className="space-y-2">
            {displayActivity.map((booking, index) => (
              <div
                key={booking.id || index}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                    <Calendar size={14} className="text-blue-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      New booking: {formatCurrency(booking.total_amount)}
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatDate(booking.created_at)}
                    </p>
                  </div>
                </div>
                <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${statusColors[booking.status] || 'bg-gray-100 text-gray-600'}`}>
                  {booking.status.replace('_', ' ')}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Subscription Status */}
      {subscription && (
        <div className="bg-gradient-to-r from-accent-50 to-accent-100 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-gray-900">Current Plan</h3>
              <p className="text-2xl font-bold text-accent-600 mt-1">{subscription.planName}</p>
            </div>
            <span className={`px-3 py-1 text-sm font-medium rounded-full capitalize ${
              subscription.status === 'active' ? 'bg-green-100 text-green-700' :
              subscription.status === 'trial' ? 'bg-blue-100 text-blue-700' :
              'bg-gray-100 text-gray-600'
            }`}>
              {subscription.status}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

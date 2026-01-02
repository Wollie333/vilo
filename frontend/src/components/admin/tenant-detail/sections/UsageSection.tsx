import { BedDouble, Users, Calendar, Database, Gauge } from 'lucide-react'

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

interface UsageSectionProps {
  usage: TenantUsage
  limits: TenantLimits
}

export default function UsageSection({ usage, limits }: UsageSectionProps) {
  const getUsagePercentage = (used: number, max: number): number => {
    if (max === -1) return 10 // Unlimited shows as 10% fill
    if (max === 0) return 0
    return Math.min(100, (used / max) * 100)
  }

  const getUsageColor = (used: number, max: number) => {
    if (max === -1) return 'bg-accent-500' // Unlimited
    const percentage = (used / max) * 100
    if (percentage >= 90) return 'bg-red-500'
    if (percentage >= 70) return 'bg-amber-500'
    return 'bg-accent-500'
  }

  const getStatusText = (used: number, max: number) => {
    if (max === -1) return { text: 'Unlimited', color: 'text-accent-600' }
    const percentage = (used / max) * 100
    if (percentage >= 100) return { text: 'At limit', color: 'text-red-600' }
    if (percentage >= 90) return { text: 'Near limit', color: 'text-red-600' }
    if (percentage >= 70) return { text: 'Moderate', color: 'text-amber-600' }
    return { text: 'Good', color: 'text-green-600' }
  }

  const formatStorage = (mb: number) => {
    if (mb >= 1024) return `${(mb / 1024).toFixed(1)} GB`
    return `${mb.toFixed(1)} MB`
  }

  const usageItems = [
    {
      id: 'rooms',
      icon: BedDouble,
      label: 'Rooms',
      used: usage.rooms,
      max: limits.maxRooms,
      description: 'Number of property listings'
    },
    {
      id: 'members',
      icon: Users,
      label: 'Team Members',
      used: usage.teamMembers,
      max: limits.maxTeamMembers,
      description: 'Active team members'
    },
    {
      id: 'bookings',
      icon: Calendar,
      label: 'Monthly Bookings',
      used: usage.monthlyBookings,
      max: limits.maxBookingsPerMonth,
      description: 'Bookings created this month'
    },
    {
      id: 'storage',
      icon: Database,
      label: 'Storage',
      used: usage.storageUsedMB,
      max: limits.maxStorageMB,
      description: 'File storage used',
      formatValue: formatStorage
    }
  ]

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Usage & Limits</h2>
        <p className="text-sm text-gray-500">Current resource usage vs plan limits</p>
      </div>

      {/* Usage Items */}
      <div className="space-y-6">
        {usageItems.map((item) => {
          const Icon = item.icon
          const percentage = getUsagePercentage(item.used, item.max)
          const barColor = getUsageColor(item.used, item.max)
          const status = getStatusText(item.used, item.max)
          const displayUsed = item.formatValue ? item.formatValue(item.used) : item.used
          const displayMax = item.max === -1 ? 'Unlimited' : (item.formatValue ? item.formatValue(item.max) : item.max)

          return (
            <div key={item.id} className="bg-gray-50 rounded-xl p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-white border border-gray-200 flex items-center justify-center">
                    <Icon size={20} className="text-gray-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{item.label}</p>
                    <p className="text-xs text-gray-500">{item.description}</p>
                  </div>
                </div>
                <span className={`text-xs font-medium ${status.color}`}>
                  {status.text}
                </span>
              </div>

              {/* Progress Bar */}
              <div className="mb-2">
                <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${barColor}`}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>

              {/* Values */}
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">
                  {displayUsed} used
                </span>
                <span className="text-gray-900 font-medium">
                  {displayMax} {item.max !== -1 ? 'limit' : ''}
                </span>
              </div>
            </div>
          )
        })}
      </div>

      {/* Summary Card */}
      <div className="bg-gradient-to-r from-gray-800 to-gray-900 rounded-xl p-4 text-white">
        <div className="flex items-center gap-3 mb-3">
          <Gauge size={20} className="text-gray-400" />
          <p className="text-sm font-medium">Overall Usage</p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {usageItems.map((item) => {
            const status = getStatusText(item.used, item.max)
            return (
              <div key={item.id}>
                <p className="text-2xl font-bold">{item.used}</p>
                <p className="text-xs text-gray-400">{item.label}</p>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

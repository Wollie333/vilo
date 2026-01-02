import type { TenantHealthData } from './types'

interface TenantHealthRingProps {
  percentage: number
  size?: number
  strokeWidth?: number
}

export default function TenantHealthRing({
  percentage,
  size = 80,
  strokeWidth = 6
}: TenantHealthRingProps) {
  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  const offset = circumference - (percentage / 100) * circumference

  // Color based on percentage
  const getColor = () => {
    if (percentage >= 80) return { stroke: '#10B981', text: 'text-emerald-600' } // emerald-500
    if (percentage >= 50) return { stroke: '#F59E0B', text: 'text-amber-600' } // amber-500
    return { stroke: '#EF4444', text: 'text-red-500' } // red-500
  }

  const colors = getColor()

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="transform -rotate-90">
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#E5E7EB"
          strokeWidth={strokeWidth}
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={colors.stroke}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-500 ease-out"
        />
      </svg>
      {/* Percentage text */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`text-lg font-bold ${colors.text}`}>
          {Math.round(percentage)}%
        </span>
        {size >= 70 && (
          <span className="text-[10px] text-gray-400 uppercase tracking-wide">
            Health
          </span>
        )}
      </div>
    </div>
  )
}

export function calculateTenantHealth(data: TenantHealthData): number {
  let score = 0

  // Subscription status (30 points)
  if (data.subscriptionStatus === 'active') score += 30
  else if (data.subscriptionStatus === 'trial') score += 20
  else if (data.subscriptionStatus === 'past_due') score += 10

  // Usage utilization (25 points) - not at limits
  const roomUtil = data.maxRooms > 0 ? data.roomCount / data.maxRooms : 0
  const memberUtil = data.maxMembers > 0 ? data.memberCount / data.maxMembers : 0
  if (roomUtil < 0.9) score += 12
  if (memberUtil < 0.9) score += 13

  // Activity recency (25 points)
  const lastActive = data.lastActiveAt ? new Date(data.lastActiveAt) : new Date(data.createdAt)
  const daysSinceActive = (Date.now() - lastActive.getTime()) / (1000 * 60 * 60 * 24)
  if (daysSinceActive < 1) score += 25
  else if (daysSinceActive < 7) score += 20
  else if (daysSinceActive < 30) score += 10

  // Has rooms and bookings (20 points)
  if (data.roomCount > 0) score += 10
  if (data.monthlyBookings > 0) score += 10

  return Math.min(score, 100)
}

interface CustomerEngagementRingProps {
  percentage: number
  size?: number
  strokeWidth?: number
}

export default function CustomerEngagementRing({
  percentage,
  size = 80,
  strokeWidth = 6
}: CustomerEngagementRingProps) {
  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  const offset = circumference - (percentage / 100) * circumference

  // Color based on percentage
  const getColor = () => {
    if (percentage >= 80) return { stroke: '#10B981', text: 'text-emerald-600' } // emerald-500
    if (percentage >= 50) return { stroke: '#F59E0B', text: 'text-amber-600' } // amber-500
    return { stroke: '#9CA3AF', text: 'text-gray-400' } // gray-400
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
            Engaged
          </span>
        )}
      </div>
    </div>
  )
}

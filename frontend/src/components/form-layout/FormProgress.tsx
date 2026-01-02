interface FormProgressProps {
  percentage: number
  size?: number
  strokeWidth?: number
}

export default function FormProgress({
  percentage,
  size = 80,
  strokeWidth = 8
}: FormProgressProps) {
  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  const offset = circumference - (percentage / 100) * circumference

  // Color based on percentage
  const getColor = () => {
    if (percentage >= 80) return 'text-emerald-500'
    if (percentage >= 50) return 'text-amber-500'
    return 'text-gray-500'
  }

  const getStrokeColor = () => {
    if (percentage >= 80) return '#10b981' // emerald-500
    if (percentage >= 50) return '#f59e0b' // amber-500
    return '#6b7280' // gray-500
  }

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg
        className="transform -rotate-90"
        width={size}
        height={size}
      >
        {/* Background circle */}
        <circle
          className="text-gray-200"
          strokeWidth={strokeWidth}
          stroke="currentColor"
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
        {/* Progress circle */}
        <circle
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          stroke={getStrokeColor()}
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
          className="transition-all duration-500 ease-out"
        />
      </svg>
      {/* Center text */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`text-lg font-bold ${getColor()}`}>
          {percentage}%
        </span>
        {size >= 70 && (
          <span className="text-xs text-gray-500">Complete</span>
        )}
      </div>
    </div>
  )
}

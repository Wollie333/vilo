interface DirectoryProgressProps {
  percentage: number
  size?: number
  strokeWidth?: number
}

export default function DirectoryProgress({
  percentage,
  size = 80,
  strokeWidth = 8
}: DirectoryProgressProps) {
  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  const offset = circumference - (percentage / 100) * circumference

  // Color based on percentage
  const getColor = () => {
    if (percentage >= 80) return '#10b981' // emerald-500
    if (percentage >= 50) return '#f59e0b' // amber-500
    return '#6b7280' // gray-500
  }

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg
        width={size}
        height={size}
        className="transform -rotate-90"
      >
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#e5e7eb"
          strokeWidth={strokeWidth}
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={getColor()}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-500 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-lg font-bold text-gray-900">{Math.round(percentage)}%</span>
        <span className="text-[10px] text-gray-500">Complete</span>
      </div>
    </div>
  )
}

import { ReactNode } from 'react'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import SparklineChart from './charts/SparklineChart'

interface KPICardProps {
  title: string
  value: string | number
  subtitle?: string
  icon?: ReactNode
  trend?: {
    value: number
    label?: string
  }
  sparklineData?: number[]
  color?: 'default' | 'accent' | 'warning' | 'danger' | 'info'
  size?: 'sm' | 'md' | 'lg'
  onClick?: () => void
  loading?: boolean
}

const colorClasses = {
  default: {
    iconBg: 'bg-gray-100',
    iconText: 'text-gray-600',
    trendPositive: 'text-accent-700 bg-accent-50',
    trendNegative: 'text-red-700 bg-red-50',
    trendNeutral: 'text-gray-600 bg-gray-100'
  },
  accent: {
    iconBg: 'bg-accent-50',
    iconText: 'text-accent-600',
    trendPositive: 'text-accent-700 bg-accent-50',
    trendNegative: 'text-red-700 bg-red-50',
    trendNeutral: 'text-gray-600 bg-gray-100'
  },
  warning: {
    iconBg: 'bg-yellow-50',
    iconText: 'text-yellow-600',
    trendPositive: 'text-accent-700 bg-accent-50',
    trendNegative: 'text-red-700 bg-red-50',
    trendNeutral: 'text-gray-600 bg-gray-100'
  },
  danger: {
    iconBg: 'bg-red-50',
    iconText: 'text-red-600',
    trendPositive: 'text-accent-700 bg-accent-50',
    trendNegative: 'text-red-700 bg-red-50',
    trendNeutral: 'text-gray-600 bg-gray-100'
  },
  info: {
    iconBg: 'bg-blue-50',
    iconText: 'text-blue-600',
    trendPositive: 'text-accent-700 bg-accent-50',
    trendNegative: 'text-red-700 bg-red-50',
    trendNeutral: 'text-gray-600 bg-gray-100'
  }
}

const sizeClasses = {
  sm: {
    container: 'p-4',
    title: 'text-xs',
    value: 'text-xl',
    icon: 'w-8 h-8',
    trend: 'text-xs px-1.5 py-0.5'
  },
  md: {
    container: 'p-6',
    title: 'text-sm',
    value: 'text-3xl',
    icon: 'w-10 h-10',
    trend: 'text-sm px-2 py-1'
  },
  lg: {
    container: 'p-8',
    title: 'text-base',
    value: 'text-4xl',
    icon: 'w-12 h-12',
    trend: 'text-sm px-2.5 py-1'
  }
}

export default function KPICard({
  title,
  value,
  subtitle,
  icon,
  trend,
  sparklineData,
  color = 'default',
  size = 'md',
  onClick,
  loading = false
}: KPICardProps) {
  const colors = colorClasses[color]
  const sizes = sizeClasses[size]

  const getTrendClass = () => {
    if (!trend) return ''
    if (trend.value > 0) return colors.trendPositive
    if (trend.value < 0) return colors.trendNegative
    return colors.trendNeutral
  }

  const getTrendIcon = () => {
    if (!trend) return null
    if (trend.value > 0) return <TrendingUp size={14} />
    if (trend.value < 0) return <TrendingDown size={14} />
    return <Minus size={14} />
  }

  const formatTrendValue = (val: number) => {
    const sign = val > 0 ? '+' : ''
    return `${sign}${val.toFixed(1)}%`
  }

  if (loading) {
    return (
      <div className={`bg-white rounded-xl border border-gray-100 shadow-sm ${sizes.container} animate-pulse`}>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="h-4 bg-gray-200 rounded w-24 mb-3"></div>
            <div className="h-8 bg-gray-200 rounded w-32"></div>
          </div>
          <div className={`${sizes.icon} bg-gray-200 rounded-lg`}></div>
        </div>
      </div>
    )
  }

  return (
    <div
      className={`
        bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-all
        ${sizes.container}
        ${onClick ? 'cursor-pointer' : ''}
      `}
      onClick={onClick}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h3 className={`font-medium text-gray-500 mb-2 ${sizes.title}`}>
            {title}
          </h3>
          <div className="flex items-baseline gap-3">
            <p className={`font-bold text-gray-900 ${sizes.value}`}>
              {value}
            </p>
            {trend && (
              <div className={`flex items-center gap-1 font-medium rounded-full ${getTrendClass()} ${sizes.trend}`}>
                {getTrendIcon()}
                <span>{formatTrendValue(trend.value)}</span>
              </div>
            )}
          </div>
          {subtitle && (
            <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
          )}
          {trend?.label && (
            <p className="text-xs text-gray-400 mt-1">{trend.label}</p>
          )}
        </div>
        {icon && (
          <div className={`${sizes.icon} ${colors.iconBg} rounded-lg flex items-center justify-center ${colors.iconText} ml-4`}>
            {icon}
          </div>
        )}
      </div>

      {sparklineData && sparklineData.length > 0 && (
        <div className="mt-4 -mx-2">
          <SparklineChart
            data={sparklineData}
            height={40}
            positive={trend ? trend.value >= 0 : true}
          />
        </div>
      )}
    </div>
  )
}

// Grid wrapper for multiple KPI cards
interface KPICardGroupProps {
  children: ReactNode
  columns?: 2 | 3 | 4 | 5
}

export function KPICardGroup({ children, columns = 4 }: KPICardGroupProps) {
  const gridCols = {
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4',
    5: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-5'
  }

  return (
    <div className={`grid gap-6 ${gridCols[columns]}`}>
      {children}
    </div>
  )
}

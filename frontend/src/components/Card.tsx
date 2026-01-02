import { ReactNode } from 'react'
import { TrendingUp, TrendingDown } from 'lucide-react'

interface CardProps {
  title?: string
  value?: string
  icon?: ReactNode
  trend?: {
    value: string
    isPositive: boolean
  }
  children?: ReactNode
  className?: string
  action?: ReactNode
}

export type { CardProps }

export default function Card({ title, value, icon, trend, children, className = '', action }: CardProps) {
  return (
    <div className={`bg-white rounded-xl border border-gray-100 p-6 shadow-sm hover:shadow-md transition-all ${className}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          {(title || action) && (
            <div className="flex items-center justify-between mb-3">
              {title && <h3 className="text-sm font-medium text-gray-500">{title}</h3>}
              {action}
            </div>
          )}
          {value && (
            <div className="flex items-baseline justify-between">
              <p className="text-3xl font-bold text-gray-900">{value}</p>
              {trend && (
                <div className={`flex items-center gap-1 text-sm font-medium px-2 py-1 rounded-full ${
                  trend.isPositive
                    ? 'text-accent-700 bg-accent-50'
                    : 'text-red-700 bg-red-50'
                }`}>
                  {trend.isPositive ? (
                    <TrendingUp size={14} />
                  ) : (
                    <TrendingDown size={14} />
                  )}
                  <span>{trend.value}</span>
                </div>
              )}
            </div>
          )}
        </div>
        {icon && (
          <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center text-gray-600 ml-4">
            {icon}
          </div>
        )}
      </div>
      {children}
    </div>
  )
}

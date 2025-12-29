import { ReactNode } from 'react'
import { TrendingUp, TrendingDown } from 'lucide-react'

interface CardProps {
  title?: string
  value?: string
  trend?: {
    value: string
    isPositive: boolean
  }
  children?: ReactNode
  className?: string
}

export default function Card({ title, value, trend, children, className = '' }: CardProps) {
  return (
    <div
      style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}
      className={`rounded-lg border p-6 transition-colors ${className}`}
    >
      {title && (
        <h3 style={{ color: 'var(--text-muted)' }} className="text-sm font-medium mb-3">{title}</h3>
      )}
      {value && (
        <div className="flex items-baseline justify-between">
          <p style={{ color: 'var(--text-primary)' }} className="text-3xl font-bold">{value}</p>
          {trend && (
            <div className={`flex items-center gap-1 text-sm font-medium ${
              trend.isPositive ? 'text-green-600' : 'text-red-600'
            }`}>
              {trend.isPositive ? (
                <TrendingUp size={16} />
              ) : (
                <TrendingDown size={16} />
              )}
              <span>{trend.value}</span>
            </div>
          )}
        </div>
      )}
      {children}
    </div>
  )
}


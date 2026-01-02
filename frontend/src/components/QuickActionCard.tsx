import { Link } from 'react-router-dom'
import { Loader2 } from 'lucide-react'

type IconColor = 'blue' | 'emerald' | 'red' | 'amber' | 'gray' | 'accent'

export interface QuickActionItem {
  icon: React.ElementType
  iconColor: IconColor
  label: string
  description?: string
  onClick?: () => void
  href?: string
  disabled?: boolean
  loading?: boolean
}

interface QuickActionCardProps {
  title?: string
  actions: QuickActionItem[]
  className?: string
}

const colorClasses: Record<IconColor, { bg: string; text: string; hover: string }> = {
  blue: { bg: 'bg-blue-100', text: 'text-blue-600', hover: 'hover:bg-blue-50' },
  emerald: { bg: 'bg-emerald-100', text: 'text-emerald-600', hover: 'hover:bg-emerald-50' },
  red: { bg: 'bg-red-100', text: 'text-red-600', hover: 'hover:bg-red-50' },
  amber: { bg: 'bg-amber-100', text: 'text-amber-600', hover: 'hover:bg-amber-50' },
  gray: { bg: 'bg-gray-100', text: 'text-gray-600', hover: 'hover:bg-gray-100' },
  accent: { bg: 'bg-accent-100', text: 'text-accent-600', hover: 'hover:bg-accent-50' },
}

function QuickActionItemComponent({ action }: { action: QuickActionItem }) {
  const Icon = action.icon
  const colors = colorClasses[action.iconColor]
  const isDestructive = action.iconColor === 'red'

  const baseClasses = `w-full flex items-center gap-3 p-3 bg-gray-50 rounded-lg transition-colors text-left ${
    action.disabled
      ? 'opacity-50 cursor-not-allowed'
      : isDestructive
        ? 'hover:bg-red-50'
        : 'hover:bg-gray-100'
  }`

  const content = (
    <>
      <div className={`w-9 h-9 rounded-full ${colors.bg} flex items-center justify-center flex-shrink-0`}>
        {action.loading ? (
          <Loader2 size={16} className={`${colors.text} animate-spin`} />
        ) : (
          <Icon size={16} className={colors.text} />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-medium text-gray-900 text-sm">{action.label}</p>
        {action.description && (
          <p className="text-xs text-gray-500 truncate">{action.description}</p>
        )}
      </div>
    </>
  )

  if (action.href && !action.disabled) {
    return (
      <Link to={action.href} className={baseClasses}>
        {content}
      </Link>
    )
  }

  return (
    <button
      onClick={action.onClick}
      disabled={action.disabled || action.loading}
      className={baseClasses}
    >
      {content}
    </button>
  )
}

export default function QuickActionCard({ title, actions, className = '' }: QuickActionCardProps) {
  if (actions.length === 0) return null

  return (
    <div className={`bg-white rounded-xl border border-gray-200 p-5 ${className}`}>
      {title && (
        <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-4">
          {title}
        </h2>
      )}
      <div className="space-y-3">
        {actions.map((action, index) => (
          <QuickActionItemComponent key={index} action={action} />
        ))}
      </div>
    </div>
  )
}

// Export individual action item for standalone use
export { QuickActionItemComponent as QuickActionItem }

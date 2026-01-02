import { ShieldCheck, Building2 } from 'lucide-react'

interface VerificationBadgeProps {
  type: 'user' | 'business'
  size?: 'sm' | 'md' | 'lg'
  showLabel?: boolean
  className?: string
}

export default function VerificationBadge({
  type,
  size = 'sm',
  showLabel = false,
  className = ''
}: VerificationBadgeProps) {
  const sizeClasses = {
    sm: 'text-xs px-1.5 py-0.5 gap-1',
    md: 'text-sm px-2 py-1 gap-1.5',
    lg: 'text-base px-3 py-1.5 gap-2'
  }

  const iconSizes = {
    sm: 12,
    md: 14,
    lg: 16
  }

  const config = {
    user: {
      icon: ShieldCheck,
      label: 'Verified User',
      bgColor: 'bg-emerald-50',
      textColor: 'text-emerald-700',
      borderColor: 'border-emerald-200',
      iconColor: 'text-emerald-600'
    },
    business: {
      icon: Building2,
      label: 'Verified Business',
      bgColor: 'bg-blue-50',
      textColor: 'text-blue-700',
      borderColor: 'border-blue-200',
      iconColor: 'text-blue-600'
    }
  }

  const { icon: Icon, label, bgColor, textColor, borderColor, iconColor } = config[type]

  return (
    <span
      className={`inline-flex items-center rounded-full border font-medium ${sizeClasses[size]} ${bgColor} ${textColor} ${borderColor} ${className}`}
      title={label}
    >
      <Icon size={iconSizes[size]} className={iconColor} />
      {showLabel && <span>{label}</span>}
    </span>
  )
}

// Compact version for property cards - just the icon with tooltip
export function VerificationBadgeCompact({
  type,
  className = ''
}: {
  type: 'user' | 'business'
  className?: string
}) {
  const config = {
    user: {
      icon: ShieldCheck,
      label: 'Verified User',
      color: 'text-emerald-600'
    },
    business: {
      icon: Building2,
      label: 'Verified Business',
      color: 'text-blue-600'
    }
  }

  const { icon: Icon, label, color } = config[type]

  return (
    <span className={`inline-flex ${className}`} title={label}>
      <Icon size={16} className={color} />
    </span>
  )
}

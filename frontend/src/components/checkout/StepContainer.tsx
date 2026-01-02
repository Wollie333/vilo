import { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'

interface StepContainerProps {
  title: string
  subtitle?: string
  icon?: LucideIcon
  children: ReactNode
}

export default function StepContainer({
  title,
  subtitle,
  icon: Icon,
  children
}: StepContainerProps) {
  return (
    <div className="animate-fade-in">
      {/* Step Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3">
          {Icon && (
            <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center">
              <Icon className="w-5 h-5 text-gray-600" />
            </div>
          )}
          <div>
            <h2 className="text-xl font-bold text-gray-900">{title}</h2>
            {subtitle && (
              <p className="text-gray-500 mt-0.5">{subtitle}</p>
            )}
          </div>
        </div>
      </div>

      {/* Step Content */}
      <div className="space-y-6">
        {children}
      </div>
    </div>
  )
}

// Section Header subcomponent for use within steps
interface SectionHeaderProps {
  title: string
  icon?: LucideIcon
  optional?: boolean
}

export function SectionHeader({ title, icon: Icon, optional }: SectionHeaderProps) {
  return (
    <div className="flex items-center gap-2 mb-4">
      {Icon && <Icon className="w-5 h-5 text-gray-400" />}
      <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
      {optional && <span className="text-xs text-gray-400">(optional)</span>}
    </div>
  )
}

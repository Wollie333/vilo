import type { LucideIcon } from 'lucide-react'

interface SectionHeaderProps {
  icon?: LucideIcon
  title: string
  description?: string
}

export default function SectionHeader({ icon: Icon, title, description }: SectionHeaderProps) {
  return (
    <div className="mb-6">
      <div className="flex items-center gap-2">
        {Icon && <Icon size={20} className="text-gray-500" />}
        <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
      </div>
      {description && (
        <p className="text-sm text-gray-500 mt-1">{description}</p>
      )}
    </div>
  )
}

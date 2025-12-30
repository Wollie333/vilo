import { LucideIcon, Paintbrush, Settings } from 'lucide-react'

interface PageCardProps {
  page: {
    id: string
    name: string
    icon: LucideIcon
    description: string
    pageType: string
    isBlog?: boolean
  }
  isPublished?: boolean
  onEdit: () => void
  onSettings: () => void
}

export default function PageCard({ page, isPublished = true, onEdit, onSettings }: PageCardProps) {
  const Icon = page.icon

  return (
    <div
      style={{
        backgroundColor: 'var(--bg-card)',
        borderColor: 'var(--border-color)',
      }}
      className="p-4 rounded-lg border"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div
            style={{ backgroundColor: 'var(--bg-secondary)' }}
            className="w-10 h-10 rounded-lg flex items-center justify-center"
          >
            <Icon size={20} style={{ color: 'var(--text-primary)' }} />
          </div>
          <div>
            <h3 style={{ color: 'var(--text-primary)' }} className="font-medium text-sm flex items-center gap-2">
              {page.name}
              {!isPublished && (
                <span className="text-xs bg-yellow-100 text-yellow-800 px-1.5 py-0.5 rounded">
                  Draft
                </span>
              )}
            </h3>
            <p style={{ color: 'var(--text-muted)' }} className="text-xs mt-0.5">
              {page.description}
            </p>
          </div>
        </div>
      </div>
      <div className="flex gap-2">
        {!page.isBlog && (
          <button
            onClick={onEdit}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            <Paintbrush size={14} />
            Visual Editor
          </button>
        )}
        <button
          onClick={onSettings}
          className={`flex items-center justify-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium hover:bg-gray-50 transition-colors ${
            page.isBlog ? 'flex-1' : ''
          }`}
          style={{ borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}
        >
          <Settings size={14} />
          {page.isBlog ? 'Manage Blog' : 'Settings'}
        </button>
      </div>
    </div>
  )
}

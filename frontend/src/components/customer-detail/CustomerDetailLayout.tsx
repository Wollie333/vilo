import { ReactNode, useState } from 'react'
import { ChevronDown, ArrowLeft } from 'lucide-react'
import CustomerEngagementRing from './CustomerEngagementRing'
import { StatusIcon } from './CustomerDetailSidebar'
import type { SectionGroup, SectionStatus } from './types'

interface CustomerDetailLayoutProps {
  title: string
  subtitle?: string
  children: ReactNode
  sidebar: ReactNode
  actionsPanel: ReactNode
  activeSection: string
  onSectionChange: (sectionId: string) => void
  sectionGroups: SectionGroup[]
  getSectionStatus: (sectionId: string) => SectionStatus
  engagementPercentage: number
  onBack?: () => void
  headerActions?: ReactNode
}

export default function CustomerDetailLayout({
  title,
  subtitle,
  children,
  sidebar,
  actionsPanel,
  activeSection,
  onSectionChange,
  sectionGroups,
  getSectionStatus,
  engagementPercentage,
  onBack,
  headerActions
}: CustomerDetailLayoutProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  // Find current section name
  const currentSectionName = sectionGroups
    .flatMap((g) => g.items)
    .find((item) => item.id === activeSection)?.name || 'Section'

  return (
    <div className="min-h-full bg-gray-50">
      {/* Header - Sticky */}
      <div className="sticky top-0 z-20 bg-white border-b border-gray-200">
        <div className="px-4 lg:px-6 py-4">
          <div className="flex items-center justify-between gap-4">
            {/* Left: Back button, Title */}
            <div className="flex items-center gap-4">
              {onBack && (
                <button
                  onClick={onBack}
                  className="p-2 -ml-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <ArrowLeft size={20} />
                </button>
              )}
              <div>
                <h1 className="text-xl font-semibold text-gray-900">{title}</h1>
                {subtitle && (
                  <p className="text-sm text-gray-500">{subtitle}</p>
                )}
              </div>

              {/* Mobile Progress Ring */}
              <div className="lg:hidden">
                <CustomerEngagementRing percentage={engagementPercentage} size={40} strokeWidth={4} />
              </div>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-3">
              {headerActions}
            </div>
          </div>
        </div>

        {/* Mobile Section Selector */}
        <div className="lg:hidden border-t border-gray-100">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="w-full flex items-center justify-between px-4 py-3 text-left"
          >
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-900">{currentSectionName}</span>
              <StatusBadge status={getSectionStatus(activeSection)} />
            </div>
            <ChevronDown
              size={18}
              className={`text-gray-400 transition-transform ${mobileMenuOpen ? 'rotate-180' : ''}`}
            />
          </button>

          {/* Mobile Menu Dropdown */}
          {mobileMenuOpen && (
            <div className="absolute left-0 right-0 bg-white border-b border-gray-200 shadow-lg z-30 max-h-[60vh] overflow-y-auto">
              {sectionGroups.map((group) => (
                <div key={group.id} className="border-t border-gray-100 first:border-t-0">
                  <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase bg-gray-50">
                    {group.name}
                  </div>
                  {group.items.map((item) => {
                    const isActive = activeSection === item.id
                    const status = getSectionStatus(item.id)
                    const Icon = item.icon

                    return (
                      <button
                        key={item.id}
                        onClick={() => {
                          onSectionChange(item.id)
                          setMobileMenuOpen(false)
                        }}
                        className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                          isActive ? 'bg-accent-50 text-accent-700' : 'hover:bg-gray-50'
                        }`}
                      >
                        <Icon size={18} className={isActive ? 'text-accent-600' : 'text-gray-400'} />
                        <span className="flex-1 text-sm">{item.name}</span>
                        {item.count !== undefined && (
                          <span className="text-xs text-gray-400">({item.count})</span>
                        )}
                        <StatusIcon status={status} />
                      </button>
                    )
                  })}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Main Content Area - 3 Column */}
      <div className="flex gap-6 p-4 lg:p-6">
        {/* Sidebar */}
        {sidebar}

        {/* Main Content */}
        <div className="flex-1 min-w-0">
          <div className="bg-white rounded-xl border border-gray-200 p-4 lg:p-6">
            {children}
          </div>
        </div>

        {/* Actions Panel (Right) */}
        {actionsPanel}
      </div>
    </div>
  )
}

function StatusBadge({ status }: { status: SectionStatus }) {
  switch (status) {
    case 'complete':
      return <span className="w-2 h-2 rounded-full bg-accent-500" />
    case 'partial':
      return <span className="w-2 h-2 rounded-full bg-amber-500" />
    default:
      return <span className="w-2 h-2 rounded-full bg-gray-300" />
  }
}

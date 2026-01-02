import { Check, Circle, AlertCircle } from 'lucide-react'
import CustomerEngagementRing from './CustomerEngagementRing'
import type { SectionGroup, SectionStatus } from './types'

interface CustomerDetailSidebarProps {
  sectionGroups: SectionGroup[]
  activeSection: string
  onSectionChange: (sectionId: string) => void
  getSectionStatus: (sectionId: string) => SectionStatus
  engagementPercentage: number
}

export function StatusIcon({ status }: { status: SectionStatus }) {
  switch (status) {
    case 'complete':
      return (
        <div className="w-5 h-5 rounded-full bg-accent-100 flex items-center justify-center">
          <Check size={12} className="text-accent-600" />
        </div>
      )
    case 'partial':
      return (
        <div className="w-5 h-5 rounded-full bg-amber-100 flex items-center justify-center">
          <AlertCircle size={12} className="text-amber-600" />
        </div>
      )
    case 'empty':
    default:
      return (
        <div className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center">
          <Circle size={10} className="text-gray-400" />
        </div>
      )
  }
}

export default function CustomerDetailSidebar({
  sectionGroups,
  activeSection,
  onSectionChange,
  getSectionStatus,
  engagementPercentage
}: CustomerDetailSidebarProps) {
  const getMessage = () => {
    if (engagementPercentage >= 80) return 'Highly Engaged!'
    if (engagementPercentage >= 50) return 'Good Engagement'
    return 'Building Relationship'
  }

  return (
    <div className="hidden lg:block w-64 shrink-0">
      <div className="sticky top-24 space-y-6">
        {/* Engagement Ring */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex flex-col items-center">
            <CustomerEngagementRing percentage={engagementPercentage} />
            <p className="text-sm text-gray-500 mt-3 text-center">
              {getMessage()}
            </p>
          </div>
        </div>

        {/* Navigation */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          {sectionGroups.map((group, groupIndex) => (
            <div key={group.id} className={groupIndex > 0 ? 'mt-5 pt-5 border-t border-gray-100' : ''}>
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 px-2">
                {group.name}
              </h3>
              <div className="space-y-1">
                {group.items.map((item) => {
                  const Icon = item.icon
                  const isActive = activeSection === item.id
                  const status = getSectionStatus(item.id)

                  return (
                    <button
                      key={item.id}
                      onClick={() => onSectionChange(item.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
                        isActive
                          ? 'bg-accent-50 text-accent-700'
                          : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <Icon size={18} className={isActive ? 'text-accent-600' : 'text-gray-400'} />
                      <span className="text-sm font-medium flex-1 text-left">{item.name}</span>
                      {item.count !== undefined && (
                        <span className="text-xs text-gray-400 mr-1">({item.count})</span>
                      )}
                      <StatusIcon status={status} />
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

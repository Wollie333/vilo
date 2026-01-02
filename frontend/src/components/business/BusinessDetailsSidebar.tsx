import { Image, Building2, MapPin, Receipt, Phone, Clock, Check, Circle, AlertCircle } from 'lucide-react'
import DirectoryProgress from '../directory/DirectoryProgress'
import type { SectionStatus } from '../../hooks/useBusinessCompleteness'

interface SectionItem {
  id: string
  name: string
  icon: React.ElementType
}

const sections: SectionItem[] = [
  { id: 'logo', name: 'Business Logo', icon: Image },
  { id: 'basic-info', name: 'Basic Info', icon: Building2 },
  { id: 'address', name: 'Address', icon: MapPin },
  { id: 'tax', name: 'Tax Information', icon: Receipt },
  { id: 'contact', name: 'Contact', icon: Phone },
  { id: 'hours', name: 'Business Hours', icon: Clock },
]

interface BusinessDetailsSidebarProps {
  activeSection: string
  onSectionChange: (sectionId: string) => void
  getSectionStatus: (sectionId: string) => SectionStatus
  completenessPercentage: number
}

function StatusIcon({ status }: { status: SectionStatus }) {
  switch (status) {
    case 'complete':
      return (
        <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center">
          <Check size={12} className="text-emerald-600" />
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

export default function BusinessDetailsSidebar({
  activeSection,
  onSectionChange,
  getSectionStatus,
  completenessPercentage
}: BusinessDetailsSidebarProps) {
  return (
    <div className="hidden lg:block w-64 shrink-0">
      <div className="sticky top-6 space-y-6">
        {/* Progress Ring */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex flex-col items-center">
            <DirectoryProgress percentage={completenessPercentage} />
            <p className="text-sm text-gray-500 mt-3 text-center">
              {completenessPercentage >= 80
                ? 'Profile complete!'
                : completenessPercentage >= 50
                  ? 'Good progress!'
                  : 'Complete your profile'}
            </p>
          </div>
        </div>

        {/* Navigation */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3 px-2">
            Business Profile
          </h3>
          <div className="space-y-1">
            {sections.map((item) => {
              const Icon = item.icon
              const isActive = activeSection === item.id
              const status = getSectionStatus(item.id)

              return (
                <button
                  key={item.id}
                  onClick={() => onSectionChange(item.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
                    isActive
                      ? 'bg-emerald-50 text-emerald-700'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <Icon size={18} className={isActive ? 'text-emerald-600' : 'text-gray-400'} />
                  <span className="text-sm font-medium flex-1 text-left">{item.name}</span>
                  <StatusIcon status={status} />
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

// Export sections for mobile nav
export { sections }
export type { SectionItem }

import { Home, MapPin, Layers, Image, FileText, Sparkles, Clock, Shield, Wifi, BookOpen, Package, Megaphone, Search, Check, Circle, AlertCircle } from 'lucide-react'
import DirectoryProgress from './DirectoryProgress'
import type { SectionStatus } from '../../hooks/useDirectoryCompleteness'

interface SectionItem {
  id: string
  name: string
  icon: React.ElementType
}

interface SectionGroup {
  id: string
  name: string
  items: SectionItem[]
}

const sectionGroups: SectionGroup[] = [
  {
    id: 'essentials',
    name: 'Essentials',
    items: [
      { id: 'property-type', name: 'Property Type', icon: Home },
      { id: 'location', name: 'Location', icon: MapPin },
      { id: 'categories', name: 'Categories', icon: Layers },
    ]
  },
  {
    id: 'showcase',
    name: 'Showcase',
    items: [
      { id: 'gallery', name: 'Gallery', icon: Image },
      { id: 'description', name: 'Description', icon: FileText },
      { id: 'highlights', name: 'Highlights', icon: Sparkles },
    ]
  },
  {
    id: 'details',
    name: 'Stay Details',
    items: [
      { id: 'times', name: 'Check-in/out', icon: Clock },
      { id: 'cancellation', name: 'Cancellation', icon: Shield },
      { id: 'amenities', name: 'Amenities', icon: Wifi },
      { id: 'rules', name: 'House Rules', icon: BookOpen },
      { id: 'included', name: "What's Included", icon: Package },
    ]
  },
  {
    id: 'marketing',
    name: 'Marketing',
    items: [
      { id: 'marketing', name: 'Promotions', icon: Megaphone },
      { id: 'seo', name: 'Profile SEO', icon: Search },
    ]
  }
]

interface DirectorySidebarProps {
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

export default function DirectorySidebar({
  activeSection,
  onSectionChange,
  getSectionStatus,
  completenessPercentage
}: DirectorySidebarProps) {
  return (
    <div className="hidden lg:block w-64 shrink-0">
      <div className="sticky top-6 space-y-6">
        {/* Progress Ring */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex flex-col items-center">
            <DirectoryProgress percentage={completenessPercentage} />
            <p className="text-sm text-gray-500 mt-3 text-center">
              {completenessPercentage >= 80
                ? 'Looking great!'
                : completenessPercentage >= 50
                  ? 'Good progress!'
                  : 'Complete your listing'}
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
          ))}
        </div>
      </div>
    </div>
  )
}

// Export section groups for mobile nav
export { sectionGroups }
export type { SectionGroup, SectionItem }

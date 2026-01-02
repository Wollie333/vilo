import { User, Calendar, DollarSign, Package, CreditCard, FileText, Zap, Star, MessageSquare } from 'lucide-react'

export interface SectionItem {
  id: string
  name: string
  icon: React.ElementType
  description?: string
}

export const bookingSections: SectionItem[] = [
  { id: 'guest', name: 'Guest Info', icon: User, description: 'Contact details' },
  { id: 'stay', name: 'Stay Details', icon: Calendar, description: 'Dates & room' },
  { id: 'rates', name: 'Nightly Rates', icon: DollarSign, description: 'Price breakdown' },
  { id: 'addons', name: 'Add-ons', icon: Package, description: 'Extras & services' },
  { id: 'payment', name: 'Payment', icon: CreditCard, description: 'Payment status' },
  { id: 'invoice', name: 'Invoice', icon: FileText, description: 'Billing documents' },
  { id: 'actions', name: 'Quick Actions', icon: Zap, description: 'Common tasks' },
  { id: 'review', name: 'Guest Review', icon: Star, description: 'Feedback' },
  { id: 'notes', name: 'Notes', icon: MessageSquare, description: 'Internal notes' },
]

interface BookingDetailsSidebarProps {
  activeSection: string
  onSectionChange: (sectionId: string) => void
  getSectionStatus?: (sectionId: string) => 'complete' | 'partial' | 'empty'
}

export default function BookingDetailsSidebar({
  activeSection,
  onSectionChange,
  getSectionStatus
}: BookingDetailsSidebarProps) {
  return (
    <div className="hidden lg:block w-56 flex-shrink-0">
      <div className="sticky top-24">
        <nav className="space-y-1">
          {bookingSections.map((section) => {
            const isActive = activeSection === section.id
            const Icon = section.icon
            const status = getSectionStatus?.(section.id)

            return (
              <button
                key={section.id}
                onClick={() => onSectionChange(section.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all duration-200 group ${
                  isActive
                    ? 'bg-emerald-50 text-emerald-700 shadow-sm'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                  isActive ? 'bg-emerald-100' : 'bg-gray-100 group-hover:bg-gray-200'
                }`}>
                  <Icon size={16} className={isActive ? 'text-emerald-600' : 'text-gray-500'} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium truncate ${isActive ? 'text-emerald-700' : ''}`}>
                    {section.name}
                  </p>
                </div>
                {status === 'complete' && (
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                )}
                {status === 'partial' && (
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                )}
              </button>
            )
          })}
        </nav>
      </div>
    </div>
  )
}

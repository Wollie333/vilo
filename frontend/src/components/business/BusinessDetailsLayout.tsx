import { ReactNode, useState } from 'react'
import { Loader2, ChevronUp, Eye, Check, ChevronDown, Image, Building2, MapPin, Receipt, Phone, Clock } from 'lucide-react'
import DirectoryProgress from '../directory/DirectoryProgress'
import type { SectionStatus } from '../../hooks/useBusinessCompleteness'

const sections = [
  { id: 'logo', name: 'Business Logo', icon: Image },
  { id: 'basic-info', name: 'Basic Info', icon: Building2 },
  { id: 'address', name: 'Address', icon: MapPin },
  { id: 'tax', name: 'Tax Information', icon: Receipt },
  { id: 'contact', name: 'Contact', icon: Phone },
  { id: 'hours', name: 'Business Hours', icon: Clock },
]

interface BusinessDetailsLayoutProps {
  children: ReactNode
  sidebar: ReactNode
  preview: ReactNode
  activeSection: string
  onSectionChange: (sectionId: string) => void
  getSectionStatus: (sectionId: string) => SectionStatus
  completenessPercentage: number
  isSaving: boolean
  lastSaved: Date | null
  hasUnsavedChanges: boolean
  onSave: () => void
  mobilePreviewContent: ReactNode
}

function formatTimeSince(date: Date): string {
  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  return date.toLocaleDateString()
}

function StatusBadge({ status }: { status: SectionStatus }) {
  switch (status) {
    case 'complete':
      return <span className="w-2 h-2 rounded-full bg-emerald-500" />
    case 'partial':
      return <span className="w-2 h-2 rounded-full bg-amber-500" />
    default:
      return <span className="w-2 h-2 rounded-full bg-gray-300" />
  }
}

export default function BusinessDetailsLayout({
  children,
  sidebar,
  preview,
  activeSection,
  onSectionChange,
  getSectionStatus,
  completenessPercentage,
  isSaving,
  lastSaved,
  hasUnsavedChanges,
  onSave,
  mobilePreviewContent
}: BusinessDetailsLayoutProps) {
  const [mobilePreviewOpen, setMobilePreviewOpen] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  // Find current section
  const currentSection = sections.find((s) => s.id === activeSection)
  const currentSectionName = currentSection?.name || 'Section'

  return (
    <div className="min-h-full bg-gray-50">
      {/* Header - Sticky */}
      <div className="sticky top-0 z-20 bg-white border-b border-gray-200">
        <div className="px-4 lg:px-6 py-4">
          <div className="flex items-center justify-between gap-4">
            {/* Left: Title */}
            <div className="flex items-center gap-4">
              <div>
                <h1 className="text-xl font-semibold text-gray-900">Business Details</h1>
                {lastSaved && (
                  <p className="text-xs text-gray-400">
                    Saved {formatTimeSince(lastSaved)}
                  </p>
                )}
              </div>

              {/* Mobile Progress Ring */}
              <div className="lg:hidden">
                <DirectoryProgress percentage={completenessPercentage} size={40} strokeWidth={4} />
              </div>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-3">
              {hasUnsavedChanges && (
                <span className="hidden sm:block text-xs text-amber-600">Unsaved changes</span>
              )}

              {/* Save Button */}
              <button
                onClick={onSave}
                disabled={isSaving}
                className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isSaving ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span className="hidden sm:inline">Saving...</span>
                  </>
                ) : (
                  <>
                    <Check size={16} className="hidden sm:block" />
                    <span>Save</span>
                  </>
                )}
              </button>
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
              {sections.map((item) => {
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
                      isActive ? 'bg-emerald-50 text-emerald-700' : 'hover:bg-gray-50'
                    }`}
                  >
                    <Icon size={18} className={isActive ? 'text-emerald-600' : 'text-gray-400'} />
                    <span className="flex-1 text-sm">{item.name}</span>
                    <StatusBadge status={status} />
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex gap-6 p-4 lg:p-6">
        {/* Sidebar */}
        {sidebar}

        {/* Main Content */}
        <div className="flex-1 min-w-0">
          <div className="bg-white rounded-xl border border-gray-200 p-4 lg:p-6">
            {children}
          </div>
        </div>

        {/* Preview Panel */}
        {preview}
      </div>

      {/* Mobile Bottom Bar */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-20">
        {/* Expandable Preview Sheet */}
        {mobilePreviewOpen && (
          <div className="bg-white border-t border-gray-200 max-h-[60vh] overflow-y-auto p-4">
            {mobilePreviewContent}
          </div>
        )}

        {/* Bottom Actions */}
        <div className="flex items-center gap-3 p-3">
          <button
            onClick={() => setMobilePreviewOpen(!mobilePreviewOpen)}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <Eye size={16} />
            Preview
            <ChevronUp
              size={16}
              className={`transition-transform ${mobilePreviewOpen ? 'rotate-180' : ''}`}
            />
          </button>
          <button
            onClick={onSave}
            disabled={isSaving}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 disabled:opacity-50 transition-colors"
          >
            {isSaving ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Check size={16} />
                Save
              </>
            )}
          </button>
        </div>
      </div>

      {/* Bottom padding for mobile bottom bar */}
      <div className="lg:hidden h-20" />
    </div>
  )
}

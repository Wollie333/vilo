import { useState, useRef, useEffect } from 'react'
import { Settings, Check, RotateCcw } from 'lucide-react'
import { AdminAnalyticsSections } from '../../../hooks/useAdminAnalyticsSectionPreferences'

interface SectionConfig {
  key: keyof AdminAnalyticsSections
  label: string
  description: string
}

// All sections are now toggleable
const allSections: SectionConfig[] = [
  {
    key: 'saasMetrics',
    label: 'SaaS Metrics',
    description: 'MRR, ARR, ARPU, NRR, Revenue by Plan'
  },
  {
    key: 'growthAcquisition',
    label: 'Growth & Acquisition',
    description: 'Signups, Funnel, Churn, LTV, Sources'
  },
  {
    key: 'platformStats',
    label: 'Platform Stats',
    description: 'Rooms, Bookings, GMV'
  },
  {
    key: 'customerData',
    label: 'Customer Data',
    description: 'End-customers, Repeat rates'
  },
  {
    key: 'teamMetrics',
    label: 'Team Metrics',
    description: 'Team sizes, Role distribution'
  },
  {
    key: 'engagement',
    label: 'Engagement',
    description: 'Active %, Logins, Feature adoption'
  }
]

interface Props {
  sections: AdminAnalyticsSections
  onToggle: (key: keyof AdminAnalyticsSections) => void
  onReset: () => void
  isLocked: (key: keyof AdminAnalyticsSections) => boolean
  activeOptionalCount: number
}

export function AnalyticsSectionToggle({
  sections,
  onToggle,
  onReset,
}: Props) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Count how many sections are enabled
  const enabledCount = Object.values(sections).filter(Boolean).length

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:text-gray-900 transition-colors"
      >
        <Settings size={16} />
        <span>Customize</span>
        <span className="ml-1 px-1.5 py-0.5 text-xs font-medium bg-accent-100 text-accent-700 rounded-full">
          {enabledCount}/{allSections.length}
        </span>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-lg border border-gray-200 z-50 overflow-hidden">
          {/* Header */}
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
            <span className="font-medium text-gray-900">Customize Dashboard</span>
            <button
              onClick={onReset}
              className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700"
              title="Reset to defaults (all visible)"
            >
              <RotateCcw size={12} />
              Reset
            </button>
          </div>

          {/* All Sections - Toggleable */}
          <div className="px-4 py-3">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
              Dashboard Sections
            </p>
            <div className="space-y-2">
              {allSections.map(section => {
                const isEnabled = sections[section.key]

                return (
                  <button
                    key={section.key}
                    onClick={() => onToggle(section.key)}
                    className={`w-full flex items-start gap-3 p-2 rounded-lg text-left transition-colors cursor-pointer ${
                      isEnabled
                        ? 'bg-accent-50 hover:bg-accent-100'
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex-shrink-0 mt-0.5">
                      <div
                        className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${
                          isEnabled
                            ? 'bg-accent-500 border-accent-500'
                            : 'bg-white border-gray-300'
                        }`}
                      >
                        {isEnabled && <Check size={14} className="text-white" />}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <span
                        className={`text-sm font-medium ${
                          isEnabled ? 'text-accent-700' : 'text-gray-700'
                        }`}
                      >
                        {section.label}
                      </span>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {section.description}
                      </p>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Quick actions */}
          <div className="px-4 py-3 border-t border-gray-100 flex gap-2">
            <button
              onClick={() => {
                allSections.forEach(s => {
                  if (!sections[s.key]) onToggle(s.key)
                })
              }}
              className="flex-1 px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Show All
            </button>
            <button
              onClick={() => {
                allSections.forEach(s => {
                  if (sections[s.key]) onToggle(s.key)
                })
              }}
              className="flex-1 px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Hide All
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

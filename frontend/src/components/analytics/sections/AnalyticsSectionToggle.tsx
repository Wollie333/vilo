import { useState, useRef, useEffect } from 'react'
import { Settings2, Check, RotateCcw, Eye, EyeOff } from 'lucide-react'
import { AnalyticsSections } from '../../../hooks/useAnalyticsSectionPreferences'

interface Props {
  sections: AnalyticsSections
  onToggle: (key: keyof AnalyticsSections) => void
  onReset: () => void
  onShowAll: () => void
  onHideAll: () => void
  enabledCount: number
  totalCount: number
}

const sectionLabels: Record<keyof AnalyticsSections, string> = {
  executiveSummary: 'Executive Summary',
  revenueIntelligence: 'Revenue Intelligence',
  bookingAnalytics: 'Booking Analytics',
  trafficEngagement: 'Traffic & Engagement',
  roomPerformance: 'Room Performance',
  refundAnalytics: 'Refund Analytics',
  reports: 'Reports',
}

export function AnalyticsSectionToggle({
  sections,
  onToggle,
  onReset,
  onShowAll,
  onHideAll,
  enabledCount,
  totalCount,
}: Props) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

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
        className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
      >
        <Settings2 size={16} />
        <span>Customize</span>
        <span className="px-1.5 py-0.5 text-xs bg-gray-100 text-gray-600 rounded-full">
          {enabledCount}/{totalCount}
        </span>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-white border border-gray-200 rounded-xl shadow-lg z-50 overflow-hidden">
          <div className="p-3 border-b border-gray-100">
            <p className="text-sm font-medium text-gray-900">Visible Sections</p>
            <p className="text-xs text-gray-500">Toggle sections on/off</p>
          </div>

          <div className="p-2 max-h-64 overflow-y-auto">
            {(Object.keys(sections) as (keyof AnalyticsSections)[]).map((key) => (
              <button
                key={key}
                onClick={() => onToggle(key)}
                className="w-full flex items-center justify-between px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
              >
                <span>{sectionLabels[key]}</span>
                <div className={`w-5 h-5 rounded-md flex items-center justify-center transition-colors ${
                  sections[key]
                    ? 'bg-accent-500 text-white'
                    : 'bg-gray-100 text-gray-400'
                }`}>
                  {sections[key] && <Check size={14} />}
                </div>
              </button>
            ))}
          </div>

          <div className="p-2 border-t border-gray-100 flex gap-2">
            <button
              onClick={onShowAll}
              className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Eye size={12} />
              Show All
            </button>
            <button
              onClick={onHideAll}
              className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <EyeOff size={12} />
              Hide All
            </button>
            <button
              onClick={onReset}
              className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <RotateCcw size={12} />
              Reset
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

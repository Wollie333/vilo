import { useState } from 'react'
import { Calendar, ChevronDown } from 'lucide-react'
import { subDays, subMonths, startOfMonth, endOfMonth, startOfYear, format } from 'date-fns'

interface DateRange {
  startDate: Date
  endDate: Date
}

interface DateRangeSelectorProps {
  value: DateRange
  onChange: (range: DateRange) => void
  className?: string
}

type PresetKey = 'today' | '7days' | '30days' | '90days' | 'thisMonth' | 'lastMonth' | 'thisYear' | 'custom'

interface Preset {
  key: PresetKey
  label: string
  getRange: () => DateRange
}

const presets: Preset[] = [
  {
    key: 'today',
    label: 'Today',
    getRange: () => {
      const today = new Date()
      return { startDate: today, endDate: today }
    }
  },
  {
    key: '7days',
    label: 'Last 7 days',
    getRange: () => ({
      startDate: subDays(new Date(), 6),
      endDate: new Date()
    })
  },
  {
    key: '30days',
    label: 'Last 30 days',
    getRange: () => ({
      startDate: subDays(new Date(), 29),
      endDate: new Date()
    })
  },
  {
    key: '90days',
    label: 'Last 90 days',
    getRange: () => ({
      startDate: subDays(new Date(), 89),
      endDate: new Date()
    })
  },
  {
    key: 'thisMonth',
    label: 'This month',
    getRange: () => ({
      startDate: startOfMonth(new Date()),
      endDate: new Date()
    })
  },
  {
    key: 'lastMonth',
    label: 'Last month',
    getRange: () => {
      const lastMonth = subMonths(new Date(), 1)
      return {
        startDate: startOfMonth(lastMonth),
        endDate: endOfMonth(lastMonth)
      }
    }
  },
  {
    key: 'thisYear',
    label: 'This year',
    getRange: () => ({
      startDate: startOfYear(new Date()),
      endDate: new Date()
    })
  }
]

export default function DateRangeSelector({
  value,
  onChange,
  className = ''
}: DateRangeSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [activePreset, setActivePreset] = useState<PresetKey>('30days')
  const [customStart, setCustomStart] = useState('')
  const [customEnd, setCustomEnd] = useState('')

  const handlePresetClick = (preset: Preset) => {
    setActivePreset(preset.key)
    if (preset.key !== 'custom') {
      onChange(preset.getRange())
      setIsOpen(false)
    }
  }

  const handleCustomApply = () => {
    if (customStart && customEnd) {
      onChange({
        startDate: new Date(customStart),
        endDate: new Date(customEnd)
      })
      setActivePreset('custom')
      setIsOpen(false)
    }
  }

  const formatDisplayDate = () => {
    const start = format(value.startDate, 'MMM d, yyyy')
    const end = format(value.endDate, 'MMM d, yyyy')
    if (start === end) return start
    return `${start} - ${end}`
  }

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg hover:border-gray-300 transition-colors text-sm"
      >
        <Calendar size={16} className="text-gray-500" />
        <span className="text-gray-700">{formatDisplayDate()}</span>
        <ChevronDown size={16} className={`text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />

          {/* Dropdown */}
          <div className="absolute right-0 mt-2 w-80 bg-white border border-gray-200 rounded-xl shadow-lg z-20 overflow-hidden">
            {/* Presets */}
            <div className="p-2 border-b border-gray-100">
              <div className="grid grid-cols-2 gap-1">
                {presets.map((preset) => (
                  <button
                    key={preset.key}
                    onClick={() => handlePresetClick(preset)}
                    className={`px-3 py-2 text-sm rounded-lg text-left transition-colors ${
                      activePreset === preset.key
                        ? 'bg-accent-50 text-accent-700 font-medium'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom range */}
            <div className="p-4">
              <p className="text-xs font-medium text-gray-500 uppercase mb-3">Custom Range</p>
              <div className="flex gap-2 mb-3">
                <div className="flex-1">
                  <label className="text-xs text-gray-500 mb-1 block">Start</label>
                  <input
                    type="date"
                    value={customStart}
                    onChange={(e) => setCustomStart(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-accent-500 focus:border-accent-500"
                  />
                </div>
                <div className="flex-1">
                  <label className="text-xs text-gray-500 mb-1 block">End</label>
                  <input
                    type="date"
                    value={customEnd}
                    onChange={(e) => setCustomEnd(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-accent-500 focus:border-accent-500"
                  />
                </div>
              </div>
              <button
                onClick={handleCustomApply}
                disabled={!customStart || !customEnd}
                className="w-full px-4 py-2 bg-accent-500 text-white rounded-lg text-sm font-medium hover:bg-accent-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Apply Custom Range
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

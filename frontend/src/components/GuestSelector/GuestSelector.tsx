import { useState } from 'react'
import { Users, ChevronDown, ChevronUp } from 'lucide-react'
import type { GuestSelectorProps } from './types'
import { formatGuestSummary } from './types'

const sizeClasses = {
  sm: 'text-sm py-1.5 px-2',
  md: 'text-base py-2 px-3',
  lg: 'text-lg py-2.5 px-4'
}

const selectBaseClasses = 'w-full border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400 bg-white text-gray-900'

export default function GuestSelector({
  value,
  onChange,
  mode = 'full',
  maxAdults = 8,
  maxChildren = 6,
  maxChildAge = 17,
  showLabels = true,
  className = '',
  disabled = false,
  error = '',
  size = 'md'
}: GuestSelectorProps) {
  const [isExpanded, setIsExpanded] = useState(mode === 'full')

  const handleAdultsChange = (adults: number) => {
    onChange({ ...value, adults })
  }

  const handleChildrenChange = (children: number) => {
    let newAges = [...value.childrenAges]
    if (children > newAges.length) {
      // Add default ages (5) for new children
      for (let i = newAges.length; i < children; i++) {
        newAges.push(5)
      }
    } else {
      // Remove excess ages
      newAges = newAges.slice(0, children)
    }
    onChange({ ...value, children, childrenAges: newAges })
  }

  const handleChildAgeChange = (index: number, age: number) => {
    const newAges = [...value.childrenAges]
    newAges[index] = age
    onChange({ ...value, childrenAges: newAges })
  }

  // Compact collapsed view
  if (mode === 'compact' && !isExpanded) {
    return (
      <div className={className}>
        <button
          type="button"
          onClick={() => setIsExpanded(true)}
          disabled={disabled}
          className={`
            w-full flex items-center justify-between
            ${selectBaseClasses} ${sizeClasses[size]}
            ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-gray-400 cursor-pointer'}
          `}
        >
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-gray-400" />
            <span>{formatGuestSummary(value)}</span>
          </div>
          <ChevronDown className="w-4 h-4 text-gray-400" />
        </button>
        {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
      </div>
    )
  }

  // Full/expanded view
  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header with collapse button for compact mode */}
      {mode === 'compact' && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">Guests</span>
          </div>
          <button
            type="button"
            onClick={() => setIsExpanded(false)}
            className="p-1 text-gray-400 hover:text-gray-600 rounded"
          >
            <ChevronUp className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Adults & Children Row */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          {showLabels && (
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                Adults *
              </div>
            </label>
          )}
          <select
            value={value.adults}
            onChange={(e) => handleAdultsChange(parseInt(e.target.value))}
            disabled={disabled}
            className={`${selectBaseClasses} ${sizeClasses[size]} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {Array.from({ length: maxAdults }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>
                {n} {n === 1 ? 'Adult' : 'Adults'}
              </option>
            ))}
          </select>
        </div>

        <div>
          {showLabels && (
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                Children
              </div>
            </label>
          )}
          <select
            value={value.children}
            onChange={(e) => handleChildrenChange(parseInt(e.target.value))}
            disabled={disabled}
            className={`${selectBaseClasses} ${sizeClasses[size]} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {Array.from({ length: maxChildren + 1 }, (_, i) => i).map((n) => (
              <option key={n} value={n}>
                {n} {n === 1 ? 'Child' : 'Children'}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Children Ages */}
      {value.children > 0 && (
        <div className="pt-4 border-t border-gray-200">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Children's Ages
          </label>
          <p className="text-xs text-gray-500 mb-3">
            Please specify the age of each child for accurate pricing.
          </p>
          <div className="flex flex-wrap gap-3">
            {Array.from({ length: value.children }).map((_, index) => (
              <div key={index} className="flex items-center gap-2">
                <span className="text-sm text-gray-600 whitespace-nowrap">Child {index + 1}:</span>
                <select
                  value={value.childrenAges[index] ?? 5}
                  onChange={(e) => handleChildAgeChange(index, parseInt(e.target.value))}
                  disabled={disabled}
                  className={`w-28 ${selectBaseClasses} ${sizeClasses.sm} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {Array.from({ length: maxChildAge + 1 }, (_, age) => (
                    <option key={age} value={age}>
                      {age} {age === 1 ? 'year' : 'years'}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        </div>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  )
}

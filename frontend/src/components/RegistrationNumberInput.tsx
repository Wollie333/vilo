import { useState, useEffect } from 'react'

interface RegistrationNumberInputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  disabled?: boolean
}

/**
 * South African Company Registration Number Input with mask
 * Format: YYYY/NNNNNN/NN (e.g., 2024/123456/07)
 * - 4 digit year
 * - 6 digit sequence number
 * - 2 digit entity type (07 = private company, 23 = NPC, etc.)
 */
export default function RegistrationNumberInput({
  value,
  onChange,
  placeholder = 'YYYY/NNNNNN/NN',
  className = '',
  disabled = false
}: RegistrationNumberInputProps) {
  const [displayValue, setDisplayValue] = useState('')

  // Format value for display (add slashes)
  const formatForDisplay = (raw: string): string => {
    const digits = raw.replace(/\D/g, '').slice(0, 12)
    if (digits.length <= 4) return digits
    if (digits.length <= 10) return `${digits.slice(0, 4)}/${digits.slice(4)}`
    return `${digits.slice(0, 4)}/${digits.slice(4, 10)}/${digits.slice(10)}`
  }

  // Extract raw digits from display value
  const extractRaw = (display: string): string => {
    return display.replace(/\D/g, '').slice(0, 12)
  }

  // Sync display value with prop value
  useEffect(() => {
    // Handle if value already contains slashes
    const raw = value.replace(/\D/g, '')
    setDisplayValue(formatForDisplay(raw))
  }, [value])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value
    const raw = extractRaw(input)
    const formatted = formatForDisplay(raw)
    setDisplayValue(formatted)
    // Store the formatted value with slashes
    onChange(formatted)
  }

  const rawDigits = value.replace(/\D/g, '')
  const isValid = rawDigits.length === 12
  const isEmpty = rawDigits.length === 0

  return (
    <div className="relative">
      <input
        type="text"
        value={displayValue}
        onChange={handleChange}
        placeholder={placeholder}
        disabled={disabled}
        className={`w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm font-mono tracking-wide ${
          !isEmpty && !isValid
            ? 'border-amber-300 bg-amber-50'
            : 'border-gray-300'
        } ${disabled ? 'bg-gray-50 text-gray-500' : ''} ${className}`}
      />
      {!isEmpty && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          {isValid ? (
            <svg className="w-4 h-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            <span className="text-xs text-amber-600 font-medium">
              {rawDigits.length < 4 ? `${rawDigits.length}/4` :
               rawDigits.length < 10 ? `${rawDigits.length - 4}/6` :
               `${rawDigits.length - 10}/2`}
            </span>
          )}
        </div>
      )}
    </div>
  )
}

import { useState, useEffect } from 'react'

interface VatNumberInputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  disabled?: boolean
}

/**
 * South African VAT Number Input with mask
 * Format: 10 digits (e.g., 4123456789)
 * Display format: 4XX XXX XXXX for better readability
 */
export default function VatNumberInput({
  value,
  onChange,
  placeholder = '4XX XXX XXXX',
  className = '',
  disabled = false
}: VatNumberInputProps) {
  const [displayValue, setDisplayValue] = useState('')

  // Format value for display (add spaces for readability)
  const formatForDisplay = (raw: string): string => {
    const digits = raw.replace(/\D/g, '').slice(0, 10)
    if (digits.length <= 1) return digits
    if (digits.length <= 4) return `${digits.slice(0, 1)} ${digits.slice(1)}`
    if (digits.length <= 7) return `${digits.slice(0, 1)} ${digits.slice(1, 4)} ${digits.slice(4)}`
    return `${digits.slice(0, 1)} ${digits.slice(1, 4)} ${digits.slice(4, 7)} ${digits.slice(7)}`
  }

  // Extract raw digits from display value
  const extractRaw = (display: string): string => {
    return display.replace(/\D/g, '').slice(0, 10)
  }

  // Sync display value with prop value
  useEffect(() => {
    setDisplayValue(formatForDisplay(value))
  }, [value])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value
    const raw = extractRaw(input)
    setDisplayValue(formatForDisplay(raw))
    onChange(raw)
  }

  const isValid = value.length === 10
  const isEmpty = value.length === 0

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
            <span className="text-xs text-amber-600 font-medium">{value.length}/10</span>
          )}
        </div>
      )}
    </div>
  )
}

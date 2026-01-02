import { useState, useEffect, useRef } from 'react'
import { ChevronDown } from 'lucide-react'
import FlagIcon from './FlagIcon'

// Country data with dial codes and formats
const countries = [
  { code: 'ZA', name: 'South Africa', dialCode: '+27', format: '## ### ####' },
  { code: 'US', name: 'United States', dialCode: '+1', format: '(###) ###-####' },
  { code: 'GB', name: 'United Kingdom', dialCode: '+44', format: '#### ######' },
  { code: 'AU', name: 'Australia', dialCode: '+61', format: '### ### ###' },
  { code: 'DE', name: 'Germany', dialCode: '+49', format: '### #######' },
  { code: 'FR', name: 'France', dialCode: '+33', format: '# ## ## ## ##' },
  { code: 'NL', name: 'Netherlands', dialCode: '+31', format: '# ########' },
  { code: 'PT', name: 'Portugal', dialCode: '+351', format: '### ### ###' },
  { code: 'ES', name: 'Spain', dialCode: '+34', format: '### ### ###' },
  { code: 'NZ', name: 'New Zealand', dialCode: '+64', format: '## ### ####' },
  { code: 'IN', name: 'India', dialCode: '+91', format: '##### #####' },
  { code: 'AE', name: 'UAE', dialCode: '+971', format: '## ### ####' },
  { code: 'BW', name: 'Botswana', dialCode: '+267', format: '## ### ###' },
  { code: 'NA', name: 'Namibia', dialCode: '+264', format: '## ### ####' },
  { code: 'ZW', name: 'Zimbabwe', dialCode: '+263', format: '## ### ####' },
  { code: 'MZ', name: 'Mozambique', dialCode: '+258', format: '## ### ####' },
  { code: 'ZM', name: 'Zambia', dialCode: '+260', format: '## ### ####' },
  { code: 'KE', name: 'Kenya', dialCode: '+254', format: '### ### ###' },
  { code: 'TZ', name: 'Tanzania', dialCode: '+255', format: '### ### ###' },
  { code: 'NG', name: 'Nigeria', dialCode: '+234', format: '### ### ####' },
  { code: 'GH', name: 'Ghana', dialCode: '+233', format: '## ### ####' },
  { code: 'LS', name: 'Lesotho', dialCode: '+266', format: '#### ####' },
  { code: 'SZ', name: 'Eswatini', dialCode: '+268', format: '#### ####' },
]

interface PhoneInputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
  className?: string
  defaultCountry?: string
  error?: boolean
}

export default function PhoneInput({
  value,
  onChange,
  placeholder = 'Phone number',
  disabled = false,
  className = '',
  defaultCountry = 'ZA',
  error = false
}: PhoneInputProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [selectedCountry, setSelectedCountry] = useState(
    countries.find(c => c.code === defaultCountry) || countries[0]
  )
  const [localValue, setLocalValue] = useState('')
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Parse initial value to extract country code and number
  useEffect(() => {
    if (value) {
      // Check if value starts with a dial code
      const matchedCountry = countries.find(c => value.startsWith(c.dialCode))
      if (matchedCountry) {
        setSelectedCountry(matchedCountry)
        const numberPart = value.slice(matchedCountry.dialCode.length).replace(/\D/g, '')
        setLocalValue(formatNumber(numberPart, matchedCountry.format))
      } else {
        // Just use the raw value stripped of non-digits
        const digits = value.replace(/\D/g, '')
        setLocalValue(formatNumber(digits, selectedCountry.format))
      }
    }
  }, [])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Format number according to mask
  const formatNumber = (digits: string, format: string): string => {
    let result = ''
    let digitIndex = 0

    for (let i = 0; i < format.length && digitIndex < digits.length; i++) {
      if (format[i] === '#') {
        result += digits[digitIndex]
        digitIndex++
      } else {
        result += format[i]
      }
    }

    return result
  }

  // Get placeholder from format
  const getPlaceholder = (format: string): string => {
    return format.replace(/#/g, '0')
  }

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value
    const digits = input.replace(/\D/g, '')

    // Limit to reasonable phone length
    const maxDigits = selectedCountry.format.split('#').length - 1
    const limitedDigits = digits.slice(0, maxDigits)

    const formatted = formatNumber(limitedDigits, selectedCountry.format)
    setLocalValue(formatted)

    // Emit full number with dial code (remove leading zero)
    const normalizedDigits = limitedDigits.replace(/^0+/, '')
    const fullNumber = normalizedDigits ? `${selectedCountry.dialCode}${normalizedDigits}` : ''
    onChange(fullNumber)
  }

  // Handle country change
  const handleCountryChange = (country: typeof countries[0]) => {
    setSelectedCountry(country)
    setIsOpen(false)

    // Re-format current number with new country format
    const digits = localValue.replace(/\D/g, '')
    const formatted = formatNumber(digits, country.format)
    setLocalValue(formatted)

    // Emit full number with new dial code (remove leading zero)
    const normalizedDigits = digits.replace(/^0+/, '')
    const fullNumber = normalizedDigits ? `${country.dialCode}${normalizedDigits}` : ''
    onChange(fullNumber)
  }

  return (
    <div className={`relative ${className}`}>
      <div className="flex h-[42px]">
        {/* Country selector */}
        <div ref={dropdownRef} className="relative h-full">
          <button
            type="button"
            onClick={() => !disabled && setIsOpen(!isOpen)}
            disabled={disabled}
            className={`h-full flex items-center gap-2 px-3 border border-r-0 rounded-l-lg bg-gray-50 hover:bg-gray-100 transition-colors ${
              disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
            } ${error ? 'border-red-300' : 'border-gray-300'}`}
          >
            <FlagIcon country={selectedCountry.code} className="w-6 h-4 rounded-sm shadow-sm flex-shrink-0" />
            <span className="text-sm font-medium text-gray-700">{selectedCountry.dialCode}</span>
            <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform flex-shrink-0 ${isOpen ? 'rotate-180' : ''}`} />
          </button>

          {/* Dropdown */}
          {isOpen && (
            <div className="absolute z-50 left-0 mt-1 w-64 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
              {countries.map((country) => (
                <button
                  key={country.code}
                  type="button"
                  onClick={() => handleCountryChange(country)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 text-left transition-colors ${
                    selectedCountry.code === country.code ? 'bg-accent-50' : ''
                  }`}
                >
                  <FlagIcon country={country.code} className="w-6 h-4 rounded-sm shadow-sm" />
                  <span className="flex-1 text-sm text-gray-700">{country.name}</span>
                  <span className="text-sm text-gray-400">{country.dialCode}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Phone input */}
        <input
          type="tel"
          value={localValue}
          onChange={handleInputChange}
          placeholder={placeholder || getPlaceholder(selectedCountry.format)}
          disabled={disabled}
          className={`h-full flex-1 px-3 border rounded-r-lg focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500 ${
            disabled ? 'bg-gray-50 text-gray-500' : ''
          } ${error ? 'border-red-300 bg-red-50' : 'border-gray-300'}`}
        />
      </div>
    </div>
  )
}

// Helper to format a phone number for display (with country code and flag)
export function formatPhoneDisplay(phone: string): string {
  if (!phone) return ''

  const matchedCountry = countries.find(c => phone.startsWith(c.dialCode))
  if (matchedCountry) {
    const numberPart = phone.slice(matchedCountry.dialCode.length).replace(/\D/g, '')
    let formatted = ''
    let digitIndex = 0

    for (let i = 0; i < matchedCountry.format.length && digitIndex < numberPart.length; i++) {
      if (matchedCountry.format[i] === '#') {
        formatted += numberPart[digitIndex]
        digitIndex++
      } else {
        formatted += matchedCountry.format[i]
      }
    }

    return `${matchedCountry.dialCode} ${formatted}`
  }

  return phone
}

// Export countries for use in other components if needed
export { countries }

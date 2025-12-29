import { useState } from 'react'
import { X, Plus } from 'lucide-react'

const SUGGESTED_AMENITIES = [
  'WiFi',
  'TV',
  'Air conditioning',
  'Heating',
  'Mini bar',
  'Safe',
  'Ensuite bathroom',
  'Shared bathroom',
  'Balcony',
  'Terrace',
  'Sea view',
  'Mountain view',
  'Garden view',
  'Kitchen',
  'Kitchenette',
  'Microwave',
  'Refrigerator',
  'Coffee maker',
  'Hairdryer',
  'Iron',
  'Desk',
  'Wardrobe',
  'Parking',
  'Pool access',
  'Gym access',
]

interface AmenitiesInputProps {
  value: string[]
  onChange: (amenities: string[]) => void
}

export default function AmenitiesInput({ value, onChange }: AmenitiesInputProps) {
  const [inputValue, setInputValue] = useState('')
  const [showSuggestions, setShowSuggestions] = useState(false)

  const filteredSuggestions = SUGGESTED_AMENITIES.filter(
    (amenity) =>
      !value.includes(amenity) &&
      amenity.toLowerCase().includes(inputValue.toLowerCase())
  )

  const addAmenity = (amenity: string) => {
    const trimmed = amenity.trim()
    if (trimmed && !value.includes(trimmed)) {
      onChange([...value, trimmed])
    }
    setInputValue('')
    setShowSuggestions(false)
  }

  const removeAmenity = (amenity: string) => {
    onChange(value.filter((a) => a !== amenity))
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      if (inputValue.trim()) {
        addAmenity(inputValue)
      }
    } else if (e.key === 'Backspace' && !inputValue && value.length > 0) {
      removeAmenity(value[value.length - 1])
    }
  }

  return (
    <div className="space-y-2">
      {/* Selected amenities */}
      <div className="flex flex-wrap gap-2">
        {value.map((amenity) => (
          <span
            key={amenity}
            className="inline-flex items-center gap-1 px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-sm"
          >
            {amenity}
            <button
              type="button"
              onClick={() => removeAmenity(amenity)}
              className="text-gray-500 hover:text-gray-700"
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
      </div>

      {/* Input with suggestions */}
      <div className="relative">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => {
              setInputValue(e.target.value)
              setShowSuggestions(true)
            }}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
            onKeyDown={handleKeyDown}
            placeholder="Type to add amenity..."
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
          />
          <button
            type="button"
            onClick={() => {
              if (inputValue.trim()) {
                addAmenity(inputValue)
              }
            }}
            className="p-2 text-gray-600 hover:text-black"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>

        {/* Suggestions dropdown */}
        {showSuggestions && filteredSuggestions.length > 0 && (
          <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-48 overflow-y-auto">
            {filteredSuggestions.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onClick={() => addAmenity(suggestion)}
                className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100"
              >
                {suggestion}
              </button>
            ))}
          </div>
        )}
      </div>

      <p className="text-xs text-gray-500">
        Press Enter to add custom amenity, or click suggestions
      </p>
    </div>
  )
}

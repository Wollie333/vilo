import { useRef, useEffect, useState, useCallback } from 'react'
import { useJsApiLoader } from '@react-google-maps/api'
import { MapPin, Loader2, X } from 'lucide-react'

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || ''

// Libraries needed for Places API
const libraries: ('places')[] = ['places']

export interface PlaceResult {
  address: string
  formattedAddress: string
  placeId: string
  lat: number
  lng: number
  city?: string
  province?: string
  country?: string
  postalCode?: string
}

interface GooglePlacesAutocompleteProps {
  value: string
  onChange: (value: string) => void
  onPlaceSelect: (place: PlaceResult) => void
  placeholder?: string
  className?: string
  disabled?: boolean
  // Restrict to specific countries (ISO 3166-1 alpha-2 codes)
  countries?: string[]
}

export default function GooglePlacesAutocomplete({
  value,
  onChange,
  onPlaceSelect,
  placeholder = 'Enter address...',
  className = '',
  disabled = false,
  countries = ['za', 'na', 'bw', 'zw', 'mz', 'sz', 'ls'] // Southern Africa
}: GooglePlacesAutocompleteProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null)
  const [isFocused, setIsFocused] = useState(false)

  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
    libraries
  })

  const initAutocomplete = useCallback(() => {
    if (!inputRef.current || !isLoaded || autocompleteRef.current) return

    const options: google.maps.places.AutocompleteOptions = {
      types: ['address'],
      fields: ['address_components', 'formatted_address', 'geometry', 'place_id'],
      componentRestrictions: countries.length > 0 ? { country: countries } : undefined
    }

    autocompleteRef.current = new google.maps.places.Autocomplete(inputRef.current, options)

    autocompleteRef.current.addListener('place_changed', () => {
      const place = autocompleteRef.current?.getPlace()
      if (!place || !place.geometry?.location) return

      // Extract address components
      let city = ''
      let province = ''
      let country = ''
      let postalCode = ''

      place.address_components?.forEach(component => {
        const types = component.types
        if (types.includes('locality')) {
          city = component.long_name
        } else if (types.includes('administrative_area_level_1')) {
          province = component.long_name
        } else if (types.includes('country')) {
          country = component.long_name
        } else if (types.includes('postal_code')) {
          postalCode = component.long_name
        }
      })

      const result: PlaceResult = {
        address: value,
        formattedAddress: place.formatted_address || '',
        placeId: place.place_id || '',
        lat: place.geometry.location.lat(),
        lng: place.geometry.location.lng(),
        city,
        province,
        country,
        postalCode
      }

      onChange(place.formatted_address || '')
      onPlaceSelect(result)
    })
  }, [isLoaded, countries, value, onChange, onPlaceSelect])

  useEffect(() => {
    initAutocomplete()

    return () => {
      if (autocompleteRef.current) {
        google.maps.event.clearInstanceListeners(autocompleteRef.current)
        autocompleteRef.current = null
      }
    }
  }, [initAutocomplete])

  const handleClear = () => {
    onChange('')
    inputRef.current?.focus()
  }

  if (!GOOGLE_MAPS_API_KEY) {
    return (
      <div className={`relative ${className}`}>
        <div className="absolute left-3 top-1/2 -translate-y-1/2">
          <MapPin className="w-4 h-4 text-gray-400" />
        </div>
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:bg-gray-50 disabled:text-gray-400"
        />
        <p className="text-xs text-amber-600 mt-1">
          Address autocomplete unavailable (API key not configured)
        </p>
      </div>
    )
  }

  if (loadError) {
    return (
      <div className={`relative ${className}`}>
        <div className="absolute left-3 top-1/2 -translate-y-1/2">
          <MapPin className="w-4 h-4 text-gray-400" />
        </div>
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
        <p className="text-xs text-red-500 mt-1">Error loading address autocomplete</p>
      </div>
    )
  }

  return (
    <div className={`relative ${className}`}>
      <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
        {!isLoaded ? (
          <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />
        ) : (
          <MapPin className={`w-4 h-4 ${isFocused ? 'text-emerald-500' : 'text-gray-400'}`} />
        )}
      </div>
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        placeholder={placeholder}
        disabled={disabled || !isLoaded}
        className={`
          w-full pl-10 pr-10 py-2 border rounded-lg text-sm
          focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent
          disabled:bg-gray-50 disabled:text-gray-400
          ${isFocused ? 'border-emerald-300' : 'border-gray-200'}
        `}
      />
      {value && (
        <button
          type="button"
          onClick={handleClear}
          className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
        >
          <X className="w-3 h-3" />
        </button>
      )}
    </div>
  )
}

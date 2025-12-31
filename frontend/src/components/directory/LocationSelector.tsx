import { useState, useEffect } from 'react'
import { MapPin, ChevronDown } from 'lucide-react'
import { discoveryApi, Country, Province, Destination } from '../../services/discoveryApi'
import GooglePlacesAutocomplete, { PlaceResult } from '../discovery/GooglePlacesAutocomplete'
import GoogleMap from '../discovery/GoogleMap'

interface LocationSelectorProps {
  countryId: string | null
  provinceId: string | null
  destinationId: string | null
  address: string
  latitude?: number | null
  longitude?: number | null
  onCountryChange: (id: string | null) => void
  onProvinceChange: (id: string | null) => void
  onDestinationChange: (id: string | null) => void
  onAddressChange: (address: string) => void
  onCoordinatesChange?: (lat: number | null, lng: number | null) => void
}

export default function LocationSelector({
  countryId,
  provinceId,
  destinationId,
  address,
  latitude,
  longitude,
  onCountryChange,
  onProvinceChange,
  onDestinationChange,
  onAddressChange,
  onCoordinatesChange
}: LocationSelectorProps) {
  const [countries, setCountries] = useState<Country[]>([])
  const [provinces, setProvinces] = useState<Province[]>([])
  const [destinations, setDestinations] = useState<Destination[]>([])
  const [loading, setLoading] = useState(true)

  // Fetch countries on mount
  useEffect(() => {
    const fetchCountries = async () => {
      try {
        const data = await discoveryApi.getCountries()
        setCountries(data)
      } catch (err) {
        console.error('Error fetching countries:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchCountries()
  }, [])

  // Fetch provinces when country changes
  useEffect(() => {
    if (!countryId) {
      setProvinces([])
      return
    }

    const fetchProvinces = async () => {
      try {
        const data = await discoveryApi.getProvinces(countryId)
        setProvinces(data)
      } catch (err) {
        console.error('Error fetching provinces:', err)
      }
    }
    fetchProvinces()
  }, [countryId])

  // Fetch destinations when province changes
  useEffect(() => {
    if (!provinceId) {
      setDestinations([])
      return
    }

    const fetchDestinations = async () => {
      try {
        const selectedProvince = provinces.find(p => p.id === provinceId)
        if (selectedProvince) {
          const data = await discoveryApi.getDestinationsNew({ province_slug: selectedProvince.slug })
          setDestinations(data)
        }
      } catch (err) {
        console.error('Error fetching destinations:', err)
      }
    }
    fetchDestinations()
  }, [provinceId, provinces])

  const handleCountryChange = (value: string) => {
    const newId = value || null
    onCountryChange(newId)
    onProvinceChange(null)
    onDestinationChange(null)
  }

  const handleProvinceChange = (value: string) => {
    const newId = value || null
    onProvinceChange(newId)
    onDestinationChange(null)
  }

  const handleDestinationChange = (value: string) => {
    onDestinationChange(value || null)
  }

  const handlePlaceSelect = (place: PlaceResult) => {
    onAddressChange(place.formattedAddress)
    onCoordinatesChange?.(place.lat, place.lng)
  }

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-10 bg-gray-100 rounded-lg" />
        <div className="h-10 bg-gray-100 rounded-lg" />
        <div className="h-10 bg-gray-100 rounded-lg" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
        <MapPin size={16} />
        <span>Select your property location</span>
      </div>

      {/* Country */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Country
        </label>
        <div className="relative">
          <select
            value={countryId || ''}
            onChange={(e) => handleCountryChange(e.target.value)}
            className="w-full px-3 py-2 pr-10 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent-500 appearance-none bg-white"
          >
            <option value="">Select country...</option>
            {countries.map(country => (
              <option key={country.id} value={country.id}>
                {country.name}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        </div>
      </div>

      {/* Province */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Province / Region
        </label>
        <div className="relative">
          <select
            value={provinceId || ''}
            onChange={(e) => handleProvinceChange(e.target.value)}
            disabled={!countryId || provinces.length === 0}
            className="w-full px-3 py-2 pr-10 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent-500 appearance-none bg-white disabled:bg-gray-50 disabled:text-gray-400"
          >
            <option value="">
              {!countryId ? 'Select a country first...' : 'Select province...'}
            </option>
            {provinces.map(province => (
              <option key={province.id} value={province.id}>
                {province.name}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        </div>
      </div>

      {/* Destination */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Destination / Area
        </label>
        <div className="relative">
          <select
            value={destinationId || ''}
            onChange={(e) => handleDestinationChange(e.target.value)}
            disabled={!provinceId || destinations.length === 0}
            className="w-full px-3 py-2 pr-10 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent-500 appearance-none bg-white disabled:bg-gray-50 disabled:text-gray-400"
          >
            <option value="">
              {!provinceId ? 'Select a province first...' : destinations.length === 0 ? 'No destinations available' : 'Select destination...'}
            </option>
            {destinations.map(dest => (
              <option key={dest.id} value={dest.id}>
                {dest.name}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        </div>
        <p className="text-xs text-gray-400 mt-1">
          This helps guests find your property when browsing by destination
        </p>
      </div>

      {/* Address with Google Places Autocomplete */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Street Address
        </label>
        <GooglePlacesAutocomplete
          value={address}
          onChange={onAddressChange}
          onPlaceSelect={handlePlaceSelect}
          placeholder="Start typing your address..."
        />
        <p className="text-xs text-gray-400 mt-1">
          Your exact address will only be shown to confirmed guests
        </p>
      </div>

      {/* Map Preview */}
      {latitude && longitude && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Location Preview
          </label>
          <GoogleMap
            center={{ lat: latitude, lng: longitude }}
            markerPosition={{ lat: latitude, lng: longitude }}
            zoom={15}
            height={200}
            showInfoWindow={false}
          />
          <p className="text-xs text-gray-400 mt-1">
            Coordinates: {latitude.toFixed(6)}, {longitude.toFixed(6)}
          </p>
        </div>
      )}
    </div>
  )
}

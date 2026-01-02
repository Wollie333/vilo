import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MapPin, Users, Search, ChevronDown, X, Calendar } from 'lucide-react'
import DatePickerModal from '../DatePickerModal'

interface SearchBarProps {
  variant?: 'expanded' | 'compact'
  initialValues?: {
    location?: string
    checkIn?: string
    checkOut?: string
    guests?: number
  }
  onSearch?: (params: SearchParams) => void
  className?: string
}

export interface SearchParams {
  location: string
  checkIn: string
  checkOut: string
  guests: number
}

const popularDestinations = [
  'Cape Town',
  'Garden Route',
  'Kruger National Park',
  'Drakensberg',
  'Durban',
  'Cape Winelands',
]

export default function SearchBar({
  variant = 'expanded',
  initialValues = {},
  onSearch,
  className = ''
}: SearchBarProps) {
  const navigate = useNavigate()
  const [location, setLocation] = useState(initialValues.location || '')
  const [checkIn, setCheckIn] = useState(initialValues.checkIn || '')
  const [checkOut, setCheckOut] = useState(initialValues.checkOut || '')
  const [guests, setGuests] = useState(initialValues.guests || 2)
  const [showLocationDropdown, setShowLocationDropdown] = useState(false)
  const [showGuestDropdown, setShowGuestDropdown] = useState(false)

  const handleSearch = () => {
    const params: SearchParams = { location, checkIn, checkOut, guests }

    if (onSearch) {
      onSearch(params)
    } else {
      // Navigate to search results with query params
      const searchParams = new URLSearchParams()
      if (location) searchParams.set('location', location)
      if (checkIn) searchParams.set('checkIn', checkIn)
      if (checkOut) searchParams.set('checkOut', checkOut)
      if (guests) searchParams.set('guests', String(guests))

      navigate(`/search?${searchParams.toString()}`)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch()
    }
  }

  if (variant === 'compact') {
    return (
      <div className={`flex items-center bg-white border border-gray-200 rounded-full shadow-sm ${className}`}>
        {/* Location */}
        <div className="flex items-center gap-2 px-4 py-2.5 flex-1 min-w-0 border-r border-gray-200">
          <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0" />
          <input
            type="text"
            placeholder="Where to?"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            onKeyDown={handleKeyDown}
            className="bg-transparent border-none outline-none text-sm text-gray-700 placeholder-gray-400 w-full min-w-0"
          />
        </div>

        {/* Check-in */}
        <DatePickerModal
          value={checkIn}
          onChange={setCheckIn}
          placeholder="Check in"
          minDate={new Date().toISOString().split('T')[0]}
          customTrigger={({ onClick }) => (
            <button
              onClick={onClick}
              className="flex items-center gap-2 px-4 py-2.5 border-r border-gray-200 hover:bg-gray-50 transition-colors"
            >
              <Calendar className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <span className={`text-sm whitespace-nowrap ${checkIn ? 'text-gray-700' : 'text-gray-400'}`}>
                {checkIn ? new Date(checkIn).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'Check in'}
              </span>
            </button>
          )}
        />

        {/* Check-out */}
        <DatePickerModal
          value={checkOut}
          onChange={setCheckOut}
          placeholder="Check out"
          minDate={checkIn || new Date().toISOString().split('T')[0]}
          customTrigger={({ onClick }) => (
            <button
              onClick={onClick}
              className="flex items-center gap-2 px-4 py-2.5 border-r border-gray-200 hover:bg-gray-50 transition-colors"
            >
              <Calendar className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <span className={`text-sm whitespace-nowrap ${checkOut ? 'text-gray-700' : 'text-gray-400'}`}>
                {checkOut ? new Date(checkOut).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'Check out'}
              </span>
            </button>
          )}
        />

        {/* Guests */}
        <div className="relative">
          <button
            onClick={() => setShowGuestDropdown(!showGuestDropdown)}
            className="flex items-center gap-2 px-4 py-2.5 hover:bg-gray-50 transition-colors"
          >
            <Users className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <span className="text-sm text-gray-700 whitespace-nowrap">{guests} guest{guests !== 1 ? 's' : ''}</span>
            <ChevronDown className="w-3 h-3 text-gray-400" />
          </button>

          {showGuestDropdown && (
            <div className="absolute top-full right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-gray-100 p-4 z-50">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-700 font-medium">Guests</span>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setGuests(Math.max(1, guests - 1))}
                    className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center text-gray-600 hover:border-gray-400 hover:bg-gray-50 transition-colors"
                  >
                    -
                  </button>
                  <span className="text-gray-900 font-medium w-6 text-center">{guests}</span>
                  <button
                    onClick={() => setGuests(Math.min(20, guests + 1))}
                    className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center text-gray-600 hover:border-gray-400 hover:bg-gray-50 transition-colors"
                  >
                    +
                  </button>
                </div>
              </div>
              <button
                onClick={() => setShowGuestDropdown(false)}
                className="mt-3 w-full py-2 text-sm text-emerald-600 font-medium hover:text-emerald-700 transition-colors"
              >
                Done
              </button>
            </div>
          )}
        </div>

        {/* Search Button */}
        <button
          onClick={handleSearch}
          className="bg-gray-900 hover:bg-gray-800 text-white p-2.5 m-1 rounded-full transition-colors flex-shrink-0"
        >
          <Search className="w-4 h-4" />
        </button>
      </div>
    )
  }

  return (
    <div className={`bg-white rounded-full shadow-xl border border-gray-200 ${className}`}>
      <div className="flex flex-col md:flex-row md:items-center">
        {/* Location */}
        <div className="relative flex-1 min-w-0">
          <div
            className="flex items-center gap-3 px-6 py-4 rounded-full hover:bg-gray-50 cursor-pointer transition-colors"
            onClick={() => setShowLocationDropdown(!showLocationDropdown)}
          >
            <MapPin className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-xs text-gray-500 font-medium">Where</div>
              <input
                type="text"
                placeholder="Search destinations"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                onFocus={() => setShowLocationDropdown(true)}
                onKeyDown={handleKeyDown}
                className="w-full bg-transparent border-none outline-none text-gray-900 placeholder-gray-400 text-sm"
              />
            </div>
            {location && (
              <button
                onClick={(e) => { e.stopPropagation(); setLocation('') }}
                className="p-1 hover:bg-gray-200 rounded-full flex-shrink-0"
              >
                <X className="w-4 h-4 text-gray-400" />
              </button>
            )}
          </div>

          {showLocationDropdown && (
            <div className="absolute top-full left-0 mt-2 w-72 bg-white rounded-xl shadow-lg border border-gray-100 py-2 z-50">
              <div className="px-4 py-2 text-xs text-gray-500 font-medium">Popular destinations</div>
              {popularDestinations.map((dest) => (
                <button
                  key={dest}
                  onClick={() => {
                    setLocation(dest)
                    setShowLocationDropdown(false)
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                >
                  <MapPin className="w-4 h-4 text-gray-400" />
                  {dest}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="hidden md:block w-px h-8 bg-gray-200" />

        {/* Check-in */}
        <div className="flex-1 min-w-0">
          <SearchDateField
            value={checkIn}
            onChange={setCheckIn}
            label="Check in"
            placeholder="Add dates"
            minDate={new Date().toISOString().split('T')[0]}
          />
        </div>

        {/* Divider */}
        <div className="hidden md:block w-px h-8 bg-gray-200" />

        {/* Check-out */}
        <div className="flex-1 min-w-0">
          <SearchDateField
            value={checkOut}
            onChange={setCheckOut}
            label="Check out"
            placeholder="Add dates"
            minDate={checkIn || new Date().toISOString().split('T')[0]}
          />
        </div>

        {/* Divider */}
        <div className="hidden md:block w-px h-8 bg-gray-200" />

        {/* Guests */}
        <div className="relative">
          <div
            onClick={() => setShowGuestDropdown(!showGuestDropdown)}
            className="flex items-center gap-3 px-6 py-4 rounded-full hover:bg-gray-50 cursor-pointer transition-colors"
          >
            <Users className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            <div className="min-w-0">
              <div className="text-xs text-gray-500 font-medium">Guests</div>
              <div className="text-sm text-gray-900 whitespace-nowrap">{guests} guest{guests !== 1 ? 's' : ''}</div>
            </div>
            <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
          </div>

          {showGuestDropdown && (
            <div className="absolute top-full right-0 mt-2 w-64 bg-white rounded-xl shadow-lg border border-gray-100 p-4 z-50">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-700 font-medium">Guests</span>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setGuests(Math.max(1, guests - 1))}
                    className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center text-gray-600 hover:border-gray-400 hover:bg-gray-50 transition-colors"
                  >
                    -
                  </button>
                  <span className="text-gray-900 font-medium w-6 text-center">{guests}</span>
                  <button
                    onClick={() => setGuests(Math.min(20, guests + 1))}
                    className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center text-gray-600 hover:border-gray-400 hover:bg-gray-50 transition-colors"
                  >
                    +
                  </button>
                </div>
              </div>
              <button
                onClick={() => setShowGuestDropdown(false)}
                className="mt-4 w-full py-2 text-sm text-emerald-600 font-medium hover:text-emerald-700 transition-colors"
              >
                Done
              </button>
            </div>
          )}
        </div>

        {/* Search Button */}
        <div className="p-2">
          <button
            onClick={handleSearch}
            className="bg-gray-900 hover:bg-gray-800 text-white px-6 py-3 rounded-full transition-colors flex items-center gap-2 font-medium"
          >
            <Search className="w-5 h-5" />
            <span className="hidden sm:block">Search</span>
          </button>
        </div>
      </div>
    </div>
  )
}

// Custom date field component that matches the styling of other search fields
function SearchDateField({
  value,
  onChange,
  label,
  placeholder,
  minDate
}: {
  value: string
  onChange: (date: string) => void
  label: string
  placeholder: string
  minDate?: string
}) {
  const formatDisplayDate = (dateStr: string) => {
    if (!dateStr) return ''
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  return (
    <DatePickerModal
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      minDate={minDate}
      customTrigger={({ onClick }) => (
        <div
          className="flex items-center gap-3 px-6 py-4 rounded-full hover:bg-gray-50 cursor-pointer transition-colors"
          onClick={onClick}
        >
          <Calendar className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          <div className="min-w-0">
            <div className="text-xs text-gray-500 font-medium">{label}</div>
            <div className={`text-sm ${value ? 'text-gray-900' : 'text-gray-400'}`}>
              {value ? formatDisplayDate(value) : placeholder}
            </div>
          </div>
        </div>
      )}
    />
  )
}

import { useState, useEffect } from 'react'
import { AlertTriangle, Info, Calendar } from 'lucide-react'
import { Room, roomsApi } from '../../services/api'

interface ValidationWarning {
  type: 'min_stay' | 'max_stay'
  message: string
  roomRule: number
  actualNights: number
}

interface RoomDatesStepProps {
  roomId: string
  roomName: string
  checkIn: string
  checkOut: string
  overrideRules: boolean
  onRoomChange: (roomId: string, roomName: string, room: Room | null) => void
  onCheckInChange: (date: string) => void
  onCheckOutChange: (date: string) => void
  onOverrideChange: (override: boolean) => void
  onValidationChange: (isValid: boolean, warnings: ValidationWarning[]) => void
}

export default function RoomDatesStep({
  roomId,
  roomName: _roomName,
  checkIn,
  checkOut,
  overrideRules,
  onRoomChange,
  onCheckInChange,
  onCheckOutChange,
  onOverrideChange,
  onValidationChange,
}: RoomDatesStepProps) {
  void _roomName // Declared but used via room selection
  const [rooms, setRooms] = useState<Room[]>([])
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null)
  const [isLoadingRooms, setIsLoadingRooms] = useState(true)
  const [warnings, setWarnings] = useState<ValidationWarning[]>([])

  // Load active rooms
  useEffect(() => {
    loadRooms()
  }, [])

  // Load selected room when roomId changes
  useEffect(() => {
    if (roomId && rooms.length > 0) {
      const room = rooms.find((r) => r.id === roomId)
      setSelectedRoom(room || null)
    }
  }, [roomId, rooms])

  // Validate dates against room rules
  useEffect(() => {
    validateDates()
  }, [selectedRoom, checkIn, checkOut, overrideRules])

  const loadRooms = async () => {
    try {
      setIsLoadingRooms(true)
      const data = await roomsApi.getAll({ is_active: true })
      setRooms(data)
    } catch (error) {
      console.error('Failed to load rooms:', error)
    } finally {
      setIsLoadingRooms(false)
    }
  }

  const calculateNights = (): number => {
    if (!checkIn || !checkOut) return 0
    const start = new Date(checkIn)
    const end = new Date(checkOut)
    const diffTime = end.getTime() - start.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays > 0 ? diffDays : 0
  }

  const validateDates = () => {
    const newWarnings: ValidationWarning[] = []
    const nights = calculateNights()

    if (selectedRoom && nights > 0) {
      // Check minimum stay
      if (nights < selectedRoom.min_stay_nights) {
        newWarnings.push({
          type: 'min_stay',
          message: `This room requires a minimum stay of ${selectedRoom.min_stay_nights} night${selectedRoom.min_stay_nights > 1 ? 's' : ''}. You selected ${nights} night${nights > 1 ? 's' : ''}.`,
          roomRule: selectedRoom.min_stay_nights,
          actualNights: nights,
        })
      }

      // Check maximum stay
      if (selectedRoom.max_stay_nights && nights > selectedRoom.max_stay_nights) {
        newWarnings.push({
          type: 'max_stay',
          message: `This room has a maximum stay of ${selectedRoom.max_stay_nights} night${selectedRoom.max_stay_nights > 1 ? 's' : ''}. You selected ${nights} night${nights > 1 ? 's' : ''}.`,
          roomRule: selectedRoom.max_stay_nights,
          actualNights: nights,
        })
      }
    }

    setWarnings(newWarnings)

    // Valid if no warnings, or if warnings exist but override is checked
    const isValid =
      roomId !== '' &&
      checkIn !== '' &&
      checkOut !== '' &&
      nights > 0 &&
      (newWarnings.length === 0 || overrideRules)

    onValidationChange(isValid, newWarnings)
  }

  const handleRoomSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedId = e.target.value
    const room = rooms.find((r) => r.id === selectedId)
    setSelectedRoom(room || null)
    onRoomChange(selectedId, room?.name || '', room || null)
    // Reset override when room changes
    onOverrideChange(false)
  }

  const nights = calculateNights()
  const today = new Date().toISOString().split('T')[0]

  return (
    <div className="p-6 space-y-6">
      {/* Info Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
        <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm text-blue-800">
            Select a room and your desired dates. The booking will follow the room's configured rules
            (minimum/maximum nights). You can override these rules if needed.
          </p>
        </div>
      </div>

      {/* Room Selection */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Select Room</h3>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Room *</label>
          {isLoadingRooms ? (
            <div className="text-gray-500 text-sm">Loading rooms...</div>
          ) : (
            <select
              value={roomId}
              onChange={handleRoomSelect}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
            >
              <option value="">Select a room...</option>
              {rooms.map((room) => (
                <option key={room.id} value={room.id}>
                  {room.name} - {new Intl.NumberFormat('en-ZA', {
                    style: 'currency',
                    currency: room.currency,
                  }).format(room.base_price_per_night)}/night
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Room Rules Display */}
        {selectedRoom && (
          <div className="mt-4 bg-gray-50 rounded-lg p-4 border border-gray-200">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Room Rules</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500">Minimum Stay:</span>{' '}
                <span className="font-medium text-gray-900">
                  {selectedRoom.min_stay_nights} night{selectedRoom.min_stay_nights > 1 ? 's' : ''}
                </span>
              </div>
              <div>
                <span className="text-gray-500">Maximum Stay:</span>{' '}
                <span className="font-medium text-gray-900">
                  {selectedRoom.max_stay_nights
                    ? `${selectedRoom.max_stay_nights} night${selectedRoom.max_stay_nights > 1 ? 's' : ''}`
                    : 'No limit'}
                </span>
              </div>
              <div>
                <span className="text-gray-500">Max Guests:</span>{' '}
                <span className="font-medium text-gray-900">{selectedRoom.max_guests}</span>
              </div>
              <div>
                <span className="text-gray-500">Base Price:</span>{' '}
                <span className="font-medium text-gray-900">
                  {new Intl.NumberFormat('en-ZA', {
                    style: 'currency',
                    currency: selectedRoom.currency,
                  }).format(selectedRoom.base_price_per_night)}/night
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Date Selection */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Select Dates</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Check-in Date *</label>
            <input
              type="date"
              value={checkIn}
              onChange={(e) => onCheckInChange(e.target.value)}
              min={today}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Check-out Date *</label>
            <input
              type="date"
              value={checkOut}
              onChange={(e) => onCheckOutChange(e.target.value)}
              min={checkIn || today}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Total Nights</label>
            <div className="flex items-center gap-2 px-3 py-2 bg-gray-100 rounded-md">
              <Calendar className="w-4 h-4 text-gray-500" />
              <span className="font-medium text-gray-900">
                {nights > 0 ? `${nights} night${nights > 1 ? 's' : ''}` : '-'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Validation Warnings */}
      {warnings.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="text-sm font-medium text-amber-800 mb-2">Booking Rule Violations</h4>
              <ul className="text-sm text-amber-700 space-y-1">
                {warnings.map((warning, index) => (
                  <li key={index}>{warning.message}</li>
                ))}
              </ul>

              <div className="mt-4 pt-3 border-t border-amber-200">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={overrideRules}
                    onChange={(e) => onOverrideChange(e.target.checked)}
                    className="w-4 h-4 rounded border-amber-400 text-amber-600 focus:ring-amber-500"
                  />
                  <span className="text-sm font-medium text-amber-800">
                    Override default room settings and proceed anyway
                  </span>
                </label>
                <p className="text-xs text-amber-600 mt-1 ml-6">
                  Check this box to bypass the room rules for this booking.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Check, Save } from 'lucide-react'
import Button from '../components/Button'
import RoomDetailsStep from '../components/room-wizard/RoomDetailsStep'
import PricingStep from '../components/room-wizard/PricingStep'
import AddonsStep from '../components/room-wizard/AddonsStep'
import { roomsApi, RoomImages, SeasonalRate } from '../services/api'
import { useNotification } from '../contexts/NotificationContext'

const STEPS = [
  { id: 1, name: 'Room Details', description: 'Basic information and configuration' },
  { id: 2, name: 'Pricing', description: 'Base price and seasonal rates' },
  { id: 3, name: 'Add-ons', description: 'Additional services (coming soon)' },
]

// Generate a unique room code: RM-XXXXXX (6 alphanumeric chars)
const generateRoomCode = (): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let code = 'RM-'
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

const DEFAULT_IMAGES: RoomImages = {
  featured: null,
  gallery: [],
}

export interface RoomFormData {
  name: string
  description: string
  room_code: string
  bed_type: string
  bed_count: number
  room_size_sqm?: number
  max_guests: number
  amenities: string[]
  images: RoomImages
  base_price_per_night: number
  currency: string
  min_stay_nights: number
  max_stay_nights?: number
  inventory_mode: 'single_unit' | 'room_type'
  total_units: number
  is_active: boolean
}

export default function RoomWizard() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const isEditing = Boolean(id)
  const { showSuccess, showError } = useNotification()

  const [currentStep, setCurrentStep] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [roomId, setRoomId] = useState<string | null>(id || null)
  const [seasonalRates, setSeasonalRates] = useState<SeasonalRate[]>([])

  const [formData, setFormData] = useState<RoomFormData>({
    name: '',
    description: '',
    room_code: generateRoomCode(),
    bed_type: 'Double',
    bed_count: 1,
    room_size_sqm: undefined,
    max_guests: 2,
    amenities: [],
    images: DEFAULT_IMAGES,
    base_price_per_night: 0,
    currency: 'ZAR',
    min_stay_nights: 1,
    max_stay_nights: undefined,
    inventory_mode: 'single_unit',
    total_units: 1,
    is_active: true,
  })

  // Load room data if editing
  useEffect(() => {
    if (id) {
      loadRoom(id)
    }
  }, [id])

  const loadRoom = async (roomId: string) => {
    try {
      setIsLoading(true)
      const room = await roomsApi.getById(roomId)
      setFormData({
        name: room.name,
        description: room.description || '',
        room_code: room.room_code || '',
        bed_type: room.bed_type,
        bed_count: room.bed_count,
        room_size_sqm: room.room_size_sqm,
        max_guests: room.max_guests,
        amenities: room.amenities,
        images: room.images || DEFAULT_IMAGES,
        base_price_per_night: room.base_price_per_night,
        currency: room.currency,
        min_stay_nights: room.min_stay_nights || 1,
        max_stay_nights: room.max_stay_nights,
        inventory_mode: room.inventory_mode,
        total_units: room.total_units,
        is_active: room.is_active,
      })

      // Load seasonal rates
      const rates = await roomsApi.getRates(roomId)
      setSeasonalRates(rates)
    } catch (error) {
      console.error('Failed to load room:', error)
      showError('Failed to Load', 'Could not load room data.')
      navigate('/dashboard/rooms')
    } finally {
      setIsLoading(false)
    }
  }

  const updateFormData = (updates: Partial<RoomFormData>) => {
    setFormData((prev) => ({ ...prev, ...updates }))
  }

  const handleNext = async () => {
    // Save room on step 1 completion (if new room)
    if (currentStep === 1 && !roomId) {
      try {
        setIsSaving(true)
        const newRoom = await roomsApi.create(formData)
        setRoomId(newRoom.id!)
        showSuccess('Room Created', 'Room details saved successfully.')
        setCurrentStep(2)
      } catch (error) {
        console.error('Failed to create room:', error)
        showError('Save Failed', 'Could not save room details.')
      } finally {
        setIsSaving(false)
      }
    } else if (currentStep === 1 && roomId) {
      // Update existing room
      try {
        setIsSaving(true)
        await roomsApi.update(roomId, formData)
        showSuccess('Room Updated', 'Room details saved successfully.')
        setCurrentStep(2)
      } catch (error) {
        console.error('Failed to update room:', error)
        showError('Save Failed', 'Could not save room details.')
      } finally {
        setIsSaving(false)
      }
    } else {
      setCurrentStep((prev) => Math.min(prev + 1, STEPS.length))
    }
  }

  const handleBack = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1))
  }

  const handleFinish = () => {
    showSuccess('Room Complete', `${formData.name} has been saved with all settings.`)
    navigate('/dashboard/rooms')
  }

  const handleCancel = () => {
    navigate('/dashboard/rooms')
  }

  const canProceed = () => {
    if (currentStep === 1) {
      return formData.name && formData.bed_type && formData.base_price_per_night >= 0
    }
    return true
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-gray-500">Loading room...</div>
      </div>
    )
  }

  return (
    <div className="bg-gray-50 min-h-full">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={handleCancel}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft size={20} />
              </button>
              <div>
                <h1 className="text-xl font-bold text-gray-900">
                  {isEditing ? 'Edit Room' : 'Create New Room'}
                </h1>
                <p className="text-sm text-gray-500">
                  {formData.room_code && `Room Code: ${formData.room_code}`}
                </p>
              </div>
            </div>
            <Button variant="outline" onClick={handleCancel}>
              Cancel
            </Button>
          </div>
        </div>
      </div>

      {/* Steps indicator */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-6 py-4">
          <nav aria-label="Progress">
            <ol className="flex items-center">
              {STEPS.map((step, index) => (
                <li
                  key={step.id}
                  className={`relative ${index !== STEPS.length - 1 ? 'flex-1' : ''}`}
                >
                  <div className="flex items-center">
                    <div
                      className={`flex items-center justify-center w-10 h-10 rounded-full border-2 transition-colors ${
                        currentStep > step.id
                          ? 'bg-black border-black text-white'
                          : currentStep === step.id
                          ? 'border-black text-black'
                          : 'border-gray-300 text-gray-400'
                      }`}
                    >
                      {currentStep > step.id ? (
                        <Check size={18} />
                      ) : (
                        <span className="text-sm font-medium">{step.id}</span>
                      )}
                    </div>
                    <div className="ml-3">
                      <p
                        className={`text-sm font-medium ${
                          currentStep >= step.id ? 'text-gray-900' : 'text-gray-400'
                        }`}
                      >
                        {step.name}
                      </p>
                      <p className="text-xs text-gray-500 hidden sm:block">{step.description}</p>
                    </div>
                    {index !== STEPS.length - 1 && (
                      <div
                        className={`hidden sm:block flex-1 h-0.5 mx-6 ${
                          currentStep > step.id ? 'bg-black' : 'bg-gray-200'
                        }`}
                      />
                    )}
                  </div>
                </li>
              ))}
            </ol>
          </nav>
        </div>
      </div>

      {/* Step Content */}
      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
          {currentStep === 1 && (
            <RoomDetailsStep formData={formData} onChange={updateFormData} />
          )}
          {currentStep === 2 && roomId && (
            <PricingStep
              roomId={roomId}
              basePrice={formData.base_price_per_night}
              currency={formData.currency}
              minStayNights={formData.min_stay_nights}
              maxStayNights={formData.max_stay_nights}
              seasonalRates={seasonalRates}
              onRatesChange={setSeasonalRates}
              onBasePriceChange={(price) => updateFormData({ base_price_per_night: price })}
              onCurrencyChange={(currency) => updateFormData({ currency })}
              onMinStayChange={(min) => updateFormData({ min_stay_nights: min })}
              onMaxStayChange={(max) => updateFormData({ max_stay_nights: max })}
            />
          )}
          {currentStep === 3 && roomId && <AddonsStep roomId={roomId} />}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between mt-6">
          <div>
            {currentStep > 1 && (
              <Button variant="outline" onClick={handleBack}>
                <ArrowLeft size={16} className="mr-2" />
                Back
              </Button>
            )}
          </div>
          <div className="flex items-center gap-3">
            {currentStep < STEPS.length ? (
              <Button onClick={handleNext} disabled={!canProceed() || isSaving}>
                {isSaving ? 'Saving...' : 'Next'}
                {!isSaving && <ArrowRight size={16} className="ml-2" />}
              </Button>
            ) : (
              <Button onClick={handleFinish}>
                <Save size={16} className="mr-2" />
                Finish
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

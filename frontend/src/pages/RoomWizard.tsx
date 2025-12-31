import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Check, Save } from 'lucide-react'
import Button from '../components/Button'
import { scrollToTop } from '../components/ScrollToTop'
import RoomDetailsStep from '../components/room-wizard/RoomDetailsStep'
import PricingStep from '../components/room-wizard/PricingStep'
import AddonsStep from '../components/room-wizard/AddonsStep'
import { roomsApi, RoomImages, SeasonalRate, BedConfiguration, PricingMode } from '../services/api'
import { useNotification } from '../contexts/NotificationContext'
import { useAuth } from '../contexts/AuthContext'

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
  // Bed configurations
  beds: BedConfiguration[]
  bed_type?: string // Legacy - kept for backwards compatibility
  bed_count?: number // Legacy
  room_size_sqm?: number
  max_guests: number
  max_adults?: number
  max_children?: number
  amenities: string[]
  extra_options: string[] // Extra room features like "Balcony", "Sea View", "Kitchenette"
  images: RoomImages
  // Pricing configuration
  pricing_mode: PricingMode // per_unit, per_person, per_person_sharing
  base_price_per_night: number
  additional_person_rate?: number // For per_person_sharing mode
  child_price_per_night?: number
  child_free_until_age?: number // Children younger than this age stay free (e.g., 2 = 0-1 years free)
  child_age_limit?: number // Max age considered a child (e.g., 12 = 0-11 are children, 12+ are adults)
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
  const { tenant } = useAuth()

  const [currentStep, setCurrentStep] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [roomId, setRoomId] = useState<string | null>(id || null)
  const [seasonalRates, setSeasonalRates] = useState<SeasonalRate[]>([])

  const [formData, setFormData] = useState<RoomFormData>({
    name: '',
    description: '',
    room_code: generateRoomCode(),
    beds: [{ id: crypto.randomUUID(), bed_type: 'Double', quantity: 1, sleeps: 2 }],
    bed_type: 'Double', // Legacy
    bed_count: 1, // Legacy
    room_size_sqm: undefined,
    max_guests: 2,
    max_adults: undefined,
    max_children: undefined,
    amenities: [],
    extra_options: [],
    images: DEFAULT_IMAGES,
    pricing_mode: 'per_unit', // Default: flat rate per room
    base_price_per_night: 0,
    additional_person_rate: undefined,
    child_price_per_night: undefined,
    child_free_until_age: undefined,
    child_age_limit: 12, // Default: children are 0-11 years
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

      // Parse beds - handle both new format and legacy
      let beds = room.beds
      if (!beds || beds.length === 0) {
        // Convert legacy bed_type/bed_count to new format
        beds = [{
          id: crypto.randomUUID(),
          bed_type: room.bed_type || 'Double',
          quantity: room.bed_count || 1,
          sleeps: 2, // Default sleeps
        }]
      }

      setFormData({
        name: room.name,
        description: room.description || '',
        room_code: room.room_code || '',
        beds: beds,
        bed_type: room.bed_type, // Legacy
        bed_count: room.bed_count, // Legacy
        room_size_sqm: room.room_size_sqm,
        max_guests: room.max_guests,
        max_adults: room.max_adults,
        max_children: room.max_children,
        amenities: room.amenities,
        extra_options: room.extra_options || [],
        images: room.images || DEFAULT_IMAGES,
        pricing_mode: room.pricing_mode || 'per_unit',
        base_price_per_night: room.base_price_per_night,
        additional_person_rate: room.additional_person_rate,
        child_price_per_night: room.child_price_per_night,
        child_free_until_age: room.child_free_until_age,
        child_age_limit: room.child_age_limit ?? 12,
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
        scrollToTop()
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
        scrollToTop()
      } catch (error) {
        console.error('Failed to update room:', error)
        showError('Save Failed', 'Could not save room details.')
      } finally {
        setIsSaving(false)
      }
    } else {
      setCurrentStep((prev) => Math.min(prev + 1, STEPS.length))
      scrollToTop()
    }
  }

  const handleBack = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1))
    scrollToTop()
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
      return formData.name && formData.beds.length > 0 && formData.base_price_per_night >= 0
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
      <div className="bg-gradient-to-r from-accent-600 to-accent-500 shadow-lg">
        <div className="max-w-5xl mx-auto px-6 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={handleCancel}
                className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
              >
                <ArrowLeft size={20} />
              </button>
              <div>
                <h1 className="text-xl font-bold text-white">
                  {isEditing ? 'Edit Room' : 'Create New Room'}
                </h1>
                <p className="text-sm text-white/70">
                  {formData.room_code && `Room Code: ${formData.room_code}`}
                </p>
              </div>
            </div>
            <button
              onClick={handleCancel}
              className="px-4 py-2 text-sm font-medium text-white border border-white/30 rounded-lg hover:bg-white/10 transition-colors"
            >
              Cancel
            </button>
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
          {currentStep === 1 && tenant && (
            <RoomDetailsStep formData={formData} onChange={updateFormData} tenantId={tenant.id} />
          )}
          {currentStep === 2 && roomId && (
            <PricingStep
              roomId={roomId}
              pricingMode={formData.pricing_mode}
              basePrice={formData.base_price_per_night}
              additionalPersonRate={formData.additional_person_rate}
              childPricePerNight={formData.child_price_per_night}
              childFreeUntilAge={formData.child_free_until_age}
              childAgeLimit={formData.child_age_limit}
              currency={formData.currency}
              minStayNights={formData.min_stay_nights}
              maxStayNights={formData.max_stay_nights}
              seasonalRates={seasonalRates}
              onRatesChange={setSeasonalRates}
              onPricingModeChange={(mode) => updateFormData({ pricing_mode: mode })}
              onBasePriceChange={(price) => updateFormData({ base_price_per_night: price })}
              onAdditionalPersonRateChange={(rate) => updateFormData({ additional_person_rate: rate })}
              onChildPriceChange={(price) => updateFormData({ child_price_per_night: price })}
              onChildFreeUntilAgeChange={(age) => updateFormData({ child_free_until_age: age })}
              onChildAgeLimitChange={(age) => updateFormData({ child_age_limit: age })}
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

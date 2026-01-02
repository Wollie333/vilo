import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Home, Bed, Wifi, Image, Settings, DollarSign, Users, Clock, Layers, Plus, Trash2, Edit2, Calendar, Building2, UserPlus, Tag } from 'lucide-react'
import { FormLayout, FormSidebar, FormPreviewPanel, SectionHeader } from '../components/form-layout'
import type { SectionGroup } from '../components/form-layout/types'
import { RoomPreviewCard } from '../components/room-form'
import RoomCouponsSection from '../components/room-wizard/RoomCouponsSection'
import { useRoomCompleteness, RoomFormData } from '../hooks/useRoomCompleteness'
import { useAutoSave } from '../hooks/useAutoSave'
import AmenitiesInput from '../components/AmenitiesInput'
import RoomImageUpload from '../components/RoomImageUpload'
import Button from '../components/Button'
import DatePickerModal from '../components/DatePickerModal'
import { roomsApi, RoomImages, SeasonalRate, BedConfiguration, PricingMode } from '../services/api'
import { useNotification } from '../contexts/NotificationContext'
import { useAuth } from '../contexts/AuthContext'

// Section groups for the sidebar
const sectionGroups: SectionGroup[] = [
  {
    id: 'basics',
    name: 'Basic Info',
    items: [
      { id: 'details', name: 'Room Details', icon: Home },
      { id: 'beds', name: 'Bed Configuration', icon: Bed },
      { id: 'amenities', name: 'Amenities', icon: Wifi },
    ]
  },
  {
    id: 'media',
    name: 'Media',
    items: [
      { id: 'images', name: 'Photos', icon: Image },
    ]
  },
  {
    id: 'pricing',
    name: 'Pricing',
    items: [
      { id: 'pricing-mode', name: 'Pricing Model', icon: Settings },
      { id: 'base-price', name: 'Base Rates', icon: DollarSign },
      { id: 'children-pricing', name: 'Children Pricing', icon: Users },
    ]
  },
  {
    id: 'rules',
    name: 'Booking Rules',
    items: [
      { id: 'stay-limits', name: 'Stay Duration', icon: Clock },
      { id: 'inventory', name: 'Inventory', icon: Layers },
    ]
  },
  {
    id: 'marketing',
    name: 'Marketing',
    items: [
      { id: 'promotions', name: 'Promotions', icon: Tag },
    ]
  }
]

const BED_TYPES = ['King', 'Queen', 'Double', 'Twin', 'Single', 'Bunk', 'Sofa Bed']
const BED_SLEEPS: Record<string, number> = {
  'King': 2, 'Queen': 2, 'Double': 2, 'Twin': 1, 'Single': 1, 'Bunk': 2, 'Sofa Bed': 2,
}

const PRICING_MODES: { value: PricingMode; label: string; description: string; icon: React.ReactNode }[] = [
  { value: 'per_unit', label: 'Per Unit', description: 'Flat rate for the entire room', icon: <Building2 size={20} /> },
  { value: 'per_person', label: 'Per Person', description: 'Price multiplied by guests', icon: <Users size={20} /> },
  { value: 'per_person_sharing', label: 'Per Person Sharing', description: 'Base + per extra guest', icon: <UserPlus size={20} /> },
]

const CURRENCIES = [
  { code: 'ZAR', name: 'South African Rand' },
  { code: 'USD', name: 'US Dollar' },
  { code: 'EUR', name: 'Euro' },
  { code: 'GBP', name: 'British Pound' },
  { code: 'NGN', name: 'Nigerian Naira' },
]

const DEFAULT_IMAGES: RoomImages = { featured: null, gallery: [] }

const generateRoomCode = (): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let code = 'RM-'
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

export default function RoomWizard() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const isEditing = Boolean(id)
  const { showSuccess, showError } = useNotification()
  const { tenant } = useAuth()

  const [activeSection, setActiveSection] = useState('details')
  const [isLoading, setIsLoading] = useState(false)
  const [roomId, setRoomId] = useState<string | null>(id || null)
  const [seasonalRates, setSeasonalRates] = useState<SeasonalRate[]>([])
  const [pendingRates, setPendingRates] = useState<Omit<SeasonalRate, 'id' | 'room_id'>[]>([]) // Rates not yet saved to API
  const [showRateForm, setShowRateForm] = useState(false)
  const [editingRate, setEditingRate] = useState<SeasonalRate | null>(null)
  const [editingPendingIndex, setEditingPendingIndex] = useState<number | null>(null) // For editing pending rates
  const [rateFormSaving, setRateFormSaving] = useState(false)

  // Section refs for scrolling
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({})

  const [formData, setFormData] = useState<RoomFormData>({
    name: '',
    description: '',
    room_code: generateRoomCode(),
    beds: [{ id: crypto.randomUUID(), bed_type: 'Double', quantity: 1, sleeps: 2 }],
    room_size_sqm: undefined,
    max_guests: 2,
    max_adults: undefined,
    max_children: undefined,
    amenities: [],
    extra_options: [],
    images: DEFAULT_IMAGES,
    pricing_mode: 'per_unit',
    base_price_per_night: 0,
    additional_person_rate: undefined,
    child_price_per_night: undefined,
    child_free_until_age: undefined,
    child_age_limit: 12,
    currency: 'ZAR',
    min_stay_nights: 1,
    max_stay_nights: undefined,
    inventory_mode: 'single_unit',
    total_units: 1,
    is_active: true,
  })

  const [rateForm, setRateForm] = useState({
    name: '',
    start_date: '',
    end_date: '',
    price_per_night: 0,
    priority: 0,
  })

  // Completeness tracking
  const { totalPercentage, incompleteItems, getSectionStatus } = useRoomCompleteness(formData)

  // Auto-save handler
  const handleSave = useCallback(async () => {
    if (!tenant) return

    try {
      let savedRoomId = roomId

      if (roomId) {
        await roomsApi.update(roomId, formData)
        showSuccess('Room Updated', 'Your changes have been saved.')
      } else {
        const newRoom = await roomsApi.create(formData)
        savedRoomId = newRoom.id!
        setRoomId(savedRoomId)
        // Update URL without full navigation
        window.history.replaceState({}, '', `/dashboard/rooms/${savedRoomId}/edit`)
      }

      // Save any pending seasonal rates
      if (pendingRates.length > 0 && savedRoomId) {
        const createdRates: SeasonalRate[] = []
        for (const rate of pendingRates) {
          try {
            const newRate = await roomsApi.createRate(savedRoomId, rate)
            createdRates.push(newRate)
          } catch (error) {
            console.error('Failed to create seasonal rate:', error)
          }
        }
        if (createdRates.length > 0) {
          setSeasonalRates(prev => [...prev, ...createdRates])
          setPendingRates([])
        }
      }

      showSuccess(roomId ? 'Room Updated' : 'Room Created', roomId ? 'Your changes have been saved.' : 'Room has been created successfully.')
    } catch (error) {
      console.error('Failed to save room:', error)
      showError('Save Failed', 'Could not save room data.')
      throw error
    }
  }, [roomId, formData, pendingRates, tenant, showSuccess, showError])

  const { isSaving, lastSaved, hasUnsavedChanges, save } = useAutoSave(handleSave, [formData], {
    enabled: false // Manual save only
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

      let beds = room.beds
      if (!beds || beds.length === 0) {
        beds = [{
          id: crypto.randomUUID(),
          bed_type: room.bed_type || 'Double',
          quantity: room.bed_count || 1,
          sleeps: 2,
        }]
      }

      setFormData({
        name: room.name,
        description: room.description || '',
        room_code: room.room_code || '',
        beds: beds,
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

  // Section navigation
  const handleSectionChange = (sectionId: string) => {
    setActiveSection(sectionId)
    const ref = sectionRefs.current[sectionId]
    if (ref) {
      ref.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  const handleNavigateToSection = (sectionId: string) => {
    handleSectionChange(sectionId)
  }

  // Bed handlers
  const handleAddBed = () => {
    const newBed: BedConfiguration = {
      id: crypto.randomUUID(),
      bed_type: 'Double',
      quantity: 1,
      sleeps: 2,
    }
    updateFormData({ beds: [...formData.beds, newBed] })
  }

  const handleRemoveBed = (id: string) => {
    if (formData.beds.length <= 1) return
    updateFormData({ beds: formData.beds.filter(bed => bed.id !== id) })
  }

  const handleBedChange = (id: string, field: keyof BedConfiguration, value: string | number) => {
    updateFormData({
      beds: formData.beds.map(bed => {
        if (bed.id !== id) return bed
        const updates: Partial<BedConfiguration> = { [field]: value }
        if (field === 'bed_type' && typeof value === 'string') {
          updates.sleeps = BED_SLEEPS[value] || 2
        }
        return { ...bed, ...updates }
      })
    })
  }

  // Seasonal rate handlers
  const handleAddRate = () => {
    setEditingRate(null)
    setEditingPendingIndex(null)
    setRateForm({
      name: '',
      start_date: '',
      end_date: '',
      price_per_night: formData.base_price_per_night,
      priority: seasonalRates.length + pendingRates.length,
    })
    setShowRateForm(true)
  }

  const handleEditRate = (rate: SeasonalRate) => {
    setEditingRate(rate)
    setEditingPendingIndex(null)
    setRateForm({
      name: rate.name,
      start_date: rate.start_date,
      end_date: rate.end_date,
      price_per_night: rate.price_per_night,
      priority: rate.priority,
    })
    setShowRateForm(true)
  }

  const handleEditPendingRate = (index: number) => {
    const rate = pendingRates[index]
    setEditingRate(null)
    setEditingPendingIndex(index)
    setRateForm({
      name: rate.name,
      start_date: rate.start_date,
      end_date: rate.end_date,
      price_per_night: rate.price_per_night,
      priority: rate.priority,
    })
    setShowRateForm(true)
  }

  const handleDeleteRate = async (rate: SeasonalRate) => {
    if (!rate.id || !roomId) return
    try {
      await roomsApi.deleteRate(roomId, rate.id)
      setSeasonalRates(seasonalRates.filter((r) => r.id !== rate.id))
      showSuccess('Rate Deleted', `"${rate.name}" has been removed.`)
    } catch (error) {
      showError('Delete Failed', 'Could not delete the seasonal rate.')
    }
  }

  const handleDeletePendingRate = (index: number) => {
    const rate = pendingRates[index]
    setPendingRates(pendingRates.filter((_, i) => i !== index))
    showSuccess('Rate Removed', `"${rate.name}" has been removed.`)
  }

  const handleSaveRate = async () => {
    try {
      setRateFormSaving(true)

      // If we have a roomId, save to API
      if (roomId) {
        if (editingRate?.id) {
          const updated = await roomsApi.updateRate(roomId, editingRate.id, rateForm)
          setSeasonalRates(seasonalRates.map((r) => (r.id === editingRate.id ? updated : r)))
          showSuccess('Rate Updated', `"${rateForm.name}" has been updated.`)
        } else {
          const newRate = await roomsApi.createRate(roomId, rateForm)
          setSeasonalRates([...seasonalRates, newRate])
          showSuccess('Rate Created', `"${rateForm.name}" has been added.`)
        }
      } else {
        // No roomId yet - save locally as pending
        if (editingPendingIndex !== null) {
          // Editing existing pending rate
          setPendingRates(pendingRates.map((r, i) => i === editingPendingIndex ? rateForm : r))
          showSuccess('Rate Updated', `"${rateForm.name}" has been updated.`)
        } else {
          // Adding new pending rate
          setPendingRates([...pendingRates, rateForm])
          showSuccess('Rate Added', `"${rateForm.name}" will be saved with the room.`)
        }
      }

      setShowRateForm(false)
      setEditingRate(null)
      setEditingPendingIndex(null)
    } catch (error) {
      showError('Save Failed', 'Could not save the seasonal rate.')
    } finally {
      setRateFormSaving(false)
    }
  }

  // Format helpers
  const totalBedSleeps = formData.beds.reduce((sum, bed) => sum + (bed.quantity * bed.sleeps), 0)

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-ZA', { style: 'currency', currency: formData.currency }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  const getBasePriceLabel = () => {
    switch (formData.pricing_mode) {
      case 'per_person': return 'Price per Person per Night *'
      case 'per_person_sharing': return 'Base Price (First Person) per Night *'
      default: return 'Price per Unit per Night *'
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-gray-500">Loading room...</div>
      </div>
    )
  }

  // Preview card content
  const previewContent = (
    <RoomPreviewCard
      name={formData.name}
      roomCode={formData.room_code}
      images={formData.images}
      beds={formData.beds}
      maxGuests={formData.max_guests}
      basePrice={formData.base_price_per_night}
      currency={formData.currency}
      amenities={formData.amenities}
      isActive={formData.is_active}
    />
  )

  // Sidebar component
  const sidebar = (
    <FormSidebar
      sectionGroups={sectionGroups}
      activeSection={activeSection}
      onSectionChange={handleSectionChange}
      getSectionStatus={getSectionStatus}
      completenessPercentage={totalPercentage}
      progressLabel="Complete your room"
    />
  )

  // Preview panel component
  const preview = (
    <FormPreviewPanel
      previewTitle="Room Preview"
      previewContent={previewContent}
      previewDescription="This is how your room appears to guests"
      boostTitle="Complete your room"
      incompleteItems={incompleteItems}
      onNavigateToSection={handleNavigateToSection}
      allCompleteTitle="Looking great!"
      allCompleteMessage="Your room is complete and ready for bookings."
    />
  )

  return (
    <FormLayout
      title={isEditing ? 'Edit Room' : 'Create New Room'}
      subtitle={formData.room_code ? `Room Code: ${formData.room_code}` : undefined}
      sidebar={sidebar}
      preview={preview}
      activeSection={activeSection}
      onSectionChange={handleSectionChange}
      sectionGroups={sectionGroups}
      getSectionStatus={getSectionStatus}
      completenessPercentage={totalPercentage}
      isSaving={isSaving}
      lastSaved={lastSaved}
      hasUnsavedChanges={hasUnsavedChanges}
      onSave={save}
      onBack={() => navigate('/dashboard/rooms')}
      mobilePreviewContent={previewContent}
      saveButtonLabel={roomId ? 'Save' : 'Create'}
      headerExtra={
        <label className="hidden sm:flex items-center gap-2 cursor-pointer">
          <span className="text-sm text-gray-600">Active</span>
          <button
            onClick={() => updateFormData({ is_active: !formData.is_active })}
            className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 ${
              formData.is_active ? 'bg-emerald-500' : 'bg-gray-200'
            }`}
          >
            <span
              className={`inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                formData.is_active ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </label>
      }
    >
      <div className="space-y-12">
        {/* Room Details Section */}
        <div ref={(el) => (sectionRefs.current['details'] = el)} id="details">
          <SectionHeader icon={Home} title="Room Details" description="Basic information about the room" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Room Name *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => updateFormData({ name: e.target.value })}
                placeholder="e.g., Deluxe Double Room"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => updateFormData({ description: e.target.value })}
                rows={3}
                placeholder="Describe the room, its features, and what makes it special..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Room Size (m²)</label>
              <input
                type="number"
                value={formData.room_size_sqm ?? ''}
                onChange={(e) => updateFormData({ room_size_sqm: e.target.value ? parseFloat(e.target.value) : undefined })}
                min="0"
                placeholder="e.g., 43"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Max Guests *</label>
              <input
                type="number"
                value={formData.max_guests}
                onChange={(e) => updateFormData({ max_guests: parseInt(e.target.value) || 1 })}
                min="1"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
              />
            </div>
          </div>
        </div>

        {/* Bed Configuration Section */}
        <div ref={(el) => (sectionRefs.current['beds'] = el)} id="beds">
          <div className="flex items-center justify-between mb-6">
            <SectionHeader icon={Bed} title="Bed Configuration" description={`Total capacity: ${totalBedSleeps} sleeps`} />
            <button
              type="button"
              onClick={handleAddBed}
              className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Plus size={16} />
              Add Bed
            </button>
          </div>

          <div className="space-y-3">
            {formData.beds.map((bed) => (
              <div key={bed.id} className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <Bed size={20} className="text-gray-400 flex-shrink-0" />
                <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Bed Type</label>
                    <select
                      value={bed.bed_type}
                      onChange={(e) => handleBedChange(bed.id, 'bed_type', e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-400"
                    >
                      {BED_TYPES.map((type) => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Quantity</label>
                    <input
                      type="number"
                      value={bed.quantity}
                      onChange={(e) => handleBedChange(bed.id, 'quantity', parseInt(e.target.value) || 1)}
                      min="1"
                      max="10"
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-400"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Sleeps (per bed)</label>
                    <input
                      type="number"
                      value={bed.sleeps}
                      onChange={(e) => handleBedChange(bed.id, 'sleeps', parseInt(e.target.value) || 1)}
                      min="1"
                      max="4"
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-400"
                    />
                  </div>
                </div>
                <div className="flex-shrink-0 text-right">
                  <p className="text-sm font-medium text-gray-900">{bed.quantity * bed.sleeps} pax</p>
                  {formData.beds.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveBed(bed.id)}
                      className="mt-1 p-1 text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Amenities Section */}
        <div ref={(el) => (sectionRefs.current['amenities'] = el)} id="amenities">
          <SectionHeader icon={Wifi} title="Amenities" description="What's included in the room" />
          <AmenitiesInput
            value={formData.amenities}
            onChange={(amenities) => updateFormData({ amenities })}
          />
        </div>

        {/* Images Section */}
        <div ref={(el) => (sectionRefs.current['images'] = el)} id="images">
          <SectionHeader icon={Image} title="Photos" description="Upload images of the room" />
          {tenant && (
            <RoomImageUpload
              value={formData.images}
              onChange={(images) => updateFormData({ images })}
              tenantId={tenant.id}
            />
          )}
        </div>

        {/* Pricing Mode Section */}
        <div ref={(el) => (sectionRefs.current['pricing-mode'] = el)} id="pricing-mode">
          <SectionHeader icon={Settings} title="Pricing Model" description="Choose how you want to charge for this room" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {PRICING_MODES.map((mode) => (
              <button
                key={mode.value}
                type="button"
                onClick={() => updateFormData({ pricing_mode: mode.value })}
                className={`p-4 rounded-lg border-2 text-left transition-all ${
                  formData.pricing_mode === mode.value
                    ? 'border-black bg-gray-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className={formData.pricing_mode === mode.value ? 'text-black' : 'text-gray-400'}>
                    {mode.icon}
                  </div>
                  <span className={`font-medium ${formData.pricing_mode === mode.value ? 'text-black' : 'text-gray-700'}`}>
                    {mode.label}
                  </span>
                </div>
                <p className="text-sm text-gray-500">{mode.description}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Base Price Section */}
        <div ref={(el) => (sectionRefs.current['base-price'] = el)} id="base-price">
          <SectionHeader icon={DollarSign} title="Base Rates" description="Set the default nightly rate" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">{getBasePriceLabel()}</label>
              <input
                type="number"
                value={formData.base_price_per_night}
                onChange={(e) => updateFormData({ base_price_per_night: parseFloat(e.target.value) || 0 })}
                min="0"
                step="0.01"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-400"
              />
            </div>

            {formData.pricing_mode === 'per_person_sharing' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Additional Person Rate *</label>
                <input
                  type="number"
                  value={formData.additional_person_rate ?? ''}
                  onChange={(e) => updateFormData({ additional_person_rate: e.target.value ? parseFloat(e.target.value) : undefined })}
                  min="0"
                  placeholder="Rate per extra person"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-400"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Currency</label>
              <select
                value={formData.currency}
                onChange={(e) => updateFormData({ currency: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-400"
              >
                {CURRENCIES.map((c) => (
                  <option key={c.code} value={c.code}>{c.code} - {c.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Pricing Example */}
          <div className="mt-4 p-3 bg-blue-50 border border-blue-100 rounded-lg">
            <p className="text-sm font-medium text-blue-800 mb-1">Pricing Example (2 adults):</p>
            <p className="text-sm text-blue-700">
              {formData.pricing_mode === 'per_unit' && (
                <>Total per night: <span className="font-medium">{formatCurrency(formData.base_price_per_night)}</span></>
              )}
              {formData.pricing_mode === 'per_person' && (
                <>Total per night: {formatCurrency(formData.base_price_per_night)} x 2 = <span className="font-medium">{formatCurrency(formData.base_price_per_night * 2)}</span></>
              )}
              {formData.pricing_mode === 'per_person_sharing' && (
                <>Total per night: {formatCurrency(formData.base_price_per_night)} + {formatCurrency(formData.additional_person_rate || 0)} = <span className="font-medium">{formatCurrency(formData.base_price_per_night + (formData.additional_person_rate || 0))}</span></>
              )}
            </p>
          </div>

          {/* Seasonal Rates */}
          <div className="mt-8">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h4 className="text-base font-medium text-gray-900">Seasonal Rates</h4>
                <p className="text-sm text-gray-500">Special pricing for holidays or peak seasons</p>
              </div>
              <Button onClick={handleAddRate} variant="outline">
                <Plus size={16} className="mr-2" />
                Add Rate
              </Button>
            </div>

            {showRateForm && (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4">
                <h4 className="font-medium text-gray-900 mb-4">
                  {editingRate ? 'Edit Seasonal Rate' : 'New Seasonal Rate'}
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="lg:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Rate Name *</label>
                    <input
                      type="text"
                      value={rateForm.name}
                      onChange={(e) => setRateForm((prev) => ({ ...prev, name: e.target.value }))}
                      placeholder="e.g., Christmas Special"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-400"
                    />
                  </div>
                  <DatePickerModal
                    value={rateForm.start_date}
                    onChange={(date) => setRateForm((prev) => ({ ...prev, start_date: date }))}
                    label="Start Date *"
                    placeholder="Select start date"
                  />
                  <DatePickerModal
                    value={rateForm.end_date}
                    onChange={(date) => setRateForm((prev) => ({ ...prev, end_date: date }))}
                    label="End Date *"
                    placeholder="Select end date"
                    minDate={rateForm.start_date}
                  />
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Price/Night ({formData.currency}) *</label>
                    <input
                      type="number"
                      value={rateForm.price_per_night}
                      onChange={(e) => setRateForm((prev) => ({ ...prev, price_per_night: parseFloat(e.target.value) || 0 }))}
                      min="0"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-400"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Priority</label>
                    <input
                      type="number"
                      value={rateForm.priority}
                      onChange={(e) => setRateForm((prev) => ({ ...prev, priority: parseInt(e.target.value) || 0 }))}
                      min="0"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-400"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-3 mt-4">
                  <Button variant="outline" onClick={() => { setShowRateForm(false); setEditingRate(null) }} disabled={rateFormSaving}>
                    Cancel
                  </Button>
                  <Button onClick={handleSaveRate} disabled={rateFormSaving || !rateForm.name || !rateForm.start_date || !rateForm.end_date}>
                    {rateFormSaving ? 'Saving...' : editingRate ? 'Update' : 'Add'}
                  </Button>
                </div>
              </div>
            )}

            {seasonalRates.length === 0 && pendingRates.length === 0 ? (
              <div className="text-center py-8 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                <Calendar className="w-10 h-10 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-500">No seasonal rates configured</p>
              </div>
            ) : (
              <div style={{ borderColor: 'var(--border-color)' }} className="border rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }} className="border-b">
                    <tr>
                      <th style={{ color: 'var(--text-muted)' }} className="px-4 py-3 text-left text-xs font-medium uppercase">Name</th>
                      <th style={{ color: 'var(--text-muted)' }} className="px-4 py-3 text-left text-xs font-medium uppercase">Period</th>
                      <th style={{ color: 'var(--text-muted)' }} className="px-4 py-3 text-left text-xs font-medium uppercase">Price/Night</th>
                      <th style={{ color: 'var(--text-muted)' }} className="px-4 py-3 text-right text-xs font-medium uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody style={{ borderColor: 'var(--border-color)' }} className="divide-y">
                    {/* Saved rates */}
                    {seasonalRates.map((rate) => (
                      <tr key={rate.id} className="hover:opacity-90 transition-opacity">
                        <td style={{ color: 'var(--text-primary)' }} className="px-4 py-3 font-medium">{rate.name}</td>
                        <td style={{ color: 'var(--text-muted)' }} className="px-4 py-3 text-sm">
                          {formatDate(rate.start_date)} - {formatDate(rate.end_date)}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`font-medium ${rate.price_per_night > formData.base_price_per_night ? 'text-red-600' : rate.price_per_night < formData.base_price_per_night ? 'text-emerald-600' : ''}`} style={rate.price_per_night === formData.base_price_per_night ? { color: 'var(--text-primary)' } : undefined}>
                            {formatCurrency(rate.price_per_night)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button onClick={() => handleEditRate(rate)} style={{ color: 'var(--text-muted)' }} className="p-1 hover:opacity-70 mr-1"><Edit2 size={16} /></button>
                          <button onClick={() => handleDeleteRate(rate)} style={{ color: 'var(--text-muted)' }} className="p-1 hover:text-red-600"><Trash2 size={16} /></button>
                        </td>
                      </tr>
                    ))}
                    {/* Pending rates (not yet saved to API) */}
                    {pendingRates.map((rate, index) => (
                      <tr key={`pending-${index}`} className="hover:opacity-90 transition-opacity bg-amber-50/50">
                        <td style={{ color: 'var(--text-primary)' }} className="px-4 py-3 font-medium">
                          {rate.name}
                          <span className="ml-2 px-1.5 py-0.5 text-xs bg-amber-100 text-amber-700 rounded">Pending</span>
                        </td>
                        <td style={{ color: 'var(--text-muted)' }} className="px-4 py-3 text-sm">
                          {formatDate(rate.start_date)} - {formatDate(rate.end_date)}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`font-medium ${rate.price_per_night > formData.base_price_per_night ? 'text-red-600' : rate.price_per_night < formData.base_price_per_night ? 'text-emerald-600' : ''}`} style={rate.price_per_night === formData.base_price_per_night ? { color: 'var(--text-primary)' } : undefined}>
                            {formatCurrency(rate.price_per_night)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button onClick={() => handleEditPendingRate(index)} style={{ color: 'var(--text-muted)' }} className="p-1 hover:opacity-70 mr-1"><Edit2 size={16} /></button>
                          <button onClick={() => handleDeletePendingRate(index)} style={{ color: 'var(--text-muted)' }} className="p-1 hover:text-red-600"><Trash2 size={16} /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Children Pricing Section */}
        <div ref={(el) => (sectionRefs.current['children-pricing'] = el)} id="children-pricing">
          <SectionHeader icon={Users} title="Children Pricing" description="Set pricing rules for children" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Children Age Limit</label>
              <select
                value={formData.child_age_limit ?? 12}
                onChange={(e) => updateFormData({ child_age_limit: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-400"
              >
                {[6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18].map((age) => (
                  <option key={age} value={age}>Under {age} years</option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">Guests {formData.child_age_limit ?? 12}+ pay adult rate</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Free Until Age</label>
              <select
                value={formData.child_free_until_age ?? ''}
                onChange={(e) => updateFormData({ child_free_until_age: e.target.value ? parseInt(e.target.value) : undefined })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-400"
              >
                <option value="">No free children</option>
                {[2, 3, 4, 5, 6].map((age) => (
                  <option key={age} value={age}>Under {age} years free</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Child Price/Night ({formData.currency})</label>
              <input
                type="number"
                value={formData.child_price_per_night ?? ''}
                onChange={(e) => updateFormData({ child_price_per_night: e.target.value ? parseFloat(e.target.value) : undefined })}
                min="0"
                placeholder="Same as adult"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-400"
              />
            </div>
          </div>
        </div>

        {/* Stay Duration Section */}
        <div ref={(el) => (sectionRefs.current['stay-limits'] = el)} id="stay-limits">
          <SectionHeader icon={Clock} title="Stay Duration" description="Set minimum and maximum booking length" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Minimum Stay (nights) *</label>
              <input
                type="number"
                value={formData.min_stay_nights}
                onChange={(e) => updateFormData({ min_stay_nights: parseInt(e.target.value) || 1 })}
                min="1"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Maximum Stay (nights)</label>
              <input
                type="number"
                value={formData.max_stay_nights ?? ''}
                onChange={(e) => updateFormData({ max_stay_nights: e.target.value ? parseInt(e.target.value) : undefined })}
                min={formData.min_stay_nights}
                placeholder="No limit"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-400"
              />
            </div>
          </div>
        </div>

        {/* Inventory Section */}
        <div ref={(el) => (sectionRefs.current['inventory'] = el)} id="inventory">
          <SectionHeader icon={Layers} title="Inventory" description="Configure room availability type" />
          <div className="space-y-4">
            <p className="text-sm text-gray-500">
              This is a single, unique room (e.g., "Room 101").
            </p>
          </div>
        </div>

        {/* Promotions Section */}
        <div ref={(el) => (sectionRefs.current['promotions'] = el)} id="promotions">
          <SectionHeader icon={Tag} title="Promotions" description="Create promotional codes for this room" />
          <RoomCouponsSection roomId={roomId} />
        </div>
      </div>
    </FormLayout>
  )
}

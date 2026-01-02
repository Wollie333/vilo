import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Home, Bed, Wifi, Image, Settings, DollarSign, Users, Clock, Layers, Plus, Trash2, Edit2, Calendar, Building2, UserPlus, ArrowLeft, Loader2, Save } from 'lucide-react'
import { FormLayout, FormSidebar, FormPreviewPanel, SectionHeader } from '../../components/form-layout'
import type { SectionGroup } from '../../components/form-layout/types'
import { RoomPreviewCard } from '../../components/room-form'
import AmenitiesInput from '../../components/AmenitiesInput'
import RoomImageUpload from '../../components/RoomImageUpload'
import Button from '../../components/Button'
import DatePickerModal from '../../components/DatePickerModal'
import { adminTenants, AdminRoom, AdminRoomUpdateData, AdminSeasonalRate, AdminSeasonalRateCreateData, AdminBedConfiguration } from '../../services/adminApi'
import { useNotification } from '../../contexts/NotificationContext'
import type { RoomImages, RoomImage, BedConfiguration, PricingMode } from '../../services/api'
import type { SectionStatus, IncompleteItem } from '../../components/form-layout/types'

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

// Admin form data interface
interface AdminRoomFormData {
  name: string
  description: string
  room_code: string
  beds: BedConfiguration[]
  room_size_sqm?: number
  max_guests: number
  max_adults?: number
  max_children?: number
  amenities: string[]
  extra_options: string[]
  images: RoomImages
  pricing_mode: PricingMode
  base_price_per_night: number
  additional_person_rate?: number
  child_price_per_night?: number
  child_free_until_age?: number
  child_age_limit?: number
  currency: string
  min_stay_nights: number
  max_stay_nights?: number
  check_in_time: string
  check_out_time: string
  inventory_mode: 'single_unit' | 'room_type'
  total_units: number
  is_active: boolean
}

// Convert AdminRoom to form data
function adminRoomToFormData(room: AdminRoom): AdminRoomFormData {
  // Convert beds from admin format to form format (with null check)
  const beds: BedConfiguration[] = room.beds && room.beds.length > 0
    ? room.beds.map(bed => ({
        id: bed.id || crypto.randomUUID(),
        bed_type: bed.bed_type,
        quantity: bed.quantity,
        sleeps: bed.sleeps || BED_SLEEPS[bed.bed_type] || 2,
      }))
    : [{ id: crypto.randomUUID(), bed_type: 'Double', quantity: 1, sleeps: 2 }]

  // Images are already in the correct format (RoomImage objects from database)
  const images: RoomImages = {
    featured: room.images?.featured || null,
    gallery: room.images?.gallery || [],
  }

  return {
    name: room.name,
    description: room.description || '',
    room_code: room.roomCode || '',
    beds,
    room_size_sqm: room.roomSizeSqm ?? undefined,
    max_guests: room.maxGuests,
    max_adults: room.maxAdults ?? undefined,
    max_children: room.maxChildren ?? undefined,
    amenities: room.amenities,
    extra_options: room.extraOptions || [],
    images,
    pricing_mode: room.pricingMode,
    base_price_per_night: room.basePricePerNight,
    additional_person_rate: room.additionalPersonRate ?? undefined,
    child_price_per_night: room.childPricePerNight ?? undefined,
    child_free_until_age: room.childFreeUntilAge ?? undefined,
    child_age_limit: room.childAgeLimit ?? 12,
    currency: room.currency,
    min_stay_nights: room.minStayNights || 1,
    max_stay_nights: room.maxStayNights ?? undefined,
    check_in_time: room.checkInTime || '14:00',
    check_out_time: room.checkOutTime || '10:00',
    inventory_mode: room.inventoryMode,
    total_units: room.totalUnits,
    is_active: room.isActive,
  }
}

// Convert form data to admin update format
function formDataToAdminUpdate(formData: AdminRoomFormData): AdminRoomUpdateData {
  // Convert beds to admin format (matching database structure)
  const beds: AdminBedConfiguration[] = formData.beds.map(bed => ({
    id: bed.id,
    bed_type: bed.bed_type,
    quantity: bed.quantity,
    sleeps: bed.sleeps,
  }))

  return {
    name: formData.name,
    description: formData.description,
    room_code: formData.room_code,
    room_size_sqm: formData.room_size_sqm ?? null,
    beds,
    max_guests: formData.max_guests,
    max_adults: formData.max_adults ?? null,
    max_children: formData.max_children ?? null,
    amenities: formData.amenities,
    extra_options: formData.extra_options,
    featured_image: formData.images.featured?.url ?? null,
    gallery_images: formData.images.gallery.map(img => img.url),
    pricing_mode: formData.pricing_mode,
    base_price_per_night: formData.base_price_per_night,
    additional_person_rate: formData.additional_person_rate ?? null,
    currency: formData.currency,
    child_price_per_night: formData.child_price_per_night ?? null,
    child_free_until_age: formData.child_free_until_age ?? null,
    child_age_limit: formData.child_age_limit,
    min_stay_nights: formData.min_stay_nights,
    max_stay_nights: formData.max_stay_nights ?? null,
    check_in_time: formData.check_in_time,
    check_out_time: formData.check_out_time,
    inventory_mode: formData.inventory_mode,
    total_units: formData.total_units,
    is_active: formData.is_active,
  }
}

// Simple completeness calculation for admin
function calculateCompleteness(formData: AdminRoomFormData): { percentage: number; incompleteItems: IncompleteItem[] } {
  const incomplete: IncompleteItem[] = []

  if (!formData.name) incomplete.push({ id: 'name', label: 'Add a room name', section: 'details' })
  if (formData.base_price_per_night <= 0) incomplete.push({ id: 'price', label: 'Set a base price', section: 'base-price' })
  if (!formData.images.featured && formData.images.gallery.length === 0) incomplete.push({ id: 'images', label: 'Add at least one photo', section: 'images' })
  if (formData.amenities.length === 0) incomplete.push({ id: 'amenities', label: 'Add some amenities', section: 'amenities' })

  const total = 4
  const complete = total - incomplete.length
  return { percentage: Math.round((complete / total) * 100), incompleteItems: incomplete }
}

export function AdminRoomWizard() {
  const navigate = useNavigate()
  const { tenantId, roomId } = useParams<{ tenantId: string; roomId?: string }>()
  const { showSuccess, showError } = useNotification()

  const isCreating = !roomId

  const [activeSection, setActiveSection] = useState('details')
  const [isLoading, setIsLoading] = useState(!isCreating)
  const [isSaving, setIsSaving] = useState(false)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [room, setRoom] = useState<AdminRoom | null>(null)
  const [tenantName, setTenantName] = useState<string>('')
  const [seasonalRates, setSeasonalRates] = useState<AdminSeasonalRate[]>([])
  const [showRateForm, setShowRateForm] = useState(false)
  const [editingRate, setEditingRate] = useState<AdminSeasonalRate | null>(null)
  const [rateFormSaving, setRateFormSaving] = useState(false)

  // Section refs for scrolling
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({})

  const [formData, setFormData] = useState<AdminRoomFormData>({
    name: '',
    description: '',
    room_code: '',
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
    check_in_time: '14:00',
    check_out_time: '10:00',
    inventory_mode: 'single_unit',
    total_units: 1,
    is_active: true,
  })

  const [rateForm, setRateForm] = useState({
    name: '',
    start_date: '',
    end_date: '',
    price_per_night: 0,
    min_nights: undefined as number | undefined,
  })

  // Completeness tracking
  const { percentage: totalPercentage, incompleteItems } = calculateCompleteness(formData)

  // Simple section status
  const getSectionStatus = (sectionId: string): SectionStatus => {
    const hasIncomplete = incompleteItems.some(item => item.section === sectionId)
    return hasIncomplete ? 'partial' : 'complete'
  }

  // Load room and tenant data
  useEffect(() => {
    async function loadData() {
      if (!tenantId) return
      try {
        if (isCreating) {
          // Creation mode: just load tenant info
          const tenantData = await adminTenants.get(tenantId)
          setTenantName(tenantData.businessName || tenantData.name || 'Unknown Tenant')
          // Set currency from tenant default if available
          if (tenantData.currency) {
            const currency = tenantData.currency
            setFormData(prev => ({ ...prev, currency }))
          }
        } else {
          // Edit mode: load room, rates, and tenant
          setIsLoading(true)
          const [roomData, rates, tenantData] = await Promise.all([
            adminTenants.getRoom(tenantId, roomId!),
            adminTenants.getRoomRates(tenantId, roomId!),
            adminTenants.get(tenantId),
          ])
          setRoom(roomData)
          setFormData(adminRoomToFormData(roomData))
          setSeasonalRates(rates)
          setTenantName(tenantData.businessName || tenantData.name || 'Unknown Tenant')
        }
      } catch (error) {
        console.error('Failed to load data:', error)
        showError('Failed to Load', 'Could not load data.')
        navigate(`/admin/tenants/${tenantId}`)
      } finally {
        setIsLoading(false)
      }
    }
    loadData()
  }, [tenantId, roomId, isCreating, navigate, showError])

  const updateFormData = (updates: Partial<AdminRoomFormData>) => {
    setFormData((prev) => ({ ...prev, ...updates }))
    setHasUnsavedChanges(true)
  }

  // Save handler
  const handleSave = useCallback(async () => {
    if (!tenantId) return
    try {
      setIsSaving(true)

      if (isCreating) {
        // Create new room
        const createData = {
          name: formData.name,
          description: formData.description || undefined,
          base_price_per_night: formData.base_price_per_night,
          max_guests: formData.max_guests,
          currency: formData.currency,
        }
        const result = await adminTenants.createRoom(tenantId, createData)
        showSuccess('Room Created', 'The room has been created successfully.')
        // Navigate to edit the new room so user can complete setup
        navigate(`/admin/tenants/${tenantId}/rooms/${result.room.id}/edit`)
      } else {
        // Update existing room
        const updateData = formDataToAdminUpdate(formData)
        await adminTenants.updateRoom(tenantId, roomId!, updateData)
        setHasUnsavedChanges(false)
        setLastSaved(new Date())
        showSuccess('Room Updated', 'Your changes have been saved.')
      }
    } catch (error) {
      console.error('Failed to save room:', error)
      showError('Save Failed', isCreating ? 'Could not create room.' : 'Could not save room data.')
    } finally {
      setIsSaving(false)
    }
  }, [tenantId, roomId, formData, isCreating, navigate, showSuccess, showError])

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
    setRateForm({
      name: '',
      start_date: '',
      end_date: '',
      price_per_night: formData.base_price_per_night,
      min_nights: undefined,
    })
    setShowRateForm(true)
  }

  const handleEditRate = (rate: AdminSeasonalRate) => {
    setEditingRate(rate)
    setRateForm({
      name: rate.name,
      start_date: rate.startDate,
      end_date: rate.endDate,
      price_per_night: rate.pricePerNight,
      min_nights: rate.minNights ?? undefined,
    })
    setShowRateForm(true)
  }

  const handleDeleteRate = async (rate: AdminSeasonalRate) => {
    if (!tenantId || !roomId) return
    try {
      await adminTenants.deleteRoomRate(tenantId, roomId, rate.id)
      setSeasonalRates(seasonalRates.filter((r) => r.id !== rate.id))
      showSuccess('Rate Deleted', `"${rate.name}" has been removed.`)
    } catch (error) {
      showError('Delete Failed', 'Could not delete the seasonal rate.')
    }
  }

  const handleSaveRate = async () => {
    if (!tenantId || !roomId) return
    try {
      setRateFormSaving(true)
      const rateData: AdminSeasonalRateCreateData = {
        name: rateForm.name,
        start_date: rateForm.start_date,
        end_date: rateForm.end_date,
        price_per_night: rateForm.price_per_night,
        min_nights: rateForm.min_nights ?? null,
      }

      if (editingRate?.id) {
        const result = await adminTenants.updateRoomRate(tenantId, roomId, editingRate.id, rateData)
        setSeasonalRates(seasonalRates.map((r) => (r.id === editingRate.id ? result.rate : r)))
        showSuccess('Rate Updated', `"${rateForm.name}" has been updated.`)
      } else {
        const result = await adminTenants.createRoomRate(tenantId, roomId, rateData)
        setSeasonalRates([...seasonalRates, result.rate])
        showSuccess('Rate Created', `"${rateForm.name}" has been added.`)
      }
      setShowRateForm(false)
      setEditingRate(null)
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
      <div className="bg-gray-50 p-8 min-h-full flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-accent-500" />
          <p className="text-gray-500">Loading room...</p>
        </div>
      </div>
    )
  }

  if (!isCreating && !room) {
    return (
      <div className="bg-gray-50 p-8 min-h-full">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center max-w-md mx-auto">
          <p className="text-red-700 mb-4">Room not found</p>
          <button
            onClick={() => navigate(`/admin/tenants/${tenantId}`)}
            className="text-accent-600 hover:text-accent-700"
          >
            Back to Tenant
          </button>
        </div>
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
      progressLabel="Room completeness"
    />
  )

  // Preview panel component
  const preview = (
    <FormPreviewPanel
      previewTitle="Room Preview"
      previewContent={previewContent}
      previewDescription="This is how the room appears to guests"
      boostTitle="Complete the room"
      incompleteItems={incompleteItems}
      onNavigateToSection={handleNavigateToSection}
      allCompleteTitle="Looking great!"
      allCompleteMessage="Room is complete and ready for bookings."
    />
  )

  return (
    <FormLayout
      title={isCreating ? 'Create Room' : 'Edit Room'}
      subtitle={isCreating ? `New room for ${tenantName}` : `${room!.name}${formData.room_code ? ` (${formData.room_code})` : ''} • Tenant: ${tenantName}`}
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
      onSave={handleSave}
      onBack={() => navigate(`/admin/tenants/${tenantId}`)}
      mobilePreviewContent={previewContent}
      saveButtonLabel={isCreating ? 'Create Room' : 'Save Changes'}
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
              <label className="block text-sm font-medium text-gray-700 mb-2">Room Code</label>
              <input
                type="text"
                value={formData.room_code}
                onChange={(e) => updateFormData({ room_code: e.target.value })}
                placeholder="e.g., RM-001"
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
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Max Adults</label>
              <input
                type="number"
                value={formData.max_adults ?? ''}
                onChange={(e) => updateFormData({ max_adults: e.target.value ? parseInt(e.target.value) : undefined })}
                min="1"
                placeholder="Same as max guests"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Max Children</label>
              <input
                type="number"
                value={formData.max_children ?? ''}
                onChange={(e) => updateFormData({ max_children: e.target.value ? parseInt(e.target.value) : undefined })}
                min="0"
                placeholder="No limit"
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
          {tenantId && (
            <RoomImageUpload
              value={formData.images}
              onChange={(images) => updateFormData({ images })}
              tenantId={tenantId}
            />
          )}
        </div>

        {/* Pricing Mode Section */}
        <div ref={(el) => (sectionRefs.current['pricing-mode'] = el)} id="pricing-mode">
          <SectionHeader icon={Settings} title="Pricing Model" description="Choose how to charge for this room" />
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
                    <label className="block text-sm font-medium text-gray-700 mb-2">Min Nights</label>
                    <input
                      type="number"
                      value={rateForm.min_nights ?? ''}
                      onChange={(e) => setRateForm((prev) => ({ ...prev, min_nights: e.target.value ? parseInt(e.target.value) : undefined }))}
                      min="1"
                      placeholder="No minimum"
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

            {seasonalRates.length === 0 ? (
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
                    {seasonalRates.map((rate) => (
                      <tr key={rate.id} className="hover:opacity-90 transition-opacity">
                        <td style={{ color: 'var(--text-primary)' }} className="px-4 py-3 font-medium">{rate.name}</td>
                        <td style={{ color: 'var(--text-muted)' }} className="px-4 py-3 text-sm">
                          {formatDate(rate.startDate)} - {formatDate(rate.endDate)}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`font-medium ${rate.pricePerNight > formData.base_price_per_night ? 'text-red-600' : rate.pricePerNight < formData.base_price_per_night ? 'text-emerald-600' : ''}`} style={rate.pricePerNight === formData.base_price_per_night ? { color: 'var(--text-primary)' } : undefined}>
                            {formatCurrency(rate.pricePerNight)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button onClick={() => handleEditRate(rate)} style={{ color: 'var(--text-muted)' }} className="p-1 hover:opacity-70 mr-1"><Edit2 size={16} /></button>
                          <button onClick={() => handleDeleteRate(rate)} style={{ color: 'var(--text-muted)' }} className="p-1 hover:text-red-600"><Trash2 size={16} /></button>
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Check-in Time</label>
              <input
                type="time"
                value={formData.check_in_time}
                onChange={(e) => updateFormData({ check_in_time: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Check-out Time</label>
              <input
                type="time"
                value={formData.check_out_time}
                onChange={(e) => updateFormData({ check_out_time: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-400"
              />
            </div>
          </div>
        </div>

        {/* Inventory Section */}
        <div ref={(el) => (sectionRefs.current['inventory'] = el)} id="inventory">
          <SectionHeader icon={Layers} title="Inventory" description="Configure room availability type" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Inventory Mode</label>
              <select
                value={formData.inventory_mode}
                onChange={(e) => updateFormData({ inventory_mode: e.target.value as 'single_unit' | 'room_type' })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-400"
              >
                <option value="single_unit">Single Unit (unique room)</option>
                <option value="room_type">Room Type (multiple identical units)</option>
              </select>
            </div>
            {formData.inventory_mode === 'room_type' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Total Units</label>
                <input
                  type="number"
                  value={formData.total_units}
                  onChange={(e) => updateFormData({ total_units: parseInt(e.target.value) || 1 })}
                  min="1"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-400"
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </FormLayout>
  )
}

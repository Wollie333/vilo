import { Loader2, ChevronDown, ChevronUp, ExternalLink, Clock, Shield, Home, Sparkles, Tag, MapPin, Layers } from 'lucide-react'
import { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { TagInput, CancellationPolicyEditor, SpecialOffersEditor, GalleryUploader, LocationSelector, CategorySelector } from '../../components/directory'
import { supabase } from '../../lib/supabase'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3002/api'

interface CancellationPolicy {
  days_before: number
  refund_percentage: number
  label: string
}

interface SpecialOffer {
  title: string
  description: string
  valid_until?: string
  active: boolean
}

// Collapsible section component
function Section({
  title,
  icon: Icon,
  children,
  defaultOpen = true
}: {
  title: string
  icon: React.ElementType
  children: React.ReactNode
  defaultOpen?: boolean
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <Icon size={18} className="text-gray-500" />
          <h3 className="font-medium text-gray-900">{title}</h3>
        </div>
        {isOpen ? <ChevronUp size={18} className="text-gray-400" /> : <ChevronDown size={18} className="text-gray-400" />}
      </button>
      {isOpen && (
        <div className="px-4 pb-4 border-t border-gray-100 pt-4">
          {children}
        </div>
      )}
    </div>
  )
}

// Suggestions for tag inputs
const AMENITY_SUGGESTIONS = [
  'WiFi', 'Pool', 'Parking', 'Restaurant', 'Bar', 'Spa', 'Gym', 'Room Service',
  'Air Conditioning', 'Heating', 'Garden', 'Terrace', 'BBQ', 'Fireplace',
  'Beach Access', 'Lake Access', 'Mountain View', 'Sea View', 'Pet Friendly',
  'Kids Playground', 'Game Room', 'Library', 'Conference Room', 'Laundry'
]

const HOUSE_RULES_SUGGESTIONS = [
  'No smoking', 'No pets', 'No parties', 'Quiet hours after 22:00',
  'Check-in before 20:00', 'No visitors', 'Remove shoes indoors',
  'Children must be supervised', 'No loud music'
]

const WHATS_INCLUDED_SUGGESTIONS = [
  'Breakfast', 'WiFi', 'Parking', 'Airport Shuttle', 'Welcome Drinks',
  'Daily Housekeeping', 'Towels', 'Toiletries', 'Coffee & Tea', 'Mini Bar',
  'Beach Towels', 'Bicycle Rental', 'Kayak Use', 'Fishing Equipment'
]

export default function BusinessDirectory() {
  const { session, tenant, refreshTenant } = useAuth()

  // Upload image to Supabase storage
  const uploadGalleryImage = async (file: File): Promise<string> => {
    if (!tenant?.id) {
      throw new Error('No tenant found')
    }

    // Generate unique filename
    const fileExt = file.name.split('.').pop()?.toLowerCase() || 'jpg'
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${fileExt}`
    const filePath = `${tenant.id}/${fileName}`

    // Upload to Supabase storage
    const { error: uploadError } = await supabase.storage
      .from('gallery-images')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      })

    if (uploadError) {
      console.error('Upload error:', uploadError)
      throw new Error(uploadError.message || 'Failed to upload image')
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('gallery-images')
      .getPublicUrl(filePath)

    return publicUrl
  }

  // Basic listing state
  const [discoverable, setDiscoverable] = useState(false)
  const [directoryFeatured, setDirectoryFeatured] = useState(false)
  const [propertyType, setPropertyType] = useState('')
  const [regionName, setRegionName] = useState('')
  const [regionSlug, setRegionSlug] = useState('')
  const [coverImage, setCoverImage] = useState('')

  // Location state
  const [countryId, setCountryId] = useState<string | null>(null)
  const [provinceId, setProvinceId] = useState<string | null>(null)
  const [destinationId, setDestinationId] = useState<string | null>(null)
  const [formattedAddress, setFormattedAddress] = useState('')
  const [latitude, setLatitude] = useState<number | null>(null)
  const [longitude, setLongitude] = useState<number | null>(null)

  // Category state
  const [categorySlugs, setCategorySlugs] = useState<string[]>([])

  // Extended listing state
  const [galleryImages, setGalleryImages] = useState<string[]>([])
  const [directoryDescription, setDirectoryDescription] = useState('')
  const [checkInTime, setCheckInTime] = useState('14:00')
  const [checkOutTime, setCheckOutTime] = useState('10:00')
  const [cancellationPolicies, setCancellationPolicies] = useState<CancellationPolicy[]>([
    { days_before: 7, refund_percentage: 100, label: 'Free cancellation up to 7 days before' }
  ])
  const [propertyAmenities, setPropertyAmenities] = useState<string[]>([])
  const [houseRules, setHouseRules] = useState<string[]>([])
  const [whatsIncluded, setWhatsIncluded] = useState<string[]>([])
  const [propertyHighlights, setPropertyHighlights] = useState<string[]>([])
  const [seasonalMessage, setSeasonalMessage] = useState('')
  const [specialOffers, setSpecialOffers] = useState<SpecialOffer[]>([])

  // UI state
  const [directoryLoading, setDirectoryLoading] = useState(false)
  const [directoryMessage, setDirectoryMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Preview info from tenant
  const [businessName, setBusinessName] = useState('')
  const [city, setCity] = useState('')

  // Initialize with tenant data
  useEffect(() => {
    if (tenant) {
      // Basic fields
      setDiscoverable(tenant.discoverable || false)
      setDirectoryFeatured(tenant.directory_featured || false)
      setPropertyType(tenant.property_type || '')
      setRegionName(tenant.region || '')
      setRegionSlug(tenant.region_slug || '')
      setCoverImage(tenant.cover_image || '')
      setBusinessName(tenant.business_name || '')
      setCity(tenant.city || '')

      // Location fields
      setCountryId(tenant.country_id || null)
      setProvinceId(tenant.province_id || null)
      setDestinationId(tenant.destination_id || null)
      setFormattedAddress(tenant.formatted_address || '')
      setLatitude(tenant.latitude || null)
      setLongitude(tenant.longitude || null)

      // Category fields
      setCategorySlugs(tenant.category_slugs || [])

      // Extended fields
      setGalleryImages(tenant.gallery_images || [])
      setDirectoryDescription(tenant.directory_description || '')
      setCheckInTime(tenant.check_in_time || '14:00')
      setCheckOutTime(tenant.check_out_time || '10:00')
      setCancellationPolicies(tenant.cancellation_policies || [
        { days_before: 7, refund_percentage: 100, label: 'Free cancellation up to 7 days before' }
      ])
      setPropertyAmenities(tenant.property_amenities || [])
      setHouseRules(tenant.house_rules || [])
      setWhatsIncluded(tenant.whats_included || [])
      setPropertyHighlights(tenant.property_highlights || [])
      setSeasonalMessage(tenant.seasonal_message || '')
      setSpecialOffers(tenant.special_offers || [])
    }
  }, [tenant])

  const handleDirectoryUpdate = async () => {
    if (!session?.access_token) return

    setDirectoryLoading(true)
    setDirectoryMessage(null)

    try {
      const response = await fetch(`${API_URL}/tenants/me`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          discoverable,
          directory_featured: directoryFeatured,
          property_type: propertyType,
          region: regionName,
          region_slug: regionSlug,
          cover_image: coverImage,
          // Location fields
          country_id: countryId,
          province_id: provinceId,
          destination_id: destinationId,
          formatted_address: formattedAddress,
          latitude: latitude,
          longitude: longitude,
          // Category fields
          category_slugs: categorySlugs,
          // Extended fields
          gallery_images: galleryImages,
          directory_description: directoryDescription,
          check_in_time: checkInTime,
          check_out_time: checkOutTime,
          cancellation_policies: cancellationPolicies,
          property_amenities: propertyAmenities,
          house_rules: houseRules,
          whats_included: whatsIncluded,
          property_highlights: propertyHighlights,
          seasonal_message: seasonalMessage,
          special_offers: specialOffers,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update directory settings')
      }

      await refreshTenant()
      setDirectoryMessage({ type: 'success', text: 'Directory settings updated successfully' })
    } catch (error) {
      setDirectoryMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to update directory settings',
      })
    } finally {
      setDirectoryLoading(false)
    }
  }

  return (
    <div className="p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Directory Listing</h1>
        <p className="text-sm text-gray-500 mt-1">
          List your property on the Vilo public directory to attract more guests.
        </p>
      </div>

      <div className="space-y-4">
        {/* Directory Enable Toggle */}
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium text-gray-900">List on Vilo Directory</h3>
              <p className="text-sm text-gray-500 mt-1">
                When enabled, your property will be visible to the public
              </p>
            </div>
            <button
              onClick={() => setDiscoverable(!discoverable)}
              className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-accent-500 focus:ring-offset-2 ${
                discoverable ? 'bg-accent-500' : 'bg-gray-200'
              }`}
            >
              <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  discoverable ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Show slug when discoverable */}
          {discoverable && tenant?.slug && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <div className="flex items-center gap-2 text-sm">
                <span className="text-gray-500">Your listing URL:</span>
                <code className="px-2 py-1 bg-gray-100 rounded text-accent-600">
                  /accommodation/{tenant.slug}
                </code>
                <a
                  href={`/accommodation/${tenant.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1 text-gray-400 hover:text-gray-600"
                >
                  <ExternalLink size={14} />
                </a>
              </div>
            </div>
          )}
        </div>

        {/* Directory Settings - Only shown when discoverable */}
        {discoverable && (
          <>
            {/* Listing Basics */}
            <Section title="Listing Basics" icon={Home} defaultOpen={true}>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Property Type
                </label>
                <select
                  value={propertyType}
                  onChange={(e) => setPropertyType(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent-500"
                >
                  <option value="">Select type...</option>
                  <option value="Lodge">Lodge</option>
                  <option value="Guesthouse">Guesthouse</option>
                  <option value="B&B">Bed & Breakfast</option>
                  <option value="Hotel">Hotel</option>
                  <option value="Villa">Villa</option>
                  <option value="Cottage">Cottage</option>
                  <option value="Cabin">Cabin</option>
                  <option value="House">Holiday Home</option>
                  <option value="Apartment">Apartment</option>
                  <option value="Farm Stay">Farm Stay</option>
                  <option value="Game Reserve">Game Reserve</option>
                </select>
              </div>
            </Section>

            {/* Location */}
            <Section title="Location" icon={MapPin} defaultOpen={true}>
              <LocationSelector
                countryId={countryId}
                provinceId={provinceId}
                destinationId={destinationId}
                address={formattedAddress}
                latitude={latitude}
                longitude={longitude}
                onCountryChange={setCountryId}
                onProvinceChange={setProvinceId}
                onDestinationChange={setDestinationId}
                onAddressChange={setFormattedAddress}
                onCoordinatesChange={(lat, lng) => {
                  setLatitude(lat)
                  setLongitude(lng)
                }}
              />
            </Section>

            {/* Categories */}
            <Section title="Categories" icon={Layers} defaultOpen={true}>
              <CategorySelector
                selectedCategories={categorySlugs}
                onChange={setCategorySlugs}
                maxCategories={5}
              />
            </Section>

            {/* Gallery Images */}
            <Section title="Gallery Images" icon={Sparkles} defaultOpen={true}>
              <p className="text-sm text-gray-500 mb-4">
                Add images to showcase your property. The cover image will be shown in search results.
              </p>
              <GalleryUploader
                images={galleryImages}
                coverImage={coverImage}
                onChange={setGalleryImages}
                onCoverChange={setCoverImage}
                maxImages={20}
                onUpload={uploadGalleryImage}
              />
            </Section>

            {/* Description */}
            <Section title="Description" icon={Home} defaultOpen={true}>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Directory Description
                </label>
                <p className="text-xs text-gray-400 mb-2">
                  This description will appear on your public listing page
                </p>
                <textarea
                  value={directoryDescription}
                  onChange={(e) => setDirectoryDescription(e.target.value)}
                  rows={4}
                  maxLength={2000}
                  placeholder="Describe your property, its unique features, and what makes it special..."
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent-500 resize-none"
                />
                <p className="text-xs text-gray-400 mt-1 text-right">
                  {directoryDescription.length}/2000
                </p>
              </div>
            </Section>

            {/* Check-in/Check-out */}
            <Section title="Check-in & Check-out" icon={Clock} defaultOpen={false}>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Check-in Time
                  </label>
                  <input
                    type="time"
                    value={checkInTime}
                    onChange={(e) => setCheckInTime(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Check-out Time
                  </label>
                  <input
                    type="time"
                    value={checkOutTime}
                    onChange={(e) => setCheckOutTime(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent-500"
                  />
                </div>
              </div>
            </Section>

            {/* Cancellation Policy */}
            <Section title="Cancellation Policy" icon={Shield} defaultOpen={false}>
              <CancellationPolicyEditor
                policies={cancellationPolicies}
                onChange={setCancellationPolicies}
              />
            </Section>

            {/* Property Amenities */}
            <Section title="Property Amenities" icon={Sparkles} defaultOpen={false}>
              <p className="text-sm text-gray-500 mb-3">
                Property-wide amenities (room amenities are set per room)
              </p>
              <TagInput
                value={propertyAmenities}
                onChange={setPropertyAmenities}
                suggestions={AMENITY_SUGGESTIONS}
                placeholder="Add amenity..."
              />
            </Section>

            {/* House Rules */}
            <Section title="House Rules" icon={Home} defaultOpen={false}>
              <TagInput
                value={houseRules}
                onChange={setHouseRules}
                suggestions={HOUSE_RULES_SUGGESTIONS}
                placeholder="Add rule..."
              />
            </Section>

            {/* What's Included */}
            <Section title="What's Included" icon={Tag} defaultOpen={false}>
              <p className="text-sm text-gray-500 mb-3">
                What is included with every stay at your property
              </p>
              <TagInput
                value={whatsIncluded}
                onChange={setWhatsIncluded}
                suggestions={WHATS_INCLUDED_SUGGESTIONS}
                placeholder="Add inclusion..."
              />
            </Section>

            {/* Property Highlights */}
            <Section title="Property Highlights" icon={Sparkles} defaultOpen={false}>
              <p className="text-sm text-gray-500 mb-3">
                Key selling points that make your property special (max 5)
              </p>
              <TagInput
                value={propertyHighlights}
                onChange={setPropertyHighlights}
                placeholder="e.g., Ocean views, Award-winning restaurant..."
                maxItems={5}
              />
            </Section>

            {/* Marketing */}
            <Section title="Marketing" icon={Tag} defaultOpen={false}>
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Seasonal Message
                  </label>
                  <p className="text-xs text-gray-400 mb-2">
                    A promotional message shown on your listing (e.g., "Perfect for winter getaways")
                  </p>
                  <input
                    type="text"
                    value={seasonalMessage}
                    onChange={(e) => setSeasonalMessage(e.target.value)}
                    maxLength={100}
                    placeholder="e.g., Book now for summer specials!"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Special Offers
                  </label>
                  <SpecialOffersEditor
                    offers={specialOffers}
                    onChange={setSpecialOffers}
                  />
                </div>
              </div>
            </Section>

            {/* Preview */}
            <div className="bg-accent-50 border border-accent-200 rounded-xl p-6">
              <h3 className="font-medium text-accent-900 mb-2">Directory Preview</h3>
              <p className="text-sm text-accent-700 mb-4">
                This is how your property will appear in search results:
              </p>
              <div className="bg-white rounded-lg border border-gray-200 p-4 max-w-sm">
                <div className="aspect-[4/3] bg-gray-100 rounded-lg mb-3 overflow-hidden">
                  {coverImage ? (
                    <img
                      src={coverImage}
                      alt="Preview"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400'
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                      No cover image
                    </div>
                  )}
                </div>
                <h4 className="font-semibold text-gray-900">{businessName || 'Your Property Name'}</h4>
                <p className="text-sm text-gray-500">
                  {city && regionName ? `${city}, ${regionName}` : 'Location not set'}
                </p>
                <div className="flex items-center gap-2 mt-2">
                  {propertyType && (
                    <span className="px-2 py-1 bg-gray-100 text-xs text-gray-600 rounded">
                      {propertyType}
                    </span>
                  )}
                  {propertyHighlights.slice(0, 2).map((h) => (
                    <span key={h} className="px-2 py-1 bg-accent-50 text-xs text-accent-600 rounded">
                      {h}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}

        {/* Message */}
        {directoryMessage && (
          <div
            className={`p-3 rounded-lg text-sm ${
              directoryMessage.type === 'success'
                ? 'bg-accent-50 text-accent-700 border border-accent-200'
                : 'bg-red-50 text-red-700 border border-red-200'
            }`}
          >
            {directoryMessage.text}
          </div>
        )}

        {/* Save Button */}
        <div className="flex justify-end pt-4">
          <button
            onClick={handleDirectoryUpdate}
            disabled={directoryLoading}
            className="flex items-center gap-2 px-6 py-2.5 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {directoryLoading && <Loader2 size={16} className="animate-spin" />}
            {directoryLoading ? 'Saving...' : 'Save Directory Settings'}
          </button>
        </div>
      </div>
    </div>
  )
}

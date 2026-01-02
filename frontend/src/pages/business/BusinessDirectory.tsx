import { ChevronDown, Home, MapPin, Layers, Image, FileText, Sparkles, Clock, Shield, Wifi, BookOpen, Package, Megaphone, Search, Upload, X, Facebook, Twitter } from 'lucide-react'
import { useState, useEffect, useMemo } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import {
  TagInput,
  CancellationPolicyEditor,
  SpecialOffersEditor,
  GalleryUploader,
  LocationSelector,
  CategorySelector,
  DirectoryLayout,
  DirectorySidebar,
  DirectoryPreviewPanel
} from '../../components/directory'
import { supabase } from '../../lib/supabase'
import { useDirectoryCompleteness, DirectoryFormData } from '../../hooks/useDirectoryCompleteness'
import { useAutoSave } from '../../hooks/useAutoSave'

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

// Section Header Component
function SectionHeader({ icon: Icon, title, description }: { icon: React.ElementType; title: string; description?: string }) {
  return (
    <div className="mb-6">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center">
          <Icon size={20} className="text-emerald-600" />
        </div>
        <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
      </div>
      {description && (
        <p className="text-sm text-gray-500 ml-[52px]">{description}</p>
      )}
    </div>
  )
}

export default function BusinessDirectory() {
  const { session, tenant, refreshTenant } = useAuth()
  const [activeSection, setActiveSection] = useState('property-type')

  // Upload image to Supabase storage
  const uploadGalleryImage = async (file: File): Promise<string> => {
    if (!tenant?.id) {
      throw new Error('No tenant found')
    }

    const fileExt = file.name.split('.').pop()?.toLowerCase() || 'jpg'
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${fileExt}`
    const filePath = `${tenant.id}/${fileName}`

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

  // SEO state
  const [seoMetaTitle, setSeoMetaTitle] = useState('')
  const [seoMetaDescription, setSeoMetaDescription] = useState('')
  const [seoKeywords, setSeoKeywords] = useState<string[]>([])
  const [seoOgImage, setSeoOgImage] = useState('')
  const [seoOgImageAlt, setSeoOgImageAlt] = useState('')
  const [ogImageUploading, setOgImageUploading] = useState(false)

  // Preview info from tenant
  const [businessName, setBusinessName] = useState('')
  const [city, setCity] = useState('')

  // UI state
  const [directoryMessage, setDirectoryMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Prepare form data for completeness hook
  const formData: DirectoryFormData = useMemo(() => ({
    propertyType,
    countryId,
    provinceId,
    destinationId,
    categorySlugs,
    galleryImages,
    coverImage,
    directoryDescription,
    formattedAddress,
    latitude,
    longitude,
    checkInTime,
    checkOutTime,
    cancellationPolicies,
    propertyAmenities,
    houseRules,
    whatsIncluded,
    propertyHighlights,
    seasonalMessage,
    specialOffers,
    seoMetaTitle,
    seoMetaDescription,
    seoKeywords,
    seoOgImage,
    seoOgImageAlt
  }), [
    propertyType, countryId, provinceId, destinationId, categorySlugs,
    galleryImages, coverImage, directoryDescription, formattedAddress,
    latitude, longitude, checkInTime, checkOutTime, cancellationPolicies,
    propertyAmenities, houseRules, whatsIncluded, propertyHighlights,
    seasonalMessage, specialOffers, seoMetaTitle, seoMetaDescription, seoKeywords,
    seoOgImage, seoOgImageAlt
  ])

  // Completeness tracking
  const { totalPercentage, incompleteItems, getSectionStatus } = useDirectoryCompleteness(formData)

  // Save function
  const handleDirectoryUpdate = async () => {
    if (!session?.access_token) return

    setDirectoryMessage(null)

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
        country_id: countryId,
        province_id: provinceId,
        destination_id: destinationId,
        formatted_address: formattedAddress,
        latitude: latitude,
        longitude: longitude,
        category_slugs: categorySlugs,
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
        seo_meta_title: seoMetaTitle,
        seo_meta_description: seoMetaDescription,
        seo_keywords: seoKeywords,
        seo_og_image: seoOgImage,
        seo_og_image_alt: seoOgImageAlt,
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error || 'Failed to update directory settings')
    }

    await refreshTenant()
    setDirectoryMessage({ type: 'success', text: 'Directory settings updated successfully' })
  }

  // Auto-save hook
  const { isSaving, lastSaved, save } = useAutoSave(
    handleDirectoryUpdate,
    [formData, discoverable],
    { enabled: false } // Disable auto-save, use manual save only
  )

  // Compute hasUnsavedChanges by comparing current form state against tenant data
  const hasUnsavedChanges = useMemo(() => {
    if (!tenant) return false

    const defaultCancellation = [{ days_before: 7, refund_percentage: 100, label: 'Free cancellation up to 7 days before' }]

    return (
      discoverable !== (tenant.discoverable || false) ||
      propertyType !== (tenant.property_type || '') ||
      countryId !== (tenant.country_id || null) ||
      provinceId !== (tenant.province_id || null) ||
      destinationId !== (tenant.destination_id || null) ||
      formattedAddress !== (tenant.formatted_address || '') ||
      latitude !== (tenant.latitude || null) ||
      longitude !== (tenant.longitude || null) ||
      JSON.stringify(categorySlugs) !== JSON.stringify(tenant.category_slugs || []) ||
      JSON.stringify(galleryImages) !== JSON.stringify(tenant.gallery_images || []) ||
      coverImage !== (tenant.cover_image || '') ||
      directoryDescription !== (tenant.directory_description || '') ||
      checkInTime !== (tenant.check_in_time || '14:00') ||
      checkOutTime !== (tenant.check_out_time || '10:00') ||
      JSON.stringify(cancellationPolicies) !== JSON.stringify(tenant.cancellation_policies || defaultCancellation) ||
      JSON.stringify(propertyAmenities) !== JSON.stringify(tenant.property_amenities || []) ||
      JSON.stringify(houseRules) !== JSON.stringify(tenant.house_rules || []) ||
      JSON.stringify(whatsIncluded) !== JSON.stringify(tenant.whats_included || []) ||
      JSON.stringify(propertyHighlights) !== JSON.stringify(tenant.property_highlights || []) ||
      seasonalMessage !== (tenant.seasonal_message || '') ||
      JSON.stringify(specialOffers) !== JSON.stringify(tenant.special_offers || []) ||
      seoMetaTitle !== (tenant.seo_meta_title || '') ||
      seoMetaDescription !== (tenant.seo_meta_description || '') ||
      JSON.stringify(seoKeywords) !== JSON.stringify(tenant.seo_keywords || []) ||
      seoOgImage !== (tenant.seo_og_image || '') ||
      seoOgImageAlt !== (tenant.seo_og_image_alt || '')
    )
  }, [
    tenant, discoverable, propertyType, countryId, provinceId, destinationId,
    formattedAddress, latitude, longitude, categorySlugs, galleryImages, coverImage,
    directoryDescription, checkInTime, checkOutTime, cancellationPolicies,
    propertyAmenities, houseRules, whatsIncluded, propertyHighlights,
    seasonalMessage, specialOffers, seoMetaTitle, seoMetaDescription, seoKeywords,
    seoOgImage, seoOgImageAlt
  ])

  // Initialize with tenant data
  useEffect(() => {
    if (tenant) {
      setDiscoverable(tenant.discoverable || false)
      setDirectoryFeatured(tenant.directory_featured || false)
      setPropertyType(tenant.property_type || '')
      setRegionName(tenant.region || '')
      setRegionSlug(tenant.region_slug || '')
      setCoverImage(tenant.cover_image || '')
      setBusinessName(tenant.business_name || '')
      setCity(tenant.city || '')
      setCountryId(tenant.country_id || null)
      setProvinceId(tenant.province_id || null)
      setDestinationId(tenant.destination_id || null)
      setFormattedAddress(tenant.formatted_address || '')
      setLatitude(tenant.latitude || null)
      setLongitude(tenant.longitude || null)
      setCategorySlugs(tenant.category_slugs || [])
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
      setSeoMetaTitle(tenant.seo_meta_title || '')
      setSeoMetaDescription(tenant.seo_meta_description || '')
      setSeoKeywords(tenant.seo_keywords || [])
      setSeoOgImage(tenant.seo_og_image || '')
      setSeoOgImageAlt(tenant.seo_og_image_alt || '')
    }
  }, [tenant])

  // Render section content based on active section
  const renderSectionContent = () => {
    switch (activeSection) {
      case 'property-type':
        return (
          <div>
            <SectionHeader
              icon={Home}
              title="Property Type"
              description="Select the type that best describes your property"
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Property Type
              </label>
              <div className="relative">
                <select
                  value={propertyType}
                  onChange={(e) => setPropertyType(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 appearance-none bg-white"
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
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
              </div>
            </div>
          </div>
        )

      case 'location':
        return (
          <div>
            <SectionHeader
              icon={MapPin}
              title="Location"
              description="Help guests find your property by setting your location"
            />
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
          </div>
        )

      case 'categories':
        return (
          <div>
            <SectionHeader
              icon={Layers}
              title="Categories"
              description="Choose categories to help guests discover your property"
            />
            <CategorySelector
              selectedCategories={categorySlugs}
              onChange={setCategorySlugs}
              maxCategories={5}
            />
          </div>
        )

      case 'gallery':
        return (
          <div>
            <SectionHeader
              icon={Image}
              title="Gallery"
              description="Add photos to showcase your property. The cover image appears in search results."
            />
            <GalleryUploader
              images={galleryImages}
              coverImage={coverImage}
              onChange={setGalleryImages}
              onCoverChange={setCoverImage}
              maxImages={20}
              onUpload={uploadGalleryImage}
            />
          </div>
        )

      case 'description':
        return (
          <div>
            <SectionHeader
              icon={FileText}
              title="Description"
              description="Write a compelling description of your property"
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Directory Description
              </label>
              <textarea
                value={directoryDescription}
                onChange={(e) => setDirectoryDescription(e.target.value)}
                rows={6}
                maxLength={2000}
                placeholder="Describe your property, its unique features, and what makes it special..."
                className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
              />
              <div className="flex justify-between mt-2">
                <p className="text-xs text-gray-400">
                  Tip: Include unique features, nearby attractions, and what makes your stay special.
                </p>
                <p className="text-xs text-gray-400">
                  {directoryDescription.length}/2000
                </p>
              </div>
            </div>
          </div>
        )

      case 'highlights':
        return (
          <div>
            <SectionHeader
              icon={Sparkles}
              title="Property Highlights"
              description="Add key selling points that make your property stand out (max 5)"
            />
            <TagInput
              value={propertyHighlights}
              onChange={setPropertyHighlights}
              placeholder="e.g., Ocean views, Award-winning restaurant..."
              maxItems={5}
            />
          </div>
        )

      case 'times':
        return (
          <div>
            <SectionHeader
              icon={Clock}
              title="Check-in & Check-out"
              description="Set your property's check-in and check-out times"
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Check-in Time
                </label>
                <input
                  type="time"
                  value={checkInTime}
                  onChange={(e) => setCheckInTime(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Check-out Time
                </label>
                <input
                  type="time"
                  value={checkOutTime}
                  onChange={(e) => setCheckOutTime(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>
          </div>
        )

      case 'cancellation':
        return (
          <div>
            <SectionHeader
              icon={Shield}
              title="Cancellation Policy"
              description="Set your cancellation and refund policies"
            />
            <CancellationPolicyEditor
              policies={cancellationPolicies}
              onChange={setCancellationPolicies}
            />
          </div>
        )

      case 'amenities':
        return (
          <div>
            <SectionHeader
              icon={Wifi}
              title="Property Amenities"
              description="Add property-wide amenities (room-specific amenities are set per room)"
            />
            <TagInput
              value={propertyAmenities}
              onChange={setPropertyAmenities}
              suggestions={AMENITY_SUGGESTIONS}
              placeholder="Add amenity..."
            />
          </div>
        )

      case 'rules':
        return (
          <div>
            <SectionHeader
              icon={BookOpen}
              title="House Rules"
              description="Set expectations for guests staying at your property"
            />
            <TagInput
              value={houseRules}
              onChange={setHouseRules}
              suggestions={HOUSE_RULES_SUGGESTIONS}
              placeholder="Add rule..."
            />
          </div>
        )

      case 'included':
        return (
          <div>
            <SectionHeader
              icon={Package}
              title="What's Included"
              description="Let guests know what's included with every stay"
            />
            <TagInput
              value={whatsIncluded}
              onChange={setWhatsIncluded}
              suggestions={WHATS_INCLUDED_SUGGESTIONS}
              placeholder="Add inclusion..."
            />
          </div>
        )

      case 'marketing':
        return (
          <div>
            <SectionHeader
              icon={Megaphone}
              title="Marketing & Promotions"
              description="Add seasonal messages and special offers to attract guests"
            />
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
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
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
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
          </div>
        )

      case 'seo':
        const handleOgImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
          const file = e.target.files?.[0]
          if (!file) return

          setOgImageUploading(true)
          try {
            const imageUrl = await uploadGalleryImage(file)
            setSeoOgImage(imageUrl)
          } catch (error) {
            console.error('Failed to upload OG image:', error)
            setDirectoryMessage({ type: 'error', text: 'Failed to upload image' })
          } finally {
            setOgImageUploading(false)
          }
        }

        const ogTitle = seoMetaTitle || `${businessName || 'Your Property'} | Vilo`
        const ogDescription = seoMetaDescription || directoryDescription?.substring(0, 160) || 'Discover this amazing property on Vilo'
        const ogImage = seoOgImage || coverImage

        return (
          <div>
            <SectionHeader
              icon={Search}
              title="Profile SEO"
              description="Optimize your listing for search engines and social sharing"
            />
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Meta Title
                </label>
                <p className="text-xs text-gray-400 mb-2">
                  The title shown in search engine results (60-70 characters optimal)
                </p>
                <input
                  type="text"
                  value={seoMetaTitle}
                  onChange={(e) => setSeoMetaTitle(e.target.value)}
                  maxLength={70}
                  placeholder={businessName || "Your property name - Location | Vilo"}
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <div className="flex justify-between mt-2">
                  <p className="text-xs text-gray-400">
                    Leave blank to use default: "{businessName || 'Property Name'} | Vilo"
                  </p>
                  <p className={`text-xs ${seoMetaTitle.length > 60 ? 'text-amber-500' : 'text-gray-400'}`}>
                    {seoMetaTitle.length}/70
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Meta Description
                </label>
                <p className="text-xs text-gray-400 mb-2">
                  A brief description shown in search results (150-160 characters optimal)
                </p>
                <textarea
                  value={seoMetaDescription}
                  onChange={(e) => setSeoMetaDescription(e.target.value)}
                  rows={3}
                  maxLength={160}
                  placeholder="Describe your property in a way that will attract guests from search results..."
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                />
                <div className="flex justify-between mt-2">
                  <p className="text-xs text-gray-400">
                    Leave blank to use your directory description
                  </p>
                  <p className={`text-xs ${seoMetaDescription.length > 155 ? 'text-amber-500' : 'text-gray-400'}`}>
                    {seoMetaDescription.length}/160
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  SEO Keywords
                </label>
                <p className="text-xs text-gray-400 mb-2">
                  Add keywords that describe your property for better search visibility
                </p>
                <TagInput
                  value={seoKeywords}
                  onChange={setSeoKeywords}
                  placeholder="Add keyword..."
                  maxItems={10}
                />
                <p className="text-xs text-gray-400 mt-2">
                  Examples: beach lodge, family accommodation, romantic getaway
                </p>
              </div>

              {/* Social Share Image */}
              <div className="pt-6 border-t border-gray-200">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Social Share Image
                </label>
                <p className="text-xs text-gray-400 mb-3">
                  This image appears when your listing is shared on Facebook, Twitter, LinkedIn, and other platforms. Recommended size: 1200 x 630 pixels.
                </p>

                {seoOgImage ? (
                  <div className="relative">
                    <div className="aspect-[1200/630] bg-gray-100 rounded-lg overflow-hidden border border-gray-200">
                      <img
                        src={seoOgImage}
                        alt={seoOgImageAlt || 'Social share preview'}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => setSeoOgImage('')}
                      className="absolute top-2 right-2 p-1.5 bg-white rounded-full shadow-md hover:bg-gray-100 transition-colors"
                    >
                      <X size={16} className="text-gray-600" />
                    </button>
                  </div>
                ) : (
                  <label className="block cursor-pointer">
                    <div className="aspect-[1200/630] border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center hover:border-emerald-400 hover:bg-emerald-50/50 transition-colors">
                      {ogImageUploading ? (
                        <div className="flex flex-col items-center">
                          <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                          <p className="text-sm text-gray-500 mt-2">Uploading...</p>
                        </div>
                      ) : (
                        <>
                          <Upload size={32} className="text-gray-400 mb-2" />
                          <p className="text-sm font-medium text-gray-600">Upload social share image</p>
                          <p className="text-xs text-gray-400 mt-1">1200 x 630 pixels recommended</p>
                        </>
                      )}
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleOgImageUpload}
                      className="hidden"
                      disabled={ogImageUploading}
                    />
                  </label>
                )}

                {!seoOgImage && coverImage && (
                  <p className="text-xs text-amber-600 mt-2">
                    No social image set — your cover image will be used instead
                  </p>
                )}
              </div>

              {/* Image Alt Text */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Image Alt Text
                </label>
                <p className="text-xs text-gray-400 mb-2">
                  Describe the image for accessibility and SEO
                </p>
                <input
                  type="text"
                  value={seoOgImageAlt}
                  onChange={(e) => setSeoOgImageAlt(e.target.value)}
                  maxLength={255}
                  placeholder={`${businessName || 'Property'} - ${propertyType || 'accommodation'} in ${regionName || 'South Africa'}`}
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Search Preview */}
              <div className="pt-6 border-t border-gray-200">
                <h4 className="text-sm font-medium text-gray-700 mb-3">Google Search Preview</h4>
                <div className="bg-white p-4 rounded-lg border border-gray-200">
                  <p className="text-blue-600 text-lg hover:underline cursor-pointer truncate">
                    {ogTitle}
                  </p>
                  <p className="text-green-700 text-sm mt-1">
                    vilo.co.za › {regionSlug || 'region'} › {businessName?.toLowerCase().replace(/\s+/g, '-') || 'property'}
                  </p>
                  <p className="text-gray-600 text-sm mt-1 line-clamp-2">
                    {ogDescription}
                  </p>
                </div>
              </div>

              {/* Social Media Previews */}
              <div className="pt-6 border-t border-gray-200">
                <h4 className="text-sm font-medium text-gray-700 mb-4">Social Media Preview</h4>

                {/* Facebook Preview */}
                <div className="mb-6">
                  <div className="flex items-center gap-2 mb-2">
                    <Facebook size={16} className="text-[#1877F2]" />
                    <span className="text-xs font-medium text-gray-500">Facebook</span>
                  </div>
                  <div className="border border-gray-200 rounded-lg overflow-hidden bg-white max-w-md">
                    <div className="aspect-[1200/630] bg-gray-100">
                      {ogImage ? (
                        <img
                          src={ogImage}
                          alt={seoOgImageAlt || 'Preview'}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400">
                          <Image size={48} />
                        </div>
                      )}
                    </div>
                    <div className="p-3 border-t border-gray-100">
                      <p className="text-xs text-gray-500 uppercase">vilo.co.za</p>
                      <p className="font-semibold text-gray-900 text-sm mt-1 line-clamp-2">{ogTitle}</p>
                      <p className="text-gray-500 text-xs mt-1 line-clamp-1">{ogDescription}</p>
                    </div>
                  </div>
                </div>

                {/* Twitter Preview */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Twitter size={16} className="text-gray-800" />
                    <span className="text-xs font-medium text-gray-500">X (Twitter)</span>
                  </div>
                  <div className="border border-gray-200 rounded-2xl overflow-hidden bg-white max-w-md">
                    <div className="aspect-[2/1] bg-gray-100">
                      {ogImage ? (
                        <img
                          src={ogImage}
                          alt={seoOgImageAlt || 'Preview'}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400">
                          <Image size={48} />
                        </div>
                      )}
                    </div>
                    <div className="p-3 border-t border-gray-100">
                      <p className="font-medium text-gray-900 text-sm line-clamp-1">{ogTitle}</p>
                      <p className="text-gray-500 text-xs mt-0.5 line-clamp-2">{ogDescription}</p>
                      <p className="text-gray-400 text-xs mt-1">vilo.co.za</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Open Graph Info */}
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
                <h5 className="text-sm font-medium text-blue-800 mb-2">Open Graph Tags</h5>
                <p className="text-xs text-blue-700 mb-3">
                  These properties will be automatically set on your listing page for optimal social sharing:
                </p>
                <div className="text-xs font-mono text-blue-600 space-y-1">
                  <p>og:title = "{ogTitle}"</p>
                  <p>og:description = "{ogDescription.substring(0, 50)}..."</p>
                  <p>og:image = "{ogImage ? 'Your social image' : 'Cover image'}"</p>
                  <p>og:type = "website"</p>
                  <p>og:site_name = "Vilo"</p>
                  <p>twitter:card = "summary_large_image"</p>
                </div>
              </div>
            </div>
          </div>
        )

      default:
        return null
    }
  }

  // Mobile preview content
  const mobilePreviewContent = (
    <div className="space-y-4">
      {/* Preview Card */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
        <div className="aspect-[4/3] bg-gray-100 relative overflow-hidden">
          {coverImage ? (
            <img
              src={coverImage}
              alt="Property preview"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400">
              <p className="text-sm">No cover image</p>
            </div>
          )}
        </div>
        <div className="p-3">
          <h4 className="font-semibold text-gray-900 text-sm">
            {businessName || 'Your Property Name'}
          </h4>
          <p className="text-xs text-gray-500 mt-1">
            {city && regionName ? `${city}, ${regionName}` : 'Location not set'}
          </p>
          <div className="flex flex-wrap items-center gap-1.5 mt-2">
            {propertyType && (
              <span className="px-2 py-0.5 bg-gray-100 text-xs text-gray-600 rounded">
                {propertyType}
              </span>
            )}
            {propertyHighlights.slice(0, 2).map((h) => (
              <span key={h} className="px-2 py-0.5 bg-emerald-50 text-xs text-emerald-600 rounded">
                {h}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <DirectoryLayout
      activeSection={activeSection}
      onSectionChange={setActiveSection}
      getSectionStatus={getSectionStatus}
      completenessPercentage={totalPercentage}
      isSaving={isSaving}
      lastSaved={lastSaved}
      hasUnsavedChanges={hasUnsavedChanges}
      onSave={save}
      discoverable={discoverable}
      onToggleDiscoverable={setDiscoverable}
      tenantSlug={tenant?.slug || undefined}
      mobilePreviewContent={mobilePreviewContent}
      sidebar={
        <DirectorySidebar
          activeSection={activeSection}
          onSectionChange={setActiveSection}
          getSectionStatus={getSectionStatus}
          completenessPercentage={totalPercentage}
        />
      }
      preview={
        <DirectoryPreviewPanel
          coverImage={coverImage}
          businessName={businessName}
          city={city}
          regionName={regionName}
          propertyType={propertyType}
          propertyHighlights={propertyHighlights}
          incompleteItems={incompleteItems}
          onNavigateToSection={setActiveSection}
        />
      }
    >
      {/* Section Content with Animation */}
      <div className="min-h-[400px]">
        <div key={activeSection} className="animate-fade-in">
          {renderSectionContent()}
        </div>
      </div>

      {/* Message */}
      {directoryMessage && (
        <div
          className={`mt-6 p-4 rounded-lg text-sm ${
            directoryMessage.type === 'success'
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              : 'bg-red-50 text-red-700 border border-red-200'
          }`}
        >
          {directoryMessage.text}
        </div>
      )}
    </DirectoryLayout>
  )
}

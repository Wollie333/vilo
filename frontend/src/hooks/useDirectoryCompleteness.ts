import { useMemo } from 'react'

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

export interface DirectoryFormData {
  // Required fields
  propertyType: string
  countryId: string | null
  provinceId: string | null
  destinationId: string | null
  categorySlugs: string[]
  galleryImages: string[]
  coverImage: string
  directoryDescription: string

  // Optional fields
  formattedAddress: string
  latitude: number | null
  longitude: number | null
  checkInTime: string
  checkOutTime: string
  cancellationPolicies: CancellationPolicy[]
  propertyAmenities: string[]
  houseRules: string[]
  whatsIncluded: string[]
  propertyHighlights: string[]
  seasonalMessage: string
  specialOffers: SpecialOffer[]
  seoMetaTitle: string
  seoMetaDescription: string
  seoKeywords: string[]
  seoOgImage: string
  seoOgImageAlt: string
}

export type SectionStatus = 'complete' | 'partial' | 'empty'

export interface SectionInfo {
  id: string
  name: string
  group: 'essentials' | 'showcase' | 'details' | 'marketing'
  status: SectionStatus
  weight: number
  score: number
}

export function useDirectoryCompleteness(data: DirectoryFormData) {
  const sections = useMemo((): SectionInfo[] => {
    return [
      // Essentials Group
      {
        id: 'property-type',
        name: 'Property Type',
        group: 'essentials',
        weight: 10,
        ...getPropertyTypeStatus(data.propertyType)
      },
      {
        id: 'location',
        name: 'Location',
        group: 'essentials',
        weight: 15,
        ...getLocationStatus(data.countryId, data.provinceId, data.destinationId)
      },
      {
        id: 'categories',
        name: 'Categories',
        group: 'essentials',
        weight: 10,
        ...getCategoriesStatus(data.categorySlugs)
      },

      // Showcase Group
      {
        id: 'gallery',
        name: 'Gallery',
        group: 'showcase',
        weight: 20,
        ...getGalleryStatus(data.galleryImages, data.coverImage)
      },
      {
        id: 'description',
        name: 'Description',
        group: 'showcase',
        weight: 15,
        ...getDescriptionStatus(data.directoryDescription)
      },
      {
        id: 'highlights',
        name: 'Highlights',
        group: 'showcase',
        weight: 5,
        ...getHighlightsStatus(data.propertyHighlights)
      },

      // Details Group
      {
        id: 'times',
        name: 'Check-in/out',
        group: 'details',
        weight: 5,
        ...getTimesStatus(data.checkInTime, data.checkOutTime)
      },
      {
        id: 'cancellation',
        name: 'Cancellation',
        group: 'details',
        weight: 5,
        ...getCancellationStatus(data.cancellationPolicies)
      },
      {
        id: 'amenities',
        name: 'Amenities',
        group: 'details',
        weight: 5,
        ...getAmenitiesStatus(data.propertyAmenities)
      },
      {
        id: 'rules',
        name: 'House Rules',
        group: 'details',
        weight: 5,
        ...getRulesStatus(data.houseRules)
      },
      {
        id: 'included',
        name: "What's Included",
        group: 'details',
        weight: 5,
        ...getIncludedStatus(data.whatsIncluded)
      },

      // Marketing Group (optional, no weight)
      {
        id: 'marketing',
        name: 'Marketing',
        group: 'marketing',
        weight: 0,
        ...getMarketingStatus(data.seasonalMessage, data.specialOffers)
      },
      {
        id: 'seo',
        name: 'Profile SEO',
        group: 'marketing',
        weight: 0,
        ...getSeoStatus(data.seoMetaTitle, data.seoMetaDescription, data.seoKeywords, data.seoOgImage, data.seoOgImageAlt)
      }
    ]
  }, [data])

  const totalPercentage = useMemo(() => {
    const totalWeight = sections.reduce((sum, s) => sum + s.weight, 0)
    const totalScore = sections.reduce((sum, s) => sum + s.score, 0)
    return totalWeight > 0 ? Math.round((totalScore / totalWeight) * 100) : 0
  }, [sections])

  const incompleteItems = useMemo(() => {
    return sections
      .filter(s => s.status !== 'complete' && s.weight > 0)
      .map(s => ({ id: s.id, label: s.name, section: s.id }))
  }, [sections])

  const getSectionStatus = (sectionId: string): SectionStatus => {
    return sections.find(s => s.id === sectionId)?.status || 'empty'
  }

  return {
    sections,
    totalPercentage,
    incompleteItems,
    getSectionStatus
  }
}

// Helper functions for calculating status
function getPropertyTypeStatus(propertyType: string): { status: SectionStatus; score: number } {
  if (propertyType) {
    return { status: 'complete', score: 10 }
  }
  return { status: 'empty', score: 0 }
}

function getLocationStatus(
  countryId: string | null,
  provinceId: string | null,
  destinationId: string | null
): { status: SectionStatus; score: number } {
  const fields = [countryId, provinceId, destinationId].filter(Boolean).length
  if (fields === 3) return { status: 'complete', score: 15 }
  if (fields > 0) return { status: 'partial', score: fields * 5 }
  return { status: 'empty', score: 0 }
}

function getCategoriesStatus(categorySlugs: string[]): { status: SectionStatus; score: number } {
  if (categorySlugs.length >= 1) return { status: 'complete', score: 10 }
  return { status: 'empty', score: 0 }
}

function getGalleryStatus(galleryImages: string[], coverImage: string): { status: SectionStatus; score: number } {
  const imageCount = galleryImages.length
  const hasCover = !!coverImage

  if (imageCount >= 3 && hasCover) return { status: 'complete', score: 20 }
  if (imageCount > 0 || hasCover) {
    const score = Math.min(imageCount * 4, 16) + (hasCover ? 4 : 0)
    return { status: 'partial', score: Math.min(score, 18) }
  }
  return { status: 'empty', score: 0 }
}

function getDescriptionStatus(description: string): { status: SectionStatus; score: number } {
  const length = description.trim().length
  if (length >= 100) return { status: 'complete', score: 15 }
  if (length >= 50) return { status: 'partial', score: 10 }
  if (length > 0) return { status: 'partial', score: 5 }
  return { status: 'empty', score: 0 }
}

function getHighlightsStatus(highlights: string[]): { status: SectionStatus; score: number } {
  if (highlights.length >= 2) return { status: 'complete', score: 5 }
  if (highlights.length >= 1) return { status: 'partial', score: 3 }
  return { status: 'empty', score: 0 }
}

function getTimesStatus(checkIn: string, checkOut: string): { status: SectionStatus; score: number } {
  if (checkIn && checkOut) return { status: 'complete', score: 5 }
  if (checkIn || checkOut) return { status: 'partial', score: 2.5 }
  return { status: 'empty', score: 0 }
}

function getCancellationStatus(policies: CancellationPolicy[]): { status: SectionStatus; score: number } {
  if (policies.length >= 1) return { status: 'complete', score: 5 }
  return { status: 'empty', score: 0 }
}

function getAmenitiesStatus(amenities: string[]): { status: SectionStatus; score: number } {
  if (amenities.length >= 3) return { status: 'complete', score: 5 }
  if (amenities.length >= 1) return { status: 'partial', score: 3 }
  return { status: 'empty', score: 0 }
}

function getRulesStatus(rules: string[]): { status: SectionStatus; score: number } {
  if (rules.length >= 1) return { status: 'complete', score: 5 }
  return { status: 'empty', score: 0 }
}

function getIncludedStatus(included: string[]): { status: SectionStatus; score: number } {
  if (included.length >= 1) return { status: 'complete', score: 5 }
  return { status: 'empty', score: 0 }
}

function getMarketingStatus(seasonalMessage: string, offers: SpecialOffer[]): { status: SectionStatus; score: number } {
  const hasMessage = seasonalMessage.trim().length > 0
  const hasOffers = offers.length > 0

  if (hasMessage && hasOffers) return { status: 'complete', score: 0 }
  if (hasMessage || hasOffers) return { status: 'partial', score: 0 }
  return { status: 'empty', score: 0 }
}

function getSeoStatus(
  metaTitle: string,
  metaDescription: string,
  keywords: string[],
  ogImage: string,
  ogImageAlt: string
): { status: SectionStatus; score: number } {
  const hasTitle = metaTitle.trim().length > 0
  const hasDescription = metaDescription.trim().length > 0
  const hasKeywords = keywords.length > 0
  const hasOgImage = ogImage.trim().length > 0
  const hasOgImageAlt = ogImageAlt.trim().length > 0

  const filled = [hasTitle, hasDescription, hasKeywords, hasOgImage, hasOgImageAlt].filter(Boolean).length
  if (filled >= 4) return { status: 'complete', score: 0 }
  if (filled > 0) return { status: 'partial', score: 0 }
  return { status: 'empty', score: 0 }
}

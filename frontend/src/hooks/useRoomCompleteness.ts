import { useMemo } from 'react'
import type { SectionStatus, IncompleteItem } from '../components/form-layout/types'
import type { BedConfiguration, RoomImages, PricingMode } from '../services/api'

export interface RoomFormData {
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
  inventory_mode: 'single_unit' | 'room_type'
  total_units: number
  is_active: boolean
}

interface SectionInfo {
  id: string
  name: string
  group: string
  status: SectionStatus
  weight: number
  score: number
}

export function useRoomCompleteness(data: RoomFormData) {
  const sections = useMemo((): SectionInfo[] => {
    return [
      // Basics Group
      {
        id: 'details',
        name: 'Room Details',
        group: 'basics',
        weight: 20,
        ...getDetailsStatus(data.name, data.description)
      },
      {
        id: 'beds',
        name: 'Bed Configuration',
        group: 'basics',
        weight: 15,
        ...getBedsStatus(data.beds)
      },
      {
        id: 'amenities',
        name: 'Amenities',
        group: 'basics',
        weight: 10,
        ...getAmenitiesStatus(data.amenities)
      },

      // Media Group
      {
        id: 'images',
        name: 'Photos',
        group: 'media',
        weight: 15,
        ...getImagesStatus(data.images)
      },

      // Pricing Group
      {
        id: 'pricing-mode',
        name: 'Pricing Model',
        group: 'pricing',
        weight: 5,
        ...getPricingModeStatus(data.pricing_mode)
      },
      {
        id: 'base-price',
        name: 'Base Rates',
        group: 'pricing',
        weight: 20,
        ...getBasePriceStatus(data.base_price_per_night, data.pricing_mode, data.additional_person_rate)
      },
      {
        id: 'children-pricing',
        name: 'Children Pricing',
        group: 'pricing',
        weight: 0, // Optional
        ...getChildrenPricingStatus(data.child_age_limit)
      },

      // Rules Group
      {
        id: 'stay-limits',
        name: 'Stay Duration',
        group: 'rules',
        weight: 10,
        ...getStayLimitsStatus(data.min_stay_nights)
      },
      {
        id: 'inventory',
        name: 'Inventory',
        group: 'rules',
        weight: 5,
        ...getInventoryStatus(data.inventory_mode, data.total_units)
      }
    ]
  }, [data])

  const totalPercentage = useMemo(() => {
    const totalWeight = sections.reduce((sum, s) => sum + s.weight, 0)
    const totalScore = sections.reduce((sum, s) => sum + s.score, 0)
    return totalWeight > 0 ? Math.round((totalScore / totalWeight) * 100) : 0
  }, [sections])

  const incompleteItems = useMemo((): IncompleteItem[] => {
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
function getDetailsStatus(name: string, description: string): { status: SectionStatus; score: number } {
  const hasName = name.trim().length > 0
  const hasDescription = description.trim().length >= 20

  if (hasName && hasDescription) return { status: 'complete', score: 20 }
  if (hasName) return { status: 'partial', score: 15 }
  return { status: 'empty', score: 0 }
}

function getBedsStatus(beds: BedConfiguration[]): { status: SectionStatus; score: number } {
  if (beds.length > 0 && beds.some(b => b.quantity > 0)) {
    return { status: 'complete', score: 15 }
  }
  return { status: 'empty', score: 0 }
}

function getAmenitiesStatus(amenities: string[]): { status: SectionStatus; score: number } {
  if (amenities.length >= 3) return { status: 'complete', score: 10 }
  if (amenities.length >= 1) return { status: 'partial', score: 5 }
  return { status: 'empty', score: 0 }
}

function getImagesStatus(images: RoomImages): { status: SectionStatus; score: number } {
  const hasFeatured = !!images.featured
  const hasGallery = images.gallery && images.gallery.length > 0
  const galleryCount = images.gallery?.length || 0

  if (hasFeatured && galleryCount >= 2) return { status: 'complete', score: 15 }
  if (hasFeatured || hasGallery) return { status: 'partial', score: 8 }
  return { status: 'empty', score: 0 }
}

function getPricingModeStatus(_pricingMode: PricingMode): { status: SectionStatus; score: number } {
  // Always has a default value
  return { status: 'complete', score: 5 }
}

function getBasePriceStatus(
  basePrice: number,
  pricingMode: PricingMode,
  additionalPersonRate?: number
): { status: SectionStatus; score: number } {
  if (basePrice <= 0) return { status: 'empty', score: 0 }

  // For per_person_sharing, we also need additional person rate
  if (pricingMode === 'per_person_sharing') {
    if (additionalPersonRate && additionalPersonRate > 0) {
      return { status: 'complete', score: 20 }
    }
    return { status: 'partial', score: 10 }
  }

  return { status: 'complete', score: 20 }
}

function getChildrenPricingStatus(childAgeLimit?: number): { status: SectionStatus; score: number } {
  // This is optional, but if configured it's complete
  if (childAgeLimit !== undefined) return { status: 'complete', score: 0 }
  return { status: 'empty', score: 0 }
}

function getStayLimitsStatus(minStayNights: number): { status: SectionStatus; score: number } {
  if (minStayNights >= 1) return { status: 'complete', score: 10 }
  return { status: 'empty', score: 0 }
}

function getInventoryStatus(inventoryMode: 'single_unit' | 'room_type', totalUnits: number): { status: SectionStatus; score: number } {
  if (inventoryMode === 'room_type' && totalUnits < 1) {
    return { status: 'partial', score: 2 }
  }
  return { status: 'complete', score: 5 }
}

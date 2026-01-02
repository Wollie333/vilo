import { useMemo } from 'react'

interface DayHours {
  open: string
  close: string
  closed: boolean
}

export interface BusinessFormData {
  // Logo
  logoUrl: string

  // Basic Info
  businessName: string
  businessDescription: string

  // Address
  addressLine1: string
  addressLine2: string
  city: string
  stateProvince: string
  postalCode: string
  businessCountry: string

  // Tax
  vatNumber: string
  companyRegNumber: string

  // Contact
  businessEmail: string
  businessPhone: string
  websiteUrl: string

  // Hours
  businessHours: Record<string, DayHours>
}

export type SectionStatus = 'complete' | 'partial' | 'empty'

export interface SectionInfo {
  id: string
  name: string
  status: SectionStatus
  weight: number
  score: number
}

export function useBusinessCompleteness(data: BusinessFormData) {
  const sections = useMemo((): SectionInfo[] => {
    return [
      {
        id: 'logo',
        name: 'Logo',
        weight: 10,
        ...getLogoStatus(data.logoUrl)
      },
      {
        id: 'basic-info',
        name: 'Basic Info',
        weight: 25,
        ...getBasicInfoStatus(data.businessName, data.businessDescription)
      },
      {
        id: 'address',
        name: 'Address',
        weight: 20,
        ...getAddressStatus(data.addressLine1, data.city, data.stateProvince, data.postalCode, data.businessCountry)
      },
      {
        id: 'tax',
        name: 'Tax Info',
        weight: 10,
        ...getTaxStatus(data.vatNumber, data.companyRegNumber)
      },
      {
        id: 'contact',
        name: 'Contact',
        weight: 20,
        ...getContactStatus(data.businessEmail, data.businessPhone, data.websiteUrl)
      },
      {
        id: 'hours',
        name: 'Hours',
        weight: 15,
        ...getHoursStatus(data.businessHours)
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
      .filter(s => s.status !== 'complete')
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

// Helper functions
function getLogoStatus(logoUrl: string): { status: SectionStatus; score: number } {
  if (logoUrl) return { status: 'complete', score: 10 }
  return { status: 'empty', score: 0 }
}

function getBasicInfoStatus(name: string, description: string): { status: SectionStatus; score: number } {
  const hasName = name.trim().length > 0
  const hasDescription = description.trim().length >= 20

  if (hasName && hasDescription) return { status: 'complete', score: 25 }
  if (hasName) return { status: 'partial', score: 15 }
  return { status: 'empty', score: 0 }
}

function getAddressStatus(
  line1: string,
  city: string,
  state: string,
  postal: string,
  country: string
): { status: SectionStatus; score: number } {
  const fields = [line1, city, state, postal, country].filter(f => f.trim().length > 0).length
  if (fields >= 4) return { status: 'complete', score: 20 }
  if (fields >= 2) return { status: 'partial', score: 10 }
  if (fields >= 1) return { status: 'partial', score: 5 }
  return { status: 'empty', score: 0 }
}

function getTaxStatus(vat: string, regNumber: string): { status: SectionStatus; score: number } {
  // Tax info is optional, so we give partial score if any is filled
  const hasVat = vat.trim().length > 0
  const hasReg = regNumber.trim().length > 0

  if (hasVat && hasReg) return { status: 'complete', score: 10 }
  if (hasVat || hasReg) return { status: 'partial', score: 5 }
  // Empty is ok for tax, still give some score
  return { status: 'empty', score: 0 }
}

function getContactStatus(email: string, phone: string, website: string): { status: SectionStatus; score: number } {
  const hasEmail = email.trim().length > 0 && email.includes('@')
  const hasPhone = phone.trim().length >= 5
  const hasWebsite = website.trim().length > 0

  const filled = [hasEmail, hasPhone, hasWebsite].filter(Boolean).length
  if (filled >= 2) return { status: 'complete', score: 20 }
  if (filled >= 1) return { status: 'partial', score: 10 }
  return { status: 'empty', score: 0 }
}

function getHoursStatus(hours: Record<string, DayHours>): { status: SectionStatus; score: number } {
  if (!hours || Object.keys(hours).length === 0) return { status: 'empty', score: 0 }

  // Check if any day has been configured
  const daysConfigured = Object.values(hours).filter(h => h.open || h.close || h.closed).length
  if (daysConfigured >= 5) return { status: 'complete', score: 15 }
  if (daysConfigured >= 1) return { status: 'partial', score: 8 }
  return { status: 'empty', score: 0 }
}

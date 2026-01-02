import { useMemo } from 'react'
import type { SectionStatus, IncompleteItem } from '../components/form-layout/types'

export interface BookingFormData {
  guest_name: string
  guest_email: string
  guest_phone: string
  adults: number
  children: number
  children_ages: number[]
  room_id: string
  room_name: string
  check_in: string
  check_out: string
  status: string
  payment_status: string
  total_amount: number
  currency: string
  notes: string
  override_rules: boolean
}

interface SectionInfo {
  id: string
  name: string
  group: string
  status: SectionStatus
  weight: number
  score: number
}

export function useBookingCompleteness(data: BookingFormData) {
  const sections = useMemo((): SectionInfo[] => {
    return [
      // Reservation Group
      {
        id: 'room-selection',
        name: 'Room',
        group: 'reservation',
        weight: 25,
        ...getRoomStatus(data.room_id)
      },
      {
        id: 'dates',
        name: 'Dates',
        group: 'reservation',
        weight: 25,
        ...getDatesStatus(data.check_in, data.check_out)
      },

      // Guest Details Group
      {
        id: 'contact',
        name: 'Contact Info',
        group: 'guest',
        weight: 20,
        ...getContactStatus(data.guest_name, data.guest_email)
      },
      {
        id: 'guests-count',
        name: 'Guests',
        group: 'guest',
        weight: 10,
        ...getGuestsStatus(data.adults)
      },
      {
        id: 'requests',
        name: 'Special Requests',
        group: 'guest',
        weight: 0, // Optional
        ...getRequestsStatus(data.notes)
      },

      // Payment Group
      {
        id: 'pricing',
        name: 'Pricing',
        group: 'payment',
        weight: 15,
        ...getPricingStatus(data.total_amount)
      },
      {
        id: 'addons',
        name: 'Add-ons',
        group: 'payment',
        weight: 0, // Optional
        status: 'complete' as SectionStatus,
        score: 0
      },
      {
        id: 'status',
        name: 'Status',
        group: 'payment',
        weight: 5,
        ...getBookingStatusStatus(data.status)
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

// Helper functions
function getRoomStatus(roomId: string): { status: SectionStatus; score: number } {
  if (roomId) return { status: 'complete', score: 25 }
  return { status: 'empty', score: 0 }
}

function getDatesStatus(checkIn: string, checkOut: string): { status: SectionStatus; score: number } {
  if (checkIn && checkOut) return { status: 'complete', score: 25 }
  if (checkIn || checkOut) return { status: 'partial', score: 12 }
  return { status: 'empty', score: 0 }
}

function getContactStatus(guestName: string, guestEmail: string): { status: SectionStatus; score: number } {
  const hasName = guestName.trim().length > 0
  const hasEmail = guestEmail.trim().length > 0

  if (hasName && hasEmail) return { status: 'complete', score: 20 }
  if (hasName) return { status: 'partial', score: 15 }
  return { status: 'empty', score: 0 }
}

function getGuestsStatus(adults: number): { status: SectionStatus; score: number } {
  if (adults >= 1) return { status: 'complete', score: 10 }
  return { status: 'empty', score: 0 }
}

function getRequestsStatus(notes: string): { status: SectionStatus; score: number } {
  // Optional field, always complete
  if (notes.trim().length > 0) return { status: 'complete', score: 0 }
  return { status: 'empty', score: 0 }
}

function getPricingStatus(totalAmount: number): { status: SectionStatus; score: number } {
  if (totalAmount > 0) return { status: 'complete', score: 15 }
  return { status: 'partial', score: 5 } // Partial because amount can be calculated
}

function getBookingStatusStatus(_status: string): { status: SectionStatus; score: number } {
  // Always has a default value
  return { status: 'complete', score: 5 }
}

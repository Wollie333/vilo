import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { roomsApi, Room, publicReviewsApi, PublicReview, ReviewStats } from '../services/api'

export interface HomeData {
  rooms: Room[]
  reviews: PublicReview[]
  propertyStats: ReviewStats | null
  roomStats: Record<string, ReviewStats>
  loading: boolean
  error: string | null
}

export function useHomeData(): HomeData {
  const { tenant } = useAuth()
  const [rooms, setRooms] = useState<Room[]>([])
  const [reviews, setReviews] = useState<PublicReview[]>([])
  const [propertyStats, setPropertyStats] = useState<ReviewStats | null>(null)
  const [roomStats, setRoomStats] = useState<Record<string, ReviewStats>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const tenantId = tenant?.id || ''

  // Load rooms
  useEffect(() => {
    async function loadRooms() {
      if (!tenantId) return

      try {
        const data = await roomsApi.getAll({ is_active: true })
        setRooms(data)
      } catch (err) {
        console.error('Failed to load rooms:', err)
        setError('Failed to load rooms')
      }
    }

    loadRooms()
  }, [tenantId])

  // Load reviews and stats
  useEffect(() => {
    async function loadReviews() {
      if (!tenantId) return

      try {
        const [reviewsData, statsData] = await Promise.all([
          publicReviewsApi.getPropertyReviews(tenantId, 10),
          publicReviewsApi.getPropertyStats(tenantId)
        ])
        setReviews(reviewsData)
        setPropertyStats(statsData)
      } catch (err) {
        console.error('Failed to load reviews:', err)
      }
    }

    loadReviews()
  }, [tenantId])

  // Load room stats
  useEffect(() => {
    async function loadRoomStats() {
      if (!tenantId || rooms.length === 0) return

      const stats: Record<string, ReviewStats> = {}

      await Promise.all(
        rooms.map(async (room) => {
          try {
            if (room.room_code) {
              const roomStat = await publicReviewsApi.getRoomStatsByCode(tenantId, room.room_code)
              stats[room.id || room.room_code] = roomStat
            } else if (room.id) {
              const roomStat = await publicReviewsApi.getRoomStats(tenantId, room.id)
              stats[room.id] = roomStat
            }
          } catch {
            // Silently ignore
          }
        })
      )

      setRoomStats(stats)
      setLoading(false)
    }

    loadRoomStats()
  }, [tenantId, rooms])

  return {
    rooms,
    reviews,
    propertyStats,
    roomStats,
    loading,
    error,
  }
}

// Utility functions for home templates
export function formatCurrency(amount: number | undefined | null, currency: string | undefined | null): string {
  const safeAmount = amount ?? 0
  const safeCurrency = currency || 'ZAR'
  return new Intl.NumberFormat('en-ZA', {
    style: 'currency',
    currency: safeCurrency,
    minimumFractionDigits: 0,
  }).format(safeAmount)
}

export function getRoomLink(room: Room): string {
  return `/accommodation/${room.room_code || room.id}`
}

export function getTomorrowDate(): string {
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  return tomorrow.toISOString().split('T')[0]
}

export function getDayAfterTomorrow(): string {
  const dayAfter = new Date()
  dayAfter.setDate(dayAfter.getDate() + 2)
  return dayAfter.toISOString().split('T')[0]
}

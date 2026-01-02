import { useState, useCallback } from 'react'

export interface AnalyticsSections {
  executiveSummary: boolean    // Default: true
  revenueIntelligence: boolean // Default: true
  bookingAnalytics: boolean    // Default: true
  trafficEngagement: boolean   // Default: true
  roomPerformance: boolean     // Default: true
  refundAnalytics: boolean     // Default: true
  reports: boolean             // Default: true
}

const STORAGE_KEY = 'vilo_analytics_sections'

const defaultSections: AnalyticsSections = {
  executiveSummary: true,
  revenueIntelligence: true,
  bookingAnalytics: true,
  trafficEngagement: true,
  roomPerformance: true,
  refundAnalytics: true,
  reports: true,
}

export function useAnalyticsSectionPreferences() {
  const [sections, setSections] = useState<AnalyticsSections>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        return {
          ...defaultSections,
          ...parsed,
        }
      }
    } catch (e) {
      console.error('Failed to parse analytics section preferences:', e)
    }
    return defaultSections
  })

  const toggleSection = useCallback((key: keyof AnalyticsSections) => {
    setSections(prev => {
      const updated = { ...prev, [key]: !prev[key] }
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
      } catch (e) {
        console.error('Failed to save analytics section preferences:', e)
      }
      return updated
    })
  }, [])

  const resetToDefaults = useCallback(() => {
    setSections(defaultSections)
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch (e) {
      console.error('Failed to reset analytics section preferences:', e)
    }
  }, [])

  const showAllSections = useCallback(() => {
    const allEnabled = Object.keys(defaultSections).reduce(
      (acc, key) => ({ ...acc, [key]: true }),
      {} as AnalyticsSections
    )
    setSections(allEnabled)
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(allEnabled))
    } catch (e) {
      console.error('Failed to save analytics section preferences:', e)
    }
  }, [])

  const hideAllSections = useCallback(() => {
    const allDisabled = Object.keys(defaultSections).reduce(
      (acc, key) => ({ ...acc, [key]: false }),
      {} as AnalyticsSections
    )
    setSections(allDisabled)
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(allDisabled))
    } catch (e) {
      console.error('Failed to save analytics section preferences:', e)
    }
  }, [])

  const enabledCount = Object.values(sections).filter(Boolean).length
  const totalCount = Object.keys(sections).length

  return {
    sections,
    toggleSection,
    resetToDefaults,
    showAllSections,
    hideAllSections,
    enabledCount,
    totalCount,
  }
}

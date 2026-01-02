import { useState, useCallback } from 'react'

export interface AdminAnalyticsSections {
  saasMetrics: boolean           // Default: true
  growthAcquisition: boolean     // Default: true
  platformStats: boolean         // Default: true
  customerData: boolean          // Default: true
  teamMetrics: boolean           // Default: true
  engagement: boolean            // Default: true
}

const STORAGE_KEY = 'vilo_admin_analytics_sections'

const defaultSections: AdminAnalyticsSections = {
  saasMetrics: true,
  growthAcquisition: true,
  platformStats: true,
  customerData: true,
  teamMetrics: true,
  engagement: true,
}

export function useAdminAnalyticsSectionPreferences() {
  const [sections, setSections] = useState<AdminAnalyticsSections>(() => {
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
      console.error('Failed to parse admin analytics section preferences:', e)
    }
    return defaultSections
  })

  const toggleSection = useCallback((key: keyof AdminAnalyticsSections) => {
    setSections(prev => {
      const updated = { ...prev, [key]: !prev[key] }
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
      } catch (e) {
        console.error('Failed to save admin analytics section preferences:', e)
      }
      return updated
    })
  }, [])

  const resetToDefaults = useCallback(() => {
    setSections(defaultSections)
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch (e) {
      console.error('Failed to reset admin analytics section preferences:', e)
    }
  }, [])

  const showAllSections = useCallback(() => {
    const allEnabled = Object.keys(defaultSections).reduce(
      (acc, key) => ({ ...acc, [key]: true }),
      {} as AdminAnalyticsSections
    )
    setSections(allEnabled)
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(allEnabled))
    } catch (e) {
      console.error('Failed to save admin analytics section preferences:', e)
    }
  }, [])

  const hideAllSections = useCallback(() => {
    const allDisabled = Object.keys(defaultSections).reduce(
      (acc, key) => ({ ...acc, [key]: false }),
      {} as AdminAnalyticsSections
    )
    setSections(allDisabled)
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(allDisabled))
    } catch (e) {
      console.error('Failed to save admin analytics section preferences:', e)
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

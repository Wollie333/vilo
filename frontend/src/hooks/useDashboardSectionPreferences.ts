import { useState, useCallback } from 'react'

export interface DashboardSections {
  executiveSummary: boolean    // Hero KPIs with sparklines
  revenueIntelligence: boolean // MRR, revenue by plan, top customers
  customerLifecycle: boolean   // LTV, cohort, health distribution
  growthEngine: boolean        // Funnel, acquisition sources
  churnRisk: boolean           // Churn analysis, at-risk list
  platformHealth: boolean      // API, storage, GMV, bookings
}

const STORAGE_KEY = 'vilo_admin_dashboard_sections'

const defaultSections: DashboardSections = {
  executiveSummary: true,
  revenueIntelligence: true,
  customerLifecycle: true,
  growthEngine: true,
  churnRisk: true,
  platformHealth: true,
}

export function useDashboardSectionPreferences() {
  const [sections, setSections] = useState<DashboardSections>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        // Merge with defaults to ensure all keys exist
        return {
          ...defaultSections,
          ...parsed,
        }
      }
    } catch (e) {
      console.error('Failed to parse dashboard section preferences:', e)
    }
    return defaultSections
  })

  const toggleSection = useCallback((key: keyof DashboardSections) => {
    setSections(prev => {
      const updated = { ...prev, [key]: !prev[key] }
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
      } catch (e) {
        console.error('Failed to save dashboard section preferences:', e)
      }
      return updated
    })
  }, [])

  const setSection = useCallback((key: keyof DashboardSections, value: boolean) => {
    setSections(prev => {
      const updated = { ...prev, [key]: value }
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
      } catch (e) {
        console.error('Failed to save dashboard section preferences:', e)
      }
      return updated
    })
  }, [])

  const resetToDefaults = useCallback(() => {
    setSections(defaultSections)
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch (e) {
      console.error('Failed to reset dashboard section preferences:', e)
    }
  }, [])

  const showAllSections = useCallback(() => {
    const allEnabled = Object.keys(defaultSections).reduce((acc, key) => {
      acc[key as keyof DashboardSections] = true
      return acc
    }, {} as DashboardSections)
    setSections(allEnabled)
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(allEnabled))
    } catch (e) {
      console.error('Failed to save dashboard section preferences:', e)
    }
  }, [])

  const hideAllSections = useCallback(() => {
    const allDisabled = Object.keys(defaultSections).reduce((acc, key) => {
      acc[key as keyof DashboardSections] = false
      return acc
    }, {} as DashboardSections)
    setSections(allDisabled)
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(allDisabled))
    } catch (e) {
      console.error('Failed to save dashboard section preferences:', e)
    }
  }, [])

  // Count of enabled sections
  const enabledCount = Object.values(sections).filter(Boolean).length
  const totalCount = Object.keys(sections).length

  return {
    sections,
    toggleSection,
    setSection,
    resetToDefaults,
    showAllSections,
    hideAllSections,
    enabledCount,
    totalCount,
    defaultSections,
  }
}

export type { DashboardSections as SectionPreferences }

import { useEffect, useLayoutEffect } from 'react'
import { useLocation } from 'react-router-dom'

export default function ScrollToTop() {
  const { pathname } = useLocation()

  // Use useLayoutEffect to scroll before browser paints
  // This ensures scroll happens immediately on navigation/refresh
  useLayoutEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
  }, [pathname])

  // Also scroll on initial mount (page refresh)
  useEffect(() => {
    // Small delay to ensure DOM is ready after refresh
    const timer = setTimeout(() => {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
    }, 0)
    return () => clearTimeout(timer)
  }, [])

  return null
}

// Utility function for use in wizards/forms when changing steps
export const scrollToTop = () => {
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

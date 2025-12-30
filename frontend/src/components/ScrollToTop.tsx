import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

export default function ScrollToTop() {
  const { pathname } = useLocation()

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])

  return null
}

// Utility function for use in wizards/forms when changing steps
export const scrollToTop = () => {
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

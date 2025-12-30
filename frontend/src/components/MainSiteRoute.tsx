import { Outlet } from 'react-router-dom'
import { useTenant } from '../contexts/TenantContext'
import LandingPage from '../pages/landing/LandingPage'

/**
 * Wrapper for public routes that shows:
 * - Landing page on main site (vilo.io)
 * - PublicLayout with Outlet on tenant sites (subdomains/custom domains)
 */
export default function MainSiteRoute() {
  const { isMainSite, loading } = useTenant()

  // Show loading state while detecting tenant
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    )
  }

  // Main site (vilo.io) - show landing page
  if (isMainSite) {
    return <LandingPage />
  }

  // Tenant site (subdomain/custom domain) - render the child routes via Outlet
  return <Outlet />
}

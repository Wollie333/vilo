import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'
import { Menu, X, Phone, Mail, MapPin, Loader2 } from 'lucide-react'
import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useTenant } from '../contexts/TenantContext'

export default function PublicLayout() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()
  const { tenant: authTenant } = useAuth()

  // Try TenantContext first (for subdomain/query param), fall back to AuthContext (admin preview)
  const { tenant: publicTenant, loading: tenantLoading, error: tenantError, isMainSite } = useTenant()
  const tenant = publicTenant || authTenant

  const handleBookNow = () => {
    const params = new URLSearchParams()
    if (tenant?.id) {
      params.set('property', tenant.id)
    }
    navigate(`/book${params.toString() ? `?${params.toString()}` : ''}`)
  }

  const navLinks = [
    { path: '/', label: 'Home' },
    { path: '/accommodation', label: 'Accommodation' },
    { path: '/reviews', label: 'Reviews' },
    { path: '/contact', label: 'Contact' },
  ]

  const isActive = (path: string) => location.pathname === path

  // Show loading while fetching tenant
  if (tenantLoading && !isMainSite) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <Loader2 className="animate-spin text-gray-400" size={40} />
      </div>
    )
  }

  // Show error if tenant not found (and not main site)
  if (tenantError && !isMainSite && !tenant) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Property Not Found</h1>
          <p className="text-gray-600 mb-4">{tenantError}</p>
          <a href="https://vilo.io" className="text-blue-600 hover:underline">
            Go to Vilo.io
          </a>
        </div>
      </div>
    )
  }

  // Get tenant name for display
  const businessName = tenant?.business_name || 'Vilo Guest House'

  return (
    <div className="min-h-screen flex flex-col bg-white">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            {/* Logo */}
            <Link to="/" className="flex items-center">
              {tenant?.logo_url ? (
                <img src={tenant.logo_url} alt={businessName} className="h-10 w-auto" />
              ) : (
                <span className="text-2xl font-bold text-gray-900">{businessName}</span>
              )}
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center space-x-8">
              {navLinks.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`text-sm font-medium transition-colors ${
                    isActive(link.path)
                      ? 'text-gray-900'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {link.label}
                </Link>
              ))}
              <button
                onClick={handleBookNow}
                className="bg-gray-900 text-white px-5 py-2.5 rounded-md text-sm font-medium hover:bg-gray-800 transition-colors"
              >
                Book Now
              </button>
            </nav>

            {/* Mobile menu button */}
            <button
              className="md:hidden p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-gray-100 bg-white">
            <nav className="px-4 py-4 space-y-3">
              {navLinks.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`block px-3 py-2 rounded-md text-base font-medium ${
                    isActive(link.path)
                      ? 'bg-gray-100 text-gray-900'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  {link.label}
                </Link>
              ))}
              <button
                onClick={() => {
                  setMobileMenuOpen(false)
                  handleBookNow()
                }}
                className="block w-full bg-gray-900 text-white px-3 py-2 rounded-md text-base font-medium text-center hover:bg-gray-800"
              >
                Book Now
              </button>
            </nav>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="flex-1">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {/* Brand */}
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center mb-4">
                {tenant?.logo_url ? (
                  <img src={tenant.logo_url} alt={businessName} className="h-10 w-auto brightness-0 invert" />
                ) : (
                  <span className="text-2xl font-bold text-white">{businessName}</span>
                )}
              </div>
              <p className="text-gray-400 text-sm leading-relaxed max-w-md">
                {tenant?.business_description || 'Experience comfort and hospitality at its finest. Our guest house offers a peaceful retreat with modern amenities and personalized service.'}
              </p>
            </div>

            {/* Quick Links */}
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wider mb-4">
                Quick Links
              </h3>
              <ul className="space-y-2">
                {navLinks.map((link) => (
                  <li key={link.path}>
                    <Link
                      to={link.path}
                      className="text-gray-400 hover:text-white text-sm transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Contact Info */}
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wider mb-4">
                Contact Us
              </h3>
              <ul className="space-y-3">
                {(tenant?.address_line1 || tenant?.city) && (
                  <li className="flex items-start gap-3 text-gray-400 text-sm">
                    <MapPin size={16} className="mt-0.5 flex-shrink-0" />
                    <span>
                      {tenant.address_line1 && <>{tenant.address_line1}<br /></>}
                      {[tenant.city, tenant.state_province, tenant.country].filter(Boolean).join(', ')}
                    </span>
                  </li>
                )}
                {tenant?.business_phone && (
                  <li className="flex items-center gap-3 text-gray-400 text-sm">
                    <Phone size={16} className="flex-shrink-0" />
                    <a href={`tel:${tenant.business_phone}`} className="hover:text-white transition-colors">
                      {tenant.business_phone}
                    </a>
                  </li>
                )}
                {tenant?.business_email && (
                  <li className="flex items-center gap-3 text-gray-400 text-sm">
                    <Mail size={16} className="flex-shrink-0" />
                    <a href={`mailto:${tenant.business_email}`} className="hover:text-white transition-colors">
                      {tenant.business_email}
                    </a>
                  </li>
                )}
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-800 mt-10 pt-8 text-center text-gray-500 text-sm">
            <p>&copy; {new Date().getFullYear()} {businessName}. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}

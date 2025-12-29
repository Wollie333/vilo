import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'
import { Menu, X, Phone, Mail, MapPin } from 'lucide-react'
import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'

export default function PublicLayout() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()
  const { tenant } = useAuth()

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
    { path: '/contact', label: 'Contact' },
  ]

  const isActive = (path: string) => location.pathname === path

  return (
    <div className="min-h-screen flex flex-col bg-white">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            {/* Logo */}
            <Link to="/" className="flex items-center">
              <span className="text-2xl font-bold text-gray-900">Vilo</span>
              <span className="text-2xl font-light text-gray-500 ml-1">Guest House</span>
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
                <span className="text-2xl font-bold text-white">Vilo</span>
                <span className="text-2xl font-light text-gray-400 ml-1">Guest House</span>
              </div>
              <p className="text-gray-400 text-sm leading-relaxed max-w-md">
                Experience comfort and hospitality at its finest. Our guest house offers a
                peaceful retreat with modern amenities and personalized service.
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
                <li className="flex items-start gap-3 text-gray-400 text-sm">
                  <MapPin size={16} className="mt-0.5 flex-shrink-0" />
                  <span>123 Guest House Street<br />Pretoria, South Africa</span>
                </li>
                <li className="flex items-center gap-3 text-gray-400 text-sm">
                  <Phone size={16} className="flex-shrink-0" />
                  <a href="tel:+27123456789" className="hover:text-white transition-colors">
                    +27 12 345 6789
                  </a>
                </li>
                <li className="flex items-center gap-3 text-gray-400 text-sm">
                  <Mail size={16} className="flex-shrink-0" />
                  <a href="mailto:info@viloguesthouse.com" className="hover:text-white transition-colors">
                    info@viloguesthouse.com
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-800 mt-10 pt-8 text-center text-gray-500 text-sm">
            <p>&copy; {new Date().getFullYear()} Vilo Guest House. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}

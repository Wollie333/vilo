import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Menu, X, ChevronDown, MapPin, Compass, Tag } from 'lucide-react'
import * as LucideIcons from 'lucide-react'
import { discoveryApi, CategoriesGrouped, Province } from '../../services/discoveryApi'

export default function DiscoveryHeader() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [categories, setCategories] = useState<CategoriesGrouped | null>(null)
  const [provinces, setProvinces] = useState<Province[]>([])

  useEffect(() => {
    // Fetch categories and provinces for navigation
    const fetchData = async () => {
      try {
        const [categoriesData, provincesData] = await Promise.all([
          discoveryApi.getCategories(),
          discoveryApi.getProvinces()
        ])
        setCategories(categoriesData)
        setProvinces(provincesData.slice(0, 6)) // Top 6 provinces
      } catch (err) {
        console.error('Error fetching navigation data:', err)
      }
    }
    fetchData()
  }, [])

  // Get the icon component dynamically
  const getIcon = (iconName?: string) => {
    if (!iconName) return null
    const IconComponent = (LucideIcons as unknown as Record<string, React.ComponentType<{ className?: string; size?: number }>>)[iconName]
    return IconComponent ? <IconComponent size={16} /> : null
  }

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-gray-100">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">V</span>
            </div>
            <span className="text-xl font-bold text-gray-900">Vilo</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-6">
            {/* Destinations Dropdown */}
            <div className="relative group">
              <button className="flex items-center gap-1 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors py-2">
                <MapPin className="w-4 h-4" />
                Destinations
                <ChevronDown className="w-4 h-4" />
              </button>
              <div className="absolute top-full left-0 mt-1 w-56 bg-white rounded-lg shadow-lg border border-gray-100 py-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
                <div className="px-3 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wide">
                  Popular Provinces
                </div>
                {provinces.map(province => (
                  <Link
                    key={province.id}
                    to={`/provinces/${province.slug}`}
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    {province.name}
                    {province.propertyCount != null && province.propertyCount > 0 && (
                      <span className="ml-2 text-xs text-gray-400">({province.propertyCount})</span>
                    )}
                  </Link>
                ))}
                <div className="border-t border-gray-100 mt-2 pt-2">
                  <Link to="/search" className="block px-4 py-2 text-sm text-emerald-600 font-medium hover:bg-emerald-50">
                    View All Destinations
                  </Link>
                </div>
              </div>
            </div>

            {/* Categories Dropdown */}
            <div className="relative group">
              <button className="flex items-center gap-1 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors py-2">
                <Compass className="w-4 h-4" />
                Categories
                <ChevronDown className="w-4 h-4" />
              </button>
              <div className="absolute top-full left-0 mt-1 w-72 bg-white rounded-lg shadow-lg border border-gray-100 py-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
                {categories && (
                  <>
                    <div className="px-3 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wide flex items-center gap-1">
                      <Compass size={12} />
                      Experiences
                    </div>
                    <div className="grid grid-cols-2 gap-1 px-2 pb-2">
                      {categories.experience.slice(0, 6).map(cat => (
                        <Link
                          key={cat.id}
                          to={`/categories/${cat.slug}`}
                          className="flex items-center gap-2 px-2 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded"
                        >
                          <span className="text-gray-400">{cat.icon && getIcon(cat.icon)}</span>
                          {cat.name}
                        </Link>
                      ))}
                    </div>
                    <div className="border-t border-gray-100 my-2" />
                    <div className="px-3 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wide flex items-center gap-1">
                      <Tag size={12} />
                      Trip Types
                    </div>
                    <div className="grid grid-cols-2 gap-1 px-2 pb-2">
                      {categories.trip_type.slice(0, 6).map(cat => (
                        <Link
                          key={cat.id}
                          to={`/categories/${cat.slug}`}
                          className="flex items-center gap-2 px-2 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded"
                        >
                          <span className="text-gray-400">{cat.icon && getIcon(cat.icon)}</span>
                          {cat.name}
                        </Link>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>

            <Link to="/search" className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">
              Browse All
            </Link>
          </div>

          {/* Right Side CTAs */}
          <div className="flex items-center gap-3">
            <Link
              to="/for-hosts"
              className="hidden sm:block text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
            >
              List Your Property
            </Link>
            <Link
              to="/login"
              className="hidden sm:block text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
            >
              Sign In
            </Link>
            <Link
              to="/search"
              className="bg-black text-white px-4 py-2 rounded-full hover:bg-gray-800 transition-colors text-sm font-medium"
            >
              Search
            </Link>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-gray-600 hover:text-gray-900"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-t border-gray-100 px-4 py-4 max-h-[80vh] overflow-y-auto">
          <div className="space-y-1">
            <Link
              to="/search"
              className="block py-3 text-gray-900 font-medium border-b border-gray-100"
              onClick={() => setMobileMenuOpen(false)}
            >
              Browse All
            </Link>

            {/* Mobile Destinations */}
            <div className="py-2">
              <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2 flex items-center gap-1">
                <MapPin size={12} />
                Destinations
              </div>
              {provinces.map(province => (
                <Link
                  key={province.id}
                  to={`/provinces/${province.slug}`}
                  className="block py-2 text-gray-600 hover:text-gray-900"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {province.name}
                </Link>
              ))}
            </div>

            {/* Mobile Categories */}
            {categories && (
              <div className="py-2 border-t border-gray-100">
                <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2 flex items-center gap-1">
                  <Compass size={12} />
                  Experiences
                </div>
                {categories.experience.slice(0, 4).map(cat => (
                  <Link
                    key={cat.id}
                    to={`/categories/${cat.slug}`}
                    className="flex items-center gap-2 py-2 text-gray-600 hover:text-gray-900"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <span className="text-gray-400">{cat.icon && getIcon(cat.icon)}</span>
                    {cat.name}
                  </Link>
                ))}
                <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2 mt-3 flex items-center gap-1">
                  <Tag size={12} />
                  Trip Types
                </div>
                {categories.trip_type.slice(0, 4).map(cat => (
                  <Link
                    key={cat.id}
                    to={`/categories/${cat.slug}`}
                    className="flex items-center gap-2 py-2 text-gray-600 hover:text-gray-900"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <span className="text-gray-400">{cat.icon && getIcon(cat.icon)}</span>
                    {cat.name}
                  </Link>
                ))}
              </div>
            )}

            <hr className="my-3" />
            <Link
              to="/for-hosts"
              className="block py-2 text-gray-900 font-medium"
              onClick={() => setMobileMenuOpen(false)}
            >
              List Your Property
            </Link>
            <Link
              to="/login"
              className="block py-2 text-gray-600"
              onClick={() => setMobileMenuOpen(false)}
            >
              Sign In
            </Link>
          </div>
        </div>
      )}
    </header>
  )
}

import { Link, useLocation } from 'react-router-dom'
import { useState } from 'react'
import {
  LayoutDashboard,
  Calendar,
  CalendarDays,
  Star,
  Plus,
  Settings,
  BedDouble,
  Users,
  Headphones,
  Building2,
  ChevronDown,
  FileText,
  Globe,
  CreditCard,
  BarChart3,
  RotateCcw
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Support', href: '/dashboard/support', icon: Headphones },
]

const bookingsSubItems = [
  { name: 'All Bookings', href: '/dashboard/bookings', icon: Calendar },
  { name: 'Refunds', href: '/dashboard/refunds', icon: RotateCcw },
  { name: 'Calendar', href: '/dashboard/calendar', icon: CalendarDays },
  { name: 'Customers', href: '/dashboard/customers', icon: Users },
  { name: 'Reviews', href: '/dashboard/reviews', icon: Star },
]

const roomsSubItems = [
  { name: 'All Rooms', href: '/dashboard/rooms', icon: BedDouble },
  { name: 'Add-ons', href: '/dashboard/addons', icon: Plus },
]

const businessSubItems = [
  { name: 'Business Details', href: '/dashboard/business/details', icon: FileText },
  { name: 'Directory', href: '/dashboard/business/directory', icon: Globe },
  { name: 'Payment Integration', href: '/dashboard/business/payments', icon: CreditCard },
]

// Analytics is now a single unified page - no sub-items needed

export default function Sidebar() {
  const location = useLocation()
  const { tenant } = useAuth()
  const [bookingsExpanded, setBookingsExpanded] = useState(
    location.pathname.startsWith('/dashboard/bookings') ||
    location.pathname.startsWith('/dashboard/refunds') ||
    location.pathname.startsWith('/dashboard/calendar') ||
    location.pathname.startsWith('/dashboard/customers') ||
    location.pathname.startsWith('/dashboard/reviews')
  )
  const [roomsExpanded, setRoomsExpanded] = useState(
    location.pathname.startsWith('/dashboard/rooms') || location.pathname.startsWith('/dashboard/addons')
  )
  const [myBusinessExpanded, setMyBusinessExpanded] = useState(
    location.pathname.startsWith('/dashboard/business')
  )

  return (
    <div className="w-64 bg-white border-r border-gray-100 flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-gray-100">
        <Link to="/dashboard" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">V</span>
          </div>
          <div>
            <span className="text-xl font-bold text-gray-900">Vilo</span>
            <p className="text-xs text-gray-500">{tenant?.business_name || 'Dashboard'}</p>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        {/* Dashboard link */}
        <Link
          to="/dashboard"
          className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
            location.pathname === '/dashboard'
              ? 'bg-accent-50 text-accent-700 font-medium'
              : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
          }`}
        >
          <LayoutDashboard size={18} className={location.pathname === '/dashboard' ? 'text-accent-600' : ''} />
          <span className="text-sm">Dashboard</span>
        </Link>

        {/* My Business expandable dropdown */}
        <div>
          <button
            onClick={() => setMyBusinessExpanded(!myBusinessExpanded)}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg transition-all ${
              location.pathname.startsWith('/dashboard/business')
                ? 'bg-accent-50 text-accent-700 font-medium'
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
            }`}
          >
            <div className="flex items-center gap-3">
              <Building2 size={18} className={location.pathname.startsWith('/dashboard/business') ? 'text-accent-600' : ''} />
              <span className="text-sm">My Business</span>
            </div>
            <ChevronDown
              size={16}
              className={`transition-transform duration-200 ${myBusinessExpanded ? 'rotate-180' : ''}`}
            />
          </button>

          {myBusinessExpanded && (
            <div className="ml-6 mt-1 space-y-1">
              {businessSubItems.map((item) => {
                const isActive = location.pathname === item.href
                const Icon = item.icon
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-all ${
                      isActive
                        ? 'bg-accent-50 text-accent-700 font-medium'
                        : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                  >
                    <Icon size={16} className={isActive ? 'text-accent-600' : ''} />
                    <span className="text-sm">{item.name}</span>
                  </Link>
                )
              })}
            </div>
          )}
        </div>

        {/* Rooms expandable dropdown */}
        <div>
          <button
            onClick={() => setRoomsExpanded(!roomsExpanded)}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg transition-all ${
              location.pathname.startsWith('/dashboard/rooms') || location.pathname.startsWith('/dashboard/addons')
                ? 'bg-accent-50 text-accent-700 font-medium'
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
            }`}
          >
            <div className="flex items-center gap-3">
              <BedDouble size={18} className={location.pathname.startsWith('/dashboard/rooms') || location.pathname.startsWith('/dashboard/addons') ? 'text-accent-600' : ''} />
              <span className="text-sm">Rooms</span>
            </div>
            <ChevronDown
              size={16}
              className={`transition-transform duration-200 ${roomsExpanded ? 'rotate-180' : ''}`}
            />
          </button>

          {roomsExpanded && (
            <div className="ml-6 mt-1 space-y-1">
              {roomsSubItems.map((item) => {
                const isActive = location.pathname === item.href
                const Icon = item.icon
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-all ${
                      isActive
                        ? 'bg-accent-50 text-accent-700 font-medium'
                        : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                  >
                    <Icon size={16} className={isActive ? 'text-accent-600' : ''} />
                    <span className="text-sm">{item.name}</span>
                  </Link>
                )
              })}
            </div>
          )}
        </div>

        {/* Bookings expandable dropdown */}
        <div>
          <button
            onClick={() => setBookingsExpanded(!bookingsExpanded)}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg transition-all ${
              location.pathname.startsWith('/dashboard/bookings') ||
              location.pathname.startsWith('/dashboard/refunds') ||
              location.pathname.startsWith('/dashboard/calendar') ||
              location.pathname.startsWith('/dashboard/customers') ||
              location.pathname.startsWith('/dashboard/reviews')
                ? 'bg-accent-50 text-accent-700 font-medium'
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
            }`}
          >
            <div className="flex items-center gap-3">
              <Calendar size={18} className={
                location.pathname.startsWith('/dashboard/bookings') ||
                location.pathname.startsWith('/dashboard/refunds') ||
                location.pathname.startsWith('/dashboard/calendar') ||
                location.pathname.startsWith('/dashboard/customers') ||
                location.pathname.startsWith('/dashboard/reviews')
                  ? 'text-accent-600' : ''
              } />
              <span className="text-sm">Bookings</span>
            </div>
            <ChevronDown
              size={16}
              className={`transition-transform duration-200 ${bookingsExpanded ? 'rotate-180' : ''}`}
            />
          </button>

          {bookingsExpanded && (
            <div className="ml-6 mt-1 space-y-1">
              {bookingsSubItems.map((item) => {
                const isActive = location.pathname === item.href
                const Icon = item.icon
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-all ${
                      isActive
                        ? 'bg-accent-50 text-accent-700 font-medium'
                        : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                  >
                    <Icon size={16} className={isActive ? 'text-accent-600' : ''} />
                    <span className="text-sm">{item.name}</span>
                  </Link>
                )
              })}
            </div>
          )}
        </div>

        {/* Analytics link */}
        <Link
          to="/dashboard/analytics"
          className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
            location.pathname.startsWith('/dashboard/analytics')
              ? 'bg-accent-50 text-accent-700 font-medium'
              : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
          }`}
        >
          <BarChart3 size={18} className={location.pathname.startsWith('/dashboard/analytics') ? 'text-accent-600' : ''} />
          <span className="text-sm">Analytics</span>
        </Link>

        {/* Remaining navigation items */}
        {navigation.slice(1).map((item) => {  // Skip Dashboard (index 0)
          const isActive = location.pathname === item.href
          const Icon = item.icon
          return (
            <Link
              key={item.name}
              to={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
                isActive
                  ? 'bg-accent-50 text-accent-700 font-medium'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <Icon size={18} className={isActive ? 'text-accent-600' : ''} />
              <span className="text-sm">{item.name}</span>
            </Link>
          )
        })}
      </nav>

      {/* Settings */}
      <div className="p-4 border-t border-gray-100">
        <Link
          to="/dashboard/settings"
          className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
            location.pathname === '/dashboard/settings'
              ? 'bg-accent-50 text-accent-700 font-medium'
              : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
          }`}
        >
          <Settings size={18} className={location.pathname === '/dashboard/settings' ? 'text-accent-600' : ''} />
          <span className="text-sm">Settings</span>
        </Link>
      </div>
    </div>
  )
}

import { Link, useLocation } from 'react-router-dom'
import {
  Calendar,
  Star,
  MessageCircle,
  User,
  LogOut,
  LayoutDashboard
} from 'lucide-react'
import { useCustomerAuth } from '../contexts/CustomerAuthContext'

const navigation = [
  { name: 'Dashboard', href: '/portal', icon: LayoutDashboard, exact: true },
  { name: 'My Bookings', href: '/portal/bookings', icon: Calendar },
  { name: 'My Reviews', href: '/portal/reviews', icon: Star },
  { name: 'Support', href: '/portal/support', icon: MessageCircle },
  { name: 'Profile', href: '/portal/profile', icon: User },
]

export default function CustomerSidebar() {
  const location = useLocation()
  const { customer, logout } = useCustomerAuth()

  const handleLogout = async () => {
    await logout()
  }

  return (
    <div className="w-64 bg-white border-r border-gray-100 flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-gray-100">
        <Link to="/portal" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">V</span>
          </div>
          <div>
            <span className="text-xl font-bold text-gray-900">Vilo</span>
            <p className="text-xs text-gray-500">Customer Portal</p>
          </div>
        </Link>
      </div>

      {/* Customer Info */}
      {customer && (
        <div className="p-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-accent-100 rounded-full flex items-center justify-center">
              <span className="text-accent-700 font-semibold">
                {customer.name?.charAt(0).toUpperCase() || customer.email?.charAt(0).toUpperCase() || 'G'}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {customer.name || 'Guest'}
              </p>
              <p className="text-xs text-gray-500 truncate">
                {customer.email}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        {navigation.map((item) => {
          const isActive = item.exact
            ? location.pathname === item.href
            : location.pathname === item.href || location.pathname.startsWith(item.href + '/')
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

      {/* Sign Out */}
      <div className="p-4 border-t border-gray-100">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-gray-600 hover:bg-gray-50 hover:text-gray-900 w-full"
        >
          <LogOut size={18} />
          <span className="text-sm">Sign Out</span>
        </button>
      </div>
    </div>
  )
}

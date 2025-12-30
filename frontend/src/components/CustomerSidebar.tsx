import { Link, useLocation } from 'react-router-dom'
import {
  Calendar,
  Star,
  MessageCircle,
  User,
  LogOut
} from 'lucide-react'
import { useCustomerAuth } from '../contexts/CustomerAuthContext'

const navigation = [
  { name: 'My Bookings', href: '/portal/bookings', icon: Calendar },
  { name: 'Reviews', href: '/portal/reviews', icon: Star },
  { name: 'Support', href: '/portal/support', icon: MessageCircle },
  { name: 'Profile', href: '/portal/profile', icon: User },
]

export default function CustomerSidebar() {
  const location = useLocation()
  const { customer, logout } = useCustomerAuth()
  const isDark = document.documentElement.classList.contains('dark')

  const handleLogout = async () => {
    await logout()
  }

  return (
    <div
      style={{
        backgroundColor: 'var(--bg-card)',
        borderColor: 'var(--border-color)'
      }}
      className="w-64 border-r flex flex-col transition-colors"
    >
      <div style={{ borderColor: 'var(--border-color)' }} className="p-6 border-b">
        <div className="flex items-center gap-2">
          <div style={{ backgroundColor: isDark ? '#ffffff' : '#000000' }} className="w-8 h-8 rounded flex items-center justify-center">
            <span style={{ color: isDark ? '#000000' : '#ffffff' }} className="font-bold text-sm">V</span>
          </div>
          <div>
            <h1 style={{ color: 'var(--text-primary)' }} className="text-xl font-semibold">Vilo</h1>
            <p style={{ color: 'var(--text-secondary)' }} className="text-xs">Customer Portal</p>
          </div>
        </div>
      </div>

      {/* Customer Info */}
      {customer && (
        <div style={{ borderColor: 'var(--border-color)' }} className="p-4 border-b">
          <p style={{ color: 'var(--text-primary)' }} className="text-sm font-medium truncate">
            {customer.name || 'Guest'}
          </p>
          <p style={{ color: 'var(--text-secondary)' }} className="text-xs truncate">
            {customer.email}
          </p>
        </div>
      )}

      <nav className="flex-1 p-4 space-y-1">
        {navigation.map((item) => {
          const isActive = location.pathname === item.href ||
            (item.href !== '/portal' && location.pathname.startsWith(item.href))
          const Icon = item.icon
          return (
            <Link
              key={item.name}
              to={item.href}
              style={{
                backgroundColor: isActive ? 'var(--bg-tertiary)' : 'transparent',
                color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)'
              }}
              className="flex items-center gap-3 px-3 py-2 rounded-md transition-colors hover:opacity-80"
            >
              <Icon size={18} />
              <span className="text-sm font-medium">{item.name}</span>
            </Link>
          )
        })}
      </nav>

      <div style={{ borderColor: 'var(--border-color)' }} className="p-4 border-t">
        <button
          onClick={handleLogout}
          style={{ color: 'var(--text-secondary)' }}
          className="flex items-center gap-3 px-3 py-2 rounded-md transition-colors hover:opacity-80 w-full"
        >
          <LogOut size={18} />
          <span className="text-sm font-medium">Sign Out</span>
        </button>
      </div>
    </div>
  )
}

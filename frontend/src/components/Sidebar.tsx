import { Link, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  Calendar,
  CalendarDays,
  Star,
  Plus,
  Globe,
  Settings,
  BedDouble,
  Users,
  Headphones
} from 'lucide-react'

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Rooms', href: '/dashboard/rooms', icon: BedDouble },
  { name: 'Add-ons', href: '/dashboard/addons', icon: Plus },
  { name: 'Bookings', href: '/dashboard/bookings', icon: Calendar },
  { name: 'Calendar', href: '/dashboard/calendar', icon: CalendarDays },
  { name: 'Reviews', href: '/dashboard/reviews', icon: Star },
  { name: 'Customers', href: '/dashboard/customers', icon: Users },
  { name: 'Support', href: '/dashboard/support', icon: Headphones },
  { name: 'Website', href: '/dashboard/website', icon: Globe },
]

export default function Sidebar() {
  const location = useLocation()
  const isDark = document.documentElement.classList.contains('dark')

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
          <h1 style={{ color: 'var(--text-primary)' }} className="text-xl font-semibold">Vilo</h1>
        </div>
      </div>
      <nav className="flex-1 p-4 space-y-1">
        {navigation.map((item) => {
          const isActive = location.pathname === item.href
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
        <Link
          to="/dashboard/settings"
          style={{
            backgroundColor: location.pathname === '/dashboard/settings' ? 'var(--bg-tertiary)' : 'transparent',
            color: location.pathname === '/dashboard/settings' ? 'var(--text-primary)' : 'var(--text-secondary)'
          }}
          className="flex items-center gap-3 px-3 py-2 rounded-md transition-colors hover:opacity-80"
        >
          <Settings size={18} />
          <span className="text-sm font-medium">Settings</span>
        </Link>
      </div>
    </div>
  )
}

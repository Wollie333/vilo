import { useState, useRef, useEffect } from 'react'
import { Search, ChevronLeft, ChevronRight, HelpCircle, ChevronDown, LogOut, User, Building2, Users, Shield, CreditCard, Settings } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import NotificationBell from './notifications/NotificationBell'

export default function Header() {
  const navigate = useNavigate()
  const { user, signOut, can } = useAuth()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  const userEmail = user?.email || 'User'
  const firstName = user?.user_metadata?.first_name || ''
  const lastName = user?.user_metadata?.last_name || ''
  const avatarUrl = user?.user_metadata?.avatar_url || ''

  // Get initials from name if available, otherwise from email
  const userInitials = firstName || lastName
    ? `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase()
    : userEmail.substring(0, 2).toUpperCase()

  const displayName = firstName && lastName
    ? `${firstName} ${lastName}`
    : userEmail

  return (
    <header style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }} className="border-b px-6 py-3 transition-colors">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1">
            <button className="p-1.5 rounded transition-colors bg-gray-100 hover:bg-gray-200">
              <ChevronLeft size={18} style={{ color: 'var(--text-secondary)' }} />
            </button>
            <button className="p-1.5 rounded transition-colors bg-gray-100 hover:bg-gray-200">
              <ChevronRight size={18} style={{ color: 'var(--text-secondary)' }} />
            </button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2" style={{ color: 'var(--text-muted)' }} size={16} />
            <input
              type="text"
              placeholder="Search"
              style={{
                backgroundColor: 'var(--bg-secondary)',
                borderColor: 'var(--border-color)',
                color: 'var(--text-primary)'
              }}
              className="pl-9 pr-16 py-2 border rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-gray-400 w-64 transition-colors"
            />
            <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
              <span style={{ backgroundColor: 'var(--bg-tertiary)', borderColor: 'var(--border-color)', color: 'var(--text-muted)' }} className="text-xs px-1.5 py-0.5 rounded border">⌘ F</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            style={{ color: 'var(--text-secondary)' }}
            className="flex items-center gap-2 hover:opacity-80 px-3 py-1.5 rounded-md transition-colors"
          >
            <HelpCircle size={18} />
            <span className="text-sm font-medium">Help Center</span>
          </button>
          <NotificationBell />
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center gap-2 cursor-pointer rounded-md px-2 py-1.5 transition-colors hover:opacity-80"
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center overflow-hidden">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-white text-xs font-medium">{userInitials}</span>
                )}
              </div>
              <span style={{ color: 'var(--text-primary)' }} className="text-sm font-medium max-w-[120px] truncate">{displayName}</span>
              <ChevronDown size={16} style={{ color: 'var(--text-muted)' }} />
            </button>
            {dropdownOpen && (
              <div style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }} className="absolute right-0 mt-2 w-56 rounded-lg shadow-lg border py-1 z-50">
                {/* User Info */}
                <div style={{ borderColor: 'var(--border-color)' }} className="px-4 py-3 border-b flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center overflow-hidden flex-shrink-0">
                    {avatarUrl ? (
                      <img src={avatarUrl} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-white text-sm font-medium">{userInitials}</span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p style={{ color: 'var(--text-primary)' }} className="text-sm font-medium truncate">{displayName}</p>
                    <p style={{ color: 'var(--text-muted)' }} className="text-xs truncate">{userEmail}</p>
                  </div>
                </div>

                {/* Quick Links */}
                <div style={{ borderColor: 'var(--border-color)' }} className="py-1 border-b">
                  <button
                    onClick={() => { navigate('/dashboard/settings#account'); setDropdownOpen(false) }}
                    className="w-full flex items-center gap-3 px-4 py-2 text-sm hover:bg-gray-50 transition-colors"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    <User size={16} style={{ color: 'var(--text-muted)' }} />
                    Account Settings
                  </button>
                  {can('settings.business', 'view') && (
                    <button
                      onClick={() => { navigate('/dashboard/business/details'); setDropdownOpen(false) }}
                      className="w-full flex items-center gap-3 px-4 py-2 text-sm hover:bg-gray-50 transition-colors"
                      style={{ color: 'var(--text-primary)' }}
                    >
                      <Building2 size={16} style={{ color: 'var(--text-muted)' }} />
                      Business Details
                    </button>
                  )}
                </div>

                {/* Team & Permissions */}
                {(can('settings.members', 'view') || can('settings.roles', 'view') || can('settings.billing', 'view')) && (
                  <div style={{ borderColor: 'var(--border-color)' }} className="py-1 border-b">
                    {can('settings.members', 'view') && (
                      <button
                        onClick={() => { navigate('/dashboard/settings#members'); setDropdownOpen(false) }}
                        className="w-full flex items-center gap-3 px-4 py-2 text-sm hover:bg-gray-50 transition-colors"
                        style={{ color: 'var(--text-primary)' }}
                      >
                        <Users size={16} style={{ color: 'var(--text-muted)' }} />
                        Team Members
                      </button>
                    )}
                    {can('settings.roles', 'view') && (
                      <button
                        onClick={() => { navigate('/dashboard/settings/roles'); setDropdownOpen(false) }}
                        className="w-full flex items-center gap-3 px-4 py-2 text-sm hover:bg-gray-50 transition-colors"
                        style={{ color: 'var(--text-primary)' }}
                      >
                        <Shield size={16} style={{ color: 'var(--text-muted)' }} />
                        Roles & Permissions
                      </button>
                    )}
                    {can('settings.billing', 'view') && (
                      <button
                        onClick={() => { navigate('/dashboard/settings#billing'); setDropdownOpen(false) }}
                        className="w-full flex items-center gap-3 px-4 py-2 text-sm hover:bg-gray-50 transition-colors"
                        style={{ color: 'var(--text-primary)' }}
                      >
                        <CreditCard size={16} style={{ color: 'var(--text-muted)' }} />
                        Billing
                      </button>
                    )}
                  </div>
                )}

                {/* All Settings */}
                <div style={{ borderColor: 'var(--border-color)' }} className="py-1 border-b">
                  <button
                    onClick={() => { navigate('/dashboard/settings'); setDropdownOpen(false) }}
                    className="w-full flex items-center gap-3 px-4 py-2 text-sm hover:bg-gray-50 transition-colors"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    <Settings size={16} style={{ color: 'var(--text-muted)' }} />
                    All Settings
                  </button>
                </div>

                {/* Sign Out */}
                <div className="py-1">
                  <button
                    onClick={handleSignOut}
                    className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-500 hover:bg-red-50 transition-colors"
                  >
                    <LogOut size={16} />
                    Sign out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}

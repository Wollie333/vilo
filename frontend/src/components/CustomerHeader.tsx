import { useState, useRef, useEffect } from 'react'
import { LogOut, ChevronDown, HelpCircle } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useCustomerAuth } from '../contexts/CustomerAuthContext'
import CustomerNotificationBell from './portal/CustomerNotificationBell'
import SupportModal from './SupportModal'

export default function CustomerHeader() {
  const { customer, logout } = useCustomerAuth()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [showSupportModal, setShowSupportModal] = useState(false)
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

  const handleLogout = async () => {
    await logout()
  }

  const displayName = customer?.name || 'Guest'
  const userEmail = customer?.email || ''
  const userInitials = customer?.name
    ? customer.name.split(' ').map(n => n.charAt(0)).join('').toUpperCase().slice(0, 2)
    : userEmail.substring(0, 2).toUpperCase()

  return (
    <header className="bg-white border-b border-gray-100 px-6 py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-medium text-gray-900">
            Welcome back{customer?.name ? `, ${customer.name.split(' ')[0]}` : ''}
          </h2>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowSupportModal(true)}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 px-3 py-1.5 rounded-md transition-colors"
          >
            <HelpCircle size={18} />
            <span className="text-sm font-medium">Help</span>
          </button>

          <CustomerNotificationBell />

          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center gap-2 cursor-pointer rounded-md px-2 py-1.5 transition-colors hover:bg-gray-50"
            >
              {customer?.profilePictureUrl ? (
                <img
                  src={customer.profilePictureUrl}
                  alt={displayName}
                  className="w-8 h-8 rounded-full object-cover"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-accent-100 flex items-center justify-center">
                  <span className="text-accent-700 text-xs font-semibold">{userInitials}</span>
                </div>
              )}
              <span className="text-sm font-medium text-gray-900 max-w-[120px] truncate">{displayName}</span>
              <ChevronDown size={16} className="text-gray-400" />
            </button>

            {dropdownOpen && (
              <div className="absolute right-0 mt-2 w-56 rounded-lg shadow-lg border border-gray-100 bg-white py-1 z-50">
                <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-3">
                  {customer?.profilePictureUrl ? (
                    <img
                      src={customer.profilePictureUrl}
                      alt={displayName}
                      className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-accent-100 flex items-center justify-center flex-shrink-0">
                      <span className="text-accent-700 text-sm font-semibold">{userInitials}</span>
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{displayName}</p>
                    <p className="text-xs text-gray-500 truncate">{userEmail}</p>
                  </div>
                </div>
                <Link
                  to="/portal/profile"
                  onClick={() => setDropdownOpen(false)}
                  className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Profile Settings
                </Link>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-500 hover:bg-red-50 transition-colors"
                >
                  <LogOut size={16} />
                  Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <SupportModal
        isOpen={showSupportModal}
        onClose={() => setShowSupportModal(false)}
        context="portal"
      />
    </header>
  )
}

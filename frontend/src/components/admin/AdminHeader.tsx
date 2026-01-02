import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSuperAdmin } from '../../contexts/SuperAdminContext'
import { Search, ExternalLink, Settings, LogOut, ChevronDown } from 'lucide-react'

export function AdminHeader() {
  const { admin, signOut } = useSuperAdmin()
  const navigate = useNavigate()
  const [searchQuery, setSearchQuery] = useState('')
  const [showUserMenu, setShowUserMenu] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      navigate(`/admin/search?q=${encodeURIComponent(searchQuery.trim())}`)
    }
  }

  const handleSignOut = async () => {
    await signOut()
    navigate('/admin/login')
  }

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6">
      {/* Search */}
      <form onSubmit={handleSearch} className="flex-1 max-w-lg">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search tenants, users, subscriptions..."
            className="w-full bg-gray-50 border border-gray-200 rounded-lg pl-10 pr-4 py-2 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-accent-500 focus:ring-1 focus:ring-accent-500"
          />
        </div>
      </form>

      {/* Right side */}
      <div className="flex items-center gap-4">
        {/* Quick actions */}
        <a
          href="/"
          target="_blank"
          rel="noopener noreferrer"
          className="p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          title="Open Main Site"
        >
          <ExternalLink size={20} />
        </a>

        {/* User menu */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-2 p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <div className="w-8 h-8 bg-accent-100 rounded-full flex items-center justify-center text-sm text-accent-700 font-medium">
              {admin?.displayName?.charAt(0) || admin?.email.charAt(0).toUpperCase() || '?'}
            </div>
            <ChevronDown size={16} />
          </button>

          {showUserMenu && (
            <div className="absolute right-0 mt-2 w-56 bg-white border border-gray-200 rounded-xl shadow-lg z-50">
              <div className="px-4 py-3 border-b border-gray-100">
                <p className="text-sm font-medium text-gray-900">{admin?.displayName || 'Admin'}</p>
                <p className="text-xs text-gray-500 truncate">{admin?.email}</p>
                <span className="inline-block mt-1 px-2 py-0.5 text-xs bg-accent-50 text-accent-700 rounded capitalize">
                  {admin?.role.replace('_', ' ')}
                </span>
              </div>
              <div className="py-2">
                <button
                  onClick={() => {
                    setShowUserMenu(false)
                    navigate('/admin/settings')
                  }}
                  className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-2"
                >
                  <Settings size={16} />
                  Settings
                </button>
                <button
                  onClick={handleSignOut}
                  className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-gray-50 transition-colors flex items-center gap-2"
                >
                  <LogOut size={16} />
                  Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}

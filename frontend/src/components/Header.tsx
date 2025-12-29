import { useState, useRef, useEffect } from 'react'
import { Search, ChevronLeft, ChevronRight, HelpCircle, ChevronDown, LogOut, Sun, Moon } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function Header() {
  const navigate = useNavigate()
  const { user, signOut } = useAuth()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [isDark, setIsDark] = useState(() => {
    return localStorage.getItem('theme') === 'dark'
  })
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

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark')
      localStorage.setItem('theme', 'dark')
    } else {
      document.documentElement.classList.remove('dark')
      localStorage.setItem('theme', 'light')
    }
  }, [isDark])

  const toggleTheme = () => {
    setIsDark(!isDark)
  }

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  const userEmail = user?.email || 'User'
  const userInitials = userEmail.substring(0, 2).toUpperCase()

  return (
    <header style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }} className="border-b px-6 py-3 transition-colors">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1">
            <button style={{ backgroundColor: isDark ? '#374151' : '#f3f4f6' }} className="p-1.5 rounded transition-colors">
              <ChevronLeft size={18} style={{ color: 'var(--text-secondary)' }} />
            </button>
            <button style={{ backgroundColor: isDark ? '#374151' : '#f3f4f6' }} className="p-1.5 rounded transition-colors">
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
        <div className="flex items-center gap-4">
          <button
            onClick={toggleTheme}
            style={{ backgroundColor: isDark ? '#374151' : '#f3f4f6' }}
            className="p-2 rounded-lg transition-colors"
            title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {isDark ? (
              <Sun size={20} className="text-yellow-500" />
            ) : (
              <Moon size={20} className="text-gray-600" />
            )}
          </button>
          <button
            style={{ color: 'var(--text-secondary)' }}
            className="flex items-center gap-2 hover:opacity-80 px-3 py-1.5 rounded-md transition-colors"
          >
            <HelpCircle size={18} />
            <span className="text-sm font-medium">Help Center</span>
          </button>
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center gap-2 cursor-pointer rounded-md px-2 py-1.5 transition-colors hover:opacity-80"
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center">
                <span className="text-white text-xs font-medium">{userInitials}</span>
              </div>
              <span style={{ color: 'var(--text-primary)' }} className="text-sm font-medium max-w-[120px] truncate">{userEmail}</span>
              <ChevronDown size={16} style={{ color: 'var(--text-muted)' }} />
            </button>
            {dropdownOpen && (
              <div style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }} className="absolute right-0 mt-2 w-56 rounded-lg shadow-lg border py-1 z-50">
                <div style={{ borderColor: 'var(--border-color)' }} className="px-4 py-3 border-b">
                  <p style={{ color: 'var(--text-primary)' }} className="text-sm font-medium truncate">{userEmail}</p>
                  <p style={{ color: 'var(--text-muted)' }} className="text-xs">Administrator</p>
                </div>
                <button
                  onClick={handleSignOut}
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
    </header>
  )
}

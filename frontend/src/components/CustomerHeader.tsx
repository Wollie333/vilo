import { useState, useEffect } from 'react'
import { Sun, Moon, LogOut } from 'lucide-react'
import { useCustomerAuth } from '../contexts/CustomerAuthContext'

export default function CustomerHeader() {
  const { customer, logout } = useCustomerAuth()
  const [isDark, setIsDark] = useState(() => {
    return localStorage.getItem('theme') === 'dark' ||
      (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches)
  })

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

  const handleLogout = async () => {
    await logout()
  }

  return (
    <header
      style={{
        backgroundColor: 'var(--bg-card)',
        borderColor: 'var(--border-color)'
      }}
      className="h-16 border-b flex items-center justify-between px-6 transition-colors"
    >
      <div className="flex items-center gap-4">
        <h2 style={{ color: 'var(--text-primary)' }} className="text-lg font-medium">
          Welcome{customer?.name ? `, ${customer.name}` : ''}
        </h2>
      </div>

      <div className="flex items-center gap-4">
        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          style={{ color: 'var(--text-secondary)' }}
          className="p-2 rounded-md hover:opacity-80 transition-colors"
          title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {isDark ? <Sun size={20} /> : <Moon size={20} />}
        </button>

        {/* User Menu */}
        <div className="relative group">
          <button
            className="flex items-center gap-2 p-2 rounded-md hover:opacity-80 transition-colors"
          >
            <div
              style={{ backgroundColor: 'var(--bg-tertiary)' }}
              className="w-8 h-8 rounded-full flex items-center justify-center"
            >
              <span style={{ color: 'var(--text-primary)' }} className="text-sm font-medium">
                {customer?.name?.charAt(0).toUpperCase() || customer?.email?.charAt(0).toUpperCase() || 'G'}
              </span>
            </div>
          </button>

          {/* Dropdown */}
          <div
            style={{
              backgroundColor: 'var(--bg-card)',
              borderColor: 'var(--border-color)'
            }}
            className="absolute right-0 top-full mt-2 w-48 border rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50"
          >
            <div style={{ borderColor: 'var(--border-color)' }} className="p-3 border-b">
              <p style={{ color: 'var(--text-primary)' }} className="text-sm font-medium truncate">
                {customer?.name || 'Guest'}
              </p>
              <p style={{ color: 'var(--text-secondary)' }} className="text-xs truncate">
                {customer?.email}
              </p>
            </div>
            <div className="p-1">
              <button
                onClick={handleLogout}
                style={{ color: 'var(--text-secondary)' }}
                className="flex items-center gap-2 w-full px-3 py-2 text-sm rounded hover:opacity-80 transition-colors"
              >
                <LogOut size={16} />
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}

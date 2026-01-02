import { useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { useSuperAdmin } from '../../contexts/SuperAdminContext'
import {
  LayoutDashboard,
  Building2,
  Users,
  Users2,
  CreditCard,
  BarChart3,
  AlertCircle,
  Database,
  Activity,
  Flag,
  Megaphone,
  ClipboardList,
  Settings,
  Menu,
  ChevronDown,
  ChevronRight,
  TrendingUp,
  UserCheck,
  Rocket,
  Gauge,
  FileText,
  PieChart,
  Receipt,
  Clock,
  Layers,
} from 'lucide-react'

interface NavItem {
  name: string
  path: string
  icon: any
  permission: string | null
}

interface NavCategory {
  name: string
  icon: any
  permissions: string[]  // OR logic - show if user has ANY of these
  items: NavItem[]
  defaultExpanded?: boolean
}

const navCategories: NavCategory[] = [
  {
    name: 'Dashboard',
    icon: LayoutDashboard,
    permissions: [],
    items: [
      { name: 'Overview', path: '/admin', icon: LayoutDashboard, permission: null }
    ]
  },
  {
    name: 'Business',
    icon: Building2,
    permissions: ['tenants', 'users'],
    items: [
      { name: 'Tenants', path: '/admin/tenants', icon: Building2, permission: 'tenants' },
      { name: 'Users', path: '/admin/users', icon: Users, permission: 'users' }
    ]
  },
  {
    name: 'Revenue',
    icon: CreditCard,
    permissions: ['plans'],
    defaultExpanded: true,
    items: [
      { name: 'Overview', path: '/admin/revenue', icon: PieChart, permission: 'plans' },
      { name: 'Subscriptions', path: '/admin/subscriptions', icon: Receipt, permission: 'plans' },
      { name: 'Plans', path: '/admin/plans', icon: Layers, permission: 'plans' },
      { name: 'Grace Periods', path: '/admin/grace-periods', icon: Clock, permission: 'plans' }
    ]
  },
  {
    name: 'Team',
    icon: Users2,
    permissions: ['teams'],
    items: [
      { name: 'Members', path: '/admin/team', icon: Users2, permission: 'teams' },
      { name: 'Audit Log', path: '/admin/team/audit', icon: ClipboardList, permission: 'teams' }
    ]
  },
  {
    name: 'Analytics',
    icon: BarChart3,
    permissions: ['analytics'],
    items: [
      { name: 'Dashboard', path: '/admin/analytics', icon: BarChart3, permission: 'analytics' }
    ]
  },
  {
    name: 'Marketing',
    icon: Megaphone,
    permissions: ['marketing'],
    items: [
      { name: 'Announcements', path: '/admin/announcements', icon: Megaphone, permission: 'marketing' }
    ]
  },
  {
    name: 'Platform',
    icon: Settings,
    permissions: ['settings', 'errors', 'backups'],
    items: [
      { name: 'System Health', path: '/admin/health', icon: Activity, permission: 'settings' },
      { name: 'Error Logs', path: '/admin/errors', icon: AlertCircle, permission: 'errors' },
      { name: 'Backups', path: '/admin/backups', icon: Database, permission: 'backups' },
      { name: 'Feature Flags', path: '/admin/features', icon: Flag, permission: 'settings' },
      { name: 'Settings', path: '/admin/settings', icon: Settings, permission: 'settings' }
    ]
  }
]

interface AdminSidebarProps {
  collapsed?: boolean
  onToggle?: () => void
}

export function AdminSidebar({ collapsed = false, onToggle }: AdminSidebarProps) {
  const { hasPermission, hasAnyPermission, admin } = useSuperAdmin()
  const location = useLocation()

  // Initialize expanded categories based on defaultExpanded flag
  const [expandedCategories, setExpandedCategories] = useState<string[]>(() =>
    navCategories.filter(c => c.defaultExpanded).map(c => c.name)
  )

  // Filter categories based on permissions
  const filteredCategories = navCategories.filter(
    category => hasAnyPermission(category.permissions as any)
  )

  const toggleExpanded = (name: string) => {
    setExpandedCategories(prev =>
      prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name]
    )
  }

  const isCategoryActive = (category: NavCategory): boolean => {
    return category.items.some(item => location.pathname === item.path)
  }

  const isItemActive = (path: string): boolean => {
    if (path === '/admin/analytics') {
      return location.pathname === '/admin/analytics'
    }
    return location.pathname === path
  }

  return (
    <aside
      className={`bg-white border-r border-gray-200 flex flex-col transition-all duration-300 ${
        collapsed ? 'w-16' : 'w-64'
      }`}
    >
      {/* Logo */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-gray-200">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-accent-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold">V</span>
            </div>
            <div>
              <span className="text-gray-900 font-semibold">Vilo</span>
              <p className="text-xs text-gray-500">SaaS Admin</p>
            </div>
          </div>
        )}
        <button
          onClick={onToggle}
          className="p-1.5 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <Menu size={20} />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4">
        <ul className="space-y-1 px-2">
          {filteredCategories.map(category => {
            const CategoryIcon = category.icon
            const isExpanded = expandedCategories.includes(category.name)
            const isActive = isCategoryActive(category)
            const hasMultipleItems = category.items.length > 1
            const filteredItems = category.items.filter(
              item => !item.permission || hasPermission(item.permission as any)
            )

            // Skip category if no items are visible
            if (filteredItems.length === 0) return null

            // Dashboard category - render as standalone link
            if (category.name === 'Dashboard') {
              const item = filteredItems[0]
              const ItemIcon = item.icon
              return (
                <li key={category.name}>
                  <NavLink
                    to={item.path}
                    end
                    className={({ isActive: linkActive }) =>
                      `flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                        linkActive
                          ? 'bg-accent-50 text-accent-700 font-medium'
                          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                      }`
                    }
                    title={collapsed ? category.name : undefined}
                  >
                    <ItemIcon size={20} />
                    {!collapsed && <span>{category.name}</span>}
                  </NavLink>
                </li>
              )
            }

            // Single item categories - render as direct link
            if (filteredItems.length === 1 && !hasMultipleItems) {
              const item = filteredItems[0]
              const ItemIcon = item.icon
              return (
                <li key={category.name}>
                  <NavLink
                    to={item.path}
                    className={({ isActive: linkActive }) =>
                      `flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                        linkActive
                          ? 'bg-accent-50 text-accent-700 font-medium'
                          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                      }`
                    }
                    title={collapsed ? category.name : undefined}
                  >
                    <CategoryIcon size={20} />
                    {!collapsed && <span>{category.name}</span>}
                  </NavLink>
                </li>
              )
            }

            // Multi-item categories - render as expandable group
            if (collapsed) {
              // In collapsed mode, show category icon linking to first item
              const firstItem = filteredItems[0]
              return (
                <li key={category.name}>
                  <NavLink
                    to={firstItem.path}
                    className={({ isActive: linkActive }) =>
                      `flex items-center justify-center px-3 py-2 rounded-lg transition-colors ${
                        linkActive || isActive
                          ? 'bg-accent-50 text-accent-700 font-medium'
                          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                      }`
                    }
                    title={category.name}
                  >
                    <CategoryIcon size={20} />
                  </NavLink>
                </li>
              )
            }

            return (
              <li key={category.name} className="space-y-1">
                {/* Category header */}
                <button
                  onClick={() => toggleExpanded(category.name)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-accent-50 text-accent-700 font-medium'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <CategoryIcon size={20} />
                    <span className="font-medium">{category.name}</span>
                  </div>
                  {isExpanded ? (
                    <ChevronDown size={16} className="text-gray-400" />
                  ) : (
                    <ChevronRight size={16} className="text-gray-400" />
                  )}
                </button>

                {/* Category items */}
                {isExpanded && (
                  <ul className="ml-4 pl-4 border-l border-gray-200 space-y-1">
                    {filteredItems.map(item => {
                      const ItemIcon = item.icon
                      const itemActive = isItemActive(item.path)
                      return (
                        <li key={item.path}>
                          <NavLink
                            to={item.path}
                            end={item.path === '/admin/analytics'}
                            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                              itemActive
                                ? 'bg-accent-50 text-accent-700 font-medium'
                                : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
                            }`}
                          >
                            <ItemIcon size={16} />
                            <span>{item.name}</span>
                          </NavLink>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </li>
            )
          })}
        </ul>
      </nav>

      {/* Admin Info */}
      {admin && (
        <div className={`border-t border-gray-200 p-4 ${collapsed ? 'text-center' : ''}`}>
          <div className={`flex items-center ${collapsed ? 'justify-center' : 'gap-3'}`}>
            <div className="w-8 h-8 bg-accent-100 rounded-full flex items-center justify-center text-sm text-accent-700 font-medium">
              {admin.displayName?.charAt(0) || admin.email.charAt(0).toUpperCase()}
            </div>
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {admin.displayName || admin.email}
                </p>
                <p className="text-xs text-gray-500 capitalize">{admin.role.replace('_', ' ')}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </aside>
  )
}

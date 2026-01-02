import { useState, useEffect } from 'react'
import { ChevronDown, ChevronRight, Loader2, Info } from 'lucide-react'
import { notificationsApi, NotificationPreferences as Preferences } from '../../services/api'
import { STAFF_NOTIFICATION_CATEGORIES, NotificationCategory, getRecipientLabel } from './notificationTypes'

// Default preferences with all types enabled
const getDefaultPreferences = (): Preferences => {
  const defaults: Record<string, boolean> = {}
  STAFF_NOTIFICATION_CATEGORIES.forEach(cat => {
    cat.types.forEach(t => {
      defaults[t.type] = true
    })
  })
  return defaults as unknown as Preferences
}

interface TooltipProps {
  content: string
  children: React.ReactNode
}

function Tooltip({ content, children }: TooltipProps) {
  const [show, setShow] = useState(false)

  return (
    <div className="relative inline-flex">
      <div
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        onFocus={() => setShow(true)}
        onBlur={() => setShow(false)}
        tabIndex={0}
        className="cursor-help"
      >
        {children}
      </div>
      {show && (
        <div
          className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 text-xs rounded-lg shadow-lg whitespace-nowrap max-w-xs"
          style={{
            backgroundColor: 'var(--bg-primary)',
            border: '1px solid var(--border-color)',
            color: 'var(--text-primary)'
          }}
        >
          {content}
          <div
            className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 w-2 h-2 rotate-45"
            style={{
              backgroundColor: 'var(--bg-primary)',
              borderRight: '1px solid var(--border-color)',
              borderBottom: '1px solid var(--border-color)'
            }}
          />
        </div>
      )}
    </div>
  )
}

interface CategoryCardProps {
  category: NotificationCategory
  preferences: Preferences
  onToggleType: (type: string) => void
  onToggleCategory: (categoryKey: string, enabled: boolean) => void
  savingKey: string | null
}

function CategoryCard({ category, preferences, onToggleType, onToggleCategory, savingKey }: CategoryCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const Icon = category.icon

  // Calculate enabled count
  const enabledCount = category.types.filter(t => preferences[t.type as keyof Preferences]).length
  const totalCount = category.types.length
  const allEnabled = enabledCount === totalCount
  const someEnabled = enabledCount > 0 && enabledCount < totalCount
  const isSavingCategory = savingKey === `category:${category.key}`

  const handleMasterToggle = () => {
    onToggleCategory(category.key, !allEnabled)
  }

  return (
    <div
      style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}
      className="border rounded-lg overflow-hidden"
    >
      {/* Category Header */}
      <div className="flex items-center justify-between p-4">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-3 flex-1 text-left"
        >
          <div
            className={`w-10 h-10 rounded-lg flex items-center justify-center ${
              enabledCount > 0 ? 'bg-accent-100 text-accent-600' : 'bg-gray-100 text-gray-400'
            }`}
          >
            <Icon size={20} />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="font-medium" style={{ color: 'var(--text-primary)' }}>
                {category.label}
              </span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100" style={{ color: 'var(--text-muted)' }}>
                {enabledCount}/{totalCount}
              </span>
            </div>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              {category.description}
            </p>
          </div>
          {isExpanded ? (
            <ChevronDown size={20} style={{ color: 'var(--text-muted)' }} />
          ) : (
            <ChevronRight size={20} style={{ color: 'var(--text-muted)' }} />
          )}
        </button>

        {/* Master Toggle */}
        <button
          onClick={handleMasterToggle}
          disabled={isSavingCategory}
          className={`relative w-11 h-6 rounded-full transition-colors ml-3 ${
            allEnabled ? 'bg-accent-500' : someEnabled ? 'bg-accent-300' : 'bg-gray-200'
          } ${isSavingCategory ? 'opacity-50' : ''}`}
        >
          <span
            className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${
              allEnabled || someEnabled ? 'translate-x-5' : 'translate-x-0'
            }`}
          />
          {isSavingCategory && (
            <span className="absolute inset-0 flex items-center justify-center">
              <Loader2 className="w-3 h-3 animate-spin text-white" />
            </span>
          )}
        </button>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div
          className="border-t px-4 py-2"
          style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }}
        >
          {category.types.map((notifType, index) => {
            const typeKey = notifType.type as keyof Preferences
            const isEnabled = preferences[typeKey] ?? true
            const isSaving = savingKey === notifType.type

            return (
              <div
                key={notifType.type}
                className={`flex items-center justify-between py-3 ${
                  index < category.types.length - 1 ? 'border-b' : ''
                }`}
                style={{ borderColor: 'var(--border-color)' }}
              >
                <div className="flex items-center gap-2">
                  <span style={{ color: 'var(--text-primary)' }}>{notifType.label}</span>
                  <Tooltip content={`${notifType.description} • ${getRecipientLabel(notifType.recipient)}`}>
                    <Info
                      size={14}
                      className="opacity-50 hover:opacity-100 transition-opacity"
                      style={{ color: 'var(--text-muted)' }}
                    />
                  </Tooltip>
                </div>

                <button
                  onClick={() => onToggleType(notifType.type)}
                  disabled={isSaving}
                  className={`relative w-10 h-5 rounded-full transition-colors ${
                    isEnabled ? 'bg-accent-500' : 'bg-gray-200'
                  } ${isSaving ? 'opacity-50' : ''}`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                      isEnabled ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                  {isSaving && (
                    <span className="absolute inset-0 flex items-center justify-center">
                      <Loader2 className="w-2.5 h-2.5 animate-spin text-white" />
                    </span>
                  )}
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default function NotificationPreferences() {
  const [preferences, setPreferences] = useState<Preferences>(getDefaultPreferences())
  const [isLoading, setIsLoading] = useState(true)
  const [savingKey, setSavingKey] = useState<string | null>(null)

  useEffect(() => {
    fetchPreferences()
  }, [])

  const fetchPreferences = async () => {
    try {
      const data = await notificationsApi.getPreferences()
      setPreferences({ ...getDefaultPreferences(), ...data })
    } catch (error) {
      console.error('Failed to fetch preferences:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleToggleType = async (type: string) => {
    const typeKey = type as keyof Preferences
    const newValue = !preferences[typeKey]
    setSavingKey(type)

    // Optimistic update
    setPreferences(prev => ({ ...prev, [type]: newValue }))

    try {
      await notificationsApi.updatePreferences({ [type]: newValue })
    } catch (error) {
      // Revert on error
      setPreferences(prev => ({ ...prev, [type]: !newValue }))
      console.error('Failed to update preference:', error)
    } finally {
      setSavingKey(null)
    }
  }

  const handleToggleCategory = async (categoryKey: string, enabled: boolean) => {
    const category = STAFF_NOTIFICATION_CATEGORIES.find(c => c.key === categoryKey)
    if (!category) return

    setSavingKey(`category:${categoryKey}`)

    // Build update object for all types in this category
    const updates: Partial<Preferences> = {}
    category.types.forEach(t => {
      (updates as Record<string, boolean>)[t.type] = enabled
    })

    // Optimistic update
    setPreferences(prev => ({ ...prev, ...updates }))

    try {
      await notificationsApi.updatePreferences(updates)
    } catch (error) {
      // Revert on error
      const revert: Partial<Preferences> = {}
      category.types.forEach(t => {
        (revert as Record<string, boolean>)[t.type] = !enabled
      })
      setPreferences(prev => ({ ...prev, ...revert }))
      console.error('Failed to update category preferences:', error)
    } finally {
      setSavingKey(null)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="mb-6">
        <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
          Notification Preferences
        </h3>
        <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
          Choose which notifications you want to receive. Click a category to expand and configure individual notifications.
        </p>
      </div>

      <div className="space-y-3">
        {STAFF_NOTIFICATION_CATEGORIES.map(category => (
          <CategoryCard
            key={category.key}
            category={category}
            preferences={preferences}
            onToggleType={handleToggleType}
            onToggleCategory={handleToggleCategory}
            savingKey={savingKey}
          />
        ))}
      </div>
    </div>
  )
}

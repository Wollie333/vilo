import { useState, useEffect } from 'react'
import { Calendar, CreditCard, Star, MessageSquare, Settings, Loader2 } from 'lucide-react'
import { notificationsApi, NotificationPreferences as Preferences } from '../../services/api'

interface PreferenceCategory {
  key: keyof Preferences
  label: string
  description: string
  icon: typeof Calendar
}

const categories: PreferenceCategory[] = [
  {
    key: 'bookings',
    label: 'Bookings',
    description: 'New bookings, cancellations, check-ins, and check-outs',
    icon: Calendar
  },
  {
    key: 'payments',
    label: 'Payments',
    description: 'Payment confirmations and refunds',
    icon: CreditCard
  },
  {
    key: 'reviews',
    label: 'Reviews',
    description: 'New guest reviews and ratings',
    icon: Star
  },
  {
    key: 'support',
    label: 'Support',
    description: 'Support ticket updates and replies',
    icon: MessageSquare
  },
  {
    key: 'system',
    label: 'System',
    description: 'Sync status, errors, and system updates',
    icon: Settings
  }
]

export default function NotificationPreferences() {
  const [preferences, setPreferences] = useState<Preferences>({
    bookings: true,
    payments: true,
    reviews: true,
    support: true,
    system: true
  })
  const [isLoading, setIsLoading] = useState(true)
  const [savingKey, setSavingKey] = useState<string | null>(null)

  useEffect(() => {
    fetchPreferences()
  }, [])

  const fetchPreferences = async () => {
    try {
      const data = await notificationsApi.getPreferences()
      setPreferences(data)
    } catch (error) {
      console.error('Failed to fetch preferences:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleToggle = async (key: keyof Preferences) => {
    const newValue = !preferences[key]
    setSavingKey(key)

    // Optimistic update
    setPreferences(prev => ({ ...prev, [key]: newValue }))

    try {
      await notificationsApi.updatePreferences({ [key]: newValue })
    } catch (error) {
      // Revert on error
      setPreferences(prev => ({ ...prev, [key]: !newValue }))
      console.error('Failed to update preferences:', error)
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
          Choose which notifications you want to receive
        </p>
      </div>

      <div className="space-y-3">
        {categories.map(category => {
          const Icon = category.icon
          const isEnabled = preferences[category.key]
          const isSaving = savingKey === category.key

          return (
            <div
              key={category.key}
              style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}
              className="flex items-center justify-between p-4 border rounded-lg"
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    isEnabled ? 'bg-accent-100 text-accent-600' : 'bg-gray-100 text-gray-400'
                  }`}
                >
                  <Icon size={20} />
                </div>
                <div>
                  <p className="font-medium" style={{ color: 'var(--text-primary)' }}>
                    {category.label}
                  </p>
                  <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                    {category.description}
                  </p>
                </div>
              </div>

              <button
                onClick={() => handleToggle(category.key)}
                disabled={isSaving}
                className={`relative w-11 h-6 rounded-full transition-colors ${
                  isEnabled ? 'bg-accent-500' : 'bg-gray-200'
                } ${isSaving ? 'opacity-50' : ''}`}
              >
                <span
                  className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                    isEnabled ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
                {isSaving && (
                  <span className="absolute inset-0 flex items-center justify-center">
                    <Loader2 className="w-3 h-3 animate-spin text-white" />
                  </span>
                )}
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}

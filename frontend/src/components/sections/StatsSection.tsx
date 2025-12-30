import { Users, Star, Award, Calendar, Home, Heart } from 'lucide-react'

const ICONS: Record<string, any> = {
  users: Users,
  star: Star,
  award: Award,
  calendar: Calendar,
  home: Home,
  heart: Heart,
}

interface StatItem {
  label: string
  value: string
  icon?: string
}

interface StatsSectionProps {
  config: {
    title?: string
    items?: StatItem[]
    style?: 'cards' | 'inline' | 'centered'
  }
  colors?: {
    primary?: string
    accent?: string
  }
}

export default function StatsSection({ config, colors }: StatsSectionProps) {
  const {
    title,
    items = [
      { label: 'Happy Guests', value: '5,000+', icon: 'users' },
      { label: 'Average Rating', value: '4.9', icon: 'star' },
      { label: 'Awards Won', value: '15+', icon: 'award' },
      { label: 'Years of Service', value: '10+', icon: 'calendar' },
    ],
    style = 'cards',
  } = config

  const primaryColor = colors?.primary || '#1f2937'

  if (style === 'centered') {
    return (
      <section className="py-16 px-6 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          {title && (
            <h2 className="text-2xl font-bold text-gray-900 text-center mb-10">
              {title}
            </h2>
          )}
          <div className="flex flex-wrap justify-center gap-12 md:gap-20">
            {items.map((item, index) => (
              <div key={index} className="text-center">
                <div
                  className="text-4xl md:text-5xl font-bold mb-2"
                  style={{ color: primaryColor }}
                >
                  {item.value}
                </div>
                <div className="text-gray-600">{item.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>
    )
  }

  if (style === 'inline') {
    return (
      <section
        className="py-12 px-6"
        style={{ backgroundColor: primaryColor }}
      >
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {items.map((item, index) => (
              <div key={index} className="text-center text-white">
                <div className="text-3xl md:text-4xl font-bold mb-1">
                  {item.value}
                </div>
                <div className="text-white/80">{item.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>
    )
  }

  // Cards style (default)
  return (
    <section className="py-20 px-6 bg-white">
      <div className="max-w-6xl mx-auto">
        {title && (
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">
            {title}
          </h2>
        )}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {items.map((item, index) => {
            const IconComponent = item.icon ? ICONS[item.icon] : Star
            return (
              <div
                key={index}
                className="bg-gray-50 rounded-2xl p-6 text-center hover:shadow-lg transition-shadow"
              >
                <div
                  className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4"
                  style={{ backgroundColor: `${primaryColor}15` }}
                >
                  <IconComponent size={24} style={{ color: primaryColor }} />
                </div>
                <div
                  className="text-3xl font-bold mb-1"
                  style={{ color: primaryColor }}
                >
                  {item.value}
                </div>
                <div className="text-gray-600 text-sm">{item.label}</div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

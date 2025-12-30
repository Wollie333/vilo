import { Wifi, Car, Coffee, MapPin, Utensils, Clock, Shield, Star, Sparkles, Phone, Heart, Sun } from 'lucide-react'

const ICONS: Record<string, any> = {
  wifi: Wifi,
  car: Car,
  coffee: Coffee,
  'map-pin': MapPin,
  utensils: Utensils,
  clock: Clock,
  shield: Shield,
  star: Star,
  sparkles: Sparkles,
  phone: Phone,
  heart: Heart,
  sun: Sun,
}

interface FeatureItem {
  icon: string
  title: string
  description: string
}

interface FeaturesSectionProps {
  config: {
    title?: string
    subtitle?: string
    columns?: number
    items?: FeatureItem[]
  }
  colors?: {
    primary?: string
    accent?: string
  }
}

export default function FeaturesSection({ config, colors }: FeaturesSectionProps) {
  const {
    title = 'Why Choose Us',
    subtitle = 'Experience the difference',
    columns = 4,
    items = [
      { icon: 'wifi', title: 'Free WiFi', description: 'High-speed internet throughout the property' },
      { icon: 'car', title: 'Free Parking', description: 'Secure on-site parking for all guests' },
      { icon: 'coffee', title: 'Breakfast', description: 'Delicious complimentary breakfast daily' },
      { icon: 'map-pin', title: 'Prime Location', description: 'Walking distance to top attractions' },
    ],
  } = config

  const primaryColor = colors?.primary || '#1f2937'

  const gridCols = {
    2: 'md:grid-cols-2',
    3: 'md:grid-cols-3',
    4: 'md:grid-cols-2 lg:grid-cols-4',
  }

  return (
    <section className="py-20 px-6 bg-white">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            {title}
          </h2>
          {subtitle && (
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              {subtitle}
            </p>
          )}
        </div>

        {/* Features Grid */}
        <div className={`grid grid-cols-1 ${gridCols[columns as keyof typeof gridCols] || gridCols[4]} gap-8`}>
          {items.map((item, index) => {
            const IconComponent = ICONS[item.icon] || Star
            return (
              <div
                key={index}
                className="group text-center p-8 rounded-2xl bg-gray-50 hover:bg-white hover:shadow-xl transition-all duration-300"
              >
                <div
                  className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6 transition-transform group-hover:scale-110"
                  style={{ backgroundColor: `${primaryColor}15` }}
                >
                  <IconComponent
                    size={28}
                    style={{ color: primaryColor }}
                  />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">
                  {item.title}
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  {item.description}
                </p>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

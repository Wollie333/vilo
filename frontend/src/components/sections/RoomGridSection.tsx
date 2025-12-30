import { Link } from 'react-router-dom'
import { Users, BedDouble, Star, ChevronRight } from 'lucide-react'
import { Room } from '../../services/api'

interface RoomGridSectionProps {
  config: {
    title?: string
    subtitle?: string
    limit?: number
    showAll?: boolean
    showPrices?: boolean
    showRatings?: boolean
    showCapacity?: boolean
    columns?: number
    ctaText?: string
    ctaLink?: string
    layout?: 'grid' | 'list'
  }
  rooms?: Room[]
  loading?: boolean
  colors?: {
    primary?: string
    accent?: string
  }
}

export default function RoomGridSection({ config, rooms = [], loading, colors }: RoomGridSectionProps) {
  const {
    title = 'Our Accommodations',
    subtitle = 'Find your perfect room',
    limit = 4,
    showAll = false,
    showPrices = true,
    showRatings = true,
    showCapacity = true,
    columns = 3,
    ctaText = 'View All Rooms',
    ctaLink = '/accommodation',
  } = config

  const displayRooms = showAll ? rooms : rooms.slice(0, limit)
  const primaryColor = colors?.primary || '#1f2937'

  const gridCols: Record<number, string> = {
    2: 'md:grid-cols-2',
    3: 'md:grid-cols-2 lg:grid-cols-3',
    4: 'md:grid-cols-2 lg:grid-cols-4',
  }

  const getRoomImage = (room: Room): string | null => {
    if (room.images?.featured?.url) return room.images.featured.url
    if (room.images?.gallery?.[0]?.url) return room.images.gallery[0].url
    return null
  }

  const getRoomPrice = (room: Room): number => {
    return room.base_price_per_night || 0
  }

  const getBedDescription = (room: Room): string | null => {
    if (room.beds && room.beds.length > 0) {
      return room.beds.map(b => b.quantity + ' ' + b.bed_type).join(', ')
    }
    if (room.bed_type) return room.bed_type
    return null
  }

  const gridClass = gridCols[columns] || gridCols[3]

  if (loading) {
    return (
      <section className="py-20 px-6 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/3 mx-auto mb-4" />
            <div className="h-4 bg-gray-200 rounded w-1/2 mx-auto mb-12" />
            <div className={'grid grid-cols-1 ' + gridClass + ' gap-8'}>
              {[1, 2, 3, 4].slice(0, limit).map(i => (
                <div key={i} className="bg-white rounded-2xl overflow-hidden">
                  <div className="h-48 bg-gray-200" />
                  <div className="p-6">
                    <div className="h-5 bg-gray-200 rounded w-3/4 mb-2" />
                    <div className="h-4 bg-gray-200 rounded w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    )
  }

  if (rooms.length === 0) {
    return (
      <section className="py-20 px-6 bg-gray-50">
        <div className="max-w-6xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">{title}</h2>
          <p className="text-gray-600">No rooms available at the moment.</p>
        </div>
      </section>
    )
  }

  return (
    <section className="py-20 px-6 bg-gray-50">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            {title}
          </h2>
          {subtitle && (
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              {subtitle}
            </p>
          )}
        </div>

        <div className={'grid grid-cols-1 ' + gridClass + ' gap-8'}>
          {displayRooms.map((room) => {
            const imageUrl = getRoomImage(room)
            const price = getRoomPrice(room)
            const beds = getBedDescription(room)

            return (
              <Link
                key={room.id}
                to={'/accommodation/' + (room.room_code || room.id)}
                className="group bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300"
              >
                <div className="relative h-56 overflow-hidden">
                  {imageUrl ? (
                    <img
                      src={imageUrl}
                      alt={room.name}
                      className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center">
                      <BedDouble size={48} className="text-gray-400" />
                    </div>
                  )}
                  {showPrices && price > 0 && (
                    <div className="absolute bottom-4 left-4 bg-white/95 backdrop-blur-sm px-4 py-2 rounded-lg shadow-lg">
                      <span className="text-lg font-bold" style={{ color: primaryColor }}>
                        R{price}
                      </span>
                      <span className="text-sm text-gray-500">/night</span>
                    </div>
                  )}
                </div>

                <div className="p-6">
                  <h3 className="text-xl font-semibold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
                    {room.name}
                  </h3>

                  <div className="flex items-center gap-4 text-sm text-gray-500 mb-3">
                    {showCapacity && room.max_guests && (
                      <span className="flex items-center gap-1">
                        <Users size={16} />
                        {room.max_guests} guests
                      </span>
                    )}
                    {beds && (
                      <span className="flex items-center gap-1">
                        <BedDouble size={16} />
                        {beds}
                      </span>
                    )}
                  </div>

                  {showRatings && (room as any).average_rating && (
                    <div className="flex items-center gap-1">
                      <Star size={16} className="text-yellow-400 fill-yellow-400" />
                      <span className="font-medium">{(room as any).average_rating.toFixed(1)}</span>
                    </div>
                  )}
                </div>
              </Link>
            )
          })}
        </div>

        {!showAll && rooms.length > limit && ctaText && ctaLink && (
          <div className="text-center mt-12">
            <Link
              to={ctaLink}
              className="inline-flex items-center gap-2 px-8 py-4 font-semibold rounded-lg transition-all hover:gap-4"
              style={{
                backgroundColor: primaryColor,
                color: 'white',
              }}
            >
              {ctaText}
              <ChevronRight size={20} />
            </Link>
          </div>
        )}
      </div>
    </section>
  )
}


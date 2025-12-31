import { Link } from 'react-router-dom'
import { Star, MapPin, Heart } from 'lucide-react'
import { useState } from 'react'

export interface DiscoveryProperty {
  id: string
  slug: string
  tenantId: string
  name: string
  description?: string
  location: {
    city: string
    region: string
  }
  images: string[]
  priceFrom: number | null
  currency?: string
  rating?: number | null
  reviewCount?: number
  propertyType?: string
  amenities?: string[]
  featured?: boolean
}

interface PropertyCardProps {
  property: DiscoveryProperty
  layout?: 'grid' | 'list'
}

export default function PropertyCard({ property, layout = 'grid' }: PropertyCardProps) {
  const [isFavorite, setIsFavorite] = useState(false)
  const [imageIndex, setImageIndex] = useState(0)

  const mainImage = property.images?.[imageIndex] || 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&auto=format&fit=crop&q=60'

  if (layout === 'list') {
    return (
      <Link
        to={`/accommodation/${property.slug}`}
        className="flex bg-white rounded-xl overflow-hidden border border-gray-100 hover:shadow-lg transition-all group"
      >
        {/* Image */}
        <div className="relative w-72 h-48 flex-shrink-0">
          <img
            src={mainImage}
            alt={property.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
          <button
            onClick={(e) => { e.preventDefault(); setIsFavorite(!isFavorite) }}
            className="absolute top-3 right-3 p-2 bg-white/80 backdrop-blur-sm rounded-full hover:bg-white transition-colors"
          >
            <Heart className={`w-4 h-4 ${isFavorite ? 'fill-red-500 text-red-500' : 'text-gray-600'}`} />
          </button>
          {property.propertyType && (
            <span className="absolute bottom-3 left-3 px-2 py-1 bg-white/90 backdrop-blur-sm text-xs font-medium text-gray-700 rounded">
              {property.propertyType}
            </span>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 p-5 flex flex-col">
          <div className="flex items-start justify-between mb-2">
            <div>
              <h3 className="font-semibold text-gray-900 group-hover:text-emerald-600 transition-colors">
                {property.name}
              </h3>
              <div className="flex items-center gap-1 text-sm text-gray-500 mt-1">
                <MapPin className="w-4 h-4" />
                {property.location.city}, {property.location.region}
              </div>
            </div>
            {property.rating != null && property.rating > 0 && (
              <div className="flex items-center gap-1 bg-emerald-50 px-2 py-1 rounded">
                <Star className="w-4 h-4 text-emerald-500 fill-current" />
                <span className="text-sm font-medium text-emerald-700">{property.rating.toFixed(1)}</span>
                {property.reviewCount != null && property.reviewCount > 0 && (
                  <span className="text-xs text-emerald-600">({property.reviewCount})</span>
                )}
              </div>
            )}
          </div>

          {property.description && (
            <p className="text-sm text-gray-600 line-clamp-2 mb-3">{property.description}</p>
          )}

          {property.amenities && property.amenities.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {property.amenities.slice(0, 4).map((amenity) => (
                <span key={amenity} className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                  {amenity}
                </span>
              ))}
            </div>
          )}

          <div className="mt-auto flex items-center justify-between">
            <div>
              {property.priceFrom ? (
                <>
                  <span className="text-lg font-bold text-gray-900">R{property.priceFrom.toLocaleString()}</span>
                  <span className="text-sm text-gray-500"> / night</span>
                </>
              ) : (
                <span className="text-sm text-gray-500">Price on request</span>
              )}
            </div>
            <span className="text-sm font-medium text-emerald-600 group-hover:text-emerald-700">
              View Property →
            </span>
          </div>
        </div>
      </Link>
    )
  }

  return (
    <Link
      to={`/accommodation/${property.slug}`}
      className="block bg-white rounded-xl overflow-hidden border border-gray-100 hover:shadow-lg transition-all group"
    >
      {/* Image Container */}
      <div className="relative aspect-[4/3] overflow-hidden">
        <img
          src={mainImage}
          alt={property.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />

        {/* Favorite Button */}
        <button
          onClick={(e) => { e.preventDefault(); setIsFavorite(!isFavorite) }}
          className="absolute top-3 right-3 p-2 bg-white/80 backdrop-blur-sm rounded-full hover:bg-white transition-colors"
        >
          <Heart className={`w-4 h-4 ${isFavorite ? 'fill-red-500 text-red-500' : 'text-gray-600'}`} />
        </button>

        {/* Property Type Badge */}
        {property.propertyType && (
          <span className="absolute bottom-3 left-3 px-2 py-1 bg-white/90 backdrop-blur-sm text-xs font-medium text-gray-700 rounded">
            {property.propertyType}
          </span>
        )}

        {/* Image Dots */}
        {property.images && property.images.length > 1 && (
          <div className="absolute bottom-3 right-3 flex gap-1">
            {property.images.slice(0, 5).map((_, i) => (
              <button
                key={i}
                onClick={(e) => { e.preventDefault(); setImageIndex(i) }}
                className={`w-1.5 h-1.5 rounded-full transition-colors ${i === imageIndex ? 'bg-white' : 'bg-white/50'
                  }`}
              />
            ))}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        <div className="flex items-start justify-between mb-1">
          <h3 className="font-semibold text-gray-900 group-hover:text-emerald-600 transition-colors line-clamp-1">
            {property.name}
          </h3>
          {property.rating != null && property.rating > 0 && (
            <div className="flex items-center gap-1 flex-shrink-0">
              <Star className="w-4 h-4 text-emerald-500 fill-current" />
              <span className="text-sm font-medium text-gray-700">{property.rating.toFixed(1)}</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-1 text-sm text-gray-500 mb-3">
          <MapPin className="w-4 h-4" />
          {property.location.city}, {property.location.region}
        </div>

        <div className="flex items-center justify-between">
          <div>
            {property.priceFrom ? (
              <>
                <span className="text-lg font-bold text-gray-900">R{property.priceFrom.toLocaleString()}</span>
                <span className="text-sm text-gray-500"> / night</span>
              </>
            ) : (
              <span className="text-sm text-gray-500">Price on request</span>
            )}
          </div>
          {property.reviewCount != null && property.reviewCount > 0 && (
            <span className="text-xs text-gray-500">{property.reviewCount} reviews</span>
          )}
        </div>
      </div>
    </Link>
  )
}

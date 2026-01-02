import { Image, Bed, Users, DollarSign, Wifi } from 'lucide-react'
import type { BedConfiguration, RoomImages } from '../../services/api'

interface RoomPreviewCardProps {
  name: string
  roomCode: string
  images: RoomImages
  beds: BedConfiguration[]
  maxGuests: number
  basePrice: number
  currency: string
  amenities: string[]
  isActive: boolean
}

export default function RoomPreviewCard({
  name,
  roomCode,
  images,
  beds,
  maxGuests,
  basePrice,
  currency,
  amenities,
  isActive
}: RoomPreviewCardProps) {
  // Format beds for display
  const formatBeds = () => {
    if (!beds || beds.length === 0) return 'No beds configured'

    return beds
      .map(b => `${b.quantity}x ${b.bed_type}`)
      .join(', ')
  }

  // Calculate total sleeps
  const totalSleeps = beds.reduce((sum, bed) => sum + (bed.quantity * bed.sleeps), 0)

  // Format currency
  const formatPrice = (amount: number) => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: currency || 'ZAR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
      {/* Image */}
      <div className="aspect-[4/3] bg-gray-100 relative overflow-hidden">
        {images.featured?.url ? (
          <img
            src={images.featured.url}
            alt={name || 'Room preview'}
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none'
            }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400">
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-gray-200 mx-auto mb-2 flex items-center justify-center">
                <Image size={20} className="text-gray-400" />
              </div>
              <p className="text-sm">No cover image</p>
            </div>
          </div>
        )}

        {/* Active/Inactive Badge */}
        <div className="absolute top-2 right-2">
          <span className={`px-2 py-1 text-xs font-medium rounded-full ${
            isActive
              ? 'bg-emerald-100 text-emerald-700'
              : 'bg-gray-100 text-gray-600'
          }`}>
            {isActive ? 'Active' : 'Inactive'}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="p-3">
        <h4 className="font-semibold text-gray-900 text-sm">
          {name || 'Room Name'}
        </h4>
        {roomCode && (
          <p className="text-xs text-gray-400">{roomCode}</p>
        )}

        {/* Bed & Guest info */}
        <div className="flex flex-col gap-1 mt-2 text-sm text-gray-600">
          <div className="flex items-center gap-2">
            <Bed size={14} className="text-gray-400" />
            <span className="truncate">{formatBeds()}</span>
          </div>
          <div className="flex items-center gap-2">
            <Users size={14} className="text-gray-400" />
            <span>
              {maxGuests || totalSleeps} guest{(maxGuests || totalSleeps) !== 1 ? 's' : ''} max
            </span>
          </div>
        </div>

        {/* Amenities */}
        {amenities.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {amenities.slice(0, 3).map((amenity) => (
              <span
                key={amenity}
                className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 text-xs text-gray-600 rounded"
              >
                <Wifi size={10} className="text-gray-400" />
                {amenity}
              </span>
            ))}
            {amenities.length > 3 && (
              <span className="px-2 py-0.5 bg-gray-100 text-xs text-gray-500 rounded">
                +{amenities.length - 3}
              </span>
            )}
          </div>
        )}

        {/* Price */}
        <div className="mt-3 pt-3 border-t border-gray-100">
          <div className="flex items-center gap-1">
            <DollarSign size={14} className="text-gray-400" />
            <span className="text-lg font-bold text-gray-900">
              {basePrice > 0 ? formatPrice(basePrice) : '--'}
            </span>
            <span className="text-gray-500 text-sm">/night</span>
          </div>
        </div>
      </div>
    </div>
  )
}

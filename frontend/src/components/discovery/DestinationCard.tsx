import { Link } from 'react-router-dom'

export interface Destination {
  slug: string
  name: string
  image: string
  propertyCount: number
}

interface DestinationCardProps {
  destination: Destination
  size?: 'default' | 'large'
}

export default function DestinationCard({ destination, size = 'default' }: DestinationCardProps) {
  const aspectClass = size === 'large' ? 'aspect-[16/10]' : 'aspect-[4/3]'
  const textSizeClass = size === 'large' ? 'text-2xl' : 'text-lg'

  return (
    <Link
      to={`/destinations/${destination.slug}`}
      className="block relative rounded-xl overflow-hidden group"
    >
      <div className={`${aspectClass} relative`}>
        {/* Background Image */}
        <img
          src={destination.image}
          alt={destination.name}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
        />

        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

        {/* Content */}
        <div className="absolute bottom-0 left-0 right-0 p-4">
          <h3 className={`font-bold text-white ${textSizeClass} group-hover:text-accent-300 transition-colors`}>
            {destination.name}
          </h3>
          <p className="text-white/80 text-sm mt-1">
            {destination.propertyCount.toLocaleString()} {destination.propertyCount === 1 ? 'property' : 'properties'}
          </p>
        </div>

        {/* Hover Overlay */}
        <div className="absolute inset-0 bg-accent-500/0 group-hover:bg-accent-500/10 transition-colors" />
      </div>
    </Link>
  )
}

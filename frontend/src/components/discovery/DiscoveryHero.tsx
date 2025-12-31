import SearchBar from './SearchBar'

interface DiscoveryHeroProps {
  propertyCount?: number
}

export default function DiscoveryHero({ propertyCount = 500 }: DiscoveryHeroProps) {
  return (
    <section className="relative min-h-[600px] flex items-center justify-center overflow-hidden">
      {/* Background Image */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage: `url('https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=1920&auto=format&fit=crop&q=80')`,
        }}
      >
        {/* Overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/30 to-black/50" />
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm text-white px-4 py-2 rounded-full text-sm font-medium mb-6 border border-white/20">
          <span className="w-2 h-2 bg-accent-400 rounded-full animate-pulse" />
          {propertyCount}+ places to stay
        </div>

        {/* Headline */}
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-4 leading-tight">
          Find your perfect
          <br />
          <span className="text-accent-400">getaway</span>
        </h1>

        {/* Subheadline */}
        <p className="text-lg sm:text-xl text-white/80 mb-10 max-w-2xl mx-auto">
          Discover unique accommodations across South Africa.
          From beachfront stays to mountain lodges, book directly with hosts.
        </p>

        {/* Search Bar */}
        <div className="max-w-4xl mx-auto">
          <SearchBar variant="expanded" />
        </div>

        {/* Popular searches */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-2">
          <span className="text-white/60 text-sm">Popular:</span>
          {['Cape Town', 'Garden Route', 'Kruger', 'Drakensberg'].map((place) => (
            <a
              key={place}
              href={`/search?location=${encodeURIComponent(place)}`}
              className="px-3 py-1 bg-white/10 backdrop-blur-sm text-white text-sm rounded-full hover:bg-white/20 transition-colors border border-white/10"
            >
              {place}
            </a>
          ))}
        </div>
      </div>

    </section>
  )
}

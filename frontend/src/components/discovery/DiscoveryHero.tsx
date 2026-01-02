import { useState, useEffect } from 'react'
import SearchBar from './SearchBar'

// Hero background images - rotate every 5 seconds
const heroBackgroundImages = [
  'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=1920&auto=format&fit=crop&q=80', // Beach resort
  'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=1920&auto=format&fit=crop&q=80', // Luxury resort pool
  'https://images.unsplash.com/photo-1582719508461-905c673771fd?w=1920&auto=format&fit=crop&q=80', // Boutique hotel room
  'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=1920&auto=format&fit=crop&q=80', // Mountain lodge
]

interface DiscoveryHeroProps {
  propertyCount?: number
}

export default function DiscoveryHero({ propertyCount = 500 }: DiscoveryHeroProps) {
  const [currentBgIndex, setCurrentBgIndex] = useState(0)

  // Preload hero background images
  useEffect(() => {
    heroBackgroundImages.forEach((src) => {
      const img = new Image()
      img.src = src
    })
  }, [])

  // Rotate hero background images every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentBgIndex((prev) => (prev + 1) % heroBackgroundImages.length)
    }, 5000)
    return () => clearInterval(interval)
  }, [])

  return (
    <section className="relative min-h-[600px] flex items-center justify-center overflow-hidden">
      {/* Custom CSS for seamless zoom and crossfade */}
      <style>{`
        .hero-slide {
          position: absolute;
          inset: 0;
          opacity: 0;
          transition: opacity 1.8s ease-in-out;
          overflow: hidden;
        }
        .hero-slide.active {
          opacity: 1;
          z-index: 1;
        }
        /* All images zoom continuously - never stops */
        .hero-image-0 { animation: zoomPulse 30s ease-in-out infinite; animation-delay: 0s; }
        .hero-image-1 { animation: zoomPulse 30s ease-in-out infinite; animation-delay: -7.5s; }
        .hero-image-2 { animation: zoomPulse 30s ease-in-out infinite; animation-delay: -15s; }
        .hero-image-3 { animation: zoomPulse 30s ease-in-out infinite; animation-delay: -22.5s; }

        .hero-image {
          position: absolute;
          inset: 0;
          background-size: cover;
          background-position: center;
        }
        @keyframes zoomPulse {
          0%, 100% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.12);
          }
        }
      `}</style>

      {/* Rotating Background Images - Always Animating */}
      {heroBackgroundImages.map((image, index) => (
        <div
          key={index}
          className={`hero-slide ${index === currentBgIndex ? 'active' : ''}`}
        >
          <div
            className={`hero-image hero-image-${index}`}
            style={{ backgroundImage: `url('${image}')` }}
          />
          {/* Gradient overlays */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/45 via-black/25 to-black/55" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/20 via-transparent to-black/20" />
        </div>
      ))}

      {/* Subtle vignette effect */}
      <div
        className="absolute inset-0 z-[2] pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at center, transparent 0%, transparent 60%, rgba(0,0,0,0.35) 100%)'
        }}
      />

      {/* Top fade for nav blending */}
      <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-b from-black/30 to-transparent z-[2]" />

      {/* Content */}
      <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        {/* Badge */}
        {propertyCount > 0 && (
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md text-white px-5 py-2.5 rounded-full text-sm font-medium mb-8 border border-white/20 shadow-lg">
            <span className="w-2 h-2 bg-accent-400 rounded-full animate-pulse" />
            {propertyCount}+ places to stay
          </div>
        )}

        {/* Headline */}
        <h1
          className="text-4xl sm:text-5xl lg:text-7xl font-bold text-white mb-6 leading-tight tracking-tight"
          style={{ textShadow: '0 4px 30px rgba(0,0,0,0.3)' }}
        >
          Find your perfect
          <br />
          <span className="text-accent-400 inline-block mt-2">getaway</span>
        </h1>

        {/* Subheadline */}
        <p
          className="text-lg sm:text-xl text-white/90 mb-12 max-w-2xl mx-auto font-light leading-relaxed"
          style={{ textShadow: '0 2px 10px rgba(0,0,0,0.3)' }}
        >
          Discover unique accommodations across South Africa.
          <br className="hidden sm:block" />
          From beachfront stays to mountain lodges, book directly with hosts.
        </p>

        {/* Search Bar */}
        <div className="max-w-4xl mx-auto">
          <SearchBar variant="expanded" />
        </div>

        {/* Popular searches */}
        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          <span className="text-white/60 text-sm font-medium">Popular:</span>
          {['Cape Town', 'Garden Route', 'Kruger', 'Drakensberg'].map((place) => (
            <a
              key={place}
              href={`/search?location=${encodeURIComponent(place)}`}
              className="px-4 py-1.5 bg-white/10 backdrop-blur-md text-white text-sm rounded-full hover:bg-white/25 transition-all duration-300 border border-white/20 hover:border-white/40 hover:scale-105"
            >
              {place}
            </a>
          ))}
        </div>
      </div>

      {/* Slide indicators */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-[4] flex gap-2.5">
        {heroBackgroundImages.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentBgIndex(index)}
            className={`h-1.5 rounded-full transition-all duration-700 ease-out ${
              index === currentBgIndex
                ? 'w-10 bg-white shadow-lg'
                : 'w-3 bg-white/40 hover:bg-white/60'
            }`}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>
    </section>
  )
}

import { Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'

interface HeroSectionProps {
  config: {
    title?: string
    subtitle?: string
    backgroundImage?: string | null
    backgroundOverlay?: number
    ctaText?: string
    ctaLink?: string
    secondaryCtaText?: string
    secondaryCtaLink?: string
    height?: 'full' | 'large' | 'medium' | 'small'
    alignment?: 'left' | 'center' | 'right'
  }
  tenant?: {
    business_name?: string | null
    logo_url?: string | null
  } | null
  colors?: {
    primary?: string
    accent?: string
  }
}

export default function HeroSection({ config, tenant }: HeroSectionProps) {
  const {
    title = tenant?.business_name || 'Welcome',
    subtitle = 'Your perfect stay awaits',
    backgroundImage,
    backgroundOverlay = 0.5,
    ctaText = 'Book Now',
    ctaLink = '/book',
    secondaryCtaText,
    secondaryCtaLink,
    height = 'large',
    alignment = 'center',
  } = config

  const heightClasses = {
    full: 'min-h-screen',
    large: 'min-h-[80vh]',
    medium: 'min-h-[60vh]',
    small: 'min-h-[40vh]',
  }

  const alignmentClasses = {
    left: 'text-left items-start',
    center: 'text-center items-center',
    right: 'text-right items-end',
  }

  const defaultBg = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'

  return (
    <section
      className={`relative ${heightClasses[height]} flex items-center justify-center overflow-hidden`}
      style={{
        background: backgroundImage
          ? `url(${backgroundImage})`
          : defaultBg,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black"
        style={{ opacity: backgroundOverlay }}
      />

      {/* Content */}
      <div className={`relative z-10 max-w-4xl mx-auto px-6 flex flex-col ${alignmentClasses[alignment]}`}>
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4 leading-tight">
          {title}
        </h1>
        <p className="text-lg md:text-xl text-white/90 mb-8 max-w-2xl">
          {subtitle}
        </p>
        <div className="flex flex-wrap gap-4 justify-center">
          <Link
            to={ctaLink}
            className="inline-flex items-center gap-2 px-8 py-4 bg-white text-gray-900 font-semibold rounded-lg hover:bg-gray-100 transition-all transform hover:scale-105 shadow-lg"
          >
            {ctaText}
            <ChevronRight size={20} />
          </Link>
          {secondaryCtaText && secondaryCtaLink && (
            <Link
              to={secondaryCtaLink}
              className="inline-flex items-center gap-2 px-8 py-4 bg-transparent text-white font-semibold rounded-lg border-2 border-white/50 hover:bg-white/10 transition-all"
            >
              {secondaryCtaText}
            </Link>
          )}
        </div>
      </div>

      {/* Scroll indicator */}
      {height === 'full' && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
          <div className="w-6 h-10 rounded-full border-2 border-white/50 flex items-start justify-center p-2">
            <div className="w-1 h-3 bg-white/80 rounded-full animate-pulse" />
          </div>
        </div>
      )}
    </section>
  )
}

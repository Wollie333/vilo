import { Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'

interface CTASectionProps {
  config: {
    title?: string
    subtitle?: string
    buttonText?: string
    buttonLink?: string
    secondaryButtonText?: string
    secondaryButtonLink?: string
    style?: 'dark' | 'light' | 'gradient' | 'image'
    backgroundImage?: string
  }
  colors?: {
    primary?: string
    accent?: string
  }
}

export default function CTASection({ config, colors }: CTASectionProps) {
  const {
    title = 'Ready to Book Your Stay?',
    subtitle = 'Experience comfort and hospitality at its finest',
    buttonText = 'Book Now',
    buttonLink = '/book',
    secondaryButtonText,
    secondaryButtonLink,
    style = 'dark',
    backgroundImage,
  } = config

  const primaryColor = colors?.primary || '#1f2937'

  const getBackgroundStyles = () => {
    switch (style) {
      case 'gradient':
        return {
          background: `linear-gradient(135deg, ${primaryColor} 0%, ${primaryColor}dd 100%)`,
        }
      case 'image':
        return {
          backgroundImage: backgroundImage ? `url(${backgroundImage})` : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }
      case 'light':
        return {
          backgroundColor: '#f9fafb',
        }
      case 'dark':
      default:
        return {
          backgroundColor: primaryColor,
        }
    }
  }

  const isLight = style === 'light'
  const textColor = isLight ? 'text-gray-900' : 'text-white'
  const subtitleColor = isLight ? 'text-gray-600' : 'text-white/80'

  return (
    <section
      className="relative py-20 px-6 overflow-hidden"
      style={getBackgroundStyles()}
    >
      {/* Overlay for image style */}
      {style === 'image' && (
        <div className="absolute inset-0 bg-black/50" />
      )}

      {/* Decorative elements */}
      {style === 'dark' && (
        <>
          <div className="absolute top-0 left-0 w-64 h-64 bg-white/5 rounded-full -translate-x-1/2 -translate-y-1/2" />
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-white/5 rounded-full translate-x-1/3 translate-y-1/3" />
        </>
      )}

      <div className="relative z-10 max-w-4xl mx-auto text-center">
        <h2 className={`text-3xl md:text-4xl font-bold mb-4 ${textColor}`}>
          {title}
        </h2>
        {subtitle && (
          <p className={`text-lg mb-8 max-w-2xl mx-auto ${subtitleColor}`}>
            {subtitle}
          </p>
        )}

        <div className="flex flex-wrap gap-4 justify-center">
          <Link
            to={buttonLink}
            className={`inline-flex items-center gap-2 px-8 py-4 font-semibold rounded-lg transition-all transform hover:scale-105 shadow-lg ${
              isLight
                ? 'bg-gray-900 text-white hover:bg-gray-800'
                : 'bg-white text-gray-900 hover:bg-gray-100'
            }`}
          >
            {buttonText}
            <ChevronRight size={20} />
          </Link>

          {secondaryButtonText && secondaryButtonLink && (
            <Link
              to={secondaryButtonLink}
              className={`inline-flex items-center gap-2 px-8 py-4 font-semibold rounded-lg border-2 transition-all ${
                isLight
                  ? 'border-gray-900 text-gray-900 hover:bg-gray-900 hover:text-white'
                  : 'border-white/50 text-white hover:bg-white/10'
              }`}
            >
              {secondaryButtonText}
            </Link>
          )}
        </div>
      </div>
    </section>
  )
}

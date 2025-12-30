import { useMemo } from 'react'
import { Section } from '../../../services/websiteApi'
import { DeviceType, getDeviceWidth } from './DeviceToggle'

interface LivePreviewProps {
  sections: Section[]
  device: DeviceType
  primaryColor?: string
  accentColor?: string
}

export default function LivePreview({
  sections,
  device,
  primaryColor = '#1f2937',
  accentColor = '#3b82f6',
}: LivePreviewProps) {
  const previewWidth = getDeviceWidth(device)
  const isMobile = device === 'mobile'
  const isTablet = device === 'tablet'

  // Filter enabled sections and sort by order
  const enabledSections = useMemo(() => {
    return sections
      .filter((s) => s.enabled)
      .sort((a, b) => a.order - b.order)
  }, [sections])

  return (
    <div className="h-full bg-gray-100 overflow-auto p-4">
      <div
        className="mx-auto bg-white shadow-lg rounded-lg overflow-hidden transition-all duration-300"
        style={{
          width: previewWidth,
          maxWidth: '100%',
          minHeight: '600px',
        }}
      >
        {enabledSections.length === 0 ? (
          <div className="flex items-center justify-center h-96 text-gray-400">
            <div className="text-center">
              <p className="text-lg font-medium mb-2">No sections yet</p>
              <p className="text-sm">Add sections from the left panel to see them here</p>
            </div>
          </div>
        ) : (
          <div className="preview-content">
            {enabledSections.map((section) => (
              <PreviewSection
                key={section.id}
                section={section}
                isMobile={isMobile}
                isTablet={isTablet}
                primaryColor={primaryColor}
                accentColor={accentColor}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// Individual section preview renderer
function PreviewSection({
  section,
  isMobile,
  isTablet,
  primaryColor,
  accentColor,
}: {
  section: Section
  isMobile: boolean
  isTablet: boolean
  primaryColor: string
  accentColor: string
}) {
  const { type, config } = section

  // Get responsive font sizes
  const headingSize = isMobile ? '1.5rem' : isTablet ? '2rem' : '2.5rem'
  const subheadingSize = isMobile ? '0.875rem' : '1rem'

  // Common section wrapper styles
  const sectionStyle: React.CSSProperties = {
    backgroundColor: config.backgroundColor || 'transparent',
    color: config.textColor || 'inherit',
    textAlign: config.alignment || 'left',
  }

  switch (type) {
    case 'hero':
      return (
        <div
          className="relative overflow-hidden"
          style={{
            ...sectionStyle,
            minHeight: getHeroHeight(config.height),
            backgroundImage: config.backgroundImage ? `url(${config.backgroundImage})` : undefined,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        >
          {/* Overlay */}
          {config.backgroundImage && config.backgroundOverlay && (
            <div
              className="absolute inset-0"
              style={{ backgroundColor: `rgba(0,0,0,${config.backgroundOverlay})` }}
            />
          )}
          {/* Content */}
          <div className="relative z-10 flex flex-col items-center justify-center h-full px-6 py-16 text-center">
            {config.title && (
              <h1
                className="font-bold mb-4"
                style={{
                  fontSize: headingSize,
                  color: config.textColor || (config.backgroundImage ? '#ffffff' : primaryColor),
                }}
              >
                {config.title}
              </h1>
            )}
            {config.subtitle && (
              <p
                className="mb-8 max-w-2xl"
                style={{
                  fontSize: subheadingSize,
                  color: config.textColor || (config.backgroundImage ? 'rgba(255,255,255,0.9)' : '#6b7280'),
                }}
              >
                {config.subtitle}
              </p>
            )}
            {config.ctaText && (
              <button
                className="px-6 py-3 rounded-lg font-medium transition-colors"
                style={{
                  backgroundColor: accentColor,
                  color: '#ffffff',
                }}
              >
                {config.ctaText}
              </button>
            )}
          </div>
        </div>
      )

    case 'features':
      const featureColumns = isMobile ? 1 : isTablet ? 2 : (config.columns || 3)
      return (
        <div className="px-6 py-16" style={sectionStyle}>
          <div className="max-w-6xl mx-auto">
            {config.title && (
              <h2
                className="text-2xl font-bold mb-2 text-center"
                style={{ color: config.textColor || primaryColor }}
              >
                {config.title}
              </h2>
            )}
            {config.subtitle && (
              <p className="text-gray-600 text-center mb-10">{config.subtitle}</p>
            )}
            <div
              className="grid gap-8"
              style={{ gridTemplateColumns: `repeat(${featureColumns}, 1fr)` }}
            >
              {(config.items || []).slice(0, 6).map((item, i) => (
                <div key={item.id || i} className="text-center">
                  <div
                    className="w-12 h-12 mx-auto mb-4 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: `${accentColor}20` }}
                  >
                    <span style={{ color: accentColor }}>★</span>
                  </div>
                  <h3 className="font-semibold mb-2" style={{ color: config.textColor || primaryColor }}>
                    {item.title || `Feature ${i + 1}`}
                  </h3>
                  <p className="text-sm text-gray-600">{item.description || 'Feature description'}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )

    case 'room_grid':
    case 'room_carousel':
      const roomColumns = isMobile ? 1 : isTablet ? 2 : 3
      return (
        <div className="px-6 py-16" style={sectionStyle}>
          <div className="max-w-6xl mx-auto">
            {config.title && (
              <h2
                className="text-2xl font-bold mb-2 text-center"
                style={{ color: config.textColor || primaryColor }}
              >
                {config.title}
              </h2>
            )}
            {config.subtitle && (
              <p className="text-gray-600 text-center mb-10">{config.subtitle}</p>
            )}
            <div
              className="grid gap-6"
              style={{ gridTemplateColumns: `repeat(${roomColumns}, 1fr)` }}
            >
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-gray-100 rounded-xl overflow-hidden">
                  <div className="h-48 bg-gray-200 flex items-center justify-center text-gray-400">
                    Room Image {i}
                  </div>
                  <div className="p-4">
                    <h3 className="font-semibold mb-1">Room Name</h3>
                    <p className="text-sm text-gray-500 mb-2">From R1,200/night</p>
                    <button
                      className="text-sm font-medium"
                      style={{ color: accentColor }}
                    >
                      View Details →
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )

    case 'testimonials':
    case 'review_grid':
      return (
        <div className="px-6 py-16 bg-gray-50" style={sectionStyle}>
          <div className="max-w-4xl mx-auto">
            {config.title && (
              <h2
                className="text-2xl font-bold mb-10 text-center"
                style={{ color: config.textColor || primaryColor }}
              >
                {config.title}
              </h2>
            )}
            <div className="grid gap-6" style={{ gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)' }}>
              {[1, 2].map((i) => (
                <div key={i} className="bg-white p-6 rounded-xl shadow-sm">
                  <div className="flex gap-1 mb-3">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <span key={star} className="text-yellow-400">★</span>
                    ))}
                  </div>
                  <p className="text-gray-600 mb-4">"Amazing stay! The room was perfect and the service was excellent."</p>
                  <p className="font-medium text-sm">— Guest Name</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )

    case 'cta':
      return (
        <div
          className="px-6 py-16 text-center"
          style={{
            ...sectionStyle,
            backgroundColor: config.backgroundColor || primaryColor,
          }}
        >
          <div className="max-w-2xl mx-auto">
            {config.title && (
              <h2
                className="text-2xl font-bold mb-4"
                style={{ color: config.textColor || '#ffffff' }}
              >
                {config.title}
              </h2>
            )}
            {config.subtitle && (
              <p
                className="mb-8"
                style={{ color: config.textColor ? `${config.textColor}cc` : 'rgba(255,255,255,0.9)' }}
              >
                {config.subtitle}
              </p>
            )}
            {config.ctaText && (
              <button
                className="px-8 py-3 rounded-lg font-medium transition-colors"
                style={{
                  backgroundColor: '#ffffff',
                  color: primaryColor,
                }}
              >
                {config.ctaText}
              </button>
            )}
          </div>
        </div>
      )

    case 'faq':
      return (
        <div className="px-6 py-16" style={sectionStyle}>
          <div className="max-w-3xl mx-auto">
            {config.title && (
              <h2
                className="text-2xl font-bold mb-10 text-center"
                style={{ color: config.textColor || primaryColor }}
              >
                {config.title}
              </h2>
            )}
            <div className="space-y-4">
              {(config.items || []).slice(0, 5).map((item, i) => (
                <div key={item.id || i} className="border rounded-lg p-4">
                  <h3 className="font-medium mb-2" style={{ color: config.textColor || primaryColor }}>
                    {item.title || `Question ${i + 1}?`}
                  </h3>
                  <p className="text-gray-600 text-sm">
                    {item.description || 'Answer to the question goes here.'}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )

    case 'text_block':
      return (
        <div className="px-6 py-16" style={sectionStyle}>
          <div className="max-w-3xl mx-auto">
            {config.title && (
              <h2
                className="text-2xl font-bold mb-4"
                style={{ color: config.textColor || primaryColor }}
              >
                {config.title}
              </h2>
            )}
            {config.description && (
              <div className="prose prose-gray">
                <p>{config.description}</p>
              </div>
            )}
          </div>
        </div>
      )

    case 'gallery':
      const galleryColumns = isMobile ? 2 : isTablet ? 3 : (config.columns || 3)
      return (
        <div className="px-6 py-16" style={sectionStyle}>
          <div className="max-w-6xl mx-auto">
            {config.title && (
              <h2
                className="text-2xl font-bold mb-10 text-center"
                style={{ color: config.textColor || primaryColor }}
              >
                {config.title}
              </h2>
            )}
            <div
              className="grid gap-4"
              style={{ gridTemplateColumns: `repeat(${galleryColumns}, 1fr)` }}
            >
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div
                  key={i}
                  className="aspect-square bg-gray-200 rounded-lg flex items-center justify-center text-gray-400"
                >
                  Image {i}
                </div>
              ))}
            </div>
          </div>
        </div>
      )

    case 'stats':
      const statsColumns = isMobile ? 2 : (config.columns || 4)
      return (
        <div className="px-6 py-16" style={sectionStyle}>
          <div className="max-w-4xl mx-auto">
            <div
              className="grid gap-8 text-center"
              style={{ gridTemplateColumns: `repeat(${statsColumns}, 1fr)` }}
            >
              {(config.items || []).slice(0, 4).map((item, i) => (
                <div key={item.id || i}>
                  <div
                    className="text-4xl font-bold mb-2"
                    style={{ color: accentColor }}
                  >
                    {item.title || '100+'}
                  </div>
                  <div className="text-gray-600">{item.description || 'Stat Label'}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )

    case 'contact_form':
      return (
        <div className="px-6 py-16" style={sectionStyle}>
          <div className="max-w-4xl mx-auto">
            {config.title && (
              <h2
                className="text-2xl font-bold mb-2 text-center"
                style={{ color: config.textColor || primaryColor }}
              >
                {config.title}
              </h2>
            )}
            {config.subtitle && (
              <p className="text-gray-600 text-center mb-10">{config.subtitle}</p>
            )}
            <div className={`grid gap-8 ${isMobile ? '' : 'grid-cols-2'}`}>
              <div className="space-y-4">
                <input
                  type="text"
                  placeholder="Your Name"
                  className="w-full px-4 py-3 border rounded-lg"
                  disabled
                />
                <input
                  type="email"
                  placeholder="Email Address"
                  className="w-full px-4 py-3 border rounded-lg"
                  disabled
                />
                <textarea
                  placeholder="Your Message"
                  rows={4}
                  className="w-full px-4 py-3 border rounded-lg"
                  disabled
                />
                <button
                  className="px-6 py-3 rounded-lg font-medium text-white"
                  style={{ backgroundColor: accentColor }}
                >
                  Send Message
                </button>
              </div>
              {!isMobile && (
                <div className="bg-gray-100 rounded-lg p-6">
                  <h3 className="font-semibold mb-4">Contact Information</h3>
                  <div className="space-y-3 text-sm text-gray-600">
                    <p>📍 123 Main Street, City</p>
                    <p>📞 +27 12 345 6789</p>
                    <p>✉️ info@example.com</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )

    case 'map':
      return (
        <div className="px-6 py-16" style={sectionStyle}>
          <div className="max-w-6xl mx-auto">
            {config.title && (
              <h2
                className="text-2xl font-bold mb-8 text-center"
                style={{ color: config.textColor || primaryColor }}
              >
                {config.title}
              </h2>
            )}
            <div
              className="bg-gray-200 rounded-lg flex items-center justify-center text-gray-400"
              style={{ height: getMapHeight(config.height) }}
            >
              Google Map Placeholder
            </div>
          </div>
        </div>
      )

    case 'spacer':
      return (
        <div style={{ height: getSpacerHeight(config.height) }} />
      )

    case 'divider':
      return (
        <div className="px-6 py-4">
          <hr className="border-gray-200" />
        </div>
      )

    case 'booking_widget':
      return (
        <div className="px-6 py-16 bg-gray-50" style={sectionStyle}>
          <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-lg p-8">
            <h2
              className="text-xl font-bold mb-6 text-center"
              style={{ color: primaryColor }}
            >
              Book Your Stay
            </h2>
            <div className="grid gap-4 mb-6" style={{ gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)' }}>
              <div>
                <label className="block text-sm font-medium mb-1">Check-in</label>
                <input type="date" className="w-full px-4 py-2 border rounded-lg" disabled />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Check-out</label>
                <input type="date" className="w-full px-4 py-2 border rounded-lg" disabled />
              </div>
            </div>
            <button
              className="w-full py-3 rounded-lg font-medium text-white"
              style={{ backgroundColor: accentColor }}
            >
              Check Availability
            </button>
          </div>
        </div>
      )

    default:
      return (
        <div className="px-6 py-8 bg-gray-100 text-center text-gray-500">
          Unknown section type: {type}
        </div>
      )
  }
}

// Helper functions for heights
function getHeroHeight(height?: string): string {
  switch (height) {
    case 'small': return '40vh'
    case 'medium': return '60vh'
    case 'large': return '80vh'
    case 'full': return '100vh'
    default: return '60vh'
  }
}

function getMapHeight(height?: string): string {
  switch (height) {
    case 'small': return '250px'
    case 'medium': return '400px'
    case 'large': return '550px'
    default: return '400px'
  }
}

function getSpacerHeight(height?: string): string {
  switch (height) {
    case 'small': return '40px'
    case 'medium': return '80px'
    case 'large': return '120px'
    default: return '80px'
  }
}

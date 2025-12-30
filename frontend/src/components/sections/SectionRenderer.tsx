import { SectionConfig, getSectionsForPage } from '../../data/defaultSections'
import { Room, PublicReview } from '../../services/api'
import HeroSection from './HeroSection'
import FeaturesSection from './FeaturesSection'
import RoomGridSection from './RoomGridSection'
import TestimonialsSection from './TestimonialsSection'
import CTASection from './CTASection'
import FAQSection from './FAQSection'
import ContactSection from './ContactSection'
import StatsSection from './StatsSection'

// CMS sections have type as string, we cast to SectionConfig for rendering
interface CMSSectionConfig {
  id: string
  type: string
  enabled: boolean
  order: number
  config: Record<string, unknown>
  styles?: Record<string, unknown>
}

interface SectionRendererProps {
  pageType: string
  sections?: SectionConfig[] | CMSSectionConfig[] | null
  rooms?: Room[]
  reviews?: PublicReview[]
  loading?: boolean
  tenant?: {
    business_name?: string | null
    business_phone?: string | null
    business_email?: string | null
    address_line1?: string | null
    city?: string | null
    state_province?: string | null
    country?: string | null
    logo_url?: string | null
  } | null
  colors?: {
    primary?: string
    secondary?: string
    accent?: string
  }
}

export default function SectionRenderer({
  pageType,
  sections,
  rooms = [],
  reviews = [],
  loading = false,
  tenant,
  colors,
}: SectionRendererProps) {
  // Get sections to render (custom or defaults)
  const sectionsToRender = getSectionsForPage(pageType, sections)

  if (sectionsToRender.length === 0) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <p className="text-gray-500">No content configured for this page.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col">
      {sectionsToRender.map((section) => (
        <SectionComponent
          key={section.id}
          section={section}
          rooms={rooms}
          reviews={reviews}
          loading={loading}
          tenant={tenant}
          colors={colors}
        />
      ))}
    </div>
  )
}

interface SectionComponentProps {
  section: SectionConfig
  rooms: Room[]
  reviews: PublicReview[]
  loading: boolean
  tenant?: SectionRendererProps['tenant']
  colors?: SectionRendererProps['colors']
}

function SectionComponent({
  section,
  rooms,
  reviews,
  loading,
  tenant,
  colors,
}: SectionComponentProps) {
  const props = {
    config: section.config,
    colors,
    tenant,
    loading,
  }

  switch (section.type) {
    case 'hero':
      return <HeroSection {...props} />

    case 'features':
      return <FeaturesSection {...props} />

    case 'room_grid':
    case 'room_carousel':
      return <RoomGridSection {...props} rooms={rooms} />

    case 'testimonials':
    case 'review_grid':
      return <TestimonialsSection {...props} reviews={reviews} />

    case 'cta':
      return <CTASection {...props} />

    case 'faq':
      return <FAQSection {...props} />

    case 'contact_form':
      return <ContactSection {...props} />

    case 'stats':
      return <StatsSection {...props} />

    case 'map':
      // Simple map placeholder
      return (
        <section className="h-96 bg-gray-200 flex items-center justify-center">
          <div className="text-center text-gray-500">
            <p className="text-lg font-medium">Map Coming Soon</p>
            <p className="text-sm">Google Maps integration</p>
          </div>
        </section>
      )

    case 'spacer':
      const height = section.config.height || 60
      return <div style={{ height: `${height}px` }} />

    case 'divider':
      return (
        <div className="max-w-6xl mx-auto px-6 py-8">
          <hr className="border-gray-200" />
        </div>
      )

    case 'text_block':
      return (
        <section className="py-12 px-6">
          <div
            className={`max-w-3xl mx-auto text-${section.config.alignment || 'center'}`}
          >
            <p className="text-lg text-gray-600 leading-relaxed">
              {section.config.content}
            </p>
          </div>
        </section>
      )

    case 'gallery':
      // Simple gallery placeholder
      return (
        <section className="py-16 px-6 bg-gray-50">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-2xl font-bold text-gray-900 text-center mb-8">
              Gallery
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                <div
                  key={i}
                  className="aspect-square bg-gray-200 rounded-lg flex items-center justify-center"
                >
                  <span className="text-gray-400">Image {i}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      )

    case 'booking_widget':
      // Booking widget is handled separately by the Book page
      return null

    default:
      console.warn(`Unknown section type: ${section.type}`)
      return null
  }
}

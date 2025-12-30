import { useState } from 'react'
import {
  X,
  LayoutTemplate,
  Type,
  Image,
  Star,
  MessageSquare,
  Grid3X3,
  HelpCircle,
  BarChart3,
  Phone,
  MapPin,
  Calendar,
  Minus,
  MoveVertical,
  BedDouble,
  LucideIcon,
} from 'lucide-react'
import { SectionType } from '../../../services/websiteApi'

interface AddSectionModalProps {
  isOpen: boolean
  onClose: () => void
  onAdd: (type: SectionType) => void
  pageType?: string
}

interface SectionOption {
  type: SectionType
  label: string
  description: string
  icon: LucideIcon
  category: 'layout' | 'content' | 'hospitality' | 'interactive'
}

const SECTION_OPTIONS: SectionOption[] = [
  // Layout Sections
  {
    type: 'hero',
    label: 'Hero Section',
    description: 'Large header with background, title, and CTA',
    icon: LayoutTemplate,
    category: 'layout',
  },
  {
    type: 'spacer',
    label: 'Spacer',
    description: 'Add vertical spacing between sections',
    icon: MoveVertical,
    category: 'layout',
  },
  {
    type: 'divider',
    label: 'Divider',
    description: 'Horizontal line to separate content',
    icon: Minus,
    category: 'layout',
  },
  // Content Sections
  {
    type: 'text_block',
    label: 'Text Block',
    description: 'Rich text content with heading',
    icon: Type,
    category: 'content',
  },
  {
    type: 'image_text',
    label: 'Image + Text',
    description: 'Side-by-side image and text layout',
    icon: Image,
    category: 'content',
  },
  {
    type: 'features',
    label: 'Features Grid',
    description: 'Icon-based feature highlights',
    icon: Grid3X3,
    category: 'content',
  },
  {
    type: 'gallery',
    label: 'Image Gallery',
    description: 'Grid or masonry image layout',
    icon: Image,
    category: 'content',
  },
  {
    type: 'stats',
    label: 'Stats Counter',
    description: 'Animated number statistics',
    icon: BarChart3,
    category: 'content',
  },
  {
    type: 'cta',
    label: 'Call to Action',
    description: 'Prominent CTA banner',
    icon: Type,
    category: 'content',
  },
  {
    type: 'faq',
    label: 'FAQ Accordion',
    description: 'Collapsible questions and answers',
    icon: HelpCircle,
    category: 'content',
  },
  // Hospitality Sections
  {
    type: 'room_grid',
    label: 'Room Grid',
    description: 'Display your room listings',
    icon: BedDouble,
    category: 'hospitality',
  },
  {
    type: 'room_carousel',
    label: 'Room Carousel',
    description: 'Sliding room showcase',
    icon: BedDouble,
    category: 'hospitality',
  },
  {
    type: 'testimonials',
    label: 'Testimonials',
    description: 'Guest testimonial carousel',
    icon: MessageSquare,
    category: 'hospitality',
  },
  {
    type: 'review_grid',
    label: 'Reviews Grid',
    description: 'Display guest reviews',
    icon: Star,
    category: 'hospitality',
  },
  {
    type: 'booking_widget',
    label: 'Booking Widget',
    description: 'Inline booking form',
    icon: Calendar,
    category: 'hospitality',
  },
  // Interactive Sections
  {
    type: 'contact_form',
    label: 'Contact Form',
    description: 'Contact form with details',
    icon: Phone,
    category: 'interactive',
  },
  {
    type: 'map',
    label: 'Google Map',
    description: 'Embedded location map',
    icon: MapPin,
    category: 'interactive',
  },
]

const CATEGORY_LABELS = {
  layout: 'Layout',
  content: 'Content',
  hospitality: 'Hospitality',
  interactive: 'Interactive',
}

export default function AddSectionModal({ isOpen, onClose, onAdd }: AddSectionModalProps) {
  const [activeCategory, setActiveCategory] = useState<string>('all')

  if (!isOpen) return null

  const categories = ['all', 'layout', 'content', 'hospitality', 'interactive']

  const filteredOptions =
    activeCategory === 'all'
      ? SECTION_OPTIONS
      : SECTION_OPTIONS.filter((o) => o.category === activeCategory)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[80vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b" style={{ borderColor: 'var(--border-color)' }}>
          <div>
            <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
              Add Section
            </h2>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              Choose a section type to add to your page
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            style={{ color: 'var(--text-muted)' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Category Tabs */}
        <div className="flex gap-2 p-4 border-b" style={{ borderColor: 'var(--border-color)' }}>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeCategory === cat
                  ? 'bg-blue-100 text-blue-700'
                  : 'hover:bg-gray-100'
              }`}
              style={{
                color: activeCategory === cat ? undefined : 'var(--text-secondary)',
              }}
            >
              {cat === 'all' ? 'All' : CATEGORY_LABELS[cat as keyof typeof CATEGORY_LABELS]}
            </button>
          ))}
        </div>

        {/* Section Options Grid */}
        <div className="p-6 overflow-y-auto max-h-[calc(80vh-180px)]">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {filteredOptions.map((option) => {
              const Icon = option.icon
              return (
                <button
                  key={option.type}
                  onClick={() => onAdd(option.type)}
                  className="flex flex-col items-center p-4 rounded-xl border-2 border-transparent hover:border-blue-500 hover:bg-blue-50 transition-all text-center group"
                  style={{ backgroundColor: 'var(--bg-secondary)' }}
                >
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center mb-3 group-hover:bg-blue-100 transition-colors"
                    style={{ backgroundColor: 'var(--bg-tertiary)' }}
                  >
                    <Icon size={24} className="text-blue-600" />
                  </div>
                  <h3 className="font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
                    {option.label}
                  </h3>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    {option.description}
                  </p>
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

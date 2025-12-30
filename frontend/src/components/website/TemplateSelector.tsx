import { Check, ExternalLink } from 'lucide-react'
import TemplateThumbnail from './TemplateThumbnail'

interface Template {
  id: number
  name: string
  description: string
}

// Template options for different page types - 8 templates each
export const PAGE_TEMPLATES: Record<string, Template[]> = {
  home: [
    { id: 1, name: 'Classic', description: 'Full hero with search, features grid, room cards, and CTA' },
    { id: 2, name: 'Modern Split', description: 'Split hero, vertical features, large room cards with overlay' },
    { id: 3, name: 'Minimal Focus', description: 'Compact hero, icon bar, 2-column cards, simple layout' },
    { id: 4, name: 'Showcase Gallery', description: 'Hero carousel, overlaid features, masonry room grid' },
    { id: 5, name: 'Luxury', description: 'Dark theme, elegant typography, gold accents' },
    { id: 6, name: 'Nature', description: 'Organic shapes, earthy tones, full-bleed imagery' },
    { id: 7, name: 'Urban', description: 'Bold geometric patterns, modern city aesthetic' },
    { id: 8, name: 'Cozy', description: 'Warm colors, rounded corners, friendly feel' },
  ],
  accommodation: [
    { id: 1, name: 'Grid', description: 'Room cards in a 3-column responsive grid layout' },
    { id: 2, name: 'List', description: 'Horizontal room cards with image and details side by side' },
    { id: 3, name: 'Showcase', description: 'Large featured cards with hover gallery preview effect' },
    { id: 4, name: 'Masonry', description: 'Pinterest-style varying height cards in columns' },
    { id: 5, name: 'Comparison', description: 'Side-by-side feature comparison table layout' },
    { id: 6, name: 'Minimal Cards', description: 'Clean, simple card design with hover effects' },
    { id: 7, name: 'Full Width', description: 'Edge-to-edge images with text overlay' },
    { id: 8, name: 'Magazine', description: 'Editorial-style layout with featured room' },
  ],
  reviews: [
    { id: 1, name: 'Carousel', description: 'Auto-scrolling review carousel with property stats' },
    { id: 2, name: 'Grid', description: '3-column review cards with star ratings and quotes' },
    { id: 3, name: 'Timeline', description: 'Vertical timeline with alternating review cards' },
    { id: 4, name: 'Featured', description: 'One large featured review with grid of others below' },
    { id: 5, name: 'Masonry', description: 'Pinterest-style varying height review cards' },
    { id: 6, name: 'Social', description: 'Social media inspired cards with avatars' },
    { id: 7, name: 'Minimal', description: 'Clean quotes with subtle styling' },
    { id: 8, name: 'Video', description: 'Video testimonials with text reviews below' },
  ],
  contact: [
    { id: 1, name: 'Standard', description: 'Contact form on left with info cards on right sidebar' },
    { id: 2, name: 'Map Focus', description: 'Full-width map header with contact form below' },
    { id: 3, name: 'Card Style', description: 'Centered card layout with form and icons below' },
    { id: 4, name: 'Split Screen', description: '50/50 split with image on left, form on right' },
    { id: 5, name: 'Minimal', description: 'Simple centered form with essential fields only' },
    { id: 6, name: 'Chat Style', description: 'Messaging-inspired layout with chat bubbles' },
    { id: 7, name: 'Multi-Column', description: 'Three column layout with departments' },
    { id: 8, name: 'Hero Contact', description: 'Full hero background with floating form card' },
  ],
  blog: [
    { id: 1, name: 'Classic', description: 'Traditional blog list layout with sidebar categories' },
    { id: 2, name: 'Magazine', description: 'Featured post hero at top with grid of posts below' },
    { id: 3, name: 'Minimal', description: 'Clean single-column list with minimal styling' },
    { id: 4, name: 'Cards', description: '3-column card grid with featured images and excerpts' },
    { id: 5, name: 'Masonry', description: 'Pinterest-style varying height post cards' },
    { id: 6, name: 'Timeline', description: 'Chronological timeline with post previews' },
    { id: 7, name: 'Featured Grid', description: 'Large featured post with 4 smaller posts' },
    { id: 8, name: 'List Compact', description: 'Compact list with small thumbnails' },
  ],
  book: [
    { id: 1, name: 'Wizard', description: 'Multi-step booking wizard with progress indicator' },
    { id: 2, name: 'Single Page', description: 'All booking fields visible with accordion sections' },
    { id: 3, name: 'Compact', description: 'Streamlined quick booking form for fast checkout' },
    { id: 4, name: 'Split', description: 'Room preview on left, booking form on right' },
    { id: 5, name: 'Calendar Focus', description: 'Large calendar picker with sidebar form' },
    { id: 6, name: 'Card Steps', description: 'Card-based steps with animated transitions' },
    { id: 7, name: 'Floating', description: 'Floating card over hero image background' },
    { id: 8, name: 'Timeline', description: 'Vertical timeline-style booking flow' },
  ],
  room_detail: [
    { id: 1, name: 'Gallery', description: 'Image gallery header with room details below' },
    { id: 2, name: 'Immersive', description: 'Full-width images with floating booking card' },
    { id: 3, name: 'Split View', description: 'Side-by-side gallery and details layout' },
    { id: 4, name: 'Tabbed', description: 'Tabs for gallery, amenities, reviews, and booking' },
    { id: 5, name: 'Carousel Hero', description: 'Full-screen carousel with overlay details' },
    { id: 6, name: 'Grid Gallery', description: 'Instagram-style grid with lightbox' },
    { id: 7, name: 'Minimalist', description: 'Clean layout focused on key information' },
    { id: 8, name: 'Magazine', description: 'Editorial layout with large typography' },
  ],
}

// Get page URL for preview
export const getPageUrl = (pageType: string): string => {
  const urlMap: Record<string, string> = {
    home: '/',
    accommodation: '/accommodation',
    reviews: '/reviews',
    contact: '/contact',
    blog: '/blog',
    book: '/book',
    room_detail: '/accommodation', // Opens accommodation as room_detail needs a room ID
  }
  return urlMap[pageType] || '/'
}

interface TemplateSelectorProps {
  pageType: string
  selected: number
  onSelect: (id: number) => void
  primaryColor?: string
  accentColor?: string
  showPreviewButton?: boolean
}

export default function TemplateSelector({
  pageType,
  selected,
  onSelect,
  primaryColor = '#1f2937',
  accentColor = '#3b82f6',
  showPreviewButton = true
}: TemplateSelectorProps) {
  const templates = PAGE_TEMPLATES[pageType] || PAGE_TEMPLATES.home

  const handlePreview = () => {
    const url = getPageUrl(pageType)
    window.open(url, '_blank')
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <label style={{ color: 'var(--text-primary)' }} className="text-sm font-medium">
          Select Template
        </label>
        {showPreviewButton && (
          <button
            type="button"
            onClick={handlePreview}
            style={{ color: 'var(--text-secondary)' }}
            className="text-sm flex items-center gap-1.5 hover:opacity-80 transition-opacity"
          >
            <ExternalLink size={14} />
            Preview Page
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {templates.map((template) => {
          const isSelected = selected === template.id

          return (
            <button
              key={template.id}
              type="button"
              onClick={() => onSelect(template.id)}
              style={{
                backgroundColor: isSelected ? 'var(--bg-tertiary)' : 'var(--bg-card)',
                borderColor: isSelected ? 'var(--text-primary)' : 'var(--border-color)',
              }}
              className={`relative p-3 rounded-lg border-2 text-left transition-all hover:opacity-90 ${
                isSelected ? 'ring-2 ring-blue-500 ring-offset-2' : ''
              }`}
            >
              {isSelected && (
                <div className="absolute top-2 right-2 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center z-10">
                  <Check size={12} className="text-white" />
                </div>
              )}

              {/* Mini HTML Preview Thumbnail */}
              <div className="mb-3 rounded-md overflow-hidden border border-gray-200">
                <TemplateThumbnail
                  pageType={pageType}
                  templateId={template.id}
                  primaryColor={primaryColor}
                  accentColor={accentColor}
                />
              </div>

              <h3 style={{ color: 'var(--text-primary)' }} className="font-medium text-sm">
                {template.name}
              </h3>
              <p style={{ color: 'var(--text-muted)' }} className="text-xs mt-1 leading-relaxed">
                {template.description}
              </p>
            </button>
          )
        })}
      </div>
    </div>
  )
}

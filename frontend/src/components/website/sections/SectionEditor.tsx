import { useState } from 'react'
import { X, Save, Palette, Type, Layout } from 'lucide-react'
import { Section, SectionType, SectionItem } from '../../../services/websiteApi'
import {
  ItemsEditor,
  HeroEditor,
  TestimonialsEditor,
  CTAEditor,
  GalleryEditor,
} from './editors'

interface SectionEditorProps {
  section: Section
  onSave: (section: Section) => void
  onClose: () => void
}

type EditorTab = 'content' | 'style' | 'advanced'

// Get section type label
const getSectionLabel = (type: SectionType): string => {
  const labels: Record<SectionType, string> = {
    hero: 'Hero Section',
    features: 'Features Grid',
    room_grid: 'Room Grid',
    room_carousel: 'Room Carousel',
    testimonials: 'Testimonials',
    review_grid: 'Reviews Grid',
    cta: 'Call to Action',
    faq: 'FAQ Accordion',
    gallery: 'Image Gallery',
    stats: 'Stats Counter',
    text_block: 'Text Block',
    image_text: 'Image + Text',
    contact_form: 'Contact Form',
    map: 'Map',
    booking_widget: 'Booking Widget',
    spacer: 'Spacer',
    divider: 'Divider',
  }
  return labels[type] || type
}

export default function SectionEditor({ section, onSave, onClose }: SectionEditorProps) {
  const [editedSection, setEditedSection] = useState<Section>({ ...section })
  const [activeTab, setActiveTab] = useState<EditorTab>('content')

  const updateConfig = (key: string, value: unknown) => {
    setEditedSection({
      ...editedSection,
      config: { ...editedSection.config, [key]: value },
    })
  }

  const handleSave = () => {
    onSave(editedSection)
  }

  const tabs = [
    { id: 'content' as EditorTab, label: 'Content', icon: Type },
    { id: 'style' as EditorTab, label: 'Style', icon: Palette },
    { id: 'advanced' as EditorTab, label: 'Advanced', icon: Layout },
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b" style={{ borderColor: 'var(--border-color)' }}>
          <div>
            <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
              Edit {getSectionLabel(section.type)}
            </h2>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              Customize section content and appearance
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

        {/* Tabs */}
        <div className="flex border-b" style={{ borderColor: 'var(--border-color)' }}>
          {tabs.map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-6 py-3 border-b-2 transition-colors ${
                  isActive ? 'border-blue-600 text-blue-600' : 'border-transparent'
                }`}
                style={{ color: isActive ? undefined : 'var(--text-secondary)' }}
              >
                <Icon size={16} />
                {tab.label}
              </button>
            )
          })}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'content' && (
            <ContentEditor
              section={editedSection}
              updateConfig={updateConfig}
            />
          )}
          {activeTab === 'style' && (
            <StyleEditor
              section={editedSection}
              updateConfig={updateConfig}
            />
          )}
          {activeTab === 'advanced' && (
            <AdvancedEditor
              section={editedSection}
              updateConfig={updateConfig}
            />
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t" style={{ borderColor: 'var(--border-color)' }}>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg border transition-colors hover:bg-gray-50"
            style={{ borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Save size={16} />
            Save Changes
          </button>
        </div>
      </div>
    </div>
  )
}

// Content Editor based on section type
function ContentEditor({
  section,
  updateConfig,
}: {
  section: Section
  updateConfig: (key: string, value: unknown) => void
}) {
  const { type, config } = section

  // Use specialized editors for specific section types
  if (type === 'hero') {
    return <HeroEditor config={config} onChange={updateConfig} />
  }

  if (type === 'cta') {
    return <CTAEditor config={config} onChange={updateConfig} />
  }

  if (type === 'testimonials') {
    return (
      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
            Section Title
          </label>
          <input
            type="text"
            value={config.title || ''}
            onChange={(e) => updateConfig('title', e.target.value)}
            className="w-full px-4 py-2 rounded-lg border focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            style={{ borderColor: 'var(--border-color)' }}
            placeholder="What Our Guests Say"
          />
        </div>
        <TestimonialsEditor
          items={(config.items as Array<{id: string; quote: string; author: string; role?: string; avatar?: string; rating?: number}>) || []}
          onChange={(items) => updateConfig('items', items)}
          maxItems={8}
        />
      </div>
    )
  }

  if (type === 'gallery') {
    return (
      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
            Section Title
          </label>
          <input
            type="text"
            value={config.title || ''}
            onChange={(e) => updateConfig('title', e.target.value)}
            className="w-full px-4 py-2 rounded-lg border focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            style={{ borderColor: 'var(--border-color)' }}
            placeholder="Our Gallery"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
            Columns
          </label>
          <div className="flex gap-2">
            {[2, 3, 4].map((num) => (
              <button
                key={num}
                onClick={() => updateConfig('columns', num)}
                className={`flex-1 py-2 rounded-lg border transition-colors ${
                  config.columns === num ? 'border-blue-600 bg-blue-50 text-blue-600' : 'hover:bg-gray-50'
                }`}
                style={{
                  borderColor: config.columns === num ? undefined : 'var(--border-color)',
                  color: config.columns === num ? undefined : 'var(--text-secondary)',
                }}
              >
                {num} Columns
              </button>
            ))}
          </div>
        </div>
        <GalleryEditor
          images={(config.images as Array<{id: string; url: string; alt?: string; caption?: string}>) || []}
          onChange={(images) => updateConfig('images', images)}
          maxImages={12}
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Common fields for most section types */}
      {['features', 'room_grid', 'faq', 'stats', 'text_block', 'contact_form', 'map', 'review_grid', 'image_text'].includes(type) && (
        <>
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
              Title
            </label>
            <input
              type="text"
              value={config.title || ''}
              onChange={(e) => updateConfig('title', e.target.value)}
              className="w-full px-4 py-2 rounded-lg border focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              style={{ borderColor: 'var(--border-color)' }}
              placeholder="Enter section title..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
              Subtitle
            </label>
            <input
              type="text"
              value={config.subtitle || ''}
              onChange={(e) => updateConfig('subtitle', e.target.value)}
              className="w-full px-4 py-2 rounded-lg border focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              style={{ borderColor: 'var(--border-color)' }}
              placeholder="Enter section subtitle..."
            />
          </div>
        </>
      )}

      {/* Text block specific */}
      {type === 'text_block' && (
        <div>
          <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
            Content
          </label>
          <textarea
            value={config.description || ''}
            onChange={(e) => updateConfig('description', e.target.value)}
            rows={6}
            className="w-full px-4 py-2 rounded-lg border focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
            style={{ borderColor: 'var(--border-color)' }}
            placeholder="Write your content here..."
          />
        </div>
      )}

      {/* Image + Text section */}
      {type === 'image_text' && (
        <>
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
              Content
            </label>
            <textarea
              value={config.description || ''}
              onChange={(e) => updateConfig('description', e.target.value)}
              rows={4}
              className="w-full px-4 py-2 rounded-lg border focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              style={{ borderColor: 'var(--border-color)' }}
              placeholder="Write your content here..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
              Image URL
            </label>
            <input
              type="text"
              value={(config.imageUrl as string) || ''}
              onChange={(e) => updateConfig('imageUrl', e.target.value)}
              className="w-full px-4 py-2 rounded-lg border focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              style={{ borderColor: 'var(--border-color)' }}
              placeholder="https://example.com/image.jpg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
              Image Position
            </label>
            <div className="flex gap-2">
              {['left', 'right'].map((pos) => (
                <button
                  key={pos}
                  onClick={() => updateConfig('imagePosition', pos)}
                  className={`flex-1 py-2 rounded-lg border transition-colors capitalize ${
                    (config.imagePosition || 'left') === pos ? 'border-blue-600 bg-blue-50 text-blue-600' : 'hover:bg-gray-50'
                  }`}
                  style={{
                    borderColor: (config.imagePosition || 'left') === pos ? undefined : 'var(--border-color)',
                    color: (config.imagePosition || 'left') === pos ? undefined : 'var(--text-secondary)',
                  }}
                >
                  Image {pos}
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Grid sections - columns */}
      {['features', 'stats'].includes(type) && (
        <div>
          <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
            Columns
          </label>
          <div className="flex gap-2">
            {[2, 3, 4].map((num) => (
              <button
                key={num}
                onClick={() => updateConfig('columns', num)}
                className={`flex-1 py-2 rounded-lg border transition-colors ${
                  config.columns === num ? 'border-blue-600 bg-blue-50 text-blue-600' : 'hover:bg-gray-50'
                }`}
                style={{
                  borderColor: config.columns === num ? undefined : 'var(--border-color)',
                  color: config.columns === num ? undefined : 'var(--text-secondary)',
                }}
              >
                {num} Columns
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Features Items Editor */}
      {type === 'features' && (
        <ItemsEditor
          items={(config.items as SectionItem[]) || []}
          onChange={(items) => updateConfig('items', items)}
          itemType="feature"
          maxItems={8}
        />
      )}

      {/* FAQ Items Editor */}
      {type === 'faq' && (
        <ItemsEditor
          items={(config.items as SectionItem[]) || []}
          onChange={(items) => updateConfig('items', items)}
          itemType="faq"
          maxItems={12}
        />
      )}

      {/* Stats Items Editor */}
      {type === 'stats' && (
        <ItemsEditor
          items={(config.items as SectionItem[]) || []}
          onChange={(items) => updateConfig('items', items)}
          itemType="stat"
          maxItems={6}
        />
      )}

      {/* Room/Review sections - limit */}
      {['room_grid', 'room_carousel', 'testimonials', 'review_grid'].includes(type) && (
        <div>
          <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
            Items to Show
          </label>
          <select
            value={config.limit || 4}
            onChange={(e) => updateConfig('limit', parseInt(e.target.value))}
            className="w-full px-4 py-2 rounded-lg border focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
            style={{ borderColor: 'var(--border-color)' }}
          >
            <option value={2}>2 items</option>
            <option value={3}>3 items</option>
            <option value={4}>4 items</option>
            <option value={6}>6 items</option>
            <option value={8}>8 items</option>
            <option value={0}>Show all</option>
          </select>
        </div>
      )}

      {/* Spacer height */}
      {type === 'spacer' && (
        <div>
          <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
            Spacer Height
          </label>
          <div className="flex gap-2">
            {['small', 'medium', 'large'].map((size) => (
              <button
                key={size}
                onClick={() => updateConfig('height', size)}
                className={`flex-1 py-2 rounded-lg border transition-colors capitalize ${
                  config.height === size ? 'border-blue-600 bg-blue-50 text-blue-600' : 'hover:bg-gray-50'
                }`}
                style={{
                  borderColor: config.height === size ? undefined : 'var(--border-color)',
                  color: config.height === size ? undefined : 'var(--text-secondary)',
                }}
              >
                {size}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// Style Editor
function StyleEditor({
  section,
  updateConfig,
}: {
  section: Section
  updateConfig: (key: string, value: unknown) => void
}) {
  const { config } = section

  return (
    <div className="space-y-6">
      {/* Background Color */}
      <div>
        <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
          Background Color
        </label>
        <div className="flex gap-2">
          <input
            type="color"
            value={config.backgroundColor || '#ffffff'}
            onChange={(e) => updateConfig('backgroundColor', e.target.value)}
            className="w-12 h-10 rounded border cursor-pointer"
            style={{ borderColor: 'var(--border-color)' }}
          />
          <input
            type="text"
            value={config.backgroundColor || ''}
            onChange={(e) => updateConfig('backgroundColor', e.target.value)}
            className="flex-1 px-4 py-2 rounded-lg border focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
            style={{ borderColor: 'var(--border-color)' }}
            placeholder="#ffffff or transparent"
          />
        </div>
      </div>

      {/* Text Color */}
      <div>
        <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
          Text Color
        </label>
        <div className="flex gap-2">
          <input
            type="color"
            value={config.textColor || '#1f2937'}
            onChange={(e) => updateConfig('textColor', e.target.value)}
            className="w-12 h-10 rounded border cursor-pointer"
            style={{ borderColor: 'var(--border-color)' }}
          />
          <input
            type="text"
            value={config.textColor || ''}
            onChange={(e) => updateConfig('textColor', e.target.value)}
            className="flex-1 px-4 py-2 rounded-lg border focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
            style={{ borderColor: 'var(--border-color)' }}
            placeholder="#1f2937"
          />
        </div>
      </div>

      {/* Alignment */}
      <div>
        <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
          Alignment
        </label>
        <div className="flex gap-2">
          {['left', 'center', 'right'].map((align) => (
            <button
              key={align}
              onClick={() => updateConfig('alignment', align)}
              className={`flex-1 py-2 rounded-lg border transition-colors capitalize ${
                config.alignment === align ? 'border-blue-600 bg-blue-50 text-blue-600' : 'hover:bg-gray-50'
              }`}
              style={{
                borderColor: config.alignment === align ? undefined : 'var(--border-color)',
                color: config.alignment === align ? undefined : 'var(--text-secondary)',
              }}
            >
              {align}
            </button>
          ))}
        </div>
      </div>

      {/* Background Overlay (for hero) */}
      {section.type === 'hero' && (
        <div>
          <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
            Background Overlay: {Math.round((config.backgroundOverlay || 0) * 100)}%
          </label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={config.backgroundOverlay || 0}
            onChange={(e) => updateConfig('backgroundOverlay', parseFloat(e.target.value))}
            className="w-full"
          />
        </div>
      )}
    </div>
  )
}

// Advanced Editor
function AdvancedEditor({
  section,
  updateConfig,
}: {
  section: Section
  updateConfig: (key: string, value: unknown) => void
}) {
  const { type, config } = section

  return (
    <div className="space-y-6">
      {/* Section Height (for hero) */}
      {type === 'hero' && (
        <div>
          <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
            Section Height
          </label>
          <div className="flex gap-2">
            {['small', 'medium', 'large', 'full'].map((size) => (
              <button
                key={size}
                onClick={() => updateConfig('height', size)}
                className={`flex-1 py-2 rounded-lg border transition-colors capitalize ${
                  config.height === size ? 'border-blue-600 bg-blue-50 text-blue-600' : 'hover:bg-gray-50'
                }`}
                style={{
                  borderColor: config.height === size ? undefined : 'var(--border-color)',
                  color: config.height === size ? undefined : 'var(--text-secondary)',
                }}
              >
                {size}
              </button>
            ))}
          </div>
          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
            Small: 40vh, Medium: 60vh, Large: 80vh, Full: 100vh
          </p>
        </div>
      )}

      {/* Layout style for grids */}
      {['room_grid', 'gallery', 'review_grid'].includes(type) && (
        <div>
          <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
            Layout Style
          </label>
          <div className="flex gap-2">
            {['grid', 'list', 'masonry'].map((layout) => (
              <button
                key={layout}
                onClick={() => updateConfig('layout', layout)}
                className={`flex-1 py-2 rounded-lg border transition-colors capitalize ${
                  config.layout === layout ? 'border-blue-600 bg-blue-50 text-blue-600' : 'hover:bg-gray-50'
                }`}
                style={{
                  borderColor: config.layout === layout ? undefined : 'var(--border-color)',
                  color: config.layout === layout ? undefined : 'var(--text-secondary)',
                }}
              >
                {layout}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Show all toggle */}
      {['room_grid', 'review_grid'].includes(type) && (
        <div className="flex items-center justify-between p-4 rounded-lg border" style={{ borderColor: 'var(--border-color)' }}>
          <div>
            <p className="font-medium" style={{ color: 'var(--text-primary)' }}>
              Show All Items
            </p>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              Display all available items instead of a limited number
            </p>
          </div>
          <button
            onClick={() => updateConfig('showAll', !config.showAll)}
            className={`w-12 h-6 rounded-full transition-colors ${
              config.showAll ? 'bg-blue-600' : 'bg-gray-200'
            }`}
          >
            <div
              className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${
                config.showAll ? 'translate-x-6' : 'translate-x-0.5'
              }`}
            />
          </button>
        </div>
      )}

      {/* Info notice */}
      <div className="p-4 rounded-lg bg-blue-50 border border-blue-100">
        <p className="text-sm text-blue-700">
          More advanced options like custom CSS classes and animations will be available in a future update.
        </p>
      </div>
    </div>
  )
}

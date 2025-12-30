import { Image, Trash2 } from 'lucide-react'
import { SectionConfig } from '../../../../services/websiteApi'

interface CTAEditorProps {
  config: SectionConfig
  onChange: (key: string, value: unknown) => void
}

const STYLE_PRESETS = [
  { value: 'default', label: 'Default', desc: 'Clean with subtle background' },
  { value: 'bold', label: 'Bold', desc: 'Eye-catching with strong colors' },
  { value: 'minimal', label: 'Minimal', desc: 'Simple with plenty of whitespace' },
  { value: 'gradient', label: 'Gradient', desc: 'Modern gradient background' },
]

export default function CTAEditor({ config, onChange }: CTAEditorProps) {
  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
          Headline
        </label>
        <input
          type="text"
          value={config.title || ''}
          onChange={(e) => onChange('title', e.target.value)}
          className="w-full px-4 py-2 rounded-lg border focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          style={{ borderColor: 'var(--border-color)' }}
          placeholder="Ready to Book Your Stay?"
        />
      </div>

      {/* Subtitle/Description */}
      <div>
        <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
          Description
        </label>
        <textarea
          value={config.subtitle || ''}
          onChange={(e) => onChange('subtitle', e.target.value)}
          rows={2}
          className="w-full px-4 py-2 rounded-lg border focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          style={{ borderColor: 'var(--border-color)' }}
          placeholder="Limited time offer - Book now and save 20% on your first stay!"
        />
      </div>

      {/* Divider */}
      <hr style={{ borderColor: 'var(--border-color)' }} />

      {/* Primary Button */}
      <div>
        <label className="block text-sm font-medium mb-3" style={{ color: 'var(--text-primary)' }}>
          Primary Button
        </label>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
              Button Text
            </label>
            <input
              type="text"
              value={config.ctaText || ''}
              onChange={(e) => onChange('ctaText', e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              style={{ borderColor: 'var(--border-color)' }}
              placeholder="Book Now"
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
              Button Link
            </label>
            <input
              type="text"
              value={config.ctaLink || ''}
              onChange={(e) => onChange('ctaLink', e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              style={{ borderColor: 'var(--border-color)' }}
              placeholder="/book"
            />
          </div>
        </div>
      </div>

      {/* Secondary Button */}
      <div>
        <label className="block text-sm font-medium mb-3" style={{ color: 'var(--text-primary)' }}>
          Secondary Button <span className="text-gray-400 text-xs">(optional)</span>
        </label>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
              Button Text
            </label>
            <input
              type="text"
              value={(config.secondaryCtaText as string) || ''}
              onChange={(e) => onChange('secondaryCtaText', e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              style={{ borderColor: 'var(--border-color)' }}
              placeholder="Contact Us"
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
              Button Link
            </label>
            <input
              type="text"
              value={(config.secondaryCtaLink as string) || ''}
              onChange={(e) => onChange('secondaryCtaLink', e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              style={{ borderColor: 'var(--border-color)' }}
              placeholder="/contact"
            />
          </div>
        </div>
      </div>

      {/* Divider */}
      <hr style={{ borderColor: 'var(--border-color)' }} />

      {/* Style Preset */}
      <div>
        <label className="block text-sm font-medium mb-3" style={{ color: 'var(--text-primary)' }}>
          Style Preset
        </label>
        <div className="grid grid-cols-2 gap-2">
          {STYLE_PRESETS.map((preset) => (
            <button
              key={preset.value}
              onClick={() => onChange('stylePreset', preset.value)}
              className={`p-3 rounded-lg border transition-colors text-left ${
                (config.stylePreset || 'default') === preset.value
                  ? 'border-blue-600 bg-blue-50'
                  : 'hover:bg-gray-50'
              }`}
              style={{
                borderColor: (config.stylePreset || 'default') === preset.value ? undefined : 'var(--border-color)',
              }}
            >
              <p
                className="font-medium text-sm"
                style={{
                  color: (config.stylePreset || 'default') === preset.value ? '#2563eb' : 'var(--text-primary)',
                }}
              >
                {preset.label}
              </p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                {preset.desc}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* Background Image (optional) */}
      <div>
        <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
          Background Image <span className="text-gray-400 text-xs">(optional)</span>
        </label>
        {config.backgroundImage ? (
          <div className="relative">
            <img
              src={config.backgroundImage}
              alt="Background preview"
              className="w-full h-24 object-cover rounded-lg"
            />
            <button
              onClick={() => onChange('backgroundImage', '')}
              className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
            >
              <Trash2 size={14} />
            </button>
          </div>
        ) : (
          <div className="flex gap-2">
            <input
              type="text"
              value={config.backgroundImage || ''}
              onChange={(e) => onChange('backgroundImage', e.target.value)}
              className="flex-1 px-3 py-2 text-sm rounded-lg border focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              style={{ borderColor: 'var(--border-color)' }}
              placeholder="https://example.com/cta-bg.jpg"
            />
            <button
              className="px-3 py-2 rounded-lg border hover:bg-gray-50 transition-colors"
              style={{ borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}
              title="Media Library (coming soon)"
            >
              <Image size={16} />
            </button>
          </div>
        )}
      </div>

      {/* Background Overlay (when image is set) */}
      {config.backgroundImage && (
        <div>
          <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
            Dark Overlay: {Math.round((config.backgroundOverlay || 0.5) * 100)}%
          </label>
          <input
            type="range"
            min="0"
            max="0.9"
            step="0.1"
            value={config.backgroundOverlay || 0.5}
            onChange={(e) => onChange('backgroundOverlay', parseFloat(e.target.value))}
            className="w-full"
          />
        </div>
      )}

      {/* Background Color (when no image) */}
      {!config.backgroundImage && (
        <div>
          <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
            Background Color
          </label>
          <div className="flex gap-2">
            <input
              type="color"
              value={config.backgroundColor || '#f3f4f6'}
              onChange={(e) => onChange('backgroundColor', e.target.value)}
              className="w-12 h-10 rounded border cursor-pointer"
              style={{ borderColor: 'var(--border-color)' }}
            />
            <input
              type="text"
              value={config.backgroundColor || ''}
              onChange={(e) => onChange('backgroundColor', e.target.value)}
              className="flex-1 px-3 py-2 text-sm rounded-lg border focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              style={{ borderColor: 'var(--border-color)' }}
              placeholder="#f3f4f6"
            />
          </div>
        </div>
      )}

      {/* Text Alignment */}
      <div>
        <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
          Text Alignment
        </label>
        <div className="flex gap-2">
          {['left', 'center', 'right'].map((align) => (
            <button
              key={align}
              onClick={() => onChange('alignment', align)}
              className={`flex-1 py-2 rounded-lg border transition-colors capitalize ${
                (config.alignment || 'center') === align
                  ? 'border-blue-600 bg-blue-50 text-blue-600'
                  : 'hover:bg-gray-50'
              }`}
              style={{
                borderColor: (config.alignment || 'center') === align ? undefined : 'var(--border-color)',
                color: (config.alignment || 'center') === align ? undefined : 'var(--text-secondary)',
              }}
            >
              {align}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

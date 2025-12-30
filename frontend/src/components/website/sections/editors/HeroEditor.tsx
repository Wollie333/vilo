import { useState } from 'react'
import { Image, Video, Trash2 } from 'lucide-react'
import { SectionConfig } from '../../../../services/websiteApi'

interface HeroEditorProps {
  config: SectionConfig
  onChange: (key: string, value: unknown) => void
}

const HEIGHT_OPTIONS = [
  { value: 'small', label: 'Small', desc: '40% viewport height' },
  { value: 'medium', label: 'Medium', desc: '60% viewport height' },
  { value: 'large', label: 'Large', desc: '80% viewport height' },
  { value: 'full', label: 'Full Screen', desc: '100% viewport height' },
]

const ALIGNMENT_OPTIONS = [
  { value: 'left', label: 'Left' },
  { value: 'center', label: 'Center' },
  { value: 'right', label: 'Right' },
]

export default function HeroEditor({ config, onChange }: HeroEditorProps) {
  const [bgType, setBgType] = useState<'color' | 'image' | 'video'>(
    config.backgroundVideo ? 'video' : config.backgroundImage ? 'image' : 'color'
  )

  const handleBgTypeChange = (type: 'color' | 'image' | 'video') => {
    setBgType(type)
    if (type === 'color') {
      onChange('backgroundImage', '')
      onChange('backgroundVideo', '')
    } else if (type === 'image') {
      onChange('backgroundVideo', '')
    }
  }

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
          Hero Title
        </label>
        <input
          type="text"
          value={config.title || ''}
          onChange={(e) => onChange('title', e.target.value)}
          className="w-full px-4 py-2 rounded-lg border focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          style={{ borderColor: 'var(--border-color)' }}
          placeholder="Welcome to Paradise"
        />
      </div>

      {/* Subtitle */}
      <div>
        <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
          Subtitle
        </label>
        <textarea
          value={config.subtitle || ''}
          onChange={(e) => onChange('subtitle', e.target.value)}
          rows={2}
          className="w-full px-4 py-2 rounded-lg border focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          style={{ borderColor: 'var(--border-color)' }}
          placeholder="Your perfect getaway awaits"
        />
      </div>

      {/* CTA Buttons */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
            Button Text
          </label>
          <input
            type="text"
            value={config.ctaText || ''}
            onChange={(e) => onChange('ctaText', e.target.value)}
            className="w-full px-4 py-2 rounded-lg border focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            style={{ borderColor: 'var(--border-color)' }}
            placeholder="Book Now"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
            Button Link
          </label>
          <input
            type="text"
            value={config.ctaLink || ''}
            onChange={(e) => onChange('ctaLink', e.target.value)}
            className="w-full px-4 py-2 rounded-lg border focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            style={{ borderColor: 'var(--border-color)' }}
            placeholder="/book"
          />
        </div>
      </div>

      {/* Secondary CTA */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
            Secondary Button Text <span className="text-gray-400 text-xs">(optional)</span>
          </label>
          <input
            type="text"
            value={(config.secondaryCtaText as string) || ''}
            onChange={(e) => onChange('secondaryCtaText', e.target.value)}
            className="w-full px-4 py-2 rounded-lg border focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            style={{ borderColor: 'var(--border-color)' }}
            placeholder="Learn More"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
            Secondary Button Link
          </label>
          <input
            type="text"
            value={(config.secondaryCtaLink as string) || ''}
            onChange={(e) => onChange('secondaryCtaLink', e.target.value)}
            className="w-full px-4 py-2 rounded-lg border focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            style={{ borderColor: 'var(--border-color)' }}
            placeholder="/about"
          />
        </div>
      </div>

      {/* Divider */}
      <hr style={{ borderColor: 'var(--border-color)' }} />

      {/* Background Type */}
      <div>
        <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
          Background Type
        </label>
        <div className="flex gap-2">
          {[
            { value: 'color' as const, label: 'Color', icon: null },
            { value: 'image' as const, label: 'Image', icon: Image },
            { value: 'video' as const, label: 'Video', icon: Video },
          ].map((opt) => (
            <button
              key={opt.value}
              onClick={() => handleBgTypeChange(opt.value)}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg border transition-colors ${
                bgType === opt.value ? 'border-blue-600 bg-blue-50 text-blue-600' : 'hover:bg-gray-50'
              }`}
              style={{
                borderColor: bgType === opt.value ? undefined : 'var(--border-color)',
                color: bgType === opt.value ? undefined : 'var(--text-secondary)',
              }}
            >
              {opt.icon && <opt.icon size={16} />}
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Background Color */}
      {bgType === 'color' && (
        <div>
          <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
            Background Color
          </label>
          <div className="flex gap-2">
            <input
              type="color"
              value={config.backgroundColor || '#1f2937'}
              onChange={(e) => onChange('backgroundColor', e.target.value)}
              className="w-12 h-10 rounded border cursor-pointer"
              style={{ borderColor: 'var(--border-color)' }}
            />
            <input
              type="text"
              value={config.backgroundColor || ''}
              onChange={(e) => onChange('backgroundColor', e.target.value)}
              className="flex-1 px-4 py-2 rounded-lg border focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              style={{ borderColor: 'var(--border-color)' }}
              placeholder="#1f2937"
            />
          </div>
        </div>
      )}

      {/* Background Image */}
      {bgType === 'image' && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
              Background Image
            </label>
            {config.backgroundImage ? (
              <div className="relative">
                <img
                  src={config.backgroundImage}
                  alt="Background preview"
                  className="w-full h-32 object-cover rounded-lg"
                />
                <button
                  onClick={() => onChange('backgroundImage', '')}
                  className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={config.backgroundImage || ''}
                  onChange={(e) => onChange('backgroundImage', e.target.value)}
                  className="flex-1 px-4 py-2 rounded-lg border focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  style={{ borderColor: 'var(--border-color)' }}
                  placeholder="https://example.com/image.jpg"
                />
                <button
                  className="px-4 py-2 rounded-lg border hover:bg-gray-50 transition-colors"
                  style={{ borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}
                  title="Media Library (coming soon)"
                >
                  <Image size={18} />
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Background Video */}
      {bgType === 'video' && (
        <div>
          <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
            Video URL (YouTube or MP4)
          </label>
          <input
            type="text"
            value={(config.backgroundVideo as string) || ''}
            onChange={(e) => onChange('backgroundVideo', e.target.value)}
            className="w-full px-4 py-2 rounded-lg border focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            style={{ borderColor: 'var(--border-color)' }}
            placeholder="https://www.youtube.com/watch?v=..."
          />
          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
            Supports YouTube, Vimeo, or direct MP4 links
          </p>
        </div>
      )}

      {/* Background Overlay */}
      {(bgType === 'image' || bgType === 'video') && (
        <div>
          <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
            Dark Overlay: {Math.round((config.backgroundOverlay || 0.4) * 100)}%
          </label>
          <input
            type="range"
            min="0"
            max="0.9"
            step="0.1"
            value={config.backgroundOverlay || 0.4}
            onChange={(e) => onChange('backgroundOverlay', parseFloat(e.target.value))}
            className="w-full"
          />
          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
            Darkens the background to improve text readability
          </p>
        </div>
      )}

      {/* Divider */}
      <hr style={{ borderColor: 'var(--border-color)' }} />

      {/* Height */}
      <div>
        <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
          Section Height
        </label>
        <div className="grid grid-cols-2 gap-2">
          {HEIGHT_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => onChange('height', opt.value)}
              className={`p-3 rounded-lg border transition-colors text-left ${
                config.height === opt.value ? 'border-blue-600 bg-blue-50' : 'hover:bg-gray-50'
              }`}
              style={{
                borderColor: config.height === opt.value ? undefined : 'var(--border-color)',
              }}
            >
              <p
                className="font-medium text-sm"
                style={{ color: config.height === opt.value ? '#2563eb' : 'var(--text-primary)' }}
              >
                {opt.label}
              </p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                {opt.desc}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* Text Alignment */}
      <div>
        <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
          Text Alignment
        </label>
        <div className="flex gap-2">
          {ALIGNMENT_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => onChange('alignment', opt.value)}
              className={`flex-1 py-2 rounded-lg border transition-colors ${
                config.alignment === opt.value ? 'border-blue-600 bg-blue-50 text-blue-600' : 'hover:bg-gray-50'
              }`}
              style={{
                borderColor: config.alignment === opt.value ? undefined : 'var(--border-color)',
                color: config.alignment === opt.value ? undefined : 'var(--text-secondary)',
              }}
            >
              {opt.label}
            </button>
          ))}
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
            value={config.textColor || '#ffffff'}
            onChange={(e) => onChange('textColor', e.target.value)}
            className="w-12 h-10 rounded border cursor-pointer"
            style={{ borderColor: 'var(--border-color)' }}
          />
          <input
            type="text"
            value={config.textColor || ''}
            onChange={(e) => onChange('textColor', e.target.value)}
            className="flex-1 px-4 py-2 rounded-lg border focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            style={{ borderColor: 'var(--border-color)' }}
            placeholder="#ffffff"
          />
        </div>
      </div>
    </div>
  )
}

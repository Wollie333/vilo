import { useState } from 'react'
import { Search, Image, Link, EyeOff, HelpCircle } from 'lucide-react'

interface SEOFieldsProps {
  title: string
  setTitle: (v: string) => void
  description: string
  setDescription: (v: string) => void
  keywords?: string
  setKeywords?: (v: string) => void
  ogImage: string
  setOgImage: (v: string) => void
  canonicalUrl?: string
  setCanonicalUrl?: (v: string) => void
  noIndex: boolean
  setNoIndex: (v: boolean) => void
  showPreview?: boolean
  siteName?: string
}

// Character limit guidelines
const SEO_LIMITS = {
  title: { optimal: 60, max: 70 },
  description: { optimal: 155, max: 160 },
}

function CharacterCounter({ current, optimal, max }: { current: number; optimal: number; max: number }) {
  let color = 'text-green-600'
  if (current > max) {
    color = 'text-red-600'
  } else if (current > optimal) {
    color = 'text-yellow-600'
  } else if (current < 30) {
    color = 'text-gray-400'
  }

  return (
    <span className={`text-xs ${color}`}>
      {current}/{optimal} characters {current > max && '(too long)'}
    </span>
  )
}

function Tooltip({ text }: { text: string }) {
  return (
    <div className="group relative inline-block ml-1">
      <HelpCircle size={14} className="text-gray-400 cursor-help" />
      <div className="hidden group-hover:block absolute z-10 w-64 p-2 text-xs text-white bg-gray-900 rounded-lg shadow-lg -top-2 left-6">
        {text}
      </div>
    </div>
  )
}

export default function SEOFields({
  title,
  setTitle,
  description,
  setDescription,
  keywords,
  setKeywords,
  ogImage,
  setOgImage,
  canonicalUrl,
  setCanonicalUrl,
  noIndex,
  setNoIndex,
  showPreview = true,
  siteName = 'Your Website',
}: SEOFieldsProps) {
  const [showOgImagePreview, setShowOgImagePreview] = useState(false)

  return (
    <div className="space-y-6">
      {/* Google Preview */}
      {showPreview && (title || description) && (
        <div
          style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }}
          className="rounded-lg border p-4"
        >
          <div className="flex items-center gap-2 mb-3">
            <Search size={14} style={{ color: 'var(--text-muted)' }} />
            <span style={{ color: 'var(--text-muted)' }} className="text-xs font-medium">
              Google Search Preview
            </span>
          </div>
          <div className="max-w-xl">
            <div className="text-blue-600 text-lg hover:underline cursor-pointer truncate">
              {title || 'Page Title'}
              {siteName && ` | ${siteName}`}
            </div>
            <div className="text-green-700 text-sm truncate">
              https://yourwebsite.com/page
            </div>
            <div style={{ color: 'var(--text-secondary)' }} className="text-sm line-clamp-2">
              {description || 'Add a meta description to see how it will appear in search results...'}
            </div>
          </div>
        </div>
      )}

      {/* SEO Title */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label style={{ color: 'var(--text-primary)' }} className="text-sm font-medium flex items-center">
            SEO Title
            <Tooltip text="The title that appears in search engine results and browser tabs. Keep it under 60 characters for best display." />
          </label>
          <CharacterCounter
            current={title.length}
            optimal={SEO_LIMITS.title.optimal}
            max={SEO_LIMITS.title.max}
          />
        </div>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Enter SEO title..."
          style={{
            backgroundColor: 'var(--bg-primary)',
            borderColor: 'var(--border-color)',
            color: 'var(--text-primary)',
          }}
          className="w-full px-3 py-2 rounded-lg border focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
        />
      </div>

      {/* Meta Description */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label style={{ color: 'var(--text-primary)' }} className="text-sm font-medium flex items-center">
            Meta Description
            <Tooltip text="A brief summary of the page content. This appears below the title in search results. Aim for 150-160 characters." />
          </label>
          <CharacterCounter
            current={description.length}
            optimal={SEO_LIMITS.description.optimal}
            max={SEO_LIMITS.description.max}
          />
        </div>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Enter meta description..."
          rows={3}
          style={{
            backgroundColor: 'var(--bg-primary)',
            borderColor: 'var(--border-color)',
            color: 'var(--text-primary)',
          }}
          className="w-full px-3 py-2 rounded-lg border focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors resize-none"
        />
      </div>

      {/* Keywords (optional) */}
      {setKeywords && (
        <div>
          <label style={{ color: 'var(--text-primary)' }} className="text-sm font-medium flex items-center mb-1">
            Keywords
            <Tooltip text="Comma-separated keywords relevant to this page. While less important for modern SEO, they can still help with content organization." />
          </label>
          <input
            type="text"
            value={keywords || ''}
            onChange={(e) => setKeywords(e.target.value)}
            placeholder="keyword1, keyword2, keyword3..."
            style={{
              backgroundColor: 'var(--bg-primary)',
              borderColor: 'var(--border-color)',
              color: 'var(--text-primary)',
            }}
            className="w-full px-3 py-2 rounded-lg border focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
          />
        </div>
      )}

      {/* OG Image */}
      <div>
        <label style={{ color: 'var(--text-primary)' }} className="text-sm font-medium flex items-center mb-1">
          <Image size={14} className="mr-1" />
          Open Graph Image
          <Tooltip text="The image that appears when your page is shared on social media. Recommended size: 1200x630 pixels." />
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={ogImage}
            onChange={(e) => setOgImage(e.target.value)}
            placeholder="https://example.com/image.jpg"
            style={{
              backgroundColor: 'var(--bg-primary)',
              borderColor: 'var(--border-color)',
              color: 'var(--text-primary)',
            }}
            className="flex-1 px-3 py-2 rounded-lg border focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
          />
          {ogImage && (
            <button
              type="button"
              onClick={() => setShowOgImagePreview(!showOgImagePreview)}
              style={{
                backgroundColor: 'var(--bg-secondary)',
                borderColor: 'var(--border-color)',
                color: 'var(--text-secondary)'
              }}
              className="px-3 py-2 rounded-lg border hover:opacity-80 transition-colors"
            >
              {showOgImagePreview ? 'Hide' : 'Preview'}
            </button>
          )}
        </div>
        {showOgImagePreview && ogImage && (
          <div className="mt-2 rounded-lg overflow-hidden border" style={{ borderColor: 'var(--border-color)' }}>
            <img
              src={ogImage}
              alt="OG Image preview"
              className="w-full max-h-48 object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none'
              }}
            />
          </div>
        )}
      </div>

      {/* Canonical URL (optional) */}
      {setCanonicalUrl && (
        <div>
          <label style={{ color: 'var(--text-primary)' }} className="text-sm font-medium flex items-center mb-1">
            <Link size={14} className="mr-1" />
            Canonical URL
            <Tooltip text="If this page has duplicate content at multiple URLs, specify the preferred URL here. Leave empty to use the current page URL." />
          </label>
          <input
            type="text"
            value={canonicalUrl || ''}
            onChange={(e) => setCanonicalUrl(e.target.value)}
            placeholder="https://yourwebsite.com/preferred-url"
            style={{
              backgroundColor: 'var(--bg-primary)',
              borderColor: 'var(--border-color)',
              color: 'var(--text-primary)',
            }}
            className="w-full px-3 py-2 rounded-lg border focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
          />
        </div>
      )}

      {/* No Index Toggle */}
      <div
        style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }}
        className="rounded-lg border p-4"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <EyeOff size={16} style={{ color: 'var(--text-secondary)' }} className="mr-2" />
            <div>
              <span style={{ color: 'var(--text-primary)' }} className="text-sm font-medium">
                Hide from Search Engines
              </span>
              <p style={{ color: 'var(--text-muted)' }} className="text-xs mt-0.5">
                When enabled, search engines will not index this page
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setNoIndex(!noIndex)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              noIndex ? 'bg-red-500' : 'bg-gray-300'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                noIndex ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      </div>
    </div>
  )
}

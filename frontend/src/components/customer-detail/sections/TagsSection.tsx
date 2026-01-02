import { useState } from 'react'
import { Tag, Plus, X, Check } from 'lucide-react'

interface TagsSectionProps {
  tags: string[]
  availableTags?: string[] // Suggested/existing tags in the system
  onAddTag?: (tag: string) => Promise<void>
  onRemoveTag?: (tag: string) => Promise<void>
}

// Default suggested tags for customer segmentation
const DEFAULT_SUGGESTED_TAGS = [
  'VIP',
  'Repeat Guest',
  'Business Traveler',
  'Family',
  'Couple',
  'Solo Traveler',
  'Long Stay',
  'Early Bird',
  'Late Booker',
  'High Value',
  'Referral',
  'Influencer',
  'Corporate',
  'Event Guest'
]

export default function TagsSection({
  tags,
  availableTags = DEFAULT_SUGGESTED_TAGS,
  onAddTag,
  onRemoveTag
}: TagsSectionProps) {
  const [isAdding, setIsAdding] = useState(false)
  const [newTag, setNewTag] = useState('')
  const [saving, setSaving] = useState(false)

  // Filter out already used tags from suggestions
  const unusedTags = availableTags.filter(t => !tags.includes(t))

  const handleAddTag = async (tag: string) => {
    if (!tag.trim() || !onAddTag) return

    const normalizedTag = tag.trim()
    if (tags.includes(normalizedTag)) return

    try {
      setSaving(true)
      await onAddTag(normalizedTag)
      setNewTag('')
      setIsAdding(false)
    } catch (error) {
      console.error('Failed to add tag:', error)
    } finally {
      setSaving(false)
    }
  }

  const handleRemoveTag = async (tag: string) => {
    if (!onRemoveTag) return

    try {
      await onRemoveTag(tag)
    } catch (error) {
      console.error('Failed to remove tag:', error)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleAddTag(newTag)
    } else if (e.key === 'Escape') {
      setIsAdding(false)
      setNewTag('')
    }
  }

  // Tag color based on hash of tag name
  const getTagColor = (tag: string): string => {
    const colors = [
      'bg-blue-100 text-blue-700 border-blue-200',
      'bg-purple-100 text-purple-700 border-purple-200',
      'bg-pink-100 text-pink-700 border-pink-200',
      'bg-indigo-100 text-indigo-700 border-indigo-200',
      'bg-cyan-100 text-cyan-700 border-cyan-200',
      'bg-teal-100 text-teal-700 border-teal-200',
      'bg-emerald-100 text-emerald-700 border-emerald-200',
      'bg-amber-100 text-amber-700 border-amber-200',
      'bg-orange-100 text-orange-700 border-orange-200',
      'bg-rose-100 text-rose-700 border-rose-200',
    ]

    // Special colors for specific tags
    if (tag === 'VIP') return 'bg-amber-100 text-amber-700 border-amber-300'
    if (tag === 'High Value') return 'bg-emerald-100 text-emerald-700 border-emerald-300'

    const hash = tag.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
    return colors[hash % colors.length]
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900">Customer Tags</h3>
        {onAddTag && !isAdding && (
          <button
            onClick={() => setIsAdding(true)}
            className="flex items-center gap-1.5 text-sm text-accent-600 hover:text-accent-700 font-medium"
          >
            <Plus size={14} />
            Add Tag
          </button>
        )}
      </div>

      {/* Current Tags */}
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {tags.map((tag) => (
            <span
              key={tag}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-full border ${getTagColor(tag)}`}
            >
              {tag}
              {onRemoveTag && (
                <button
                  onClick={() => handleRemoveTag(tag)}
                  className="p-0.5 hover:bg-black/10 rounded-full transition-colors"
                >
                  <X size={12} />
                </button>
              )}
            </span>
          ))}
        </div>
      )}

      {/* Add Tag Form */}
      {isAdding && (
        <div className="p-4 bg-gray-50 rounded-xl">
          <div className="flex items-center gap-2 mb-3">
            <input
              type="text"
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Enter a custom tag..."
              className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-500/20 focus:border-accent-500"
              autoFocus
            />
            <button
              onClick={() => handleAddTag(newTag)}
              disabled={saving || !newTag.trim()}
              className="flex items-center gap-1 px-3 py-2 text-sm text-white bg-accent-600 hover:bg-accent-700 font-medium rounded-lg disabled:opacity-50"
            >
              {saving ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Check size={14} />
              )}
            </button>
            <button
              onClick={() => { setIsAdding(false); setNewTag('') }}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
            >
              <X size={16} />
            </button>
          </div>

          {/* Suggested Tags */}
          {unusedTags.length > 0 && (
            <div>
              <p className="text-xs text-gray-500 mb-2">Quick add:</p>
              <div className="flex flex-wrap gap-2">
                {unusedTags.slice(0, 8).map((tag) => (
                  <button
                    key={tag}
                    onClick={() => handleAddTag(tag)}
                    disabled={saving}
                    className="px-2.5 py-1 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-full hover:border-accent-300 hover:text-accent-600 transition-colors disabled:opacity-50"
                  >
                    + {tag}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Empty State */}
      {tags.length === 0 && !isAdding && (
        <div className="py-16 text-center">
          <Tag size={40} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500">No tags assigned</p>
          <p className="text-sm text-gray-400 mt-1">
            Tags help you segment and organize customers
          </p>
        </div>
      )}

      {/* Tags Guide */}
      <div className="p-4 bg-gray-50 rounded-lg mt-6">
        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
          Tag Tips
        </h4>
        <ul className="text-sm text-gray-600 space-y-1">
          <li>• Use tags to segment customers for targeted communication</li>
          <li>• Add "VIP" for high-value guests who need special attention</li>
          <li>• Track guest types like "Business Traveler" or "Family"</li>
        </ul>
      </div>
    </div>
  )
}

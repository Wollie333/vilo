import { useState, useEffect } from 'react'
import { Check, Tag, Compass } from 'lucide-react'
import * as LucideIcons from 'lucide-react'
import { discoveryApi, PropertyCategory, CategoriesGrouped } from '../../services/discoveryApi'

interface CategorySelectorProps {
  selectedCategories: string[]
  onChange: (categories: string[]) => void
  maxCategories?: number
}

export default function CategorySelector({
  selectedCategories,
  onChange,
  maxCategories = 5
}: CategorySelectorProps) {
  const [categories, setCategories] = useState<CategoriesGrouped | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const data = await discoveryApi.getCategories()
        setCategories(data)
      } catch (err) {
        console.error('Error fetching categories:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchCategories()
  }, [])

  const toggleCategory = (slug: string) => {
    if (selectedCategories.includes(slug)) {
      onChange(selectedCategories.filter(s => s !== slug))
    } else if (selectedCategories.length < maxCategories) {
      onChange([...selectedCategories, slug])
    }
  }

  // Get the icon component dynamically
  const getIcon = (iconName?: string, className?: string) => {
    if (!iconName) return null
    const IconComponent = (LucideIcons as unknown as Record<string, React.ComponentType<{ className?: string; size?: number }>>)[iconName]
    return IconComponent ? <IconComponent size={16} className={className} /> : null
  }

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-6 bg-gray-100 rounded w-32" />
        <div className="grid grid-cols-2 gap-2">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-12 bg-gray-100 rounded-lg" />
          ))}
        </div>
      </div>
    )
  }

  if (!categories) {
    return (
      <div className="text-sm text-gray-500">
        Failed to load categories. Please try again.
      </div>
    )
  }

  const CategoryButton = ({ category }: { category: PropertyCategory }) => {
    const isSelected = selectedCategories.includes(category.slug)
    const isDisabled = !isSelected && selectedCategories.length >= maxCategories

    return (
      <button
        type="button"
        onClick={() => toggleCategory(category.slug)}
        disabled={isDisabled}
        className={`
          relative flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all
          ${isSelected
            ? 'bg-emerald-100 text-emerald-800 border-2 border-emerald-500'
            : isDisabled
              ? 'bg-gray-50 text-gray-400 border-2 border-gray-200 cursor-not-allowed'
              : 'bg-white text-gray-700 border-2 border-gray-200 hover:border-gray-300 hover:bg-gray-50'
          }
        `}
      >
        {category.icon && getIcon(category.icon, isSelected ? 'text-emerald-600' : 'text-gray-400')}
        <span>{category.name}</span>
        {isSelected && (
          <Check className="w-4 h-4 text-emerald-600 ml-auto" />
        )}
      </button>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between text-sm text-gray-500">
        <span>Select categories that describe your property</span>
        <span className={selectedCategories.length >= maxCategories ? 'text-amber-600' : ''}>
          {selectedCategories.length}/{maxCategories} selected
        </span>
      </div>

      {/* Experience Categories */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Compass size={16} className="text-gray-500" />
          <h4 className="text-sm font-medium text-gray-700">Experience Type</h4>
        </div>
        <p className="text-xs text-gray-400 mb-3">
          What kind of experience does your property offer?
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {categories.experience.map(cat => (
            <CategoryButton key={cat.id} category={cat} />
          ))}
        </div>
      </div>

      {/* Trip Type Categories */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Tag size={16} className="text-gray-500" />
          <h4 className="text-sm font-medium text-gray-700">Trip Type</h4>
        </div>
        <p className="text-xs text-gray-400 mb-3">
          Who is your property best suited for?
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {categories.trip_type.map(cat => (
            <CategoryButton key={cat.id} category={cat} />
          ))}
        </div>
      </div>

      {/* Selected Categories Preview */}
      {selectedCategories.length > 0 && (
        <div className="pt-4 border-t border-gray-200">
          <p className="text-xs text-gray-500 mb-2">Selected categories:</p>
          <div className="flex flex-wrap gap-2">
            {selectedCategories.map(slug => {
              const cat = [...categories.experience, ...categories.trip_type].find(c => c.slug === slug)
              if (!cat) return null
              return (
                <span
                  key={slug}
                  className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-50 text-emerald-700 text-xs rounded-full"
                >
                  {cat.icon && getIcon(cat.icon, 'text-emerald-500')}
                  {cat.name}
                  <button
                    onClick={() => toggleCategory(slug)}
                    className="ml-1 hover:text-emerald-900"
                  >
                    &times;
                  </button>
                </span>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

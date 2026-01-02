import { Link } from 'react-router-dom'
import { LucideIcon } from 'lucide-react'

export interface Category {
  slug: string
  name: string
  description: string
  icon: LucideIcon
  image: string
  propertyCount?: number
}

interface CategoryCardProps {
  category: Category
}

export default function CategoryCard({ category }: CategoryCardProps) {
  const Icon = category.icon

  return (
    <Link
      to={`/categories/${category.slug}`}
      className="block bg-white rounded-xl border border-gray-100 overflow-hidden hover:shadow-lg hover:border-emerald-200 transition-all group"
    >
      {/* Image */}
      <div className="aspect-[16/9] relative overflow-hidden">
        <img
          src={category.image}
          alt={category.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
        <div className="absolute bottom-3 left-3 p-2 bg-white/90 backdrop-blur-sm rounded-lg">
          <Icon className="w-5 h-5 text-emerald-600" />
        </div>
        {category.propertyCount !== undefined && category.propertyCount > 0 && (
          <div className="absolute top-3 right-3 px-2 py-1 bg-black/60 backdrop-blur-sm rounded-full text-xs text-white font-medium">
            {category.propertyCount} {category.propertyCount === 1 ? 'property' : 'properties'}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="font-semibold text-gray-900 group-hover:text-emerald-600 transition-colors">
          {category.name}
        </h3>
        <p className="text-sm text-gray-500 mt-1 line-clamp-2">{category.description}</p>
      </div>
    </Link>
  )
}

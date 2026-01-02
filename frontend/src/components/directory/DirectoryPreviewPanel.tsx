import { MapPin, Lightbulb, ArrowRight } from 'lucide-react'

interface IncompleteItem {
  id: string
  label: string
  section: string
}

interface DirectoryPreviewPanelProps {
  coverImage: string
  businessName: string
  city: string
  regionName: string
  propertyType: string
  propertyHighlights: string[]
  incompleteItems: IncompleteItem[]
  onNavigateToSection: (sectionId: string) => void
}

export default function DirectoryPreviewPanel({
  coverImage,
  businessName,
  city,
  regionName,
  propertyType,
  propertyHighlights,
  incompleteItems,
  onNavigateToSection
}: DirectoryPreviewPanelProps) {
  const location = city && regionName ? `${city}, ${regionName}` : city || regionName || ''

  return (
    <div className="hidden xl:block w-80 shrink-0">
      <div className="sticky top-6 space-y-4">
        {/* Live Preview Card */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h3 className="text-sm font-medium text-gray-500 mb-4">Live Preview</h3>

          {/* Preview Card */}
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
            {/* Image */}
            <div className="aspect-[4/3] bg-gray-100 relative overflow-hidden">
              {coverImage ? (
                <img
                  src={coverImage}
                  alt="Property preview"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src =
                      'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400'
                  }}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400">
                  <div className="text-center">
                    <div className="w-12 h-12 rounded-full bg-gray-200 mx-auto mb-2 flex items-center justify-center">
                      <MapPin size={20} className="text-gray-400" />
                    </div>
                    <p className="text-sm">No cover image</p>
                  </div>
                </div>
              )}
            </div>

            {/* Content */}
            <div className="p-3">
              <h4 className="font-semibold text-gray-900 text-sm">
                {businessName || 'Your Property Name'}
              </h4>
              {location ? (
                <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                  <MapPin size={12} />
                  {location}
                </p>
              ) : (
                <p className="text-xs text-gray-400 mt-1">Location not set</p>
              )}

              {/* Tags */}
              <div className="flex flex-wrap items-center gap-1.5 mt-2">
                {propertyType && (
                  <span className="px-2 py-0.5 bg-gray-100 text-xs text-gray-600 rounded">
                    {propertyType}
                  </span>
                )}
                {propertyHighlights.slice(0, 2).map((h) => (
                  <span
                    key={h}
                    className="px-2 py-0.5 bg-emerald-50 text-xs text-emerald-600 rounded"
                  >
                    {h}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <p className="text-xs text-gray-400 mt-3 text-center">
            This is how your listing appears in search results
          </p>
        </div>

        {/* Boost Your Listing */}
        {incompleteItems.length > 0 && (
          <div className="bg-amber-50 rounded-xl border border-amber-200 p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center">
                <Lightbulb size={16} className="text-amber-600" />
              </div>
              <h4 className="text-sm font-medium text-amber-900">Boost your listing</h4>
            </div>

            <ul className="space-y-2">
              {incompleteItems.slice(0, 4).map((item) => (
                <li key={item.id}>
                  <button
                    onClick={() => onNavigateToSection(item.section)}
                    className="w-full flex items-center justify-between text-sm text-amber-700 hover:text-amber-900 py-1 transition-colors group"
                  >
                    <span>+ Add {item.label}</span>
                    <ArrowRight
                      size={14}
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                    />
                  </button>
                </li>
              ))}
            </ul>

            {incompleteItems.length > 4 && (
              <p className="text-xs text-amber-600 mt-2">
                +{incompleteItems.length - 4} more to complete
              </p>
            )}
          </div>
        )}

        {/* All Complete Message */}
        {incompleteItems.length === 0 && (
          <div className="bg-emerald-50 rounded-xl border border-emerald-200 p-4 text-center">
            <div className="w-10 h-10 rounded-full bg-emerald-100 mx-auto mb-2 flex items-center justify-center">
              <span className="text-lg">🎉</span>
            </div>
            <h4 className="text-sm font-medium text-emerald-900">Looking great!</h4>
            <p className="text-xs text-emerald-700 mt-1">
              Your listing is complete and ready to attract guests.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

import { Plus, Trash2, Tag } from 'lucide-react'

interface SpecialOffer {
  title: string
  description: string
  valid_until?: string
  active: boolean
}

interface SpecialOffersEditorProps {
  offers: SpecialOffer[]
  onChange: (offers: SpecialOffer[]) => void
}

export default function SpecialOffersEditor({
  offers,
  onChange
}: SpecialOffersEditorProps) {
  const addOffer = () => {
    onChange([
      ...offers,
      { title: '', description: '', valid_until: '', active: true }
    ])
  }

  const updateOffer = (index: number, field: keyof SpecialOffer, value: string | boolean) => {
    const updated = [...offers]
    updated[index] = { ...updated[index], [field]: value }
    onChange(updated)
  }

  const removeOffer = (index: number) => {
    onChange(offers.filter((_, i) => i !== index))
  }

  const toggleActive = (index: number) => {
    const updated = [...offers]
    updated[index] = { ...updated[index], active: !updated[index].active }
    onChange(updated)
  }

  return (
    <div className="space-y-4">
      {/* Offers list */}
      {offers.length === 0 ? (
        <p className="text-sm text-gray-500 italic">No special offers configured</p>
      ) : (
        <div className="space-y-4">
          {offers.map((offer, index) => (
            <div
              key={index}
              className={`p-4 border rounded-lg transition-colors ${
                offer.active
                  ? 'border-accent-200 bg-accent-50/50'
                  : 'border-gray-200 bg-gray-50 opacity-60'
              }`}
            >
              <div className="flex items-start justify-between gap-4 mb-3">
                <div className="flex items-center gap-2">
                  <Tag size={16} className={offer.active ? 'text-accent-600' : 'text-gray-400'} />
                  <span className="text-sm font-medium text-gray-700">
                    Offer {index + 1}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => toggleActive(index)}
                    className={`px-2 py-1 text-xs rounded-full transition-colors ${
                      offer.active
                        ? 'bg-accent-100 text-accent-700'
                        : 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    {offer.active ? 'Active' : 'Inactive'}
                  </button>
                  <button
                    type="button"
                    onClick={() => removeOffer(index)}
                    className="p-1 text-red-500 hover:bg-red-50 rounded transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              <div className="grid gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Title</label>
                  <input
                    type="text"
                    value={offer.title}
                    onChange={(e) => updateOffer(index, 'title', e.target.value)}
                    placeholder="e.g., Early Bird Special"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Description</label>
                  <textarea
                    value={offer.description}
                    onChange={(e) => updateOffer(index, 'description', e.target.value)}
                    placeholder="e.g., Book 30 days in advance and save 15%"
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent-500 resize-none"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Valid Until (optional)</label>
                  <input
                    type="date"
                    value={offer.valid_until || ''}
                    onChange={(e) => updateOffer(index, 'valid_until', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent-500"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add button */}
      <button
        type="button"
        onClick={addOffer}
        className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 border border-dashed border-gray-300 rounded-lg hover:border-gray-400 hover:bg-gray-50 transition-colors w-full justify-center"
      >
        <Plus size={16} />
        Add Special Offer
      </button>
    </div>
  )
}

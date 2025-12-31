import { Plus, Trash2 } from 'lucide-react'

interface CancellationPolicy {
  days_before: number
  refund_percentage: number
  label: string
}

interface CancellationPolicyEditorProps {
  policies: CancellationPolicy[]
  onChange: (policies: CancellationPolicy[]) => void
}

// Preset policies
const PRESETS = {
  flexible: [
    { days_before: 1, refund_percentage: 100, label: 'Free cancellation up to 24 hours before' }
  ],
  moderate: [
    { days_before: 7, refund_percentage: 100, label: 'Free cancellation up to 7 days before' },
    { days_before: 3, refund_percentage: 50, label: '50% refund 3-7 days before' }
  ],
  strict: [
    { days_before: 14, refund_percentage: 100, label: 'Free cancellation up to 14 days before' },
    { days_before: 7, refund_percentage: 50, label: '50% refund 7-14 days before' },
    { days_before: 0, refund_percentage: 0, label: 'No refund within 7 days' }
  ]
}

export default function CancellationPolicyEditor({
  policies,
  onChange
}: CancellationPolicyEditorProps) {
  const addPolicy = () => {
    onChange([
      ...policies,
      { days_before: 7, refund_percentage: 100, label: '' }
    ])
  }

  const updatePolicy = (index: number, field: keyof CancellationPolicy, value: string | number) => {
    const updated = [...policies]
    updated[index] = { ...updated[index], [field]: value }
    onChange(updated)
  }

  const removePolicy = (index: number) => {
    onChange(policies.filter((_, i) => i !== index))
  }

  const applyPreset = (presetKey: keyof typeof PRESETS) => {
    onChange([...PRESETS[presetKey]])
  }

  return (
    <div className="space-y-4">
      {/* Preset buttons */}
      <div className="flex flex-wrap gap-2">
        <span className="text-sm text-gray-500 mr-2">Quick presets:</span>
        <button
          type="button"
          onClick={() => applyPreset('flexible')}
          className="px-3 py-1 text-sm bg-accent-50 text-accent-700 rounded-full hover:bg-accent-100 transition-colors"
        >
          Flexible
        </button>
        <button
          type="button"
          onClick={() => applyPreset('moderate')}
          className="px-3 py-1 text-sm bg-amber-50 text-amber-700 rounded-full hover:bg-amber-100 transition-colors"
        >
          Moderate
        </button>
        <button
          type="button"
          onClick={() => applyPreset('strict')}
          className="px-3 py-1 text-sm bg-red-50 text-red-700 rounded-full hover:bg-red-100 transition-colors"
        >
          Strict
        </button>
      </div>

      {/* Policy list */}
      <div className="space-y-3">
        {policies.map((policy, index) => (
          <div
            key={index}
            className="flex flex-col sm:flex-row gap-3 p-4 bg-gray-50 rounded-lg"
          >
            <div className="flex-1 grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Days Before</label>
                <input
                  type="number"
                  min="0"
                  value={policy.days_before}
                  onChange={(e) => updatePolicy(index, 'days_before', parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent-500"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Refund %</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={policy.refund_percentage}
                  onChange={(e) => updatePolicy(index, 'refund_percentage', parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent-500"
                />
              </div>
              <div className="col-span-2 sm:col-span-1">
                <label className="block text-xs text-gray-500 mb-1">Display Label</label>
                <input
                  type="text"
                  value={policy.label}
                  onChange={(e) => updatePolicy(index, 'label', e.target.value)}
                  placeholder="e.g., Free cancellation up to 7 days before"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent-500"
                />
              </div>
            </div>
            <button
              type="button"
              onClick={() => removePolicy(index)}
              className="self-start sm:self-center p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
            >
              <Trash2 size={18} />
            </button>
          </div>
        ))}
      </div>

      {/* Add button */}
      <button
        type="button"
        onClick={addPolicy}
        className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 border border-dashed border-gray-300 rounded-lg hover:border-gray-400 hover:bg-gray-50 transition-colors"
      >
        <Plus size={16} />
        Add Policy Tier
      </button>

      {/* Preview */}
      {policies.length > 0 && (
        <div className="mt-4 p-4 bg-accent-50 rounded-lg">
          <h4 className="text-sm font-medium text-accent-800 mb-2">Preview</h4>
          <ul className="space-y-1">
            {policies
              .sort((a, b) => b.days_before - a.days_before)
              .map((policy, index) => (
                <li key={index} className="text-sm text-accent-700 flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${
                    policy.refund_percentage === 100 ? 'bg-accent-500' :
                    policy.refund_percentage >= 50 ? 'bg-amber-500' : 'bg-red-500'
                  }`} />
                  {policy.label || `${policy.refund_percentage}% refund ${policy.days_before}+ days before`}
                </li>
              ))}
          </ul>
        </div>
      )}
    </div>
  )
}

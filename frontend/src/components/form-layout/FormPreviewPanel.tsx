import { ReactNode } from 'react'
import { Lightbulb, ArrowRight, CheckCircle } from 'lucide-react'
import type { IncompleteItem } from './types'

interface FormPreviewPanelProps {
  previewTitle?: string
  previewContent: ReactNode
  previewDescription?: string
  boostTitle?: string
  incompleteItems: IncompleteItem[]
  onNavigateToSection: (sectionId: string) => void
  allCompleteTitle?: string
  allCompleteMessage?: string
}

export default function FormPreviewPanel({
  previewTitle = 'Live Preview',
  previewContent,
  previewDescription,
  boostTitle = 'Complete your form',
  incompleteItems,
  onNavigateToSection,
  allCompleteTitle = 'Looking great!',
  allCompleteMessage = 'All required information has been filled in.'
}: FormPreviewPanelProps) {
  return (
    <div className="hidden xl:block w-80 shrink-0">
      <div className="sticky top-24 space-y-4">
        {/* Live Preview Card */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h3 className="text-sm font-medium text-gray-500 mb-4">{previewTitle}</h3>

          {previewContent}

          {previewDescription && (
            <p className="text-xs text-gray-400 mt-3 text-center">
              {previewDescription}
            </p>
          )}
        </div>

        {/* Boost/Complete Your Form */}
        {incompleteItems.length > 0 && (
          <div className="bg-amber-50 rounded-xl border border-amber-200 p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center">
                <Lightbulb size={16} className="text-amber-600" />
              </div>
              <h4 className="text-sm font-medium text-amber-900">{boostTitle}</h4>
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
              <CheckCircle size={20} className="text-emerald-600" />
            </div>
            <h4 className="text-sm font-medium text-emerald-900">{allCompleteTitle}</h4>
            <p className="text-xs text-emerald-700 mt-1">
              {allCompleteMessage}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

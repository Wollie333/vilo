import { ArrowLeft, Loader2 } from 'lucide-react'

interface StepNavigationProps {
  onBack?: () => void
  onNext: () => void
  nextLabel?: string
  nextDisabled?: boolean
  processing?: boolean
  showBack?: boolean
}

export default function StepNavigation({
  onBack,
  onNext,
  nextLabel = 'Continue',
  nextDisabled = false,
  processing = false,
  showBack = true
}: StepNavigationProps) {
  return (
    <div className="flex justify-between items-center pt-6 mt-6 border-t border-gray-100">
      {/* Back Button */}
      {showBack && onBack ? (
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
      ) : (
        <div />
      )}

      {/* Continue Button - Hidden on mobile (handled by bottom bar) */}
      <button
        onClick={onNext}
        disabled={nextDisabled || processing}
        className={`
          hidden lg:flex items-center gap-2 px-8 py-3 rounded-xl font-semibold transition-all
          ${nextDisabled || processing
            ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
            : 'bg-black text-white hover:bg-gray-800'
          }
        `}
      >
        {processing && <Loader2 className="w-4 h-4 animate-spin" />}
        {nextLabel}
      </button>
    </div>
  )
}

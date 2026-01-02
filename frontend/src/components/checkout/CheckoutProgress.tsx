import { Check } from 'lucide-react'

interface CheckoutProgressProps {
  currentStep: 1 | 2 | 3 | 4
  onStepClick?: (step: number) => void
  compact?: boolean
}

const steps = [
  { number: 1, label: 'Dates & Room', shortLabel: 'Dates' },
  { number: 2, label: 'Extras', shortLabel: 'Extras' },
  { number: 3, label: 'Details', shortLabel: 'Details' },
  { number: 4, label: 'Payment', shortLabel: 'Pay' }
]

export default function CheckoutProgress({
  currentStep,
  onStepClick,
  compact = false
}: CheckoutProgressProps) {
  // Compact mode for mobile - dots with clickable completed steps
  if (compact) {
    return (
      <div className="flex items-center justify-between gap-2">
        {/* Step dots */}
        <div className="flex items-center gap-2">
          {steps.map((step, index) => {
            const isActive = step.number === currentStep
            const isCompleted = step.number < currentStep
            const canClick = isCompleted && onStepClick

            return (
              <div key={step.number} className="flex items-center">
                <button
                  onClick={() => canClick && onStepClick(step.number)}
                  disabled={!canClick}
                  className={`
                    w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold transition-all
                    ${canClick ? 'cursor-pointer' : 'cursor-default'}
                    ${isCompleted
                      ? 'bg-emerald-600 text-white'
                      : isActive
                        ? 'bg-black text-white'
                        : 'bg-gray-200 text-gray-400'
                    }
                  `}
                  aria-label={`Go to ${step.label}`}
                >
                  {isCompleted ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    step.number
                  )}
                </button>
                {index < steps.length - 1 && (
                  <div className={`w-4 h-0.5 mx-1 ${isCompleted ? 'bg-emerald-600' : 'bg-gray-200'}`} />
                )}
              </div>
            )
          })}
        </div>
        {/* Step label */}
        <span className="text-xs font-medium text-gray-500 whitespace-nowrap">
          {steps.find(s => s.number === currentStep)?.shortLabel}
        </span>
      </div>
    )
  }

  // Full desktop version
  return (
    <div className="flex items-center gap-1">
      {steps.map((step, index) => {
        const isActive = step.number === currentStep
        const isCompleted = step.number < currentStep
        const canClick = isCompleted && onStepClick

        return (
          <div key={step.number} className="flex items-center">
            {/* Step circle with label */}
            <button
              onClick={() => canClick && onStepClick(step.number)}
              disabled={!canClick}
              className={`
                flex items-center gap-2 px-3 py-2 rounded-lg transition-all
                ${canClick ? 'cursor-pointer hover:bg-gray-100' : 'cursor-default'}
                ${isActive ? 'bg-gray-100' : ''}
              `}
            >
              {/* Circle */}
              <div
                className={`
                  w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-all
                  ${isCompleted
                    ? 'bg-emerald-600 text-white'
                    : isActive
                      ? 'bg-black text-white ring-2 ring-gray-200'
                      : 'bg-gray-200 text-gray-400'
                  }
                `}
              >
                {isCompleted ? (
                  <Check className="w-3.5 h-3.5" />
                ) : (
                  step.number
                )}
              </div>

              {/* Label */}
              <span
                className={`
                  text-sm whitespace-nowrap hidden xl:block
                  ${isActive ? 'text-gray-900 font-medium' : isCompleted ? 'text-gray-700' : 'text-gray-400'}
                `}
              >
                {step.label}
              </span>
            </button>

            {/* Connector */}
            {index < steps.length - 1 && (
              <div
                className={`
                  w-6 h-0.5 mx-1
                  ${isCompleted ? 'bg-emerald-600' : 'bg-gray-200'}
                `}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}

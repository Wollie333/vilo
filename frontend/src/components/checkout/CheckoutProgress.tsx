import { Check } from 'lucide-react'

interface CheckoutProgressProps {
  currentStep: 1 | 2 | 3 | 4
}

const steps = [
  { number: 1, label: 'Dates & Room' },
  { number: 2, label: 'Extras' },
  { number: 3, label: 'Your Details' },
  { number: 4, label: 'Payment' }
]

export default function CheckoutProgress({ currentStep }: CheckoutProgressProps) {
  return (
    <div className="flex items-center justify-between w-full">
      {steps.map((step, index) => {
        const isActive = step.number === currentStep
        const isCompleted = step.number < currentStep

        return (
          <div key={step.number} className="flex items-center flex-1 last:flex-none">
            {/* Step circle and label */}
            <div className="flex flex-col items-center">
              <div
                className={`
                  w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors
                  ${isCompleted
                    ? 'bg-emerald-600 text-white'
                    : isActive
                      ? 'bg-black text-white'
                      : 'bg-gray-200 text-gray-500'
                  }
                `}
              >
                {isCompleted ? (
                  <Check className="w-4 h-4" />
                ) : (
                  step.number
                )}
              </div>
              <span
                className={`
                  mt-1 text-xs whitespace-nowrap
                  ${isActive ? 'text-gray-900 font-medium' : 'text-gray-500'}
                `}
              >
                {step.label}
              </span>
            </div>

            {/* Connector line */}
            {index < steps.length - 1 && (
              <div
                className={`
                  flex-1 h-0.5 mx-3 mt-[-1rem]
                  ${step.number < currentStep ? 'bg-emerald-600' : 'bg-gray-200'}
                `}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}

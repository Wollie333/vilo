import { ReactNode, useState } from 'react'
import { ArrowLeft } from 'lucide-react'
import type { PropertyDetail } from '../../services/discoveryApi'
import type { CheckoutState } from '../../pages/discovery/Checkout'
import CheckoutSidebar from './CheckoutSidebar'
import CheckoutMobileBar from './CheckoutMobileBar'
import CheckoutProgress from './CheckoutProgress'

interface CheckoutLayoutProps {
  children: ReactNode
  property: PropertyDetail
  state: CheckoutState
  currentStep: 1 | 2 | 3 | 4
  onBack: () => void
  onNext: () => void
  onStepClick?: (step: number) => void
  isProcessing?: boolean
  nextLabel?: string
  nextDisabled?: boolean
}

export default function CheckoutLayout({
  children,
  property,
  state,
  currentStep,
  onBack,
  onNext,
  onStepClick,
  isProcessing = false,
  nextLabel,
  nextDisabled = false
}: CheckoutLayoutProps) {
  const [mobileSummaryOpen, setMobileSummaryOpen] = useState(false)

  // Calculate grand total for mobile bar
  const grandTotal = state.grandTotal || 0

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sticky Header */}
      <header className="sticky top-0 z-40 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 lg:px-6">
          {/* Top row: Back, Property name, Progress (desktop) */}
          <div className="flex items-center justify-between py-4">
            {/* Left: Back button & Property info */}
            <div className="flex items-center gap-3">
              <button
                onClick={onBack}
                className="p-2 -ml-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                aria-label="Go back"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div className="min-w-0">
                <h1 className="text-lg font-semibold text-gray-900 truncate">
                  {currentStep === 1 ? 'Select dates & room' :
                   currentStep === 2 ? 'Add extras' :
                   currentStep === 3 ? 'Your details' : 'Payment'}
                </h1>
                <p className="text-sm text-gray-500 truncate hidden sm:block">{property.name}</p>
              </div>
            </div>

            {/* Right: Progress indicator (desktop) */}
            <div className="hidden lg:block">
              <CheckoutProgress
                currentStep={currentStep}
                onStepClick={onStepClick}
              />
            </div>
          </div>

          {/* Mobile progress bar */}
          <div className="lg:hidden pb-3">
            <CheckoutProgress
              currentStep={currentStep}
              onStepClick={onStepClick}
              compact
            />
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 lg:px-6 py-6">
        <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
          {/* Main Form Panel */}
          <div className="flex-1 min-w-0 pb-24 lg:pb-0">
            {children}
          </div>

          {/* Sticky Sidebar - Desktop Only */}
          <div className="hidden lg:block w-[380px] flex-shrink-0">
            <div className="sticky top-28">
              <CheckoutSidebar
                property={property}
                state={state}
                currentStep={currentStep}
                onNext={onNext}
                onBack={currentStep > 1 ? onBack : undefined}
                isProcessing={isProcessing}
                nextLabel={nextLabel}
                nextDisabled={nextDisabled}
              />
            </div>
          </div>
        </div>
      </main>

      {/* Mobile Bottom Bar */}
      <CheckoutMobileBar
        property={property}
        state={state}
        currentStep={currentStep}
        grandTotal={grandTotal}
        isOpen={mobileSummaryOpen}
        onToggle={() => setMobileSummaryOpen(!mobileSummaryOpen)}
        onNext={onNext}
        onBack={currentStep > 1 ? onBack : undefined}
        isProcessing={isProcessing}
        nextLabel={nextLabel}
        nextDisabled={nextDisabled}
      />
    </div>
  )
}

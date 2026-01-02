interface PaymentProcessorLogoProps {
  processor: 'paystack' | 'paypal' | 'eft' | 'manual'
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const sizes = {
  sm: { width: 24, height: 24 },
  md: { width: 32, height: 32 },
  lg: { width: 48, height: 48 }
}

// Paystack logo - teal/cyan theme
function PaystackLogo({ size }: { size: 'sm' | 'md' | 'lg' }) {
  const { width, height } = sizes[size]
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect width="32" height="32" rx="6" fill="#00C3F7" />
      <path
        d="M8 10h16v2.5H8V10zm0 4.75h16v2.5H8v-2.5zm0 4.75h10v2.5H8v-2.5z"
        fill="white"
      />
    </svg>
  )
}

// PayPal logo - blue theme
function PayPalLogo({ size }: { size: 'sm' | 'md' | 'lg' }) {
  const { width, height } = sizes[size]
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect width="32" height="32" rx="6" fill="#003087" />
      <path
        d="M21.5 10c1.38 0 2.5 1.12 2.5 2.5 0 2.5-2 4.5-4.5 4.5h-2l-1 5h-3l2-10h6zm-1.5 2h-2.5l-.6 3h1.6c1.1 0 2-.9 2-2 0-.55-.45-1-1-1zm-8 0c1.38 0 2.5 1.12 2.5 2.5 0 2.5-2 4.5-4.5 4.5H8l-1 5H4l2-10h6zm-1.5 2H8l-.6 3h1.6c1.1 0 2-.9 2-2 0-.55-.45-1-1-1z"
        fill="white"
      />
    </svg>
  )
}

// EFT/Bank Transfer icon
function EFTLogo({ size }: { size: 'sm' | 'md' | 'lg' }) {
  const { width, height } = sizes[size]
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect width="32" height="32" rx="6" fill="#6B7280" />
      <path
        d="M16 6l8 4v2H8v-2l8-4zm-6 8h3v8H10v-8zm5 0h3v8h-3v-8zm5 0h3v8h-3v-8zM8 24h16v2H8v-2z"
        fill="white"
      />
    </svg>
  )
}

// Manual payment icon
function ManualLogo({ size }: { size: 'sm' | 'md' | 'lg' }) {
  const { width, height } = sizes[size]
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect width="32" height="32" rx="6" fill="#9CA3AF" />
      <path
        d="M8 10h16v12H8V10zm2 2v8h12v-8H10zm3 2h6v1h-6v-1zm0 2h4v1h-4v-1z"
        fill="white"
      />
    </svg>
  )
}

export default function PaymentProcessorLogo({
  processor,
  size = 'md',
  className = ''
}: PaymentProcessorLogoProps) {
  const logoClass = `inline-flex flex-shrink-0 ${className}`

  switch (processor) {
    case 'paystack':
      return (
        <span className={logoClass} title="Paystack">
          <PaystackLogo size={size} />
        </span>
      )
    case 'paypal':
      return (
        <span className={logoClass} title="PayPal">
          <PayPalLogo size={size} />
        </span>
      )
    case 'eft':
      return (
        <span className={logoClass} title="Bank Transfer (EFT)">
          <EFTLogo size={size} />
        </span>
      )
    case 'manual':
    default:
      return (
        <span className={logoClass} title="Manual Payment">
          <ManualLogo size={size} />
        </span>
      )
  }
}

// Helper to get processor display name
export function getProcessorName(processor: string | null): string {
  switch (processor) {
    case 'paystack':
      return 'Paystack'
    case 'paypal':
      return 'PayPal'
    case 'eft':
      return 'Bank Transfer (EFT)'
    case 'manual':
      return 'Manual Payment'
    default:
      return 'Payment'
  }
}

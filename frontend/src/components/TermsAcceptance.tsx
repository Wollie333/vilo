interface TermsAcceptanceProps {
  accepted: boolean
  onChange: (accepted: boolean) => void
  className?: string
  size?: 'sm' | 'md'
}

export default function TermsAcceptance({
  accepted,
  onChange,
  className = '',
  size = 'md',
}: TermsAcceptanceProps) {
  const textSize = size === 'sm' ? 'text-xs' : 'text-sm'

  return (
    <label className={`flex items-start gap-3 cursor-pointer ${className}`}>
      <input
        type="checkbox"
        checked={accepted}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 w-4 h-4 rounded border-gray-300 text-accent-600 focus:ring-accent-500 cursor-pointer"
      />
      <span className={`${textSize} text-gray-600 leading-relaxed`}>
        I agree to the{' '}
        <a
          href="/earnings-disclaimer"
          target="_blank"
          rel="noopener noreferrer"
          className="text-accent-600 hover:underline"
          onClick={(e) => e.stopPropagation()}
        >
          Earnings Disclaimer
        </a>
        ,{' '}
        <a
          href="/terms"
          target="_blank"
          rel="noopener noreferrer"
          className="text-accent-600 hover:underline"
          onClick={(e) => e.stopPropagation()}
        >
          Terms & Conditions
        </a>
        , and{' '}
        <a
          href="/privacy"
          target="_blank"
          rel="noopener noreferrer"
          className="text-accent-600 hover:underline"
          onClick={(e) => e.stopPropagation()}
        >
          Privacy Policy
        </a>
      </span>
    </label>
  )
}

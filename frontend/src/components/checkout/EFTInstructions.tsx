import { Copy, CheckCircle, Building2, AlertCircle } from 'lucide-react'
import { useState } from 'react'

interface EFTDetails {
  enabled: boolean
  accountHolder: string
  bankName: string
  accountNumber: string
  branchCode: string
  accountType: string
  swiftCode?: string
  referenceInstructions?: string
}

interface EFTInstructionsProps {
  eft: EFTDetails
  bookingReference: string
  amount: number
  currency: string
  onComplete: () => void
}

export default function EFTInstructions({
  eft,
  bookingReference,
  amount,
  currency,
  onComplete
}: EFTInstructionsProps) {
  const [copiedField, setCopiedField] = useState<string | null>(null)

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(price)
  }

  const copyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedField(field)
      setTimeout(() => setCopiedField(null), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  const bankDetails = [
    { label: 'Account Holder', value: eft.accountHolder, key: 'holder' },
    { label: 'Bank', value: eft.bankName, key: 'bank' },
    { label: 'Account Number', value: eft.accountNumber, key: 'account' },
    { label: 'Branch Code', value: eft.branchCode, key: 'branch' },
    { label: 'Account Type', value: eft.accountType, key: 'type' },
    ...(eft.swiftCode ? [{ label: 'SWIFT Code', value: eft.swiftCode, key: 'swift' }] : [])
  ]

  return (
    <div className="space-y-6">
      {/* Success header */}
      <div className="bg-emerald-50 rounded-xl border border-emerald-200 p-5 text-center">
        <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-3">
          <CheckCircle className="w-6 h-6 text-emerald-600" />
        </div>
        <h2 className="font-semibold text-emerald-900 text-lg">Booking Reserved!</h2>
        <p className="text-emerald-700 text-sm mt-1">
          Complete your payment to confirm your booking
        </p>
      </div>

      {/* Amount to pay */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 text-center">
        <p className="text-sm text-gray-500 mb-1">Amount to pay</p>
        <p className="text-3xl font-bold text-gray-900">{formatPrice(amount)}</p>
        <div className="mt-3 flex items-center justify-center gap-2">
          <span className="text-sm text-gray-500">Reference:</span>
          <span className="font-mono font-medium text-gray-900">{bookingReference}</span>
          <button
            onClick={() => copyToClipboard(bookingReference, 'reference')}
            className="p-1 hover:bg-gray-100 rounded transition-colors"
            title="Copy reference"
          >
            {copiedField === 'reference' ? (
              <CheckCircle className="w-4 h-4 text-emerald-600" />
            ) : (
              <Copy className="w-4 h-4 text-gray-400" />
            )}
          </button>
        </div>
      </div>

      {/* Bank details */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
            <Building2 className="w-5 h-5 text-blue-600" />
          </div>
          <h3 className="font-semibold text-gray-900">Bank Details</h3>
        </div>

        <div className="space-y-3">
          {bankDetails.map(({ label, value, key }) => (
            <div key={key} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
              <span className="text-sm text-gray-500">{label}</span>
              <div className="flex items-center gap-2">
                <span className="font-medium text-gray-900">{value}</span>
                <button
                  onClick={() => copyToClipboard(value, key)}
                  className="p-1 hover:bg-gray-100 rounded transition-colors"
                  title={`Copy ${label}`}
                >
                  {copiedField === key ? (
                    <CheckCircle className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <Copy className="w-4 h-4 text-gray-400" />
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>

        {eft.referenceInstructions && (
          <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-amber-900">Important</p>
                <p className="text-sm text-amber-700 mt-0.5">{eft.referenceInstructions}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Reference reminder */}
      <div className="bg-blue-50 rounded-xl border border-blue-200 p-4">
        <p className="text-sm text-blue-900">
          <strong>Please use this reference when making payment:</strong>
        </p>
        <div className="mt-2 flex items-center gap-2">
          <code className="flex-1 bg-white border border-blue-200 rounded-lg px-3 py-2 font-mono font-semibold text-blue-900">
            {bookingReference}
          </code>
          <button
            onClick={() => copyToClipboard(bookingReference, 'reference2')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            {copiedField === 'reference2' ? (
              <>
                <CheckCircle className="w-4 h-4" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                Copy
              </>
            )}
          </button>
        </div>
      </div>

      {/* Next steps */}
      <div className="bg-gray-50 rounded-xl border border-gray-200 p-5">
        <h3 className="font-medium text-gray-900 mb-3">What happens next?</h3>
        <ol className="space-y-3 text-sm text-gray-600">
          <li className="flex items-start gap-3">
            <span className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-xs font-medium text-gray-700 flex-shrink-0">1</span>
            <span>Make the EFT payment using the bank details above</span>
          </li>
          <li className="flex items-start gap-3">
            <span className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-xs font-medium text-gray-700 flex-shrink-0">2</span>
            <span>Use the booking reference as your payment reference</span>
          </li>
          <li className="flex items-start gap-3">
            <span className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-xs font-medium text-gray-700 flex-shrink-0">3</span>
            <span>Once payment is verified, you'll receive a confirmation email</span>
          </li>
        </ol>
      </div>

      {/* Complete button */}
      <div className="flex justify-center">
        <button
          onClick={onComplete}
          className="px-8 py-3 rounded-xl font-medium bg-black text-white hover:bg-gray-800 transition-colors"
        >
          View Booking Details
        </button>
      </div>
    </div>
  )
}

import { useState, useRef } from 'react'
import { Upload, X, FileText, Copy, Check, Loader2, Download } from 'lucide-react'
import PaymentProcessorLogo, { getProcessorName } from './PaymentProcessorLogo'

export interface ProofOfPayment {
  url: string
  path: string
  filename: string
  uploaded_at: string
}

type PaymentMethod = 'paystack' | 'paypal' | 'eft' | 'manual' | null

interface PaymentProofCardProps {
  paymentMethod: PaymentMethod
  paymentReference: string | null
  paymentCompletedAt: string | null
  proofOfPayment: ProofOfPayment | null
  onUploadProof?: (file: File) => void
  onRemoveProof?: () => void
  uploading?: boolean
  canEdit?: boolean
  canUpload?: boolean // For customers uploading EFT proof
  className?: string
}

export default function PaymentProofCard({
  paymentMethod,
  paymentReference,
  paymentCompletedAt,
  proofOfPayment,
  onUploadProof,
  onRemoveProof,
  uploading = false,
  canEdit = false,
  canUpload = false,
  className = ''
}: PaymentProofCardProps) {
  const [copied, setCopied] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Format date for display
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-ZA', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    })
  }

  // Copy reference to clipboard
  const copyReference = async () => {
    if (!paymentReference) return
    try {
      await navigator.clipboard.writeText(paymentReference)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file && onUploadProof) {
      onUploadProof(file)
    }
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  // Check if this is an online payment (Paystack/PayPal)
  const isOnlinePayment = paymentMethod === 'paystack' || paymentMethod === 'paypal'

  // Render online payment proof (Paystack/PayPal)
  if (isOnlinePayment && paymentReference) {
    return (
      <div className={`bg-white rounded-xl border border-gray-200 p-5 ${className}`}>
        <div className="flex items-center gap-2 mb-4">
          <div className="w-2 h-2 rounded-full bg-emerald-500" />
          <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">
            Payment Verified
          </h3>
        </div>

        <div className="flex items-start gap-4">
          <PaymentProcessorLogo processor={paymentMethod} size="lg" />
          <div className="flex-1 min-w-0">
            <p className="font-medium text-gray-900">
              {getProcessorName(paymentMethod)}
            </p>
            <div className="mt-1 flex items-center gap-2">
              <code className="text-sm text-gray-600 bg-gray-100 px-2 py-0.5 rounded font-mono truncate max-w-[200px]">
                {paymentReference}
              </code>
              <button
                onClick={copyReference}
                className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                title="Copy reference"
              >
                {copied ? (
                  <Check size={14} className="text-emerald-500" />
                ) : (
                  <Copy size={14} />
                )}
              </button>
            </div>
            {paymentCompletedAt && (
              <p className="mt-1 text-xs text-gray-500">
                Paid on {formatDate(paymentCompletedAt)}
              </p>
            )}
          </div>
        </div>
      </div>
    )
  }

  // Render manual proof upload or existing proof
  return (
    <div className={`bg-white rounded-xl border border-gray-200 p-5 ${className}`}>
      <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-4">
        Proof of Payment
      </h3>

      {/* Existing uploaded proof */}
      {proofOfPayment ? (
        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
          <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
            <FileText size={20} className="text-blue-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-gray-900 text-sm truncate">
              {proofOfPayment.filename}
            </p>
            <p className="text-xs text-gray-500">
              Uploaded {formatDate(proofOfPayment.uploaded_at)}
            </p>
          </div>
          <div className="flex items-center gap-1">
            <a
              href={proofOfPayment.url}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
              title="View file"
            >
              <Download size={16} />
            </a>
            {canEdit && onRemoveProof && (
              <button
                onClick={onRemoveProof}
                className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                title="Remove file"
              >
                <X size={16} />
              </button>
            )}
          </div>
        </div>
      ) : (
        // Upload area (for admin or customer with canUpload)
        (canEdit || canUpload) && onUploadProof ? (
          <div className="relative">
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.png,.jpg,.jpeg"
              onChange={handleFileChange}
              className="hidden"
              id="proof-upload"
              disabled={uploading}
            />
            <label
              htmlFor="proof-upload"
              className={`
                flex flex-col items-center justify-center gap-2 p-6
                border-2 border-dashed border-gray-300 rounded-lg
                cursor-pointer hover:border-gray-400 hover:bg-gray-50
                transition-colors
                ${uploading ? 'opacity-50 cursor-not-allowed' : ''}
              `}
            >
              {uploading ? (
                <Loader2 size={24} className="text-gray-400 animate-spin" />
              ) : (
                <Upload size={24} className="text-gray-400" />
              )}
              <span className="text-sm font-medium text-gray-600">
                {uploading ? 'Uploading...' : 'Upload Proof'}
              </span>
              <span className="text-xs text-gray-400">
                PNG, JPEG, or PDF up to 10MB
              </span>
            </label>
          </div>
        ) : (
          // No proof and can't upload - show message
          <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg text-gray-500">
            <FileText size={20} />
            <span className="text-sm">No proof of payment uploaded</span>
          </div>
        )
      )}

      {/* Show payment method if it's EFT/manual but no reference */}
      {(paymentMethod === 'eft' || paymentMethod === 'manual') && !proofOfPayment && (
        <div className="mt-3 flex items-center gap-2 text-sm text-gray-500">
          <PaymentProcessorLogo processor={paymentMethod} size="sm" />
          <span>{getProcessorName(paymentMethod)}</span>
        </div>
      )}
    </div>
  )
}

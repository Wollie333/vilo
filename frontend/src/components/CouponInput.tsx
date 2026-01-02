import { useState, useEffect, useRef } from 'react'
import { Tag, Check, X, Loader2 } from 'lucide-react'
import { DiscountType } from '../services/api'

export interface AppliedCoupon {
  id: string
  code: string
  name: string
  description?: string
  discount_type: DiscountType
  discount_value: number
  discount_amount: number
}

interface CouponInputProps {
  onApply: (code: string) => Promise<{
    valid: boolean
    errors?: string[]
    coupon?: Omit<AppliedCoupon, 'discount_amount'>
    discount_amount?: number
  }>
  onRemove: () => void
  appliedCoupon: AppliedCoupon | null
  disabled?: boolean
  currency?: string
  className?: string
  initialCode?: string
  autoApply?: boolean
}

export default function CouponInput({
  onApply,
  onRemove,
  appliedCoupon,
  disabled = false,
  currency = 'ZAR',
  className = '',
  initialCode = '',
  autoApply = false
}: CouponInputProps) {
  const [code, setCode] = useState(initialCode)
  const autoAppliedRef = useRef(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount)
  }

  const handleApply = async () => {
    if (!code.trim()) return

    setLoading(true)
    setError(null)

    try {
      const result = await onApply(code.trim().toUpperCase())

      if (!result.valid) {
        setError(result.errors?.[0] || 'Invalid coupon code')
      } else {
        setCode('')
      }
    } catch (err: any) {
      setError(err.message || 'Failed to validate coupon')
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleApply()
    }
  }

  // Auto-apply coupon code if provided and autoApply is true
  useEffect(() => {
    if (autoApply && initialCode && !appliedCoupon && !autoAppliedRef.current) {
      autoAppliedRef.current = true
      handleApply()
    }
  }, [autoApply, initialCode, appliedCoupon])

  // Update code if initialCode changes
  useEffect(() => {
    if (initialCode && !appliedCoupon) {
      setCode(initialCode)
    }
  }, [initialCode, appliedCoupon])

  const getDiscountLabel = () => {
    if (!appliedCoupon) return ''
    switch (appliedCoupon.discount_type) {
      case 'percentage':
        return `${appliedCoupon.discount_value}% off`
      case 'fixed_amount':
        return `${formatCurrency(appliedCoupon.discount_value)} off`
      case 'free_nights':
        return `${appliedCoupon.discount_value} free night${appliedCoupon.discount_value > 1 ? 's' : ''}`
    }
  }

  // Show applied coupon state
  if (appliedCoupon) {
    return (
      <div className={`flex items-center justify-between p-3 bg-emerald-50 border border-emerald-200 rounded-lg ${className}`}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
            <Check className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono font-medium text-emerald-800">{appliedCoupon.code}</span>
              <span className="text-xs px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded whitespace-nowrap">
                {getDiscountLabel()}
              </span>
            </div>
            <p className="text-sm text-emerald-600 font-medium">
              -{formatCurrency(appliedCoupon.discount_amount)}
            </p>
          </div>
        </div>
        <button
          onClick={onRemove}
          disabled={disabled}
          className="p-1.5 text-emerald-600 hover:text-emerald-800 hover:bg-emerald-100 rounded disabled:opacity-50 flex-shrink-0"
          title="Remove coupon"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
    )
  }

  // Show input state
  return (
    <div className={className}>
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={code}
            onChange={(e) => {
              setCode(e.target.value.toUpperCase())
              setError(null)
            }}
            onKeyDown={handleKeyDown}
            placeholder="Enter promo code"
            disabled={disabled || loading}
            className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400 uppercase placeholder:normal-case disabled:bg-gray-50 disabled:text-gray-500"
          />
        </div>
        <button
          onClick={handleApply}
          disabled={disabled || loading || !code.trim()}
          className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
        >
          {loading && <Loader2 className="w-4 h-4 animate-spin" />}
          Apply
        </button>
      </div>
      {error && (
        <p className="mt-2 text-sm text-red-600">{error}</p>
      )}
    </div>
  )
}

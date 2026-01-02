import { useState, useEffect } from 'react'
import { ReceiptText, Filter, Loader2 } from 'lucide-react'
import type { TenantRefund } from '../types'

interface RefundsSectionProps {
  tenantId: string
  onFetch: (status?: string) => Promise<TenantRefund[]>
}

const statusColors: Record<string, string> = {
  requested: 'bg-amber-100 text-amber-700',
  under_review: 'bg-blue-100 text-blue-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
  processing: 'bg-purple-100 text-purple-700',
  completed: 'bg-green-100 text-green-700',
  failed: 'bg-red-100 text-red-700',
}

export default function RefundsSection({ tenantId, onFetch }: RefundsSectionProps) {
  const [refunds, setRefunds] = useState<TenantRefund[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchRefunds()
  }, [tenantId])

  const fetchRefunds = async (status?: string) => {
    try {
      setLoading(true)
      setError(null)
      const data = await onFetch(status)
      setRefunds(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch refunds')
    } finally {
      setLoading(false)
    }
  }

  const handleStatusChange = (status: string) => {
    setStatusFilter(status)
    fetchRefunds(status === 'all' ? undefined : status)
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return '-'
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const formatCurrency = (amount: number, currency: string = 'ZAR') => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0
    }).format(amount)
  }

  const totalRefunded = refunds
    .filter(r => r.status === 'completed')
    .reduce((sum, r) => sum + (r.approved_amount || 0), 0)

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Refunds</h2>
          <p className="text-sm text-gray-500">
            {refunds.length} refund{refunds.length !== 1 ? 's' : ''} • {formatCurrency(totalRefunded)} refunded
          </p>
        </div>
      </div>

      {/* Filter */}
      <div className="relative w-fit">
        <Filter size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <select
          value={statusFilter}
          onChange={(e) => handleStatusChange(e.target.value)}
          className="pl-9 pr-8 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-accent-500 appearance-none bg-white"
        >
          <option value="all">All Status</option>
          <option value="requested">Requested</option>
          <option value="under_review">Under Review</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="processing">Processing</option>
          <option value="completed">Completed</option>
          <option value="failed">Failed</option>
        </select>
      </div>

      {/* Loading */}
      {loading && (
        <div className="py-12 text-center">
          <Loader2 size={24} className="mx-auto text-accent-500 animate-spin mb-2" />
          <p className="text-sm text-gray-500">Loading refunds...</p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && refunds.length === 0 && (
        <div className="py-12 text-center bg-gray-50 rounded-lg">
          <ReceiptText size={32} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500">No refunds yet</p>
        </div>
      )}

      {/* Refunds List */}
      {!loading && !error && refunds.length > 0 && (
        <div className="space-y-2">
          {refunds.map((refund) => (
            <div
              key={refund.id}
              className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-gray-900">
                    {refund.guest_name || 'Guest'}
                  </p>
                  <span className={`px-2 py-0.5 text-xs font-medium rounded-full capitalize ${statusColors[refund.status] || 'bg-gray-100 text-gray-600'}`}>
                    {refund.status.replace('_', ' ')}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Requested: {formatDate(refund.requested_at)}
                </p>
              </div>

              <div className="text-right shrink-0">
                <p className="text-sm font-semibold text-gray-900">
                  {formatCurrency(refund.approved_amount || refund.eligible_amount, refund.currency)}
                </p>
                <p className="text-xs text-gray-400">
                  of {formatCurrency(refund.original_amount, refund.currency)}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

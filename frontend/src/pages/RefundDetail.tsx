import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  Clock,
  Eye,
  CheckCircle,
  XCircle,
  RefreshCw,
  AlertCircle,
  Calendar,
  CreditCard,
  User,
  BedDouble,
  ArrowRight,
  ExternalLink,
  Loader2,
  MessageSquare,
  MessageCircle,
  DollarSign,
  Percent,
  FileText,
  Phone,
  Mail,
  Pencil,
  X,
  Save,
} from 'lucide-react'
import Button from '../components/Button'
import Card from '../components/Card'
import { refundsApi, Refund, RefundStatus, RefundStatusHistoryEntry } from '../services/api'
import { useNotification } from '../contexts/NotificationContext'
import { useAuth } from '../contexts/AuthContext'

// Refund status colors
const refundStatusColors: Record<RefundStatus, string> = {
  requested: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  under_review: 'bg-blue-100 text-blue-700 border-blue-200',
  approved: 'bg-accent-100 text-accent-700 border-accent-200',
  rejected: 'bg-red-100 text-red-700 border-red-200',
  processing: 'bg-purple-100 text-purple-700 border-purple-200',
  completed: 'bg-green-100 text-green-700 border-green-200',
  failed: 'bg-red-100 text-red-700 border-red-200',
}

const refundStatusLabels: Record<RefundStatus, string> = {
  requested: 'Requested',
  under_review: 'Under Review',
  approved: 'Approved',
  rejected: 'Rejected',
  processing: 'Processing',
  completed: 'Completed',
  failed: 'Failed',
}

const refundStatusIcons: Record<RefundStatus, React.ReactNode> = {
  requested: <Clock size={18} />,
  under_review: <Eye size={18} />,
  approved: <CheckCircle size={18} />,
  rejected: <XCircle size={18} />,
  processing: <RefreshCw size={18} className="animate-spin" />,
  completed: <CheckCircle size={18} />,
  failed: <AlertCircle size={18} />,
}

// Status workflow order
const statusOrder: RefundStatus[] = ['requested', 'under_review', 'approved', 'processing', 'completed']

export default function RefundDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { showSuccess, showError } = useNotification()
  const { tenant, tenantLoading } = useAuth()

  const [refund, setRefund] = useState<Refund | null>(null)
  const [history, setHistory] = useState<RefundStatusHistoryEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)

  // Action modals
  const [showApproveModal, setShowApproveModal] = useState(false)
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [showProcessModal, setShowProcessModal] = useState(false)
  const [showCompleteModal, setShowCompleteModal] = useState(false)

  // Form data
  const [approveAmount, setApproveAmount] = useState('')
  const [overrideReason, setOverrideReason] = useState('')
  const [rejectionReason, setRejectionReason] = useState('')
  const [processMethod, setProcessMethod] = useState<'paystack' | 'eft' | 'paypal' | 'manual'>('manual')
  const [manualReference, setManualReference] = useState('')
  const [staffNotes, setStaffNotes] = useState('')
  const [isEditingNotes, setIsEditingNotes] = useState(false)
  const [notesLoading, setNotesLoading] = useState(false)

  useEffect(() => {
    if (!tenantLoading && tenant && id) {
      loadRefundData()
    } else if (!tenantLoading && !tenant) {
      setLoading(false)
    }
  }, [tenant, tenantLoading, id])

  const loadRefundData = async () => {
    try {
      setLoading(true)
      const [refundData, historyData] = await Promise.all([
        refundsApi.getById(id!),
        refundsApi.getHistory(id!)
      ])
      setRefund(refundData)
      setHistory(historyData)

      // Pre-fill approve amount
      if (refundData.eligible_amount) {
        setApproveAmount(refundData.eligible_amount.toString())
      }
    } catch (error) {
      console.error('Failed to load refund:', error)
      showError('Failed to load refund', 'Please try again later.')
    } finally {
      setLoading(false)
    }
  }

  const handleMarkUnderReview = async () => {
    try {
      setActionLoading(true)
      await refundsApi.markUnderReview(id!)
      showSuccess('Status Updated', 'Refund is now under review.')
      await loadRefundData()
    } catch (error) {
      console.error('Failed to update status:', error)
      showError('Failed to update status', 'Please try again.')
    } finally {
      setActionLoading(false)
    }
  }

  const handleApprove = async () => {
    try {
      setActionLoading(true)
      const amount = parseFloat(approveAmount)
      if (isNaN(amount) || amount <= 0) {
        showError('Invalid amount', 'Please enter a valid amount.')
        return
      }
      await refundsApi.approve(id!, { approved_amount: amount, override_reason: overrideReason || undefined })
      showSuccess('Refund Approved', `Approved amount: ${formatCurrency(amount)}`)
      setShowApproveModal(false)
      await loadRefundData()
    } catch (error) {
      console.error('Failed to approve refund:', error)
      showError('Failed to approve', 'Please try again.')
    } finally {
      setActionLoading(false)
    }
  }

  const handleReject = async () => {
    try {
      setActionLoading(true)
      if (!rejectionReason.trim()) {
        showError('Reason required', 'Please provide a reason for rejection.')
        return
      }
      await refundsApi.reject(id!, rejectionReason)
      showSuccess('Refund Rejected', 'Customer will be notified.')
      setShowRejectModal(false)
      await loadRefundData()
    } catch (error) {
      console.error('Failed to reject refund:', error)
      showError('Failed to reject', 'Please try again.')
    } finally {
      setActionLoading(false)
    }
  }

  const handleProcess = async () => {
    try {
      setActionLoading(true)
      await refundsApi.process(id!, processMethod)
      const methodMessages: Record<string, string> = {
        paystack: 'Paystack refund initiated.',
        eft: 'EFT refund marked as processing. Complete the bank transfer and mark as completed.',
        paypal: 'PayPal refund marked as processing. Complete the PayPal transfer and mark as completed.',
        manual: 'Refund marked as processing. Complete the refund and mark as completed.'
      }
      showSuccess('Processing Started', methodMessages[processMethod] || 'Refund marked as processing.')
      setShowProcessModal(false)
      await loadRefundData()
    } catch (error) {
      console.error('Failed to process refund:', error)
      showError('Failed to process', 'Please try again.')
    } finally {
      setActionLoading(false)
    }
  }

  const handleComplete = async () => {
    try {
      setActionLoading(true)
      await refundsApi.complete(id!, { processed_amount: refund!.approved_amount || 0, refund_reference: manualReference || undefined })
      showSuccess('Refund Completed', 'The refund has been marked as completed.')
      setShowCompleteModal(false)
      await loadRefundData()
    } catch (error) {
      console.error('Failed to complete refund:', error)
      showError('Failed to complete', 'Please try again.')
    } finally {
      setActionLoading(false)
    }
  }

  const handleSaveNotes = async () => {
    try {
      setNotesLoading(true)
      await refundsApi.updateNotes(id!, staffNotes)
      showSuccess('Notes Saved', 'Staff notes have been updated.')
      setIsEditingNotes(false)
      await loadRefundData()
    } catch (error) {
      console.error('Failed to save notes:', error)
      showError('Failed to save', 'Please try again.')
    } finally {
      setNotesLoading(false)
    }
  }

  const handleStartEditNotes = () => {
    setStaffNotes(refund?.staff_notes || '')
    setIsEditingNotes(true)
  }

  const handleCancelEditNotes = () => {
    setStaffNotes(refund?.staff_notes || '')
    setIsEditingNotes(false)
  }

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return '-'
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatCurrency = (amount: number | null | undefined, currency: string = 'ZAR') => {
    if (amount === null || amount === undefined) return '-'
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(amount)
  }

  const getShortId = (idStr: string) => {
    return idStr.substring(0, 8).toUpperCase()
  }

  // Determine which actions are available
  const getAvailableActions = () => {
    if (!refund) return []
    const actions: string[] = []

    switch (refund.status) {
      case 'requested':
        actions.push('review', 'approve', 'reject')
        break
      case 'under_review':
        actions.push('approve', 'reject')
        break
      case 'approved':
        actions.push('process')
        break
      case 'processing':
        actions.push('complete')
        break
    }

    return actions
  }

  const availableActions = getAvailableActions()

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <Loader2 className="animate-spin text-gray-400" size={32} />
      </div>
    )
  }

  if (!refund) {
    return (
      <div className="p-8">
        <div className="text-center py-12">
          <AlertCircle className="mx-auto text-gray-400 mb-4" size={48} />
          <h2 className="text-xl font-semibold text-gray-700">Refund not found</h2>
          <Button onClick={() => navigate('/dashboard/refunds')} className="mt-4">
            Back to Refunds
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8 bg-gray-50 min-h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/dashboard/refunds')}
            className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Refund #{getShortId(refund.id)}
            </h1>
            <p className="text-gray-500">
              Requested on {formatDate(refund.requested_at)}
            </p>
          </div>
        </div>
        <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full border ${refundStatusColors[refund.status]}`}>
          {refundStatusIcons[refund.status]}
          <span className="font-medium">{refundStatusLabels[refund.status]}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Status Workflow */}
          <Card className="p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Refund Progress</h3>
            <div className="flex items-center justify-between overflow-x-auto pb-2">
              {statusOrder.map((status, index) => {
                const isActive = refund.status === status
                const isPast = statusOrder.indexOf(refund.status) > index || refund.status === 'completed'
                const isRejected = refund.status === 'rejected'
                const isFailed = refund.status === 'failed'

                return (
                  <div key={status} className="flex items-center">
                    <div className={`flex flex-col items-center ${index > 0 ? 'ml-2' : ''}`}>
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        isActive ? refundStatusColors[status] :
                        isPast ? 'bg-green-100 text-green-700' :
                        'bg-gray-100 text-gray-400'
                      }`}>
                        {isPast && !isActive ? <CheckCircle size={20} /> : refundStatusIcons[status]}
                      </div>
                      <span className={`mt-2 text-xs font-medium ${
                        isActive || isPast ? 'text-gray-900' : 'text-gray-400'
                      }`}>
                        {refundStatusLabels[status]}
                      </span>
                    </div>
                    {index < statusOrder.length - 1 && (
                      <div className={`w-12 h-0.5 mx-2 ${
                        isPast ? 'bg-green-300' : 'bg-gray-200'
                      }`} />
                    )}
                  </div>
                )
              })}
            </div>
            {(refund.status === 'rejected' || refund.status === 'failed') && (
              <div className={`mt-4 p-3 rounded-lg ${refundStatusColors[refund.status]}`}>
                <div className="flex items-center gap-2">
                  {refundStatusIcons[refund.status]}
                  <span className="font-medium">
                    {refund.status === 'rejected' ? 'Refund Rejected' : 'Refund Failed'}
                  </span>
                </div>
                {refund.rejection_reason && (
                  <p className="mt-1 text-sm">{refund.rejection_reason}</p>
                )}
                {refund.failure_reason && (
                  <p className="mt-1 text-sm">{refund.failure_reason}</p>
                )}
              </div>
            )}
          </Card>

          {/* Amounts Card */}
          <Card className="p-6">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <DollarSign size={18} />
              Refund Amounts
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-500">Original Payment</p>
                <p className="text-xl font-bold text-gray-900">
                  {formatCurrency(refund.original_amount, refund.currency)}
                </p>
              </div>
              <div className="bg-yellow-50 p-4 rounded-lg">
                <p className="text-sm text-yellow-700">Eligible (Policy-based)</p>
                <p className="text-xl font-bold text-yellow-700">
                  {formatCurrency(refund.eligible_amount, refund.currency)}
                </p>
                {refund.refund_percentage !== undefined && (
                  <p className="text-sm text-yellow-600">{refund.refund_percentage}%</p>
                )}
              </div>
              <div className="bg-accent-50 p-4 rounded-lg">
                <p className="text-sm text-accent-700">Approved</p>
                <p className="text-xl font-bold text-accent-700">
                  {refund.approved_amount !== null
                    ? formatCurrency(refund.approved_amount, refund.currency)
                    : 'Pending'}
                </p>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <p className="text-sm text-green-700">Processed</p>
                <p className="text-xl font-bold text-green-700">
                  {refund.processed_amount !== null
                    ? formatCurrency(refund.processed_amount, refund.currency)
                    : '-'}
                </p>
              </div>
            </div>
          </Card>

          {/* Policy Applied Card */}
          {refund.policy_applied && (
            <Card className="p-6">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Percent size={18} />
                Cancellation Policy Applied
              </h3>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Days Before Check-in</p>
                    <p className="text-lg font-semibold text-gray-900">{refund.days_before_checkin} days</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Policy Rule</p>
                    <p className="text-lg font-semibold text-gray-900">
                      {(refund.policy_applied as any)?.label || `${refund.refund_percentage}% refund`}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Policy Days Threshold</p>
                    <p className="text-lg font-semibold text-gray-900">
                      {(refund.policy_applied as any)?.days_before || 0}+ days
                    </p>
                  </div>
                </div>
              </div>
            </Card>
          )}

          {/* Status History Timeline */}
          <Card className="p-6">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Clock size={18} />
              Status History
            </h3>
            {history.length === 0 ? (
              <p className="text-gray-500 text-sm">No status changes recorded yet.</p>
            ) : (
              <div className="space-y-4">
                {history.map((entry, index) => (
                  <div key={entry.id} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        refundStatusColors[entry.new_status as RefundStatus] || 'bg-gray-100'
                      }`}>
                        {refundStatusIcons[entry.new_status as RefundStatus] || <Clock size={14} />}
                      </div>
                      {index < history.length - 1 && (
                        <div className="w-0.5 h-full bg-gray-200 my-1" />
                      )}
                    </div>
                    <div className="flex-1 pb-4">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900">
                          {refundStatusLabels[entry.new_status as RefundStatus] || entry.new_status}
                        </span>
                        {entry.previous_status && (
                          <>
                            <ArrowRight size={14} className="text-gray-400" />
                            <span className="text-sm text-gray-500">
                              from {refundStatusLabels[entry.previous_status as RefundStatus] || entry.previous_status}
                            </span>
                          </>
                        )}
                      </div>
                      <p className="text-sm text-gray-500 mt-1">
                        {formatDate(entry.created_at)}
                        {entry.changed_by_name && ` by ${entry.changed_by_name}`}
                      </p>
                      {entry.notes && (
                        <p className="text-sm text-gray-600 mt-1 bg-gray-50 p-2 rounded">
                          {entry.notes}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Action Buttons - At Top of Sidebar */}
          {availableActions.length > 0 && (
            <Card className="p-6 border-accent-200 bg-accent-50/30">
              <h3 className="font-semibold text-gray-900 mb-4">Quick Actions</h3>
              <div className="flex flex-col gap-2">
                {availableActions.includes('review') && (
                  <Button
                    variant="secondary"
                    onClick={handleMarkUnderReview}
                    disabled={actionLoading}
                    className="w-full justify-center"
                  >
                    <Eye size={16} className="mr-2" />
                    Start Review
                  </Button>
                )}
                {availableActions.includes('approve') && (
                  <Button
                    onClick={() => setShowApproveModal(true)}
                    disabled={actionLoading}
                    className="w-full justify-center"
                  >
                    <CheckCircle size={16} className="mr-2" />
                    Approve Refund
                  </Button>
                )}
                {availableActions.includes('reject') && (
                  <Button
                    variant="danger"
                    onClick={() => setShowRejectModal(true)}
                    disabled={actionLoading}
                    className="w-full justify-center"
                  >
                    <XCircle size={16} className="mr-2" />
                    Reject Refund
                  </Button>
                )}
                {availableActions.includes('process') && (
                  <Button
                    onClick={() => setShowProcessModal(true)}
                    disabled={actionLoading}
                    className="w-full justify-center"
                  >
                    <RefreshCw size={16} className="mr-2" />
                    Process Refund
                  </Button>
                )}
                {availableActions.includes('complete') && (
                  <Button
                    onClick={() => setShowCompleteModal(true)}
                    disabled={actionLoading}
                    className="w-full justify-center"
                  >
                    <CheckCircle size={16} className="mr-2" />
                    Mark as Completed
                  </Button>
                )}
              </div>
            </Card>
          )}

          {/* Booking Info */}
          <Card className="p-6">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Calendar size={18} />
              Booking Details
            </h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <FileText className="text-gray-400" size={18} />
                <div>
                  <p className="text-sm text-gray-500">Booking ref #:</p>
                  <p className="font-medium text-gray-900 font-mono text-sm">
                    {refund.booking_reference || `VILO-${refund.booking_id?.substring(0, 4).toUpperCase()}`}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <User className="text-gray-400" size={18} />
                <div>
                  <p className="text-sm text-gray-500">Customer</p>
                  <p className="font-medium text-gray-900">
                    {refund.bookings?.guest_name || refund.customers?.name || refund.guest_name || 'N/A'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Mail className="text-gray-400" size={18} />
                <div>
                  <p className="text-sm text-gray-500">Email</p>
                  {(() => {
                    const email = refund.bookings?.guest_email || refund.customers?.email
                    return email ? (
                      <a href={`mailto:${email}`} className="text-sm text-accent-600 hover:text-accent-700 hover:underline">
                        {email}
                      </a>
                    ) : <span className="text-sm text-gray-500">N/A</span>
                  })()}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Phone className="text-gray-400" size={18} />
                <div>
                  <p className="text-sm text-gray-500">Phone</p>
                  {(() => {
                    const phone = refund.bookings?.guest_phone || refund.customers?.phone
                    return phone ? (
                      <a href={`tel:${phone}`} className="text-sm text-accent-600 hover:text-accent-700 hover:underline">
                        {phone}
                      </a>
                    ) : <span className="text-sm text-gray-500">N/A</span>
                  })()}
                </div>
              </div>
              {/* Start Chat Link */}
              {(refund.bookings?.guest_email || refund.customers?.email) && (
                <button
                  onClick={() => {
                    const email = refund.bookings?.guest_email || refund.customers?.email
                    const name = refund.bookings?.guest_name || refund.customers?.name || refund.guest_name
                    if (email) {
                      navigate(`/dashboard/support?newMessage=${encodeURIComponent(email)}&name=${encodeURIComponent(name || '')}`)
                    }
                  }}
                  className="flex items-center gap-1.5 text-xs text-accent-600 hover:text-accent-700 ml-7"
                >
                  <MessageCircle size={14} />
                  Start Chat
                </button>
              )}
              <div className="flex items-center gap-3">
                <BedDouble className="text-gray-400" size={18} />
                <div>
                  <p className="text-sm text-gray-500">Room</p>
                  <p className="font-medium text-gray-900">{refund.room_name || refund.bookings?.room_name || 'N/A'}</p>
                </div>
              </div>
              {refund.check_in && (
                <div className="flex items-center gap-3">
                  <Calendar className="text-gray-400" size={18} />
                  <div>
                    <p className="text-sm text-gray-500">Check-in</p>
                    <p className="font-medium text-gray-900">
                      {new Date(refund.check_in).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              )}
              {refund.check_out && (
                <div className="flex items-center gap-3">
                  <Calendar className="text-gray-400" size={18} />
                  <div>
                    <p className="text-sm text-gray-500">Check-out</p>
                    <p className="font-medium text-gray-900">
                      {new Date(refund.check_out).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              )}
              <button
                onClick={() => navigate(`/dashboard/bookings/${refund.booking_id}`)}
                className="w-full mt-3 flex items-center justify-center gap-2 text-accent-600 hover:text-accent-700 py-2 px-4 rounded-lg border border-accent-200 hover:bg-accent-50 transition-colors"
              >
                View Booking <ExternalLink size={14} />
              </button>
            </div>
          </Card>

          {/* Payment Info */}
          <Card className="p-6">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <CreditCard size={18} />
              Payment Info
            </h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Payment Method</span>
                <span className="font-medium text-gray-900 capitalize">
                  {refund.payment_method || refund.bookings?.payment_method || (refund.original_payment_reference ? 'Online Payment' : 'EFT / Bank Transfer')}
                </span>
              </div>
              {refund.original_payment_reference && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Original Reference</span>
                  <span className="font-mono text-gray-900 text-xs">
                    {refund.original_payment_reference}
                  </span>
                </div>
              )}
              {refund.refund_reference && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Refund Reference</span>
                  <span className="font-mono text-gray-900 text-xs">
                    {refund.refund_reference}
                  </span>
                </div>
              )}
            </div>
          </Card>

          {/* Staff Notes */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <MessageSquare size={18} />
                Staff Notes
              </h3>
              {!isEditingNotes && (
                <button
                  onClick={handleStartEditNotes}
                  className="text-xs text-accent-600 hover:text-accent-700 flex items-center gap-1"
                >
                  <Pencil size={12} />
                  {refund.staff_notes ? 'Edit' : 'Add'}
                </button>
              )}
            </div>
            {isEditingNotes ? (
              <div className="space-y-3">
                <textarea
                  value={staffNotes}
                  onChange={(e) => setStaffNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent-500 focus:border-accent-500 text-sm"
                  rows={4}
                  placeholder="Add internal notes about this refund..."
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleSaveNotes}
                    disabled={notesLoading}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 bg-accent-600 hover:bg-accent-700 text-white text-sm rounded-lg disabled:opacity-50"
                  >
                    {notesLoading ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                    Save
                  </button>
                  <button
                    onClick={handleCancelEditNotes}
                    disabled={notesLoading}
                    className="flex items-center justify-center gap-1.5 px-3 py-1.5 border border-gray-300 text-gray-700 text-sm rounded-lg hover:bg-gray-50"
                  >
                    <X size={14} />
                    Cancel
                  </button>
                </div>
              </div>
            ) : refund.staff_notes ? (
              <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg whitespace-pre-wrap">
                {refund.staff_notes}
              </p>
            ) : (
              <p className="text-sm text-gray-400 italic">No staff notes added.</p>
            )}
            {refund.override_reason && (
              <div className="mt-3">
                <p className="text-xs text-gray-500 uppercase font-medium">Override Reason</p>
                <p className="text-sm text-gray-600 bg-yellow-50 p-3 rounded-lg mt-1">
                  {refund.override_reason}
                </p>
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Approve Modal */}
      {showApproveModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Approve Refund</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Approve Amount ({refund.currency})
                </label>
                <input
                  type="number"
                  value={approveAmount}
                  onChange={(e) => setApproveAmount(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent-500 focus:border-accent-500"
                  placeholder={refund.eligible_amount?.toString()}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Eligible amount: {formatCurrency(refund.eligible_amount, refund.currency)}
                </p>
              </div>
              {parseFloat(approveAmount) !== refund.eligible_amount && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Override Reason (required if different from eligible)
                  </label>
                  <textarea
                    value={overrideReason}
                    onChange={(e) => setOverrideReason(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent-500 focus:border-accent-500"
                    rows={2}
                    placeholder="Explain why the approved amount differs..."
                  />
                </div>
              )}
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <Button variant="secondary" onClick={() => setShowApproveModal(false)}>
                Cancel
              </Button>
              <Button onClick={handleApprove} disabled={actionLoading}>
                {actionLoading ? <Loader2 className="animate-spin mr-2" size={16} /> : null}
                Approve
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Reject Refund</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Rejection Reason *
                </label>
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent-500 focus:border-accent-500"
                  rows={3}
                  placeholder="Explain why the refund is being rejected..."
                />
                <p className="text-xs text-gray-500 mt-1">
                  This reason will be shared with the customer.
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <Button variant="secondary" onClick={() => setShowRejectModal(false)}>
                Cancel
              </Button>
              <Button variant="danger" onClick={handleReject} disabled={actionLoading}>
                {actionLoading ? <Loader2 className="animate-spin mr-2" size={16} /> : null}
                Reject
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Process Modal */}
      {showProcessModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Process Refund</h3>
            <p className="text-sm text-gray-600 mb-4">
              Approved amount: <strong>{formatCurrency(refund.approved_amount, refund.currency)}</strong>
            </p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Refund Method
                </label>
                <div className="space-y-2">
                  <label className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50 ${processMethod === 'paystack' ? 'border-accent-500 bg-accent-50' : ''}`}>
                    <input
                      type="radio"
                      name="processMethod"
                      value="paystack"
                      checked={processMethod === 'paystack'}
                      onChange={() => setProcessMethod('paystack')}
                      className="text-accent-600 focus:ring-accent-500"
                    />
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">Paystack</p>
                      <p className="text-xs text-gray-500">Automatically process via Paystack (if original payment was via Paystack)</p>
                    </div>
                  </label>
                  <label className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50 ${processMethod === 'eft' ? 'border-accent-500 bg-accent-50' : ''}`}>
                    <input
                      type="radio"
                      name="processMethod"
                      value="eft"
                      checked={processMethod === 'eft'}
                      onChange={() => setProcessMethod('eft')}
                      className="text-accent-600 focus:ring-accent-500"
                    />
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">EFT (Bank Transfer)</p>
                      <p className="text-xs text-gray-500">Process refund via direct bank transfer</p>
                    </div>
                  </label>
                  <label className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50 ${processMethod === 'paypal' ? 'border-accent-500 bg-accent-50' : ''}`}>
                    <input
                      type="radio"
                      name="processMethod"
                      value="paypal"
                      checked={processMethod === 'paypal'}
                      onChange={() => setProcessMethod('paypal')}
                      className="text-accent-600 focus:ring-accent-500"
                    />
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">PayPal</p>
                      <p className="text-xs text-gray-500">Process refund via PayPal</p>
                    </div>
                  </label>
                  <label className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50 ${processMethod === 'manual' ? 'border-accent-500 bg-accent-50' : ''}`}>
                    <input
                      type="radio"
                      name="processMethod"
                      value="manual"
                      checked={processMethod === 'manual'}
                      onChange={() => setProcessMethod('manual')}
                      className="text-accent-600 focus:ring-accent-500"
                    />
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">Manual / Other</p>
                      <p className="text-xs text-gray-500">Process the refund manually outside the system</p>
                    </div>
                  </label>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <Button variant="secondary" onClick={() => setShowProcessModal(false)}>
                Cancel
              </Button>
              <Button onClick={handleProcess} disabled={actionLoading}>
                {actionLoading ? <Loader2 className="animate-spin mr-2" size={16} /> : null}
                Start Processing
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Complete Modal */}
      {showCompleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Mark Refund as Completed</h3>
            <p className="text-sm text-gray-600 mb-4">
              Confirm that the refund of <strong>{formatCurrency(refund.approved_amount, refund.currency)}</strong> has been processed.
            </p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Reference Number (optional)
                </label>
                <input
                  type="text"
                  value={manualReference}
                  onChange={(e) => setManualReference(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent-500 focus:border-accent-500"
                  placeholder="Bank reference, confirmation number, etc."
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <Button variant="secondary" onClick={() => setShowCompleteModal(false)}>
                Cancel
              </Button>
              <Button onClick={handleComplete} disabled={actionLoading}>
                {actionLoading ? <Loader2 className="animate-spin mr-2" size={16} /> : null}
                Confirm Completion
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

import { CreditCard, Calendar, RefreshCw, AlertTriangle } from 'lucide-react'

interface Subscription {
  id: string
  planName: string
  status: string
  currentPeriodEnd: string
  cancelAtPeriodEnd: boolean
}

interface SubscriptionSectionProps {
  subscription: Subscription | null
}

const statusColors: Record<string, string> = {
  active: 'bg-green-100 text-green-700',
  trial: 'bg-blue-100 text-blue-700',
  past_due: 'bg-amber-100 text-amber-700',
  cancelled: 'bg-red-100 text-red-700',
  expired: 'bg-gray-100 text-gray-600',
}

export default function SubscriptionSection({ subscription }: SubscriptionSectionProps) {
  const formatDate = (dateString: string) => {
    if (!dateString) return '-'
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const getDaysRemaining = (dateString: string) => {
    const end = new Date(dateString)
    const now = new Date()
    const diffTime = end.getTime() - now.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  if (!subscription) {
    return (
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Subscription</h2>
          <p className="text-sm text-gray-500">Subscription details and billing</p>
        </div>

        <div className="py-12 text-center bg-gray-50 rounded-lg">
          <CreditCard size={32} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500">No active subscription</p>
        </div>
      </div>
    )
  }

  const daysRemaining = getDaysRemaining(subscription.currentPeriodEnd)

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Subscription</h2>
        <p className="text-sm text-gray-500">Subscription details and billing</p>
      </div>

      {/* Plan Card */}
      <div className="bg-gradient-to-r from-accent-500 to-accent-600 rounded-xl p-6 text-white">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm opacity-80">Current Plan</p>
            <h3 className="text-2xl font-bold mt-1">{subscription.planName}</h3>
          </div>
          <span className={`px-3 py-1 text-sm font-medium rounded-full capitalize ${
            subscription.status === 'active' ? 'bg-white/20 text-white' :
            subscription.status === 'trial' ? 'bg-blue-200 text-blue-800' :
            'bg-white/20 text-white'
          }`}>
            {subscription.status}
          </span>
        </div>
      </div>

      {/* Cancel at Period End Warning */}
      {subscription.cancelAtPeriodEnd && (
        <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <AlertTriangle size={20} className="text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-amber-800">
              Subscription ending
            </p>
            <p className="text-sm text-amber-700 mt-1">
              This subscription will not renew and will end on {formatDate(subscription.currentPeriodEnd)}
            </p>
          </div>
        </div>
      )}

      {/* Details */}
      <div className="bg-gray-50 rounded-xl p-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">Subscription Details</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <CreditCard size={16} className="text-gray-400" />
              Status
            </div>
            <span className={`px-2 py-0.5 text-xs font-medium rounded-full capitalize ${statusColors[subscription.status] || 'bg-gray-100 text-gray-600'}`}>
              {subscription.status}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Calendar size={16} className="text-gray-400" />
              Current Period Ends
            </div>
            <span className="text-sm font-medium text-gray-900">
              {formatDate(subscription.currentPeriodEnd)}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <RefreshCw size={16} className="text-gray-400" />
              Auto-Renew
            </div>
            <span className={`text-sm font-medium ${subscription.cancelAtPeriodEnd ? 'text-red-600' : 'text-green-600'}`}>
              {subscription.cancelAtPeriodEnd ? 'No' : 'Yes'}
            </span>
          </div>
        </div>
      </div>

      {/* Period Remaining */}
      <div className="bg-gray-50 rounded-xl p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-600">Period Remaining</span>
          <span className="text-sm font-medium text-gray-900">
            {daysRemaining > 0 ? `${daysRemaining} days` : 'Expired'}
          </span>
        </div>
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full ${daysRemaining > 7 ? 'bg-accent-500' : daysRemaining > 0 ? 'bg-amber-500' : 'bg-red-500'}`}
            style={{ width: `${Math.max(0, Math.min(100, (daysRemaining / 30) * 100))}%` }}
          />
        </div>
      </div>
    </div>
  )
}

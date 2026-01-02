import {
  Mail,
  Phone,
  Globe,
  Clock,
  Copy,
  Check,
  Building2,
  BedDouble,
  Users,
  Calendar,
  UserCog,
  Ban,
  PlayCircle,
  CreditCard,
  PauseCircle,
  Play
} from 'lucide-react'
import { useState } from 'react'

interface TenantData {
  id: string
  name: string
  slug?: string | null
  status: string
  businessName?: string
  businessEmail?: string
  businessPhone?: string
  currency?: string
  timezone?: string
  createdAt: string
  is_paused?: boolean
  subscription?: {
    planName: string
    status: string
    currentPeriodEnd: string
    cancelAtPeriodEnd: boolean
  } | null
  usage?: {
    rooms: number
    teamMembers: number
    monthlyBookings: number
  }
}

interface TenantActionsPanelProps {
  tenant: TenantData
  onImpersonate: () => void
  onSuspend: () => void
  onActivate: () => void
  onPause: () => void
  onUnpause: () => void
  actionLoading?: string | null
}

export default function TenantActionsPanel({
  tenant,
  onImpersonate,
  onSuspend,
  onActivate,
  onPause,
  onUnpause,
  actionLoading
}: TenantActionsPanelProps) {
  const [copied, setCopied] = useState(false)

  const handleCopyEmail = async () => {
    if (!tenant.businessEmail) return
    try {
      await navigator.clipboard.writeText(tenant.businessEmail)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy email:', err)
    }
  }

  const getInitial = () => {
    return (tenant.name || tenant.businessName || 'T').charAt(0).toUpperCase()
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return '-'
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const getAccountAge = () => {
    const created = new Date(tenant.createdAt)
    const now = new Date()
    const diffTime = Math.abs(now.getTime() - created.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays < 30) return `${diffDays} days`
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months`
    return `${Math.floor(diffDays / 365)} years`
  }

  const statusColors: Record<string, string> = {
    active: 'bg-green-100 text-green-700',
    trial: 'bg-blue-100 text-blue-700',
    suspended: 'bg-red-100 text-red-700',
    cancelled: 'bg-gray-100 text-gray-600',
    past_due: 'bg-amber-100 text-amber-700',
    paused: 'bg-amber-100 text-amber-700'
  }

  // Determine display status (paused overrides the normal status)
  const displayStatus = tenant.is_paused ? 'paused' : tenant.status

  return (
    <div className="hidden xl:block w-80 shrink-0">
      <div className="sticky top-24 space-y-4">
        {/* Tenant Card */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {/* Header gradient */}
          <div className="h-16 bg-gradient-to-r from-accent-500 to-accent-600" />

          {/* Avatar & Info */}
          <div className="px-5 pb-5 -mt-8">
            {/* Avatar */}
            <div className="mb-4">
              <div className="w-16 h-16 rounded-full border-4 border-white bg-gradient-to-br from-accent-400 to-accent-600 flex items-center justify-center text-white text-2xl font-bold shadow-sm">
                {getInitial()}
              </div>
            </div>

            {/* Name & Status */}
            <div className="mb-3">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-lg font-semibold text-gray-900 truncate">
                  {tenant.name || tenant.businessName || 'Unnamed Tenant'}
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <span className={`px-2 py-0.5 text-xs font-medium rounded-full capitalize ${statusColors[displayStatus] || statusColors.cancelled}`}>
                  {displayStatus}
                </span>
                {tenant.slug && (
                  <span className="text-xs text-gray-400 truncate">
                    /{tenant.slug}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Business Info */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
            Business Info
          </h4>
          <div className="space-y-2">
            {tenant.businessEmail && (
              <button
                onClick={handleCopyEmail}
                className="w-full flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 group"
              >
                <Mail size={14} className="text-gray-400 shrink-0" />
                <span className="truncate flex-1 text-left">{tenant.businessEmail}</span>
                {copied ? (
                  <Check size={14} className="text-accent-500 shrink-0" />
                ) : (
                  <Copy size={14} className="text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                )}
              </button>
            )}
            {tenant.businessPhone && (
              <a
                href={`tel:${tenant.businessPhone}`}
                className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
              >
                <Phone size={14} className="text-gray-400 shrink-0" />
                <span>{tenant.businessPhone}</span>
              </a>
            )}
            {tenant.currency && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Globe size={14} className="text-gray-400 shrink-0" />
                <span>{tenant.currency} / {tenant.timezone || 'UTC'}</span>
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
            Quick Actions
          </h4>
          <div className="space-y-2">
            <button
              onClick={onImpersonate}
              disabled={actionLoading === 'impersonate'}
              className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
            >
              <UserCog size={16} className="text-accent-600" />
              {actionLoading === 'impersonate' ? 'Starting...' : 'Impersonate'}
            </button>

            {/* Pause/Unpause - only show if not suspended */}
            {tenant.status !== 'suspended' && (
              tenant.is_paused ? (
                <button
                  onClick={onUnpause}
                  disabled={actionLoading === 'unpause'}
                  className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-green-700 bg-green-50 hover:bg-green-100 rounded-lg transition-colors disabled:opacity-50"
                >
                  <Play size={16} className="text-green-600" />
                  {actionLoading === 'unpause' ? 'Resuming...' : 'Resume Tenant'}
                </button>
              ) : (
                <button
                  onClick={onPause}
                  disabled={actionLoading === 'pause'}
                  className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-lg transition-colors disabled:opacity-50"
                >
                  <PauseCircle size={16} className="text-amber-600" />
                  {actionLoading === 'pause' ? 'Pausing...' : 'Pause Tenant'}
                </button>
              )
            )}

            {/* Suspend/Activate */}
            {tenant.status === 'active' || tenant.status === 'trial' ? (
              <button
                onClick={onSuspend}
                disabled={actionLoading === 'suspend'}
                className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-red-700 bg-red-50 hover:bg-red-100 rounded-lg transition-colors disabled:opacity-50"
              >
                <Ban size={16} className="text-red-600" />
                {actionLoading === 'suspend' ? 'Suspending...' : 'Suspend Tenant'}
              </button>
            ) : tenant.status === 'suspended' ? (
              <button
                onClick={onActivate}
                disabled={actionLoading === 'activate'}
                className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-green-700 bg-green-50 hover:bg-green-100 rounded-lg transition-colors disabled:opacity-50"
              >
                <PlayCircle size={16} className="text-green-600" />
                {actionLoading === 'activate' ? 'Activating...' : 'Activate Tenant'}
              </button>
            ) : null}
          </div>
        </div>

        {/* Key Metrics */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
            Key Metrics
          </h4>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <BedDouble size={14} className="text-blue-500" />
                Rooms
              </div>
              <span className="text-sm font-semibold text-gray-900">
                {tenant.usage?.rooms ?? 0}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Users size={14} className="text-accent-500" />
                Team Members
              </div>
              <span className="text-sm font-semibold text-gray-900">
                {tenant.usage?.teamMembers ?? 0}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Calendar size={14} className="text-purple-500" />
                Monthly Bookings
              </div>
              <span className="text-sm font-semibold text-gray-900">
                {tenant.usage?.monthlyBookings ?? 0}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Clock size={14} className="text-gray-400" />
                Account Age
              </div>
              <span className="text-sm font-semibold text-gray-900">
                {getAccountAge()}
              </span>
            </div>
          </div>
        </div>

        {/* Subscription Card */}
        {tenant.subscription && (
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
              Subscription
            </h4>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <CreditCard size={14} className="text-accent-500" />
                  Plan
                </div>
                <span className="text-sm font-semibold text-gray-900">
                  {tenant.subscription.planName}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Status</span>
                <span className={`px-2 py-0.5 text-xs font-medium rounded-full capitalize ${statusColors[tenant.subscription.status] || 'bg-gray-100 text-gray-600'}`}>
                  {tenant.subscription.status}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Period End</span>
                <span className="text-sm font-semibold text-gray-900">
                  {formatDate(tenant.subscription.currentPeriodEnd)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Auto-Renew</span>
                <span className="text-sm font-semibold text-gray-900">
                  {tenant.subscription.cancelAtPeriodEnd ? 'No' : 'Yes'}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

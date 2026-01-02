import { useState, useEffect, useMemo, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Loader2, AlertCircle, X, LayoutDashboard, Users, BedDouble, CreditCard, Gauge, Activity, Building2, User, UserCheck, Calendar, Star, ReceiptText } from 'lucide-react'
import { adminTenants, TenantDetail as TenantDetailType, TenantOwner, OwnerUpdateData, TenantUpdateData, TenantCustomer, TenantReview, TenantRefund } from '../../services/adminApi'
import {
  TenantDetailLayout,
  TenantDetailSidebar,
  TenantActionsPanel,
  calculateTenantHealth,
  OverviewSection,
  OwnerSection,
  TeamMembersSection,
  ActivitySection,
  PropertySection,
  PropertiesSection,
  SubscriptionSection,
  UsageSection,
  CustomersSection,
  BookingsSection,
  ReviewsSection,
  RefundsSection,
  type SectionGroup,
  type SectionStatus,
  type TenantMember,
  type TenantRoom,
  type TenantBooking,
  type TenantProperty
} from '../../components/admin/tenant-detail'

const statusColors: Record<string, string> = {
  active: 'bg-green-100 text-green-700 border-green-200',
  trial: 'bg-blue-100 text-blue-700 border-blue-200',
  suspended: 'bg-red-100 text-red-700 border-red-200',
  cancelled: 'bg-gray-100 text-gray-600 border-gray-200',
}

export function TenantDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [tenant, setTenant] = useState<TenantDetailType | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeSection, setActiveSection] = useState('overview')
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [impersonateReason, setImpersonateReason] = useState('')
  const [showImpersonateModal, setShowImpersonateModal] = useState(false)

  useEffect(() => {
    async function fetchTenant() {
      if (!id) return
      try {
        setLoading(true)
        const data = await adminTenants.get(id)
        setTenant(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load tenant')
      } finally {
        setLoading(false)
      }
    }

    fetchTenant()
  }, [id])

  // Extract data from tenant response
  const members: TenantMember[] = useMemo(() => {
    if (!tenant) return []
    return (tenant as any).tenant_members || []
  }, [tenant])

  const rooms: TenantRoom[] = useMemo(() => {
    if (!tenant) return []
    return (tenant as any).rooms || []
  }, [tenant])

  const bookings: TenantBooking[] = useMemo(() => {
    if (!tenant) return []
    return (tenant as any).bookings || []
  }, [tenant])

  // Extract property data
  const property: TenantProperty | null = useMemo(() => {
    if (!tenant) return null
    return {
      id: tenant.id,
      businessName: tenant.businessName,
      businessDescription: tenant.businessDescription,
      logoUrl: tenant.logoUrl,
      businessEmail: tenant.businessEmail,
      businessPhone: tenant.businessPhone,
      websiteUrl: tenant.websiteUrl,
      addressLine1: tenant.addressLine1,
      addressLine2: tenant.addressLine2,
      city: tenant.city,
      stateProvince: tenant.stateProvince,
      postalCode: tenant.postalCode,
      country: tenant.country,
      vatNumber: tenant.vatNumber,
      companyRegistrationNumber: tenant.companyRegistrationNumber,
      currency: tenant.currency,
      timezone: tenant.timezone,
      language: tenant.language,
      dateFormat: tenant.dateFormat,
      discoverable: tenant.discoverable
    }
  }, [tenant])

  // Extract owner data
  const owner: TenantOwner | null = useMemo(() => {
    if (!tenant) return null
    return (tenant as any).owner || null
  }, [tenant])

  // Calculate tenant health
  const healthPercentage = useMemo(() => {
    if (!tenant) return 0
    return calculateTenantHealth({
      subscriptionStatus: tenant.subscription?.status || null,
      roomCount: tenant.usage?.rooms || 0,
      memberCount: tenant.usage?.teamMembers || 0,
      monthlyBookings: tenant.usage?.monthlyBookings || 0,
      maxRooms: tenant.limits?.maxRooms || 0,
      maxMembers: tenant.limits?.maxTeamMembers || 0,
      lastActiveAt: tenant.lastActiveAt || null,
      createdAt: tenant.createdAt
    })
  }, [tenant])

  // Section groups for navigation
  const sectionGroups: SectionGroup[] = useMemo(() => [
    {
      id: 'general',
      name: 'General',
      items: [
        { id: 'overview', name: 'Overview', icon: LayoutDashboard }
      ]
    },
    {
      id: 'organization',
      name: 'Organization',
      items: [
        { id: 'owner', name: 'Owner', icon: User },
        { id: 'property', name: 'Property', icon: Building2 },
        { id: 'rooms', name: 'Rooms', icon: BedDouble, count: rooms.length },
        { id: 'team', name: 'Team Members', icon: Users, count: members.length }
      ]
    },
    {
      id: 'operations',
      name: 'Operations',
      items: [
        { id: 'customers', name: 'Customers', icon: UserCheck },
        { id: 'bookings', name: 'Bookings', icon: Calendar, count: bookings.length },
        { id: 'reviews', name: 'Reviews', icon: Star },
        { id: 'refunds', name: 'Refunds', icon: ReceiptText }
      ]
    },
    {
      id: 'account',
      name: 'Account',
      items: [
        { id: 'subscription', name: 'Subscription', icon: CreditCard },
        { id: 'usage', name: 'Usage & Limits', icon: Gauge },
        { id: 'activity', name: 'Activity', icon: Activity }
      ]
    }
  ], [members.length, rooms.length, bookings.length])

  const getSectionStatus = (sectionId: string): SectionStatus => {
    switch (sectionId) {
      case 'overview':
        return 'complete'
      case 'owner':
        return owner?.email ? 'complete' : 'empty'
      case 'property':
        return tenant?.businessName ? 'complete' : 'empty'
      case 'team':
        return members.length > 0 ? 'complete' : 'empty'
      case 'rooms':
        return rooms.length > 0 ? 'complete' : 'empty'
      case 'customers':
      case 'bookings':
      case 'reviews':
      case 'refunds':
        return 'complete' // Operations sections always show as complete
      case 'subscription':
        return tenant?.subscription ? 'complete' : 'empty'
      case 'usage':
        return 'complete'
      case 'activity':
        return bookings.length > 0 ? 'complete' : 'empty'
      default:
        return 'empty'
    }
  }

  const handleSuspend = async () => {
    if (!id || !tenant) return
    const reason = prompt('Enter reason for suspension:')
    if (!reason) return

    try {
      setActionLoading('suspend')
      await adminTenants.suspend(id, reason)
      setTenant({ ...tenant, status: 'suspended' })
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to suspend tenant')
    } finally {
      setActionLoading(null)
    }
  }

  const handleActivate = async () => {
    if (!id || !tenant) return
    try {
      setActionLoading('activate')
      await adminTenants.activate(id)
      setTenant({ ...tenant, status: 'active' })
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to activate tenant')
    } finally {
      setActionLoading(null)
    }
  }

  const handlePause = async () => {
    if (!id || !tenant) return
    const reason = prompt('Enter reason for pausing tenant:')
    if (!reason) return

    try {
      setActionLoading('pause')
      await adminTenants.pause(id, reason)
      setTenant({ ...tenant, is_paused: true })
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to pause tenant')
    } finally {
      setActionLoading(null)
    }
  }

  const handleUnpause = async () => {
    if (!id || !tenant) return
    try {
      setActionLoading('unpause')
      await adminTenants.unpause(id)
      setTenant({ ...tenant, is_paused: false })
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to unpause tenant')
    } finally {
      setActionLoading(null)
    }
  }

  const handleImpersonate = async () => {
    if (!id || !impersonateReason.trim()) return
    try {
      setActionLoading('impersonate')
      const { token, expiresAt } = await adminTenants.impersonate(id, impersonateReason)
      alert(`Impersonation token generated. Expires: ${new Date(expiresAt).toLocaleString()}`)
      setShowImpersonateModal(false)
      setImpersonateReason('')
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to start impersonation')
    } finally {
      setActionLoading(null)
    }
  }

  const handleOwnerUpdate = async (data: OwnerUpdateData) => {
    if (!id) return
    const result = await adminTenants.updateOwner(id, data)
    // Refresh tenant data to get updated owner
    const updatedTenant = await adminTenants.get(id)
    setTenant(updatedTenant)
  }

  const handleOwnerPasswordReset = async () => {
    if (!id) return
    await adminTenants.resetOwnerPassword(id)
  }

  const handlePropertyUpdate = async (data: TenantUpdateData) => {
    if (!id) return
    await adminTenants.update(id, data)
    // Refresh tenant data to get updated property
    const updatedTenant = await adminTenants.get(id)
    setTenant(updatedTenant)
  }

  // Operations data fetchers
  const fetchCustomers = useCallback(async (search?: string) => {
    if (!id) return []
    return adminTenants.getCustomers(id, search)
  }, [id])

  const fetchReviews = useCallback(async (status?: string) => {
    if (!id) return []
    return adminTenants.getReviews(id, status)
  }, [id])

  const fetchRefunds = useCallback(async (status?: string) => {
    if (!id) return []
    return adminTenants.getRefunds(id, status)
  }, [id])

  const renderSection = () => {
    if (!tenant) return null

    const usage = tenant.usage || { rooms: 0, teamMembers: 0, monthlyBookings: 0, storageUsedMB: 0 }
    const limits = tenant.limits || { maxRooms: 0, maxTeamMembers: 0, maxBookingsPerMonth: 0, maxStorageMB: 0 }

    switch (activeSection) {
      case 'overview':
        return (
          <OverviewSection
            usage={usage}
            limits={limits}
            recentBookings={bookings}
            recentActivity={bookings.slice(0, 10)}
            subscription={tenant.subscription}
            onNavigateToSection={setActiveSection}
          />
        )
      case 'owner':
        return (
          <OwnerSection
            owner={owner}
            tenantId={tenant.id}
            onUpdate={handleOwnerUpdate}
            onResetPassword={handleOwnerPasswordReset}
          />
        )
      case 'property':
        return property ? <PropertySection property={property} onUpdate={handlePropertyUpdate} /> : null
      case 'team':
        return <TeamMembersSection members={members} onMemberUpdate={async () => {
          if (id) {
            const updatedTenant = await adminTenants.get(id)
            setTenant(updatedTenant)
          }
        }} />
      case 'rooms':
        return <PropertiesSection rooms={rooms} onRoomUpdate={async () => {
          if (id) {
            const updatedTenant = await adminTenants.get(id)
            setTenant(updatedTenant)
          }
        }} />
      case 'customers':
        return <CustomersSection tenantId={tenant.id} onFetch={fetchCustomers} />
      case 'bookings':
        return <BookingsSection tenantId={tenant.id} bookings={bookings} />
      case 'reviews':
        return <ReviewsSection tenantId={tenant.id} onFetch={fetchReviews} />
      case 'refunds':
        return <RefundsSection tenantId={tenant.id} onFetch={fetchRefunds} />
      case 'subscription':
        return <SubscriptionSection subscription={tenant.subscription || null} />
      case 'usage':
        return <UsageSection usage={usage} limits={limits} />
      case 'activity':
        return <ActivitySection bookings={bookings} />
      default:
        return null
    }
  }

  if (loading) {
    return (
      <div className="bg-gray-50 p-8 min-h-full flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-accent-500" />
          <p className="text-gray-500">Loading tenant...</p>
        </div>
      </div>
    )
  }

  if (error || !tenant) {
    return (
      <div className="bg-gray-50 p-8 min-h-full">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center max-w-md mx-auto">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-red-700 mb-4">{error || 'Tenant not found'}</p>
          <button
            onClick={() => navigate('/admin/tenants')}
            className="text-accent-600 hover:text-accent-700"
          >
            Back to Tenants
          </button>
        </div>
      </div>
    )
  }

  return (
    <>
      <TenantDetailLayout
        title={tenant.name || 'Unnamed Tenant'}
        subtitle={tenant.slug || tenant.id}
        statusBadge={
          <span className={`px-3 py-1 text-sm rounded-full border capitalize ${statusColors[tenant.status]}`}>
            {tenant.status}
          </span>
        }
        activeSection={activeSection}
        onSectionChange={setActiveSection}
        sectionGroups={sectionGroups}
        getSectionStatus={getSectionStatus}
        healthPercentage={healthPercentage}
        onBack={() => navigate('/admin/tenants')}
        sidebar={
          <TenantDetailSidebar
            sectionGroups={sectionGroups}
            activeSection={activeSection}
            onSectionChange={setActiveSection}
            getSectionStatus={getSectionStatus}
            healthPercentage={healthPercentage}
          />
        }
        actionsPanel={
          <TenantActionsPanel
            tenant={{
              id: tenant.id,
              name: tenant.name || tenant.businessName || 'Unknown Tenant',
              slug: tenant.slug,
              status: tenant.status,
              businessName: tenant.businessName,
              businessEmail: tenant.businessEmail,
              businessPhone: tenant.businessPhone,
              currency: tenant.currency,
              timezone: tenant.timezone,
              createdAt: tenant.createdAt,
              is_paused: tenant.is_paused,
              subscription: tenant.subscription,
              usage: tenant.usage
            }}
            onImpersonate={() => setShowImpersonateModal(true)}
            onSuspend={handleSuspend}
            onActivate={handleActivate}
            onPause={handlePause}
            onUnpause={handleUnpause}
            actionLoading={actionLoading}
          />
        }
      >
        {renderSection()}
      </TenantDetailLayout>

      {/* Impersonate Modal */}
      {showImpersonateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Impersonate Tenant</h3>
              <button
                onClick={() => {
                  setShowImpersonateModal(false)
                  setImpersonateReason('')
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={24} />
              </button>
            </div>
            <p className="text-gray-500 text-sm mb-4">
              You will be able to view and act as this tenant. All actions will be logged.
            </p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Reason for impersonation (required)
              </label>
              <textarea
                value={impersonateReason}
                onChange={(e) => setImpersonateReason(e.target.value)}
                placeholder="e.g., Investigating support ticket #1234"
                rows={3}
                className="w-full bg-white border border-gray-200 rounded-lg px-4 py-2 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-accent-500"
              />
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowImpersonateModal(false)
                  setImpersonateReason('')
                }}
                className="px-4 py-2 text-gray-500 hover:text-gray-900"
              >
                Cancel
              </button>
              <button
                onClick={handleImpersonate}
                disabled={!impersonateReason.trim() || actionLoading === 'impersonate'}
                className="px-4 py-2 bg-accent-500 text-white rounded-lg hover:bg-accent-600 disabled:opacity-50"
              >
                {actionLoading === 'impersonate' ? 'Starting...' : 'Start Impersonation'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

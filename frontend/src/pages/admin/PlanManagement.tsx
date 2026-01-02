import { useState, useEffect } from 'react'
import { Loader2, Plus, Check, Edit2, Layers } from 'lucide-react'
import { adminBilling, Plan } from '../../services/adminApi'

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-ZA', {
    style: 'currency',
    currency: 'ZAR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

export function PlanManagement() {
  const [plans, setPlans] = useState<Plan[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('active')

  useEffect(() => {
    fetchPlans()
  }, [])

  const fetchPlans = async () => {
    try {
      setLoading(true)
      const plansData = await adminBilling.getPlans()
      setPlans(plansData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load plans')
    } finally {
      setLoading(false)
    }
  }

  const filteredPlans = plans.filter(plan => {
    if (filter === 'active') return plan.isActive
    if (filter === 'inactive') return !plan.isActive
    return true
  })

  if (loading) {
    return (
      <div className="bg-gray-50 p-8 min-h-full flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-accent-500" />
          <p className="text-gray-500">Loading plans...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-gray-50 p-8 min-h-full">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <p className="text-red-600">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-gray-50 p-8 min-h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Subscription Plans</h1>
          <p className="text-gray-500">Configure pricing tiers and features</p>
        </div>
        <button
          onClick={() => {
            // TODO: Open create plan modal
          }}
          className="inline-flex items-center gap-2 px-4 py-2 bg-accent-600 text-white rounded-lg hover:bg-accent-700 transition-colors"
        >
          <Plus size={18} />
          Create Plan
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit mb-6">
        {(['active', 'inactive', 'all'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            className={`px-4 py-2 text-sm font-medium rounded-md capitalize transition-colors ${
              filter === tab
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Plans Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {filteredPlans.map((plan) => (
          <div
            key={plan.id}
            className={`bg-white rounded-xl border ${
              plan.recommended ? 'border-accent-500 ring-2 ring-accent-500' : 'border-gray-200'
            } p-6 relative`}
          >
            {/* Recommended Badge */}
            {plan.recommended && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="bg-accent-500 text-white text-xs font-medium px-3 py-1 rounded-full">
                  {plan.highlightBadge || 'Most Popular'}
                </span>
              </div>
            )}

            {/* Plan Header */}
            <div className="text-center mb-6">
              <div className="w-12 h-12 bg-accent-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                <Layers className="w-6 h-6 text-accent-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 uppercase">{plan.name}</h3>
              {!plan.isActive && (
                <span className="inline-block mt-1 text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded">
                  Inactive
                </span>
              )}
            </div>

            {/* Pricing */}
            <div className="text-center mb-6">
              <div className="text-3xl font-bold text-gray-900">
                {formatCurrency(plan.priceMonthly)}
                <span className="text-sm font-normal text-gray-500">/mo</span>
              </div>
              {plan.priceYearly > 0 && (
                <p className="text-sm text-gray-500 mt-1">
                  {formatCurrency(plan.priceYearly)}/year
                </p>
              )}
            </div>

            {/* Limits */}
            <div className="space-y-3 mb-6">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Rooms</span>
                <span className="font-medium text-gray-900">
                  {plan.limits?.max_rooms === -1 ? 'Unlimited' : plan.limits?.max_rooms || 0}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Team Members</span>
                <span className="font-medium text-gray-900">
                  {plan.limits?.max_team_members === -1 ? 'Unlimited' : plan.limits?.max_team_members || 0}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Bookings/Month</span>
                <span className="font-medium text-gray-900">
                  {plan.limits?.max_bookings_per_month === -1 ? 'Unlimited' : plan.limits?.max_bookings_per_month || 0}
                </span>
              </div>
            </div>

            {/* Features */}
            {plan.features && plan.features.length > 0 && (
              <div className="border-t border-gray-100 pt-4 mb-6">
                <ul className="space-y-2">
                  {plan.features.slice(0, 4).map((feature: string, index: number) => (
                    <li key={index} className="flex items-start gap-2 text-sm">
                      <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <span className="text-gray-600">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Subscriber Count */}
            <div className="text-center text-sm text-gray-500 mb-4">
              {plan.subscriberCount || 0} subscribers
            </div>

            {/* Edit Button */}
            <button
              onClick={() => {
                // TODO: Open edit plan modal
              }}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <Edit2 size={16} />
              Edit Plan
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

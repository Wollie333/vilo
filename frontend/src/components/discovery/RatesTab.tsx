import { Shield, Check } from 'lucide-react'
import type { Room, CancellationPolicy } from '../../services/discoveryApi'
import InteractiveRatesTable from './InteractiveRatesTable'

interface RatesTabProps {
  rooms: Room[]
  cancellationPolicies: CancellationPolicy[]
  whatsIncluded: string[]
  propertySlug: string
  currency?: string
}

export default function RatesTab({
  rooms,
  cancellationPolicies,
  whatsIncluded,
  propertySlug,
  currency = 'ZAR'
}: RatesTabProps) {
  return (
    <div className="space-y-8">
      {/* Interactive Room Rates Table */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Room Rates & Availability</h2>
        <InteractiveRatesTable
          rooms={rooms}
          propertySlug={propertySlug}
          currency={currency}
        />
      </div>

      {/* What's Included */}
      {whatsIncluded.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-3">What's Included</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {whatsIncluded.map((item) => (
              <div key={item} className="flex items-center gap-2 text-gray-700">
                <Check size={16} className="text-emerald-500 flex-shrink-0" />
                <span className="text-sm">{item}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Cancellation Policy */}
      {cancellationPolicies.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Cancellation Policy</h3>
          <div className="bg-gray-50 rounded-xl p-4">
            <div className="space-y-3">
              {cancellationPolicies
                .sort((a, b) => b.days_before - a.days_before)
                .map((policy, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
                      policy.refund_percentage === 100 ? 'bg-emerald-500' :
                      policy.refund_percentage >= 50 ? 'bg-amber-500' : 'bg-red-500'
                    }`} />
                    <div>
                      <div className="font-medium text-gray-800">{policy.label}</div>
                      <div className="text-xs text-gray-500">
                        {policy.refund_percentage}% refund if cancelled {policy.days_before}+ days before check-in
                      </div>
                    </div>
                  </div>
                ))}
            </div>

            <div className="mt-4 pt-4 border-t border-gray-200 flex items-center gap-2 text-sm text-gray-600">
              <Shield size={16} className="text-emerald-500" />
              <span>Your booking is protected by our secure payment system</span>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}

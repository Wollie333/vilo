import { Building2, MapPin, Phone, Mail, Globe, Lightbulb, ArrowRight } from 'lucide-react'

interface IncompleteItem {
  id: string
  label: string
  section: string
}

interface BusinessPreviewPanelProps {
  logoUrl: string
  businessName: string
  businessDescription: string
  city: string
  stateProvince: string
  businessCountry: string
  businessEmail: string
  businessPhone: string
  websiteUrl: string
  incompleteItems: IncompleteItem[]
  onNavigateToSection: (sectionId: string) => void
}

export default function BusinessPreviewPanel({
  logoUrl,
  businessName,
  businessDescription,
  city,
  stateProvince,
  businessCountry,
  businessEmail,
  businessPhone,
  websiteUrl,
  incompleteItems,
  onNavigateToSection
}: BusinessPreviewPanelProps) {
  // Build location string
  const locationParts = [city, stateProvince, businessCountry].filter(Boolean)
  const location = locationParts.join(', ')

  return (
    <div className="hidden xl:block w-80 shrink-0">
      <div className="sticky top-6 space-y-4">
        {/* Business Card Preview */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h3 className="text-sm font-medium text-gray-500 mb-4">Business Card Preview</h3>

          <div className="bg-gradient-to-br from-gray-50 to-white rounded-lg border border-gray-200 p-4">
            {/* Logo & Name */}
            <div className="flex items-start gap-3 mb-3">
              <div className="w-14 h-14 rounded-lg bg-gray-100 flex items-center justify-center overflow-hidden shrink-0">
                {logoUrl ? (
                  <img
                    src={logoUrl}
                    alt="Business logo"
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <Building2 size={24} className="text-gray-400" />
                )}
              </div>
              <div className="min-w-0">
                <h4 className="font-semibold text-gray-900 text-sm truncate">
                  {businessName || 'Your Business Name'}
                </h4>
                {location && (
                  <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                    <MapPin size={10} />
                    <span className="truncate">{location}</span>
                  </p>
                )}
              </div>
            </div>

            {/* Description */}
            {businessDescription && (
              <p className="text-xs text-gray-600 mb-3 line-clamp-2">
                {businessDescription}
              </p>
            )}

            {/* Contact Info */}
            <div className="space-y-1.5 pt-2 border-t border-gray-100">
              {businessEmail && (
                <div className="flex items-center gap-2 text-xs text-gray-600">
                  <Mail size={12} className="text-gray-400 shrink-0" />
                  <span className="truncate">{businessEmail}</span>
                </div>
              )}
              {businessPhone && (
                <div className="flex items-center gap-2 text-xs text-gray-600">
                  <Phone size={12} className="text-gray-400 shrink-0" />
                  <span>{businessPhone}</span>
                </div>
              )}
              {websiteUrl && (
                <div className="flex items-center gap-2 text-xs text-gray-600">
                  <Globe size={12} className="text-gray-400 shrink-0" />
                  <span className="truncate">{websiteUrl.replace(/^https?:\/\//, '')}</span>
                </div>
              )}
            </div>

            {/* Empty state */}
            {!businessEmail && !businessPhone && !websiteUrl && (
              <p className="text-xs text-gray-400 pt-2 border-t border-gray-100">
                Add contact info to display here
              </p>
            )}
          </div>

          <p className="text-xs text-gray-400 mt-3 text-center">
            This appears on your invoices & booking pages
          </p>
        </div>

        {/* Complete Your Profile */}
        {incompleteItems.length > 0 && (
          <div className="bg-amber-50 rounded-xl border border-amber-200 p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center">
                <Lightbulb size={16} className="text-amber-600" />
              </div>
              <h4 className="text-sm font-medium text-amber-900">Complete your profile</h4>
            </div>

            <ul className="space-y-2">
              {incompleteItems.slice(0, 4).map((item) => (
                <li key={item.id}>
                  <button
                    onClick={() => onNavigateToSection(item.section)}
                    className="w-full flex items-center justify-between text-sm text-amber-700 hover:text-amber-900 py-1 transition-colors group"
                  >
                    <span>+ Add {item.label}</span>
                    <ArrowRight
                      size={14}
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                    />
                  </button>
                </li>
              ))}
            </ul>

            {incompleteItems.length > 4 && (
              <p className="text-xs text-amber-600 mt-2">
                +{incompleteItems.length - 4} more to complete
              </p>
            )}
          </div>
        )}

        {/* All Complete Message */}
        {incompleteItems.length === 0 && (
          <div className="bg-emerald-50 rounded-xl border border-emerald-200 p-4 text-center">
            <div className="w-10 h-10 rounded-full bg-emerald-100 mx-auto mb-2 flex items-center justify-center">
              <span className="text-lg">✓</span>
            </div>
            <h4 className="text-sm font-medium text-emerald-900">Profile complete!</h4>
            <p className="text-xs text-emerald-700 mt-1">
              Your business details are all set.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

import { User, Mail, Phone, FileText, Users } from 'lucide-react'

interface GuestInfoStepProps {
  guestName: string
  guestEmail: string
  guestPhone: string
  adults: number
  children: number
  childrenAges: number[]
  notes: string
  onGuestNameChange: (name: string) => void
  onGuestEmailChange: (email: string) => void
  onGuestPhoneChange: (phone: string) => void
  onAdultsChange: (adults: number) => void
  onChildrenChange: (children: number) => void
  onChildrenAgesChange: (ages: number[]) => void
  onNotesChange: (notes: string) => void
}

export default function GuestInfoStep({
  guestName,
  guestEmail,
  guestPhone,
  adults,
  children,
  childrenAges,
  notes,
  onGuestNameChange,
  onGuestEmailChange,
  onGuestPhoneChange,
  onAdultsChange,
  onChildrenChange,
  onChildrenAgesChange,
  onNotesChange,
}: GuestInfoStepProps) {
  // Handle children count change - adjust ages array accordingly
  const handleChildrenChange = (newCount: number) => {
    onChildrenChange(newCount)
    // Adjust ages array to match new count
    if (newCount > childrenAges.length) {
      // Add default ages for new children
      const newAges = [...childrenAges]
      for (let i = childrenAges.length; i < newCount; i++) {
        newAges.push(5) // Default age
      }
      onChildrenAgesChange(newAges)
    } else if (newCount < childrenAges.length) {
      // Remove excess ages
      onChildrenAgesChange(childrenAges.slice(0, newCount))
    }
  }

  // Handle individual child age change
  const handleChildAgeChange = (index: number, age: number) => {
    const newAges = [...childrenAges]
    newAges[index] = age
    onChildrenAgesChange(newAges)
  }
  return (
    <div className="p-6 space-y-6">
      {/* Guest Details */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Guest Details</h3>
        <p className="text-sm text-gray-500 mb-4">
          Enter the primary guest's contact information.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4" />
                Guest Name *
              </div>
            </label>
            <input
              type="text"
              value={guestName}
              onChange={(e) => onGuestNameChange(e.target.value)}
              placeholder="Enter guest's full name"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4" />
                Email Address
              </div>
            </label>
            <input
              type="email"
              value={guestEmail}
              onChange={(e) => onGuestEmailChange(e.target.value)}
              placeholder="guest@example.com"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
            />
            <p className="text-xs text-gray-500 mt-1">Optional - for booking confirmation</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4" />
                Phone Number
              </div>
            </label>
            <input
              type="tel"
              value={guestPhone}
              onChange={(e) => onGuestPhoneChange(e.target.value)}
              placeholder="+27 XX XXX XXXX"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
            />
            <p className="text-xs text-gray-500 mt-1">Optional - for contact purposes</p>
          </div>
        </div>
      </div>

      {/* Number of Guests */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Number of Guests</h3>
        <p className="text-sm text-gray-500 mb-4">
          Specify the number of adults and children for this booking.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                Adults *
              </div>
            </label>
            <select
              value={adults}
              onChange={(e) => onAdultsChange(parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
            >
              {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                <option key={n} value={n}>
                  {n} {n === 1 ? 'Adult' : 'Adults'}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                Children
              </div>
            </label>
            <select
              value={children}
              onChange={(e) => handleChildrenChange(parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
            >
              {[0, 1, 2, 3, 4, 5, 6].map((n) => (
                <option key={n} value={n}>
                  {n} {n === 1 ? 'Child' : 'Children'}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Children Ages */}
        {children > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Children's Ages
            </label>
            <p className="text-xs text-gray-500 mb-3">
              Please specify the age of each child. This helps calculate accurate pricing.
            </p>
            <div className="flex flex-wrap gap-3">
              {Array.from({ length: children }).map((_, index) => (
                <div key={index} className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">Child {index + 1}:</span>
                  <select
                    value={childrenAges[index] ?? 5}
                    onChange={(e) => handleChildAgeChange(index, parseInt(e.target.value))}
                    className="w-20 px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
                  >
                    {Array.from({ length: 18 }).map((_, age) => (
                      <option key={age} value={age}>
                        {age} {age === 1 ? 'year' : 'years'}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Special Requests / Notes */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Special Requests</h3>
        <p className="text-sm text-gray-500 mb-4">
          Add any special requests, notes, or important information about this booking.
        </p>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Notes / Special Requests
            </div>
          </label>
          <textarea
            value={notes}
            onChange={(e) => onNotesChange(e.target.value)}
            rows={4}
            placeholder="Enter any special requests, dietary requirements, arrival time, etc."
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400 resize-none"
          />
          <p className="text-xs text-gray-500 mt-1">Optional - any additional information for this booking</p>
        </div>
      </div>
    </div>
  )
}

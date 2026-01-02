import { User, Mail, FileText } from 'lucide-react'
import GuestSelector from '../GuestSelector'
import PhoneInput from '../PhoneInput'

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
  // Handle guest data change from GuestSelector
  const handleGuestDataChange = (data: { adults: number; children: number; childrenAges: number[] }) => {
    // Only trigger updates if values actually changed
    if (data.adults !== adults) {
      onAdultsChange(data.adults)
    }
    if (data.children !== children) {
      onChildrenChange(data.children)
    }
    if (JSON.stringify(data.childrenAges) !== JSON.stringify(childrenAges)) {
      onChildrenAgesChange(data.childrenAges)
    }
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
              Phone Number
            </label>
            <PhoneInput
              value={guestPhone}
              onChange={onGuestPhoneChange}
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

        <GuestSelector
          value={{
            adults,
            children,
            childrenAges
          }}
          onChange={handleGuestDataChange}
          mode="full"
          showLabels={true}
        />
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

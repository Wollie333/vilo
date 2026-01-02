import { useState } from 'react'
import { User, Mail, MessageSquare, AlertCircle, Phone } from 'lucide-react'
import type { CheckoutState } from '../../pages/discovery/Checkout'
import PhoneInput from '../PhoneInput'
import StepContainer from './StepContainer'

interface GuestDetailsStepProps {
  state: CheckoutState
  updateState: (updates: Partial<CheckoutState>) => void
  onNext: () => void
}

export default function GuestDetailsStep({
  state,
  updateState,
  onNext
}: GuestDetailsStepProps) {
  const [errors, setErrors] = useState<Record<string, string>>({})

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  const validatePhone = (phone: string): boolean => {
    // Phone is required - check for minimum digits (excluding dial code)
    const digits = phone.replace(/\D/g, '')
    return digits.length >= 10 // Dial code + at least 8 digits
  }

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!state.guestName.trim()) {
      newErrors.guestName = 'Full name is required'
    }

    if (!state.guestEmail.trim()) {
      newErrors.guestEmail = 'Email address is required'
    } else if (!validateEmail(state.guestEmail)) {
      newErrors.guestEmail = 'Please enter a valid email address'
    }

    // Phone is now required
    if (!state.guestPhone) {
      newErrors.guestPhone = 'Phone number is required'
    } else if (!validatePhone(state.guestPhone)) {
      newErrors.guestPhone = 'Please enter a valid phone number'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = () => {
    if (validate()) {
      onNext()
    }
  }

  return (
    <StepContainer
      title="Your Details"
      subtitle="Tell us who's staying"
      icon={User}
    >
      {/* Contact Information Card */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-5">Contact Information</h3>

        <div className="space-y-5">
          {/* Full Name */}
          <div>
            <label htmlFor="guestName" className="block text-sm font-medium text-gray-700 mb-1.5">
              Full name <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                id="guestName"
                value={state.guestName}
                onChange={(e) => {
                  updateState({ guestName: e.target.value })
                  if (errors.guestName) setErrors(prev => ({ ...prev, guestName: '' }))
                }}
                placeholder="John Smith"
                className={`
                  w-full pl-12 pr-4 py-3 border rounded-xl text-sm shadow-sm transition-colors
                  focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500
                  ${errors.guestName ? 'border-red-300 bg-red-50' : 'border-gray-200'}
                `}
              />
            </div>
            {errors.guestName && (
              <p className="mt-1.5 text-sm text-red-600 flex items-center gap-1 animate-fade-in">
                <AlertCircle className="w-4 h-4" />
                {errors.guestName}
              </p>
            )}
          </div>

          {/* Email */}
          <div>
            <label htmlFor="guestEmail" className="block text-sm font-medium text-gray-700 mb-1.5">
              Email address <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="email"
                id="guestEmail"
                value={state.guestEmail}
                onChange={(e) => {
                  updateState({ guestEmail: e.target.value })
                  if (errors.guestEmail) setErrors(prev => ({ ...prev, guestEmail: '' }))
                }}
                placeholder="john@example.com"
                className={`
                  w-full pl-12 pr-4 py-3 border rounded-xl text-sm shadow-sm transition-colors
                  focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500
                  ${errors.guestEmail ? 'border-red-300 bg-red-50' : 'border-gray-200'}
                `}
              />
            </div>
            {errors.guestEmail && (
              <p className="mt-1.5 text-sm text-red-600 flex items-center gap-1 animate-fade-in">
                <AlertCircle className="w-4 h-4" />
                {errors.guestEmail}
              </p>
            )}
            <p className="mt-1.5 text-xs text-gray-500">Booking confirmation will be sent to this email</p>
          </div>

          {/* Phone */}
          <div>
            <label htmlFor="guestPhone" className="block text-sm font-medium text-gray-700 mb-1.5">
              Phone number <span className="text-red-500">*</span>
            </label>
            <PhoneInput
              value={state.guestPhone}
              onChange={(value) => {
                updateState({ guestPhone: value })
                if (errors.guestPhone) setErrors(prev => ({ ...prev, guestPhone: '' }))
              }}
              error={!!errors.guestPhone}
            />
            {errors.guestPhone && (
              <p className="mt-1.5 text-sm text-red-600 flex items-center gap-1 animate-fade-in">
                <AlertCircle className="w-4 h-4" />
                {errors.guestPhone}
              </p>
            )}
            <p className="mt-1.5 text-xs text-gray-500">Enter your number without the leading zero</p>
          </div>
        </div>
      </div>

      {/* Special Requests Card */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-center gap-2 mb-4">
          <MessageSquare className="w-5 h-5 text-gray-400" />
          <h3 className="text-lg font-semibold text-gray-900">Special Requests</h3>
          <span className="text-xs text-gray-400">(optional)</span>
        </div>
        <textarea
          id="specialRequests"
          value={state.specialRequests}
          onChange={(e) => updateState({ specialRequests: e.target.value })}
          placeholder="Any special requests or preferences..."
          rows={3}
          className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm shadow-sm resize-none focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500 transition-colors"
        />
        <p className="mt-2 text-xs text-gray-500">
          Special requests cannot be guaranteed but the property will do their best to accommodate
        </p>
      </div>
    </StepContainer>
  )
}

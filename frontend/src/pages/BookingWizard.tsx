import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Check, Save } from 'lucide-react'
import Button from '../components/Button'
import TermsAcceptance from '../components/TermsAcceptance'
import { scrollToTop } from '../components/ScrollToTop'
import RoomDatesStep from '../components/booking-wizard/RoomDatesStep'
import GuestInfoStep from '../components/booking-wizard/GuestInfoStep'
import PaymentConfirmStep, { SelectedAddon } from '../components/booking-wizard/PaymentConfirmStep'
import { bookingsApi, Room } from '../services/api'
import { useNotification } from '../contexts/NotificationContext'

const STEPS = [
  { id: 1, name: 'Room & Dates', description: 'Select room and booking dates' },
  { id: 2, name: 'Guest Info', description: 'Guest details and requests' },
  { id: 3, name: 'Payment & Confirm', description: 'Review pricing and confirm' },
]

interface ValidationWarning {
  type: 'min_stay' | 'max_stay'
  message: string
  roomRule: number
  actualNights: number
}

export interface BookingFormData {
  guest_name: string
  guest_email: string
  guest_phone: string
  adults: number
  children: number
  children_ages: number[]
  room_id: string
  room_name: string
  check_in: string
  check_out: string
  status: 'pending' | 'confirmed' | 'checked_in' | 'checked_out' | 'cancelled' | 'completed'
  payment_status: 'pending' | 'paid' | 'partial' | 'refunded'
  total_amount: number
  currency: string
  notes: string
  override_rules: boolean
}

export default function BookingWizard() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const isEditing = Boolean(id)
  const { showSuccess, showError, showInfo } = useNotification()

  const [currentStep, setCurrentStep] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null)
  const [stepOneValid, setStepOneValid] = useState(false)
  const [validationWarnings, setValidationWarnings] = useState<ValidationWarning[]>([])
  const [selectedAddons, setSelectedAddons] = useState<SelectedAddon[]>([])
  const [termsAccepted, setTermsAccepted] = useState(false)

  const [formData, setFormData] = useState<BookingFormData>({
    guest_name: '',
    guest_email: '',
    guest_phone: '',
    adults: 2,
    children: 0,
    children_ages: [],
    room_id: '',
    room_name: '',
    check_in: '',
    check_out: '',
    status: 'pending',
    payment_status: 'pending',
    total_amount: 0,
    currency: 'ZAR',
    notes: '',
    override_rules: false,
  })

  // Load booking data if editing
  useEffect(() => {
    if (id) {
      loadBooking(id)
    }
  }, [id])

  const loadBooking = async (bookingId: string) => {
    try {
      setIsLoading(true)
      const booking = await bookingsApi.getById(bookingId)

      // Parse notes to get adults/children if available
      let parsedNotes: any = {}
      let notesText = booking.notes || ''
      try {
        parsedNotes = booking.notes ? JSON.parse(booking.notes) : {}
        notesText = parsedNotes.special_requests || ''
      } catch {
        // Notes is plain text
      }

      setFormData({
        guest_name: booking.guest_name,
        guest_email: booking.guest_email || '',
        guest_phone: booking.guest_phone || '',
        adults: parsedNotes.adults || parsedNotes.guests || 2,
        children: parsedNotes.children || 0,
        children_ages: parsedNotes.children_ages || [],
        room_id: booking.room_id,
        room_name: booking.room_name || '',
        check_in: booking.check_in,
        check_out: booking.check_out,
        status: booking.status,
        payment_status: booking.payment_status,
        total_amount: booking.total_amount,
        currency: booking.currency,
        notes: notesText,
        override_rules: false,
      })
      // Mark step one as valid since we're editing an existing booking
      setStepOneValid(true)
    } catch (error) {
      console.error('Failed to load booking:', error)
      showError('Failed to Load', 'Could not load booking data.')
      navigate('/dashboard/bookings')
    } finally {
      setIsLoading(false)
    }
  }

  const updateFormData = (updates: Partial<BookingFormData>) => {
    setFormData((prev) => ({ ...prev, ...updates }))
  }

  const handleRoomChange = (roomId: string, roomName: string, room: Room | null) => {
    setSelectedRoom(room)
    updateFormData({
      room_id: roomId,
      room_name: roomName,
      currency: room?.currency || 'ZAR',
    })
  }

  const handleValidationChange = (isValid: boolean, warnings: ValidationWarning[]) => {
    setStepOneValid(isValid)
    setValidationWarnings(warnings)
  }

  const handleOverrideChange = (override: boolean) => {
    updateFormData({ override_rules: override })
    if (override && validationWarnings.length > 0) {
      showInfo('Rules Overridden', 'You are proceeding with non-standard booking settings.')
    }
  }

  const handleNext = () => {
    if (currentStep < STEPS.length) {
      setCurrentStep((prev) => prev + 1)
      scrollToTop()
    }
  }

  const handleBack = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1))
    scrollToTop()
  }

  const handleFinish = async () => {
    try {
      setIsSaving(true)

      // Build notes JSON with guests, add-ons and special requests
      const notesData: any = {
        guests: formData.adults + formData.children,
        adults: formData.adults,
        children: formData.children,
        children_ages: formData.children_ages,
      }
      if (formData.notes) {
        notesData.special_requests = formData.notes
      }
      if (selectedAddons.length > 0) {
        notesData.addons = selectedAddons.map(a => ({
          id: a.id,
          name: a.name,
          quantity: a.quantity,
          price: a.price,
          total: a.total,
        }))
      }

      const bookingData = {
        guest_name: formData.guest_name,
        guest_email: formData.guest_email || undefined,
        guest_phone: formData.guest_phone || undefined,
        room_id: formData.room_id,
        room_name: formData.room_name,
        check_in: formData.check_in,
        check_out: formData.check_out,
        status: formData.status,
        payment_status: formData.payment_status,
        total_amount: formData.total_amount,
        currency: formData.currency,
        notes: JSON.stringify(notesData),
      }

      if (isEditing && id) {
        await bookingsApi.update(id, bookingData)
        showSuccess('Booking Updated', `Booking for ${formData.guest_name} has been updated.`)
      } else {
        await bookingsApi.create(bookingData)
        showSuccess('Booking Created', `Booking for ${formData.guest_name} has been created.`)
      }

      navigate('/dashboard/bookings')
    } catch (error) {
      console.error('Failed to save booking:', error)
      showError('Save Failed', 'Could not save the booking. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancel = () => {
    navigate('/dashboard/bookings')
  }

  const canProceed = () => {
    if (currentStep === 1) {
      return stepOneValid
    }
    if (currentStep === 2) {
      return formData.guest_name.trim() !== ''
    }
    if (currentStep === 3) {
      return formData.total_amount >= 0 && termsAccepted
    }
    return true
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-gray-500">Loading booking...</div>
      </div>
    )
  }

  return (
    <div className="bg-gray-50 min-h-full">
      {/* Header */}
      <div className="bg-gradient-to-r from-accent-600 to-accent-500 shadow-lg">
        <div className="max-w-5xl mx-auto px-6 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={handleCancel}
                className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
              >
                <ArrowLeft size={20} />
              </button>
              <div>
                <h1 className="text-xl font-bold text-white">
                  {isEditing ? 'Edit Booking' : 'Create New Booking'}
                </h1>
                <p className="text-sm text-white/70">
                  {formData.guest_name ? `Guest: ${formData.guest_name}` : 'Fill in the booking details'}
                </p>
              </div>
            </div>
            <button
              onClick={handleCancel}
              className="px-4 py-2 text-sm font-medium text-white border border-white/30 rounded-lg hover:bg-white/10 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>

      {/* Steps indicator */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-6 py-4">
          <nav aria-label="Progress">
            <ol className="flex items-center">
              {STEPS.map((step, index) => (
                <li
                  key={step.id}
                  className={`relative ${index !== STEPS.length - 1 ? 'flex-1' : ''}`}
                >
                  <div className="flex items-center">
                    <div
                      className={`flex items-center justify-center w-10 h-10 rounded-full border-2 transition-colors ${
                        currentStep > step.id
                          ? 'bg-black border-black text-white'
                          : currentStep === step.id
                          ? 'border-black text-black'
                          : 'border-gray-300 text-gray-400'
                      }`}
                    >
                      {currentStep > step.id ? (
                        <Check size={18} />
                      ) : (
                        <span className="text-sm font-medium">{step.id}</span>
                      )}
                    </div>
                    <div className="ml-3">
                      <p
                        className={`text-sm font-medium ${
                          currentStep >= step.id ? 'text-gray-900' : 'text-gray-400'
                        }`}
                      >
                        {step.name}
                      </p>
                      <p className="text-xs text-gray-500 hidden sm:block">{step.description}</p>
                    </div>
                    {index !== STEPS.length - 1 && (
                      <div
                        className={`hidden sm:block flex-1 h-0.5 mx-6 ${
                          currentStep > step.id ? 'bg-black' : 'bg-gray-200'
                        }`}
                      />
                    )}
                  </div>
                </li>
              ))}
            </ol>
          </nav>
        </div>
      </div>

      {/* Step Content */}
      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
          {currentStep === 1 && (
            <RoomDatesStep
              roomId={formData.room_id}
              roomName={formData.room_name}
              checkIn={formData.check_in}
              checkOut={formData.check_out}
              overrideRules={formData.override_rules}
              onRoomChange={handleRoomChange}
              onCheckInChange={(date) => updateFormData({ check_in: date })}
              onCheckOutChange={(date) => updateFormData({ check_out: date })}
              onOverrideChange={handleOverrideChange}
              onValidationChange={handleValidationChange}
            />
          )}
          {currentStep === 2 && (
            <GuestInfoStep
              guestName={formData.guest_name}
              guestEmail={formData.guest_email}
              guestPhone={formData.guest_phone}
              adults={formData.adults}
              children={formData.children}
              childrenAges={formData.children_ages}
              notes={formData.notes}
              onGuestNameChange={(name) => updateFormData({ guest_name: name })}
              onGuestEmailChange={(email) => updateFormData({ guest_email: email })}
              onGuestPhoneChange={(phone) => updateFormData({ guest_phone: phone })}
              onAdultsChange={(adults) => updateFormData({ adults })}
              onChildrenChange={(children) => updateFormData({ children })}
              onChildrenAgesChange={(children_ages) => updateFormData({ children_ages })}
              onNotesChange={(notes) => updateFormData({ notes: notes })}
            />
          )}
          {currentStep === 3 && (
            <PaymentConfirmStep
              roomId={formData.room_id}
              roomName={formData.room_name}
              selectedRoom={selectedRoom}
              checkIn={formData.check_in}
              checkOut={formData.check_out}
              guestName={formData.guest_name}
              guestEmail={formData.guest_email}
              guestPhone={formData.guest_phone}
              notes={formData.notes}
              status={formData.status}
              paymentStatus={formData.payment_status}
              totalAmount={formData.total_amount}
              currency={formData.currency}
              overrideRules={formData.override_rules}
              selectedAddons={selectedAddons}
              onStatusChange={(status) => updateFormData({ status })}
              onPaymentStatusChange={(status) => updateFormData({ payment_status: status })}
              onTotalAmountChange={(amount) => updateFormData({ total_amount: amount })}
              onCurrencyChange={(currency) => updateFormData({ currency })}
              onAddonsChange={setSelectedAddons}
            />
          )}
        </div>

        {/* Terms Acceptance - Step 3 only */}
        {currentStep === 3 && (
          <div className="mt-6">
            <TermsAcceptance
              accepted={termsAccepted}
              onChange={setTermsAccepted}
            />
          </div>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between mt-6">
          <div>
            {currentStep > 1 && (
              <Button variant="outline" onClick={handleBack}>
                <ArrowLeft size={16} className="mr-2" />
                Back
              </Button>
            )}
          </div>
          <div className="flex items-center gap-3">
            {currentStep < STEPS.length ? (
              <Button onClick={handleNext} disabled={!canProceed()}>
                Next
                <ArrowRight size={16} className="ml-2" />
              </Button>
            ) : (
              <Button onClick={handleFinish} disabled={!canProceed() || isSaving}>
                {isSaving ? 'Saving...' : (
                  <>
                    <Save size={16} className="mr-2" />
                    {isEditing ? 'Update Booking' : 'Create Booking'}
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

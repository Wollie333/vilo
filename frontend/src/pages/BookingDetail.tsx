import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  Calendar,
  User,
  Mail,
  Phone,
  BedDouble,
  CreditCard,
  Clock,
  Edit,
  Save,
  X,
  Send,
  CheckCircle,
  AlertCircle,
  Loader2,
  FileText,
  Users,
  Package,
  StickyNote,
  Upload,
  File,
  Trash2,
  Download,
} from 'lucide-react'
import Button from '../components/Button'
import { bookingsApi, Booking, roomsApi, Room, ProofOfPayment } from '../services/api'
import { useNotification } from '../contexts/NotificationContext'

const statusOptions = [
  { value: 'pending', label: 'Pending', color: 'bg-yellow-100 text-yellow-700' },
  { value: 'confirmed', label: 'Confirmed', color: 'bg-green-100 text-green-700' },
  { value: 'checked_in', label: 'Checked In', color: 'bg-blue-100 text-blue-700' },
  { value: 'checked_out', label: 'Checked Out', color: 'bg-purple-100 text-purple-700' },
  { value: 'cancelled', label: 'Cancelled', color: 'bg-red-100 text-red-700' },
  { value: 'completed', label: 'Completed', color: 'bg-gray-100 text-gray-700' },
]

const paymentStatusOptions = [
  { value: 'pending', label: 'Pending', color: 'bg-gray-100 text-gray-700' },
  { value: 'paid', label: 'Paid', color: 'bg-green-100 text-green-700' },
  { value: 'partial', label: 'Partial', color: 'bg-blue-100 text-blue-700' },
  { value: 'refunded', label: 'Refunded', color: 'bg-red-100 text-red-700' },
]

interface BookingNotes {
  guests?: number
  addons?: Array<{
    id: string
    name: string
    quantity: number
    price: number
    total: number
  }>
  special_requests?: string
  booking_reference?: string
  booked_online?: boolean
}

export default function BookingDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { showSuccess, showError } = useNotification()

  const [booking, setBooking] = useState<Booking | null>(null)
  const [room, setRoom] = useState<Room | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [sendingEmail, setSendingEmail] = useState(false)

  // Editable fields
  const [editForm, setEditForm] = useState({
    guest_name: '',
    guest_email: '',
    guest_phone: '',
    check_in: '',
    check_out: '',
    status: 'pending' as Booking['status'],
    payment_status: 'pending' as Booking['payment_status'],
    total_amount: 0,
    notes: '',
    internal_notes: '',
  })

  // Proof of payment
  const [proofOfPayment, setProofOfPayment] = useState<ProofOfPayment | null>(null)
  const [uploadingProof, setUploadingProof] = useState(false)
  const proofInputRef = useRef<HTMLInputElement>(null)

  // Parsed notes
  const [bookingNotes, setBookingNotes] = useState<BookingNotes>({})

  useEffect(() => {
    if (id) {
      loadBooking(id)
    }
  }, [id])

  const loadBooking = async (bookingId: string) => {
    try {
      setLoading(true)
      const data = await bookingsApi.getById(bookingId)
      setBooking(data)

      // Parse notes if JSON
      try {
        const notes = data.notes ? JSON.parse(data.notes) : {}
        setBookingNotes(notes)
      } catch {
        setBookingNotes({ special_requests: data.notes || '' })
      }

      // Initialize edit form
      setEditForm({
        guest_name: data.guest_name || '',
        guest_email: data.guest_email || '',
        guest_phone: data.guest_phone || '',
        check_in: data.check_in || '',
        check_out: data.check_out || '',
        status: data.status,
        payment_status: data.payment_status,
        total_amount: data.total_amount,
        notes: data.notes || '',
        internal_notes: data.internal_notes || '',
      })

      // Set proof of payment
      setProofOfPayment(data.proof_of_payment || null)

      // Load room details if available
      if (data.room_id) {
        try {
          const roomData = await roomsApi.getById(data.room_id)
          setRoom(roomData)
        } catch {
          // Room might not exist or be accessible
        }
      }
    } catch (error) {
      console.error('Failed to load booking:', error)
      showError('Error', 'Failed to load booking details')
      navigate('/dashboard/bookings')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!booking?.id) return

    try {
      setSaving(true)
      await bookingsApi.update(booking.id, {
        guest_name: editForm.guest_name,
        guest_email: editForm.guest_email,
        guest_phone: editForm.guest_phone,
        check_in: editForm.check_in,
        check_out: editForm.check_out,
        status: editForm.status,
        payment_status: editForm.payment_status,
        total_amount: editForm.total_amount,
        internal_notes: editForm.internal_notes,
      })

      showSuccess('Booking Updated', 'The booking has been successfully updated.')
      setIsEditing(false)
      await loadBooking(booking.id)
    } catch (error) {
      console.error('Failed to update booking:', error)
      showError('Update Failed', 'Could not update the booking. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const handleProofUpload = async (file: File) => {
    if (!booking?.id) return

    // Validate file type
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'application/pdf']
    if (!allowedTypes.includes(file.type)) {
      showError('Invalid File', 'Please upload a PNG, JPEG, or PDF file.')
      return
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      showError('File Too Large', 'File size must be less than 10MB.')
      return
    }

    setUploadingProof(true)

    try {
      // Convert file to base64
      const reader = new FileReader()
      reader.onload = async () => {
        const proof: ProofOfPayment = {
          url: reader.result as string,
          path: `proof/${Date.now()}-${file.name}`,
          filename: file.name,
          uploaded_at: new Date().toISOString(),
        }

        await bookingsApi.update(booking.id!, { proof_of_payment: proof } as any)
        setProofOfPayment(proof)
        showSuccess('Proof Uploaded', 'Proof of payment has been uploaded successfully.')
        setUploadingProof(false)
      }
      reader.readAsDataURL(file)
    } catch (error) {
      console.error('Failed to upload proof:', error)
      showError('Upload Failed', 'Could not upload proof of payment.')
      setUploadingProof(false)
    }
  }

  const handleRemoveProof = async () => {
    if (!booking?.id) return

    try {
      await bookingsApi.update(booking.id, { proof_of_payment: null } as any)
      setProofOfPayment(null)
      showSuccess('Proof Removed', 'Proof of payment has been removed.')
    } catch (error) {
      console.error('Failed to remove proof:', error)
      showError('Error', 'Could not remove proof of payment.')
    }
  }

  const handleSaveInternalNotes = async () => {
    if (!booking?.id) return

    try {
      await bookingsApi.update(booking.id, { internal_notes: editForm.internal_notes })
      showSuccess('Notes Saved', 'Internal notes have been saved.')
    } catch (error) {
      console.error('Failed to save notes:', error)
      showError('Error', 'Could not save internal notes.')
    }
  }

  const handleSendConfirmation = async () => {
    if (!booking?.guest_email) {
      showError('No Email', 'This booking does not have an email address.')
      return
    }

    setSendingEmail(true)

    // Simulate sending email (in production, this would call an API endpoint)
    await new Promise((resolve) => setTimeout(resolve, 1500))

    showSuccess(
      'Email Sent',
      `Booking confirmation sent to ${booking.guest_email}`
    )
    setSendingEmail(false)
  }

  const handleSendUpdate = async () => {
    if (!booking?.guest_email) {
      showError('No Email', 'This booking does not have an email address.')
      return
    }

    setSendingEmail(true)

    // Simulate sending email
    await new Promise((resolve) => setTimeout(resolve, 1500))

    showSuccess(
      'Update Sent',
      `Booking update notification sent to ${booking.guest_email}`
    )
    setSendingEmail(false)
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleDateString('en-ZA', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
  }

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: currency || 'ZAR',
    }).format(amount)
  }

  const calculateNights = () => {
    if (!booking?.check_in || !booking?.check_out) return 0
    const checkIn = new Date(booking.check_in)
    const checkOut = new Date(booking.check_out)
    return Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24))
  }

  const getStatusColor = (status: string) => {
    return statusOptions.find((s) => s.value === status)?.color || 'bg-gray-100 text-gray-700'
  }

  const getPaymentStatusColor = (status: string) => {
    return paymentStatusOptions.find((s) => s.value === status)?.color || 'bg-gray-100 text-gray-700'
  }

  if (loading) {
    return (
      <div className="p-8 bg-white min-h-full flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-gray-400" />
          <p className="text-gray-600">Loading booking details...</p>
        </div>
      </div>
    )
  }

  if (!booking) {
    return (
      <div className="p-8 bg-white min-h-full flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 mx-auto mb-4 text-red-500" />
          <h2 className="text-xl font-semibold mb-2">Booking Not Found</h2>
          <p className="text-gray-600 mb-4">The booking you're looking for doesn't exist.</p>
          <Button onClick={() => navigate('/dashboard/bookings')}>
            <ArrowLeft size={16} className="mr-2" />
            Back to Bookings
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8 bg-gray-50 min-h-full">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => navigate('/dashboard/bookings')}
          className="flex items-center text-gray-600 hover:text-gray-900 mb-4 transition-colors"
        >
          <ArrowLeft size={18} className="mr-2" />
          Back to Bookings
        </button>

        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-1">
              Booking Details
            </h1>
            {bookingNotes.booking_reference && (
              <p className="text-gray-500">
                Reference: <span className="font-mono font-medium">{bookingNotes.booking_reference}</span>
              </p>
            )}
          </div>
          <div className="flex items-center gap-3">
            {!isEditing ? (
              <>
                <Button variant="outline" onClick={() => setIsEditing(true)}>
                  <Edit size={16} className="mr-2" />
                  Edit Booking
                </Button>
                <Button
                  variant="outline"
                  onClick={handleSendConfirmation}
                  disabled={sendingEmail}
                >
                  {sendingEmail ? (
                    <Loader2 size={16} className="mr-2 animate-spin" />
                  ) : (
                    <Send size={16} className="mr-2" />
                  )}
                  Send Confirmation
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" onClick={() => setIsEditing(false)}>
                  <X size={16} className="mr-2" />
                  Cancel
                </Button>
                <Button onClick={handleSave} disabled={saving}>
                  {saving ? (
                    <Loader2 size={16} className="mr-2 animate-spin" />
                  ) : (
                    <Save size={16} className="mr-2" />
                  )}
                  Save Changes
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Guest Information */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <User size={20} />
              Guest Information
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Full Name</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={editForm.guest_name}
                    onChange={(e) => setEditForm({ ...editForm, guest_name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-black focus:border-transparent"
                  />
                ) : (
                  <p className="text-gray-900 font-medium">{booking.guest_name}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Email</label>
                {isEditing ? (
                  <input
                    type="email"
                    value={editForm.guest_email}
                    onChange={(e) => setEditForm({ ...editForm, guest_email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-black focus:border-transparent"
                  />
                ) : (
                  <div className="flex items-center gap-2">
                    <Mail size={16} className="text-gray-400" />
                    <a href={`mailto:${booking.guest_email}`} className="text-blue-600 hover:underline">
                      {booking.guest_email || 'Not provided'}
                    </a>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Phone</label>
                {isEditing ? (
                  <input
                    type="tel"
                    value={editForm.guest_phone}
                    onChange={(e) => setEditForm({ ...editForm, guest_phone: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-black focus:border-transparent"
                  />
                ) : (
                  <div className="flex items-center gap-2">
                    <Phone size={16} className="text-gray-400" />
                    {booking.guest_phone ? (
                      <a href={`tel:${booking.guest_phone}`} className="text-blue-600 hover:underline">
                        {booking.guest_phone}
                      </a>
                    ) : (
                      <span className="text-gray-500">Not provided</span>
                    )}
                  </div>
                )}
              </div>

              {bookingNotes.guests && (
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Number of Guests</label>
                  <div className="flex items-center gap-2">
                    <Users size={16} className="text-gray-400" />
                    <span className="text-gray-900">{bookingNotes.guests}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Stay Details */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Calendar size={20} />
              Stay Details
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Check-in</label>
                {isEditing ? (
                  <input
                    type="date"
                    value={editForm.check_in}
                    onChange={(e) => setEditForm({ ...editForm, check_in: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-black focus:border-transparent"
                  />
                ) : (
                  <div>
                    <p className="text-gray-900 font-medium">{formatDate(booking.check_in)}</p>
                    <p className="text-sm text-gray-500">From 14:00</p>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Check-out</label>
                {isEditing ? (
                  <input
                    type="date"
                    value={editForm.check_out}
                    onChange={(e) => setEditForm({ ...editForm, check_out: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-black focus:border-transparent"
                  />
                ) : (
                  <div>
                    <p className="text-gray-900 font-medium">{formatDate(booking.check_out)}</p>
                    <p className="text-sm text-gray-500">Until 10:00</p>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Duration</label>
                <div className="flex items-center gap-2">
                  <Clock size={16} className="text-gray-400" />
                  <span className="text-gray-900 font-medium">
                    {calculateNights()} {calculateNights() === 1 ? 'night' : 'nights'}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Room</label>
                <div className="flex items-center gap-2">
                  <BedDouble size={16} className="text-gray-400" />
                  <span className="text-gray-900 font-medium">
                    {booking.room_name || booking.room_id}
                  </span>
                </div>
                {room && (
                  <p className="text-sm text-gray-500 mt-1">
                    {room.bed_count}x {room.bed_type} · Max {room.max_guests} guests
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Add-ons (if any) */}
          {bookingNotes.addons && bookingNotes.addons.length > 0 && (
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Package size={20} />
                Add-ons & Extras
              </h2>

              <div className="space-y-3">
                {bookingNotes.addons.map((addon, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0"
                  >
                    <div>
                      <p className="font-medium text-gray-900">{addon.name}</p>
                      <p className="text-sm text-gray-500">Qty: {addon.quantity}</p>
                    </div>
                    <p className="font-medium text-gray-900">
                      {formatCurrency(addon.total, booking.currency)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Special Requests */}
          {bookingNotes.special_requests && (
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <FileText size={20} />
                Special Requests
              </h2>
              <p className="text-gray-700 whitespace-pre-wrap">{bookingNotes.special_requests}</p>
            </div>
          )}

          {/* Internal Notes */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <StickyNote size={20} />
              Internal Notes
            </h2>
            <p className="text-sm text-gray-500 mb-3">
              Private notes for staff only. Not visible to guests.
            </p>
            <textarea
              value={editForm.internal_notes}
              onChange={(e) => setEditForm({ ...editForm, internal_notes: e.target.value })}
              placeholder="Add internal notes about this booking..."
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-black focus:border-transparent resize-none"
            />
            <div className="mt-3 flex justify-end">
              <button
                onClick={handleSaveInternalNotes}
                className="px-4 py-2 bg-gray-900 text-white text-sm rounded-md hover:bg-gray-800 transition-colors"
              >
                Save Notes
              </button>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Status Card */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Status</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-2">Booking Status</label>
                {isEditing ? (
                  <select
                    value={editForm.status}
                    onChange={(e) =>
                      setEditForm({ ...editForm, status: e.target.value as Booking['status'] })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-black focus:border-transparent"
                  >
                    {statusOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                ) : (
                  <span className={`inline-flex px-3 py-1 text-sm font-medium rounded-full ${getStatusColor(booking.status)}`}>
                    {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                  </span>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-500 mb-2">Payment Status</label>
                {isEditing ? (
                  <select
                    value={editForm.payment_status}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        payment_status: e.target.value as Booking['payment_status'],
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-black focus:border-transparent"
                  >
                    {paymentStatusOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                ) : (
                  <span className={`inline-flex px-3 py-1 text-sm font-medium rounded-full ${getPaymentStatusColor(booking.payment_status)}`}>
                    {booking.payment_status.charAt(0).toUpperCase() + booking.payment_status.slice(1)}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Proof of Payment */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Upload size={20} />
              Proof of Payment
            </h2>

            {proofOfPayment ? (
              <div className="border border-gray-200 rounded-lg p-3">
                <div className="flex items-start gap-3">
                  {proofOfPayment.url.startsWith('data:image') ? (
                    <img
                      src={proofOfPayment.url}
                      alt="Proof of payment"
                      className="w-12 h-12 object-cover rounded-lg border"
                    />
                  ) : (
                    <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <File className="w-6 h-6 text-red-600" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 text-sm truncate">{proofOfPayment.filename}</p>
                    <p className="text-xs text-gray-500">
                      {new Date(proofOfPayment.uploaded_at).toLocaleDateString('en-ZA', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-3">
                  <a
                    href={proofOfPayment.url}
                    download={proofOfPayment.filename}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
                  >
                    <Download size={14} />
                    Download
                  </a>
                  <button
                    onClick={handleRemoveProof}
                    className="px-3 py-2 text-sm text-red-600 border border-red-200 rounded-md hover:bg-red-50 transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ) : (
              <div
                onClick={() => proofInputRef.current?.click()}
                className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors ${
                  uploadingProof ? 'bg-gray-50 border-gray-300' : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                {uploadingProof ? (
                  <div className="flex flex-col items-center">
                    <Loader2 className="w-6 h-6 animate-spin text-gray-400 mb-2" />
                    <p className="text-sm text-gray-600">Uploading...</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center">
                    <Upload className="w-6 h-6 text-gray-400 mb-2" />
                    <p className="text-sm text-gray-600 font-medium">Upload proof</p>
                    <p className="text-xs text-gray-500 mt-1">PDF, PNG, JPEG</p>
                  </div>
                )}
              </div>
            )}
            <input
              ref={proofInputRef}
              type="file"
              accept=".pdf,.png,.jpg,.jpeg,image/png,image/jpeg,application/pdf"
              className="hidden"
              onChange={(e) => {
                if (e.target.files?.[0]) {
                  handleProofUpload(e.target.files[0])
                }
              }}
            />
          </div>

          {/* Payment Summary */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <CreditCard size={20} />
              Payment
            </h2>

            <div className="space-y-3">
              {room && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">
                    Room ({calculateNights()} nights)
                  </span>
                  <span className="text-gray-900">
                    {formatCurrency(room.base_price_per_night * calculateNights(), booking.currency)}
                  </span>
                </div>
              )}

              {bookingNotes.addons && bookingNotes.addons.length > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Add-ons</span>
                  <span className="text-gray-900">
                    {formatCurrency(
                      bookingNotes.addons.reduce((sum, a) => sum + a.total, 0),
                      booking.currency
                    )}
                  </span>
                </div>
              )}

              <div className="border-t pt-3 mt-3">
                <div className="flex justify-between">
                  <span className="font-semibold text-gray-900">Total</span>
                  {isEditing ? (
                    <input
                      type="number"
                      value={editForm.total_amount}
                      onChange={(e) =>
                        setEditForm({ ...editForm, total_amount: parseFloat(e.target.value) || 0 })
                      }
                      className="w-32 px-2 py-1 text-right border border-gray-300 rounded-md focus:ring-2 focus:ring-black focus:border-transparent"
                    />
                  ) : (
                    <span className="text-xl font-bold text-gray-900">
                      {formatCurrency(booking.total_amount, booking.currency)}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>

            <div className="space-y-3">
              <button
                onClick={handleSendConfirmation}
                disabled={sendingEmail || !booking.guest_email}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {sendingEmail ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <CheckCircle size={16} />
                )}
                Send Confirmation
              </button>

              <button
                onClick={handleSendUpdate}
                disabled={sendingEmail || !booking.guest_email}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {sendingEmail ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Send size={16} />
                )}
                Send Update Notification
              </button>

              {booking.status === 'pending' && (
                <button
                  onClick={async () => {
                    try {
                      await bookingsApi.update(booking.id!, { status: 'confirmed' })
                      showSuccess('Booking Confirmed', 'The booking has been confirmed.')
                      loadBooking(booking.id!)
                    } catch {
                      showError('Error', 'Failed to confirm booking')
                    }
                  }}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-green-600 text-green-600 rounded-md hover:bg-green-50 transition-colors"
                >
                  <CheckCircle size={16} />
                  Mark as Confirmed
                </button>
              )}

              {booking.status === 'confirmed' && (
                <button
                  onClick={async () => {
                    try {
                      await bookingsApi.update(booking.id!, { status: 'checked_in' })
                      showSuccess('Guest Checked In', 'The guest has been checked in.')
                      loadBooking(booking.id!)
                    } catch {
                      showError('Error', 'Failed to check in guest')
                    }
                  }}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  <CheckCircle size={16} />
                  Check In Guest
                </button>
              )}

              {booking.status === 'checked_in' && (
                <button
                  onClick={async () => {
                    try {
                      await bookingsApi.update(booking.id!, { status: 'checked_out' })
                      showSuccess('Guest Checked Out', 'The guest has been checked out.')
                      loadBooking(booking.id!)
                    } catch {
                      showError('Error', 'Failed to check out guest')
                    }
                  }}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors"
                >
                  <CheckCircle size={16} />
                  Check Out Guest
                </button>
              )}

              {booking.payment_status === 'pending' && (
                <button
                  onClick={async () => {
                    try {
                      await bookingsApi.update(booking.id!, { payment_status: 'paid' })
                      showSuccess('Payment Recorded', 'The payment has been marked as paid.')
                      loadBooking(booking.id!)
                    } catch {
                      showError('Error', 'Failed to update payment status')
                    }
                  }}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-blue-600 text-blue-600 rounded-md hover:bg-blue-50 transition-colors"
                >
                  <CreditCard size={16} />
                  Mark as Paid
                </button>
              )}
            </div>
          </div>

          {/* Booking Meta */}
          <div className="bg-gray-100 rounded-lg p-4 text-sm text-gray-600">
            <p>
              <strong>Booking ID:</strong> {booking.id}
            </p>
            {bookingNotes.booked_online && (
              <p className="mt-1">
                <strong>Source:</strong> Online Booking
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

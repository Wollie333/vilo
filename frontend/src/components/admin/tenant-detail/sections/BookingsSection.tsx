import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Calendar, Search, Filter, Plus, Pencil, Home } from 'lucide-react'
import type { TenantBooking } from '../types'

interface BookingsSectionProps {
  tenantId: string
  bookings: TenantBooking[]
}

const statusColors: Record<string, string> = {
  confirmed: 'bg-green-100 text-green-700',
  pending: 'bg-amber-100 text-amber-700',
  cancelled: 'bg-red-100 text-red-700',
  completed: 'bg-blue-100 text-blue-700',
  checked_in: 'bg-purple-100 text-purple-700',
  no_show: 'bg-gray-100 text-gray-600',
}

export default function BookingsSection({ tenantId, bookings }: BookingsSectionProps) {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  // Debug: Log bookings data
  useEffect(() => {
    console.log('BookingsSection received:', bookings.length, 'bookings')
    if (bookings.length > 0) {
      console.log('First booking:', JSON.stringify(bookings[0], null, 2))
      console.log('Room images:', bookings.map(b => `${b.id.slice(0,8)}: ${b.room_image || 'NULL'}`))
    }
  }, [bookings])

  const formatDate = (dateString: string) => {
    if (!dateString) return '-'
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR',
      minimumFractionDigits: 0
    }).format(amount)
  }

  const filteredBookings = bookings.filter(booking => {
    const matchesSearch = search === '' ||
      booking.customer_name?.toLowerCase().includes(search.toLowerCase()) ||
      booking.room_name?.toLowerCase().includes(search.toLowerCase()) ||
      booking.id.toLowerCase().includes(search.toLowerCase())

    const matchesStatus = statusFilter === 'all' || booking.status === statusFilter

    return matchesSearch && matchesStatus
  })

  const uniqueStatuses = [...new Set(bookings.map(b => b.status))]

  const handleAddBooking = () => {
    navigate(`/admin/tenants/${tenantId}/bookings/new`)
  }

  const handleEditBooking = (bookingId: string) => {
    navigate(`/admin/tenants/${tenantId}/bookings/${bookingId}/edit`)
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Bookings</h2>
          <p className="text-sm text-gray-500">{bookings.length} booking{bookings.length !== 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={handleAddBooking}
          className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-white bg-accent-600 rounded-lg hover:bg-accent-700"
        >
          <Plus size={16} />
          Add Booking
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by guest name, room, or ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-accent-500"
          />
        </div>
        <div className="relative">
          <Filter size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="pl-9 pr-8 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-accent-500 appearance-none bg-white"
          >
            <option value="all">All Status</option>
            {uniqueStatuses.map(status => (
              <option key={status} value={status}>{status.replace('_', ' ')}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Empty State */}
      {filteredBookings.length === 0 && (
        <div className="py-12 text-center bg-gray-50 rounded-lg">
          <Calendar size={32} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500">
            {bookings.length === 0 ? 'No bookings yet' : 'No bookings match your search'}
          </p>
          {bookings.length === 0 && (
            <button
              onClick={handleAddBooking}
              className="mt-3 text-sm text-accent-600 hover:text-accent-700 font-medium"
            >
              Create first booking
            </button>
          )}
        </div>
      )}

      {/* Bookings List */}
      {filteredBookings.length > 0 && (
        <div className="space-y-2">
          {filteredBookings.map((booking) => (
            <div
              key={booking.id}
              onClick={() => handleEditBooking(booking.id)}
              className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer group"
            >
              {/* Room Thumbnail */}
              <div className="w-16 h-16 rounded-lg overflow-hidden shrink-0 bg-gray-200">
                {booking.room_image ? (
                  <img
                    src={booking.room_image}
                    alt={booking.room_name || 'Room'}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Home size={24} className="text-gray-400" />
                  </div>
                )}
              </div>

              {/* Booking Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-medium text-gray-900">
                    {booking.customer_name || 'Guest'}
                  </p>
                  <span className={`px-2 py-0.5 text-xs font-medium rounded-full capitalize ${statusColors[booking.status] || 'bg-gray-100 text-gray-600'}`}>
                    {booking.status.replace('_', ' ')}
                  </span>
                </div>
                {booking.room_name && (
                  <p className="text-xs text-gray-600 mt-0.5">{booking.room_name}</p>
                )}
                <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
                  {booking.check_in && booking.check_out ? (
                    <span>{formatDate(booking.check_in)} → {formatDate(booking.check_out)}</span>
                  ) : (
                    <span>Created: {formatDate(booking.created_at)}</span>
                  )}
                </div>
              </div>

              {/* Amount & Edit */}
              <div className="text-right shrink-0 flex items-center gap-3">
                <div>
                  <p className="text-sm font-semibold text-gray-900">
                    {formatCurrency(booking.total_amount)}
                  </p>
                  <p className="text-xs text-gray-400 font-mono">
                    {booking.id.slice(0, 8)}...
                  </p>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleEditBooking(booking.id)
                  }}
                  className="p-2 text-gray-400 hover:text-accent-600 opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Edit booking"
                >
                  <Pencil size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

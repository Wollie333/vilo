import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, Pencil, Check, Copy, XCircle, Trash2, ChevronRight } from 'lucide-react'
import type { Booking } from '../../../services/api'
import { getStatusLabel } from '../../../utils/calendarUtils'

interface BookingContextMenuProps {
  booking: Booking
  position: { x: number; y: number }
  onClose: () => void
  onStatusChange: (bookingId: string, status: Booking['status']) => Promise<void>
  onDuplicate?: (booking: Booking) => void
  onDelete?: (bookingId: string) => Promise<void>
}

const statusOptions: Booking['status'][] = ['pending', 'confirmed', 'checked_in', 'checked_out', 'cancelled', 'completed']

export default function BookingContextMenu({
  booking,
  position,
  onClose,
  onStatusChange,
  onDuplicate,
  onDelete,
}: BookingContextMenuProps) {
  const navigate = useNavigate()
  const menuRef = useRef<HTMLDivElement>(null)
  const [showStatusSubmenu, setShowStatusSubmenu] = useState(false)
  const [adjustedPosition, setAdjustedPosition] = useState(position)
  const [isProcessing, setIsProcessing] = useState(false)

  // Adjust position to stay within viewport
  useEffect(() => {
    if (menuRef.current) {
      const rect = menuRef.current.getBoundingClientRect()
      const viewportWidth = window.innerWidth
      const viewportHeight = window.innerHeight

      let newX = position.x
      let newY = position.y

      if (position.x + rect.width > viewportWidth - 20) {
        newX = position.x - rect.width
      }

      if (position.y + rect.height > viewportHeight - 20) {
        newY = viewportHeight - rect.height - 20
      }

      newX = Math.max(10, newX)
      newY = Math.max(10, newY)

      setAdjustedPosition({ x: newX, y: newY })
    }
  }, [position])

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose()
      }
    }

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [onClose])

  const handleViewDetails = () => {
    navigate(`/dashboard/bookings/${booking.id}`)
    onClose()
  }

  const handleEdit = () => {
    navigate(`/dashboard/bookings/${booking.id}/edit`)
    onClose()
  }

  const handleStatusChange = async (status: Booking['status']) => {
    if (status === booking.status || isProcessing) return
    setIsProcessing(true)
    try {
      await onStatusChange(booking.id!, status)
    } finally {
      setIsProcessing(false)
      onClose()
    }
  }

  const handleDuplicate = () => {
    if (onDuplicate) {
      onDuplicate(booking)
    }
    onClose()
  }

  const handleCancel = async () => {
    if (booking.status === 'cancelled' || isProcessing) return
    setIsProcessing(true)
    try {
      await onStatusChange(booking.id!, 'cancelled')
    } finally {
      setIsProcessing(false)
      onClose()
    }
  }

  const handleDelete = async () => {
    if (!onDelete || isProcessing) return
    if (!confirm(`Are you sure you want to delete ${booking.guest_name}'s booking?`)) return
    setIsProcessing(true)
    try {
      await onDelete(booking.id!)
    } finally {
      setIsProcessing(false)
      onClose()
    }
  }

  const menuItemClass = "flex items-center gap-3 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer transition-colors"
  const menuItemDisabledClass = "flex items-center gap-3 px-3 py-2 text-sm text-gray-400 cursor-not-allowed"

  return (
    <div
      ref={menuRef}
      className="fixed z-50 bg-white rounded-lg shadow-xl border border-gray-200 py-1 min-w-[200px]"
      style={{
        left: adjustedPosition.x,
        top: adjustedPosition.y,
      }}
    >
      {/* View Details */}
      <div className={menuItemClass} onClick={handleViewDetails}>
        <Eye className="w-4 h-4" />
        <span>View Details</span>
      </div>

      {/* Edit */}
      <div className={menuItemClass} onClick={handleEdit}>
        <Pencil className="w-4 h-4" />
        <span>Edit Booking</span>
      </div>

      <div className="border-t border-gray-100 my-1" />

      {/* Change Status */}
      <div
        className={`${menuItemClass} justify-between relative`}
        onMouseEnter={() => setShowStatusSubmenu(true)}
        onMouseLeave={() => setShowStatusSubmenu(false)}
      >
        <div className="flex items-center gap-3">
          <Check className="w-4 h-4" />
          <span>Change Status</span>
        </div>
        <ChevronRight className="w-4 h-4" />

        {/* Status Submenu */}
        {showStatusSubmenu && (
          <div
            className="absolute left-full top-0 ml-1 bg-white rounded-lg shadow-xl border border-gray-200 py-1 min-w-[160px]"
            onMouseEnter={() => setShowStatusSubmenu(true)}
          >
            {statusOptions.map((status) => (
              <div
                key={status}
                className={status === booking.status ? menuItemDisabledClass : menuItemClass}
                onClick={() => handleStatusChange(status)}
              >
                <div className={`w-2 h-2 rounded-full ${
                  status === 'pending' ? 'bg-yellow-500' :
                  status === 'confirmed' ? 'bg-emerald-500' :
                  status === 'checked_in' ? 'bg-blue-500' :
                  status === 'checked_out' ? 'bg-purple-500' :
                  status === 'cancelled' ? 'bg-red-500' :
                  'bg-gray-500'
                }`} />
                <span>{getStatusLabel(status)}</span>
                {status === booking.status && (
                  <Check className="w-3 h-3 ml-auto text-emerald-500" />
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Duplicate */}
      {onDuplicate && (
        <div className={menuItemClass} onClick={handleDuplicate}>
          <Copy className="w-4 h-4" />
          <span>Duplicate Booking</span>
        </div>
      )}

      <div className="border-t border-gray-100 my-1" />

      {/* Cancel Booking */}
      <div
        className={booking.status === 'cancelled' ? menuItemDisabledClass : `${menuItemClass} text-amber-600 hover:bg-amber-50`}
        onClick={handleCancel}
      >
        <XCircle className="w-4 h-4" />
        <span>Cancel Booking</span>
      </div>

      {/* Delete */}
      {onDelete && (
        <div
          className={`${menuItemClass} text-red-600 hover:bg-red-50`}
          onClick={handleDelete}
        >
          <Trash2 className="w-4 h-4" />
          <span>Delete Booking</span>
        </div>
      )}
    </div>
  )
}

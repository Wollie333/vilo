import { useState, useCallback, useRef } from 'react'
import { useDraggable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import type { Booking } from '../../../services/api'
import { BOOKING_SOURCE_DISPLAY } from '../../../services/api'
import { statusColors, type BookingPosition } from '../../../utils/calendarUtils'
import BookingTooltip from '../shared/BookingTooltip'
import BookingContextMenu from '../shared/BookingContextMenu'

interface BookingBlockProps {
  booking: Booking
  position: BookingPosition
  dayWidth: number
  isDragging?: boolean
  onClick: () => void
  onResize: (booking: Booking, direction: 'start' | 'end', daysDelta: number) => Promise<boolean>
  isUpdating?: boolean
  roomName?: string
  onStatusChange?: (bookingId: string, status: Booking['status']) => Promise<void>
  onDelete?: (bookingId: string) => Promise<void>
}

const BLOCK_HEIGHT = 44 // pixels

export default function BookingBlock({
  booking,
  position,
  dayWidth,
  isDragging = false,
  onClick,
  onResize,
  isUpdating = false,
  roomName,
  onStatusChange,
  onDelete,
}: BookingBlockProps) {
  const [isResizing, setIsResizing] = useState(false)
  const [showTooltip, setShowTooltip] = useState(false)
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 })
  const [showContextMenu, setShowContextMenu] = useState(false)
  const [contextMenuPosition, setContextMenuPosition] = useState({ x: 0, y: 0 })
  const [showQuickEdit, setShowQuickEdit] = useState(false)
  const resizeStartX = useRef(0)
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const clickTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Setup draggable
  const { attributes, listeners, setNodeRef, transform, isDragging: isDraggingDnd } = useDraggable({
    id: booking.id!,
    data: { booking },
    disabled: isResizing || isUpdating,
  })

  const colors = statusColors[booking.status]

  // Transform style for dragging
  const style = {
    position: 'absolute' as const,
    left: position.left,
    width: position.width,
    top: 8, // vertical padding from row edge
    height: BLOCK_HEIGHT,
    transform: isDragging || isDraggingDnd ? CSS.Transform.toString(transform) : undefined,
    zIndex: isDragging || isDraggingDnd ? 100 : 1,
  }

  // Handle resize start
  const handleResizeStart = useCallback((e: React.MouseEvent, direction: 'start' | 'end') => {
    e.stopPropagation()
    e.preventDefault()

    setIsResizing(true)
    resizeStartX.current = e.clientX

    const handleMouseUp = async (upEvent: MouseEvent) => {
      document.removeEventListener('mouseup', handleMouseUp)

      const deltaX = upEvent.clientX - resizeStartX.current
      const daysDelta = Math.round(deltaX / dayWidth)

      setIsResizing(false)

      if (daysDelta !== 0) {
        await onResize(booking, direction, daysDelta)
      }
    }

    document.addEventListener('mouseup', handleMouseUp)
  }, [booking, dayWidth, onResize])

  // Handle click (navigate to booking) with double-click detection
  const handleClick = useCallback((e: React.MouseEvent) => {
    if (isDraggingDnd || isResizing) return

    // Check for double-click
    if (clickTimeoutRef.current) {
      // Double click detected
      clearTimeout(clickTimeoutRef.current)
      clickTimeoutRef.current = null
      e.stopPropagation()
      setShowQuickEdit(true)
      setShowTooltip(false)
    } else {
      // Single click - wait for potential double click
      clickTimeoutRef.current = setTimeout(() => {
        clickTimeoutRef.current = null
        onClick()
      }, 200)
    }
  }, [isDraggingDnd, isResizing, onClick])

  // Handle hover for tooltip
  const handleMouseEnter = useCallback((e: React.MouseEvent) => {
    if (isDraggingDnd || isResizing || isUpdating) return

    // Clear any existing timeout
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current)
    }

    // Set position based on mouse
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    setTooltipPosition({
      x: rect.right + 10,
      y: rect.top,
    })

    // Show tooltip after delay
    hoverTimeoutRef.current = setTimeout(() => {
      setShowTooltip(true)
    }, 300)
  }, [isDraggingDnd, isResizing, isUpdating])

  const handleMouseLeave = useCallback(() => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current)
    }
    setShowTooltip(false)
  }, [])

  // Handle right-click for context menu
  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    // Hide tooltip when opening context menu
    setShowTooltip(false)
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current)
    }

    setContextMenuPosition({ x: e.clientX, y: e.clientY })
    setShowContextMenu(true)
  }, [])

  return (
    <>
    <div
      ref={setNodeRef}
      style={style}
      className={`
        group rounded-md border-l-4 cursor-grab active:cursor-grabbing
        ${colors.bg} ${colors.border}
        ${isDragging || isDraggingDnd ? 'shadow-lg opacity-90' : 'shadow-sm hover:shadow-md'}
        ${isUpdating ? 'opacity-50 pointer-events-none' : ''}
        transition-shadow
      `}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onContextMenu={handleContextMenu}
      {...attributes}
      {...listeners}
    >
      {/* Content */}
      <div className="h-full flex flex-col justify-center px-2 overflow-hidden">
        <div className="flex items-center gap-1">
          {/* Source indicator for synced bookings */}
          {booking.source && booking.source !== 'vilo' && booking.source !== 'manual' && (
            <div
              className="w-2 h-2 rounded-full flex-shrink-0"
              style={{ backgroundColor: BOOKING_SOURCE_DISPLAY[booking.source]?.color || '#6B7280' }}
              title={BOOKING_SOURCE_DISPLAY[booking.source]?.label || booking.source}
            />
          )}
          <span className={`text-xs font-medium truncate ${colors.text}`}>
            {booking.guest_name}
          </span>
        </div>
        <div className="text-xs text-gray-500 truncate">
          {position.nightCount} {position.nightCount === 1 ? 'night' : 'nights'}
          {booking.source && booking.source !== 'vilo' && booking.source !== 'manual' && (
            <span className="ml-1 opacity-75">
              ({BOOKING_SOURCE_DISPLAY[booking.source]?.label || booking.source})
            </span>
          )}
        </div>
      </div>

      {/* Partial indicators */}
      {position.isPartialStart && (
        <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1">
          <div className="w-2 h-2 rotate-45 bg-gray-400" />
        </div>
      )}
      {position.isPartialEnd && (
        <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1">
          <div className="w-2 h-2 rotate-45 bg-gray-400" />
        </div>
      )}

      {/* Resize handles */}
      {!isDragging && !isDraggingDnd && !position.isPartialStart && (
        <div
          className="absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize opacity-0 group-hover:opacity-100 hover:bg-black/10 transition-opacity"
          onMouseDown={(e) => handleResizeStart(e, 'start')}
          onClick={(e) => e.stopPropagation()}
        />
      )}
      {!isDragging && !isDraggingDnd && !position.isPartialEnd && (
        <div
          className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize opacity-0 group-hover:opacity-100 hover:bg-black/10 transition-opacity"
          onMouseDown={(e) => handleResizeStart(e, 'end')}
          onClick={(e) => e.stopPropagation()}
        />
      )}

      {/* Status badge */}
      <div className={`absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-white ${
        booking.status === 'confirmed' ? 'bg-accent-500' :
        booking.status === 'pending' ? 'bg-yellow-500' :
        booking.status === 'checked_in' ? 'bg-blue-500' :
        booking.status === 'checked_out' ? 'bg-purple-500' :
        booking.status === 'cancelled' ? 'bg-red-500' :
        'bg-gray-500'
      }`} />
    </div>

    {/* Tooltip */}
    {showTooltip && !isDraggingDnd && !isResizing && !showContextMenu && (
      <BookingTooltip
        booking={booking}
        roomName={roomName}
        position={tooltipPosition}
        onClose={() => setShowTooltip(false)}
      />
    )}

    {/* Context Menu */}
    {showContextMenu && onStatusChange && (
      <BookingContextMenu
        booking={booking}
        position={contextMenuPosition}
        onClose={() => setShowContextMenu(false)}
        onStatusChange={onStatusChange}
        onDelete={onDelete}
      />
    )}

    {/* Quick Edit Dropdown */}
    {showQuickEdit && onStatusChange && (
      <div
        className="fixed inset-0 z-40"
        onClick={() => setShowQuickEdit(false)}
      >
        <div
          className="absolute bg-white rounded-lg shadow-xl border border-gray-200 py-1 min-w-[140px]"
          style={{
            left: tooltipPosition.x,
            top: tooltipPosition.y,
          }}
          onClick={e => e.stopPropagation()}
        >
          <div className="px-3 py-1.5 text-xs font-medium text-gray-500 uppercase tracking-wide">
            Quick Status
          </div>
          {(['pending', 'confirmed', 'checked_in', 'checked_out', 'cancelled', 'completed'] as const).map((status) => (
            <button
              key={status}
              className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left transition-colors ${
                status === booking.status
                  ? 'bg-gray-100 text-gray-500 cursor-default'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
              onClick={async () => {
                if (status !== booking.status) {
                  await onStatusChange(booking.id!, status)
                  setShowQuickEdit(false)
                }
              }}
              disabled={status === booking.status}
            >
              <div className={`w-2 h-2 rounded-full ${
                status === 'pending' ? 'bg-yellow-500' :
                status === 'confirmed' ? 'bg-emerald-500' :
                status === 'checked_in' ? 'bg-blue-500' :
                status === 'checked_out' ? 'bg-purple-500' :
                status === 'cancelled' ? 'bg-red-500' :
                'bg-gray-500'
              }`} />
              <span className="capitalize">{status.replace('_', ' ')}</span>
              {status === booking.status && (
                <span className="ml-auto text-xs text-gray-400">Current</span>
              )}
            </button>
          ))}
        </div>
      </div>
    )}
    </>
  )
}

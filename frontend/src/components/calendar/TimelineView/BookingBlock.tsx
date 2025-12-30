import { useState, useCallback, useRef } from 'react'
import { useDraggable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import type { Booking } from '../../../services/api'
import { statusColors, type BookingPosition } from '../../../utils/calendarUtils'

interface BookingBlockProps {
  booking: Booking
  position: BookingPosition
  dayWidth: number
  isDragging?: boolean
  onClick: () => void
  onResize: (booking: Booking, direction: 'start' | 'end', daysDelta: number) => Promise<boolean>
  isUpdating?: boolean
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
}: BookingBlockProps) {
  const [isResizing, setIsResizing] = useState(false)
  const resizeStartX = useRef(0)

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

  // Handle click (navigate to booking)
  const handleClick = useCallback(() => {
    if (!isDraggingDnd && !isResizing) {
      onClick()
    }
  }, [isDraggingDnd, isResizing, onClick])

  return (
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
      {...attributes}
      {...listeners}
    >
      {/* Content */}
      <div className="h-full flex flex-col justify-center px-2 overflow-hidden">
        <div className={`text-xs font-medium truncate ${colors.text}`}>
          {booking.guest_name}
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
          {position.nightCount} {position.nightCount === 1 ? 'night' : 'nights'}
        </div>
      </div>

      {/* Partial indicators */}
      {position.isPartialStart && (
        <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1">
          <div className="w-2 h-2 rotate-45 bg-gray-400 dark:bg-gray-500" />
        </div>
      )}
      {position.isPartialEnd && (
        <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1">
          <div className="w-2 h-2 rotate-45 bg-gray-400 dark:bg-gray-500" />
        </div>
      )}

      {/* Resize handles */}
      {!isDragging && !isDraggingDnd && !position.isPartialStart && (
        <div
          className="absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize opacity-0 group-hover:opacity-100 hover:bg-black/10 dark:hover:bg-white/10 transition-opacity"
          onMouseDown={(e) => handleResizeStart(e, 'start')}
          onClick={(e) => e.stopPropagation()}
        />
      )}
      {!isDragging && !isDraggingDnd && !position.isPartialEnd && (
        <div
          className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize opacity-0 group-hover:opacity-100 hover:bg-black/10 dark:hover:bg-white/10 transition-opacity"
          onMouseDown={(e) => handleResizeStart(e, 'end')}
          onClick={(e) => e.stopPropagation()}
        />
      )}

      {/* Status badge */}
      <div className={`absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-white dark:border-gray-800 ${
        booking.status === 'confirmed' ? 'bg-green-500' :
        booking.status === 'pending' ? 'bg-yellow-500' :
        booking.status === 'checked_in' ? 'bg-blue-500' :
        booking.status === 'checked_out' ? 'bg-purple-500' :
        booking.status === 'cancelled' ? 'bg-red-500' :
        'bg-gray-500'
      }`} />
    </div>
  )
}

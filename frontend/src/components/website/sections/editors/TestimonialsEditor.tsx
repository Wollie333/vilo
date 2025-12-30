import { useState } from 'react'
import {
  Plus,
  Trash2,
  GripVertical,
  ChevronDown,
  ChevronUp,
  Star,
  User,
} from 'lucide-react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

interface Testimonial {
  id: string
  quote: string
  author: string
  role?: string
  avatar?: string
  rating?: number
}

interface TestimonialsEditorProps {
  items: Testimonial[]
  onChange: (items: Testimonial[]) => void
  maxItems?: number
}

const generateId = () => `testimonial-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

export default function TestimonialsEditor({
  items,
  onChange,
  maxItems = 8,
}: TestimonialsEditorProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (over && active.id !== over.id) {
      const oldIndex = items.findIndex((item) => item.id === active.id)
      const newIndex = items.findIndex((item) => item.id === over.id)
      onChange(arrayMove(items, oldIndex, newIndex))
    }
  }

  const addItem = () => {
    if (items.length >= maxItems) return
    const newItem: Testimonial = {
      id: generateId(),
      quote: 'Amazing experience! Will definitely come back.',
      author: 'Guest Name',
      role: 'Verified Guest',
      rating: 5,
    }
    onChange([...items, newItem])
    setExpandedId(newItem.id)
  }

  const updateItem = (id: string, updates: Partial<Testimonial>) => {
    onChange(items.map((item) => (item.id === id ? { ...item, ...updates } : item)))
  }

  const deleteItem = (id: string) => {
    onChange(items.filter((item) => item.id !== id))
    if (expandedId === id) setExpandedId(null)
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
          Testimonials ({items.length}/{maxItems})
        </label>
        <button
          onClick={addItem}
          disabled={items.length >= maxItems}
          className="flex items-center gap-1 px-3 py-1.5 text-sm rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <Plus size={14} />
          Add
        </button>
      </div>

      {items.length === 0 ? (
        <div
          className="text-center py-8 border-2 border-dashed rounded-lg"
          style={{ borderColor: 'var(--border-color)' }}
        >
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            No testimonials yet. Click "Add" to create one.
          </p>
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={items.map((i) => i.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-2">
              {items.map((item) => (
                <SortableTestimonial
                  key={item.id}
                  item={item}
                  isExpanded={expandedId === item.id}
                  onToggle={() => setExpandedId(expandedId === item.id ? null : item.id)}
                  onUpdate={(updates) => updateItem(item.id, updates)}
                  onDelete={() => deleteItem(item.id)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  )
}

function SortableTestimonial({
  item,
  isExpanded,
  onToggle,
  onUpdate,
  onDelete,
}: {
  item: Testimonial
  isExpanded: boolean
  onToggle: () => void
  onUpdate: (updates: Partial<Testimonial>) => void
  onDelete: () => void
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="border rounded-lg overflow-hidden"
      {...attributes}
    >
      {/* Header */}
      <div
        className="flex items-center gap-2 px-3 py-2 bg-gray-50 cursor-pointer"
        onClick={onToggle}
      >
        <button
          {...listeners}
          className="cursor-grab active:cursor-grabbing p-1 rounded hover:bg-gray-200 transition-colors"
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical size={14} className="text-gray-400" />
        </button>
        <div className="flex-1 min-w-0">
          <span className="text-sm font-medium truncate block" style={{ color: 'var(--text-primary)' }}>
            {item.author || 'No author'}
          </span>
          {item.rating && (
            <div className="flex gap-0.5">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  size={10}
                  className={star <= item.rating! ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}
                />
              ))}
            </div>
          )}
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation()
            onDelete()
          }}
          className="p-1 rounded hover:bg-red-100 text-red-500 transition-colors"
        >
          <Trash2 size={14} />
        </button>
        {isExpanded ? (
          <ChevronUp size={16} className="text-gray-400" />
        ) : (
          <ChevronDown size={16} className="text-gray-400" />
        )}
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="p-4 space-y-4 bg-white">
          {/* Quote */}
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
              Quote
            </label>
            <textarea
              value={item.quote || ''}
              onChange={(e) => onUpdate({ quote: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 text-sm rounded-lg border focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              style={{ borderColor: 'var(--border-color)' }}
              placeholder="Guest testimonial..."
            />
          </div>

          {/* Author */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
                Author Name
              </label>
              <input
                type="text"
                value={item.author || ''}
                onChange={(e) => onUpdate({ author: e.target.value })}
                className="w-full px-3 py-2 text-sm rounded-lg border focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                style={{ borderColor: 'var(--border-color)' }}
                placeholder="John Doe"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
                Role/Title
              </label>
              <input
                type="text"
                value={item.role || ''}
                onChange={(e) => onUpdate({ role: e.target.value })}
                className="w-full px-3 py-2 text-sm rounded-lg border focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                style={{ borderColor: 'var(--border-color)' }}
                placeholder="Verified Guest"
              />
            </div>
          </div>

          {/* Avatar */}
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
              Avatar URL (optional)
            </label>
            <div className="flex gap-2">
              {item.avatar ? (
                <img
                  src={item.avatar}
                  alt={item.author}
                  className="w-10 h-10 rounded-full object-cover"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                  <User size={20} className="text-gray-400" />
                </div>
              )}
              <input
                type="text"
                value={item.avatar || ''}
                onChange={(e) => onUpdate({ avatar: e.target.value })}
                className="flex-1 px-3 py-2 text-sm rounded-lg border focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                style={{ borderColor: 'var(--border-color)' }}
                placeholder="https://example.com/avatar.jpg"
              />
            </div>
          </div>

          {/* Rating */}
          <div>
            <label className="block text-xs font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
              Rating
            </label>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => onUpdate({ rating: star })}
                  className="p-1 rounded hover:bg-gray-100 transition-colors"
                >
                  <Star
                    size={24}
                    className={star <= (item.rating || 0) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}
                  />
                </button>
              ))}
              {item.rating && (
                <button
                  onClick={() => onUpdate({ rating: undefined })}
                  className="ml-2 text-xs text-gray-400 hover:text-gray-600"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
